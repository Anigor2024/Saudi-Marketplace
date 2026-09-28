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
  Star,
  CreditCard,
  ShieldCheck,
  Search,
  AlertTriangle,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  OrderStatus,
  PaymentMethodType,
  calculateSellerPayoutReservation,
} from '@/lib/types';
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

const PAYMENT_METHOD_LABELS: Record<
  PaymentMethodType,
  { ar: string; en: string }
> = {
  mada: { ar: 'مدى (Mada)', en: 'Mada Debit' },
  apple_pay: { ar: 'أبل باي (Apple Pay)', en: 'Apple Pay' },
  visa_mastercard: {
    ar: 'فيزا / ماستركارد (Visa / Mastercard)',
    en: 'Visa / Mastercard',
  },
  stc_pay: { ar: 'إس تي سي باي (STC Pay)', en: 'STC Pay' },
  wallet: { ar: 'محفظة أثيل (Atheel Wallet)', en: 'Atheel Wallet' },
  cod: { ar: 'الدفع عند الاستلام (COD)', en: 'Cash on Delivery (COD)' },
};

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

  // Available cities derived deterministically from order.address and seller cities
  const availableCities = useMemo(() => {
    const cityMap = new Map<string, { cityAr: string; cityEn: string }>();
    orders.forEach((o) => {
      if (o.address?.cityAr) {
        cityMap.set(o.address.cityAr, {
          cityAr: o.address.cityAr,
          cityEn: o.address.cityEn || o.address.cityAr,
        });
      }
    });
    sellers.forEach((s) => {
      if (s.cityAr && !cityMap.has(s.cityAr)) {
        cityMap.set(s.cityAr, {
          cityAr: s.cityAr,
          cityEn: s.cityEn || s.cityAr,
        });
      }
    });
    return Array.from(cityMap.values());
  }, [orders, sellers]);

  // Fast O(1) lookup maps for products & sellers
  const productById = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return map;
  }, [products]);

  const sellerById = useMemo(() => {
    const map = new Map(sellers.map((s) => [s.id, s]));
    return map;
  }, [sellers]);

  // Filtered orders by selected date range & cityAr filter
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
        if (order.address.cityAr !== selectedCityFilter) return false;
      }
      if (windowMs === Infinity) return true;
      const orderTs = new Date(order.createdAt.replace(' ', 'T')).getTime();
      if (!Number.isFinite(orderTs)) return true;
      return referenceTimestamp - orderTs <= windowMs;
    });
  }, [orders, dateRange, selectedCityFilter, referenceTimestamp]);

  // ============================================================================
  // 1. GMV, REVENUE & ORDER STATUS INTELLIGENCE
  // ============================================================================
  const gmvRevenueStats = useMemo(() => {
    let grossGmv = 0;
    let cancelledGmv = 0;
    let refundSettledOrPendingAmount = 0;
    let netRealizedGmv = 0;
    let orderDerivedCommission = 0;

    let nonCancelledOrdersCount = 0;
    let deliveredOrdersCount = 0;
    let inFulfillmentOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let returnedOrRequestedOrdersCount = 0;
    let totalUnitsSold = 0;

    filteredOrders.forEach((order) => {
      const total = safeNumber(order.total);
      grossGmv += total;

      const unitsInOrder = order.items.reduce(
        (sum, item) => sum + safeNumber(item.quantity, 1),
        0
      );

      // Calculate commission deterministically from OrderItem.unitPrice * OrderItem.quantity
      const orderCommission = order.items.reduce((sum, item) => {
        const lineRevenue =
          safeNumber(item.unitPrice) * safeNumber(item.quantity, 1);
        const sellerObj = sellerById.get(item.sellerId);
        const rate = safeNumber(sellerObj?.commissionRate, 12);
        return sum + (lineRevenue * rate) / 100;
      }, 0);

      const isCancelled = order.status === 'cancelled';
      const hasReturnActivity =
        order.status === 'return_requested' ||
        order.status === 'returned' ||
        Boolean(order.returnRequest);

      const isInFulfillment =
        order.status === 'placed' ||
        order.status === 'confirmed' ||
        order.status === 'preparing' ||
        order.status === 'shipped' ||
        order.status === 'out_for_delivery';

      if (isCancelled) {
        cancelledOrdersCount += 1;
        cancelledGmv += total;
      } else {
        nonCancelledOrdersCount += 1;
        totalUnitsSold += unitsInOrder;

        if (order.status === 'delivered') {
          deliveredOrdersCount += 1;
        } else if (isInFulfillment) {
          inFulfillmentOrdersCount += 1;
        }

        if (hasReturnActivity) {
          returnedOrRequestedOrdersCount += 1;
        }

        const refundState = order.returnRequest?.refundStatus ?? 'none';
        const isRefundActive =
          refundState === 'wallet_completed' ||
          refundState === 'external_authorized_pending';
        const refAmt = isRefundActive
          ? safeNumber(order.returnRequest?.refundAmount, total)
          : 0;

        refundSettledOrPendingAmount += refAmt;
        netRealizedGmv += Math.max(0, total - refAmt);
        orderDerivedCommission += orderCommission;
      }
    });

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
        : Number(orderDerivedCommission.toFixed(2));

    const aov = safeDivide(netRealizedGmv, nonCancelledOrdersCount);
    const netVat = extractIncludedVat(netRealizedGmv);

    // Group orders by month (YYYY-MM) for period trajectory
    const periodMap = new Map<
      string,
      {
        period: string;
        grossGmv: number;
        netGmv: number;
        ordersCount: number;
        nonCancelledCount: number;
      }
    >();

    filteredOrders.forEach((o) => {
      const periodKey = o.createdAt.slice(0, 7);
      const curr = periodMap.get(periodKey) || {
        period: periodKey,
        grossGmv: 0,
        netGmv: 0,
        ordersCount: 0,
        nonCancelledCount: 0,
      };
      const total = safeNumber(o.total);
      const isCancelled = o.status === 'cancelled';
      const refundState = o.returnRequest?.refundStatus ?? 'none';
      const refAmt =
        refundState === 'wallet_completed' ||
        refundState === 'external_authorized_pending'
          ? safeNumber(o.returnRequest?.refundAmount, total)
          : 0;

      curr.grossGmv += total;
      curr.ordersCount += 1;
      if (!isCancelled) {
        curr.nonCancelledCount += 1;
        curr.netGmv += Math.max(0, total - refAmt);
      }
      periodMap.set(periodKey, curr);
    });

    const periodSeries = Array.from(periodMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    return {
      grossGmv,
      cancelledGmv,
      refundSettledOrPendingAmount,
      netRealizedGmv,
      effectiveCommissionRevenue,
      orderDerivedCommission: Number(orderDerivedCommission.toFixed(2)),
      ledgerCommissionTotal,
      ledgerGrossSalesTotal,
      aov,
      netVat,
      ordersCount: filteredOrders.length,
      nonCancelledOrdersCount,
      deliveredOrdersCount,
      inFulfillmentOrdersCount,
      cancelledOrdersCount,
      returnedOrRequestedOrdersCount,
      totalUnitsSold,
      periodSeries,
    };
  }, [filteredOrders, sellers, sellerById, dateRange, selectedCityFilter]);

  // ============================================================================
  // 2. CATEGORY PERFORMANCE METRICS (JOINING OrderItem.productId -> Product)
  // ============================================================================
  const categoryStats = useMemo(() => {
    const totalOrderItemGmv = filteredOrders.reduce((sum, order) => {
      if (order.status === 'cancelled') return sum;
      return (
        sum +
        order.items.reduce(
          (lSum, item) =>
            lSum + safeNumber(item.unitPrice) * safeNumber(item.quantity, 1),
          0
        )
      );
    }, 0);

    return categories
      .map((cat) => {
        const catProducts = products.filter((p) => p.categoryId === cat.id);
        const activeProductsCount = catProducts.filter(
          (p) => p.status === 'active'
        ).length;

        let unitsSold = 0;
        let categoryGmv = 0;
        let orderAppearances = 0;
        let returnAppearances = 0;

        filteredOrders.forEach((order) => {
          const matchingItems = order.items.filter((item) => {
            const product = productById.get(item.productId);
            return product?.categoryId === cat.id;
          });

          if (matchingItems.length > 0) {
            orderAppearances += 1;
            if (
              order.status === 'return_requested' ||
              order.status === 'returned' ||
              Boolean(order.returnRequest)
            ) {
              returnAppearances += 1;
            }
            if (order.status !== 'cancelled') {
              matchingItems.forEach((item) => {
                const qty = safeNumber(item.quantity, 1);
                const lineRevenue = safeNumber(item.unitPrice) * qty;
                unitsSold += qty;
                categoryGmv += lineRevenue;
              });
            }
          }
        });

        const gmvSharePercent =
          safeDivide(categoryGmv, totalOrderItemGmv) * 100;
        const returnRatePercent =
          safeDivide(returnAppearances, orderAppearances) * 100;
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
  }, [categories, products, productById, filteredOrders]);

  // ============================================================================
  // 3. SELLER PERFORMANCE METRICS (USING OrderItem.sellerId & unitPrice * quantity)
  // ============================================================================
  const sellerPerformanceRows = useMemo(() => {
    return sellers
      .map((seller) => {
        const sellerProducts = products.filter((p) => p.sellerId === seller.id);
        const activeProducts = sellerProducts.filter(
          (p) => p.status === 'active'
        ).length;

        let rangeOrdersCount = 0;
        let rangeUnitsSold = 0;
        let rangeOrderGmv = 0;
        let rangeReturnOrdersCount = 0;

        filteredOrders.forEach((order) => {
          const sellerItems = order.items.filter(
            (item) => item.sellerId === seller.id
          );
          if (sellerItems.length > 0) {
            rangeOrdersCount += 1;
            if (
              order.status === 'return_requested' ||
              order.status === 'returned' ||
              Boolean(order.returnRequest)
            ) {
              rangeReturnOrdersCount += 1;
            }
            if (order.status !== 'cancelled') {
              sellerItems.forEach((item) => {
                const qty = safeNumber(item.quantity, 1);
                const lineRevenue = safeNumber(item.unitPrice) * qty;
                rangeUnitsSold += qty;
                rangeOrderGmv += lineRevenue;
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
            : Number(((effectiveGmv * rate) / 100).toFixed(2));
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
  }, [
    sellers,
    products,
    filteredOrders,
    tickets,
    dateRange,
    selectedCityFilter,
    searchTerm,
  ]);

  // ============================================================================
  // 4. PRODUCT & CATALOG INTELLIGENCE (REAL ProductStatus & OrderItem JOIN)
  // ============================================================================
  const catalogIntelligence = useMemo(() => {
    const productStats = products.map((product) => {
      let unitsSold = 0;
      let revenue = 0;
      let orderCount = 0;
      let returnOrderCount = 0;

      filteredOrders.forEach((order) => {
        const matchingLines = order.items.filter(
          (item) => item.productId === product.id
        );
        if (matchingLines.length > 0) {
          orderCount += 1;
          if (
            order.status === 'return_requested' ||
            order.status === 'returned' ||
            Boolean(order.returnRequest)
          ) {
            returnOrderCount += 1;
          }
          if (order.status !== 'cancelled') {
            matchingLines.forEach((line) => {
              const qty = safeNumber(line.quantity, 1);
              unitsSold += qty;
              revenue += safeNumber(line.unitPrice) * qty;
            });
          }
        }
      });

      const seller = sellerById.get(product.sellerId);
      const category = categories.find((c) => c.id === product.categoryId);

      return {
        product,
        sellerNameAr: seller?.nameAr || product.sellerNameAr,
        sellerNameEn: seller?.nameEn || product.sellerNameEn,
        categoryNameAr: category?.nameAr || product.categoryId,
        categoryNameEn: category?.nameEn || product.categoryId,
        unitsSold,
        revenue,
        orderCount,
        returnOrderCount,
      };
    });

    const topByRevenue = [...productStats]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const topByUnits = [...productStats]
      .sort(
        (a, b) =>
          b.unitsSold - a.unitsSold ||
          safeNumber(b.product.soldCount) - safeNumber(a.product.soldCount)
      )
      .slice(0, 8);

    // Low Stock High Demand: positive stock <= lowStockThreshold (or 5), sorted by demand
    const lowStockHighDemand = [...productStats]
      .filter(
        (stat) =>
          safeNumber(stat.product.stock) > 0 &&
          safeNumber(stat.product.stock) <=
            safeNumber(stat.product.lowStockThreshold, 5)
      )
      .sort(
        (a, b) =>
          b.unitsSold +
          safeNumber(b.product.soldCount) -
          (a.unitsSold + safeNumber(a.product.soldCount))
      );

    // Out-of-Stock Revenue Risk: status === 'out_of_stock' or stock <= 0
    const outOfStockRisk = [...productStats]
      .filter(
        (stat) =>
          stat.product.status === 'out_of_stock' ||
          safeNumber(stat.product.stock) <= 0
      )
      .sort(
        (a, b) =>
          safeNumber(b.product.price) * safeNumber(b.product.soldCount, 1) -
          safeNumber(a.product.price) * safeNumber(a.product.soldCount, 1)
      );

    // Objective ProductStatus breakdown ('active' | 'draft' | 'out_of_stock' | 'suspended')
    const statusBreakdown = {
      active: products.filter((p) => p.status === 'active').length,
      draft: products.filter((p) => p.status === 'draft').length,
      out_of_stock: products.filter(
        (p) => p.status === 'out_of_stock' || safeNumber(p.stock) <= 0
      ).length,
      suspended: products.filter((p) => p.status === 'suspended').length,
    };

    return {
      topByRevenue,
      topByUnits,
      lowStockHighDemand,
      outOfStockRisk,
      statusBreakdown,
    };
  }, [products, filteredOrders, sellerById, categories]);

  // ============================================================================
  // 5. CUSTOMER & GEOGRAPHIC INSIGHTS (order.customerId & order.address.cityAr/En)
  // ============================================================================
  const customerGeoInsights = useMemo(() => {
    const cityMap = new Map<
      string,
      {
        cityAr: string;
        cityEn: string;
        ordersCount: number;
        gmv: number;
        customersSet: Set<string>;
      }
    >();

    const paymentMap = new Map<
      PaymentMethodType,
      { method: PaymentMethodType; ordersCount: number; gmv: number }
    >();

    const customerOrderCount = new Map<
      string,
      { count: number; spend: number }
    >();

    filteredOrders.forEach((order) => {
      const cityAr = order.address.cityAr || 'غير محدد';
      const cityEn = order.address.cityEn || cityAr;
      const total = safeNumber(order.total);
      const custKey = order.customerId;

      const cEntry = cityMap.get(cityAr) || {
        cityAr,
        cityEn,
        ordersCount: 0,
        gmv: 0,
        customersSet: new Set<string>(),
      };
      cEntry.ordersCount += 1;
      if (order.status !== 'cancelled') {
        cEntry.gmv += total;
      }
      cEntry.customersSet.add(custKey);
      cityMap.set(cityAr, cEntry);

      const method = order.paymentMethod;
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
        cityAr: c.cityAr,
        cityEn: c.cityEn,
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
    const repeatCustomersCount = customerEntries.filter(
      (c) => c.count > 1
    ).length;
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
  }, [filteredOrders, users]);

  // ============================================================================
  // 6. OPERATIONS, FUNNEL & MARKETPLACE HEALTH (REAL STATES ONLY)
  // ============================================================================
  const operationsHealth = useMemo(() => {
    const statusFunnel: Record<OrderStatus, number> = {
      placed: filteredOrders.filter((o) => o.status === 'placed').length,
      confirmed: filteredOrders.filter((o) => o.status === 'confirmed').length,
      preparing: filteredOrders.filter((o) => o.status === 'preparing').length,
      shipped: filteredOrders.filter((o) => o.status === 'shipped').length,
      out_for_delivery: filteredOrders.filter(
        (o) => o.status === 'out_for_delivery'
      ).length,
      delivered: filteredOrders.filter((o) => o.status === 'delivered').length,
      return_requested: filteredOrders.filter(
        (o) => o.status === 'return_requested'
      ).length,
      returned: filteredOrders.filter((o) => o.status === 'returned').length,
      cancelled: filteredOrders.filter((o) => o.status === 'cancelled').length,
    };

    const deliverySuccessRate =
      safeDivide(statusFunnel.delivered, filteredOrders.length) * 100;
    const cancellationRate =
      safeDivide(statusFunnel.cancelled, filteredOrders.length) * 100;

    // ReturnRequest resolution uses status === 'approved' || status === 'rejected'
    const ordersWithReturnReq = filteredOrders.filter((o) =>
      Boolean(o.returnRequest)
    );
    const resolvedReturnsCount = ordersWithReturnReq.filter(
      (o) =>
        o.returnRequest?.status === 'approved' ||
        o.returnRequest?.status === 'rejected'
    ).length;
    const returnResolutionRate =
      safeDivide(resolvedReturnsCount, ordersWithReturnReq.length) * 100;

    // Financial refund exposure breakdown across filtered orders
    const refundStateCounts = {
      wallet_completed: ordersWithReturnReq.filter(
        (o) => o.returnRequest?.refundStatus === 'wallet_completed'
      ).length,
      external_authorized_pending: ordersWithReturnReq.filter(
        (o) => o.returnRequest?.refundStatus === 'external_authorized_pending'
      ).length,
      failed: ordersWithReturnReq.filter(
        (o) => o.returnRequest?.refundStatus === 'failed'
      ).length,
      none: ordersWithReturnReq.filter(
        (o) => (o.returnRequest?.refundStatus ?? 'none') === 'none'
      ).length,
    };

    // Tickets & Treasury
    const payoutTickets = tickets.filter(
      (tkt) =>
        tkt.workflowType === 'payout' || safeNumber(tkt.payoutAmount) > 0
    );
    const generalSupportTickets = tickets.filter(
      (tkt) => tkt.workflowType !== 'payout' && !tkt.payoutAmount
    );
    const resolvedSupportCount = generalSupportTickets.filter(
      (tkt) => tkt.status === 'resolved'
    ).length;
    const openSupportTicketsCount = generalSupportTickets.filter(
      (tkt) => tkt.status === 'open' || tkt.status === 'in_progress'
    ).length;
    const supportResolutionRate =
      safeDivide(resolvedSupportCount, generalSupportTickets.length) * 100;

    const pendingTreasuryRequestsCount = payoutTickets.filter((tkt) => {
      const st = tkt.treasuryStatus || 'requested';
      return (
        st === 'requested' ||
        st === 'under_review' ||
        st === 'approved_for_treasury'
      );
    }).length;

    // 12 Objective Marketplace Health Indicators (Requirement 12)
    const pendingSellerApplications = sellers.filter(
      (s) => s.status === 'pending'
    ).length;
    const suspendedSellers = sellers.filter(
      (s) => s.status === 'suspended'
    ).length;
    const suspendedProducts = products.filter(
      (p) => p.status === 'suspended'
    ).length;
    const draftProducts = products.filter((p) => p.status === 'draft').length;
    const criticalStockSkus = products.filter(
      (p) =>
        safeNumber(p.stock) > 0 &&
        safeNumber(p.stock) <= safeNumber(p.lowStockThreshold, 5)
    ).length;
    const outOfStockProducts = products.filter(
      (p) => p.status === 'out_of_stock' || safeNumber(p.stock) <= 0
    ).length;
    const pendingReturns = orders.filter(
      (o) =>
        o.returnRequest?.status === 'pending' ||
        o.status === 'return_requested'
    ).length;
    const externalRefundsPending = orders.filter(
      (o) => o.returnRequest?.refundStatus === 'external_authorized_pending'
    ).length;
    const failedRefundCases = orders.filter(
      (o) => o.returnRequest?.refundStatus === 'failed'
    ).length;
    const pendingReviewsCount = reviews.filter(
      (r) => r.status === 'pending'
    ).length;
    const unansweredQuestionsCount = questions.filter(
      (q) => !q.answerAr && !q.answerEn
    ).length;

    return {
      statusFunnel,
      deliverySuccessRate,
      cancellationRate,
      ordersWithReturnReqCount: ordersWithReturnReq.length,
      resolvedReturnsCount,
      returnResolutionRate,
      refundStateCounts,
      generalSupportCount: generalSupportTickets.length,
      resolvedSupportCount,
      openSupportTicketsCount,
      supportResolutionRate,
      pendingTreasuryRequestsCount,
      pendingSellerApplications,
      suspendedSellers,
      suspendedProducts,
      draftProducts,
      criticalStockSkus,
      outOfStockProducts,
      pendingReturns,
      externalRefundsPending,
      failedRefundCases,
      pendingReviewsCount,
      unansweredQuestionsCount,
    };
  }, [filteredOrders, orders, tickets, sellers, products, reviews, questions]);

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
      downloadCsvFile(
        `atheel-analytics-categories-${dateRange}.csv`,
        headers,
        rows
      );
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
      downloadCsvFile(
        `atheel-analytics-sellers-${dateRange}.csv`,
        headers,
        rows
      );
      return;
    }

    if (activeTab === 'customers_geo') {
      const headers = [
        'City (AR)',
        'City (EN)',
        'Orders Count',
        'Unique Customers',
        'Valid GMV (SAR)',
        'Share of GMV (%)',
        'Average Order Value (SAR)',
      ];
      const rows = customerGeoInsights.cityRows.map((c) => [
        c.cityAr,
        c.cityEn,
        c.ordersCount,
        c.uniqueCustomers,
        c.gmv.toFixed(2),
        c.gmvSharePercent.toFixed(1),
        c.aov.toFixed(2),
      ]);
      downloadCsvFile(
        `atheel-analytics-geography-${dateRange}.csv`,
        headers,
        rows
      );
      return;
    }

    const headers = [
      'Order Number',
      'Created Date',
      'Customer ID',
      'City (AR)',
      'City (EN)',
      'Payment Method',
      'Order Status',
      'Return Status',
      'Refund Status',
      'Total (SAR)',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNumber,
      o.createdAt,
      o.customerId,
      o.address.cityAr,
      o.address.cityEn,
      o.paymentMethod,
      o.status,
      o.returnRequest?.status || 'none',
      o.returnRequest?.refundStatus || 'none',
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
                'مؤشرات أداء حتمية مشتقة مباشرة من الطلبات الفعلية، أداء التجار، التصنيفات، التوزيع الجغرافي للمدن السعودية، ومؤشرات سلامة العمليات التشغيلية.',
                'Deterministic executive metrics derived directly from marketplace orders, seller ledgers, category velocity, Saudi city distribution, and operational health.'
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
              <option value="all">
                {t('جميع المدن السعودية', 'All Saudi Cities')}
              </option>
              {availableCities.map((city) => (
                <option key={city.cityAr} value={city.cityAr}>
                  {lang === 'ar' ? city.cityAr : city.cityEn}
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
                ar: '4. أداء المنتجات والكتالوج',
                en: '4. Product Performance',
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
                ar: '6. سلامة المنصة والعمليات',
                en: '6. Marketplace Health & Funnel',
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
                {gmvRevenueStats.ordersCount}{' '}
                {t('طلب مسجل في النطاق', 'total orders in window')} ·{' '}
                {gmvRevenueStats.totalUnitsSold}{' '}
                {t('وحدة غير ملغاة', 'non-cancelled units')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#0B4F3F] font-bold">
                {t('صافي المبيعات الفعلي (Net GMV)', 'Net Realized GMV')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#0B4F3F]">
                {formatPrice(gmvRevenueStats.netRealizedGmv)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {t(
                  'بعد استبعاد الملغي والمسترد · ضريبة ١٥٪ مضمّنة:',
                  'Excludes cancelled & active refunds · Included VAT:'
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
                  'محتسب حتمياً وفق نسب عمولة التجار المعتمدة',
                  'Derived deterministically from merchant commission tiers'
                )}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1.5">
              <span className="text-[11px] font-mono uppercase text-[#8C857B]">
                {t('متوسط قيمة الطلب (AOV)', 'Average Order Value (AOV)')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413]">
                {formatPrice(gmvRevenueStats.aov)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {t('عبر الطلبات غير الملغاة:', 'Across non-cancelled orders:')}{' '}
                <span className="font-mono font-bold text-[#0B4F3F]">
                  {gmvRevenueStats.nonCancelledOrdersCount}
                </span>
              </p>
            </div>
          </div>

          {/* Truthful Order Fulfillment & Lifecycle Volume Breakdown (Requirement 10) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#0B4F3F] font-bold">
                {t('الطلبات غير الملغاة', 'Non-Cancelled Orders')}
              </span>
              <div className="text-xl font-bold font-mono text-[#141413]">
                {gmvRevenueStats.nonCancelledOrdersCount}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#1B6B45] font-bold">
                {t('طلبات تم تسليمها', 'Delivered Orders')}
              </span>
              <div className="text-xl font-bold font-mono text-[#1B6B45]">
                {gmvRevenueStats.deliveredOrdersCount}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#B45309] font-bold">
                {t('طلبات قيد التنفيذ والشحن', 'In-Fulfillment Orders')}
              </span>
              <div className="text-xl font-bold font-mono text-[#B45309]">
                {gmvRevenueStats.inFulfillmentOrdersCount}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#9E2A2B] font-bold">
                {t('طلبات بمطالبات إرجاع', 'Returned / Return Requested')}
              </span>
              <div className="text-xl font-bold font-mono text-[#9E2A2B]">
                {gmvRevenueStats.returnedOrRequestedOrdersCount}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#57534E] font-bold">
                {t('الطلبات الملغاة', 'Cancelled Orders')}
              </span>
              <div className="text-xl font-bold font-mono text-[#57534E]">
                {gmvRevenueStats.cancelledOrdersCount}
              </div>
            </div>
          </div>

          {/* Period Velocity Chart */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E0D6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    'المنحنى الزمني لإجمالي وصافي المبيعات حسب الشهر',
                    'Monthly Gross vs Net Realized GMV Trajectory'
                  )}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {t(
                    'مقارنة إجمالي قيمة الطلبات (Gross) مع الصافي الفعلي بعد استبعاد الإلغاء والمرتجعات (Net)',
                    'Compares Gross Order Volume against Net Realized GMV per period'
                  )}
                </p>
              </div>
              <span className="text-xs font-mono text-[#8C857B]">
                {gmvRevenueStats.periodSeries.length}{' '}
                {t('فترة زمنية', 'periods')}
              </span>
            </div>

            {gmvRevenueStats.periodSeries.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#8C857B]">
                {t(
                  'لا توجد طلبات ضمن النطاق الزمني المحدد',
                  'No orders in selected date range'
                )}
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
                              {item.ordersCount} {t('طلب', 'orders')} (
                              {item.nonCancelledCount}{' '}
                              {t('غير ملغي', 'non-cancelled')})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 font-mono">
                            <span className="text-[#57534E]">
                              Gross:{' '}
                              <strong className="text-[#141413]">
                                {formatPrice(item.grossGmv)}
                              </strong>
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
                  'محتسبة عبر ربط عناصر الطلبات (OrderItem.productId) بكتالوج المنتجات الفعلي',
                  'Derived by joining OrderItem.productId against the marketplace catalog'
                )}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-[#E6E0D6] text-[#8C857B] font-mono uppercase bg-[#FAF8F5]">
                  <th className="py-3 px-3 text-start">
                    {t('التصنيف', 'Category')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('المنتجات النشطة', 'Active Products')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('القطع المباعة', 'Units Sold')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('مبيعات التصنيف (GMV)', 'Category GMV')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('الحصة من السوق', 'Share of GMV')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('معدل المرتجعات', 'Return Rate')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('متوسط التقييم', 'Avg Rating')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {categoryStats.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#FAF8F5]/70">
                    <td className="py-3.5 px-3 font-bold text-[#141413]">
                      <div>{lang === 'ar' ? cat.nameAr : cat.nameEn}</div>
                      <div className="text-[10px] font-mono text-[#8C857B]">
                        {cat.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-[#0B4F3F]">
                        {cat.activeProductsCount}
                      </span>
                      <span className="text-[#8C857B]">
                        {' '}
                        / {cat.totalProducts}
                      </span>
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
                            style={{
                              width: `${Math.min(100, cat.gmvSharePercent)}%`,
                            }}
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
                placeholder={t(
                  'بحث باسم المتجر أو المدينة...',
                  'Search boutique or city...'
                )}
                className="w-full ps-8 pe-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-[#E6E0D6] text-[#8C857B] font-mono uppercase bg-[#FAF8F5]">
                  <th className="py-3 px-3 text-start">
                    {t('المتجر', 'Seller')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('المنتجات النشطة', 'Active Catalog')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('الطلبات / القطع', 'Orders / Units')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('إجمالي المبيعات', 'Gross Sales / GMV')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('العمولة', 'Commission')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t('معدل الاسترجاع', 'Return Rate')}
                  </th>
                  <th className="py-3 px-3 text-start">
                    {t(
                      'المتاح / المحجوز / القابل للطلب',
                      'Available / Reserved / Requestable'
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {sellerPerformanceRows.map((row) => (
                  <tr key={row.seller.id} className="hover:bg-[#FAF8F5]/70">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-[#141413]">
                        <span>
                          {lang === 'ar'
                            ? row.seller.nameAr
                            : row.seller.nameEn}
                        </span>
                        {row.seller.verifiedBadge && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#0B4F3F]" />
                        )}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {lang === 'ar'
                          ? row.seller.cityAr
                          : row.seller.cityEn}{' '}
                        ·{' '}
                        <span className="font-mono uppercase">
                          {row.seller.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-[#0B4F3F]">
                        {row.activeProducts}
                      </span>
                      <span className="text-[#8C857B]">
                        {' '}
                        / {row.totalProducts}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <span className="font-bold text-[#141413]">
                        {row.rangeOrdersCount}
                      </span>{' '}
                      {t('طلب', 'orders')} ({row.rangeUnitsSold}{' '}
                      {t('قطعة', 'u')})
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#141413]">
                      {formatPrice(row.effectiveGmv)}
                    </td>
                    <td className="py-3.5 px-3 font-mono">
                      <div className="font-bold text-[#0B4F3F]">
                        {formatPrice(row.effectiveCommission)}
                      </div>
                      <div className="text-[10px] text-[#8C857B]">
                        {row.rate}% tier
                      </div>
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
                            {formatPrice(
                              row.reservation.reservedPendingPayoutAmount
                            )}
                          </strong>
                        </span>
                        <span className="text-[#0B4F3F]">
                          {t('قابل للطلب:', 'Req:')}{' '}
                          <strong>
                            {formatPrice(row.reservation.requestableBalance)}
                          </strong>
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
          TAB 4: PRODUCT PERFORMANCE & CATALOG INTELLIGENCE (REQ 6 & 11)
      ==================================================================== */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Real ProductStatus Breakdown ('active' | 'draft' | 'out_of_stock' | 'suspended') */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#0B4F3F] font-bold">
                {t('منتجات نشطة (active)', 'Active Products')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#0B4F3F] mt-1">
                {catalogIntelligence.statusBreakdown.active}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#57534E] font-bold">
                {t('مسودات التجار (draft)', 'Draft Products')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413] mt-1">
                {catalogIntelligence.statusBreakdown.draft}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#B45309] font-bold">
                {t('منتجات موقوفة رقابياً (suspended)', 'Suspended Products')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#B45309] mt-1">
                {catalogIntelligence.statusBreakdown.suspended}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
              <span className="text-[11px] font-mono uppercase text-[#9E2A2B] font-bold">
                {t('منتجات نافدة (out_of_stock)', 'Out-of-Stock Products')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#9E2A2B] mt-1">
                {catalogIntelligence.statusBreakdown.out_of_stock}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Revenue Products */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#141413]">
                {t(
                  'أعلى المنتجات تحقيقاً للإيرادات (Top Revenue Products)',
                  'Top Revenue Products'
                )}
              </h3>
              <div className="divide-y divide-[#E6E0D6]">
                {catalogIntelligence.topByRevenue.map((stat, idx) => (
                  <div
                    key={stat.product.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#141413]">
                        #{idx + 1} ·{' '}
                        {lang === 'ar'
                          ? stat.product.titleAr
                          : stat.product.titleEn}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {lang === 'ar' ? stat.sellerNameAr : stat.sellerNameEn}{' '}
                        ·{' '}
                        {lang === 'ar'
                          ? stat.categoryNameAr
                          : stat.categoryNameEn}{' '}
                        · SKU:{' '}
                        <span className="font-mono">{stat.product.sku}</span>
                      </div>
                    </div>
                    <div className="text-end font-mono shrink-0">
                      <div className="font-bold text-[#0B4F3F]">
                        {formatPrice(stat.revenue)}
                      </div>
                      <div className="text-[11px] text-[#8C857B]">
                        {stat.unitsSold} {t('وحدة', 'units')} · ★{' '}
                        {stat.product.rating.toFixed(1)} (
                        {stat.product.reviewCount})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Units Sold */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#141413]">
                {t(
                  'الأعلى مبيعاً حسب عدد الوحدات (Top Units Sold)',
                  'Top Units Sold Products'
                )}
              </h3>
              <div className="divide-y divide-[#E6E0D6]">
                {catalogIntelligence.topByUnits.map((stat, idx) => (
                  <div
                    key={stat.product.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#141413]">
                        #{idx + 1} ·{' '}
                        {lang === 'ar'
                          ? stat.product.titleAr
                          : stat.product.titleEn}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {lang === 'ar' ? stat.sellerNameAr : stat.sellerNameEn}{' '}
                        · {t('المخزون:', 'Stock:')}{' '}
                        <span className="font-mono font-bold">
                          {stat.product.stock}
                        </span>
                        {stat.returnOrderCount > 0 && (
                          <span className="ms-2 text-[#9E2A2B]">
                            · {stat.returnOrderCount}{' '}
                            {t('طلب بمرتجع', 'order return(s)')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-end font-mono shrink-0">
                      <div className="font-bold text-[#141413]">
                        {stat.unitsSold}{' '}
                        {t('وحدة في النطاق', 'units in range')}
                      </div>
                      <div className="text-[11px] text-[#0B4F3F]">
                        {formatPrice(stat.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Low Stock High Demand */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[#141413]">
                  {t(
                    'منتجات عالية الطلب ومنخفضة المخزون (Low Stock High Demand)',
                    'Low Stock High Demand Watchlist'
                  )}
                </h3>
                <p className="text-[11px] text-[#57534E]">
                  {t(
                    'المنتجات التي وصلت إلى حد التنبيه الحرج للمخزون مع استمرار الطلب عليها',
                    'Active SKUs at or below lowStockThreshold sorted by sales velocity'
                  )}
                </p>
              </div>
              <div className="space-y-2">
                {catalogIntelligence.lowStockHighDemand.length === 0 ? (
                  <p className="text-xs text-[#8C857B] py-4 text-center">
                    {t(
                      'لا توجد منتجات حرجة المخزون حالياً',
                      'No critical low-stock products at this time'
                    )}
                  </p>
                ) : (
                  catalogIntelligence.lowStockHighDemand
                    .slice(0, 6)
                    .map((stat) => (
                      <div
                        key={stat.product.id}
                        className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-[#141413]">
                            {lang === 'ar'
                              ? stat.product.titleAr
                              : stat.product.titleEn}
                          </div>
                          <div className="text-[11px] font-mono text-[#8C857B]">
                            SKU: {stat.product.sku} ·{' '}
                            {formatPrice(stat.product.price)} ·{' '}
                            {stat.product.soldCount}{' '}
                            {t('مبيع تراكمي', 'total sold')}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#B45309] border border-amber-200 font-mono font-bold shrink-0">
                          {stat.product.stock} {t('متبقي', 'left')}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Out-of-Stock Revenue Risk */}
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[#141413]">
                  {t(
                    'مخاطر الإيرادات للمنتجات النافدة (Out-of-Stock Revenue Risk)',
                    'Out-of-Stock Revenue Risk'
                  )}
                </h3>
                <p className="text-[11px] text-[#57534E]">
                  {t(
                    'المنتجات المتوقفة بسبب نفاد الكمية (stock = 0 أو out_of_stock)',
                    'Products with status out_of_stock or zero inventory'
                  )}
                </p>
              </div>
              <div className="space-y-2">
                {catalogIntelligence.outOfStockRisk.length === 0 ? (
                  <p className="text-xs text-[#0B4F3F] font-semibold py-4 text-center">
                    {t(
                      'جميع المنتجات المعتمدة متوفرة في المخزون حالياً (0 نافد)',
                      'All catalog products currently have positive stock (0 out-of-stock)'
                    )}
                  </p>
                ) : (
                  catalogIntelligence.outOfStockRisk.slice(0, 6).map((stat) => (
                    <div
                      key={stat.product.id}
                      className="p-3 rounded-xl bg-red-50/40 border border-red-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#141413]">
                          {lang === 'ar'
                            ? stat.product.titleAr
                            : stat.product.titleEn}
                        </div>
                        <div className="text-[11px] font-mono text-[#57534E]">
                          SKU: {stat.product.sku} ·{' '}
                          {formatPrice(stat.product.price)}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-red-50 text-[#9E2A2B] border border-red-200 font-mono font-bold shrink-0">
                        {t('نافد (0)', 'Out of Stock (0)')}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 5: CUSTOMERS & SAUDI GEOGRAPHY (REQ 9 & 10)
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
                {t(
                  'عميل نشط بطلبات في النطاق',
                  'active ordering customers in window'
                )}
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
                {customerGeoInsights.repeatCustomersCount}{' '}
                {t('عميل متكرر مقابل', 'repeat vs')}{' '}
                {customerGeoInsights.singleOrderCustomersCount}{' '}
                {t('طلب منفرد', 'single-order')}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-1">
              <span className="text-[11px] font-mono uppercase text-[#8C857B]">
                {t('متوسط إنفاق العميل', 'Average Customer Spend')}
              </span>
              <div className="text-2xl font-bold font-mono text-[#141413]">
                {formatPrice(customerGeoInsights.avgCustomerLtv)}
              </div>
              <p className="text-[11px] text-[#57534E]">
                {t(
                  'صافي قيمة الطلبات لكل عميل نشط (customerId)',
                  'Realized spend per unique customerId'
                )}
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
                {t(
                  'رصيد داخلي جاهز للشراء الفوري',
                  'Available store credit across buyers'
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Saudi Cities Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
              <h3 className="text-base font-bold text-[#141413]">
                {t(
                  'التوزيع الجغرافي للمبيعات حسب المدن السعودية (order.address)',
                  'Geographic GMV & Order Distribution Across Saudi Cities'
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6E0D6] text-[#8C857B] font-mono uppercase bg-[#FAF8F5]">
                      <th className="py-2.5 px-3 text-start">
                        {t('المدينة', 'City')}
                      </th>
                      <th className="py-2.5 px-3 text-start">
                        {t('الطلبات', 'Orders')}
                      </th>
                      <th className="py-2.5 px-3 text-start">
                        {t('العملاء الفريدون', 'Unique Buyers')}
                      </th>
                      <th className="py-2.5 px-3 text-start">
                        {t('إجمالي المبيعات (GMV)', 'City GMV')}
                      </th>
                      <th className="py-2.5 px-3 text-start">
                        {t('الحصة', 'Share')}
                      </th>
                      <th className="py-2.5 px-3 text-start">
                        {t('متوسط الطلب (AOV)', 'AOV')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E0D6]">
                    {customerGeoInsights.cityRows.map((c) => (
                      <tr key={c.cityAr} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 px-3 font-bold text-[#141413]">
                          {lang === 'ar' ? c.cityAr : c.cityEn}
                        </td>
                        <td className="py-3 px-3 font-mono">{c.ordersCount}</td>
                        <td className="py-3 px-3 font-mono">
                          {c.uniqueCustomers}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-[#0B4F3F]">
                          {formatPrice(c.gmv)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {c.gmvSharePercent.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {formatPrice(c.aov)}
                        </td>
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
                  {t(
                    'مزيج وسائل الدفع (order.paymentMethod)',
                    'Payment Method Mix'
                  )}
                </h3>
              </div>
              <div className="space-y-3">
                {customerGeoInsights.paymentRows.map((pm) => {
                  const labelObj = PAYMENT_METHOD_LABELS[pm.method] || {
                    ar: pm.method,
                    en: pm.method,
                  };
                  return (
                    <div
                      key={pm.method}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#141413]">
                          {lang === 'ar' ? labelObj.ar : labelObj.en}
                        </span>
                        <span className="font-mono font-bold text-[#0B4F3F]">
                          {pm.sharePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E6E0D6] overflow-hidden">
                        <div
                          className="h-full bg-[#0B4F3F]"
                          style={{
                            width: `${Math.min(100, pm.sharePercent)}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#57534E]">
                        <span>
                          {pm.ordersCount} {t('طلب', 'orders')}
                        </span>
                        <span>{formatPrice(pm.gmv)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 6: MARKETPLACE HEALTH & ORDER FUNNEL (REQ 3, 4, 7, 8 & 12)
      ==================================================================== */}
      {activeTab === 'operations_sla' && (
        <div className="space-y-6">
          {/* Real 9-State OrderStatus Funnel (Requirement 3) */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
            <h3 className="text-base font-bold text-[#141413]">
              {t(
                'قمع حالات الطلبات الفعلي (Real OrderStatus Operational Funnel)',
                'End-to-End OrderStatus Operational Funnel'
              )}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
              {(
                [
                  {
                    key: 'placed',
                    ar: 'تم الإنشاء',
                    en: 'Placed',
                    val: operationsHealth.statusFunnel.placed,
                  },
                  {
                    key: 'confirmed',
                    ar: 'مؤكد',
                    en: 'Confirmed',
                    val: operationsHealth.statusFunnel.confirmed,
                  },
                  {
                    key: 'preparing',
                    ar: 'قيد التجهيز',
                    en: 'Preparing',
                    val: operationsHealth.statusFunnel.preparing,
                  },
                  {
                    key: 'shipped',
                    ar: 'تم الشحن',
                    en: 'Shipped',
                    val: operationsHealth.statusFunnel.shipped,
                  },
                  {
                    key: 'out_for_delivery',
                    ar: 'خرج للتوصيل',
                    en: 'Out for Delivery',
                    val: operationsHealth.statusFunnel.out_for_delivery,
                  },
                  {
                    key: 'delivered',
                    ar: 'تم التسليم',
                    en: 'Delivered',
                    val: operationsHealth.statusFunnel.delivered,
                  },
                  {
                    key: 'return_requested',
                    ar: 'طلب إرجاع',
                    en: 'Return Req.',
                    val: operationsHealth.statusFunnel.return_requested,
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
                  className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-center space-y-1"
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

          {/* 12 Objective Marketplace Health Indicators (Requirement 12) */}
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-[#E6E0D6] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#141413]">
                  {t(
                    'مؤشرات سلامة المنصة والحوكمة التشغيلية (Marketplace Health)',
                    'Objective Marketplace Health & Governance Matrix'
                  )}
                </h3>
                <p className="text-xs text-[#57534E]">
                  {t(
                    'قراءات حتمية مباشرة من الحالات الفعلية للتجار، المنتجات، المرتجعات، الخزينة، والتذاكر',
                    'Deterministic counts derived strictly from real current entity states'
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                {
                  ar: 'طلبات انضمام تجار معلقة (pending)',
                  en: 'Pending Seller Applications',
                  value: operationsHealth.pendingSellerApplications,
                  tone: 'text-[#B45309]',
                },
                {
                  ar: 'تجار موقوفون (suspended)',
                  en: 'Suspended Sellers',
                  value: operationsHealth.suspendedSellers,
                  tone: 'text-[#9E2A2B]',
                },
                {
                  ar: 'منتجات موقوفة رقابياً (suspended)',
                  en: 'Suspended Products',
                  value: operationsHealth.suspendedProducts,
                  tone: 'text-[#9E2A2B]',
                },
                {
                  ar: 'مسودات منتجات (draft)',
                  en: 'Draft Products',
                  value: operationsHealth.draftProducts,
                  tone: 'text-[#57534E]',
                },
                {
                  ar: 'منتجات حرجة المخزون (Critical Stock)',
                  en: 'Critical Stock SKUs',
                  value: operationsHealth.criticalStockSkus,
                  tone: 'text-[#B45309]',
                },
                {
                  ar: 'منتجات نافدة المخزون (Out-of-Stock)',
                  en: 'Out-of-Stock Products',
                  value: operationsHealth.outOfStockProducts,
                  tone: 'text-[#9E2A2B]',
                },
                {
                  ar: 'طلبات إرجاع معلقة (Pending Returns)',
                  en: 'Pending Returns',
                  value: operationsHealth.pendingReturns,
                  tone: 'text-[#B45309]',
                },
                {
                  ar: 'استردادات خارجية بانتظار البوابة',
                  en: 'External Refunds Pending',
                  value: operationsHealth.externalRefundsPending,
                  tone: 'text-[#9E2A2B]',
                },
                {
                  ar: 'حالات استرداد متعثرة (failed)',
                  en: 'Failed Refund Cases',
                  value: operationsHealth.failedRefundCases,
                  tone: 'text-[#9E2A2B]',
                },
                {
                  ar: 'تذاكر دعم مفتوحة (Open Tickets)',
                  en: 'Open Support Tickets',
                  value: operationsHealth.openSupportTicketsCount,
                  tone: 'text-[#0B4F3F]',
                },
                {
                  ar: 'طلبات تسوية خزينة معلقة',
                  en: 'Pending Treasury Requests',
                  value: operationsHealth.pendingTreasuryRequestsCount,
                  tone: 'text-[#B45309]',
                },
                {
                  ar: 'استفسارات منتجات غير مجابة',
                  en: 'Unanswered Product Questions',
                  value: operationsHealth.unansweredQuestionsCount,
                  tone: 'text-[#141413]',
                },
              ].map((metric, index) => (
                <div
                  key={index}
                  className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1"
                >
                  <div className="text-xs text-[#57534E] font-semibold">
                    {lang === 'ar' ? metric.ar : metric.en}
                  </div>
                  <div
                    className={`text-2xl font-bold font-mono ${metric.tone}`}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Resolution & Refund State Breakdown (Requirement 4) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <span className="text-xs font-mono uppercase text-[#0B4F3F] font-bold">
                {t(
                  'معدلات الفصل في المرتجعات والدعم الفني',
                  'Return Adjudication & Support Resolution'
                )}
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t(
                      'معدل تسليم الطلبات المكتملة (delivered)',
                      'Order Delivery Rate'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#0B4F3F]">
                    {operationsHealth.deliverySuccessRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t(
                      'معدل البت في المرتجعات (approved / rejected)',
                      'Return Adjudication Rate (approved / rejected)'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#141413]">
                    {operationsHealth.returnResolutionRate.toFixed(1)}% (
                    {operationsHealth.resolvedReturnsCount}/
                    {operationsHealth.ordersWithReturnReqCount})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t(
                      'معدل حل تذاكر الدعم الفني',
                      'Support Ticket Resolution Rate'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#0B4F3F]">
                    {operationsHealth.supportResolutionRate.toFixed(1)}% (
                    {operationsHealth.resolvedSupportCount}/
                    {operationsHealth.generalSupportCount})
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#57534E]">
                    {t(
                      'مراجعات العملاء قيد الانتظار (review.status = pending)',
                      'Pending Customer Reviews'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#B45309]">
                    {operationsHealth.pendingReviewsCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-5 space-y-3">
              <span className="text-xs font-mono uppercase text-[#9E2A2B] font-bold">
                {t(
                  'توزيع حالات الاسترداد المالي (ReturnRequest.refundStatus)',
                  'Financial Refund Exposure States (refundStatus)'
                )}
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t(
                      'مكتمل في محفظة العميل (wallet_completed)',
                      'Wallet Completed (Settled Credit)'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#1B6B45]">
                    {operationsHealth.refundStateCounts.wallet_completed}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#9E2A2B] font-semibold">
                    {t(
                      'التزام معلق لبوابة الدفع (external_authorized_pending)',
                      'External Authorized Pending (Gateway Liability)'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#9E2A2B]">
                    {
                      operationsHealth.refundStateCounts
                        .external_authorized_pending
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-[#E6E0D6]">
                  <span className="text-[#57534E]">
                    {t(
                      'استرداد متعثر يتطلب معالجة (failed)',
                      'Failed Gateway Reversal (failed)'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#B45309]">
                    {operationsHealth.refundStateCounts.failed}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[#57534E]">
                    {t(
                      'بانتظار قرار الفصل الرقابي (none)',
                      'Awaiting Adjudication (none)'
                    )}
                  </span>
                  <span className="font-mono font-bold text-[#141413]">
                    {operationsHealth.refundStateCounts.none}
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
