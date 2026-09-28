'use client';

import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  Search,
  Download,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Eye,
  X,
  FileSpreadsheet,
  Scale,
  Percent,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  Seller,
  SellerStatus,
  SupportTicket,
  calculateSellerPayoutReservation,
} from '@/lib/types';
import {
  getIbanLast4,
  safeNumber,
  safeDivide,
  extractIncludedVat,
  downloadCsvFile,
} from '@/lib/utils';

type FinanceTabId =
  | 'overview'
  | 'settlements'
  | 'treasury'
  | 'refunds'
  | 'commission'
  | 'reconciliation';

type SettlementSortBy =
  | 'highest_gmv'
  | 'highest_commission'
  | 'highest_balance'
  | 'highest_reserved'
  | 'lowest_requestable';

type SettlementStateFilter =
  | 'all'
  | 'has_reserved_payout'
  | 'fully_requestable'
  | 'zero_requestable';

type ReconciliationViewMode = 'by_order' | 'by_seller' | 'by_payment' | 'by_refund';

export default function AdminFinanceAndTreasury() {
  const {
    lang,
    t,
    formatPrice,
    isDemoMode,
    sellers,
    orders,
    tickets,
    categories,
    updatePayoutTreasuryStatus,
  } = useMarketplace();

  const [activeTab, setActiveTab] = useState<FinanceTabId>('overview');

  // Seller Settlements Filters & Detail State
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<'all' | SellerStatus>('all');
  const [sellerCityFilter, setSellerCityFilter] = useState<string>('all');
  const [settlementStateFilter, setSettlementStateFilter] =
    useState<SettlementStateFilter>('all');
  const [settlementSort, setSettlementSort] = useState<SettlementSortBy>('highest_gmv');
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  // Treasury Queue Filters & Notes
  const [treasuryFilter, setTreasuryFilter] = useState<
    'all' | 'requested' | 'under_review' | 'approved_for_treasury' | 'rejected' | 'completed'
  >('all');
  const [treasurySearch, setTreasurySearch] = useState('');
  const [treasuryNotes, setTreasuryNotes] = useState<Record<string, string>>({});

  // Refund Exposure Filter
  const [refundGroupFilter, setRefundGroupFilter] = useState<
    'all' | 'wallet_completed' | 'external_authorized_pending' | 'failed' | 'none'
  >('all');

  // Reconciliation State
  const [reconView, setReconView] = useState<ReconciliationViewMode>('by_order');
  const [reconSearch, setReconSearch] = useState('');

  // Reference date for deterministic age calculations
  const referenceDateMs = useMemo(() => {
    const orderDates = orders
      .map((o) => new Date(o.createdAt).getTime())
      .filter((ts) => Number.isFinite(ts));
    const baseMs = new Date('2026-09-28T12:00:00Z').getTime();
    return orderDates.length > 0 ? Math.max(...orderDates, baseMs) : baseMs;
  }, [orders]);

  // 1. Enriched Seller Rows with unified `calculateSellerPayoutReservation`
  const sellerFinancialRows = useMemo(() => {
    return sellers.map((seller) => {
      const reservation = calculateSellerPayoutReservation(seller, tickets);
      const ibanLast4 = getIbanLast4(seller.iban);
      return {
        seller,
        ibanLast4,
        grossSales: safeNumber(seller.grossSales),
        commissionRate: safeNumber(seller.commissionRate),
        platformCommission: safeNumber(seller.platformCommission),
        refundsTotal: safeNumber(seller.refundsTotal),
        netEarnings: safeNumber(seller.netEarnings),
        availableBalance: reservation.availableBalance,
        reservedPendingPayoutAmount: reservation.reservedPendingPayoutAmount,
        requestableBalance: reservation.requestableBalance,
      };
    });
  }, [sellers, tickets]);

  // 2. Structured Payout Tickets (`workflowType === 'payout'`)
  const payoutTickets = useMemo(() => {
    return tickets
      .filter((tkt) => tkt.workflowType === 'payout' || Boolean(tkt.payoutAmount))
      .map((tkt) => {
        const seller = sellers.find((s) => s.id === tkt.sellerId);
        const reservation = seller
          ? calculateSellerPayoutReservation(seller, tickets)
          : { availableBalance: 0, reservedPendingPayoutAmount: 0, requestableBalance: 0 };
        const state = tkt.treasuryStatus || 'requested';
        const isReserving =
          state === 'requested' ||
          state === 'under_review' ||
          state === 'approved_for_treasury';
        const amount = safeNumber(tkt.payoutAmount);
        return {
          ticket: tkt,
          seller,
          treasuryStatus: state,
          payoutAmount: amount,
          reservedByThisTicket: isReserving ? amount : 0,
          ibanLast4: getIbanLast4(seller?.iban, tkt.ibanLast4),
          sellerAvailableBalance: reservation.availableBalance,
          sellerReservedTotal: reservation.reservedPendingPayoutAmount,
          sellerRequestableBalance: reservation.requestableBalance,
        };
      });
  }, [tickets, sellers]);

  // 3. Order-Level Reconciliation & Return Exposure Records
  const orderReconciliationRows = useMemo(() => {
    return orders.map((order) => {
      const grossOrderTotal = safeNumber(order.total);
      const discount = safeNumber(order.discountAmount);
      const shipping = safeNumber(order.shippingFee);
      const vatIncluded =
        order.vatAmount > 0
          ? safeNumber(order.vatAmount)
          : extractIncludedVat(grossOrderTotal);

      let sellerGrossValue = 0;
      let orderCommission = 0;

      order.items.forEach((item) => {
        const lineGross = safeNumber(item.unitPrice) * safeNumber(item.quantity);
        sellerGrossValue += lineGross;
        const itemSeller = sellers.find((s) => s.id === item.sellerId);
        const rate = safeNumber(itemSeller?.commissionRate ?? 12);
        orderCommission += (lineGross * rate) / 100;
      });

      const hasReturn =
        Boolean(order.returnRequest) ||
        order.status === 'return_requested' ||
        order.status === 'returned';
      const refundStatus = order.returnRequest?.refundStatus || 'none';
      const refundAmount = hasReturn
        ? safeNumber(order.returnRequest?.refundAmount ?? order.total)
        : 0;

      const requestedAtStr = order.returnRequest?.requestedAt || order.createdAt;
      const reqMs = new Date(requestedAtStr).getTime();
      const ageDays = Number.isFinite(reqMs)
        ? Math.max(0, Math.round((referenceDateMs - reqMs) / (1000 * 60 * 60 * 24)))
        : 0;

      return {
        order,
        grossOrderTotal: Number(grossOrderTotal.toFixed(2)),
        discount: Number(discount.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        vatIncluded: Number(vatIncluded.toFixed(2)),
        sellerGrossValue: Number(sellerGrossValue.toFixed(2)),
        orderCommission: Number(orderCommission.toFixed(2)),
        netSellerShare: Number(
          Math.max(0, sellerGrossValue - orderCommission - refundAmount).toFixed(2)
        ),
        hasReturn,
        refundStatus,
        refundAmount: Number(refundAmount.toFixed(2)),
        ageDays,
      };
    });
  }, [orders, sellers, referenceDateMs]);

  // 4. Deterministic Executive Finance KPIs
  const executiveKpis = useMemo(() => {
    const validOrderRows = orderReconciliationRows.filter(
      (r) => r.order.status !== 'cancelled'
    );
    const liveOrdersGmv = validOrderRows.reduce((s, r) => s + r.grossOrderTotal, 0);

    const grossSellerSales = sellerFinancialRows.reduce((s, r) => s + r.grossSales, 0);
    const platformCommissionRevenue = sellerFinancialRows.reduce(
      (s, r) => s + r.platformCommission,
      0
    );
    const sellerLedgerRefunds = sellerFinancialRows.reduce((s, r) => s + r.refundsTotal, 0);

    // Marketplace GMV combines cumulative merchant ledger GMV (or live orders if higher)
    const marketplaceGmv = Math.max(grossSellerSales, liveOrdersGmv);

    // Refund commission impact
    const avgCommissionRate =
      sellerFinancialRows.length > 0
        ? safeDivide(
            sellerFinancialRows.reduce((s, r) => s + r.commissionRate, 0),
            sellerFinancialRows.length,
            2
          )
        : 0;

    const weightedCommissionRate =
      grossSellerSales > 0
        ? safeDivide(platformCommissionRevenue * 100, grossSellerSales, 2)
        : avgCommissionRate;

    const refundCommissionAdjustment = Number(
      ((sellerLedgerRefunds * weightedCommissionRate) / 100).toFixed(2)
    );
    const netMarketplaceCommissionRevenue = Math.max(
      0,
      Number((platformCommissionRevenue - refundCommissionAdjustment).toFixed(2))
    );

    const sellerPayablesNetEarnings = sellerFinancialRows.reduce(
      (s, r) => s + r.netEarnings,
      0
    );
    const availableSellerBalances = sellerFinancialRows.reduce(
      (s, r) => s + r.availableBalance,
      0
    );
    const reservedPendingPayouts = sellerFinancialRows.reduce(
      (s, r) => s + r.reservedPendingPayoutAmount,
      0
    );
    const totalRequestableBalance = sellerFinancialRows.reduce(
      (s, r) => s + r.requestableBalance,
      0
    );

    const approvedForTreasuryAmount = payoutTickets
      .filter((p) => p.treasuryStatus === 'approved_for_treasury')
      .reduce((s, p) => s + p.payoutAmount, 0);

    const returnRows = orderReconciliationRows.filter((r) => r.hasReturn);
    const externalRefundsPendingAmount = returnRows
      .filter((r) => r.refundStatus === 'external_authorized_pending')
      .reduce((s, r) => s + r.refundAmount, 0);
    const externalRefundsPendingCount = returnRows.filter(
      (r) => r.refundStatus === 'external_authorized_pending'
    ).length;

    const walletRefundsCompletedAmount = returnRows
      .filter((r) => r.refundStatus === 'wallet_completed')
      .reduce((s, r) => s + r.refundAmount, 0);
    const walletRefundsCompletedCount = returnRows.filter(
      (r) => r.refundStatus === 'wallet_completed'
    ).length;

    const failedRefundsAmount = returnRows
      .filter((r) => r.refundStatus === 'failed')
      .reduce((s, r) => s + r.refundAmount, 0);
    const failedRefundsCount = returnRows.filter((r) => r.refundStatus === 'failed').length;

    const pendingDecisionReturnsAmount = returnRows
      .filter((r) => r.refundStatus === 'none')
      .reduce((s, r) => s + r.refundAmount, 0);
    const pendingDecisionReturnsCount = returnRows.filter(
      (r) => r.refundStatus === 'none'
    ).length;

    return {
      marketplaceGmv,
      liveOrdersGmv,
      grossSellerSales,
      platformCommissionRevenue,
      sellerLedgerRefunds,
      refundCommissionAdjustment,
      netMarketplaceCommissionRevenue,
      sellerPayablesNetEarnings,
      availableSellerBalances,
      reservedPendingPayouts,
      totalRequestableBalance,
      approvedForTreasuryAmount,
      externalRefundsPendingAmount,
      externalRefundsPendingCount,
      walletRefundsCompletedAmount,
      walletRefundsCompletedCount,
      failedRefundsAmount,
      failedRefundsCount,
      pendingDecisionReturnsAmount,
      pendingDecisionReturnsCount,
      avgCommissionRate,
      weightedCommissionRate,
      payoutRequestsCount: payoutTickets.length,
      activePayoutRequestsCount: payoutTickets.filter(
        (p) =>
          p.treasuryStatus === 'requested' ||
          p.treasuryStatus === 'under_review' ||
          p.treasuryStatus === 'approved_for_treasury'
      ).length,
    };
  }, [orderReconciliationRows, sellerFinancialRows, payoutTickets]);

  // Filtered & Sorted Seller Settlement Rows
  const filteredSellerRows = useMemo(() => {
    const q = sellerSearch.trim().toLowerCase();
    const list = sellerFinancialRows.filter((row) => {
      const s = row.seller;
      if (sellerStatusFilter !== 'all' && s.status !== sellerStatusFilter) return false;
      if (
        sellerCityFilter !== 'all' &&
        s.cityAr !== sellerCityFilter &&
        s.cityEn !== sellerCityFilter
      ) {
        return false;
      }
      if (
        settlementStateFilter === 'has_reserved_payout' &&
        row.reservedPendingPayoutAmount <= 0
      ) {
        return false;
      }
      if (
        settlementStateFilter === 'fully_requestable' &&
        (row.reservedPendingPayoutAmount > 0 || row.requestableBalance <= 0)
      ) {
        return false;
      }
      if (settlementStateFilter === 'zero_requestable' && row.requestableBalance > 0) {
        return false;
      }
      if (!q) return true;
      return (
        s.nameAr.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.cityAr.toLowerCase().includes(q) ||
        s.cityEn.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (settlementSort === 'highest_gmv') return b.grossSales - a.grossSales;
      if (settlementSort === 'highest_commission')
        return b.platformCommission - a.platformCommission;
      if (settlementSort === 'highest_balance')
        return b.availableBalance - a.availableBalance;
      if (settlementSort === 'highest_reserved')
        return b.reservedPendingPayoutAmount - a.reservedPendingPayoutAmount;
      if (settlementSort === 'lowest_requestable')
        return a.requestableBalance - b.requestableBalance;
      return 0;
    });
  }, [
    sellerFinancialRows,
    sellerSearch,
    sellerStatusFilter,
    sellerCityFilter,
    settlementStateFilter,
    settlementSort,
  ]);

  const selectedSellerDetail = useMemo(() => {
    if (!selectedSellerId) return null;
    const row = sellerFinancialRows.find((r) => r.seller.id === selectedSellerId);
    if (!row) return null;

    const sellerTickets = payoutTickets.filter((p) => p.seller?.id === selectedSellerId);
    const sellerOrders = orders
      .filter((o) => o.items.some((it) => it.sellerId === selectedSellerId))
      .map((order) => {
        const sellerItems = order.items.filter((it) => it.sellerId === selectedSellerId);
        const sellerGross = sellerItems.reduce(
          (sum, it) => sum + safeNumber(it.unitPrice) * safeNumber(it.quantity),
          0
        );
        // VAT-inclusive formula: VAT portion = VAT-inclusive amount * 15 / 115
        const vatPortion = extractIncludedVat(sellerGross);
        const commission = Number(
          ((sellerGross * row.commissionRate) / 100).toFixed(2)
        );
        const isOrderReturned =
          order.status === 'returned' ||
          order.status === 'return_requested' ||
          Boolean(order.returnRequest);
        const refundImpact = isOrderReturned ? sellerGross : 0;
        const netMerchantAmount = Number(
          Math.max(0, sellerGross - commission - refundImpact).toFixed(2)
        );
        return {
          order,
          sellerItems,
          sellerGross: Number(sellerGross.toFixed(2)),
          vatPortion,
          commission,
          refundImpact: Number(refundImpact.toFixed(2)),
          netMerchantAmount,
        };
      });

    return {
      ...row,
      sellerTickets,
      sellerOrders,
    };
  }, [selectedSellerId, sellerFinancialRows, payoutTickets, orders]);

  // Filtered Treasury Queue
  const filteredTreasuryQueue = useMemo(() => {
    const q = treasurySearch.trim().toLowerCase();
    return payoutTickets.filter((item) => {
      if (treasuryFilter !== 'all' && item.treasuryStatus !== treasuryFilter) return false;
      if (!q) return true;
      return (
        item.ticket.ticketNumber.toLowerCase().includes(q) ||
        item.ticket.subject.toLowerCase().includes(q) ||
        (item.seller?.nameAr || '').toLowerCase().includes(q) ||
        (item.seller?.nameEn || '').toLowerCase().includes(q) ||
        item.ibanLast4.toLowerCase().includes(q)
      );
    });
  }, [payoutTickets, treasuryFilter, treasurySearch]);

  // Filtered Refund Exposure Rows
  const refundExposureRows = useMemo(() => {
    const allReturns = orderReconciliationRows.filter((r) => r.hasReturn);
    if (refundGroupFilter === 'all') return allReturns;
    return allReturns.filter((r) => r.refundStatus === refundGroupFilter);
  }, [orderReconciliationRows, refundGroupFilter]);

  // Filtered Order Reconciliation Rows
  const filteredReconOrders = useMemo(() => {
    const q = reconSearch.trim().toLowerCase();
    if (!q) return orderReconciliationRows;
    return orderReconciliationRows.filter(
      (r) =>
        r.order.orderNumber.toLowerCase().includes(q) ||
        r.order.customerName.toLowerCase().includes(q) ||
        r.order.paymentMethod.toLowerCase().includes(q)
    );
  }, [orderReconciliationRows, reconSearch]);

  // ============================================================================
  // CSV EXPORT HANDLERS (NO FULL IBAN EVER EXPORTED)
  // ============================================================================
  const exportSellerSettlementCsv = () => {
    const headers = [
      'sellerId',
      'sellerNameAr',
      'sellerNameEn',
      'city',
      'status',
      'maskedIbanLast4',
      'grossSalesSAR',
      'commissionRatePercent',
      'platformCommissionSAR',
      'refundsTotalSAR',
      'netEarningsSAR',
      'availableBalanceSAR',
      'reservedPendingPayoutSAR',
      'requestableBalanceSAR',
      'nextPayoutDate',
    ];
    const rows = filteredSellerRows.map((r) => [
      r.seller.id,
      r.seller.nameAr,
      r.seller.nameEn,
      lang === 'ar' ? r.seller.cityAr : r.seller.cityEn,
      r.seller.status,
      `SA**************${r.ibanLast4}`,
      r.grossSales,
      r.commissionRate,
      r.platformCommission,
      r.refundsTotal,
      r.netEarnings,
      r.availableBalance,
      r.reservedPendingPayoutAmount,
      r.requestableBalance,
      r.seller.nextPayoutDate,
    ]);
    downloadCsvFile(
      `atheel-seller-settlement-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  const exportTreasuryQueueCsv = () => {
    const headers = [
      'ticketNumber',
      'sellerId',
      'sellerName',
      'payoutAmountSAR',
      'ibanLast4Only',
      'createdDate',
      'treasuryStatus',
      'reservedAmountSAR',
      'sellerAvailableBalanceSAR',
      'sellerRequestableBalanceSAR',
    ];
    const rows = filteredTreasuryQueue.map((item) => [
      item.ticket.ticketNumber,
      item.seller?.id || item.ticket.sellerId || '',
      item.seller
        ? lang === 'ar'
          ? item.seller.nameAr
          : item.seller.nameEn
        : item.ticket.userName,
      item.payoutAmount,
      item.ibanLast4,
      item.ticket.createdAt,
      item.treasuryStatus,
      item.reservedByThisTicket,
      item.sellerAvailableBalance,
      item.sellerRequestableBalance,
    ]);
    downloadCsvFile(
      `atheel-treasury-queue-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  const exportRefundExposureCsv = () => {
    const headers = [
      'orderNumber',
      'customerName',
      'sellers',
      'refundAmountSAR',
      'originalPaymentMethod',
      'refundMethod',
      'refundStatus',
      'ageDays',
      'requestedAt',
    ];
    const rows = refundExposureRows.map((r) => [
      r.order.orderNumber,
      r.order.customerName,
      Array.from(
        new Set(
          r.order.items.map((it) => (lang === 'ar' ? it.sellerNameAr : it.sellerNameEn))
        )
      ).join(' | '),
      r.refundAmount,
      r.order.paymentMethod,
      r.order.returnRequest?.refundMethod || 'wallet',
      r.refundStatus,
      r.ageDays,
      r.order.returnRequest?.requestedAt || r.order.createdAt,
    ]);
    downloadCsvFile(
      `atheel-refund-exposure-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  const exportOrderReconciliationCsv = () => {
    const headers = [
      'orderNumber',
      'createdAt',
      'orderStatus',
      'paymentMethod',
      'grossOrderTotalSAR',
      'discountSAR',
      'shippingSAR',
      'vatIncludedSAR',
      'sellerGrossValueSAR',
      'commissionSAR',
      'refundExposureSAR',
      'refundStatus',
    ];
    const rows = filteredReconOrders.map((r) => [
      r.order.orderNumber,
      r.order.createdAt,
      r.order.status,
      r.order.paymentMethod,
      r.grossOrderTotal,
      r.discount,
      r.shipping,
      r.vatIncluded,
      r.sellerGrossValue,
      r.orderCommission,
      r.refundAmount,
      r.refundStatus,
    ]);
    downloadCsvFile(
      `atheel-order-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    sellers.forEach((s) => {
      if (s.cityAr) set.add(s.cityAr);
    });
    return Array.from(set);
  }, [sellers]);

  const financeTabs: { id: FinanceTabId; ar: string; en: string; badge?: number }[] = [
    { id: 'overview', ar: 'النظرة المالية والتدفق', en: 'Financial Overview' },
    {
      id: 'settlements',
      ar: 'تسويات التجار والأرصدة',
      en: 'Seller Settlements',
      badge: sellers.length,
    },
    {
      id: 'treasury',
      ar: 'طابور الخزينة والصرف',
      en: 'Treasury Queue',
      badge: executiveKpis.activePayoutRequestsCount,
    },
    {
      id: 'refunds',
      ar: 'التعرض للمرتجعات',
      en: 'Refund Exposure',
      badge: orderReconciliationRows.filter((r) => r.hasReturn).length,
    },
    { id: 'commission', ar: 'الإيرادات والعمولات', en: 'Revenue & Commission' },
    { id: 'reconciliation', ar: 'المطابقة المالية', en: 'Reconciliation' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Executive Finance Header */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#0B4F3F] font-bold">
              <Landmark className="w-4 h-4 text-[#C59B27]" />
              <span>
                {t(
                  'وحدة الخزينة المركزية والتسويات المالية والحوكمة',
                  'EXECUTIVE FINANCE, TREASURY & SETTLEMENT WORKSPACE'
                )}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t(
                'الإدارة المالية التنفيذية، تسويات التجار، وطابور الخزينة',
                'Marketplace Financial Ledger, Merchant Settlements & Treasury Queue'
              )}
            </h2>
            <p className="text-xs text-[#57534E] mt-1 max-w-3xl">
              {t(
                'حسابات حتمية مباشرة من بيانات المنصة الفعلية تشمل أرصدة التجار، الحجز التلقائي لطلبات التسوية، التزامات المرتجعات الخارجية، ومطابقة ضريبة القيمة المضافة المضمّنة (١٥٪).',
                'Deterministic real-time calculations across merchant balances, active payout reservations, external gateway refund liabilities, and VAT-inclusive (15/115) order reconciliation.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportSellerSettlementCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-xs font-bold text-[#141413]"
            >
              <Download className="w-3.5 h-3.5 text-[#0B4F3F]" />
              <span>{t('تصدير دفتر التجار CSV', 'Export Settlements CSV')}</span>
            </button>
            <button
              type="button"
              onClick={exportTreasuryQueueCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30]"
            >
              <Download className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{t('تصدير طابور الخزينة CSV', 'Export Treasury CSV')}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-[#F3EFEA]">
          {financeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0B4F3F] text-white shadow-xs'
                  : 'bg-[#FAF8F5] text-[#57534E] hover:text-[#141413] border border-[#E6E0D6]'
              }`}
            >
              <span>{lang === 'ar' ? tab.ar : tab.en}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                    activeTab === tab.id
                      ? 'bg-[#C59B27] text-[#141413]'
                      : 'bg-white text-[#141413] border border-[#E6E0D6]'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================
          TAB 1: FINANCIAL EXECUTIVE OVERVIEW & MARKETPLACE FINANCIAL FLOW
      ======================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 12 Deterministic Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t('إجمالي قيمة البضائع (Marketplace GMV)', 'Marketplace GMV')}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
                {formatPrice(executiveKpis.marketplaceGmv)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('طلبات الجلسة المؤكدة:', 'Active Orders GMV:')}{' '}
                <span className="font-mono font-bold text-[#0B4F3F]">
                  {formatPrice(executiveKpis.liveOrdersGmv)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t('إجمالي مبيعات التجار (Gross Seller Sales)', 'Gross Seller Sales')}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
                {formatPrice(executiveKpis.grossSellerSales)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('مجموع مبيعات دفاتر التجار قبل العمولة', 'Sum of Seller.grossSales')}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'إيراد عمولة المنصة (Platform Commission)',
                  'Platform Commission Revenue'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#0B4F3F] mt-1">
                {formatPrice(executiveKpis.platformCommissionRevenue)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('متوسط نسبة العمولة:', 'Avg Commission Rate:')}{' '}
                <span className="font-mono font-bold text-[#141413]">
                  {executiveKpis.avgCommissionRate}%
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t('إجمالي المرتجعات (Refunds Total)', 'Total Refunds')}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#9E2A2B] mt-1">
                {formatPrice(executiveKpis.sellerLedgerRefunds)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('تعديل عمولة المرتجعات:', 'Commission Refund Adj:')}{' '}
                <span className="font-mono font-bold">
                  {formatPrice(executiveKpis.refundCommissionAdjustment)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'صافي إيراد عمولة المنصة (Net Commission)',
                  'Net Marketplace Commission Revenue'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#0B4F3F] mt-1">
                {formatPrice(executiveKpis.netMarketplaceCommissionRevenue)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t(
                  'العمولة المحصلة بعد خصم أثر المرتجعات',
                  'Platform Commission minus refund commission impact'
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'مستحقات التجار الصافية (Seller Payables)',
                  'Seller Payables (Net Earnings)'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
                {formatPrice(executiveKpis.sellerPayablesNetEarnings)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('صافي أرباح التجار بعد العمولة والمرتجعات', 'Sum of Seller.netEarnings')}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'الأرصدة المتاحة للتجار (Available Balances)',
                  'Available Seller Balances'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
                {formatPrice(executiveKpis.availableSellerBalances)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('القابل للطلب حالياً:', 'Currently Requestable:')}{' '}
                <span className="font-mono font-bold text-[#0B4F3F]">
                  {formatPrice(executiveKpis.totalRequestableBalance)}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'طلبات التسوية المحجوزة (Reserved Payouts)',
                  'Reserved Pending Payouts'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#B45309] mt-1">
                {formatPrice(executiveKpis.reservedPendingPayouts)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('عدد طلبات التسوية:', 'Payout Requests Count:')}{' '}
                <span className="font-mono font-bold text-[#141413]">
                  {executiveKpis.payoutRequestsCount}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'المعتمد للرفع للخزينة (Approved for Treasury)',
                  'Approved-for-Treasury Amount'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#0B4F3F] mt-1">
                {formatPrice(executiveKpis.approvedForTreasuryAmount)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t(
                  'بانتظار تنفيذ التحويل البنكي الخارجي الموثوق',
                  'Awaiting external bank settlement confirmation'
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#9E2A2B]/30 p-4 shadow-xs">
              <div className="text-xs font-bold text-[#9E2A2B]">
                {t(
                  'استردادات بوابات الدفع المعلقة (External Pending)',
                  'External Refunds Pending (Liability)'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#9E2A2B] mt-1">
                {formatPrice(executiveKpis.externalRefundsPendingAmount)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t(
                  'التزام مالي معلق بانتظار تسوية البوابة — ليس نقداً مكتملاً',
                  'Liability awaiting gateway settlement — not completed cash'
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'استردادات المحفظة المكتملة (Wallet Refunds)',
                  'Wallet Refunds Completed'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
                {formatPrice(executiveKpis.walletRefundsCompletedAmount)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('حالات مكتملة في محفظة العميل:', 'Completed wallet credits:')}{' '}
                <span className="font-mono font-bold">
                  {executiveKpis.walletRefundsCompletedCount}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'متوسط نسبة عمولة المنصة (Avg Commission Rate)',
                  'Average Commission Rate'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
                {executiveKpis.avgCommissionRate}%
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {t('الموزون بالمبيعات:', 'GMV-Weighted Rate:')}{' '}
                <span className="font-mono font-bold text-[#0B4F3F]">
                  {executiveKpis.weightedCommissionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Marketplace Financial Flow (8-Step Operational Waterfall) */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3EFEA] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    'مخطط التدفق المالي التشغيلي للمنصة (Marketplace Financial Flow)',
                    'Operational Marketplace Financial Flow Waterfall'
                  )}
                </h3>
                <p className="text-xs text-[#57534E] mt-0.5">
                  {t(
                    'تصور تشغيلي لتدرج القيمة المالية من إجمالي طلبات العملاء حتى الرصيد الصافي القابل للطلب (تصور تشغيلي وليس تقريراً محاسبياً قانونياً).',
                    'Operational visualization from Customer Gross Order Value down to Seller Requestable Balance (operational representation, not formal statutory accounting).'
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  step: '01',
                  titleAr: 'إجمالي قيمة طلبات العملاء',
                  titleEn: 'Customer Gross Order Value',
                  amount: executiveKpis.marketplaceGmv,
                  noteAr: 'إجمالي قيمة البضائع شاملة ضريبة ١٥٪',
                  noteEn: 'VAT-inclusive gross marketplace value',
                  tone: 'text-[#141413]',
                },
                {
                  step: '02',
                  titleAr: 'إجمالي حصة مبيعات التجار',
                  titleEn: 'Seller Gross Share',
                  amount: executiveKpis.grossSellerSales,
                  noteAr: 'مبيعات التجار الإجمالية قبل العمولة',
                  noteEn: 'Cumulative merchant gross sales',
                  tone: 'text-[#141413]',
                },
                {
                  step: '03',
                  titleAr: 'عمولة منصة أثيل',
                  titleEn: 'Marketplace Commission',
                  amount: executiveKpis.platformCommissionRevenue,
                  noteAr: `وفق نسب التعاقد (متوسط ${executiveKpis.avgCommissionRate}%)`,
                  noteEn: `Contractual commission (Avg ${executiveKpis.avgCommissionRate}%)`,
                  tone: 'text-[#0B4F3F]',
                },
                {
                  step: '04',
                  titleAr: 'تسويات المرتجعات والاسترداد',
                  titleEn: 'Refund Adjustments',
                  amount: executiveKpis.sellerLedgerRefunds,
                  noteAr: 'المرتجعات المخصومة من دفاتر التجار',
                  noteEn: 'Refund adjustments across merchants',
                  tone: 'text-[#9E2A2B]',
                },
                {
                  step: '05',
                  titleAr: 'صافي أرباح التجار المستحقة',
                  titleEn: 'Seller Net Earnings',
                  amount: executiveKpis.sellerPayablesNetEarnings,
                  noteAr: 'الإجمالي ناقص العمولة والمرتجعات',
                  noteEn: 'Gross Share − Commission − Refunds',
                  tone: 'text-[#141413]',
                },
                {
                  step: '06',
                  titleAr: 'الرصيد المتاح حالياً للتجار',
                  titleEn: 'Available Balance',
                  amount: executiveKpis.availableSellerBalances,
                  noteAr: 'الرصيد الجاهز في دفاتر التجار قبل الحجز',
                  noteEn: 'Current ledger availableBalance',
                  tone: 'text-[#1B6B45]',
                },
                {
                  step: '07',
                  titleAr: 'طلبات التسوية المحجوزة',
                  titleEn: 'Reserved Payout Requests',
                  amount: executiveKpis.reservedPendingPayouts,
                  noteAr: 'تذاكر requested / under_review / approved',
                  noteEn: 'Active payout tickets reserving balance',
                  tone: 'text-[#B45309]',
                },
                {
                  step: '08',
                  titleAr: 'الرصيد الصافي القابل للطلب',
                  titleEn: 'Requestable Balance',
                  amount: executiveKpis.totalRequestableBalance,
                  noteAr: 'الرصيد المتاح ناقص المحجوز قيد المراجعة',
                  noteEn: 'Available Balance − Reserved Payouts',
                  tone: 'text-[#0B4F3F]',
                },
              ].map((stage, idx) => (
                <div
                  key={stage.step}
                  className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8C857B]">
                    <span>STEP {stage.step}</span>
                    {idx < 7 && <ArrowDown className="w-3.5 h-3.5 text-[#C59B27]" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#141413]">
                      {lang === 'ar' ? stage.titleAr : stage.titleEn}
                    </div>
                    <div
                      className={`text-lg font-bold font-mono tabular-nums mt-1 ${stage.tone}`}
                    >
                      {formatPrice(stage.amount)}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#57534E]">
                    {lang === 'ar' ? stage.noteAr : stage.noteEn}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 2: SELLER SETTLEMENT LEDGER & SELLER FINANCIAL DETAIL
      ======================================================================== */}
      {activeTab === 'settlements' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    'دفتر التسويات المالية الشامل للتجار (Seller Settlement Ledger)',
                    'Global Seller Settlement & Payout Reservation Ledger'
                  )}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {t(
                    'اضغط على أي تاجر لفتح كشف الحساب التفصيلي، سجل الدفعات، وتذاكر التسوية، ودفتر الطلبات شامل ضريبة القيمة المضافة.',
                    'Click any seller row to inspect full financial dossier, payout history, active payout tickets, and VAT-inclusive order ledger.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={exportSellerSettlementCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>{t('تصدير جدول التسويات CSV', 'Export Ledger CSV')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
                  <input
                    type="text"
                    value={sellerSearch}
                    onChange={(e) => setSellerSearch(e.target.value)}
                    placeholder={t('بحث باسم المتجر أو المدينة...', 'Search seller or city...')}
                    className="w-full ps-10 pe-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413]"
                  />
                </div>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={sellerStatusFilter}
                  onChange={(e) =>
                    setSellerStatusFilter(e.target.value as 'all' | SellerStatus)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
                >
                  <option value="all">{t('جميع حالات المتجر', 'All Seller Statuses')}</option>
                  <option value="approved">{t('معتمد (approved)', 'Approved')}</option>
                  <option value="pending">{t('بانتظار الاعتماد (pending)', 'Pending')}</option>
                  <option value="suspended">{t('موقوف (suspended)', 'Suspended')}</option>
                  <option value="rejected">{t('مرفوض (rejected)', 'Rejected')}</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={sellerCityFilter}
                  onChange={(e) => setSellerCityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
                >
                  <option value="all">{t('جميع المدن', 'All Cities')}</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={settlementStateFilter}
                  onChange={(e) =>
                    setSettlementStateFilter(e.target.value as SettlementStateFilter)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
                >
                  <option value="all">{t('جميع حالات التسوية', 'All Settlement States')}</option>
                  <option value="has_reserved_payout">
                    {t('لديه مبالغ محجوزة', 'Has Reserved Payout')}
                  </option>
                  <option value="fully_requestable">
                    {t('رصيد متاح بالكامل للطلب', 'Fully Requestable')}
                  </option>
                  <option value="zero_requestable">
                    {t('لا يوجد رصيد قابل للطلب', 'Zero Requestable Balance')}
                  </option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <select
                  value={settlementSort}
                  onChange={(e) => setSettlementSort(e.target.value as SettlementSortBy)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
                >
                  <option value="highest_gmv">
                    {t('الأعلى مبيعات (Highest GMV)', 'Sort: Highest GMV')}
                  </option>
                  <option value="highest_commission">
                    {t('الأعلى عمولة (Highest Commission)', 'Sort: Highest Commission')}
                  </option>
                  <option value="highest_balance">
                    {t('الأعلى رصيداً متاحاً (Highest Balance)', 'Sort: Highest Balance')}
                  </option>
                  <option value="highest_reserved">
                    {t(
                      'الأعلى حجزاً قيد المراجعة (Highest Reserved)',
                      'Sort: Highest Reserved Payout'
                    )}
                  </option>
                  <option value="lowest_requestable">
                    {t(
                      'الأقل رصيداً قابلاً للطلب (Lowest Requestable)',
                      'Sort: Lowest Requestable Balance'
                    )}
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Seller Settlement Table */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                  <tr>
                    <th className="py-3.5 px-4 text-start font-bold">
                      {t('التاجر', 'Seller')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('الحالة', 'Status')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('إجمالي المبيعات', 'Gross Sales')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('نسبة العمولة', 'Comm. Rate')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('عمولة المنصة', 'Platform Comm.')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('المرتجعات', 'Refunds')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('صافي الأرباح', 'Net Earnings')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('الرصيد المتاح', 'Available Bal.')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('محجوز للصرف', 'Reserved Payout')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('قابل للطلب', 'Requestable Bal.')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('الدورة القادمة', 'Next Payout')}
                    </th>
                    <th className="py-3.5 px-4 text-end font-bold">
                      {t('الكشف', 'Detail')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFEA]">
                  {filteredSellerRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-[#8C857B]">
                        {t(
                          'لا توجد سجلات تجار مطابقة للفلتر المحدد',
                          'No seller settlement records match the active filter'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredSellerRows.map((row) => (
                      <tr
                        key={row.seller.id}
                        onClick={() => setSelectedSellerId(row.seller.id)}
                        className="hover:bg-[#FAF8F5] cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#141413]">
                            {lang === 'ar' ? row.seller.nameAr : row.seller.nameEn}
                          </div>
                          <div className="text-[11px] text-[#8C857B]">
                            {lang === 'ar' ? row.seller.cityAr : row.seller.cityEn} · IBAN
                            *
                            {row.ibanLast4}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-bold">
                          <span
                            className={
                              row.seller.status === 'approved'
                                ? 'text-[#1B6B45]'
                                : row.seller.status === 'pending'
                                ? 'text-[#B45309]'
                                : 'text-[#9E2A2B]'
                            }
                          >
                            {row.seller.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#141413]">
                          {formatPrice(row.grossSales)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#57534E]">
                          {row.commissionRate}%
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                          {formatPrice(row.platformCommission)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#9E2A2B]">
                          {formatPrice(row.refundsTotal)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#141413]">
                          {formatPrice(row.netEarnings)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#1B6B45]">
                          {formatPrice(row.availableBalance)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#B45309]">
                          {formatPrice(row.reservedPendingPayoutAmount)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                          {formatPrice(row.requestableBalance)}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-[#57534E] whitespace-nowrap">
                          {row.seller.nextPayoutDate || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSellerId(row.seller.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[11px] font-bold text-[#141413]"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#0B4F3F]" />
                            <span>{t('كشف مالي', 'Ledger')}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 3: TREASURY QUEUE (STRUCTURED PAYOUT TICKETS)
      ======================================================================== */}
      {activeTab === 'treasury' && (
        <div className="space-y-6">
          {/* Mandatory Treasury Safety Banner */}
          <div className="p-4 rounded-2xl bg-[#141413] text-[#FAF8F5] border border-[#C59B27]/50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#C59B27] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-[#F5E6C8]">
                  {t(
                    'إتمام التحويل البنكي النهائي يتطلب تأكيداً من النظام المالي الموثوق',
                    'Final bank settlement completion requires trusted treasury/backend confirmation.'
                  )}
                </div>
                <p className="text-xs text-[#D6D0C4]">
                  {t(
                    'تقتصر إجراءات المتصفح الإنتاجي على (بدء المراجعة · الاعتماد للرفع للخزينة · الرفض وتحرير الحجز). لا يتم خصم الرصيد المتاح أو اختلاق مراجع تحويل بنكية وهمية من المتصفح.',
                    'Production browser actions are strictly scoped to (Start Review · Approve for Treasury · Reject & Release Reservation). No fake bank references or browser-side balance deductions occur.'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={exportTreasuryQueueCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C59B27] text-[#141413] text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('تصدير طابور الخزينة CSV', 'Export Treasury Queue CSV')}</span>
            </button>
          </div>

          {/* Treasury Filter Strip */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', ar: 'الكل', en: 'All Requests' },
                  { id: 'requested', ar: 'جديد (requested)', en: 'Requested' },
                  { id: 'under_review', ar: 'قيد المراجعة (under_review)', en: 'Under Review' },
                  {
                    id: 'approved_for_treasury',
                    ar: 'معتمد للخزينة (approved_for_treasury)',
                    en: 'Approved for Treasury',
                  },
                  { id: 'completed', ar: 'مكتمل (completed)', en: 'Completed' },
                  { id: 'rejected', ar: 'مرفوض (rejected)', en: 'Rejected' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setTreasuryFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    treasuryFilter === st.id
                      ? 'bg-[#0B4F3F] text-white'
                      : 'bg-[#FAF8F5] text-[#57534E] hover:bg-[#F3EFEA]'
                  }`}
                >
                  {lang === 'ar' ? st.ar : st.en}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="text"
                value={treasurySearch}
                onChange={(e) => setTreasurySearch(e.target.value)}
                placeholder={t(
                  'بحث برقم التذكرة، المتجر، أو آخر ٤ أرقام...',
                  'Search ticket #, seller, or IBAN last 4...'
                )}
                className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
          </div>

          {/* Treasury Queue Table & Action Cards */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                  <tr>
                    <th className="py-3.5 px-4 text-start font-bold">
                      {t('رقم التذكرة', 'Ticket #')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('المتجر', 'Seller')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('مبلغ التسوية', 'Payout Amount')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('آخر ٤ أرقام آيبان', 'IBAN Last 4')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('تاريخ الطلب', 'Created Date')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('حالة الخزينة', 'Treasury Status')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('المبلغ المحجوز', 'Reserved Amount')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('الرصيد المتاح للتاجر', 'Seller Available')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('القابل للطلب للتاجر', 'Seller Requestable')}
                    </th>
                    <th className="py-3.5 px-4 text-end font-bold">
                      {t('إجراءات الخزينة', 'Treasury Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFEA]">
                  {filteredTreasuryQueue.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-[#8C857B]">
                        {t(
                          'لا توجد طلبات تسوية في طابور الخزينة مطابقة للفلتر',
                          'No payout tickets in Treasury Queue match the current filter'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTreasuryQueue.map((item) => {
                      const noteVal = treasuryNotes[item.ticket.id] ?? '';
                      return (
                        <tr key={item.ticket.id} className="hover:bg-[#FAF8F5]/70">
                          <td className="py-4 px-4 font-mono font-bold text-[#0B4F3F] whitespace-nowrap">
                            #{item.ticket.ticketNumber}
                          </td>
                          <td className="py-4 px-3">
                            <div className="font-bold text-[#141413]">
                              {item.seller
                                ? lang === 'ar'
                                  ? item.seller.nameAr
                                  : item.seller.nameEn
                                : item.ticket.userName}
                            </div>
                            <div className="text-[11px] text-[#8C857B] font-mono">
                              ID: {item.seller?.id || item.ticket.sellerId}
                            </div>
                          </td>
                          <td className="py-4 px-3 text-end font-mono tabular-nums font-bold text-[#141413]">
                            {formatPrice(item.payoutAmount)}
                          </td>
                          <td className="py-4 px-3 font-mono text-[11px] text-[#141413] whitespace-nowrap">
                            SA•• •••• {item.ibanLast4}
                          </td>
                          <td className="py-4 px-3 font-mono text-[11px] text-[#57534E] whitespace-nowrap">
                            {item.ticket.createdAt}
                          </td>
                          <td className="py-4 px-3 whitespace-nowrap">
                            <span
                              className={`font-mono font-bold text-[11px] ${
                                item.treasuryStatus === 'approved_for_treasury'
                                  ? 'text-[#0B4F3F]'
                                  : item.treasuryStatus === 'under_review'
                                  ? 'text-[#B45309]'
                                  : item.treasuryStatus === 'rejected'
                                  ? 'text-[#9E2A2B]'
                                  : item.treasuryStatus === 'completed'
                                  ? 'text-[#1B6B45]'
                                  : 'text-[#141413]'
                              }`}
                            >
                              {item.treasuryStatus}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-end font-mono tabular-nums font-bold text-[#B45309]">
                            {formatPrice(item.reservedByThisTicket)}
                          </td>
                          <td className="py-4 px-3 text-end font-mono tabular-nums text-[#141413]">
                            {formatPrice(item.sellerAvailableBalance)}
                          </td>
                          <td className="py-4 px-3 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                            {formatPrice(item.sellerRequestableBalance)}
                          </td>
                          <td className="py-4 px-4 text-end">
                            <div className="flex flex-col items-end gap-2 min-w-[240px]">
                              <input
                                type="text"
                                value={noteVal}
                                onChange={(e) =>
                                  setTreasuryNotes((prev) => ({
                                    ...prev,
                                    [item.ticket.id]: e.target.value,
                                  }))
                                }
                                placeholder={t(
                                  'ملاحظة مراجعة الخزينة (اختياري)...',
                                  'Treasury audit note (optional)...'
                                )}
                                className="w-full px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-[11px]"
                              />
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePayoutTreasuryStatus(
                                      item.ticket.id,
                                      'under_review',
                                      noteVal
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#B45309] text-[11px] font-bold text-[#B45309]"
                                >
                                  {t('بدء المراجعة', 'Start Review')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePayoutTreasuryStatus(
                                      item.ticket.id,
                                      'approved_for_treasury',
                                      noteVal
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#0B4F3F] text-white text-[11px] font-bold hover:bg-[#083D30]"
                                >
                                  {t('اعتماد للخزينة', 'Approve for Treasury')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updatePayoutTreasuryStatus(
                                      item.ticket.id,
                                      'rejected',
                                      noteVal
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-[#9E2A2B]/40 text-[#9E2A2B] text-[11px] font-bold hover:bg-red-50"
                                >
                                  {t('رفض', 'Reject')}
                                </button>
                                {isDemoMode && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updatePayoutTreasuryStatus(
                                        item.ticket.id,
                                        'completed',
                                        noteVal ||
                                          t(
                                            'محاكاة اكتمال دفتري محلي (بيئة العرض التجريبي فقط)',
                                            'Local Demo Simulation: Completed in ledger'
                                          )
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-[#FBF7EC] border border-[#C59B27] text-[#141413] text-[10px] font-bold"
                                  >
                                    {t('محاكاة اكتمال (Demo)', 'Simulate Completed (Demo)')}
                                  </button>
                                )}
                              </div>
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
        </div>
      )}

      {/* ========================================================================
          TAB 4: REFUND EXPOSURE DASHBOARD
      ======================================================================== */}
      {activeTab === 'refunds' && (
        <div className="space-y-6">
          {/* 4 Refund Exposure KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t(
                  'استردادات المحفظة المكتملة (wallet_completed)',
                  'Wallet Refunds Completed'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
                {formatPrice(executiveKpis.walletRefundsCompletedAmount)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {executiveKpis.walletRefundsCompletedCount}{' '}
                {t('عملية مكتملة دفترياً', 'completed wallet credits')}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#9E2A2B]/40 p-4 shadow-xs">
              <div className="text-xs font-bold text-[#9E2A2B]">
                {t(
                  'التزام الاسترداد الخارجي المعلق (External Liability)',
                  'External Refund Liability (Pending)'
                )}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#9E2A2B] mt-1">
                {formatPrice(executiveKpis.externalRefundsPendingAmount)}
              </div>
              <div className="text-[11px] text-[#9E2A2B] font-semibold mt-1">
                {executiveKpis.externalRefundsPendingCount} ·{' '}
                {t(
                  'بانتظار تسوية بوابة الدفع (Awaiting Gateway Settlement)',
                  'Awaiting Payment Gateway Settlement'
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t('حالات الاسترداد المتعثرة (failed)', 'Failed Refund Cases')}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#B45309] mt-1">
                {formatPrice(executiveKpis.failedRefundsAmount)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {executiveKpis.failedRefundsCount}{' '}
                {t('حالة تتطلب معالجة بديلة', 'cases requiring fallback resolution')}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 shadow-xs">
              <div className="text-xs text-[#8C857B]">
                {t('مرتجعات بانتظار القرار (none)', 'Pending Return Decisions')}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
                {formatPrice(executiveKpis.pendingDecisionReturnsAmount)}
              </div>
              <div className="text-[11px] text-[#57534E] mt-1">
                {executiveKpis.pendingDecisionReturnsCount}{' '}
                {t('مطالبة مفتوحة للفحص', 'open claims awaiting adjudication')}
              </div>
            </div>
          </div>

          {/* Group Filter & Export */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', ar: 'جميع حالات الاسترداد', en: 'All Refund States' },
                  {
                    id: 'wallet_completed',
                    ar: 'مكتمل للمحفظة (wallet_completed)',
                    en: 'Wallet Completed',
                  },
                  {
                    id: 'external_authorized_pending',
                    ar: 'بانتظار تسوية البوابة (external_authorized_pending)',
                    en: 'External Authorized Pending',
                  },
                  { id: 'failed', ar: 'متعثر (failed)', en: 'Failed' },
                  { id: 'none', ar: 'بانتظار القرار (none)', en: 'None / Pending Decision' },
                ] as const
              ).map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setRefundGroupFilter(grp.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    refundGroupFilter === grp.id
                      ? 'bg-[#0B4F3F] text-white'
                      : 'bg-[#FAF8F5] text-[#57534E] hover:bg-[#F3EFEA]'
                  }`}
                >
                  {lang === 'ar' ? grp.ar : grp.en}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={exportRefundExposureCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5 text-[#C59B27]" />
              <span>{t('تصدير التعرض للمرتجعات CSV', 'Export Refund Exposure CSV')}</span>
            </button>
          </div>

          {/* Refund Exposure Table */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                  <tr>
                    <th className="py-3.5 px-4 text-start font-bold">
                      {t('الطلب', 'Order')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('العميل', 'Customer')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('المتاجر المعنية', 'Sellers')}
                    </th>
                    <th className="py-3.5 px-3 text-end font-bold">
                      {t('مبلغ الاسترداد', 'Refund Amount')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('وسيلة الدفع الأصلية', 'Original Payment')}
                    </th>
                    <th className="py-3.5 px-3 text-start font-bold">
                      {t('حالة الاسترداد', 'Refund State')}
                    </th>
                    <th className="py-3.5 px-4 text-end font-bold">
                      {t('عمر المطالبة', 'Age')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFEA]">
                  {refundExposureRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#8C857B]">
                        {t(
                          'لا توجد مطالبات استرداد ضمن هذه المجموعة',
                          'No refund exposure cases in this group'
                        )}
                      </td>
                    </tr>
                  ) : (
                    refundExposureRows.map((row) => {
                      const sellerNames = Array.from(
                        new Set(
                          row.order.items.map((it) =>
                            lang === 'ar' ? it.sellerNameAr : it.sellerNameEn
                          )
                        )
                      ).join(' · ');
                      return (
                        <tr key={row.order.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                            {row.order.orderNumber}
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-[#141413]">
                            {row.order.customerName}
                          </td>
                          <td className="py-3.5 px-3 text-[#57534E]">{sellerNames}</td>
                          <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#9E2A2B]">
                            {formatPrice(row.refundAmount)}
                          </td>
                          <td className="py-3.5 px-3 font-mono uppercase text-[11px] text-[#57534E]">
                            {row.order.paymentMethod} →{' '}
                            {row.order.returnRequest?.refundMethod || 'wallet'}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-mono font-bold text-[11px]">
                              {row.refundStatus}
                            </div>
                            {row.refundStatus === 'external_authorized_pending' && (
                              <div className="text-[11px] font-bold text-[#9E2A2B]">
                                {t(
                                  'بانتظار تسوية بوابة الدفع (Awaiting Payment Gateway Settlement)',
                                  'Awaiting Payment Gateway Settlement'
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-end font-mono text-[11px] text-[#57534E]">
                            {row.ageDays} {t('يوم', 'days')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 5: REVENUE & COMMISSION BREAKDOWN
      ======================================================================== */}
      {activeTab === 'commission' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3EFEA] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    'تحليل إيرادات وعمولات منصة أثيل حسب المتجر',
                    'Platform Commission & Net Revenue Breakdown by Merchant'
                  )}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {t(
                    'تُحتسب إيرادات عمولة المنصة بناءً على نسبة العمولة التعاقدية لكل متجر وليس إجمالي GMV.',
                    'Platform Commission Revenue is strictly derived from each seller’s contractual commissionRate, never raw GMV.'
                  )}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                  <tr>
                    <th className="py-3 px-4 text-start font-bold">
                      {t('المتجر', 'Seller')}
                    </th>
                    <th className="py-3 px-3 text-end font-bold">
                      {t('إجمالي مبيعات المتجر', 'Gross Seller Sales')}
                    </th>
                    <th className="py-3 px-3 text-end font-bold">
                      {t('نسبة العمولة التعاقدية', 'Commission Rate')}
                    </th>
                    <th className="py-3 px-3 text-end font-bold">
                      {t('عمولة المنصة الإجمالية', 'Gross Platform Comm.')}
                    </th>
                    <th className="py-3 px-3 text-end font-bold">
                      {t('أثر المرتجعات على العمولة', 'Refund Comm. Impact')}
                    </th>
                    <th className="py-3 px-4 text-end font-bold">
                      {t('صافي عمولة المنصة', 'Net Platform Comm.')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFEA]">
                  {sellerFinancialRows.map((row) => {
                    const refundCommImpact = Number(
                      ((row.refundsTotal * row.commissionRate) / 100).toFixed(2)
                    );
                    const netComm = Math.max(
                      0,
                      Number((row.platformCommission - refundCommImpact).toFixed(2))
                    );
                    return (
                      <tr key={row.seller.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3.5 px-4 font-bold text-[#141413]">
                          {lang === 'ar' ? row.seller.nameAr : row.seller.nameEn}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums">
                          {formatPrice(row.grossSales)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                          {row.commissionRate}%
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#141413]">
                          {formatPrice(row.platformCommission)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#9E2A2B]">
                          -{formatPrice(refundCommImpact)}
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                          {formatPrice(netComm)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 6: FINANCIAL RECONCILIATION (READ-ONLY)
      ======================================================================== */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    'مساحة المطابقة المالية الشاملة (Financial Reconciliation Workspace)',
                    'Read-Only Financial Reconciliation Workspace'
                  )}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {t(
                    'مطابقة رقابية للقراءة فقط حسب الطلب، التاجر، وسيلة الدفع، وحالة الاسترداد مع احتساب ضريبة القيمة المضافة المضمّنة (× 15 / 115).',
                    'Read-focused reconciliation across orders, sellers, payment methods, and refund states using VAT-inclusive (× 15 / 115) derivation.'
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={exportOrderReconciliationCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 text-[#C59B27]" />
                <span>
                  {t('تصدير المطابقة المالية CSV', 'Export Order Reconciliation CSV')}
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F3EFEA]">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'by_order', ar: 'حسب الطلب (By Order)', en: 'By Order' },
                    { id: 'by_seller', ar: 'حسب التاجر (By Seller)', en: 'By Seller' },
                    {
                      id: 'by_payment',
                      ar: 'حسب وسيلة الدفع (By Payment Method)',
                      en: 'By Payment Method',
                    },
                    {
                      id: 'by_refund',
                      ar: 'حسب حالة الاسترداد (By Refund State)',
                      en: 'By Refund State',
                    },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setReconView(mode.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      reconView === mode.id
                        ? 'bg-[#0B4F3F] text-white'
                        : 'bg-[#FAF8F5] text-[#57534E] hover:bg-[#F3EFEA]'
                    }`}
                  >
                    {lang === 'ar' ? mode.ar : mode.en}
                  </button>
                ))}
              </div>

              {reconView === 'by_order' && (
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3" />
                  <input
                    type="text"
                    value={reconSearch}
                    onChange={(e) => setReconSearch(e.target.value)}
                    placeholder={t(
                      'بحث برقم الطلب أو اسم العميل...',
                      'Search order # or customer...'
                    )}
                    className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {reconView === 'by_order' && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                    <tr>
                      <th className="py-3.5 px-4 text-start font-bold">
                        {t('رقم الطلب', 'Order #')}
                      </th>
                      <th className="py-3.5 px-3 text-start font-bold">
                        {t('وسيلة الدفع', 'Payment')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('إجمالي الطلب', 'Gross Order Total')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('الخصم', 'Discount')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('الشحن', 'Shipping')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('الضريبة المضمّنة ١٥٪', 'VAT Included')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('إجمالي السلع للتاجر', 'Seller Gross Value')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('عمولة المنصة', 'Commission')}
                      </th>
                      <th className="py-3.5 px-4 text-end font-bold">
                        {t('التعرض للاسترداد', 'Refund Exposure')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA]">
                    {filteredReconOrders.map((r) => (
                      <tr key={r.order.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                          <div>{r.order.orderNumber}</div>
                          <div className="text-[10px] text-[#8C857B]">
                            {r.order.createdAt.slice(0, 10)} · {r.order.status}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-mono uppercase text-[11px] text-[#57534E]">
                          {r.order.paymentMethod}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#141413]">
                          {formatPrice(r.grossOrderTotal)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#57534E]">
                          {formatPrice(r.discount)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#57534E]">
                          {formatPrice(r.shipping)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#57534E]">
                          {formatPrice(r.vatIncluded)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#141413]">
                          {formatPrice(r.sellerGrossValue)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                          {formatPrice(r.orderCommission)}
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono tabular-nums font-bold text-[#9E2A2B]">
                          {formatPrice(r.refundAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reconView === 'by_seller' && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                    <tr>
                      <th className="py-3.5 px-4 text-start font-bold">
                        {t('المتجر', 'Seller')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('إجمالي المبيعات', 'Gross Sales')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('الضريبة المضمّنة (١٥/١١٥)', 'Included VAT (15/115)')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('العمولة', 'Commission')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('المرتجعات', 'Refunds')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('صافي الأرباح', 'Net Earnings')}
                      </th>
                      <th className="py-3.5 px-4 text-end font-bold">
                        {t('الرصيد القابل للطلب', 'Requestable Balance')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA]">
                    {sellerFinancialRows.map((row) => (
                      <tr key={row.seller.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3.5 px-4 font-bold text-[#141413]">
                          {lang === 'ar' ? row.seller.nameAr : row.seller.nameEn}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold">
                          {formatPrice(row.grossSales)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#57534E]">
                          {formatPrice(extractIncludedVat(row.grossSales))}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#0B4F3F] font-bold">
                          {formatPrice(row.platformCommission)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#9E2A2B]">
                          {formatPrice(row.refundsTotal)}
                        </td>
                        <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold">
                          {formatPrice(row.netEarnings)}
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                          {formatPrice(row.requestableBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reconView === 'by_payment' && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                    <tr>
                      <th className="py-3.5 px-4 text-start font-bold">
                        {t('وسيلة الدفع', 'Payment Method')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('عدد الطلبات', 'Orders Count')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('إجمالي قيمة الطلبات', 'Gross Order Total')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('الضريبة المضمّنة', 'Included VAT')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('عمولة المنصة', 'Platform Commission')}
                      </th>
                      <th className="py-3.5 px-4 text-end font-bold">
                        {t('التعرض للاسترداد', 'Refund Exposure')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA]">
                    {(
                      [
                        'mada',
                        'apple_pay',
                        'visa_mastercard',
                        'stc_pay',
                        'wallet',
                        'cod',
                      ] as const
                    ).map((pm) => {
                      const rows = orderReconciliationRows.filter(
                        (r) => r.order.paymentMethod === pm
                      );
                      const gross = rows.reduce((s, r) => s + r.grossOrderTotal, 0);
                      const vat = rows.reduce((s, r) => s + r.vatIncluded, 0);
                      const comm = rows.reduce((s, r) => s + r.orderCommission, 0);
                      const ref = rows.reduce((s, r) => s + r.refundAmount, 0);
                      return (
                        <tr key={pm} className="hover:bg-[#FAF8F5]">
                          <td className="py-3.5 px-4 font-mono uppercase font-bold text-[#141413]">
                            {pm}
                          </td>
                          <td className="py-3.5 px-3 text-end font-mono tabular-nums">
                            {rows.length}
                          </td>
                          <td className="py-3.5 px-3 text-end font-mono tabular-nums font-bold">
                            {formatPrice(gross)}
                          </td>
                          <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#57534E]">
                            {formatPrice(vat)}
                          </td>
                          <td className="py-3.5 px-3 text-end font-mono tabular-nums text-[#0B4F3F] font-bold">
                            {formatPrice(comm)}
                          </td>
                          <td className="py-3.5 px-4 text-end font-mono tabular-nums text-[#9E2A2B]">
                            {formatPrice(ref)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reconView === 'by_refund' && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                    <tr>
                      <th className="py-3.5 px-4 text-start font-bold">
                        {t('حالة الاسترداد (Refund State)', 'Refund State')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('عدد الطلبات', 'Orders Count')}
                      </th>
                      <th className="py-3.5 px-3 text-end font-bold">
                        {t('إجمالي قيمة الطلبات', 'Gross Order Total')}
                      </th>
                      <th className="py-3.5 px-4 text-end font-bold">
                        {t('إجمالي مبلغ الاسترداد', 'Total Refund Exposure')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA]">
                    {(
                      [
                        'wallet_completed',
                        'external_authorized_pending',
                        'failed',
                        'none',
                      ] as const
                    ).map((st) => {
                      const rows = orderReconciliationRows.filter(
                        (r) => r.hasReturn && r.refundStatus === st
                      );
                      const gross = rows.reduce((s, r) => s + r.grossOrderTotal, 0);
                      const ref = rows.reduce((s, r) => s + r.refundAmount, 0);
                      return (
                        <tr key={st} className="hover:bg-[#FAF8F5]">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#141413]">
                            {st}
                            {st === 'external_authorized_pending' && (
                              <span className="ms-2 text-[11px] text-[#9E2A2B]">
                                ({t('التزام معلق', 'Awaiting Gateway Settlement')})
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-end font-mono tabular-nums">
                            {rows.length}
                          </td>
                          <td className="py-3.5 px-3 text-end font-mono tabular-nums">
                            {formatPrice(gross)}
                          </td>
                          <td className="py-3.5 px-4 text-end font-mono tabular-nums font-bold text-[#9E2A2B]">
                            {formatPrice(ref)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================
          MODAL: SELLER FINANCIAL DETAIL DOSSIER (SECTION 6)
      ======================================================================== */}
      {selectedSellerDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D6] pb-4">
              <div>
                <div className="text-xs font-mono uppercase text-[#0B4F3F] font-bold">
                  {t(
                    'كشف الحساب المالي التفصيلي للتاجر',
                    'MERCHANT FINANCIAL LEDGER & PAYOUT DOSSIER'
                  )}
                </div>
                <h3 className="text-xl font-bold text-[#141413] mt-1">
                  {lang === 'ar'
                    ? selectedSellerDetail.seller.nameAr
                    : selectedSellerDetail.seller.nameEn}
                </h3>
                <div className="text-xs text-[#57534E] mt-0.5 font-mono">
                  ID: {selectedSellerDetail.seller.id} ·{' '}
                  {lang === 'ar'
                    ? selectedSellerDetail.seller.cityAr
                    : selectedSellerDetail.seller.cityEn}{' '}
                  · {t('الآيبان المحمي:', 'Masked IBAN:')} SA•• •••• •••• •••• ••••{' '}
                  {selectedSellerDetail.ibanLast4}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSellerId(null)}
                className="p-2 rounded-lg text-[#8C857B] hover:text-[#141413] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seller Financial Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                <div className="text-[11px] text-[#8C857B]">
                  {t('نسبة العمولة', 'Commission Rate')}
                </div>
                <div className="text-base font-bold font-mono text-[#0B4F3F] mt-1">
                  {selectedSellerDetail.commissionRate}%
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                <div className="text-[11px] text-[#8C857B]">
                  {t('إجمالي المبيعات', 'Gross Sales')}
                </div>
                <div className="text-base font-bold font-mono text-[#141413] mt-1">
                  {formatPrice(selectedSellerDetail.grossSales)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                <div className="text-[11px] text-[#8C857B]">
                  {t('المرتجعات', 'Refunds')}
                </div>
                <div className="text-base font-bold font-mono text-[#9E2A2B] mt-1">
                  {formatPrice(selectedSellerDetail.refundsTotal)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                <div className="text-[11px] text-[#8C857B]">
                  {t('صافي الأرباح', 'Net Earnings')}
                </div>
                <div className="text-base font-bold font-mono text-[#141413] mt-1">
                  {formatPrice(selectedSellerDetail.netEarnings)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                <div className="text-[11px] text-[#8C857B]">
                  {t('الرصيد المتاح', 'Available Balance')}
                </div>
                <div className="text-base font-bold font-mono text-[#1B6B45] mt-1">
                  {formatPrice(selectedSellerDetail.availableBalance)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6]">
                <div className="text-[11px] text-[#8C857B]">
                  {t('المحجوز للصرف', 'Reserved Payouts')}
                </div>
                <div className="text-base font-bold font-mono text-[#B45309] mt-1">
                  {formatPrice(selectedSellerDetail.reservedPendingPayoutAmount)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#EBF3F0] border border-[#0B4F3F]/30">
                <div className="text-[11px] font-bold text-[#0B4F3F]">
                  {t('القابل للطلب', 'Requestable Bal.')}
                </div>
                <div className="text-base font-bold font-mono text-[#0B4F3F] mt-1">
                  {formatPrice(selectedSellerDetail.requestableBalance)}
                </div>
              </div>
            </div>

            {/* Payout History & Current Payout Tickets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-3 text-xs">
                <div className="font-bold text-[#141413]">
                  {t('سجل التحويلات والدفعات السابقة (Payout History)', 'Historical Payouts')}
                </div>
                {selectedSellerDetail.seller.payoutHistory.length === 0 ? (
                  <p className="text-[#8C857B]">
                    {t('لا توجد دفعات سابقة مسجلة', 'No historical payouts recorded')}
                  </p>
                ) : (
                  <div className="divide-y divide-[#E6E0D6]">
                    {selectedSellerDetail.seller.payoutHistory.map((ph) => (
                      <div key={ph.id} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[#141413]">
                            {lang === 'ar' ? ph.bankNameAr : ph.bankNameEn} (*{ph.ibanLast4})
                          </div>
                          <div className="font-mono text-[11px] text-[#8C857B]">
                            {ph.date} · #{ph.id}
                          </div>
                        </div>
                        <div className="text-end font-mono">
                          <div className="font-bold text-[#0B4F3F]">
                            {formatPrice(ph.amount)}
                          </div>
                          <div className="text-[10px] uppercase text-[#57534E]">
                            {ph.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-3 text-xs">
                <div className="font-bold text-[#141413]">
                  {t(
                    'تذاكر تسوية الخزينة الحالية (Current Payout Tickets)',
                    'Current Payout Tickets'
                  )}
                </div>
                {selectedSellerDetail.sellerTickets.length === 0 ? (
                  <p className="text-[#8C857B]">
                    {t('لا توجد تذاكر تسوية حالية لهذا المتجر', 'No payout tickets for this seller')}
                  </p>
                ) : (
                  <div className="divide-y divide-[#E6E0D6]">
                    {selectedSellerDetail.sellerTickets.map((pt) => (
                      <div
                        key={pt.ticket.id}
                        className="py-2 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-[#0B4F3F]">
                            #{pt.ticket.ticketNumber} · *{pt.ibanLast4}
                          </div>
                          <div className="text-[11px] text-[#57534E]">
                            {pt.ticket.createdAt} · {pt.treasuryStatus}
                          </div>
                        </div>
                        <div className="text-end font-mono">
                          <div className="font-bold text-[#141413]">
                            {formatPrice(pt.payoutAmount)}
                          </div>
                          <div className="text-[10px] text-[#B45309]">
                            {t('المحجوز:', 'Reserved:')}{' '}
                            {formatPrice(pt.reservedByThisTicket)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order-Level Financial Ledger (VAT-inclusive 15 / 115) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-[#141413]">
                  {t(
                    'دفتر الأستاذ المالي على مستوى الطلبات (Order-Level Financial Ledger)',
                    'Order-Level Financial Ledger (VAT-Inclusive: VAT = Gross × 15 / 115)'
                  )}
                </h4>
                <span className="text-[11px] text-[#57534E] font-mono">
                  {t(
                    'ضريبة القيمة المضافة مضمّنة (× 15 / 115) ولا تُضاف مرة ثانية',
                    'Included VAT = Seller Gross × 15 / 115 (never added twice)'
                  )}
                </span>
              </div>

              <div className="rounded-xl border border-[#E6E0D6] overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6]">
                    <tr>
                      <th className="py-3 px-3 text-start font-bold">
                        {t('رقم الطلب', 'Order #')}
                      </th>
                      <th className="py-3 px-3 text-start font-bold">
                        {t('التاريخ', 'Date')}
                      </th>
                      <th className="py-3 px-3 text-start font-bold">
                        {t('قطع التاجر', 'Seller Items')}
                      </th>
                      <th className="py-3 px-3 text-end font-bold">
                        {t('إجمالي التاجر', 'Seller Gross')}
                      </th>
                      <th className="py-3 px-3 text-end font-bold">
                        {t('حصة الضريبة (١٥/١١٥)', 'VAT Portion')}
                      </th>
                      <th className="py-3 px-3 text-end font-bold">
                        {t('العمولة', 'Commission')}
                      </th>
                      <th className="py-3 px-3 text-end font-bold">
                        {t('أثر المرتجع', 'Refund Impact')}
                      </th>
                      <th className="py-3 px-3 text-end font-bold">
                        {t('صافي التاجر', 'Net Merchant Amount')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFEA]">
                    {selectedSellerDetail.sellerOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#8C857B]">
                          {t(
                            'لا توجد طلبات مسجلة لهذا المتجر في السجل الحالي',
                            'No order lines recorded for this seller in the current dataset'
                          )}
                        </td>
                      </tr>
                    ) : (
                      selectedSellerDetail.sellerOrders.map((entry) => (
                        <tr key={entry.order.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 px-3 font-mono font-bold text-[#141413]">
                            {entry.order.orderNumber}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#57534E]">
                            {entry.order.createdAt.slice(0, 10)}
                          </td>
                          <td className="py-3 px-3 text-[#141413]">
                            {entry.sellerItems.map((it) => (
                              <div key={it.productId} className="line-clamp-1">
                                {it.quantity}× {lang === 'ar' ? it.titleAr : it.titleEn}
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-3 text-end font-mono tabular-nums font-bold">
                            {formatPrice(entry.sellerGross)}
                          </td>
                          <td className="py-3 px-3 text-end font-mono tabular-nums text-[#57534E]">
                            {formatPrice(entry.vatPortion)}
                          </td>
                          <td className="py-3 px-3 text-end font-mono tabular-nums text-[#0B4F3F]">
                            {formatPrice(entry.commission)}
                          </td>
                          <td className="py-3 px-3 text-end font-mono tabular-nums text-[#9E2A2B]">
                            {formatPrice(entry.refundImpact)}
                          </td>
                          <td className="py-3 px-3 text-end font-mono tabular-nums font-bold text-[#0B4F3F]">
                            {formatPrice(entry.netMerchantAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E6E0D6]">
              <button
                type="button"
                onClick={() => setSelectedSellerId(null)}
                className="px-5 py-2 rounded-xl bg-[#141413] text-white text-xs font-bold"
              >
                {t('إغلاق الكشف المالي', 'Close Financial Dossier')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
