'use client';

import React, { useState, useEffect } from 'react';
import {
  Crown,
  Mail,
  Lock,
  User,
  Phone,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { UserRole } from '../lib/types';

export function AuthViews() {
  const {
    lang,
    isRtl,
    t,
    activeView,
    navigateTo,
    pendingRedirectView,
    loginWithEmail,
    registerWithEmail,
    sendPasswordReset,
    loginWithGoogle,
    loginWithDemoRole,
  } = useMarketplace();

  const mode: 'login' | 'register' | 'forgot' =
    activeView === 'register'
      ? 'register'
      : activeView === 'forgot-password'
      ? 'forgot'
      : 'login';

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+966 5');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Submission & feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetSuccessEmail, setResetSuccessEmail] = useState<string | null>(null);

  const DirArrow = isRtl ? ArrowLeft : ArrowRight;

  const switchMode = (nextMode: 'login' | 'register' | 'forgot') => {
    setFormError(null);
    setResetSuccessEmail(null);
    if (nextMode === 'register') navigateTo('register');
    else if (nextMode === 'forgot') navigateTo('forgot-password');
    else navigateTo('login');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError(
        t('يرجى إدخال البريد الإلكتروني وكلمة المرور.', 'Please enter both email and password.')
      );
      return;
    }

    setIsSubmitting(true);
    const res = await loginWithEmail(email, password);
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setFormError(res.error);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || name.trim().length < 3) {
      setFormError(
        t('يرجى إدخال الاسم الكامل (٣ أحرف على الأقل).', 'Please enter your full name (min 3 characters).')
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError(
        t('يرجى إدخال بريد إلكتروني صحيح.', 'Please enter a valid email address.')
      );
      return;
    }

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 9) {
      setFormError(
        t('يرجى إدخال رقم جوال سعودي صحيح.', 'Please enter a valid Saudi mobile number.')
      );
      return;
    }

    if (password.length < 6) {
      setFormError(
        t(
          'يجب أن تتكون كلمة المرور من ٦ أحرف أو أرقام على الأقل.',
          'Password must be at least 6 characters long.'
        )
      );
      return;
    }

    if (password !== confirmPassword) {
      setFormError(
        t('كلمتا المرور غير متطابقتين.', 'Passwords do not match.')
      );
      return;
    }

    setIsSubmitting(true);
    const res = await registerWithEmail({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    setIsSubmitting(false);

    if (!res.success && res.error) {
      setFormError(res.error);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetSuccessEmail(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError(
        t('يرجى إدخال البريد الإلكتروني المسجل بحسابك.', 'Please enter your registered email address.')
      );
      return;
    }

    setIsSubmitting(true);
    const res = await sendPasswordReset(email.trim());
    setIsSubmitting(false);

    if (res.success) {
      setResetSuccessEmail(email.trim());
    } else if (res.error) {
      setFormError(res.error);
    }
  };

  const handleGoogleClick = async () => {
    setFormError(null);
    setIsSubmitting(true);
    await loginWithGoogle();
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-10 lg:py-14">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden border border-[#E6E0D6] bg-white shadow-sm">
        {/* Left / Start Brand Heritage Column (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0B4F3F] via-[#083B2F] to-[#141413] text-[#FAF8F5] p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-e border-[#C59B27]/30">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#141413]/50 border border-[#C59B27]/50 flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#C59B27]" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-white">
                  {lang === 'ar' ? 'أثـيـل' : 'ATHEEL'}
                </div>
                <div className="text-[11px] text-[#F5E6C8]">
                  {t('بوابة الأعضاء الفاخرة', 'Luxury Member Concierge')}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h1 className="text-2xl font-bold text-white leading-snug">
                {mode === 'register'
                  ? t('انضم إلى نخبة عملاء أثيل في المملكة', 'Join Atheel Royal Membership')
                  : mode === 'forgot'
                  ? t('استعادة الوصول إلى حسابك بأمان', 'Secure Account Recovery')
                  : t('مرحباً بعودتك إلى عالم الفخامة السعودية', 'Welcome Back to Saudi Luxury')}
              </h1>
              <p className="text-xs text-[#D6D0C4] leading-relaxed">
                {t(
                  'تمتع بتجربة تسوق موثقة ١٠٠٪ من أرقى المتاجر السعودية، أسعار شاملة لضريبة القيمة المضافة ١٥٪، وتوصيل VIP سريع لجميع مدن المملكة.',
                  'Experience 100% verified Saudi boutiques, transparent 15% VAT-inclusive pricing, and insured VIP express delivery across KSA.'
                )}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/15 text-xs text-[#E6E0D6]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                <span>
                  {t(
                    'حماية كاملة للبيانات ومصادقة مشفرة عبر Firebase Authentication',
                    'Encrypted authentication powered by Firebase Auth'
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                <span>
                  {t(
                    'تتبع مستقل لشحنات كل متجر وإدارة متكاملة للعناوين الوطنية',
                    'Vendor-isolated shipment tracking and Saudi National Address management'
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#C59B27] shrink-0 mt-0.5" />
                <span>
                  {t(
                    'جميع الأسعار شاملة ضريبة القيمة المضافة السعودية ١٥٪ دون رسوم خفية',
                    'All prices include 15% Saudi VAT with zero hidden charges'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Subtle Portfolio Demo Mode Box */}
          <div className="mt-8 pt-6 border-t border-white/15 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#C59B27]">
                {t('وضع العرض التجريبي السريع (Demo Mode)', 'Portfolio Quick Demo Mode')}
              </span>
              <span className="text-[10px] text-[#D6D0C4]">
                {t('معزول وآمن', 'Isolated Sandbox')}
              </span>
            </div>
            <p className="text-[11px] text-[#D6D0C4] leading-relaxed">
              {t(
                'لأغراض استعراض المشروع فقط، يمكنك معاينة واجهات الأدوار الثلاثة في الذاكرة المحلية دون الحاجة لبيانات دخول حقيقية:',
                'For portfolio evaluation, preview Customer, Seller, or Admin interfaces in safe local memory without real credentials:'
              )}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { role: 'customer' as UserRole, ar: 'عميل تجريبي', en: 'Demo Customer' },
                  { role: 'seller' as UserRole, ar: 'تاجر تجريبي', en: 'Demo Seller' },
                  { role: 'admin' as UserRole, ar: 'إدارة تجريبية', en: 'Demo Admin' },
                ] as const
              ).map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => loginWithDemoRole(item.role)}
                  className="py-2 px-2 rounded-lg bg-white/10 hover:bg-[#C59B27] text-white hover:text-[#141413] text-[11px] font-bold border border-white/15 transition-all text-center"
                >
                  {lang === 'ar' ? item.ar : item.en}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right / End Form Column (7 cols) */}
        <div className="lg:col-span-7 p-7 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#F3EFEA] border border-[#E6E0D6] mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-white text-[#141413] shadow-2xs'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t('تسجيل الدخول', 'Sign In')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === 'register'
                    ? 'bg-white text-[#141413] shadow-2xs'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t('إنشاء حساب جديد', 'Create Account')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === 'forgot'
                    ? 'bg-white text-[#141413] shadow-2xs'
                    : 'text-[#57534E] hover:text-[#141413]'
                }`}
              >
                {t('استعادة كلمة المرور', 'Reset Password')}
              </button>
            </div>

            {pendingRedirectView && (
              <div className="mb-5 p-3.5 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/40 flex items-center gap-2.5 text-xs text-[#141413]">
                <ShieldCheck className="w-4 h-4 text-[#B8860B] shrink-0" />
                <span>
                  {t(
                    'يرجى تسجيل الدخول أو إنشاء حساب للمتابعة إلى الصفحة المطلوبة.',
                    'Please sign in or create an account to continue to your requested page.'
                  )}
                </span>
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 border border-[#9E2A2B]/30 flex items-start gap-2.5 text-xs text-[#9E2A2B]"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{formError}</span>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold text-[#141413] mb-1.5"
                  >
                    {t('البريد الإلكتروني', 'Email Address')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.sa"
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-bold text-[#141413]"
                    >
                      {t('كلمة المرور', 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-semibold text-[#0B4F3F] hover:underline"
                    >
                      {t('نسيت كلمة المرور؟', 'Forgot password?')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full ps-10 pe-10 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-2.5 end-3 text-[#8C857B] hover:text-[#141413]"
                      aria-label={t('إظهار كلمة المرور', 'Toggle password visibility')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('جاري التحقق والدخول...', 'Signing in...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('تسجيل الدخول إلى أثيل', 'Sign In to Atheel')}</span>
                      <DirArrow className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="relative my-5 flex items-center justify-center">
                  <div className="border-t border-[#E6E0D6] w-full" />
                  <span className="bg-white px-3 text-[11px] text-[#8C857B] whitespace-nowrap">
                    {t('أو المتابعة السريعة عبر', 'Or continue with')}
                  </span>
                  <div className="border-t border-[#E6E0D6] w-full" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#141413] flex items-center justify-center gap-2.5 transition-all"
                >
                  <GlobeIcon />
                  <span>{t('تسجيل الدخول باستخدام حساب Google', 'Continue with Google Account')}</span>
                </button>
              </form>
            )}

            {/* 2. REGISTER FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="reg-name"
                    className="block text-xs font-bold text-[#141413] mb-1.5"
                  >
                    {t('الاسم الكامل', 'Full Name')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('مثال: تركي بن عبدالله القحطاني', 'e.g., Turki Al-Qahtani')}
                      className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-bold text-[#141413] mb-1.5"
                    >
                      {t('البريد الإلكتروني', 'Email Address')}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.sa"
                        className="w-full ps-10 pe-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-xs font-bold text-[#141413] mb-1.5"
                    >
                      {t('رقم الجوال السعودي', 'Saudi Mobile Number')}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                      <input
                        id="reg-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+966 50 123 4567"
                        className="w-full ps-10 pe-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413] font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="reg-password"
                      className="block text-xs font-bold text-[#141413] mb-1.5"
                    >
                      {t('كلمة المرور (٦ أحرف على الأقل)', 'Password (min 6 chars)')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full ps-10 pe-9 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413]"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reg-confirm"
                      className="block text-xs font-bold text-[#141413] mb-1.5"
                    >
                      {t('تأكيد كلمة المرور', 'Confirm Password')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                      <input
                        id="reg-confirm"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full ps-10 pe-9 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-[11px] text-[#57534E] leading-relaxed">
                  {t(
                    'يتم تسجيل جميع الحسابات الجديدة بصلاحية (عميل). إذا كنت ترغب بالبيع كتاجر على أثيل، يمكنك تقديم طلب اعتماد السجل التجاري والرقم الضريبي بعد إنشاء حسابك.',
                    'All new accounts are registered as Customers. Merchants wishing to sell on Atheel can submit a Seller Application after registration for Admin approval.'
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('جاري إنشاء الحساب...', 'Creating account...')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('إنشاء حساب عميل جديد', 'Create Customer Account')}</span>
                      <DirArrow className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* 3. FORGOT PASSWORD FORM */}
            {mode === 'forgot' && (
              <div className="space-y-4">
                {resetSuccessEmail ? (
                  <div className="p-5 rounded-2xl bg-[#EBF3F0] border border-[#0B4F3F]/30 space-y-3">
                    <div className="flex items-center gap-2 text-[#0B4F3F] font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {t('تم إرسال تعليمات استعادة كلمة المرور', 'Password Reset Instructions Sent')}
                      </span>
                    </div>
                    <p className="text-xs text-[#141413] leading-relaxed">
                      {t(
                        `لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى البريد الإلكتروني (${resetSuccessEmail}). يرجى فتح الرابط لاختيار كلمة مرور جديدة ثم العودة لتسجيل الدخول.`,
                        `We sent a password reset link to (${resetSuccessEmail}). Follow the link in your email to set a new password.`
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="px-5 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                    >
                      {t('العودة لتسجيل الدخول', 'Return to Sign In')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex items-start gap-3">
                      <KeyRound className="w-5 h-5 text-[#C59B27] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#57534E] leading-relaxed">
                        {t(
                          'أدخل بريدك الإلكتروني المسجل في أثيل، وسنرسل إليك رابطاً رسمياً آمناً لإعادة تعيين كلمة المرور فوراً.',
                          'Enter your registered email address and we will send you a secure password reset link.'
                        )}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="forgot-email"
                        className="block text-xs font-bold text-[#141413] mb-1.5"
                      >
                        {t('البريد الإلكتروني المسجل', 'Registered Email Address')}
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#8C857B] absolute top-3 start-3.5" />
                        <input
                          id="forgot-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.sa"
                          className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] focus:border-[#0B4F3F] focus:bg-white focus:outline-none text-sm text-[#141413]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('جاري الإرسال...', 'Sending reset link...')}</span>
                        </>
                      ) : (
                        <span>{t('إرسال رابط استعادة كلمة المرور', 'Send Password Reset Link')}</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-[#F3EFEA] flex items-center justify-between text-xs text-[#8C857B]">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="hover:text-[#0B4F3F] font-semibold"
            >
              {t('← العودة لتصفح المتجر كزائر', '← Continue browsing publicly as guest')}
            </button>
            <span>{t('مشفر بمعيار TLS 1.3', 'TLS 1.3 Secured')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <span className="w-4 h-4 rounded-full bg-[#0B4F3F] text-[#F5E6C8] text-[10px] font-bold flex items-center justify-center font-mono">
      G
    </span>
  );
}
