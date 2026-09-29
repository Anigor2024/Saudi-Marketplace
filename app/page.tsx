'use client';

import React, { useState } from 'react';
import {
  Crown,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Star,
  Store,
  Package,
  Heart,
  SlidersHorizontal,
  RotateCcw,
  Lock,
  User,
  MapPin,
  Wallet,
  Sparkles,
  Truck,
  FileText,
  LogOut,
  Loader2,
  Building2,
} from 'lucide-react';
import { MarketplaceProvider, useMarketplace } from '../context/MarketplaceContext';
import { deriveAggregateOrderStatus } from '../lib/types';
import { buildSellerFulfillmentsForOrder } from '../lib/seed-catalog';
import { NavbarAndMegaMenu } from '../components/NavbarAndMegaMenu';
import { HomeView } from '../components/HomeView';
import { ProductCard } from '../components/ProductCard';
import { AuthViews } from '../components/AuthViews';
import { CheckoutView, OrderConfirmationView } from '../components/CheckoutAndConfirmationViews';
import SellerCenter from '../components/SellerCenter';
import { AdminConsole } from '../components/AdminConsole';

function MarketplaceShell() {
  const {
    lang,
    isRtl,
    t,
    formatPrice,
    activeView,
    navigateTo,
    selectedProductId,
    products,
    categories,
    brands,
    sellers,
    searchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedBrandId,
    setSelectedBrandId,
    selectedSellerId,
    sortBy,
    setSortBy,
    onlyInStock,
    onlyDiscounted,
    resetFilters,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    cartSummary,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
    wishlistIds,
    toggleWishlist,
    compareIds,
    clearCompare,
    orders,
    sellerFulfillments,
    reviews,
    cancelOrder,
    requestReturn,
    currentUser,
    isAuthLoading,
    isDemoMode,
    canAccessSellerDashboard,
    canAccessAdminDashboard,
    exitDemoMode,
    loginWithDemoRole,
    logout,
    updateUserProfile,
    setDefaultAddress,
    deleteAddress,
    submitSellerApplication,
    submitReview,
    questions,
    submitQuestion,
    toasts,
    dismissToast,
    publicPlatformSettings,
  } = useMarketplace();

  const [couponInput, setCouponInput] = useState('');
  const [selectedVariantsState, setSelectedVariantsState] = useState<Record<string, string>>({});
  const [productQty, setProductQty] = useState<number>(1);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [questionInput, setQuestionInput] = useState<string>('');

  // Account & Seller Application form state
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [showSellerAppForm, setShowSellerAppForm] = useState(false);
  const [storeNameAr, setStoreNameAr] = useState('');
  const [storeNameEn, setStoreNameEn] = useState('');
  const [storeCityAr, setStoreCityAr] = useState('الرياض');
  const [storeCrNumber, setStoreCrNumber] = useState('');
  const [storeVatNumber, setStoreVatNumber] = useState('');
  const [storeIban, setStoreIban] = useState('SA');
  const [storeDescAr, setStoreDescAr] = useState('');
  const [isSubmittingSellerApp, setIsSubmittingSellerApp] = useState(false);

  const DirArrow = isRtl ? ArrowLeft : ArrowRight;

  // Filtered catalog for search/category navigation from the shell
  const filteredProducts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (p.status !== 'active') return false;
      if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
      if (selectedBrandId !== 'all' && p.brandId !== selectedBrandId) return false;
      if (selectedSellerId !== 'all' && p.sellerId !== selectedSellerId) return false;
      if (onlyInStock && p.stock <= 0) return false;
      if (onlyDiscounted && p.discountPercent <= 0) return false;
      if (q) {
        const match =
          p.titleAr.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.brandNameAr.toLowerCase().includes(q) ||
          p.brandNameEn.toLowerCase().includes(q) ||
          p.sellerNameAr.toLowerCase().includes(q) ||
          p.subcategoryAr.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'best_selling') list.sort((a, b) => b.soldCount - a.soldCount);

    return list;
  }, [
    products,
    searchQuery,
    selectedCategoryId,
    selectedBrandId,
    selectedSellerId,
    onlyInStock,
    onlyDiscounted,
    sortBy,
  ]);

  const currentProduct = React.useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const handleSellerApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeNameAr.trim() || !storeCrNumber.trim() || !storeVatNumber.trim()) return;
    setIsSubmittingSellerApp(true);
    await submitSellerApplication({
      nameAr: storeNameAr.trim(),
      nameEn: storeNameEn.trim() || storeNameAr.trim(),
      cityAr: storeCityAr,
      cityEn: storeCityAr === 'الرياض' ? 'Riyadh' : storeCityAr === 'جدة' ? 'Jeddah' : 'Al Khobar',
      crNumber: storeCrNumber.trim(),
      vatNumber: storeVatNumber.trim(),
      iban: storeIban.trim(),
      descriptionAr: storeDescAr.trim(),
      descriptionEn: storeDescAr.trim(),
    });
    setIsSubmittingSellerApp(false);
    setShowSellerAppForm(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#141413]">
      {/* Top Bar, Header & Mega Menu */}
      <NavbarAndMegaMenu />

      {/* Main Content */}
      <main className="flex-1">
        {/* Global Auth Status Loading Guard for Protected Routes */}
        {isAuthLoading &&
        (activeView === 'checkout' ||
          activeView === 'orders' ||
          activeView === 'account' ||
          activeView === 'seller-dashboard' ||
          activeView === 'admin-dashboard') ? (
          <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#0B4F3F] animate-spin" />
            <p className="text-xs font-bold text-[#57534E]">
              {t('جاري التحقق من جلسة المصادقة الآمنة...', 'Verifying authenticated session...')}
            </p>
          </div>
        ) : (
          <>
            {/* 1. HOMEPAGE */}
            {activeView === 'home' && <HomeView />}

            {/* 2. AUTHENTICATION VIEWS (Login, Register, Forgot Password) */}
            {(activeView === 'login' ||
              activeView === 'register' ||
              activeView === 'forgot-password') && <AuthViews />}

            {/* 3. CHECKOUT & ORDER CONFIRMATION VIEWS */}
            {activeView === 'checkout' && <CheckoutView />}
            {activeView === 'order-confirmation' && <OrderConfirmationView />}

            {/* 4. SEARCH / CATALOG VIEW */}
            {activeView === 'search' && (
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E0D6]">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#8C857B]">
                      <button
                        type="button"
                        onClick={() => navigateTo('home')}
                        className="hover:text-[#0B4F3F]"
                      >
                        {t('الرئيسية', 'Home')}
                      </button>
                      <span>/</span>
                      <span className="text-[#141413] font-semibold">
                        {t('كتالوج المنتجات الفاخرة', 'Luxury Catalog')}
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#141413] mt-1">
                      {selectedCategoryId === 'all'
                        ? t('جميع المنتجات المختارة', 'All Curated Products')
                        : lang === 'ar'
                        ? categories.find((c) => c.id === selectedCategoryId)?.nameAr
                        : categories.find((c) => c.id === selectedCategoryId)?.nameEn}
                      <span className="text-sm font-normal text-[#8C857B] ms-2 font-mono">
                        ({filteredProducts.length})
                      </span>
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                    >
                      <option value="all">{t('كل الأقسام (١٦)', 'All Categories (16)')}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {lang === 'ar' ? cat.nameAr : cat.nameEn}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                    >
                      <option value="all">{t('كل الماركات', 'All Brands')}</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {lang === 'ar' ? b.nameAr : b.nameEn}
                        </option>
                      ))}
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as
                            | 'featured'
                            | 'price_asc'
                            | 'price_desc'
                            | 'rating'
                            | 'newest'
                            | 'best_selling'
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                    >
                      <option value="featured">{t('الأكثر تميزاً', 'Featured')}</option>
                      <option value="best_selling">{t('الأكثر مبيعاً', 'Best Selling')}</option>
                      <option value="rating">{t('الأعلى تقييماً', 'Highest Rated')}</option>
                      <option value="price_asc">
                        {t('السعر: من الأقل للأعلى', 'Price: Low to High')}
                      </option>
                      <option value="price_desc">
                        {t('السعر: من الأعلى للأقل', 'Price: High to Low')}
                      </option>
                    </select>

                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E6E0D6] hover:bg-[#F3EFEA] text-xs font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('إعادة ضبط', 'Reset')}</span>
                    </button>
                  </div>
                </div>

                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-12 text-center border border-[#E6E0D6] space-y-3">
                    <SlidersHorizontal className="w-8 h-8 text-[#C59B27] mx-auto" />
                    <h3 className="text-base font-bold text-[#141413]">
                      {t(
                        'لا توجد منتجات مطابقة للفلاتر المحددة',
                        'No products match the selected filters'
                      )}
                    </h3>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                    >
                      {t('إعادة تعيين الفلاتر', 'Reset All Filters')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 5. PRODUCT DETAILS VIEW */}
            {activeView === 'product' && currentProduct && (
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-10">
                <div className="flex items-center gap-2 text-xs text-[#8C857B]">
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="hover:text-[#0B4F3F]"
                  >
                    {t('الرئيسية', 'Home')}
                  </button>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => navigateTo('search', { categoryId: currentProduct.categoryId })}
                    className="hover:text-[#0B4F3F]"
                  >
                    {lang === 'ar' ? currentProduct.subcategoryAr : currentProduct.subcategoryEn}
                  </button>
                  <span>/</span>
                  <span className="text-[#141413] font-semibold truncate">
                    {lang === 'ar' ? currentProduct.titleAr : currentProduct.titleEn}
                  </span>
                </div>

                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-[#F6F3EE] border border-[#E6E0D6]">
                      <img
                        src={currentProduct.images[0]}
                        alt={lang === 'ar' ? currentProduct.titleAr : currentProduct.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                        <span className="font-bold text-[#0B4F3F]">
                          {lang === 'ar' ? currentProduct.brandNameAr : currentProduct.brandNameEn}
                        </span>
                        <span>·</span>
                        <span>SKU: {currentProduct.sku}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-[#B8860B] font-mono font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {currentProduct.rating} ({currentProduct.reviewCount})
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-3xl font-bold text-[#141413]">
                        {lang === 'ar' ? currentProduct.titleAr : currentProduct.titleEn}
                      </h1>

                      <p className="text-sm text-[#57534E] leading-relaxed">
                        {lang === 'ar'
                          ? currentProduct.descriptionAr
                          : currentProduct.descriptionEn}
                      </p>

                      <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex flex-wrap items-baseline justify-between gap-4">
                        <div>
                          <div className="text-2xl font-bold text-[#0B4F3F] font-mono">
                            {formatPrice(currentProduct.price)}
                          </div>
                          {currentProduct.originalPrice > currentProduct.price && (
                            <div className="text-xs text-[#8C857B] line-through font-mono">
                              {formatPrice(currentProduct.originalPrice)}
                            </div>
                          )}
                          <div className="text-[11px] text-[#8C857B] mt-1">
                            {t(
                              'السعر شامل ضريبة القيمة المضافة ١٥٪',
                              'Price includes 15% Saudi VAT'
                            )}
                          </div>
                        </div>

                        <div className="text-end text-xs">
                          <div className="font-bold text-[#141413] inline-flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-[#0B4F3F]" />
                            {lang === 'ar'
                              ? currentProduct.sellerNameAr
                              : currentProduct.sellerNameEn}
                          </div>
                          <div className="text-[#57534E] mt-1">
                            {lang === 'ar'
                              ? currentProduct.deliveryEstimateAr
                              : currentProduct.deliveryEstimateEn}
                          </div>
                        </div>
                      </div>

                      {/* Variant Selector if product has variants */}
                      {currentProduct.variants && currentProduct.variants.length > 0 && (
                        <div className="space-y-3 pt-1">
                          {currentProduct.variants.map((group) => {
                            const groupKey = lang === 'ar' ? group.nameAr : group.nameEn;
                            const activeVal =
                              selectedVariantsState[groupKey] ||
                              (lang === 'ar'
                                ? group.options[0]?.labelAr
                                : group.options[0]?.labelEn);
                            return (
                              <div key={group.id} className="space-y-1.5">
                                <label className="block text-xs font-bold text-[#141413]">
                                  {groupKey}: <span className="text-[#0B4F3F]">{activeVal}</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {group.options.map((opt) => {
                                    const optLabel = lang === 'ar' ? opt.labelAr : opt.labelEn;
                                    const isSelected = activeVal === optLabel;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() =>
                                          setSelectedVariantsState((prev) => ({
                                            ...prev,
                                            [groupKey]: optLabel,
                                          }))
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                          isSelected
                                            ? 'bg-[#0B4F3F] text-white border-[#0B4F3F]'
                                            : 'bg-[#FAF8F5] text-[#141413] border-[#E6E0D6] hover:border-[#141413]'
                                        }`}
                                      >
                                        {optLabel}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {currentProduct.specifications.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                          {currentProduct.specifications.map((spec, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between text-xs"
                            >
                              <span className="text-[#8C857B]">
                                {lang === 'ar' ? spec.keyAr : spec.keyEn}
                              </span>
                              <span className="font-bold text-[#141413]">
                                {lang === 'ar' ? spec.valueAr : spec.valueEn}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#E6E0D6]">
                      <div className="flex items-center border border-[#E6E0D6] rounded-xl bg-[#FAF8F5]">
                        <button
                          type="button"
                          onClick={() => setProductQty((q) => Math.max(1, q - 1))}
                          className="p-3 hover:text-[#0B4F3F]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-mono font-bold">{productQty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setProductQty((q) => Math.min(currentProduct.stock || 10, q + 1))
                          }
                          className="p-3 hover:text-[#0B4F3F]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          addToCart(
                            currentProduct,
                            Object.keys(selectedVariantsState).length > 0
                              ? selectedVariantsState
                              : undefined,
                            productQty
                          )
                        }
                        className="flex-1 py-3.5 px-6 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{t('إضافة إلى حقيبة التسوق', 'Add to Shopping Bag')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          addToCart(
                            currentProduct,
                            Object.keys(selectedVariantsState).length > 0
                              ? selectedVariantsState
                              : undefined,
                            productQty
                          );
                          navigateTo('checkout');
                        }}
                        className="py-3.5 px-6 rounded-xl bg-[#C59B27] hover:bg-[#b0891f] text-[#141413] font-bold text-sm transition-colors"
                      >
                        {t('شراء فوري', 'Buy Now')}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleWishlist(currentProduct.id)}
                        className="p-3.5 rounded-xl border border-[#E6E0D6] hover:bg-[#F3EFEA]"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            wishlistIds.includes(currentProduct.id)
                              ? 'text-[#9E2A2B] fill-current'
                              : 'text-[#141413]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product Reviews & Verified Purchase Verification Section */}
                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 lg:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F3EFEA] pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#141413]">
                        {t('تقييمات وتجارب العملاء', 'Customer Reviews & Verification')}
                      </h2>
                      <p className="text-xs text-[#57534E] mt-0.5">
                        {t(
                          'تُمنح شارة (مشتري موثق) تلقائياً فقط للعملاء الذين أتموا شراء واستلام المنتج فعلياً',
                          'The Verified Buyer badge is granted only to customers with a delivered order containing this product'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Add Review Form (gated by publicPlatformSettings.customerReviewsEnabled) */}
                    {publicPlatformSettings.customerReviewsEnabled ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!reviewComment.trim()) return;
                          setIsSubmittingReview(true);
                          await submitReview(
                            currentProduct.id,
                            reviewRating,
                            reviewTitle.trim() ||
                              (lang === 'ar' ? 'تجربة اقتناء مميزة' : 'Great Luxury Experience'),
                            reviewComment.trim()
                          );
                          setIsSubmittingReview(false);
                          setReviewTitle('');
                          setReviewComment('');
                        }}
                        className="lg:col-span-5 p-5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-3.5 self-start"
                      >
                        <h3 className="text-sm font-bold text-[#141413]">
                          {t('أضف تقييمك لهذا المنتج', 'Write a Product Review')}
                        </h3>

                        <div>
                          <label className="block text-xs font-bold text-[#141413] mb-1">
                            {t('درجة التقييم', 'Rating')}
                          </label>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setReviewRating(num)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                                  reviewRating >= num
                                    ? 'bg-[#C59B27] text-[#141413] border-[#C59B27]'
                                    : 'bg-white text-[#8C857B] border-[#E6E0D6]'
                                }`}
                              >
                                {num} ★
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#141413] mb-1">
                            {t('عنوان التقييم', 'Review Title')}
                          </label>
                          <input
                            type="text"
                            value={reviewTitle}
                            onChange={(e) => setReviewTitle(e.target.value)}
                            placeholder={t('مثال: جودة استثنائية وتغليف ملكي', 'Review headline')}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#141413] mb-1">
                            {t('تفاصيل تجربتك', 'Your Review Comment')}
                          </label>
                          <textarea
                            rows={3}
                            required
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder={t(
                              'شارك رأيك حول جودة المنتج ومطابقته للمواصفات...',
                              'Share your thoughts on product quality and authenticity...'
                            )}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingReview}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-60 text-white text-xs font-bold"
                        >
                          {isSubmittingReview
                            ? t('جاري النشر...', 'Publishing...')
                            : t('نشر التقييم الآن', 'Publish Review')}
                        </button>
                      </form>
                    ) : (
                      <div className="lg:col-span-5 p-5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2 self-start">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#B45309]">
                          <Lock className="w-4 h-4 shrink-0" />
                          <span>
                            {t(
                              'إضافة التقييمات الجديدة متوقفة مؤقتاً',
                              'New Review Submissions Temporarily Paused'
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-[#57534E] leading-relaxed">
                          {t(
                            'تظل جميع التقييمات السابقة متاحة للاطلاع، بينما تم إيقاف استقبال تقييمات جديدة مؤقتاً من إعدادات المنصة.',
                            'Existing verified reviews remain visible while new review submissions are temporarily paused by platform settings.'
                          )}
                        </p>
                      </div>
                    )}

                    {/* Existing Product Reviews List */}
                    <div className="lg:col-span-7 space-y-3">
                      {reviews.filter((r) => r.productId === currentProduct.id && r.status === 'approved')
                        .length === 0 ? (
                        <div className="p-8 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-center text-xs text-[#57534E]">
                          {t(
                            'كن أول من يشارك تجربته حول هذا المنتج الفاخر.',
                            'Be the first to review this luxury item.'
                          )}
                        </div>
                      ) : (
                        reviews
                          .filter((r) => r.productId === currentProduct.id && r.status === 'approved')
                          .map((rev) => (
                            <div
                              key={rev.id}
                              className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#141413]">
                                    {rev.userName}
                                  </span>
                                  {rev.verifiedPurchase ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>{t('مشتري موثق', 'Verified Purchase')}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F3EFEA] text-[#57534E] text-[10px] font-semibold">
                                      <span>{t('تقييم عضو عام', 'Member Review')}</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-mono font-bold text-[#B8860B]">
                                  {'★'.repeat(rev.rating)} ({rev.rating}/5)
                                </span>
                              </div>
                              {rev.title && (
                                <div className="text-xs font-bold text-[#141413]">{rev.title}</div>
                              )}
                              <p className="text-xs text-[#57534E] leading-relaxed">{rev.comment}</p>
                              <div className="text-[10px] font-mono text-[#8C857B]">
                                {rev.createdAt}
                              </div>
                              {(rev.sellerReplyAr || rev.sellerReplyEn) && (
                                <div className="mt-2.5 p-3 rounded-xl bg-[#EBF3F0]/80 border border-[#0B4F3F]/25 space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold text-[#0B4F3F] flex items-center gap-1.5">
                                      <Store className="w-3.5 h-3.5 text-[#C59B27]" />
                                      <span>
                                        {t('رد رسمي من البوتيك:', 'Official Boutique Reply:')}{' '}
                                        {lang === 'ar'
                                          ? currentProduct.sellerNameAr
                                          : currentProduct.sellerNameEn}
                                      </span>
                                    </span>
                                    {rev.sellerReplyAt && (
                                      <span className="text-[10px] font-mono text-[#57534E]">
                                        {rev.sellerReplyAt}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#141413] leading-relaxed">
                                    {lang === 'ar'
                                      ? rev.sellerReplyAr || rev.sellerReplyEn
                                      : rev.sellerReplyEn || rev.sellerReplyAr}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Q&A Section */}
                <div className="bg-white rounded-2xl p-6 border border-[#E6E0D6] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-3">
                    <div>
                      <h2 className="text-base font-bold text-[#141413]">
                        {t('الأسئلة والأجوبة حول المنتج', 'Product Questions & Answers')}
                      </h2>
                      <p className="text-xs text-[#8C857B] mt-0.5">
                        {t(
                          'استفسر مباشرة من التاجر المعتمد حول الخامة، المقاسات، أو التغليف',
                          'Ask the verified boutique directly about materials, sizing, or packaging'
                        )}
                      </p>
                    </div>
                    {publicPlatformSettings.productQuestionsEnabled ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          value={questionInput}
                          onChange={(e) => setQuestionInput(e.target.value)}
                          placeholder={t('اكتب سؤالك هنا عن المنتج...', 'Write your question about this product...')}
                          className="flex-1 sm:w-72 px-3.5 py-2 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] text-xs focus:outline-none focus:border-[#0B4F3F]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!questionInput.trim()) return;
                            submitQuestion(currentProduct.id, questionInput.trim());
                            setQuestionInput('');
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0B4F3F] hover:bg-[#083D30] text-white text-xs font-bold transition-all shrink-0"
                        >
                          {t('إرسال السؤال', 'Ask Boutique')}
                        </button>
                      </div>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-[#B45309]">
                        {t(
                          'إرسال الأسئلة الجديدة متوقف مؤقتاً (الأجوبة السابقة متاحة أدناه)',
                          'New Q&A submissions paused (existing Q&A visible below)'
                        )}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    {questions.filter((q) => q.productId === currentProduct.id).length === 0 ? (
                      <div className="p-6 rounded-xl bg-[#FAF8F5] text-center text-xs text-[#8C857B]">
                        {t(
                          'لا توجد استفسارات مسجلة لهذا المنتج حتى الآن. كن أول من يسأل البوتيك.',
                          'No questions asked for this product yet. Be the first to ask the boutique.'
                        )}
                      </div>
                    ) : (
                      questions
                        .filter((q) => q.productId === currentProduct.id)
                        .map((q) => {
                          const hasAnswer = Boolean(q.answerAr?.trim() || q.answerEn?.trim());
                          return (
                            <div
                              key={q.id}
                              className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-[#141413]">
                                  {t('سؤال من:', 'Question by:')} {q.userName}
                                </span>
                                <span className="text-[10px] font-mono text-[#8C857B]">
                                  {q.createdAt}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-[#141413]">
                                {lang === 'ar' ? q.questionAr : q.questionEn}
                              </p>
                              {hasAnswer ? (
                                <div className="p-3 rounded-xl bg-[#EBF3F0]/80 border border-[#0B4F3F]/25 space-y-1">
                                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#0B4F3F]">
                                    <span>
                                      {lang === 'ar'
                                        ? q.answeredByAr || currentProduct.sellerNameAr
                                        : q.answeredByEn || currentProduct.sellerNameEn}
                                    </span>
                                    {q.answeredAt && (
                                      <span className="text-[10px] font-mono text-[#57534E]">
                                        {q.answeredAt}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#141413] leading-relaxed">
                                    {lang === 'ar'
                                      ? q.answerAr || q.answerEn
                                      : q.answerEn || q.answerAr}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-[11px] text-[#B8860B] font-semibold">
                                  {t('بانتظار الرد الرسمي من البوتيك...', 'Awaiting official boutique response...')}
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 6. SHOPPING BAG / CART VIEW */}
            {activeView === 'cart' && (
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h1 className="text-2xl font-bold text-[#141413]">
                    {t('حقيبة التسوق الفاخرة', 'Shopping Bag')} ({cartSummary.itemCount})
                  </h1>
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="text-xs font-bold text-[#0B4F3F] hover:underline"
                  >
                    {t('← متابعة التسوق في أثيل', '← Continue Shopping')}
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-[#E6E0D6] space-y-4">
                    <ShoppingBag className="w-10 h-10 text-[#C59B27] mx-auto" />
                    <p className="text-base font-bold text-[#141413]">
                      {t('حقيبة التسوق فارغة حالياً', 'Your shopping bag is currently empty')}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('home')}
                      className="px-6 py-3 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                    >
                      {t('تصفح المنتجات الفاخرة', 'Explore Luxury Products')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-4">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white rounded-2xl p-5 border border-[#E6E0D6] flex flex-wrap sm:flex-nowrap items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={item.product.images[0]}
                              alt={lang === 'ar' ? item.product.titleAr : item.product.titleEn}
                              referrerPolicy="no-referrer"
                              className="w-20 h-20 rounded-xl object-cover bg-[#F3EFEA]"
                            />
                            <div>
                              <h3 className="text-sm font-bold text-[#141413]">
                                {lang === 'ar' ? item.product.titleAr : item.product.titleEn}
                              </h3>
                              <p className="text-xs text-[#8C857B] mt-0.5">
                                {lang === 'ar'
                                  ? item.product.sellerNameAr
                                  : item.product.sellerNameEn}
                              </p>
                              {Object.keys(item.selectedVariants).length > 0 && (
                                <p className="text-[11px] text-[#0B4F3F] mt-0.5">
                                  {Object.entries(item.selectedVariants)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(' · ')}
                                </p>
                              )}
                              <div className="text-sm font-bold text-[#0B4F3F] font-mono mt-1">
                                {formatPrice(item.unitPrice)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ms-auto">
                            <div className="flex items-center border border-[#E6E0D6] rounded-xl bg-[#FAF8F5]">
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                className="p-2 hover:text-[#0B4F3F]"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 text-xs font-mono font-bold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                className="p-2 hover:text-[#0B4F3F]"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="p-2 text-[#9E2A2B] hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="lg:col-span-4">
                      <div className="bg-white rounded-2xl p-6 border border-[#E6E0D6] space-y-4 sticky top-24">
                        <h2 className="text-base font-bold text-[#141413]">
                          {t('ملخص الفاتورة الضريبية', 'Tax Invoice Summary')}
                        </h2>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value)}
                            placeholder={t(
                              'رمز الكوبون (مثال: ATHEEL15)',
                              'Coupon code (ATHEEL15)'
                            )}
                            className="flex-1 px-3 py-2 rounded-xl border border-[#E6E0D6] text-xs font-mono uppercase"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (couponInput.trim()) applyCouponCode(couponInput.trim());
                            }}
                            className="px-4 py-2 rounded-xl bg-[#141413] text-white text-xs font-bold"
                          >
                            {t('تطبيق', 'Apply')}
                          </button>
                        </div>

                        {appliedCoupon && (
                          <div className="flex items-center justify-between text-xs bg-[#EBF3F0] text-[#0B4F3F] px-3 py-2 rounded-lg font-semibold">
                            <span>
                              {t('الكوبون المفعّل:', 'Active Coupon:')} {appliedCoupon.code}
                            </span>
                            <button type="button" onClick={removeCoupon} className="underline">
                              {t('إزالة', 'Remove')}
                            </button>
                          </div>
                        )}

                        <div className="space-y-2.5 text-xs border-t border-[#E6E0D6] pt-4">
                          <div className="flex justify-between">
                            <span className="text-[#57534E]">
                              {t('المجموع الفرعي (شامل الضريبة)', 'Subtotal (VAT Inclusive)')}
                            </span>
                            <span className="font-mono font-bold">
                              {formatPrice(cartSummary.subtotal)}
                            </span>
                          </div>
                          {cartSummary.discountAmount > 0 && (
                            <div className="flex justify-between text-[#15803D]">
                              <span>{t('قيمة الخصم', 'Discount')}</span>
                              <span className="font-mono font-bold">
                                -{formatPrice(cartSummary.discountAmount)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-[#57534E]">
                              {t('الشحن والتوصيل (شامل الضريبة)', 'Shipping (VAT Inclusive)')}
                            </span>
                            <span className="font-mono font-bold">
                              {cartSummary.shippingFee === 0
                                ? t('مجاني', 'Free')
                                : formatPrice(cartSummary.shippingFee)}
                            </span>
                          </div>
                          <div className="flex justify-between py-2 px-2.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6]">
                            <span className="text-[#57534E]">
                              {t(
                                'ضريبة القيمة المضافة المتضمنة (١٥٪)',
                                'Included Saudi VAT (15%)'
                              )}
                            </span>
                            <span className="font-mono font-semibold">
                              {formatPrice(cartSummary.vatAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-base font-bold text-[#141413] border-t border-[#E6E0D6] pt-3">
                            <span>
                              {t('الإجمالي النهائي المستحق', 'Final Payable Total')}
                            </span>
                            <span className="font-mono text-[#0B4F3F]">
                              {formatPrice(cartSummary.total)}
                            </span>
                          </div>
                        </div>

                        {!publicPlatformSettings.checkoutEnabled && (
                          <div
                            role="alert"
                            className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold"
                          >
                            {t(
                              'إتمام الطلبات متوقف مؤقتاً للصيانة التشغيلية.',
                              'Checkout is temporarily unavailable for operational maintenance.'
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={!publicPlatformSettings.checkoutEnabled}
                          onClick={() => navigateTo('checkout')}
                          className="w-full py-3.5 px-5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#C59B27]" />
                          <span>
                            {t('المتابعة لإتمام الطلب الآمن', 'Proceed to Secure Checkout')}
                          </span>
                          <DirArrow className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 7. CUSTOMER ACCOUNT & SELLER APPLICATION VIEW */}
            {activeView === 'account' && currentUser && (
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-8">
                <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#0B4F3F] text-[#F5E6C8] flex items-center justify-center text-xl font-bold">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-[#141413]">{currentUser.name}</h1>
                        <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold uppercase">
                          {currentUser.role}
                        </span>
                        {isDemoMode && (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40 text-[11px] font-bold">
                            {t('وضع تجريبي', 'Demo Mode')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#57534E] mt-1 font-mono">
                        {currentUser.email} · {currentUser.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {isDemoMode ? (
                      <button
                        type="button"
                        onClick={exitDemoMode}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 text-[#141413] text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('إنهاء وضع العرض التجريبي', 'Exit Demo Mode')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={logout}
                        className="px-4 py-2.5 rounded-xl border border-[#9E2A2B]/30 text-[#9E2A2B] hover:bg-red-50 text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('تسجيل الخروج', 'Sign Out')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Wallet, Loyalty & Orders Quick KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#8C857B]">
                        {t('رصيد محفظة أثيل الملكية', 'Atheel Royal Wallet')}
                      </span>
                      <div className="text-2xl font-bold font-mono text-[#0B4F3F] mt-1">
                        {formatPrice(currentUser.walletBalance)}
                      </div>
                    </div>
                    <Wallet className="w-8 h-8 text-[#C59B27]" />
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#8C857B]">
                        {t('نقاط الولاء والعضوية', 'Loyalty Points & Tier')}
                      </span>
                      <div className="text-2xl font-bold font-mono text-[#141413] mt-1">
                        {currentUser.loyaltyPoints.toLocaleString()} ·{' '}
                        <span className="text-sm text-[#B8860B]">{currentUser.loyaltyTier}</span>
                      </div>
                    </div>
                    <Sparkles className="w-8 h-8 text-[#C59B27]" />
                  </div>

                  <div
                    onClick={() => navigateTo('orders')}
                    className="bg-white rounded-2xl border border-[#E6E0D6] p-5 flex items-center justify-between cursor-pointer hover:border-[#0B4F3F]"
                  >
                    <div>
                      <span className="text-xs text-[#8C857B]">
                        {t('إجمالي طلباتي المسجلة', 'My Recorded Orders')}
                      </span>
                      <div className="text-2xl font-bold font-mono text-[#141413] mt-1">
                        {orders.length}
                      </div>
                    </div>
                    <Package className="w-8 h-8 text-[#0B4F3F]" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Profile Update Form */}
                  <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
                    <h2 className="text-base font-bold text-[#141413] flex items-center gap-2">
                      <User className="w-4 h-4 text-[#0B4F3F]" />
                      <span>{t('البيانات الشخصية', 'Personal Information')}</span>
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-[#141413] mb-1">
                          {t('الاسم الكامل', 'Full Name')}
                        </label>
                        <input
                          type="text"
                          value={profileName ?? currentUser.name}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#141413] mb-1">
                          {t('رقم الجوال السعودي', 'Saudi Mobile Number')}
                        </label>
                        <input
                          type="tel"
                          value={profilePhone ?? currentUser.phone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateUserProfile({
                            name: (profileName ?? currentUser.name).trim() || currentUser.name,
                            phone: (profilePhone ?? currentUser.phone).trim() || currentUser.phone,
                          })
                        }
                        className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                      >
                        {t('حفظ التعديلات', 'Save Changes')}
                      </button>
                    </div>

                    {/* Become a Verified Seller Application (Customer stays customer until Admin approves) */}
                    {currentUser.role === 'customer' && (
                      <div className="pt-6 border-t border-[#E6E0D6] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-xs font-bold text-[#141413]">
                              {t(
                                'هل ترغب بالبيع كتاجر معتمد في أثيل؟',
                                'Want to sell as a verified merchant on Atheel?'
                              )}
                            </h3>
                            <p className="text-[11px] text-[#57534E] mt-0.5">
                              {t(
                                'قدّم طلب اعتماد متجرك بالسجل التجاري والرقم الضريبي للمراجعة من قِبل الإدارة.',
                                'Submit your Commercial Registration (CR) & VAT application for Admin review.'
                              )}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!publicPlatformSettings.sellerApplicationsEnabled}
                            onClick={() => setShowSellerAppForm(!showSellerAppForm)}
                            className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#C59B27]/50 disabled:opacity-50 text-xs font-bold text-[#141413]"
                          >
                            {publicPlatformSettings.sellerApplicationsEnabled
                              ? t('تقديم طلب تاجر', 'Apply as Seller')
                              : t('التسجيل متوقف مؤقتاً', 'Applications Paused')}
                          </button>
                        </div>

                        {!publicPlatformSettings.sellerApplicationsEnabled && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-[#B45309]">
                            {t(
                              'استقبال طلبات انضمام التجار الجدد متوقف مؤقتاً من قِبل الإدارة.',
                              'New seller onboarding applications are temporarily paused by platform administration.'
                            )}
                          </div>
                        )}

                        <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-[11px] text-[#57534E]">
                          {t(
                            'تُحدد عمولة المتجر عند الاعتماد وفق سياسة المنصة الحالية.',
                            'Seller commission is assigned upon approval according to the current marketplace policy.'
                          )}
                        </div>

                        {showSellerAppForm && publicPlatformSettings.sellerApplicationsEnabled && (
                          <form
                            onSubmit={handleSellerApplicationSubmit}
                            className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-3"
                          >
                            <div>
                              <label className="block text-[11px] font-bold text-[#141413] mb-1">
                                {t('اسم المتجر بالعربية', 'Store Name (Arabic)')}
                              </label>
                              <input
                                type="text"
                                required
                                value={storeNameAr}
                                onChange={(e) => setStoreNameAr(e.target.value)}
                                placeholder={t('مثال: دار العود الملكي', 'Store Name Ar')}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-[#141413] mb-1">
                                  {t('رقم السجل التجاري (١٠ أرقام)', 'CR Number (10 digits)')}
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={storeCrNumber}
                                  onChange={(e) => setStoreCrNumber(e.target.value)}
                                  placeholder="1010XXXXXX"
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-[#141413] mb-1">
                                  {t('الرقم الضريبي (١٥ رقماً)', 'VAT Number')}
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={storeVatNumber}
                                  onChange={(e) => setStoreVatNumber(e.target.value)}
                                  placeholder="310XXXXXXXXX003"
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs font-mono"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-[#141413] mb-1">
                                  {t('المدينة', 'City')}
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={storeCityAr}
                                  onChange={(e) => setStoreCityAr(e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-[#141413] mb-1">
                                  {t('رقم الآيبان البنكي', 'Saudi IBAN')}
                                </label>
                                <input
                                  type="text"
                                  required
                                  value={storeIban}
                                  onChange={(e) => setStoreIban(e.target.value)}
                                  placeholder="SA4480000..."
                                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs font-mono"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#141413] mb-1">
                                {t('نبذة عن المتجر والمنتجات', 'Store Description')}
                              </label>
                              <textarea
                                rows={2}
                                value={storeDescAr}
                                onChange={(e) => setStoreDescAr(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white border border-[#E6E0D6] text-xs"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={isSubmittingSellerApp}
                              className="w-full py-2.5 rounded-lg bg-[#0B4F3F] text-white text-xs font-bold"
                            >
                              {isSubmittingSellerApp
                                ? t('جاري رفع الطلب...', 'Submitting...')
                                : t(
                                    'إرسال طلب الاعتماد للإدارة',
                                    'Submit Seller Application for Approval'
                                  )}
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Saved Saudi National Addresses */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-[#141413] flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#0B4F3F]" />
                        <span>
                          {t('العناوين الوطنية السعودية المسجلة', 'Saved Saudi National Addresses')}
                        </span>
                      </h2>
                      <button
                        type="button"
                        onClick={() => navigateTo('checkout')}
                        className="text-xs font-bold text-[#0B4F3F] hover:underline"
                      >
                        {t('+ إدارة أو إضافة عنوان في صفحة الدفع', '+ Add Address in Checkout')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentUser.addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#0B4F3F]">
                                {lang === 'ar' ? addr.labelAr : addr.labelEn}
                              </span>
                              {addr.isDefault && (
                                <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-bold">
                                  {t('افتراضي', 'Default')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-[#141413]">{addr.recipientName}</p>
                            <p className="text-xs text-[#57534E]">
                              {lang === 'ar' ? addr.cityAr : addr.cityEn} — {addr.districtAr}،{' '}
                              {addr.streetAr}
                            </p>
                            <p className="text-[11px] font-mono text-[#8C857B]">
                              {addr.buildingNumber} · {addr.postalCode} · {addr.additionalNumber}
                            </p>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-[#E6E0D6] text-[11px]">
                            {!addr.isDefault ? (
                              <button
                                type="button"
                                onClick={() => setDefaultAddress(addr.id)}
                                className="text-[#0B4F3F] font-semibold hover:underline"
                              >
                                {t('تعيين كافتراضي', 'Set Default')}
                              </button>
                            ) : (
                              <span className="text-[#8C857B]">{addr.phone}</span>
                            )}
                            {currentUser.addresses.length > 1 && (
                              <button
                                type="button"
                                onClick={() => deleteAddress(addr.id)}
                                className="text-[#9E2A2B] font-semibold hover:underline"
                              >
                                {t('حذف', 'Delete')}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 8. ORDERS & SHIPMENT TRACKING VIEW */}
            {activeView === 'orders' && (
              <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E6E0D6]">
                  <div>
                    <h1 className="text-2xl font-bold text-[#141413]">
                      {t('طلباتي وتتبع الشحنات الفاخرة', 'My Orders & Shipment Tracking')}
                    </h1>
                    <p className="text-xs text-[#57534E] mt-1">
                      {t(
                        'جميع الفواتير الضريبية تشمل ضريبة القيمة المضافة ١٥٪ مع تتبع مباشر عبر سبل وأرامكس',
                        'All tax invoices include 15% Saudi VAT with live carrier tracking'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="px-4 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold inline-flex items-center gap-2"
                  >
                    <span>{t('العودة للتسوق', 'Continue Shopping')}</span>
                    <DirArrow className="w-4 h-4" />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-12 text-center space-y-4">
                    <Package className="w-10 h-10 text-[#C59B27] mx-auto" />
                    <h2 className="text-base font-bold text-[#141413]">
                      {t('لا توجد طلبات مسجلة في حسابك حتى الآن', 'No orders found in your account yet')}
                    </h2>
                    <button
                      type="button"
                      onClick={() => navigateTo('home')}
                      className="px-6 py-3 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                    >
                      {t('استكشف منتجات أثيل', 'Explore Atheel Catalog')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const expectedSellerIds =
                        order.sellerIds && order.sellerIds.length > 0
                          ? order.sellerIds
                          : Array.from(new Set(order.items.map((item) => item.sellerId)));
                      const liveOrderFulfillments = sellerFulfillments.filter(
                        (f) => f.orderId === order.id
                      );
                      const effectiveFulfillments = isDemoMode
                        ? liveOrderFulfillments.length > 0
                          ? liveOrderFulfillments
                          : buildSellerFulfillmentsForOrder(order)
                        : liveOrderFulfillments;
                      const derivedStatus = deriveAggregateOrderStatus(
                        order,
                        effectiveFulfillments
                      );
                      const isMultiVendorOrder = expectedSellerIds.length > 1;
                      const deliveredShipmentsCount = effectiveFulfillments.filter(
                        (f) => f.status === 'delivered'
                      ).length;
                      const isPartiallyDelivered =
                        isMultiVendorOrder &&
                        deliveredShipmentsCount > 0 &&
                        deliveredShipmentsCount < expectedSellerIds.length;
                      const isMissingFulfillmentProvisioning =
                        effectiveFulfillments.length < expectedSellerIds.length;

                      return (
                        <div
                          key={order.id}
                          className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F3EFEA] pb-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="text-base font-bold font-mono text-[#141413]">
                                  #{order.orderNumber}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-xs font-bold uppercase">
                                  {isPartiallyDelivered
                                    ? t(
                                        `تسليم جزئي (${deliveredShipmentsCount}/${expectedSellerIds.length} شحنات)`,
                                        `Partially Delivered (${deliveredShipmentsCount}/${expectedSellerIds.length} Shipments)`
                                      )
                                    : derivedStatus}
                                </span>
                                {isMultiVendorOrder && (
                                  <span className="px-2.5 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E6E0D6] text-[11px] font-bold text-[#57534E]">
                                    {t(
                                      `${expectedSellerIds.length} شحنات مستقلة حسب البوتيك`,
                                      `${expectedSellerIds.length} Seller-Isolated Shipments`
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#57534E] mt-1">
                                {order.customerName} · {order.address.cityAr} —{' '}
                                {order.address.districtAr} ·{' '}
                                <span className="font-mono">{order.createdAt.split('T')[0]}</span>
                              </div>
                            </div>

                            <div className="text-end">
                              <div className="text-lg font-bold font-mono text-[#0B4F3F]">
                                {formatPrice(order.total)}
                              </div>
                              <div className="text-[11px] text-[#8C857B]">
                                {t('شامل الضريبة ١٥٪:', 'Incl. 15% VAT:')}{' '}
                                <span className="font-mono">{formatPrice(order.vatAmount)}</span>
                              </div>
                            </div>
                          </div>

                          {isMissingFulfillmentProvisioning && (
                            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-[#92400E] flex flex-wrap items-center justify-between gap-3">
                              <span className="font-bold">
                                {t(
                                  'بانتظار تهيئة شحنات التجار من نظام تنفيذ الطلبات الموثوق',
                                  'Awaiting trusted order-fulfillment provisioning'
                                )}
                              </span>
                              <span className="text-[11px] font-mono">
                                {effectiveFulfillments.length}/{expectedSellerIds.length}
                              </span>
                            </div>
                          )}

                          {/* Seller-Specific Shipments Breakdown */}
                          <div className="space-y-3">
                            {expectedSellerIds.map((sellerId, sIdx) => {
                              const shipment = effectiveFulfillments.find(
                                (f) => f.sellerId === sellerId
                              );
                              const shipmentItems = order.items.filter(
                                (item) => item.sellerId === sellerId
                              );
                              const sellerObj = sellers.find((s) => s.id === sellerId);
                              const sellerNameAr =
                                sellerObj?.nameAr ||
                                shipmentItems[0]?.sellerNameAr ||
                                sellerId;
                              const sellerNameEn =
                                sellerObj?.nameEn ||
                                shipmentItems[0]?.sellerNameEn ||
                                sellerId;
                              const latestEvent = shipment
                                ? [...(shipment.timeline || [])]
                                    .reverse()
                                    .find((ev) => ev.completed)
                                : undefined;

                              return (
                                <div
                                  key={`${order.id}_${sellerId}`}
                                  className="rounded-xl border border-[#E6E0D6] bg-[#FAF8F5]/70 p-4 space-y-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E0D6] pb-2.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Store className="w-4 h-4 text-[#0B4F3F]" />
                                      <span className="text-xs font-bold text-[#141413]">
                                        {t(
                                          `شحنة رقم ${sIdx + 1}: ${sellerNameAr}`,
                                          `Shipment #${sIdx + 1}: ${sellerNameEn}`
                                        )}
                                      </span>
                                      {shipment ? (
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            shipment.status === 'delivered'
                                              ? 'bg-[#EBF3F0] text-[#1E6B47]'
                                              : shipment.status === 'shipped' ||
                                                shipment.status === 'out_for_delivery'
                                              ? 'bg-indigo-50 text-indigo-800'
                                              : 'bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40'
                                          }`}
                                        >
                                          {shipment.status}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-[#B45309] text-[10px] font-bold">
                                          {t(
                                            'بانتظار تهيئة شحنات التجار من نظام تنفيذ الطلبات الموثوق',
                                            'Awaiting trusted order-fulfillment provisioning'
                                          )}
                                        </span>
                                      )}
                                    </div>

                                    {shipment && (
                                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                                        <span className="text-[#57534E]">
                                          {t('الناقل:', 'Carrier:')}{' '}
                                          <strong className="text-[#141413]">
                                            {lang === 'ar'
                                              ? shipment.carrierAr
                                              : shipment.carrierEn}
                                          </strong>
                                        </span>
                                        {shipment.trackingNumber ? (
                                          <span className="px-2 py-0.5 rounded bg-white border border-[#E6E0D6] font-mono font-bold text-[#0B4F3F]">
                                            {shipment.trackingNumber}
                                          </span>
                                        ) : (
                                          <span className="text-[#8C857B]">
                                            {t('بانتظار إصدار البوليصة', 'Tracking pending dispatch')}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="divide-y divide-[#E6E0D6]/60">
                                    {shipmentItems.map((item, idx) => (
                                      <div
                                        key={idx}
                                        className="py-2.5 flex items-center justify-between gap-4 text-xs"
                                      >
                                        <div className="flex items-center gap-3">
                                          <img
                                            src={item.image}
                                            alt={lang === 'ar' ? item.titleAr : item.titleEn}
                                            referrerPolicy="no-referrer"
                                            className="w-11 h-11 rounded-xl object-cover bg-white border border-[#E6E0D6]"
                                          />
                                          <div>
                                            <div className="font-bold text-[#141413]">
                                              {lang === 'ar' ? item.titleAr : item.titleEn}
                                            </div>
                                            <div className="text-[#8C857B]">
                                              {t('الكمية:', 'Qty:')} {item.quantity} · SKU:{' '}
                                              <span className="font-mono">{item.sku}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="font-mono font-bold text-[#141413]">
                                          {formatPrice(item.unitPrice * item.quantity)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {latestEvent && (
                                    <div className="pt-2 border-t border-[#E6E0D6]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#57534E]">
                                      <div>
                                        <span className="font-bold text-[#0B4F3F]">
                                          {lang === 'ar'
                                            ? latestEvent.titleAr
                                            : latestEvent.titleEn}
                                          :
                                        </span>{' '}
                                        <span>
                                          {lang === 'ar'
                                            ? latestEvent.descriptionAr
                                            : latestEvent.descriptionEn}
                                        </span>
                                      </div>
                                      <span className="font-mono text-[10px] text-[#8C857B]">
                                        {latestEvent.timestamp}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-3 border-t border-[#F3EFEA] flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="text-[#57534E]">
                              {t('حالة الطلب الإجمالية (مشتقة تلقائياً):', 'Aggregate Order State (Derived):')}{' '}
                              <span className="font-bold text-[#141413] uppercase">
                                {derivedStatus}
                              </span>{' '}
                              · {t('وسيلة الدفع:', 'Payment:')}{' '}
                              <span className="font-mono uppercase font-bold text-[#141413]">
                                {order.paymentMethod}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {(derivedStatus === 'placed' || derivedStatus === 'confirmed') &&
                                deliveredShipmentsCount === 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cancelOrder(
                                        order.id,
                                        t('طلب إلغاء من العميل', 'Cancelled by customer')
                                      )
                                    }
                                    className="px-3.5 py-1.5 rounded-lg border border-[#9E2A2B]/30 text-[#9E2A2B] hover:bg-red-50 font-semibold"
                                  >
                                    {t('إلغاء الطلب', 'Cancel Order')}
                                  </button>
                                )}
                              {derivedStatus === 'delivered' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestReturn(
                                      order.id,
                                      t('استبدال أو إرجاع ضمن الضمان', 'Return within policy'),
                                      t('طلب استرجاع إلى محفظة أثيل', 'Refund to Atheel Wallet'),
                                      'wallet'
                                    )
                                  }
                                  className="px-3.5 py-1.5 rounded-lg border border-[#E6E0D6] hover:bg-[#FAF8F5] font-semibold"
                                >
                                  {t('طلب إرجاع مجاني', 'Request Free Return')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 8B. PROFESSIONAL MULTI-VENDOR SELLER CENTER (ROUND 2) */}
            {activeView === 'seller-dashboard' && canAccessSellerDashboard && <SellerCenter />}

            {/* 8C. EXECUTIVE ADMIN CONSOLE: CORE MARKETPLACE OPERATIONS (ROUND 3A) */}
            {activeView === 'admin-dashboard' && canAccessAdminDashboard && <AdminConsole />}

            {/* 9. OTHER PORTAL VIEWS (Wishlist, Compare, Unauthorized Seller/Admin Access, Static Info) */}
            {activeView !== 'home' &&
              activeView !== 'login' &&
              activeView !== 'register' &&
              activeView !== 'forgot-password' &&
              activeView !== 'checkout' &&
              activeView !== 'order-confirmation' &&
              activeView !== 'search' &&
              activeView !== 'product' &&
              activeView !== 'cart' &&
              activeView !== 'account' &&
              activeView !== 'orders' &&
              !(activeView === 'seller-dashboard' && canAccessSellerDashboard) &&
              !(activeView === 'admin-dashboard' && canAccessAdminDashboard) && (
                <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12">
                  <div className="bg-white rounded-2xl border border-[#E6E0D6] p-8 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-4">
                      <div>
                        <span className="text-xs font-bold text-[#0B4F3F] uppercase">
                          {activeView}
                        </span>
                        <h1 className="text-2xl font-bold text-[#141413] mt-1">
                          {activeView === 'wishlist'
                            ? t('قائمة الأمنيات المفضلة', 'Your Wishlist')
                            : activeView === 'compare'
                            ? t('مقارنة المنتجات', 'Compare Products')
                            : activeView === 'seller-dashboard'
                            ? t('مركز التجار المعتمدين', 'Verified Seller Center')
                            : activeView === 'admin-dashboard'
                            ? t('لوحة الإدارة التنفيذية', 'Executive Admin Console')
                            : t('بوابة أثيل الذكية', 'Atheel Portal')}
                        </h1>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateTo('home')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                      >
                        <span>{t('العودة للصفحة الرئيسية', 'Back to Homepage')}</span>
                        <DirArrow className="w-4 h-4" />
                      </button>
                    </div>

                    {activeView === 'wishlist' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products
                          .filter((p) => wishlistIds.includes(p.id))
                          .map((prod) => (
                            <ProductCard key={prod.id} product={prod} />
                          ))}
                      </div>
                    )}

                    {activeView === 'compare' && (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={clearCompare}
                            className="text-xs text-[#9E2A2B] font-semibold hover:underline"
                          >
                            {t('مسح قائمة المقارنة', 'Clear Compare List')}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                          {products
                            .filter((p) => compareIds.includes(p.id))
                            .map((prod) => (
                              <ProductCard key={prod.id} product={prod} />
                            ))}
                        </div>
                      </div>
                    )}

                    {activeView !== 'wishlist' && activeView !== 'compare' && (
                      <>
                        {((activeView === 'seller-dashboard' && !canAccessSellerDashboard) ||
                          (activeView === 'admin-dashboard' && !canAccessAdminDashboard)) ? (
                          <div
                            role="alert"
                            className="p-8 rounded-2xl bg-[#FAF8F5] border border-[#9E2A2B]/30 space-y-5"
                          >
                            <div className="flex items-start gap-3.5">
                              <div className="w-11 h-11 rounded-xl bg-red-50 border border-[#9E2A2B]/30 text-[#9E2A2B] flex items-center justify-center shrink-0">
                                <Lock className="w-5 h-5" />
                              </div>
                              <div className="space-y-1.5">
                                <div className="inline-flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded bg-red-50 text-[#9E2A2B] text-[11px] font-bold font-mono">
                                    403 ACCESS DENIED
                                  </span>
                                  {currentUser && (
                                    <span className="px-2.5 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold uppercase">
                                      {t('دورك الحالي:', 'Current Role:')} {currentUser.role}
                                    </span>
                                  )}
                                </div>
                                <h2 className="text-lg font-bold text-[#141413]">
                                  {activeView === 'admin-dashboard'
                                    ? t(
                                        'غير مصرح بالوصول إلى لوحة الإدارة التنفيذية',
                                        'Access Restricted: Executive Admin Console'
                                      )
                                    : t(
                                        'غير مصرح بالوصول إلى مركز التجار المعتمدين',
                                        'Access Restricted: Verified Seller Center'
                                      )}
                                </h2>
                                <p className="text-xs text-[#57534E] leading-relaxed max-w-2xl">
                                  {activeView === 'admin-dashboard'
                                    ? t(
                                        'تتطلب لوحة الإدارة التنفيذية حساب مسؤول نظام معتمد بصلاحية (admin). لا يُسمح للعملاء أو التجار بالدخول إلى بوابة الحوكمة والإدارة.',
                                        'The Executive Admin Console requires an authorized Administrator session (role == "admin"). Customers and Sellers are prohibited from accessing platform governance.'
                                      )
                                    : t(
                                        'يتطلب دخول مركز التجار حساب تاجر معتمد من الإدارة (role == "seller") ومرتبطاً بمعرّف متجر موثق (sellerId). إذا كنت عميلاً وترغب بالبيع في أثيل، يمكنك رفع طلب اعتماد متجر من صفحة حسابك.',
                                        'The Seller Center requires an approved Seller account (role == "seller") linked to a valid sellerId. Customers wishing to sell can submit a Seller Application from their Account page.'
                                      )}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => navigateTo('home')}
                                className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                              >
                                {t('العودة للصفحة الرئيسية', 'Return to Homepage')}
                              </button>

                              {activeView === 'seller-dashboard' &&
                                currentUser?.role === 'customer' && (
                                  <button
                                    type="button"
                                    onClick={() => navigateTo('account')}
                                    className="px-5 py-2.5 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#0B4F3F] text-xs font-bold text-[#141413]"
                                  >
                                    {t(
                                      'الذهاب لحسابي لتقديم طلب اعتماد تاجر',
                                      'Go to Account to Submit Seller Application'
                                    )}
                                  </button>
                                )}

                              <button
                                type="button"
                                onClick={() =>
                                  loginWithDemoRole(
                                    activeView === 'admin-dashboard' ? 'admin' : 'seller'
                                  )
                                }
                                className="px-4 py-2.5 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/40 text-xs font-bold text-[#141413]"
                              >
                                {activeView === 'admin-dashboard'
                                  ? t(
                                      'معاينة الواجهة عبر (إدارة تجريبية Demo Admin)',
                                      'Preview in Isolated Demo Admin Mode'
                                    )
                                  : t(
                                      'معاينة الواجهة عبر (تاجر تجريبي Demo Seller)',
                                      'Preview in Isolated Demo Seller Mode'
                                    )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {isDemoMode && (
                              <div className="p-3.5 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/40 flex items-center justify-between gap-3 text-xs text-[#141413]">
                                <span className="font-semibold">
                                  {t(
                                    'وضع العرض التجريبي المحلي (Demo Mode): جميع الإجراءات هنا محلية لأغراض استعراض المشروع ولا تعدّل قاعدة بيانات الإنتاج.',
                                    'Isolated Local Demo Mode: Actions here are simulated in memory for portfolio evaluation and never modify production Firestore.'
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={exitDemoMode}
                                  className="px-3 py-1 rounded-lg bg-[#141413] text-[#F5E6C8] text-[11px] font-bold shrink-0"
                                >
                                  {t('إنهاء العرض التجريبي', 'Exit Demo Mode')}
                                </button>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                                <div className="text-xs text-[#8C857B]">
                                  {t('إجمالي المنتجات النشطة', 'Total Active Products')}
                                </div>
                                <div className="text-xl font-bold font-mono text-[#141413] mt-1">
                                  {products.length}
                                </div>
                              </div>
                              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                                <div className="text-xs text-[#8C857B]">
                                  {t('المتاجر السعودية الموثقة', 'Verified Saudi Sellers')}
                                </div>
                                <div className="text-xl font-bold font-mono text-[#141413] mt-1">
                                  {sellers.length}
                                </div>
                              </div>
                              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                                <div className="text-xs text-[#8C857B]">
                                  {t('إجمالي الطلبات المسجلة', 'Total Orders')}
                                </div>
                                <div className="text-xl font-bold font-mono text-[#141413] mt-1">
                                  {orders.length}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
          </>
        )}
      </main>

      {/* Luxury Footer */}
      <footer className="bg-[#141413] text-[#FAF8F5] border-t border-[#C59B27]/25">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0B4F3F] flex items-center justify-center border border-[#C59B27]/40">
                  <Crown className="w-4 h-4 text-[#C59B27]" />
                </div>
                <span className="text-xl font-bold text-white">
                  {lang === 'ar'
                    ? publicPlatformSettings.marketplaceNameAr || 'أثـيـل'
                    : publicPlatformSettings.marketplaceNameEn || 'ATHEEL'}
                </span>
              </div>
              <p className="text-xs text-[#D6D0C4] leading-relaxed">
                {t(
                  'منصة أثيل للتجارة الإلكترونية السعودية الفاخرة متعددة البائعين. نجمع أرقى الدور العالمية والمتاجر السعودية الموثقة تحت سقف واحد.',
                  'Atheel Saudi Luxury Multi-Vendor Marketplace. Bringing together verified Saudi boutiques and authentic global maisons.'
                )}
              </p>
              <div className="pt-1 space-y-1 text-[11px] text-[#D6D0C4]">
                <div className="font-mono">{publicPlatformSettings.supportEmail}</div>
                <div className="font-mono" dir="ltr">
                  {publicPlatformSettings.supportPhone} · WhatsApp: {publicPlatformSettings.supportWhatsapp}
                </div>
                <div className="text-[#8C857B]">
                  {lang === 'ar'
                    ? publicPlatformSettings.supportHoursAr
                    : publicPlatformSettings.supportHoursEn}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#C59B27] mb-3">
                {t('أبرز التصنيفات', 'Top Departments')}
              </h3>
              <ul className="space-y-2 text-xs text-[#D6D0C4]">
                {categories.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => navigateTo('search', { categoryId: c.id })}
                      className="hover:text-white transition-colors"
                    >
                      {lang === 'ar' ? c.nameAr : c.nameEn}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#C59B27] mb-3">
                {t('خدمات العملاء والتجار', 'Customer & Merchant Services')}
              </h3>
              <ul className="space-y-2 text-xs text-[#D6D0C4]">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('orders')}
                    className="hover:text-white transition-colors"
                  >
                    {t('تتبع الطلبات والشحنات', 'Track Orders & Shipments')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => loginWithDemoRole('seller')}
                    className="hover:text-white transition-colors"
                  >
                    {t('بوابة التجار السعوديين (عرض تجريبي)', 'Saudi Merchant Portal (Demo)')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => loginWithDemoRole('admin')}
                    className="hover:text-white transition-colors"
                  >
                    {t('لوحة الإدارة التنفيذية (عرض تجريبي)', 'Executive Admin Panel (Demo)')}
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#C59B27] mb-3">
                {t('الاعتماد والامتثال النظامي', 'Compliance & Trust')}
              </h3>
              <div className="space-y-2 text-xs text-[#D6D0C4]">
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#C59B27] shrink-0" />
                  <span>
                    {t('موثق لدى المركز السعودي للأعمال', 'Verified by Saudi Business Center')}
                  </span>
                </p>
                <p className="font-mono text-[11px] text-[#8C857B]">
                  CR: 1010994821 · VAT: 310994821000003
                </p>
                <p className="text-[11px] text-[#8C857B]">
                  {t(
                    'جميع الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة ١٥٪',
                    'All prices in SAR inclusive of 15% VAT'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#8C857B]">
            <p>
              © {new Date().getFullYear()}{' '}
              {t(
                'شركة أثيل للتجارة الإلكترونية الفاخرة (الرياض، المملكة العربية السعودية). جميع الحقوق محفوظة.',
                'Atheel Luxury Marketplace Co. (Riyadh, Kingdom of Saudi Arabia). All rights reserved.'
              )}
            </p>
            <div className="flex items-center gap-3 font-mono text-[11px] text-[#D6D0C4]">
              <span>MADA</span>
              <span>·</span>
              <span>APPLE PAY</span>
              <span>·</span>
              <span>STC PAY</span>
              <span>·</span>
              <span>VISA / MASTERCARD</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 end-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl bg-[#141413] text-white border border-[#C59B27]/40 shadow-2xl"
            >
              <div className="flex items-start gap-2.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-[#9E2A2B] shrink-0 mt-0.5" />
                ) : toast.type === 'info' ? (
                  <Info className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-bold">{toast.title}</p>
                  {toast.description && (
                    <p className="text-[11px] text-[#D6D0C4] mt-0.5">{toast.description}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-[#8C857B] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <MarketplaceProvider>
      <MarketplaceShell />
    </MarketplaceProvider>
  );
}
