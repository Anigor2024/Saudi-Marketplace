'use client';

import React, { useState, useMemo } from 'react';
import {
  Store,
  Package,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  SlidersHorizontal,
  Eye,
  Edit3,
  Trash2,
  Star,
  Award,
  Sparkles,
  TrendingUp,
  Flame,
  Calendar,
  Percent,
  Building2,
  Lock,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  Product,
  ProductStatus,
  Seller,
  SellerStatus,
  calculateSellerPayoutReservation,
} from '@/lib/types';
import { maskIban } from '@/lib/utils';

interface AdminSellersAndProductsProps {
  section?: 'sellers' | 'products';
  activeSection?: 'sellers' | 'products';
}

export default function AdminSellersAndProducts({
  section,
  activeSection,
}: AdminSellersAndProductsProps) {
  const effectiveSection = section || activeSection || 'sellers';
  const {
    lang,
    t,
    formatPrice,
    sellers,
    users,
    tickets,
    products,
    categories,
    brands,
    updateSellerStatus,
    requestSellerApplicationInfo,
    updateSellerCommissionRate,
    toggleSellerVerification,
    moderateProduct,
    bulkUpdateProductStatus,
    deleteProduct,
  } = useMarketplace();

  // ============================================================================
  // 1. SELLERS GOVERNANCE STATE
  // ============================================================================
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<'all' | SellerStatus>('all');
  const [sellerCityFilter, setSellerCityFilter] = useState<string>('all');
  const [sellerCategoryFilter, setSellerCategoryFilter] = useState<string>('all');
  const [sellerSortBy, setSellerSortBy] = useState<
    'pending_first' | 'newest' | 'highest_sales' | 'highest_rating' | 'highest_balance'
  >('pending_first');
  const [inspectingSellerId, setInspectingSellerId] = useState<string | null>(null);
  const [commissionDraft, setCommissionDraft] = useState<number>(10);
  const [infoRequestSellerId, setInfoRequestSellerId] = useState<string | null>(null);
  const [infoRequestNote, setInfoRequestNote] = useState<string>('');

  const inspectingSeller = useMemo(
    () => sellers.find((s) => s.id === inspectingSellerId) || null,
    [sellers, inspectingSellerId]
  );

  const sellerStats = useMemo(() => {
    const approved = sellers.filter((s) => s.status === 'approved').length;
    const pending = sellers.filter((s) => s.status === 'pending').length;
    const suspended = sellers.filter((s) => s.status === 'suspended' || s.status === 'rejected').length;
    const totalCommission = sellers.reduce((sum, s) => sum + s.platformCommission, 0);
    const totalGross = sellers.reduce((sum, s) => sum + s.grossSales, 0);
    return {
      total: sellers.length,
      approved,
      pending,
      suspended,
      totalCommission,
      totalGross,
    };
  }, [sellers]);

  const filteredSellers = useMemo(() => {
    const q = sellerSearch.trim().toLowerCase();
    const list = sellers.filter((s) => {
      if (sellerStatusFilter !== 'all' && s.status !== sellerStatusFilter) return false;
      if (sellerCityFilter !== 'all' && s.cityAr !== sellerCityFilter && s.cityEn !== sellerCityFilter) {
        return false;
      }
      if (sellerCategoryFilter !== 'all' && !s.categories.includes(sellerCategoryFilter)) {
        return false;
      }
      if (!q) return true;
      return (
        s.nameAr.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.crNumber.toLowerCase().includes(q) ||
        s.vatNumber.toLowerCase().includes(q) ||
        s.cityAr.toLowerCase().includes(q) ||
        s.cityEn.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sellerSortBy === 'pending_first') {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return b.grossSales - a.grossSales;
      }
      if (sellerSortBy === 'newest') {
        return (b.joinedAt || '').localeCompare(a.joinedAt || '');
      }
      if (sellerSortBy === 'highest_sales') {
        return b.grossSales - a.grossSales;
      }
      if (sellerSortBy === 'highest_rating') {
        return b.rating - a.rating;
      }
      if (sellerSortBy === 'highest_balance') {
        return b.availableBalance - a.availableBalance;
      }
      return 0;
    });
  }, [
    sellers,
    sellerSearch,
    sellerStatusFilter,
    sellerCityFilter,
    sellerCategoryFilter,
    sellerSortBy,
  ]);

  const openSellerInspector = (seller: Seller) => {
    setInspectingSellerId(seller.id);
    setCommissionDraft(seller.commissionRate);
  };

  const openInfoRequestModal = (seller: Seller) => {
    setInfoRequestSellerId(seller.id);
    setInfoRequestNote(
      lang === 'ar'
        ? `يرجى تزويد فريق التوثيق بنسخة محدثة من السجل التجاري (${seller.crNumber}) وشهادة التسجيل في ضريبة القيمة المضافة وخطاب الآيبان البنكي المصادق لاستكمال اعتماد متجر «${seller.nameAr}».`
        : `Please provide an updated copy of Commercial Registration (${seller.crNumber}), active ZATCA VAT certificate, and stamped bank IBAN letter to complete approval for "${seller.nameEn}".`
    );
  };

  const handleConfirmInfoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoRequestSellerId) return;
    await requestSellerApplicationInfo(infoRequestSellerId, infoRequestNote);
    setInfoRequestSellerId(null);
    setInfoRequestNote('');
  };

  // ============================================================================
  // 2. PRODUCTS & CATALOG MODERATION STATE
  // ============================================================================
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | ProductStatus>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productBrandFilter, setProductBrandFilter] = useState<string>('all');
  const [productSellerFilter, setProductSellerFilter] = useState<string>('all');
  const [productStockFilter, setProductStockFilter] = useState<
    'all' | 'healthy' | 'low' | 'critical' | 'out_of_stock'
  >('all');
  const [productFlagFilter, setProductFlagFilter] = useState<
    'all' | 'featured' | 'trending' | 'best_seller' | 'new_arrival' | 'flash_deal' | 'seasonal'
  >('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [moderatingProductId, setModeratingProductId] = useState<string | null>(null);

  // Moderation Modal Form State
  const [modStatus, setModStatus] = useState<ProductStatus>('active');
  const [modPrice, setModPrice] = useState<number>(0);
  const [modOriginalPrice, setModOriginalPrice] = useState<number>(0);
  const [modStock, setModStock] = useState<number>(0);
  const [modThreshold, setModThreshold] = useState<number>(5);
  const [modFeatured, setModFeatured] = useState<boolean>(false);
  const [modTrending, setModTrending] = useState<boolean>(false);
  const [modBestSeller, setModBestSeller] = useState<boolean>(false);
  const [modNewArrival, setModNewArrival] = useState<boolean>(false);
  const [modFlashDeal, setModFlashDeal] = useState<boolean>(false);
  const [modSeasonal, setModSeasonal] = useState<boolean>(false);
  const [modReason, setModReason] = useState<string>('');

  const moderatingProduct = useMemo(
    () => products.find((p) => p.id === moderatingProductId) || null,
    [products, moderatingProductId]
  );

  const openProductModeration = (prod: Product) => {
    setModeratingProductId(prod.id);
    setModStatus(prod.status);
    setModPrice(prod.price);
    setModOriginalPrice(prod.originalPrice);
    setModStock(prod.stock);
    setModThreshold(prod.lowStockThreshold);
    setModFeatured(Boolean(prod.isFeatured));
    setModTrending(Boolean(prod.isTrending));
    setModBestSeller(Boolean(prod.isBestSeller));
    setModNewArrival(Boolean(prod.isNewArrival));
    setModFlashDeal(Boolean(prod.isFlashDeal));
    setModSeasonal(Boolean(prod.isSeasonal));
    setModReason('');
  };

  const handleSaveProductModeration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moderatingProduct) return;
    const discountPercent =
      modOriginalPrice > modPrice
        ? Math.round(((modOriginalPrice - modPrice) / modOriginalPrice) * 100)
        : 0;
    const reasonAr =
      modReason.trim() ||
      `مراجعة إدارية وتحديث حالة وعرض المنتج «${moderatingProduct.titleAr}» (${modStatus})`;
    const reasonEn =
      modReason.trim() ||
      `Executive moderation & merchandising update for "${moderatingProduct.titleEn}" (${modStatus})`;

    await moderateProduct(
      moderatingProduct.id,
      {
        status: modStatus,
        price: Math.max(1, modPrice),
        originalPrice: Math.max(modPrice, modOriginalPrice),
        discountPercent,
        stock: Math.max(0, modStock),
        lowStockThreshold: Math.max(1, modThreshold),
        isFeatured: modFeatured,
        isTrending: modTrending,
        isBestSeller: modBestSeller,
        isNewArrival: modNewArrival,
        isFlashDeal: modFlashDeal,
        isSeasonal: modSeasonal,
      },
      reasonAr,
      reasonEn
    );
    setModeratingProductId(null);
  };

  const productStats = useMemo(() => {
    const active = products.filter((p) => p.status === 'active').length;
    const outOfStock = products.filter((p) => p.stock <= 0 || p.status === 'out_of_stock').length;
    const criticalOrLow = products.filter(
      (p) => p.stock > 0 && p.stock <= p.lowStockThreshold && p.status !== 'out_of_stock'
    ).length;
    const suspendedOrDraft = products.filter(
      (p) => p.status === 'suspended' || p.status === 'draft'
    ).length;
    const featuredOrFlash = products.filter((p) => p.isFeatured || p.isFlashDeal).length;
    return {
      total: products.length,
      active,
      outOfStock,
      criticalOrLow,
      suspendedOrDraft,
      featuredOrFlash,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (productStatusFilter !== 'all' && p.status !== productStatusFilter) return false;
      if (productCategoryFilter !== 'all' && p.categoryId !== productCategoryFilter) return false;
      if (productBrandFilter !== 'all' && p.brandId !== productBrandFilter) return false;
      if (productSellerFilter !== 'all' && p.sellerId !== productSellerFilter) return false;

      // Separate Stock Health Filter (never mixed with merchandising flags)
      if (productStockFilter !== 'all') {
        const threshold = p.lowStockThreshold || 5;
        const criticalLimit = Math.max(1, Math.floor(threshold / 2));
        const isOut = p.stock <= 0 || p.status === 'out_of_stock';
        const isCritical = !isOut && p.stock > 0 && p.stock <= criticalLimit;
        const isLow = !isOut && p.stock > criticalLimit && p.stock <= threshold;
        const isHealthy = !isOut && p.stock > threshold;

        if (productStockFilter === 'out_of_stock' && !isOut) return false;
        if (productStockFilter === 'critical' && !isCritical) return false;
        if (productStockFilter === 'low' && !isLow) return false;
        if (productStockFilter === 'healthy' && !isHealthy) return false;
      }

      // Merchandising Flag Filter
      if (productFlagFilter === 'featured' && !p.isFeatured) return false;
      if (productFlagFilter === 'trending' && !p.isTrending) return false;
      if (productFlagFilter === 'best_seller' && !p.isBestSeller) return false;
      if (productFlagFilter === 'new_arrival' && !p.isNewArrival) return false;
      if (productFlagFilter === 'flash_deal' && !p.isFlashDeal) return false;
      if (productFlagFilter === 'seasonal' && !p.isSeasonal) return false;

      if (!q) return true;
      return (
        p.titleAr.toLowerCase().includes(q) ||
        p.titleEn.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.sellerNameAr.toLowerCase().includes(q) ||
        p.sellerNameEn.toLowerCase().includes(q) ||
        p.brandNameAr.toLowerCase().includes(q) ||
        p.brandNameEn.toLowerCase().includes(q)
      );
    });
  }, [
    products,
    productSearch,
    productStatusFilter,
    productCategoryFilter,
    productBrandFilter,
    productSellerFilter,
    productStockFilter,
    productFlagFilter,
  ]);

  const toggleSelectProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleSelectAllFiltered = () => {
    const allFilteredIds = filteredProducts.map((p) => p.id);
    const allSelected =
      allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      setSelectedProductIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedProductIds(Array.from(new Set([...selectedProductIds, ...allFilteredIds])));
    }
  };

  const handleBulkStatus = async (status: ProductStatus) => {
    if (selectedProductIds.length === 0) return;
    await bulkUpdateProductStatus(selectedProductIds, status);
    setSelectedProductIds([]);
  };

  // ============================================================================
  // RENDER: SELLERS GOVERNANCE
  // ============================================================================
  if (effectiveSection === 'sellers') {
    return (
      <div className="space-y-6">
        {/* Section Header */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#0B4F3F]">
              {t('حوكمة المتاجر والامتثال التجاري', 'Merchant Governance & Compliance')}
            </div>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t('إدارة التجار المعتمدين وطلبات الانضمام', 'Verified Sellers & Onboarding Registry')}
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              {t(
                'فحص السجل التجاري والرقم الضريبي ZATCA، اعتماد المتاجر الجديدة، ضبط نسب عمولة المنصة، وإدارة شارات التوثيق.',
                'Verify Saudi Commercial Registration (CR) & ZATCA VAT, approve onboarding applications, configure commission rates, and manage boutique verification.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {sellerStats.pending > 0 && (
              <button
                type="button"
                onClick={() => setSellerStatusFilter('pending')}
                className="px-4 py-2 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/50 text-xs font-bold text-[#141413] hover:bg-[#F5E6C8]/60 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4 text-[#B7791F]" />
                <span>
                  {t(
                    `${sellerStats.pending} طلبات انضمام بانتظار الاعتماد`,
                    `${sellerStats.pending} Pending Onboarding Applications`
                  )}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">
              {t('إجمالي المتاجر المسجلة', 'Total Registered Sellers')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#141413] mt-1.5">
              {sellerStats.total}
            </div>
            <div className="text-[11px] text-[#57534E] mt-1">
              {t('في مختلف مناطق المملكة', 'Across Saudi regions')}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">
              {t('متاجر معتمدة وموثقة', 'Approved & Verified')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1.5">
              {sellerStats.approved}
            </div>
            <div className="text-[11px] text-[#1B6B45] mt-1">
              {t('سجل تجاري وضريبي موثق', 'Verified CR & ZATCA VAT')}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">
              {t('بانتظار مراجعة الاعتماد', 'Pending Review')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#B7791F] mt-1.5">
              {sellerStats.pending}
            </div>
            <div className="text-[11px] text-[#8C857B] mt-1">
              {t('طلبات انضمام متاجر جديدة', 'New merchant applications')}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">
              {t('متاجر موقوفة أو مرفوضة', 'Suspended / Rejected')}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#9E2A2B] mt-1.5">
              {sellerStats.suspended}
            </div>
            <div className="text-[11px] text-[#8C857B] mt-1">
              {t('تخضع لمراجعة الامتثال', 'Compliance hold')}
            </div>
          </div>

          <div className="bg-[#141413] text-white rounded-2xl border border-[#C59B27]/30 p-4">
            <div className="text-xs text-[#D6D0C4]">
              {t('إجمالي عمولات المنصة المحققة', 'Platform Commission Earned')}
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#C59B27] mt-1.5">
              {formatPrice(sellerStats.totalCommission)}
            </div>
            <div className="text-[11px] text-[#8C857B] mt-1">
              {t('من إجمالي مبيعات', 'From GMV')} {formatPrice(sellerStats.totalGross)}
            </div>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6E0D6]">
            {(
              [
                { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                { id: 'approved', labelAr: 'معتمد', labelEn: 'Approved' },
                { id: 'pending', labelAr: 'قيد المراجعة', labelEn: 'Pending' },
                { id: 'suspended', labelAr: 'موقوف', labelEn: 'Suspended' },
                { id: 'rejected', labelAr: 'مرفوض', labelEn: 'Rejected' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSellerStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  sellerStatusFilter === tab.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(tab.labelAr, tab.labelEn)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end">
            <select
              value={sellerCategoryFilter}
              onChange={(e) => setSellerCategoryFilter(e.target.value)}
              aria-label={t('تصفية حسب القسم', 'Filter by Category')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع الأقسام', 'All Categories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </option>
              ))}
            </select>

            <select
              value={sellerCityFilter}
              onChange={(e) => setSellerCityFilter(e.target.value)}
              aria-label={t('تصفية حسب المدينة', 'Filter by City')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع المدن', 'All Cities')}</option>
              <option value="الرياض">{t('الرياض', 'Riyadh')}</option>
              <option value="جدة">{t('جدة', 'Jeddah')}</option>
              <option value="الخبر">{t('الخبر', 'Al Khobar')}</option>
              <option value="الدمام">{t('الدمام', 'Dammam')}</option>
              <option value="بريدة">{t('بريدة', 'Buraidah')}</option>
            </select>

            <select
              value={sellerSortBy}
              onChange={(e) =>
                setSellerSortBy(
                  e.target.value as
                    | 'pending_first'
                    | 'newest'
                    | 'highest_sales'
                    | 'highest_rating'
                    | 'highest_balance'
                )
              }
              aria-label={t('ترتيب المتاجر', 'Sort Sellers')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="pending_first">
                {t('الترتيب: طلبات الاعتماد أولاً', 'Sort: Pending First')}
              </option>
              <option value="newest">
                {t('الترتيب: الأحدث انضماماً', 'Sort: Newest')}
              </option>
              <option value="highest_sales">
                {t('الترتيب: الأعلى مبيعات', 'Sort: Highest Sales')}
              </option>
              <option value="highest_rating">
                {t('الترتيب: الأعلى تقييماً', 'Sort: Highest Rating')}
              </option>
              <option value="highest_balance">
                {t('الترتيب: الأعلى رصيداً متاحاً', 'Sort: Highest Available Balance')}
              </option>
            </select>

            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
              <input
                type="text"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                placeholder={t(
                  'بحث باسم المتجر، المالك، السجل التجاري CR، أو الرقم الضريبي...',
                  'Search by boutique name, owner, CR #, or VAT #...'
                )}
                className="w-full ps-10 pe-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413] focus:outline-none focus:border-[#0B4F3F]"
              />
            </div>
          </div>
        </div>

        {/* Sellers Enterprise Table */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#FAF8F5] border-b border-[#E6E0D6] text-[#57534E]">
                <tr>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('المتجر والمالك', 'Boutique & Owner')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('بيانات الامتثال (CR / VAT / IBAN)', 'Compliance (CR / VAT / IBAN)')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('الحالة والتوثيق', 'Status & Verification')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('المبيعات الإجمالية', 'Gross Sales')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('عمولة المنصة', 'Commission')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('الرصيد المتاح', 'Available Balance')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('إجراءات الحوكمة', 'Governance Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFEA]">
                {filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8C857B]">
                      {t('لا توجد متاجر مطابقة لمعايير البحث الحالية.', 'No sellers match the current filters.')}
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((seller) => {
                    const sellerSkuCount = products.filter((p) => p.sellerId === seller.id).length;
                    return (
                      <tr key={seller.id} className="hover:bg-[#FAF8F5]/70 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-[#141413] text-sm">
                            {lang === 'ar' ? seller.nameAr : seller.nameEn}
                          </div>
                          <div className="text-[#57534E] mt-0.5">
                            {seller.ownerName} · {lang === 'ar' ? seller.cityAr : seller.cityEn} ·{' '}
                            <span className="font-mono tabular-nums">{sellerSkuCount} SKU</span>
                          </div>
                          <div className="text-[11px] text-[#8C857B] font-mono mt-0.5">
                            {seller.email} · {seller.phone}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono tabular-nums text-[11px] text-[#57534E] space-y-0.5">
                          <div>
                            CR: <span className="font-bold text-[#141413]">{seller.crNumber}</span>
                          </div>
                          <div>
                            VAT: <span className="font-bold text-[#141413]">{seller.vatNumber}</span>
                          </div>
                          <div className="text-[#8C857B]">IBAN: {maskIban(seller.iban)}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`text-xs font-bold ${
                                seller.status === 'approved'
                                  ? 'text-[#1B6B45]'
                                  : seller.status === 'pending'
                                  ? 'text-[#B7791F]'
                                  : 'text-[#9E2A2B]'
                              }`}
                            >
                              {seller.status === 'approved'
                                ? t('معتمد ونشط', 'Approved & Active')
                                : seller.status === 'pending'
                                ? t('بانتظار الاعتماد', 'Pending Onboarding')
                                : seller.status === 'suspended'
                                ? t('موقوف مؤقتاً', 'Suspended')
                                : t('مرفوض', 'Rejected')}
                            </span>
                            <span className="text-[11px] text-[#57534E]">
                              {seller.verifiedBadge
                                ? t('موثق رسمياً', 'Verified Boutique')
                                : t('غير موثق بعد', 'Unverified')}
                              {' · '}
                              <span className="font-mono tabular-nums">★ {seller.rating}</span>
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-end font-mono tabular-nums font-bold text-[#141413]">
                          {formatPrice(seller.grossSales)}
                        </td>

                        <td className="py-4 px-4 text-end font-mono tabular-nums">
                          <div className="font-bold text-[#0B4F3F]">
                            {formatPrice(seller.platformCommission)}
                          </div>
                          <div className="text-[11px] text-[#8C857B]">
                            {seller.status === 'pending' && seller.commissionRate === 0
                              ? t(
                                  'تُحدد عمولة المتجر عند الاعتماد وفق سياسة المنصة الحالية.',
                                  'Seller commission is assigned upon approval according to the current marketplace policy.'
                                )
                              : `${t('نسبة العمولة:', 'Rate:')} ${seller.commissionRate}%`}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-end font-mono tabular-nums">
                          {(() => {
                            const res = calculateSellerPayoutReservation(seller, tickets);
                            return (
                              <div className="space-y-0.5">
                                <div className="font-bold text-[#141413]">
                                  {formatPrice(res.availableBalance)}
                                </div>
                                {res.reservedPendingPayoutAmount > 0 && (
                                  <div className="text-[10px] text-[#B7791F]">
                                    {t('محجوز:', 'Reserved:')}{' '}
                                    {formatPrice(res.reservedPendingPayoutAmount)}
                                  </div>
                                )}
                                <div className="text-[10px] text-[#0B4F3F] font-semibold">
                                  {t('قابل للطلب:', 'Requestable:')}{' '}
                                  {formatPrice(res.requestableBalance)}
                                </div>
                              </div>
                            );
                          })()}
                        </td>

                        <td className="py-4 px-4 text-end">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            {seller.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => updateSellerStatus(seller.id, 'approved')}
                                className="px-2.5 py-1.5 rounded-lg bg-[#1B6B45] text-white text-[11px] font-bold hover:bg-[#145335] whitespace-nowrap"
                              >
                                {t('اعتماد وتوثيق', 'Approve')}
                              </button>
                            )}
                            {seller.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openInfoRequestModal(seller)}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#C59B27] bg-[#FBF7EC] text-[#141413] text-[11px] font-bold hover:bg-[#F5E6C8]/60 whitespace-nowrap"
                                >
                                  {t('طلب استكمال بيانات', 'Request More Info')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSellerStatus(seller.id, 'rejected')}
                                  className="px-2.5 py-1.5 rounded-lg border border-[#9E2A2B]/40 text-[#9E2A2B] text-[11px] font-bold hover:bg-red-50 whitespace-nowrap"
                                >
                                  {t('رفض', 'Reject')}
                                </button>
                              </>
                            )}
                            {seller.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => updateSellerStatus(seller.id, 'suspended')}
                                className="px-2.5 py-1.5 rounded-lg border border-[#9E2A2B]/30 text-[#9E2A2B] text-[11px] font-bold hover:bg-red-50 whitespace-nowrap"
                              >
                                {t('إيقاف مؤقت', 'Suspend')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openSellerInspector(seller)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[#141413] text-[11px] font-bold whitespace-nowrap"
                            >
                              {t('إدارة وفحص', 'Inspect & Rate')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Seller Inspector & Commission Governance Modal */}
        {inspectingSeller && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D6] pb-4">
                <div>
                  <div className="text-xs font-bold text-[#0B4F3F]">
                    {t('ملف الحوكمة والامتثال للمتجر', 'Merchant Compliance & Governance Dossier')}
                  </div>
                  <h3 className="text-xl font-bold text-[#141413] mt-1">
                    {lang === 'ar' ? inspectingSeller.nameAr : inspectingSeller.nameEn}
                  </h3>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    {inspectingSeller.ownerName} · {inspectingSeller.email} · {inspectingSeller.phone}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingSellerId(null)}
                  className="p-2 rounded-lg text-[#8C857B] hover:text-[#141413] hover:bg-[#FAF8F5]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Compliance & Financial Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2 text-xs">
                  <div className="font-bold text-[#141413]">
                    {t('وثائق التسجيل النظامي في المملكة', 'Saudi Commercial & Tax Credentials')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t('السجل التجاري (CR):', 'Commercial Reg (CR):')}</span>
                    <span className="font-mono font-bold text-[#141413]">{inspectingSeller.crNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t('الرقم الضريبي (ZATCA VAT):', 'ZATCA VAT Number:')}</span>
                    <span className="font-mono font-bold text-[#141413]">{inspectingSeller.vatNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t('الحساب البنكي المحجوب:', 'Masked Bank IBAN:')}</span>
                    <span className="font-mono font-bold text-[#141413]">{maskIban(inspectingSeller.iban)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t('تاريخ الانضمام:', 'Joined Date:')}</span>
                    <span className="font-mono text-[#141413]">{inspectingSeller.joinedAt}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E6E0D6]">
                    <span className="text-[#57534E]">{t('حساب المستخدم المرتبط:', 'Linked User Account:')}</span>
                    <span
                      className={`font-mono font-bold ${
                        inspectingSeller.applicantUserId &&
                        users.some((u) => u.id === inspectingSeller.applicantUserId)
                          ? 'text-[#1B6B45]'
                          : 'text-[#9E2A2B]'
                      }`}
                    >
                      {inspectingSeller.applicantUserId &&
                      users.some((u) => u.id === inspectingSeller.applicantUserId)
                        ? inspectingSeller.applicantUserId
                        : t('غير مرتبط بحساب صالح', 'Unlinked Legacy Record')}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2 text-xs">
                  <div className="font-bold text-[#141413]">
                    {t('الملخص المالي والتسويات', 'Financial & Settlement Summary')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t('إجمالي المبيعات (GMV):', 'Gross Sales (GMV):')}</span>
                    <span className="font-mono font-bold text-[#141413]">
                      {formatPrice(inspectingSeller.grossSales)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">
                      {t('عمولة المنصة المحصلة:', 'Platform Commission:')}{' '}
                      {inspectingSeller.status === 'pending' && inspectingSeller.commissionRate === 0
                        ? `(${t('تُحدد عند الاعتماد', 'Assigned on Approval')})`
                        : `(${inspectingSeller.commissionRate}%)`}
                    </span>
                    <span className="font-mono font-bold text-[#0B4F3F]">
                      {formatPrice(inspectingSeller.platformCommission)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t('صافي أرباح التاجر:', 'Merchant Net Earnings:')}</span>
                    <span className="font-mono font-bold text-[#141413]">
                      {formatPrice(inspectingSeller.netEarnings)}
                    </span>
                  </div>
                  {(() => {
                    const res = calculateSellerPayoutReservation(inspectingSeller, tickets);
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#57534E]">
                            {t('الرصيد المتاح (Available Balance):', 'Available Balance:')}
                          </span>
                          <span className="font-mono font-bold text-[#1B6B45]">
                            {formatPrice(res.availableBalance)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#57534E]">
                            {t('طلبات التسوية المحجوزة:', 'Reserved Pending Payouts:')}
                          </span>
                          <span className="font-mono font-bold text-[#B7791F]">
                            {formatPrice(res.reservedPendingPayoutAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[#E6E0D6]">
                          <span className="text-[#57534E] font-semibold">
                            {t('الرصيد القابل للطلب حالياً:', 'Currently Requestable Balance:')}
                          </span>
                          <span className="font-mono font-bold text-[#0B4F3F]">
                            {formatPrice(res.requestableBalance)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Commission Rate Adjustment & Verification Controls */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#141413]">
                      {t('تعديل نسبة عمولة المنصة التعاقدية (%)', 'Contractual Platform Commission Rate (%)')}
                    </h4>
                    <p className="text-[11px] text-[#57534E]">
                      {t(
                        'تُحتسب العمولة تلقائياً على مبيعات التاجر ويتم توثيق التعديل في سجل الرقابة.',
                        'Applied to merchant gross sales and logged automatically in the executive audit trail.'
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={35}
                      step={0.5}
                      value={commissionDraft}
                      onChange={(e) => setCommissionDraft(Number(e.target.value))}
                      className="w-24 px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] font-mono text-xs font-bold text-center text-[#141413]"
                    />
                    <span className="text-xs font-bold text-[#57534E]">%</span>
                    <button
                      type="button"
                      onClick={() => updateSellerCommissionRate(inspectingSeller.id, commissionDraft)}
                      className="px-4 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30] whitespace-nowrap"
                    >
                      {t('حفظ نسبة العمولة', 'Save Commission Rate')}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E6E0D6] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#0B4F3F]" />
                    <span className="font-semibold text-[#141413]">
                      {t('شارة المتجر السعودي الموثوق:', 'Verified Saudi Boutique Badge:')}
                    </span>
                    <span className="text-[#57534E]">
                      {inspectingSeller.verifiedBadge ? t('مفعّلة', 'Active') : t('غير مفعّلة', 'Inactive')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSellerVerification(inspectingSeller.id, !inspectingSeller.verifiedBadge)
                    }
                    className="px-3.5 py-1.5 rounded-xl border border-[#E6E0D6] bg-white hover:border-[#0B4F3F] text-xs font-bold text-[#141413] whitespace-nowrap"
                  >
                    {inspectingSeller.verifiedBadge
                      ? t('إلغاء شارة التوثيق', 'Revoke Verified Badge')
                      : t('منح شارة التوثيق الرسمية', 'Grant Verified Badge')}
                  </button>
                </div>
              </div>

              {/* Status Decision Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E0D6]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSellerStatus(inspectingSeller.id, 'approved')}
                    className="px-4 py-2 rounded-xl bg-[#1B6B45] text-white text-xs font-bold hover:bg-[#145335] whitespace-nowrap"
                  >
                    {t('اعتماد وتفعيل المتجر', 'Approve & Activate Boutique')}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSellerStatus(inspectingSeller.id, 'suspended')}
                    className="px-4 py-2 rounded-xl border border-[#9E2A2B]/40 text-[#9E2A2B] text-xs font-bold hover:bg-red-50 whitespace-nowrap"
                  >
                    {t('إيقاف المتجر مؤقتاً', 'Suspend Boutique')}
                  </button>
                  {inspectingSeller.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => openInfoRequestModal(inspectingSeller)}
                        className="px-4 py-2 rounded-xl border border-[#C59B27] bg-[#FBF7EC] text-[#141413] text-xs font-bold hover:bg-[#F5E6C8]/60 whitespace-nowrap"
                      >
                        {t('طلب استكمال بيانات ومستندات', 'Request More Information')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSellerStatus(inspectingSeller.id, 'rejected')}
                        className="px-4 py-2 rounded-xl bg-red-50 text-[#9E2A2B] text-xs font-bold hover:bg-red-100 whitespace-nowrap"
                      >
                        {t('رفض طلب الانضمام', 'Reject Application')}
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingSellerId(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413]"
                >
                  {t('إغلاق النافذة', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request More Information Modal for Pending Seller Application */}
        {infoRequestSellerId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleConfirmInfoRequest}
              className="bg-white rounded-2xl border border-[#E6E0D6] max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#E6E0D6] pb-3">
                <div>
                  <div className="text-xs font-bold text-[#B7791F]">
                    {t('استكمال مسوغات التوثيق (seller_application_info)', 'Onboarding Verification Request')}
                  </div>
                  <h3 className="text-base font-bold text-[#141413] mt-0.5">
                    {t('إرسال طلب معلومات أو مستندات إضافية لمقدم الطلب', 'Request Additional Information from Applicant')}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoRequestSellerId(null)}
                  className="p-1.5 rounded-lg text-[#8C857B] hover:text-[#141413]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#57534E]">
                {t(
                  'سيتم إنشاء تذكرة رسمية موجهة مباشرة إلى حساب المستخدم مقدم الطلب (applicantUserId) بنوع workflowType = seller_application_info.',
                  'Creates an official Admin-originated ticket addressed to the applicant user account (workflowType = seller_application_info).'
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1.5">
                  {t('تفاصيل المستندات أو الإيضاحات المطلوبة', 'Required Documents / Clarification Details')}
                </label>
                <textarea
                  rows={4}
                  required
                  value={infoRequestNote}
                  onChange={(e) => setInfoRequestNote(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413] focus:outline-none focus:border-[#0B4F3F]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E0D6]">
                <button
                  type="button"
                  onClick={() => setInfoRequestSellerId(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413]"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30]"
                >
                  {t('إرسال طلب استكمال البيانات', 'Send Information Request')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: PRODUCTS & CATALOG MODERATION
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#0B4F3F]">
            {t('رقابة الكتالوج والتميز التسويقي', 'Catalog Governance & Merchandising')}
          </div>
          <h2 className="text-xl font-bold text-[#141413] mt-1">
            {t('إدارة ومراجعة المنتجات وعروض المنصة', 'Products Moderation & Curation Desk')}
          </h2>
          <p className="text-xs text-[#57534E] mt-1">
            {t(
              'فحص جودة المنتجات والأسعار، إدارة شارات التميز (مختارات أثيل، الأكثر مبيعاً، العروض الخاطفة، الموسمية)، ومراقبة المخزون الحرج.',
              'Moderate multi-vendor listings, control platform merchandising flags (Featured, Best Seller, Flash Deal, Seasonal), and supervise stock health.'
            )}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
          <div className="text-xs text-[#8C857B]">{t('إجمالي منتجات الكتالوج', 'Total Catalog SKUs')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#141413] mt-1">
            {productStats.total}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
          <div className="text-xs text-[#8C857B]">{t('منتجات نشطة بالمتجر', 'Active Storefront SKUs')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
            {productStats.active}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
          <div className="text-xs text-[#8C857B]">{t('مخزون منخفض أو حرج', 'Low / Critical Stock')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#B7791F] mt-1">
            {productStats.criticalOrLow}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
          <div className="text-xs text-[#8C857B]">{t('نفد من المخزون / موقوف', 'Out of Stock / Suspended')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#9E2A2B] mt-1">
            {productStats.outOfStock + productStats.suspendedOrDraft}
          </div>
        </div>
        <div className="bg-[#141413] text-white rounded-2xl border border-[#C59B27]/30 p-4">
          <div className="text-xs text-[#D6D0C4]">{t('مختارات وعروض خاطفة', 'Featured & Flash Deals')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#C59B27] mt-1">
            {productStats.featuredOrFlash}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6E0D6]">
            {(
              [
                { id: 'all', labelAr: 'جميع الحالات', labelEn: 'All Statuses' },
                { id: 'active', labelAr: 'نشط', labelEn: 'Active' },
                { id: 'out_of_stock', labelAr: 'نفد المخزون', labelEn: 'Out of Stock' },
                { id: 'draft', labelAr: 'مسودة', labelEn: 'Draft' },
                { id: 'suspended', labelAr: 'موقوف إدارياً', labelEn: 'Suspended' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProductStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  productStatusFilter === tab.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(tab.labelAr, tab.labelEn)}
              </button>
            ))}
          </div>

          {/* Merchandising Flag Filter (strictly merchandising, separated from stock health) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', labelAr: 'كل الشارات التسويقية', labelEn: 'All Merch Flags' },
                { id: 'featured', labelAr: 'مختارات أثيل', labelEn: 'Featured' },
                { id: 'best_seller', labelAr: 'الأكثر مبيعاً', labelEn: 'Best Seller' },
                { id: 'new_arrival', labelAr: 'وصل حديثاً', labelEn: 'New Arrival' },
                { id: 'flash_deal', labelAr: 'عرض خاطف', labelEn: 'Flash Deal' },
                { id: 'seasonal', labelAr: 'موسمي', labelEn: 'Seasonal' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setProductFlagFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                  productFlagFilter === f.id
                    ? 'bg-[#FBF7EC] border-[#C59B27] text-[#141413]'
                    : 'bg-white border-[#E6E0D6] text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(f.labelAr, f.labelEn)}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicated Stock Health Filter Row (Healthy / Low / Critical / Out of Stock) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F3EFEA]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#57534E] me-1">
              {t('حالة المخزون:', 'Stock Level:')}
            </span>
            {(
              [
                { id: 'all', labelAr: 'كل مستويات المخزون', labelEn: 'All Stock Levels' },
                { id: 'healthy', labelAr: 'متوفر (Healthy)', labelEn: 'Healthy' },
                { id: 'low', labelAr: 'منخفض (Low)', labelEn: 'Low' },
                { id: 'critical', labelAr: 'حرج (Critical)', labelEn: 'Critical' },
                { id: 'out_of_stock', labelAr: 'نفد من المخزون (Out of Stock)', labelEn: 'Out of Stock' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setProductStockFilter(st.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${
                  productStockFilter === st.id
                    ? 'bg-[#0B4F3F] border-[#0B4F3F] text-white'
                    : 'bg-[#FAF8F5] border-[#E6E0D6] text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(st.labelAr, st.labelEn)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F3EFEA]">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={productCategoryFilter}
              onChange={(e) => setProductCategoryFilter(e.target.value)}
              aria-label={t('تصفية حسب القسم', 'Filter by Category')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع الأقسام (١٦ قسماً)', 'All Categories (16)')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'ar' ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>

            <select
              value={productBrandFilter}
              onChange={(e) => setProductBrandFilter(e.target.value)}
              aria-label={t('تصفية حسب الماركة', 'Filter by Brand')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع الماركات العالمية والمحلية', 'All Brands')}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {lang === 'ar' ? b.nameAr : b.nameEn}
                </option>
              ))}
            </select>

            <select
              value={productSellerFilter}
              onChange={(e) => setProductSellerFilter(e.target.value)}
              aria-label={t('تصفية حسب المتجر', 'Filter by Seller')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع المتاجر المعتمدة', 'All Sellers')}</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === 'ar' ? s.nameAr : s.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={t(
                'بحث برمز SKU، اسم المنتج، الماركة، أو المتجر...',
                'Search by SKU, product title, brand, or seller...'
              )}
              className="w-full ps-10 pe-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413] focus:outline-none focus:border-[#0B4F3F]"
            />
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedProductIds.length > 0 && (
          <div className="p-3 rounded-xl bg-[#141413] text-white flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-bold">
              {t(
                `تم تحديد ${selectedProductIds.length} منتج لتنفيذ إجراء جماعي:`,
                `${selectedProductIds.length} products selected for bulk moderation:`
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('active')}
                className="px-3 py-1.5 rounded-lg bg-[#1B6B45] text-white font-bold hover:bg-[#145335] whitespace-nowrap"
              >
                {t('تفعيل المحدد', 'Activate Selected')}
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('suspended')}
                className="px-3 py-1.5 rounded-lg bg-[#9E2A2B] text-white font-bold hover:bg-red-800 whitespace-nowrap"
              >
                {t('إيقاف إداري للمحدد', 'Suspend Selected')}
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('out_of_stock')}
                className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-bold hover:bg-white/25 whitespace-nowrap"
              >
                {t('تعيين كنفد من المخزون', 'Mark Out of Stock')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedProductIds([])}
                className="px-2.5 py-1.5 text-[#D6D0C4] hover:text-white"
              >
                {t('إلغاء التحديد', 'Clear')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Enterprise Table */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#FAF8F5] border-b border-[#E6E0D6] text-[#57534E]">
              <tr>
                <th className="py-3.5 px-3 text-start w-10">
                  <button
                    type="button"
                    onClick={toggleSelectAllFiltered}
                    aria-label={t('تحديد الكل', 'Select All')}
                    className="text-[#57534E] hover:text-[#141413]"
                  >
                    {filteredProducts.length > 0 &&
                    filteredProducts.every((p) => selectedProductIds.includes(p.id)) ? (
                      <CheckSquare className="w-4 h-4 text-[#0B4F3F]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('المنتج ورمز SKU', 'Product & SKU')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('المتجر والقسم', 'Seller & Category')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('السعر (شامل ١٥٪)', 'Price (Incl. VAT)')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('المخزون والمبيعات', 'Stock & Sold')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('الشارات التسويقية', 'Merchandising Curation')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('إجراءات الرقابة', 'Moderation Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EFEA]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8C857B]">
                    {t('لا توجد منتجات مطابقة لمعايير التصفية الحالية.', 'No products match the selected filters.')}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isSelected = selectedProductIds.includes(prod.id);
                  const criticalLimit = Math.max(1, Math.floor(prod.lowStockThreshold / 2));
                  const stockState =
                    prod.stock <= 0 || prod.status === 'out_of_stock'
                      ? 'out'
                      : prod.stock <= criticalLimit
                      ? 'critical'
                      : prod.stock <= prod.lowStockThreshold
                      ? 'low'
                      : 'healthy';

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-[#FAF8F5]/70 transition-colors ${
                        isSelected ? 'bg-[#EBF3F0]/30' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectProduct(prod.id)}
                          className="text-[#57534E] hover:text-[#0B4F3F]"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#0B4F3F]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.images[0]}
                            alt={lang === 'ar' ? prod.titleAr : prod.titleEn}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-xl object-cover bg-[#FAF8F5] border border-[#E6E0D6] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[#141413] line-clamp-1">
                              {lang === 'ar' ? prod.titleAr : prod.titleEn}
                            </div>
                            <div className="text-[11px] text-[#8C857B] font-mono tabular-nums mt-0.5">
                              {prod.sku} · ★ {prod.rating} ({prod.reviewCount})
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#141413]">
                          {lang === 'ar' ? prod.sellerNameAr : prod.sellerNameEn}
                        </div>
                        <div className="text-[11px] text-[#57534E]">
                          {lang === 'ar' ? prod.subcategoryAr : prod.subcategoryEn}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-end font-mono tabular-nums">
                        <div className="font-bold text-[#141413]">{formatPrice(prod.price)}</div>
                        {prod.discountPercent > 0 && (
                          <div className="text-[11px] text-[#8C857B] line-through">
                            {formatPrice(prod.originalPrice)} (-{prod.discountPercent}%)
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-end font-mono tabular-nums">
                        <div
                          className={`font-bold ${
                            stockState === 'out' || prod.status === 'suspended'
                              ? 'text-[#9E2A2B]'
                              : stockState === 'critical'
                              ? 'text-[#C53030]'
                              : stockState === 'low'
                              ? 'text-[#B7791F]'
                              : 'text-[#1B6B45]'
                          }`}
                        >
                          {prod.stock} {t('قطعة', 'units')}
                        </div>
                        <div className="text-[11px] text-[#8C857B]">
                          {prod.status === 'suspended'
                            ? t('موقوف إدارياً', 'Suspended')
                            : stockState === 'out'
                            ? t('نفد المخزون', 'Out of Stock')
                            : stockState === 'critical'
                            ? t('مخزون حرج', 'Critical Stock')
                            : stockState === 'low'
                            ? t('مخزون منخفض', 'Low Stock')
                            : t('متوفر', 'Healthy')}{' '}
                          · {t('مباع:', 'Sold:')} {prod.soldCount}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              moderateProduct(
                                prod.id,
                                { isFeatured: !prod.isFeatured },
                                `${!prod.isFeatured ? 'إضافة' : 'إزالة'} المنتج «${prod.titleAr}» من مختارات أثيل المميزة`,
                                `${!prod.isFeatured ? 'Added' : 'Removed'} "${prod.titleEn}" featured flag`
                              )
                            }
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors whitespace-nowrap ${
                              prod.isFeatured
                                ? 'bg-[#0B4F3F] text-white border-[#0B4F3F]'
                                : 'bg-white text-[#57534E] border-[#E6E0D6] hover:border-[#0B4F3F]'
                            }`}
                          >
                            {t('مختارات', 'Featured')}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moderateProduct(
                                prod.id,
                                { isBestSeller: !prod.isBestSeller },
                                `${!prod.isBestSeller ? 'منح' : 'إلغاء'} شارة الأكثر مبيعاً للمنتج «${prod.titleAr}»`,
                                `${!prod.isBestSeller ? 'Granted' : 'Revoked'} Best Seller flag on "${prod.titleEn}"`
                              )
                            }
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors whitespace-nowrap ${
                              prod.isBestSeller
                                ? 'bg-[#C59B27] text-[#141413] border-[#C59B27]'
                                : 'bg-white text-[#57534E] border-[#E6E0D6] hover:border-[#C59B27]'
                            }`}
                          >
                            {t('الأكثر مبيعاً', 'Best Seller')}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              moderateProduct(
                                prod.id,
                                { isFlashDeal: !prod.isFlashDeal },
                                `${!prod.isFlashDeal ? 'إدراج' : 'إزالة'} المنتج «${prod.titleAr}» في العروض الخاطفة`,
                                `${!prod.isFlashDeal ? 'Enabled' : 'Disabled'} Flash Deal on "${prod.titleEn}"`
                              )
                            }
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors whitespace-nowrap ${
                              prod.isFlashDeal
                                ? 'bg-[#141413] text-[#F5E6C8] border-[#141413]'
                                : 'bg-white text-[#57534E] border-[#E6E0D6] hover:border-[#141413]'
                            }`}
                          >
                            {t('خاطف', 'Flash')}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {prod.status === 'suspended' ? (
                            <button
                              type="button"
                              onClick={() =>
                                moderateProduct(
                                  prod.id,
                                  { status: 'active' },
                                  `إعادة تفعيل المنتج «${prod.titleAr}» بعد المراجعة الإدارية`,
                                  `Restored product "${prod.titleEn}" to active status`
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-[#1B6B45] text-white text-[11px] font-bold hover:bg-[#145335] whitespace-nowrap"
                            >
                              {t('إعادة تفعيل', 'Restore')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                moderateProduct(
                                  prod.id,
                                  { status: 'suspended' },
                                  `إيقاف عرض المنتج «${prod.titleAr}» لمراجعة الجودة والامتثال`,
                                  `Suspended product "${prod.titleEn}" for compliance review`
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-[#9E2A2B]/30 text-[#9E2A2B] text-[11px] font-bold hover:bg-red-50 whitespace-nowrap"
                            >
                              {t('إيقاف', 'Suspend')}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openProductModeration(prod)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[#141413] text-[11px] font-bold whitespace-nowrap"
                          >
                            {t('تحرير ورقابة', 'Moderate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Moderation & Merchandising Modal */}
      {moderatingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProductModeration}
            className="bg-white rounded-2xl border border-[#E6E0D6] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D6] pb-4">
              <div>
                <div className="text-xs font-bold text-[#0B4F3F]">
                  {t('نافذة الرقابة والتسويق للمنتج', 'Executive Product Moderation & Merchandising')}
                </div>
                <h3 className="text-lg font-bold text-[#141413] mt-1">
                  {lang === 'ar' ? moderatingProduct.titleAr : moderatingProduct.titleEn}
                </h3>
                <p className="text-xs text-[#57534E] font-mono mt-0.5">
                  SKU: {moderatingProduct.sku} ·{' '}
                  {lang === 'ar' ? moderatingProduct.sellerNameAr : moderatingProduct.sellerNameEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModeratingProductId(null)}
                className="p-2 rounded-lg text-[#8C857B] hover:text-[#141413]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-[#141413] mb-1.5">
                  {t('حالة المنتج في المنصة', 'Storefront Listing Status')}
                </label>
                <select
                  value={modStatus}
                  onChange={(e) => setModStatus(e.target.value as ProductStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-semibold text-[#141413]"
                >
                  <option value="active">{t('نشط ومعروض للبيع (Active)', 'Active')}</option>
                  <option value="draft">{t('مسودة (Draft)', 'Draft')}</option>
                  <option value="out_of_stock">{t('نفد من المخزون (Out of Stock)', 'Out of Stock')}</option>
                  <option value="suspended">{t('موقوف إدارياً (Suspended)', 'Suspended by Admin')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#141413] mb-1.5">
                  {t('السعر الحالي شامل الضريبة (ر.س)', 'Current Price Incl. 15% VAT (SAR)')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={modPrice}
                  onChange={(e) => setModPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#141413] mb-1.5">
                  {t('السعر قبل الخصم (ر.س)', 'Original Price Before Discount (SAR)')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={modOriginalPrice}
                  onChange={(e) => setModOriginalPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-[#141413] mb-1.5">
                    {t('الكمية المتوفرة', 'Stock Units')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modStock}
                    onChange={(e) => setModStock(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#141413] mb-1.5">
                    {t('حد التنبيه', 'Low Threshold')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={modThreshold}
                    onChange={(e) => setModThreshold(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>
              </div>
            </div>

            {/* Platform Merchandising Checkboxes */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-3">
              <div className="text-xs font-bold text-[#141413]">
                {t('شارات الترويج والظهور في الواجهة الرئيسية (حصرياً للإدارة)', 'Platform Merchandising Badges (Admin-Controlled)')}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modFeatured}
                    onChange={(e) => setModFeatured(e.target.checked)}
                    className="rounded accent-[#0B4F3F]"
                  />
                  <span>{t('مختارات أثيل (Featured)', 'Featured Curation')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modTrending}
                    onChange={(e) => setModTrending(e.target.checked)}
                    className="rounded accent-[#0B4F3F]"
                  />
                  <span>{t('الأكثر رواجاً (Trending)', 'Trending Now')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modBestSeller}
                    onChange={(e) => setModBestSeller(e.target.checked)}
                    className="rounded accent-[#0B4F3F]"
                  />
                  <span>{t('الأكثر مبيعاً (Best Seller)', 'Best Seller')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modFlashDeal}
                    onChange={(e) => setModFlashDeal(e.target.checked)}
                    className="rounded accent-[#0B4F3F]"
                  />
                  <span>{t('عرض خاطف (Flash Deal)', 'Flash Deal')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modSeasonal}
                    onChange={(e) => setModSeasonal(e.target.checked)}
                    className="rounded accent-[#0B4F3F]"
                  />
                  <span>{t('تشكيلة موسمية (Seasonal)', 'Seasonal Collection')}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1.5">
                {t('سبب القرار الإداري (يوثق في سجل الرقابة Audit Log)', 'Moderation Audit Reason')}
              </label>
              <input
                type="text"
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder={t(
                  'مثال: اعتماد المنتج ضمن حملة مختارات الموسم الفاخرة بعد التحقق من الأصالة...',
                  'e.g. Verified authenticity and promoted to Featured Seasonal Curation...'
                )}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E6E0D6]">
              <button
                type="button"
                onClick={async () => {
                  await deleteProduct(moderatingProduct.id);
                  setModeratingProductId(null);
                }}
                className="px-3.5 py-2 rounded-xl border border-[#9E2A2B]/30 text-[#9E2A2B] text-xs font-bold hover:bg-red-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('حذف المنتج نهائياً', 'Delete Product')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModeratingProductId(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413]"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30]"
                >
                  {t('حفظ وتوثيق القرار', 'Save Moderation Decision')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
