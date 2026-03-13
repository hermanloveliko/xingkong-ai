import React, { useState, useEffect, useCallback } from 'react';

// ─── 类型 ────────────────────────────────────────────────────────────────────
type Page = 'home' | 'features' | 'pricing' | 'contact' | 'login' | 'register'
  | 'profile' | 'admin' | 'sales';

interface User {
  id: number;
  phone: string;
  company_name?: string;
  is_activated: number;
  package_type?: string;
  expire_date?: string;
  days_left?: number;
  ai_image_quota?: number;
  ai_video_quota?: number;
  ai_edit_quota?: number;
  sales_name?: string;
  sales_code?: string;
  license_key?: string;
}

interface PayingPlan {
  name: string;
  packageType: string;
  period: string;
  price: number;          // 原价
  months: number;
  isUpgrade?: boolean;    // 是否升级单
  credit?: number;        // 可抵扣金额
  finalPrice?: number;    // 实付金额
}

// ─── API 工具 ─────────────────────────────────────────────────────────────────
const API = '/api';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> || {}) } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ─── 套餐价格配置 ─────────────────────────────────────────────────────────────
const PKG_PLANS = [
  {
    id: 'VIP1',
    name: '基础版',
    desc: '¥99/月 · 适合入门经营管理',
    color: '#6366f1',
    features: [
      '✅ 经营复盘（AI 门店大脑对话）',
      '✅ 日常管理（SOP / 待办事项）',
      '✅ 员工管理（档案 / 排班 / 工资）',
      '——',
      '🔒 AI 营销工坊（专业版）',
      '🔒 经营分析（专业版）',
      '🔒 财务报税（专业版）',
    ],
    prices: [
      { period: '月付', months: 1,  price: 99  },
      { period: '季付', months: 3,  price: 288 },
      { period: '年付', months: 12, price: 999 },
    ],
  },
  {
    id: 'VIP3',
    name: '专业版',
    desc: '¥299/月 · 全功能解锁',
    color: '#f59e0b',
    highlight: true,
    features: [
      '✅ 经营复盘（AI 门店大脑对话）',
      '✅ 日常管理（SOP / 待办事项）',
      '✅ 员工管理（档案 / 排班 / 工资）',
      '✅ AI 营销工坊（生图20张/月 · 视频15个/月 · 剪辑15次/月 · 账号监控）',
      '✅ 经营分析（KPI 图表 · 月度深度报告）',
      '✅ 财务报税（记账 · 发票 · 季报汇总）',
    ],
    prices: [
      { period: '月付', months: 1,  price: 299  },
      { period: '季付', months: 3,  price: 888  },
      { period: '年付', months: 12, price: 3388 },
    ],
  },
];

// AI 加速包（仅专业版用户可购买）
// ⚠️ months 必须为 0，与后端 SERVER_PRICES['ADDON_0M'] 对应，确保价格校验正常
const ADDON = { id: 'ADDON', name: 'AI 加速包', price: 88, months: 0 };

// ─── 主组件 ──────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [mobileMenu, setMobileMenu] = useState(false);

  // 付款弹窗
  const [payingPlan, setPayingPlan] = useState<PayingPlan | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState<{ expire_date: string; days_left: number; package_type?: string } | null>(null);

  // ── 加载用户信息 ────────────────────────────────────────────────────────────
  const loadUser = useCallback(async (t: string) => {
    if (!t) return;
    try {
      const u = await apiRequest<User>('/user/info', {}, t);
      setUser(u);
    } catch {
      setToken(''); localStorage.removeItem('token');
    }
  }, []);

  useEffect(() => { if (token) loadUser(token); }, [token, loadUser]);

  function logout() {
    if (token) apiRequest('/auth/logout', { method: 'POST' }, token).catch(() => {});
    setToken(''); setUser(null); localStorage.removeItem('token');
    setPage('home');
  }

  function navigate(p: Page) { setPage(p); setMobileMenu(false); window.scrollTo(0, 0); }

  // ── 购买/升级套餐 ──────────────────────────────────────────────────────────
  async function handlePurchase() {
    if (!payingPlan || !token) return;
    setPayLoading(true);
    try {
      const endpoint = payingPlan.isUpgrade ? '/orders/upgrade' : '/orders/purchase';
      const payAmount = payingPlan.isUpgrade ? (payingPlan.finalPrice ?? payingPlan.price) : payingPlan.price;
      const data = await apiRequest<{ expire_date: string; days_left: number; package_type: string }>(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify({
            plan: payingPlan.name,
            package_type: payingPlan.packageType,
            months: payingPlan.months,
            amount: payAmount,
          }),
        },
        token,
      );
      setPaySuccess(data);
      await loadUser(token);
    } catch (err: any) {
      alert(err.message || '操作失败，请稍后重试');
    } finally {
      setPayLoading(false);
    }
  }

  function openPayModal(plan: PayingPlan) {
    if (!token) { navigate('login'); return; }
    setPayingPlan(plan); setPaySuccess(null);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 页面渲染
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', background: '#0a0a1a', color: '#e2e8f0' }}>
      <Navbar user={user} page={page} navigate={navigate} logout={logout} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} />

      {page === 'home'     && <HomePage navigate={navigate} />}
      {page === 'features' && <FeaturesPage />}
      {page === 'pricing'  && <PricingPage user={user} openPayModal={openPayModal} navigate={navigate} />}
      {page === 'contact'  && <ContactPage user={user} token={token} />}
      {page === 'login'    && <LoginPage token={token} setToken={setToken} setUser={setUser} navigate={navigate} />}
      {page === 'register' && <RegisterPage setToken={setToken} navigate={navigate} />}
      {page === 'profile'  && <ProfilePage user={user} token={token} loadUser={loadUser} openPayModal={openPayModal} navigate={navigate} />}
      {page === 'admin'    && <AdminPage token={token} />}
      {page === 'sales'    && <SalesPage token={token} />}

      {/* 付款弹窗 */}
      {payingPlan && (
        <PayModal
          plan={payingPlan}
          loading={payLoading}
          success={paySuccess}
          onPay={handlePurchase}
          onClose={() => { setPayingPlan(null); setPaySuccess(null); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 导航栏
// ════════════════════════════════════════════════════════════════════════════
function Navbar({ user, page, navigate, logout, mobileMenu, setMobileMenu }: any) {
  const links: { label: string; page: Page }[] = [
    { label: '首页', page: 'home' },
    { label: '功能', page: 'features' },
    { label: '价格', page: 'pricing' },
    { label: '联系我们', page: 'contact' },
  ];
  return (
    <nav style={{ background: 'rgba(10,10,26,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 1000, padding: '0 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64 }}>
        <span style={{ fontWeight: 700, fontSize: 20, color: '#6366f1', cursor: 'pointer', marginRight: 'auto' }} onClick={() => navigate('home')}>
          ✦ 星空AI
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {links.map(l => (
            <button key={l.page} onClick={() => navigate(l.page)}
              style={{ background: 'none', border: 'none', color: page === l.page ? '#6366f1' : '#94a3b8', cursor: 'pointer', padding: '8px 12px', borderRadius: 6, fontWeight: page === l.page ? 600 : 400, fontSize: 14 }}>
              {l.label}
            </button>
          ))}
          {user ? (
            <>
              <button onClick={() => navigate('profile')} style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}>
                👤 {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                {user.is_activated ? ` · ${user.package_type === 'VIP3' ? '专业版' : '基础版'}` : ' · 未激活'}
              </button>
              <button onClick={logout} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}>退出</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('login')} style={{ background: 'none', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}>登录</button>
              <button onClick={() => navigate('register')} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }}>注册</button>
            </>
          )}
          <button onClick={() => navigate('admin')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, padding: '4px 8px' }}>管理</button>
          <button onClick={() => navigate('sales')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11, padding: '4px 8px' }}>销售</button>
        </div>
      </div>
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 首页
// ════════════════════════════════════════════════════════════════════════════
function HomePage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      {/* Hero */}
      <section style={{ textAlign: 'center', padding: '120px 24px 80px', background: 'radial-gradient(ellipse at top, #1a1040 0%, #0a0a1a 60%)' }}>
        <div style={{ display: 'inline-block', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#a5b4fc', marginBottom: 24 }}>
          🚀 AI 赋能企业增长 · 智能内容管理平台
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 800, margin: '0 0 24px', lineHeight: 1.15 }}>
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>星空AI</span>
          <br />智能企业解决方案
        </h1>
        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
          用 AI 重塑企业内容创作、品牌管理与业务增长。一站式智能平台，让每个企业都能驾驭 AI。
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('register')} style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: '#fff', borderRadius: 8, padding: '14px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            免费开始 →
          </button>
          <button onClick={() => navigate('pricing')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 8, padding: '14px 32px', fontSize: 16, cursor: 'pointer' }}>
            查看价格
          </button>
        </div>
      </section>

      {/* 数据 */}
      <section style={{ padding: '60px 24px', background: '#0d0d20', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 40, textAlign: 'center' }}>
          {[['5,000+', '企业客户'], ['98%', '客户满意度'], ['3倍', '效率提升'], ['24/7', 'AI 智能服务']].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 40, fontWeight: 800, color: '#6366f1' }}>{v}</div>
              <div style={{ color: '#64748b', marginTop: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 核心功能 */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 12 }}>核心功能</h2>
          <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 60 }}>为企业量身定制的 AI 工具集</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
            {[
              { icon: '🤖', t: 'AI 内容生成', d: '一键生成高质量文章、报告、营销文案，告别创作瓶颈' },
              { icon: '🎨', t: 'AI 图像创作', d: '文字描述即生成专业级图片，品牌视觉素材按需生产' },
              { icon: '🎬', t: 'AI 视频剪辑', d: '智能剪辑、字幕生成、视频改写，内容创作效率提升10倍' },
              { icon: '📊', t: '数据洞察', d: '实时分析业务数据，AI 驱动的决策建议' },
              { icon: '🔗', t: '系统集成', d: '与现有 ERP、CRM 无缝对接，平滑过渡' },
              { icon: '🛡️', t: '安全合规', d: '企业级数据加密，满足国内合规要求' },
            ].map(f => (
              <div key={f.t} style={{ background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 12, padding: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 600, marginBottom: 10, fontSize: 17 }}>{f.t}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6, fontSize: 14 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: 'radial-gradient(ellipse at center, #1a1040 0%, #0a0a1a 70%)' }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>准备好了？立即开始</h2>
        <p style={{ color: '#64748b', marginBottom: 32 }}>注册后即可体验 AI 功能，付款后立即激活套餐</p>
        <button onClick={() => navigate('register')} style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: '#fff', borderRadius: 8, padding: '16px 40px', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>
          免费注册
        </button>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 功能页
// ════════════════════════════════════════════════════════════════════════════
function FeaturesPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 12 }}>全部功能</h2>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 60 }}>基础版 vs 专业版功能对比</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        {PKG_PLANS.map(p => (
          <div key={p.id} style={{ background: '#0d0d20', border: `1px solid ${p.highlight ? p.color : '#1e293b'}`, borderRadius: 16, padding: 32 }}>
            <h3 style={{ color: p.color, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{p.name}</h3>
            <p style={{ color: '#64748b', marginBottom: 20 }}>{p.desc}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {p.features.map(f => (
                f === '——'
                  ? <li key={f} style={{ borderTop: '1px solid #1e293b', margin: '8px 0' }} />
                  : <li key={f} style={{ padding: '7px 0', borderBottom: '1px solid #1e293b', color: f.startsWith('🔒') ? '#475569' : '#94a3b8', fontSize: 14 }}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 价格页
// ════════════════════════════════════════════════════════════════════════════
function PricingPage({ user, openPayModal, navigate }: { user: User | null; openPayModal: (p: PayingPlan) => void; navigate: (p: Page) => void }) {
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, number>>({ VIP1: 0, VIP3: 0 });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 24px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 36, fontWeight: 700, marginBottom: 12 }}>选择套餐</h2>
      <p style={{ textAlign: 'center', color: '#64748b', marginBottom: 56 }}>按需选择，付款后立即激活 · 到期自动顺延</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 32 }}>
        {PKG_PLANS.map(plan => {
          const periodIdx = selectedPeriods[plan.id] ?? 0;
          const selPeriod = plan.prices[periodIdx];
          const isCurrentPlan = user?.package_type === plan.id && user?.is_activated;

          return (
            <div key={plan.id} style={{
              background: '#0d0d20',
              border: `2px solid ${plan.highlight ? plan.color : '#1e293b'}`,
              borderRadius: 16, padding: 32, position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', padding: '4px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  推荐
                </div>
              )}
              <h3 style={{ fontSize: 24, fontWeight: 700, color: plan.color, marginBottom: 8 }}>{plan.name}</h3>
              <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>{plan.desc}</p>

              {/* 时长选择 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {plan.prices.map((pp, idx) => (
                  <button key={pp.period} onClick={() => setSelectedPeriods(prev => ({ ...prev, [plan.id]: idx }))}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1px solid ${periodIdx === idx ? plan.color : '#334155'}`, background: periodIdx === idx ? `${plan.color}22` : 'transparent', color: periodIdx === idx ? plan.color : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: periodIdx === idx ? 600 : 400 }}>
                    {pp.period}
                    {pp.months >= 12 && <span style={{ display: 'block', fontSize: 11, color: '#4ade80' }}>省最多</span>}
                  </button>
                ))}
              </div>

              {/* 价格 */}
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: '#e2e8f0' }}>¥{selPeriod.price}</span>
                <span style={{ color: '#64748b', marginLeft: 8, fontSize: 14 }}>{selPeriod.months === 1 ? '/月' : `/${selPeriod.months}个月`}</span>
                {selPeriod.months > 1 && (
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                    约 ¥{Math.round(selPeriod.price / selPeriod.months)}/月
                  </div>
                )}
              </div>

              {/* 功能列表 */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
              {plan.features.map(f => (
                f === '——'
                  ? <li key={f} style={{ borderTop: '1px solid #1e293b', margin: '8px 0', listStyle: 'none' }} />
                  : <li key={f} style={{ padding: '5px 0', color: f.startsWith('🔒') ? '#475569' : '#94a3b8', fontSize: 13 }}>{f}</li>
              ))}
              </ul>

              {isCurrentPlan ? (
                <div style={{ textAlign: 'center', padding: '12px', background: `${plan.color}22`, borderRadius: 8, color: plan.color, fontWeight: 600 }}>
                  ✓ 当前套餐（剩余 {user?.days_left ?? 0} 天）
                </div>
              ) : (
                <button onClick={() => openPayModal({ name: plan.name, packageType: plan.id, period: selPeriod.period, price: selPeriod.price, months: selPeriod.months })}
                  style={{ width: '100%', padding: 14, borderRadius: 8, border: 'none', background: plan.highlight ? `linear-gradient(135deg,${plan.color},#a855f7)` : plan.color, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
                  {user ? (isCurrentPlan ? '续费' : '立即购买') : '登录后购买'}
                </button>
              )}
              {isCurrentPlan && (
                <button onClick={() => openPayModal({ name: plan.name, packageType: plan.id, period: selPeriod.period, price: selPeriod.price, months: selPeriod.months })}
                  style={{ width: '100%', marginTop: 10, padding: 10, borderRadius: 8, border: `1px solid ${plan.color}`, background: 'transparent', color: plan.color, fontSize: 14, cursor: 'pointer' }}>
                  续费
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', color: '#475569', marginTop: 40, fontSize: 14 }}>
        需要定制方案？<button onClick={() => navigate('contact')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline', fontSize: 14 }}>联系我们</button>
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 联系/定制表单
// ════════════════════════════════════════════════════════════════════════════
function ContactPage({ user, token }: { user: User | null; token: string }) {
  const [form, setForm] = useState({ customer_name: '', contact: user?.phone || '', plan: '定制方案', description: '', sales_code: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      await apiRequest('/orders', { method: 'POST', body: JSON.stringify(form) }, token);
      setSuccess(true);
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }

  if (success) return (
    <div style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 60 }}>✅</div>
      <h2 style={{ marginTop: 16 }}>提交成功！</h2>
      <p style={{ color: '#64748b' }}>我们会在 24 小时内与您联系</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px' }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>定制方案</h2>
      <p style={{ color: '#64748b', marginBottom: 32 }}>填写需求，我们为您量身定制</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input label="公司/姓名 *" value={form.customer_name} onChange={v => setForm(p => ({ ...p, customer_name: v }))} />
        <Input label="联系方式 *" value={form.contact} onChange={v => setForm(p => ({ ...p, contact: v }))} />
        <Input label="需求描述" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} textarea />
        <Input label="销售码（如有）" value={form.sales_code} onChange={v => setForm(p => ({ ...p, sales_code: v }))} placeholder="如 A001" />
        {err && <div style={{ background: '#1f0000', border: '1px solid #7f1d1d', borderRadius: 8, padding: 12, color: '#fca5a5', fontSize: 14 }}>{err}</div>}
        <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: '#fff', borderRadius: 8, padding: '14px', fontSize: 16, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? '提交中...' : '提交需求'}
        </button>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 登录页
// ════════════════════════════════════════════════════════════════════════════
function LoginPage({ token, setToken, setUser, navigate }: any) {
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (token) navigate('profile'); }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      const data = await apiRequest<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password: pw }) });
      localStorage.setItem('token', data.token); setToken(data.token); setUser(data.user); navigate('profile');
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 24px' }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>登录</h2>
      <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 32 }}>欢迎回来</p>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 16, padding: 32 }}>
        <Input label="手机号" value={phone} onChange={setPhone} type="tel" />
        <Input label="密码" value={pw} onChange={setPw} type="password" />
        {err && <ErrBox msg={err} />}
        <button type="submit" disabled={loading} style={btnStyle(loading)}>
          {loading ? '登录中...' : '登录'}
        </button>
        <button type="button" onClick={() => navigate('register')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14 }}>
          没有账号？立即注册
        </button>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 注册页（手机号 + 验证码 + 密码 + 销售码[选填]）
// ════════════════════════════════════════════════════════════════════════════
function RegisterPage({ setToken, navigate }: any) {
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [pw, setPw] = useState('');
  const [salesCode, setSalesCode] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [smsTip, setSmsTip] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function sendSms() {
    if (countdown > 0 || !phone) return;
    setSmsLoading(true); setErr(''); setSmsTip('');
    try {
      const d = await apiRequest<{ code?: string; message?: string }>('/sms/send', { method: 'POST', body: JSON.stringify({ phone }) });
      setCountdown(60);
      if (d.code) setSmsTip(`开发模式验证码：${d.code}`);
      else setSmsTip(d.message || '验证码已发送');
    } catch (e: any) { setErr(e.message); }
    setSmsLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      const data = await apiRequest<{ token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, password: pw, smsCode, salesCode: salesCode.trim().toUpperCase() || undefined }),
      });
      localStorage.setItem('token', data.token); setToken(data.token); navigate('profile');
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 24px' }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>注册账号</h2>
      <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 32 }}>注册后购买套餐即可立即激活</p>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 16, padding: 32 }}>
        {/* 手机号 */}
        <Input label="手机号 *" value={phone} onChange={setPhone} type="tel" placeholder="请输入11位手机号" />

        {/* 验证码 */}
        <div>
          <label style={{ display: 'block', color: '#94a3b8', marginBottom: 6, fontSize: 14 }}>短信验证码 *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={smsCode} onChange={e => setSmsCode(e.target.value)} placeholder="6位验证码" maxLength={6}
              style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
            <button type="button" onClick={sendSms} disabled={smsLoading || countdown > 0 || !phone}
              style={{ whiteSpace: 'nowrap', padding: '10px 14px', borderRadius: 8, border: 'none', background: countdown > 0 ? '#1e293b' : '#4f46e5', color: countdown > 0 ? '#64748b' : '#fff', cursor: countdown > 0 ? 'not-allowed' : 'pointer', fontSize: 13 }}>
              {smsLoading ? '发送中' : countdown > 0 ? `${countdown}s` : '获取验证码'}
            </button>
          </div>
          {smsTip && <div style={{ marginTop: 6, fontSize: 13, color: '#4ade80' }}>{smsTip}</div>}
        </div>

        {/* 密码 */}
        <Input label="密码 *（至少6位）" value={pw} onChange={setPw} type="password" placeholder="设置登录密码" />

        {/* 销售码 */}
        <div>
          <Input label="销售码（选填）" value={salesCode} onChange={setSalesCode} placeholder="如 A001，没有可不填" />
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>由销售人员提供，绑定后不可更改</p>
        </div>

        {err && <ErrBox msg={err} />}
        <button type="submit" disabled={loading} style={btnStyle(loading)}>
          {loading ? '注册中...' : '立即注册'}
        </button>
        <button type="button" onClick={() => navigate('login')} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14 }}>
          已有账号？去登录
        </button>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 个人中心
// ════════════════════════════════════════════════════════════════════════════
function ProfilePage({ user, token, loadUser, openPayModal, navigate }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) { navigate('login'); return; }
    apiRequest<any[]>('/user/orders', {}, token).then(setOrders).catch(() => {});
  }, [token]);

  function copyLicense() {
    if (!user?.license_key) return;
    navigator.clipboard.writeText(user.license_key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // 计算升级抵扣金额（基础版日单价 ¥99/30 天，四舍五入）
  function calcCredit(daysLeft: number) {
    return Math.round(daysLeft * (99 / 30));
  }

  function openUpgradeModal(months: number, price: number, period: string) {
    const daysLeft = user?.days_left ?? 0;
    const credit = calcCredit(daysLeft);
    const finalPrice = Math.max(0, price - credit);
    openPayModal({
      name: '升级专业版',
      packageType: 'VIP3',
      period,
      price,
      months,
      isUpgrade: true,
      credit,
      finalPrice,
    });
  }

  if (!user) return <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>加载中...</div>;

  const pkgLabel = user.package_type === 'VIP3' ? '专业版' : user.package_type === 'VIP1' ? '基础版' : '未激活';
  const isVip3  = user.is_activated && user.package_type === 'VIP3';
  const isVip1  = user.is_activated && user.package_type === 'VIP1';

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>个人中心</h2>

      {/* 账户状态 */}
      <div style={{ background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              📱 {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
            </div>
            {user.sales_name && (
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
                归属销售：{user.sales_name}（{user.sales_code}）
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontWeight: 600,
              background: user.is_activated ? 'rgba(74,222,128,0.15)' : 'rgba(100,116,139,0.2)',
              color: user.is_activated ? '#4ade80' : '#64748b', fontSize: 14,
            }}>
              {user.is_activated ? `✓ ${pkgLabel}` : '⊘ 未激活'}
            </div>
          </div>
        </div>

        {user.is_activated && user.expire_date && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 16 }}>
            <StatCard label="套餐状态" value={pkgLabel} color="#6366f1" />
            <StatCard label="到期时间" value={new Date(user.expire_date).toLocaleDateString('zh-CN')} color="#f59e0b" />
            <StatCard label="剩余天数" value={`${user.days_left ?? 0} 天`} color={user.days_left && user.days_left < 10 ? '#ef4444' : '#4ade80'} />
          </div>
        )}

        {/* 软件授权码 */}
        {user.license_key && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: '#0a0a1a', borderRadius: 12, border: '1px solid #334155' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔑 <span style={{ fontWeight: 600, color: '#94a3b8' }}>桌面软件授权码</span>
              <span style={{ fontSize: 11, color: '#475569' }}>· 与手机号唯一绑定，请勿泄露</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <code style={{
                flex: 1, fontSize: 20, fontWeight: 700, letterSpacing: 4,
                color: '#a5b4fc', background: '#1e293b', padding: '10px 16px',
                borderRadius: 8, border: '1px solid #334155', userSelect: 'all',
              }}>
                {user.license_key}
              </code>
              <button onClick={copyLicense}
                style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: copied ? '#16a34a' : '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
                {copied ? '✓ 已复制' : '复制'}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
              在桌面软件的"激活"界面粘贴此码即可绑定使用 · 续费后授权码不变，到期时间自动更新
            </div>
          </div>
        )}

        {!user.license_key && user.is_activated === 0 && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(234,179,8,0.08)', borderRadius: 10, border: '1px solid rgba(234,179,8,0.2)', fontSize: 13, color: '#eab308' }}>
            💡 购买套餐后将自动生成您的专属软件授权码
          </div>
        )}

        {/* 基础版 → 一键升级专业版 */}
        {isVip1 && (
          <div style={{ marginTop: 20, padding: 20, background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(168,85,247,0.08))', borderRadius: 12, border: '1px solid rgba(245,158,11,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f59e0b' }}>⚡ 升级到专业版</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>解锁 AI 营销 · 经营分析 · 财务报税</div>
              </div>
              {(user.days_left ?? 0) > 0 && (
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  <div style={{ color: '#4ade80' }}>可抵扣 ¥{calcCredit(user.days_left ?? 0)}</div>
                  <div style={{ color: '#475569', marginTop: 2 }}>剩余 {user.days_left} 天 × ¥{(99/30).toFixed(1)}/天</div>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                { period: '月付', months: 1,  price: 299  },
                { period: '季付', months: 3,  price: 888  },
                { period: '年付', months: 12, price: 3388 },
              ].map(opt => {
                const credit = calcCredit(user.days_left ?? 0);
                const final  = Math.max(0, opt.price - credit);
                return (
                  <button key={opt.period} onClick={() => openUpgradeModal(opt.months, opt.price, opt.period)}
                    style={{ padding: '10px 6px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{opt.period}</div>
                    {credit > 0 && (
                      <div style={{ fontSize: 11, color: '#475569', textDecoration: 'line-through' }}>¥{opt.price}</div>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>¥{final}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isVip3 && (
          <div style={{ marginTop: 20, padding: 16, background: '#0a0a1a', borderRadius: 10, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>本月 AI 额度</div>
              <div style={{ fontSize: 11, color: '#475569' }}>购买加速包可立即追加次数</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <QuotaBar label="AI 生图" remaining={user.ai_image_quota ?? 0} base={20} color="#6366f1" />
              <QuotaBar label="AI 视频" remaining={user.ai_video_quota ?? 0} base={15} color="#a855f7" />
              <QuotaBar label="AI 剪辑" remaining={user.ai_edit_quota  ?? 0} base={15} color="#ec4899" />
            </div>
          </div>
        )}
      </div>

      {/* 购买/续费区 */}
      <div style={{ background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 16, padding: 28, marginBottom: 24 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 20 }}>购买 / 续费套餐</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {PKG_PLANS.map(plan => (
            <div key={plan.id} style={{ border: `1px solid ${plan.highlight ? plan.color : '#1e293b'}`, borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, color: plan.color, marginBottom: 10 }}>{plan.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.prices.map(pp => (
                  <button key={pp.period} onClick={() => openPayModal({ name: plan.name, packageType: plan.id, period: pp.period, price: pp.price, months: pp.months })}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0a0a1a', color: '#e2e8f0', cursor: 'pointer', fontSize: 14 }}>
                    <span>{pp.period}</span>
                    <span style={{ color: plan.color, fontWeight: 600 }}>¥{pp.price}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* AI 加速包（仅专业版用户） */}
          {isVip3 && (
            <div style={{ border: '1px solid #ec4899', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, color: '#ec4899', marginBottom: 6 }}>🚀 AI 加速包</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>+10图片 / +10视频 / +10编辑（立即生效）</div>
              <button onClick={() => openPayModal({ name: 'AI 加速包', packageType: 'ADDON', period: '一次性', price: ADDON.price, months: 0 })}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#ec4899,#f97316)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                ¥88 立即购买
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 订单记录 */}
      <div style={{ background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 16, padding: 28 }}>
        <h3 style={{ fontWeight: 600, marginBottom: 20 }}>订单记录</h3>
        {orders.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: 24 }}>暂无订单</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map(o => (
              <div key={o.id} style={{ background: '#0a0a1a', borderRadius: 10, padding: '14px 16px', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{o.plan}</div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{new Date(o.created_at).toLocaleDateString('zh-CN')}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {o.amount && <span style={{ color: '#f59e0b', fontWeight: 600 }}>¥{o.amount}</span>}
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: o.status === 'paid' ? 'rgba(74,222,128,0.15)' : 'rgba(234,179,8,0.15)', color: o.status === 'paid' ? '#4ade80' : '#eab308' }}>
                    {o.status === 'paid' ? '已完成' : '待处理'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 付款弹窗
// ════════════════════════════════════════════════════════════════════════════
function PayModal({ plan, loading, success, onPay, onClose }: {
  plan: PayingPlan; loading: boolean;
  success: { expire_date: string; days_left: number; package_type?: string } | null;
  onPay: () => void; onClose: () => void;
}) {
  const payAmount = plan.isUpgrade ? (plan.finalPrice ?? plan.price) : plan.price;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0d0d20', border: '1px solid #334155', borderRadius: 20, padding: 36, maxWidth: 420, width: '100%' }}>
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>{plan.isUpgrade ? '🚀' : '🎉'}</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#4ade80' }}>
              {plan.isUpgrade ? '升级成功！' : '激活成功！'}
            </h3>
            {plan.isUpgrade && (
              <div style={{ marginBottom: 12, padding: '10px 16px', background: 'rgba(245,158,11,0.1)', borderRadius: 8, fontSize: 13, color: '#f59e0b' }}>
                ✨ 已解锁：AI 营销工坊 · 经营分析 · 财务报税
              </div>
            )}
            <p style={{ color: '#94a3b8', marginBottom: 4 }}>套餐：{success.package_type === 'VIP3' ? '专业版' : plan.name}</p>
            <p style={{ color: '#94a3b8', marginBottom: 8 }}>到期时间：{new Date(success.expire_date).toLocaleDateString('zh-CN')}</p>
            <p style={{ color: '#4ade80', fontSize: 18, fontWeight: 600, marginBottom: 24 }}>剩余 {success.days_left} 天</p>
            <p style={{ color: '#475569', fontSize: 12, marginBottom: 20 }}>重启桌面软件后，新功能将自动解锁</p>
            <button onClick={onClose} style={{ ...btnStyle(false), width: '100%' }}>返回个人中心</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {plan.isUpgrade ? '⚡ 升级专业版' : '确认购买'}
            </h3>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>
              {plan.isUpgrade ? '付款成功后立即升级，桌面软件重启后自动解锁新功能' : '扫码完成付款后，账户将立即激活'}
            </p>

            <div style={{ background: '#0a0a1a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>套餐</span>
                <span style={{ fontWeight: 600 }}>{plan.isUpgrade ? '专业版' : plan.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748b' }}>时长</span>
                <span>{plan.period}{plan.months > 0 ? `（${plan.months}个月）` : ''}</span>
              </div>
              {/* 升级专属：抵扣明细 */}
              {plan.isUpgrade && plan.credit !== undefined && plan.credit > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#64748b' }}>原价</span>
                    <span style={{ color: '#475569', textDecoration: 'line-through' }}>¥{plan.price}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '6px 10px', background: 'rgba(74,222,128,0.08)', borderRadius: 6 }}>
                    <span style={{ color: '#4ade80', fontSize: 13 }}>基础版剩余天数抵扣</span>
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>-¥{plan.credit}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: 10, marginTop: 4 }}>
                <span style={{ color: '#64748b' }}>实付金额</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b' }}>¥{payAmount}</span>
              </div>
            </div>

            {/* 二维码占位 */}
            <div style={{ background: '#fff', borderRadius: 12, width: 160, height: 160, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <div style={{ fontSize: 48 }}>📱</div>
              <div style={{ color: '#1e293b', fontSize: 12, marginTop: 8, textAlign: 'center' }}>微信/支付宝<br />扫码付款</div>
            </div>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 12, marginBottom: 20 }}>付款完成后点击下方按钮立即生效</p>

            <button onClick={onPay} disabled={loading} style={{ ...btnStyle(loading), width: '100%', fontSize: 16, padding: '14px' }}>
              {loading ? (plan.isUpgrade ? '升级中...' : '激活中...') : `✓ 我已完成付款 · 立即${plan.isUpgrade ? '升级' : '激活'}`}
            </button>
            <button onClick={onClose} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '8px' }}>取消</button>
          </>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 管理员后台
// ════════════════════════════════════════════════════════════════════════════
function AdminPage({ token: userToken }: { token: string }) {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState<'orders' | 'users' | 'sales' | 'content'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [content, setContent] = useState<any[]>([]);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [newSales, setNewSales] = useState({ name: '', code_prefix: '', phone: '', password: '' });
  const [msg, setMsg] = useState('');

  const adminHeaders = { 'X-Admin-Token': adminToken };

  async function adminGet<T>(path: string): Promise<T> {
    const r = await fetch(`/api${path}`, { headers: { ...adminHeaders } });
    const t = await r.text(); const d = t ? JSON.parse(t) : {};
    if (!r.ok) throw new Error(d.error || 'Error');
    return d as T;
  }
  async function adminPost<T>(path: string, body: any): Promise<T> {
    const r = await fetch(`/api${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...adminHeaders }, body: JSON.stringify(body) });
    const t = await r.text(); const d = t ? JSON.parse(t) : {};
    if (!r.ok) throw new Error(d.error || 'Error');
    return d as T;
  }

  async function adminLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr('');
    try {
      const d = await apiRequest<{ token: string }>('/admin/login', { method: 'POST', body: JSON.stringify(loginForm) });
      localStorage.setItem('adminToken', d.token); setAdminToken(d.token);
    } catch (e: any) { setLoginErr(e.message); }
  }

  useEffect(() => {
    if (!adminToken) return;
    if (tab === 'orders') adminGet<any[]>('/admin/orders').then(setOrders).catch(() => {});
    if (tab === 'users')  adminGet<any[]>('/admin/users').then(setUsers).catch(() => {});
    if (tab === 'sales')  adminGet<any[]>('/admin/sales').then(setSales).catch(() => {});
    if (tab === 'content') adminGet<any[]>('/admin/content').then(c => { setContent(c); const m: Record<string,string>={};c.forEach((x:any)=>m[x.key]=x.value);setEditedContent(m); }).catch(() => {});
  }, [adminToken, tab]);

  if (!adminToken) return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 24px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>管理员登录</h2>
      <form onSubmit={adminLogin} style={{ background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="用户名" value={loginForm.username} onChange={v => setLoginForm(p => ({ ...p, username: v }))} />
        <Input label="密码" value={loginForm.password} onChange={v => setLoginForm(p => ({ ...p, password: v }))} type="password" />
        {loginErr && <ErrBox msg={loginErr} />}
        <button type="submit" style={btnStyle(false)}>登录</button>
      </form>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '32px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>管理后台</h2>
        <button onClick={() => { localStorage.removeItem('adminToken'); setAdminToken(''); }} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>退出</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #1e293b', paddingBottom: 12 }}>
        {(['orders', 'users', 'sales', 'content'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: tab === t ? '#4f46e5' : '#1e293b', color: tab === t ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
            {{ orders: '📦 订单', users: '👥 用户', sales: '🏷️ 销售', content: '📝 内容' }[t]}
          </button>
        ))}
      </div>

      {/* 订单 */}
      {tab === 'orders' && (
        <TableWrap headers={['#', '客户', '联系', '套餐', '金额', '状态', '销售', '到期', '时间']}>
          {orders.map(o => (
            <tr key={o.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={td}>{o.id}</td>
              <td style={td}>{o.customer_name}</td>
              <td style={td}>{o.contact}</td>
              <td style={td}>{o.plan}</td>
              <td style={td}>{o.amount ? `¥${o.amount}` : '-'}</td>
              <td style={td}><StatusBadge s={o.status} /></td>
              <td style={td}>{o.sales_code || '-'}</td>
              <td style={td}>{o.user_expire_date ? new Date(o.user_expire_date).toLocaleDateString('zh-CN') : '-'}</td>
              <td style={td}>{new Date(o.created_at).toLocaleDateString('zh-CN')}</td>
            </tr>
          ))}
        </TableWrap>
      )}

      {/* 用户 */}
      {tab === 'users' && (
        <TableWrap headers={['手机', '套餐', '到期', '剩余天数', '归属销售', '注册时间']}>
          {users.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={td}>{u.phone}</td>
              <td style={td}>{u.is_activated ? (u.package_type === 'VIP3' ? '专业版' : '基础版') : '未激活'}</td>
              <td style={td}>{u.expire_date ? new Date(u.expire_date).toLocaleDateString('zh-CN') : '-'}</td>
              <td style={{ ...td, color: u.days_left < 10 ? '#ef4444' : '#4ade80' }}>
                {u.expire_date ? `${u.days_left}天` : '-'}
              </td>
              <td style={td}>{u.sales_code ? `${u.sales_name}（${u.sales_code}）` : '直销'}</td>
              <td style={td}>{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
            </tr>
          ))}
        </TableWrap>
      )}

      {/* 销售管理 */}
      {tab === 'sales' && (
        <div>
          <div style={{ background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h4 style={{ marginBottom: 14 }}>添加销售</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {(['name', 'code_prefix', 'phone', 'password'] as const).map(k => (
                <input key={k} placeholder={{ name: '姓名', code_prefix: '销售码（如B001）', phone: '手机号', password: '密码' }[k]}
                  value={newSales[k]} onChange={e => setNewSales(p => ({ ...p, [k]: e.target.value }))}
                  style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14 }} />
              ))}
            </div>
            <button onClick={async () => {
              try { await adminPost('/admin/sales', newSales); const s = await adminGet<any[]>('/admin/sales'); setSales(s); setNewSales({ name: '', code_prefix: '', phone: '', password: '' }); setMsg('添加成功'); setTimeout(() => setMsg(''), 2000); }
              catch (e: any) { setMsg(e.message); }
            }} style={{ ...btnStyle(false), marginTop: 12, padding: '10px 24px' }}>添加销售</button>
            {msg && <span style={{ marginLeft: 12, color: '#4ade80', fontSize: 14 }}>{msg}</span>}
          </div>
          <TableWrap headers={['#', '姓名', '销售码', '手机', '创建时间', '操作']}>
            {sales.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={td}>{s.id}</td>
                <td style={td}>{s.name}</td>
                <td style={td}><code style={{ background: '#1e293b', padding: '2px 8px', borderRadius: 4 }}>{s.code_prefix}</code></td>
                <td style={td}>{s.phone || '-'}</td>
                <td style={td}>{new Date(s.created_at).toLocaleDateString('zh-CN')}</td>
                <td style={td}>
                  <button onClick={async () => {
                    if (!confirm('确认删除？')) return;
                    await fetch(`/api/admin/sales/${s.id}`, { method: 'DELETE', headers: adminHeaders });
                    const ss = await adminGet<any[]>('/admin/sales'); setSales(ss);
                  }} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>删除</button>
                </td>
              </tr>
            ))}
          </TableWrap>
        </div>
      )}

      {/* 内容管理 */}
      {tab === 'content' && (
        <div>
          {content.map(c => (
            <div key={c.key} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#94a3b8', marginBottom: 6, fontSize: 13 }}>{c.key}</label>
              <textarea value={editedContent[c.key] ?? c.value}
                onChange={e => setEditedContent(p => ({ ...p, [c.key]: e.target.value }))}
                rows={2}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: 10, color: '#e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button onClick={async () => {
            try {
              await adminPost('/admin/content', { items: Object.entries(editedContent).map(([key, value]) => ({ key, value })) });
              setMsg('保存成功'); setTimeout(() => setMsg(''), 2000);
            } catch (e: any) { setMsg(e.message); }
          }} style={{ ...btnStyle(false), padding: '10px 28px' }}>保存内容</button>
          {msg && <span style={{ marginLeft: 12, color: '#4ade80', fontSize: 14 }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 销售后台
// ════════════════════════════════════════════════════════════════════════════
function SalesPage({ token: userToken }: { token: string }) {
  const [salesToken, setSalesToken] = useState(localStorage.getItem('salesToken') || '');
  const [loginForm, setLoginForm] = useState({ code_prefix: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [tab, setTab] = useState<'customers' | 'orders'>('customers');
  const [orders, setOrders] = useState<any[]>([]);

  async function salesGet<T>(path: string): Promise<T> {
    const r = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${salesToken}` } });
    const t = await r.text(); const d = t ? JSON.parse(t) : {};
    if (!r.ok) throw new Error(d.error || 'Error');
    return d as T;
  }

  async function salesLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr('');
    try {
      const d = await apiRequest<{ token: string }>('/sales/login', { method: 'POST', body: JSON.stringify(loginForm) });
      localStorage.setItem('salesToken', d.token); setSalesToken(d.token);
    } catch (e: any) { setLoginErr(e.message); }
  }

  useEffect(() => {
    if (!salesToken) return;
    if (tab === 'customers') salesGet<any[]>('/sales/customers').then(setCustomers).catch(() => {});
    if (tab === 'orders')    salesGet<any[]>('/sales/orders').then(setOrders).catch(() => {});
  }, [salesToken, tab]);

  if (!salesToken) return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 24px' }}>
      <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 24 }}>销售登录</h2>
      <form onSubmit={salesLogin} style={{ background: '#0d0d20', border: '1px solid #1e293b', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="销售码（如 A001）" value={loginForm.code_prefix} onChange={v => setLoginForm(p => ({ ...p, code_prefix: v.toUpperCase() }))} />
        <Input label="密码" value={loginForm.password} onChange={v => setLoginForm(p => ({ ...p, password: v }))} type="password" />
        {loginErr && <ErrBox msg={loginErr} />}
        <button type="submit" style={btnStyle(false)}>登录</button>
      </form>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700 }}>销售工作台</h2>
        <button onClick={() => { localStorage.removeItem('salesToken'); setSalesToken(''); }} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>退出</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #1e293b', paddingBottom: 12 }}>
        {(['customers', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: tab === t ? '#4f46e5' : '#1e293b', color: tab === t ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
            {{ customers: '👥 我的客户', orders: '📦 我的订单' }[t]}
          </button>
        ))}
      </div>

      {tab === 'customers' && (
        <TableWrap headers={['手机', '套餐', '到期时间', '剩余天数', '状态', '注册时间']}>
          {customers.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={td}>{c.phone}</td>
              <td style={td}>{c.is_activated ? (c.package_type === 'VIP3' ? '专业版' : '基础版') : '-'}</td>
              <td style={td}>{c.expire_date ? new Date(c.expire_date).toLocaleDateString('zh-CN') : '-'}</td>
              <td style={{ ...td, color: c.days_left < 10 ? '#ef4444' : '#4ade80' }}>
                {c.expire_date ? `${c.days_left}天` : '-'}
              </td>
              <td style={td}><StatusBadge s={c.is_activated ? 'paid' : 'pending'} /></td>
              <td style={td}>{new Date(c.created_at).toLocaleDateString('zh-CN')}</td>
            </tr>
          ))}
        </TableWrap>
      )}

      {tab === 'orders' && (
        <TableWrap headers={['#', '客户', '联系', '套餐', '金额', '状态', '时间']}>
          {orders.map(o => (
            <tr key={o.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={td}>{o.id}</td>
              <td style={td}>{o.customer_name}</td>
              <td style={td}>{o.contact}</td>
              <td style={td}>{o.plan}</td>
              <td style={td}>{o.amount ? `¥${o.amount}` : '-'}</td>
              <td style={td}><StatusBadge s={o.status} /></td>
              <td style={td}>{new Date(o.created_at).toLocaleDateString('zh-CN')}</td>
            </tr>
          ))}
        </TableWrap>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 通用小组件
// ════════════════════════════════════════════════════════════════════════════
function Input({ label, value, onChange, type = 'text', placeholder = '', textarea = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; textarea?: boolean;
}) {
  const style: React.CSSProperties = { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  return (
    <div>
      <label style={{ display: 'block', color: '#94a3b8', marginBottom: 6, fontSize: 14 }}>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...style, resize: 'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />}
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <div style={{ background: '#1f0000', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 14 }}>{msg}</div>;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#0a0a1a', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/**
 * QuotaBar — 显示剩余次数
 * base: 套餐基础额度 (20/15/15)
 * remaining: 当前剩余次数 (可能因加速包 > base)
 * 进度条反映"已用 = base - remaining"，若 remaining > base 说明有加速包额度，显示 +extra 标记
 */
function QuotaBar({ label, remaining, base, color }: { label: string; remaining: number; base: number; color: string }) {
  const extra   = Math.max(0, remaining - base);        // 加速包多出来的部分
  const baseUsed = Math.max(0, base - Math.min(remaining, base)); // 基础额度已用
  const pct     = base > 0 ? Math.min(100, (baseUsed / base) * 100) : 0;
  const isEmpty = remaining === 0;

  return (
    <div style={{ padding: '10px 12px', background: '#0f172a', borderRadius: 8, border: `1px solid ${isEmpty ? '#7f1d1d' : '#1e293b'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: '#94a3b8' }}>{label}</span>
        <span style={{ color: isEmpty ? '#ef4444' : color, fontWeight: 600 }}>
          {remaining}次
          {extra > 0 && <span style={{ fontSize: 10, color: '#f97316', marginLeft: 4 }}>+{extra}加速</span>}
        </span>
      </div>
      {/* 进度条：显示基础额度已消耗比例 */}
      <div style={{ height: 4, background: '#1e293b', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${100 - pct}%`, background: isEmpty ? '#ef4444' : color, borderRadius: 2, transition: 'width 0.4s' }} />
      </div>
      <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
        {isEmpty ? '已用完，请购买加速包' : `基础 ${base - baseUsed}/${base} 剩余`}
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid:    { label: '已完成', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
    pending: { label: '待处理', color: '#eab308', bg: 'rgba(234,179,8,0.15)'  },
    active:  { label: '已激活', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  };
  const info = map[s] || { label: s, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
  return <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: info.bg, color: info.color }}>{info.label}</span>;
}

function TableWrap({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: '#0d0d20', borderBottom: '1px solid #1e293b' }}>
            {headers.map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const td: React.CSSProperties = { padding: '12px 14px', color: '#94a3b8', verticalAlign: 'middle' };

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    background: loading ? '#3730a3' : 'linear-gradient(135deg,#6366f1,#a855f7)',
    border: 'none', color: '#fff', borderRadius: 8, padding: '12px 24px',
    fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.8 : 1,
  };
}
