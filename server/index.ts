import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { initDb, getAllContentBlocks, upsertContentBlocks, db } from './db';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── CORS ─────────────────────────────────────────────────────────────────────
const _defaultOrigins = NODE_ENV === 'production'
  ? ''   // 生产环境必须通过 ALLOWED_ORIGINS 环境变量显式配置，不提供默认值
  : 'http://localhost:3000,http://localhost:4000,http://localhost:5173';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || _defaultOrigins)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || ALLOWED_ORIGINS[0]);
  res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
initDb();

// ── 工具函数 ──────────────────────────────────────────────────────────────────
const SALT = process.env.PASSWORD_SALT || 'nebula_xingkong_2026_salt';
if (NODE_ENV === 'production' && !process.env.PASSWORD_SALT) {
  console.warn('[WARN] 建议在生产环境通过 PASSWORD_SALT 环境变量设置唯一随机盐值');
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 生成唯一软件授权码，格式：XXXX-XXXX-XXXX-XXXX
 * 基于手机号+随机熵，绝对唯一（数据库UNIQUE保障）
 */
function generateLicenseKey(phone: string): string {
  const raw = crypto.createHash('sha256').update(phone + Date.now() + Math.random().toString()).digest('hex');
  const seg = (s: number, e: number) => raw.substring(s, e).toUpperCase();
  return `${seg(0,4)}-${seg(4,8)}-${seg(8,12)}-${seg(12,16)}`;
}

// ── 套餐配置（月数 → AI额度）────────────────────────────────────────────────
const PACKAGE_QUOTA: Record<string, { image: number; video: number; edit: number }> = {
  VIP1:  { image: 0,  video: 0,  edit: 0  }, // 基础版无AI额度
  VIP3:  { image: 20, video: 15, edit: 15 }, // 专业版每月额度
  ADDON: { image: 10, video: 10, edit: 10 }, // 加速包一次性增加
};

// ════════════════════════════════════════════════════════════════════════════
// 微信支付配置（V2版本）
// ════════════════════════════════════════════════════════════════════════════
const WECHAT_MCH_ID = process.env.WECHAT_MCH_ID || '';
const WECHAT_API_KEY = process.env.WECHAT_API_KEY || '';
const WECHAT_NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || '';
const WECHAT_APPID = process.env.WECHAT_APPID || '';

/**
 * 微信支付 V2 签名生成
 * https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter3_1_1.shtml
 */
function generateWechatSign(params: Record<string, string>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const stringA = sorted + `&key=${WECHAT_API_KEY}`;
  return crypto.createHash('md5').update(stringA).digest('hex').toUpperCase();
}

/**
 * 创建微信支付订单（Native模式，返回二维码链接）
 */
async function createWechatPayOrder(orderId: number, amount: number, description: string): Promise<{ code_url: string; prepay_id: string }> {
  const nonceStr = crypto.randomBytes(16).toString('hex').substring(0, 32);
  const outTradeNo = `NK${Date.now()}${Math.floor(Math.random() * 1000)}`;
  
  const params: Record<string, string> = {
    appid: WECHAT_APPID,
    mch_id: WECHAT_MCH_ID,
    nonce_str: nonceStr,
    body: description,
    out_trade_no: outTradeNo,
    total_fee: String(Math.round(amount * 100)), // 单位：分
    spbill_create_ip: '123.125.115.110',
    notify_url: WECHAT_NOTIFY_URL,
    trade_type: 'NATIVE',
  };
  
  // 签名
  params.sign = generateWechatSign(params);
  
  // 生成XML
  const xml = ['<xml>'];
  for (const [k, v] of Object.entries(params)) {
    xml.push(`<${k}><![CDATA[${v}]]></${k}>`);
  }
  xml.push('</xml>');
  
  const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: xml.join(''),
  });
  
  const text = await response.text();
  console.log('[WechatPay] response:', text);
  
  // 解析XML响应
  const parseXml = (xml: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/(\w+)>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }
    return result;
  };
  
  const xmlObj = parseXml(text);
  if (xmlObj.return_code !== 'SUCCESS') {
    throw new Error(xmlObj.return_msg || '微信支付下单失败');
  }
  if (xmlObj.result_code !== 'SUCCESS') {
    throw new Error(xmlObj.err_code_des || '微信支付下单失败');
  }
  
  return {
    code_url: xmlObj.code_url,
    prepay_id: xmlObj.prepay_id,
  };
}

// ── 服务端价格表（用于校验客户端提交的金额，防止篡改）──────────────────────
// key: `${package_type}_${months}M`  (ADDON 用 ADDON_0M)
const SERVER_PRICES: Record<string, number> = {
  VIP1_1M:   99,    // 基础版月付
  VIP1_3M:   288,   // 基础版季付
  VIP1_12M:  999,   // 基础版年付
  VIP3_1M:   299,   // 专业版月付
  VIP3_3M:   888,   // 专业版季付
  VIP3_12M:  3388,  // 专业版年付
  ADDON_0M:  88,    // AI加速包
};

function getExpectedPrice(package_type: string, months: number): number | null {
  const key = `${package_type}_${months}M`;
  return SERVER_PRICES[key] ?? null;
}

// ── 内存存储 ──────────────────────────────────────────────────────────────────
const smsCodes    = new Map<string, { code: string; expiresAt: number }>();
const userTokens  = new Map<string, number>();
const salesTokens = new Map<string, number>();
// 管理员动态 session：token → 过期时间戳（24小时）
const adminTokens = new Map<string, number>();
const ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000;

// ── 登录频率限制（防暴力破解）────────────────────────────────────────────────
// key: 'user:<phone>' | 'admin:<username>' | 'sales:<code_prefix>'
const loginAttempts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX    = 10;                  // 每窗口期最多失败次数
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;     // 15 分钟窗口

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec || now - rec.windowStart > RATE_LIMIT_WINDOW) return true;
  return rec.count < RATE_LIMIT_MAX;
}
function recordLoginFailure(key: string) {
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec || now - rec.windowStart > RATE_LIMIT_WINDOW) {
    loginAttempts.set(key, { count: 1, windowStart: now });
  } else {
    rec.count++;
  }
}
function clearLoginAttempts(key: string) {
  loginAttempts.delete(key);
}

// ── 初始化默认销售密码 ─────────────────────────────────────────────────────────
try {
  const defaultSales = db.prepare('SELECT * FROM sales WHERE code_prefix = ?').get('A001') as any;
  if (defaultSales && !defaultSales.password) {
    db.prepare('UPDATE sales SET password = ? WHERE code_prefix = ?').run(hashPassword('123456'), 'A001');
  }
} catch (_) {}

// ── 管理员配置（唯一管理员，手机验证码登录）────────────────────────────────
const ADMIN_PHONE = process.env.ADMIN_PHONE || '18018844437';

if (NODE_ENV === 'production' && !process.env.ADMIN_PHONE) {
  console.warn('[WARN] 建议通过 ADMIN_PHONE 环境变量显式设置管理员手机号');
}

// ── 权限中间件 ────────────────────────────────────────────────────────────────
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers['x-admin-token'] || req.headers.authorization || '')
    .toString().replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const expiry = adminTokens.get(token);
  if (!expiry || Date.now() >= expiry) {
    adminTokens.delete(token);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireSales(req: any, res: express.Response, next: express.NextFunction) {
  const token = (req.headers.authorization || '').toString().replace(/^Bearer\s+/i, '');
  const salesId = salesTokens.get(token);
  if (!salesId) return res.status(401).json({ error: '未登录或会话已过期' });
  req.salesId = salesId;
  next();
}

function requireUser(req: any, res: express.Response, next: express.NextFunction) {
  const token = (req.headers.authorization || '').toString().replace(/^Bearer\s+/i, '');
  const userId = userTokens.get(token);
  if (!userId) return res.status(401).json({ error: '未登录或会话已过期' });
  req.userId = userId;
  next();
}

// ── AI 额度月度重置（每次获取用户信息时检查）─────────────────────────────────
function maybeResetQuota(user: any) {
  if (!user.quota_reset_date || user.package_type !== 'VIP3') return user;
  const lastReset = new Date(user.quota_reset_date);
  const now = new Date();
  // 距上次重置超过30天则重置
  const diffDays = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays >= 30) {
    const quota = PACKAGE_QUOTA['VIP3'];
    const nowStr = now.toISOString();
    db.prepare(`
      UPDATE users SET
        ai_image_quota = ?,
        ai_video_quota = ?,
        ai_edit_quota  = ?,
        quota_reset_date = ?,
        updated_at = ?
      WHERE id = ?
    `).run(quota.image, quota.video, quota.edit, nowStr, nowStr, user.id);
    return { ...user, ai_image_quota: quota.image, ai_video_quota: quota.video, ai_edit_quota: quota.edit, quota_reset_date: nowStr };
  }
  return user;
}

// ════════════════════════════════════════════════════════════════════════════
// 公共 API
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/health', (_req, res) => res.json({ status: 'ok', env: NODE_ENV }));

app.get('/api/public/content', (_req, res) => res.json(getAllContentBlocks()));

// ── 阿里云短信配置 ───────────────────────────────────────────────────────────
const ALI_KEY_ID     = process.env.ALIYUN_SMS_ACCESS_KEY_ID     || '';
const ALI_KEY_SECRET = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '';
const ALI_SIGN_NAME  = process.env.ALIYUN_SMS_SIGN_NAME         || '星空AI';
const ALI_TEMPLATE   = process.env.ALIYUN_SMS_TEMPLATE_CODE     || '';
const SMS_READY      = !!(ALI_KEY_ID && ALI_KEY_SECRET && ALI_TEMPLATE);

/**
 * 阿里云短信发送（SMS SDK 极简实现，无需安装额外包）
 * 文档：https://help.aliyun.com/document_detail/101414.html
 */
async function sendAliyunSMS(phone: string, code: string): Promise<{ ok: boolean; msg?: string }> {
  if (!SMS_READY) return { ok: false, msg: '阿里云短信未配置' };
  try {
    const Core = await import('@alicloud/pop-core').catch(() => null) as any;
    if (!Core) return { ok: false, msg: '缺少 @alicloud/pop-core 包' };
    const client = new Core.default({
      accessKeyId: ALI_KEY_ID, accessKeySecret: ALI_KEY_SECRET,
      endpoint: 'https://dysmsapi.aliyuncs.com', apiVersion: '2017-05-25',
    });
    const result: any = await client.request('SendSms', {
      PhoneNumbers: phone, SignName: ALI_SIGN_NAME,
      TemplateCode: ALI_TEMPLATE, TemplateParam: JSON.stringify({ code }),
    }, { method: 'POST' });
    if (result?.Code === 'OK') return { ok: true };
    return { ok: false, msg: result?.Message || result?.Code };
  } catch (e: any) {
    return { ok: false, msg: e.message };
  }
}

// ── 短信验证码 ────────────────────────────────────────────────────────────────
app.post('/api/sms/send', async (req, res) => {
  const { phone } = req.body || {};
  if (!phone || !/^1[3-9]\d{9}$/.test(phone))
    return res.status(400).json({ error: '请输入正确的手机号（11位国内手机号）' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  smsCodes.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  // 尝试真实发送
  if (SMS_READY) {
    const { ok, msg } = await sendAliyunSMS(phone, code);
    if (!ok) {
      console.error(`[SMS] ❌ 阿里云发送失败（${phone}）: ${msg}`);
      // 发送失败时删除验证码，避免无效码残留
      smsCodes.delete(phone);
      return res.status(500).json({ error: `短信发送失败：${msg}，请稍后重试` });
    }
    console.log(`[SMS] ✅ 阿里云发送成功: ${phone}`);
    return res.json({ success: true, message: '验证码已发送（5分钟有效）' });
  }

  if (NODE_ENV === 'production') {
    // 生产环境短信未配置：清除验证码，拒绝请求
    smsCodes.delete(phone);
    console.error('[SMS] ❌ 生产环境短信服务未配置，拒绝发送');
    return res.status(500).json({ error: '短信服务暂不可用，请联系管理员' });
  }

  // 开发模式：只打印到控制台，不在响应中返回验证码
  console.log(`[SMS][DEV] ${phone} → ${code}`);
  res.json({
    success: true,
    message: '开发模式：验证码已打印到服务器控制台',
  });
});

// 验证短信验证码（供桌面软件调用，无需消耗 code）
app.post('/api/sms/verify', (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code)
    return res.status(400).json({ valid: false, error: '手机号和验证码不能为空' });
  const stored = smsCodes.get(phone);
  if (!stored || stored.code !== String(code).trim() || Date.now() > stored.expiresAt)
    return res.json({ valid: false, error: '验证码错误或已过期' });
  // 验证通过但不删除（由注册接口消耗），允许多次验证
  res.json({ valid: true });
});

// ════════════════════════════════════════════════════════════════════════════
// 用户认证
// ════════════════════════════════════════════════════════════════════════════

// 注册（手机号+验证码+密码+销售码[可选]）
app.post('/api/auth/register', (req, res) => {
  try {
    const { phone, password, smsCode, salesCode } = req.body || {};
    if (!phone || !password || !smsCode)
    return res.status(400).json({ error: '手机号、密码、验证码不能为空' });
    if (password.length < 6)
      return res.status(400).json({ error: '密码至少6位' });

    // 校验验证码
    const stored = smsCodes.get(phone);
    if (!stored || stored.code !== smsCode || Date.now() > stored.expiresAt)
      return res.status(400).json({ error: '验证码错误或已过期，请重新获取' });
    smsCodes.delete(phone);

    // 查找销售
    let salesId: number | null = null;
    if (salesCode && salesCode.trim()) {
      const salesRow = db.prepare('SELECT id FROM sales WHERE code_prefix = ?').get(salesCode.trim().toUpperCase()) as any;
      if (salesRow) salesId = salesRow.id;
  }
  
  const now = new Date().toISOString();
    const info = db.prepare(
      'INSERT INTO users (phone, password, sales_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(phone, hashPassword(password), salesId, now, now);

    const token = generateToken();
    userTokens.set(token, info.lastInsertRowid as number);
    res.json({ success: true, token });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: '该手机号已注册，请直接登录' });
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 登录
app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, password } = req.body || {};
    if (!phone || !password) return res.status(400).json({ error: '手机号和密码不能为空' });

    const rlKey = `user:${phone}`;
    if (!checkRateLimit(rlKey))
      return res.status(429).json({ error: '登录尝试过于频繁，请 15 分钟后再试' });

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
    if (!user) { recordLoginFailure(rlKey); return res.status(400).json({ error: '用户不存在，请先注册' }); }

    const hashedPw = hashPassword(password);
    if (user.password !== hashedPw && user.password !== password) {
      recordLoginFailure(rlKey);
      return res.status(400).json({ error: '密码错误' });
    }

    // 自动升级明文密码
    if (user.password === password && user.password !== hashedPw) {
      db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?')
        .run(hashedPw, new Date().toISOString(), user.id);
    }

    clearLoginAttempts(rlKey);
    const token = generateToken();
    userTokens.set(token, user.id);
    const { password: _, ...userInfo } = user;
    res.json({ success: true, token, user: userInfo });
  } catch (err: any) {
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 登出
app.post('/api/auth/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  userTokens.delete(token);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════════════════════════════
// 用户中心（需登录）
// ════════════════════════════════════════════════════════════════════════════

// 用户信息（含到期倒计时 + AI额度）
app.get('/api/user/info', requireUser, (req: any, res) => {
  try {
    let user = db.prepare(
      `SELECT u.id, u.phone, u.company_name, u.is_activated, u.package_type,
              u.expire_date, u.created_at, u.license_key,
              u.ai_image_quota, u.ai_video_quota, u.ai_edit_quota, u.quota_reset_date,
              s.name as sales_name, s.code_prefix as sales_code
       FROM users u
       LEFT JOIN sales s ON u.sales_id = s.id
       WHERE u.id = ?`
    ).get(req.userId) as any;
    if (!user) return res.status(404).json({ error: '用户不存在' });

    user = maybeResetQuota(user);

    // 计算到期剩余天数
    let daysLeft = 0;
    if (user.expire_date) {
      daysLeft = Math.max(0, Math.ceil((new Date(user.expire_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    res.json({ ...user, days_left: daysLeft });
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 用户订单
app.get('/api/user/orders', requireUser, (req: any, res) => {
  try {
    const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const orders = db.prepare(
      'SELECT * FROM orders WHERE contact = ? OR user_id = ? ORDER BY created_at DESC'
    ).all(user.phone, req.userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: '获取订单失败' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 购买套餐（用户自助，点完成付款立即激活）
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/orders/purchase', requireUser, (req: any, res) => {
  try {
    const { plan, package_type, months, amount } = req.body || {};
    // ADDON 加速包 months 为 0，需单独处理校验
    const isAddon = package_type === 'ADDON';
    if (!plan || !package_type || (!isAddon && !months) || amount === undefined || amount === null)
      return res.status(400).json({ error: '缺少必要参数' });

    // ── 服务端金额校验（防止客户端篡改价格）──────────────────────────────────
    const expectedPrice = getExpectedPrice(package_type, Number(months));
    if (expectedPrice !== null && Number(amount) !== expectedPrice)
      return res.status(400).json({ error: `价格异常，请刷新页面后重试（期望¥${expectedPrice}，收到¥${amount}）` });

    const now = new Date();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // ── ADDON 仅限有效专业版用户 ─────────────────────────────────────────────
    if (isAddon) {
      if (user.package_type !== 'VIP3' || !user.is_activated)
        return res.status(403).json({ error: 'AI加速包仅限专业版激活用户购买' });
      if (user.expire_date && new Date(user.expire_date) <= now)
        return res.status(403).json({ error: '您的专业版已过期，请先续费再购买加速包' });
    }

    // ── 续费时间计算规则 ────────────────────────────────────────────────────
    // 到期前续费：从当前到期日顺延；到期后续费：从购买当天起算
    let expireDate = new Date(now);
    if (user.expire_date && new Date(user.expire_date) > now) {
      expireDate = new Date(user.expire_date); // 未到期：顺延
    }
    // ADDON（加速包）不改到期时间
    if (package_type !== 'ADDON') {
      expireDate.setMonth(expireDate.getMonth() + Number(months));
    }
    const expireDateStr = expireDate.toISOString();
    const nowStr = now.toISOString();

    // ── AI 额度处理 ──────────────────────────────────────────────────────────
    let imageQuota = user.ai_image_quota || 0;
    let videoQuota = user.ai_video_quota || 0;
    let editQuota  = user.ai_edit_quota  || 0;
    let newPkgType = user.package_type || package_type;
    let quotaResetDate = user.quota_reset_date || nowStr;

    if (package_type === 'ADDON') {
      // 加速包：叠加额度，不改套餐类型和到期时间
      imageQuota += PACKAGE_QUOTA.ADDON.image;
      videoQuota += PACKAGE_QUOTA.ADDON.video;
      editQuota  += PACKAGE_QUOTA.ADDON.edit;
    } else {
      // 正式套餐：按新套餐重置月度额度
      const quota = PACKAGE_QUOTA[package_type] || { image: 0, video: 0, edit: 0 };
      imageQuota = quota.image;
      videoQuota = quota.video;
      editQuota  = quota.edit;
      newPkgType = package_type;
      quotaResetDate = nowStr;
    }

    // ── 软件授权码：每个账户唯一，首次购买时生成，续费不变 ──────────────────
    let licenseKey = user.license_key;
    if (!licenseKey && package_type !== 'ADDON') {
      // 生成唯一授权码（重试机制保证唯一性）
      let attempts = 0;
      while (!licenseKey && attempts < 10) {
        const candidate = generateLicenseKey(user.phone);
        const exists = db.prepare('SELECT id FROM users WHERE license_key = ?').get(candidate);
        if (!exists) licenseKey = candidate;
        attempts++;
      }
      if (!licenseKey) throw new Error('授权码生成失败，请重试');
    }

    // ── 创建订单 ─────────────────────────────────────────────────────────────
    const salesId = user.sales_id || null;
    const orderInfo = db.prepare(
      `INSERT INTO orders (customer_name, contact, plan, description, status, sales_id, user_id, months, package_type, amount, paid_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.company_name || user.phone,
      user.phone,
      plan,
      `在线购买 ${plan}`,
      salesId,
      req.userId,
      Number(months),
      package_type,
      Number(amount),
      nowStr,
      nowStr,
      nowStr,
    );

    // ── 激活/更新用户账户 ─────────────────────────────────────────────────────
    db.prepare(`
      UPDATE users SET
        is_activated     = 1,
        package_type     = ?,
        expire_date      = CASE WHEN ? != 'ADDON' THEN ? ELSE expire_date END,
        license_key      = COALESCE(license_key, ?),
        ai_image_quota   = ?,
        ai_video_quota   = ?,
        ai_edit_quota    = ?,
        quota_reset_date = ?,
        updated_at       = ?
      WHERE id = ?
    `).run(
      newPkgType,
      package_type, expireDateStr,   // CASE WHEN 参数
      licenseKey,                    // COALESCE：只在为 NULL 时写入
      imageQuota, videoQuota, editQuota,
      quotaResetDate,
      nowStr,
      req.userId,
    );

    res.json({
      success: true,
      order_id: orderInfo.lastInsertRowid,
      expire_date: package_type !== 'ADDON' ? expireDateStr : user.expire_date,
      package_type: newPkgType,
      license_key: licenseKey,
      days_left: Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    });
  } catch (err: any) {
    console.error('[purchase error]', err);
    res.status(500).json({ error: '购买失败，请稍后重试' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// AI 额度管理接口（桌面软件通过 license_key 调用）
// ════════════════════════════════════════════════════════════════════════════

// 查询当前额度（桌面软件生成前调用）
app.get('/api/license/quota', (req, res) => {
  try {
    const key = String(req.query.key || '').trim().toUpperCase();
    if (!key) return res.status(400).json({ error: '缺少授权码' });

    let user = db.prepare(
      'SELECT id, package_type, expire_date, is_activated, ai_image_quota, ai_video_quota, ai_edit_quota, quota_reset_date FROM users WHERE license_key = ?'
    ).get(key) as any;

    if (!user || !user.is_activated) return res.status(403).json({ error: '无效授权码' });

    // 每月自动重置额度（与 /api/user/info 保持一致）
    user = maybeResetQuota(user);

    const now = new Date();
    if (user.expire_date && new Date(user.expire_date) <= now)
      return res.status(403).json({ error: '授权已过期，请续费' });

    if (user.package_type !== 'VIP3')
      return res.status(403).json({ error: '该功能需要专业版' });
  
  res.json({
      image: user.ai_image_quota ?? 0,
      video: user.ai_video_quota ?? 0,
      edit:  user.ai_edit_quota  ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 消耗额度（桌面软件每次生成成功后调用）
app.post('/api/license/quota/use', (req, res) => {
  try {
    const key  = String(req.query.key || req.body?.key || '').trim().toUpperCase();
    const type = String(req.body?.type || ''); // 'image' | 'video' | 'edit'
    const count = Math.max(1, Number(req.body?.count) || 1);

    if (!key)  return res.status(400).json({ error: '缺少授权码' });
    if (!['image', 'video', 'edit'].includes(type))
      return res.status(400).json({ error: 'type 必须为 image/video/edit' });

    const user = db.prepare(
      'SELECT id, package_type, expire_date, is_activated, ai_image_quota, ai_video_quota, ai_edit_quota FROM users WHERE license_key = ?'
    ).get(key) as any;

    if (!user || !user.is_activated) return res.status(403).json({ error: '无效授权码' });
    if (user.package_type !== 'VIP3') return res.status(403).json({ error: '需要专业版' });

    const now = new Date();
    if (user.expire_date && new Date(user.expire_date) <= now)
      return res.status(403).json({ error: '授权已过期' });

    // 检查余量
    const fieldMap: Record<string, string> = { image: 'ai_image_quota', video: 'ai_video_quota', edit: 'ai_edit_quota' };
    const field   = fieldMap[type];
    const current = user[field] ?? 0;

    if (current < count)
      return res.status(402).json({
        error: `${type === 'image' ? 'AI生图' : type === 'video' ? 'AI视频' : 'AI剪辑'}次数不足（剩余${current}次），请购买加速包`,
        remaining: current,
      });

    // 扣减
    const nowStr = now.toISOString();
    db.prepare(`UPDATE users SET ${field} = ${field} - ?, updated_at = ? WHERE id = ?`)
      .run(count, nowStr, user.id);

    // 返回扣减后的全部余量
    const updated = db.prepare('SELECT ai_image_quota, ai_video_quota, ai_edit_quota FROM users WHERE id = ?').get(user.id) as any;
    res.json({
      success: true,
      remaining: {
        image: updated.ai_image_quota ?? 0,
        video: updated.ai_video_quota ?? 0,
        edit:  updated.ai_edit_quota  ?? 0,
      },
    });
  } catch (err: any) {
    console.error('[quota/use error]', err);
    res.status(500).json({ error: '额度扣减失败' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 桌面软件版本查询接口（公开）
// 用于 electron-updater 之外的自定义版本校验场景
// ════════════════════════════════════════════════════════════════════════════
// 修改方式：直接改这里的版本号即可，无需重启（热更新时生效）
const LATEST_DESKTOP_VERSION = {
  version:       '1.0.0',
  releaseDate:   '2026-03-15',
  downloadUrl:   '/downloads/星空AI_Setup_1.0.0.exe',
  releaseNotes:  '首个正式发行版',
  mandatory:     false,   // true = 强制更新，禁止跳过
};

app.get('/api/version', (_req, res) => {
  res.json({ ok: true, ...LATEST_DESKTOP_VERSION });
});

// ════════════════════════════════════════════════════════════════════════════
// 桌面软件授权验证接口（公开，供客户端调用）
// ════════════════════════════════════════════════════════════════════════════
app.get('/api/license/verify', (req, res) => {
  try {
    const key = String(req.query.key || '').trim().toUpperCase();
    if (!key) return res.status(400).json({ valid: false, error: '缺少授权码参数' });

    const user = db.prepare(
      'SELECT id, phone, package_type, expire_date, is_activated FROM users WHERE license_key = ?'
    ).get(key) as any;

    if (!user)       return res.json({ valid: false, error: '无效的授权码' });
    if (!user.is_activated) return res.json({ valid: false, error: '账户未激活' });

    const now = new Date();
    const expireDate = user.expire_date ? new Date(user.expire_date) : null;
    const isExpired  = !expireDate || expireDate <= now;

    if (isExpired) {
      return res.json({
        valid: false,
        error: '授权已过期，请续费后重启软件',
        expire_date: user.expire_date,
        package_type: user.package_type,
      });
    }

    const daysLeft = Math.ceil((expireDate!.getTime() - now.getTime()) / 86400000);
    res.json({
      valid: true,
      package_type: user.package_type,
      expire_date: user.expire_date,
      days_left: daysLeft,
      // 脱敏手机号，方便用户核对
      phone_masked: user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    });
  } catch (err: any) {
    console.error('[license/verify error]', err);
    res.status(500).json({ valid: false, error: '验证服务异常，请稍后重试' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 基础版 → 专业版 升级（剩余天数按日单价抵扣）
// ════════════════════════════════════════════════════════════════════════════
app.post('/api/orders/upgrade', requireUser, (req: any, res) => {
  try {
    const { plan, months, amount } = req.body || {};
    if (!plan || !months || amount === undefined)
      return res.status(400).json({ error: '缺少必要参数' });

    const now = new Date();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.package_type !== 'VIP1')
      return res.status(400).json({ error: '仅基础版用户可使用升级功能' });

    // ── 计算剩余天数抵扣 ──────────────────────────────────────────────────
    const daysLeft = user.expire_date
      ? Math.max(0, Math.ceil((new Date(user.expire_date).getTime() - now.getTime()) / 86400000))
      : 0;
    // 基础版日单价 ¥99 / 30 天，四舍五入
    const dailyRate  = 99 / 30;
    const credit     = Math.round(daysLeft * dailyRate);

    // ── 服务端金额校验（防篡改）──────────────────────────────────────────────
    const basePro = getExpectedPrice('VIP3', Number(months));
    if (basePro !== null) {
      const expectedFinal = Math.max(0, basePro - credit);
      if (Math.abs(Number(amount) - expectedFinal) > 1) { // 允许 ¥1 的舍入误差
        return res.status(400).json({
          error: `金额异常，期望¥${expectedFinal}，请刷新重试`,
          expected: expectedFinal,
        });
      }
    }

    // ── 升级后到期时间：从今天起算新套餐时长 ─────────────────────────────
    const expireDate = new Date(now);
    expireDate.setMonth(expireDate.getMonth() + Number(months));
  const expireDateStr = expireDate.toISOString();
    const nowStr = now.toISOString();

    // ── 专业版 AI 额度 ────────────────────────────────────────────────────
    const quota = PACKAGE_QUOTA['VIP3'];

    // ── 生成 / 保留授权码 ─────────────────────────────────────────────────
    let licenseKey = user.license_key;
    if (!licenseKey) {
      let attempts = 0;
      while (!licenseKey && attempts < 10) {
        const candidate = generateLicenseKey(user.phone);
        const exists = db.prepare('SELECT id FROM users WHERE license_key = ?').get(candidate);
        if (!exists) licenseKey = candidate;
        attempts++;
      }
      if (!licenseKey) throw new Error('授权码生成失败，请重试');
    }

    // ── 创建升级订单 ──────────────────────────────────────────────────────
    const salesId = user.sales_id || null;
    const orderInfo = db.prepare(
      `INSERT INTO orders (customer_name, contact, plan, description, status, sales_id, user_id, months, package_type, amount, paid_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, 'VIP3', ?, ?, ?, ?)`
    ).run(
      user.company_name || user.phone,
      user.phone,
      plan,
      `升级专业版（抵扣¥${credit}，实付¥${amount}）`,
      salesId, req.userId,
      Number(months), Number(amount),
      nowStr, nowStr, nowStr,
    );

    // ── 升级用户账户 ──────────────────────────────────────────────────────
    db.prepare(`
      UPDATE users SET 
        is_activated     = 1,
        package_type     = 'VIP3',
        expire_date      = ?,
        license_key      = COALESCE(license_key, ?),
        ai_image_quota   = ?,
        ai_video_quota   = ?,
        ai_edit_quota    = ?,
        quota_reset_date = ?,
        updated_at       = ?
      WHERE id = ?
    `).run(expireDateStr, licenseKey, quota.image, quota.video, quota.edit, nowStr, nowStr, req.userId);

    res.json({
      success: true,
      order_id: orderInfo.lastInsertRowid,
      expire_date: expireDateStr,
      package_type: 'VIP3',
      license_key: licenseKey,
      credit_used: credit,
      days_left: Math.ceil((expireDate.getTime() - now.getTime()) / 86400000),
    });
  } catch (err: any) {
    console.error('[upgrade error]', err);
    res.status(500).json({ error: '升级失败，请稍后重试' });
  }
});

// 定制需求表单（不需要登录）
app.post('/api/orders', (req, res) => {
  try {
    const { customer_name, contact, plan, description, sales_code } = req.body || {};
    if (!customer_name || !contact || !plan)
      return res.status(400).json({ error: '姓名/公司名、联系方式、套餐不能为空' });

    let salesId: number | null = null;
    if (sales_code && String(sales_code).trim()) {
      const salesRow = db.prepare('SELECT id FROM sales WHERE code_prefix = ?').get(String(sales_code).trim()) as any;
      if (salesRow) salesId = salesRow.id;
    }

    const now = new Date().toISOString();
    const info = db.prepare(
      `INSERT INTO orders (customer_name, contact, plan, description, status, sales_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`
    ).run(customer_name, contact, plan, description || '', salesId, now, now);

    res.json({ id: info.lastInsertRowid, status: 'pending' });
  } catch (err: any) {
    console.error('[orders POST error]', err);
    res.status(500).json({ error: '提交失败，请稍后重试' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// 管理员 API
// ════════════════════════════════════════════════════════════════════════════

// 向管理员手机发送登录验证码
app.post('/api/admin/send-code', async (req, res) => {
  const rlKey = `admin-sms:${ADMIN_PHONE}`;
  if (!checkRateLimit(rlKey))
    return res.status(429).json({ error: '获取验证码过于频繁，请 15 分钟后再试' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  smsCodes.set(ADMIN_PHONE, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  if (SMS_READY) {
    const { ok, msg } = await sendAliyunSMS(ADMIN_PHONE, code);
    if (!ok) {
      smsCodes.delete(ADMIN_PHONE);
      return res.status(500).json({ error: `短信发送失败：${msg}` });
    }
    recordLoginFailure(rlKey);
    return res.json({ success: true });
  }

  if (NODE_ENV === 'production') {
    smsCodes.delete(ADMIN_PHONE);
    return res.status(500).json({ error: '短信服务未配置，无法发送验证码' });
  }

  console.log(`[ADMIN SMS DEV] 管理员验证码 → ${code}`);
  res.json({ success: true });
});

// 管理员登录：验证码校验
app.post('/api/admin/login', (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: '请输入验证码' });

  const rlKey = `admin-verify:${ADMIN_PHONE}`;
  if (!checkRateLimit(rlKey))
    return res.status(429).json({ error: '验证尝试过于频繁，请稍后再试' });

  const stored = smsCodes.get(ADMIN_PHONE);
  if (!stored || stored.code !== String(code).trim() || Date.now() > stored.expiresAt) {
    recordLoginFailure(rlKey);
    return res.status(401).json({ error: '验证码错误或已过期，请重新获取' });
  }

  smsCodes.delete(ADMIN_PHONE);
  clearLoginAttempts(rlKey);
  const sessionToken = generateToken();
  adminTokens.set(sessionToken, Date.now() + ADMIN_SESSION_TTL);
  res.json({ token: sessionToken, success: true });
});

app.post('/api/admin/logout', (req, res) => {
  const token = (req.headers['x-admin-token'] || req.headers.authorization || '')
    .toString().replace(/^Bearer\s+/i, '');
  if (token) adminTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/content', requireAdmin, (_req, res) => res.json(getAllContentBlocks()));
app.post('/api/admin/content', requireAdmin, (req, res) => {
  const items = req.body?.items as { key: string; value: string }[] | undefined;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items 必须为非空数组' });
  upsertContentBlocks(items.filter(it => it && typeof it.key === 'string').map(it => ({ key: it.key, value: String(it.value ?? '') })));
  res.json({ success: true });
});

// 订单列表（含用户到期时间）
app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db.prepare(
    `SELECT o.*, s.name as sales_name, s.code_prefix as sales_code,
            u.expire_date as user_expire_date, u.package_type as user_package_type
     FROM orders o
     LEFT JOIN sales s ON o.sales_id = s.id
     LEFT JOIN users u ON o.user_id = u.id
     ORDER BY o.created_at DESC`
  ).all();
  res.json(rows);
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: '无效订单ID' });
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status 为必填' });
  const info = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, new Date().toISOString(), id);
  if (info.changes === 0) return res.status(404).json({ error: '订单不存在' });
  res.json({ success: true });
});

// 用户列表（含到期时间 + 倒计时）
app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const now = Date.now();
  const users = db.prepare(
    `SELECT u.id, u.phone, u.company_name, u.is_activated, u.package_type,
            u.expire_date, u.ai_image_quota, u.ai_video_quota, u.ai_edit_quota,
            u.created_at, s.name as sales_name, s.code_prefix as sales_code
     FROM users u
     LEFT JOIN sales s ON u.sales_id = s.id
     ORDER BY u.created_at DESC`
  ).all() as any[];
  const result = users.map(u => ({
    ...u,
    days_left: u.expire_date
      ? Math.max(0, Math.ceil((new Date(u.expire_date).getTime() - now) / 86400000))
      : 0,
  }));
  res.json(result);
});

// 销售列表
app.get('/api/admin/sales', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT id, name, code_prefix, phone, created_at FROM sales ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/admin/sales', requireAdmin, (req, res) => {
  const { name, code_prefix, phone, password } = req.body || {};
  if (!name || !code_prefix) return res.status(400).json({ error: '名称和编码前缀不能为空' });
  const now = new Date().toISOString();
  try {
    const info = db.prepare('INSERT INTO sales (name, code_prefix, phone, password, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(name, code_prefix, phone || '', hashPassword(password || '123456'), now);
    res.json({ success: true, id: info.lastInsertRowid, code_prefix });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: '编码前缀已存在' });
    res.status(500).json({ error: '添加失败' });
  }
});

app.delete('/api/admin/sales/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare('DELETE FROM sales WHERE id = ?').run(id);
  if (info.changes === 0) return res.status(404).json({ error: '销售不存在' });
  res.json({ success: true });
});

// 激活码列表（保留，用于手动/线下场景）
app.get('/api/admin/codes', requireAdmin, (_req, res) => {
  const now = Date.now();
  const codes = db.prepare(
    `SELECT ac.*, s.name as sales_name, u.phone as user_phone, u.expire_date as user_expire_date
    FROM activation_codes ac
    LEFT JOIN sales s ON ac.sales_id = s.id
    LEFT JOIN users u ON ac.user_id = u.id
     ORDER BY ac.created_at DESC`
  ).all() as any[];
  res.json(codes.map(c => ({
    ...c,
    days_left: c.user_expire_date
      ? Math.max(0, Math.ceil((new Date(c.user_expire_date).getTime() - now) / 86400000))
      : 0,
  })));
});

app.post('/api/admin/codes/generate', requireAdmin, (req, res) => {
  const { sales_id, package_type, months, count = 1 } = req.body || {};
  if (!sales_id || !package_type || !months) return res.status(400).json({ error: '缺少必要参数' });
  const sales = db.prepare('SELECT * FROM sales WHERE id = ?').get(Number(sales_id)) as any;
  if (!sales) return res.status(400).json({ error: '销售不存在' });

  const codes: string[] = [];
  const now = new Date().toISOString();
  for (let i = 0; i < Math.min(Number(count), 100); i++) {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${sales.code_prefix}-${package_type}-${months}M-${random}`;
    db.prepare('INSERT INTO activation_codes (code, sales_id, package_type, months, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(code, Number(sales_id), package_type, Number(months), now);
    codes.push(code);
  }
  res.json({ success: true, codes });
});

// ════════════════════════════════════════════════════════════════════════════
// 销售 API
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/sales/login', (req, res) => {
  try {
    const { code_prefix, password } = req.body || {};
    if (!code_prefix || !password) return res.status(400).json({ error: '销售码和密码不能为空' });

    const rlKey = `sales:${code_prefix}`;
    if (!checkRateLimit(rlKey))
      return res.status(429).json({ error: '登录尝试过于频繁，请 15 分钟后再试' });

    const s = db.prepare('SELECT * FROM sales WHERE code_prefix = ?').get(code_prefix) as any;
    if (!s) { recordLoginFailure(rlKey); return res.status(401).json({ error: '销售码不存在' }); }

    const storedPw = s.password || '';
    if (!storedPw) return res.status(401).json({ error: '账户密码未设置，请联系管理员' });
    const hashedInput = hashPassword(password);
    const match = storedPw === hashedInput || storedPw === password;
    if (!match) { recordLoginFailure(rlKey); return res.status(401).json({ error: '密码错误' }); }
    if (storedPw !== hashedInput) {
      db.prepare('UPDATE sales SET password = ? WHERE id = ?').run(hashedInput, s.id);
    }

    clearLoginAttempts(rlKey);
    const token = generateToken();
    salesTokens.set(token, s.id);
    res.json({ success: true, token, sales: { id: s.id, name: s.name, code_prefix: s.code_prefix, phone: s.phone } });
  } catch (err: any) {
    console.error('[sales/login error]', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 销售的客户列表（含到期时间倒计时）
app.get('/api/sales/customers', requireSales, (req: any, res) => {
  const now = Date.now();
  const customers = db.prepare(
    `SELECT u.id, u.phone, u.company_name, u.is_activated, u.package_type,
            u.expire_date, u.created_at
     FROM users u
     WHERE u.sales_id = ?
     ORDER BY u.created_at DESC`
  ).all(req.salesId) as any[];
  res.json(customers.map(u => ({
    ...u,
    days_left: u.expire_date
      ? Math.max(0, Math.ceil((new Date(u.expire_date).getTime() - now) / 86400000))
      : 0,
  })));
});

// 销售的订单列表
app.get('/api/sales/orders', requireSales, (req: any, res) => {
  const rows = db.prepare(
    `SELECT o.*, s.name as sales_name, s.code_prefix as sales_code
     FROM orders o
     LEFT JOIN sales s ON o.sales_id = s.id
     WHERE o.sales_id = ?
     ORDER BY o.created_at DESC`
  ).all(req.salesId);
  res.json(rows);
});

// ════════════════════════════════════════════════════════════════════════════
// 生产环境托管静态文件
// ════════════════════════════════════════════════════════════════════════════
if (NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ════════════════════════════════════════════════════════════════════════════
// 微信支付接口
// ════════════════════════════════════════════════════════════════════════════

// 创建支付订单（用户扫码支付）
app.post('/api/pay/create', requireUser, async (req: any, res) => {
  try {
    const { order_id, package_type, months, amount } = req.body || {};
    
    if (!order_id || !package_type || amount === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 服务端金额校验
    const expectedPrice = getExpectedPrice(package_type, Number(months || 0));
    if (expectedPrice !== null && Number(amount) !== expectedPrice) {
      return res.status(400).json({ error: `价格异常，请刷新页面后重试` });
    }

    // 获取订单信息
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, req.userId) as any;
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 如果已支付，直接返回成功
    if (order.status === 'paid') {
      return res.json({ success: true, status: 'paid', message: '订单已完成支付' });
    }

    // 创建微信支付订单
    const description = `星空AI-${package_type === 'ADDON' ? 'AI加速包' : package_type === 'VIP3' ? '专业版' : '基础版'}${months}个月`;
    
    const payResult = await createWechatPayOrder(order_id, Number(amount), description);
    
    // 更新订单的 out_trade_no
    db.prepare('UPDATE orders SET description = ? WHERE id = ?').run(description, order_id);

    res.json({
      success: true,
      code_url: payResult.code_url,
      order_id: order_id,
    });
  } catch (err: any) {
    console.error('[pay/create error]', err);
    res.status(500).json({ error: err.message || '创建支付订单失败' });
  }
});

// 微信支付回调（支付成功后自动激活）
app.post('/api/pay/notify', async (req, res) => {
  try {
    const body = req.body;
    console.log('[WechatPay] notify received:', JSON.stringify(body));

    // 解析XML
    const parseXml = (xml: string): Record<string, string> => {
      const result: Record<string, string> = {};
      const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/(\w+)>/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        result[match[1]] = match[2];
      }
      // 也处理非CDATA格式
      const regex2 = /<(\w+)>([^<]+)<\/\1>/g;
      while ((match = regex2.exec(xml)) !== null) {
        if (!result[match[1]]) result[match[1]] = match[2];
      }
      return result;
    };

    const xmlStr = typeof body === 'string' ? body : '';
    const params = parseXml(xmlStr);

    // 验证签名
    const sign = params.sign;
    delete params.sign;
    const calculatedSign = generateWechatSign(params);
    
    if (sign !== calculatedSign) {
      console.error('[WechatPay] 签名验证失败', { sign, calculatedSign });
      return res.status(400).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名失败]]></return_msg></xml>');
    }

    if (params.return_code !== 'SUCCESS') {
      return res.status(400).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[返回失败]]></return_msg></xml>');
    }

    if (params.result_code !== 'SUCCESS') {
      console.error('[WechatPay] 业务失败', params);
      return res.status(400).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[业务失败]]></return_msg></xml>');
    }

    // 支付成功，更新订单状态
    const outTradeNo = params.out_trade_no;
    const transactionId = params.transaction_id;
    const paidAmount = Number(params.total_fee) / 100; // 分转元

    // 查找订单（通过 out_trade_no 或 description 匹配）
    // 这里简化处理，实际应该存储 out_trade_no
    const orders = db.prepare('SELECT * FROM orders WHERE status != ? ORDER BY created_at DESC LIMIT 10').all('paid') as any[];
    
    let updatedOrder: any = null;
    for (const order of orders) {
      // 简单匹配：金额相近且时间相近
      if (Math.abs(order.amount - paidAmount) < 1) {
        db.prepare('UPDATE orders SET status = ?, paid_at = ?, transaction_id = ?, updated_at = ? WHERE id = ?')
          .run('paid', new Date().toISOString(), transactionId, new Date().toISOString(), order.id);
        
        // 激活用户套餐
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(order.user_id) as any;
        if (user) {
          const now = new Date();
          let expireDate = new Date(now);
          if (user.expire_date && new Date(user.expire_date) > now) {
            expireDate = new Date(user.expire_date);
          }
          if (order.package_type !== 'ADDON') {
            expireDate.setMonth(expireDate.getMonth() + Number(order.months));
          }
          
          const quota = PACKAGE_QUOTA[order.package_type] || { image: 0, video: 0, edit: 0 };
          let imageQuota = user.ai_image_quota || 0;
          let videoQuota = user.ai_video_quota || 0;
          let editQuota = user.ai_edit_quota || 0;
          
          if (order.package_type === 'ADDON') {
            imageQuota += quota.image;
            videoQuota += quota.video;
            editQuota += quota.edit;
          } else {
            imageQuota = quota.image;
            videoQuota = quota.video;
            editQuota = quota.edit;
          }

          db.prepare(`
            UPDATE users SET
              is_activated = 1,
              package_type = COALESCE(?, package_type),
              expire_date = CASE WHEN ? != 'ADDON' THEN ? ELSE expire_date END,
              ai_image_quota = ?,
              ai_video_quota = ?,
              ai_edit_quota = ?,
              updated_at = ?
            WHERE id = ?
          `).run(
            order.package_type,
            order.package_type,
            expireDate.toISOString(),
            imageQuota, videoQuota, editQuota,
            new Date().toISOString(),
            user.id
          );
        }
        
        updatedOrder = order;
        break;
      }
    }

    if (updatedOrder) {
      console.log('[WechatPay] 订单已激活:', updatedOrder.id);
    }

    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
  } catch (err: any) {
    console.error('[WechatPay] notify error', err);
    res.status(500).send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>');
  }
});

// 查询支付状态
app.get('/api/pay/status/:orderId', requireUser, (req: any, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const order = db.prepare('SELECT id, status, amount, package_type, months FROM orders WHERE id = ? AND user_id = ?')
      .get(orderId, req.userId) as any;
    
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }
    
    res.json({
      order_id: order.id,
      status: order.status,
      amount: order.amount,
      package_type: order.package_type,
      months: order.months,
    });
  } catch (err: any) {
    console.error('[pay/status error]', err);
    res.status(500).json({ error: '查询失败' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ 服务启动：端口 ${PORT} | 环境: ${NODE_ENV}`);
});
