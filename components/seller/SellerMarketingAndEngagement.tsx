'use client';

import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Sparkles,
  MessageSquare,
  Star,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Power,
  Send,
  ShieldCheck,
  Award,
  Eye,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  Coupon,
  Product,
  ProductQuestion,
  Review,
  Seller,
} from '@/lib/types';

interface SellerMarketingProps {
  seller: Seller;
  sellerProducts: Product[];
  mode: 'promotions' | 'questions' | 'reviews';
}

const QUICK_ANSWER_TEMPLATES = [
  {
    ar: 'حياك الله، نعم المنتج أصلي ١٠٠٪ ويأتي في صندوقه الرسمي المختوم مع شهادة الضمان المعتمدة لمدة ٢٤ شهراً.',
    en: 'Welcome! Yes, the item is 100% authentic in its factory-sealed presentation box with an official 24-month KSA warranty.',
  },
  {
    ar: 'أهلاً بك طال عمرك، نعم متوفر للشحن الفوري عبر سبل وأرامكس بريميوم ويصلك خلال ٢٤ إلى ٤٨ ساعة.',
    en: 'Greetings! Yes, it is in stock for immediate dispatch via SPL/Aramex VIP within 24–48 hours.',
  },
];

export default function SellerMarketingAndEngagement({
  seller,
  sellerProducts,
  mode,
}: SellerMarketingProps) {
  const {
    lang,
    t,
    formatPrice,
    coupons,
    questions,
    reviews,
    saveCoupon,
    toggleCouponStatus,
    deleteCoupon,
    answerProductQuestion,
    replyToReview,
    navigateTo,
  } = useMarketplace();

  const sellerProductIds = useMemo(
    () => new Set(sellerProducts.map((p) => p.id)),
    [sellerProducts]
  );

  // ============================================================================
  // 1. PROMOTIONS & COUPONS STATE
  // ============================================================================
  const sellerCoupons = useMemo(
    () => coupons.filter((c) => c.sellerId === seller.id),
    [coupons, seller.id]
  );
  const platformCoupons = useMemo(
    () => coupons.filter((c) => !c.sellerId || c.sellerId === 'all'),
    [coupons]
  );

  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [cpnCode, setCpnCode] = useState('');
  const [cpnTitleAr, setCpnTitleAr] = useState('');
  const [cpnTitleEn, setCpnTitleEn] = useState('');
  const [cpnType, setCpnType] = useState<'percentage' | 'fixed'>('percentage');
  const [cpnValue, setCpnValue] = useState<number>(15);
  const [cpnMinOrder, setCpnMinOrder] = useState<number>(500);
  const [cpnMaxDiscount, setCpnMaxDiscount] = useState<number>(400);
  const [cpnMaxUses, setCpnMaxUses] = useState<number>(200);
  const [cpnExpiresAt, setCpnExpiresAt] = useState('2026-12-31');

  const openCouponForm = (cpn?: Coupon) => {
    if (cpn) {
      setEditingCoupon(cpn);
      setCpnCode(cpn.code);
      setCpnTitleAr(cpn.titleAr);
      setCpnTitleEn(cpn.titleEn);
      setCpnType(cpn.type);
      setCpnValue(cpn.value);
      setCpnMinOrder(cpn.minOrderAmount);
      setCpnMaxDiscount(cpn.maxDiscount || 500);
      setCpnMaxUses(cpn.maxUses);
      setCpnExpiresAt(cpn.expiresAt);
    } else {
      setEditingCoupon(null);
      setCpnCode(`ATH${Math.floor(10 + Math.random() * 89)}`);
      setCpnTitleAr(`خصم خاص من ${seller.nameAr}`);
      setCpnTitleEn(`Exclusive Privilege from ${seller.nameEn}`);
      setCpnType('percentage');
      setCpnValue(15);
      setCpnMinOrder(450);
      setCpnMaxDiscount(350);
      setCpnMaxUses(250);
      setCpnExpiresAt('2026-12-31');
    }
    setShowCouponForm(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpnCode.trim() || !cpnTitleAr.trim()) return;

    const payload: Coupon = {
      id: editingCoupon ? editingCoupon.id : `cpn-${Date.now()}`,
      code: cpnCode.trim().toUpperCase(),
      titleAr: cpnTitleAr.trim(),
      titleEn: cpnTitleEn.trim() || cpnTitleAr.trim(),
      type: cpnType,
      value: Math.max(1, Number(cpnValue) || 10),
      minOrderAmount: Math.max(0, Number(cpnMinOrder) || 0),
      maxDiscount: cpnType === 'percentage' ? Math.max(10, Number(cpnMaxDiscount) || 300) : undefined,
      maxUses: Math.max(1, Number(cpnMaxUses) || 100),
      usedCount: editingCoupon ? editingCoupon.usedCount : 0,
      sellerId: seller.id,
      sellerNameAr: seller.nameAr,
      expiresAt: cpnExpiresAt,
      isActive: editingCoupon ? editingCoupon.isActive : true,
    };

    await saveCoupon(payload);
    setShowCouponForm(false);
  };

  // ============================================================================
  // 2. CUSTOMER QUESTIONS STATE
  // ============================================================================
  const sellerQuestions = useMemo(
    () => questions.filter((q) => sellerProductIds.has(q.productId)),
    [questions, sellerProductIds]
  );
  const [qaFilter, setQaFilter] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});

  const filteredQuestions = useMemo(() => {
    return sellerQuestions.filter((q) => {
      if (qaFilter === 'unanswered') return !q.answerAr;
      if (qaFilter === 'answered') return Boolean(q.answerAr);
      return true;
    });
  }, [sellerQuestions, qaFilter]);

  // ============================================================================
  // 3. CUSTOMER REVIEWS STATE
  // ============================================================================
  const sellerReviews = useMemo(
    () => reviews.filter((r) => sellerProductIds.has(r.productId)),
    [reviews, sellerProductIds]
  );
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4' | 'low'>('all');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const filteredReviews = useMemo(() => {
    return sellerReviews.filter((r) => {
      if (ratingFilter === '5') return r.rating === 5;
      if (ratingFilter === '4') return r.rating === 4;
      if (ratingFilter === 'low') return r.rating <= 3;
      return true;
    });
  }, [sellerReviews, ratingFilter]);

  const reviewStats = useMemo(() => {
    const total = sellerReviews.length;
    const avg =
      total > 0
        ? Number((sellerReviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2))
        : seller.rating;
    const verifiedCount = sellerReviews.filter((r) => r.verifiedPurchase).length;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: sellerReviews.filter((r) => r.rating === star).length,
    }));
    return { total, avg, verifiedCount, dist };
  }, [sellerReviews, seller.rating]);

  // ============================================================================
  // RENDER: PROMOTIONS & COUPONS
  // ============================================================================
  if (mode === 'promotions') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40 text-[11px] font-bold">
              {t('إدارة الكوبونات والعروض الترويجية', 'Promotions & Discount Coupons')}
            </span>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t('كوبونات الخصم الخاصة بمتجرك وحملات أثيل', 'Merchant Storefront Coupons & Campaigns')}
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              {t(
                'أنشئ أكواد خصم مخصصة لعملاء متجرك (نسبة مئوية أو مبلغ ثابت بالريال). عداد الاستخدام الفعلي محمي تلقائياً.',
                'Create percentage or fixed SAR discount codes for your store. Authoritative redemption counters are protected.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCouponForm()}
            className="px-4 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#C59B27]" />
            <span>{t('إنشاء كوبون خصم جديد', 'Create Store Coupon')}</span>
          </button>
        </div>

        {/* Create / Edit Coupon Form */}
        {showCouponForm && (
          <form
            onSubmit={handleSaveCoupon}
            className="bg-white rounded-2xl border-2 border-[#0B4F3F]/30 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#E6E0D6] pb-3">
              <h3 className="text-sm font-bold text-[#141413]">
                {editingCoupon
                  ? t(`تعديل الكوبون ${editingCoupon.code}`, `Edit Coupon ${editingCoupon.code}`)
                  : t('إصدار كوبون خصم جديد خاص بمتجرك', 'Create New Store-Exclusive Coupon')}
              </h3>
              <button
                type="button"
                onClick={() => setShowCouponForm(false)}
                className="text-xs text-[#57534E] hover:underline"
              >
                {t('إغلاق', 'Close')}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {t('كود الكوبون (إنجليزي/أرقام) *', 'Coupon Code *')}
                </label>
                <input
                  type="text"
                  required
                  value={cpnCode}
                  onChange={(e) => setCpnCode(e.target.value.toUpperCase())}
                  placeholder="AFAQ20"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono font-bold text-[#0B4F3F]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {t('نوع الخصم', 'Discount Type')}
                </label>
                <select
                  value={cpnType}
                  onChange={(e) => setCpnType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold"
                >
                  <option value="percentage">{t('نسبة مئوية (%)', 'Percentage (%)')}</option>
                  <option value="fixed">{t('مبلغ ثابت (ر.س)', 'Fixed Amount (SAR)')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {cpnType === 'percentage'
                    ? t('نسبة الخصم (%) *', 'Discount Percentage (%) *')
                    : t('قيمة الخصم (ر.س) *', 'Discount Value (SAR) *')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={cpnType === 'percentage' ? 80 : 5000}
                  required
                  value={cpnValue}
                  onChange={(e) => setCpnValue(Number(e.target.value) || 10)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {t('عنوان العرض بالعربية *', 'Offer Title (Arabic) *')}
                </label>
                <input
                  type="text"
                  required
                  value={cpnTitleAr}
                  onChange={(e) => setCpnTitleAr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {t('عنوان العرض بالإنجليزية', 'Offer Title (English)')}
                </label>
                <input
                  type="text"
                  value={cpnTitleEn}
                  onChange={(e) => setCpnTitleEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {t('الحد الأدنى للطلب (ر.س)', 'Min Order (SAR)')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={cpnMinOrder}
                  onChange={(e) => setCpnMinOrder(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                />
              </div>
              {cpnType === 'percentage' && (
                <div>
                  <label className="block text-xs font-bold text-[#141413] mb-1">
                    {t('الحد الأقصى للخصم (ر.س)', 'Max Discount Cap (SAR)')}
                  </label>
                  <input
                    type="number"
                    min={10}
                    value={cpnMaxDiscount}
                    onChange={(e) => setCpnMaxDiscount(Number(e.target.value) || 200)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {t('الحد الأقصى للاستخدام', 'Max Total Uses')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={cpnMaxUses}
                  onChange={(e) => setCpnMaxUses(Number(e.target.value) || 100)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1">
                  {t('تاريخ الانتهاء', 'Expiration Date')}
                </label>
                <input
                  type="date"
                  value={cpnExpiresAt}
                  onChange={(e) => setCpnExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#57534E] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0B4F3F]" />
                <span>
                  {t(
                    'عداد الاستخدام (usedCount) محمي أمنياً ولا يتغير إلا عبر عمليات الشراء الموثقة.',
                    'usedCount is security-locked and only incremented by verified checkouts.'
                  )}
                </span>
              </span>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
              >
                {t('حفظ ونشر الكوبون', 'Save & Publish Coupon')}
              </button>
            </div>
          </form>
        )}

        {/* Store Exclusive Coupons Grid */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#141413]">
            {t(`كوبونات متجر ${seller.nameAr} (${sellerCoupons.length})`, `Your Store Coupons (${sellerCoupons.length})`)}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sellerCoupons.map((cpn) => {
              const usagePct = Math.min(100, Math.round((cpn.usedCount / Math.max(1, cpn.maxUses)) * 100));
              return (
                <div
                  key={cpn.id}
                  className="bg-white rounded-2xl border border-[#E6E0D6] p-5 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-[#FAF8F5] border border-[#C59B27]/50 font-mono font-bold text-sm text-[#0B4F3F]">
                          {cpn.code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cpn.isActive
                              ? 'bg-[#EBF3F0] text-[#1E6B47]'
                              : 'bg-stone-100 text-[#8C857B]'
                          }`}
                        >
                          {cpn.isActive ? t('فعال', 'Active') : t('متوقف مؤقتاً', 'Paused')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#141413] mt-2">
                        {lang === 'ar' ? cpn.titleAr : cpn.titleEn}
                      </h4>
                      <div className="text-[11px] text-[#57534E] mt-1">
                        {t('الحد الأدنى للطلب:', 'Min Order:')} {formatPrice(cpn.minOrderAmount)}
                        {cpn.maxDiscount ? ` · ${t('بحد أقصى:', 'Max Cap:')} ${formatPrice(cpn.maxDiscount)}` : ''}
                      </div>
                    </div>

                    <div className="text-end">
                      <div className="text-xl font-bold font-mono text-[#B8860B]">
                        {cpn.type === 'percentage' ? `${cpn.value}%` : formatPrice(cpn.value)}
                      </div>
                      <div className="text-[10px] text-[#8C857B] font-mono">
                        {t('ينتهي:', 'Exp:')} {cpn.expiresAt}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#57534E]">
                        {t('مرات الاستخدام الموثقة:', 'Verified Redemptions:')}
                      </span>
                      <span className="font-mono font-bold text-[#141413]">
                        {cpn.usedCount} / {cpn.maxUses} ({usagePct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F3EFEA] overflow-hidden">
                      <div
                        className="h-full bg-[#0B4F3F] rounded-full"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#F3EFEA] text-xs">
                    <button
                      type="button"
                      onClick={() => toggleCouponStatus(cpn.id)}
                      className="inline-flex items-center gap-1.5 font-bold text-[#0B4F3F] hover:underline"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{cpn.isActive ? t('إيقاف مؤقت', 'Pause') : t('تفعيل الكوبون', 'Activate')}</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openCouponForm(cpn)}
                        className="text-[#57534E] hover:text-[#141413] font-semibold inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{t('تعديل', 'Edit')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCoupon(cpn.id)}
                        className="text-[#9E2A2B] font-semibold inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t('حذف', 'Delete')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Platform-Wide Campaigns (Read-Only Reference for Merchant) */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#141413]">
                {t('حملات وكوبونات منصة أثيل العامة (للاطلاع فقط)', 'Atheel Platform-Wide Campaigns (Read-Only)')}
              </h3>
              <p className="text-[11px] text-[#8C857B]">
                {t(
                  'تتحمل منصة أثيل فرق الخصم لهذه الكوبونات الترويجية بالكامل دون المساس بصافي أرباح متجرك.',
                  'Atheel subsidizes platform-wide coupon discounts; your net merchant proceeds remain unaffected.'
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {platformCoupons.map((cpn) => (
              <div
                key={cpn.id}
                className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#0B4F3F]">{cpn.code}</span>
                  <span className="font-mono font-bold text-[#B8860B]">
                    {cpn.type === 'percentage' ? `${cpn.value}%` : formatPrice(cpn.value)}
                  </span>
                </div>
                <div className="text-[11px] text-[#57534E] line-clamp-1">
                  {lang === 'ar' ? cpn.titleAr : cpn.titleEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: CUSTOMER QUESTIONS (Q&A)
  // ============================================================================
  if (mode === 'questions') {
    const unansweredCount = sellerQuestions.filter((q) => !q.answerAr).length;
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold">
              {t('استفسارات العملاء قبل الشراء', 'Customer Pre-Purchase Q&A')}
            </span>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t('الرد المباشر على أسئلة العملاء حول منتجاتك', 'Merchant Q&A Concierge Desk')}
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              {t(
                'الإجابات الموثقة تظهر فوراً في صفحة المنتج باسم متجرك المعتمد وتزيد معدل التحويل بنسبة ٣٤٪.',
                'Official answers appear immediately on the product page with your Verified Seller badge.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(
              [
                { id: 'all', ar: `الكل (${sellerQuestions.length})`, en: `All (${sellerQuestions.length})` },
                {
                  id: 'unanswered',
                  ar: `بانتظار الرد (${unansweredCount})`,
                  en: `Unanswered (${unansweredCount})`,
                },
                {
                  id: 'answered',
                  ar: `تمت الإجابة (${sellerQuestions.length - unansweredCount})`,
                  en: `Answered (${sellerQuestions.length - unansweredCount})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setQaFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
                  qaFilter === tab.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'bg-[#FAF8F5] border border-[#E6E0D6] text-[#57534E]'
                }`}
              >
                {lang === 'ar' ? tab.ar : tab.en}
              </button>
            ))}
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-12 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-[#C59B27] mx-auto" />
            <h3 className="text-base font-bold text-[#141413]">
              {t('لا توجد استفسارات في هذا القسم حالياً', 'No customer questions in this view')}
            </h3>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const prod = sellerProducts.find((p) => p.id === q.productId);
              const draft = answerDrafts[q.id] ?? q.answerAr ?? '';
              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3EFEA] pb-3">
                    <div className="flex items-center gap-3">
                      {prod && (
                        <img
                          src={prod.images[0]}
                          alt={prod.titleAr}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-xl object-cover bg-[#F3EFEA] border border-[#E6E0D6]"
                        />
                      )}
                      <div>
                        <div className="text-xs font-bold text-[#141413]">
                          {prod ? (lang === 'ar' ? prod.titleAr : prod.titleEn) : q.productId}
                        </div>
                        <div className="text-[11px] text-[#8C857B]">
                          {t('سؤال من العميل:', 'Asked by:')} <strong className="text-[#141413]">{q.userName}</strong> ·{' '}
                          <span className="font-mono">{q.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                        q.answerAr
                          ? 'bg-[#EBF3F0] text-[#1E6B47]'
                          : 'bg-[#FBF7EC] text-[#C87D12] border border-[#C59B27]/40'
                      }`}
                    >
                      {q.answerAr
                        ? t('تم نشر الرد الرسمي ✓', 'Answered ✓')
                        : t('بانتظار رد المتجر', 'Awaiting Reply')}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]">
                    « {lang === 'ar' ? q.questionAr : q.questionEn} »
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#57534E]">
                        {t('إجابتك الرسمية كتاجر معتمد:', 'Your Official Merchant Response:')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_ANSWER_TEMPLATES.map((tpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setAnswerDrafts((prev) => ({
                                ...prev,
                                [q.id]: lang === 'ar' ? tpl.ar : tpl.en,
                              }))
                            }
                            className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF3F0] border border-[#E6E0D6] text-[10px] font-semibold text-[#0B4F3F]"
                          >
                            + {t(`قالب جاهز ${idx + 1}`, `Quick Template ${idx + 1}`)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <textarea
                        rows={2}
                        value={draft}
                        onChange={(e) =>
                          setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder={t(
                          'اكتب إجابة وافية للعميل تظهر في صفحة المنتج...',
                          'Write a clear, helpful response to publish on the product page...'
                        )}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (draft.trim()) {
                            answerProductQuestion(q.id, draft.trim());
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{q.answerAr ? t('تحديث الإجابة', 'Update Answer') : t('نشر الإجابة', 'Publish Reply')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: CUSTOMER REVIEWS & REPUTATION
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 space-y-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40 text-[11px] font-bold">
            {t('سمعة المتجر وتقييمات المشترين الموثقين', 'Verified Buyer Reviews & Reputation')}
          </span>
          <h2 className="text-xl font-bold text-[#141413]">
            {t('تقييمات عملاء متجر ' + seller.nameAr, 'Customer Reviews for ' + seller.nameEn)}
          </h2>
          <p className="text-xs text-[#57534E]">
            {t(
              'جميع تقييمات «مشتري موثق» مرتبطة بطلبات مُسلّمة فعلياً ومحمية ضد التلاعب عبر قواعد Firestore.',
              'All Verified Purchase badges are cryptographically tied to delivered orders containing the reviewed SKU.'
            )}
          </p>
        </div>

        <div className="lg:col-span-3 bg-[#FAF8F5] rounded-2xl border border-[#E6E0D6] p-4 text-center">
          <div className="text-3xl font-bold font-mono text-[#0B4F3F] flex items-center justify-center gap-1.5">
            <span>{reviewStats.avg}</span>
            <Star className="w-6 h-6 text-[#C59B27] fill-[#C59B27]" />
          </div>
          <div className="text-xs font-bold text-[#141413] mt-1">
            {reviewStats.total} {t('تقييم معتمد للمنتجات', 'Product Reviews')}
          </div>
          <div className="text-[11px] text-[#1E6B47] font-semibold mt-0.5">
            {reviewStats.verifiedCount} {t('عملية شراء موثقة ✓', 'Verified Purchases ✓')}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-1.5">
          {reviewStats.dist.map((d) => {
            const pct = reviewStats.total > 0 ? Math.round((d.count / reviewStats.total) * 100) : 0;
            return (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-10 font-mono font-bold text-[#141413]">{d.star} ★</span>
                <div className="flex-1 h-2 rounded-full bg-[#F3EFEA] overflow-hidden">
                  <div
                    className="h-full bg-[#C59B27] rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-8 text-end font-mono text-[11px] text-[#8C857B]">{d.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', ar: 'جميع التقييمات', en: 'All Reviews' },
            { id: '5', ar: '٥ نجوم (5★)', en: '5 Stars' },
            { id: '4', ar: '٤ نجوم (4★)', en: '4 Stars' },
            { id: 'low', ar: '٣ نجوم فأقل (للمتابعة)', en: '3 Stars & Below' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setRatingFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              ratingFilter === f.id
                ? 'bg-[#0B4F3F] text-white'
                : 'bg-white border border-[#E6E0D6] text-[#57534E]'
            }`}
          >
            {lang === 'ar' ? f.ar : f.en}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((rev) => {
          const prod = sellerProducts.find((p) => p.id === rev.productId);
          const replyDraft = replyDrafts[rev.id] ?? rev.sellerReplyAr ?? '';
          return (
            <div
              key={rev.id}
              className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F3EFEA] pb-3">
                <div className="flex items-center gap-3">
                  {prod && (
                    <img
                      src={prod.images[0]}
                      alt={prod.titleAr}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover bg-[#F3EFEA] border border-[#E6E0D6]"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#141413]">{rev.userName}</span>
                      {rev.verifiedPurchase && (
                        <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#1E6B47] text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('مشتري موثق', 'Verified Purchase')}</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#57534E] mt-0.5">
                      {prod
                        ? lang === 'ar'
                          ? prod.titleAr
                          : prod.titleEn
                        : rev.productTitleAr || rev.productId}
                    </div>
                  </div>
                </div>

                <div className="text-end">
                  <div className="flex items-center gap-0.5 text-[#C59B27]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-4 h-4 ${
                          idx < rev.rating ? 'fill-[#C59B27]' : 'text-[#E6E0D6]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] font-mono text-[#8C857B] mt-0.5">{rev.createdAt}</div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <h4 className="font-bold text-[#141413]">{rev.title}</h4>
                <p className="text-[#57534E] leading-relaxed">{rev.comment}</p>
              </div>

              {rev.sellerReplyAr && (
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border-s-4 border-[#0B4F3F] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B4F3F]">
                      {t(`رد المتجر الرسمي (${seller.nameAr}):`, `Official Reply (${seller.nameEn}):`)}
                    </span>
                    <span className="font-mono text-[10px] text-[#8C857B]">{rev.sellerReplyAt}</span>
                  </div>
                  <p className="text-[#141413]">{rev.sellerReplyAr}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <input
                  type="text"
                  value={replyDraft}
                  onChange={(e) =>
                    setReplyDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))
                  }
                  placeholder={t(
                    'اكتب رداً رسمياً باسم المتجر لشكر العميل أو توضيح أي استفسار...',
                    'Write an official merchant reply to this review...'
                  )}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (replyDraft.trim()) {
                      replyToReview(rev.id, replyDraft.trim());
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold shrink-0"
                >
                  {rev.sellerReplyAr ? t('تحديث الرد', 'Update Reply') : t('نشر رد المتجر', 'Post Reply')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
