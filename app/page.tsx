'use client';

import React from 'react';
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
  ArrowLeftRight,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { MarketplaceProvider, useMarketplace } from '../context/MarketplaceContext';
import { NavbarAndMegaMenu } from '../components/NavbarAndMegaMenu';
import { HomeView } from '../components/HomeView';
import { ProductCard } from '../components/ProductCard';

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
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedBrandId,
    setSelectedBrandId,
    selectedSellerId,
    setSelectedSellerId,
    sortBy,
    setSortBy,
    onlyInStock,
    setOnlyInStock,
    onlyDiscounted,
    setOnlyDiscounted,
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
    currentUser,
    loginWithDemoRole,
    toasts,
    dismissToast,
  } = useMarketplace();

  const [couponInput, setCouponInput] = React.useState('');
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

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#141413]">
      {/* Top Bar, Header & Mega Menu */}
      <NavbarAndMegaMenu />

      {/* Main Content */}
      <main className="flex-1">
        {activeView === 'home' && <HomeView />}

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
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                >
                  <option value="featured">{t('الأكثر تميزاً', 'Featured')}</option>
                  <option value="best_selling">{t('الأكثر مبيعاً', 'Best Selling')}</option>
                  <option value="rating">{t('الأعلى تقييماً', 'Highest Rated')}</option>
                  <option value="price_asc">{t('السعر: من الأقل للأعلى', 'Price: Low to High')}</option>
                  <option value="price_desc">{t('السعر: من الأعلى للأقل', 'Price: High to Low')}</option>
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
                  {t('لا توجد منتجات مطابقة للفلاتر المحددة', 'No products match the selected filters')}
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
                {currentProduct.subcategoryAr}
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
                    {lang === 'ar' ? currentProduct.descriptionAr : currentProduct.descriptionEn}
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
                        {t('السعر شامل ضريبة القيمة المضافة ١٥٪', 'Price includes 15% Saudi VAT')}
                      </div>
                    </div>

                    <div className="text-end text-xs">
                      <div className="font-bold text-[#141413] inline-flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        {lang === 'ar' ? currentProduct.sellerNameAr : currentProduct.sellerNameEn}
                      </div>
                      <div className="text-[#57534E] mt-1">
                        {lang === 'ar'
                          ? currentProduct.deliveryEstimateAr
                          : currentProduct.deliveryEstimateEn}
                      </div>
                    </div>
                  </div>

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
                  <button
                    type="button"
                    onClick={() => addToCart(currentProduct)}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{t('إضافة إلى حقيبة التسوق', 'Add to Shopping Bag')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(currentProduct);
                      navigateTo('cart');
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
          </div>
        )}

        {activeView === 'cart' && (
          <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 space-y-6">
            <h1 className="text-2xl font-bold text-[#141413]">
              {t('حقيبة التسوق الفاخرة', 'Shopping Bag')} ({cartSummary.itemCount})
            </h1>

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
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-20 h-20 rounded-xl object-cover bg-[#F3EFEA]"
                        />
                        <div>
                          <h3 className="text-sm font-bold text-[#141413]">
                            {lang === 'ar' ? item.product.titleAr : item.product.titleEn}
                          </h3>
                          <p className="text-xs text-[#8C857B] mt-0.5">
                            {lang === 'ar' ? item.product.sellerNameAr : item.product.sellerNameEn}
                          </p>
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
                          <span className="px-3 text-xs font-mono font-bold">{item.quantity}</span>
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
                  <div className="bg-white rounded-2xl p-6 border border-[#E6E0D6] space-y-4">
                    <h2 className="text-base font-bold text-[#141413]">
                      {t('ملخص الفاتورة الضريبية', 'Tax Invoice Summary')}
                    </h2>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder={t('رمز الكوبون (مثال: ATHEEL15)', 'Coupon code (ATHEEL15)')}
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
                        <span className="text-[#57534E]">{t('المجموع الفرعي', 'Subtotal')}</span>
                        <span className="font-mono font-bold">{formatPrice(cartSummary.subtotal)}</span>
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
                        <span className="text-[#57534E]">{t('الشحن والتوصيل', 'Shipping')}</span>
                        <span className="font-mono font-bold">
                          {cartSummary.shippingFee === 0
                            ? t('مجاني', 'Free')
                            : formatPrice(cartSummary.shippingFee)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#57534E]">
                          {t('ضريبة القيمة المضافة السعودية (١٥٪)', 'Saudi VAT (15%)')}
                        </span>
                        <span className="font-mono font-bold">{formatPrice(cartSummary.vatAmount)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-[#141413] border-t border-[#E6E0D6] pt-3">
                        <span>{t('الإجمالي النهائي', 'Grand Total')}</span>
                        <span className="font-mono text-[#0B4F3F]">
                          {formatPrice(cartSummary.total)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigateTo('home')}
                      className="w-full py-3.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white font-bold text-xs transition-colors"
                    >
                      {t('متابعة التسوق في أثيل', 'Continue Shopping on Atheel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView !== 'home' &&
          activeView !== 'search' &&
          activeView !== 'product' &&
          activeView !== 'cart' && (
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
                        : activeView === 'orders'
                        ? t('طلباتي وتتبع الشحنات', 'My Orders & Shipment Tracking')
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

                {activeView === 'orders' && (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex flex-wrap items-center justify-between gap-4"
                      >
                        <div>
                          <div className="text-sm font-bold font-mono text-[#141413]">
                            #{order.orderNumber}
                          </div>
                          <div className="text-xs text-[#57534E] mt-0.5">
                            {order.customerName} · {order.address.cityAr}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="text-sm font-bold font-mono text-[#0B4F3F]">
                            {formatPrice(order.total)}
                          </div>
                          <div className="text-xs text-[#8C857B]">{order.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeView !== 'wishlist' &&
                  activeView !== 'compare' &&
                  activeView !== 'orders' && (
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
                  )}
              </div>
            </div>
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
                  {lang === 'ar' ? 'أثـيـل' : 'ATHEEL'}
                </span>
              </div>
              <p className="text-xs text-[#D6D0C4] leading-relaxed">
                {t(
                  'منصة أثيل للتجارة الإلكترونية السعودية الفاخرة متعددة البائعين. نجمع أرقى الدور العالمية والمتاجر السعودية الموثقة تحت سقف واحد.',
                  'Atheel Saudi Luxury Multi-Vendor Marketplace. Bringing together verified Saudi boutiques and authentic global maisons.'
                )}
              </p>
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
                    {t('بوابة التجار السعوديين', 'Saudi Merchant Portal')}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => loginWithDemoRole('admin')}
                    className="hover:text-white transition-colors"
                  >
                    {t('لوحة الإدارة التنفيذية', 'Executive Admin Panel')}
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
                  <span>{t('موثق لدى المركز السعودي للأعمال', 'Verified by Saudi Business Center')}</span>
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
