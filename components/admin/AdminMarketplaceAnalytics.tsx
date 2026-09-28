'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Layers,
  Store,
  Package,
  MapPin,
  Activity,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Star,
  CreditCard,
  Users,
  ShoppingBag,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { calculateSellerPayoutReservation } from '@/lib/types';
import {
  safeNumber,
  safeDivide,
  extractIncludedVat,
  downloadCsvFile,
} from '@/lib/utils';

type AnalyticsDateRange = '7d' | '30d' | '90d' | '12m' | 'all';
type AnalyticsTabId =
  | 'gmv_revenue'
  | 'categories'
  | 'sellers'
  | 'catalog'
  | 'customers_geo'
  | 'operations_sla';

export default function AdminMarketplaceAnalytics() {
  const {
    lang,
    t,
    formatPrice,
    orders,
    products,
    sellers,
    users,
    tickets,
    categories,
    reviews,
    questions,
  } = useMarketplace();

  const [dateRange, setDateRange] = useState<AnalyticsDateRange>('all');
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('gmv_revenue');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Deterministic reference anchor date from latest order or 2026-09-28
  const referenceTimestamp = useMemo(() => {
    const timestamps = orders
      .map((o) => new Date(o.createdAt.replace(' ', 'T')).getTime())
      .filter((ts) => Number.isFinite(ts));
    const fallback = new Date('2026-09-28T23:59:59Z').getTime();
    if (timestamps.length === 0) return fallback;
    return Math.max(...timestamps, fallback);
  }, [orders]);

  // Available cities across orders & sellers
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.shippingAddress?.city) set.add(o.shippingAddress.city);
    });
    sellers.forEach((s) => {
      if (s.cityAr) set.add(s.cityAr);
    });
    return Array.from(set);
  }, [orders, sellers]);

  // Filtered orders by selected date range & city filter
  const filteredOrders = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const windowMs =
      dateRange === '7d'
        ? 7 * dayMs
        : dateRange === '30d'
        ? 30 * dayMs
        : dateRange === '90d'
        ? 90 * dayMs
        : dateRange === '12m'
        ? 365 * dayMs
        : Infinity;

    return orders.filter((order) => {
      if (selectedCityFilter !== 'all') {
        const orderCity = order.shippingAddress?.city || '';
        if (orderCity !== selectedCityFilter) return false;
      }
      if (windowMs === Infinity) return true;
      const orderTs = new Date(order.createdAt.replace(' ', 'T')).getTime();
      if (!Number.isFinite(orderTs)) return true;
      return referenceTimestamp - orderTs <= windowMs;
    });
  }, [orders, dateRange, selectedCityFilter, referenceTimestamp]);

  // ============================================================================
  // 1. GMV & REVENUE INTELLIGENCE METRICS
  // ============================================================================
  const gmvRevenueStats = useMemo(() => {
    let grossGmv = 0;
    let cancelledGmv = 0;
    let refundedAmount = 0;
    let netGmv = 0;
    let estimatedCommissionRevenue = 0;
    let paidOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let refundedOrdersCount = 0;
    let totalUnitsSold = 0;

    filteredOrders.forEach((order) => {
      const total = safeNumber(order.total);
      grossGmv += total;

      const unitsInOrder = order.items.reduce(
        (sum, item) => sum + safeNumber(item.quantity, 1),
        0
      );
      totalUnitsSold += unitsInOrder;

      // Calculate commission from items based on seller commissionRate
      const orderCommission = order.items.reduce((sum, item) => {
        const lineTotal =
          safeNumber(item.product?.price) * safeNumber(item.quantity, 1);
        const sellerObj = sellers.find((s) => s.id === item.product?.sellerId);
        const rate = safeNumber(sellerObj?.commissionRate, 12);
        return sum + (lineTotal * rate) / 100;
      }, 0);

      const isCancelled = order.status === 'cancelled';
      const isRefunded =
        order.paymentStatus === 'refunded' ||
        order.returnRequest?.status === 'refunded' ||
        order.returnRequest?.refundStatus === 'wallet_completed' ||
        order.returnRequest?.refundStatus === 'external_authorized_pending';

      if (isCancelled) {
        cancelledOrdersCount += 1;
        cancelledGmv += total;
      } else if (isRefunded) {
        refundedOrdersCount += 1;
        const refAmt = safeNumber(order.returnRequest?.refundAmount, total);
        refundedAmount += refAmt;
        netGmv += Math.max(0, total - refAmt);
      } else {
        netGmv += total;
        estimatedCommissionRevenue += orderCommission;
        if (order.paymentStatus === 'paid') {
          paidOrdersCount += 1;
        } else {
          pendingOrdersCount += 1;
        }
      }
    });

    // If looking at All Time with no city filter, also surface ledger-verified commission
    const ledgerCommissionTotal = sellers.reduce(
      (sum, s) => sum + safeNumber(s.platformCommission),
      0
    );
    const ledgerGrossSalesTotal = sellers.reduce(
      (sum, s) => sum + safeNumber(s.grossSales),
      0
    );

    const effectiveCommissionRevenue =
      dateRange === 'all' && selectedCityFilter === 'all' && ledgerCommissionTotal > 0
        ? ledgerCommissionTotal
        : Math.round(estimatedCommissionRevenue * 100) / 100;

    const aov = safeDivide(grossGmv, filteredOrders.length);
    const netVat = extractIncludedVat(netGmv);

    // Group orders by month/period for visual trend bars
    const periodMap = new Map<
      string,
      { period: string; grossGmv: number; netGmv: number; ordersCount: number }
    >();

    filteredOrders.forEach((o) => {
      const periodKey = o.createdAt.slice(0, 7); // YYYY-MM
      const curr = periodMap.get(periodKey) || {
        period: periodKey,
        grossGmv: 0,
        netGmv: 0,
        ordersCount: 0,
      };
      const total = safeNumber(o.total);
      const isCancelled = o.status === 'cancelled';
      const isRef =
        o.paymentStatus === 'refunded' || o.returnRequest?.status === 'refunded';
      const refAmt = isRef
        ? safeNumber(o.returnRequest?.refundAmount, total)
        : 0;

      curr.grossGmv += total;
      if (!isCancelled) {
        curr.netGmv += Math.max(0, total - refAmt);
      }
      curr.ordersCount += 1;
      periodMap.set(periodKey, curr);
    });

    const periodSeries = Array.from(periodMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    return {
      grossGmv,
      cancelledGmv,
      refundedAmount,
      netGmv,
      effectiveCommissionRevenue,
      estimatedCommissionRevenue,
      ledgerCommissionTotal,
      ledgerGrossSalesTotal,
      aov,
      netVat,
      ordersCount: filteredOrders.length,
      paidOrdersCount,
      pendingOrdersCount,
      cancelledOrdersCount,
      refundedOrdersCount,
      totalUnitsSold,
      periodSeries,
    };
  }, [filteredOrders, sellers, dateRange, selectedCityFilter]);

  // ============================================================================
  // 2. CATEGORY PERFORMANCE METRICS
  // ============================================================================
  const categoryStats = useMemo(() => {
    const totalOrderItemGmv = filteredOrders.reduce((sum, order) => {
      if (order.status === 'cancelled') return sum;
      return (
        sum +
        order.items.reduce(
          (lSum, item) =>
            lSum +
            safeNumber(item.product?.price) * safeNumber(item.quantity, 1),
          0
        )
      );
    }, 0);

    return categories
      .map((cat) => {
        const catProducts = products.filter((p) => p.categoryId === cat.id);
        const activeProductsCount = catProducts.filter(
          (p) => (p.status ?? 'active') === 'active'
        ).length;

        let unitsSold = 0;
        let categoryGmv = 0;
        let orderAppearances = 0;
        let returnedAppearances = 0;

        filteredOrders.forEach((order) => {
          const matchingItems = order.items.filter(
            (i) => i.product?.categoryId === cat.id
          );
          if (matchingItems.length > 0) {
            orderAppearances += 1;
            if (
              order.status === 'returned' ||
              Boolean(order.returnRequest) ||
              order.paymentStatus === 'refunded'
            ) {
              returnedAppearances += 1;
            }
            if (order.status !== 'cancelled') {
              matchingItems.forEach((item) => {
                const qty = safeNumber(item.quantity, 1);
                unitsSold += qty;
                categoryGmv += safeNumber(item.product?.price) * qty;
              });
            }
          }
        });

        const gmvSharePercent =
          safeDivide(categoryGmv, totalOrderItemGmv) * 100;
        const returnRatePercent =
          safeDivide(returnedAppearances, orderAppearances) * 100;
        const avgRating =
          catProducts.length > 0
            ? safeDivide(
                catProducts.reduce((s, p) => s + safeNumber(p.rating), 0),
                catProducts.length
              )
            : 0;

        return {
          id: cat.id,
          nameAr: cat.nameAr,
          nameEn: cat.nameEn,
          totalProducts: catProducts.length,
          activeProductsCount,
          unitsSold,
          categoryGmv,
          gmvSharePercent,
          returnRatePercent,
          avgRating,
        };
      })
      .sort((a, b) => b.categoryGmv - a.categoryGmv);
  }, [categories, products, filteredOrders]);

  // ============================================================================
  // 3. SELLER PERFORMANCE METRICS
  // ============================================================================
  const sellerPerformanceRows = useMemo(() => {
    return sellers
      .map((seller) => {
        const sellerProducts = products.filter((p) => p.sellerId === seller.id);
        const activeProducts = sellerProducts.filter(
          (p) => (p.status ?? 'active') === 'active'
        ).length;

        let rangeOrdersCount = 0;
        let rangeUnitsSold = 0;
        let rangeOrderGmv = 0;
        let rangeReturnOrdersCount = 0;

        filteredOrders.forEach((order) => {
          const sellerItems = order.items.filter(
            (i) => i.product?.sellerId === seller.id
          );
          if (sellerItems.length > 0) {
            rangeOrdersCount += 1;
            if (
              order.status === 'returned' ||
              Boolean(order.returnRequest) ||
              order.paymentStatus === 'refunded'
            ) {
              rangeReturnOrdersCount += 1;
            }
            if (order.status !== 'cancelled') {
              sellerItems.forEach((item) => {
                const qty = safeNumber(item.quantity, 1);
                rangeUnitsSold += qty;
                rangeOrderGmv += safeNumber(item.product?.price) * qty;
              });
            }
          }
        });

        const rate = safeNumber(seller.commissionRate, 12);
        const effectiveGmv =
          dateRange === 'all' && selectedCityFilter === 'all'
            ? Math.max(safeNumber(seller.grossSales), rangeOrderGmv)
            : rangeOrderGmv;
        const effectiveCommission =
          dateRange === 'all' && selectedCityFilter === 'all'
            ? safeNumber(seller.platformCommission)
            : Math.round(((effectiveGmv * rate) / 100) * 100) / 100;
        const effectiveRefunds =
          dateRange === 'all' && selectedCityFilter === 'all'
            ? safeNumber(seller.refundsTotal)
            : 0;

        const returnRatePercent =
          safeDivide(rangeReturnOrdersCount, rangeOrdersCount) * 100;

        const reservation = calculateSellerPayoutReservation(seller, tickets);

        return {
          seller,
          activeProducts,
          totalProducts: sellerProducts.length,
          rangeOrdersCount,
          rangeUnitsSold,
          effectiveGmv,
          rate,
          effectiveCommission,
          effectiveRefunds,
          returnRatePercent,
          reservation,
        };
      })
      .filter((row) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          row.seller.nameAr.toLowerCase().includes(q) ||
          row.seller.nameEn.toLowerCase().includes(q) ||
          row.seller.cityAr.toLowerCase().includes(q) ||
          row.seller.cityEn.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.effectiveGmv - a.effectiveGmv);
  }, [sellers, products, filteredOrders, tickets, dateRange, selectedCityFilter, searchTerm]);

  // ============================================================================
  // 4. PRODUCT & CATALOG INTELLIGENCE
  // ============================================================================
  const catalogIntelligence = useMemo(() => {
    const productStats = products.map((product) => {
      let unitsSold = 0;
      let revenue = 0;
      let orderCount = 0;
      let returnCount = 0;

      filteredOrders.forEach((order) => {
        const line = order.items.find((i) => i.product?.id === product.id);
        if (line) {
          orderCount += 1;
          if (
            order.status === 'returned' ||
            Boolean(order.returnRequest) ||
            order.paymentStatus === 'refunded'
          ) {
            returnCount += 1;
          }
          if (order.status !== 'cancelled') {
            const qty = safeNumber(line.quantity, 1);
            unitsSold += qty;
            revenue += safeNumber(line.product?.price, product.price) * qty;
          }
        }
      });

      const returnRatePercent = safeDivide(returnCount, orderCount) * 100;
      const seller = sellers.find((s) => s.id === product.sellerId);

      return {
        product,
        sellerNameAr: seller?.nameAr || product.sellerId,
        sellerNameEn: seller?.nameEn || product.sellerId,
        unitsSold,
        revenue,
        orderCount,
        returnCount,
        returnRatePercent,
      };
    });

    const topByRevenue = [...productStats]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const topByUnits = [...productStats]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 8);

    const lowStockProducts = products
      .filter((p) => safeNumber(p.stock) <= 5)
      .sort((a, b) => safeNumber(a.stock) - safeNumber(b.stock));

    const highReturnProducts = [...productStats]
      .filter((p) => p.returnCount > 0)
      .sort((a, b) => b.returnRatePercent - a.returnRatePercent);

    const statusBreakdown = {
      active: products.filter((p) => (p.status ?? 'active') === 'active').length,
      pending_review: products.filter((p) => p.status === 'pending_review').length,
      paused: products.filter((p) => p.status === 'paused').length,
      rejected: products.filter((p) => p.status === 'rejected').length,
    };

    return {
      topByRevenue,
      topByUnits,
      lowStockProducts,
      highReturnProducts,
      statusBreakdown,
    };
  }, [products, filteredOrders, sellers]);

  // ============================================================================
  // 5. CUSTOMER & GEOGRAPHIC INSIGHTS
  // ============================================================================
  const customerGeoInsights = useMemo(() => {
    // City aggregation
    const cityMap = new Map<
      string,
      { city: string; ordersCount: number; gmv: number; customersSet: Set<string> }
    >();

    // Payment method aggregation
    const paymentMap = new Map<
      string,
      { method: string; ordersCount: number; gmv: number }
    >();

    // Customer frequency aggregation
    const customerOrderCount = new Map<string, { count: number; spend: number }>();

    filteredOrders.forEach((order) => {
      const city = order.shippingAddress?.city || t('غير محدد', 'Unspecified');
      const total = safeNumber(order.total);
      const custKey = order.userId || order.customerEmail || order.id;

      const cEntry = cityMap.get(city) || {
        city,
        ordersCount: 0,
        gmv: 0,
        customersSet: new Set<string>(),
      };
      cEntry.ordersCount += 1;
      if (order.status !== 'cancelled') {
        cEntry.gmv += total;
      }
      cEntry.customersSet.add(custKey);
      cityMap.set(city, cEntry);

      const method = order.paymentMethod || 'Madfu / Card';
      const pEntry = paymentMap.get(method) || {
        method,
        ordersCount: 0,
        gmv: 0,
      };
      pEntry.ordersCount += 1;
      if (order.status !== 'cancelled') {
        pEntry.gmv += total;
      }
      paymentMap.set(method, pEntry);

      const uEntry = customerOrderCount.get(custKey) || { count: 0, spend: 0 };
      uEntry.count += 1;
      if (order.status !== 'cancelled') {
        uEntry.spend += total;
      }
      customerOrderCount.set(custKey, uEntry);
    });

    const totalValidGmv = Array.from(cityMap.values()).reduce(
      (s, c) => s + c.gmv,
      0
    );

    const cityRows = Array.from(cityMap.values())
      .map((c) => ({
        city: c.city,
        ordersCount: c.ordersCount,
        uniqueCustomers: c.customersSet.size,
        gmv: c.gmv,
        gmvSharePercent: safeDivide(c.gmv, totalValidGmv) * 100,
        aov: safeDivide(c.gmv, c.ordersCount),
      }))
      .sort((a, b) => b.gmv - a.gmv);

    const paymentRows = Array.from(paymentMap.values())
      .map((p) => ({
        ...p,
        sharePercent: safeDivide(p.gmv, totalValidGmv) * 100,
      }))
      .sort((a, b) => b.gmv - a.gmv);

    const customerEntries = Array.from(customerOrderCount.values());
    const repeatCustomersCount = customerEntries.filter((c) => c.count > 1).length;
    const singleOrderCustomersCount = customerEntries.filter(
      (c) => c.count === 1
    ).length;
    const repeatCustomerRate =
      safeDivide(repeatCustomersCount, customerEntries.length) * 100;
    const avgCustomerLtv = safeDivide(
      customerEntries.reduce((s, c) => s + c.spend, 0),
      customerEntries.length
    );

    const customerUsers = users.filter((u) => u.role === 'customer');
    const totalCustomerWalletLiability = customerUsers.reduce(
      (sum, u) => sum + safeNumber(u.walletBalance),
      0
    );

    return {
      cityRows,
      paymentRows,
      activeOrderingCustomers: customerEntries.length,
      repeatCustomersCount,
      singleOrderCustomersCount,
      repeatCustomerRate,
      avgCustomerLtv,
      totalRegisteredCustomers: customerUsers.length,
      totalCustomerWalletLiability,
    };
  }, [filteredOrders, users, t]);

  // ============================================================================
  // 6. OPERATIONS & SLA HEALTH
  // ============================================================================
  const operationsHealth = useMemo(() => {
    const statusFunnel = {
      pending: filteredOrders.filter((o) => o.status === 'pending').length,
      confirmed: filteredOrders.filter((o) => o.status === 'confirmed').length,
      processing: filteredOrders.filter((o) => o.status === 'processing').length,
      shipped: filteredOrders.filter((o) => o.status === 'shipped').length,
      delivered: filteredOrders.filter((o) => o.status === 'delivered').length,
      returned: filteredOrders.filter((o) => o.status === 'returned').length,
      cancelled: filteredOrders.filter((o) => o.status === 'cancelled').length,
    };

    const deliverySuccessRate =
      safeDivide(statusFunnel.delivered, filteredOrders.length) * 100;
    const cancellationRate =
      safeDivide(statusFunnel.cancelled, filteredOrders.length) * 100;

    const ordersWithReturnReq = filteredOrders.filter((o) =>
      Boolean(o.returnRequest)
    );
    const resolvedReturnsCount = ordersWithReturnReq.filter(
      (o) =>
        o.returnRequest?.status === 'refunded' ||
        o.returnRequest?.status === 'rejected'
    ).length;
    const returnResolutionRate =
      safeDivide(resolvedReturnsCount, ordersWithReturnReq.length) * 100;

    // Tickets & Treasury
    const payoutTickets = tickets.filter(
      (tkt) => tkt.workflowType === 'payout' || safeNumber(tkt.payoutAmount) > 0
    );
    const generalSupportTickets = tickets.filter(
      (tkt) => tkt.workflowType !== 'payout' && !tkt.payoutAmount
    );
    const resolvedSupportCount = generalSupportTickets.filter(
      (tkt) => tkt.status === 'resolved'
    ).length;
    const supportResolutionRate =
      safeDivide(resolvedSupportCount, generalSupportTickets.length) * 100;

    const treasuryQueueBreakdown = {
      requested: payoutTickets.filter(
        (tkt) => (tkt.treasuryStatus || 'requested') === 'requested'
      ).length,
      under_review: payoutTickets.filter(
        (tkt) => tkt.treasuryStatus === 'under_review'
      ).length,
      approved_for_treasury: payoutTickets.filter(
        (tkt) => tkt.treasuryStatus === 'approved_for_treasury'
      ).length,
      completed: payoutTickets.filter(
        (tkt) => tkt.treasuryStatus === 'completed'
      ).length,
      rejected: payoutTickets.filter(
        (tkt) => tkt.treasuryStatus === 'rejected'
      ).length,
    };

    // Moderation queue counts
    const pendingSellers = sellers.filter((s) => s.status === 'pending').length;
    const pendingProducts = products.filter(
      (p) => p.status === 'pending_review'
    ).length;
    const pendingReviews = reviews.filter(
      (r) => r.moderationStatus === 'pending'
    ).length;
    const unansweredQuestions = questions.filter((q) => !q.answerText).length;

    return {
      statusFunnel,
      deliverySuccessRate,
      cancellationRate,
      ordersWithReturnReqCount: ordersWithReturnReq.length,
      resolvedReturnsCount,
      returnResolutionRate,
      generalSupportCount: generalSupportTickets.length,
      resolvedSupportCount,
      supportResolutionRate,
      treasuryQueueBreakdown,
      pendingSellers,
      pendingProducts,
      pendingReviews,
      unansweredQuestions,
    };
  }, [filteredOrders, tickets, sellers, products, reviews, questions]);

  // ============================================================================
  // CSV EXPORT HANDLER
  // ============================================================================
  const handleExportCurrentViewCsv = () => {
    if (activeTab === 'categories') {
      const headers = [
        'Category ID',
        'Category (AR)',
        'Category (EN)',
        'Total Products',
        'Active Products',
        'Units Sold',
        'Category GMV (SAR)',
        'GMV Share (%)',
        'Return Rate (%)',
        'Avg Rating',
      ];
      const rows = categoryStats.map((c) => [
        c.id,
        c.nameAr,
        c.nameEn,
        c.totalProducts,
        c.activeProductsCount,
        c.unitsSold,
        c.categoryGmv.toFixed(2),
        c.gmvSharePercent.toFixed(1),
        c.returnRatePercent.toFixed(1),
        c.avgRating.toFixed(2),
      ]);
      downloadCsvFile(`atheel-analytics-categories-${dateRange}.csv`, headers, rows);
      return;
    }

    if (activeTab === 'sellers') {
      const headers = [
        'Seller ID',
        'Boutique (AR)',
        'Boutique (EN)',
        'City',
        'Status',
        'Active Products',
        'Orders in Range',
        'Units Sold',
        'GMV / Gross Sales (SAR)',
        'Commission Rate (%)',
        'Platform Commission (SAR)',
        'Available Balance (SAR)',
        'Reserved Pending Payouts (SAR)',
        'Requestable Balance (SAR)',
      ];
      const rows = sellerPerformanceRows.map((r) => [
        r.seller.id,
        r.seller.nameAr,
        r.seller.nameEn,
        lang === 'ar' ? r.seller.cityAr : r.seller.cityEn,
        r.seller.status,
        r.activeProducts,
        r.rangeOrdersCount,
        r.rangeUnitsSold,
        r.effectiveGmv.toFixed(2),
        r.rate,
        r.effectiveCommission.toFixed(2),
        r.reservation.availableBalance.toFixed(2),
        r.reservation.reservedPendingPayoutAmount.toFixed(2),
        r.reservation.requestableBalance.toFixed(2),
      ]);
      downloadCsvFile(`atheel-analytics-sellers-${dateRange}.csv`, headers, rows);
      return;
    }

    if (activeTab === 'customers_geo') {
      const headers = [
        'City',
        'Orders Count',
        'Unique Customers',
        'Valid GMV (SAR)',
        'Share of GMV (%)',
        'Average Order Value (SAR)',
      ];
      const rows = customerGeoInsights.cityRows.map((c) => [
        c.city,
        c.ordersCount,
        c.uniqueCustomers,
        c.gmv.toFixed(2),
        c.gmvSharePercent.toFixed(1),
        c.aov.toFixed(2),
      ]);
      downloadCsvFile(`atheel-analytics-geography-${dateRange}.csv`, headers, rows);
      return;
    }

    // Default GMV & Order summary export
    const headers = [
      'Order Number',
      'Date',
      'City',
      'Payment Method',
      'Order Status',
      'Payment Status',
      'Total (SAR)',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.createdAt,
      o.shippingAddress?.city || '',
      o.paymentMethod || '',
      o.status,
      o.paymentStatus,
      safeNumber(o.total).toFixed(2),
    ]);
    downloadCsvFile(`atheel-analytics-orders-${dateRange}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* ====================================================================
          HEADER & DATE RANGE / CITY CONTROLS
      ==================================================================== */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-mono font-bold uppercase">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>EXECUTIVE MARKETPLACE INTELLIGENCE · ROUND 3B.1</span>
            </div>
            <h2 className="text-xl font-bold text-[#141413]">
              {t(
                'مركز تحليلات السوق والذكاء التنفيذي (Executive Analytics)',
                'Marketplace Analytics & Executive Intelligence Center'
              )}
            </h2>
            <p className="text-xs text-[#57534E] max-w-3xl leading-relaxed">
              {t(
                'مؤشرات أداء حتمية مشتقة مباشرة من الطلبات الفعلية، أداء التجار، المجموعات، التوزيع الجغرافي للمدن السعودية، ومؤشرات جودة العمليات التشغيلية.',
                'Deterministic executive metrics derived directly from marketplace orders, seller ledgers, category velocity, Saudi city distribution, and SLA health.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Selector */}
            <div className="inline-flex items-center rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] p-1">
              <Calendar className="w-3.5 h-3.5 text-[#8C857B] mx-2" />
              {(
                [
                  { id: '7d', ar: '7 أيام', en: '7D' },
                  { id: '30d', ar: '30 يوم', en: '30D' },
                  { id: '90d', ar: '90 يوم', en: '90D' },
                  { id: '12m', ar: '12 شهر', en: '12M' },
                  { id: 'all', ar: 'كل الفترات', en: 'All Time' },
                ] as const
              ).map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setDateRange(range.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    dateRange === range.id
                      ? 'bg-[#0B4F3F] text-white'
                      : 'text-[#57534E] hover:text-[#141413]'
                  }`}
                >
                  {lang === 'ar' ? range.ar : range.en}
                </button>
              ))}
            </div>

            {/* City Filter */}
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              aria-label={t('تصفية حسب المدينة', 'Filter by city')}
              className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413]"
            >
              <option value="all">{t('جميع المدن السعودية', 'All Saudi Cities')}</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportCurrentViewCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#093D30] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('تصدير CSV', 'Export CSV')}</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E6E0D6]">
          {(
            [
              {
                id: 'gmv_revenue',
                ar: '1. إجمالي المبيعات والإيرادات (GMV)',
                en: '1. GMV & Revenue Intelligence',
                icon: TrendingUp,
              },
              {
                id: 'categories',
                ar: '2. أداء التصنيفات',
                en: '2. Category Performance',
                icon: Layers,
              },
              {
                id: 'sellers',
                ar: '3. أداء التجار والتسويات',
                en: '3. Seller Performance',
                icon: Store,
              },
              {
                id: 'catalog',
                ar: '4. ذكاء الكتالوج والمنتجات',
                en: '4. Product & Catalog Intelligence',
                icon: Package,
              },
              {
                id: 'customers_geo',
                ar: '5. العملاء والتوزيع الجغرافي',
                en: '5. Customers & Saudi Geography',
                icon: MapPin,
              },
              {
                id: 'operations_sla',
                ar: '6. كفاءة العمليات والالتزام (SLA)',
                en: '6. Operations & SLA Health',
                icon: Activity,
              },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-[#0B4F3F] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#57534E] hover:bg-[#F3EFEA] hover:text-[#141413]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? tab.ar : tab.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          TAB 1: GMV & REVENUE INTELLIGENCE
      ==================================================================== */}
      {activeTab === 'gmv_revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#8C857B]">
                {t('إجمالي قيمة الطلبات (Gross GMV)', 'Gross Marketplace GMV')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413]">
                {formatPrice(gmvRevenueStats.grossGmv)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {gmvRevenueStats.ordersCount} {t('طلب مسجل في النطاق', 'orders in selected window')} ·{' '}
                {gmvRevenueStats.totalUnitsSold} {t('قطعة', 'units')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#0B4F3F] font-bold">
                {t('صافي المبيعات الفعلي (Net GMV)', 'Net Realized GMV')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#0B4F3F]">
                {formatPrice(gmvRevenueStats.netGmv)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {t(
                  'بعد استبعاد الملغي والمسترد · شامل ضريبة القيمة المضافة:',
                  'Excludes cancelled & refunded · Included 15% VAT:'
                )}{' '}
                <span className="font-mono font-bold">
                  {formatPrice(gmvRevenueStats.netVat)}
                </span>
              </p>
            </div>

            <div className="bg-[#0B4F3F] text-white rounded-2xl p-5 space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#C59B27] font-bold">
                {t('إيراد عمولة المنصة', 'Platform Commission Revenue')}
              </span>
              <div className="text-2xl font-bold font-mono">
                {formatPrice(gmvRevenueStats.effectiveCommissionRevenue)}
              </div>
              <p className="text-[11px] text-white/80">
                {t(
                  'محتسب وفق نسب عمولة التجار المعتمدة لكل متجر',
                  'Calculated deterministically from merchant commission tiers'
                )}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#8C857B]">
                {t('متوسط سلة الطلب (AOV)', 'Average Order Value (AOV)')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413]">
                {formatPrice(gmvRevenueStats.aov)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {t('الطلبات المدفوعة:', 'Paid orders:')}{' '}
                <span className="font-mono font-bold text-[#0B4F3F]">
                  {gmvRevenueStats.paidOrdersCount}
                </span>{' '}
                · {t('المستردة:', 'Refunded:')}{' '}
                <span className="font-mono font-bold text-[#B45309]">
                  {gmvRevenueStats.refundedOrdersCount}
                </span>
              </p>
            </div>
          </div>

          {/* Period Velocity Chart */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E0D6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    'المنحنى الزمني لإجمالي وصافي المبيعات حسب الشهر',
                    'Monthly Gross vs Net GMV Trajectory'
                  )}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {t(
                    'مقارنة إجمالي قيمة الطلبات (Gross) مع الصافي المحقق بعد المرتجعات والإلغاء (Net)',
                    'Compares Gross Order Volume against Net Realized GMV per period'
                  )}
                </p>
              </div>
              <span className="text-xs font-mono text-[#8C857B]">
                {gmvRevenueStats.periodSeries.length} {t('فترة زمنية', 'periods')}
              </span>
            </div>

            {gmvRevenueStats.periodSeries.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#8C857B]">
                {t('لا توجد طلبات ضمن النطاق الزمني المحدد', 'No orders in selected date range')}
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const maxPeriodGmv = Math.max(
                    ...gmvRevenueStats.periodSeries.map((p) => p.grossGmv),
                    1
                  );
                  return gmvRevenueStats.periodSeries.map((item) => {
                    const grossPct = Math.min(
                      100,
                      Math.max(4, (item.grossGmv / maxPeriodGmv) * 100)
                    );
                    const netPct = Math.min(
                      100,
                      Math.max(2, (item.netGmv / maxPeriodGmv) * 100)
                    );
                    return (
                      <div
                        key={item.period}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded bg-[#0B4F3F] text-white font-mono font-bold">
                              {item.period}
                            </span>
                            <span className="text-[#57534E] font-mono">
                              {item.ordersCount} {t('طلب', 'orders')}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 font-mono">
                            <span className="text-[#57534E]">
                              Gross: <strong className="text-[#141413]">{formatPrice(item.grossGmv)}</strong>
                            </span>
                            <span className="text-[#0B4F3F]">
                              Net: <strong>{formatPrice(item.netGmv)}</strong>
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[#E6E0D6]/70 overflow-hidden relative">
                          <div
                            className="h-full bg-[#C59B27]/50 rounded-full"
                            style={{ width: `${grossPct}%` }}
                          />
                          <div
                            className="h-full bg-[#0B4F3F] rounded-full absolute top-0 start-0"
                            style={{ width: `${netPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: CATEGORY PERFORMANCE
      ==================================================================== */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E0D6] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#141413]">
                {t(
                  'تحليل أداء التصنيفات وحصة المبيعات ومعدلات الاسترجاع',
                  'Category Velocity, GMV Share & Return Rate Matrix'
                )}
              </h3>
              <p className="text-xs text-[#57534E]">
                {t(
                  'مرتبة تنازلياً حسب إجمالي مبيعات كل تصنيف في النطاق المحدد',
                  'Ranked by category GMV contribution within the active filter window'
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-[#E6E0D6] text-[#8C857B] font-mono uppercase bg-[#FAF8F5]">
                  <th className="py-3 px-3 text-start">{t('التصنيف', 'Category')}</th>
                  <th className="py-3 px-3 text-start">{t('المنتجات النشطة', 'Active Products')}</th>
                  <th className="py-3 px-3 text-start">{t('القطع المباعة', 'Units Sold')}</th>
                  <th className="py-3 px-3 text-start">{t('مبيعات التصنيف (GMV)', 'Category GMV')}</th>
                  <th className="py-3 px-3 text-start">{t('الحصة من السوق', 'Share of GMV')}</th>
                  <th className="py-3 px-3 text-start">{t('معدل المرتجعات', 'Return Rate')}</th>
                  <th className="py-3 px-3 text-start">{t('متوسط التقييم', 'Avg Rating')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {categoryStats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#FAF8F5]/70">
                    <td className="py-3.5 px-3 font-bold text-[#141413]">
                      <div>{lang === 'ar' ? cat.nameAr : cat.nameEn}</div>
                      <div className="text-[10px] font-mono text-[#8C857B]">{cat.id}</div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-[#0B4F3F]">{cat.activeProductsCount}</span>
                      <span className="text-[#8C857B]"> / {cat.totalProducts}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#141413]">
                      {cat.unitsSold}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#0B4F3F]">
                      {formatPrice(cat.categoryGmv)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full bg-[#FAF8F5] border border-[#E6E0D6] overflow-hidden">
                          <div
                            className="h-full bg-[#0B4F3F]"
                            style={{ width: `${Math.min(100, cat.gmvSharePercent)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[#141413]">
                          {cat.gmvSharePercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          cat.returnRatePercent > 15
                            ? 'bg-red-50 text-[#9E2A2B]'
                            : cat.returnRatePercent > 0
                            ? 'bg-amber-50 text-[#B45309]'
                            : 'bg-[#EBF3F0] text-[#0B4F3F]'
                        }`}
                      >
                        {cat.returnRatePercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="inline-flex items-center gap-1 font-bold text-[#141413]">
                        <Star className="w-3.5 h-3.5 text-[#C59B27] fill-[#C59B27]" />
                        {cat.avgRating.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: SELLER PERFORMANCE
      ==================================================================== */}
      {activeTab === 'sellers' && (
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E0D6] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#141413]">
                {t(
                  'مصفوفة أداء التجار والعمولات والموقف المالي للحجوزات',
                  'Merchant Performance, Commission Contribution & Payout Reservation Matrix'
                )}
              </h3>
              <p className="text-xs text-[#57534E]">
                {t(
                  'يعرض المبيعات، العمولة المحققة، وموقف الرصيد المتاح والمحجوز والقابل للسحب لكل تاجر',
                  'Displays GMV, platform commission generated, and real-time Available / Reserved / Requestable balances'
                )}
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('بحث باسم المتجر أو المدينة...', 'Search boutique or city...')}
                className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-[#E6E0D6] text-[#8C857B] font-mono uppercase bg-[#FAF8F5]">
                  <th className="py-3 px-3 text-start">{t('المتجر', 'Seller')}</th>
                  <th className="py-3 px-3 text-start">{t('المنتجات النشطة', 'Active Catalog')}</th>
                  <th className="py-3 px-3 text-start">{t('الطلبات / القطع', 'Orders / Units')}</th>
                  <th className="py-3 px-3 text-start">{t('إجمالي المبيعات', 'Gross Sales / GMV')}</th>
                  <th className="py-3 px-3 text-start">{t('العمولة', 'Commission')}</th>
                  <th className="py-3 px-3 text-start">{t('معدل الاسترجاع', 'Return Rate')}</th>
                  <th className="py-3 px-3 text-start">
                    {t('المتاح / المحجوز / القابل للطلب', 'Available / Reserved / Requestable')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {sellerPerformanceRows.map((row) => (
                  <tr key={row.seller.id} className="hover:bg-[#FAF8F5]/70">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-[#141413]">
                        <span>{lang === 'ar' ? row.seller.nameAr : row.seller.nameEn}</span>
                        {row.seller.verifiedBadge && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        )}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {lang === 'ar' ? row.seller.cityAr : row.seller.cityEn} ·{' '}
                        <span className="font-mono uppercase">{row.seller.status}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-[#0B4F3F]">{row.activeProducts}</span>
                      <span className="text-[#8C857B]"> / {row.totalProducts}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-[#141413]">{row.rangeOrdersCount}</span>{' '}
                      {t('طلب', 'orders')} ({row.rangeUnitsSold} {t('قطعة', 'u')})
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#141413]">
                      {formatPrice(row.effectiveGmv)}
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <div className="font-bold text-[#0B4F3F]">
                        {formatPrice(row.effectiveCommission)}
                      </div>
                      <div className="text-[10px] text-[#8C857B]">{row.rate}% tier</div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          row.returnRatePercent > 15
                            ? 'bg-red-50 text-[#9E2A2B]'
                            : 'bg-[#FAF8F5] text-[#57534E]'
                        }`}
                      >
                        {row.returnRatePercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[#57534E]">
                          {t('متاح:', 'Avail:')}{' '}
                          <strong className="text-[#141413]">
                            {formatPrice(row.reservation.availableBalance)}
                          </strong>
                        </span>
                        <span className="text-[#B45309]">
                          {t('محجوز:', 'Resv:')}{' '}
                          <strong>
                            {formatPrice(row.reservation.reservedPendingPayoutAmount)}
                          </strong>
                        </span>
                        <span className="text-[#0B4F3F]">
                          {t('قابل للطلب:', 'Req:')}{' '}
                          <strong>{formatPrice(row.reservation.requestableBalance)}</strong>
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: PRODUCT & CATALOG INTELLIGENCE
      ==================================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Catalog Moderation Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#0B4F3F] font-bold">
                {t('منتجات نشطة بالمتجر', 'Active Storefront Products')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#0B4F3F] mt-1">
                {catalogIntelligence.statusBreakdown.active}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#B45309] font-bold">
                {t('بانتظار المراجعة الرقابية', 'Pending Review Queue')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#B45309] mt-1">
                {catalogIntelligence.statusBreakdown.pending_review}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#57534E] font-bold">
                {t('منتجات متوقفة مؤقتاً', 'Paused by Seller/Admin')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413] mt-1">
                {catalogIntelligence.statusBreakdown.paused}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#9E2A2B] font-bold">
                {t('منتجات مرفوضة رقابياً', 'Rejected Products')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#9E2A2B] mt-1">
                {catalogIntelligence.statusBreakdown.rejected}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products by Revenue */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#141413]">
                {t('أعلى المنتجات تحقيقاً للإيرادات', 'Top Revenue-Generating Products')}
              </h3>
              <div className="divide-y divide-[#E6E0D6]">
                {catalogIntelligence.topByRevenue.map((item, idx) => (
                  <div
                    key={item.product.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#141413]">
                        #{idx + 1} ·{' '}
                        {lang === 'ar' ? item.product.titleAr : item.product.titleEn}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {lang === 'ar' ? item.sellerNameAr : item.sellerNameEn} · SKU:{' '}
                        <span className="font-mono">{item.product.sku}</span>
                      </div>
                    </div>
                    <div className="text-end font-mono">
                      <div className="font-bold text-[#0B4F3F]">
                        {formatPrice(item.revenue)}
                      </div>
                      <div className="text-[11px] text-[#8C857B]">
                        {item.unitsSold} {t('قطعة مباعة', 'units sold')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock & High Return Risk */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#141413]">
                  {t(
                    'تنبيهات نفاد المخزون والمنتجات ذات الاسترجاع المرتفع',
                    'Inventory Depletion & Return Risk Watchlist'
                  )}
                </h3>
                <p className="text-[11px] text-[#57534E]">
                  {t(
                    'المنتجات التي يقل مخزونها عن 5 قطع أو سجلت طلبات استرجاع',
                    'Products with <= 5 units in stock or recorded return requests'
                  )}
                </p>
              </div>

              <div className="space-y-2">
                {catalogIntelligence.lowStockProducts.slice(0, 6).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#141413]">
                        {lang === 'ar' ? p.titleAr : p.titleEn}
                      </div>
                      <div className="text-[11px] font-mono text-[#8C857B]">
                        SKU: {p.sku} · {formatPrice(p.price)}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                        safeNumber(p.stock) === 0
                          ? 'bg-red-50 text-[#9E2A2B] border border-red-200'
                          : 'bg-amber-50 text-[#B45309] border border-amber-200'
                      }`}
                    >
                      {safeNumber(p.stock) === 0
                        ? t('نافد (0)', 'Out of Stock (0)')
                        : `${p.stock} ${t('قطع متبقية', 'left')}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 5: CUSTOMERS & SAUDI GEOGRAPHY
      ==================================================================== */}
      {activeTab === 'customers_geo' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#8C857B]">
                {t('العملاء المسجلون بالمنصة', 'Registered Customers')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413]">
                {customerGeoInsights.totalRegisteredCustomers}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {customerGeoInsights.activeOrderingCustomers}{' '}
                {t('عميل نشط بطلبات في النطاق', 'active ordering customers in window')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#0B4F3F] font-bold">
                {t('معدل تكرار الشراء (Repeat Rate)', 'Customer Repeat Rate')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#0B4F3F]">
                {customerGeoInsights.repeatCustomerRate.toFixed(1)}%
              </div>
              <p className="text-[11px] text-[#57534E]">
                {customerGeoInsights.repeatCustomersCount} {t('عميل متكرر مقابل', 'repeat vs')}{' '}
                {customerGeoInsights.singleOrderCustomersCount} {t('طلب منفرد', 'single-order')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#8C857B]">
                {t('متوسط إنفاق العميل (LTV)', 'Average Customer Spend')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413]">
                {formatPrice(customerGeoInsights.avgCustomerLtv)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {t('صافي قيمة الطلبات لكل عميل نشط', 'Realized spend per active buyer')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#C59B27] font-bold">
                {t('أرصدة محافظ العملاء (التزام)', 'Customer Wallet Liability')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413]">
                {formatPrice(customerGeoInsights.totalCustomerWalletLiability)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {t('رصيد داخلي جاهز للشراء الفوري', 'Available store credit across buyers')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Saudi Cities Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141413]">
                {t(
                  'التوزيع الجغرافي للمبيعات حسب المدن السعودية',
                  'Geographic GMV & Order Distribution Across Saudi Cities'
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E0D6] text-[#8C857B] font-mono uppercase bg-[#FAF8F5]">
                      <th className="py-2.5 px-3 text-start">{t('المدينة', 'City')}</th>
                      <th className="py-2.5 px-3 text-start">{t('الطلبات', 'Orders')}</th>
                      <th className="py-2.5 px-3 text-start">{t('العملاء', 'Buyers')}</th>
                      <th className="py-2.5 px-3 text-start">{t('صافي المبيعات', 'Valid GMV')}</th>
                      <th className="py-2.5 px-3 text-start">{t('الحصة', 'Share')}</th>
                      <th className="py-2.5 px-3 text-start">{t('متوسط السلة', 'AOV')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E0D6]">
                    {customerGeoInsights.cityRows.map((c) => (
                      <tr key={c.city} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 px-3 font-bold text-[#141413]">{c.city}</td>
                        <td className="py-3 px-3 font-mono">{c.ordersCount}</td>
                        <td className="py-3 px-3 font-mono">{c.uniqueCustomers}</td>
                        <td className="py-3 px-3 font-mono font-bold text-[#0B4F3F]">
                          {formatPrice(c.gmv)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {c.gmvSharePercent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono">{formatPrice(c.aov)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Method Mix */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0B4F3F]" />
                <h3 className="text-base font-bold text-[#141413]">
                  {t('مزيج وسائل الدفع', 'Payment Method Mix')}
                </h3>
              </div>
              <div className="space-y-3">
                {customerGeoInsights.paymentRows.map((pm) => (
                  <div
                    key={pm.method}
                    className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#141413]">{pm.method}</span>
                      <span className="font-mono font-bold text-[#0B4F3F]">
                        {pm.sharePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E6E0D6] overflow-hidden">
                      <div
                        className="h-full bg-[#0B4F3F]"
                        style={{ width: `${Math.min(100, pm.sharePercent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#57534E]">
                      <span>
                        {pm.ordersCount} {t('طلب', 'orders')}
                      </span>
                      <span>{formatPrice(pm.gmv)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 6: OPERATIONS & SLA HEALTH
      ==================================================================== */}
      {activeTab === 'operations_sla' && (
        <div className="space-y-6">
          {/* Funnel Summary */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
            <h3 className="text-base font-bold text-[#141413]">
              {t(
                'قمع تنفيذ الطلبات ومؤشرات الإنجاز اللوجستي (Order Fulfillment Funnel)',
                'End-to-End Order Fulfillment Funnel & Delivery SLA'
              )}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {(
                [
                  {
                    key: 'pending',
                    ar: 'بانتظار التأكيد',
                    en: 'Pending',
                    val: operationsHealth.statusFunnel.pending,
                  },
                  {
                    key: 'confirmed',
                    ar: 'مؤكد',
                    en: 'Confirmed',
                    val: operationsHealth.statusFunnel.confirmed,
                  },
                  {
                    key: 'processing',
                    ar: 'قيد التجهيز',
                    en: 'Processing',
                    val: operationsHealth.statusFunnel.processing,
                  },
                  {
                    key: 'shipped',
                    ar: 'تم الشحن',
                    en: 'Shipped',
                    val: operationsHealth.statusFunnel.shipped,
                  },
                  {
                    key: 'delivered',
                    ar: 'تم التسليم',
                    en: 'Delivered',
                    val: operationsHealth.statusFunnel.delivered,
                  },
                  {
                    key: 'returned',
                    ar: 'مسترجع',
                    en: 'Returned',
                    val: operationsHealth.statusFunnel.returned,
                  },
                  {
                    key: 'cancelled',
                    ar: 'ملغي',
                    en: 'Cancelled',
                    val: operationsHealth.statusFunnel.cancelled,
                  },
                ] as const
              ).map((step) => (
                <div
                  key={step.key}
                  className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-center space-y-1"
                >
                  <span className="text-[10px] font-mono uppercase text-[#8C857B] block">
                    {lang === 'ar' ? step.ar : step.en}
                  </span>
                  <div className="text-xl font-bold font-mono text-[#141413]">
                    {step.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA & Governance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <span className="text-xs font-mono uppercase text-[#0B4F3F] font-bold">
                {t('كفاءة معالجة المرتجعات والدعم', 'Returns & Support Resolution SLA')}
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t('معدل تسليم الطلبات المكتملة', 'Order Delivery Success Rate')}
                  </span>
                  <span className="font-mono font-bold text-[#0B4F3F]">
                    {operationsHealth.deliverySuccessRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t('معدل إغلاق طلبات الاسترجاع', 'Return Request Resolution Rate')}
                  </span>
                  <span className="font-mono font-bold text-[#141413]">
                    {operationsHealth.returnResolutionRate.toFixed(1)}% (
                    {operationsHealth.resolvedReturnsCount}/
                    {operationsHealth.ordersWithReturnReqCount})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#57534E]">
                    {t('معدل حل تذاكر الدعم الفني', 'Support Ticket Resolution Rate')}
                  </span>
                  <span className="font-mono font-bold text-[#0B4F3F]">
                    {operationsHealth.supportResolutionRate.toFixed(1)}% (
                    {operationsHealth.resolvedSupportCount}/
                    {operationsHealth.generalSupportCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <span className="text-xs font-mono uppercase text-[#C59B27] font-bold">
                {t('حالة طابور الخزينة والتسويات', 'Treasury Payout Queue SLA')}
              </span>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between py-1 border-b border-[#E6E0D6]">
                  <span className="font-sans text-[#57534E]">
                    {t('طلبات سحب جديدة (Requested)', 'Requested')}
                  </span>
                  <span className="font-bold text-[#B45309]">
                    {operationsHealth.treasuryQueueBreakdown.requested}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E6E0D6]">
                  <span className="font-sans text-[#57534E]">
                    {t('قيد المراجعة المالية (Under Review)', 'Under Review')}
                  </span>
                  <span className="font-bold text-[#141413]">
                    {operationsHealth.treasuryQueueBreakdown.under_review}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#E6E0D6]">
                  <span className="font-sans text-[#57534E]">
                    {t('معتمد للتحويل البنكي (Approved)', 'Approved for Treasury')}
                  </span>
                  <span className="font-bold text-[#0B4F3F]">
                    {operationsHealth.treasuryQueueBreakdown.approved_for_treasury}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="font-sans text-[#57534E]">
                    {t('مكتمل / مرفوض', 'Completed / Rejected')}
                  </span>
                  <span className="font-bold text-[#57534E]">
                    {operationsHealth.treasuryQueueBreakdown.completed} /{' '}
                    {operationsHealth.treasuryQueueBreakdown.rejected}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <span className="text-xs font-mono uppercase text-[#8C857B] font-bold">
                {t('طابور الرقابة والامتثال المفتوح', 'Active Governance & Moderation Backlog')}
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t('طلبات انضمام تجار معلقة', 'Pending Seller Applications')}
                  </span>
                  <span className="font-mono font-bold text-[#B45309]">
                    {operationsHealth.pendingSellers}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t('منتجات بانتظار الفحص الرقابي', 'Products Pending Moderation')}
                  </span>
                  <span className="font-mono font-bold text-[#B45309]">
                    {operationsHealth.pendingProducts}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#57534E]">
                    {t('مراجعات معلقة / أسئلة غير مجابة', 'Pending Reviews / Unanswered Q&A')}
                  </span>
                  <span className="font-mono font-bold text-[#141413]">
                    {operationsHealth.pendingReviews} / {operationsHealth.unansweredQuestions}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
