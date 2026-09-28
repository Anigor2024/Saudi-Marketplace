'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  Store,
  Package,
  ShoppingBag,
  RotateCcw,
  Users,
  Tag,
  MessageSquare,
  Star,
  Landmark,
  BarChart3,
  LayoutTemplate,
  History,
  Settings,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Crown,
  Lock,
  Sparkles,
  TrendingUp,
  Eye,
  Filter,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import AdminSellersAndProducts from '@/components/admin/AdminSellersAndProducts';
import AdminOrdersReturnsCustomers from '@/components/admin/AdminOrdersReturnsCustomers';
import AdminPromotionsSupportModeration from '@/components/admin/AdminPromotionsSupportModeration';

export type AdminSectionId =
  | 'overview'
  | 'queue'
  | 'sellers'
  | 'products'
  | 'orders'
  | 'returns'
  | 'customers'
  | 'coupons'
  | 'tickets'
  | 'moderation'
  | 'finance-preview'
  | 'analytics-preview'
  | 'cms-preview'
  | 'audit-preview'
  | 'settings-preview';

export function AdminConsole() {
  const {
    lang,
    t,
    formatPrice,
    currentUser,
    isDemoMode,
    canAccessAdminDashboard,
    exitDemoMode,
    navigateTo,
    users,
    sellers,
    products,
    orders,
    coupons,
    reviews,
    questions,
    tickets,
    auditLogs,
    updateSellerStatus,
    moderateProduct,
  } = useMarketplace();

  const [activeSection, setActiveSection] = useState<AdminSectionId>('overview');
  const [queueFilter, setQueueFilter] = useState<
    'all' | 'sellers' | 'products' | 'returns' | 'tickets' | 'moderation' | 'inventory'
  >('all');

  // Executive KPI & Queue Aggregations
  const metrics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const gmv = validOrders.reduce((sum, o) => sum + o.total, 0);

    // Calculate net platform commission deterministically from seller commission rates
    let estimatedCommission = 0;
    validOrders.forEach((order) => {
      order.items.forEach((item) => {
        const seller = sellers.find((s) => s.id === item.sellerId);
        const rate = seller?.commissionRate ?? 12;
        estimatedCommission += item.unitPrice * item.quantity * (rate / 100);
      });
    });

    const activeSellers = sellers.filter((s) => s.status === 'approved');
    const pendingSellers = sellers.filter((s) => s.status === 'pending');
    const suspendedSellers = sellers.filter((s) => s.status === 'suspended');

    const activeProducts = products.filter((p) => p.status === 'active');
    const pendingProducts = products.filter((p) => p.status === 'suspended');
    const lowOrOutStockProducts = products.filter(
      (p) => p.stock <= (p.lowStockThreshold ?? 5) || p.status === 'out_of_stock'
    );

    const openReturns = orders.filter(
      (o) => o.returnRequest?.status === 'pending' || o.status === 'return_requested'
    );
    const totalReturnOrdersCount = orders.filter(
      (o) =>
        o.status === 'return_requested' ||
        o.status === 'returned' ||
        Boolean(o.returnRequest)
    ).length;

    const averageOrderValue =
      validOrders.length > 0 ? Math.round(gmv / validOrders.length) : 0;
    const returnRate =
      orders.length > 0
        ? Number(((totalReturnOrdersCount / orders.length) * 100).toFixed(1))
        : 0;

    const openTickets = tickets.filter(
      (tk) => tk.status === 'open' || tk.status === 'in_progress'
    );

    const pendingReviews = reviews.filter((r) => r.status === 'pending');
    const unansweredQuestions = questions.filter((q) => !q.answerAr && !q.answerEn);

    const totalAttentionCount =
      pendingSellers.length +
      pendingProducts.length +
      openReturns.length +
      openTickets.length +
      pendingReviews.length +
      unansweredQuestions.length;

    return {
      gmv,
      estimatedCommission,
      averageOrderValue,
      returnRate,
      totalReturnOrdersCount,
      totalOrders: orders.length,
      validOrdersCount: validOrders.length,
      activeSellersCount: activeSellers.length,
      pendingSellers,
      suspendedSellersCount: suspendedSellers.length,
      activeProductsCount: activeProducts.length,
      pendingProducts,
      lowOrOutStockProducts,
      openReturns,
      openTickets,
      pendingReviews,
      unansweredQuestions,
      totalAttentionCount,
    };
  }, [orders, sellers, products, tickets, reviews, questions]);

  // Unified Operations Queue Items
  const queueItems = useMemo(() => {
    const items: {
      id: string;
      category: 'sellers' | 'products' | 'returns' | 'tickets' | 'moderation' | 'inventory';
      urgency: 'critical' | 'high' | 'medium';
      titleAr: string;
      titleEn: string;
      subtitleAr: string;
      subtitleEn: string;
      meta: string;
      timestamp: string;
      targetSection: AdminSectionId;
      entityId: string;
    }[] = [];

    metrics.pendingSellers.forEach((s) => {
      items.push({
        id: `q-seller-${s.id}`,
        category: 'sellers',
        urgency: 'high',
        titleAr: `طلب اعتماد متجر: ${s.nameAr}`,
        titleEn: `Merchant Application: ${s.nameEn}`,
        subtitleAr: `${s.cityAr} · السجل التجاري: ${s.crNumber || 'قيد التدقيق'}`,
        subtitleEn: `${s.cityEn} · CR: ${s.crNumber || 'Pending check'}`,
        meta: `${s.commissionRate ?? 12}% Commission`,
        timestamp: s.joinedAt || '2025-02-20',
        targetSection: 'sellers',
        entityId: s.id,
      });
    });

    metrics.pendingProducts.forEach((p) => {
      items.push({
        id: `q-prod-${p.id}`,
        category: 'products',
        urgency: p.status === 'suspended' ? 'critical' : 'high',
        titleAr:
          p.status === 'suspended'
            ? `منتج موقوف للمراجعة: ${p.titleAr}`
            : `منتج بانتظار الاعتماد: ${p.titleAr}`,
        titleEn:
          p.status === 'suspended'
            ? `Suspended Product: ${p.titleEn}`
            : `Pending Product Approval: ${p.titleEn}`,
        subtitleAr: `${p.sellerNameAr} · ${formatPrice(p.price)}`,
        subtitleEn: `${p.sellerNameEn} · ${formatPrice(p.price)}`,
        meta: `SKU: ${p.sku}`,
        timestamp: p.createdAt || '2025-02-25',
        targetSection: 'products',
        entityId: p.id,
      });
    });

    metrics.openReturns.forEach((o) => {
      items.push({
        id: `q-ret-${o.id}`,
        category: 'returns',
        urgency: 'critical',
        titleAr: `مطالبة إرجاع واسترداد للطلب ${o.orderNumber}`,
        titleEn: `Return & Refund Claim for ${o.orderNumber}`,
        subtitleAr: `${o.customerName} · السبب: ${o.returnRequest?.reasonAr || 'طلب إرجاع'}`,
        subtitleEn: `${o.customerName} · Reason: ${o.returnRequest?.reasonEn || 'Return claim'}`,
        meta: formatPrice(o.total),
        timestamp: o.returnRequest?.requestedAt?.slice(0, 10) || o.createdAt.slice(0, 10),
        targetSection: 'returns',
        entityId: o.id,
      });
    });

    metrics.openTickets.forEach((tk) => {
      items.push({
        id: `q-tkt-${tk.id}`,
        category: 'tickets',
        urgency: tk.categoryEn.toLowerCase().includes('payout') ? 'critical' : 'high',
        titleAr: `تذكرة دعم (${tk.ticketNumber}): ${tk.subject}`,
        titleEn: `Support Ticket (${tk.ticketNumber}): ${tk.subject}`,
        subtitleAr: `${tk.userName} · ${tk.categoryAr}`,
        subtitleEn: `${tk.userName} · ${tk.categoryEn}`,
        meta: tk.status === 'open' ? 'OPEN' : 'IN PROGRESS',
        timestamp: tk.createdAt.slice(0, 10),
        targetSection: 'tickets',
        entityId: tk.id,
      });
    });

    metrics.pendingReviews.forEach((r) => {
      items.push({
        id: `q-rev-${r.id}`,
        category: 'moderation',
        urgency: 'medium',
        titleAr: `مراجعة عميل بانتظار التدقيق: ${r.title}`,
        titleEn: `Pending Customer Review: ${r.title}`,
        subtitleAr: `${r.userName} · التقييم: ${r.rating}/5`,
        subtitleEn: `${r.userName} · Rating: ${r.rating}/5`,
        meta: r.verifiedPurchase ? 'Verified' : 'Unverified',
        timestamp: r.createdAt.slice(0, 10),
        targetSection: 'moderation',
        entityId: r.id,
      });
    });

    metrics.unansweredQuestions.forEach((q) => {
      items.push({
        id: `q-qa-${q.id}`,
        category: 'moderation',
        urgency: 'medium',
        titleAr: `استفسار منتج غير مجاب: ${q.questionAr}`,
        titleEn: `Unanswered Product Q&A: ${q.questionEn}`,
        subtitleAr: `السائل: ${q.userName}`,
        subtitleEn: `Asked by: ${q.userName}`,
        meta: 'Unanswered',
        timestamp: q.createdAt.slice(0, 10),
        targetSection: 'moderation',
        entityId: q.id,
      });
    });

    metrics.lowOrOutStockProducts.slice(0, 8).forEach((p) => {
      items.push({
        id: `q-inv-${p.id}`,
        category: 'inventory',
        urgency: p.stock <= 0 ? 'critical' : 'medium',
        titleAr:
          p.stock <= 0
            ? `نفاد مخزون منتج نشط: ${p.titleAr}`
            : `تنبيه انخفاض مخزون: ${p.titleAr}`,
        titleEn:
          p.stock <= 0
            ? `Out of Stock Catalog Alert: ${p.titleEn}`
            : `Low Stock Catalog Alert: ${p.titleEn}`,
        subtitleAr: `${p.sellerNameAr} · المتبقي: ${p.stock} وحدة`,
        subtitleEn: `${p.sellerNameEn} · Remaining: ${p.stock} units`,
        meta: `SKU: ${p.sku}`,
        timestamp: p.createdAt || '2025-02-20',
        targetSection: 'products',
        entityId: p.id,
      });
    });

    return items.filter((item) => queueFilter === 'all' || item.category === queueFilter);
  }, [metrics, queueFilter, formatPrice]);

  if (!canAccessAdminDashboard) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-[#9E2A2B]/30 p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#9E2A2B]">
            <Lock className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {t(
                'غير مصرح بالدخول إلى لوحة الإدارة التنفيذية',
                'Unauthorized: Executive Admin Console Requires Admin Privileges'
              )}
            </h2>
          </div>
          <p className="text-xs text-[#57534E]">
            {t(
              'هذه البوابة مخصصة لمسؤولي الحوكمة والعمليات المعتمدين في منصة أثيل فقط.',
              'This control center is strictly restricted to verified Atheel Platform Administrators.'
            )}
          </p>
        </div>
      </div>
    );
  }

  const coreNavItems: {
    id: AdminSectionId;
    labelAr: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: 'amber' | 'red' | 'emerald';
  }[] = [
    {
      id: 'overview',
      labelAr: 'النظرة التنفيذية الشاملة',
      labelEn: 'Executive Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'queue',
      labelAr: 'طابور العمليات الموحد',
      labelEn: 'Operations Queue',
      icon: ClipboardList,
      badge: metrics.totalAttentionCount,
      badgeTone: metrics.totalAttentionCount > 0 ? 'red' : 'emerald',
    },
    {
      id: 'sellers',
      labelAr: 'إدارة التجار والاعتماد',
      labelEn: 'Sellers & Onboarding',
      icon: Store,
      badge: metrics.pendingSellers.length || undefined,
      badgeTone: 'amber',
    },
    {
      id: 'products',
      labelAr: 'الكتالوج ومراجعة المنتجات',
      labelEn: 'Products & Moderation',
      icon: Package,
      badge: metrics.pendingProducts.length || undefined,
      badgeTone: 'amber',
    },
    {
      id: 'orders',
      labelAr: 'الرقابة على الطلبات والشحن',
      labelEn: 'Orders Supervision',
      icon: ShoppingBag,
    },
    {
      id: 'returns',
      labelAr: 'المرتجعات والمنازعات المالية',
      labelEn: 'Returns & Refunds',
      icon: RotateCcw,
      badge: metrics.openReturns.length || undefined,
      badgeTone: 'red',
    },
    {
      id: 'customers',
      labelAr: 'حوكمة العملاء والمحافظ',
      labelEn: 'Customers & Wallets',
      icon: Users,
    },
    {
      id: 'coupons',
      labelAr: 'الكوبونات والحملات الترويجية',
      labelEn: 'Coupons & Promotions',
      icon: Tag,
    },
    {
      id: 'tickets',
      labelAr: 'تذاكر الدعم والتسويات',
      labelEn: 'Support Tickets',
      icon: MessageSquare,
      badge: metrics.openTickets.length || undefined,
      badgeTone: 'amber',
    },
    {
      id: 'moderation',
      labelAr: 'التقييمات واستفسارات السلع',
      labelEn: 'Reviews & Questions',
      icon: Star,
      badge:
        metrics.pendingReviews.length + metrics.unansweredQuestions.length || undefined,
      badgeTone: 'amber',
    },
  ];

  const round3BPlaceholders: {
    id: AdminSectionId;
    labelAr: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'audit-preview',
      labelAr: 'سجل التدقيق الرقابي',
      labelEn: 'Audit Logs',
      icon: History,
    },
    {
      id: 'finance-preview',
      labelAr: 'الخزينة والتسويات المالية',
      labelEn: 'Finance & Treasury',
      icon: Landmark,
    },
    {
      id: 'analytics-preview',
      labelAr: 'تحليلات المنصة المتقدمة',
      labelEn: 'Marketplace Analytics',
      icon: BarChart3,
    },
    {
      id: 'cms-preview',
      labelAr: 'إدارة الواجهة التسويقية (CMS)',
      labelEn: 'Homepage CMS',
      icon: LayoutTemplate,
    },
    {
      id: 'settings-preview',
      labelAr: 'إعدادات المنصة والسياسات',
      labelEn: 'Platform Settings',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#141413]">
      {/* Top Executive Governance Bar */}
      <div className="bg-[#141413] text-[#FAF8F5] border-b border-[#C59B27]/30">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0B4F3F] border border-[#C59B27]/50 flex items-center justify-center shadow-inner">
              <Crown className="w-5 h-5 text-[#C59B27]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#C59B27] font-bold">
                  {t('مركز القيادة والحوكمة التنفيذية', 'ATHEEL EXECUTIVE CONTROL CENTER')}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0B4F3F] text-[#F5E6C8] text-[10px] font-mono font-bold">
                  OPS v3.1
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                {t(
                  'لوحة الإدارة المركزية وعمليات السوق السعودي',
                  'Central Marketplace Operations & Governance Console'
                )}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isDemoMode ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#C59B27]/15 border border-[#C59B27]/40 text-xs">
                <span className="w-2 h-2 rounded-full bg-[#C59B27] animate-pulse" />
                <span className="font-bold text-[#F5E6C8]">
                  {t(
                    'بيئة الإدارة التجريبية — محاكاة محلية فقط',
                    'Demo Admin Environment — Local Simulation Only'
                  )}
                </span>
                <button
                  type="button"
                  onClick={exitDemoMode}
                  className="px-2.5 py-1 rounded-lg bg-[#C59B27] text-[#141413] text-[11px] font-bold hover:bg-[#d6ac32] transition-colors"
                >
                  {t('إنهاء الوضع التجريبي', 'Exit Demo')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B4F3F]/50 border border-emerald-500/30 text-xs text-emerald-200 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
                <span>
                  {t('جلسة مسؤول إنتاج موثقة:', 'Verified Production Admin:')}{' '}
                  {currentUser?.name}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-colors"
            >
              {t('معاينة المتجر العام', 'View Live Storefront')}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
        {/* Mobile / Tablet Horizontal Navigation Strip */}
        <div className="lg:hidden mb-6 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 min-w-max">
            {coreNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#0B4F3F] text-white shadow-sm'
                      : 'bg-white text-[#57534E] border border-[#E6E0D6]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-[#C59B27] text-[#141413]'
                          : 'bg-red-100 text-[#9E2A2B]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Left/Right RTL Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 sticky top-24">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-3.5 shadow-xs space-y-1">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#8C857B]">
                {t('العمليات التشغيلية الأساسية', 'Core Marketplace Operations')}
              </div>
              {coreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#0B4F3F] text-white shadow-xs'
                        : 'text-[#141413] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#C59B27]' : 'text-[#0B4F3F]'
                        }`}
                      />
                      <span className="truncate">
                        {lang === 'ar' ? item.labelAr : item.labelEn}
                      </span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0 ${
                          isActive
                            ? 'bg-[#C59B27] text-[#141413]'
                            : item.badgeTone === 'red'
                            ? 'bg-red-50 text-[#9E2A2B] border border-red-200'
                            : 'bg-amber-50 text-[#B45309] border border-amber-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Governance & Future Round 3B Modules */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-3.5 shadow-xs space-y-1">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C857B]">
                  {t('الحوكمة والخزينة والواجهة', 'Governance & Platform (3B)')}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] text-[10px] font-mono text-[#8C857B]">
                  3B
                </span>
              </div>
              {round3BPlaceholders.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#141413] text-[#F5E6C8]'
                        : 'text-[#57534E] hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0 text-[#8C857B]" />
                      <span className="truncate">
                        {lang === 'ar' ? item.labelAr : item.labelEn}
                      </span>
                    </div>
                    {item.id === 'audit-preview' ? (
                      <span className="px-1.5 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-mono font-bold">
                        {auditLogs.length}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-[#8C857B]">3B</span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Operational Workspace */}
          <div className="lg:col-span-9 space-y-6">
            {/* ==================================================
                SECTION 1: EXECUTIVE OVERVIEW
            ================================================== */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Executive KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8C857B]">
                        {t('إجمالي قيمة البضائع (GMV)', 'Platform GMV (Excl. Cancelled)')}
                      </span>
                      <TrendingUp className="w-4 h-4 text-[#0B4F3F]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#141413] mt-2">
                      {formatPrice(metrics.gmv)}
                    </div>
                    <div className="text-[11px] text-[#57534E] mt-1">
                      {t('صافي عمولة المنصة المقدرة:', 'Est. Net Commission:')}{' '}
                      <span className="font-mono font-bold text-[#0B4F3F]">
                        {formatPrice(Math.round(metrics.estimatedCommission))}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8C857B]">
                        {t('متوسط قيمة الطلب (AOV)', 'Average Order Value (AOV)')}
                      </span>
                      <Landmark className="w-4 h-4 text-[#C59B27]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#141413] mt-2">
                      {formatPrice(metrics.averageOrderValue)}
                    </div>
                    <div className="text-[11px] text-[#57534E] mt-1">
                      {t('محسوب من الطلبات المؤكدة:', 'Across valid orders:')}{' '}
                      <span className="font-mono font-bold text-[#0B4F3F]">
                        {metrics.validOrdersCount}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8C857B]">
                        {t('معدل المرتجعات (Return Rate)', 'Platform Return Rate')}
                      </span>
                      <RotateCcw className="w-4 h-4 text-[#9E2A2B]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#141413] mt-2">
                      {metrics.returnRate}%
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-[#57534E]">
                        {t('إجمالي طلبات الإرجاع:', 'Total return claims:')}
                      </span>
                      <span className="font-mono font-bold text-[#9E2A2B]">
                        {metrics.totalReturnOrdersCount} / {metrics.totalOrders}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8C857B]">
                        {t('الطلبات والمرتجعات المفتوحة', 'Orders & Open Returns')}
                      </span>
                      <ShoppingBag className="w-4 h-4 text-[#0B4F3F]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#141413] mt-2">
                      {metrics.totalOrders}
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-[#57534E]">
                        {t('مطالبات إرجاع معلقة:', 'Pending Return Claims:')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSection('returns')}
                        className="font-mono font-bold text-[#9E2A2B] hover:underline"
                      >
                        {metrics.openReturns.length}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8C857B]">
                        {t('التجار المعتمدون وطلبات الانضمام', 'Verified & Pending Sellers')}
                      </span>
                      <Store className="w-4 h-4 text-[#C59B27]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#0B4F3F] mt-2">
                      {metrics.activeSellersCount}{' '}
                      <span className="text-xs font-normal text-[#8C857B]">
                        / {sellers.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-[#57534E]">
                        {t('بانتظار مراجعة الاعتماد:', 'Pending Onboarding:')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSection('sellers')}
                        className="font-mono font-bold text-[#B45309] hover:underline"
                      >
                        {metrics.pendingSellers.length}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#8C857B]">
                        {t('الكتالوج ومهام الرقابة', 'Catalog & Moderation Tasks')}
                      </span>
                      <Package className="w-4 h-4 text-[#0B4F3F]" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-[#141413] mt-2">
                      {metrics.activeProductsCount}{' '}
                      <span className="text-xs font-normal text-[#8C857B]">
                        / {products.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-[#57534E]">
                        {t('منتجات وتقييمات للمراجعة:', 'Pending Moderation:')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveSection('queue')}
                        className="font-mono font-bold text-[#B45309] hover:underline"
                      >
                        {metrics.pendingProducts.length +
                          metrics.pendingReviews.length +
                          metrics.unansweredQuestions.length}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Operational Attention Strip */}
                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[#141413]">
                          {t(
                            'تنبيهات الرقابة التشغيلية العاجلة',
                            'Immediate Operational Attention Required'
                          )}
                        </h2>
                        <p className="text-xs text-[#8C857B]">
                          {t(
                            'عناصر حقيقية في المنصة تتطلب قراراً إدارياً أو تسوية مباشرة',
                            'Live platform records requiring administrative adjudication or approval'
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('queue')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                    >
                      <span>{t('فتح طابور العمليات الموحد', 'Open Operations Queue')}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSection('sellers')}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E6E0D6] text-start transition-colors"
                    >
                      <div className="text-[11px] font-semibold text-[#8C857B]">
                        {t('طلبات تجار معلقة', 'Pending Sellers')}
                      </div>
                      <div className="text-xl font-bold font-mono text-[#B45309] mt-1">
                        {metrics.pendingSellers.length}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection('products')}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E6E0D6] text-start transition-colors"
                    >
                      <div className="text-[11px] font-semibold text-[#8C857B]">
                        {t('منتجات قيد الفحص', 'Products to Moderate')}
                      </div>
                      <div className="text-xl font-bold font-mono text-[#B45309] mt-1">
                        {metrics.pendingProducts.length}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection('returns')}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E6E0D6] text-start transition-colors"
                    >
                      <div className="text-[11px] font-semibold text-[#8C857B]">
                        {t('منازعات ومرتجعات', 'Open Return Claims')}
                      </div>
                      <div className="text-xl font-bold font-mono text-[#9E2A2B] mt-1">
                        {metrics.openReturns.length}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection('tickets')}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E6E0D6] text-start transition-colors"
                    >
                      <div className="text-[11px] font-semibold text-[#8C857B]">
                        {t('تذاكر الدعم والتسويات', 'Open Support Tickets')}
                      </div>
                      <div className="text-xl font-bold font-mono text-[#0B4F3F] mt-1">
                        {metrics.openTickets.length}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSection('moderation')}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E6E0D6] text-start transition-colors"
                    >
                      <div className="text-[11px] font-semibold text-[#8C857B]">
                        {t('تقييمات وأسئلة معلقة', 'Reviews & Q&A Queue')}
                      </div>
                      <div className="text-xl font-bold font-mono text-[#141413] mt-1">
                        {metrics.pendingReviews.length + metrics.unansweredQuestions.length}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent Marketplace Orders & Live Audit Stream */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#141413]">
                          {t('أحدث الطلبات عبر المنصة', 'Recent Marketplace Orders')}
                        </h3>
                        <p className="text-xs text-[#8C857B]">
                          {t(
                            'متابعة حية لحركة الطلبات، الشحنات، والمدفوعات',
                            'Live supervision across multi-vendor orders and fulfillment'
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('orders')}
                        className="text-xs font-bold text-[#0B4F3F] hover:underline"
                      >
                        {t('عرض كافة الطلبات', 'View All Orders')}
                      </button>
                    </div>

                    <div className="divide-y divide-[#F3EFEA]">
                      {orders.slice(0, 5).map((o) => (
                        <div
                          key={o.id}
                          className="py-3 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#141413]">
                                {o.orderNumber}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-bold uppercase">
                                {o.status}
                              </span>
                            </div>
                            <div className="text-[#8C857B] mt-0.5">
                              {o.customerName} · {o.address.cityAr}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="font-mono font-bold text-[#0B4F3F]">
                              {formatPrice(o.total)}
                            </div>
                            <div className="text-[10px] font-mono text-[#8C857B]">
                              {o.createdAt.slice(0, 10)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#141413]">
                          {t('سجل القرارات الإدارية الأخير', 'Recent Administrative Audit Log')}
                        </h3>
                        <p className="text-xs text-[#8C857B]">
                          {t(
                            'توثيق فوري لكافة الإجراءات الرقابية',
                            'Immutable trace of recent governance actions'
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection('audit-preview')}
                        className="text-xs font-bold text-[#0B4F3F] hover:underline"
                      >
                        {t('السجل الكامل', 'Full Log')}
                      </button>
                    </div>

                    <div className="divide-y divide-[#F3EFEA]">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="py-2.5 space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#141413]">
                              {lang === 'ar' ? log.actionAr : log.actionEn}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] text-[10px] font-mono uppercase text-[#57534E]">
                              {log.targetType}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#57534E] line-clamp-1">
                            {log.targetType}: #{log.targetId}
                          </p>
                          <div className="text-[10px] font-mono text-[#8C857B]">
                            {log.actorName} · {log.createdAt.slice(0, 16).replace('T', ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================
                SECTION 2: UNIFIED OPERATIONS QUEUE
            ================================================== */}
            {activeSection === 'queue' && (
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded bg-[#0B4F3F] text-white text-[10px] font-mono font-bold uppercase">
                        LIVE QUEUE
                      </span>
                      <span className="text-xs font-mono text-[#8C857B]">
                        {queueItems.length} {t('مهمة نشطة', 'active items')}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-[#141413] mt-1">
                      {t(
                        'طابور العمليات الموحد ومهام الحوكمة اليومية',
                        'Unified Marketplace Operations & Triage Queue'
                      )}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', ar: 'الكل', en: 'All Tasks' },
                        { id: 'sellers', ar: 'اعتماد التجار', en: 'Sellers' },
                        { id: 'products', ar: 'المنتجات', en: 'Products' },
                        { id: 'returns', ar: 'المرتجعات', en: 'Returns' },
                        { id: 'tickets', ar: 'التذاكر والتسويات', en: 'Tickets' },
                        { id: 'moderation', ar: 'التقييمات والأسئلة', en: 'Reviews & Q&A' },
                        { id: 'inventory', ar: 'تنبيهات المخزون', en: 'Stock Alerts' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setQueueFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          queueFilter === tab.id
                            ? 'bg-[#0B4F3F] text-white'
                            : 'bg-[#FAF8F5] text-[#57534E] hover:bg-[#F3EFEA]'
                        }`}
                      >
                        {lang === 'ar' ? tab.ar : tab.en}
                      </button>
                    ))}
                  </div>
                </div>

                {queueItems.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#0B4F3F] mx-auto" />
                    <p className="text-sm font-bold text-[#141413]">
                      {t(
                        'لا توجد مهام معلقة في هذا التصنيف حالياً',
                        'All operational tasks in this queue have been resolved'
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E6E0D6]">
                    {queueItems.map((item) => (
                      <div
                        key={item.id}
                        className="py-4 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="space-y-1 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                item.urgency === 'critical'
                                  ? 'bg-red-50 text-[#9E2A2B] border border-red-200'
                                  : item.urgency === 'high'
                                  ? 'bg-amber-50 text-[#B45309] border border-amber-200'
                                  : 'bg-[#FAF8F5] text-[#57534E] border border-[#E6E0D6]'
                              }`}
                            >
                              {item.urgency}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-mono font-bold uppercase">
                              {item.category}
                            </span>
                            <span className="text-xs font-mono text-[#8C857B]">
                              {item.timestamp}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#141413]">
                            {lang === 'ar' ? item.titleAr : item.titleEn}
                          </h3>
                          <p className="text-xs text-[#57534E]">
                            {lang === 'ar' ? item.subtitleAr : item.subtitleEn}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono font-bold text-[#141413]">
                            {item.meta}
                          </span>

                          {/* Quick inline approval for pending seller or pending product */}
                          {item.category === 'sellers' && (
                            <button
                              type="button"
                              onClick={() => updateSellerStatus(item.entityId, 'approved')}
                              className="px-3 py-1.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#093D30]"
                            >
                              {t('اعتماد فوري', 'Quick Approve')}
                            </button>
                          )}

                          {item.category === 'products' && (
                            <button
                              type="button"
                              onClick={() =>
                                moderateProduct(
                                  item.entityId,
                                  { status: 'active' },
                                  `اعتماد وتفعيل المنتج (${item.entityId}) من طابور العمليات`,
                                  `Approved and activated product (${item.entityId}) from Operations Queue`
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#093D30]"
                            >
                              {t('اعتماد المنتج', 'Approve Product')}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveSection(item.targetSection)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#E6E0D6] hover:border-[#0B4F3F] text-xs font-bold text-[#141413]"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#0B4F3F]" />
                            <span>{t('معالجة في القسم المختص', 'Inspect & Resolve')}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================================================
                SECTION 3 & 4: SELLERS & PRODUCTS
            ================================================== */}
            {(activeSection === 'sellers' || activeSection === 'products') && (
              <AdminSellersAndProducts activeSection={activeSection} />
            )}

            {/* ==================================================
                SECTION 5, 6 & 7: ORDERS, RETURNS & CUSTOMERS
            ================================================== */}
            {(activeSection === 'orders' ||
              activeSection === 'returns' ||
              activeSection === 'customers') && (
              <AdminOrdersReturnsCustomers activeSection={activeSection} />
            )}

            {/* ==================================================
                SECTION 8, 9 & 10: COUPONS, TICKETS & MODERATION
            ================================================== */}
            {(activeSection === 'coupons' ||
              activeSection === 'tickets' ||
              activeSection === 'moderation') && (
              <AdminPromotionsSupportModeration activeSection={activeSection} />
            )}

            {/* ==================================================
                AUDIT LOGS & ROUND 3B PLACEHOLDERS
            ================================================== */}
            {activeSection === 'audit-preview' && (
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase text-[#0B4F3F]">
                      IMMUTABLE GOVERNANCE STREAM
                    </span>
                    <h2 className="text-lg font-bold text-[#141413] mt-0.5">
                      {t('سجل التدقيق الرقابي للعمليات الإدارية', 'Administrative Operations Audit Log')}
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono font-bold">
                    {auditLogs.length} {t('عملية موثقة', 'recorded events')}
                  </span>
                </div>

                <div className="divide-y divide-[#E6E0D6]">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-mono font-bold uppercase">
                            {log.targetType}
                          </span>
                          <span className="font-bold text-[#141413]">
                            {lang === 'ar' ? log.actionAr : log.actionEn}
                          </span>
                        </div>
                        <p className="text-[#57534E]">
                          {log.targetType}: #{log.targetId}
                        </p>
                      </div>
                      <div className="text-end font-mono text-[11px] text-[#8C857B]">
                        <div className="font-bold text-[#141413]">{log.actorName}</div>
                        <div>{log.createdAt.slice(0, 19).replace('T', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeSection === 'finance-preview' ||
              activeSection === 'analytics-preview' ||
              activeSection === 'cms-preview' ||
              activeSection === 'settings-preview') && (
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-8 shadow-xs space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#FBF7EC] border border-[#C59B27]/40 text-xs font-bold text-[#141413]">
                  <Sparkles className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    {t(
                      'مجدول للمرحلة القادمة (ROUND 3B)',
                      'Scheduled for Next Phase (ROUND 3B)'
                    )}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#141413]">
                  {activeSection === 'finance-preview'
                    ? t('الخزينة والتسويات المالية للتجار', 'Platform Treasury & Merchant Settlements')
                    : activeSection === 'analytics-preview'
                    ? t('تحليلات السوق التنفيذية المتقدمة', 'Executive Marketplace Intelligence')
                    : activeSection === 'cms-preview'
                    ? t('نظام إدارة المحتوى والواجهة التسويقية (CMS)', 'Storefront Homepage CMS')
                    : t('إعدادات المنصة والسياسات الضريبية', 'Platform Configuration & Tax Governance')}
                </h2>
                <p className="text-xs text-[#57534E] leading-relaxed max-w-2xl">
                  {t(
                    'تم تخصيص هذه المرحلة (ROUND 3A) لإنجاز كافة العمليات التشغيلية والرقابية الأساسية للمنصة (التجار، الكتالوج، الطلبات، المرتجعات، العملاء، الكوبونات، التذاكر، والمراجعات). سيتم تفعيل هذه الوحدة المتقدمة في المرحلة ROUND 3B.',
                    'ROUND 3A is dedicated to Core Marketplace Operations (Sellers, Products Moderation, Orders, Returns & Refunds, Customers, Coupons, Support Tickets, Reviews & Q&A, and Unified Operations Queue). This module is reserved for ROUND 3B.'
                  )}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveSection('overview')}
                    className="px-4 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                  >
                    {t('العودة للنظرة التنفيذية', 'Return to Executive Overview')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
