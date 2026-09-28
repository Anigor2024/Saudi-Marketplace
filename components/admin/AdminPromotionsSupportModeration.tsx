'use client';

import React, { useState, useMemo } from 'react';
import {
  Tag,
  MessageSquare,
  Star,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  Send,
  X,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { Coupon, SupportTicket } from '@/lib/types';
import { maskIbanInText } from '@/lib/utils';

interface AdminPromotionsSupportModerationProps {
  section?: 'coupons' | 'tickets' | 'moderation' | 'promotions' | 'support';
  activeSection?: 'coupons' | 'tickets' | 'moderation' | 'promotions' | 'support';
}

export default function AdminPromotionsSupportModeration({
  section,
  activeSection,
}: AdminPromotionsSupportModerationProps) {
  const rawSection = activeSection || section || 'promotions';
  const effectiveSection =
    rawSection === 'promotions'
      ? 'coupons'
      : rawSection === 'support'
      ? 'tickets'
      : rawSection;

  const {
    lang,
    t,
    formatPrice,
    coupons,
    sellers,
    tickets,
    reviews,
    questions,
    products,
    saveCoupon,
    toggleCouponStatus,
    deleteCoupon,
    replyToSupportTicket,
    updatePayoutTreasuryStatus,
    moderateReviewStatus,
    deleteReviewAdmin,
    replyToReview,
    answerProductQuestion,
    deleteQuestionAdmin,
  } = useMarketplace();

  // ============================================================================
  // 1. COUPONS & PROMOTIONS STATE
  // ============================================================================
  const [couponScopeFilter, setCouponScopeFilter] = useState<'all' | 'platform' | 'seller'>('all');
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [cpnCode, setCpnCode] = useState('');
  const [cpnTitleAr, setCpnTitleAr] = useState('');
  const [cpnTitleEn, setCpnTitleEn] = useState('');
  const [cpnType, setCpnType] = useState<'percentage' | 'fixed'>('percentage');
  const [cpnValue, setCpnValue] = useState(15);
  const [cpnMinOrder, setCpnMinOrder] = useState(300);
  const [cpnMaxDiscount, setCpnMaxDiscount] = useState(500);
  const [cpnMaxUses, setCpnMaxUses] = useState(500);
  const [cpnSellerId, setCpnSellerId] = useState('all');
  const [cpnExpiresAt, setCpnExpiresAt] = useState('2026-12-31');

  const openCouponEditor = (cpn?: Coupon) => {
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
      setCpnSellerId(cpn.sellerId || 'all');
      setCpnExpiresAt(cpn.expiresAt);
    } else {
      setEditingCoupon(null);
      setCpnCode('');
      setCpnTitleAr('');
      setCpnTitleEn('');
      setCpnType('percentage');
      setCpnValue(15);
      setCpnMinOrder(350);
      setCpnMaxDiscount(500);
      setCpnMaxUses(500);
      setCpnSellerId('all');
      setCpnExpiresAt('2026-12-31');
    }
    setShowCouponModal(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpnCode.trim()) return;
    const selectedSeller = sellers.find((s) => s.id === cpnSellerId);
    const payload: Coupon = {
      id: editingCoupon?.id || `cpn-${Date.now()}`,
      code: cpnCode.trim().toUpperCase(),
      titleAr: cpnTitleAr.trim() || `عرض خصم ${cpnCode.toUpperCase()}`,
      titleEn: cpnTitleEn.trim() || `Privilege Code ${cpnCode.toUpperCase()}`,
      type: cpnType,
      value: Math.max(1, cpnValue),
      minOrderAmount: Math.max(0, cpnMinOrder),
      ...(cpnType === 'percentage' ? { maxDiscount: Math.max(10, cpnMaxDiscount) } : {}),
      maxUses: Math.max(1, cpnMaxUses),
      usedCount: editingCoupon?.usedCount || 0,
      sellerId: cpnSellerId,
      sellerNameAr:
        cpnSellerId === 'all'
          ? 'جميع متاجر أثيل'
          : selectedSeller?.nameAr || editingCoupon?.sellerNameAr || 'متجر معتمد',
      expiresAt: cpnExpiresAt || '2026-12-31',
      isActive: editingCoupon ? editingCoupon.isActive : true,
    };
    await saveCoupon(payload);
    setShowCouponModal(false);
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      const isPlat = !c.sellerId || c.sellerId === 'all';
      if (couponScopeFilter === 'platform' && !isPlat) return false;
      if (couponScopeFilter === 'seller' && isPlat) return false;
      return true;
    });
  }, [coupons, couponScopeFilter]);

  // ============================================================================
  // 2. SUPPORT TICKETS & CONCIERGE DESK STATE
  // ============================================================================
  const [ticketStatusFilter, setTicketStatusFilter] = useState<
    'all' | 'open' | 'in_progress' | 'resolved'
  >('all');
  const [ticketWorkflowFilter, setTicketWorkflowFilter] = useState<
    'all' | 'support' | 'payout' | 'return_inspection' | 'seller_application_info'
  >('all');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [treasuryDrafts, setTreasuryDrafts] = useState<
    Record<string, NonNullable<SupportTicket['treasuryStatus']>>
  >({});

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.trim().toLowerCase();
    return tickets.filter((tkt) => {
      if (ticketStatusFilter !== 'all' && tkt.status !== ticketStatusFilter) return false;
      const wf = tkt.workflowType || 'support';
      if (ticketWorkflowFilter !== 'all' && wf !== ticketWorkflowFilter) return false;
      if (!q) return true;
      return (
        tkt.ticketNumber.toLowerCase().includes(q) ||
        tkt.subject.toLowerCase().includes(q) ||
        tkt.userName.toLowerCase().includes(q) ||
        (tkt.orderNumber || '').toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketStatusFilter, ticketWorkflowFilter, ticketSearch]);

  // ============================================================================
  // 3. REVIEWS & QUESTIONS MODERATION STATE
  // ============================================================================
  const [modTab, setModTab] = useState<'reviews' | 'questions'>('reviews');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'pending' | 'hidden'>('all');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState<Record<string, string>>({});
  const [questionAnswerDrafts, setQuestionAnswerDrafts] = useState<Record<string, string>>({});

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => (reviewFilter === 'all' ? true : r.status === reviewFilter));
  }, [reviews, reviewFilter]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (questionFilter === 'unanswered') return !q.answerAr;
      if (questionFilter === 'answered') return Boolean(q.answerAr);
      return true;
    });
  }, [questions, questionFilter]);

  // ============================================================================
  // RENDER 1: COUPONS & PROMOTIONS
  // ============================================================================
  if (effectiveSection === 'coupons') {
    const activeCount = coupons.filter((c) => c.isActive).length;
    const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#0B4F3F]">
              {t('إدارة الحملات الترويجية وكوبونات الخصم', 'Promotions & Coupon Governance')}
            </div>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t('الكوبونات المركزية وعروض المتاجر المعتمدة', 'Platform-Wide & Merchant Coupons')}
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              {t(
                'إصدار كوبونات خصم شاملة لجميع أقسام المنصة أو مخصصة لمتجر محدد، ضبط الحد الأدنى للطلب وسقف الخصم، ومراقبة الاستخدام الفعلي.',
                'Create sitewide or boutique-scoped discount codes, configure minimum order thresholds and discount caps, and monitor redemption counts.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCouponEditor()}
            className="px-4 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30] flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t('إصدار كوبون خصم جديد', 'Create New Coupon')}</span>
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('إجمالي الكوبونات', 'Total Coupons')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#141413] mt-1">
              {coupons.length}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('كوبونات نشطة حالياً', 'Active Campaigns')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
              {activeCount}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('كوبونات شاملة للمنصة', 'Platform-Wide Codes')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#0B4F3F] mt-1">
              {coupons.filter((c) => !c.sellerId || c.sellerId === 'all').length}
            </div>
          </div>
          <div className="bg-[#141413] text-white rounded-2xl border border-[#C59B27]/30 p-4">
            <div className="text-xs text-[#D6D0C4]">{t('إجمالي مرات الاستخدام', 'Total Redemptions')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#C59B27] mt-1">
              {totalRedemptions.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex items-center gap-2">
          {(
            [
              { id: 'all', labelAr: 'جميع الكوبونات', labelEn: 'All Coupons' },
              { id: 'platform', labelAr: 'كوبونات المنصة الشاملة', labelEn: 'Platform-Wide' },
              { id: 'seller', labelAr: 'كوبونات المتاجر الخاصة', labelEn: 'Seller-Scoped' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCouponScopeFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                couponScopeFilter === tab.id
                  ? 'bg-[#0B4F3F] text-white'
                  : 'text-[#57534E] hover:text-[#141413]'
              }`}
            >
              {t(tab.labelAr, tab.labelEn)}
            </button>
          ))}
        </div>

        {/* Coupons Table */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#FAF8F5] border-b border-[#E6E0D6] text-[#57534E]">
                <tr>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('كود الخصم والحملة', 'Code & Campaign')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('النطاق والمتجر', 'Scope')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('قيمة الخصم والشرط', 'Discount & Min Order')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('الاستخدام والصلاحية', 'Usage & Expiry')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('الحالة', 'Status')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('الإجراءات', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFEA]">
                {filteredCoupons.map((cpn) => (
                  <tr key={cpn.id} className="hover:bg-[#FAF8F5]/70 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-sm text-[#0B4F3F]">{cpn.code}</div>
                      <div className="text-[#57534E] mt-0.5">
                        {lang === 'ar' ? cpn.titleAr : cpn.titleEn}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-semibold text-[#141413]">
                        {!cpn.sellerId || cpn.sellerId === 'all'
                          ? t('شامل لجميع متاجر أثيل', 'Sitewide (All Boutiques)')
                          : cpn.sellerNameAr || cpn.sellerId}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-end font-mono tabular-nums">
                      <div className="font-bold text-[#141413]">
                        {cpn.type === 'percentage' ? `${cpn.value}%` : formatPrice(cpn.value)}
                      </div>
                      <div className="text-[11px] text-[#8C857B]">
                        {t('حد أدنى:', 'Min:')} {formatPrice(cpn.minOrderAmount)}
                        {cpn.maxDiscount ? ` · ${t('سقف:', 'Cap:')} ${formatPrice(cpn.maxDiscount)}` : ''}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-end font-mono tabular-nums">
                      <div className="font-bold text-[#141413]">
                        {cpn.usedCount} / {cpn.maxUses}
                      </div>
                      <div className="text-[11px] text-[#8C857B]">
                        {t('ينتهي:', 'Exp:')} {cpn.expiresAt}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`font-bold ${
                          cpn.isActive ? 'text-[#1B6B45]' : 'text-[#8C857B]'
                        }`}
                      >
                        {cpn.isActive ? t('نشط', 'Active') : t('متوقف', 'Paused')}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleCouponStatus(cpn.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[11px] font-bold text-[#141413]"
                        >
                          {cpn.isActive ? t('إيقاف', 'Pause') : t('تفعيل', 'Activate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => openCouponEditor(cpn)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[11px] font-bold text-[#141413]"
                        >
                          {t('تعديل', 'Edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCoupon(cpn.id)}
                          className="p-1.5 rounded-lg text-[#9E2A2B] hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Coupon Modal */}
        {showCouponModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveCoupon}
              className="bg-white rounded-2xl border border-[#E6E0D6] max-w-xl w-full p-6 space-y-4 shadow-2xl text-xs"
            >
              <div className="flex items-center justify-between border-b border-[#E6E0D6] pb-3">
                <h3 className="text-base font-bold text-[#141413]">
                  {editingCoupon
                    ? t('تعديل كوبون الخصم', 'Edit Discount Coupon')
                    : t('إصدار كوبون خصم جديد', 'Create New Discount Coupon')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="p-1.5 text-[#8C857B] hover:text-[#141413]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('رمز الكوبون (Code)', 'Coupon Code')}
                  </label>
                  <input
                    type="text"
                    required
                    value={cpnCode}
                    onChange={(e) => setCpnCode(e.target.value.toUpperCase())}
                    placeholder="ATHEELVIP25"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold uppercase text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('نطاق تطبيق الكوبون', 'Coupon Scope')}
                  </label>
                  <select
                    value={cpnSellerId}
                    onChange={(e) => setCpnSellerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-semibold text-[#141413]"
                  >
                    <option value="all">{t('شامل لجميع متاجر المنصة', 'Platform-Wide (All Sellers)')}</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {lang === 'ar' ? s.nameAr : s.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('عنوان الحملة (عربي)', 'Title (Arabic)')}
                  </label>
                  <input
                    type="text"
                    required
                    value={cpnTitleAr}
                    onChange={(e) => setCpnTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('عنوان الحملة (إنجليزي)', 'Title (English)')}
                  </label>
                  <input
                    type="text"
                    required
                    value={cpnTitleEn}
                    onChange={(e) => setCpnTitleEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('نوع الخصم', 'Discount Type')}
                  </label>
                  <select
                    value={cpnType}
                    onChange={(e) => setCpnType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-semibold text-[#141413]"
                  >
                    <option value="percentage">{t('نسبة مئوية (%)', 'Percentage (%)')}</option>
                    <option value="fixed">{t('مبلغ ثابت (ر.س)', 'Fixed Amount (SAR)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('قيمة الخصم', 'Discount Value')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cpnValue}
                    onChange={(e) => setCpnValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('الحد الأدنى للطلب (ر.س)', 'Min Order Amount (SAR)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cpnMinOrder}
                    onChange={(e) => setCpnMinOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('الحد الأقصى للخصم (ر.س)', 'Max Discount Cap (SAR)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cpnMaxDiscount}
                    onChange={(e) => setCpnMaxDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('الحد الأقصى لمرات الاستخدام', 'Max Total Uses')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cpnMaxUses}
                    onChange={(e) => setCpnMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1">
                    {t('تاريخ الانتهاء', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    value={cpnExpiresAt}
                    onChange={(e) => setCpnExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono text-[#141413]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E0D6]">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-bold text-[#141413]"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B4F3F] text-white font-bold hover:bg-[#083D30]"
                >
                  {t('حفظ الكوبون', 'Save Coupon')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: SUPPORT TICKETS & CONCIERGE DESK
  // ============================================================================
  if (effectiveSection === 'tickets') {
    const openCount = tickets.filter((tkt) => tkt.status === 'open').length;
    const inProgCount = tickets.filter((tkt) => tkt.status === 'in_progress').length;
    const resolvedCount = tickets.filter((tkt) => tkt.status === 'resolved').length;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6">
          <div className="text-xs font-semibold text-[#0B4F3F]">
            {t('مكتب العناية بكبار العملاء وتسويات التجار', 'VIP Concierge & Merchant Escalations Desk')}
          </div>
          <h2 className="text-xl font-bold text-[#141413] mt-1">
            {t('إدارة تذاكر الدعم الفني وطلبات التسوية البنكية', 'Support Tickets & Treasury Requests')}
          </h2>
          <p className="text-xs text-[#57534E] mt-1">
            {t(
              'معالجة استفسارات العملاء، طلبات تحويل أرباح المتاجر عبر نظام سار (مع إخفاء آيبان تلقائي)، وتقارير فحص المرتجعات.',
              'Resolve VIP customer inquiries, merchant SARIE payout tickets (with masked IBAN protection), and return inspection escalations.'
            )}
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('إجمالي التذاكر', 'Total Tickets')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#141413] mt-1">
              {tickets.length}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('مفتوحة (بانتظار الرد)', 'Open Tickets')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#9E2A2B] mt-1">
              {openCount}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('قيد المعالجة', 'In Progress')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#B7791F] mt-1">
              {inProgCount}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('تم الحل والإغلاق', 'Resolved')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
              {resolvedCount}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6E0D6]">
              {(
                [
                  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                  { id: 'open', labelAr: 'مفتوحة', labelEn: 'Open' },
                  { id: 'in_progress', labelAr: 'قيد المعالجة', labelEn: 'In Progress' },
                  { id: 'resolved', labelAr: 'محلولة', labelEn: 'Resolved' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTicketStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    ticketStatusFilter === tab.id
                      ? 'bg-[#0B4F3F] text-white'
                      : 'text-[#57534E] hover:text-[#141413]'
                  }`}
                >
                  {t(tab.labelAr, tab.labelEn)}
                </button>
              ))}
            </div>

            <select
              value={ticketWorkflowFilter}
              onChange={(e) =>
                setTicketWorkflowFilter(
                  e.target.value as
                    | 'all'
                    | 'support'
                    | 'payout'
                    | 'return_inspection'
                    | 'seller_application_info'
                )
              }
              aria-label={t('تصفية حسب نوع سير العمل', 'Filter by Workflow Type')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع المسارات (Workflows)', 'All Workflows')}</option>
              <option value="support">{t('دعم العملاء (support)', 'Customer Support')}</option>
              <option value="payout">{t('تسويات الخزينة (payout)', 'Treasury Payouts')}</option>
              <option value="return_inspection">
                {t('فحص المرتجعات (return_inspection)', 'Return Inspections')}
              </option>
              <option value="seller_application_info">
                {t('استكمال بيانات متجر (seller_application_info)', 'Seller App Info')}
              </option>
            </select>
          </div>

          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
              placeholder={t(
                'بحث برقم التذكرة، الموضوع، مقدم الطلب، أو رقم الطلب...',
                'Search by ticket #, subject, sender, or order #...'
              )}
              className="w-full ps-10 pe-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413]"
            />
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {filteredTickets.map((tkt) => {
            const replyDraft = ticketReplies[tkt.id] ?? tkt.replyAr ?? '';
            const wf = tkt.workflowType || 'support';
            const isPayout = wf === 'payout' || Boolean(tkt.payoutAmount);
            const currentTreasury = tkt.treasuryStatus || 'requested';
            const selectedTreasury = treasuryDrafts[tkt.id] || currentTreasury;
            const relatedSeller = tkt.sellerId
              ? sellers.find((s) => s.id === tkt.sellerId)
              : undefined;

            return (
              <div
                key={tkt.id}
                className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F3EFEA] pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[#0B4F3F]">
                        #{tkt.ticketNumber}
                      </span>
                      <span>·</span>
                      <span className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] font-mono text-[11px] font-bold text-[#141413]">
                        {wf}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-[#57534E]">
                        {lang === 'ar' ? tkt.categoryAr : tkt.categoryEn}
                      </span>
                      {(tkt.orderNumber || tkt.relatedOrderId) && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[#141413]">
                            {t('الطلب:', 'Order:')} #{tkt.orderNumber || tkt.relatedOrderId}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-[#141413] mt-1">{tkt.subject}</h3>
                    <div className="text-[11px] text-[#8C857B] mt-0.5">
                      {tkt.userName} ({tkt.userEmail}) · {tkt.createdAt}
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      tkt.status === 'resolved'
                        ? 'text-[#1B6B45]'
                        : tkt.status === 'in_progress'
                        ? 'text-[#B7791F]'
                        : 'text-[#9E2A2B]'
                    }`}
                  >
                    {tkt.status === 'resolved'
                      ? t('محلولة', 'Resolved')
                      : tkt.status === 'in_progress'
                      ? t('قيد المعالجة', 'In Progress')
                      : t('مفتوحة', 'Open')}
                  </span>
                </div>

                {/* Structured Payout Treasury Panel */}
                {isPayout && (
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#C59B27]/40 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-[#141413]">
                          {t(
                            'طلب تسوية خزينة مهيكل (Structured Merchant Payout Request)',
                            'Structured Merchant Payout Request'
                          )}
                        </div>
                        <div className="text-[11px] text-[#57534E] mt-0.5">
                          {t('المتجر:', 'Boutique:')}{' '}
                          <span className="font-bold text-[#0B4F3F]">
                            {relatedSeller
                              ? lang === 'ar'
                                ? relatedSeller.nameAr
                                : relatedSeller.nameEn
                              : tkt.sellerId || tkt.userName}
                          </span>{' '}
                          · {t('حساب الآيبان المحمي:', 'Masked IBAN:')}{' '}
                          <span className="font-mono font-bold text-[#141413]">
                            SA•• •••• •••• •••• •••• {tkt.ibanLast4 || '****'}
                          </span>
                        </div>
                      </div>

                      <div className="text-end">
                        <div className="text-sm font-bold font-mono text-[#0B4F3F]">
                          {formatPrice(tkt.payoutAmount || 0)}
                        </div>
                        <div className="text-[11px] font-bold text-[#B7791F]">
                          {t('حالة الخزينة:', 'Treasury Status:')} {currentTreasury}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6E0D6]">
                      <span className="text-[11px] text-[#8C857B]">
                        {t(
                          'ملاحظة رقابية: تحديث حالة الخزينة يوثّق مسار المراجعة الداخلية فقط ولا ينفذ تحويلاً بنكياً خارجياً تلقائياً.',
                          'Audit Notice: Updating treasuryStatus records internal review state only and does not execute an external bank transfer.'
                        )}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedTreasury}
                          onChange={(e) =>
                            setTreasuryDrafts((prev) => ({
                              ...prev,
                              [tkt.id]: e.target.value as NonNullable<
                                SupportTicket['treasuryStatus']
                              >,
                            }))
                          }
                          className="px-3 py-1.5 rounded-lg bg-white border border-[#E6E0D6] text-xs font-bold text-[#141413]"
                        >
                          <option value="requested">
                            {t('جديد (requested)', 'Requested (requested)')}
                          </option>
                          <option value="under_review">
                            {t('قيد مراجعة الخزينة (under_review)', 'Under Review (under_review)')}
                          </option>
                          <option value="approved_for_treasury">
                            {t(
                              'معتمد للصرف البنكي (approved_for_treasury)',
                              'Approved for Treasury (approved_for_treasury)'
                            )}
                          </option>
                          <option value="completed">
                            {t('مكتمل الدفترياً (completed)', 'Completed in Ledger (completed)')}
                          </option>
                          <option value="rejected">
                            {t('مرفوض (rejected)', 'Rejected (rejected)')}
                          </option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            updatePayoutTreasuryStatus(tkt.id, selectedTreasury, replyDraft)
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-[#141413] text-[#C59B27] text-xs font-bold hover:bg-black whitespace-nowrap"
                        >
                          {t('تحديث حالة الخزينة', 'Update Treasury Status')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413] leading-relaxed">
                  {maskIbanInText(tkt.message)}
                </div>

                {tkt.replyAr && (
                  <div className="p-3.5 rounded-xl bg-[#EBF3F0]/60 border border-[#0B4F3F]/20 text-xs">
                    <div className="font-bold text-[#0B4F3F] mb-1">
                      {t('الرد الرسمي المسجل من إدارة أثيل:', 'Official Atheel Concierge Reply:')}
                    </div>
                    <p className="text-[#141413]">{tkt.replyAr}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <input
                    type="text"
                    value={replyDraft}
                    onChange={(e) =>
                      setTicketReplies((prev) => ({ ...prev, [tkt.id]: e.target.value }))
                    }
                    placeholder={t(
                      'اكتب رد الإدارة التنفيذية أو ملاحظة الخزينة...',
                      'Write official concierge response or treasury note...'
                    )}
                    className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413]"
                  />

                  <button
                    type="button"
                    onClick={() => replyToSupportTicket(tkt.id, replyDraft, 'in_progress')}
                    className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-xs font-bold text-[#141413] whitespace-nowrap"
                  >
                    {t('قيد المعالجة', 'Mark In Progress')}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      replyToSupportTicket(
                        tkt.id,
                        replyDraft.trim() ||
                          t(
                            'تمت معالجة طلبكم بنجاح من قِبل فريق العناية التنفيذي في أثيل.',
                            'Your request has been resolved by Atheel Executive Concierge.'
                          ),
                        'resolved'
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30] whitespace-nowrap"
                  >
                    {t('إرسال الرد وإغلاق التذكرة', 'Send Reply & Resolve')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: REVIEWS & QUESTIONS MODERATION
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#0B4F3F]">
            {t('رقابة المحتوى وثقة المتسوقين', 'Trust, Reviews & Q&A Moderation')}
          </div>
          <h2 className="text-xl font-bold text-[#141413] mt-1">
            {t('مراجعة تقييمات المشترين والرد على استفسارات المنتجات', 'Customer Reviews & Product Questions Desk')}
          </h2>
          <p className="text-xs text-[#57534E] mt-1">
            {t(
              'التحقق من شارات الشراء الموثق، اعتماد أو إخفاء التقييمات، والإجابة على استفسارات العملاء الفنية.',
              'Verify purchase badges, approve or hide customer reviews, and answer product inquiries.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6E0D6]">
          <button
            type="button"
            onClick={() => setModTab('reviews')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              modTab === 'reviews' ? 'bg-[#0B4F3F] text-white' : 'text-[#57534E]'
            }`}
          >
            {t('تقييمات العملاء', 'Customer Reviews')} ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setModTab('questions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              modTab === 'questions' ? 'bg-[#0B4F3F] text-white' : 'text-[#57534E]'
            }`}
          >
            {t('أسئلة المنتجات', 'Product Q&A')} ({questions.length})
          </button>
        </div>
      </div>

      {modTab === 'reviews' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex items-center gap-2">
            {(
              [
                { id: 'all', labelAr: 'جميع التقييمات', labelEn: 'All Reviews' },
                { id: 'approved', labelAr: 'معتمدة', labelEn: 'Approved' },
                { id: 'pending', labelAr: 'بانتظار المراجعة', labelEn: 'Pending' },
                { id: 'hidden', labelAr: 'مخفية', labelEn: 'Hidden' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setReviewFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  reviewFilter === f.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(f.labelAr, f.labelEn)}
              </button>
            ))}
          </div>

          {filteredReviews.map((rev) => {
            const prod = products.find((p) => p.id === rev.productId);
            const replyDraft = reviewReplyDrafts[rev.id] ?? rev.sellerReplyAr ?? '';
            return (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F3EFEA] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#141413]">{rev.userName}</span>
                      <span className="font-mono text-[#C59B27] font-bold">★ {rev.rating}/5</span>
                      {rev.verifiedPurchase && (
                        <span className="text-[#1B6B45] font-semibold">
                          · {t('شراء موثق', 'Verified Purchase')}
                        </span>
                      )}
                    </div>
                    <div className="text-[#57534E] mt-0.5">
                      {lang === 'ar'
                        ? rev.productTitleAr || prod?.titleAr
                        : rev.productTitleEn || prod?.titleEn}{' '}
                      · <span className="font-mono">{rev.createdAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {rev.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => moderateReviewStatus(rev.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-[#1B6B45] text-white font-bold"
                      >
                        {t('اعتماد النشر', 'Approve')}
                      </button>
                    )}
                    {rev.status !== 'hidden' && (
                      <button
                        type="button"
                        onClick={() => moderateReviewStatus(rev.id, 'hidden')}
                        className="px-3 py-1.5 rounded-lg border border-[#E6E0D6] text-[#57534E] hover:text-[#141413] font-bold"
                      >
                        {t('إخفاء', 'Hide')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteReviewAdmin(rev.id)}
                      className="p-1.5 rounded-lg text-[#9E2A2B] hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-[#141413]">{rev.title}</div>
                  <p className="text-[#57534E] mt-1 leading-relaxed">{rev.comment}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={replyDraft}
                    onChange={(e) =>
                      setReviewReplyDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))
                    }
                    placeholder={t(
                      'إضافة أو تحديث رد رسمي على التقييم...',
                      'Post or update official reply to review...'
                    )}
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-[#141413]"
                  />
                  <button
                    type="button"
                    onClick={() => replyToReview(rev.id, replyDraft)}
                    className="px-4 py-2 rounded-xl bg-[#0B4F3F] text-white font-bold"
                  >
                    {t('نشر الرد', 'Publish Reply')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex items-center gap-2">
            {(
              [
                { id: 'all', labelAr: 'جميع الأسئلة', labelEn: 'All Questions' },
                { id: 'unanswered', labelAr: 'بانتظار الإجابة', labelEn: 'Unanswered' },
                { id: 'answered', labelAr: 'تمت الإجابة عليها', labelEn: 'Answered' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuestionFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  questionFilter === f.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(f.labelAr, f.labelEn)}
              </button>
            ))}
          </div>

          {filteredQuestions.map((qa) => {
            const prod = products.find((p) => p.id === qa.productId);
            const ansDraft = questionAnswerDrafts[qa.id] ?? qa.answerAr ?? '';
            return (
              <div
                key={qa.id}
                className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-[#141413]">
                      {lang === 'ar' ? qa.questionAr : qa.questionEn}
                    </div>
                    <div className="text-[#57534E] mt-0.5">
                      {qa.userName} ·{' '}
                      {lang === 'ar' ? prod?.titleAr || qa.productId : prod?.titleEn || qa.productId}{' '}
                      · <span className="font-mono">{qa.createdAt}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteQuestionAdmin(qa.id)}
                    className="p-1.5 rounded-lg text-[#9E2A2B] hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {qa.answerAr && (
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-[#57534E]">
                    <span className="font-bold text-[#0B4F3F]">
                      {lang === 'ar' ? qa.answeredByAr : qa.answeredByEn}:
                    </span>{' '}
                    {lang === 'ar' ? qa.answerAr : qa.answerEn}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={ansDraft}
                    onChange={(e) =>
                      setQuestionAnswerDrafts((prev) => ({ ...prev, [qa.id]: e.target.value }))
                    }
                    placeholder={t(
                      'كتابة إجابة معتمدة من إدارة أثيل أو المتجر...',
                      'Write official answer...'
                    )}
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-[#141413]"
                  />
                  <button
                    type="button"
                    onClick={() => answerProductQuestion(qa.id, ansDraft)}
                    className="px-4 py-2 rounded-xl bg-[#0B4F3F] text-white font-bold"
                  >
                    {t('حفظ الإجابة', 'Publish Answer')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
