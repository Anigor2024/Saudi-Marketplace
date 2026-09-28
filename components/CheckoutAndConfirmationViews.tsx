'use client';

import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Truck,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Plus,
  ArrowLeft,
  ArrowRight,
  Lock,
  Wallet,
  Banknote,
  Smartphone,
  Package,
  AlertCircle,
  Loader2,
  Building2,
  FileText,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { PaymentMethodType, SaudiAddress } from '../lib/types';

const SAUDI_CITY_OPTIONS = [
  { ar: 'الرياض', en: 'Riyadh' },
  { ar: 'جدة', en: 'Jeddah' },
  { ar: 'الخبر', en: 'Al Khobar' },
  { ar: 'الدمام', en: 'Dammam' },
  { ar: 'مكة المكرمة', en: 'Makkah' },
  { ar: 'المدينة المنورة', en: 'Madinah' },
  { ar: 'أبها', en: 'Abha' },
  { ar: 'بريدة', en: 'Buraidah' },
  { ar: 'تبوك', en: 'Tabuk' },
];

export function CheckoutView() {
  const {
    lang,
    isRtl,
    t,
    formatPrice,
    navigateTo,
    currentUser,
    isDemoMode,
    cart,
    cartSummary,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
    saveAddress,
    placeOrder,
  } = useMarketplace();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    currentUser?.addresses.find((a) => a.isDefault)?.id ||
      currentUser?.addresses[0]?.id ||
      ''
  );
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(
    !currentUser?.addresses || currentUser.addresses.length === 0
  );

  // New Saudi National Address Form State
  const [labelAr, setLabelAr] = useState('المنزل الرئيسي');
  const [recipientName, setRecipientName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '+966 50 511 9988');
  const [cityAr, setCityAr] = useState('الرياض');
  const [districtAr, setDistrictAr] = useState('');
  const [streetAr, setStreetAr] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [additionalNumber, setAdditionalNumber] = useState('');
  const [landmarkAr, setLandmarkAr] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Step 2: Delivery Speed
  const [deliverySpeed, setDeliverySpeed] = useState<'standard' | 'express'>('standard');

  // Step 3: Payment Method & Mock Card Simulation
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('mada');
  const [mockCardName, setMockCardName] = useState(currentUser?.name || 'FAISAL AL RAJHI');
  const [mockCardNumber, setMockCardNumber] = useState('4455 •••• •••• 8821');
  const [mockCardExpiry, setMockCardExpiry] = useState('08/29');
  const [mockCardCvv, setMockCardCvv] = useState('884');
  const [mockStcPhone, setMockStcPhone] = useState(currentUser?.phone || '+966 50 511 9988');

  // Coupon & Order Submission
  const [couponInput, setCouponInput] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const DirArrow = isRtl ? ArrowLeft : ArrowRight;

  // Derived VAT-Inclusive Checkout Math (Phase 7)
  const effectiveShippingFee = useMemo(() => {
    if (deliverySpeed === 'express') return 35;
    return cartSummary.shippingFee;
  }, [deliverySpeed, cartSummary.shippingFee]);

  const finalTotal = useMemo(() => {
    return Number((cartSummary.netAfterDiscount + effectiveShippingFee).toFixed(2));
  }, [cartSummary.netAfterDiscount, effectiveShippingFee]);

  // Included 15% Saudi VAT = finalTotal * 15 / 115 (never added twice)
  const includedVatAmount = useMemo(() => {
    return Number(((finalTotal * 15) / 115).toFixed(2));
  }, [finalTotal]);

  const selectedAddressObj = useMemo(() => {
    return (
      currentUser?.addresses.find((a) => a.id === selectedAddressId) ||
      currentUser?.addresses[0] ||
      null
    );
  }, [currentUser, selectedAddressId]);

  if (cart.length === 0) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-14">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E6E0D6] p-10 text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-[#C59B27] mx-auto" />
          <h1 className="text-xl font-bold text-[#141413]">
            {t('حقيبة التسوق فارغة حالياً', 'Your Shopping Bag is Empty')}
          </h1>
          <p className="text-xs text-[#57534E]">
            {t(
              'يرجى إضافة منتجات إلى حقيبة التسوق قبل المتابعة إلى إتمام الطلب.',
              'Please add luxury items to your bag before proceeding to checkout.'
            )}
          </p>
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="px-6 py-3 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
          >
            {t('العودة لتسوق المنتجات', 'Explore Marketplace')}
          </button>
        </div>
      </div>
    );
  }

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);

    if (!recipientName.trim() || recipientName.trim().length < 3) {
      setAddressError(t('يرجى إدخال اسم المستلم الكامل.', 'Please enter recipient full name.'));
      return;
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 9) {
      setAddressError(
        t('يرجى إدخال رقم جوال سعودي صحيح.', 'Please enter a valid Saudi mobile number.')
      );
      return;
    }

    if (!districtAr.trim() || !streetAr.trim()) {
      setAddressError(t('يرجى إدخال اسم الحي والشارع.', 'Please enter District and Street name.'));
      return;
    }

    if (!/^\d{4}$/.test(buildingNumber.trim())) {
      setAddressError(
        t(
          'رقم المبنى في العنوان الوطني السعودي يجب أن يتكون من ٤ أرقام (مثال: 4281).',
          'Building number must be exactly 4 digits (e.g., 4281).'
        )
      );
      return;
    }

    if (!/^\d{5}$/.test(postalCode.trim())) {
      setAddressError(
        t(
          'الرمز البريدي السعودي يجب أن يتكون من ٥ أرقام (مثال: 13516).',
          'Saudi Postal Code must be exactly 5 digits (e.g., 13516).'
        )
      );
      return;
    }

    if (!/^\d{4}$/.test(additionalNumber.trim())) {
      setAddressError(
        t(
          'الرقم الإضافي يجب أن يتكون من ٤ أرقام (مثال: 7392).',
          'Additional number must be exactly 4 digits (e.g., 7392).'
        )
      );
      return;
    }

    const matchedCity =
      SAUDI_CITY_OPTIONS.find((c) => c.ar === cityAr) || SAUDI_CITY_OPTIONS[0];

    const newAddr: SaudiAddress = {
      id: `addr-${Date.now()}`,
      labelAr: labelAr.trim() || 'عنوان وطني',
      labelEn: labelAr.trim() || 'National Address',
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      cityAr: matchedCity.ar,
      cityEn: matchedCity.en,
      districtAr: districtAr.trim(),
      streetAr: streetAr.trim(),
      buildingNumber: buildingNumber.trim(),
      postalCode: postalCode.trim(),
      additionalNumber: additionalNumber.trim(),
      landmarkAr: landmarkAr.trim() || matchedCity.ar,
      isDefault: !currentUser?.addresses || currentUser.addresses.length === 0,
    };

    setIsSavingAddress(true);
    const ok = await saveAddress(newAddr);
    setIsSavingAddress(false);

    if (ok) {
      setSelectedAddressId(newAddr.id);
      setShowNewAddressForm(false);
    }
  };

  const handlePlaceFinalOrder = async () => {
    setCheckoutError(null);
    if (!selectedAddressObj) {
      setCheckoutError(
        t('يرجى اختيار أو إضافة عنوان وطني للتوصيل أولاً.', 'Please select or add a delivery address.')
      );
      setStep(1);
      return;
    }

    if (paymentMethod === 'wallet' && (currentUser?.walletBalance || 0) < finalTotal) {
      setCheckoutError(
        t(
          'رصيد محفظة أثيل غير كافٍ لتغطية إجمالي الطلب. يرجى اختيار وسيلة دفع أخرى.',
          'Insufficient Atheel Wallet balance for this order. Please choose another payment method.'
        )
      );
      setStep(3);
      return;
    }

    setIsPlacingOrder(true);
    await placeOrder({
      address: selectedAddressObj,
      deliverySpeed,
      paymentMethod,
    });
    setIsPlacingOrder(false);
  };

  const paymentLabels: Record<PaymentMethodType, { ar: string; en: string; descAr: string; descEn: string }> = {
    mada: {
      ar: 'بطاقة مدى البنكية السعودية (Mada)',
      en: 'Saudi Mada Debit Card',
      descAr: 'دفع فوري آمن عبر الشبكة السعودية للمدفوعات (محاكاة معتمدة)',
      descEn: 'Instant payment via Saudi Payments Network (Portfolio Simulation)',
    },
    apple_pay: {
      ar: 'Apple Pay — الدفع بلمسة واحدة',
      en: 'Apple Pay Express',
      descAr: 'مصادقة فورية عبر Face ID / Touch ID بدون إدخال بيانات البطاقة',
      descEn: 'One-touch biometric checkout simulation',
    },
    visa_mastercard: {
      ar: 'البطاقات الائتمانية (Visa / Mastercard)',
      en: 'Visa / Mastercard Credit Card',
      descAr: 'يدعم البطاقات الائتمانية المحلية والدولية مع حماية 3D Secure',
      descEn: 'Supports local & international credit cards with 3DS simulation',
    },
    stc_pay: {
      ar: 'محفظة STC Pay الرقمية',
      en: 'STC Pay Digital Wallet',
      descAr: 'الدفع السريع عبر رقم الجوال السعودي المسجل في STC Pay',
      descEn: 'Quick authorization via your Saudi mobile number',
    },
    wallet: {
      ar: `محفظة أثيل الملكية (الرصيد: ${formatPrice(currentUser?.walletBalance || 0)})`,
      en: `Atheel Royal Wallet (Balance: ${formatPrice(currentUser?.walletBalance || 0)})`,
      descAr: 'خصم فوري من رصيد محفظتك واسترداد نقدي إضافي لنقاط الولاء',
      descEn: 'Instant deduction from your Atheel member wallet balance',
    },
    cod: {
      ar: 'الدفع عند الاستلام (نقداً أو شبكة مدى)',
      en: 'Cash / Mada POS on Delivery (COD)',
      descAr: 'ادفع لمندوب التوصيل عند استلام الشحنة في عنوانك الوطني',
      descEn: 'Pay the courier upon receiving your shipment at your address',
    },
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-8 lg:py-10 space-y-8">
      {/* Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E0D6] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8C857B]">
            <button
              type="button"
              onClick={() => navigateTo('cart')}
              className="hover:text-[#0B4F3F] font-semibold"
            >
              {t('حقيبة التسوق', 'Shopping Bag')}
            </button>
            <span>/</span>
            <span className="text-[#141413] font-bold">
              {t('إتمام الطلب الآمن', 'Secure Checkout')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#141413] mt-1">
            {t('إتمام الطلب وإصدار الفاتورة الضريبية', 'Complete Your Luxury Order')}
          </h1>
        </div>

        {isDemoMode && (
          <div className="px-3.5 py-2 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/40 text-xs text-[#141413] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B8860B]" />
            <span>
              {t(
                'وضع العرض التجريبي: سيتم إنشاء الطلب محلياً لأغراض التجربة',
                'Demo Mode: Order will be simulated in local memory'
              )}
            </span>
          </div>
        )}
      </div>

      {/* 4-Step Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            { num: 1 as const, ar: '١. العنوان الوطني', en: '1. Saudi Address', icon: MapPin },
            { num: 2 as const, ar: '٢. سرعة التوصيل', en: '2. Delivery Speed', icon: Truck },
            { num: 3 as const, ar: '٣. وسيلة الدفع', en: '3. Payment Method', icon: CreditCard },
            { num: 4 as const, ar: '٤. مراجعة وتأكيد الطلب', en: '4. Review & Confirm', icon: FileText },
          ] as const
        ).map((s) => {
          const Icon = s.icon;
          const isCurrent = step === s.num;
          const isCompleted = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num === 1 || selectedAddressObj) setStep(s.num);
              }}
              className={`p-3.5 rounded-xl border text-start flex items-center gap-3 transition-all ${
                isCurrent
                  ? 'bg-[#0B4F3F] text-white border-[#0B4F3F] shadow-xs'
                  : isCompleted
                  ? 'bg-[#EBF3F0] text-[#0B4F3F] border-[#0B4F3F]/30'
                  : 'bg-white text-[#57534E] border-[#E6E0D6]'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-white/15 text-[#F5E6C8]'
                    : isCompleted
                    ? 'bg-[#0B4F3F] text-white'
                    : 'bg-[#F3EFEA] text-[#8C857B]'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-xs font-bold truncate">{lang === 'ar' ? s.ar : s.en}</span>
            </button>
          );
        })}
      </div>

      {checkoutError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-[#9E2A2B]/30 flex items-center gap-3 text-xs text-[#9E2A2B] font-semibold"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Main Checkout Layout: 8 Cols Steps + 4 Cols VAT-Inclusive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {/* ==============================================================
              STEP 1: SAUDI NATIONAL ADDRESS
             ============================================================== */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F3EFEA] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#141413]">
                    {t('الخطوة ١: اختر العنوان الوطني للتوصيل', 'Step 1: Select Saudi National Address')}
                  </h2>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    {t(
                      'يتم التوصيل مباشرة إلى عنوانك الوطني المعتمد في المملكة العربية السعودية',
                      'Direct delivery to your registered Saudi National Address'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F3EFEA] border border-[#E6E0D6] text-xs font-bold text-[#0B4F3F]"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('إضافة عنوان وطني جديد', 'Add New Address')}</span>
                </button>
              </div>

              {/* Saved Addresses Grid */}
              {currentUser?.addresses && currentUser.addresses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentUser.addresses.map((addr) => {
                    const isSelected = selectedAddressObj?.id === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#EBF3F0]/50 border-[#0B4F3F] ring-1 ring-[#0B4F3F]'
                            : 'bg-[#FAF8F5] border-[#E6E0D6] hover:border-[#141413]/40'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#0B4F3F]">
                              {lang === 'ar' ? addr.labelAr : addr.labelEn}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0B4F3F]" />}
                          </div>
                          <div className="text-sm font-bold text-[#141413]">
                            {addr.recipientName}
                          </div>
                          <div className="text-xs text-[#57534E] leading-relaxed">
                            {lang === 'ar' ? addr.cityAr : addr.cityEn} — {addr.districtAr}،{' '}
                            {addr.streetAr}
                          </div>
                          <div className="text-[11px] font-mono text-[#8C857B]">
                            {t('مبنى:', 'Bldg:')} {addr.buildingNumber} · {t('الرمز البريدي:', 'Postal:')}{' '}
                            {addr.postalCode} · {t('إضافي:', 'Addl:')} {addr.additionalNumber}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#E6E0D6] flex items-center justify-between text-xs text-[#57534E]">
                          <span className="font-mono">{addr.phone}</span>
                          <span className="truncate max-w-[160px]">{addr.landmarkAr}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New Saudi National Address Form */}
              {showNewAddressForm && (
                <form
                  onSubmit={handleSaveNewAddress}
                  className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-4"
                >
                  <h3 className="text-sm font-bold text-[#141413] flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0B4F3F]" />
                    <span>
                      {t('تسجيل عنوان وطني سعودي جديد', 'Register New Saudi National Address')}
                    </span>
                  </h3>

                  {addressError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-[#9E2A2B]/30 text-xs text-[#9E2A2B] font-medium">
                      {addressError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('تسمية العنوان', 'Address Label')}
                      </label>
                      <input
                        type="text"
                        required
                        value={labelAr}
                        onChange={(e) => setLabelAr(e.target.value)}
                        placeholder={t('المنزل، المكتب، الاستراحة', 'Home, Office')}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('اسم المستلم الكامل', 'Recipient Name')}
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('رقم الجوال السعودي', 'Saudi Mobile Number')}
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+966 50 511 9988"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('المدينة', 'City')}
                      </label>
                      <select
                        value={cityAr}
                        onChange={(e) => setCityAr(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-semibold"
                      >
                        {SAUDI_CITY_OPTIONS.map((c) => (
                          <option key={c.en} value={c.ar}>
                            {lang === 'ar' ? c.ar : c.en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('الحي', 'District')}
                      </label>
                      <input
                        type="text"
                        required
                        value={districtAr}
                        onChange={(e) => setDistrictAr(e.target.value)}
                        placeholder={t('مثال: حي حطين', 'e.g., Hittin District')}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('الشارع', 'Street Name')}
                      </label>
                      <input
                        type="text"
                        required
                        value={streetAr}
                        onChange={(e) => setStreetAr(e.target.value)}
                        placeholder={t('مثال: طريق الأمير محمد بن سلمان', 'Street')}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('رقم المبنى (٤ أرقام)', 'Building No. (4 digits)')}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={buildingNumber}
                        onChange={(e) => setBuildingNumber(e.target.value)}
                        placeholder="4281"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('الرمز البريدي (٥ أرقام)', 'Postal Code (5 digits)')}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="13516"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('الرقم الإضافي (٤ أرقام)', 'Additional No. (4 digits)')}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        value={additionalNumber}
                        onChange={(e) => setAdditionalNumber(e.target.value)}
                        placeholder="7392"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t('علامة مميزة قريبة من العنوان', 'Nearest Landmark')}
                    </label>
                    <input
                      type="text"
                      value={landmarkAr}
                      onChange={(e) => setLandmarkAr(e.target.value)}
                      placeholder={t('مثال: مقابل البوابة الشمالية لبوليفارد رياض سيتي', 'Near landmark')}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(false)}
                      className="px-4 py-2 rounded-xl border border-[#E6E0D6] bg-white text-xs font-semibold"
                    >
                      {t('إلغاء', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      className="px-5 py-2 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      {isSavingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{t('حفظ واعتماد العنوان الوطني', 'Save & Select Address')}</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="pt-4 border-t border-[#F3EFEA] flex justify-end">
                <button
                  type="button"
                  disabled={!selectedAddressObj}
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <span>{t('المتابعة لاختيار سرعة التوصيل', 'Continue to Delivery Options')}</span>
                  <DirArrow className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 2: DELIVERY SPEED
             ============================================================== */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#141413]">
                  {t('الخطوة ٢: اختر طريقة وسرعة التوصيل', 'Step 2: Choose Delivery Speed')}
                </h2>
                <p className="text-xs text-[#57534E] mt-0.5">
                  {t(
                    'جميع الشحنات مؤمّنة بالكامل وتُسلّم في عبوات أثيل الفاخرة المبردة',
                    'All shipments are fully insured and temperature-controlled'
                  )}
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Option 1: Standard */}
                <div
                  onClick={() => setDeliverySpeed('standard')}
                  className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    deliverySpeed === 'standard'
                      ? 'bg-[#EBF3F0]/50 border-[#0B4F3F] ring-1 ring-[#0B4F3F]'
                      : 'bg-[#FAF8F5] border-[#E6E0D6] hover:border-[#141413]/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <Truck className="w-5 h-5 text-[#0B4F3F] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-[#141413]">
                        {t('التوصيل القياسي المبرد — أرامكس بريميوم', 'Standard Temperature-Controlled — Aramex Premium')}
                      </div>
                      <p className="text-xs text-[#57534E] mt-1">
                        {t(
                          'التوصيل المتوقع خلال ٢ إلى ٤ أيام عمل لجميع مدن المملكة',
                          'Estimated delivery within 2–4 business days across KSA'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <span className="text-sm font-bold font-mono text-[#0B4F3F]">
                      {cartSummary.shippingFee === 0
                        ? t('مجاني', 'FREE')
                        : formatPrice(cartSummary.shippingFee)}
                    </span>
                    <div className="text-[10px] text-[#8C857B]">
                      {t('شامل الضريبة ١٥٪', 'Incl. 15% VAT')}
                    </div>
                  </div>
                </div>

                {/* Option 2: Express VIP */}
                <div
                  onClick={() => setDeliverySpeed('express')}
                  className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    deliverySpeed === 'express'
                      ? 'bg-[#EBF3F0]/50 border-[#0B4F3F] ring-1 ring-[#0B4F3F]'
                      : 'bg-[#FAF8F5] border-[#E6E0D6] hover:border-[#141413]/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <Sparkles className="w-5 h-5 text-[#C59B27] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-[#141413]">
                        {t('توصيل سبل إكسبريس VIP السريع والمؤمّن', 'SPL Express VIP Priority Courier')}
                      </div>
                      <p className="text-xs text-[#57534E] mt-1">
                        {t(
                          'توصيل بنفس اليوم في الرياض وخلال ٢٤ ساعة للمدن الرئيسية مع تغليف إهداء ملكي',
                          'Same-day in Riyadh & 24-hour priority across major Saudi cities'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <span className="text-sm font-bold font-mono text-[#141413]">
                      {formatPrice(35)}
                    </span>
                    <div className="text-[10px] text-[#8C857B]">
                      {t('شامل الضريبة ١٥٪', 'Incl. 15% VAT')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#F3EFEA] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E0D6] text-xs font-semibold"
                >
                  {t('رجوع للعنوان', 'Back to Address')}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-3 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <span>{t('المتابعة لاختيار وسيلة الدفع', 'Continue to Payment')}</span>
                  <DirArrow className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 3: PORTFOLIO-SAFE PAYMENT METHODS
             ============================================================== */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F3EFEA] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#141413]">
                    {t('الخطوة ٣: اختر وسيلة الدفع الآمنة', 'Step 3: Select Payment Method')}
                  </h2>
                  <p className="text-xs text-[#57534E] mt-0.5">
                    {t(
                      'بوابة دفع تجريبية معتمدة للعرض (Mock Payment Adapter) — لا تتطلب إدخال بيانات بطاقة حقيقية',
                      'Portfolio-Safe Mock Payment Adapter — No real credit card required'
                    )}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B4F3F]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>PCI-DSS Simulation</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(
                  ['mada', 'apple_pay', 'visa_mastercard', 'stc_pay', 'wallet', 'cod'] as PaymentMethodType[]
                ).map((method) => {
                  const selected = paymentMethod === method;
                  const info = paymentLabels[method];
                  const Icon =
                    method === 'wallet'
                      ? Wallet
                      : method === 'cod'
                      ? Banknote
                      : method === 'stc_pay' || method === 'apple_pay'
                      ? Smartphone
                      : CreditCard;

                  return (
                    <div
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        selected
                          ? 'bg-[#EBF3F0]/50 border-[#0B4F3F] ring-1 ring-[#0B4F3F]'
                          : 'bg-[#FAF8F5] border-[#E6E0D6] hover:border-[#141413]/40'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-[#0B4F3F] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#141413]">
                          {lang === 'ar' ? info.ar : info.en}
                        </div>
                        <p className="text-[11px] text-[#57534E] mt-1 leading-relaxed">
                          {lang === 'ar' ? info.descAr : info.descEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Mock Payment Simulation Panel */}
              {(paymentMethod === 'mada' || paymentMethod === 'visa_mastercard') && (
                <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#141413]">
                      {t(
                        'محاكاة بيانات البطاقة البنكية (مملوءة تلقائياً للتجربة)',
                        'Simulated Card Details (Pre-filled for Demo)'
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-[#0B4F3F]">
                      {paymentMethod === 'mada' ? 'MADA 3DS SIMULATOR' : 'VISA / MC SIMULATOR'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-[#57534E] mb-1">
                        {t('الاسم على البطاقة', 'Cardholder Name')}
                      </label>
                      <input
                        type="text"
                        value={mockCardName}
                        onChange={(e) => setMockCardName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#57534E] mb-1">
                        {t('رقم البطاقة التجريبية', 'Simulated Card Number')}
                      </label>
                      <input
                        type="text"
                        value={mockCardNumber}
                        onChange={(e) => setMockCardNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#57534E] mb-1">
                        {t('تاريخ الانتهاء', 'Expiry Date')}
                      </label>
                      <input
                        type="text"
                        value={mockCardExpiry}
                        onChange={(e) => setMockCardExpiry(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#57534E] mb-1">
                        {t('رمز الأمان CVV', 'Simulated CVV')}
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={mockCardCvv}
                        onChange={(e) => setMockCardCvv(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'stc_pay' && (
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2">
                  <label className="block text-xs font-bold text-[#141413]">
                    {t('رقم الجوال المرتبط بمحفظة STC Pay (محاكاة)', 'Simulated STC Pay Mobile Number')}
                  </label>
                  <input
                    type="tel"
                    value={mockStcPhone}
                    onChange={(e) => setMockStcPhone(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 rounded-xl bg-white border border-[#E6E0D6] text-xs font-mono"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-[#F3EFEA] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E0D6] text-xs font-semibold"
                >
                  {t('رجوع لخيارات الشحن', 'Back to Delivery')}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-3 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <span>{t('مراجعة الطلب النهائي', 'Review Final Order')}</span>
                  <DirArrow className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==============================================================
              STEP 4: REVIEW ORDER & PLACE ORDER
             ============================================================== */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#141413]">
                  {t('الخطوة ٤: المراجعة النهائية وإصدار الطلب', 'Step 4: Final Order Review & Confirmation')}
                </h2>
                <p className="text-xs text-[#57534E] mt-0.5">
                  {t(
                    'يرجى مراجعة المنتجات والعنوان الوطني ووسيلة الدفع قبل تأكيد الطلب النهائي',
                    'Please verify your items, Saudi National Address, and payment method before placing your order'
                  )}
                </p>
              </div>

              {/* Summary of Address, Delivery, and Payment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B4F3F]">
                    <span>{t('عنوان التوصيل الوطني', 'Delivery Address')}</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="underline text-[11px]"
                    >
                      {t('تعديل', 'Edit')}
                    </button>
                  </div>
                  {selectedAddressObj && (
                    <>
                      <div className="text-xs font-bold text-[#141413] pt-1">
                        {selectedAddressObj.recipientName}
                      </div>
                      <div className="text-[11px] text-[#57534E]">
                        {selectedAddressObj.cityAr} — {selectedAddressObj.districtAr}،{' '}
                        {selectedAddressObj.streetAr}
                      </div>
                      <div className="text-[11px] font-mono text-[#8C857B]">
                        {selectedAddressObj.buildingNumber} - {selectedAddressObj.postalCode}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B4F3F]">
                    <span>{t('طريقة الشحن', 'Shipping Speed')}</span>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="underline text-[11px]"
                    >
                      {t('تعديل', 'Edit')}
                    </button>
                  </div>
                  <div className="text-xs font-bold text-[#141413] pt-1">
                    {deliverySpeed === 'express'
                      ? t('سبل إكسبريس VIP (٢٤ ساعة)', 'SPL Express VIP (24h)')
                      : t('أرامكس بريميوم (٢-٤ أيام)', 'Aramex Premium (2–4 days)')}
                  </div>
                  <div className="text-[11px] font-mono text-[#57534E]">
                    {effectiveShippingFee === 0
                      ? t('شحن مجاني', 'Free Shipping')
                      : formatPrice(effectiveShippingFee)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B4F3F]">
                    <span>{t('وسيلة الدفع', 'Payment Method')}</span>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="underline text-[11px]"
                    >
                      {t('تعديل', 'Edit')}
                    </button>
                  </div>
                  <div className="text-xs font-bold text-[#141413] pt-1">
                    {lang === 'ar'
                      ? paymentLabels[paymentMethod].ar
                      : paymentLabels[paymentMethod].en}
                  </div>
                  <div className="text-[11px] text-[#57534E]">
                    {t('شامل ضريبة القيمة المضافة ١٥٪', '15% Saudi VAT Included')}
                  </div>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C857B]">
                  {t('المنتجات المشمولة في الطلب', 'Order Line Items')} ({cartSummary.itemCount})
                </h3>
                <div className="divide-y divide-[#F3EFEA] border border-[#E6E0D6] rounded-xl overflow-hidden">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={item.product.images[0]}
                          alt={lang === 'ar' ? item.product.titleAr : item.product.titleEn}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover bg-[#F3EFEA] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#141413] truncate">
                            {lang === 'ar' ? item.product.titleAr : item.product.titleEn}
                          </h4>
                          <p className="text-[11px] text-[#8C857B] mt-0.5">
                            {lang === 'ar' ? item.product.sellerNameAr : item.product.sellerNameEn}{' '}
                            · {t('الكمية:', 'Qty:')} {item.quantity}
                          </p>
                          {Object.keys(item.selectedVariants).length > 0 && (
                            <p className="text-[11px] text-[#0B4F3F] mt-0.5">
                              {Object.entries(item.selectedVariants)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-end font-mono text-xs font-bold text-[#141413] shrink-0">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#F3EFEA] flex flex-wrap items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E0D6] text-xs font-semibold"
                >
                  {t('رجوع لوسيلة الدفع', 'Back to Payment')}
                </button>
                <button
                  type="button"
                  disabled={isPlacingOrder}
                  onClick={handlePlaceFinalOrder}
                  className="px-8 py-4 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-60 text-white text-sm font-bold inline-flex items-center gap-2.5 shadow-md transition-all"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('جاري تسجيل الطلب وإصدار الفاتورة...', 'Placing Order...')}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 text-[#C59B27]" />
                      <span>
                        {t(
                          `تأكيد وإتمام الطلب الآن (${formatPrice(finalTotal)})`,
                          `Place Order Now (${formatPrice(finalTotal)})`
                        )}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sticky Column: VAT-Inclusive Invoice Summary */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-5 sticky top-24">
            <div className="border-b border-[#F3EFEA] pb-3.5">
              <h3 className="text-base font-bold text-[#141413]">
                {t('ملخص الفاتورة الضريبية المبسطة', 'VAT-Inclusive Order Summary')}
              </h3>
              <p className="text-[11px] text-[#8C857B] mt-0.5">
                {t(
                  'متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك ZATCA',
                  'Compliant with Saudi ZATCA E-Invoicing regulations'
                )}
              </p>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder={t('كود الخصم (ATHEEL15)', 'Promo Code (ATHEEL15)')}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (couponInput.trim()) applyCouponCode(couponInput.trim());
                  }}
                  className="px-4 py-2 rounded-xl bg-[#141413] text-white text-xs font-bold"
                >
                  {t('تطبيق', 'Apply')}
                </button>
              </div>
              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs bg-[#EBF3F0] text-[#0B4F3F] px-3 py-2 rounded-lg font-semibold">
                  <span>
                    {t('الكوبون المفعّل:', 'Active Coupon:')} {appliedCoupon.code}
                  </span>
                  <button type="button" onClick={removeCoupon} className="underline">
                    {t('إزالة', 'Remove')}
                  </button>
                </div>
              )}
            </div>

            {/* Financial Lines (VAT-Inclusive Math — No Double Taxation) */}
            <div className="space-y-3 text-xs border-t border-[#E6E0D6] pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[#57534E]">
                  {t('المجموع الفرعي (شامل الضريبة)', 'Subtotal (VAT Inclusive)')}
                </span>
                <span className="font-mono font-bold text-[#141413]">
                  {formatPrice(cartSummary.subtotal)}
                </span>
              </div>

              {cartSummary.discountAmount > 0 && (
                <div className="flex items-center justify-between text-[#15803D]">
                  <span>
                    {t('قيمة الخصم', 'Discount')}
                    {appliedCoupon ? ` (${appliedCoupon.code})` : ''}
                  </span>
                  <span className="font-mono font-bold">
                    -{formatPrice(cartSummary.discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[#57534E]">
                  {t('رسوم الشحن والتوصيل (شامل الضريبة)', 'Shipping (VAT Inclusive)')}
                </span>
                <span className="font-mono font-bold text-[#141413]">
                  {effectiveShippingFee === 0
                    ? t('مجاني', 'Free')
                    : formatPrice(effectiveShippingFee)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-[#57534E]">
                <span>
                  {t('ضريبة القيمة المضافة المتضمنة (١٥٪)', 'Included Saudi VAT (15%)')}
                </span>
                <span className="font-mono font-semibold text-[#141413]">
                  {formatPrice(includedVatAmount)}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-[#E6E0D6] pt-3.5">
                <div>
                  <div className="text-sm font-bold text-[#141413]">
                    {t('الإجمالي النهائي المستحق', 'Final Payable Total')}
                  </div>
                  <div className="text-[10px] text-[#8C857B]">
                    {t('شامل ١٥٪ ضريبة القيمة المضافة دون ازدواج ضريبي', 'Includes 15% VAT (15/115 extracted)')}
                  </div>
                </div>
                <span className="text-xl font-bold font-mono text-[#0B4F3F]">
                  {formatPrice(finalTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OrderConfirmationView() {
  const {
    lang,
    isRtl,
    t,
    formatPrice,
    navigateTo,
    lastCreatedOrder,
    orders,
  } = useMarketplace();

  const order = lastCreatedOrder || orders[0] || null;
  const DirArrow = isRtl ? ArrowLeft : ArrowRight;

  if (!order) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-14 text-center">
        <div className="max-w-lg mx-auto bg-white rounded-2xl border border-[#E6E0D6] p-8 space-y-4">
          <Package className="w-10 h-10 text-[#C59B27] mx-auto" />
          <h1 className="text-lg font-bold text-[#141413]">
            {t('لا يوجد طلب حديث لعرضه', 'No Recent Order Found')}
          </h1>
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
          >
            {t('العودة للصفحة الرئيسية', 'Back to Homepage')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 space-y-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Confirmation Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0B4F3F] via-[#083B2F] to-[#141413] text-white p-8 border border-[#C59B27]/40 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-[#C59B27] text-[#141413] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-[#F5E6C8] font-medium">
                  {t('تم استلام وتأكيد طلبك بنجاح', 'Order Confirmed & Tax Invoice Issued')}
                </div>
                <h1 className="text-2xl font-bold font-mono text-white">
                  #{order.orderNumber}
                </h1>
              </div>
            </div>

            <div className="text-end">
              <div className="text-xs text-[#D6D0C4]">
                {t('الإجمالي النهائي المدفوع (شامل الضريبة)', 'Final Total Paid (VAT Inclusive)')}
              </div>
              <div className="text-2xl font-bold font-mono text-[#F5E6C8]">
                {formatPrice(order.total)}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#E6E0D6]">
            <div>
              <span className="text-[#C59B27] block font-semibold">
                {t('رقم التتبع والناقل', 'Tracking & Carrier')}
              </span>
              <span className="font-mono font-bold">{order.trackingNumber}</span> ·{' '}
              <span>{lang === 'ar' ? order.carrierAr : order.carrierEn}</span>
            </div>
            <div>
              <span className="text-[#C59B27] block font-semibold">
                {t('وسيلة الدفع والمرجع', 'Payment & Reference')}
              </span>
              <span className="uppercase font-mono">{order.paymentMethod}</span> ·{' '}
              <span className="font-mono">{order.paymentReference}</span>
            </div>
            <div>
              <span className="text-[#C59B27] block font-semibold">
                {t('موعد التوصيل المتوقع', 'Estimated Delivery')}
              </span>
              <span>
                {order.deliverySpeed === 'express'
                  ? t('خلال ٢٤ ساعة (توصيل VIP سريع)', 'Within 24 Hours (VIP Express)')
                  : t('خلال ٢ إلى ٤ أيام عمل', 'Within 2–4 Business Days')}
              </span>
            </div>
          </div>
        </div>

        {/* Address & Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-3">
            <h2 className="text-sm font-bold text-[#141413] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0B4F3F]" />
              <span>{t('العنوان الوطني للتوصيل', 'Saudi National Delivery Address')}</span>
            </h2>
            <div className="text-xs text-[#57534E] space-y-1">
              <p className="font-bold text-[#141413]">{order.address.recipientName}</p>
              <p className="font-mono">{order.address.phone}</p>
              <p>
                {lang === 'ar' ? order.address.cityAr : order.address.cityEn} —{' '}
                {order.address.districtAr}، {order.address.streetAr}
              </p>
              <p className="font-mono text-[#8C857B]">
                {t('مبنى:', 'Bldg:')} {order.address.buildingNumber} ·{' '}
                {t('الرمز البريدي:', 'Postal:')} {order.address.postalCode} ·{' '}
                {t('إضافي:', 'Addl:')} {order.address.additionalNumber}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-2.5 text-xs">
            <h2 className="text-sm font-bold text-[#141413] mb-2">
              {t('تفاصيل الفاتورة الضريبية (١٥٪ متضمنة)', 'Tax Invoice Breakdown (15% Included)')}
            </h2>
            <div className="flex justify-between">
              <span className="text-[#57534E]">
                {t('المجموع الفرعي (شامل الضريبة)', 'Subtotal (VAT Inclusive)')}
              </span>
              <span className="font-mono font-bold">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-[#15803D]">
                <span>{t('الخصم المطبق', 'Discount')}</span>
                <span className="font-mono font-bold">-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#57534E]">{t('رسوم الشحن', 'Shipping Fee')}</span>
              <span className="font-mono font-bold">
                {order.shippingFee === 0 ? t('مجاني', 'Free') : formatPrice(order.shippingFee)}
              </span>
            </div>
            <div className="flex justify-between text-[#57534E]">
              <span>
                {t('ضريبة القيمة المضافة المتضمنة (١٥٪)', 'Included Saudi VAT (15%)')}
              </span>
              <span className="font-mono font-semibold">{formatPrice(order.vatAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#0B4F3F] border-t border-[#E6E0D6] pt-2.5">
              <span>{t('الإجمالي النهائي', 'Final Total')}</span>
              <span className="font-mono">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Purchased Products */}
        <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#141413]">
            {t('المنتجات المشتراة في هذا الطلب', 'Purchased Items')} ({order.items.length})
          </h2>
          <div className="divide-y divide-[#F3EFEA]">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={item.image}
                    alt={lang === 'ar' ? item.titleAr : item.titleEn}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover bg-[#F3EFEA] shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-[#141413] truncate">
                      {lang === 'ar' ? item.titleAr : item.titleEn}
                    </h3>
                    <p className="text-[11px] text-[#8C857B]">
                      {lang === 'ar' ? item.sellerNameAr : item.sellerNameEn} ·{' '}
                      {t('الكمية:', 'Qty:')} {item.quantity}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-mono font-bold text-[#141413] shrink-0">
                  {formatPrice(item.unitPrice * item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateTo('orders')}
            className="px-6 py-3.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>{t('عرض طلباتي وتتبع الشحنة', 'View My Orders & Track Shipment')}</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="px-6 py-3.5 rounded-xl bg-white border border-[#E6E0D6] hover:border-[#141413] text-xs font-bold text-[#141413] inline-flex items-center gap-2"
          >
            <span>{t('متابعة التسوق في أثيل', 'Continue Shopping')}</span>
            <DirArrow className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
