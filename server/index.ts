import express from 'express';
import dotenv from 'dotenv';
import { initDb, getAllContentBlocks, upsertContentBlocks, db } from './db';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

const app = express();
const PORT = process.env.PORT || 4000;

// Simple CORS middleware (no额外依赖)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

initDb();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-admin-token';

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers['x-admin-token'] || req.headers.authorization || '').toString().replace(/^Bearer\s+/i, '');
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Public: get content for frontend
app.get('/api/public/content', (_req, res) => {
  const content = getAllContentBlocks();
  res.json(content);
});

// Public: create order
app.post('/api/orders', (req, res) => {
  const { customer_name, contact, plan, description } = req.body || {};

  if (!customer_name || !contact || !plan) {
    return res.status(400).json({ error: 'customer_name, contact, plan 为必填项' });
  }

  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO orders (customer_name, contact, plan, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'pending', ?, ?)
  `);
  const info = stmt.run(customer_name, contact, plan, description || '', now, now);

  res.json({
    id: info.lastInsertRowid,
    status: 'pending',
  });
});

// Admin: login (just validate token)
app.post('/api/admin/login', (req, res) => {
  const { token } = req.body || {};
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: '无效的管理令牌' });
  }
  res.json({ success: true });
});

// Admin: get all content blocks
app.get('/api/admin/content', requireAdmin, (_req, res) => {
  const content = getAllContentBlocks();
  res.json(content);
});

// Admin: update/insert content blocks
app.post('/api/admin/content', requireAdmin, (req, res) => {
  const items = req.body?.items as { key: string; value: string }[] | undefined;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items 必须为非空数组' });
  }
  const sanitized = items
    .filter((it) => it && typeof it.key === 'string')
    .map((it) => ({ key: it.key, value: String(it.value ?? '') }));

  if (sanitized.length === 0) {
    return res.status(400).json({ error: '无有效内容项' });
  }

  upsertContentBlocks(sanitized);
  res.json({ success: true });
});

// Admin: list orders
app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const rows = db
    .prepare('SELECT id, customer_name, contact, plan, description, status, created_at, updated_at FROM orders ORDER BY created_at DESC')
    .all();
  res.json(rows);
});

// Admin: update order status
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: '无效的订单ID' });
  }
  const { status } = req.body || {};
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status 为必填字符串' });
  }
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?');
  const info = stmt.run(status, now, id);
  if (info.changes === 0) {
    return res.status(404).json({ error: '订单不存在' });
  }
  res.json({ success: true });
});

// ============ 用户相关API ============

// 发送验证码（模拟，实际需要对接短信服务）
function generateSmsCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送验证码
app.post('/api/sms/send', (req, res) => {
  const { phone } = req.body || {};
  if (!phone) {
    return res.status(400).json({ error: '手机号不能为空' });
  }
  // 这里应该对接阿里云/腾讯云短信服务
  // 模拟：直接返回成功
  const code = generateSmsCode();
  console.log(`[模拟] 验证码: ${code}`);
  res.json({ success: true, message: '验证码已发送' });
});

// 用户注册
app.post('/api/auth/register', (req, res) => {
  const { phone, password, smsCode } = req.body || {};
  if (!phone || !password || !smsCode) {
    return res.status(400).json({ error: '手机号、密码、验证码不能为空' });
  }
  // 验证码校验（简化版，实际应该存Redis或数据库）
  if (smsCode !== '123456' && smsCode.length !== 6) {
    return res.status(400).json({ error: '验证码错误' });
  }
  
  const now = new Date().toISOString();
  try {
    const stmt = db.prepare(`
      INSERT INTO users (phone, password, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(phone, password, now, now);
    res.json({ success: true, userId: info.lastInsertRowid });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: '该手机号已注册' });
    }
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body || {};
  if (!phone || !password) {
    return res.status(400).json({ error: '手机号和密码不能为空' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
  if (!user) {
    return res.status(400).json({ error: '用户不存在' });
  }
  if (user.password !== password) {
    return res.status(400).json({ error: '密码错误' });
  }
  
  // 返回用户信息（不返回密码）
  const { password: _, ...userInfo } = user;
  res.json({ success: true, user: userInfo });
});

// 获取用户信息
app.get('/api/user/info', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  
  // 简化：token就是手机号
  const user = db.prepare('SELECT id, phone, company_name, is_activated, package_type, expire_date FROM users WHERE phone = ?').get(token) as any;
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

// ============ 激活码相关API ============

// 验证激活码
app.get('/api/activation/verify/:code', (req, res) => {
  const { code } = req.params;
  
  const activationCode = db.prepare('SELECT * FROM activation_codes WHERE code = ?').get(code) as any;
  if (!activationCode) {
    return res.status(404).json({ error: '激活码不存在' });
  }
  if (activationCode.used) {
    return res.status(400).json({ error: '该激活码已被使用' });
  }
  
  // 获取套餐信息
  const packageInfo = db.prepare('SELECT * FROM packages WHERE type = ?').get(activationCode.package_type) as any;
  
  res.json({
    valid: true,
    code: activationCode.code,
    package_type: activationCode.package_type,
    package_name: packageInfo?.name,
    months: activationCode.months
  });
});

// 激活账户
app.post('/api/activation/activate', (req, res) => {
  const { phone, password, activationCode, companyName, licenseFile } = req.body || {};
  
  if (!phone || !password || !activationCode) {
    return res.status(400).json({ error: '手机号、密码、激活码不能为空' });
  }
  
  // 验证激活码
  const codeInfo = db.prepare('SELECT * FROM activation_codes WHERE code = ?').get(activationCode) as any;
  if (!codeInfo) {
    return res.status(400).json({ error: '激活码不存在' });
  }
  if (codeInfo.used) {
    return res.status(400).json({ error: '激活码已被使用' });
  }
  
  // 获取套餐时长
  const packageInfo = db.prepare('SELECT * FROM packages WHERE type = ?').get(codeInfo.package_type) as any;
  const months = codeInfo.months || 1;
  const expireDate = new Date();
  expireDate.setMonth(expireDate.getMonth() + months);
  const expireDateStr = expireDate.toISOString();
  
  const now = new Date().toISOString();
  
  // 更新用户信息或创建用户
  const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (existingUser) {
    // 更新已有用户
    db.prepare(`
      UPDATE users SET 
        password = ?, 
        company_name = ?,
        license_file = ?,
        activation_code = ?,
        package_type = ?,
        expire_date = ?,
        is_activated = 1,
        updated_at = ?
      WHERE phone = ?
    `).run(password, companyName || '', licenseFile || '', activationCode, codeInfo.package_type, expireDateStr, now, phone);
  } else {
    // 创建新用户
    db.prepare(`
      INSERT INTO users (phone, password, company_name, license_file, activation_code, package_type, expire_date, is_activated, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(phone, password, companyName || '', licenseFile || '', activationCode, codeInfo.package_type, expireDateStr, now, now);
  }
  
  // 标记激活码为已使用
  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone) as any;
  db.prepare('UPDATE activation_codes SET used = 1, used_at = ?, user_id = ? WHERE code = ?').run(now, user.id, activationCode);
  
  res.json({ success: true, message: '激活成功', expire_date: expireDateStr });
});

// ============ 套餐相关API ============

// 获取套餐列表
app.get('/api/packages', (_req, res) => {
  const packages = db.prepare('SELECT id, name, type, price, months, features FROM packages ORDER BY price').all();
  res.json(packages);
});

// ============ 激活码管理API（后台） ============

// 生成激活码
app.post('/api/admin/codes/generate', requireAdmin, (req, res) => {
  const { sales_id, package_type, months, count = 1 } = req.body || {};
  
  if (!sales_id || !package_type || !months) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  // 获取销售前缀
  const sales = db.prepare('SELECT * FROM sales WHERE id = ?').get(sales_id) as any;
  if (!sales) {
    return res.status(400).json({ error: '销售不存在' });
  }
  
  // 生成激活码
  const codes: string[] = [];
  const now = new Date().toISOString();
  
  for (let i = 0; i < count; i++) {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${sales.code_prefix}-${package_type}-${months}M-${random}`;
    
    db.prepare(`
      INSERT INTO activation_codes (code, sales_id, package_type, months, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(code, sales_id, package_type, months, now);
    
    codes.push(code);
  }
  
  res.json({ success: true, codes });
});

// 获取激活码列表
app.get('/api/admin/codes', requireAdmin, (_req, res) => {
  const codes = db.prepare(`
    SELECT ac.*, s.name as sales_name, u.phone as user_phone
    FROM activation_codes ac
    LEFT JOIN sales s ON ac.sales_id = s.id
    LEFT JOIN users u ON ac.user_id = u.id
    ORDER BY ac.created_at DESC
  `).all();
  res.json(codes);
});

// 获取销售列表
app.get('/api/admin/sales', requireAdmin, (_req, res) => {
  const sales = db.prepare('SELECT * FROM sales ORDER BY created_at DESC').all();
  res.json(sales);
});

// 添加销售
app.post('/api/admin/sales', requireAdmin, (req, res) => {
  const { name, code_prefix, phone } = req.body || {};
  if (!name || !code_prefix) {
    return res.status(400).json({ error: '名称和编码前缀不能为空' });
  }
  
  const now = new Date().toISOString();
  try {
    const info = db.prepare('INSERT INTO sales (name, code_prefix, phone, created_at) VALUES (?, ?, ?, ?)').run(name, code_prefix, phone || '', now);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: '编码前缀已存在' });
    }
    res.status(500).json({ error: '添加失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
});



