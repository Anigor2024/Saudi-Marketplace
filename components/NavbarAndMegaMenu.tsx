'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Bell,
  Globe,
  MapPin,
  ChevronDown,
  ShieldCheck,
  Store,
  LayoutDashboard,
  Sparkles,
  ArrowLeftRight,
  Menu,
  X,
  Clock,
  TrendingUp,
  Package,
  HelpCircle,
  LogOut,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { UserRole } from '../lib/types';

const SAUDI_CITIES = [
  { ar: 'الرياض', en: 'Riyadh' },
  { ar: 'جدة', en: 'Jeddah' },
  { ar: 'الخبر', en: 'Al Khobar' },
  { ar: 'الدمام', en: 'Dammam' },
  { ar: 'مكة المكرمة', en: 'Makkah' },
  { ar: 'المدينة المنورة', en: 'Madinah' },
  { ar: 'أبها', en: 'Abha' },
  { ar: 'تبوك', en: 'Tabuk' },
];

export function NavbarAndMegaMenu() {
  const {
    lang,
    setLang,
    t,
    formatPrice,
    activeView,
    navigateTo,
    currentUser,
    isAuthLoading,
    isDemoMode,
    canAccessSellerDashboard,
    canAccessAdminDashboard,
    exitDemoMode,
    loginWithDemoRole,
    logout,
    categories,
    products,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    recentSearches,
    addRecentSearch,
    cartSummary,
    wishlistIds,
    compareIds,
    notifications,
    markAllNotificationsRead,
    publicPlatformSettings,
  } = useMarketplace();

  const [selectedCity, setSelectedCity] = useState(SAUDI_CITIES[0]);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeMegaCategory, setActiveMegaCategory] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifContainerRef.current && !notifContainerRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Live Search Suggestions
  const searchSuggestions = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.status === 'active' &&
          (p.titleAr.toLowerCase().includes(q) ||
            p.titleEn.toLowerCase().includes(q) ||
            p.brandNameAr.toLowerCase().includes(q) ||
            p.brandNameEn.toLowerCase().includes(q) ||
            p.subcategoryAr.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [searchQuery, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
    }
    setSearchFocused(false);
    navigateTo('search', { query: searchQuery });
  };

  const currentMegaCatObj = categories.find((c) => c.id === activeMegaCategory);
  const megaCatProducts = React.useMemo(() => {
    if (!activeMegaCategory) return [];
    return products.filter((p) => p.categoryId === activeMegaCategory && p.status === 'active').slice(0, 3);
  }, [activeMegaCategory, products]);

  return (
    <>
      {/* Storefront Maintenance Banner (never blocks Admin Console access) */}
      {publicPlatformSettings.maintenanceBannerActive &&
        (publicPlatformSettings.maintenanceBannerAr ||
          publicPlatformSettings.maintenanceBannerEn) && (
          <div
            role="status"
            className="bg-amber-600 text-white text-xs border-b border-amber-500/40"
          >
            <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#F5E6C8] shrink-0" />
                <span>
                  {lang === 'ar'
                    ? publicPlatformSettings.maintenanceBannerAr ||
                      publicPlatformSettings.maintenanceBannerEn
                    : publicPlatformSettings.maintenanceBannerEn ||
                      publicPlatformSettings.maintenanceBannerAr}
                </span>
              </div>
              {canAccessAdminDashboard && activeView !== 'admin-dashboard' && (
                <button
                  type="button"
                  onClick={() => navigateTo('admin-dashboard')}
                  className="px-2.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[11px] font-bold transition-colors"
                >
                  {t('إدارة التنبيه من الإعدادات', 'Manage in Admin Settings')}
                </button>
              )}
            </div>
          </div>
        )}

      {/* TOP BAR: Role Switcher + Saudi City + Language + VAT Notice */}
      <div className="bg-[#141413] text-[#FAF8F5] text-xs border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
          {/* Left/Start: City Delivery & Official Saudi Guarantee */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="inline-flex items-center gap-1.5 text-[#E6E0D6] hover:text-white transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>{t('التوصيل إلى:', 'Deliver to:')}</span>
                <strong className="text-white font-semibold">
                  {lang === 'ar' ? selectedCity.ar : selectedCity.en}
                </strong>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {cityDropdownOpen && (
                <div className="absolute top-full mt-1.5 start-0 w-44 bg-white text-[#141413] rounded-lg shadow-xl border border-[#E6E0D6] py-1.5 z-50">
                  {SAUDI_CITIES.map((city) => (
                    <button
                      key={city.en}
                      type="button"
                      onClick={() => {
                        setSelectedCity(city);
                        setCityDropdownOpen(false);
                      }}
                      className="w-full px-3.5 py-1.5 text-start text-xs hover:bg-[#F3EFEA] flex items-center justify-between"
                    >
                      <span>{lang === 'ar' ? city.ar : city.en}</span>
                      {selectedCity.en === city.en && <CheckCircle2 className="w-3.5 h-3.5 text-[#0B4F3F]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="hidden md:inline-flex items-center gap-1.5 text-[#D6D0C4]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C59B27]" />
              {t(
                'متاجر سعودية موثقة ١٠٠٪ • فواتير ضريبية معتمدة ZATCA',
                '100% Verified Saudi Boutiques • ZATCA Tax Invoices'
              )}
            </span>
          </div>

          {/* Center/Right: Instant Demo Role Access Switcher + Language Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 ms-auto">
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/10">
              <span className="hidden xl:inline-block px-2 text-[11px] text-[#C59B27] font-medium">
                {t('وضع العرض التجريبي (Demo):', 'Portfolio Demo Mode:')}
              </span>
              {(
                [
                  { role: 'customer' as UserRole, labelAr: 'عميل VIP', labelEn: 'Demo Customer' },
                  { role: 'seller' as UserRole, labelAr: 'مركز التاجر', labelEn: 'Demo Seller' },
                  { role: 'admin' as UserRole, labelAr: 'لوحة الإدارة', labelEn: 'Demo Admin' },
                ] as const
              ).map((item) => {
                const isActiveRole = isDemoMode && currentUser?.role === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => loginWithDemoRole(item.role)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      isActiveRole
                        ? 'bg-[#C59B27] text-[#141413] shadow-sm'
                        : 'text-[#E6E0D6] hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? item.labelAr : item.labelEn}
                  </button>
                );
              })}
              {isDemoMode && (
                <button
                  type="button"
                  onClick={exitDemoMode}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-amber-300 hover:text-white transition-colors"
                  title={t('الخروج من وضع العرض التجريبي', 'Exit Demo Mode')}
                >
                  × {t('إنهاء', 'Exit')}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateTo('help')}
              className="hidden sm:inline-flex items-center gap-1 text-[#E6E0D6] hover:text-white transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{t('مركز المساعدة', 'Help Center')}</span>
            </button>

            <button
              type="button"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN HEADER: Brand Logo + Smart Search + Quick Action Icons */}
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E6E0D6]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 lg:gap-8">
          {/* Mobile Menu Button & Brand Wordmark */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#E6E0D6] text-[#141413] hover:bg-[#F3EFEA]"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="flex items-center gap-3 text-start group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0B4F3F] flex items-center justify-center text-[#F5E6C8] shadow-sm border border-[#C59B27]/40 group-hover:bg-[#083B2F] transition-colors">
                <Crown className="w-5 h-5 text-[#C59B27]" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-[#141413]">
                    {lang === 'ar'
                      ? publicPlatformSettings.marketplaceNameAr || 'أثـيـل'
                      : publicPlatformSettings.marketplaceNameEn || 'ATHEEL'}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/30 font-semibold">
                    {lang === 'ar' ? 'السعودية' : 'KSA LUXURY'}
                  </span>
                </div>
                <p className="text-[11px] text-[#8C857B] hidden sm:block">
                  {t('سوق الفخامة السعودي متعدد التجار', 'Saudi Multi-Vendor Luxury Marketplace')}
                </p>
              </div>
            </button>
          </div>

          {/* Smart Search Bar with Instant Suggestions */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-2xl hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t(
                  'ابحث عن ساعات سويسرية، دهن عود ملكي، آيفون ١٦ برو، مكائن قهوة...',
                  'Search Swiss watches, royal oud, iPhone 16 Pro, espresso machines...'
                )}
                className="w-full ps-4 pe-28 py-2.5 rounded-xl bg-white border border-[#E6E0D6] focus:border-[#0B4F3F] focus:outline-none text-sm text-[#141413] placeholder:text-[#8C857B] shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute end-20 p-1 text-[#8C857B] hover:text-[#141413]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute end-1.5 px-4 py-1.5 rounded-lg bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t('بحث', 'Search')}</span>
              </button>
            </form>

            {/* Instant Search Autocomplete Dropdown */}
            {searchFocused && (
              <div className="absolute top-full mt-2 inset-x-0 bg-white rounded-2xl shadow-2xl border border-[#E6E0D6] p-4 z-50">
                {searchQuery.trim().length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#8C857B] mb-2.5">
                      <span>{t('نتائج مقترحة فورية', 'Instant Matching Products')}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchFocused(false);
                          navigateTo('search', { query: searchQuery });
                        }}
                        className="text-[#0B4F3F] font-semibold hover:underline"
                      >
                        {t('عرض كل النتائج ←', 'View all results →')}
                      </button>
                    </div>
                    {searchSuggestions.length > 0 ? (
                      <div className="divide-y divide-[#F3EFEA]">
                        {searchSuggestions.map((prod) => (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              addRecentSearch(lang === 'ar' ? prod.titleAr : prod.titleEn);
                              setSearchFocused(false);
                              navigateTo('product', { productId: prod.id });
                            }}
                            className="w-full py-2.5 px-2 hover:bg-[#FAF8F5] rounded-lg flex items-center justify-between gap-3 text-start transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={prod.images[0]}
                                alt=""
                                className="w-11 h-11 rounded-lg object-cover bg-[#F3EFEA] shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#141413] truncate">
                                  {lang === 'ar' ? prod.titleAr : prod.titleEn}
                                </p>
                                <p className="text-[11px] text-[#8C857B]">
                                  {lang === 'ar' ? prod.brandNameAr : prod.brandNameEn} •{' '}
                                  {lang === 'ar' ? prod.sellerNameAr : prod.sellerNameEn}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#0B4F3F] font-mono shrink-0">
                              {formatPrice(prod.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8C857B] py-4 text-center">
                        {t('لا توجد نتائج مطابقة، جرب البحث بكلمات أخرى', 'No instant matches found')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#57534E] mb-2">
                        <Clock className="w-3.5 h-3.5 text-[#8C857B]" />
                        <span>{t('عمليات البحث الأخيرة', 'Recent Searches')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((term) => (
                          <button
                            key={term}
                            type="button"
                            onClick={() => {
                              setSearchQuery(term);
                              setSearchFocused(false);
                              navigateTo('search', { query: term });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#F3EFEA] hover:bg-[#E6E0D6] text-xs text-[#141413] transition-colors"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#57534E] mb-2">
                        <TrendingUp className="w-3.5 h-3.5 text-[#C59B27]" />
                        <span>{t('الأكثر بحثاً في السعودية', 'Trending in Saudi Arabia')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          t('ساعة أوتوماتيك', 'Swiss Watch'),
                          t('دهن عود كمبودي', 'Cambodian Oud'),
                          t('آيفون ١٦ برو ماكس', 'iPhone 16 Pro Max'),
                          t('بريفيل أوراكل', 'Breville Oracle'),
                          t('عباية حرير', 'Silk Abaya'),
                          t('دايسون إير راب', 'Dyson Airwrap'),
                        ].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setSearchQuery(tag);
                              setSearchFocused(false);
                              navigateTo('search', { query: tag });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#FBF7EC] hover:bg-[#F5E6C8] text-xs text-[#141413] border border-[#C59B27]/30 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Bar: Role Portal Button, Notifications, Compare, Wishlist, Account, Cart */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Role Specific Dashboard Shortcut */}
            {canAccessSellerDashboard && (
              <button
                type="button"
                onClick={() => navigateTo('seller-dashboard')}
                className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  activeView === 'seller-dashboard'
                    ? 'bg-[#0B4F3F] text-white border-[#0B4F3F]'
                    : 'bg-[#EBF3F0] text-[#0B4F3F] border-[#0B4F3F]/20 hover:bg-[#0B4F3F] hover:text-white'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>{t('لوحة التاجر', 'Seller Center')}</span>
              </button>
            )}

            {canAccessAdminDashboard && (
              <button
                type="button"
                onClick={() => navigateTo('admin-dashboard')}
                className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  activeView === 'admin-dashboard'
                    ? 'bg-[#141413] text-[#F5E6C8] border-[#141413]'
                    : 'bg-[#FBF7EC] text-[#141413] border-[#C59B27]/40 hover:bg-[#141413] hover:text-[#F5E6C8]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-[#C59B27]" />
                <span>{t('لوحة الإدارة التنفيذية', 'Executive Admin')}</span>
              </button>
            )}

            {/* Notifications Dropdown */}
            <div ref={notifContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#141413]/30 text-[#141413] transition-colors"
                title={t('الإشعارات', 'Notifications')}
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-[#9E2A2B] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-full mt-2 end-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E6E0D6] p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F3EFEA]">
                    <span className="text-sm font-bold text-[#141413]">
                      {t('مركز الإشعارات', 'Notifications')}
                    </span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs text-[#0B4F3F] font-semibold hover:underline"
                    >
                      {t('تحديد الكل كمقروء', 'Mark all read')}
                    </button>
                  </div>
                  <div className="divide-y divide-[#F3EFEA] max-h-80 overflow-y-auto my-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setNotifOpen(false);
                          if (n.linkView) navigateTo(n.linkView as any);
                        }}
                        className={`py-3 px-2 rounded-lg cursor-pointer hover:bg-[#FAF8F5] transition-colors ${
                          !n.read ? 'bg-[#FBF7EC]/50' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-[#141413]">
                            {lang === 'ar' ? n.titleAr : n.titleEn}
                          </span>
                          <span className="text-[10px] text-[#8C857B] shrink-0">{n.createdAt}</span>
                        </div>
                        <p className="text-xs text-[#57534E] leading-relaxed">
                          {lang === 'ar' ? n.messageAr : n.messageEn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Compare Button */}
            <button
              type="button"
              onClick={() => navigateTo('compare')}
              className="relative hidden sm:inline-flex p-2.5 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#141413]/30 text-[#141413] transition-colors"
              title={t('مقارنة المنتجات', 'Compare Products')}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {compareIds.length > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-[#0B4F3F] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                  {compareIds.length}
                </span>
              )}
            </button>

            {/* Wishlist Button */}
            <button
              type="button"
              onClick={() => navigateTo('wishlist')}
              className="relative p-2.5 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#141413]/30 text-[#141413] transition-colors"
              title={t('قائمة الأمنيات', 'Wishlist')}
            >
              <Heart className="w-4 h-4" />
              {wishlistIds.length > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-[#C59B27] text-[#141413] text-[10px] font-bold flex items-center justify-center font-mono">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            {/* User Account / Login Button */}
            {isAuthLoading ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D6] text-xs text-[#8C857B] animate-pulse">
                {t('جاري التحقق...', 'Checking...')}
              </div>
            ) : currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigateTo('account')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#0B4F3F] transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-[#0B4F3F] text-white text-xs font-bold flex items-center justify-center">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-start">
                    <div className="text-[11px] font-bold text-[#141413] leading-none truncate max-w-[110px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-[#0B4F3F] font-medium mt-0.5">
                      {isDemoMode
                        ? t(`وضع تجريبي (${currentUser.role})`, `Demo (${currentUser.role})`)
                        : currentUser.role === 'admin'
                        ? t('مسؤول النظام', 'Executive Admin')
                        : currentUser.role === 'seller'
                        ? t('تاجر معتمد', 'Verified Seller')
                        : `${currentUser.loyaltyPoints.toLocaleString()} ${t('نقطة', 'pts')}`}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2.5 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#9E2A2B] text-[#57534E] hover:text-[#9E2A2B] transition-colors"
                  title={t('تسجيل الخروج', 'Sign Out')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#141413] text-xs font-semibold text-[#141413]"
              >
                <User className="w-4 h-4" />
                <span>{t('دخول / تسجيل', 'Sign In')}</span>
              </button>
            )}

            {/* Shopping Bag Button */}
            <button
              type="button"
              onClick={() => navigateTo('cart')}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white transition-all shadow-xs"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4 text-[#F5E6C8]" />
                <span className="absolute -top-2 -end-2 w-4 h-4 rounded-full bg-[#C59B27] text-[#141413] text-[10px] font-bold flex items-center justify-center font-mono">
                  {cartSummary.itemCount}
                </span>
              </div>
              <div className="hidden sm:block text-start">
                <div className="text-[10px] text-[#E6E0D6] leading-none">
                  {t('حقيبة التسوق', 'Shopping Bag')}
                </div>
                <div className="text-xs font-bold font-mono leading-tight mt-0.5">
                  {formatPrice(cartSummary.total)}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('ابحث في أثيل عن الساعات، العطور، الجوالات...', 'Search Atheel luxury catalog...')}
              className="w-full ps-3.5 pe-20 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs text-[#141413]"
            />
            <button
              type="submit"
              className="absolute end-1 px-3 py-1.5 rounded-lg bg-[#0B4F3F] text-white text-xs font-semibold"
            >
              {t('بحث', 'Search')}
            </button>
          </form>
        </div>

        {/* MEGA MENU CATEGORY BAR (Desktop) */}
        <div
          onMouseLeave={() => setActiveMegaCategory(null)}
          className="hidden lg:block bg-[#F3EFEA]/80 border-t border-[#E6E0D6] relative"
        >
          <div className="max-w-[1440px] mx-auto px-8 flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => navigateTo('search', { categoryId: 'all' })}
              className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
                selectedCategoryId === 'all' && activeView === 'search'
                  ? 'border-[#0B4F3F] text-[#0B4F3F]'
                  : 'border-transparent text-[#141413] hover:text-[#0B4F3F]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{t('جميع الأقسام (١٦)', 'All Categories (16)')}</span>
            </button>

            {categories.slice(0, 11).map((cat) => {
              const isSelected = selectedCategoryId === cat.id && activeView === 'search';
              return (
                <button
                  key={cat.id}
                  type="button"
                  onMouseEnter={() => setActiveMegaCategory(cat.id)}
                  onClick={() => {
                    setActiveMegaCategory(null);
                    navigateTo('search', { categoryId: cat.id });
                  }}
                  className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                    isSelected || activeMegaCategory === cat.id
                      ? 'border-[#0B4F3F] text-[#0B4F3F] bg-white/60'
                      : 'border-transparent text-[#57534E] hover:text-[#141413]'
                  }`}
                >
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </button>
              );
            })}

            {/* More Categories Dropdown Trigger */}
            <div className="ms-auto flex items-center gap-3 py-1.5">
              <button
                type="button"
                onClick={() => navigateTo('orders')}
                className="text-xs font-semibold text-[#57534E] hover:text-[#0B4F3F] flex items-center gap-1 whitespace-nowrap"
              >
                <Package className="w-3.5 h-3.5" />
                <span>{t('تتبع طلباتي', 'Track Orders')}</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTo('seller-dashboard')}
                className="text-xs font-semibold text-[#0B4F3F] hover:underline flex items-center gap-1 whitespace-nowrap"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{t('بيع على أثيل', 'Sell on Atheel')}</span>
              </button>
            </div>
          </div>

          {/* Mega Menu Flyout Panel */}
          {currentMegaCatObj && (
            <div
              onMouseEnter={() => setActiveMegaCategory(currentMegaCatObj.id)}
              onMouseLeave={() => setActiveMegaCategory(null)}
              className="absolute top-full inset-x-0 bg-white border-b border-[#E6E0D6] shadow-2xl z-50 animate-in fade-in duration-150"
            >
              <div className="max-w-[1440px] mx-auto px-8 py-6 grid grid-cols-12 gap-8">
                {/* Col 1: Category Info & Subcategories */}
                <div className="col-span-4 border-e border-[#F3EFEA] pe-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-[#141413]">
                      {lang === 'ar' ? currentMegaCatObj.nameAr : currentMegaCatObj.nameEn}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMegaCategory(null);
                        navigateTo('search', { categoryId: currentMegaCatObj.id });
                      }}
                      className="text-xs font-semibold text-[#0B4F3F] hover:underline"
                    >
                      {t('تصفح القسم كاملاً ←', 'Explore All →')}
                    </button>
                  </div>
                  <p className="text-xs text-[#8C857B] mb-4">
                    {lang === 'ar' ? currentMegaCatObj.descriptionAr : currentMegaCatObj.descriptionEn}
                  </p>
                  <div className="space-y-1.5">
                    {currentMegaCatObj.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setActiveMegaCategory(null);
                          navigateTo('search', { categoryId: currentMegaCatObj.id });
                        }}
                        className="w-full px-3 py-2 rounded-lg text-start text-xs font-medium text-[#141413] hover:bg-[#F3EFEA] hover:text-[#0B4F3F] flex items-center justify-between transition-colors"
                      >
                        <span>{lang === 'ar' ? sub.nameAr : sub.nameEn}</span>
                        <span className="text-[#8C857B]">←</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Col 2: Spotlight Products in Category */}
                <div className="col-span-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C857B]">
                      {t('مختارات مميزة من هذا القسم', 'Curated Highlights in Category')}
                    </span>
                    {currentMegaCatObj.featuredBannerAr && (
                      <span className="text-xs font-medium text-[#B8860B] bg-[#FBF7EC] px-2.5 py-1 rounded-md border border-[#C59B27]/30">
                        {lang === 'ar' ? currentMegaCatObj.featuredBannerAr : currentMegaCatObj.featuredBannerEn}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {megaCatProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => {
                          setActiveMegaCategory(null);
                          navigateTo('product', { productId: prod.id });
                        }}
                        className="group flex items-center gap-3 p-2.5 rounded-xl border border-[#E6E0D6] hover:border-[#0B4F3F] bg-[#FAF8F5] cursor-pointer transition-all"
                      >
                        <img
                          src={prod.images[0]}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover bg-white shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#141413] line-clamp-2 group-hover:text-[#0B4F3F]">
                            {lang === 'ar' ? prod.titleAr : prod.titleEn}
                          </p>
                          <p className="text-xs font-bold text-[#0B4F3F] font-mono mt-1">
                            {formatPrice(prod.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-[#FAF8F5] h-full overflow-y-auto p-5 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E6E0D6]">
                <span className="text-lg font-bold text-[#141413]">
                  {t('أثيل | القائمة الرئيسية', 'Atheel Menu')}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-white border border-[#E6E0D6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Role Quick Switcher in Mobile Drawer */}
              <div className="my-4 p-3 rounded-xl bg-[#141413] text-white">
                <p className="text-[11px] text-[#C59B27] font-semibold mb-2">
                  {t('تبديل سريع لحساب التجربة (Demo Roles):', 'Quick Switch Demo Role:')}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      loginWithDemoRole('customer');
                      setMobileMenuOpen(false);
                    }}
                    className={`py-1.5 rounded text-xs font-semibold ${
                      isDemoMode && currentUser?.role === 'customer'
                        ? 'bg-[#C59B27] text-black'
                        : 'bg-white/10'
                    }`}
                  >
                    {t('عميل', 'Customer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loginWithDemoRole('seller');
                      setMobileMenuOpen(false);
                    }}
                    className={`py-1.5 rounded text-xs font-semibold ${
                      isDemoMode && currentUser?.role === 'seller'
                        ? 'bg-[#C59B27] text-black'
                        : 'bg-white/10'
                    }`}
                  >
                    {t('تاجر', 'Seller')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      loginWithDemoRole('admin');
                      setMobileMenuOpen(false);
                    }}
                    className={`py-1.5 rounded text-xs font-semibold ${
                      isDemoMode && currentUser?.role === 'admin'
                        ? 'bg-[#C59B27] text-black'
                        : 'bg-white/10'
                    }`}
                  >
                    {t('إدارة', 'Admin')}
                  </button>
                </div>
              </div>

              <p className="text-xs font-bold uppercase text-[#8C857B] mb-2">
                {t('جميع الأقسام (١٦ تصنيفاً)', 'All 16 Categories')}
              </p>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigateTo('search', { categoryId: cat.id });
                    }}
                    className="w-full px-3 py-2 rounded-lg text-start text-xs font-semibold text-[#141413] hover:bg-white flex items-center justify-between"
                  >
                    <span>{lang === 'ar' ? cat.nameAr : cat.nameEn}</span>
                    <span className="text-[#8C857B]">←</span>
                  </button>
                ))}
              </div>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="mt-6 w-full py-2.5 rounded-xl border border-[#9E2A2B]/30 text-[#9E2A2B] text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('تسجيل الخروج', 'Sign Out')}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
