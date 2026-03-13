import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Cpu, 
  Zap, 
  Shield, 
  Globe, 
  Github, 
  Twitter, 
  ChevronLeft,
  ChevronRight, 
  Monitor, 
  Apple, 
  Terminal,
  Menu,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  BrainCircuit,
  BarChart3,
  Rocket,
  PlayCircle,
  CheckCircle2,
  CreditCard,
  Activity,
  Code2,
  Database,
  TrendingUp,
  Users,
  Receipt,
  Calculator,
  Palette,
  Calendar,
  FileText,
  PieChart,
  MessageSquare,
  Store,
  Target,
  Lightbulb,
  Wallet,
  Clock,
  ShieldCheck,
  Star,
  ClipboardList,
  UploadCloud,
  Key
} from 'lucide-react';

type Page = 'home' | 'features' | 'pricing' | 'download' | 'login' | 'register' | 'profile' | 'activate' | 'admin';

// 轮播图图片 - 使用中文文件名
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

// 轮播图组件
const ImageCarousel = () => {
  const [current, setCurrent] = useState(0);
  const isFirstSlide = current === 0;
  
  const next = useCallback(() => setCurrent(c => (c + 1) % galleryImages.length), []);
  const prev = useCallback(() => setCurrent(c => (c - 1 + galleryImages.length) % galleryImages.length), []);
  
  useEffect(() => {
    // 第一张图停留8秒，其他图停留4秒
    const interval = isFirstSlide ? 8000 : 4000;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [next, isFirstSlide]);
  
  return (
    <div className="relative w-full aspect-[4/3] md:aspect-[16/9] overflow-hidden rounded-2xl bg-black">
      <AnimatePresence mode="wait">
        <motion.img
          key={current}
          src={galleryImages[current].src}
          alt={galleryImages[current].alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </AnimatePresence>
      
      {/* 左右箭头 */}
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
      
      {/* 指示器 */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {galleryImages.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all ${i === current ? 'bg-brand-400 w-6' : 'bg-white/30 w-1.5 hover:bg-white/50'}`}
          />
        ))}
      </div>
    </div>
  );
};

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="w-full"
  >
    {children}
  </motion.div>
);

const TechButton = ({ children, onClick, primary, size = 'md' }: { children: React.ReactNode, onClick?: () => void, primary?: boolean, size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };
  return ( 
    <button 
      onClick={onClick}
      className={`relative ${sizeClasses[size]} font-medium tracking-wide transition-all duration-300 group overflow-hidden rounded-lg ${
        primary ? 'bg-brand-500 text-white hover:bg-brand-400' : 'glass text-white/80 hover:text-white hover:bg-white/[0.06]'
      }`}
    >
      <div className="relative z-10 flex items-center gap-2">{children}</div>
    </button>
  );
};

const LogoNA = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 120 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 60V20L50 50V20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="text-brand-400"/>
    <path d="M70 60L85 20L100 60" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="text-brand-300"/>
    <path d="M78 45H92" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="text-brand-500"/>
  </svg>
);

const FeatureCard = ({ icon: Icon, title, description, index }: { icon: any, title: string, description: string, index: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.1, duration: 0.5 }}
    className="glass p-8 rounded-2xl relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-300"
  >
    <div className="absolute top-0 right-0 p-4 font-mono text-brand-500/20 text-4xl font-bold">{String(index + 1).padStart(2, '0')}</div>
    <div className="w-14 h-14 rounded-xl bg-brand-500/10 flex items-center justify-center mb-6 group-hover:bg-brand-500/20 transition-colors">
      <Icon className="text-brand-400 w-7 h-7" />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
    <p className="text-white/60 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

const ProblemCard = ({ title, description, oldWay, newWay }: { title: string, description: string, oldWay: string, newWay: string }) => (
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

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customer_name: '',
    contact: '',
    plan: 'Professional',
    description: '',
  });
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderStatus(null);
    try {
      const res = await fetch('http://localhost:4000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '提交失败，请稍后重试');
      }
      const data = await res.json();
      setOrderStatus(`提交成功，订单编号：${data.id}`);
      setOrderForm({ customer_name: '', contact: '', plan: 'Professional', description: '' });
    } catch (err: any) {
      setOrderStatus(err.message || '提交失败，请检查网络');
    }
  };

  const features = [
    {
      icon: MessageSquare,
      title: 'AI智能对话',
      description: '像聊天一样简单。直接告诉AI你的需求："帮我分析营收"、"帮我排班"、"怎么做活动"，AI秒懂并给出可执行方案。7×24小时随时响应。'
    },
    {
      icon: TrendingUp,
      title: '多平台数据自动爬取',
      description: '美团、饿了么、大众点评数据自动汇总。一个界面看清营收、订单、评价等核心指标，数据可视化一目了然。'
    },
    {
      icon: ClipboardList,
      title: '每日经营复盘',
      description: 'AI每天生成10个经营问题，引导完成每日复盘。涵盖营收、成本、客流、评价等，数据自动累计到系统，月度统计更轻松。'
    },
    {
      icon: Palette,
      title: 'AI营销助手',
      description: '不会设计没关系。说"帮我做个促销海报"，AI几秒钟生成。想要短视频？告诉AI主题，自动帮你剪辑。降低营销门槛，提升曝光。'
    },
    {
      icon: Calendar,
      title: '智能排班',
      description: '根据客流和营收，AI智能推荐最优排班方案。一键通知员工，省时省心。'
    },
    {
      icon: Wallet,
      title: '财务记账 + 报税',
      description: '日常收支随手记，营收成本自动同步。月度报表自动生成，报税数据自动整理。每年省下3000-5000元会计费！'
    },
    {
      icon: Calculator,
      title: '工资表自动生成',
      description: '考勤自动统计，加班请假提成自动计算。一键生成工资表，支持导出Excel。几分钟搞定工资核算。'
    },
    {
      icon: PieChart,
      title: '经营数据分析',
      description: '自动汇总每日数据，智能计算KPI指标（营收、成本、利润、评分等）。支持月度深度报告生成。'
    }
  ];

  const problems = [
    { title: '数据分散', description: '多个平台来回切换', oldWay: '手动统计一下午', newWay: 'AI 3秒汇总' },
    { title: '营销做图', description: '请设计师太贵', oldWay: '等设计师出图', newWay: 'AI现场生成' },
    { title: '员工排班', description: '算来算去算不清', oldWay: '凭经验猜测', newWay: '用数据说话' },
    { title: '记账报税', description: '每个月对账对到头痛', oldWay: '请会计每年3000+', newWay: 'AI自动整理' },
    { title: '工资核算', description: '做表要做到半夜', oldWay: '手动计算加班', newWay: '系统自动生成' },
    { title: '经营分析', description: '数据太多整理不过来', oldWay: '凭感觉判断', newWay: 'AI给出建议' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <PageWrapper>
            {/* Hero Section */}
            <section className="pt-40 pb-24 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm mb-8">
                    <Star className="w-4 h-4" />
                    <span>让开店变得更简单</span>
                  </div>
                  {/* 产品演示视频 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-10"
                  >
                    <video 
                      src="/demo.mp4" 
                      controls 
                      autoPlay 
                      muted 
                      loop
                      playsInline
                      className="w-full max-w-3xl mx-auto rounded-2xl shadow-2xl border border-white/10"
                      style={{ maxHeight: '400px' }}
                    />
                  </motion.div>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
                    星空AI
                    <span className="block text-brand-400">智能门店经营助手</span>
                  </h1>
                  <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
                    专为街边门店打造的AI经营助手。餐饮、零售、服务业——不管什么业态，都能帮你轻松管理店铺。
                  </p>
                  <div className="flex flex-wrap justify-center gap-4 mb-12">
                    <TechButton primary size="lg" onClick={() => setCurrentPage('pricing')}>
                      立即体验 <ArrowRight className="w-4 h-4 ml-2" />
                    </TechButton>
                    <TechButton size="lg" onClick={() => setCurrentPage('features')}>
                      了解功能
                    </TechButton>
                  </div>
                </div>

                {/* Dashboard Preview - 产品截图轮播 */}
                <motion.div 
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-brand-500/20 blur-[80px] rounded-3xl -z-10" />
                  <ImageCarousel />
                </motion.div>
              </div>
            </section>

            {/* Problems Section */}
            <section className="py-20 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">你是否遇到过这些烦恼？</h2>
                  <p className="text-white/50">星空AI帮你一键解决</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {problems.map((item, i) => (
                    <ProblemCard key={i} {...item} />
                  ))}
                </div>
              </div>
            </section>

            {/* Features Preview */}
            <section className="py-20 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">星空AI能做什么？</h2>
                  <p className="text-white/50">8大核心功能，帮你省心省力</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {features.slice(0, 8).map((f, i) => (
                    <FeatureCard key={i} {...f} index={i} />
                  ))}
                </div>
                <div className="text-center mt-10">
                  <TechButton onClick={() => setCurrentPage('features')}>
                    查看全部功能 <ChevronRight className="w-4 h-4 ml-1" />
                  </TechButton>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6">
              <div className="max-w-4xl mx-auto">
                <div className="glass rounded-3xl p-10 md:p-14 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-brand-500/5 -z-10" />
                  <Lightbulb className="w-12 h-12 text-brand-400 mx-auto mb-6" />
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">让AI成为你的经营顾问</h2>
                  <p className="text-white/60 mb-8 max-w-xl mx-auto">
                    告别繁琐管理，专注店铺经营。像请了一个24小时不休息的店长，帮你整理数据、分析问题、想营销主意。
                  </p>
                  <TechButton primary size="lg" onClick={() => setCurrentPage('pricing')}>
                    立即开始 <ArrowRight className="w-5 h-5 ml-2" />
                  </TechButton>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'features':
        return (
          <PageWrapper>
            <section className="pt-32 pb-20 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">核心功能</h1>
                  <p className="text-white/60 text-lg max-w-2xl mx-auto">
                    星空AI像一个24小时不休息的店长，帮你整理数据、分析问题、想营销主意、算工资。
                  </p>
                </div>

                <div className="space-y-16">
                  {features.map((f, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      className={`flex flex-col ${i % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center`}
                    >
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
                    {['餐饮店', '便利店', '超市', '药店', '母婴店', '美容', '美发', '洗车', '维修', '服装店'].map((item) => (
                      <span key={item} className="px-4 py-2 rounded-full bg-white/5 text-white/70 text-sm">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'pricing':
        return (
          <PageWrapper>
            <section className="pt-32 pb-20 px-6">
              <div className="max-w-5xl mx-auto">
                <div className="text-center mb-14">
                  <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">套餐与费用</h1>
                  <p className="text-white/60 text-lg">
                    一顿饭的钱，帮你省下运营、会计和数据分析的人力成本
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    {
                      name: '基础版',
                      price: '99',
                      period: '/月',
                      features: [
                        '经营复盘',
                        '日常管理',
                        '员工管理',
                      ],
                      desc: '适合小微门店'
                    },
                    {
                      name: '专业版',
                      price: '299',
                      period: '/月',
                      popular: true,
                      features: [
                        '经营复盘',
                        '日常管理',
                        '员工管理',
                        'AI生图（20个/月）',
                        'AI视频（15个/月）',
                        'AI剪辑（15个/月）',
                        '账号监控',
                        '财务报税',
                      ],
                      desc: '全能版，适合成长型门店'
                    },
                  ].map((plan) => (
                    <div key={plan.name} className={`glass rounded-2xl p-8 relative flex flex-col ${plan.popular ? 'border-brand-500/50 ring-2 ring-brand-500/20' : ''}`}>
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-xs font-medium">
                          最受欢迎
                        </div>
                      )}
                      <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                      <p className="text-white/40 text-sm mb-4">{plan.desc}</p>
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-white/40 text-sm">{plan.period}</span>
                      </div>
                      <ul className="space-y-3 mb-8 flex-grow">
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                            <CheckCircle2 className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <TechButton primary={plan.popular} onClick={() => {}}>
                        立即咨询
                      </TechButton>
                    </div>
                  ))}
                </div>

                {/* AI升级包 */}
                <div className="mt-12 glass rounded-2xl p-8 text-center">
                  <h3 className="text-xl font-semibold mb-4">AI增值包（专业版专享）</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">¥88</span>
                    <span className="text-white/50">/月</span>
                  </div>
                  <p className="text-white/60">AI生图10个 + AI视频10个 + AI剪辑10个</p>
                  <p className="text-white/40 text-sm mt-2">不足时可购买升级，有效期1个月</p>
                </div>

                <div className="mt-16 glass rounded-2xl p-8">
                  <h3 className="text-xl font-semibold mb-6 text-center">定制需求表单</h3>
                  <form onSubmit={handleOrderSubmit} className="max-w-xl mx-auto space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-white/50 mb-1">姓名/公司名</label>
                        <input
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                          value={orderForm.customer_name}
                          onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">联系方式</label>
                        <input
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                          value={orderForm.contact}
                          onChange={(e) => setOrderForm({ ...orderForm, contact: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">意向套餐</label>
                      <select
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
                        value={orderForm.plan}
                        onChange={(e) => setOrderForm({ ...orderForm, plan: e.target.value })}
                      >
                        <option value="Starter">基础版</option>
                        <option value="Professional">成长版</option>
                        <option value="Enterprise">定制版</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">门店类型和需求描述</label>
                      <textarea
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors min-h-[100px]"
                        value={orderForm.description}
                        onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                        placeholder="告诉我们你的门店类型和需求..."
                      />
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <TechButton primary type="submit">
                        提交需求 <Rocket className="w-4 h-4 ml-2" />
                      </TechButton>
                      {orderStatus && (
                        <span className="text-sm text-brand-400">{orderStatus}</span>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'download':
        return (
          <PageWrapper>
            <section className="pt-32 pb-24 px-6">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                  下载星空AI
                </h1>
                <p className="text-lg text-white/60 mb-12">
                  专为门店打造的智能经营助手，让管理更简单
                </p>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                  <div className="glass rounded-2xl p-8">
                    <Monitor className="w-16 h-16 mx-auto mb-4 text-brand-400" />
                    <h3 className="text-xl font-semibold mb-2">Windows 版本</h3>
                    <p className="text-white/50 text-sm mb-6">适用于 Windows 10/11 系统</p>
                    <TechButton primary onClick={() => {}}>
                      <Download className="w-4 h-4 mr-2" />
                      下载安装版
                    </TechButton>
                  </div>
                  <div className="glass rounded-2xl p-8">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-brand-400" />
                    <h3 className="text-xl font-semibold mb-2">Windows 便携版</h3>
                    <p className="text-white/50 text-sm mb-6">无需安装，插上U盘随时使用</p>
                    <TechButton onClick={() => {}}>
                      <Download className="w-4 h-4 mr-2" />
                      下载便携版
                    </TechButton>
                  </div>
                </div>

                <div className="glass rounded-2xl p-6 max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                    <ShieldCheck className="w-4 h-4" />
                    <span>安全无病毒，请放心使用</span>
                  </div>
                  <p className="text-xs text-white/30">
                    版本：1.0.0 | 大小：约 240MB
                  </p>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'login':
        return (
          <PageWrapper>
            <section className="pt-32 pb-24 px-6">
              <div className="max-w-md mx-auto">
                <div className="glass rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-center mb-8">登录</h2>
                  <p className="text-white/50 text-center mb-6">使用手机号登录</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">手机号</label>
                      <input
                        type="tel"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                        placeholder="请输入手机号"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">验证码</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                          placeholder="请输入验证码"
                        />
                        <button className="px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/20 transition-colors">
                          获取验证码
                        </button>
                      </div>
                    </div>
                    <TechButton primary className="w-full justify-center">
                      登录
                    </TechButton>
                    <p className="text-center text-sm text-white/50">
                      还没有账号？ 
                      <button onClick={() => setCurrentPage('register')} className="text-brand-400 hover:underline">
                        立即注册
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'register':
        return (
          <PageWrapper>
            <section className="pt-32 pb-24 px-6">
              <div className="max-w-md mx-auto">
                <div className="glass rounded-2xl p-8">
                  <h2 className="text-2xl font-bold text-center mb-8">注册</h2>
                  <p className="text-white/50 text-center mb-6">手机号注册</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-white/50 mb-1">手机号</label>
                      <input
                        type="tel"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                        placeholder="请输入手机号"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1">验证码</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                          placeholder="请输入验证码"
                        />
                        <button className="px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/20 transition-colors">
                          获取验证码
                        </button>
                      </div>
                    </div>
                    <TechButton primary className="w-full justify-center">
                      注册
                    </TechButton>
                    <p className="text-center text-sm text-white/50">
                      已有账号？ 
                      <button onClick={() => setCurrentPage('login')} className="text-brand-400 hover:underline">
                        立即登录
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'profile':
        return (
          <PageWrapper>
            <section className="pt-32 pb-24 px-6">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">个人中心</h1>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-1">
                    <div className="glass rounded-2xl p-6">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
                          <Users className="w-10 h-10 text-brand-400" />
                        </div>
                        <h3 className="font-semibold mb-1">用户</h3>
                        <p className="text-white/50 text-sm">138****8888</p>
                      </div>
                      <div className="mt-6 space-y-2">
                        <button className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm">
                          我的订单
                        </button>
                        <button className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm">
                          激活码
                        </button>
                        <button className="w-full text-left px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm">
                          账户设置
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="glass rounded-2xl p-6 mb-6">
                      <h3 className="font-semibold mb-4">我的订单</h3>
                      <p className="text-white/50 text-sm">暂无订单</p>
                    </div>
                    <div className="glass rounded-2xl p-6">
                      <h3 className="font-semibold mb-4">我的激活码</h3>
                      <p className="text-white/50 text-sm">暂无激活码</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'activate':
        return (
          <PageWrapper>
            <section className="pt-32 pb-24 px-6">
              <div className="max-w-2xl mx-auto">
                <div className="glass rounded-2xl p-8">
                  <div className="text-center mb-8">
                    <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-brand-400" />
                    <h2 className="text-2xl font-bold mb-2">激活您的账户</h2>
                    <p className="text-white/50">请完成以下步骤来激活您的星空AI账户</p>
                  </div>

                  {/* 步骤1：登录 */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">1</span>
                      <span className="font-medium">登录账户</span>
                    </div>
                    <div className="pl-8 space-y-4">
                      <div>
                        <label className="block text-xs text-white/50 mb-1">手机号</label>
                        <input
                          type="tel"
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                          placeholder="请输入手机号"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">验证码</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                            placeholder="请输入验证码"
                          />
                          <button className="px-4 py-2 rounded-lg bg-white/10 text-sm hover:bg-white/20 transition-colors">
                            获取验证码
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 步骤2：设置密码 */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">2</span>
                      <span className="font-medium">设置密码</span>
                    </div>
                    <div className="pl-8 space-y-4">
                      <div>
                        <label className="block text-xs text-white/50 mb-1">设置登录密码</label>
                        <input
                          type="password"
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                          placeholder="请设置密码"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">确认密码</label>
                        <input
                          type="password"
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
                          placeholder="请确认密码"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 步骤3：输入激活码 */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">3</span>
                      <span className="font-medium">输入激活码</span>
                    </div>
                    <div className="pl-8">
                      <input
                        type="text"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-brand-500 text-center text-lg font-mono"
                        placeholder="请输入激活码，如：S001-VIP3-12M-XXXX"
                      />
                      <p className="text-xs text-white/30 mt-2">激活码由销售提供</p>
                    </div>
                  </div>

                  {/* 步骤4：上传营业执照 */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">4</span>
                      <span className="font-medium">上传营业执照（可选）</span>
                    </div>
                    <div className="pl-8">
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-brand-500/50 transition-colors cursor-pointer">
                        <UploadCloud className="w-10 h-10 mx-auto mb-2 text-white/30" />
                        <p className="text-sm text-white/50">点击或拖拽文件到此处上传</p>
                        <p className="text-xs text-white/30 mt-1">支持 JPG、PNG 格式</p>
                      </div>
                    </div>
                  </div>

                  <TechButton primary className="w-full justify-center">
                    立即激活
                  </TechButton>
                </div>
              </div>
            </section>
          </PageWrapper>
        );

      case 'admin':
        return (
          <PageWrapper>
            <section className="pt-24 pb-24 px-6">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-3xl font-bold">管理后台</h1>
                  <button 
                    onClick={() => setCurrentPage('home')}
                    className="text-sm text-white/50 hover:text-white"
                  >
                    返回首页
                  </button>
                </div>

                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  {[
                    { icon: FileText, label: '内容管理', desc: '修改首页文字图片' },
                    { icon: CreditCard, label: '套餐管理', desc: '添加/修改套餐' },
                    { icon: Key, label: '激活码', desc: '生成/查看激活码' },
                    { icon: Receipt, label: '订单管理', desc: '查看处理订单' },
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-2xl p-6 hover:border-brand-500/30 border border-transparent transition-colors cursor-pointer">
                      <item.icon className="w-10 h-10 text-brand-400 mb-4" />
                      <h3 className="font-semibold mb-1">{item.label}</h3>
                      <p className="text-white/50 text-sm">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { icon: Users, label: '用户管理', desc: '查看激活用户' },
                    { icon: Store, label: '销售管理', desc: '添加销售查看业绩' },
                    { icon: BarChart3, label: '数据统计', desc: '销售业绩统计' },
                  ].map((item, i) => (
                    <div key={i} className="glass rounded-2xl p-6 hover:border-brand-500/30 border border-transparent transition-colors cursor-pointer">
                      <item.icon className="w-10 h-10 text-brand-400 mb-4" />
                      <h3 className="font-semibold mb-1">{item.label}</h3>
                      <p className="text-white/50 text-sm">{item.desc}</p>
                    </div>
                  ))}
                </div>

                {/* 模拟激活码管理界面 */}
                <div className="mt-12">
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-lg">激活码管理</h3>
                      <TechButton primary size="sm">
                        <Sparkles className="w-4 h-4 mr-1" />
                        生成激活码
                      </TechButton>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 text-white/50 font-medium">激活码</th>
                            <th className="text-left py-3 px-4 text-white/50 font-medium">销售</th>
                            <th className="text-left py-3 px-4 text-white/50 font-medium">套餐</th>
                            <th className="text-left py-3 px-4 text-white/50 font-medium">时长</th>
                            <th className="text-left py-3 px-4 text-white/50 font-medium">状态</th>
                            <th className="text-left py-3 px-4 text-white/50 font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-white/5">
                            <td className="py-3 px-4 font-mono text-sm">S001-VIP3-12M-7K9M</td>
                            <td className="py-3 px-4">张三</td>
                            <td className="py-3 px-4">年卡</td>
                            <td className="py-3 px-4">12个月</td>
                            <td className="py-3 px-4"><span className="text-green-400">已使用</span></td>
                            <td className="py-3 px-4">
                              <button className="text-brand-400 hover:underline">查看</button>
                            </td>
                          </tr>
                          <tr className="border-b border-white/5">
                            <td className="py-3 px-4 font-mono text-sm">S001-VIP1-1M-ABCD</td>
                            <td className="py-3 px-4">张三</td>
                            <td className="py-3 px-4">月卡</td>
                            <td className="py-3 px-4">1个月</td>
                            <td className="py-3 px-4"><span className="text-yellow-400">未使用</span></td>
                            <td className="py-3 px-4">
                              <button className="text-brand-400 hover:underline">禁用</button>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-mono text-sm">S002-VIP2-3M-EFGH</td>
                            <td className="py-3 px-4">李四</td>
                            <td className="py-3 px-4">季卡</td>
                            <td className="py-3 px-4">3个月</td>
                            <td className="py-3 px-4"><span className="text-yellow-400">未使用</span></td>
                            <td className="py-3 px-4">
                              <button className="text-brand-400 hover:underline">禁用</button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </PageWrapper>
        );
    }
  };

  return (
    <div className="min-h-screen font-sans bg-brand-950 grid-bg">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-950 via-transparent to-brand-950 opacity-80" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-brand-400/5 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-3 glass border-b border-white/5' : 'py-5 bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <LogoNA className="w-9 h-9" />
            <div>
              <span className="text-lg font-semibold block leading-none">星空AI</span>
              <span className="text-[9px] text-brand-400 tracking-wider">智能门店经营助手</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              { id: 'home', label: '首页' },
              { id: 'features', label: '功能' },
              { id: 'pricing', label: '价格' },
              { id: 'download', label: '下载' }
            ].map((item) => (
              <button 
                key={item.id} 
                onClick={() => setCurrentPage(item.id as Page)}
                className={`text-sm transition-colors ${
                  currentPage === item.id ? 'text-brand-400' : 'text-white/50 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage('login')}
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              登录
            </button>
            <TechButton primary size="sm" onClick={() => setCurrentPage('pricing')}>
              立即咨询
            </TechButton>
          </div>
        </div>
      </nav>

      <main className="relative">
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
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
      </footer>
    </div>
  );
}
