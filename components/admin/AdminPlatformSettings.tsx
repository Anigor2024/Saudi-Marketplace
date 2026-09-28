'use client';

import React, { useState, useMemo } from 'react';
import {
  Settings,
  ShieldCheck,
  Truck,
  Landmark,
  SlidersHorizontal,
  Lock,
  Globe,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Sparkles,
  FileText,
  Store,
  ShoppingBag,
  MessageSquare,
  Star,
  Percent,
  Wallet,
  Boxes,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  PublicPlatformSettings,
  PrivatePlatformSettings,
  Language,
} from '@/lib/types';

export default function AdminPlatformSettings() {
  const {
    lang,
    t,
    formatPrice,
    isDemoMode,
    currentUser,
    publicPlatformSettings,
    privatePlatformSettings,
    updatePublicPlatformSettings,
    updatePrivatePlatformSettings,
    auditLogs,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');

  // Local draft overrides synced deterministically with context state (no setState in useEffect)
  const [publicOverrides, setPublicOverrides] = useState<
    Partial<PublicPlatformSettings>
  >({});
  const publicDraft = useMemo<PublicPlatformSettings>(
    () => ({ ...publicPlatformSettings, ...publicOverrides }),
    [publicPlatformSettings, publicOverrides]
  );

  const updatePublicField = <K extends keyof PublicPlatformSettings>(
    key: K,
    value: PublicPlatformSettings[K]
  ) => {
    setPublicOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const [privateOverrides, setPrivateOverrides] = useState<
    Partial<PrivatePlatformSettings>
  >({});
  const privateDraft = useMemo<PrivatePlatformSettings>(
    () => ({ ...privatePlatformSettings, ...privateOverrides }),
    [privatePlatformSettings, privateOverrides]
  );

  const updatePrivateField = <K extends keyof PrivatePlatformSettings>(
    key: K,
    value: PrivatePlatformSettings[K]
  ) => {
    setPrivateOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const [isSavingPublic, setIsSavingPublic] = useState(false);
  const [isSavingPrivate, setIsSavingPrivate] = useState(false);

  // Detect unsaved changes in Public Settings
  const hasPublicUnsavedChanges = useMemo(() => {
    return (
      publicDraft.marketplaceNameAr !==
        publicPlatformSettings.marketplaceNameAr ||
      publicDraft.marketplaceNameEn !==
        publicPlatformSettings.marketplaceNameEn ||
      publicDraft.supportEmail !== publicPlatformSettings.supportEmail ||
      publicDraft.supportPhone !== publicPlatformSettings.supportPhone ||
      publicDraft.supportWhatsapp !== publicPlatformSettings.supportWhatsapp ||
      publicDraft.supportHoursAr !== publicPlatformSettings.supportHoursAr ||
      publicDraft.supportHoursEn !== publicPlatformSettings.supportHoursEn ||
      publicDraft.defaultLanguage !== publicPlatformSettings.defaultLanguage ||
      Number(publicDraft.freeShippingThreshold) !==
        Number(publicPlatformSettings.freeShippingThreshold) ||
      Number(publicDraft.standardShippingFee) !==
        Number(publicPlatformSettings.standardShippingFee) ||
      Number(publicDraft.expressShippingFee) !==
        Number(publicPlatformSettings.expressShippingFee) ||
      Boolean(publicDraft.maintenanceBannerActive) !==
        Boolean(publicPlatformSettings.maintenanceBannerActive) ||
      publicDraft.maintenanceBannerAr !==
        publicPlatformSettings.maintenanceBannerAr ||
      publicDraft.maintenanceBannerEn !==
        publicPlatformSettings.maintenanceBannerEn ||
      Boolean(publicDraft.checkoutEnabled) !==
        Boolean(publicPlatformSettings.checkoutEnabled) ||
      Boolean(publicDraft.sellerApplicationsEnabled) !==
        Boolean(publicPlatformSettings.sellerApplicationsEnabled) ||
      Boolean(publicDraft.customerReviewsEnabled) !==
        Boolean(publicPlatformSettings.customerReviewsEnabled) ||
      Boolean(publicDraft.productQuestionsEnabled) !==
        Boolean(publicPlatformSettings.productQuestionsEnabled)
    );
  }, [publicDraft, publicPlatformSettings]);

  // Detect unsaved changes in Private Governance Settings
  const hasPrivateUnsavedChanges = useMemo(() => {
    return (
      Number(privateDraft.defaultSellerCommissionRate) !==
        Number(privatePlatformSettings.defaultSellerCommissionRate) ||
      Number(privateDraft.minimumPayoutAmount) !==
        Number(privatePlatformSettings.minimumPayoutAmount) ||
      Number(privateDraft.payoutSlaBusinessDays) !==
        Number(privatePlatformSettings.payoutSlaBusinessDays) ||
      Boolean(privateDraft.requireVerifiedBadgeForFeatured) !==
        Boolean(privatePlatformSettings.requireVerifiedBadgeForFeatured) ||
      Boolean(privateDraft.autoApproveVerifiedSellerProducts) !==
        Boolean(privatePlatformSettings.autoApproveVerifiedSellerProducts) ||
      Number(privateDraft.returnWindowDays) !==
        Number(privatePlatformSettings.returnWindowDays) ||
      Boolean(privateDraft.allowOriginalPaymentRefunds) !==
        Boolean(privatePlatformSettings.allowOriginalPaymentRefunds) ||
      Number(privateDraft.lowStockGlobalDefaultThreshold) !==
        Number(privatePlatformSettings.lowStockGlobalDefaultThreshold) ||
      privateDraft.internalGovernanceNotesAr !==
        privatePlatformSettings.internalGovernanceNotesAr ||
      privateDraft.internalGovernanceNotesEn !==
        privatePlatformSettings.internalGovernanceNotesEn
    );
  }, [privateDraft, privatePlatformSettings]);

  // Pre-submit UI Validation for Public Settings
  const publicValidationErrors = useMemo(() => {
    const errs: string[] = [];
    if (
      !publicDraft.marketplaceNameAr ||
      publicDraft.marketplaceNameAr.trim().length < 2
    ) {
      errs.push(
        t(
          'اسم المنصة باللغة العربية مطلوب (حرفان على الأقل).',
          'Arabic Marketplace Name is required (min 2 chars).'
        )
      );
    }
    if (
      !publicDraft.marketplaceNameEn ||
      publicDraft.marketplaceNameEn.trim().length < 2
    ) {
      errs.push(
        t(
          'اسم المنصة باللغة الإنجليزية مطلوب (حرفان على الأقل).',
          'English Marketplace Name is required (min 2 chars).'
        )
      );
    }
    const email = (publicDraft.supportEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.push(
        t(
          'يرجى إدخال بريد إلكتروني صحيح لخدمة العملاء.',
          'Please enter a valid customer support email address.'
        )
      );
    }
    if (
      !publicDraft.supportPhone ||
      publicDraft.supportPhone.trim().length < 5
    ) {
      errs.push(
        t(
          'رقم هاتف خدمة العملاء مطلوب.',
          'Customer support phone number is required.'
        )
      );
    }
    const freeShip = Number(publicDraft.freeShippingThreshold);
    if (!Number.isFinite(freeShip) || freeShip < 0 || freeShip > 100000) {
      errs.push(
        t(
          'حد الشحن المجاني يجب أن يكون رقماً غير سالب (0 إلى 100,000 ر.س).',
          'Free shipping threshold must be a non-negative number (0 to 100,000 SAR).'
        )
      );
    }
    const stdFee = Number(publicDraft.standardShippingFee);
    if (!Number.isFinite(stdFee) || stdFee < 0 || stdFee > 5000) {
      errs.push(
        t(
          'رسوم الشحن القياسي يجب أن تكون رقماً غير سالب (0 إلى 5,000 ر.س).',
          'Standard shipping fee must be a non-negative number (0 to 5,000 SAR).'
        )
      );
    }
    const expFee = Number(publicDraft.expressShippingFee);
    if (!Number.isFinite(expFee) || expFee < 0 || expFee > 5000) {
      errs.push(
        t(
          'رسوم الشحن السريع يجب أن تكون رقماً غير سالب (0 إلى 5,000 ر.س).',
          'Express shipping fee must be a non-negative number (0 to 5,000 SAR).'
        )
      );
    }
    if (
      publicDraft.maintenanceBannerActive &&
      (!publicDraft.maintenanceBannerAr.trim() ||
        !publicDraft.maintenanceBannerEn.trim())
    ) {
      errs.push(
        t(
          'عند تفعيل شريط التنبيه العام، يجب إدخال نص التنبيه بالعربية والإنجليزية.',
          'Both Arabic and English maintenance banner texts are required when the banner is active.'
        )
      );
    }
    return errs;
  }, [publicDraft, t]);

  // Pre-submit UI Validation for Private Governance Settings
  const privateValidationErrors = useMemo(() => {
    const errs: string[] = [];
    const comm = Number(privateDraft.defaultSellerCommissionRate);
    if (!Number.isFinite(comm) || comm < 0 || comm > 50) {
      errs.push(
        t(
          'نسبة العمولة الافتراضية للتجار الجدد يجب أن تكون بين 0% و 50%.',
          'Default seller commission rate must be between 0% and 50%.'
        )
      );
    }
    const minPayout = Number(privateDraft.minimumPayoutAmount);
    if (!Number.isFinite(minPayout) || minPayout < 0 || minPayout > 1000000) {
      errs.push(
        t(
          'الحد الأدنى لطلب تسوية الأرباح يجب أن يكون رقماً غير سالب (0 إلى 1,000,000 ر.س).',
          'Minimum payout amount must be a non-negative number (0 to 1,000,000 SAR).'
        )
      );
    }
    const sla = Number(privateDraft.payoutSlaBusinessDays);
    if (!Number.isFinite(sla) || sla < 1 || sla > 30) {
      errs.push(
        t(
          'اتفاقية مستوى الخدمة لتسوية الخزينة (SLA) يجب أن تكون بين 1 و 30 يوم عمل.',
          'Payout SLA business days must be between 1 and 30 days.'
        )
      );
    }
    const retDays = Number(privateDraft.returnWindowDays);
    if (!Number.isFinite(retDays) || retDays < 1 || retDays > 90) {
      errs.push(
        t(
          'نافذة الإرجاع المعتمدة يجب أن تكون بين 1 و 90 يوماً.',
          'Return window days must be between 1 and 90 days.'
        )
      );
    }
    const lowStock = Number(privateDraft.lowStockGlobalDefaultThreshold);
    if (!Number.isFinite(lowStock) || lowStock < 1 || lowStock > 100) {
      errs.push(
        t(
          'الحد الافتراضي لتنبيه المخزون المنخفض يجب أن يكون بين 1 و 100 وحدة.',
          'Global low stock default threshold must be between 1 and 100 units.'
        )
      );
    }
    return errs;
  }, [privateDraft, t]);

  const handleSavePublic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      isSavingPublic ||
      publicValidationErrors.length > 0 ||
      !hasPublicUnsavedChanges
    ) {
      return;
    }

    const summaryAr = `تحديث الإعدادات العامة للمنصة (الشحن المجاني: ${publicDraft.freeShippingThreshold} ر.س، العادي: ${publicDraft.standardShippingFee} ر.س، السريع: ${publicDraft.expressShippingFee} ر.س، الدفع: ${
      publicDraft.checkoutEnabled ? 'مفعّل' : 'موقوف'
    })`;
    const summaryEn = `Updated public platform settings (Free Shipping >= ${publicDraft.freeShippingThreshold} SAR, Standard: ${publicDraft.standardShippingFee} SAR, Express: ${publicDraft.expressShippingFee} SAR, Checkout: ${
      publicDraft.checkoutEnabled ? 'ON' : 'OFF'
    })`;

    setIsSavingPublic(true);
    const ok = await updatePublicPlatformSettings(
      publicDraft,
      summaryAr,
      summaryEn
    );
    setIsSavingPublic(false);
    if (ok) {
      setPublicOverrides({});
    }
  };

  const handleSavePrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      isSavingPrivate ||
      privateValidationErrors.length > 0 ||
      !hasPrivateUnsavedChanges
    ) {
      return;
    }

    // Do NOT expose internalGovernanceNotes inside Audit list summaries
    const summaryAr = `تحديث إعدادات الحوكمة الداخلية (العمولة الافتراضية: ${privateDraft.defaultSellerCommissionRate}%، الحد الأدنى للتسوية: ${privateDraft.minimumPayoutAmount} ر.س، نافذة الإرجاع: ${privateDraft.returnWindowDays} يوماً)`;
    const summaryEn = `Updated internal governance settings (Default Commission: ${privateDraft.defaultSellerCommissionRate}%, Min Payout: ${privateDraft.minimumPayoutAmount} SAR, Return Window: ${privateDraft.returnWindowDays}d)`;

    setIsSavingPrivate(true);
    const ok = await updatePrivatePlatformSettings(
      privateDraft,
      summaryAr,
      summaryEn
    );
    setIsSavingPrivate(false);
    if (ok) {
      setPrivateOverrides({});
    }
  };

  const recentSettingsLogs = useMemo(() => {
    return auditLogs.filter((l) => l.targetType === 'settings').slice(0, 5);
  }, [auditLogs]);

  return (
    <div className="space-y-6">
      {/* Top Executive Header */}
      <div className="bg-[#141413] text-[#FAF8F5] rounded-2xl border border-[#C59B27]/30 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0B4F3F] text-[#F5E6C8] text-[11px] font-mono font-bold border border-[#C59B27]/40">
                <Settings className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>PLATFORM GOVERNANCE & CONFIGURATION</span>
              </span>
              {isDemoMode ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#C59B27]/20 text-[#F5E6C8] text-[11px] font-bold border border-[#C59B27]/40">
                  <Sparkles className="w-3 h-3 text-[#C59B27]" />
                  <span>
                    {t(
                      'وضع العرض التجريبي (حفظ محلي في الذاكرة فقط)',
                      'Demo Admin (In-Memory Simulation Only)'
                    )}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-200 text-[11px] font-bold border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C59B27]" />
                  <span>
                    {t(
                      'متصل بقاعدة بيانات الإنتاج (Firestore Security Verified)',
                      'Connected to Production Firestore'
                    )}
                  </span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {t(
                'إعدادات المنصة والسياسات التشغيلية والحوكمة',
                'Platform Settings, Storefront Controls & Internal Governance'
              )}
            </h2>
            <p className="text-xs text-[#D6D0C4] max-w-3xl leading-relaxed">
              {t(
                'فصل أمني صارم بين الإعدادات العامة للمتجر (PublicPlatformSettings) المتاحة لواجهة التسوق، وإعدادات الحوكمة الداخلية الخاصة (PrivatePlatformSettings) المحمية حصرياً للمسؤول التنفيذي.',
                'Strict security isolation between public storefront settings (PublicPlatformSettings) and Admin-only internal governance policies (PrivatePlatformSettings).'
              )}
            </p>
          </div>

          {/* Unsaved Changes Status Indicator */}
          <div className="flex flex-wrap items-center gap-2.5">
            {hasPublicUnsavedChanges || hasPrivateUnsavedChanges ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>
                  {t(
                    'توجد تعديلات غير محفوظة في المسودة',
                    'Unsaved Draft Changes'
                  )}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-[#D6D0C4] text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>
                  {t('متزامن مع الحالة النشطة', 'Synced with Live State')}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs: Public Settings vs Internal Governance */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('public')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'public'
                  ? 'bg-[#C59B27] text-[#141413] shadow-sm'
                  : 'bg-white/10 text-[#E6E0D6] hover:bg-white/15'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>
                {t(
                  '١. الإعدادات العامة للمتجر والشحن (Public Settings)',
                  '1. Public Storefront & Shipping Settings'
                )}
              </span>
              {hasPublicUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-[#9E2A2B]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('private')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'private'
                  ? 'bg-[#C59B27] text-[#141413] shadow-sm'
                  : 'bg-white/10 text-[#E6E0D6] hover:bg-white/15'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>
                {t(
                  '٢. الحوكمة الداخلية — للمسؤول فقط (Internal Governance — Admin Only)',
                  '2. Internal Governance — Admin Only'
                )}
              </span>
              {hasPrivateUnsavedChanges && (
                <span className="w-2 h-2 rounded-full bg-[#9E2A2B]" />
              )}
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#D6D0C4]">
            {activeTab === 'public' ? (
              <span>
                {t('آخر تحديث عام:', 'Public Updated:')}{' '}
                {publicPlatformSettings.updatedAt.slice(0, 16).replace('T', ' ')}
              </span>
            ) : (
              <span>
                {t('آخر تحديث خاص:', 'Private Updated:')}{' '}
                {privatePlatformSettings.updatedAt
                  .slice(0, 16)
                  .replace('T', ' ')}{' '}
                ({privatePlatformSettings.updatedBy || currentUser?.name || 'Admin'})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          TAB 1: PUBLIC MARKETPLACE SETTINGS EDITOR
      ==================================================================== */}
      {activeTab === 'public' && (
        <form onSubmit={handleSavePublic} className="space-y-6">
          {/* Validation Errors Banner */}
          {publicValidationErrors.length > 0 && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-50 border border-[#9E2A2B]/30 space-y-1.5 text-xs text-[#9E2A2B]"
            >
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {t(
                    'يرجى تصحيح الملاحظات التالية قبل حفظ الإعدادات العامة:',
                    'Please resolve the following validation issues before saving:'
                  )}
                </span>
              </div>
              <ul className="list-disc list-inside space-y-1 ps-1">
                {publicValidationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Marketplace Identity & Localization */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#F3EFEA] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF3F0] text-[#0B4F3F] flex items-center justify-center">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141413]">
                        {t(
                          'هوية المنصة والتوطين (Marketplace Identity & Localization)',
                          'Marketplace Identity & Localization'
                        )}
                      </h3>
                      <p className="text-[11px] text-[#8C857B]">
                        {t(
                          'تظهر هذه البيانات في ترويسة المتجر العام وتذييل الصفحات',
                          'Displayed in the public storefront header and footer'
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-mono font-bold">
                    settings/publicPlatformSettings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t('اسم المنصة (بالعربية) *', 'Marketplace Name (Arabic) *')}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={publicDraft.marketplaceNameAr}
                      onChange={(e) =>
                        updatePublicField('marketplaceNameAr', e.target.value)
                      }
                      dir="rtl"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'اسم المنصة (بالإنجليزية) *',
                        'Marketplace Name (English) *'
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={publicDraft.marketplaceNameEn}
                      onChange={(e) =>
                        updatePublicField('marketplaceNameEn', e.target.value)
                      }
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'اللغة الافتراضية للمنصة (Default Language)',
                        'Default Storefront Language'
                      )}
                    </label>
                    <select
                      value={publicDraft.defaultLanguage}
                      onChange={(e) =>
                        updatePublicField(
                          'defaultLanguage',
                          (e.target.value === 'en' ? 'en' : 'ar') as Language
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413]"
                    >
                      <option value="ar">
                        {t('العربية (RTL - المملكة العربية السعودية)', 'Arabic (RTL - Saudi Arabia)')}
                      </option>
                      <option value="en">
                        {t('الإنجليزية (LTR - International)', 'English (LTR - International)')}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t('العملة الرسمية المعتمدة (Currency Code)', 'Official Currency Code')}
                    </label>
                    <div className="px-3.5 py-2.5 rounded-xl bg-[#F3EFEA] border border-[#E6E0D6] flex items-center justify-between text-xs font-mono font-bold text-[#57534E]">
                      <span>{publicDraft.currencyCode} — الريال السعودي (Saudi Riyal)</span>
                      <Lock className="w-3.5 h-3.5 text-[#8C857B]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Customer Support Channels */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 shadow-2xs">
                <div className="flex items-center gap-2.5 border-b border-[#F3EFEA] pb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF3F0] text-[#0B4F3F] flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#141413]">
                      {t(
                        'قنوات خدمة العملاء والكونسيرج (Customer Support Channels)',
                        'Customer Support & Concierge Channels'
                      )}
                    </h3>
                    <p className="text-[11px] text-[#8C857B]">
                      {t(
                        'تُعرض قنوات التواصل وساعات العمل مباشرة في تذييل المتجر ومركز المساعدة',
                        'Contact details and operating hours shown in the storefront footer and Help Center'
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>{t('البريد الإلكتروني للدعم *', 'Support Email *')}</span>
                      </span>
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={120}
                      value={publicDraft.supportEmail}
                      onChange={(e) =>
                        updatePublicField('supportEmail', e.target.value)
                      }
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>{t('الرقم الموحد لخدمة العملاء *', 'Support Phone *')}</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={publicDraft.supportPhone}
                      onChange={(e) =>
                        updatePublicField('supportPhone', e.target.value)
                      }
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>{t('رقم واتساب الأعمال *', 'Support WhatsApp *')}</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={publicDraft.supportWhatsapp}
                      onChange={(e) =>
                        updatePublicField('supportWhatsapp', e.target.value)
                      }
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C59B27]" />
                        <span>{t('ساعات العمل (بالعربية)', 'Support Hours (Arabic)')}</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={publicDraft.supportHoursAr}
                      onChange={(e) =>
                        updatePublicField('supportHoursAr', e.target.value)
                      }
                      dir="rtl"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C59B27]" />
                        <span>{t('ساعات العمل (بالإنجليزية)', 'Support Hours (English)')}</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={publicDraft.supportHoursEn}
                      onChange={(e) =>
                        updatePublicField('supportHoursEn', e.target.value)
                      }
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Shipping & Free Shipping Single Source of Truth */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F3EFEA] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#EBF3F0] text-[#0B4F3F] flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141413]">
                        {t(
                          'سياسات الشحن والتوصيل (Shipping Single Source of Truth)',
                          'Shipping Rates & Free Shipping Threshold'
                        )}
                      </h3>
                      <p className="text-[11px] text-[#8C857B]">
                        {t(
                          'يتم مزامنة حد الشحن المجاني ذرياً مع إعدادات الواجهة التسويقية (HomepageConfig) ويُطبق على الطلبات الجديدة فقط',
                          'freeShippingThreshold is synchronized atomically with HomepageConfig and applies to new orders without altering historical orders'
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40 text-[10px] font-mono font-bold">
                    ATOMIC SYNC: HomepageConfig
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'حد الشحن المجاني (ر.س) *',
                        'Free Shipping Threshold (SAR) *'
                      )}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      step="1"
                      value={publicDraft.freeShippingThreshold}
                      onChange={(e) =>
                        updatePublicField(
                          'freeShippingThreshold',
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#0B4F3F]"
                    />
                    <span className="text-[10px] text-[#8C857B] mt-1 block">
                      {t(
                        'يُعفى العميل من رسوم الشحن القياسي عند بلوغ هذا الحد',
                        'Standard shipping becomes 0 SAR at or above this subtotal'
                      )}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'رسوم الشحن القياسي (أرامكس بريميوم) *',
                        'Standard Shipping Fee (SAR) *'
                      )}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      step="1"
                      value={publicDraft.standardShippingFee}
                      onChange={(e) =>
                        updatePublicField(
                          'standardShippingFee',
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#141413]"
                    />
                    <span className="text-[10px] text-[#8C857B] mt-1 block">
                      {t('شامل ضريبة القيمة المضافة ١٥٪', 'VAT-inclusive (15% Saudi VAT)')}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'رسوم الشحن السريع VIP (سبل إكسبريس) *',
                        'Express VIP Shipping Fee (SAR) *'
                      )}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={5000}
                      step="1"
                      value={publicDraft.expressShippingFee}
                      onChange={(e) =>
                        updatePublicField(
                          'expressShippingFee',
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#141413]"
                    />
                    <span className="text-[10px] text-[#8C857B] mt-1 block">
                      {t('يُطبق عند اختيار التوصيل السريع في صفحة الدفع', 'Applied when Express VIP is selected at checkout')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Tax Architecture (ZATCA 15% VAT Locked) */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#F3EFEA] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FBF7EC] text-[#B8860B] flex items-center justify-center border border-[#C59B27]/30">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141413]">
                        {t(
                          'الحوكمة الضريبية والفوترة الإلكترونية (Saudi ZATCA Tax Policy)',
                          'Tax Policy & ZATCA E-Invoicing Architecture'
                        )}
                      </h3>
                      <p className="text-[11px] text-[#8C857B]">
                        {t(
                          'نسبة ضريبة القيمة المضافة السعودية (١٥٪) والأسعار الشاملة للضريبة مقفلة معمارياً لمنع الازدواج الضريبي',
                          'Fixed 15% VAT rate and VAT-inclusive pricing are architecturally locked to prevent double taxation'
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded bg-[#141413] text-[#F5E6C8] text-[10px] font-mono font-bold">
                    ZATCA LOCKED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#141413]">
                        {t('نسبة ضريبة القيمة المضافة (vatRatePercent)', 'Saudi VAT Rate (vatRatePercent)')}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {t('ضريبة القيمة المضافة القياسية في المملكة', 'Standard KSA Value Added Tax')}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-[#0B4F3F] text-white font-mono text-sm font-bold">
                      {publicDraft.vatRatePercent}%
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#141413]">
                        {t('تسعير شامل للضريبة (vatInclusivePricing)', 'VAT-Inclusive Pricing')}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {t('تُستخرج الضريبة بمعادلة 15 / 115 دون إضافتها مرتين', 'Extracted via 15 / 115 without double addition')}
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-100 text-[#0B4F3F] font-mono text-xs font-bold">
                      {publicDraft.vatInclusivePricing ? 'TRUE (ENABLED)' : 'FALSE'}
                    </span>
                  </div>
                </div>

                {/* Required Bilingual Accounting/Legal Tax Warning */}
                <div className="p-4 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/50 flex items-start gap-3 text-xs text-[#141413]">
                  <AlertTriangle className="w-4 h-4 text-[#B8860B] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">
                      {t(
                        'تعديل السياسات الضريبية مستقبلاً يتطلب مراجعة محاسبية ونظامية ولا يؤثر على الطلبات التاريخية.',
                        'Future tax-policy changes require accounting/legal review and must not modify historical orders.'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Storefront Availability & Maintenance Controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 shadow-2xs">
                <div className="border-b border-[#F3EFEA] pb-3.5">
                  <h3 className="text-sm font-bold text-[#141413] flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#0B4F3F]" />
                    <span>
                      {t(
                        'إتاحة المتجر ومفاتيح التشغيل الحية',
                        'Storefront Availability & Operational Toggles'
                      )}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#8C857B] mt-0.5">
                    {t(
                      'تتحكم هذه المفاتيح مباشرة في إتاحة إتمام الطلبات، طلبات انضمام التجار، التقييمات، والأسئلة في المتجر العام',
                      'Live operational switches enforced both in the Storefront UI and MarketplaceContext actions'
                    )}
                  </p>
                </div>

                {/* Toggle List */}
                <div className="space-y-3">
                  {/* 1. Checkout Enabled */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#141413] flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>
                          {t('تفعيل إتمام الطلبات (Checkout)', 'Enable Order Checkout')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#57534E]">
                        {t(
                          'عند الإيقاف، يمكن للعملاء التصفح وحفظ السلع دون إنشاء طلبات جديدة',
                          'When off, customers can browse and save items but cannot place new orders'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicDraft.checkoutEnabled}
                      onChange={(e) =>
                        updatePublicField('checkoutEnabled', e.target.checked)
                      }
                      className="w-4 h-4 accent-[#0B4F3F] mt-1 shrink-0 cursor-pointer"
                    />
                  </div>

                  {/* 2. Seller Applications Enabled */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#141413] flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>
                          {t(
                            'استقبال طلبات التجار الجدد',
                            'Seller Onboarding Applications'
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#57534E]">
                        {t(
                          'السماح للعملاء برفع طلبات اعتماد متاجر جديدة (لا يؤثر على التجار الحاليين)',
                          'Allow customers to submit new merchant onboarding applications'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicDraft.sellerApplicationsEnabled}
                      onChange={(e) =>
                        updatePublicField(
                          'sellerApplicationsEnabled',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 accent-[#0B4F3F] mt-1 shrink-0 cursor-pointer"
                    />
                  </div>

                  {/* 3. Customer Reviews Enabled */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#141413] flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-[#C59B27]" />
                        <span>
                          {t('إضافة تقييمات العملاء الجديدة', 'New Customer Reviews')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#57534E]">
                        {t(
                          'عند الإيقاف، تظل التقييمات السابقة ظاهرة مع إيقاف استقبال تقييمات جديدة',
                          'When off, historical reviews remain visible while new submissions are paused'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicDraft.customerReviewsEnabled}
                      onChange={(e) =>
                        updatePublicField(
                          'customerReviewsEnabled',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 accent-[#0B4F3F] mt-1 shrink-0 cursor-pointer"
                    />
                  </div>

                  {/* 4. Product Questions Enabled */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#141413] flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>
                          {t('طرح الأسئلة على المنتجات (Q&A)', 'New Product Questions')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#57534E]">
                        {t(
                          'عند الإيقاف، تظل الأسئلة والأجوبة السابقة مقروءة مع إيقاف الأسئلة الجديدة',
                          'When off, existing Q&A remains readable while new questions are paused'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicDraft.productQuestionsEnabled}
                      onChange={(e) =>
                        updatePublicField(
                          'productQuestionsEnabled',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 accent-[#0B4F3F] mt-1 shrink-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Storefront Maintenance Banner Section */}
                <div className="pt-4 border-t border-[#F3EFEA] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#141413]">
                        {t(
                          'شريط التنبيه التشغيلي العام (Maintenance Banner)',
                          'Storefront Maintenance / Announcement Banner'
                        )}
                      </div>
                      <p className="text-[11px] text-[#8C857B]">
                        {t(
                          'يظهر في أعلى المتجر العام دون حجب لوحة الإدارة التنفيذية',
                          'Displayed at the top of the storefront without obstructing Admin Console'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={publicDraft.maintenanceBannerActive}
                      onChange={(e) =>
                        updatePublicField(
                          'maintenanceBannerActive',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 accent-[#C59B27] cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#141413] mb-1">
                      {t('نص شريط التنبيه (بالعربية)', 'Banner Notice (Arabic)')}
                    </label>
                    <textarea
                      rows={2}
                      maxLength={400}
                      value={publicDraft.maintenanceBannerAr}
                      onChange={(e) =>
                        updatePublicField('maintenanceBannerAr', e.target.value)
                      }
                      dir="rtl"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#141413] mb-1">
                      {t('نص شريط التنبيه (بالإنجليزية)', 'Banner Notice (English)')}
                    </label>
                    <textarea
                      rows={2}
                      maxLength={400}
                      value={publicDraft.maintenanceBannerEn}
                      onChange={(e) =>
                        updatePublicField('maintenanceBannerEn', e.target.value)
                      }
                      dir="ltr"
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                    />
                  </div>
                </div>

                {/* Action Bar for Public Settings */}
                <div className="pt-4 border-t border-[#E6E0D6] flex flex-col gap-2.5">
                  <button
                    type="submit"
                    disabled={
                      isSavingPublic ||
                      !hasPublicUnsavedChanges ||
                      publicValidationErrors.length > 0
                    }
                    className="w-full py-3 px-4 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-40 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <Save className="w-4 h-4 text-[#C59B27]" />
                    <span>
                      {isSavingPublic
                        ? t('جاري حفظ الإعدادات العامة...', 'Saving Public Settings...')
                        : t(
                            'حفظ ونشر الإعدادات العامة للمتجر',
                            'Save & Publish Public Settings'
                          )}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasPublicUnsavedChanges || isSavingPublic}
                    onClick={() => setPublicOverrides({})}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] disabled:opacity-40 border border-[#E6E0D6] text-xs font-bold text-[#57534E] inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {t(
                        'إلغاء التغييرات غير المحفوظة (Reset Draft)',
                        'Reset Unsaved Changes'
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ====================================================================
          TAB 2: INTERNAL GOVERNANCE — ADMIN ONLY (PRIVATE SETTINGS)
      ==================================================================== */}
      {activeTab === 'private' && (
        <form onSubmit={handleSavePrivate} className="space-y-6">
          {/* Explicit Internal Governance Security Banner */}
          <div className="p-4 rounded-2xl bg-[#141413] text-[#FAF8F5] border border-[#C59B27]/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0B4F3F] border border-[#C59B27]/40 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-[#C59B27]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#C59B27] font-bold">
                    Internal Governance — Admin Only
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white">
                    settings/privatePlatformSettings
                  </span>
                </div>
                <p className="text-xs text-[#D6D0C4] mt-0.5">
                  {t(
                    'الحوكمة الداخلية — للمسؤول فقط: هذه الوثيقة محمية بقواعد أمان Firestore (isAdmin) ولا يمكن قراءتها أو كتابتها من جلسات الزوار أو العملاء أو التجار.',
                    'Restricted by Firestore Security Rules (allow read, write: if isAdmin()). Never exposed to anonymous, customer, or seller Firestore sessions.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {privateValidationErrors.length > 0 && (
            <div
              role="alert"
              className="p-4 rounded-2xl bg-red-50 border border-[#9E2A2B]/30 space-y-1.5 text-xs text-[#9E2A2B]"
            >
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {t(
                    'يرجى تصحيح أخطاء التحقق التالية قبل حفظ إعدادات الحوكمة:',
                    'Please fix the following governance validation errors before saving:'
                  )}
                </span>
              </div>
              <ul className="list-disc list-inside space-y-1 ps-1">
                {privateValidationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              {/* 1. Commercial & Treasury Settlement Thresholds */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 shadow-2xs">
                <div className="flex items-center gap-2.5 border-b border-[#F3EFEA] pb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF3F0] text-[#0B4F3F] flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#141413]">
                      {t(
                        'السياسات المالية الافتراضية وضوابط الخزينة (Commercial & Treasury Thresholds)',
                        'Default Commission & Treasury Payout Governance'
                      )}
                    </h3>
                    <p className="text-[11px] text-[#8C857B]">
                      {t(
                        'تُطبق العمولة الافتراضية على طلبات انضمام التجار الجدد دون تغيير النسب التعاقدية للتجار الحاليين',
                        'Default commission applies to new seller applications without overwriting existing contracted sellers'
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      <span className="inline-flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        <span>
                          {t(
                            'العمولة الافتراضية للتجار الجدد (%)',
                            'Default New Seller Commission (%)'
                          )}
                        </span>
                      </span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step="0.5"
                      value={privateDraft.defaultSellerCommissionRate}
                      onChange={(e) =>
                        updatePrivateField(
                          'defaultSellerCommissionRate',
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#0B4F3F]"
                    />
                    <span className="text-[10px] text-[#8C857B] mt-1 block">
                      {t('النطاق المسموح: 0% إلى 50%', 'Valid range: 0% to 50%')}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'الحد الأدنى لطلب تسوية الأرباح (ر.س)',
                        'Minimum Payout Request (SAR)'
                      )}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      step="50"
                      value={privateDraft.minimumPayoutAmount}
                      onChange={(e) =>
                        updatePrivateField(
                          'minimumPayoutAmount',
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#141413]"
                    />
                    <span className="text-[10px] text-[#8C857B] mt-1 block">
                      {t(
                        'مُفعّل في بوابة التاجر ودالة requestSellerPayout',
                        'Enforced in Seller Payout UI and requestSellerPayout'
                      )}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'مهلة معالجة تسويات الخزينة (أيام عمل)',
                        'Payout SLA (Business Days)'
                      )}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      step="1"
                      value={privateDraft.payoutSlaBusinessDays}
                      onChange={(e) =>
                        updatePrivateField(
                          'payoutSlaBusinessDays',
                          Math.max(1, Math.round(Number(e.target.value) || 1))
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#141413]"
                    />
                    <span className="text-[10px] text-[#8C857B] mt-1 block">
                      {t('النطاق: ١ إلى ٣٠ يوم عمل', 'Valid range: 1 to 30 business days')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Returns, Refunds & Catalog Governance */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 shadow-2xs">
                <div className="flex items-center gap-2.5 border-b border-[#F3EFEA] pb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EBF3F0] text-[#0B4F3F] flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#141413]">
                      {t(
                        'ضوابط المرتجعات، المخزون، واعتماد الكتالوج',
                        'Returns Window, Inventory Alerting & Catalog Moderation Rules'
                      )}
                    </h3>
                    <p className="text-[11px] text-[#8C857B]">
                      {t(
                        'معايير الرقابة التشغيلية المعتمدة لدى فريق الإدارة ولا تعدّل الحالات التاريخية المكتملة',
                        'Operational governance rules for Admin review without retroactively altering completed cases'
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'نافذة الإرجاع المعتمدة (أيام من تاريخ التسليم)',
                        'Standard Return Window (Days)'
                      )}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={90}
                      step="1"
                      value={privateDraft.returnWindowDays}
                      onChange={(e) =>
                        updatePrivateField(
                          'returnWindowDays',
                          Math.max(1, Math.round(Number(e.target.value) || 1))
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#141413]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'الحد الافتراضي لتنبيه انخفاض المخزون (وحدة)',
                        'Global Default Low-Stock Threshold (Units)'
                      )}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step="1"
                      value={privateDraft.lowStockGlobalDefaultThreshold}
                      onChange={(e) =>
                        updatePrivateField(
                          'lowStockGlobalDefaultThreshold',
                          Math.max(1, Math.round(Number(e.target.value) || 1))
                        )
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#141413]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start justify-between gap-2.5">
                    <div>
                      <div className="text-xs font-bold text-[#141413]">
                        {t(
                          'اشتراط التوثيق للواجهة المختارة',
                          'Require Verified Badge for Featured'
                        )}
                      </div>
                      <p className="text-[11px] text-[#57534E] mt-0.5">
                        {t(
                          'قصر إبراز المنتجات في المختارات على المتاجر الموثقة',
                          'Restrict featured curation to verified boutiques'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privateDraft.requireVerifiedBadgeForFeatured}
                      onChange={(e) =>
                        updatePrivateField(
                          'requireVerifiedBadgeForFeatured',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 accent-[#0B4F3F] mt-1 shrink-0 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start justify-between gap-2.5">
                    <div>
                      <div className="text-xs font-bold text-[#141413]">
                        {t(
                          'اعتماد تلقائي لمنتجات المتاجر الموثقة',
                          'Auto-Approve Verified Seller SKUs'
                        )}
                      </div>
                      <p className="text-[11px] text-[#57534E] mt-0.5">
                        {t(
                          'تفعيل منتجات التجار الموثقين مباشرة عند الإضافة',
                          'Allow verified sellers to publish active SKUs directly'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privateDraft.autoApproveVerifiedSellerProducts}
                      onChange={(e) =>
                        updatePrivateField(
                          'autoApproveVerifiedSellerProducts',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 accent-[#0B4F3F] mt-1 shrink-0 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start justify-between gap-2.5">
                    <div>
                      <div className="text-xs font-bold text-[#141413]">
                        {t(
                          'السماح بالاسترداد لوسيلة الدفع الأصلية',
                          'Allow Original Payment Refunds'
                        )}
                      </div>
                      <p className="text-[11px] text-[#57534E] mt-0.5">
                        {t(
                          'تفعيل مسار external_authorized_pending بجانب المحفظة',
                          'Enable external gateway reversal workflow alongside wallet'
                        )}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={privateDraft.allowOriginalPaymentRefunds}
                      onChange={(e) =>
                        updatePrivateField(
                          'allowOriginalPaymentRefunds',
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 accent-[#0B4F3F] mt-1 shrink-0 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Confidential Internal Governance Notes */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#F3EFEA] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#FBF7EC] text-[#B8860B] flex items-center justify-center border border-[#C59B27]/30">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#141413]">
                        {t(
                          'مذكرات الحوكمة الداخلية والامتثال (Internal Governance Notes)',
                          'Internal Governance & Executive Compliance Notes'
                        )}
                      </h3>
                      <p className="text-[11px] text-[#8C857B]">
                        {t(
                          'ملاحظات داخلية سرية لفريق الإدارة التنفيذية فقط — لا تظهر في المتجر ولا في ملخصات سجل التدقيق',
                          'Admin-only internal directives — never exposed to customers/sellers or printed in audit list summaries'
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-red-50 text-[#9E2A2B] border border-red-200 text-[10px] font-mono font-bold">
                    ADMIN EYES ONLY
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'ملاحظات الحوكمة الداخلية (بالعربية)',
                        'Internal Governance Notes (Arabic)'
                      )}
                    </label>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={privateDraft.internalGovernanceNotesAr}
                      onChange={(e) =>
                        updatePrivateField(
                          'internalGovernanceNotesAr',
                          e.target.value
                        )
                      }
                      dir="rtl"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t(
                        'ملاحظات الحوكمة الداخلية (بالإنجليزية)',
                        'Internal Governance Notes (English)'
                      )}
                    </label>
                    <textarea
                      rows={4}
                      maxLength={1000}
                      value={privateDraft.internalGovernanceNotesEn}
                      onChange={(e) =>
                        updatePrivateField(
                          'internalGovernanceNotesEn',
                          e.target.value
                        )
                      }
                      dir="ltr"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Save Bar & Active Policy Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 shadow-2xs">
                <div className="border-b border-[#F3EFEA] pb-3.5">
                  <h3 className="text-sm font-bold text-[#141413]">
                    {t(
                      'ملخص ضوابط الحوكمة النشطة',
                      'Active Governance Policy Summary'
                    )}
                  </h3>
                  <p className="text-[11px] text-[#8C857B] mt-0.5">
                    {t(
                      'القيم المطبقة حالياً في العمليات المالية وبوابة التجار',
                      'Currently enforced parameters across Seller Center & Treasury'
                    )}
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-2 border-b border-[#F3EFEA]">
                    <span className="text-[#57534E]">
                      {t('عمولة التجار الجدد:', 'New Seller Commission:')}
                    </span>
                    <span className="font-mono font-bold text-[#0B4F3F]">
                      {privateDraft.defaultSellerCommissionRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#F3EFEA]">
                    <span className="text-[#57534E]">
                      {t('الحد الأدنى لطلب التسوية:', 'Minimum Payout Threshold:')}
                    </span>
                    <span className="font-mono font-bold text-[#141413]">
                      {formatPrice(privateDraft.minimumPayoutAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#F3EFEA]">
                    <span className="text-[#57534E]">
                      {t('مهلة تسوية الخزينة (SLA):', 'Treasury Payout SLA:')}
                    </span>
                    <span className="font-mono font-bold text-[#141413]">
                      {privateDraft.payoutSlaBusinessDays}{' '}
                      {t('أيام عمل', 'business days')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-[#F3EFEA]">
                    <span className="text-[#57534E]">
                      {t('نافذة الإرجاع المعتمدة:', 'Return Policy Window:')}
                    </span>
                    <span className="font-mono font-bold text-[#0B4F3F]">
                      {privateDraft.returnWindowDays} {t('يوماً', 'days')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#57534E]">
                      {t('تنبيه المخزون الافتراضي:', 'Default Low Stock Limit:')}
                    </span>
                    <span className="font-mono font-bold text-[#141413]">
                      {privateDraft.lowStockGlobalDefaultThreshold}{' '}
                      {t('وحدات', 'units')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E6E0D6] flex flex-col gap-2.5">
                  <button
                    type="submit"
                    disabled={
                      isSavingPrivate ||
                      !hasPrivateUnsavedChanges ||
                      privateValidationErrors.length > 0
                    }
                    className="w-full py-3 px-4 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-40 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <Save className="w-4 h-4 text-[#C59B27]" />
                    <span>
                      {isSavingPrivate
                        ? t(
                            'جاري حفظ إعدادات الحوكمة...',
                            'Saving Governance Settings...'
                          )
                        : t(
                            'حفظ إعدادات الحوكمة الداخلية',
                            'Save Internal Governance Settings'
                          )}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!hasPrivateUnsavedChanges || isSavingPrivate}
                    onClick={() => setPrivateOverrides({})}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] disabled:opacity-40 border border-[#E6E0D6] text-xs font-bold text-[#57534E] inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {t(
                        'إلغاء التغييرات غير المحفوظة (Reset Draft)',
                        'Reset Unsaved Changes'
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* Recent Settings Audit Trail */}
              <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C857B]">
                  {t(
                    'أحدث سجلات تدقيق الإعدادات (targetType = settings)',
                    'Recent Settings Audit Trail (targetType = settings)'
                  )}
                </h4>
                {recentSettingsLogs.length === 0 ? (
                  <p className="text-xs text-[#8C857B]">
                    {t(
                      'لا توجد تعديلات إعدادات مسجلة في هذه الجلسة بعد.',
                      'No settings mutations logged yet in this session.'
                    )}
                  </p>
                ) : (
                  <div className="divide-y divide-[#F3EFEA]">
                    {recentSettingsLogs.map((log) => (
                      <div key={log.id} className="py-2.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] text-[#0B4F3F]">
                            {log.targetId}
                          </span>
                          <span className="font-mono text-[10px] text-[#8C857B]">
                            {log.createdAt}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#141413]">
                          {lang === 'ar' ? log.actionAr : log.actionEn}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
