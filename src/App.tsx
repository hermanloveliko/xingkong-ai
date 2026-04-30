import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, ArrowRight, Star, Lightbulb,
  MessageSquare, TrendingUp, ClipboardList, Palette, Calendar,
  Wallet, Calculator, PieChart, CheckCircle2, Rocket,
  BarChart3, Users, Receipt, FileText, Store, Target,
  Shield, ShieldCheck, Copy, Check, LogOut, User,
  CreditCard, Activity, Clock,
  Download, Monitor, HardDrive, Cpu, AlertCircle,
} from 'lucide-react';

// ─── 类型 ────────────────────────────────────────────────────────────────────
type Page = 'home' | 'features' | 'pricing' | 'contact' | 'login' | 'register'
  | 'profile' | 'admin' | 'sales' | 'download';

interface UserInfo {
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
  is_owner_unlimited?: boolean;
}

interface PayingPlan {
  name: string;
  packageType: string;
  period: string;
  price: number;
  months: number;
  isUpgrade?: boolean;
  credit?: number;
  finalPrice?: number;
}

// ─── API 工具 ─────────────────────────────────────────────────────────────────
const API = '/api';
async function apiRequest<T>(endpoint: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> || {}) } });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

// ─── 套餐配置 ─────────────────────────────────────────────────────────────────
const PKG_PLANS = [
  {
    id: 'VIP1', name: '基础版', desc: '适合入门经营管理',
    color: 'brand-400',
    features: [
      '经营复盘（AI 门店大脑对话）',
      '日常管理（SOP / 待办事项）',
      '员工管理（档案 / 排班 / 工资）',
    ],
    locked: ['AI 营销工坊（专业版功能）', '经营分析（专业版功能）', '财务报税（专业版功能）'],
    prices: [
      { period: '月付', months: 1,  price: 99  },
      { period: '季付', months: 3,  price: 288 },
      { period: '年付', months: 12, price: 999 },
    ],
  },
  {
    id: 'VIP3', name: '专业版', desc: '全功能解锁，AI 营销无限可能',
    color: 'yellow-400',
    highlight: true,
    features: [
      '经营复盘（AI 门店大脑对话）',
      '日常管理（SOP / 待办事项）',
      '员工管理（档案 / 排班 / 工资）',
      'AI 营销工坊（生图20张 · 视频15个 · 剪辑15次 · 账号监控）',
      '经营分析（KPI 图表 · 月度深度报告）',
      '财务报税（记账 · 发票 · 季报汇总）',
    ],
    locked: [],
    prices: [
      { period: '月付', months: 1,  price: 299  },
      { period: '季付', months: 3,  price: 888  },
      { period: '年付', months: 12, price: 3388 },
    ],
  },
];
const ADDON = { id: 'ADDON', name: 'AI 加速包', price: 88, months: 0 };

// ─── 轮播图 ───────────────────────────────────────────────────────────────────
const galleryImages = [
  { src: '/微信图片_20260307001457.png', alt: '产品截图 1' },
  { src: '/微信图片_20260307001513.png', alt: '产品截图 2' },
  { src: '/微信图片_20260307001519.png', alt: '产品截图 3' },
  { src: '/微信图片_20260307001525.png', alt: '产品截图 4' },
  { src: '/微信图片_20260307001531.png', alt: '产品截图 5' },
  { src: '/微信图片_20260307001535.png', alt: '产品截图 6' },
  { src: '/微信图片_20260307001538.png', alt: '产品截图 7' },
  { src: '/微信图片_20260307001543.png', alt: '产品截图 8' },
  { src: '/微信图片_20260307001548.png', alt: '产品截图 9' },
  { src: '/微信图片_20260307001552.png', alt: '产品截图 10' },
  { src: '/微信图片_20260307001556.png', alt: '产品截图 11' },
  { src: '/微信图片_20260307001559.png', alt: '产品截图 12' },
  { src: '/微信图片_20260307001603.png', alt: '产品截图 13' },
  { src: '/微信图片_20260307001607.png', alt: '产品截图 14' },
  { src: '/微信图片_20260307001610.png', alt: '产品截图 15' },
  { src: '/微信图片_20260307001613.png', alt: '产品截图 16' },
  { src: '/微信图片_20260307001617.png', alt: '产品截图 17' },
  { src: '/微信图片_20260307001620.png', alt: '产品截图 18' },
  { src: '/微信图片_20260307001624.png', alt: '产品截图 19' },
];

const ImageCarousel = () => {
  const [current, setCurrent] = useState(0);
  const isFirst = current === 0;
  const next = useCallback(() => setCurrent(c => (c + 1) % galleryImages.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + galleryImages.length) % galleryImages.length), []);
  useEffect(() => {
    const timer = setInterval(next, isFirst ? 8000 : 4000);
    return () => clearInterval(timer);
  }, [next, isFirst]);
  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-2xl bg-black">
      <AnimatePresence mode="wait">
        <motion.img key={current} src={galleryImages[current].src} alt={galleryImages[current].alt}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
          className="absolute inset-0 w-full h-full object-contain" />
      </AnimatePresence>
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {galleryImages.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-brand-400 w-6' : 'bg-white/30 w-1.5 hover:bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
};

// ─── 通用组件 ─────────────────────────────────────────────────────────────────
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="w-full">
    {children}
  </motion.div>
);

const Btn = ({ children, onClick, primary, size = 'md', type = 'button', disabled = false, full = false }: {
  children: React.ReactNode; onClick?: () => void; primary?: boolean;
  size?: 'sm' | 'md' | 'lg'; type?: 'button' | 'submit'; disabled?: boolean; full?: boolean;
}) => {
  const sz = { sm: 'px-4 py-2 text-xs', md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' }[size];
  return ( 
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${sz} ${full ? 'w-full' : ''} font-medium tracking-wide transition-all duration-300 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
        primary
          ? 'bg-brand-500 text-white hover:bg-brand-400'
          : 'glass text-white/80 hover:text-white hover:bg-white/[0.06]'
      }`}>
      {children}
  </button>
);
};

const LogoNA = ({ className = 'w-10 h-10' }: { className?: string }) => (
  <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 60V20L50 50V20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="text-brand-400" />
    <path d="M70 60L85 20L100 60" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="text-brand-300" />
    <path d="M78 45H92" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-brand-500" />
    </svg>
);

const FeatureCard = ({ icon: Icon, title, description, index }: { icon: any; title: string; description: string; index: number }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
    className="glass p-8 rounded-2xl relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-300">
    <div className="absolute top-0 right-0 p-4 font-mono text-brand-500/20 text-4xl font-bold">{String(index + 1).padStart(2, '0')}</div>
    <div className="w-14 h-14 rounded-xl bg-brand-500/10 flex items-center justify-center mb-6 group-hover:bg-brand-500/20 transition-colors">
      <Icon className="text-brand-400 w-7 h-7" />
  </div>
    <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
    <p className="text-white/60 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

const ProblemCard = ({ title, description, oldWay, newWay }: { title: string; description: string; oldWay: string; newWay: string }) => (
  <div className="glass p-6 rounded-xl">
    <h4 className="text-lg font-semibold mb-2 text-white">{title}</h4>
    <p className="text-white/50 text-sm mb-4">{description}</p>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
        <div className="text-red-400 text-xs mb-1">以前</div>
        <div className="text-white/60">{oldWay}</div>
      </div>
      <div className="bg-brand-500/10 rounded-lg p-3 border border-brand-500/20">
        <div className="text-brand-400 text-xs mb-1">现在</div>
        <div className="text-white">{newWay}</div>
      </div>
    </div>
  </div>
);

// 表单输入框（统一风格）
const GlassInput = ({ label, value, onChange, type = 'text', placeholder = '', textarea = false }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; textarea?: boolean;
}) => (
  <div>
    <label className="block text-white/50 text-xs mb-1.5">{label}</label>
    {textarea
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors resize-vertical text-white" />
      : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white" />}
  </div>
);

const ErrBox = ({ msg }: { msg: string }) => (
  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{msg}</div>
);

// ════════════════════════════════════════════════════════════════════════════
// 主组件
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]   = useState<Page>('home');
  const [user, setUser]   = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string>(localStorage.getItem('token') || '');
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  // 付款弹窗
  const [payingPlan, setPayingPlan]   = useState<PayingPlan | null>(null);
  const [payLoading, setPayLoading]   = useState(false);
  const [paySuccess, setPaySuccess]   = useState<{ expire_date: string; days_left: number; package_type?: string; addon_code?: string; license_key?: string } | null>(null);
  const [payQrCode, setPayQrCode]     = useState<string | null>(null);
  const [payOrderId, setPayOrderId]   = useState<number | null>(null);
  // 订单刷新触发器（购买成功后 +1，ProfilePage 监听并重新加载订单）
  const [orderRefreshKey, setOrderRefreshKey] = useState(0);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 隐秘后台入口：通过 URL Hash 触发，进入后立即清除 hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#xk-admin') {
      setPage('admin');
      window.history.replaceState(null, '', window.location.pathname);
    } else if (hash === '#xk-sales') {
      setPage('sales');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const loadUser = useCallback(async (t: string) => {
    if (!t) return;
    try {
      const u = await apiRequest<UserInfo>('/user/info', {}, t);
      setUser(u);
    } catch { setToken(''); localStorage.removeItem('token'); }
  }, []);

  useEffect(() => { if (token) loadUser(token); }, [token, loadUser]);

  function logout() {
    if (token) apiRequest('/auth/logout', { method: 'POST' }, token).catch(() => {});
    setToken(''); setUser(null); localStorage.removeItem('token'); navigate('home');
  }

  function navigate(p: Page) { setPage(p); setMobileMenu(false); window.scrollTo(0, 0); }

  // 弹窗打开时自动创建微信支付订单（非升级流程）
  useEffect(() => {
    if (!payingPlan || payingPlan.isUpgrade || !token) return;
    let cancelled = false;
    const createOrder = async () => {
      setPayLoading(true);
      try {
        const payAmount = payingPlan.price;
        const data = await apiRequest<{ success: boolean; code_url?: string; order_id?: number; error?: string }>(
          '/pay/create',
          { method: 'POST', body: JSON.stringify({ package_type: payingPlan.packageType, months: payingPlan.months, amount: payAmount }) },
          token,
        );
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || '创建支付订单失败');
        if (data.code_url) setPayQrCode(data.code_url);
        if (data.order_id) setPayOrderId(data.order_id);
      } catch (err: any) {
        if (!cancelled) { alert(err.message || '创建支付订单失败，请重试'); setPayingPlan(null); }
      } finally {
        if (!cancelled) setPayLoading(false);
      }
    };
    createOrder();
    return () => { cancelled = true; };
  }, [payingPlan?.packageType, payingPlan?.months, payingPlan?.isUpgrade]);

  async function handlePurchase() {
    if (!payingPlan || !token) return;
    setPayLoading(true);
    try {
      if (payingPlan.isUpgrade) {
        // 升级流程：直接调用升级接口
        const payAmount = payingPlan.finalPrice ?? payingPlan.price;
        const data = await apiRequest<{ expire_date: string; days_left: number; package_type: string; license_key?: string }>(
          '/orders/upgrade',
          { method: 'POST', body: JSON.stringify({ plan: payingPlan.name, package_type: payingPlan.packageType, months: payingPlan.months, amount: payAmount }) },
          token,
        );
        setPaySuccess(data);
      } else {
        // 微信支付流程：检查订单是否已支付
        if (!payOrderId) throw new Error('支付订单创建中，请稍候...');
        const checkData = await apiRequest<{ paid: boolean; expire_date?: string; days_left?: number; package_type?: string; addon_code?: string; license_key?: string }>(
          `/pay/check/${payOrderId}`,
          {},
          token,
        );
        if (!checkData.paid) throw new Error('尚未检测到付款，请先完成微信扫码付款后再点击');
        setPaySuccess({
          expire_date: checkData.expire_date!,
          days_left: checkData.days_left!,
          package_type: checkData.package_type,
          addon_code: checkData.addon_code,
          license_key: checkData.license_key,
        });
      }
      await loadUser(token);
      setOrderRefreshKey(k => k + 1);
    } catch (err: any) { alert(err.message || '操作失败，请稍后重试'); }
    finally { setPayLoading(false); }
  }

  function openPayModal(plan: PayingPlan) {
    if (!token) { navigate('login'); return; }
    setPayingPlan(plan); setPaySuccess(null); setPayQrCode(null); setPayOrderId(null);
  }

  const features = [
    { icon: MessageSquare, title: 'AI智能对话', description: '像聊天一样简单。直接告诉AI你的需求："帮我分析营收"、"帮我排班"、"怎么做活动"，AI秒懂并给出可执行方案。7×24小时随时响应。' },
    { icon: TrendingUp,    title: '多平台账户监控', description: '美团、饿了么、大众点评数据自动汇总。一个界面看清营收、订单、评价等核心指标，数据可视化一目了然。' },
    { icon: ClipboardList, title: '每日经营复盘', description: 'AI每天生成10个经营问题，引导完成每日复盘。涵盖营收、成本、客流、评价等，数据自动累计到系统，月度统计更轻松。' },
    { icon: Palette,       title: 'AI营销助手', description: '不会设计没关系。说"帮我做个促销海报"，AI几秒钟生成。想要短视频？告诉AI主题，自动帮你剪辑。降低营销门槛，提升曝光。' },
    { icon: Calendar,      title: '智能排班', description: '根据客流和营收，AI智能推荐最优排班方案。一键通知员工，省时省心。' },
    { icon: Wallet,        title: '财务记账 + 报税', description: '日常收支随手记，营收成本自动同步。月度报表自动生成，报税数据自动整理。每年省下3000-5000元会计费！' },
    { icon: Calculator,    title: '工资表自动生成', description: '考勤自动统计，加班请假提成自动计算。一键生成工资表，支持导出Excel。几分钟搞定工资核算。' },
    { icon: PieChart,      title: '经营数据分析', description: '自动汇总每日数据，智能计算KPI指标（营收、成本、利润、评分等）。支持月度深度报告生成。' },
  ];
  const problems = [
    { title: '数据分散', description: '多个平台来回切换', oldWay: '手动统计一下午', newWay: 'AI 3秒汇总' },
    { title: '营销做图', description: '请设计师太贵',     oldWay: '等设计师出图',   newWay: 'AI现场生成' },
    { title: '员工排班', description: '算来算去算不清',   oldWay: '凭经验猜测',     newWay: '用数据说话' },
    { title: '记账报税', description: '每个月对账对到头痛', oldWay: '请会计每年3000+', newWay: 'AI自动整理' },
    { title: '工资核算', description: '做表要做到半夜',   oldWay: '手动计算加班',   newWay: '系统自动生成' },
    { title: '经营分析', description: '数据太多整理不过来', oldWay: '凭感觉判断',   newWay: 'AI给出建议' },
  ];

        return (
    <div className="min-h-screen font-sans bg-brand-950 grid-bg">
      {/* 背景光晕 */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-950 via-transparent to-brand-950 opacity-80" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-brand-400/5 blur-[100px] rounded-full" />
      </div>

      {/* 导航 */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'py-3 glass border-b border-white/5' : 'py-5 bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('home')}>
            <LogoNA className="w-9 h-9" />
            <div>
              <span className="text-lg font-semibold block leading-none">星空AI</span>
              <span className="text-[9px] text-brand-400 tracking-wider">智能门店经营助手</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {([['home','首页'],['features','功能'],['pricing','价格'],['download','下载软件'],['contact','联系我们']] as [Page,string][]).map(([p,l]) => (
              <button key={p} onClick={() => navigate(p)}
                className={`text-sm transition-colors ${page === p ? 'text-brand-400' : 'text-white/50 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button onClick={() => navigate('profile')}
                  className="glass text-white/80 hover:text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
                  <User className="w-3.5 h-3.5" />
                  {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                  {user.is_activated ? <span className="text-brand-400 text-xs">· {user.package_type === 'VIP3' ? '专业版' : '基础版'}</span> : <span className="text-white/30 text-xs">· 未激活</span>}
                </button>
                <button onClick={logout} className="glass text-red-400 hover:text-red-300 text-sm px-3 py-2 rounded-lg transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('login')} className="glass text-white/70 hover:text-white text-sm px-4 py-2 rounded-lg transition-all">登录</button>
                <Btn primary size="sm" onClick={() => navigate('register')}>注册</Btn>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="relative">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <PageWrapper key="home">
              {/* Hero */}
            <section className="pt-40 pb-24 px-6">
              <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-16">
                    {/* 痛点冲击文案 — 大字展示排版，与 Hero 字号一致 */}
                    <div className="max-w-4xl mx-auto mb-14 space-y-6">

                      {/* Eyebrow 标签 */}
                      <motion.p
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.5 }}
                        className="text-brand-400/60 text-sm font-semibold tracking-[0.25em] uppercase"
                      >
                        别急着否认，问问你自己
                      </motion.p>

                      {/* 三句问题 — 大字 */}
                      <div className="space-y-3">
                        {[
                          { delay: 0.15, text: <>看着惨淡的营业额，你真的知道<span className="text-brand-400">问题出在哪</span>吗？</> },
                          { delay: 0.3,  text: <>同行都在做营销、拍视频，你却<span className="text-brand-400">连海报都做不出来</span>？</> },
                          { delay: 0.45, text: <>月底面对一堆票据，你分得清<span className="text-brand-400">什么是抵扣联</span>吗？</> },
                        ].map((item, i) => (
                          <motion.h2
                            key={i}
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: item.delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-white/85 leading-tight"
                          >
                            {item.text}
                          </motion.h2>
                        ))}
                      </div>

                      {/* 分隔线 */}
                      <motion.div
                        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                        transition={{ delay: 0.65, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent origin-center"
                      />

                      {/* 结语两行 */}
                      <motion.div
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.75, duration: 0.55 }}
                        className="space-y-2"
                      >
                        <p className="text-xl md:text-2xl font-display font-semibold text-white leading-snug">
                          醒醒吧！创业不是凭一腔热血，就是一场<span className="text-red-400">赤裸裸的生存战</span>。
                        </p>
                        <p className="text-base md:text-lg text-white/50 leading-relaxed">
                          守不住，前面赚的钱全都是给房东和税务局的「打工钱」。
                        </p>
                      </motion.div>

                      {/* CTA 结语 */}
                      <motion.p
                        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.95, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="text-lg md:text-xl font-semibold text-brand-400 leading-relaxed"
                      >
                        🛡️ 用星空AI，在你被残酷的市场淘汰之前，先帮你守住最后一道防线！
                      </motion.p>
                    </div>
                  {/* 产品演示视频 */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
                      <video src="/demo.mp4" controls autoPlay muted loop playsInline
                      className="w-full max-w-3xl mx-auto rounded-2xl shadow-2xl border border-white/10"
                        style={{ maxHeight: '400px' }} />
                  </motion.div>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
                    星空AI
                    <span className="block text-brand-400">智能门店经营助手</span>
                  </h1>
                  <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
                    专为街边门店打造的AI经营助手。餐饮、零售、服务业——不管什么业态，都能帮你轻松管理店铺。<br />
                    <span className="text-brand-400/80">数据完全实现本地化运作，不用担心数据泄露。</span>
                  </p>
                  <div className="flex flex-wrap justify-center gap-4 mb-12">
                      <Btn primary size="lg" onClick={() => navigate('pricing')}>立即体验 <ArrowRight className="w-4 h-4" /></Btn>
                      <Btn size="lg" onClick={() => navigate('download')}><Download className="w-4 h-4" />下载软件</Btn>
                      <Btn size="lg" onClick={() => navigate('features')}>了解功能</Btn>
                  </div>
                </div>
                  {/* 轮播图 */}
                  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="relative">
                  <div className="absolute inset-0 bg-brand-500/20 blur-[80px] rounded-3xl -z-10" />
                  <ImageCarousel />
                </motion.div>
              </div>
            </section>

              {/* 痛点 */}
            <section className="py-20 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">你是否遇到过这些烦恼？</h2>
                  <p className="text-white/50">星空AI帮你一键解决</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {problems.map((item, i) => <ProblemCard key={i} {...item} />)}
                </div>
              </div>
            </section>

              {/* 功能预览 */}
            <section className="py-20 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">星空AI能做什么？</h2>
                  <p className="text-white/50">8大核心功能，帮你省心省力</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((f, i) => <FeatureCard key={i} {...f} index={i} />)}
                </div>
                <div className="text-center mt-10">
                    <Btn onClick={() => navigate('features')}>查看全部功能 <ChevronRight className="w-4 h-4" /></Btn>
                  </div>
              </div>
            </section>

              {/* CTA */}
            <section className="py-20 px-6">
              <div className="max-w-4xl mx-auto">
                <div className="glass rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-brand-500/5 -z-10" />
                  <Lightbulb className="w-12 h-12 text-brand-400 mx-auto mb-6" />
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">让AI成为你的经营顾问</h2>
                  <p className="text-white/60 mb-8 max-w-xl mx-auto">
                    告别繁琐管理，专注店铺经营。像请了一个24小时不休息的店长，帮你整理数据、分析问题、想营销主意。
                  </p>
                    <div className="flex justify-center">
                      <Btn primary size="lg" onClick={() => navigate('pricing')}>立即开始 <ArrowRight className="w-5 h-5" /></Btn>
                    </div>
                </div>
              </div>
            </section>
          </PageWrapper>
          )}

          {page === 'features' && (
            <PageWrapper key="features">
            <section className="pt-32 pb-20 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">核心功能</h1>
                    <p className="text-white/60 text-lg max-w-2xl mx-auto">星空AI像一个24小时不休息的店长，帮你整理数据、分析问题、想营销主意、算工资。</p>
                </div>
                <div className="space-y-16">
                  {features.map((f, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
                        className={`flex flex-col ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center`}>
                      <div className="flex-1">
                        <div className="w-16 h-16 rounded-xl bg-brand-500/10 flex items-center justify-center mb-6">
                          <f.icon className="text-brand-400 w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-3">{f.title}</h3>
                        <p className="text-white/60 leading-relaxed">{f.description}</p>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="glass rounded-2xl p-8 aspect-video flex items-center justify-center">
                          <f.icon className="text-brand-500/30 w-24 h-24" />
                        </div>
                      </div>
                    </motion.div>
                      ))}
                    </div>
                <div className="mt-20 text-center">
                  <h3 className="text-2xl font-semibold mb-6">适用业态</h3>
                  <div className="flex flex-wrap justify-center gap-3">
                      {['餐饮店','便利店','超市','药店','母婴店','美容','美发','洗车','维修','服装店'].map(item => (
                        <span key={item} className="px-4 py-2 rounded-full bg-white/5 text-white/70 text-sm">{item}</span>
                    ))}
                    </div>
                  </div>
                </div>
            </section>
          </PageWrapper>
          )}

          {page === 'pricing' && (
            <PageWrapper key="pricing">
              <PricingPage user={user} openPayModal={openPayModal} navigate={navigate} />
            </PageWrapper>
          )}

          {page === 'download' && (
            <PageWrapper key="download">
              <DownloadPage user={user} navigate={navigate} />
            </PageWrapper>
          )}

          {page === 'contact' && (
            <PageWrapper key="contact">
              <ContactPage user={user} token={token} />
            </PageWrapper>
          )}

          {page === 'login' && (
            <PageWrapper key="login">
              <LoginPage token={token} setToken={setToken} setUser={setUser} navigate={navigate} />
            </PageWrapper>
          )}

          {page === 'register' && (
            <PageWrapper key="register">
              <RegisterPage setToken={setToken} navigate={navigate} />
            </PageWrapper>
          )}

          {page === 'profile' && (
            <PageWrapper key="profile">
              <ProfilePage user={user} token={token} loadUser={loadUser} openPayModal={openPayModal} navigate={navigate} orderRefreshKey={orderRefreshKey} />
            </PageWrapper>
          )}

          {page === 'admin' && (
            <PageWrapper key="admin">
              <AdminPage />
            </PageWrapper>
          )}

          {page === 'sales' && (
            <PageWrapper key="sales">
              <SalesPage />
            </PageWrapper>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <LogoNA className="w-8 h-8" />
              <span className="text-sm font-medium">星空AI · 智能门店经营助手</span>
            </div>
            <div className="flex gap-6 text-xs text-white/30">
              <a href="#" className="hover:text-white">隐私政策</a>
              <a href="#" className="hover:text-white">服务条款</a>
              <a href="#" className="hover:text-white">联系我们</a>
            </div>
          </div>

          <div className="text-center text-xs text-white/30">
            沪ICP备2024099147号-4&nbsp;&nbsp;&nbsp;地址：上海市青浦区业文路189弄29号&nbsp;&nbsp;&nbsp;电话：021-57811626
          </div>
        </div>
      </footer>

      {/* 付款弹窗 */}
      {payingPlan && (
        <PayModal plan={payingPlan} loading={payLoading} success={paySuccess}
          qrCode={payQrCode}
          onPay={handlePurchase} onClose={() => { setPayingPlan(null); setPaySuccess(null); setPayQrCode(null); setPayOrderId(null); }} />
      )}
                    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 下载页
// ════════════════════════════════════════════════════════════════════════════
function DownloadPage({ user, navigate }: { user: UserInfo | null; navigate: (p: Page) => void }) {
  // 最新版本信息（上线后在此处更新版本号和文件名）
  const VERSION    = '1.0.0';
  const EXE_FILE   = `星空AI Setup ${VERSION}.exe`;
  const DOWNLOAD_URL = `/downloads/${EXE_FILE}`;

  const sysReqs = [
    { icon: Monitor,   label: '操作系统', value: 'Windows 10 / 11（64位）' },
    { icon: Cpu,       label: '处理器',   value: '双核 2GHz 及以上' },
    { icon: HardDrive, label: '存储空间', value: '安装需 500MB，运行建议 2GB' },
  ];

  const steps = [
    { num: '01', title: '注册账号', desc: '在本网站注册账号，购买套餐后立即获得软件授权码' },
    { num: '02', title: '下载安装', desc: '点击下方按钮下载安装包，双击运行 .exe 文件完成安装' },
    { num: '03', title: '输入授权码', desc: '打开软件，在"激活"界面粘贴个人中心里的授权码，绑定后即可使用' },
  ];

        return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* 标题区 */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-6">
            <Download className="w-4 h-4" />
            <span>Windows 桌面客户端</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            下载 星空AI
                </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            安装桌面版，解锁 AI 门店经营助手的全部能力。功能更强，离线可用，数据更安全。
          </p>
                </div>

        {/* 下载卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-3xl p-10 mb-10 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-brand-500/5 -z-10" />

          {/* 软件图标 */}
          <div className="w-24 h-24 rounded-2xl bg-brand-500/15 flex items-center justify-center mx-auto mb-6 ring-2 ring-brand-500/20">
            <Monitor className="w-12 h-12 text-brand-400" />
                  </div>

          <h2 className="text-2xl font-bold mb-1">星空AI 桌面版</h2>
          <p className="text-white/40 text-sm mb-2">版本 {VERSION} · Windows 64位</p>
          <p className="text-white/25 text-xs mb-8">更新日期：{new Date().toLocaleDateString('zh-CN')}</p>

          {/* 主下载按钮 */}
          <a href={DOWNLOAD_URL} download={EXE_FILE}
            className="inline-flex items-center gap-3 bg-brand-500 hover:bg-brand-400 text-white font-semibold text-lg px-10 py-4 rounded-xl transition-all duration-300 shadow-lg shadow-brand-500/25 hover:shadow-brand-400/35">
            <Download className="w-5 h-5" />
            立即下载（Windows）
          </a>

          <p className="mt-4 text-white/25 text-xs">
            文件名：{EXE_FILE}
          </p>

          {/* 温馨提示 */}
          <div className="mt-8 flex items-start gap-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl p-4 text-left max-w-lg mx-auto">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-400/80">
              首次运行时 Windows 可能弹出安全提示，点击"<strong>仍要运行</strong>"即可。软件已经过完整测试，安全无毒。
                    </div>
                  </div>
        </motion.div>

        {/* 安装步骤 */}
        <div className="mb-10">
          <h2 className="text-2xl font-display font-bold text-center mb-8">三步开始使用</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="glass rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-3 right-4 font-mono text-4xl font-bold text-brand-500/15">{s.num}</div>
                <div className="text-brand-400 font-bold text-sm mb-2 tracking-wide">STEP {s.num}</div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                {i === 0 && !user && (
                  <button onClick={() => navigate('register')}
                    className="mt-4 text-brand-400 hover:text-brand-300 text-xs font-medium underline underline-offset-2 transition-colors">
                    立即注册账号 →
                        </button>
                )}
                {i === 0 && user && !user.is_activated && (
                  <button onClick={() => navigate('pricing')}
                    className="mt-4 text-brand-400 hover:text-brand-300 text-xs font-medium underline underline-offset-2 transition-colors">
                    购买套餐获取授权码 →
                      </button>
                )}
                {i === 0 && user && user.is_activated && (
                  <button onClick={() => navigate('profile')}
                    className="mt-4 text-green-400 hover:text-green-300 text-xs font-medium underline underline-offset-2 transition-colors">
                    ✓ 已激活，查看授权码 →
                      </button>
                )}
              </motion.div>
            ))}
                    </div>
                  </div>

        {/* 系统要求 */}
        <div className="glass rounded-2xl p-8 mb-8">
          <h3 className="font-semibold text-lg mb-5">系统要求</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {sysReqs.map((r, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                  <r.icon className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                  <div className="text-xs text-white/30 mb-0.5">{r.label}</div>
                  <div className="text-sm text-white/70">{r.value}</div>
                      </div>
                    </div>
            ))}
                      </div>
                      </div>

        {/* 未购买用户引导 */}
        {(!user || !user.is_activated) && (
          <div className="glass rounded-2xl p-8 text-center">
            <Shield className="w-10 h-10 text-brand-400 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">软件需要授权码才能使用</h3>
            <p className="text-white/40 text-sm mb-6">
              软件可以免费下载，但需要购买套餐并激活授权码后，才能解锁对应功能。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Btn primary onClick={() => navigate('pricing')}>查看套餐价格</Btn>
              {!user && <Btn onClick={() => navigate('register')}>免费注册账号</Btn>}
                  </div>
                </div>
        )}
              </div>
            </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 价格页
// ════════════════════════════════════════════════════════════════════════════
function PricingPage({ user, openPayModal, navigate }: { user: UserInfo | null; openPayModal: (p: PayingPlan) => void; navigate: (p: Page) => void }) {
  const [selectedPeriods, setSelectedPeriods] = useState<Record<string, number>>({ VIP1: 0, VIP3: 0 });

        return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">套餐与费用</h1>
          <p className="text-white/60 text-lg">一顿饭的钱，帮你省下运营、会计和数据分析的人力成本</p>
                        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {PKG_PLANS.map(plan => {
            const pidx = selectedPeriods[plan.id] ?? 0;
            const sel  = plan.prices[pidx];
            const isCurrent = user?.package_type === plan.id && user?.is_activated;
                        
                        return (
              <div key={plan.id} className={`glass rounded-2xl p-8 relative flex flex-col ${plan.highlight ? 'ring-2 ring-yellow-400/30' : ''}`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full text-xs font-semibold">
                    最受欢迎
                                </div>
                )}
                <h3 className="text-2xl font-display font-bold mb-1">{plan.name}</h3>
                <p className="text-white/40 text-sm mb-5">{plan.desc}</p>

                {/* 时长选择 */}
                <div className="flex gap-2 mb-5">
                  {plan.prices.map((pp, idx) => (
                    <button key={pp.period} onClick={() => setSelectedPeriods(p => ({ ...p, [plan.id]: idx }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${
                        pidx === idx
                          ? plan.highlight ? 'bg-yellow-500/20 border-yellow-400 text-yellow-400' : 'bg-brand-500/20 border-brand-400 text-brand-400'
                          : 'border-white/10 text-white/40 hover:border-white/20'
                      }`}>
                      {pp.period}
                      {pp.months >= 12 && <span className="block text-[10px] text-green-400">省最多</span>}
                                  </button>
                  ))}
                          </div>

                {/* 价格 */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">¥{sel.price}</span>
                  <span className="text-white/40 text-sm ml-2">{sel.months === 1 ? '/月' : `/${sel.months}个月`}</span>
                  {sel.months > 1 && <div className="text-xs text-white/30 mt-1">约 ¥{Math.round(sel.price / sel.months)}/月</div>}
                </div>

                {/* 功能列表 */}
                <ul className="space-y-2.5 mb-7 flex-grow">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.locked.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/25">
                      <span className="w-4 h-4 text-center mt-0.5 flex-shrink-0 text-xs">🔒</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <>
                    <div className={`text-center py-3 rounded-xl text-sm font-semibold mb-2 ${plan.highlight ? 'bg-yellow-500/15 text-yellow-400' : 'bg-brand-500/15 text-brand-400'}`}>
                      ✓ 当前套餐（剩余 {user?.days_left ?? 0} 天）
                    </div>
                    <Btn full onClick={() => openPayModal({ name: plan.name, packageType: plan.id, period: sel.period, price: sel.price, months: sel.months })}
                      primary={plan.highlight}>
                      续费
                    </Btn>
                  </>
                ) : (
                  <Btn full primary={plan.highlight}
                    onClick={() => openPayModal({ name: plan.name, packageType: plan.id, period: sel.period, price: sel.price, months: sel.months })}>
                    {user ? '立即购买' : '登录后购买'}
                  </Btn>
                )}
                      </div>
                        );
          })}
                    </div>

        <p className="text-center text-white/30 mt-10 text-sm">
          需要定制方案？{' '}
          <button onClick={() => navigate('contact')} className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors">联系我们</button>
        </p>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 联系 / 定制表单
// ════════════════════════════════════════════════════════════════════════════
function ContactPage({ user, token }: { user: UserInfo | null; token: string }) {
  const [form, setForm] = useState({ customer_name: '', contact: user?.phone || '', plan: '定制方案', description: '', sales_code: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr('');
    try { await apiRequest('/orders', { method: 'POST', body: JSON.stringify(form) }, token); setSuccess(true); }
    catch (e: any) { setErr(e.message); }
    setLoading(false);
  }

  if (success) return (
    <div className="max-w-md mx-auto pt-40 text-center px-6">
      <div className="glass rounded-3xl p-12">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-3">提交成功！</h2>
        <p className="text-white/50">我们会在 24 小时内与您联系</p>
                      </div>
                      </div>
                        );

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-display font-bold mb-3">定制方案</h1>
        <p className="text-white/50 mb-10">填写需求，我们为您量身定制</p>
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-4">
          <GlassInput label="公司/姓名 *" value={form.customer_name} onChange={v => setForm(p => ({ ...p, customer_name: v }))} />
          <GlassInput label="联系方式 *" value={form.contact} onChange={v => setForm(p => ({ ...p, contact: v }))} />
          <GlassInput label="需求描述" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} textarea />
          <GlassInput label="销售码（如有）" value={form.sales_code} onChange={v => setForm(p => ({ ...p, sales_code: v }))} placeholder="如 A001，没有可不填" />
          {err && <ErrBox msg={err} />}
          <Btn type="submit" primary full disabled={loading}>
            {loading ? '提交中...' : <><span>提交需求</span><Rocket className="w-4 h-4" /></>}
          </Btn>
        </form>
              </div>
            </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 登录页
// ════════════════════════════════════════════════════════════════════════════
function LoginPage({ token, setToken, setUser, navigate }: any) {
  const [phone, setPhone] = useState('');
  const [pw, setPw]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]     = useState('');

  useEffect(() => { if (token) navigate('profile'); }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setErr('');
    try {
      const data = await apiRequest<{ token: string; user: UserInfo }>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, password: pw }) });
      localStorage.setItem('token', data.token); setToken(data.token); setUser(data.user); navigate('profile');
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }

        return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-sm mx-auto">
        <h1 className="text-4xl font-display font-bold mb-2 text-center">登录</h1>
        <p className="text-white/40 text-center mb-10">欢迎回来</p>
        <form onSubmit={handleLogin} className="glass rounded-2xl p-8 space-y-4">
          <GlassInput label="手机号" value={phone} onChange={setPhone} type="tel" />
          <GlassInput label="密码" value={pw} onChange={setPw} type="password" />
          {err && <ErrBox msg={err} />}
          <Btn type="submit" primary full disabled={loading}>{loading ? '登录中...' : '登录'}</Btn>
          <button type="button" onClick={() => navigate('register')} className="w-full text-center text-sm text-brand-400 hover:text-brand-300 transition-colors pt-1">
            没有账号？立即注册
          </button>
        </form>
                </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 注册页
// ════════════════════════════════════════════════════════════════════════════
function RegisterPage({ setToken, navigate }: any) {
  const [phone, setPhone]       = useState('');
  const [smsCode, setSmsCode]   = useState('');
  const [pw, setPw]             = useState('');
  const [salesCode, setSalesCode] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);
  const [countdown, setCountdown]   = useState(0);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const [smsTip, setSmsTip]     = useState('');

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
      setSmsTip(d.code ? `开发模式验证码：${d.code}` : (d.message || '验证码已发送'));
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
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-display font-bold mb-2 text-center">注册账号</h1>
        <p className="text-white/40 text-center mb-10">注册后购买套餐即可立即激活</p>
        <form onSubmit={handleRegister} className="glass rounded-2xl p-8 space-y-4">
          <GlassInput label="手机号 *" value={phone} onChange={setPhone} type="tel" placeholder="请输入11位手机号" />

          {/* 验证码 */}
                      <div>
            <label className="block text-white/50 text-xs mb-1.5">短信验证码 *</label>
                        <div className="flex gap-2">
              <input value={smsCode} onChange={e => setSmsCode(e.target.value)} placeholder="6位验证码" maxLength={6}
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors text-white" />
              <button type="button" onClick={sendSms} disabled={smsLoading || countdown > 0 || !phone}
                className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  countdown > 0 ? 'glass text-white/40' : 'bg-brand-500 text-white hover:bg-brand-400'
                }`}>
                {smsLoading ? '发送中' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                          </button>
                        </div>
            {smsTip && <p className="mt-1.5 text-xs text-green-400">{smsTip}</p>}
                  </div>

          <GlassInput label="密码 *（至少6位）" value={pw} onChange={setPw} type="password" placeholder="设置登录密码" />

                      <div>
            <GlassInput label="销售码（选填）" value={salesCode} onChange={setSalesCode} placeholder="如 A001，没有可不填" />
            <p className="mt-1 text-xs text-white/25">由销售人员提供，绑定后不可更改</p>
                  </div>

          {err && <ErrBox msg={err} />}
          <Btn type="submit" primary full disabled={loading}>{loading ? '注册中...' : '立即注册'}</Btn>
          <button type="button" onClick={() => navigate('login')} className="w-full text-center text-sm text-brand-400 hover:text-brand-300 transition-colors pt-1">
            已有账号？去登录
          </button>
        </form>
                    </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 个人中心
// ════════════════════════════════════════════════════════════════════════════
function ProfilePage({ user, token, loadUser, openPayModal, navigate, orderRefreshKey = 0 }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) { navigate('login'); return; }
    apiRequest<any[]>('/user/orders', {}, token).then(setOrders).catch(() => {});
  }, [token, orderRefreshKey]); // orderRefreshKey 变化时重新加载订单

  function copyLicense() {
    if (!user?.license_key) return;
    navigator.clipboard.writeText(user.license_key).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function calcCredit(daysLeft: number) { return Math.round(daysLeft * (99 / 30)); }

  function openUpgradeModal(months: number, price: number, period: string) {
    const daysLeft = user?.days_left ?? 0;
    const credit = calcCredit(daysLeft);
    openPayModal({ name: '升级专业版', packageType: 'VIP3', period, price, months, isUpgrade: true, credit, finalPrice: Math.max(0, price - credit) });
  }

  if (!user) return (
    <div className="flex items-center justify-center pt-40">
      <div className="glass rounded-2xl px-12 py-8 text-white/40">加载中...</div>
                </div>
        );

  const pkgLabel  = user.package_type === 'VIP3' ? '专业版' : user.package_type === 'VIP1' ? '基础版' : '未激活';
  // 已激活 且 有到期日 且 剩余天数为0 → 已过期
  const isExpired = !!(user.is_activated && user.expire_date && (user.days_left ?? 0) === 0);
  // 升级/续费功能只在未过期的激活用户中显示
  const isVip3    = user.is_activated && !isExpired && user.package_type === 'VIP3';
  const isVip1    = user.is_activated && !isExpired && user.package_type === 'VIP1';

        return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-display font-bold">个人中心</h1>

        {/* 账户状态卡 */}
                <div className="glass rounded-2xl p-8">
          <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
                    <div>
              <div className="text-lg font-semibold mb-1">
                📱 {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                    </div>
              {user.sales_name && <div className="text-xs text-white/40">归属销售：{user.sales_name}（{user.sales_code}）</div>}
                    </div>
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              isExpired ? 'bg-red-500/15 text-red-400' :
              user.is_activated ? 'bg-green-500/15 text-green-400' :
              'bg-white/5 text-white/40'
            }`}>
              {isExpired ? `⊘ ${pkgLabel}（已过期）` : user.is_activated ? `✓ ${pkgLabel}` : '⊘ 未激活'}
            </span>
                  </div>

          {/* 过期警告横幅 */}
          {isExpired && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-xl px-5 py-3 mb-5 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>您的套餐已到期，软件功能已停用。请续费后重新打开软件即可恢复使用。</span>
            </div>
          )}

          {/* 套餐数据 */}
          {user.is_activated && user.expire_date && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: '套餐状态', value: isExpired ? '已过期' : pkgLabel, color: isExpired ? 'text-red-400' : 'text-brand-400' },
                { label: '到期时间', value: new Date(user.expire_date).toLocaleDateString('zh-CN'), color: isExpired ? 'text-red-400/70' : 'text-yellow-400' },
                { label: '剩余天数', value: `${user.days_left ?? 0} 天`, color: (user.days_left ?? 0) === 0 ? 'text-red-400' : (user.days_left ?? 0) < 10 ? 'text-yellow-400' : 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <div className="text-white/30 text-xs mb-1">{s.label}</div>
                  <div className={`font-bold text-base ${s.color}`}>{s.value}</div>
                </div>
              ))}
              </div>
          )}

          {/* 软件授权码 */}
          {user.license_key && (
            <div className="bg-white/[0.02] rounded-xl border border-white/10 p-5 mb-4">
              <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
                🔑 <span className="font-medium text-white/60">桌面软件授权码</span>
                <span>· 与手机号唯一绑定，请勿泄露</span>
                    </div>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-lg font-bold tracking-[0.2em] text-brand-300 bg-white/5 px-4 py-3 rounded-lg border border-white/10 select-all">
                  {user.license_key}
                </code>
                <button onClick={copyLicense}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-green-500/80 text-white' : 'bg-brand-500 text-white hover:bg-brand-400'}`}>
                  {copied ? <><Check className="w-4 h-4" />已复制</> : <><Copy className="w-4 h-4" />复制</>}
                      </button>
                  </div>
              <p className="mt-2 text-xs text-white/25">在桌面软件弹出的激活框中粘贴此码即可 · 每次续费/升级后会生成新激活码，请以最新激活码为准</p>
                </div>
          )}

          {!user.license_key && !user.is_activated && (
            <div className="bg-yellow-500/8 rounded-xl border border-yellow-500/20 p-4 text-sm text-yellow-400/80">
              💡 购买套餐后将自动生成您的专属软件授权码
              </div>
          )}

          {/* VIP1 升级按钮 */}
          {isVip1 && (
            <div className="mt-4 p-5 rounded-xl bg-gradient-to-r from-yellow-500/8 to-purple-500/8 border border-yellow-500/25">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="font-bold text-yellow-400">⚡ 升级到专业版</div>
                  <div className="text-xs text-white/40 mt-1">解锁 AI 营销 · 经营分析 · 财务报税</div>
                </div>
                {(user.days_left ?? 0) > 0 && (
                  <div className="text-right text-xs">
                    <div className="text-green-400">可抵扣 ¥{calcCredit(user.days_left ?? 0)}</div>
                    <div className="text-white/30 mt-0.5">剩余 {user.days_left} 天 × ¥{(99/30).toFixed(1)}/天</div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ period: '月付', months: 1, price: 299 }, { period: '季付', months: 3, price: 888 }, { period: '年付', months: 12, price: 3388 }].map(opt => {
                  const credit = calcCredit(user.days_left ?? 0);
                  const final  = Math.max(0, opt.price - credit);
        return (
                    <button key={opt.period} onClick={() => openUpgradeModal(opt.months, opt.price, opt.period)}
                      className="py-3 px-2 rounded-xl border border-yellow-500/25 bg-yellow-500/5 hover:bg-yellow-500/10 transition-all text-center cursor-pointer">
                      <div className="text-xs text-white/40 mb-1">{opt.period}</div>
                      {credit > 0 && <div className="text-xs text-white/25 line-through">¥{opt.price}</div>}
                      <div className="text-base font-bold text-yellow-400">¥{final}</div>
                    </button>
                  );
                })}
                  </div>
                </div>
          )}

          {/* VIP3 AI 额度 */}
          {isVip3 && (
            <div className="mt-4 bg-white/[0.02] rounded-xl border border-white/10 p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-white/60">本月 AI 额度</span>
                <span className="text-xs text-white/30">
                  {user.is_owner_unlimited ? '老板账号已启用无限额度' : '购买加速包可立即追加次数'}
                </span>
                  </div>
              <div className="grid grid-cols-3 gap-3">
                <QuotaBar label="AI 生图"  remaining={user.ai_image_quota ?? 0} base={20} color="bg-brand-500" unlimited={!!user.is_owner_unlimited} />
                <QuotaBar label="AI 视频"  remaining={user.ai_video_quota ?? 0} base={15} color="bg-purple-500" unlimited={!!user.is_owner_unlimited} />
                <QuotaBar label="AI 剪辑"  remaining={user.ai_edit_quota  ?? 0} base={15} color="bg-pink-500" unlimited={!!user.is_owner_unlimited} />
                  </div>
                  </div>
          )}
                </div>
                
        {/* 购买 / 续费 */}
        <div className="glass rounded-2xl p-8">
          <h3 className="font-semibold text-lg mb-5">购买 / 续费套餐</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {PKG_PLANS.map(plan => (
              <div key={plan.id} className={`rounded-xl border p-5 ${plan.highlight ? 'border-yellow-500/30' : 'border-white/10'}`}>
                <div className={`font-semibold mb-3 ${plan.highlight ? 'text-yellow-400' : 'text-brand-400'}`}>{plan.name}</div>
                <div className="space-y-2">
                  {plan.prices.map(pp => (
                    <button key={pp.period} onClick={() => openPayModal({ name: plan.name, packageType: plan.id, period: pp.period, price: pp.price, months: pp.months })}
                      className="w-full flex justify-between items-center px-4 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 transition-all text-sm">
                      <span className="text-white/60">{pp.period}</span>
                      <span className={`font-bold ${plan.highlight ? 'text-yellow-400' : 'text-brand-400'}`}>¥{pp.price}</span>
                    </button>
                  ))}
                      </div>
              </div>
            ))}

            {/* AI 加速包（仅专业版） */}
            {isVip3 && (
              <div className="rounded-xl border border-pink-500/30 p-5">
                <div className="font-semibold text-pink-400 mb-1">🚀 AI 加速包</div>
                <div className="text-xs text-white/40 mb-4">+10图片 / +10视频 / +10编辑（立即生效）</div>
                <button onClick={() => openPayModal({ name: 'AI 加速包', packageType: 'ADDON', period: '一次性', price: ADDON.price, months: 0 })}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-orange-500 text-white font-semibold text-sm hover:opacity-90 transition-opacity">
                  ¥88 立即购买
                    </button>
              </div>
            )}
                  </div>
                </div>
                
        {/* 订单记录 */}
        <div className="glass rounded-2xl p-8">
          <h3 className="font-semibold text-lg mb-5">订单记录</h3>
          {orders.length === 0 ? (
            <div className="text-center text-white/30 py-8">暂无订单</div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <div key={o.id} className="px-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/8">
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <div>
                      <div className="font-medium text-sm">{o.plan}</div>
                      <div className="text-xs text-white/30 mt-0.5">{new Date(o.created_at).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {o.amount && <span className="text-yellow-400 font-semibold text-sm">¥{o.amount}</span>}
                      <span className={`text-xs px-3 py-1 rounded-full ${o.status === 'paid' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        {o.status === 'paid' ? '已完成' : '待处理'}
                      </span>
                    </div>
                  </div>
                  {/* ADDON 加速包：显示激活码供用户使用 */}
                  {o.package_type === 'ADDON' && o.addon_code && (
                    <div className="mt-2.5 flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                      <span className="text-xs text-white/40 flex-shrink-0">加速包激活码</span>
                      <code className="text-yellow-400 text-xs font-mono font-bold flex-1 tracking-widest select-all">{o.addon_code}</code>
                      {o.addon_used ? (
                        <span className="text-xs text-green-400 flex-shrink-0">✓ 已激活</span>
                      ) : (
                        <span className="text-xs text-yellow-400/60 flex-shrink-0">待激活</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
                </div>
              </div>
            </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 付款弹窗
// ════════════════════════════════════════════════════════════════════════════
function PayModal({ plan, loading, success, qrCode, onPay, onClose }: {
  plan: PayingPlan; loading: boolean;
  success: { expire_date: string; days_left: number; package_type?: string; addon_code?: string; license_key?: string } | null;
  qrCode?: string | null;
  onPay: () => void; onClose: () => void;
}) {
  const [codeCopied, setCodeCopied] = React.useState(false);
  const payAmount = plan.isUpgrade ? (plan.finalPrice ?? plan.price) : plan.price;

  function copyAddonCode(code: string) {
    navigator.clipboard.writeText(code).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); });
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-2xl p-8 max-w-sm w-full">
        {success ? (
          <div className="text-center">
            {success.addon_code ? (
              /* ADDON 加速包购买成功 */
              <>
                <div className="text-6xl mb-4">🚀</div>
                <h3 className="text-2xl font-bold text-yellow-400 mb-2">加速包购买成功！</h3>
                <p className="text-white/50 text-sm mb-4">请将以下激活码填入桌面软件的额度弹窗中，额度将立即到账</p>
                <div className="bg-black/40 border border-yellow-500/40 rounded-xl p-4 mb-4">
                  <p className="text-white/40 text-xs mb-2">加速包激活码</p>
                  <p className="text-yellow-400 text-lg font-bold font-mono tracking-widest mb-3">{success.addon_code}</p>
                  <button
                    onClick={() => copyAddonCode(success.addon_code!)}
                    className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg text-yellow-400 text-sm font-semibold transition-colors"
                  >
                    {codeCopied ? '✓ 已复制' : '复制激活码'}
                  </button>
                </div>
                <div className="text-left bg-white/[0.03] rounded-xl p-3 mb-4 text-sm text-white/50 space-y-1">
                  <p>💡 使用方法：</p>
                  <p>1. 打开桌面软件，在 AI 功能页面生成内容</p>
                  <p>2. 弹出额度用完提示时，粘贴激活码并点击「立即激活」</p>
                  <p>3. 激活后生图 +10 · 视频 +10 · 剪辑 +10 立即生效</p>
                </div>
                <Btn primary full onClick={onClose}>返回个人中心</Btn>
              </>
            ) : (
              /* 普通套餐购买/续费/升级成功 */
              <>
                <div className="text-6xl mb-4">{plan.isUpgrade ? '🚀' : '🎉'}</div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">{plan.isUpgrade ? '升级成功！' : '购买成功！'}</h3>
                {plan.isUpgrade && (
                  <div className="mb-4 px-4 py-3 bg-yellow-500/10 rounded-xl text-sm text-yellow-400">✨ 已解锁：AI 营销工坊 · 经营分析 · 财务报税</div>
                )}
                <p className="text-white/50 text-sm mb-1">套餐：{success.package_type === 'VIP3' ? '专业版' : plan.name}</p>
                <p className="text-white/50 text-sm mb-1">到期时间：{new Date(success.expire_date).toLocaleDateString('zh-CN')}</p>
                <p className="text-green-400 text-lg font-bold mb-4">剩余 {success.days_left} 天</p>
                {/* 激活码展示（方案A：每次购买都生成新码） */}
                {success.license_key && (
                  <div className="bg-black/40 border border-brand-500/40 rounded-xl p-4 mb-4 text-left">
                    <p className="text-white/40 text-xs mb-2">🔑 桌面软件激活码（新）</p>
                    <p className="text-brand-300 text-base font-bold font-mono tracking-widest mb-3 select-all">{success.license_key}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(success.license_key!); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                      className="px-4 py-2 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 rounded-lg text-brand-300 text-sm font-semibold transition-colors"
                    >
                      {codeCopied ? '✓ 已复制' : '复制激活码'}
                    </button>
                  </div>
                )}
                <div className="text-left bg-white/[0.03] rounded-xl p-3 mb-4 text-sm text-white/50 space-y-1">
                  <p>💡 激活步骤：</p>
                  <p>1. 复制以上激活码</p>
                  <p>2. 打开桌面软件 → 在弹出的激活框中粘贴激活码</p>
                  <p>3. 点击「立即激活」，功能即刻解锁</p>
                </div>
                <Btn primary full onClick={onClose}>返回个人中心</Btn>
              </>
            )}
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold mb-1">{plan.isUpgrade ? '⚡ 升级专业版' : '确认购买'}</h3>
            <p className="text-white/40 text-sm mb-5">{plan.isUpgrade ? '付款成功后立即获得激活码，在桌面软件的升级弹窗中输入即可立即解锁（无需重启）' : '扫码完成付款后，账户将立即激活'}</p>

            <div className="bg-white/[0.03] rounded-xl p-4 mb-5 space-y-2.5">
              <Row label="套餐"  value={plan.isUpgrade ? '专业版' : plan.name} />
              <Row label="时长"  value={`${plan.period}${plan.months > 0 ? `（${plan.months}个月）` : ''}`} />
              {plan.isUpgrade && plan.credit !== undefined && plan.credit > 0 && (
                <>
                  <Row label="原价" value={`¥${plan.price}`} strike />
                  <div className="flex justify-between px-3 py-2 bg-green-500/8 rounded-lg">
                    <span className="text-green-400 text-sm">基础版剩余天数抵扣</span>
                    <span className="text-green-400 font-semibold">-¥{plan.credit}</span>
                        </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t border-white/8">
                <span className="text-white/40">实付金额</span>
                <span className="text-2xl font-bold text-yellow-400">¥{payAmount}</span>
                        </div>
                      </div>

            {/* 二维码 */}
            {qrCode ? (
              <div className="mb-4">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} alt="支付二维码" className="w-48 h-48 mx-auto rounded-xl" />
                <p className="text-center text-white/30 text-xs mt-2">微信扫码付款</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl w-40 h-40 mx-auto mb-4 flex flex-col items-center justify-center">
                <div className="text-4xl">📱</div>
                <div className="text-gray-700 text-xs mt-2 text-center">微信/支付宝<br />扫码付款</div>
              </div>
            )}
            <p className="text-center text-white/30 text-xs mb-4">付款完成后点击下方按钮立即生效</p>

            <Btn primary full disabled={loading} onClick={onPay}>
              {loading ? (plan.isUpgrade ? '升级中...' : '激活中...') : `✓ 我已完成付款 · 立即${plan.isUpgrade ? '升级' : '激活'}`}
            </Btn>
            <button onClick={onClose} className="w-full mt-3 text-white/30 hover:text-white/60 text-sm py-2 transition-colors">取消</button>
          </>
        )}
      </motion.div>
              </div>
  );
}

const Row = ({ label, value, strike = false }: { label: string; value: string; strike?: boolean }) => (
  <div className="flex justify-between text-sm">
    <span className="text-white/40">{label}</span>
    <span className={strike ? 'text-white/25 line-through' : 'text-white/80'}>{value}</span>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// 管理员后台
// ════════════════════════════════════════════════════════════════════════════
function AdminPage() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken') || '');
  const [smsCode, setSmsCode]       = useState('');
  const [codeSent, setCodeSent]     = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr]     = useState('');
  const [tab, setTab]   = useState<'orders' | 'users' | 'sales' | 'content'>('orders');
  const [orders, setOrders]     = useState<any[]>([]);
  const [users, setUsers]       = useState<any[]>([]);
  const [sales, setSales]       = useState<any[]>([]);
  const [content, setContent]   = useState<any[]>([]);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [newSales, setNewSales] = useState({ name: '', code_prefix: '', phone: '', password: '' });
  const [msg, setMsg]           = useState('');

  const h = { 'X-Admin-Token': adminToken };
  async function aGet<T>(p: string): Promise<T> {
    const r = await fetch(`/api${p}`, { headers: h }); const t = await r.text(); const d = t ? JSON.parse(t) : {};
    if (!r.ok) throw new Error(d.error || 'Error'); return d as T;
  }
  async function aPost<T>(p: string, body: any): Promise<T> {
    const r = await fetch(`/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body) });
    const t = await r.text(); const d = t ? JSON.parse(t) : {}; if (!r.ok) throw new Error(d.error || 'Error'); return d as T;
  }

  async function handleSendCode() {
    setSendingCode(true); setLoginErr('');
    try {
      await apiRequest('/admin/send-code', { method: 'POST' });
      setCodeSent(true);
      setTimeout(() => setCodeSent(false), 60000); // 60秒后允许重新发送
    } catch (e: any) { setLoginErr(e.message); }
    setSendingCode(false);
  }

  async function handleLogin() {
    if (!smsCode.trim()) { setLoginErr('请输入验证码'); return; }
    setLoginLoading(true); setLoginErr('');
    try {
      const d = await apiRequest<{ token: string }>('/admin/login', { method: 'POST', body: JSON.stringify({ code: smsCode.trim() }) });
      localStorage.setItem('adminToken', d.token); setAdminToken(d.token);
    } catch (e: any) { setLoginErr(e.message); }
    setLoginLoading(false);
  }

  useEffect(() => {
    if (!adminToken) return;
    if (tab === 'orders')  aGet<any[]>('/admin/orders').then(setOrders).catch(() => {});
    if (tab === 'users')   aGet<any[]>('/admin/users').then(setUsers).catch(() => {});
    if (tab === 'sales')   aGet<any[]>('/admin/sales').then(setSales).catch(() => {});
    if (tab === 'content') aGet<any[]>('/admin/content').then(c => { setContent(c); const m: Record<string,string>={}; c.forEach((x:any)=>m[x.key]=x.value); setEditedContent(m); }).catch(() => {});
  }, [adminToken, tab]);

  if (!adminToken) return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-sm mx-auto">
        <h1 className="text-3xl font-display font-bold mb-8 text-center">管理员登录</h1>
        <div className="glass rounded-2xl p-8 space-y-4">
          <p className="text-sm text-white/40 text-center">验证码将发送到管理员手机</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <GlassInput label="短信验证码" value={smsCode} onChange={v => { setSmsCode(v); setLoginErr(''); }} />
            </div>
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sendingCode || codeSent}
              className="shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all border"
              style={{
                background: codeSent ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.3)',
                color: codeSent ? '#6366f1' : '#a5b4fc',
                cursor: (sendingCode || codeSent) ? 'not-allowed' : 'pointer',
                opacity: (sendingCode || codeSent) ? 0.6 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {sendingCode ? '发送中...' : codeSent ? '已发送' : '获取验证码'}
            </button>
          </div>
          {loginErr && <ErrBox msg={loginErr} />}
          <Btn primary full onClick={handleLogin} disabled={loginLoading}>
            {loginLoading ? '验证中...' : '登录'}
          </Btn>
        </div>
      </div>
    </section>
  );

        return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">管理后台</h1>
          <button onClick={async () => {
              try { await fetch('/api/admin/logout', { method: 'POST', headers: { 'X-Admin-Token': adminToken } }); } catch (_) {}
              localStorage.removeItem('adminToken'); setAdminToken('');
            }}
            className="glass text-white/50 hover:text-white text-sm px-4 py-2 rounded-lg transition-all">退出</button>
                </div>

        <div className="flex gap-2 mb-6 pb-4 border-b border-white/8">
          {(['orders','users','sales','content'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t ? 'bg-brand-500 text-white' : 'glass text-white/50 hover:text-white'}`}>
              {{ orders: '📦 订单', users: '👥 用户', sales: '🏷️ 销售', content: '📝 内容' }[t]}
            </button>
                  ))}
                </div>

        {tab === 'orders' && <AdminTable headers={['#','客户','联系','套餐','金额','状态','销售','到期','时间']}>
          {orders.map(o => <tr key={o.id} className="border-b border-white/5">
            {[o.id, o.customer_name, o.contact, o.plan, o.amount ? `¥${o.amount}` : '-', , o.sales_code||'-',
              o.user_expire_date ? new Date(o.user_expire_date).toLocaleDateString('zh-CN') : '-',
              new Date(o.created_at).toLocaleDateString('zh-CN')].map((v, i) =>
              i === 5 ? <td key={i} className="px-4 py-3"><StatusBadge s={o.status} /></td>
                      : <td key={i} className="px-4 py-3 text-white/60 text-sm">{v}</td>
            )}
          </tr>)}
        </AdminTable>}

        {tab === 'users' && <AdminTable headers={['手机','套餐','到期','剩余天数','归属销售','注册时间']}>
          {users.map(u => <tr key={u.id} className="border-b border-white/5">
            <td className="px-4 py-3 text-white/60 text-sm">{u.phone}</td>
            <td className="px-4 py-3 text-white/60 text-sm">{u.is_activated ? (u.package_type === 'VIP3' ? '专业版' : '基础版') : '未激活'}</td>
            <td className="px-4 py-3 text-white/60 text-sm">{u.expire_date ? new Date(u.expire_date).toLocaleDateString('zh-CN') : '-'}</td>
            <td className={`px-4 py-3 text-sm font-semibold ${u.days_left < 10 ? 'text-red-400' : 'text-green-400'}`}>{u.expire_date ? `${u.days_left}天` : '-'}</td>
            <td className="px-4 py-3 text-white/60 text-sm">{u.sales_code ? `${u.sales_name}（${u.sales_code}）` : '直销'}</td>
            <td className="px-4 py-3 text-white/60 text-sm">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
          </tr>)}
        </AdminTable>}

        {tab === 'sales' && (
          <div className="space-y-4">
                  <div className="glass rounded-2xl p-6">
              <h4 className="font-semibold mb-4">添加销售</h4>
              <div className="grid md:grid-cols-4 gap-3">
                {(['name','code_prefix','phone','password'] as const).map(k => (
                  <input key={k} placeholder={{ name:'姓名', code_prefix:'销售码（如B001）', phone:'手机号', password:'密码' }[k]}
                    value={newSales[k]} onChange={e => setNewSales(p => ({ ...p, [k]: e.target.value }))}
                    className="rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white" />
                ))}
                    </div>
              <div className="flex items-center gap-3 mt-3">
                <Btn primary onClick={async () => {
                  try { await aPost('/admin/sales', newSales); const s = await aGet<any[]>('/admin/sales'); setSales(s); setNewSales({ name:'', code_prefix:'', phone:'', password:'' }); setMsg('添加成功'); setTimeout(() => setMsg(''), 2000); }
                  catch (e: any) { setMsg(e.message); }
                }}>添加销售</Btn>
                {msg && <span className="text-green-400 text-sm">{msg}</span>}
              </div>
            </div>
            <AdminTable headers={['#','姓名','销售码','手机','创建时间','操作']}>
              {sales.map(s => <tr key={s.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/60 text-sm">{s.id}</td>
                <td className="px-4 py-3 text-white/60 text-sm">{s.name}</td>
                <td className="px-4 py-3"><code className="bg-white/5 px-2 py-0.5 rounded text-xs text-brand-400">{s.code_prefix}</code></td>
                <td className="px-4 py-3 text-white/60 text-sm">{s.phone || '-'}</td>
                <td className="px-4 py-3 text-white/60 text-sm">{new Date(s.created_at).toLocaleDateString('zh-CN')}</td>
                <td className="px-4 py-3">
                  <button onClick={async () => {
                    if (!confirm('确认删除？')) return;
                    await fetch(`/api/admin/sales/${s.id}`, { method: 'DELETE', headers: h });
                    const ss = await aGet<any[]>('/admin/sales'); setSales(ss);
                  }} className="text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 text-xs px-3 py-1.5 rounded-lg transition-all">删除</button>
                            </td>
              </tr>)}
            </AdminTable>
                    </div>
        )}

        {tab === 'content' && (
          <div className="glass rounded-2xl p-6 space-y-4">
            {content.map(c => (
              <div key={c.key}>
                <label className="block text-white/40 text-xs mb-1.5">{c.key}</label>
                <textarea value={editedContent[c.key] ?? c.value} onChange={e => setEditedContent(p => ({ ...p, [c.key]: e.target.value }))} rows={2}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 text-white resize-vertical" />
                  </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <Btn primary onClick={async () => {
                try { await aPost('/admin/content', { items: Object.entries(editedContent).map(([key, value]) => ({ key, value })) }); setMsg('保存成功'); setTimeout(() => setMsg(''), 2000); }
                catch (e: any) { setMsg(e.message); }
              }}>保存内容</Btn>
              {msg && <span className="text-green-400 text-sm">{msg}</span>}
                </div>
          </div>
        )}
              </div>
            </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 销售后台
// ════════════════════════════════════════════════════════════════════════════
function SalesPage() {
  const [salesToken, setSalesToken] = useState(localStorage.getItem('salesToken') || '');
  const [loginForm, setLoginForm]   = useState({ code_prefix: '', password: '' });
  const [loginErr, setLoginErr]     = useState('');
  const [customers, setCustomers]   = useState<any[]>([]);
  const [tab, setTab]   = useState<'customers' | 'orders'>('customers');
  const [orders, setOrders] = useState<any[]>([]);

  async function sGet<T>(p: string): Promise<T> {
    const r = await fetch(`/api${p}`, { headers: { Authorization: `Bearer ${salesToken}` } });
    const t = await r.text(); const d = t ? JSON.parse(t) : {}; if (!r.ok) throw new Error(d.error || 'Error'); return d as T;
  }

  async function salesLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr('');
    try { const d = await apiRequest<{ token: string }>('/sales/login', { method: 'POST', body: JSON.stringify(loginForm) }); localStorage.setItem('salesToken', d.token); setSalesToken(d.token); }
    catch (e: any) { setLoginErr(e.message); }
  }

  useEffect(() => {
    if (!salesToken) return;
    if (tab === 'customers') sGet<any[]>('/sales/customers').then(setCustomers).catch(() => {});
    if (tab === 'orders')    sGet<any[]>('/sales/orders').then(setOrders).catch(() => {});
  }, [salesToken, tab]);

  if (!salesToken) return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-sm mx-auto">
        <h1 className="text-3xl font-display font-bold mb-8 text-center">销售登录</h1>
        <form onSubmit={salesLogin} className="glass rounded-2xl p-8 space-y-4">
          <GlassInput label="销售码（如 A001）" value={loginForm.code_prefix} onChange={v => setLoginForm(p => ({ ...p, code_prefix: v.toUpperCase() }))} />
          <GlassInput label="密码" value={loginForm.password} onChange={v => setLoginForm(p => ({ ...p, password: v }))} type="password" />
          {loginErr && <ErrBox msg={loginErr} />}
          <Btn type="submit" primary full>登录</Btn>
        </form>
          </div>
    </section>
    );

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">销售工作台</h1>
          <button onClick={() => { localStorage.removeItem('salesToken'); setSalesToken(''); }}
            className="glass text-white/50 hover:text-white text-sm px-4 py-2 rounded-lg transition-all">退出</button>
      </div>

        <div className="flex gap-2 mb-6 pb-4 border-b border-white/8">
          {(['customers','orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${tab === t ? 'bg-brand-500 text-white' : 'glass text-white/50 hover:text-white'}`}>
              {{ customers: '👥 我的客户', orders: '📦 我的订单' }[t]}
              </button>
            ))}
          </div>

        {tab === 'customers' && <AdminTable headers={['手机','套餐','到期时间','剩余天数','状态','注册时间']}>
          {customers.map(c => <tr key={c.id} className="border-b border-white/5">
            <td className="px-4 py-3 text-white/60 text-sm">{c.phone}</td>
            <td className="px-4 py-3 text-white/60 text-sm">{c.is_activated ? (c.package_type === 'VIP3' ? '专业版' : '基础版') : '-'}</td>
            <td className="px-4 py-3 text-white/60 text-sm">{c.expire_date ? new Date(c.expire_date).toLocaleDateString('zh-CN') : '-'}</td>
            <td className={`px-4 py-3 text-sm font-semibold ${c.days_left < 10 ? 'text-red-400' : 'text-green-400'}`}>{c.expire_date ? `${c.days_left}天` : '-'}</td>
            <td className="px-4 py-3"><StatusBadge s={c.is_activated ? 'paid' : 'pending'} /></td>
            <td className="px-4 py-3 text-white/60 text-sm">{new Date(c.created_at).toLocaleDateString('zh-CN')}</td>
          </tr>)}
        </AdminTable>}

        {tab === 'orders' && <AdminTable headers={['#','客户','联系','套餐','金额','状态','时间']}>
          {orders.map(o => <tr key={o.id} className="border-b border-white/5">
            {[o.id, o.customer_name, o.contact, o.plan, o.amount ? `¥${o.amount}` : '-',,
              new Date(o.created_at).toLocaleDateString('zh-CN')].map((v, i) =>
              i === 5 ? <td key={i} className="px-4 py-3"><StatusBadge s={o.status} /></td>
                      : <td key={i} className="px-4 py-3 text-white/60 text-sm">{v}</td>
            )}
          </tr>)}
        </AdminTable>}
          </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 通用小组件
// ════════════════════════════════════════════════════════════════════════════
function QuotaBar({ label, remaining, base, color, unlimited = false }: { label: string; remaining: number; base: number; color: string; unlimited?: boolean }) {
  if (unlimited) {
    return (
      <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-white/50">{label}</span>
          <span className="font-semibold text-amber-300">无限</span>
        </div>
        <div className="h-1 bg-white/8 rounded-full">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: '100%' }} />
        </div>
        <div className="mt-1.5 text-[10px] text-amber-300/80">
          老板账号专享，不扣减次数
        </div>
      </div>
    );
  }

  const extra    = Math.max(0, remaining - base);
  const baseUsed = Math.max(0, base - Math.min(remaining, base));
  const pct      = base > 0 ? Math.min(100, (baseUsed / base) * 100) : 0;
  const isEmpty  = remaining === 0;
  return (
    <div className={`p-3 rounded-xl border ${isEmpty ? 'border-red-500/30 bg-red-500/5' : 'border-white/8 bg-white/[0.02]'}`}>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-white/50">{label}</span>
        <span className={`font-semibold ${isEmpty ? 'text-red-400' : 'text-white/70'}`}>
          {remaining}次{extra > 0 && <span className="text-orange-400 ml-1">+{extra}</span>}
        </span>
          </div>
      <div className="h-1 bg-white/8 rounded-full">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${100 - pct}%` }} />
          </div>
      <div className="mt-1.5 text-[10px] text-white/25">
        {isEmpty ? '已用完，请购买加速包' : `基础 ${base - baseUsed}/${base} 剩余`}
        </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid:    { label: '已完成', cls: 'bg-green-500/15 text-green-400' },
    pending: { label: '待处理', cls: 'bg-yellow-500/15 text-yellow-400' },
    active:  { label: '已激活', cls: 'bg-green-500/15 text-green-400' },
  };
  const info = map[s] || { label: s, cls: 'bg-white/5 text-white/40' };
  return <span className={`text-xs px-3 py-1 rounded-full ${info.cls}`}>{info.label}</span>;
}

function AdminTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {headers.map(h => <th key={h} className="px-4 py-3 text-left text-white/30 font-medium text-xs whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
