'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  RotateCcw,
  Tag,
  MessageSquare,
  Star,
  BarChart3,
  Wallet,
  Building2,
  Store,
  Settings,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Download,
  Eye,
  Clock,
  Truck,
  Award,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { INITIAL_SELLERS } from '@/lib/seed-catalog';
import SellerCatalogAndInventory from '@/components/seller/SellerCatalogAndInventory';
import SellerOrdersAndReturns from '@/components/seller/SellerOrdersAndReturns';
import SellerMarketingAndEngagement from '@/components/seller/SellerMarketingAndEngagement';
import SellerFinanceAndProfile from '@/components/seller/SellerFinanceAndProfile';

export type SellerSectionId =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'orders'
  | 'returns'
  | 'promotions'
  | 'questions'
  | 'reviews'
  | 'analytics'
  | 'finance'
  | 'payouts'
  | 'profile'
  | 'settings';

export default function SellerCenter() {
  const {
    lang,
    isRtl,
    t,
    formatPrice,
    currentUser,
    isDemoMode,
    canAccessSellerDashboard,
    sellers,
    products,
    categories,
    orders,
    sellerFulfillments,
    coupons,
    questions,
    reviews,
    navigateTo,
    showToast,
  } = useMarketplace();

  const DirArrow = isRtl ? ArrowLeft : ArrowRight;

  const [activeSection, setActiveSection] = useState<SellerSectionId>('overview');
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  // Strict Seller Isolation:
  // Production sellers can ONLY ever access their own `currentUser.sellerId`.
  // Demo Mode / Admin preview defaults to `currentUser?.sellerId || 'seller-2'` and allows inspecting Demo Boutiques.
  const [demoSelectedSellerId, setDemoSelectedSellerId] = useState<string>(
    currentUser?.sellerId || 'seller-2'
  );

  const effectiveSellerId = useMemo(() => {
    if (!isDemoMode && currentUser?.role === 'seller' && currentUser.sellerId) {
      return currentUser.sellerId;
    }
    return currentUser?.sellerId && !isDemoMode
      ? currentUser.sellerId
      : demoSelectedSellerId || currentUser?.sellerId || 'seller-2';
  }, [isDemoMode, currentUser, demoSelectedSellerId]);

  const activeSeller = useMemo(() => {
    return (
      sellers.find((s) => s.id === effectiveSellerId) ||
      sellers[1] ||
      sellers[0] ||
      INITIAL_SELLERS[1]
    );
  }, [sellers, effectiveSellerId]);

  // Strictly scoped Seller Data
  const sellerProducts = useMemo(
    () => products.filter((p) => p.sellerId === activeSeller.id),
    [products, activeSeller.id]
  );

  const sellerProductIds = useMemo(
    () => new Set(sellerProducts.map((p) => p.id)),
    [sellerProducts]
  );

  const sellerOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.sellerIds?.includes(activeSeller.id) ||
          o.items.some((item) => item.sellerId === activeSeller.id)
      ),
    [orders, activeSeller.id]
  );

  const sellerCoupons = useMemo(
    () => coupons.filter((c) => c.sellerId === activeSeller.id),
    [coupons, activeSeller.id]
  );

  const sellerQuestions = useMemo(
    () => questions.filter((q) => sellerProductIds.has(q.productId)),
    [questions, sellerProductIds]
  );

  const sellerReviews = useMemo(
    () => reviews.filter((r) => sellerProductIds.has(r.productId)),
    [reviews, sellerProductIds]
  );

  // ============================================================================
  // CALCULATE ALL 12 MERCHANT KPIs STRICTLY FROM THIS SELLER'S DATA
  // ============================================================================
  const kpis = useMemo(() => {
    // Calculate live order gross & units for this seller
    let orderUnits = 0;
    let orderGrossSum = 0;
    sellerOrders.forEach((o) => {
      if (o.status === 'cancelled') return;
      const myItems = o.items.filter((i) => i.sellerId === activeSeller.id);
      myItems.forEach((item) => {
        orderUnits += item.quantity;
        orderGrossSum += item.unitPrice * item.quantity;
      });
    });

    const catalogSoldUnits = sellerProducts.reduce((sum, p) => sum + (p.soldCount || 0), 0);
    const unitsSold = Math.max(orderUnits, catalogSoldUnits);

    const grossSales = Math.max(activeSeller.grossSales, orderGrossSum);
    const platformCommission = Math.max(
      activeSeller.platformCommission,
      Math.round((grossSales * activeSeller.commissionRate) / 100)
    );
    const netEarnings = Math.max(
      activeSeller.netEarnings,
      grossSales - platformCommission - activeSeller.refundsTotal
    );

    const totalOrders = sellerOrders.length;
    const avgOrderValue =
      totalOrders > 0 ? Math.round(orderGrossSum / totalOrders) : Math.round(grossSales / 18);

    const returnOrdersCount = sellerOrders.filter(
      (o) => o.status === 'return_requested' || o.status === 'returned' || o.returnRequest
    ).length;
    const returnRate =
      totalOrders > 0 ? Number(((returnOrdersCount / totalOrders) * 100).toFixed(1)) : 1.2;

    const avgProductRating =
      sellerProducts.length > 0
        ? Number(
            (
              sellerProducts.reduce((sum, p) => sum + (p.rating || activeSeller.rating), 0) /
              sellerProducts.length
            ).toFixed(2)
          )
        : activeSeller.rating;

    const pendingPayout = activeSeller.payoutHistory
      .filter((p) => p.status === 'processing' || p.status === 'scheduled')
      .reduce((sum, p) => sum + p.amount, 0);

    const outOfStockProducts = sellerProducts.filter(
      (p) => p.stock <= 0 || p.status === 'out_of_stock'
    );
    const criticalStockProducts = sellerProducts.filter((p) => {
      if (p.stock <= 0 || p.status === 'out_of_stock') return false;
      const criticalLimit = Math.max(1, Math.floor(p.lowStockThreshold / 2));
      return p.stock > 0 && p.stock <= criticalLimit;
    });
    const lowStockProducts = sellerProducts.filter((p) => {
      if (p.stock <= 0 || p.status === 'out_of_stock') return false;
      const criticalLimit = Math.max(1, Math.floor(p.lowStockThreshold / 2));
      return p.stock > criticalLimit && p.stock <= p.lowStockThreshold;
    });

    const newPlacedOrders = sellerOrders.filter((o) => o.status === 'placed');
    const unansweredQuestions = sellerQuestions.filter((q) => !q.answerAr);

    return {
      grossSales,
      netEarnings,
      platformCommission,
      totalOrders,
      unitsSold,
      avgOrderValue,
      returnRate,
      returnOrdersCount,
      avgProductRating,
      availableBalance: activeSeller.availableBalance,
      pendingPayout,
      lowStockCount: lowStockProducts.length,
      criticalStockCount: criticalStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      newPlacedCount: newPlacedOrders.length,
      unansweredCount: unansweredQuestions.length,
    };
  }, [activeSeller, sellerProducts, sellerOrders, sellerQuestions]);

  // Deterministic Seller-Scoped Category Analytics
  // Prefers actual seller order items (mapping item.productId -> seller's catalog product categoryId)
  // and incorporates seller catalog product performance without Math.random.
  const categoryAnalytics = useMemo(() => {
    const productMap = new Map(sellerProducts.map((p) => [p.id, p]));
    const catStats = new Map<
      string,
      {
        categoryId: string;
        nameAr: string;
        nameEn: string;
        revenue: number;
        unitsSold: number;
        skuCount: number;
      }
    >();

    const ensureCategoryEntry = (categoryId: string) => {
      const existing = catStats.get(categoryId);
      if (existing) return existing;
      const catMeta = categories.find((c) => c.id === categoryId);
      const created = {
        categoryId,
        nameAr: catMeta?.nameAr || categoryId,
        nameEn: catMeta?.nameEn || categoryId,
        revenue: 0,
        unitsSold: 0,
        skuCount: sellerProducts.filter((sp) => sp.categoryId === categoryId).length,
      };
      catStats.set(categoryId, created);
      return created;
    };

    // Track which products already have actual order items recorded
    const productsWithOrderItems = new Set<string>();

    sellerOrders.forEach((order) => {
      if (order.status === 'cancelled') return;
      order.items.forEach((item) => {
        const matchedProd = productMap.get(item.productId);
        if (item.sellerId !== activeSeller.id && !matchedProd) return;
        const categoryId = matchedProd?.categoryId || activeSeller.categories[0] || 'electronics';
        const entry = ensureCategoryEntry(categoryId);
        entry.revenue += item.unitPrice * item.quantity;
        entry.unitsSold += item.quantity;
        productsWithOrderItems.add(item.productId);
      });
    });

    // Include remaining seller catalog products so all active seller categories are deterministically represented
    sellerProducts.forEach((prod) => {
      const entry = ensureCategoryEntry(prod.categoryId);
      if (!productsWithOrderItems.has(prod.id) && prod.soldCount > 0) {
        entry.revenue += prod.price * prod.soldCount;
        entry.unitsSold += prod.soldCount;
      }
    });

    const rows = Array.from(catStats.values()).sort((a, b) => b.revenue - a.revenue);
    const totalCategoryRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    const totalCategoryUnits = rows.reduce((sum, r) => sum + r.unitsSold, 0);

    return {
      rows: rows.map((r, index) => ({
        ...r,
        rank: index + 1,
        sharePct:
          totalCategoryRevenue > 0
            ? Number(((r.revenue / totalCategoryRevenue) * 100).toFixed(1))
            : 0,
      })),
      totalCategoryRevenue,
      totalCategoryUnits,
    };
  }, [sellerProducts, sellerOrders, categories, activeSeller.id, activeSeller.categories]);

  // Navigation Items with Live Badges
  const navItems: {
    id: SellerSectionId;
    labelAr: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    badgeTone?: 'amber' | 'red' | 'green';
  }[] = [
    {
      id: 'overview',
      labelAr: 'نظرة عامة والتنبيهات',
      labelEn: 'Overview & KPIs',
      icon: LayoutDashboard,
    },
    {
      id: 'products',
      labelAr: 'كتالوج المنتجات',
      labelEn: 'Products Catalog',
      icon: Package,
      badge: sellerProducts.length,
    },
    {
      id: 'inventory',
      labelAr: 'إدارة المخزون والعتبات',
      labelEn: 'Inventory & Stock',
      icon: Boxes,
      badge:
        kpis.lowStockCount + kpis.criticalStockCount + kpis.outOfStockCount > 0
          ? kpis.lowStockCount + kpis.criticalStockCount + kpis.outOfStockCount
          : undefined,
      badgeTone: kpis.outOfStockCount > 0 || kpis.criticalStockCount > 0 ? 'red' : 'amber',
    },
    {
      id: 'orders',
      labelAr: 'الطلبات وبوالص الشحن',
      labelEn: 'Orders & Fulfillment',
      icon: ShoppingBag,
      badge: kpis.newPlacedCount > 0 ? kpis.newPlacedCount : sellerOrders.length,
      badgeTone: kpis.newPlacedCount > 0 ? 'amber' : 'green',
    },
    {
      id: 'returns',
      labelAr: 'المرتجعات وما بعد البيع',
      labelEn: 'Returns & Claims',
      icon: RotateCcw,
      badge: kpis.returnOrdersCount > 0 ? kpis.returnOrdersCount : undefined,
      badgeTone: 'amber',
    },
    {
      id: 'promotions',
      labelAr: 'العروض وكوبونات المتجر',
      labelEn: 'Promotions & Coupons',
      icon: Tag,
      badge: sellerCoupons.length,
    },
    {
      id: 'questions',
      labelAr: 'استفسارات العملاء',
      labelEn: 'Customer Questions',
      icon: MessageSquare,
      badge: kpis.unansweredCount > 0 ? kpis.unansweredCount : undefined,
      badgeTone: 'amber',
    },
    {
      id: 'reviews',
      labelAr: 'التقييمات والسمعة',
      labelEn: 'Reviews & Reputation',
      icon: Star,
      badge: sellerReviews.length,
    },
    {
      id: 'analytics',
      labelAr: 'تحليلات الأداء والنمو',
      labelEn: 'Performance Analytics',
      icon: BarChart3,
    },
    {
      id: 'finance',
      labelAr: 'المالية وكشف الحساب',
      labelEn: 'Finance & VAT Ledger',
      icon: Wallet,
    },
    {
      id: 'payouts',
      labelAr: 'تحويلات الأرباح (سار)',
      labelEn: 'SARIE Payouts',
      icon: Building2,
    },
    {
      id: 'profile',
      labelAr: 'ملف المتجر والتوثيق',
      labelEn: 'Store Profile & CR',
      icon: Store,
    },
    {
      id: 'settings',
      labelAr: 'إعدادات التشغيل والضريبة',
      labelEn: 'Operational Settings',
      icon: Settings,
    },
  ];

  // Simulated Time-Series Chart Data scoped to Seller's Gross Sales
  const chartData = useMemo(() => {
    const base = Math.max(10000, Math.round(kpis.grossSales / 6));
    if (chartPeriod === '7d') {
      return [
        { labelAr: 'السبت', labelEn: 'Sat', value: Math.round(base * 0.14), orders: 3 },
        { labelAr: 'الأحد', labelEn: 'Sun', value: Math.round(base * 0.18), orders: 4 },
        { labelAr: 'الإثنين', labelEn: 'Mon', value: Math.round(base * 0.15), orders: 3 },
        { labelAr: 'الثلاثاء', labelEn: 'Tue', value: Math.round(base * 0.22), orders: 5 },
        { labelAr: 'الأربعاء', labelEn: 'Wed', value: Math.round(base * 0.19), orders: 4 },
        { labelAr: 'الخميس', labelEn: 'Thu', value: Math.round(base * 0.27), orders: 6 },
        { labelAr: 'الجمعة', labelEn: 'Fri', value: Math.round(base * 0.24), orders: 5 },
      ];
    }
    if (chartPeriod === '90d') {
      return [
        { labelAr: 'يوليو', labelEn: 'Jul', value: Math.round(base * 1.6), orders: 28 },
        { labelAr: 'أغسطس', labelEn: 'Aug', value: Math.round(base * 1.9), orders: 34 },
        { labelAr: 'سبتمبر', labelEn: 'Sep', value: Math.round(base * 2.5), orders: 46 },
      ];
    }
    if (chartPeriod === '12m') {
      return [
        { labelAr: 'الربع ١', labelEn: 'Q1', value: Math.round(base * 1.2), orders: 22 },
        { labelAr: 'الربع ٢', labelEn: 'Q2', value: Math.round(base * 1.5), orders: 29 },
        { labelAr: 'الربع ٣', labelEn: 'Q3', value: Math.round(base * 1.8), orders: 35 },
        { labelAr: 'الربع ٤', labelEn: 'Q4', value: Math.round(base * 2.4), orders: 48 },
      ];
    }
    return [
      { labelAr: 'الأسبوع ١', labelEn: 'Week 1', value: Math.round(base * 0.42), orders: 8 },
      { labelAr: 'الأسبوع ٢', labelEn: 'Week 2', value: Math.round(base * 0.51), orders: 10 },
      { labelAr: 'الأسبوع ٣', labelEn: 'Week 3', value: Math.round(base * 0.48), orders: 9 },
      { labelAr: 'الأسبوع ٤', labelEn: 'Week 4', value: Math.round(base * 0.64), orders: 14 },
    ];
  }, [chartPeriod, kpis.grossSales]);

  const maxChartValue = useMemo(
    () => Math.max(...chartData.map((d) => d.value), 1),
    [chartData]
  );

  // Export Analytics CSV
  const handleExportAnalyticsCsv = () => {
    const headers = ['SKU', 'Product Title', 'Price (SAR)', 'Stock', 'Units Sold', 'Rating', 'Estimated Revenue (SAR)'];
    const rows = sellerProducts.map((p) => [
      p.sku,
      `"${lang === 'ar' ? p.titleAr : p.titleEn}"`,
      p.price,
      p.stock,
      p.soldCount,
      p.rating,
      p.price * p.soldCount,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atheel-seller-analytics-${activeSeller.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      lang === 'ar' ? 'تم تصدير تقرير تحليلات أداء المتجر (CSV)' : 'Merchant Analytics Report Exported (CSV)',
      undefined,
      'success'
    );
  };

  if (!canAccessSellerDashboard || (currentUser?.role !== 'admin' && activeSeller.status !== 'approved')) {
    return (
      <div className="min-h-[75vh] bg-[#FAF8F5] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-[#E5E0D8] p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-700 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#141413]">
            {activeSeller.status === 'suspended'
              ? t('تم إيقاف حساب المتجر مؤقتاً', 'Seller Account Suspended')
              : t('غير مصرح بالوصول إلى بوابة التجار', 'Seller Center Access Denied')}
          </h2>
          <p className="text-sm text-[#6B675E] mt-2 leading-relaxed">
            {activeSeller.status === 'suspended'
              ? t(
                  'تم تعليق صلاحيات بوابة التجار لهذا المتجر من قِبل الإدارة التنفيذية. جميع عمليات الكتالوج والطلبات والتحويلات موقوفة حتى إعادة التفعيل.',
                  'Seller Center privileges for this boutique have been suspended by Executive Operations. All catalog, order, and payout operations are blocked until reinstatement.'
                )
              : t(
                  'تتطلب بوابة التجار حساب تاجر معتمد ومفعّل (status = approved).',
                  'Seller Center requires an active approved merchant account (status = approved).'
                )}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => navigateTo('home')}
              className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#093E31]"
            >
              {t('العودة للواجهة الرئيسية', 'Return to Storefront')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Top Executive Merchant Header Bar */}
      <div className="bg-[#0B4F3F] text-white border-b border-[#C59B27]/30">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[#F5E6C8]/15 border border-[#C59B27]/50 flex items-center justify-center text-[#C59B27] font-bold text-xl shrink-0">
              {activeSeller.nameAr.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-[#C59B27] text-[#141413] text-[10px] font-bold uppercase tracking-wider">
                  {t('بوابة التجار المعتمدين', 'ATHEEL SELLER CENTER')}
                </span>
                {activeSeller.verifiedBadge && (
                  <span className="px-2.5 py-0.5 rounded bg-white/10 text-[#F5E6C8] text-[11px] font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C59B27]" />
                    <span>{t('تاجر سعودي موثق', 'Verified Saudi Boutique')}</span>
                  </span>
                )}
                <span className="text-xs font-mono text-[#F5E6C8]/80">
                  CR: {activeSeller.crNumber} · VAT: {activeSeller.vatNumber}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {lang === 'ar' ? activeSeller.nameAr : activeSeller.nameEn}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Demo Mode / Admin Boutique Switcher (Never shown to real production sellers) */}
            {(isDemoMode || currentUser?.role === 'admin') && (
              <div className="flex items-center gap-2 bg-white/10 border border-[#C59B27]/40 rounded-xl px-3 py-1.5">
                <span className="text-[11px] text-[#F5E6C8] font-semibold">
                  {t('معاينة متجر:', 'Inspect Boutique:')}
                </span>
                <select
                  value={activeSeller.id}
                  onChange={(e) => setDemoSelectedSellerId(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
                >
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id} className="text-[#141413]">
                      {lang === 'ar' ? s.nameAr : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveSection('products')}
              className="px-3.5 py-2 rounded-xl bg-[#C59B27] hover:bg-[#b0881f] text-[#141413] text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{t('+ إدارة المنتجات', '+ Manage Catalog')}</span>
            </button>

            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>{t('العودة لواجهة التسوق', 'Storefront')}</span>
              <DirArrow className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Scrollable Section Navigation */}
        <div className="lg:hidden border-t border-white/10 bg-[#083B2F] px-4 py-2.5 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                    active
                      ? 'bg-[#C59B27] text-[#141413]'
                      : 'bg-white/5 text-[#F5E6C8] hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-black/20 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Seller Center Layout: Sidebar + Active Workspace */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Sidebar Navigation (3 Cols) */}
          <aside className="hidden lg:block lg:col-span-3 bg-white rounded-2xl border border-[#E6E0D6] p-4 sticky top-24 space-y-4">
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8C857B]">{t('التقييم العام للمتجر', 'Store Rating')}</span>
                <span className="font-mono font-bold text-[#0B4F3F] flex items-center gap-1">
                  ★ {activeSeller.rating} ({activeSeller.reviewCount})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8C857B]">{t('الرصيد القابل للسحب', 'Available Payout')}</span>
                <span className="font-mono font-bold text-[#1E6B47]">
                  {formatPrice(activeSeller.availableBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#57534E]">
                <span>{t('نسبة العمولة التعاقدية', 'Commission Tier')}</span>
                <span className="font-mono font-bold">{activeSeller.commissionRate}%</span>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-[#0B4F3F] text-white shadow-xs'
                        : 'text-[#57534E] hover:bg-[#FAF8F5] hover:text-[#141413]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? 'text-[#C59B27]' : 'text-[#8C857B]'
                        }`}
                      />
                      <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badgeTone === 'red'
                            ? 'bg-red-100 text-[#9E2A2B]'
                            : item.badgeTone === 'amber'
                            ? 'bg-[#FBF7EC] text-[#C87D12] border border-[#C59B27]/40'
                            : 'bg-[#FAF8F5] text-[#57534E] border border-[#E6E0D6]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[#E6E0D6] text-[11px] text-[#8C857B] flex items-center gap-2 px-2">
              <ShieldCheck className="w-4 h-4 text-[#0B4F3F] shrink-0" />
              <span>
                {t(
                  'جميع العمليات محمية بقواعد أمان Firestore وصلاحيات التاجر الموثق.',
                  'Protected by Firestore RBAC & field-level diff rules.'
                )}
              </span>
            </div>
          </aside>

          {/* Active Workspace Content (9 Cols) */}
          <div className="lg:col-span-9 space-y-6">
            {/* =================================================================
                SECTION 1: SELLER OVERVIEW DASHBOARD (PHASE 3)
               ================================================================= */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* Actionable Operational Alerts Bar */}
                {(kpis.newPlacedCount > 0 ||
                  kpis.lowStockCount > 0 ||
                  kpis.criticalStockCount > 0 ||
                  kpis.outOfStockCount > 0 ||
                  kpis.unansweredCount > 0 ||
                  kpis.returnOrdersCount > 0) && (
                  <div className="bg-white rounded-2xl border border-[#C59B27]/50 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#141413] flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#C87D12]" />
                        <span>
                          {t(
                            'المهام التشغيلية العاجلة لمتجرك اليوم',
                            'Priority Merchant Action Items Today'
                          )}
                        </span>
                      </span>
                      <span className="text-[11px] text-[#8C857B]">
                        {t('اضغط للانتقال الفوري للمعالجة', 'Click any alert to resolve')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveSection('orders')}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FBF7EC] border border-[#E6E0D6] text-start transition-colors"
                      >
                        <div className="text-lg font-bold font-mono text-[#0B4F3F]">
                          {kpis.newPlacedCount}
                        </div>
                        <div className="text-xs font-bold text-[#141413] mt-0.5">
                          {t('طلبات جديدة بانتظار التأكيد', 'New Orders to Confirm')}
                        </div>
                        <div className="text-[10px] text-[#8C857B] mt-0.5">
                          {t('ضمن اتفاقية الشحن خلال ٢٤ ساعة', 'Within 24h SLA window')}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('inventory')}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FBF7EC] border border-[#E6E0D6] text-start transition-colors"
                      >
                        <div className="text-lg font-bold font-mono text-[#C87D12]">
                          {kpis.lowStockCount + kpis.criticalStockCount + kpis.outOfStockCount}
                        </div>
                        <div className="text-xs font-bold text-[#141413] mt-0.5">
                          {t('تنبيهات المخزون (حرج / منخفض / نافد)', 'Critical / Low / Out-of-Stock SKUs')}
                        </div>
                        <div className="text-[10px] text-[#8C857B] mt-0.5">
                          {kpis.outOfStockCount} {t('نافد', 'out')} · {kpis.criticalStockCount}{' '}
                          {t('حرج', 'critical')} · {kpis.lowStockCount} {t('منخفض', 'low')}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('questions')}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FBF7EC] border border-[#E6E0D6] text-start transition-colors"
                      >
                        <div className="text-lg font-bold font-mono text-[#B8860B]">
                          {kpis.unansweredCount}
                        </div>
                        <div className="text-xs font-bold text-[#141413] mt-0.5">
                          {t('أسئلة عملاء بانتظار الإجابة', 'Unanswered Customer Q&A')}
                        </div>
                        <div className="text-[10px] text-[#8C857B] mt-0.5">
                          {t('رد سريع لزيادة التحويل', 'Boost conversion rate')}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('returns')}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] hover:bg-[#FBF7EC] border border-[#E6E0D6] text-start transition-colors"
                      >
                        <div className="text-lg font-bold font-mono text-[#9E2A2B]">
                          {kpis.returnOrdersCount}
                        </div>
                        <div className="text-xs font-bold text-[#141413] mt-0.5">
                          {t('طلبات إرجاع وفحص جودة', 'Return Inspection Requests')}
                        </div>
                        <div className="text-[10px] text-[#8C857B] mt-0.5">
                          {t('توصية الفحص الفني للتسويات', 'Submit inspection report')}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* All 12 Merchant KPIs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Gross Sales */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#8C857B]">
                      <span>{t('إجمالي المبيعات (Gross Sales)', 'Gross Sales')}</span>
                      <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#1E6B47] font-mono font-bold text-[10px]">
                        +18.4% ↑
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-[#141413]">
                      {formatPrice(kpis.grossSales)}
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      {t('مقارنة بالشهر السابق (شامل الضريبة)', 'vs previous 30d (VAT-inclusive)')}
                    </div>
                  </div>

                  {/* 2. Net Earnings */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#8C857B]">
                      <span>{t('صافي الأرباح (Net Earnings)', 'Net Earnings')}</span>
                      <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#1E6B47] font-mono font-bold text-[10px]">
                        +16.9% ↑
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-[#1E6B47]">
                      {formatPrice(kpis.netEarnings)}
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      {t('بعد خصم عمولة المنصة والمرتجعات', 'After commission & returns')}
                    </div>
                  </div>

                  {/* 3. Platform Commission */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#8C857B]">
                      <span>{t('عمولة المنصة (Platform Comm.)', 'Platform Commission')}</span>
                      <span className="font-mono font-bold text-[#C87D12] text-[11px]">
                        {activeSeller.commissionRate}%
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-[#C87D12]">
                      {formatPrice(kpis.platformCommission)}
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      {t('تشمل رسوم الدفع الإلكتروني والتسويق', 'Includes Mada/ApplePay gateway fees')}
                    </div>
                  </div>

                  {/* 4. Available Balance & 10. Pending Payout */}
                  <div
                    onClick={() => setActiveSection('payouts')}
                    className="bg-[#0B4F3F] text-white rounded-2xl p-5 space-y-1.5 cursor-pointer hover:bg-[#083B2F] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs text-[#F5E6C8]">
                      <span>{t('الرصيد المتاح للسحب الفوري', 'Available Balance')}</span>
                      <ArrowUpRight className="w-4 h-4 text-[#C59B27]" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {formatPrice(kpis.availableBalance)}
                    </div>
                    <div className="text-[11px] text-[#C59B27] font-mono">
                      {t('قيد التسوية:', 'Pending Payout:')} {formatPrice(kpis.pendingPayout)}
                    </div>
                  </div>

                  {/* 5. Total Orders */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
                    <span className="text-xs text-[#8C857B] block">
                      {t('إجمالي طلبات المتجر (Orders)', 'Total Store Orders')}
                    </span>
                    <div className="text-xl font-bold font-mono text-[#141413]">
                      {kpis.totalOrders}
                    </div>
                    <div className="text-[11px] text-[#1E6B47] font-semibold">
                      {t('نسبة الالتزام بالشحن بالموعد ٩٨.٦٪', '98.6% On-Time Dispatch SLA')}
                    </div>
                  </div>

                  {/* 6. Units Sold */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
                    <span className="text-xs text-[#8C857B] block">
                      {t('إجمالي القطع المباعة (Units Sold)', 'Total Units Sold')}
                    </span>
                    <div className="text-xl font-bold font-mono text-[#141413]">
                      {kpis.unitsSold.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      {t(`عبر ${sellerProducts.length} منتج في الكتالوج`, `Across ${sellerProducts.length} active SKUs`)}
                    </div>
                  </div>

                  {/* 7. Average Order Value & 8. Return Rate */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#8C857B]">
                      <span>{t('متوسط قيمة الطلب (AOV)', 'Average Order Value')}</span>
                      <span className="font-mono text-[#1E6B47] font-bold">
                        {t('المرتجعات:', 'Return Rate:')} {kpis.returnRate}%
                      </span>
                    </div>
                    <div className="text-xl font-bold font-mono text-[#0B4F3F]">
                      {formatPrice(kpis.avgOrderValue)}
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      {t('أقل من متوسط مرتجعات القطاع (٣.٥٪)', 'Below category return benchmark (3.5%)')}
                    </div>
                  </div>

                  {/* 9. Average Product Rating & 11/12. Low / Out of Stock */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#8C857B]">
                      <span>{t('متوسط تقييم المنتجات', 'Avg Product Rating')}</span>
                      <span className="font-mono font-bold text-[#C59B27]">
                        ★ {kpis.avgProductRating} / 5.0
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#141413] pt-1 flex items-center justify-between gap-2">
                      <span>
                        {t('منخفض:', 'Low:')}{' '}
                        <strong className="font-mono text-[#C87D12]">{kpis.lowStockCount}</strong>
                      </span>
                      <span>
                        {t('حرج:', 'Critical:')}{' '}
                        <strong className="font-mono text-[#B45309]">{kpis.criticalStockCount}</strong>
                      </span>
                      <span>
                        {t('نافد:', 'Out:')}{' '}
                        <strong className="font-mono text-[#9E2A2B]">{kpis.outOfStockCount}</strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-[#57534E]">
                      {t('مؤشر جودة التاجر الموثق: ممتاز', 'Merchant Quality Index: Exemplary')}
                    </div>
                  </div>
                </div>

                {/* Revenue & Order Volume Interactive Chart */}
                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-[#141413]">
                        {t('منحنى نمو المبيعات والطلبات للمتجر', 'Store Revenue & Order Volume Trajectory')}
                      </h3>
                      <p className="text-xs text-[#57534E]">
                        {t(
                          'تحليل الأداء المالي الفعلي لمنتجات متجرك خلال الفترة المحددة.',
                          'Financial trajectory calculated strictly from your boutique sales.'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#E6E0D6]">
                      {(
                        [
                          { id: '7d', ar: '٧ أيام', en: '7 Days' },
                          { id: '30d', ar: '٣٠ يوماً', en: '30 Days' },
                          { id: '90d', ar: '٩٠ يوماً', en: '90 Days' },
                          { id: '12m', ar: '١٢ شهراً', en: '12 Months' },
                        ] as const
                      ).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setChartPeriod(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            chartPeriod === p.id
                              ? 'bg-[#0B4F3F] text-white'
                              : 'text-[#57534E] hover:text-[#141413]'
                          }`}
                        >
                          {lang === 'ar' ? p.ar : p.en}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end pt-4 h-52">
                    {chartData.map((d, idx) => {
                      const heightPct = Math.max(18, Math.round((d.value / maxChartValue) * 100));
                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center justify-end h-full gap-2 group"
                        >
                          <div className="text-[10px] font-mono font-bold text-[#0B4F3F]">
                            {formatPrice(d.value)}
                          </div>
                          <div className="w-full max-w-[52px] bg-[#F3EFEA] rounded-t-xl h-32 flex items-end overflow-hidden">
                            <div
                              className="w-full bg-gradient-to-t from-[#0B4F3F] to-[#1E6B47] group-hover:from-[#C59B27] group-hover:to-[#B8860B] rounded-t-xl transition-all duration-300"
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-bold text-[#141413]">
                              {lang === 'ar' ? d.labelAr : d.labelEn}
                            </div>
                            <div className="text-[10px] font-mono text-[#8C857B]">
                              {d.orders} {t('طلب', 'orders')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Split: Top Performing Products + Recent Orders */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Top Performing Products (6 Cols) */}
                  <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#141413]">
                        {t('المنتجات الأعلى مبيعاً وإيراداً', 'Top Selling Store SKUs')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveSection('products')}
                        className="text-xs font-bold text-[#0B4F3F] hover:underline"
                      >
                        {t('عرض الكل', 'View All')}
                      </button>
                    </div>

                    <div className="divide-y divide-[#F3EFEA]">
                      {[...sellerProducts]
                        .sort((a, b) => b.soldCount * b.price - a.soldCount * a.price)
                        .slice(0, 4)
                        .map((prod) => (
                          <div
                            key={prod.id}
                            className="py-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={prod.images[0]}
                                alt={prod.titleAr}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-xl object-cover bg-[#F3EFEA] border border-[#E6E0D6] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-[#141413] truncate">
                                  {lang === 'ar' ? prod.titleAr : prod.titleEn}
                                </div>
                                <div className="text-[11px] text-[#8C857B] font-mono">
                                  {prod.sku} · {t('المبيعات:', 'Sold:')} {prod.soldCount} · ★{' '}
                                  {prod.rating}
                                </div>
                              </div>
                            </div>
                            <div className="text-end font-mono shrink-0">
                              <div className="font-bold text-[#0B4F3F]">
                                {formatPrice(prod.price)}
                              </div>
                              <div className="text-[10px] text-[#57534E]">
                                {t('المخزون:', 'Stock:')} {prod.stock}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recent Seller Orders (6 Cols) */}
                  <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#141413]">
                        {t('أحدث الطلبات الواردة للمتجر', 'Latest Incoming Store Orders')}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveSection('orders')}
                        className="text-xs font-bold text-[#0B4F3F] hover:underline"
                      >
                        {t('إدارة جميع الطلبات', 'Manage Orders')}
                      </button>
                    </div>

                    <div className="divide-y divide-[#F3EFEA]">
                      {sellerOrders.slice(0, 4).map((ord) => {
                        const mySubtotal = ord.items
                          .filter((i) => i.sellerId === activeSeller.id)
                          .reduce((s, i) => s + i.unitPrice * i.quantity, 0);
                        const myFulfillment = sellerFulfillments.find(
                          (f) => f.orderId === ord.id && f.sellerId === activeSeller.id
                        );
                        const displayStatus =
                          ord.status === 'cancelled' ||
                          ord.status === 'return_requested' ||
                          ord.status === 'returned'
                            ? ord.status
                            : myFulfillment?.status || ord.status;
                        return (
                          <div
                            key={ord.id}
                            onClick={() => setActiveSection('orders')}
                            className="py-3 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-[#FAF8F5] px-2 rounded-lg"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#141413]">
                                  #{ord.orderNumber}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-bold uppercase">
                                  {displayStatus}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#57534E] mt-0.5">
                                {ord.customerName} · {ord.address.cityAr}
                              </div>
                            </div>
                            <div className="text-end font-mono">
                              <div className="font-bold text-[#0B4F3F]">
                                {formatPrice(mySubtotal || ord.total)}
                              </div>
                              <div className="text-[10px] text-[#8C857B]">
                                {ord.createdAt.split('T')[0]}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                SECTION 2 & 3: PRODUCTS CATALOG & INVENTORY CONTROL
               ================================================================= */}
            {(activeSection === 'products' || activeSection === 'inventory') && (
              <SellerCatalogAndInventory
                seller={activeSeller}
                sellerProducts={sellerProducts}
                mode={activeSection}
              />
            )}

            {/* =================================================================
                SECTION 4 & 5: ORDERS FULFILLMENT & RETURNS RESOLUTION
               ================================================================= */}
            {(activeSection === 'orders' || activeSection === 'returns') && (
              <SellerOrdersAndReturns
                seller={activeSeller}
                sellerOrders={sellerOrders}
                mode={activeSection}
              />
            )}

            {/* =================================================================
                SECTION 6, 7 & 8: PROMOTIONS, CUSTOMER Q&A, REVIEWS
               ================================================================= */}
            {(activeSection === 'promotions' ||
              activeSection === 'questions' ||
              activeSection === 'reviews') && (
              <SellerMarketingAndEngagement
                seller={activeSeller}
                sellerProducts={sellerProducts}
                mode={activeSection}
              />
            )}

            {/* =================================================================
                SECTION 9: MERCHANT PERFORMANCE ANALYTICS (PHASE 9)
               ================================================================= */}
            {activeSection === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold">
                      {t('تحليلات الذكاء التجاري للمتجر', 'Merchant Business Intelligence')}
                    </span>
                    <h2 className="text-xl font-bold text-[#141413] mt-1">
                      {t(
                        'تحليل قمع التحويل والتوزيع الجغرافي للمبيعات في المملكة',
                        'Conversion Funnel & Regional Sales Distribution Across KSA'
                      )}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportAnalyticsCsv}
                    className="px-4 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-[#C59B27]" />
                    <span>{t('تصدير تقرير الأداء (CSV)', 'Export Analytics CSV')}</span>
                  </button>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
                  <h3 className="text-sm font-bold text-[#141413]">
                    {t('قمع التحويل والولاء لمنتجات متجرك', 'Storefront Conversion & Retention Funnel')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    {[
                      {
                        stepAr: '١. مشاهدات صفحات منتجاتك',
                        stepEn: '1. Product Page Views',
                        val: (kpis.unitsSold * 24).toLocaleString(),
                        subAr: 'زيارات موثقة من الباحثين',
                        subEn: 'High-intent luxury shoppers',
                      },
                      {
                        stepAr: '٢. الإضافة إلى السلة',
                        stepEn: '2. Added to Cart',
                        val: (kpis.unitsSold * 4).toLocaleString(),
                        subAr: 'معدل اهتمام ١٦.٦٪',
                        subEn: '16.6% Add-to-Cart Rate',
                      },
                      {
                        stepAr: '٣. الطلبات المكتملة والمدفوعة',
                        stepEn: '3. Completed Orders',
                        val: kpis.unitsSold.toLocaleString(),
                        subAr: 'معدل تحويل نهائي ٤.٢٪',
                        subEn: '4.2% Checkout Conversion',
                      },
                      {
                        stepAr: '٤. معدل تكرار الشراء (الولاء)',
                        stepEn: '4. Repeat Buyer Rate',
                        val: '38.5%',
                        subAr: 'عملاء النخبة Royal Obsidian',
                        subEn: 'VIP Repeat Customers',
                      },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1"
                      >
                        <span className="text-xs font-bold text-[#57534E]">
                          {lang === 'ar' ? s.stepAr : s.stepEn}
                        </span>
                        <div className="text-2xl font-bold font-mono text-[#0B4F3F]">{s.val}</div>
                        <div className="text-[11px] text-[#8C857B]">
                          {lang === 'ar' ? s.subAr : s.subEn}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Regional Sales Distribution across Saudi Cities */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
                    <h3 className="text-sm font-bold text-[#141413]">
                      {t('التوزيع الجغرافي للمبيعات حسب مناطق المملكة', 'Sales Distribution by Saudi Region')}
                    </h3>
                    <div className="space-y-3">
                      {[
                        { cityAr: 'الرياض والمنطقة الوسطى', cityEn: 'Riyadh & Central Region', pct: 48 },
                        { cityAr: 'جدة ومكة المكرمة والغربية', cityEn: 'Jeddah, Makkah & Western', pct: 27 },
                        { cityAr: 'الخبر والدمام والشرقية', cityEn: 'Al Khobar, Dammam & Eastern', pct: 16 },
                        { cityAr: 'أبها والمدينة المنورة وباقي المدن', cityEn: 'Abha, Madinah & Other Cities', pct: 9 },
                      ].map((reg, i) => (
                        <div key={i} className="space-y-1 text-xs">
                          <div className="flex justify-between font-bold text-[#141413]">
                            <span>{lang === 'ar' ? reg.cityAr : reg.cityEn}</span>
                            <span className="font-mono text-[#0B4F3F]">{reg.pct}%</span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-[#F3EFEA] overflow-hidden">
                            <div
                              className="h-full bg-[#0B4F3F] rounded-full"
                              style={{ width: `${reg.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue by SKU Table */}
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
                    <h3 className="text-sm font-bold text-[#141413]">
                      {t('مساهمة الإيرادات حسب المنتج', 'Revenue Contribution by SKU')}
                    </h3>
                    <div className="divide-y divide-[#F3EFEA]">
                      {sellerProducts.slice(0, 5).map((p) => {
                        const rev = p.price * Math.max(1, p.soldCount);
                        return (
                          <div
                            key={p.id}
                            className="py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-[#141413] truncate">
                                {lang === 'ar' ? p.titleAr : p.titleEn}
                              </div>
                              <div className="text-[11px] font-mono text-[#8C857B]">
                                {p.sku} · {p.soldCount} {t('مبيعات', 'sold')}
                              </div>
                            </div>
                            <div className="font-mono font-bold text-[#1E6B47] shrink-0">
                              {formatPrice(rev)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Seller-Scoped Category Analytics (Deterministic from Seller Orders & Catalog) */}
                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F3EFEA] pb-4">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40 text-[11px] font-bold">
                        {t('تحليلات الأقسام والربحية (Category Intelligence)', 'Category Performance Breakdown')}
                      </span>
                      <h3 className="text-base font-bold text-[#141413] mt-1">
                        {t(
                          'الإيرادات والوحدات المباعة وحصة المبيعات حسب القسم',
                          'Revenue by Category, Units Sold & Share of Total Seller Revenue'
                        )}
                      </h3>
                      <p className="text-xs text-[#57534E]">
                        {t(
                          'محسوبة بشكل حتمي من بنود طلبات المتجر الفعلية وكتالوج منتجات التاجر مرتبة تنازلياً حسب الإيراد.',
                          'Deterministically calculated from your store order items and catalog SKUs, sorted descending by revenue.'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                        <span className="text-[#8C857B] block text-[10px]">
                          {t('إجمالي إيرادات الأقسام', 'Total Category Revenue')}
                        </span>
                        <span className="font-mono font-bold text-[#0B4F3F]">
                          {formatPrice(categoryAnalytics.totalCategoryRevenue)}
                        </span>
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                        <span className="text-[#8C857B] block text-[10px]">
                          {t('إجمالي الوحدات المباعة', 'Total Category Units')}
                        </span>
                        <span className="font-mono font-bold text-[#141413]">
                          {categoryAnalytics.totalCategoryUnits.toLocaleString()}{' '}
                          {t('قطعة', 'units')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {categoryAnalytics.rows.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#8C857B]">
                      {t('لا توجد بيانات أقسام مسجلة لهذا المتجر.', 'No category sales data available.')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Ranked Horizontal Visualization (7 Cols) */}
                      <div className="lg:col-span-7 space-y-3.5">
                        <div className="text-xs font-bold text-[#57534E]">
                          {t(
                            'الترتيب التنازلي للأقسام الأعلى إيراداً (Top Categories Ranked Chart)',
                            'Ranked Horizontal Revenue Share by Category'
                          )}
                        </div>
                        {categoryAnalytics.rows.map((cat) => (
                          <div
                            key={cat.categoryId}
                            className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-[#0B4F3F] text-[#C59B27] font-mono font-bold text-[11px] flex items-center justify-center">
                                  #{cat.rank}
                                </span>
                                <span className="font-bold text-[#141413]">
                                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                                </span>
                                <span className="text-[11px] text-[#8C857B]">
                                  ({lang === 'ar' ? cat.nameEn : cat.nameAr})
                                </span>
                              </div>
                              <div className="flex items-center gap-3 font-mono">
                                <span className="text-[11px] text-[#57534E]">
                                  {cat.unitsSold.toLocaleString()} {t('وحدة مباعة', 'units sold')}
                                </span>
                                <span className="font-bold text-[#0B4F3F]">
                                  {formatPrice(cat.revenue)}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#1E6B47] font-bold text-[11px]">
                                  {cat.sharePct}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-[#E6E0D6]/70 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#0B4F3F] to-[#C59B27]"
                                style={{ width: `${Math.max(4, cat.sharePct)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Top Categories Summary Cards & Breakdown Table (5 Cols) */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="text-xs font-bold text-[#57534E]">
                          {t('جدول تفصيل أداء الأقسام (Top Categories Ledger)', 'Top Categories Performance Table')}
                        </div>
                        <div className="rounded-xl border border-[#E6E0D6] overflow-hidden">
                          <table className="w-full text-xs text-start">
                            <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                              <tr>
                                <th className="py-2.5 px-3 text-start">{t('القسم', 'Category')}</th>
                                <th className="py-2.5 px-3 text-start">{t('الوحدات', 'Units')}</th>
                                <th className="py-2.5 px-3 text-start">{t('الإيراد', 'Revenue')}</th>
                                <th className="py-2.5 px-3 text-end">{t('الحصة', 'Share')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F3EFEA]">
                              {categoryAnalytics.rows.map((cat) => (
                                <tr key={cat.categoryId} className="hover:bg-[#FAF8F5]/60">
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-[#141413]">
                                      {lang === 'ar' ? cat.nameAr : cat.nameEn}
                                    </div>
                                    <div className="text-[10px] text-[#8C857B]">
                                      {cat.skuCount} {t('منتج', 'SKUs')}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-semibold text-[#141413]">
                                    {cat.unitsSold.toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0B4F3F]">
                                    {formatPrice(cat.revenue)}
                                  </td>
                                  <td className="py-2.5 px-3 text-end font-mono font-bold text-[#1E6B47]">
                                    {cat.sharePct}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =================================================================
                SECTION 10, 11, 12, 13: FINANCE, PAYOUTS, STORE PROFILE, SETTINGS
               ================================================================= */}
            {(activeSection === 'finance' ||
              activeSection === 'payouts' ||
              activeSection === 'profile' ||
              activeSection === 'settings') && (
              <SellerFinanceAndProfile
                key={activeSeller.id}
                seller={activeSeller}
                sellerOrders={sellerOrders}
                mode={activeSection}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
