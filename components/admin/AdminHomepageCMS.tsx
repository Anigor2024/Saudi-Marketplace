'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutTemplate,
  Sparkles,
  Crown,
  Flame,
  Award,
  Compass,
  Zap,
  Gift,
  Truck,
  ShieldCheck,
  Search,
  RotateCcw,
  Save,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Store,
  Package,
  SlidersHorizontal,
  Globe,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { HomepageConfig, Product } from '@/lib/types';
import { INITIAL_HOMEPAGE_CONFIG } from '@/lib/seed-catalog';

type MerchandisingSlotKey =
  | 'isFeatured'
  | 'isTrending'
  | 'isBestSeller'
  | 'isNewArrival'
  | 'isSeasonal'
  | 'isFlashDeal';

export default function AdminHomepageCMS() {
  const {
    lang,
    t,
    formatPrice,
    navigateTo,
    isDemoMode,
    canAccessAdminDashboard,
    homepageConfig,
    privatePlatformSettings,
    updateHomepageConfig,
    products,
    categories,
    sellers,
    moderateProduct,
    auditLogs,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'hero_banners' | 'merchandising'>('hero_banners');

  // Draft state synced with live homepageConfig without cascading setState in useEffect
  const [draftOverrides, setDraftOverrides] = useState<Partial<HomepageConfig>>({});
  const draft = useMemo<HomepageConfig>(
    () => ({ ...homepageConfig, ...draftOverrides }),
    [homepageConfig, draftOverrides]
  );
  const setDraft = (
    updater: HomepageConfig | ((prev: HomepageConfig) => HomepageConfig)
  ) => {
    setDraftOverrides((prevOverrides) => {
      const currentDraft = { ...homepageConfig, ...prevOverrides };
      return typeof updater === 'function' ? updater(currentDraft) : updater;
    });
  };

  const [previewMode, setPreviewMode] = useState<'draft' | 'live'>('draft');
  const [previewLangOverride, setPreviewLangOverride] = useState<'ar' | 'en' | null>(null);
  const previewLang: 'ar' | 'en' = previewLangOverride ?? lang;
  const setPreviewLang = (nextLang: 'ar' | 'en') => setPreviewLangOverride(nextLang);
  const [isSaving, setIsSaving] = useState(false);
  const [showRestoreDefaultModal, setShowRestoreDefaultModal] = useState(false);

  // Merchandising state
  const [selectedSlot, setSelectedSlot] = useState<MerchandisingSlotKey>('isFeatured');
  const [merchSearch, setMerchSearch] = useState('');
  const [merchCategoryFilter, setMerchCategoryFilter] = useState('all');
  const [merchSellerFilter, setMerchSellerFilter] = useState('all');
  const [merchMembershipFilter, setMerchMembershipFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);

  const hasUnsavedChanges = useMemo(() => {
    return (
      draft.heroBadgeAr !== homepageConfig.heroBadgeAr ||
      draft.heroBadgeEn !== homepageConfig.heroBadgeEn ||
      draft.heroTitleAr !== homepageConfig.heroTitleAr ||
      draft.heroTitleEn !== homepageConfig.heroTitleEn ||
      draft.heroSubtitleAr !== homepageConfig.heroSubtitleAr ||
      draft.heroSubtitleEn !== homepageConfig.heroSubtitleEn ||
      draft.heroCtaAr !== homepageConfig.heroCtaAr ||
      draft.heroCtaEn !== homepageConfig.heroCtaEn ||
      draft.heroSecondaryBannerTitleAr !== homepageConfig.heroSecondaryBannerTitleAr ||
      draft.heroSecondaryBannerTitleEn !== homepageConfig.heroSecondaryBannerTitleEn ||
      draft.seasonalBannerTitleAr !== homepageConfig.seasonalBannerTitleAr ||
      draft.seasonalBannerTitleEn !== homepageConfig.seasonalBannerTitleEn ||
      draft.seasonalBannerSubtitleAr !== homepageConfig.seasonalBannerSubtitleAr ||
      draft.seasonalBannerSubtitleEn !== homepageConfig.seasonalBannerSubtitleEn ||
      draft.flashDealsActive !== homepageConfig.flashDealsActive ||
      Number(draft.freeShippingThreshold) !== Number(homepageConfig.freeShippingThreshold)
    );
  }, [draft, homepageConfig]);

  // Validation logic
  const validationErrors = useMemo(() => {
    const errs: { ar: string; en: string }[] = [];

    if (!draft.heroTitleAr || draft.heroTitleAr.trim().length < 2) {
      errs.push({
        ar: 'عنوان البانر الرئيسي (بالعربية) مطلوب ولا يمكن تركه فارغاً.',
        en: 'Arabic Hero Title is required and cannot be empty.',
      });
    } else if (draft.heroTitleAr.trim().length > 180) {
      errs.push({
        ar: 'عنوان البانر الرئيسي (بالعربية) يتجاوز الحد الأقصى (180 حرفاً).',
        en: 'Arabic Hero Title exceeds maximum length (180 characters).',
      });
    }

    if (!draft.heroTitleEn || draft.heroTitleEn.trim().length < 2) {
      errs.push({
        ar: 'عنوان البانر الرئيسي (بالإنجليزية) مطلوب ولا يمكن تركه فارغاً.',
        en: 'English Hero Title is required and cannot be empty.',
      });
    } else if (draft.heroTitleEn.trim().length > 180) {
      errs.push({
        ar: 'عنوان البانر الرئيسي (بالإنجليزية) يتجاوز الحد الأقصى (180 حرفاً).',
        en: 'English Hero Title exceeds maximum length (180 characters).',
      });
    }

    if ((draft.heroBadgeAr || '').trim().length < 1 || (draft.heroBadgeAr || '').trim().length > 140) {
      errs.push({
        ar: 'شارة البانر العلوية (بالعربية) يجب أن تكون بين حرف واحد و 140 حرفاً.',
        en: 'Arabic Hero Badge must be between 1 and 140 characters.',
      });
    }

    if ((draft.heroBadgeEn || '').trim().length < 1 || (draft.heroBadgeEn || '').trim().length > 140) {
      errs.push({
        ar: 'شارة البانر العلوية (بالإنجليزية) يجب أن تكون بين حرف واحد و 140 حرفاً.',
        en: 'English Hero Badge must be between 1 and 140 characters.',
      });
    }

    if ((draft.heroSubtitleAr || '').trim().length < 2 || (draft.heroSubtitleAr || '').trim().length > 350) {
      errs.push({
        ar: 'الوصف الفرعي للبانر (بالعربية) يجب أن يكون بين حرفين و 350 حرفاً.',
        en: 'Arabic Hero Subtitle must be between 2 and 350 characters.',
      });
    }

    if ((draft.heroSubtitleEn || '').trim().length < 2 || (draft.heroSubtitleEn || '').trim().length > 350) {
      errs.push({
        ar: 'الوصف الفرعي للبانر (بالإنجليزية) يجب أن يكون بين حرفين و 350 حرفاً.',
        en: 'English Hero Subtitle must be between 2 and 350 characters.',
      });
    }

    if ((draft.heroCtaAr || '').trim().length < 2 || (draft.heroCtaAr || '').trim().length > 100) {
      errs.push({
        ar: 'نص زر الإجراء الرئيسي (بالعربية) يجب أن يكون بين حرفين و 100 حرف.',
        en: 'Arabic Primary CTA text must be between 2 and 100 characters.',
      });
    }

    if ((draft.heroCtaEn || '').trim().length < 2 || (draft.heroCtaEn || '').trim().length > 100) {
      errs.push({
        ar: 'نص زر الإجراء الرئيسي (بالإنجليزية) يجب أن يكون بين حرفين و 100 حرف.',
        en: 'English Primary CTA text must be between 2 and 100 characters.',
      });
    }

    if (
      (draft.heroSecondaryBannerTitleAr || '').trim().length < 2 ||
      (draft.heroSecondaryBannerTitleAr || '').trim().length > 180 ||
      (draft.heroSecondaryBannerTitleEn || '').trim().length < 2 ||
      (draft.heroSecondaryBannerTitleEn || '').trim().length > 180
    ) {
      errs.push({
        ar: 'عنوان البانر الجانبي الثانوي مطلوب باللغتين (2 - 180 حرفاً).',
        en: 'Secondary Spotlight Banner Title is required in both languages (2 - 180 chars).',
      });
    }

    if (
      (draft.seasonalBannerTitleAr || '').trim().length < 2 ||
      (draft.seasonalBannerTitleAr || '').trim().length > 180 ||
      (draft.seasonalBannerTitleEn || '').trim().length < 2 ||
      (draft.seasonalBannerTitleEn || '').trim().length > 180
    ) {
      errs.push({
        ar: 'عنوان الحملة الموسمية مطلوب باللغتين (2 - 180 حرفاً).',
        en: 'Seasonal Campaign Title is required in both languages (2 - 180 chars).',
      });
    }

    if (
      (draft.seasonalBannerSubtitleAr || '').trim().length < 2 ||
      (draft.seasonalBannerSubtitleAr || '').trim().length > 350 ||
      (draft.seasonalBannerSubtitleEn || '').trim().length < 2 ||
      (draft.seasonalBannerSubtitleEn || '').trim().length > 350
    ) {
      errs.push({
        ar: 'وصف الحملة الموسمية مطلوب باللغتين (2 - 350 حرفاً).',
        en: 'Seasonal Campaign Subtitle is required in both languages (2 - 350 chars).',
      });
    }

    const threshold = Number(draft.freeShippingThreshold);
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100000) {
      errs.push({
        ar: 'حد الشحن المجاني يجب أن يكون رقماً غير سالب (0 إلى 100,000 ر.س).',
        en: 'Free shipping threshold must be a non-negative number (0 to 100,000 SAR).',
      });
    }

    return errs;
  }, [draft]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  );

  const heroSpotlightProduct = activeProducts[0];
  const secondarySpotlightProduct = activeProducts[4] || activeProducts[1];

  const previewData: HomepageConfig = previewMode === 'live' ? homepageConfig : draft;
  const isPreviewRtl = previewLang === 'ar';
  const PreviewArrow = isPreviewRtl ? ArrowLeft : ArrowRight;

  const handleSaveHeroConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationErrors.length > 0) return;
    setIsSaving(true);
    const ok = await updateHomepageConfig(draft);
    setIsSaving(false);
    if (ok) {
      setDraftOverrides({});
      setPreviewMode('live');
    }
  };

  const handleResetUnsaved = () => {
    setDraftOverrides({});
    setPreviewMode('draft');
  };

  const handleConfirmLoadDefaultsIntoDraft = () => {
    setDraft({
      ...INITIAL_HOMEPAGE_CONFIG,
      updatedAt: new Date().toISOString(),
    });
    setPreviewMode('draft');
    setShowRestoreDefaultModal(false);
  };

  // Merchandising Slot Definitions
  const merchandisingSlots: {
    key: MerchandisingSlotKey;
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    storefrontTargetAr: string;
    storefrontTargetEn: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }[] = useMemo(
    () => [
      {
        key: 'isFeatured',
        labelAr: 'المختارات الموصى بها (Featured)',
        labelEn: 'Featured Collection',
        descAr: 'تظهر في تبويب «موصى به لك» الافتراضي في الصفحة الرئيسية (حتى ٨ منتجات نشطة).',
        descEn: 'Displayed in the default "Recommended" tab on the storefront homepage (top 8 active).',
        storefrontTargetAr: 'تبويب: موصى به لك',
        storefrontTargetEn: 'Tab: Recommended',
        icon: Sparkles,
        count: products.filter((p) => p.status === 'active' && p.isFeatured).length,
      },
      {
        key: 'isTrending',
        labelAr: 'الرائج الآن (Trending Now)',
        labelEn: 'Trending Now',
        descAr: 'تظهر في تبويب «الرائج الآن» ضمن قسم مختارات أثيل الذكية.',
        descEn: 'Displayed in the "Trending Now" tab under Spotlight Marketplace Collection.',
        storefrontTargetAr: 'تبويب: الرائج الآن',
        storefrontTargetEn: 'Tab: Trending Now',
        icon: Flame,
        count: products.filter((p) => p.status === 'active' && p.isTrending).length,
      },
      {
        key: 'isBestSeller',
        labelAr: 'الأكثر مبيعاً (Best Sellers)',
        labelEn: 'Best Sellers',
        descAr: 'تظهر في تبويب «الأكثر مبيعاً» لإبراز القطع الأعلى طلباً في السوق.',
        descEn: 'Displayed in the "Best Sellers" tab highlighting high-velocity luxury pieces.',
        storefrontTargetAr: 'تبويب: الأكثر مبيعاً',
        storefrontTargetEn: 'Tab: Best Sellers',
        icon: Award,
        count: products.filter((p) => p.status === 'active' && p.isBestSeller).length,
      },
      {
        key: 'isNewArrival',
        labelAr: 'وصل حديثاً (New Arrivals)',
        labelEn: 'New Arrivals',
        descAr: 'تظهر في تبويب «وصل حديثاً» للإصدارات والمقتنيات المضافة مؤخراً.',
        descEn: 'Displayed in the "New Arrivals" tab for newly curated luxury editions.',
        storefrontTargetAr: 'تبويب: وصل حديثاً',
        storefrontTargetEn: 'Tab: New Arrivals',
        icon: Compass,
        count: products.filter((p) => p.status === 'active' && p.isNewArrival).length,
      },
      {
        key: 'isSeasonal',
        labelAr: 'مختارات الموسم الملكي (Seasonal Picks)',
        labelEn: 'Seasonal Picks',
        descAr: 'تظهر في قسم «الموسم الملكي والعروض الموسمية» أسفل البانر الموسمي.',
        descEn: 'Featured inside the "Seasonal Luxury Campaign" showcase section.',
        storefrontTargetAr: 'قسم: الحملة الموسمية',
        storefrontTargetEn: 'Section: Seasonal Campaign',
        icon: Gift,
        count: products.filter((p) => p.status === 'active' && p.isSeasonal).length,
      },
      {
        key: 'isFlashDeal',
        labelAr: 'العروض الخاطفة الحصرية (Flash Deals)',
        labelEn: 'Flash Deals',
        descAr: 'تظهر مع مؤقت العد التنازلي الحي عند تفعيل خيار العروض الخاطفة.',
        descEn: 'Displayed with the live countdown timer when Flash Deals are enabled.',
        storefrontTargetAr: 'قسم: العروض الخاطفة ⚡',
        storefrontTargetEn: 'Section: Flash Deals ⚡',
        icon: Zap,
        count: products.filter((p) => p.status === 'active' && p.isFlashDeal).length,
      },
    ],
    [products]
  );

  const currentSlotMeta = useMemo(
    () => merchandisingSlots.find((s) => s.key === selectedSlot) || merchandisingSlots[0],
    [merchandisingSlots, selectedSlot]
  );

  const filteredMerchProducts = useMemo(() => {
    const q = merchSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (merchCategoryFilter !== 'all' && p.categoryId !== merchCategoryFilter) return false;
      if (merchSellerFilter !== 'all' && p.sellerId !== merchSellerFilter) return false;
      const isAssigned = Boolean(p[selectedSlot]);
      if (merchMembershipFilter === 'assigned' && !isAssigned) return false;
      if (merchMembershipFilter === 'unassigned' && isAssigned) return false;
      if (q) {
        const match =
          p.titleAr.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brandNameAr.toLowerCase().includes(q) ||
          p.brandNameEn.toLowerCase().includes(q) ||
          p.sellerNameAr.toLowerCase().includes(q) ||
          p.sellerNameEn.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [products, merchCategoryFilter, merchSellerFilter, merchMembershipFilter, selectedSlot, merchSearch]);

  const handleToggleMerchFlag = async (product: Product, slotKey: MerchandisingSlotKey) => {
    const nextValue = !product[slotKey];
    const slotInfo = merchandisingSlots.find((s) => s.key === slotKey);

    setUpdatingProductId(`${product.id}-${slotKey}`);
    await moderateProduct(
      product.id,
      { [slotKey]: nextValue },
      `${nextValue ? 'إدراج' : 'إزالة'} المنتج «${product.titleAr}» (${product.sku}) ${
        nextValue ? 'ضمن' : 'من'
      } قائمة ${slotInfo?.labelAr || slotKey} في الصفحة الرئيسية`,
      `${nextValue ? 'Added' : 'Removed'} product "${product.titleEn}" (${product.sku}) ${
        nextValue ? 'to' : 'from'
      } Homepage ${slotInfo?.labelEn || slotKey}`
    );
    setUpdatingProductId(null);
  };

  const recentCmsLogs = useMemo(
    () =>
      auditLogs
        .filter((l) => l.targetType === 'homepage' || l.targetType === 'product')
        .slice(0, 5),
    [auditLogs]
  );

  if (!canAccessAdminDashboard) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header & Workspace Mode Switcher */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#0B4F3F] font-semibold">
              <LayoutTemplate className="w-4 h-4 text-[#C59B27]" />
              <span>{t('إدارة الواجهة التسويقية والمرشندايزينج', 'Storefront Homepage CMS & Merchandising')}</span>
              <span>·</span>
              <span className="font-mono text-[#8C857B]">
                {isDemoMode
                  ? t('وضع المحاكاة المحلي (Demo)', 'Local Demo Memory')
                  : t('متصل بقاعدة بيانات الإنتاج', 'Live Firestore Sync')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#141413]">
              {t(
                'مركز إدارة محتوى الصفحة الرئيسية وتنسيق المجموعات المعروضة',
                'Homepage Editorial Content & Storefront Merchandising Center'
              )}
            </h2>
            <p className="text-xs text-[#57534E] max-w-3xl leading-relaxed">
              {t(
                'تحكم كامل في نصوص البانر الرئيسي، الحملات الموسمية، شريط العروض الخاطفة، وحد الشحن المجاني باللغتين العربية والإنجليزية، مع إدارة ظهور المنتجات في أقسام الواجهة الأمامية.',
                'Manage bilingual hero headlines, secondary & seasonal campaign banners, flash deal visibility, free shipping threshold, and curated product merchandising placements.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E6E0D6] hover:border-[#0B4F3F] text-xs font-bold text-[#141413] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0B4F3F]" />
              <span>{t('فتح المتجر العام للمعاينة الحية', 'Open Live Storefront')}</span>
            </button>
          </div>
        </div>

        {/* Interactive Workspace Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E6E0D6]">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
            <button
              type="button"
              onClick={() => setActiveTab('hero_banners')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'hero_banners'
                  ? 'bg-[#0B4F3F] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#141413]'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{t('البانر الرئيسي والحملات الموسمية', 'Hero & Seasonal Banners')}</span>
              {hasUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-[#C59B27]" title="Unsaved changes" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('merchandising')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'merchandising'
                  ? 'bg-[#0B4F3F] text-white shadow-xs'
                  : 'text-[#57534E] hover:text-[#141413]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {t(
                  'تنسيق مجموعات المنتجات (Merchandising)',
                  'Homepage Product Merchandising (6 Slots)'
                )}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#57534E]">
            <span>
              {t('العروض الخاطفة:', 'Flash Deals:')}{' '}
              <strong className={homepageConfig.flashDealsActive ? 'text-[#0B4F3F]' : 'text-[#9E2A2B]'}>
                {homepageConfig.flashDealsActive ? t('مفعّلة', 'Active') : t('متوقفة', 'Hidden')}
              </strong>
            </span>
            <span>·</span>
            <span>
              {t('حد الشحن المجاني الحالي:', 'Live Free Shipping >=')}{' '}
              <strong className="font-mono text-[#141413]">
                {formatPrice(homepageConfig.freeShippingThreshold)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: HERO & SEASONAL BANNERS + LIVE BILINGUAL PREVIEW
      ===================================================================== */}
      {activeTab === 'hero_banners' && (
        <div className="space-y-6">
          {/* Live Interactive Storefront Preview Card */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B4F3F]">
                  <Eye className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    {previewMode === 'draft'
                      ? t('معاينة المسودة الحالية قبل النشر', 'Previewing Unsaved Draft State')
                      : t('معاينة الحالة المنشورة حالياً على المتجر', 'Previewing Current Live Storefront State')}
                  </span>
                  {hasUnsavedChanges && previewMode === 'draft' && (
                    <span className="text-[#B45309] font-normal">
                      · {t('توجد تعديلات غير محفوظة', 'Contains unsaved edits')}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-[#141413] mt-0.5">
                  {t(
                    'محاكاة بصرية مباشرة لبانر الصفحة الرئيسية والبطاقات الترويجية',
                    'Interactive Visual Simulation of Homepage Hero & Promotional Cards'
                  )}
                </h3>
              </div>

              {/* Preview Controls: Draft vs Live + AR vs EN */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center p-1 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('draft')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      previewMode === 'draft'
                        ? 'bg-[#141413] text-[#F5E6C8]'
                        : 'text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    {t('معاينة المسودة', 'Preview Draft')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('live')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      previewMode === 'live'
                        ? 'bg-[#0B4F3F] text-white'
                        : 'text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    {t('معاينة المنشور حالياً', 'Preview Live State')}
                  </button>
                </div>

                <div className="flex items-center p-1 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                  <button
                    type="button"
                    onClick={() => setPreviewLang('ar')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      previewLang === 'ar'
                        ? 'bg-[#C59B27] text-[#141413]'
                        : 'text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>العربية (RTL)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewLang('en')}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      previewLang === 'en'
                        ? 'bg-[#C59B27] text-[#141413]'
                        : 'text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>English (LTR)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Storefront Canvas */}
            <div
              dir={isPreviewRtl ? 'rtl' : 'ltr'}
              className="rounded-2xl bg-[#141413] p-5 sm:p-7 text-[#FAF8F5] border border-[#C59B27]/30 space-y-5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Main Hero Column */}
                <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-[#0B4F3F] via-[#083B2F] to-[#141413] p-6 border border-[#C59B27]/30 flex flex-col justify-between space-y-5">
                  <div className="space-y-3.5">
                    <div className="inline-flex items-center gap-2 text-xs text-[#F5E6C8] font-medium">
                      <Crown className="w-4 h-4 text-[#C59B27] shrink-0" />
                      <span>
                        {previewLang === 'ar' ? previewData.heroBadgeAr : previewData.heroBadgeEn}
                      </span>
                    </div>

                    <h4 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                      {previewLang === 'ar' ? previewData.heroTitleAr : previewData.heroTitleEn}
                    </h4>

                    <p className="text-xs sm:text-sm text-[#E6E0D6] leading-relaxed">
                      {previewLang === 'ar'
                        ? previewData.heroSubtitleAr
                        : previewData.heroSubtitleEn}
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C59B27] text-[#141413] font-bold text-xs shadow-sm">
                        <span>
                          {previewLang === 'ar' ? previewData.heroCtaAr : previewData.heroCtaEn}
                        </span>
                        <PreviewArrow className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#D6D0C4]">
                    <span>
                      {previewLang === 'ar'
                        ? `شحن مجاني للطلبات فوق ${Number(
                            previewData.freeShippingThreshold || 0
                          ).toLocaleString()} ر.س`
                        : `Free VIP Delivery over SAR ${Number(
                            previewData.freeShippingThreshold || 0
                          ).toLocaleString()}`}
                    </span>
                    <span>
                      {previewData.flashDealsActive
                        ? previewLang === 'ar'
                          ? '⚡ قسم العروض الخاطفة: ظاهر في الرئيسية'
                          : '⚡ Flash Deals Section: Visible on Home'
                        : previewLang === 'ar'
                        ? 'قسم العروض الخاطفة: مخفي حالياً'
                        : 'Flash Deals Section: Hidden'}
                    </span>
                  </div>
                </div>

                {/* Right Column: Secondary Spotlight + Seasonal Banner Preview */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4">
                  {/* Secondary Banner Card */}
                  <div className="rounded-xl bg-[#1E1E1C] border border-white/10 p-4 flex items-center gap-4">
                    {secondarySpotlightProduct && (
                      <img
                        src={secondarySpotlightProduct.images[0]}
                        alt={
                          previewLang === 'ar'
                            ? secondarySpotlightProduct.titleAr
                            : secondarySpotlightProduct.titleEn
                        }
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-xl object-cover bg-[#2A2A27] shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-[11px] font-bold text-[#C59B27]">
                        {previewLang === 'ar'
                          ? previewData.heroSecondaryBannerTitleAr
                          : previewData.heroSecondaryBannerTitleEn}
                      </div>
                      <div className="text-xs font-bold text-white truncate">
                        {secondarySpotlightProduct
                          ? previewLang === 'ar'
                            ? secondarySpotlightProduct.titleAr
                            : secondarySpotlightProduct.titleEn
                          : previewLang === 'ar'
                          ? 'منتج مختار في البطاقة الجانبية'
                          : 'Secondary Spotlight Product'}
                      </div>
                      <div className="text-[11px] text-[#D6D0C4]">
                        {previewLang === 'ar'
                          ? 'البطاقة الترويجية الثانوية بجوار البانر الرئيسي'
                          : 'Secondary hero spotlight card'}
                      </div>
                    </div>
                  </div>

                  {/* Seasonal Campaign Card Preview */}
                  <div className="rounded-xl bg-[#F3EFEA] text-[#141413] border border-[#E6E0D6] p-4 space-y-1.5">
                    <div className="text-[11px] font-bold text-[#B8860B]">
                      {previewLang === 'ar'
                        ? 'بانر الحملة الموسمية (Seasonal Campaign)'
                        : 'Seasonal Luxury Campaign Banner'}
                    </div>
                    <div className="text-sm font-bold text-[#141413]">
                      {previewLang === 'ar'
                        ? previewData.seasonalBannerTitleAr
                        : previewData.seasonalBannerTitleEn}
                    </div>
                    <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed">
                      {previewLang === 'ar'
                        ? previewData.seasonalBannerSubtitleAr
                        : previewData.seasonalBannerSubtitleEn}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Errors Alert */}
          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="bg-red-50 border border-[#9E2A2B]/30 rounded-2xl p-4 space-y-2 text-xs text-[#9E2A2B]"
            >
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {t(
                    'يرجى تصحيح الملاحظات التالية قبل حفظ ونشر إعدادات الصفحة الرئيسية:',
                    'Please resolve the following validation issues before publishing:'
                  )}
                </span>
              </div>
              <ul className="list-disc ps-5 space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{lang === 'ar' ? err.ar : err.en}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Editor Form */}
          <form onSubmit={handleSaveHeroConfig} className="space-y-6">
            {/* 1. Primary Hero Copy (AR & EN) */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E0D6] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#141413]">
                    {t(
                      '١. إدارة البانر التحريري الرئيسي (Primary Hero Management)',
                      '1. Primary Editorial Hero Management'
                    )}
                  </h3>
                  <p className="text-xs text-[#8C857B]">
                    {t(
                      'يُعرض النص بأمان تام بدون كود HTML خام، مع دعم كامل للعربية (RTL) والإنجليزية (LTR).',
                      'All copy is safely rendered as plain text with full Arabic RTL and English LTR parity.'
                    )}
                  </p>
                </div>
                <span className="text-xs font-mono text-[#8C857B]">
                  /settings/homepage
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Badge AR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('الشارة العلوية (بالعربية) — heroBadgeAr', 'Hero Badge (Arabic)')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroBadgeAr || '').length}/140
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={140}
                    value={draft.heroBadgeAr}
                    onChange={(e) => setDraft({ ...draft, heroBadgeAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Badge EN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('الشارة العلوية (بالإنجليزية) — heroBadgeEn', 'Hero Badge (English)')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroBadgeEn || '').length}/140
                    </span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={140}
                    value={draft.heroBadgeEn}
                    onChange={(e) => setDraft({ ...draft, heroBadgeEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Title AR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('العنوان الرئيسي (بالعربية) * — heroTitleAr', 'Hero Headline (Arabic) *')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroTitleAr || '').length}/180
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={180}
                    value={draft.heroTitleAr}
                    onChange={(e) => setDraft({ ...draft, heroTitleAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Title EN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('العنوان الرئيسي (بالإنجليزية) * — heroTitleEn', 'Hero Headline (English) *')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroTitleEn || '').length}/180
                    </span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    maxLength={180}
                    value={draft.heroTitleEn}
                    onChange={(e) => setDraft({ ...draft, heroTitleEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Subtitle AR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('الوصف التفصيلي (بالعربية) — heroSubtitleAr', 'Hero Subtitle (Arabic)')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroSubtitleAr || '').length}/350
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={350}
                    value={draft.heroSubtitleAr}
                    onChange={(e) => setDraft({ ...draft, heroSubtitleAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs leading-relaxed focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Subtitle EN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('الوصف التفصيلي (بالإنجليزية) — heroSubtitleEn', 'Hero Subtitle (English)')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroSubtitleEn || '').length}/350
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    dir="ltr"
                    maxLength={350}
                    value={draft.heroSubtitleEn}
                    onChange={(e) => setDraft({ ...draft, heroSubtitleEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs leading-relaxed focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* CTA AR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('نص زر الدعوة للتسوق (بالعربية) — heroCtaAr', 'Primary CTA Label (Arabic)')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroCtaAr || '').length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    value={draft.heroCtaAr}
                    onChange={(e) => setDraft({ ...draft, heroCtaAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* CTA EN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t('نص زر الدعوة للتسوق (بالإنجليزية) — heroCtaEn', 'Primary CTA Label (English)')}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroCtaEn || '').length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={100}
                    value={draft.heroCtaEn}
                    onChange={(e) => setDraft({ ...draft, heroCtaEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Secondary & Seasonal Banners + Flash Deals & Free Shipping Threshold */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
              <div className="border-b border-[#E6E0D6] pb-3">
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    '٢. البانر الجانبي، الحملة الموسمية، والعروض الترويجية',
                    '2. Secondary Spotlight, Seasonal Campaign & Promotional Controls'
                  )}
                </h3>
                <p className="text-xs text-[#8C857B]">
                  {t(
                    'تتحكم هذه الإعدادات في البطاقة الترويجية الثانوية وقسم الحملة الموسمية وشريط العروض الخاطفة وحد الشحن المجاني.',
                    'Controls the secondary hero card, seasonal campaign showcase, flash deal visibility, and free shipping threshold.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Secondary Banner Title AR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t(
                        'عنوان البطاقة الترويجية الثانوية (بالعربية) — heroSecondaryBannerTitleAr',
                        'Secondary Spotlight Title (Arabic)'
                      )}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroSecondaryBannerTitleAr || '').length}/180
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={180}
                    value={draft.heroSecondaryBannerTitleAr}
                    onChange={(e) =>
                      setDraft({ ...draft, heroSecondaryBannerTitleAr: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Secondary Banner Title EN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t(
                        'عنوان البطاقة الترويجية الثانوية (بالإنجليزية) — heroSecondaryBannerTitleEn',
                        'Secondary Spotlight Title (English)'
                      )}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.heroSecondaryBannerTitleEn || '').length}/180
                    </span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={180}
                    value={draft.heroSecondaryBannerTitleEn}
                    onChange={(e) =>
                      setDraft({ ...draft, heroSecondaryBannerTitleEn: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Seasonal Banner Title AR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t(
                        'عنوان الحملة الموسمية (بالعربية) — seasonalBannerTitleAr',
                        'Seasonal Campaign Title (Arabic)'
                      )}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.seasonalBannerTitleAr || '').length}/180
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={180}
                    value={draft.seasonalBannerTitleAr}
                    onChange={(e) => setDraft({ ...draft, seasonalBannerTitleAr: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Seasonal Banner Title EN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t(
                        'عنوان الحملة الموسمية (بالإنجليزية) — seasonalBannerTitleEn',
                        'Seasonal Campaign Title (English)'
                      )}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.seasonalBannerTitleEn || '').length}/180
                    </span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={180}
                    value={draft.seasonalBannerTitleEn}
                    onChange={(e) => setDraft({ ...draft, seasonalBannerTitleEn: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Seasonal Banner Subtitle AR */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t(
                        'وصف الحملة الموسمية (بالعربية) — seasonalBannerSubtitleAr',
                        'Seasonal Campaign Subtitle (Arabic)'
                      )}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.seasonalBannerSubtitleAr || '').length}/350
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    maxLength={350}
                    value={draft.seasonalBannerSubtitleAr}
                    onChange={(e) =>
                      setDraft({ ...draft, seasonalBannerSubtitleAr: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs leading-relaxed focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>

                {/* Seasonal Banner Subtitle EN */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#141413]">
                      {t(
                        'وصف الحملة الموسمية (بالإنجليزية) — seasonalBannerSubtitleEn',
                        'Seasonal Campaign Subtitle (English)'
                      )}
                    </label>
                    <span className="text-[11px] font-mono text-[#8C857B]">
                      {(draft.seasonalBannerSubtitleEn || '').length}/350
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    dir="ltr"
                    maxLength={350}
                    value={draft.seasonalBannerSubtitleEn}
                    onChange={(e) =>
                      setDraft({ ...draft, seasonalBannerSubtitleEn: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs leading-relaxed focus:outline-none focus:border-[#0B4F3F]"
                  />
                </div>
              </div>

              {/* Flash Deals Toggle & Free Shipping Threshold */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-[#E6E0D6]">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#141413]">
                      <Zap className="w-4 h-4 text-[#C59B27]" />
                      <span>
                        {t(
                          'تفعيل قسم العروض الخاطفة (flashDealsActive)',
                          'Enable Exclusive Flash Deals Section (flashDealsActive)'
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#57534E]">
                      {t(
                        'إظهار أو إخفاء شريط العروض الخاطفة ومؤقت العد التنازلي في الصفحة الرئيسية.',
                        'Show or hide the Flash Deals countdown showcase on the storefront homepage.'
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, flashDealsActive: !prev.flashDealsActive }))
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                      draft.flashDealsActive
                        ? 'bg-[#0B4F3F] text-white'
                        : 'bg-white border border-[#E6E0D6] text-[#57534E]'
                    }`}
                  >
                    {draft.flashDealsActive ? t('مفعّل (ON)', 'Active (ON)') : t('موقوف (OFF)', 'Hidden (OFF)')}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#141413] flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#0B4F3F]" />
                      <span>
                        {t(
                          'حد الشحن المجاني (ر.س) — freeShippingThreshold',
                          'Free Shipping Threshold (SAR) — freeShippingThreshold'
                        )}
                      </span>
                    </label>
                    <span className="text-[11px] font-mono font-bold text-[#0B4F3F]">
                      {formatPrice(Number(draft.freeShippingThreshold || 0))}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      step={10}
                      value={draft.freeShippingThreshold}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          freeShippingThreshold: Number(e.target.value),
                        })
                      }
                      className="w-40 px-3.5 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono font-bold focus:outline-none focus:border-[#0B4F3F]"
                    />
                    <span className="text-[11px] text-[#57534E]">
                      {t(
                        'ينعكس تلقائياً في شريط ضمانات الصفحة الرئيسية وفي حساب رسوم الشحن عند الدفع.',
                        'Automatically updates both the homepage guarantee bar and cart/checkout shipping calculation.'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-[#E6E0D6] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!hasUnsavedChanges || isSaving}
                    onClick={handleResetUnsaved}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E6E0D6] hover:border-[#141413] disabled:opacity-45 text-xs font-bold text-[#141413] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('إلغاء التعديلات غير المحفوظة', 'Reset Unsaved Changes')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRestoreDefaultModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E6E0D6] text-xs font-semibold text-[#57534E] transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      {t('تحميل القالب الافتراضي في المسودة...', 'Load Default Template into Draft...')}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSaving || validationErrors.length > 0 || !hasUnsavedChanges}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all"
                >
                  <Save className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    {isSaving
                      ? t('جاري الحفظ والتوثيق...', 'Saving & Logging...')
                      : isDemoMode
                      ? t('حفظ وتطبيق في وضع العرض التجريبي', 'Save & Apply (Demo Mode)')
                      : t('حفظ ونشر التعديلات على المتجر', 'Publish Homepage Changes')}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 2: HOMEPAGE MERCHANDISING CONTROLS (6 CURATED SLOTS)
      ===================================================================== */}
      {activeTab === 'merchandising' && (
        <div className="space-y-6">
          {/* 6 Slot Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchandisingSlots.map((slot) => {
              const Icon = slot.icon;
              const isSelected = selectedSlot === slot.key;
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => setSelectedSlot(slot.key)}
                  className={`text-start p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#141413] text-white border-[#C59B27]'
                      : 'bg-white text-[#141413] border-[#E6E0D6] hover:border-[#0B4F3F]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#0B4F3F] text-[#C59B27]'
                            : 'bg-[#FAF8F5] text-[#0B4F3F] border border-[#E6E0D6]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">
                          {lang === 'ar' ? slot.labelAr : slot.labelEn}
                        </div>
                        <div
                          className={`text-[11px] mt-0.5 ${
                            isSelected ? 'text-[#C59B27]' : 'text-[#8C857B]'
                          }`}
                        >
                          {lang === 'ar' ? slot.storefrontTargetAr : slot.storefrontTargetEn}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        isSelected
                          ? 'bg-[#C59B27] text-[#141413]'
                          : 'bg-[#FAF8F5] text-[#141413] border border-[#E6E0D6]'
                      }`}
                    >
                      {slot.count}
                    </span>
                  </div>

                  <p
                    className={`text-[11px] leading-relaxed ${
                      isSelected ? 'text-[#D6D0C4]' : 'text-[#57534E]'
                    }`}
                  >
                    {lang === 'ar' ? slot.descAr : slot.descEn}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Merchandising Control Table & Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#0B4F3F] font-bold">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>
                    {lang === 'ar' ? currentSlotMeta.labelAr : currentSlotMeta.labelEn} (
                    {currentSlotMeta.count} {t('منتج نشط', 'active items')})
                  </span>
                </div>
                <p className="text-xs text-[#57534E] mt-1">
                  {t(
                    'جميع التغييرات هنا تستخدم صلاحيات الإشراف الإداري (moderateProduct) وتُسجّل فوراً في سجل التدقيق الرقابي. لا يملك البائعون العاديون صلاحية تعديل شارات الظهور في الصفحة الرئيسية.',
                    'All merchandising changes execute via Admin moderation (moderateProduct) and record an Audit Log entry. Ordinary sellers cannot modify homepage placement flags.'
                  )}
                </p>
              </div>

              {privatePlatformSettings.requireVerifiedBadgeForFeatured && (
                <div className="inline-flex items-center gap-1.5 text-xs text-[#0B4F3F] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#C59B27]" />
                  <span>
                    {t(
                      'سياسة الحوكمة: يُفضّل قصر المختارات الرئيسية على المتاجر الموثقة',
                      'Governance Policy: Verified Boutique preferred for Featured slots'
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Search & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
                <input
                  type="text"
                  value={merchSearch}
                  onChange={(e) => setMerchSearch(e.target.value)}
                  placeholder={t(
                    'ابحث باسم المنتج، رقم SKU، العلامة التجارية، أو المتجر...',
                    'Search by product title, SKU, brand, or seller...'
                  )}
                  className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                />
              </div>

              <div className="md:col-span-2">
                <select
                  value={merchCategoryFilter}
                  onChange={(e) => setMerchCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                >
                  <option value="all">{t('جميع الأقسام', 'All Categories')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {lang === 'ar' ? c.nameAr : c.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={merchSellerFilter}
                  onChange={(e) => setMerchSellerFilter(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
                >
                  <option value="all">{t('جميع المتاجر', 'All Sellers')}</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {lang === 'ar' ? s.nameAr : s.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center gap-1 p-1 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                {(
                  [
                    { id: 'all', ar: 'الكل', en: 'All' },
                    { id: 'assigned', ar: 'مدرج بالقسم', en: 'In Slot' },
                    { id: 'unassigned', ar: 'غير مدرج', en: 'Not in Slot' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMerchMembershipFilter(f.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors ${
                      merchMembershipFilter === f.id
                        ? 'bg-[#0B4F3F] text-white'
                        : 'text-[#57534E] hover:text-[#141413]'
                    }`}
                  >
                    {lang === 'ar' ? f.ar : f.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Merchandising Table */}
            {filteredMerchProducts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Package className="w-8 h-8 text-[#8C857B] mx-auto" />
                <p className="text-sm font-bold text-[#141413]">
                  {t(
                    'لا توجد منتجات مطابقة لمعايير البحث والتصفية الحالية',
                    'No products match the current search and filter criteria'
                  )}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E0D6] text-[#8C857B] bg-[#FAF8F5]">
                      <th className="py-3 px-3 text-start font-bold">
                        {t('المنتج والـ SKU', 'Product & SKU')}
                      </th>
                      <th className="py-3 px-3 text-start font-bold">
                        {t('المتجر البائع', 'Boutique')}
                      </th>
                      <th className="py-3 px-3 text-start font-bold">
                        {t('السعر والمخزون', 'Price & Stock')}
                      </th>
                      <th className="py-3 px-3 text-center font-bold">
                        {t('القسم المحدد حالياً', 'Selected Slot')}
                      </th>
                      <th className="py-3 px-3 text-start font-bold">
                        {t('كافة شارات الظهور في الرئيسية', 'All Homepage Merchandising Flags')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E0D6]">
                    {filteredMerchProducts.slice(0, 25).map((prod) => {
                      const isInSelectedSlot = Boolean(prod[selectedSlot]);
                      const isRowBusy = updatingProductId?.startsWith(`${prod.id}-`);

                      return (
                        <tr key={prod.id} className="hover:bg-[#FAF8F5]/70 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.images[0]}
                                alt={lang === 'ar' ? prod.titleAr : prod.titleEn}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-xl object-cover bg-[#F3EFEA] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-[#141413] line-clamp-1">
                                  {lang === 'ar' ? prod.titleAr : prod.titleEn}
                                </div>
                                <div className="text-[11px] text-[#8C857B] font-mono mt-0.5">
                                  {prod.sku} · {prod.status}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="inline-flex items-center gap-1.5 font-semibold text-[#141413]">
                              <Store className="w-3.5 h-3.5 text-[#0B4F3F] shrink-0" />
                              <span>{lang === 'ar' ? prod.sellerNameAr : prod.sellerNameEn}</span>
                              {prod.sellerVerified && (
                                <span
                                  title={t('متجر موثق', 'Verified Boutique')}
                                  className="inline-flex items-center"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C59B27] shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono">
                            <div className="font-bold text-[#0B4F3F]">{formatPrice(prod.price)}</div>
                            <div className="text-[11px] text-[#8C857B]">
                              {t('المخزون:', 'Stock:')} {prod.stock}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <button
                              type="button"
                              disabled={Boolean(isRowBusy)}
                              onClick={() => handleToggleMerchFlag(prod, selectedSlot)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                isInSelectedSlot
                                  ? 'bg-[#0B4F3F] text-white hover:bg-[#9E2A2B]'
                                  : 'bg-[#FAF8F5] border border-[#E6E0D6] text-[#141413] hover:border-[#0B4F3F]'
                              }`}
                            >
                              {isInSelectedSlot
                                ? t('✓ مدرج (إزالة)', '✓ Active (Remove)')
                                : t('+ إدراج بالقسم', '+ Add to Slot')}
                            </button>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {(
                                [
                                  { key: 'isFeatured', ar: 'موصى به', en: 'Featured' },
                                  { key: 'isTrending', ar: 'رائج', en: 'Trending' },
                                  { key: 'isBestSeller', ar: 'الأكثر مبيعاً', en: 'Best Seller' },
                                  { key: 'isNewArrival', ar: 'وصل حديثاً', en: 'New Arrival' },
                                  { key: 'isSeasonal', ar: 'موسمي', en: 'Seasonal' },
                                  { key: 'isFlashDeal', ar: 'عرض خاطف ⚡', en: 'Flash Deal ⚡' },
                                ] as { key: MerchandisingSlotKey; ar: string; en: string }[]
                              ).map((badge) => {
                                const active = Boolean(prod[badge.key]);
                                return (
                                  <button
                                    key={badge.key}
                                    type="button"
                                    disabled={Boolean(isRowBusy)}
                                    onClick={() => handleToggleMerchFlag(prod, badge.key)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                      active
                                        ? 'bg-[#141413] text-[#F5E6C8]'
                                        : 'bg-[#FAF8F5] text-[#8C857B] hover:text-[#141413] border border-[#E6E0D6]'
                                    }`}
                                  >
                                    {lang === 'ar' ? badge.ar : badge.en}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent CMS & Merchandising Audit Trail */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C857B]">
            {t(
              'آخر قرارات تحديث الواجهة التسويقية وتنسيق المنتجات المسجلة في سجل التدقيق',
              'Recent Homepage CMS & Merchandising Audit Trail'
            )}
          </h3>
          <span className="text-[11px] font-mono text-[#8C857B]">
            {recentCmsLogs.length} {t('سجلات حديثة', 'recent entries')}
          </span>
        </div>

        <div className="divide-y divide-[#F3EFEA]">
          {recentCmsLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-[#141413]">
                  {lang === 'ar' ? log.actionAr : log.actionEn}
                </div>
                <div className="text-[11px] text-[#8C857B] font-mono">
                  {log.actorName} · {log.targetType}: #{log.targetId}
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#8C857B]">{log.createdAt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Loading Default Template into Draft */}
      {showRestoreDefaultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-[#B45309]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#141413]">
                {t(
                  'تأكيد تحميل النصوص الافتراضية في المسودة',
                  'Confirm Loading Default Template into Draft'
                )}
              </h3>
            </div>
            <p className="text-xs text-[#57534E] leading-relaxed">
              {t(
                'سيقوم هذا الإجراء بتحميل نصوص وقيم القالب الافتراضي لمنصة أثيل داخل المسودة الحالية للمعاينة. لن يتم تعديل المتجر الحي إلا إذا قمت بالضغط على زر «حفظ ونشر التعديلات» بعد المراجعة.',
                'This action loads the default Atheel editorial template into your local unsaved draft for preview. It will NOT overwrite the live storefront unless you explicitly click Publish afterward.'
              )}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreDefaultModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E6E0D6] text-xs font-bold text-[#57534E]"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmLoadDefaultsIntoDraft}
                className="px-4 py-2 rounded-xl bg-[#141413] text-[#F5E6C8] text-xs font-bold"
              >
                {t('تأكيد التحميل في المسودة', 'Load into Draft')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
