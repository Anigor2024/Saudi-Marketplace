'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  RotateCcw,
  Users,
  Search,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wallet,
  Award,
  MapPin,
  FileText,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { Order, OrderStatus, UserProfile } from '@/lib/types';

interface AdminOrdersReturnsCustomersProps {
  section?: 'orders' | 'returns' | 'customers';
  activeSection?: 'orders' | 'returns' | 'customers';
}

export default function AdminOrdersReturnsCustomers({
  section,
  activeSection,
}: AdminOrdersReturnsCustomersProps) {
  const effectiveSection = section || activeSection || 'orders';
  const {
    lang,
    t,
    formatPrice,
    orders,
    sellers,
    users,
    tickets,
    updateOrderStatus,
    cancelOrder,
    processReturnRequest,
    adjustCustomerWalletAndLoyalty,
  } = useMarketplace();

  // ============================================================================
  // 1. ORDERS SUPERVISION STATE
  // ============================================================================
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [orderSellerFilter, setOrderSellerFilter] = useState<string>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');
  const [orderFromDate, setOrderFromDate] = useState<string>('');
  const [orderToDate, setOrderToDate] = useState<string>('');
  const [inspectingOrderId, setInspectingOrderId] = useState<string | null>(null);

  const [overrideStatus, setOverrideStatus] = useState<OrderStatus>('confirmed');
  const [overrideCarrierAr, setOverrideCarrierAr] = useState<string>('سبل إكسبريس VIP');
  const [overrideCarrierEn, setOverrideCarrierEn] = useState<string>('SPL Express VIP');
  const [overrideTracking, setOverrideTracking] = useState<string>('');
  const [overrideNote, setOverrideNote] = useState<string>('');

  const inspectingOrder = useMemo(
    () => orders.find((o) => o.id === inspectingOrderId) || null,
    [orders, inspectingOrderId]
  );

  const openOrderInspector = (order: Order) => {
    setInspectingOrderId(order.id);
    setOverrideStatus(order.status);
    setOverrideCarrierAr(order.carrierAr || 'سبل إكسبريس VIP');
    setOverrideCarrierEn(order.carrierEn || 'SPL Express VIP');
    setOverrideTracking(order.trackingNumber || '');
    setOverrideNote('');
  };

  const handleCarrierSelect = (carrierCode: string) => {
    if (carrierCode === 'spl') {
      setOverrideCarrierAr('سبل إكسبريس VIP');
      setOverrideCarrierEn('SPL Express VIP');
    } else if (carrierCode === 'aramex') {
      setOverrideCarrierAr('أرامكس بريميوم');
      setOverrideCarrierEn('Aramex Premium');
    } else if (carrierCode === 'smsa') {
      setOverrideCarrierAr('سمسا إكسبريس');
      setOverrideCarrierEn('SMSA Express');
    } else if (carrierCode === 'dhl') {
      setOverrideCarrierAr('دي إتش إل إكسبريس');
      setOverrideCarrierEn('DHL Express KSA');
    }
  };

  const handleApplyOrderOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingOrder) return;
    if (overrideStatus === 'cancelled') {
      await cancelOrder(
        inspectingOrder.id,
        overrideNote.trim() || t('إلغاء إداري من مركز العمليات', 'Cancelled by Executive Admin')
      );
    } else {
      await updateOrderStatus(
        inspectingOrder.id,
        overrideStatus,
        overrideTracking,
        overrideCarrierAr,
        overrideCarrierEn,
        overrideNote
      );
    }
    setInspectingOrderId(null);
  };

  const orderStats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalGmv = validOrders.reduce((sum, o) => sum + o.total, 0);
    const totalVat = validOrders.reduce((sum, o) => sum + o.vatAmount, 0);
    const inProgress = orders.filter((o) =>
      ['placed', 'confirmed', 'preparing', 'shipped', 'out_for_delivery'].includes(o.status)
    ).length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    return {
      totalCount: orders.length,
      totalGmv,
      totalVat,
      inProgress,
      delivered,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (
        orderSellerFilter !== 'all' &&
        !o.sellerIds?.includes(orderSellerFilter) &&
        !o.items.some((item) => item.sellerId === orderSellerFilter)
      ) {
        return false;
      }
      if (orderPaymentFilter !== 'all' && o.paymentMethod !== orderPaymentFilter) return false;
      const orderDateStr = o.createdAt.slice(0, 10);
      if (orderFromDate && orderDateStr < orderFromDate) return false;
      if (orderToDate && orderDateStr > orderToDate) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q) ||
        o.address.cityAr.toLowerCase().includes(q) ||
        o.address.cityEn.toLowerCase().includes(q)
      );
    });
  }, [
    orders,
    orderSearch,
    orderStatusFilter,
    orderSellerFilter,
    orderPaymentFilter,
    orderFromDate,
    orderToDate,
  ]);

  // ============================================================================
  // 2. RETURNS & REFUNDS ADJUDICATION STATE
  // ============================================================================
  const [returnStatusFilter, setReturnStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [returnAdminNotes, setReturnAdminNotes] = useState<Record<string, string>>({});

  const returnOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          Boolean(o.returnRequest) ||
          o.status === 'return_requested' ||
          o.status === 'returned'
      ),
    [orders]
  );

  const filteredReturnOrders = useMemo(() => {
    return returnOrders.filter((o) => {
      const reqStatus =
        o.returnRequest?.status || (o.status === 'returned' ? 'approved' : 'pending');
      if (returnStatusFilter !== 'all' && reqStatus !== returnStatusFilter) return false;
      return true;
    });
  }, [returnOrders, returnStatusFilter]);

  const returnStats = useMemo(() => {
    const pending = returnOrders.filter(
      (o) => (o.returnRequest?.status || 'pending') === 'pending' && o.status !== 'returned'
    ).length;
    const approved = returnOrders.filter(
      (o) => o.returnRequest?.status === 'approved' || o.status === 'returned'
    ).length;
    const rejected = returnOrders.filter((o) => o.returnRequest?.status === 'rejected').length;
    const totalValue = returnOrders.reduce((sum, o) => sum + o.total, 0);
    return { total: returnOrders.length, pending, approved, rejected, totalValue };
  }, [returnOrders]);

  // ============================================================================
  // 3. CUSTOMERS & VIP REGISTRY STATE
  // ============================================================================
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'customer' | 'seller' | 'admin'>(
    'all'
  );
  const [userTierFilter, setUserTierFilter] = useState<
    'all' | 'Royal Obsidian' | 'Gold' | 'Silver' | 'Bronze'
  >('all');
  const [inspectingUserId, setInspectingUserId] = useState<string | null>(null);

  const [walletAdjustment, setWalletAdjustment] = useState<number>(0);
  const [pointsAdjustment, setPointsAdjustment] = useState<number>(0);
  const [tierDraft, setTierDraft] = useState<UserProfile['loyaltyTier']>('Silver');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  const inspectingUser = useMemo(
    () => users.find((u) => u.id === inspectingUserId) || null,
    [users, inspectingUserId]
  );

  const openUserInspector = (user: UserProfile) => {
    setInspectingUserId(user.id);
    setWalletAdjustment(0);
    setPointsAdjustment(0);
    setTierDraft(user.loyaltyTier);
    setAdjustmentReason('');
  };

  const handleSaveUserAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingUser) return;
    const reasonAr =
      adjustmentReason.trim() ||
      `تعديل رصيد المحفظة (${walletAdjustment >= 0 ? '+' : ''}${walletAdjustment} ر.س) ونقاط الولاء (${pointsAdjustment >= 0 ? '+' : ''}${pointsAdjustment}) والفئة (${tierDraft})`;
    const reasonEn =
      adjustmentReason.trim() ||
      `Executive VIP Concierge adjustment: Wallet (${walletAdjustment} SAR), Points (${pointsAdjustment}), Tier (${tierDraft})`;

    await adjustCustomerWalletAndLoyalty(
      inspectingUser.id,
      walletAdjustment,
      pointsAdjustment,
      tierDraft,
      reasonAr,
      reasonEn
    );
    setWalletAdjustment(0);
    setPointsAdjustment(0);
    setAdjustmentReason('');
  };

  const customerStats = useMemo(() => {
    const vipCount = users.filter(
      (u) => u.loyaltyTier === 'Royal Obsidian' || u.loyaltyTier === 'Gold'
    ).length;
    const totalWallet = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);
    const totalPoints = users.reduce((sum, u) => sum + (u.loyaltyPoints || 0), 0);
    return {
      totalUsers: users.length,
      vipCount,
      totalWallet,
      totalPoints,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userTierFilter !== 'all' && u.loyaltyTier !== userTierFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.referralCode.toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userRoleFilter, userTierFilter]);

  // ============================================================================
  // RENDER 1: ORDERS SUPERVISION
  // ============================================================================
  if (effectiveSection === 'orders') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#0B4F3F]">
              {t('مركز عمليات الطلبات والشحنات', 'Marketplace Order & Logistics Supervision')}
            </div>
            <h2 className="text-xl font-bold text-[#141413] mt-1">
              {t('الرقابة المركزية على الطلبات متعددة البائعين', 'Platform-Wide Multi-Vendor Orders')}
            </h2>
            <p className="text-xs text-[#57534E] mt-1">
              {t(
                'متابعة دورة حياة جميع الطلبات، التحقق من الفواتير الضريبية ١٥٪، الإشراف على شركات الشحن الوطنية، والتدخل الفوري لحل الاختناقات اللوجستية.',
                'Monitor end-to-end fulfillment across all Saudi boutiques, inspect 15% VAT invoices, track express couriers, and execute administrative fulfillment overrides.'
              )}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('إجمالي الطلبات المسجلة', 'Total Orders')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#141413] mt-1">
              {orderStats.totalCount}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('قيمة الطلبات الفعالة', 'Active Order GMV')}</div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#0B4F3F] mt-1">
              {formatPrice(orderStats.totalGmv)}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('ضريبة القيمة المضافة ١٥٪', '15% VAT Collected')}</div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#141413] mt-1">
              {formatPrice(Math.round(orderStats.totalVat))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('قيد التجهيز والشحن', 'In Fulfillment / Transit')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#B7791F] mt-1">
              {orderStats.inProgress}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('تم التسليم بنجاح', 'Delivered Orders')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
              {orderStats.delivered}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6E0D6] overflow-x-auto">
            {(
              [
                { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                { id: 'placed', labelAr: 'جديد', labelEn: 'Placed' },
                { id: 'confirmed', labelAr: 'مؤكد', labelEn: 'Confirmed' },
                { id: 'preparing', labelAr: 'قيد التجهيز', labelEn: 'Preparing' },
                { id: 'shipped', labelAr: 'تم الشحن', labelEn: 'Shipped' },
                { id: 'out_for_delivery', labelAr: 'خرج للتوصيل', labelEn: 'Out for Delivery' },
                { id: 'delivered', labelAr: 'تم التسليم', labelEn: 'Delivered' },
                { id: 'return_requested', labelAr: 'طلب إرجاع', labelEn: 'Return Requested' },
                { id: 'returned', labelAr: 'مسترجع', labelEn: 'Returned' },
                { id: 'cancelled', labelAr: 'ملغي', labelEn: 'Cancelled' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOrderStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  orderStatusFilter === tab.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(tab.labelAr, tab.labelEn)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F3EFEA]">
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={orderSellerFilter}
                onChange={(e) => setOrderSellerFilter(e.target.value)}
                aria-label={t('تصفية حسب المتجر', 'Filter by Seller')}
                className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
              >
                <option value="all">{t('جميع المتاجر', 'All Boutiques')}</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'ar' ? s.nameAr : s.nameEn}
                  </option>
                ))}
              </select>

              <select
                value={orderPaymentFilter}
                onChange={(e) => setOrderPaymentFilter(e.target.value)}
                aria-label={t('تصفية حسب وسيلة الدفع', 'Filter by Payment Method')}
                className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
              >
                <option value="all">{t('جميع وسائل الدفع', 'All Payment Methods')}</option>
                <option value="mada">MADA</option>
                <option value="apple_pay">APPLE PAY</option>
                <option value="stc_pay">STC PAY</option>
                <option value="visa_mastercard">VISA / MASTERCARD</option>
                <option value="wallet">ATHEEL WALLET</option>
                <option value="cod">COD</option>
              </select>

              <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E6E0D6] rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-[#8C857B] font-semibold">
                  {t('من تاريخ:', 'From Date:')}
                </span>
                <input
                  type="date"
                  value={orderFromDate}
                  onChange={(e) => setOrderFromDate(e.target.value)}
                  className="bg-transparent font-mono text-xs text-[#141413] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E6E0D6] rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-[#8C857B] font-semibold">
                  {t('إلى تاريخ:', 'To Date:')}
                </span>
                <input
                  type="date"
                  value={orderToDate}
                  onChange={(e) => setOrderToDate(e.target.value)}
                  className="bg-transparent font-mono text-xs text-[#141413] focus:outline-none"
                />
              </div>

              {(orderFromDate || orderToDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setOrderFromDate('');
                    setOrderToDate('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E6E0D6] text-[11px] font-bold text-[#9E2A2B] hover:bg-red-50"
                >
                  {t('مسح التاريخ', 'Clear Dates')}
                </button>
              )}
            </div>

            <div className="relative min-w-[260px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder={t(
                  'بحث برقم الطلب #ATH، اسم العميل، المدينة، أو رقم التتبع...',
                  'Search by Order #, customer, city, or tracking #...'
                )}
                className="w-full ps-10 pe-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413] focus:outline-none focus:border-[#0B4F3F]"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#FAF8F5] border-b border-[#E6E0D6] text-[#57534E]">
                <tr>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('رقم الطلب والتاريخ', 'Order # & Date')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('العميل والعنوان الوطني', 'Customer & Saudi Address')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('المتاجر والمنتجات', 'Boutiques & Items')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('الشحن والتتبع', 'Carrier & Tracking')}
                  </th>
                  <th className="py-3.5 px-4 text-start font-bold">
                    {t('الحالة', 'Status')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('الإجمالي والضريبة', 'Total & VAT')}
                  </th>
                  <th className="py-3.5 px-4 text-end font-bold">
                    {t('إدارة الطلب', 'Supervision')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFEA]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#8C857B]">
                      {t('لا توجد طلبات مطابقة للتصفية الحالية.', 'No orders match the current filter.')}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FAF8F5]/70 transition-colors">
                      <td className="py-4 px-4 font-mono tabular-nums">
                        <div className="font-bold text-[#141413]">#{order.orderNumber}</div>
                        <div className="text-[11px] text-[#8C857B]">
                          {order.createdAt.split('T')[0]} · {order.paymentMethod.toUpperCase()}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-[#141413]">{order.customerName}</div>
                        <div className="text-[11px] text-[#57534E]">
                          {lang === 'ar' ? order.address.cityAr : order.address.cityEn} —{' '}
                          {order.address.districtAr} ({order.address.postalCode})
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-[#141413]">
                          {order.items.length} {t('قطع', 'items')}
                        </div>
                        <div className="text-[11px] text-[#57534E] line-clamp-1">
                          {Array.from(
                            new Set(
                              order.items.map((i) =>
                                lang === 'ar' ? i.sellerNameAr : i.sellerNameEn
                              )
                            )
                          ).join(' ، ')}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-[#141413]">
                          {lang === 'ar' ? order.carrierAr : order.carrierEn}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-[#8C857B]">
                          {order.trackingNumber || '—'}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`font-bold ${
                            order.status === 'delivered'
                              ? 'text-[#1B6B45]'
                              : order.status === 'cancelled' || order.status === 'returned'
                              ? 'text-[#9E2A2B]'
                              : order.status === 'return_requested'
                              ? 'text-[#B7791F]'
                              : 'text-[#0B4F3F]'
                          }`}
                        >
                          {order.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-end font-mono tabular-nums">
                        <div className="font-bold text-[#141413]">{formatPrice(order.total)}</div>
                        <div className="text-[11px] text-[#8C857B]">
                          VAT: {formatPrice(Math.round(order.vatAmount))}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-end">
                        <button
                          type="button"
                          onClick={() => openOrderInspector(order)}
                          className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[#141413] text-[11px] font-bold whitespace-nowrap"
                        >
                          {t('فحص وتحديث الحالة', 'Inspect & Override')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Inspector & Fulfillment Override Modal */}
        {inspectingOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleApplyOrderOverride}
              className="bg-white rounded-2xl border border-[#E6E0D6] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D6] pb-4">
                <div>
                  <div className="text-xs font-bold text-[#0B4F3F]">
                    {t('تفاصيل الطلب والتحكم اللوجستي التنفيذي', 'Executive Order Inspection & Logistics Override')}
                  </div>
                  <h3 className="text-xl font-bold font-mono text-[#141413] mt-1">
                    #{inspectingOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    {inspectingOrder.customerName} · {inspectingOrder.customerPhone} ·{' '}
                    {inspectingOrder.customerEmail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingOrderId(null)}
                  className="p-2 rounded-lg text-[#8C857B] hover:text-[#141413]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Address & Financials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5">
                  <div className="font-bold text-[#141413]">
                    {t('العنوان الوطني السعودي للتوصيل', 'Saudi National Delivery Address')}
                  </div>
                  <div className="text-[#57534E]">
                    {inspectingOrder.address.cityAr} — {inspectingOrder.address.districtAr}،{' '}
                    {inspectingOrder.address.streetAr}
                  </div>
                  <div className="font-mono text-[11px] text-[#8C857B]">
                    {t('مبنى:', 'Bldg:')} {inspectingOrder.address.buildingNumber} ·{' '}
                    {t('الرمز البريدي:', 'Postal:')} {inspectingOrder.address.postalCode} ·{' '}
                    {t('إضافي:', 'Addl:')} {inspectingOrder.address.additionalNumber}
                  </div>
                  <div className="text-[11px] text-[#57534E]">
                    {inspectingOrder.address.landmarkAr}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5">
                  <div className="font-bold text-[#141413]">
                    {t('ملخص الفاتورة الضريبية والدفع', 'ZATCA Tax Invoice & Payment')}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t('المجموع الفرعي:', 'Subtotal:')}</span>
                    <span className="font-mono font-bold">{formatPrice(inspectingOrder.subtotal)}</span>
                  </div>
                  {inspectingOrder.discountAmount > 0 && (
                    <div className="flex justify-between text-[#1B6B45]">
                      <span>
                        {t('الخصم المطبق:', 'Discount:')} ({inspectingOrder.couponCode})
                      </span>
                      <span className="font-mono font-bold">
                        -{formatPrice(inspectingOrder.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">
                      {t('ضريبة القيمة المضافة ١٥٪ المشمولة:', 'Included 15% VAT:')}
                    </span>
                    <span className="font-mono">{formatPrice(inspectingOrder.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#E6E0D6] font-bold text-sm text-[#0B4F3F]">
                    <span>{t('الإجمالي النهائي:', 'Final Total:')}</span>
                    <span className="font-mono">{formatPrice(inspectingOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Order Line Items */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2.5">
                <div className="text-xs font-bold text-[#141413]">
                  {t('بنود الطلب والمتاجر المنفذة', 'Order Line Items & Fulfilling Boutiques')}
                </div>
                <div className="divide-y divide-[#E6E0D6]">
                  {inspectingOrder.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={lang === 'ar' ? item.titleAr : item.titleEn}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-[#E6E0D6]"
                        />
                        <div>
                          <div className="font-bold text-[#141413]">
                            {lang === 'ar' ? item.titleAr : item.titleEn}
                          </div>
                          <div className="text-[11px] text-[#57534E]">
                            {lang === 'ar' ? item.sellerNameAr : item.sellerNameEn} ·{' '}
                            <span className="font-mono">
                              {item.sku} × {item.quantity}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-[#141413]">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Fulfillment Override Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-[#141413] mb-1.5">
                    {t('تحديث حالة الطلب', 'Order Status Override')}
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-semibold text-[#141413]"
                  >
                    <option value="placed">{t('تم استلام الطلب (Placed)', 'Placed')}</option>
                    <option value="confirmed">{t('تم تأكيد الطلب (Confirmed)', 'Confirmed')}</option>
                    <option value="preparing">{t('قيد التجهيز (Preparing)', 'Preparing')}</option>
                    <option value="shipped">{t('تم الشحن (Shipped)', 'Shipped')}</option>
                    <option value="out_for_delivery">
                      {t('خرج للتوصيل (Out for Delivery)', 'Out for Delivery')}
                    </option>
                    <option value="delivered">{t('تم التسليم (Delivered)', 'Delivered')}</option>
                    <option value="cancelled">{t('إلغاء الطلب (Cancelled)', 'Cancelled')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1.5">
                    {t('الناقل اللوجستي المعتمد', 'Assigned Express Carrier')}
                  </label>
                  <select
                    onChange={(e) => handleCarrierSelect(e.target.value)}
                    defaultValue="spl"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-semibold text-[#141413]"
                  >
                    <option value="spl">{t('سبل إكسبريس VIP', 'SPL Express VIP')}</option>
                    <option value="aramex">{t('أرامكس بريميوم', 'Aramex Premium')}</option>
                    <option value="smsa">{t('سمسا إكسبريس', 'SMSA Express')}</option>
                    <option value="dhl">{t('دي إتش إل إكسبريس', 'DHL Express KSA')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#141413] mb-1.5">
                    {t('رقم بوليصة التتبع (AWB)', 'Tracking Number (AWB)')}
                  </label>
                  <input
                    type="text"
                    value={overrideTracking}
                    onChange={(e) => setOverrideTracking(e.target.value)}
                    placeholder="SPL-99812034SA"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] font-mono text-[#141413]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#141413] mb-1.5">
                  {t('ملاحظة العمليات اللوجستية (تضاف لسجل تتبع الشحنة)', 'Fulfillment / Audit Note')}
                </label>
                <input
                  type="text"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder={t(
                    'مثال: تم تأكيد الشحنة السريعة مع مندوب سبل VIP...',
                    'e.g. Verified priority dispatch with SPL VIP courier...'
                  )}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6E0D6]">
                <button
                  type="button"
                  onClick={() => setInspectingOrderId(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413]"
                >
                  {t('إغلاق', 'Close')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30]"
                >
                  {t('حفظ وتطبيق التحديث اللوجستي', 'Apply Fulfillment Update')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: RETURNS & REFUNDS ADJUDICATION
  // ============================================================================
  if (effectiveSection === 'returns') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6">
          <div className="text-xs font-semibold text-[#0B4F3F]">
            {t('حماية المشتري والفصل في المرتجعات', 'Buyer Protection & Return Adjudication')}
          </div>
          <h2 className="text-xl font-bold text-[#141413] mt-1">
            {t('إدارة طلبات الإرجاع والاسترداد المالي', 'Returns, Inspections & Refunds Desk')}
          </h2>
          <p className="text-xs text-[#57534E] mt-1">
            {t(
              'مراجعة أسباب الإرجاع من العملاء، الاطلاع على توصية الفحص الفني من المتجر، واعتماد استرداد المبالغ إلى محفظة أثيل أو وسيلة الدفع الأصلية.',
              'Review customer return claims alongside merchant technical inspection reports, and authorize wallet or original-payment refunds.'
            )}
          </p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('بانتظار القرار الإداري', 'Pending Adjudication')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#B7791F] mt-1">
              {returnStats.pending}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('تمت الموافقة والاسترداد', 'Approved & Refunded')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
              {returnStats.approved}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
            <div className="text-xs text-[#8C857B]">{t('طلبات إرجاع مرفوضة', 'Declined Claims')}</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-[#9E2A2B] mt-1">
              {returnStats.rejected}
            </div>
          </div>
          <div className="bg-[#141413] text-white rounded-2xl border border-[#C59B27]/30 p-4">
            <div className="text-xs text-[#D6D0C4]">{t('إجمالي قيمة المرتجعات', 'Total Return Volume')}</div>
            <div className="text-xl font-bold font-mono tabular-nums text-[#C59B27] mt-1">
              {formatPrice(returnStats.totalValue)}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6E0D6]">
            {(
              [
                { id: 'all', labelAr: 'جميع المطالبات', labelEn: 'All Claims' },
                { id: 'pending', labelAr: 'بانتظار القرار', labelEn: 'Pending Decision' },
                { id: 'approved', labelAr: 'تمت الموافقة', labelEn: 'Approved' },
                { id: 'rejected', labelAr: 'مرفوضة', labelEn: 'Rejected' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReturnStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  returnStatusFilter === tab.id
                    ? 'bg-[#0B4F3F] text-white'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t(tab.labelAr, tab.labelEn)}
              </button>
            ))}
          </div>
        </div>

        {/* Return Claims List */}
        <div className="space-y-4">
          {filteredReturnOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-12 text-center text-xs text-[#8C857B]">
              {t('لا توجد طلبات إرجاع مطابقة للتصفية المختارة.', 'No return requests match the selected filter.')}
            </div>
          ) : (
            filteredReturnOrders.map((order) => {
              const req = order.returnRequest;
              const reqStatus = req?.status || (order.status === 'returned' ? 'approved' : 'pending');
              const noteDraft = returnAdminNotes[order.id] ?? req?.adminNote ?? '';
              const inspectionTicket = tickets.find(
                (tkt) =>
                  (tkt.workflowType === 'return_inspection' || Boolean(tkt.returnRecommendation)) &&
                  (tkt.relatedOrderId === order.id ||
                    tkt.orderId === order.id ||
                    tkt.orderNumber === order.orderNumber)
              );
              const effectiveRecommendation =
                req?.sellerRecommendation || inspectionTicket?.returnRecommendation;
              const effectiveInspectionNote =
                req?.sellerInspectionNote || inspectionTicket?.message;
              const effectiveRefundStatus = req?.refundStatus || 'none';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#F3EFEA] pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <span className="font-mono font-bold text-sm text-[#141413]">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[#8C857B]">·</span>
                        <span
                          className={`font-bold ${
                            reqStatus === 'approved'
                              ? 'text-[#1B6B45]'
                              : reqStatus === 'rejected'
                              ? 'text-[#9E2A2B]'
                              : 'text-[#B7791F]'
                          }`}
                        >
                          {reqStatus === 'approved'
                            ? t('تمت الموافقة على الإرجاع', 'Return Approved')
                            : reqStatus === 'rejected'
                            ? t('تم رفض طلب الإرجاع', 'Return Declined')
                            : t('قيد المراجعة والفصل الإداري', 'Pending Admin Adjudication')}
                        </span>

                        {effectiveRefundStatus === 'wallet_completed' && (
                          <span className="px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#1B6B45] text-[11px] font-bold">
                            {t(
                              `تم إيداع الاسترداد في المحفظة (${formatPrice(req?.refundAmount || order.total)})`,
                              `Wallet Refund Completed (${formatPrice(req?.refundAmount || order.total)})`
                            )}
                          </span>
                        )}

                        {effectiveRefundStatus === 'external_authorized_pending' && (
                          <span className="px-2.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[#B45309] text-[11px] font-bold">
                            {t(
                              'تم اعتماد الاسترداد — بانتظار التسوية عبر بوابة الدفع',
                              'Refund Authorized — External Gateway Settlement Required'
                            )}
                          </span>
                        )}

                        {effectiveRefundStatus === 'failed' && (
                          <span className="px-2.5 py-0.5 rounded bg-red-50 border border-red-200 text-[#9E2A2B] text-[11px] font-bold">
                            {t('تعذر تنفيذ الاسترداد (Failed)', 'Refund Failed')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#57534E] mt-1">
                        {t('العميل:', 'Customer:')}{' '}
                        <span className="font-bold text-[#141413]">{order.customerName}</span> ({order.customerPhone}) ·{' '}
                        {t('وسيلة الاسترداد المفضلة:', 'Refund Method:')}{' '}
                        <span className="font-bold text-[#0B4F3F]">
                          {req?.refundMethod === 'wallet'
                            ? t('محفظة أثيل الفورية (Wallet)', 'Atheel Instant Wallet')
                            : t('وسيلة الدفع الأصلية', 'Original Payment Method')}
                        </span>
                      </div>
                    </div>

                    <div className="text-end font-mono tabular-nums">
                      <div className="text-lg font-bold text-[#0B4F3F]">{formatPrice(order.total)}</div>
                      <div className="text-[11px] text-[#8C857B]">
                        {t('تاريخ المطالبة:', 'Requested:')}{' '}
                        {req?.requestedAt?.split('T')[0] || order.updatedAt.split('T')[0]}
                      </div>
                      {req?.refundUpdatedAt && (
                        <div className="text-[10px] text-[#57534E]">
                          {t('آخر تحديث للاسترداد:', 'Refund Updated:')}{' '}
                          {req.refundUpdatedAt.split('T')[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items in Return */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2">
                      <div className="font-bold text-[#141413]">
                        {t('سبب الإرجاع وتفاصيل العميل', 'Customer Return Reason & Statement')}
                      </div>
                      <p className="text-[#141413] font-semibold">
                        {lang === 'ar' ? req?.reasonAr : req?.reasonEn}
                      </p>
                      <p className="text-[#57534E] leading-relaxed">{req?.details}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-[#141413]">
                          {t(
                            'تقرير الفحص الفني من المتجر (return_inspection)',
                            'Merchant Technical Inspection Report (return_inspection)'
                          )}
                        </div>
                        {inspectionTicket && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-white border border-[#E6E0D6] font-bold text-[#0B4F3F]">
                              #{inspectionTicket.ticketNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] font-bold uppercase">
                              {inspectionTicket.status}
                            </span>
                            <span className="text-[#8C857B]">{inspectionTicket.createdAt}</span>
                          </div>
                        )}
                      </div>
                      {effectiveRecommendation ? (
                        <>
                          <div className="text-xs font-bold text-[#0B4F3F]">
                            {effectiveRecommendation === 'approve_restock'
                              ? t(
                                  'توصية المتجر: الموافقة وإعادة القطعة للمخزون (approve_restock)',
                                  'Recommendation: Approve & Restock (approve_restock)'
                                )
                              : effectiveRecommendation === 'inspect_required'
                              ? t(
                                  'توصية المتجر: يتطلب فحصاً معمقاً للأختام (inspect_required)',
                                  'Recommendation: Deep Physical Inspection Required (inspect_required)'
                                )
                              : t(
                                  'توصية المتجر: اعتراض لعدم مطابقة شروط الإرجاع (dispute)',
                                  'Recommendation: Dispute Return Claim (dispute)'
                                )}
                          </div>
                          <p className="text-[#57534E] leading-relaxed">
                            {effectiveInspectionNote ||
                              t('تم إرفاق توصية المتجر.', 'Merchant recommendation recorded.')}
                          </p>
                        </>
                      ) : (
                        <p className="text-[#8C857B]">
                          {t(
                            'لم يقم المتجر برفع اعتراض فني؛ يمكن للإدارة التنفيذية البت المباشر في الطلب بموجب ضمان أثيل.',
                            'No merchant dispute filed; Executive Admin may adjudicate directly under Atheel Buyer Protection.'
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Adjudication Controls */}
                  <div className="pt-3 border-t border-[#F3EFEA] flex flex-wrap items-center justify-between gap-3">
                    <input
                      type="text"
                      value={noteDraft}
                      disabled={reqStatus !== 'pending'}
                      onChange={(e) =>
                        setReturnAdminNotes((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder={t(
                        'اكتب ملاحظة القرار الإداري وحيثيات التسوية للعميل والمتجر...',
                        'Enter official administrative decision note for customer & seller...'
                      )}
                      className="flex-1 min-w-[260px] px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413] disabled:opacity-60"
                    />

                    {reqStatus === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            processReturnRequest(
                              order.id,
                              true,
                              noteDraft.trim() ||
                                t(
                                  'تمت الموافقة على الإرجاع بعد التحقق من سلامة المنتج وإيداع المبلغ',
                                  'Approved return and processed refund per method'
                                )
                            )
                          }
                          className="px-4 py-2 rounded-xl bg-[#1B6B45] text-white text-xs font-bold hover:bg-[#145335] whitespace-nowrap"
                        >
                          {t('اعتماد الإرجاع واسترداد المبلغ', 'Approve Return & Refund')}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            processReturnRequest(
                              order.id,
                              false,
                              noteDraft.trim() ||
                                t(
                                  'تعذر قبول الإرجاع لعدم استيفاء شروط السياسة',
                                  'Return declined per policy guidelines'
                                )
                            )
                          }
                          className="px-4 py-2 rounded-xl border border-[#9E2A2B]/40 text-[#9E2A2B] text-xs font-bold hover:bg-red-50 whitespace-nowrap"
                        >
                          {t('رفض المطالبة', 'Decline Return')}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-[#57534E]">
                        {req?.resolvedBy
                          ? t(`تم الفصل بواسطة: ${req.resolvedBy}`, `Resolved by: ${req.resolvedBy}`)
                          : t('تم إغلاق المطالبة', 'Claim Adjudicated')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 3: CUSTOMERS & VIP REGISTRY
  // ============================================================================
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6">
        <div className="text-xs font-semibold text-[#0B4F3F]">
          {t('سجل العملاء وبرنامج الولاء الملكي', 'Customer Registry & Royal Loyalty Concierge')}
        </div>
        <h2 className="text-xl font-bold text-[#141413] mt-1">
          {t('إدارة حسابات العملاء، المحافظ المالية، وفئات الولاء', 'Customers, Wallet Balances & VIP Loyalty Tiers')}
        </h2>
        <p className="text-xs text-[#57534E] mt-1">
          {t(
            'الاطلاع على ملفات العملاء وسجل طلباتهم وعناوينهم الوطنية، مع إمكانية إضافة أرصدة تعويضية للمحفظة أو ترقية فئة الولاء (مع حماية صلاحيات الأدوار RBAC).',
            'Inspect customer 360° profiles, order LTV, and Saudi National Addresses. Issue goodwill wallet credits or loyalty adjustments while strictly preserving RBAC role integrity.'
          )}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
          <div className="text-xs text-[#8C857B]">{t('إجمالي الحسابات المسجلة', 'Total Accounts')}</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#141413] mt-1">
            {customerStats.totalUsers}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
          <div className="text-xs text-[#8C857B]">
            {t('أعضاء الفئة الملكية والذهبية', 'Royal Obsidian & Gold VIPs')}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#0B4F3F] mt-1">
            {customerStats.vipCount}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4">
          <div className="text-xs text-[#8C857B]">
            {t('إجمالي أرصدة المحافظ النشطة', 'Total Customer Wallet Balance')}
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-[#1B6B45] mt-1">
            {formatPrice(customerStats.totalWallet)}
          </div>
        </div>
        <div className="bg-[#141413] text-white rounded-2xl border border-[#C59B27]/30 p-4">
          <div className="text-xs text-[#D6D0C4]">
            {t('نقاط الولاء المتداولة', 'Active Loyalty Points')}
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-[#C59B27] mt-1">
            {customerStats.totalPoints.toLocaleString('en-US')}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
            aria-label={t('تصفية حسب نوع الحساب', 'Filter by Role')}
            className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
          >
            <option value="all">{t('جميع الأدوار', 'All Roles')}</option>
            <option value="customer">{t('عملاء (Customers)', 'Customers')}</option>
            <option value="seller">{t('تجار (Sellers)', 'Sellers')}</option>
            <option value="admin">{t('مسؤولو النظام (Admins)', 'Admins')}</option>
          </select>

          <select
            value={userTierFilter}
            onChange={(e) => setUserTierFilter(e.target.value as typeof userTierFilter)}
            aria-label={t('تصفية حسب فئة الولاء', 'Filter by Loyalty Tier')}
            className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
          >
            <option value="all">{t('جميع فئات الولاء', 'All Loyalty Tiers')}</option>
            <option value="Royal Obsidian">Royal Obsidian</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
          </select>
        </div>

        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder={t(
              'بحث بالاسم، البريد الإلكتروني، رقم الجوال، أو كود الدعوة...',
              'Search by name, email, phone, or referral code...'
            )}
            className="w-full ps-10 pe-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs text-[#141413] focus:outline-none focus:border-[#0B4F3F]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-[#FAF8F5] border-b border-[#E6E0D6] text-[#57534E]">
              <tr>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('العميل وبيانات التواصل', 'User & Contact')}
                </th>
                <th className="py-3.5 px-4 text-start font-bold">
                  {t('الدور وفئة الولاء', 'Role & Loyalty Tier')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('الطلبات والإنفاق الكلي', 'Orders & Lifetime Spend')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('رصيد المحفظة', 'Wallet Balance')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('نقاط الولاء', 'Loyalty Points')}
                </th>
                <th className="py-3.5 px-4 text-end font-bold">
                  {t('إدارة الحساب', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3EFEA]">
              {filteredUsers.map((user) => {
                const userOrders = orders.filter(
                  (o) => o.customerId === user.id && o.status !== 'cancelled'
                );
                const ltv = userOrders.reduce((sum, o) => sum + o.total, 0);

                return (
                  <tr key={user.id} className="hover:bg-[#FAF8F5]/70 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-[#141413]">{user.name}</div>
                      <div className="text-[11px] font-mono text-[#57534E]">
                        {user.email} · {user.phone}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-bold text-[#0B4F3F] uppercase">{user.role}</div>
                      <div className="text-[11px] text-[#57534E]">
                        {user.loyaltyTier} · <span className="font-mono">{user.referralCode}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-end font-mono tabular-nums">
                      <div className="font-bold text-[#141413]">{formatPrice(ltv)}</div>
                      <div className="text-[11px] text-[#8C857B]">
                        {userOrders.length} {t('طلبات', 'orders')}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-end font-mono tabular-nums font-bold text-[#1B6B45]">
                      {formatPrice(user.walletBalance)}
                    </td>

                    <td className="py-4 px-4 text-end font-mono tabular-nums font-bold text-[#141413]">
                      {user.loyaltyPoints.toLocaleString('en-US')}
                    </td>

                    <td className="py-4 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => openUserInspector(user)}
                        className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] hover:border-[#0B4F3F] text-[#141413] text-[11px] font-bold whitespace-nowrap"
                      >
                        {t('ملف العميل والمحفظة', '360° Profile & Wallet')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360° & Wallet/Loyalty Concierge Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUserAdjustment}
            className="bg-white rounded-2xl border border-[#E6E0D6] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E6E0D6] pb-4">
              <div>
                <div className="text-xs font-bold text-[#0B4F3F]">
                  {t('الملف الشامل للعميل وخدمات VIP Concierge', 'Customer 360° Dossier & VIP Concierge')}
                </div>
                <h3 className="text-lg font-bold text-[#141413] mt-1">{inspectingUser.name}</h3>
                <p className="text-xs text-[#57534E] font-mono mt-0.5">
                  {inspectingUser.email} · {inspectingUser.phone} · Role: {inspectingUser.role.toUpperCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingUserId(null)}
                className="p-2 rounded-lg text-[#8C857B] hover:text-[#141413]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balances & Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5">
                <div className="font-bold text-[#141413]">
                  {t('الأرصدة الحالية وفئة الولاء', 'Current Wallet & Loyalty Standing')}
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">{t('رصيد محفظة أثيل:', 'Wallet Balance:')}</span>
                  <span className="font-mono font-bold text-[#1B6B45]">
                    {formatPrice(inspectingUser.walletBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">{t('نقاط الولاء:', 'Loyalty Points:')}</span>
                  <span className="font-mono font-bold text-[#141413]">
                    {inspectingUser.loyaltyPoints.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#57534E]">{t('الفئة الحالية:', 'Current Tier:')}</span>
                  <span className="font-bold text-[#0B4F3F]">{inspectingUser.loyaltyTier}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1.5">
                <div className="font-bold text-[#141413]">
                  {t('العناوين الوطنية المسجلة', 'Registered Saudi National Addresses')} (
                  {inspectingUser.addresses.length})
                </div>
                {inspectingUser.addresses.slice(0, 2).map((addr) => (
                  <div key={addr.id} className="text-[11px] text-[#57534E]">
                    <span className="font-bold text-[#141413]">{addr.labelAr}:</span> {addr.cityAr} —{' '}
                    {addr.districtAr} ({addr.postalCode})
                  </div>
                ))}
              </div>
            </div>

            {/* Wallet & Loyalty Concierge Adjustment */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-4 text-xs">
              <div className="font-bold text-[#141413]">
                {t(
                  'تعديل رصيد المحفظة أو نقاط وفئة الولاء (خدمة كبار العملاء)',
                  'Executive Wallet Credit & Loyalty Tier Adjustment'
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#57534E] mb-1">
                    {t('إضافة/خصم رصيد محفظة (ر.س)', 'Wallet Delta (+/- SAR)')}
                  </label>
                  <input
                    type="number"
                    step={10}
                    value={walletAdjustment}
                    onChange={(e) => setWalletAdjustment(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#57534E] mb-1">
                    {t('إضافة/خصم نقاط ولاء (+/-)', 'Points Delta (+/-)')}
                  </label>
                  <input
                    type="number"
                    step={100}
                    value={pointsAdjustment}
                    onChange={(e) => setPointsAdjustment(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] font-mono font-bold text-[#141413]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#57534E] mb-1">
                    {t('فئة العضوية الملكية', 'Loyalty Tier')}
                  </label>
                  <select
                    value={tierDraft}
                    onChange={(e) => setTierDraft(e.target.value as UserProfile['loyaltyTier'])}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] font-bold text-[#141413]"
                  >
                    <option value="Bronze">Bronze</option>
                    <option value="Silver">Silver</option>
                    <option value="Gold">Gold</option>
                    <option value="Royal Obsidian">Royal Obsidian</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#57534E] mb-1">
                  {t('سبب التعديل (يُسجل في سجل نقاط العميل وسجل الرقابة)', 'Official Reason for Audit Trail')}
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder={t(
                    'مثال: إهداء نقاط ترحيبية إضافية لعضو Royal Obsidian...',
                    'e.g. VIP goodwill credit for delayed express shipment...'
                  )}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E6E0D6] text-[#141413]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#E6E0D6]">
              <span className="text-[11px] text-[#8C857B]">
                {t(
                  'ملاحظة أمنية: صلاحيات الدور (Role) محمية ولا يمكن ترقيتها من المتصفح.',
                  'Security Invariant: Account Role (RBAC) is immutable from the browser.'
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingUserId(null)}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413]"
                >
                  {t('إغلاق', 'Close')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold hover:bg-[#083D30]"
                >
                  {t('حفظ التعديلات', 'Save Adjustments')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
