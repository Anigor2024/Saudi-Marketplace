'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  ShieldCheck,
  Sparkles,
  Zap,
  Truck,
  Award,
  Clock,
  Store,
  CheckCircle2,
  Copy,
  Check,
  Flame,
  Star,
  Gift,
  Compass,
  History,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { ProductCard } from './ProductCard';

export function HomeView() {
  const {
    lang,
    isRtl,
    t,
    formatPrice,
    navigateTo,
    categories,
    brands,
    products,
    sellers,
    coupons,
    homepageConfig,
    recentlyViewedIds,
    applyCouponCode,
    showToast,
  } = useMarketplace();

  const [curatedTab, setCuratedTab] = useState<'recommended' | 'trending' | 'bestsellers' | 'new'>('recommended');
  const [interestTab, setInterestTab] = useState<'majlis' | 'horology' | 'tech' | 'elegance'>('majlis');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Flash deal live countdown timer
  const [countdown, setCountdown] = useState({ hours: 6, minutes: 42, seconds: 19 });
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 6, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  );

  const flashDealProducts = useMemo(
    () => activeProducts.filter((p) => p.isFlashDeal).slice(0, 4),
    [activeProducts]
  );

  const curatedProducts = useMemo(() => {
    if (curatedTab === 'trending') {
      return activeProducts.filter((p) => p.isTrending).slice(0, 8);
    }
    if (curatedTab === 'bestsellers') {
      return activeProducts.filter((p) => p.isBestSeller).slice(0, 8);
    }
    if (curatedTab === 'new') {
      return activeProducts.filter((p) => p.isNewArrival).slice(0, 8);
    }
    return activeProducts.filter((p) => p.isFeatured).slice(0, 8);
  }, [activeProducts, curatedTab]);

  const interestProducts = useMemo(() => {
    if (interestTab === 'majlis') {
      return activeProducts
        .filter((p) => ['perfumes', 'home-kitchen', 'supermarket'].includes(p.categoryId))
        .slice(0, 4);
    }
    if (interestTab === 'horology') {
      return activeProducts
        .filter((p) => ['watches-jewelry', 'mens-fashion'].includes(p.categoryId))
        .slice(0, 4);
    }
    if (interestTab === 'tech') {
      return activeProducts
        .filter((p) => ['mobiles', 'computers', 'electronics', 'gaming'].includes(p.categoryId))
        .slice(0, 4);
    }
    return activeProducts
      .filter((p) => ['womens-fashion', 'beauty-care'].includes(p.categoryId))
      .slice(0, 4);
  }, [activeProducts, interestTab]);

  const seasonalProducts = useMemo(
    () => activeProducts.filter((p) => p.isSeasonal || p.discountPercent >= 12).slice(0, 4),
    [activeProducts]
  );

  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => activeProducts.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 4),
    [recentlyViewedIds, activeProducts]
  );

  const heroSpotlightProduct = activeProducts[0];
  const secondarySpotlightProduct = activeProducts[4] || activeProducts[1];

  const handleCopyCoupon = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(code);
    applyCouponCode(code);
    showToast(
      lang === 'ar' ? `تم نسخ وتفعيل الكوبون: ${code}` : `Coupon ${code} copied & applied`,
      lang === 'ar' ? 'سيتم احتساب الخصم تلقائياً في حقيبة التسوق' : 'Discount applied to your shopping bag',
      'success'
    );
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const DirArrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-14 pb-20">
      {/* 1. HERO EDITORIAL SECTION */}
      <section className="relative bg-[#141413] text-[#FAF8F5] overflow-hidden border-b border-[#C59B27]/25">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Primary Editorial Column (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0B4F3F] via-[#083B2F] to-[#141413] p-7 sm:p-10 border border-[#C59B27]/30 relative overflow-hidden">
              <div className="relative z-10 space-y-5">
                <div className="inline-flex items-center gap-2 text-xs text-[#F5E6C8] font-medium">
                  <Crown className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    {lang === 'ar' ? homepageConfig.heroBadgeAr : homepageConfig.heroBadgeEn}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-bold leading-[1.2] tracking-tight text-white max-w-2xl">
                  {lang === 'ar' ? homepageConfig.heroTitleAr : homepageConfig.heroTitleEn}
                </h1>

                <p className="text-sm sm:text-base text-[#E6E0D6] leading-relaxed max-w-xl">
                  {lang === 'ar' ? homepageConfig.heroSubtitleAr : homepageConfig.heroSubtitleEn}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigateTo('search', { categoryId: 'all' })}
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#C59B27] hover:bg-[#b0891f] text-[#141413] font-bold text-sm transition-all shadow-lg"
                  >
                    <span>
                      {lang === 'ar' ? homepageConfig.heroCtaAr : homepageConfig.heroCtaEn}
                    </span>
                    <DirArrow className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('search', { categoryId: 'perfumes' })}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/15 transition-all"
                  >
                    <span>{t('دار العود والعطور الملكية', 'Royal Oud & Perfumes')}</span>
                  </button>
                </div>
              </div>

              {/* Trust Metrics Strip */}
              <div className="relative z-10 mt-10 pt-6 border-t border-white/15 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-lg sm:text-xl font-bold text-[#F5E6C8] font-mono">
                    {activeProducts.length}+
                  </div>
                  <div className="text-xs text-[#D6D0C4]">
                    {t('منتج فاخر وموثق', 'Verified Luxury Items')}
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-[#F5E6C8] font-mono">
                    {sellers.filter((s) => s.status === 'approved').length} {t('متاجر', 'Boutiques')}
                  </div>
                  <div className="text-xs text-[#D6D0C4]">
                    {t('سجل تجاري وضريبي معتمد', 'CR & ZATCA Verified')}
                  </div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-[#F5E6C8] font-mono">
                    15% VAT
                  </div>
                  <div className="text-xs text-[#D6D0C4]">
                    {t('فواتير ضريبية سعودية رسمية', 'Official Saudi Tax Invoices')}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Asymmetric Spotlight Stack (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              {heroSpotlightProduct && (
                <div
                  onClick={() => navigateTo('product', { productId: heroSpotlightProduct.id })}
                  className="group flex-1 rounded-2xl bg-[#1E1E1C] border border-white/10 hover:border-[#C59B27]/60 p-5 flex items-center gap-5 cursor-pointer transition-all"
                >
                  <img
                    src={heroSpotlightProduct.images[0]}
                    alt={lang === 'ar' ? heroSpotlightProduct.titleAr : heroSpotlightProduct.titleEn}
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover bg-[#2A2A27] shrink-0 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-xs text-[#C59B27] font-semibold">
                      {t('إصدار حصري مختار', 'Curated Flagship Piece')} ·{' '}
                      {lang === 'ar' ? heroSpotlightProduct.brandNameAr : heroSpotlightProduct.brandNameEn}
                    </div>
                    <h2 className="text-base font-bold text-white line-clamp-2 group-hover:text-[#F5E6C8] transition-colors">
                      {lang === 'ar' ? heroSpotlightProduct.titleAr : heroSpotlightProduct.titleEn}
                    </h2>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-lg font-bold text-[#C59B27] font-mono">
                        {formatPrice(heroSpotlightProduct.price)}
                      </span>
                      {heroSpotlightProduct.originalPrice > heroSpotlightProduct.price && (
                        <span className="text-xs text-[#8C857B] line-through font-mono">
                          {formatPrice(heroSpotlightProduct.originalPrice)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#D6D0C4] pt-1 inline-flex items-center gap-1">
                      <span>{t('استكشف المواصفات والضمان', 'Explore specs & warranty')}</span>
                      <DirArrow className="w-3.5 h-3.5 text-[#C59B27]" />
                    </div>
                  </div>
                </div>
              )}

              {secondarySpotlightProduct && (
                <div
                  onClick={() => navigateTo('product', { productId: secondarySpotlightProduct.id })}
                  className="group flex-1 rounded-2xl bg-[#1E1E1C] border border-white/10 hover:border-[#C59B27]/60 p-5 flex items-center gap-5 cursor-pointer transition-all"
                >
                  <img
                    src={secondarySpotlightProduct.images[0]}
                    alt={
                      lang === 'ar'
                        ? secondarySpotlightProduct.titleAr
                        : secondarySpotlightProduct.titleEn
                    }
                    referrerPolicy="no-referrer"
                    className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover bg-[#2A2A27] shrink-0 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-xs text-[#C59B27] font-semibold">
                      {lang === 'ar'
                        ? homepageConfig.heroSecondaryBannerTitleAr
                        : homepageConfig.heroSecondaryBannerTitleEn}
                    </div>
                    <h2 className="text-base font-bold text-white line-clamp-2 group-hover:text-[#F5E6C8] transition-colors">
                      {lang === 'ar'
                        ? secondarySpotlightProduct.titleAr
                        : secondarySpotlightProduct.titleEn}
                    </h2>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-lg font-bold text-[#C59B27] font-mono">
                        {formatPrice(secondarySpotlightProduct.price)}
                      </span>
                      {secondarySpotlightProduct.originalPrice > secondarySpotlightProduct.price && (
                        <span className="text-xs text-[#8C857B] line-through font-mono">
                          {formatPrice(secondarySpotlightProduct.originalPrice)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#D6D0C4] pt-1 inline-flex items-center gap-1">
                      <span>{t('اطلب الآن مع تغليف ملكي', 'Order now with royal packaging')}</span>
                      <DirArrow className="w-3.5 h-3.5 text-[#C59B27]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. SAUDI LUXURY GUARANTEES & COUPON BAR */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: ShieldCheck,
              titleAr: 'ضمان الأصالة وتوثيق المتاجر ١٠٠٪',
              titleEn: '100% Authentic & Verified Boutiques',
              descAr: 'جميع التجار مسجلون رسمياً بسجل تجاري ورقم ضريبي سعودي',
              descEn: 'All merchants hold verified Saudi CR & ZATCA tax certificates',
            },
            {
              icon: Truck,
              titleAr: 'توصيل VIP سريع ومؤمّن',
              titleEn: 'Insured Express VIP Delivery',
              descAr: `شحن مجاني للطلبات فوق ${formatPrice(homepageConfig.freeShippingThreshold)} لجميع مدن المملكة`,
              descEn: `Free delivery over ${formatPrice(homepageConfig.freeShippingThreshold)} across KSA`,
            },
            {
              icon: Award,
              titleAr: 'برنامج ولاء «أثيل رويال»',
              titleEn: 'Atheel Royal Loyalty Program',
              descAr: 'اكسب نقاط مكافآت فورية واستبدلها برصيد في محفظتك',
              descEn: 'Earn instant reward points & redeem directly to your wallet',
            },
            {
              icon: Gift,
              titleAr: 'خيارات دفع سعودية مرنة وآمنة',
              titleEn: 'Trusted Saudi Payment Options',
              descAr: 'مدى، Apple Pay، STC Pay، البطاقات الائتمانية، والدفع عند الاستلام',
              descEn: 'Mada, Apple Pay, STC Pay, Credit Cards & Cash on Delivery',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 border border-[#E6E0D6] flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center text-[#0B4F3F] shrink-0">
                  <Icon className="w-5 h-5 text-[#C59B27]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#141413]">
                    {lang === 'ar' ? item.titleAr : item.titleEn}
                  </h3>
                  <p className="text-[11px] text-[#57534E] mt-1 leading-relaxed">
                    {lang === 'ar' ? item.descAr : item.descEn}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. SHOP BY 16 CATEGORIES */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0B4F3F]">
              {t('دليل الأقسام الشامل', 'Complete Marketplace Directory')}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141413] mt-1">
              {t('تسوّق حسب التصنيف (١٦ قسماً متخصصاً)', 'Shop by Category (16 Curated Departments)')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigateTo('search', { categoryId: 'all' })}
            className="text-xs font-bold text-[#0B4F3F] hover:underline inline-flex items-center gap-1.5"
          >
            <span>{t('عرض الكتالوج الكامل', 'View Full Catalog')}</span>
            <DirArrow className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigateTo('search', { categoryId: cat.id })}
              className="group bg-white rounded-xl p-3 border border-[#E6E0D6] hover:border-[#0B4F3F] transition-all text-center flex flex-col items-center gap-2.5 shadow-2xs hover:shadow-md"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F3EFEA] border border-[#E6E0D6] group-hover:scale-105 transition-transform">
                <img
                  src={cat.image}
                  alt={lang === 'ar' ? cat.nameAr : cat.nameEn}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#141413] group-hover:text-[#0B4F3F] transition-colors line-clamp-1">
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </h3>
                <p className="text-[10px] text-[#8C857B] mt-0.5">
                  {cat.subcategories.length} {t('أقسام فرعية', 'subcategories')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. FLASH DEALS SECTION */}
      {homepageConfig.flashDealsActive && flashDealProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-[#141413] via-[#1C1B19] to-[#0B4F3F] p-6 sm:p-8 text-white border border-[#C59B27]/30 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#C59B27] text-[#141413] flex items-center justify-center">
                  <Zap className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      {t('العروض الخاطفة الحصرية', 'Exclusive Flash Deals')}
                    </h2>
                    <span className="text-xs text-[#F5E6C8]">
                      · {t('كميات محدودة بأسعار استثنائية', 'Limited stock at exceptional prices')}
                    </span>
                  </div>
                  <p className="text-xs text-[#D6D0C4] mt-0.5">
                    {t(
                      'تخفيضات فورية من المتاجر السعودية الموثقة شاملة ضريبة القيمة المضافة ١٥٪',
                      'Instant markdowns from verified Saudi boutiques including 15% VAT'
                    )}
                  </p>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-[#F5E6C8]">
                  <Clock className="w-4 h-4 text-[#C59B27]" />
                  <span>{t('ينتهي العرض خلال:', 'Ends in:')}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
                  <span className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[#F5E6C8]">
                    {String(countdown.hours).padStart(2, '0')}h
                  </span>
                  <span>:</span>
                  <span className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[#F5E6C8]">
                    {String(countdown.minutes).padStart(2, '0')}m
                  </span>
                  <span>:</span>
                  <span className="px-2.5 py-1.5 rounded-lg bg-[#C59B27] text-[#141413]">
                    {String(countdown.seconds).padStart(2, '0')}s
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {flashDealProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. CURATED PRODUCT TABS: RECOMMENDED / TRENDING / BEST SELLERS / NEW ARRIVALS */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-4">
          <div>
            <p className="text-xs font-semibold text-[#0B4F3F]">
              {t('مختارات أثيل الذكية', 'Atheel Smart Curation')}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141413] mt-1">
              {t('أبرز المنتجات المختارة لك', 'Spotlight Marketplace Collection')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#F3EFEA] border border-[#E6E0D6]">
            {(
              [
                { id: 'recommended', labelAr: 'موصى به لك', labelEn: 'Recommended', icon: Sparkles },
                { id: 'trending', labelAr: 'الرائج الآن', labelEn: 'Trending Now', icon: Flame },
                { id: 'bestsellers', labelAr: 'الأكثر مبيعاً', labelEn: 'Best Sellers', icon: Award },
                { id: 'new', labelAr: 'وصل حديثاً', labelEn: 'New Arrivals', icon: Compass },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = curatedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCuratedTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#0B4F3F] text-white shadow-xs'
                      : 'text-[#57534E] hover:text-[#141413]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? tab.labelAr : tab.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {curatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. ACTIVE PROMOTIONAL COUPONS STRIP */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#141413]">
              {t('قسائم وكوبونات الخصم الفعالة (اضغط للنسخ والتفعيل الفوري)', 'Active Discount Coupons (Click to Copy & Apply)')}
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {coupons.filter((c) => c.isActive).slice(0, 3).map((coupon) => (
            <div
              key={coupon.id}
              className="bg-white rounded-xl p-4 border border-[#E6E0D6] flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0B4F3F]">
                  {lang === 'ar' ? coupon.titleAr : coupon.titleEn}
                </div>
                <div className="text-[11px] text-[#57534E] mt-1">
                  {t('الحد الأدنى للطلب:', 'Min. Order:')} {formatPrice(coupon.minOrderAmount)} ·{' '}
                  {coupon.sellerNameAr ? coupon.sellerNameAr : t('جميع المتاجر', 'All Boutiques')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCoupon(coupon.code)}
                className="px-3.5 py-2 rounded-lg bg-[#FBF7EC] hover:bg-[#F5E6C8] border border-[#C59B27]/40 text-xs font-mono font-bold text-[#141413] inline-flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copiedCode === coupon.code ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#0B4F3F]" />
                    <span>{t('تم التفعيل', 'Applied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#B8860B]" />
                    <span>{coupon.code}</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 7. PERSONALIZED BY INTEREST & LIFESTYLE */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0B4F3F]">
              {t('تسوق حسب أسلوب الحياة السعودي', 'Curated Saudi Lifestyle Collections')}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#141413] mt-1">
              {t('مجموعات مخصصة حسب اهتماماتك', 'Tailored to Your Interests')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'majlis', labelAr: 'فخامة المجلس والضيافة السعودية', labelEn: 'Saudi Majlis & Hospitality' },
                { id: 'horology', labelAr: 'الساعات السويسرية والأناقة الرجالية', labelEn: 'Fine Horology & Menswear' },
                { id: 'tech', labelAr: 'أحدث التقنيات ومكتب المستقبل', labelEn: 'Flagship Tech & Workspace' },
                { id: 'elegance', labelAr: 'الأزياء الراقية والعناية الفاخرة', labelEn: 'Couture & Luxury Beauty' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setInterestTab(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                  interestTab === item.id
                    ? 'bg-[#141413] text-[#F5E6C8] border-[#141413]'
                    : 'bg-white text-[#57534E] border-[#E6E0D6] hover:border-[#141413]'
                }`}
              >
                {lang === 'ar' ? item.labelAr : item.labelEn}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {interestProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 8. SEASONAL CAMPAIGN & VERIFIED SAUDI BOUTIQUES */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-6">
        <div className="rounded-2xl bg-[#F3EFEA] border border-[#E6E0D6] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#B8860B]">
                {t('الموسم الملكي والعروض الموسمية', 'Seasonal Luxury Campaign')}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#141413] mt-1">
                {lang === 'ar'
                  ? homepageConfig.seasonalBannerTitleAr
                  : homepageConfig.seasonalBannerTitleEn}
              </h2>
              <p className="text-xs sm:text-sm text-[#57534E] mt-1">
                {lang === 'ar'
                  ? homepageConfig.seasonalBannerSubtitleAr
                  : homepageConfig.seasonalBannerSubtitleEn}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('search', { categoryId: 'all' })}
              className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold transition-colors"
            >
              {t('تصفح جميع العروض الموسمية', 'Explore Seasonal Offers')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {seasonalProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 9. FEATURED BRANDS & VERIFIED SELLERS */}
      <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#0B4F3F]">
                {t('علامات تجارية عالمية ومحلية أصيلة', 'Authentic Global & Regional Maisons')}
              </p>
              <h2 className="text-xl font-bold text-[#141413] mt-0.5">
                {t('أبرز العلامات التجارية المعتمدة في أثيل', 'Featured Official Brands')}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {brands.slice(0, 16).map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => navigateTo('search', { query: lang === 'ar' ? brand.nameAr : brand.nameEn })}
                className="bg-white rounded-xl p-3.5 border border-[#E6E0D6] hover:border-[#0B4F3F] text-center transition-all group"
              >
                <div className="text-xs font-bold text-[#141413] group-hover:text-[#0B4F3F] truncate">
                  {lang === 'ar' ? brand.nameAr : brand.nameEn}
                </div>
                <div className="text-[10px] text-[#8C857B] mt-1 truncate">
                  {lang === 'ar' ? brand.originAr : brand.originEn}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Verified Saudi Sellers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#0B4F3F]">
                {t('شركاء النجاح من المتاجر السعودية', 'Verified Saudi Merchant Partners')}
              </p>
              <h2 className="text-xl font-bold text-[#141413] mt-0.5">
                {t('تسوّق من نخبة المتاجر السعودية الموثقة', 'Shop Verified Saudi Boutiques')}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sellers
              .filter((s) => s.status === 'approved')
              .slice(0, 4)
              .map((seller) => (
                <div
                  key={seller.id}
                  onClick={() => navigateTo('search', { sellerId: seller.id })}
                  className="bg-white rounded-xl p-4 border border-[#E6E0D6] hover:border-[#0B4F3F] cursor-pointer transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#141413]">
                        <Store className="w-4 h-4 text-[#0B4F3F]" />
                        <span>{lang === 'ar' ? seller.nameAr : seller.nameEn}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#B8860B]">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {seller.rating}
                      </span>
                    </div>
                    <p className="text-xs text-[#57534E] mt-2 line-clamp-2">
                      {lang === 'ar' ? seller.descriptionAr : seller.descriptionEn}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#F3EFEA] flex items-center justify-between text-[11px] text-[#8C857B]">
                    <span className="inline-flex items-center gap-1 text-[#0B4F3F] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {lang === 'ar' ? seller.cityAr : seller.cityEn}
                    </span>
                    <span className="font-mono">CR: {seller.crNumber}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* 10. RECENTLY VIEWED PRODUCTS */}
      {recentlyViewedProducts.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 lg:px-8 space-y-5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#0B4F3F]" />
            <h2 className="text-lg font-bold text-[#141413]">
              {t('منتجات شاهدتها مؤخراً', 'Recently Viewed Items')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentlyViewedProducts.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
