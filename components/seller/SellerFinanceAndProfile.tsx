'use client';

import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Building2,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Store,
  Settings,
  Bell,
  Truck,
  FileText,
  Lock,
  Sparkles,
  Download,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  Order,
  Seller,
  SupportTicket,
  calculateSellerPayoutReservation,
} from '@/lib/types';
import { maskIban, maskIbanInText } from '@/lib/utils';

interface SellerFinanceAndProfileProps {
  seller: Seller;
  sellerOrders: Order[];
  mode: 'finance' | 'payouts' | 'profile' | 'settings';
}

export default function SellerFinanceAndProfile({
  seller,
  sellerOrders,
  mode,
}: SellerFinanceAndProfileProps) {
  const {
    lang,
    t,
    formatPrice,
    categories,
    tickets,
    updateSellerProfile,
    requestSellerPayout,
    showToast,
  } = useMarketplace();

  // ============================================================================
  // 1. PAYOUT RESERVATION & REQUEST STATE
  // ============================================================================
  // Calculates:
  // - availableBalance (from seller.availableBalance)
  // - reservedPendingPayoutAmount (sum of payout tickets with workflowType === 'payout'
  //   and treasuryStatus in ['requested', 'under_review', 'approved_for_treasury'])
  // - requestableBalance = seller.availableBalance - reservedPendingPayoutAmount
  const payoutReservation = useMemo(
    () => calculateSellerPayoutReservation(seller, tickets),
    [seller, tickets]
  );
  const { availableBalance, reservedPendingPayoutAmount, requestableBalance } =
    payoutReservation;

  const [payoutAmount, setPayoutAmount] = useState<number>(() =>
    calculateSellerPayoutReservation(seller, tickets).requestableBalance
  );

  // ============================================================================
  // 2. STORE PROFILE EDITOR STATE (SAFE WHITELISTED FIELDS ONLY)
  // ============================================================================
  const [nameAr, setNameAr] = useState(seller.nameAr);
  const [nameEn, setNameEn] = useState(seller.nameEn);
  const [descAr, setDescAr] = useState(seller.descriptionAr);
  const [descEn, setDescEn] = useState(seller.descriptionEn);
  const [cityAr, setCityAr] = useState(seller.cityAr);
  const [cityEn, setCityEn] = useState(seller.cityEn);
  const [ownerName, setOwnerName] = useState(seller.ownerName);
  const [email, setEmail] = useState(seller.email);
  const [phone, setPhone] = useState(seller.phone);
  const [iban, setIban] = useState(seller.iban);
  const [crNumber, setCrNumber] = useState(seller.crNumber);
  const [vatNumber, setVatNumber] = useState(seller.vatNumber);
  const [selectedCats, setSelectedCats] = useState<string[]>(seller.categories || []);

  // ============================================================================
  // 3. OPERATIONAL SETTINGS STATE (PERSISTED ON SELLER DOCUMENT)
  // ============================================================================
  const [defaultCarrier, setDefaultCarrier] = useState(
    seller.operationalSettings?.defaultCarrier || 'SPL Express VIP'
  );
  const [sameDayCutoff, setSameDayCutoff] = useState(
    seller.operationalSettings?.sameDayCutoff || '16:00'
  );
  const [luxuryPackagingEnabled, setLuxuryPackagingEnabled] = useState(
    seller.operationalSettings?.luxuryPackagingEnabled ?? true
  );
  const [coldChainEnabled, setColdChainEnabled] = useState(
    seller.operationalSettings?.coldChainEnabled ?? true
  );
  const [autoZatcaInvoice, setAutoZatcaInvoice] = useState(
    seller.operationalSettings?.autoZatcaInvoice ?? true
  );
  const [whatsappOrderAlerts, setWhatsappOrderAlerts] = useState(
    seller.operationalSettings?.whatsappOrderAlerts ?? true
  );
  const [lowStockEmailAlerts, setLowStockEmailAlerts] = useState(
    seller.operationalSettings?.lowStockEmailAlerts ?? true
  );

  // Order-by-order financial ledger
  const orderLedger = useMemo(() => {
    return sellerOrders.map((order) => {
      const sellerItems = order.items.filter((i) => i.sellerId === seller.id);
      const itemsToUse = sellerItems.length > 0 ? sellerItems : order.items;
      const gross = itemsToUse.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const vatPortion = Number(((gross * 15) / 115).toFixed(2));
      const commission = Number(((gross * seller.commissionRate) / 100).toFixed(2));
      const net = Number((gross - commission).toFixed(2));
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt.split('T')[0],
        customerName: order.customerName,
        status: order.status,
        paymentMethod: order.paymentMethod,
        gross,
        vatPortion,
        commission,
        net,
      };
    });
  }, [sellerOrders, seller.id, seller.commissionRate]);

  const exportLedgerCsv = () => {
    const headers = [
      'Order Number',
      'Date',
      'Customer',
      'Status',
      'Payment Method',
      'Gross Sales (SAR)',
      'Included 15% VAT (SAR)',
      `Platform Commission ${seller.commissionRate}% (SAR)`,
      'Net Merchant Credit (SAR)',
    ];
    const rows = orderLedger.map((r) => [
      r.orderNumber,
      r.date,
      `"${r.customerName}"`,
      r.status,
      r.paymentMethod,
      r.gross,
      r.vatPortion,
      r.commission,
      r.net,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atheel-ledger-${seller.id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      lang === 'ar'
        ? 'تم تصدير كشف الحساب المالي والضريبي (CSV)'
        : 'Financial & VAT Statement Exported (CSV)',
      undefined,
      'success'
    );
  };

  // ============================================================================
  // RENDER: FINANCE & LEDGER
  // ============================================================================
  if (mode === 'finance') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold">
              {t('الإدارة المالية ودفتر الأستاذ الضريبي', 'Financial Ledger & VAT Accounting')}
            </span>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t('الملخص المالي الموثق وكشف تسويات الطلبات', 'Verified Financial Summary & Order Ledger')}
            </h2>
            <p className="text-xs text-[#57534E] mt-0.5">
              {t(
                'جميع المبالغ شاملة ضريبة القيمة المضافة ١٥٪. الحقول المالية المعتمدة محمية أمنياً وتُحدّث آلياً عبر نظام التسويات.',
                'All figures include 15% Saudi VAT. Authoritative financial balances are security-locked by Firestore rules.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={exportLedgerCsv}
            className="px-4 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#C59B27]" />
            <span>{t('تصدير كشف الحساب الضريبي (CSV)', 'Export VAT Ledger (CSV)')}</span>
          </button>
        </div>

        {/* Authoritative Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5">
            <span className="text-xs text-[#8C857B] block">
              {t('إجمالي المبيعات (Gross Sales)', 'Gross Sales')}
            </span>
            <div className="text-xl font-bold font-mono text-[#141413] mt-1.5">
              {formatPrice(seller.grossSales)}
            </div>
            <div className="text-[10px] text-[#57534E] mt-1">
              {t('شامل ضريبة القيمة المضافة ١٥٪', 'Incl. 15% Saudi VAT')}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5">
            <span className="text-xs text-[#8C857B] block">
              {t(`عمولة المنصة (${seller.commissionRate}%)`, `Platform Commission (${seller.commissionRate}%)`)}
            </span>
            <div className="text-xl font-bold font-mono text-[#C87D12] mt-1.5">
              -{formatPrice(seller.platformCommission)}
            </div>
            <div className="text-[10px] text-[#8C857B] mt-1">
              {t('نسبة العمولة التعاقدية للمتجر', 'Contracted boutique tier')}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5">
            <span className="text-xs text-[#8C857B] block">
              {t('إجمالي المرتجعات المستردة', 'Total Refunds Deducted')}
            </span>
            <div className="text-xl font-bold font-mono text-[#9E2A2B] mt-1.5">
              -{formatPrice(seller.refundsTotal)}
            </div>
            <div className="text-[10px] text-[#8C857B] mt-1">
              {t('تسويات ما بعد البيع المعتمدة', 'Approved return settlements')}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5">
            <span className="text-xs text-[#8C857B] block">
              {t('صافي الأرباح (Net Earnings)', 'Net Merchant Earnings')}
            </span>
            <div className="text-xl font-bold font-mono text-[#1E6B47] mt-1.5">
              {formatPrice(seller.netEarnings)}
            </div>
            <div className="text-[10px] text-[#1E6B47] font-semibold mt-1">
              {t('بعد خصم العمولة والمرتجعات', 'After commission & refunds')}
            </div>
          </div>

          <div className="bg-[#0B4F3F] text-white rounded-2xl p-5">
            <span className="text-xs text-[#F5E6C8] block">
              {t('الرصيد المتاح للتحويل الفوري', 'Available Payout Balance')}
            </span>
            <div className="text-xl font-bold font-mono text-white mt-1.5">
              {formatPrice(seller.availableBalance)}
            </div>
            <div className="text-[10px] text-[#C59B27] font-mono mt-1">
              {t('التحويل القادم:', 'Next Payout:')} {seller.nextPayoutDate}
            </div>
          </div>
        </div>

        {/* Order-by-Order Settlement Table */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden">
          <div className="p-5 border-b border-[#E6E0D6] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#141413]">
              {t('سجل التسويات المالية التفصيلي للطلبات', 'Order-by-Order Financial Settlement Ledger')}
            </h3>
            <span className="text-xs font-mono text-[#8C857B]">
              VAT ID: {seller.vatNumber}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6] uppercase">
                <tr>
                  <th className="py-3.5 px-4 text-start">{t('رقم الطلب', 'Order #')}</th>
                  <th className="py-3.5 px-4 text-start">{t('التاريخ', 'Date')}</th>
                  <th className="py-3.5 px-4 text-start">{t('العميل والدفع', 'Customer & Payment')}</th>
                  <th className="py-3.5 px-4 text-start">{t('إجمالي حصة المتجر', 'Store Gross')}</th>
                  <th className="py-3.5 px-4 text-start">{t('ضريبة ١٥٪ المتضمنة', 'Incl. 15% VAT')}</th>
                  <th className="py-3.5 px-4 text-start">
                    {t(`عمولة أثيل (${seller.commissionRate}%)`, `Commission (${seller.commissionRate}%)`)}
                  </th>
                  <th className="py-3.5 px-4 text-end">{t('صافي استحقاق التاجر', 'Net Credit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFEA]">
                {orderLedger.map((row) => (
                  <tr key={row.orderId} className="hover:bg-[#FAF8F5]/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                      #{row.orderNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#57534E]">{row.date}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#141413]">{row.customerName}</div>
                      <div className="text-[10px] font-mono uppercase text-[#8C857B]">
                        {row.paymentMethod} · {row.status}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                      {formatPrice(row.gross)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#57534E]">
                      {formatPrice(row.vatPortion)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#C87D12]">
                      -{formatPrice(row.commission)}
                    </td>
                    <td className="py-3.5 px-4 text-end font-mono font-bold text-[#1E6B47]">
                      {formatPrice(row.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: PAYOUTS & SARIE BANK SETTLEMENTS
  // ============================================================================
  if (mode === 'payouts') {
    const sellerPayoutTickets = tickets.filter(
      (tkt) =>
        tkt.workflowType === 'payout' && tkt.sellerId === seller.id
    );

    const getTreasuryBadgeLabel = (status?: SupportTicket['treasuryStatus']) => {
      switch (status) {
        case 'under_review':
          return t('قيد المراجعة المالية (under_review)', 'Under Financial Review');
        case 'approved_for_treasury':
          return t(
            'معتمد للرفع للخزينة — بانتظار التسوية البنكية الخارجية',
            'Approved for Treasury — Awaiting External Bank Settlement'
          );
        case 'completed':
          return t('مكتمل دفترياً (completed)', 'Completed in Ledger');
        case 'rejected':
          return t('مرفوض — تم تحرير الحجز (rejected)', 'Rejected — Reservation Released');
        case 'requested':
        default:
          return t('طلب مسجل بانتظار المراجعة (requested)', 'Requested — Awaiting Audit');
      }
    };

    const isAmountOverRequestable = payoutAmount > requestableBalance;
    const isPayoutDisabled = payoutAmount <= 0 || payoutAmount > requestableBalance;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Payout Console */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40 text-[11px] font-bold">
                  {t('مسار تسويات الخزينة المهيكل', 'Structured Treasury Payout Workflow')}
                </span>
                <h2 className="text-lg font-bold text-[#141413] mt-1">
                  {t('طلب مراجعة وتسوية الأرباح للخزينة', 'Request Merchant Treasury Payout')}
                </h2>
              </div>
              <Wallet className="w-8 h-8 text-[#0B4F3F]" />
            </div>

            {/* Available Balance, Pending Reserved Payouts, and Currently Requestable Balance */}
            <div className="p-4 rounded-xl bg-[#0B4F3F] text-white space-y-3">
              <div className="flex items-baseline justify-between border-b border-white/15 pb-2.5">
                <div>
                  <span className="text-xs text-[#F5E6C8] block">
                    {t(
                      'الرصيد القابل للطلب حالياً (Currently Requestable Balance)',
                      'Currently Requestable Balance'
                    )}
                  </span>
                  <div className="text-2xl font-bold font-mono text-white mt-0.5">
                    {formatPrice(requestableBalance)}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[#C59B27] text-[10px] font-mono font-bold">
                  {t('الحد الأقصى للطلب', 'MAX REQUESTABLE')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-white/10">
                  <span className="text-[11px] text-[#D6D0C4] block">
                    {t('الرصيد المتاح (Available Balance)', 'Available Balance')}
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatPrice(availableBalance)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/10">
                  <span className="text-[11px] text-[#F5E6C8] block">
                    {t(
                      'طلبات محجوزة قيد المراجعة (Pending Reserved)',
                      'Pending Reserved Payouts'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#C59B27] text-sm">
                    {formatPrice(reservedPendingPayoutAmount)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-[#C59B27] font-mono">
                {t('موعد دورة التسوية القادمة:', 'Next Scheduled Settlement Cycle:')}{' '}
                {seller.nextPayoutDate}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1 text-xs">
              <div className="text-[#8C857B]">
                {t(
                  'الحساب البنكي المعتمد (يُحفظ آخر ٤ أرقام فقط في التذكرة):',
                  'Verified Saudi IBAN (only last 4 digits stored in ticket):'
                )}
              </div>
              <div className="font-bold text-[#141413]">{seller.ownerName}</div>
              <div className="font-mono font-bold text-[#0B4F3F]" dir="ltr">
                {maskIban(seller.iban)}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#141413]">
                    {t('مبلغ التسوية المطلوب (ر.س)', 'Requested Payout Amount (SAR)')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayoutAmount(requestableBalance)}
                    className="text-[11px] font-bold text-[#0B4F3F] hover:underline"
                  >
                    {t(
                      `اختيار كامل الرصيد القابل للطلب (${formatPrice(requestableBalance)})`,
                      `Select Max Requestable (${formatPrice(requestableBalance)})`
                    )}
                  </button>
                </div>
                <input
                  type="number"
                  min={requestableBalance > 0 ? 1 : 0}
                  max={requestableBalance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Math.max(0, Number(e.target.value) || 0))}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border text-sm font-mono font-bold ${
                    isAmountOverRequestable
                      ? 'border-[#9E2A2B] text-[#9E2A2B]'
                      : 'border-[#E6E0D6] text-[#0B4F3F]'
                  }`}
                />
                {isAmountOverRequestable && (
                  <p className="text-[11px] font-semibold text-[#9E2A2B] mt-1">
                    {t(
                      `المبلغ المطلوب (${formatPrice(payoutAmount)}) يتجاوز الرصيد القابل للطلب حالياً (${formatPrice(
                        requestableBalance
                      )}) بعد خصم الطلبات المحجوزة قيد المعالجة (${formatPrice(
                        reservedPendingPayoutAmount
                      )}).`,
                      `Requested amount (${formatPrice(payoutAmount)}) exceeds currently requestable balance (${formatPrice(
                        requestableBalance
                      )}) after pending reserved payouts (${formatPrice(
                        reservedPendingPayoutAmount
                      )}).`
                    )}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={isPayoutDisabled}
                onClick={async () => {
                  const requested = payoutAmount;
                  await requestSellerPayout(seller.id, requested);
                  if (requested > 0 && requested <= requestableBalance) {
                    const nextRemaining = Math.max(
                      0,
                      Number((requestableBalance - requested).toFixed(2))
                    );
                    setPayoutAmount(nextRemaining);
                  }
                }}
                className="w-full py-3 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-40 text-white text-xs font-bold shadow-xs"
              >
                {t(
                  `رفع طلب تسوية خزينة (${formatPrice(payoutAmount)})`,
                  `Submit Treasury Payout Request (${formatPrice(payoutAmount)})`
                )}
              </button>

              <div className="p-3 rounded-xl bg-[#EBF3F0]/60 border border-[#0B4F3F]/20 flex items-start gap-2 text-[11px] text-[#0B4F3F]">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {t(
                    'ضمان أمان الخزينة: تحجز طلبات التسوية النشطة (requested / under_review / approved_for_treasury) قيمتها من الرصيد القابل للطلب لمنع ازدواج الصرف، بينما يُحرَّر الحجز تلقائياً عند رفض الطلب. ملاحظة معمارية: الحجز الذري الكامل المقاوم للتلاعب في بيئة الإنتاج يتطلب خدمة معاملات خادم موثوقة (Trusted Backend Transaction Service).',
                    'Treasury Safety: Active payout tickets (requested / under_review / approved_for_treasury) reserve funds from requestableBalance, while rejected tickets release their reservation. Architectural note: tamper-proof atomic aggregate reservation in production ultimately requires a trusted backend transaction service.'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Payout History Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6E0D6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t('طلبات تسوية الخزينة وسجل الدفعات السابقة', 'Treasury Payout Requests & Historical Ledger')}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {t(
                    'متابعة حالة طلبات التسوية المهيكلة المرفوعة للخزينة والدفعات التاريخية الموثقة.',
                    'Track structured treasury payout requests and historical settlement records.'
                  )}
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-[#0B4F3F]">
                {sellerPayoutTickets.length + seller.payoutHistory.length}{' '}
                {t('سجل', 'records')}
              </span>
            </div>

            {/* Active Structured Treasury Payout Requests */}
            {sellerPayoutTickets.map((tkt) => (
              <div
                key={tkt.id}
                className="p-4 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/50 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[#141413]">#{tkt.ticketNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-[#C87D12] text-[10px] font-bold">
                      {getTreasuryBadgeLabel(tkt.treasuryStatus)}
                    </span>
                    {tkt.ibanLast4 && (
                      <span className="font-mono text-[11px] text-[#57534E]" dir="ltr">
                        IBAN: SA•• •••• •••• •••• •••• {tkt.ibanLast4}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-[#141413]">{tkt.subject}</div>
                  <div className="text-[11px] text-[#57534E]">
                    {maskIbanInText(tkt.message)}
                  </div>
                  {tkt.replyAr && (
                    <div className="text-[11px] text-[#0B4F3F] font-semibold pt-1">
                      {t('ملاحظة الخزينة:', 'Treasury Note:')} {tkt.replyAr}
                    </div>
                  )}
                </div>
                <div className="text-end font-mono">
                  {tkt.payoutAmount ? (
                    <div className="text-sm font-bold text-[#0B4F3F]">
                      {formatPrice(tkt.payoutAmount)}
                    </div>
                  ) : null}
                  <div className="text-[11px] text-[#8C857B]">{tkt.createdAt}</div>
                </div>
              </div>
            ))}

            {seller.payoutHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8C857B]">
                {t('لا توجد حوالات سابقة مسجلة حتى الآن.', 'No payout history recorded yet.')}
              </div>
            ) : (
              <div className="space-y-3">
                {seller.payoutHistory.map((pay) => (
                  <div
                    key={pay.id}
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#141413]">#{pay.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            pay.status === 'completed'
                              ? 'bg-[#EBF3F0] text-[#1E6B47]'
                              : pay.status === 'processing'
                              ? 'bg-[#FBF7EC] text-[#C87D12]'
                              : 'bg-blue-50 text-blue-800'
                          }`}
                        >
                          {pay.status === 'completed'
                            ? t('مكتمل ومودع ✓', 'Completed ✓')
                            : pay.status === 'processing'
                            ? t('قيد التنفيذ عبر سار', 'Processing (SARIE)')
                            : t('مجدول', 'Scheduled')}
                        </span>
                      </div>
                      <div className="font-semibold text-[#141413]">
                        {lang === 'ar' ? pay.bankNameAr : pay.bankNameEn}
                      </div>
                      <div className="text-[11px] font-mono text-[#8C857B]" dir="ltr">
                        IBAN:{' '}
                        {pay.ibanLast4 && seller.iban.endsWith(pay.ibanLast4)
                          ? maskIban(seller.iban)
                          : `SA** **** **** **** **** ${pay.ibanLast4}`}{' '}
                        · {pay.date}
                      </div>
                    </div>

                    <div className="text-end font-mono">
                      <div className="text-base font-bold text-[#0B4F3F]">
                        {formatPrice(pay.amount)}
                      </div>
                      <div className="text-[10px] text-[#1E6B47]">SARIE TRANSFER</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: STORE PROFILE EDITOR
  // ============================================================================
  if (mode === 'profile') {
    const handleProfileSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await updateSellerProfile(seller.id, {
        nameAr: nameAr.trim() || seller.nameAr,
        nameEn: nameEn.trim() || seller.nameEn,
        descriptionAr: descAr.trim() || seller.descriptionAr,
        descriptionEn: descEn.trim() || seller.descriptionEn,
        cityAr: cityAr.trim() || seller.cityAr,
        cityEn: cityEn.trim() || seller.cityEn,
        ownerName: ownerName.trim() || seller.ownerName,
        email: email.trim() || seller.email,
        phone: phone.trim() || seller.phone,
        iban: iban.trim() || seller.iban,
        crNumber: crNumber.trim() || seller.crNumber,
        vatNumber: vatNumber.trim() || seller.vatNumber,
        categories: selectedCats.length > 0 ? selectedCats : seller.categories,
      });
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold">
              {t('الهوية التجارية وبيانات التوثيق الرسمي', 'Boutique Identity & Commercial Registration')}
            </span>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t('ملف المتجر المعتمد والسجل التجاري', 'Verified Store Profile & Legal Credentials')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-[#EBF3F0] text-[#1E6B47] text-xs font-bold inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {seller.verifiedBadge
                  ? t('متجر سعودي موثق بشارة أثيل الذهبية', 'Verified Saudi Boutique')
                  : t('بانتظار التوثيق', 'Pending Verification')}
              </span>
            </span>
          </div>
        </div>

        <form
          onSubmit={handleProfileSubmit}
          className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('اسم المتجر بالعربية *', 'Boutique Name (Arabic) *')}
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('اسم المتجر بالإنجليزية *', 'Boutique Name (English) *')}
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('النبذة التعريفية بالعربية', 'Store Bio (Arabic)')}
              </label>
              <textarea
                rows={3}
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('النبذة التعريفية بالإنجليزية', 'Store Bio (English)')}
              </label>
              <textarea
                rows={3}
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('رقم السجل التجاري السعودي (CR)', 'Saudi CR Number (10 digits)')}
              </label>
              <input
                type="text"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('الرقم الضريبي (ZATCA VAT)', 'ZATCA VAT Number (15 digits)')}
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('رقم الآيبان البنكي (IBAN)', 'Saudi Bank IBAN')}
              </label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('اسم المالك / المدير المفوض', 'Authorized Owner Name')}
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('البريد الإلكتروني الرسمي', 'Official Email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('رقم التواصل المباشر', 'Contact Phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('المدينة الرئيسية (عربي)', 'Primary Hub City (Arabic)')}
              </label>
              <input
                type="text"
                value={cityAr}
                onChange={(e) => setCityAr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#141413] mb-1">
                {t('المدينة الرئيسية (إنجليزي)', 'Primary Hub City (English)')}
              </label>
              <input
                type="text"
                value={cityEn}
                onChange={(e) => setCityEn(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
          </div>

          {/* Store Specialized Categories Selector */}
          <div>
            <label className="block text-xs font-bold text-[#141413] mb-2">
              {t('الأقسام المعتمدة لنشاط المتجر', 'Authorized Storefront Categories')}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCats((prev) =>
                        isSelected
                          ? prev.length > 1
                            ? prev.filter((id) => id !== cat.id)
                            : prev
                          : [...prev, cat.id]
                      )
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-[#0B4F3F] text-white border-[#0B4F3F]'
                        : 'bg-[#FAF8F5] text-[#57534E] border-[#E6E0D6] hover:text-[#141413]'
                    }`}
                  >
                    {lang === 'ar' ? cat.nameAr : cat.nameEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Read-only Governance Fields Notice */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#0B4F3F]" />
              <div>
                <div className="font-bold text-[#141413]">
                  {t(
                    'حقول الاعتماد والعمولة والأرصدة محمية (Read-Only Governance Fields)',
                    'Governance, Verification & Commission Fields are Protected'
                  )}
                </div>
                <div className="text-[11px] text-[#57534E]">
                  {t(
                    `حالة الحساب: (${seller.status}) · نسبة العمولة: (${seller.commissionRate}%) · تاريخ الانضمام: ${seller.joinedAt}`,
                    `Status: (${seller.status}) · Commission Rate: (${seller.commissionRate}%) · Joined: ${seller.joinedAt}`
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold shadow-xs"
            >
              {t('حفظ تحديثات ملف المتجر', 'Save Store Profile Changes')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ============================================================================
  // RENDER: OPERATIONAL SETTINGS
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6">
        <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold">
          {t('إعدادات التشغيل والربط اللوجستي والضريبي', 'Merchant Operational & SLA Settings')}
        </span>
        <h2 className="text-xl font-bold text-[#141413] mt-1">
          {t('تفضيلات الشحن والفوترة الإلكترونية ZATCA والتنبيهات', 'Logistics SLA, ZATCA E-Invoicing & Alerts')}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logistics & Fulfillment Preferences */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#141413] flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#0B4F3F]" />
            <span>{t('إعدادات الشحن والتغليف الفاخر', 'Shipping & Luxury Packaging SLA')}</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-[#141413] mb-1">
                {t('الناقل الوطني الافتراضي للمتجر', 'Default Primary Carrier')}
              </label>
              <select
                value={defaultCarrier}
                onChange={(e) => setDefaultCarrier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-semibold"
              >
                <option value="SPL Express VIP">سبل إكسبريس VIP (SPL Express VIP)</option>
                <option value="Aramex Premium">أرامكس بريميوم (Aramex Premium)</option>
                <option value="SMSA Express">سمسا إكسبريس (SMSA Express)</option>
                <option value="DHL Express KSA">دي إتش إل إكسبريس (DHL Express KSA)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#141413] mb-1">
                {t('ساعة إغلاق الشحن في نفس اليوم (بتوقيت الرياض)', 'Same-Day Dispatch Cutoff (Riyadh Time)')}
              </label>
              <input
                type="time"
                value={sameDayCutoff}
                onChange={(e) => setSameDayCutoff(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono"
              />
            </div>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] cursor-pointer">
              <div>
                <div className="font-bold text-[#141413]">
                  {t('تفعيل التغليف الملكي وبطاقة الإهداء مجاناً', 'Complimentary Signature Gift Packaging')}
                </div>
                <div className="text-[11px] text-[#57534E]">
                  {t('إرفاق عبوة أثيل الفاخرة وشريط الحرير مع كل طلب', 'Include Atheel presentation box & ribbon')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={luxuryPackagingEnabled}
                onChange={(e) => setLuxuryPackagingEnabled(e.target.checked)}
                className="rounded text-[#0B4F3F]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] cursor-pointer">
              <div>
                <div className="font-bold text-[#141413]">
                  {t('الشحن المبرد الإلزامي للعطور والعود والأجهزة الحساسة', 'Temperature-Controlled Courier (18°C–22°C)')}
                </div>
                <div className="text-[11px] text-[#57534E]">
                  {t('حماية المقتنيات من حرارة الصيف أثناء النقل بين المدن', 'Protects luxury goods during inter-city transit')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={coldChainEnabled}
                onChange={(e) => setColdChainEnabled(e.target.checked)}
                className="rounded text-[#0B4F3F]"
              />
            </label>
          </div>
        </div>

        {/* ZATCA E-Invoicing & Notifications */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#141413] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0B4F3F]" />
            <span>
              {t('الفوترة الإلكترونية (فاتورة ZATCA) والتنبيهات الفورية', 'ZATCA Phase-2 E-Invoicing & Alerts')}
            </span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#EBF3F0]/60 border border-[#0B4F3F]/20 space-y-1">
              <div className="font-bold text-[#0B4F3F]">
                {t('الربط الضريبي المعتمد (هيئة الزكاة والضريبة والجمارك)', 'ZATCA VAT Compliance Active')}
              </div>
              <div className="font-mono text-[11px] text-[#141413]">
                CR: {seller.crNumber} · VAT: {seller.vatNumber}
              </div>
            </div>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] cursor-pointer">
              <div>
                <div className="font-bold text-[#141413]">
                  {t('إصدار فاتورة ضريبية مبسطة بـ QR تلقائياً عند تأكيد الطلب', 'Auto-Generate ZATCA QR Tax Invoice')}
                </div>
                <div className="text-[11px] text-[#57534E]">
                  {t('تتضمن تفصيل ضريبة القيمة المضافة ١٥٪ ورقم تسجيل المتجر', 'Includes 15% VAT breakdown & merchant VAT ID')}
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoZatcaInvoice}
                onChange={(e) => setAutoZatcaInvoice(e.target.checked)}
                className="rounded text-[#0B4F3F]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] cursor-pointer">
              <div>
                <div className="font-bold text-[#141413]">
                  {t('إشعارات واتساب وSMS الفورية للطلبات الجديدة', 'Instant WhatsApp & SMS Order Alerts')}
                </div>
                <div className="text-[11px] text-[#57534E]">
                  {t(`إرسال تنبيه مباشر إلى ${seller.phone}`, `Send priority dispatch alerts to ${seller.phone}`)}
                </div>
              </div>
              <input
                type="checkbox"
                checked={whatsappOrderAlerts}
                onChange={(e) => setWhatsappOrderAlerts(e.target.checked)}
                className="rounded text-[#0B4F3F]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] cursor-pointer">
              <div>
                <div className="font-bold text-[#141413]">
                  {t('تنبيه البريد الإلكتروني عند وصول المخزون للحد الأدنى', 'Low-Stock Threshold Email Notifications')}
                </div>
                <div className="text-[11px] text-[#57534E]">
                  {t(`إرسال تنبيه إلى ${seller.email}`, `Send inventory replenishment digest to ${seller.email}`)}
                </div>
              </div>
              <input
                type="checkbox"
                checked={lowStockEmailAlerts}
                onChange={(e) => setLowStockEmailAlerts(e.target.checked)}
                className="rounded text-[#0B4F3F]"
              />
            </label>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  await updateSellerProfile(seller.id, {
                    operationalSettings: {
                      defaultCarrier,
                      sameDayCutoff,
                      luxuryPackagingEnabled,
                      coldChainEnabled,
                      autoZatcaInvoice,
                      whatsappOrderAlerts,
                      lowStockEmailAlerts,
                      updatedAt: new Date().toISOString(),
                    },
                  });
                }}
                className="px-6 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold shadow-xs"
              >
                {t('حفظ إعدادات التشغيل', 'Save Operational Settings')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
