'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck,
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  MapPin,
  FileText,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Printer,
  X,
  Phone,
  CreditCard,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import { Order, OrderStatus, Seller } from '@/lib/types';

interface SellerOrdersProps {
  seller: Seller;
  sellerOrders: Order[];
  mode: 'orders' | 'returns';
}

const SAUDI_CARRIERS = [
  { ar: 'سبل إكسبريس VIP', en: 'SPL Express VIP', prefix: 'SPL' },
  { ar: 'أرامكس بريميوم', en: 'Aramex Premium', prefix: 'ARMX' },
  { ar: 'سمسا إكسبريس', en: 'SMSA Express', prefix: 'SMSA' },
  { ar: 'دي إتش إل إكسبريس', en: 'DHL Express KSA', prefix: 'DHL' },
];

export default function SellerOrdersAndReturns({
  seller,
  sellerOrders,
  mode,
}: SellerOrdersProps) {
  const { lang, t, formatPrice, updateOrderStatus, respondToReturnRequest } = useMarketplace();

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    sellerOrders[0]?.id || null
  );

  // Per-order fulfillment inputs
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [carrierInputs, setCarrierInputs] = useState<Record<string, number>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // Printable Waybill Modal
  const [waybillOrder, setWaybillOrder] = useState<Order | null>(null);

  // Return Inspection Form state
  const [returnRecommendation, setReturnRecommendation] = useState<
    Record<string, 'approve_restock' | 'inspect_required' | 'dispute'>
  >({});
  const [returnNotes, setReturnNotes] = useState<Record<string, string>>({});

  const returnOrders = useMemo(
    () =>
      sellerOrders.filter(
        (o) =>
          o.status === 'return_requested' ||
          o.status === 'returned' ||
          o.returnRequest !== undefined
      ),
    [sellerOrders]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: sellerOrders.length,
      placed: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      out_for_delivery: 0,
      delivered: 0,
      return_requested: 0,
      cancelled: 0,
    };
    sellerOrders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [sellerOrders]);

  const displayedOrders = useMemo(() => {
    const base = mode === 'returns' ? returnOrders : sellerOrders;
    return base.filter((o) => {
      if (mode === 'orders' && statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchCust = o.customerName.toLowerCase().includes(q);
        const matchCity =
          o.address.cityAr.toLowerCase().includes(q) || o.address.cityEn.toLowerCase().includes(q);
        const matchTrack = (o.trackingNumber || '').toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchCity && !matchTrack) return false;
      }
      return true;
    });
  }, [mode, sellerOrders, returnOrders, statusFilter, searchQuery]);

  const getOrderStatusBadge = (status: OrderStatus) => {
    const map: Record<
      OrderStatus,
      { labelAr: string; labelEn: string; cls: string }
    > = {
      placed: {
        labelAr: 'طلب جديد بانتظار التأكيد',
        labelEn: 'New Order (Placed)',
        cls: 'bg-[#FBF7EC] text-[#B8860B] border border-[#C59B27]/40',
      },
      confirmed: {
        labelAr: 'تم التأكيد وحجز المخزون',
        labelEn: 'Confirmed',
        cls: 'bg-[#EBF3F0] text-[#0B4F3F]',
      },
      preparing: {
        labelAr: 'قيد التجهيز والتغليف الفاخر',
        labelEn: 'Preparing & Packaging',
        cls: 'bg-blue-50 text-blue-800',
      },
      shipped: {
        labelAr: 'تم الشحن مع الناقل',
        labelEn: 'Shipped with Carrier',
        cls: 'bg-indigo-50 text-indigo-800',
      },
      out_for_delivery: {
        labelAr: 'خرج للتوصيل للعميل',
        labelEn: 'Out for Delivery',
        cls: 'bg-purple-50 text-purple-800',
      },
      delivered: {
        labelAr: 'تم التسليم بنجاح',
        labelEn: 'Delivered',
        cls: 'bg-[#EBF3F0] text-[#1E6B47]',
      },
      cancelled: {
        labelAr: 'ملغي',
        labelEn: 'Cancelled',
        cls: 'bg-red-50 text-[#9E2A2B]',
      },
      return_requested: {
        labelAr: 'طلب إرجاع قيد المراجعة',
        labelEn: 'Return Requested',
        cls: 'bg-amber-100 text-[#C87D12]',
      },
      returned: {
        labelAr: 'تم الإرجاع والتسوية',
        labelEn: 'Returned & Refunded',
        cls: 'bg-stone-100 text-[#57534E]',
      },
    };
    return map[status] || map.placed;
  };

  const handleAdvanceStatus = async (order: Order, nextStatus: OrderStatus) => {
    const carrierIdx = carrierInputs[order.id] ?? 0;
    const chosenCarrier = SAUDI_CARRIERS[carrierIdx] || SAUDI_CARRIERS[0];
    const tracking =
      trackingInputs[order.id]?.trim() ||
      order.trackingNumber ||
      `${chosenCarrier.prefix}-${Math.floor(10000000 + Math.random() * 89999999)}SA`;
    const note = noteInputs[order.id]?.trim() || '';

    await updateOrderStatus(
      order.id,
      nextStatus,
      tracking,
      order.carrierAr && carrierInputs[order.id] === undefined ? order.carrierAr : chosenCarrier.ar,
      order.carrierEn && carrierInputs[order.id] === undefined ? order.carrierEn : chosenCarrier.en,
      note
    );
    setNoteInputs((prev) => ({ ...prev, [order.id]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold">
              {mode === 'returns'
                ? t('إدارة المرتجعات وخدمة ما بعد البيع', 'Returns & After-Sales Resolution')
                : t('عمليات تجهيز وشحن الطلبات', 'Order Fulfillment & Dispatch')}
            </span>
            <span className="text-xs text-[#8C857B] font-mono">
              {displayedOrders.length} {t('طلب', 'orders')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#141413] mt-1">
            {mode === 'returns'
              ? t('فحص طلبات الإرجاع وتوصيات التسوية', 'Merchant Return Inspection & Claims')
              : t('إدارة طلبات المتجر وبوالص الشحن الوطنية', 'Merchant Orders & Saudi National Waybills')}
          </h2>
          <p className="text-xs text-[#57534E] mt-0.5">
            {mode === 'returns'
              ? t(
                  'راجع طلبات الإرجاع الخاصة بمنتجات متجرك وأرفق تقرير الفحص الفني لفريق تسويات أثيل.',
                  'Inspect customer return requests for your SKUs and submit technical disposition reports.'
                )
              : t(
                  'حدّث مراحل التجهيز وأرقام تتبع الشحن (سبل، أرامكس، سمسا، DHL). بيانات العميل المالية محمية ولا يمكن تعديلها.',
                  'Advance fulfillment stages and carrier waybills. Customer financial & payment fields are strictly read-only.'
                )}
          </p>
        </div>

        {/* Security & SLA Badge */}
        <div className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-center gap-2.5 text-xs">
          <ShieldCheck className="w-4 h-4 text-[#0B4F3F]" />
          <div>
            <div className="font-bold text-[#141413]">
              {t('نطاق صلاحيات التاجر المحمي', 'Hardened Fulfillment Scope')}
            </div>
            <div className="text-[11px] text-[#8C857B]">
              {t('تحديث الشحن والتتبع فقط (Firestore Rules)', 'Status & Waybill updates only')}
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter Pills (Orders Mode) */}
      {mode === 'orders' && (
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'all', ar: 'الكل', en: 'All' },
                { id: 'placed', ar: 'جديد بانتظار التأكيد', en: 'New / Placed' },
                { id: 'confirmed', ar: 'مؤكد', en: 'Confirmed' },
                { id: 'preparing', ar: 'قيد التجهيز', en: 'Preparing' },
                { id: 'shipped', ar: 'تم الشحن', en: 'Shipped' },
                { id: 'out_for_delivery', ar: 'خرج للتوصيل', en: 'Out for Delivery' },
                { id: 'delivered', ar: 'مُسلّم', en: 'Delivered' },
                { id: 'return_requested', ar: 'مرتجع مطلوب', en: 'Return Requested' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === st.id
                    ? 'bg-[#0B4F3F] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#57534E] hover:text-[#141413] border border-[#E6E0D6]'
                }`}
              >
                <span>{lang === 'ar' ? st.ar : st.en}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    statusFilter === st.id ? 'bg-white/20 text-white' : 'bg-[#E6E0D6]/70 text-[#141413]'
                  }`}
                >
                  {statusCounts[st.id] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(
                'ابحث برقم الطلب (#ATH-98504)، اسم العميل، المدينة، أو رقم بوليصة الشحن...',
                'Search by Order #, customer name, city, or tracking number...'
              )}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
            />
          </div>
        </div>
      )}

      {/* Orders / Returns List */}
      {displayedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-12 text-center space-y-3">
          <PackageCheck className="w-10 h-10 text-[#C59B27] mx-auto" />
          <h3 className="text-base font-bold text-[#141413]">
            {mode === 'returns'
              ? t('لا توجد طلبات إرجاع مسجلة على منتجات متجرك', 'No return requests for your store')
              : t('لا توجد طلبات مطابقة للفلتر المحدد', 'No orders match the selected filter')}
          </h3>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            // Strictly isolate items belonging to this seller
            const sellerItems = order.items.filter((i) => i.sellerId === seller.id);
            const displayItems = sellerItems.length > 0 ? sellerItems : order.items;
            const isMultiVendorSplit = order.items.length > displayItems.length;

            // Calculate seller-specific financial share
            const sellerGrossSubtotal = displayItems.reduce(
              (sum, item) => sum + item.unitPrice * item.quantity,
              0
            );
            const sellerCommission = Number(
              ((sellerGrossSubtotal * seller.commissionRate) / 100).toFixed(2)
            );
            const sellerNetPayout = Number((sellerGrossSubtotal - sellerCommission).toFixed(2));
            const sellerVatPortion = Number(((sellerGrossSubtotal * 15) / 115).toFixed(2));

            const badge = getOrderStatusBadge(order.status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden transition-all"
              >
                {/* Order Summary Header */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F5]/60"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-center font-mono font-bold text-xs text-[#0B4F3F]">
                      #{order.orderNumber.replace('ATH-', '')}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold font-mono text-[#141413]">
                          #{order.orderNumber}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${badge.cls}`}>
                          {lang === 'ar' ? badge.labelAr : badge.labelEn}
                        </span>
                        {isMultiVendorSplit && (
                          <span className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] text-[10px] font-semibold text-[#57534E]">
                            {t('طلب مشترك (حصة متجرك فقط)', 'Multi-Vendor Split (Your SKUs)')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#57534E] mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#141413]">{order.customerName}</span>
                        <span>·</span>
                        <span>
                          {lang === 'ar' ? order.address.cityAr : order.address.cityEn} (
                          {order.address.districtAr})
                        </span>
                        <span>·</span>
                        <span className="font-mono text-[11px]">{order.createdAt.split('T')[0]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-end">
                      <div className="text-xs text-[#8C857B]">
                        {t('إجمالي مبيعات متجرك بالطلب', 'Your Store Gross')}
                      </div>
                      <div className="text-base font-bold font-mono text-[#0B4F3F]">
                        {formatPrice(sellerGrossSubtotal)}
                      </div>
                      <div className="text-[11px] text-[#1E6B47] font-mono">
                        {t('الصافي بعد العمولة:', 'Net Payout:')} {formatPrice(sellerNetPayout)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF8F5] text-[#57534E]">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Order Details & Fulfillment Console */}
                {isExpanded && (
                  <div className="border-t border-[#E6E0D6] p-6 bg-[#FAF8F5]/40 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left 7 Cols: Seller Order Items + Financial Breakdown */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white rounded-xl border border-[#E6E0D6] p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-[#F3EFEA] pb-2.5">
                            <h4 className="text-xs font-bold text-[#141413]">
                              {t(
                                `المنتجات المطلوبة من متجر ${seller.nameAr} (${displayItems.length})`,
                                `Items Ordered from ${seller.nameEn} (${displayItems.length})`
                              )}
                            </h4>
                            <button
                              type="button"
                              onClick={() => setWaybillOrder(order)}
                              className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF3F0] border border-[#E6E0D6] text-[11px] font-bold text-[#0B4F3F] inline-flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>
                                {t('بوليصة الشحن وقائمة التغليف', 'Waybill & Packing Slip')}
                              </span>
                            </button>
                          </div>

                          <div className="divide-y divide-[#F3EFEA]">
                            {displayItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="py-3 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.image}
                                    alt={lang === 'ar' ? item.titleAr : item.titleEn}
                                    referrerPolicy="no-referrer"
                                    className="w-12 h-12 rounded-xl object-cover bg-[#F3EFEA] border border-[#E6E0D6]"
                                  />
                                  <div>
                                    <div className="font-bold text-[#141413]">
                                      {lang === 'ar' ? item.titleAr : item.titleEn}
                                    </div>
                                    <div className="text-[11px] text-[#8C857B] font-mono mt-0.5">
                                      SKU: {item.sku} · {t('الكمية:', 'Qty:')} {item.quantity}
                                    </div>
                                    {Object.keys(item.selectedVariants || {}).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {Object.entries(item.selectedVariants).map(([k, v]) => (
                                          <span
                                            key={k}
                                            className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] text-[10px] text-[#57534E]"
                                          >
                                            {k}: {v}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-end font-mono">
                                  <div className="font-bold text-[#141413]">
                                    {formatPrice(item.unitPrice * item.quantity)}
                                  </div>
                                  <div className="text-[10px] text-[#8C857B]">
                                    {formatPrice(item.unitPrice)} × {item.quantity}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Seller Financial Settlement Breakdown for this Order */}
                          <div className="pt-3 border-t border-[#E6E0D6] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#FAF8F5] p-3 rounded-xl">
                            <div>
                              <span className="text-[10px] text-[#8C857B] block">
                                {t('إجمالي منتجاتك (شامل الضريبة)', 'Gross SKU Total')}
                              </span>
                              <span className="font-mono font-bold text-[#141413]">
                                {formatPrice(sellerGrossSubtotal)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8C857B] block">
                                {t('ضريبة القيمة المضافة ١٥٪', 'Included 15% VAT')}
                              </span>
                              <span className="font-mono font-semibold text-[#57534E]">
                                {formatPrice(sellerVatPortion)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8C857B] block">
                                {t(`عمولة أثيل (${seller.commissionRate}%)`, `Commission (${seller.commissionRate}%)`)}
                              </span>
                              <span className="font-mono font-semibold text-[#C87D12]">
                                -{formatPrice(sellerCommission)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8C857B] block">
                                {t('صافي استحقاق المتجر', 'Net Merchant Credit')}
                              </span>
                              <span className="font-mono font-bold text-[#1E6B47]">
                                {formatPrice(sellerNetPayout)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Saudi National Address Card */}
                        <div className="bg-white rounded-xl border border-[#E6E0D6] p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#141413] flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[#0B4F3F]" />
                              <span>
                                {t('العنوان الوطني السعودي للتوصيل', 'Saudi National Delivery Address')}
                              </span>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#EBF3F0] text-[#0B4F3F] text-[10px] font-bold uppercase">
                              {order.deliverySpeed === 'express'
                                ? t('شحن سريع VIP', 'VIP Express')
                                : t('شحن قياسي', 'Standard')}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[#57534E]">
                            <div>
                              <div className="font-bold text-[#141413]">
                                {order.address.recipientName}
                              </div>
                              <div>
                                {lang === 'ar' ? order.address.cityAr : order.address.cityEn} —{' '}
                                {order.address.districtAr}
                              </div>
                              <div>{order.address.streetAr}</div>
                            </div>
                            <div className="font-mono text-[11px] bg-[#FAF8F5] p-2.5 rounded-lg border border-[#E6E0D6]">
                              <div>
                                {t('رقم المبنى:', 'Building:')} {order.address.buildingNumber} ·{' '}
                                {t('الرمز البريدي:', 'Postal:')} {order.address.postalCode}
                              </div>
                              <div>
                                {t('الرقم الإضافي:', 'Additional:')} {order.address.additionalNumber}
                              </div>
                              <div className="text-[#0B4F3F] mt-0.5">{order.address.phone}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right 5 Cols: Fulfillment Action Console OR Return Resolution Console */}
                      <div className="lg:col-span-5 space-y-4">
                        {mode === 'returns' || order.returnRequest ? (
                          <div className="bg-white rounded-xl border border-[#C87D12]/40 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#C87D12] flex items-center gap-1.5">
                                <RotateCcw className="w-4 h-4" />
                                <span>
                                  {t('ملف طلب الإرجاع وفحص الجودة', 'Return Request & Quality Inspection')}
                                </span>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-[#C87D12] text-[10px] font-bold uppercase">
                                {order.returnRequest?.status || 'pending'}
                              </span>
                            </div>

                            {order.returnRequest && (
                              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2 text-xs">
                                <div className="font-bold text-[#141413]">
                                  {t('سبب الإرجاع المسجل من العميل:', 'Customer Return Reason:')}
                                </div>
                                <p className="text-[#57534E]">
                                  {lang === 'ar'
                                    ? order.returnRequest.reasonAr
                                    : order.returnRequest.reasonEn}
                                </p>
                                <div className="text-[11px] text-[#8C857B] pt-1 border-t border-[#E6E0D6]">
                                  {t('تفاصيل الحالة:', 'Details:')} {order.returnRequest.details}
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-mono text-[#0B4F3F] pt-1">
                                  <span>
                                    {t('وسيلة الاسترداد المفضلة:', 'Refund Method:')}{' '}
                                    {order.returnRequest.refundMethod === 'wallet'
                                      ? t('محفظة أثيل', 'Atheel Wallet')
                                      : t('وسيلة الدفع الأصلية', 'Original Payment')}
                                  </span>
                                  <span>{order.returnRequest.requestedAt.split('T')[0]}</span>
                                </div>
                              </div>
                            )}

                            {order.returnRequest?.sellerInspectionNote && (
                              <div className="p-3 rounded-xl bg-[#EBF3F0] border border-[#0B4F3F]/30 text-xs space-y-1">
                                <div className="font-bold text-[#0B4F3F]">
                                  {t('تقرير فحص المتجر المسجل:', 'Recorded Merchant Inspection:')} (
                                  {order.returnRequest.sellerRecommendation})
                                </div>
                                <p className="text-[#141413]">
                                  {order.returnRequest.sellerInspectionNote}
                                </p>
                              </div>
                            )}

                            <div className="space-y-3 pt-2 border-t border-[#E6E0D6]">
                              <label className="block text-xs font-bold text-[#141413]">
                                {t('توصية المتجر بعد فحص المرتجع', 'Merchant Inspection Disposition')}
                              </label>
                              <select
                                value={returnRecommendation[order.id] || 'approve_restock'}
                                onChange={(e) =>
                                  setReturnRecommendation((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value as
                                      | 'approve_restock'
                                      | 'inspect_required'
                                      | 'dispute',
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                              >
                                <option value="approve_restock">
                                  {t(
                                    'الموافقة على الاسترجاع وإعادة المنتج للمخزون (Approve & Restock)',
                                    'Approve Return & Restock Inventory'
                                  )}
                                </option>
                                <option value="inspect_required">
                                  {t(
                                    'طلب فحص فني للأختام والرقم التسلسلي (Require Lab Inspection)',
                                    'Require Serial & Authenticity Seal Inspection'
                                  )}
                                </option>
                                <option value="dispute">
                                  {t(
                                    'رفع اعتراض موثق للإدارة لفتح الغلاف الأصلي (Submit Dispute)',
                                    'Submit Packaging/Usage Dispute to Admin'
                                  )}
                                </option>
                              </select>

                              <textarea
                                rows={2}
                                value={returnNotes[order.id] || ''}
                                onChange={(e) =>
                                  setReturnNotes((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value,
                                  }))
                                }
                                placeholder={t(
                                  'اكتب ملاحظات فحص الجودة والختم وحالة العبوة...',
                                  'Enter quality inspection notes, seal integrity, and serial verification...'
                                )}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  respondToReturnRequest(
                                    order.id,
                                    returnRecommendation[order.id] || 'approve_restock',
                                    returnNotes[order.id] ||
                                      t(
                                        'تمت مراجعة طلب الإرجاع وفحص مطابقة الرقم التسلسلي.',
                                        'Return request inspected and serial number verified.'
                                      )
                                  )
                                }
                                className="w-full py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold"
                              >
                                {t(
                                  'إرسال تقرير الفحص وتوصية المتجر',
                                  'Submit Merchant Return Inspection Report'
                                )}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {/* Standard Fulfillment Console */}
                        <div className="bg-white rounded-xl border border-[#E6E0D6] p-5 space-y-4">
                          <h4 className="text-xs font-bold text-[#141413] flex items-center gap-2">
                            <Truck className="w-4 h-4 text-[#0B4F3F]" />
                            <span>
                              {t('وحدة التحكم بالتجهيز والشحن', 'Fulfillment & Carrier Dispatch Console')}
                            </span>
                          </h4>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[11px] font-bold text-[#57534E] mb-1">
                                {t('شركة الشحن الوطنية المعتمدة', 'Authorized Saudi Carrier')}
                              </label>
                              <select
                                value={carrierInputs[order.id] ?? 0}
                                onChange={(e) =>
                                  setCarrierInputs((prev) => ({
                                    ...prev,
                                    [order.id]: Number(e.target.value),
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                              >
                                {SAUDI_CARRIERS.map((c, idx) => (
                                  <option key={c.prefix} value={idx}>
                                    {lang === 'ar' ? c.ar : c.en}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-[#57534E] mb-1">
                                {t('رقم بوليصة التتبع (Waybill / Tracking #)', 'Tracking / Waybill Number')}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={trackingInputs[order.id] ?? order.trackingNumber ?? ''}
                                  onChange={(e) =>
                                    setTrackingInputs((prev) => ({
                                      ...prev,
                                      [order.id]: e.target.value.toUpperCase(),
                                    }))
                                  }
                                  placeholder="SPL-882910442SA"
                                  className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cIdx = carrierInputs[order.id] ?? 0;
                                    const pfx = SAUDI_CARRIERS[cIdx]?.prefix || 'SPL';
                                    setTrackingInputs((prev) => ({
                                      ...prev,
                                      [order.id]: `${pfx}-${Math.floor(
                                        10000000 + Math.random() * 89999999
                                      )}SA`,
                                    }));
                                  }}
                                  className="px-3 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EBF3F0] border border-[#E6E0D6] text-[11px] font-bold text-[#0B4F3F]"
                                >
                                  {t('توليد بوليصة', 'Auto-Gen')}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-[#57534E] mb-1">
                                {t(
                                  'ملاحظة التجهيز والتغليف (تظهر في سجل التتبع)',
                                  'Fulfillment Note (Added to Order Timeline)'
                                )}
                              </label>
                              <input
                                type="text"
                                value={noteInputs[order.id] ?? ''}
                                onChange={(e) =>
                                  setNoteInputs((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.value,
                                  }))
                                }
                                placeholder={t(
                                  'مثال: تم إرفاق شهادة الأصالة والتغليف الحراري...',
                                  'e.g. Packaged in signature box with warranty card...'
                                )}
                                className="w-full px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                              />
                            </div>

                            {/* Progressive Action Buttons */}
                            <div className="pt-2 space-y-2">
                              <span className="block text-[11px] font-bold text-[#141413]">
                                {t('ترقية حالة الطلب الفورية:', 'Advance Order Stage:')}
                              </span>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceStatus(order, 'confirmed')}
                                  disabled={order.status === 'confirmed'}
                                  className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EBF3F0] border border-[#E6E0D6] text-[11px] font-bold text-[#0B4F3F] disabled:opacity-40"
                                >
                                  1. {t('تأكيد الطلب', 'Confirm Order')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceStatus(order, 'preparing')}
                                  disabled={order.status === 'preparing'}
                                  className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EBF3F0] border border-[#E6E0D6] text-[11px] font-bold text-[#0B4F3F] disabled:opacity-40"
                                >
                                  2. {t('بدء التجهيز والتغليف', 'Start Preparing')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceStatus(order, 'shipped')}
                                  disabled={order.status === 'shipped'}
                                  className="py-2 px-3 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-[11px] font-bold disabled:opacity-40"
                                >
                                  3. {t('تسليم للناقل (شُحنت)', 'Mark Shipped')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceStatus(order, 'out_for_delivery')}
                                  disabled={order.status === 'out_for_delivery'}
                                  className="py-2 px-3 rounded-xl bg-[#FAF8F5] hover:bg-[#EBF3F0] border border-[#E6E0D6] text-[11px] font-bold text-[#0B4F3F] disabled:opacity-40"
                                >
                                  4. {t('خرج للتوصيل', 'Out for Delivery')}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAdvanceStatus(order, 'delivered')}
                                disabled={order.status === 'delivered'}
                                className="w-full py-2.5 px-4 rounded-xl bg-[#1E6B47] hover:bg-[#165236] text-white text-xs font-bold disabled:opacity-40"
                              >
                                5. {t('تأكيد التسليم النهائي للعميل ✓', 'Confirm Final Delivery ✓')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Saudi Waybill & ZATCA Packing Slip Modal */}
      {waybillOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E6E0D6] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-[#0B4F3F]">
                  ATHEEL VIP LOGISTICS · ZATCA SIMPLIFIED SLIP
                </span>
                <h3 className="text-base font-bold text-[#141413]">
                  {t('بوليصة الشحن الوطنية وقائمة التغليف', 'Saudi National Waybill & Packing Slip')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWaybillOrder(null)}
                className="p-1.5 rounded-lg bg-[#FAF8F5] text-[#57534E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl border-2 border-dashed border-[#0B4F3F]/40 bg-[#FAF8F5] space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-[#E6E0D6] pb-3">
                <div>
                  <div className="font-bold text-[#0B4F3F] text-sm">
                    {lang === 'ar' ? seller.nameAr : seller.nameEn}
                  </div>
                  <div className="font-mono text-[11px] text-[#57534E]">
                    CR: {seller.crNumber} · VAT: {seller.vatNumber}
                  </div>
                </div>
                <div className="text-end font-mono">
                  <div className="font-bold text-sm text-[#141413]">#{waybillOrder.orderNumber}</div>
                  <div className="text-[11px] text-[#0B4F3F]">
                    {waybillOrder.trackingNumber || 'SPL-VIP-WAYBILL'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[#8C857B] block">
                    {t('المستلم والعنوان الوطني:', 'Recipient & National Address:')}
                  </span>
                  <div className="font-bold text-[#141413] mt-0.5">
                    {waybillOrder.address.recipientName}
                  </div>
                  <div className="text-[#57534E]">
                    {waybillOrder.address.cityAr} - {waybillOrder.address.districtAr}
                  </div>
                  <div className="font-mono text-[11px] text-[#141413] mt-0.5">
                    {waybillOrder.address.buildingNumber} - {waybillOrder.address.postalCode} -{' '}
                    {waybillOrder.address.additionalNumber}
                  </div>
                </div>
                <div className="text-end">
                  <span className="text-[10px] text-[#8C857B] block">
                    {t('الناقل ودرجة الخدمة:', 'Carrier & Tier:')}
                  </span>
                  <div className="font-bold text-[#141413] mt-0.5">
                    {lang === 'ar' ? waybillOrder.carrierAr : waybillOrder.carrierEn}
                  </div>
                  <div className="text-[11px] text-[#0B4F3F] font-bold mt-0.5">
                    {t('شحن مؤمّن ومبرد VIP', 'Insured VIP Express')}
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E6E0D6] pt-3 space-y-1.5">
                <div className="font-bold text-[#141413]">
                  {t('قائمة التحقق من القطع داخل الشحنة:', 'Package Contents Checklist:')}
                </div>
                {waybillOrder.items
                  .filter((i) => i.sellerId === seller.id)
                  .map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <span>
                        ☑ {lang === 'ar' ? item.titleAr : item.titleEn} ({item.sku})
                      </span>
                      <span className="font-mono font-bold">×{item.quantity}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWaybillOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
              >
                {t('إغلاق المعاينة', 'Close Preview')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
