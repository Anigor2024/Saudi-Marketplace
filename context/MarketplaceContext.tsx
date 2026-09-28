'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Language,
  UserRole,
  Category,
  Brand,
  Product,
  ProductStatus,
  Seller,
  SellerStatus,
  CartItem,
  Coupon,
  SaudiAddress,
  Order,
  OrderStatus,
  PaymentMethodType,
  Review,
  ProductQuestion,
  UserProfile,
  NotificationItem,
  SupportTicket,
  AuditLogEntry,
  HomepageConfig,
} from '../lib/types';
import {
  INITIAL_CATEGORIES,
  INITIAL_BRANDS,
  INITIAL_SELLERS,
  INITIAL_COUPONS,
  INITIAL_USERS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_QUESTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TICKETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_HOMEPAGE_CONFIG,
  buildOrderTimeline,
} from '../lib/seed-catalog';
import { SEED_PRODUCTS_PART_A } from '../lib/seed-products-a';
import { SEED_PRODUCTS_PART_B } from '../lib/seed-products-b';

const INITIAL_ALL_PRODUCTS: Product[] = [...SEED_PRODUCTS_PART_A, ...SEED_PRODUCTS_PART_B];

export type AppView =
  | 'home'
  | 'search'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'order-confirmation'
  | 'orders'
  | 'wishlist'
  | 'compare'
  | 'account'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'seller-dashboard'
  | 'admin-dashboard'
  | 'help'
  | 'about'
  | 'terms'
  | 'privacy'
  | 'returns-policy'
  | 'shipping-policy';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface MarketplaceContextType {
  // Language & I18n
  lang: Language;
  setLang: (l: Language) => void;
  isRtl: boolean;
  t: (ar: string, en: string) => string;
  formatPrice: (amount: number) => string;

  // Navigation
  activeView: AppView;
  navigateTo: (
    view: AppView,
    params?: { productId?: string; categoryId?: string; query?: string; sellerId?: string }
  ) => void;
  selectedProductId: string;
  lastCreatedOrder: Order | null;
  pendingRedirectView: AppView | null;
  setPendingRedirectView: (view: AppView | null) => void;

  // Auth, Session & Demo Mode Isolation
  currentUser: UserProfile | null;
  isAuthLoading: boolean;
  isDemoMode: boolean;
  canAccessSellerDashboard: boolean;
  canAccessAdminDashboard: boolean;
  exitDemoMode: () => void;
  loginWithDemoRole: (role: UserRole) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (params: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithCredentials: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  registerAccount: (
    name: string,
    email: string,
    phone: string,
    role?: 'customer' | 'seller',
    password?: string
  ) => Promise<void>;
  logout: () => Promise<void>;

  // Data Collections
  categories: Category[];
  brands: Brand[];
  products: Product[];
  sellers: Seller[];
  coupons: Coupon[];
  orders: Order[];
  reviews: Review[];
  questions: ProductQuestion[];
  users: UserProfile[];
  notifications: NotificationItem[];
  tickets: SupportTicket[];
  auditLogs: AuditLogEntry[];
  homepageConfig: HomepageConfig;
  isLoadingData: boolean;

  // Search & Filter State
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (c: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (s: string) => void;
  selectedBrandId: string;
  setSelectedBrandId: (b: string) => void;
  selectedSellerId: string;
  setSelectedSellerId: (s: string) => void;
  priceRange: [number, number];
  setPriceRange: (r: [number, number]) => void;
  minRating: number;
  setMinRating: (r: number) => void;
  onlyInStock: boolean;
  setOnlyInStock: (v: boolean) => void;
  onlyDiscounted: boolean;
  setOnlyDiscounted: (v: boolean) => void;
  sortBy: 'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'best_selling';
  setSortBy: (s: 'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'best_selling') => void;
  recentSearches: string[];
  addRecentSearch: (q: string) => void;
  resetFilters: () => void;

  // Cart & Coupon (VAT-Inclusive 15% Pricing)
  cart: CartItem[];
  addToCart: (product: Product, selectedVariants?: Record<string, string>, quantity?: number) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCouponCode: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  cartSummary: {
    subtotal: number; // VAT-inclusive
    discountAmount: number;
    netAfterDiscount: number;
    shippingFee: number; // VAT-inclusive
    vatAmount: number; // Included 15% Saudi VAT = total * 15 / 115
    total: number; // Final VAT-inclusive payable total (no double VAT)
    itemCount: number;
    pointsEarned: number;
  };

  // Wishlist, Compare, Recently Viewed
  wishlistIds: string[];
  toggleWishlist: (productId: string) => void;
  compareIds: string[];
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  recentlyViewedIds: string[];
  recordProductView: (productId: string) => void;

  // Customer Actions
  placeOrder: (params: {
    address: SaudiAddress;
    deliverySpeed: 'express' | 'standard';
    paymentMethod: PaymentMethodType;
  }) => Promise<Order | null>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  requestReturn: (
    orderId: string,
    reasonAr: string,
    details: string,
    refundMethod: 'wallet' | 'original_payment'
  ) => Promise<void>;
  saveAddress: (address: SaudiAddress) => Promise<boolean>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  submitReview: (productId: string, rating: number, title: string, comment: string) => Promise<void>;
  submitQuestion: (productId: string, questionText: string) => Promise<void>;
  submitSupportTicket: (
    subject: string,
    categoryAr: string,
    message: string,
    orderNumber?: string
  ) => Promise<void>;
  markAllNotificationsRead: () => void;

  // Seller Actions
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  bulkUpdateProductStatus: (productIds: string[], status: ProductStatus) => Promise<void>;
  updateProductStock: (productId: string, newStock: number, lowStockThreshold?: number) => Promise<void>;
  updateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    trackingNumber?: string,
    carrierAr?: string,
    carrierEn?: string,
    fulfillmentNote?: string
  ) => Promise<void>;
  saveCoupon: (coupon: Coupon) => Promise<void>;
  toggleCouponStatus: (couponId: string) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  replyToReview: (reviewId: string, replyText: string) => Promise<void>;
  respondToReturnRequest: (
    orderId: string,
    recommendation: 'approve_restock' | 'inspect_required' | 'dispute',
    merchantNote: string
  ) => Promise<void>;
  submitSellerApplication: (sellerData: Partial<Seller>) => Promise<void>;
  updateSellerProfile: (
    sellerId: string,
    safeUpdates: Partial<
      Pick<
        Seller,
        | 'nameAr'
        | 'nameEn'
        | 'descriptionAr'
        | 'descriptionEn'
        | 'cityAr'
        | 'cityEn'
        | 'phone'
        | 'email'
        | 'iban'
        | 'ownerName'
        | 'categories'
        | 'crNumber'
        | 'vatNumber'
        | 'operationalSettings'
      >
    >
  ) => Promise<void>;
  requestSellerPayout: (sellerId: string, amount: number) => Promise<void>;

  // Admin Actions
  updateSellerStatus: (sellerId: string, status: SellerStatus) => Promise<void>;
  moderateProduct: (
    productId: string,
    updates: Partial<Product>,
    logReasonAr: string,
    logReasonEn: string
  ) => Promise<void>;
  processReturnRequest: (orderId: string, approve: boolean, adminNote: string) => Promise<void>;
  updateHomepageConfig: (config: HomepageConfig) => Promise<void>;
  answerProductQuestion: (questionId: string, answerText: string) => Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

function logFirestoreFailure(err: unknown, op: OperationType, path: string) {
  try {
    handleFirestoreError(err, op, path);
  } catch {
    // Structured error was logged and thrown by handleFirestoreError; caught here so caller can display UI feedback cleanly
  }
}

function isCouponNotExpired(expiresAt: string): boolean {
  if (!expiresAt || !expiresAt.trim()) return false;
  const clean = expiresAt.trim();
  const expiryMs = /^\d{4}-\d{2}-\d{2}$/.test(clean)
    ? new Date(`${clean}T23:59:59.999Z`).getTime()
    : new Date(clean).getTime();
  if (Number.isNaN(expiryMs)) return false;
  return Date.now() <= expiryMs;
}

function evaluateCouponEligibility(
  coupon: Coupon,
  cartItems: CartItem[],
  lang: Language
): { valid: boolean; eligibleSubtotal: number; message: string } {
  if (!coupon.isActive) {
    return {
      valid: false,
      eligibleSubtotal: 0,
      message:
        lang === 'ar'
          ? `كود الخصم (${coupon.code}) غير مفعّل حالياً`
          : `Coupon code (${coupon.code}) is currently inactive`,
    };
  }

  if (!isCouponNotExpired(coupon.expiresAt)) {
    return {
      valid: false,
      eligibleSubtotal: 0,
      message:
        lang === 'ar'
          ? `انتهت صلاحية كود الخصم (${coupon.code}) بتاريخ ${coupon.expiresAt}`
          : `Coupon code (${coupon.code}) expired on ${coupon.expiresAt}`,
    };
  }

  if (coupon.usedCount >= coupon.maxUses) {
    return {
      valid: false,
      eligibleSubtotal: 0,
      message:
        lang === 'ar'
          ? `تم استنفاد الحد الأقصى لاستخدام الكوبون (${coupon.code})`
          : `Coupon (${coupon.code}) has reached its maximum usage limit`,
    };
  }

  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const isSellerScoped = Boolean(coupon.sellerId && coupon.sellerId !== 'all');
  const sellerItems = isSellerScoped
    ? cartItems.filter((item) => item.product.sellerId === coupon.sellerId)
    : cartItems;

  if (isSellerScoped && sellerItems.length === 0) {
    return {
      valid: false,
      eligibleSubtotal: 0,
      message:
        lang === 'ar'
          ? `هذا الكوبون مخصص لمنتجات (${coupon.sellerNameAr || coupon.sellerId}) فقط`
          : `This coupon is valid only for ${coupon.sellerNameAr || coupon.sellerId} items`,
    };
  }

  const eligibleSubtotal = sellerItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

  if (subtotal < coupon.minOrderAmount || eligibleSubtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      eligibleSubtotal,
      message:
        lang === 'ar'
          ? `الحد الأدنى للطلب المؤهل لتفعيل الكوبون هو ${coupon.minOrderAmount} ر.س`
          : `Minimum eligible order of SAR ${coupon.minOrderAmount} required`,
    };
  }

  return {
    valid: true,
    eligibleSubtotal,
    message:
      lang === 'ar'
        ? `تم تطبيق الكوبون ${coupon.code} بنجاح!`
        : `Coupon ${coupon.code} applied!`,
  };
}

function mapFirebaseAuthError(error: unknown, lang: Language): string {
  const code = (error as { code?: string })?.code || '';
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return lang === 'ar'
      ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.'
      : 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return lang === 'ar'
      ? 'هذا البريد الإلكتروني مسجل مسبقاً. يرجى تسجيل الدخول أو استعادة كلمة المرور.'
      : 'This email address is already registered. Please sign in or reset your password.';
  }
  if (code === 'auth/weak-password') {
    return lang === 'ar'
      ? 'كلمة المرور ضعيفة جداً. يجب أن تتكون من ٦ أحرف أو أرقام على الأقل.'
      : 'Password is too weak. It must be at least 6 characters long.';
  }
  if (code === 'auth/invalid-email') {
    return lang === 'ar'
      ? 'صيغة البريد الإلكتروني غير صحيحة.'
      : 'Invalid email address format.';
  }
  if (code === 'auth/too-many-requests') {
    return lang === 'ar'
      ? 'تم تجاوز عدد المحاولات المسموح بها. يرجى الانتظار قليلاً أو إعادة تعيين كلمة المرور.'
      : 'Too many failed attempts. Please wait a moment or reset your password.';
  }
  if (code === 'auth/operation-not-allowed') {
    return lang === 'ar'
      ? 'مزود الدخول عبر البريد وكلمة المرور غير مفعّل في إعدادات Firebase Console لهذا المشروع بعد.'
      : 'Email/Password sign-in provider is not enabled in Firebase Console for this project.';
  }
  return lang === 'ar'
    ? 'تعذر إتمام عملية المصادقة حالياً. يرجى المحاولة مرة أخرى.'
    : 'Authentication request failed. Please try again.';
}

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('ar');
  const isRtl = lang === 'ar';

  const t = useCallback((ar: string, en: string) => (lang === 'ar' ? ar : en), [lang]);

  const formatPrice = useCallback(
    (amount: number) => {
      const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      });
      return lang === 'ar' ? `${formatted} ر.س` : `SAR ${formatted}`;
    },
    [lang]
  );

  // Sync HTML dir & lang attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [isRtl, lang]);

  // Navigation State
  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-1');
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [pendingRedirectView, setPendingRedirectView] = useState<AppView | null>(null);

  // Collections State
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [brands] = useState<Brand[]>(INITIAL_BRANDS);
  const [products, setProducts] = useState<Product[]>(INITIAL_ALL_PRODUCTS);
  const [sellers, setSellers] = useState<Seller[]>(INITIAL_SELLERS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [questions, setQuestions] = useState<ProductQuestion[]>(INITIAL_QUESTIONS);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(INITIAL_HOMEPAGE_CONFIG);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Auth & Demo Mode State
  // Visitors start unauthenticated (null) and can browse publicly
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 25000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<
    'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'best_selling'
  >('featured');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'دهن عود كمبودي',
    'آيفون ١٦ برو ماكس',
    'ساعة سويسرية',
    'ماكينة قهوة بريفيل',
    'بشت ملكي حساوي',
  ]);

  // Cart, Wishlist, Compare, Recently Viewed
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 'prod-1-default',
      productId: 'prod-1',
      product: INITIAL_ALL_PRODUCTS[0],
      quantity: 1,
      selectedVariants: { 'لون الميناء': 'أخضر زمردي ملكي', 'مقاس القطر': '41 مم (كلاسيك)' },
      unitPrice: 6450,
    },
    {
      id: 'prod-5-default',
      productId: 'prod-5',
      product: INITIAL_ALL_PRODUCTS[4],
      quantity: 1,
      selectedVariants: { الحجم: 'توله كاملة ملكية (12 مل)' },
      unitPrice: 1850,
    },
  ]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(INITIAL_COUPONS[0]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([
    'prod-1',
    'prod-5',
    'prod-9',
    'prod-21',
    'prod-29',
  ]);
  const [compareIds, setCompareIds] = useState<string[]>(['prod-1', 'prod-4', 'prod-9']);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([
    'prod-1',
    'prod-5',
    'prod-9',
    'prod-21',
    'prod-29',
    'prod-33',
  ]);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, description?: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Build default customer profile for newly authenticated Firebase users
  const buildDefaultCustomerProfile = useCallback(
    (uid: string, name: string, email: string, phone: string = '+966 50 000 0000'): UserProfile => {
      return {
        id: uid,
        name: name.trim() || 'عميل أثيل',
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+966 50 000 0000',
        role: 'customer',
        walletBalance: 250,
        loyaltyPoints: 1000,
        loyaltyTier: 'Silver',
        referralCode: `ATH-${uid.slice(0, 5).toUpperCase()}`,
        wishlist: ['prod-1', 'prod-5'],
        addresses: [
          {
            ...INITIAL_USERS[0].addresses[0],
            id: `addr-${uid.slice(0, 6)}`,
            recipientName: name.trim() || 'عميل أثيل',
            phone: phone.trim() || '+966 50 000 0000',
          },
        ],
        loyaltyHistory: [
          {
            id: `lh-welcome-${uid.slice(0, 6)}`,
            titleAr: 'مكافأة الترحيب بالعضوية الجديدة في أثيل',
            titleEn: 'Atheel New Member Welcome Privilege',
            points: 1000,
            date: new Date().toISOString().split('T')[0],
          },
        ],
        preferences: {
          newsletter: true,
          smsAlerts: true,
          whatsappUpdates: true,
          language: lang,
        },
        createdAt: new Date().toISOString().split('T')[0],
      };
    },
    [lang]
  );

  // 1. Firebase Auth State Listener (Persistent Session)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsDemoMode(false);
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setCurrentUser({ ...data, id: fbUser.uid });
          } else {
            const newProfile = buildDefaultCustomerProfile(
              fbUser.uid,
              fbUser.displayName || fbUser.email?.split('@')[0] || 'عميل أثيل',
              fbUser.email || 'customer@atheel.sa'
            );
            await setDoc(userRef, newProfile);
            setCurrentUser(newProfile);
          }
        } catch (err) {
          logFirestoreFailure(err, OperationType.GET, `users/${fbUser.uid}`);
          const fallbackProfile = buildDefaultCustomerProfile(
            fbUser.uid,
            fbUser.displayName || 'عميل أثيل',
            fbUser.email || 'customer@atheel.sa'
          );
          setCurrentUser(fallbackProfile);
        }
      } else {
        setCurrentUser((prev) => {
          // Preserve in-memory user only if Demo Mode was explicitly activated
          return isDemoMode ? prev : null;
        });
      }
      setIsAuthLoading(false);
    });

    return () => unsubAuth();
  }, [buildDefaultCustomerProfile, isDemoMode]);

  // 2. Public Firestore Listeners (Safe for all visitors)
  useEffect(() => {
    const unsubProducts = onSnapshot(
      query(collection(db, 'products'), where('status', 'in', ['active', 'out_of_stock'])),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as Product);
          list.sort((a, b) => {
            const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
            const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
            return numA - numB;
          });
          setProducts(list);
        }
        setIsLoadingData(false);
      },
      (err) => {
        logFirestoreFailure(err, OperationType.LIST, 'products');
        setIsLoadingData(false);
      }
    );

    const unsubSellers = onSnapshot(
      collection(db, 'sellers'),
      (snap) => {
        if (!snap.empty) {
          setSellers(snap.docs.map((d) => d.data() as Seller));
        }
      },
      (err) => logFirestoreFailure(err, OperationType.LIST, 'sellers')
    );

    const unsubCoupons = onSnapshot(
      query(collection(db, 'coupons'), where('isActive', '==', true)),
      (snap) => {
        if (!snap.empty) {
          setCoupons(snap.docs.map((d) => d.data() as Coupon));
        }
      },
      (err) => logFirestoreFailure(err, OperationType.LIST, 'coupons')
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        if (!snap.empty) {
          setReviews(snap.docs.map((d) => d.data() as Review));
        }
      },
      (err) => logFirestoreFailure(err, OperationType.LIST, 'reviews')
    );

    const unsubQuestions = onSnapshot(
      collection(db, 'questions'),
      (snap) => {
        if (!snap.empty) {
          setQuestions(snap.docs.map((d) => d.data() as ProductQuestion));
        }
      },
      (err) => logFirestoreFailure(err, OperationType.LIST, 'questions')
    );

    const unsubHomepage = onSnapshot(
      doc(db, 'settings', 'homepage'),
      (snap) => {
        if (snap.exists()) {
          setHomepageConfig(snap.data() as HomepageConfig);
        }
      },
      (err) => logFirestoreFailure(err, OperationType.GET, 'settings/homepage')
    );

    return () => {
      unsubProducts();
      unsubSellers();
      unsubCoupons();
      unsubReviews();
      unsubQuestions();
      unsubHomepage();
    };
  }, []);

  // 3. Authenticated / Role-Scoped Listeners (Orders & Audit Logs)
  useEffect(() => {
    if (isDemoMode || !currentUser || !auth.currentUser) {
      return;
    }

    let unsubOrders: (() => void) | undefined;
    let unsubLogs: (() => void) | undefined;

    if (currentUser.role === 'admin') {
      unsubOrders = onSnapshot(
        collection(db, 'orders'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Order);
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(list);
        },
        (err) => logFirestoreFailure(err, OperationType.LIST, 'orders')
      );

      unsubLogs = onSnapshot(
        collection(db, 'auditLogs'),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as AuditLogEntry);
          list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setAuditLogs(list);
        },
        (err) => logFirestoreFailure(err, OperationType.LIST, 'auditLogs')
      );
    } else if (currentUser.role === 'seller' && currentUser.sellerId) {
      unsubOrders = onSnapshot(
        query(collection(db, 'orders'), where('sellerIds', 'array-contains', currentUser.sellerId)),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Order);
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(list);
        },
        (err) => logFirestoreFailure(err, OperationType.LIST, 'orders')
      );
    } else {
      unsubOrders = onSnapshot(
        query(collection(db, 'orders'), where('customerId', '==', auth.currentUser.uid)),
        (snap) => {
          const list = snap.docs.map((d) => d.data() as Order);
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(list);
        },
        (err) => logFirestoreFailure(err, OperationType.LIST, 'orders')
      );
    }

    return () => {
      unsubOrders?.();
      unsubLogs?.();
    };
  }, [currentUser, isDemoMode]);

  const recordProductView = useCallback((productId: string) => {
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      return [productId, ...filtered].slice(0, 10);
    });
  }, []);

  // Strict Role-Based Access Control (RBAC) for Seller & Admin Portals
  // Demo Mode remains isolated in local memory and never grants real Firebase privileges.
  const canAccessSellerDashboard = useMemo(() => {
    if (!currentUser) return false;
    if (isDemoMode) {
      return currentUser.role === 'seller' || currentUser.role === 'admin';
    }
    return (
      (currentUser.role === 'seller' && Boolean(currentUser.sellerId?.trim())) ||
      currentUser.role === 'admin'
    );
  }, [currentUser, isDemoMode]);

  const canAccessAdminDashboard = useMemo(() => {
    if (!currentUser) return false;
    if (isDemoMode) {
      return currentUser.role === 'admin';
    }
    return currentUser.role === 'admin';
  }, [currentUser, isDemoMode]);

  const isViewAuthorizedForProfile = useCallback((view: AppView, profile: UserProfile): boolean => {
    if (view === 'admin-dashboard') {
      return profile.role === 'admin';
    }
    if (view === 'seller-dashboard') {
      return (
        (profile.role === 'seller' && Boolean(profile.sellerId?.trim())) ||
        profile.role === 'admin'
      );
    }
    return true;
  }, []);

  const navigateTo = useCallback(
    (
      view: AppView,
      params?: { productId?: string; categoryId?: string; query?: string; sellerId?: string }
    ) => {
      if (params?.productId) {
        setSelectedProductId(params.productId);
        recordProductView(params.productId);
      }
      if (params?.categoryId !== undefined) {
        setSelectedCategoryId(params.categoryId);
        setSelectedSubcategory('all');
      }
      if (params?.query !== undefined) {
        setSearchQuery(params.query);
      }
      if (params?.sellerId !== undefined) {
        setSelectedSellerId(params.sellerId);
      }

      // Require authentication for protected customer, seller, and admin routes
      const protectedViews: AppView[] = [
        'checkout',
        'orders',
        'account',
        'seller-dashboard',
        'admin-dashboard',
      ];
      if (protectedViews.includes(view) && !currentUser) {
        setPendingRedirectView(view);
        setActiveView('login');
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      // Enforce Role-Based Access Control on Seller & Admin portals
      if (view === 'seller-dashboard' && !canAccessSellerDashboard) {
        showToast(
          lang === 'ar' ? 'غير مصرح بالوصول إلى مركز التجار' : 'Access Denied: Seller Center',
          lang === 'ar'
            ? 'يتطلب الوصول حساب تاجر معتمد مرتبط بمتجر موثق'
            : 'Requires an approved Seller account with a valid sellerId',
          'error'
        );
      } else if (view === 'admin-dashboard' && !canAccessAdminDashboard) {
        showToast(
          lang === 'ar'
            ? 'غير مصرح بالوصول إلى لوحة الإدارة التنفيذية'
            : 'Access Denied: Executive Admin Console',
          lang === 'ar'
            ? 'هذه البوابة مخصصة لمسؤولي النظام المعتمدين فقط'
            : 'This portal is restricted to authorized system administrators',
          'error'
        );
      }

      setActiveView(view);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [
      recordProductView,
      currentUser,
      canAccessSellerDashboard,
      canAccessAdminDashboard,
      lang,
      showToast,
    ]
  );

  // ============================================================================
  // DEMO MODE (Explicitly isolated in-memory session for Portfolio Evaluators)
  // ============================================================================
  const loginWithDemoRole = useCallback(
    (role: UserRole) => {
      const targetUser =
        role === 'admin'
          ? INITIAL_USERS[2]
          : role === 'seller'
          ? INITIAL_USERS[1]
          : INITIAL_USERS[0];

      setIsDemoMode(true);
      setCurrentUser({ ...targetUser });
      setOrders(INITIAL_ORDERS);
      setAuditLogs(INITIAL_AUDIT_LOGS);

      showToast(
        lang === 'ar'
          ? `وضع العرض التجريبي: ${targetUser.name}`
          : `Demo Mode Active: ${targetUser.name}`,
        lang === 'ar'
          ? `معاينة واجهة (${
              role === 'admin'
                ? 'الإدارة التنفيذية'
                : role === 'seller'
                ? 'مركز التجار'
                : 'عميل VIP'
            }) في الذاكرة المحلية بأمان دون المساس بقاعدة البيانات الحقيقية`
          : `Exploring ${role.toUpperCase()} interface in isolated local Demo Mode`,
        'info'
      );

      if (pendingRedirectView) {
        const dest = pendingRedirectView;
        setPendingRedirectView(null);
        setActiveView(dest);
      } else if (role === 'admin') {
        setActiveView('admin-dashboard');
      } else if (role === 'seller') {
        setActiveView('seller-dashboard');
      } else {
        setActiveView('home');
      }
    },
    [lang, showToast, pendingRedirectView]
  );

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setCurrentUser(null);
    setOrders([]);
    setAuditLogs([]);
    showToast(
      lang === 'ar' ? 'تم إغلاق وضع العرض التجريبي' : 'Exited Demo Mode',
      lang === 'ar'
        ? 'يمكنك الآن التصفح كزائر أو تسجيل الدخول بحساب فعلي'
        : 'You can now browse publicly or sign in with a real account',
      'info'
    );
    setActiveView('home');
  }, [lang, showToast]);

  // ============================================================================
  // REAL FIREBASE AUTHENTICATION FLOWS
  // ============================================================================
  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        const msg =
          lang === 'ar'
            ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
            : 'Please enter both email and password';
        showToast(msg, undefined, 'error');
        return { success: false, error: msg };
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = cred.user;
        setIsDemoMode(false);

        const userRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);
        let profile: UserProfile;

        if (snap.exists()) {
          profile = { ...(snap.data() as UserProfile), id: fbUser.uid };
        } else {
          profile = buildDefaultCustomerProfile(
            fbUser.uid,
            fbUser.displayName || cleanEmail.split('@')[0],
            cleanEmail
          );
          await setDoc(userRef, profile);
        }

        setCurrentUser(profile);
        showToast(
          lang === 'ar' ? `أهلاً بعودتك، ${profile.name}` : `Welcome back, ${profile.name}`,
          lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully',
          'success'
        );

        const fallbackRoleView: AppView =
          profile.role === 'admin'
            ? 'admin-dashboard'
            : profile.role === 'seller' && Boolean(profile.sellerId?.trim())
            ? 'seller-dashboard'
            : 'home';

        const nextView =
          pendingRedirectView && isViewAuthorizedForProfile(pendingRedirectView, profile)
            ? pendingRedirectView
            : fallbackRoleView;

        if (pendingRedirectView && !isViewAuthorizedForProfile(pendingRedirectView, profile)) {
          showToast(
            lang === 'ar' ? 'غير مصرح بالوصول للواجهة المطلوبة' : 'Unauthorized Portal Access',
            lang === 'ar'
              ? 'تم توجيهك إلى الواجهة المناسبة لصلاحيات حسابك'
              : 'Redirected to the portal matching your account role',
            'info'
          );
        }

        setPendingRedirectView(null);
        setActiveView(nextView);
        return { success: true };
      } catch (err) {
        const msg = mapFirebaseAuthError(err, lang);
        showToast(lang === 'ar' ? 'فشل تسجيل الدخول' : 'Sign In Failed', msg, 'error');
        return { success: false, error: msg };
      }
    },
    [lang, showToast, buildDefaultCustomerProfile, pendingRedirectView, isViewAuthorizedForProfile]
  );

  const registerWithEmail = useCallback(
    async ({
      name,
      email,
      phone,
      password,
    }: {
      name: string;
      email: string;
      phone: string;
      password: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();

      if (!cleanName || !cleanEmail || !password) {
        const msg =
          lang === 'ar'
            ? 'يرجى تعبئة جميع الحقول المطلوبة'
            : 'Please complete all required fields';
        showToast(msg, undefined, 'error');
        return { success: false, error: msg };
      }

      if (password.length < 6) {
        const msg =
          lang === 'ar'
            ? 'يجب أن تتكون كلمة المرور من ٦ أحرف على الأقل'
            : 'Password must be at least 6 characters long';
        showToast(msg, undefined, 'error');
        return { success: false, error: msg };
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = cred.user;
        await updateProfile(fbUser, { displayName: cleanName });

        setIsDemoMode(false);
        // Security invariant: new registrations ALWAYS get role = 'customer'
        const newProfile = buildDefaultCustomerProfile(
          fbUser.uid,
          cleanName,
          cleanEmail,
          cleanPhone || '+966 50 000 0000'
        );

        await setDoc(doc(db, 'users', fbUser.uid), newProfile);
        setCurrentUser(newProfile);

        showToast(
          lang === 'ar' ? `مرحباً بك في أثيل، ${cleanName}` : `Welcome to Atheel, ${cleanName}`,
          lang === 'ar'
            ? 'تم إنشاء حسابك بنجاح وإضافة ١,٠٠٠ نقطة ولاء ترحيبية'
            : 'Your customer account has been created with 1,000 welcome loyalty points',
          'success'
        );

        const nextView =
          pendingRedirectView && isViewAuthorizedForProfile(pendingRedirectView, newProfile)
            ? pendingRedirectView
            : 'home';
        setPendingRedirectView(null);
        setActiveView(nextView);
        return { success: true };
      } catch (err) {
        const msg = mapFirebaseAuthError(err, lang);
        showToast(lang === 'ar' ? 'تعذر إنشاء الحساب' : 'Registration Failed', msg, 'error');
        return { success: false, error: msg };
      }
    },
    [lang, showToast, buildDefaultCustomerProfile, pendingRedirectView, isViewAuthorizedForProfile]
  );

  const sendPasswordReset = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        const msg =
          lang === 'ar'
            ? 'يرجى إدخال البريد الإلكتروني المسجل'
            : 'Please enter your registered email address';
        showToast(msg, undefined, 'error');
        return { success: false, error: msg };
      }
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        showToast(
          lang === 'ar' ? 'تم إرسال رابط استعادة كلمة المرور' : 'Password Reset Email Sent',
          lang === 'ar'
            ? `يرجى التحقق من بريدك الإلكتروني (${cleanEmail}) لإعادة تعيين كلمة المرور`
            : `Check your inbox (${cleanEmail}) for the password reset link`,
          'success'
        );
        return { success: true };
      } catch (err) {
        const msg = mapFirebaseAuthError(err, lang);
        showToast(lang === 'ar' ? 'تعذر إرسال الرابط' : 'Reset Request Failed', msg, 'error');
        return { success: false, error: msg };
      }
    },
    [lang, showToast]
  );

  const loginWithCredentials = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const res = await loginWithEmail(email, password);
      return res.success;
    },
    [loginWithEmail]
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      setIsDemoMode(false);

      const userRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userRef);
      let profile: UserProfile;

      if (snap.exists()) {
        profile = { ...(snap.data() as UserProfile), id: fbUser.uid };
      } else {
        profile = buildDefaultCustomerProfile(
          fbUser.uid,
          fbUser.displayName || 'عميل أثيل المميز',
          fbUser.email || 'vip@atheel.sa'
        );
        await setDoc(userRef, profile);
      }

      setCurrentUser(profile);
      showToast(
        lang === 'ar' ? `مرحباً بك ${profile.name}` : `Welcome ${profile.name}`,
        lang === 'ar' ? 'تم تسجيل الدخول عبر حساب Google بنجاح' : 'Signed in with Google successfully',
        'success'
      );

      const nextView =
        pendingRedirectView && isViewAuthorizedForProfile(pendingRedirectView, profile)
          ? pendingRedirectView
          : 'home';
      setPendingRedirectView(null);
      setActiveView(nextView);
    } catch (err) {
      const msg = mapFirebaseAuthError(err, lang);
      showToast(
        lang === 'ar' ? 'تعذر تسجيل الدخول عبر Google' : 'Google Sign-In Cancelled',
        msg,
        'error'
      );
    }
  }, [lang, showToast, buildDefaultCustomerProfile, pendingRedirectView, isViewAuthorizedForProfile]);

  const registerAccount = useCallback(
    async (
      name: string,
      email: string,
      phone: string,
      _role: 'customer' | 'seller' = 'customer',
      password: string = ''
    ) => {
      await registerWithEmail({ name, email, phone, password });
    },
    [registerWithEmail]
  );

  const logout = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // ignore signOut errors
    }
    setIsDemoMode(false);
    setCurrentUser(null);
    setOrders([]);
    setAuditLogs([]);
    showToast(
      lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Signed Out Successfully',
      lang === 'ar' ? 'نتطلع لرؤيتك مجدداً في أثيل' : 'We look forward to welcoming you back',
      'info'
    );
    setActiveView('home');
  }, [lang, showToast]);

  // Search & Filter Helpers
  const addRecentSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 8));
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setSelectedSubcategory('all');
    setSelectedBrandId('all');
    setSelectedSellerId('all');
    setPriceRange([0, 25000]);
    setMinRating(0);
    setOnlyInStock(false);
    setOnlyDiscounted(false);
    setSortBy('featured');
  }, []);

  // ============================================================================
  // CART, COUPON & VAT-INCLUSIVE (15%) PRICING ENGINE
  // ============================================================================
  const addToCart = useCallback(
    (product: Product, selectedVariants?: Record<string, string>, quantity: number = 1) => {
      if (product.stock <= 0 || product.status === 'out_of_stock') {
        showToast(
          lang === 'ar' ? 'المنتج غير متوفر حالياً' : 'Out of Stock',
          lang === 'ar' ? 'نفدت الكمية من هذا المنتج حالياً' : 'This item is currently out of stock',
          'error'
        );
        return;
      }

      const defaultVars: Record<string, string> = {};
      if (!selectedVariants && product.variants?.length) {
        product.variants.forEach((group) => {
          if (group.options[0]) {
            defaultVars[lang === 'ar' ? group.nameAr : group.nameEn] =
              lang === 'ar' ? group.options[0].labelAr : group.options[0].labelEn;
          }
        });
      }
      const finalVars = selectedVariants || defaultVars;
      const varKey = Object.entries(finalVars)
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      const cartItemId = `${product.id}-${varKey || 'std'}`;

      setCart((prev) => {
        const existing = prev.find((item) => item.id === cartItemId);
        if (existing) {
          return prev.map((item) =>
            item.id === cartItemId
              ? { ...item, quantity: Math.min(product.stock, item.quantity + quantity) }
              : item
          );
        }
        return [
          ...prev,
          {
            id: cartItemId,
            productId: product.id,
            product,
            quantity,
            selectedVariants: finalVars,
            unitPrice: product.price,
          },
        ];
      });

      showToast(
        lang === 'ar' ? 'تمت الإضافة إلى حقيبة التسوق' : 'Added to Shopping Bag',
        lang === 'ar' ? product.titleAr : product.titleEn,
        'success'
      );
    },
    [lang, showToast]
  );

  const updateCartQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== cartItemId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === cartItemId
          ? { ...item, quantity: Math.min(item.product.stock || 99, quantity) }
          : item
      )
    );
  }, []);

  const removeFromCart = useCallback(
    (cartItemId: string) => {
      setCart((prev) => prev.filter((item) => item.id !== cartItemId));
      showToast(
        lang === 'ar' ? 'تم حذف المنتج من السلة' : 'Removed from Cart',
        undefined,
        'info'
      );
    },
    [lang, showToast]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const applyCouponCode = useCallback(
    (code: string): { success: boolean; message: string } => {
      const clean = code.trim().toUpperCase();
      const found = coupons.find((c) => c.code.toUpperCase() === clean);
      if (!found) {
        const msg =
          lang === 'ar'
            ? 'كود الخصم غير موجود. يرجى التحقق من الرمز والمحاولة مجدداً'
            : 'Invalid coupon code. Please check the code and try again';
        showToast(msg, undefined, 'error');
        return { success: false, message: msg };
      }

      const evaluation = evaluateCouponEligibility(found, cart, lang);
      if (!evaluation.valid) {
        showToast(evaluation.message, undefined, 'error');
        return { success: false, message: evaluation.message };
      }

      setAppliedCoupon(found);
      showToast(evaluation.message, lang === 'ar' ? found.titleAr : found.titleEn, 'success');
      return { success: true, message: evaluation.message };
    },
    [coupons, cart, lang, showToast]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    showToast(lang === 'ar' ? 'تم إزالة الكوبون' : 'Coupon removed', undefined, 'info');
  }, [lang, showToast]);

  // PHASE 7 — VAT-INCLUSIVE RETAIL PRICING CALCULATION + COMPLETE COUPON VALIDATION
  // Product prices & shipping fees INCLUDE 15% Saudi VAT.
  // Included VAT portion = taxableAmount * 15 / 115 (never added twice).
  const cartSummary = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    let discountAmount = 0;
    const liveCoupon = appliedCoupon
      ? coupons.find((c) => c.id === appliedCoupon.id) || appliedCoupon
      : null;

    if (liveCoupon) {
      const check = evaluateCouponEligibility(liveCoupon, cart, lang);
      if (check.valid) {
        if (liveCoupon.type === 'percentage') {
          const raw = (check.eligibleSubtotal * liveCoupon.value) / 100;
          discountAmount = liveCoupon.maxDiscount ? Math.min(raw, liveCoupon.maxDiscount) : raw;
        } else {
          discountAmount = Math.min(check.eligibleSubtotal, liveCoupon.value);
        }
      }
    }

    discountAmount = Number(discountAmount.toFixed(2));
    const netAfterDiscount = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));
    const shippingFee =
      netAfterDiscount === 0 || netAfterDiscount >= homepageConfig.freeShippingThreshold ? 0 : 28;

    // Final payable total is netAfterDiscount + shippingFee (both are VAT-inclusive)
    const total = Number((netAfterDiscount + shippingFee).toFixed(2));
    // Extracted 15% VAT included in the payable total: total * 15 / 115
    const vatAmount = Number(((total * 15) / 115).toFixed(2));
    const pointsEarned = Math.floor(total / 5);

    return {
      subtotal,
      discountAmount,
      netAfterDiscount,
      shippingFee,
      vatAmount,
      total,
      itemCount,
      pointsEarned,
    };
  }, [cart, appliedCoupon, coupons, lang, homepageConfig.freeShippingThreshold]);

  // Wishlist & Compare
  const toggleWishlist = useCallback(
    (productId: string) => {
      setWishlistIds((prev) => {
        const exists = prev.includes(productId);
        const next = exists ? prev.filter((id) => id !== productId) : [productId, ...prev];
        showToast(
          exists
            ? lang === 'ar'
              ? 'تمت الإزالة من قائمة الأمنيات'
              : 'Removed from Wishlist'
            : lang === 'ar'
            ? 'تمت الإضافة إلى قائمة الأمنيات ♥'
            : 'Saved to Wishlist ♥',
          undefined,
          'info'
        );
        return next;
      });
    },
    [lang, showToast]
  );

  const toggleCompare = useCallback(
    (productId: string) => {
      setCompareIds((prev) => {
        if (prev.includes(productId)) {
          return prev.filter((id) => id !== productId);
        }
        if (prev.length >= 4) {
          showToast(
            lang === 'ar' ? 'الحد الأقصى للمقارنة ٤ منتجات' : 'Maximum 4 products for comparison',
            lang === 'ar'
              ? 'قم بإزالة منتج لإضافة منتج آخر للمقارنة'
              : 'Remove one item to add another',
            'info'
          );
          return prev;
        }
        showToast(
          lang === 'ar' ? 'تمت الإضافة لجدول المقارنة' : 'Added to Compare Table',
          undefined,
          'success'
        );
        return [...prev, productId];
      });
    },
    [lang, showToast]
  );

  const clearCompare = useCallback(() => {
    setCompareIds([]);
  }, []);

  // ============================================================================
  // ORDER PLACEMENT & CUSTOMER ACTIONS (WITH REAL ERROR HANDLING & DEMO ISOLATION)
  // ============================================================================
  const placeOrder = useCallback(
    async ({
      address,
      deliverySpeed,
      paymentMethod,
    }: {
      address: SaudiAddress;
      deliverySpeed: 'express' | 'standard';
      paymentMethod: PaymentMethodType;
    }): Promise<Order | null> => {
      if (cart.length === 0) return null;

      if (!currentUser) {
        showToast(
          lang === 'ar' ? 'يرجى تسجيل الدخول لإتمام الطلب' : 'Please sign in to place your order',
          undefined,
          'error'
        );
        setPendingRedirectView('checkout');
        setActiveView('login');
        return null;
      }

      // Re-validate applied coupon before finalizing order
      const liveCoupon = appliedCoupon
        ? coupons.find((c) => c.id === appliedCoupon.id) || appliedCoupon
        : null;
      if (liveCoupon) {
        const couponCheck = evaluateCouponEligibility(liveCoupon, cart, lang);
        if (!couponCheck.valid) {
          setAppliedCoupon(null);
          showToast(couponCheck.message, undefined, 'error');
          return null;
        }
      }

      // Calculate VAT-inclusive final shipping & total
      const finalShipping = deliverySpeed === 'express' ? 35 : cartSummary.shippingFee;
      const finalTotal = Number((cartSummary.netAfterDiscount + finalShipping).toFixed(2));
      const finalVatAmount = Number(((finalTotal * 15) / 115).toFixed(2));

      if (paymentMethod === 'wallet' && currentUser.walletBalance < finalTotal) {
        showToast(
          lang === 'ar' ? 'رصيد محفظة أثيل غير كافٍ' : 'Insufficient Atheel Wallet Balance',
          lang === 'ar'
            ? 'يرجى اختيار وسيلة دفع أخرى مثل مدى أو Apple Pay أو البطاقات الائتمانية'
            : 'Please select another payment method such as Mada, Apple Pay, or Credit Card',
          'error'
        );
        return null;
      }

      const nowIso = new Date().toISOString();
      const orderNum = `ATH-${Math.floor(10000 + Math.random() * 89999)}`;
      const uniqueSellerIds = Array.from(new Set(cart.map((c) => c.product.sellerId)));
      const uniqueProductIds = Array.from(new Set(cart.map((c) => c.productId)));

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: orderNum,
        customerId: isDemoMode ? currentUser.id : auth.currentUser?.uid || currentUser.id,
        customerName: currentUser.name || address.recipientName,
        customerEmail: currentUser.email || 'customer@atheel.sa',
        customerPhone: address.phone,
        sellerIds: uniqueSellerIds,
        productIds: uniqueProductIds,
        items: cart.map((c) => ({
          productId: c.productId,
          sku: c.product.sku,
          titleAr: c.product.titleAr,
          titleEn: c.product.titleEn,
          image: c.product.images[0],
          sellerId: c.product.sellerId,
          sellerNameAr: c.product.sellerNameAr,
          sellerNameEn: c.product.sellerNameEn,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          selectedVariants: c.selectedVariants,
        })),
        address,
        deliverySpeed,
        paymentMethod,
        paymentReference: `${paymentMethod.toUpperCase()}-SA-${Math.floor(
          1000000 + Math.random() * 9000000
        )}`,
        subtotal: cartSummary.subtotal,
        discountAmount: cartSummary.discountAmount,
        couponCode: appliedCoupon?.code || '',
        shippingFee: finalShipping,
        vatAmount: finalVatAmount,
        total: finalTotal,
        status: 'confirmed',
        trackingNumber: `SPL-${Math.floor(100000000 + Math.random() * 900000000)}SA`,
        carrierAr: deliverySpeed === 'express' ? 'سبل إكسبريس VIP' : 'أرامكس بريميوم',
        carrierEn: deliverySpeed === 'express' ? 'SPL Express VIP' : 'Aramex Premium',
        timeline: buildOrderTimeline('confirmed', nowIso.split('T')[0]),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updatedUser: UserProfile = {
        ...currentUser,
        walletBalance:
          paymentMethod === 'wallet'
            ? Math.max(0, Number((currentUser.walletBalance - finalTotal).toFixed(2)))
            : currentUser.walletBalance,
        loyaltyPoints: currentUser.loyaltyPoints + Math.floor(finalTotal / 5),
        loyaltyHistory: [
          {
            id: `lh-${Date.now()}`,
            titleAr: `مكافأة شراء طلب #${orderNum}`,
            titleEn: `Purchase Reward Order #${orderNum}`,
            points: Math.floor(finalTotal / 5),
            date: nowIso.split('T')[0],
          },
          ...currentUser.loyaltyHistory,
        ],
      };

      // Persist to Firestore if not in Demo Mode
      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'orders', newOrder.id), newOrder);
          await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
          // SECURITY NOTE: Authoritative coupon `usedCount` redemption is intentionally NOT persisted
          // directly from an untrusted browser client to prevent coupon exhaustion attacks.
          // In production, authoritative coupon redemption (`usedCount + 1`) must be processed
          // atomically by a trusted backend / Cloud Function together with server-validated order creation.
        } catch (err) {
          logFirestoreFailure(err, OperationType.CREATE, 'orders');
          showToast(
            lang === 'ar' ? 'تعذر تسجيل الطلب في قاعدة البيانات' : 'Failed to Place Order',
            lang === 'ar'
              ? 'يرجى التحقق من اتصال الإنترنت وصلاحيات الحساب ثم المحاولة مجدداً'
              : 'Please verify your connection and account session, then try again',
            'error'
          );
          return null;
        }
      }

      // Increment coupon usage in local state only (for Demo Mode and immediate client UI feedback)
      if (liveCoupon && cartSummary.discountAmount > 0) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === liveCoupon.id ? { ...c, usedCount: c.usedCount + 1 } : c))
        );
      }

      // Update local state after successful persistence (or in Demo Mode)
      setOrders((prev) => [newOrder, ...prev]);
      setLastCreatedOrder(newOrder);
      setCurrentUser(updatedUser);

      // Update local product stock representation
      setProducts((prev) =>
        prev.map((prod) => {
          const cartItem = cart.find((c) => c.productId === prod.id);
          if (!cartItem) return prod;
          const nextStock = Math.max(0, prod.stock - cartItem.quantity);
          return {
            ...prod,
            stock: nextStock,
            soldCount: prod.soldCount + cartItem.quantity,
            status: nextStock === 0 ? 'out_of_stock' : prod.status,
          };
        })
      );

      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          userId: currentUser.id,
          type: 'order',
          titleAr: `تم تأكيد طلبك #${orderNum} بنجاح`,
          titleEn: `Order #${orderNum} Confirmed`,
          messageAr: `إجمالي الطلب ${formatPrice(finalTotal)} (شامل ضريبة القيمة المضافة ١٥٪). رقم التتبع: ${newOrder.trackingNumber}`,
          messageEn: `Total ${formatPrice(finalTotal)} (incl. 15% VAT). Tracking: ${newOrder.trackingNumber}`,
          read: false,
          linkView: 'orders',
          createdAt: lang === 'ar' ? 'الآن' : 'Just now',
        },
        ...prev,
      ]);

      clearCart();
      showToast(
        lang === 'ar'
          ? `تم تأكيد طلبك #${orderNum} بنجاح!`
          : `Order #${orderNum} Placed Successfully!`,
        lang === 'ar'
          ? 'تم إصدار الفاتورة الضريبية وإرسال تفاصيل الشحنة'
          : 'Tax invoice generated and shipment scheduled',
        'success'
      );
      setActiveView('order-confirmation');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return newOrder;
    },
    [
      cart,
      cartSummary,
      appliedCoupon,
      coupons,
      currentUser,
      isDemoMode,
      formatPrice,
      lang,
      clearCart,
      showToast,
    ]
  );

  const cancelOrder = useCallback(
    async (orderId: string, reason: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;
      const nowIso = new Date().toISOString();
      const updated: Order = {
        ...target,
        status: 'cancelled',
        cancelReason: reason,
        updatedAt: nowIso,
      };

      if (!isDemoMode) {
        try {
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'cancelled',
            cancelReason: reason,
            updatedAt: nowIso,
          });
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'orders');
          showToast(
            lang === 'ar' ? 'تعذر إلغاء الطلب حالياً' : 'Failed to Cancel Order',
            undefined,
            'error'
          );
          return;
        }
      }

      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(
        lang === 'ar'
          ? `تم إلغاء الطلب #${target.orderNumber}`
          : `Order #${target.orderNumber} Cancelled`,
        lang === 'ar'
          ? 'سيتم استرداد المبلغ تلقائياً إلى وسيلة الدفع أو المحفظة'
          : 'Refund initiated automatically',
        'info'
      );
    },
    [orders, isDemoMode, lang, showToast]
  );

  const requestReturn = useCallback(
    async (
      orderId: string,
      reasonAr: string,
      details: string,
      refundMethod: 'wallet' | 'original_payment'
    ) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;
      const nowIso = new Date().toISOString();
      const returnReq = {
        reasonAr,
        reasonEn: reasonAr,
        details,
        refundMethod,
        requestedAt: nowIso,
        status: 'pending' as const,
      };
      const updated: Order = {
        ...target,
        status: 'return_requested',
        returnRequest: returnReq,
        updatedAt: nowIso,
      };

      if (!isDemoMode) {
        try {
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'return_requested',
            returnRequest: returnReq,
            updatedAt: nowIso,
          });
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'orders');
          showToast(
            lang === 'ar' ? 'تعذر إرسال طلب الإرجاع' : 'Failed to Submit Return Request',
            undefined,
            'error'
          );
          return;
        }
      }

      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(
        lang === 'ar' ? 'تم تسجيل طلب الإرجاع بنجاح' : 'Return Request Submitted',
        lang === 'ar'
          ? 'سيتواصل معك مندوب سبل لاستلام الشحنة من عنوانك الوطني مجاناً'
          : 'Courier pickup scheduled free of charge',
        'success'
      );
    },
    [orders, isDemoMode, lang, showToast]
  );

  // Address Management
  const saveAddress = useCallback(
    async (address: SaudiAddress): Promise<boolean> => {
      if (!currentUser) return false;
      const exists = currentUser.addresses.some((a) => a.id === address.id);
      let nextAddresses = exists
        ? currentUser.addresses.map((a) => (a.id === address.id ? address : a))
        : [address, ...currentUser.addresses];

      if (address.isDefault || nextAddresses.length === 1) {
        nextAddresses = nextAddresses.map((a) => ({ ...a, isDefault: a.id === address.id }));
      }

      const updatedUser: UserProfile = { ...currentUser, addresses: nextAddresses };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'users');
          showToast(
            lang === 'ar' ? 'تعذر حفظ العنوان الوطني' : 'Failed to Save Address',
            undefined,
            'error'
          );
          return false;
        }
      }

      setCurrentUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      showToast(
        lang === 'ar' ? 'تم حفظ العنوان الوطني بنجاح' : 'Saudi National Address Saved',
        address.labelAr,
        'success'
      );
      return true;
    },
    [currentUser, isDemoMode, lang, showToast]
  );

  const deleteAddress = useCallback(
    async (addressId: string) => {
      if (!currentUser) return;
      const nextAddresses = currentUser.addresses.filter((a) => a.id !== addressId);
      const updatedUser = { ...currentUser, addresses: nextAddresses };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'users');
          showToast(lang === 'ar' ? 'تعذر حذف العنوان' : 'Failed to delete address', undefined, 'error');
          return;
        }
      }

      setCurrentUser(updatedUser);
      showToast(lang === 'ar' ? 'تم حذف العنوان' : 'Address Deleted', undefined, 'info');
    },
    [currentUser, isDemoMode, lang, showToast]
  );

  const setDefaultAddress = useCallback(
    async (addressId: string) => {
      if (!currentUser) return;
      const nextAddresses = currentUser.addresses.map((a) => ({
        ...a,
        isDefault: a.id === addressId,
      }));
      const updatedUser = { ...currentUser, addresses: nextAddresses };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'users');
          showToast(
            lang === 'ar' ? 'تعذر تحديث العنوان الافتراضي' : 'Failed to update default address',
            undefined,
            'error'
          );
          return;
        }
      }

      setCurrentUser(updatedUser);
      showToast(
        lang === 'ar' ? 'تم تعيين العنوان الافتراضي' : 'Default Address Updated',
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, lang, showToast]
  );

  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!currentUser) return;
      // Never allow role or sellerId escalation via client profile update
      const safeUpdates = { ...updates };
      delete safeUpdates.role;
      delete safeUpdates.sellerId;
      delete safeUpdates.id;

      const updated: UserProfile = { ...currentUser, ...safeUpdates };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'users', updated.id), updated);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'users');
          showToast(
            lang === 'ar' ? 'تعذر تحديث الملف الشخصي' : 'Failed to Update Profile',
            undefined,
            'error'
          );
          return;
        }
      }

      setCurrentUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(
        lang === 'ar' ? 'تم تحديث بيانات الحساب بنجاح' : 'Profile Updated Successfully',
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, lang, showToast]
  );

  const submitReview = useCallback(
    async (productId: string, rating: number, title: string, comment: string) => {
      if (!currentUser) {
        showToast(
          lang === 'ar' ? 'يرجى تسجيل الدخول لإضافة تقييم' : 'Please sign in to submit a review',
          undefined,
          'error'
        );
        return;
      }

      const effectiveUserId = isDemoMode
        ? currentUser.id
        : auth.currentUser?.uid || currentUser.id;

      // Determine whether the customer actually has a DELIVERED order whose immutable `productIds` includes this product
      const deliveredOrder = orders.find(
        (o) =>
          o.customerId === effectiveUserId &&
          o.status === 'delivered' &&
          Array.isArray(o.productIds) &&
          o.productIds.includes(productId)
      );
      const isVerifiedBuyer = Boolean(deliveredOrder);

      const targetProd = products.find((p) => p.id === productId);
      const newRev: Review = {
        id: `rev-${Date.now()}`,
        productId,
        productTitleAr: targetProd?.titleAr || '',
        productTitleEn: targetProd?.titleEn || '',
        userId: effectiveUserId,
        userName: currentUser.name,
        rating: Math.min(5, Math.max(1, rating)),
        title: title.trim(),
        comment: comment.trim(),
        verifiedPurchase: isVerifiedBuyer,
        ...(isVerifiedBuyer && deliveredOrder ? { verifiedOrderId: deliveredOrder.id } : {}),
        helpfulCount: 1,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'approved',
      };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'reviews', newRev.id), newRev);
        } catch (e) {
          logFirestoreFailure(e, OperationType.CREATE, 'reviews');
          showToast(
            lang === 'ar' ? 'تعذر نشر التقييم' : 'Failed to publish review',
            undefined,
            'error'
          );
          return;
        }
      }

      setReviews((prev) => [newRev, ...prev]);
      showToast(
        isVerifiedBuyer
          ? lang === 'ar'
            ? 'شكراً لتقييمك! تمت إضافة التقييم بشارة (مشتري موثق)'
            : 'Verified Purchase Review Published!'
          : lang === 'ar'
          ? 'شكراً لمشاركتك! تم نشر تقييمك العام للمنتج'
          : 'Public Member Review Published!',
        isVerifiedBuyer
          ? lang === 'ar'
            ? 'تم التحقق من استلامك الفعلي لهذا المنتج'
            : 'Verified against your delivered order history'
          : lang === 'ar'
          ? 'يظهر التقييم بدون شارة شراء موثق لعدم وجود طلب مُسلّم لهذا المنتج'
          : 'Displayed without Verified Buyer badge as no delivered order was found',
        'success'
      );
    },
    [products, orders, currentUser, isDemoMode, lang, showToast]
  );

  const submitQuestion = useCallback(
    async (productId: string, questionText: string) => {
      if (!currentUser) {
        showToast(lang === 'ar' ? 'يرجى تسجيل الدخول لطرح سؤال' : 'Please sign in to ask a question', undefined, 'error');
        return;
      }
      const newQ: ProductQuestion = {
        id: `qa-${Date.now()}`,
        productId,
        userName: currentUser.name,
        questionAr: questionText,
        questionEn: questionText,
        createdAt: new Date().toISOString().split('T')[0],
      };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'questions', newQ.id), newQ);
        } catch (e) {
          logFirestoreFailure(e, OperationType.CREATE, 'questions');
          showToast(lang === 'ar' ? 'تعذر إرسال السؤال' : 'Failed to send question', undefined, 'error');
          return;
        }
      }

      setQuestions((prev) => [newQ, ...prev]);
      showToast(
        lang === 'ar' ? 'تم إرسال سؤالك للتاجر المعتمد' : 'Question Sent to Verified Seller',
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, lang, showToast]
  );

  const submitSupportTicket = useCallback(
    async (subject: string, categoryAr: string, message: string, orderNumber?: string) => {
      if (!currentUser) {
        showToast(lang === 'ar' ? 'يرجى تسجيل الدخول لفتح تذكرة دعم' : 'Please sign in to create a ticket', undefined, 'error');
        return;
      }
      const newTkt: SupportTicket = {
        id: `tkt-${Date.now()}`,
        ticketNumber: `TKT-${Math.floor(4100 + Math.random() * 5000)}`,
        userId: isDemoMode ? currentUser.id : auth.currentUser?.uid || currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        categoryAr,
        categoryEn: categoryAr,
        subject,
        message,
        orderNumber,
        status: 'open',
        createdAt: new Date().toISOString().split('T')[0],
      };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'tickets', newTkt.id), newTkt);
        } catch (e) {
          logFirestoreFailure(e, OperationType.CREATE, 'tickets');
          showToast(lang === 'ar' ? 'تعذر إرسال تذكرة الدعم' : 'Failed to submit support ticket', undefined, 'error');
          return;
        }
      }

      setTickets((prev) => [newTkt, ...prev]);
      showToast(
        lang === 'ar'
          ? `تم فتح تذكرة الدعم #${newTkt.ticketNumber}`
          : `Support Ticket #${newTkt.ticketNumber} Created`,
        lang === 'ar'
          ? 'سيرد عليك فريق العناية بالعملاء VIP خلال أقل من ساعة'
          : 'Our VIP Concierge team will respond within 1 hour',
        'success'
      );
    },
    [currentUser, isDemoMode, lang, showToast]
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ============================================================================
  // SELLER & ADMIN ACTIONS (PROTECTED & DEMO-ISOLATED)
  // ============================================================================
  const addAuditLog = useCallback(
    async (
      actionAr: string,
      actionEn: string,
      targetType: AuditLogEntry['targetType'],
      targetId: string
    ) => {
      const entry: AuditLogEntry = {
        id: `log-${Date.now()}`,
        actorName: currentUser ? `${currentUser.name} (${currentUser.role})` : 'مسؤول النظام',
        actorRole: currentUser?.role || 'admin',
        actionAr,
        actionEn,
        targetType,
        targetId,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      setAuditLogs((prev) => [entry, ...prev]);
      if (!isDemoMode && currentUser?.role === 'admin') {
        try {
          await setDoc(doc(db, 'auditLogs', entry.id), entry);
        } catch (e) {
          logFirestoreFailure(e, OperationType.CREATE, 'auditLogs');
        }
      }
    },
    [currentUser, isDemoMode]
  );

  const saveProduct = useCallback(
    async (product: Product) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) {
        showToast(lang === 'ar' ? 'غير مصرح بهذا الإجراء' : 'Unauthorized action', undefined, 'error');
        return;
      }

      const existingProd = products.find((p) => p.id === product.id);

      // Seller ownership & anti-tampering guard
      if (currentUser.role === 'seller') {
        if (!currentUser.sellerId) {
          showToast(lang === 'ar' ? 'حساب التاجر غير مرتبط بمتجر' : 'Seller account missing sellerId', undefined, 'error');
          return;
        }
        if (existingProd && existingProd.sellerId !== currentUser.sellerId) {
          showToast(
            lang === 'ar' ? 'لا يمكنك تعديل منتج تابع لمتجر آخر' : 'Cannot modify another seller product',
            undefined,
            'error'
          );
          return;
        }
        if (existingProd && existingProd.status === 'suspended') {
          showToast(
            lang === 'ar' ? 'هذا المنتج موقوف من الإدارة ولا يمكن تعديله مباشرة' : 'Suspended products can only be restored by Admin',
            undefined,
            'error'
          );
          return;
        }
      }

      const sellerDoc = sellers.find((s) => s.id === (currentUser.sellerId || product.sellerId));

      // Construct safe product object: sellers can NEVER alter platform-owned metrics
      // (sellerId, sellerRating, sellerVerified, rating, reviewCount, soldCount)
      const sanitizedProduct: Product =
        currentUser.role === 'admin'
          ? product
          : existingProd
          ? {
              ...existingProd,
              sku: product.sku,
              titleAr: product.titleAr,
              titleEn: product.titleEn,
              descriptionAr: product.descriptionAr,
              descriptionEn: product.descriptionEn,
              categoryId: product.categoryId,
              subcategoryAr: product.subcategoryAr,
              subcategoryEn: product.subcategoryEn,
              brandId: product.brandId,
              brandNameAr: product.brandNameAr,
              brandNameEn: product.brandNameEn,
              price: product.price,
              originalPrice: product.originalPrice,
              discountPercent: product.discountPercent,
              stock: product.stock,
              lowStockThreshold: product.lowStockThreshold,
              status: product.status === 'suspended' ? existingProd.status : product.status,
              images: product.images,
              variants: product.variants,
              specifications: product.specifications,
              warrantyAr: product.warrantyAr,
              warrantyEn: product.warrantyEn,
              deliveryEstimateAr: product.deliveryEstimateAr,
              deliveryEstimateEn: product.deliveryEstimateEn,
              isFlashDeal: product.isFlashDeal,
              flashDealEndsAt: product.flashDealEndsAt,
              isSeasonal: product.isSeasonal,
              frequentlyBoughtWith: product.frequentlyBoughtWith,
              // Platform-owned metrics strictly preserved:
              sellerId: existingProd.sellerId,
              sellerNameAr: existingProd.sellerNameAr,
              sellerNameEn: existingProd.sellerNameEn,
              sellerRating: existingProd.sellerRating,
              sellerVerified: existingProd.sellerVerified,
              rating: existingProd.rating,
              reviewCount: existingProd.reviewCount,
              soldCount: existingProd.soldCount,
              isFeatured: existingProd.isFeatured,
              isTrending: existingProd.isTrending,
              isBestSeller: existingProd.isBestSeller,
              isNewArrival: existingProd.isNewArrival,
              createdAt: existingProd.createdAt,
            }
          : {
              ...product,
              sellerId: currentUser.sellerId!,
              sellerNameAr: sellerDoc?.nameAr || product.sellerNameAr,
              sellerNameEn: sellerDoc?.nameEn || product.sellerNameEn,
              sellerRating: sellerDoc?.rating ?? 5.0,
              sellerVerified: sellerDoc?.verifiedBadge ?? false,
              rating: 0,
              reviewCount: 0,
              soldCount: 0,
              isFeatured: false,
              isTrending: false,
              isBestSeller: false,
              status: product.status === 'suspended' ? 'draft' : product.status,
            };

      if (!isDemoMode) {
        try {
          if (currentUser.role === 'admin' || !existingProd) {
            const cleanCreatePayload = Object.fromEntries(
              Object.entries(sanitizedProduct).filter(([, v]) => v !== undefined)
            );
            await setDoc(doc(db, 'products', sanitizedProduct.id), cleanCreatePayload);
          } else {
            // Seller update: send ONLY allowed catalog keys to match Firestore diff().affectedKeys().hasOnly(...)
            const allowedSellerUpdate: Record<string, unknown> = {
              sku: sanitizedProduct.sku,
              titleAr: sanitizedProduct.titleAr,
              titleEn: sanitizedProduct.titleEn,
              descriptionAr: sanitizedProduct.descriptionAr,
              descriptionEn: sanitizedProduct.descriptionEn,
              categoryId: sanitizedProduct.categoryId,
              subcategoryAr: sanitizedProduct.subcategoryAr,
              subcategoryEn: sanitizedProduct.subcategoryEn,
              brandId: sanitizedProduct.brandId,
              brandNameAr: sanitizedProduct.brandNameAr,
              brandNameEn: sanitizedProduct.brandNameEn,
              price: sanitizedProduct.price,
              originalPrice: sanitizedProduct.originalPrice,
              discountPercent: sanitizedProduct.discountPercent,
              stock: sanitizedProduct.stock,
              lowStockThreshold: sanitizedProduct.lowStockThreshold,
              status: sanitizedProduct.status,
              images: sanitizedProduct.images,
              variants: sanitizedProduct.variants,
              specifications: sanitizedProduct.specifications,
              warrantyAr: sanitizedProduct.warrantyAr,
              warrantyEn: sanitizedProduct.warrantyEn,
              deliveryEstimateAr: sanitizedProduct.deliveryEstimateAr,
              deliveryEstimateEn: sanitizedProduct.deliveryEstimateEn,
              isFlashDeal: sanitizedProduct.isFlashDeal,
            };
            if (sanitizedProduct.flashDealEndsAt !== undefined) {
              allowedSellerUpdate.flashDealEndsAt = sanitizedProduct.flashDealEndsAt;
            }
            if (sanitizedProduct.isSeasonal !== undefined) {
              allowedSellerUpdate.isSeasonal = sanitizedProduct.isSeasonal;
            }
            if (sanitizedProduct.frequentlyBoughtWith !== undefined) {
              allowedSellerUpdate.frequentlyBoughtWith = sanitizedProduct.frequentlyBoughtWith;
            }
            await updateDoc(doc(db, 'products', sanitizedProduct.id), allowedSellerUpdate);
          }
        } catch (e) {
          logFirestoreFailure(e, OperationType.WRITE, 'products');
          showToast(lang === 'ar' ? 'تعذر حفظ المنتج' : 'Failed to save product', undefined, 'error');
          return;
        }
      }
      setProducts((prev) => {
        const exists = prev.some((p) => p.id === sanitizedProduct.id);
        return exists
          ? prev.map((p) => (p.id === sanitizedProduct.id ? sanitizedProduct : p))
          : [sanitizedProduct, ...prev];
      });
      await addAuditLog(
        `حفظ وتحديث بيانات المنتج «${sanitizedProduct.titleAr}» بسعر ${sanitizedProduct.price} ر.س`,
        `Saved product "${sanitizedProduct.titleEn}" at SAR ${sanitizedProduct.price}`,
        'product',
        sanitizedProduct.id
      );
      showToast(
        lang === 'ar' ? 'تم حفظ المنتج بنجاح' : 'Product Saved Successfully',
        lang === 'ar' ? sanitizedProduct.titleAr : sanitizedProduct.titleEn,
        'success'
      );
    },
    [currentUser, isDemoMode, products, sellers, addAuditLog, lang, showToast]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) {
        showToast(lang === 'ar' ? 'غير مصرح بهذا الإجراء' : 'Unauthorized action', undefined, 'error');
        return;
      }
      const target = products.find((p) => p.id === productId);
      if (currentUser.role === 'seller' && target && target.sellerId !== currentUser.sellerId) {
        showToast(
          lang === 'ar' ? 'لا يمكنك حذف منتج تابع لمتجر آخر' : 'Cannot delete another seller product',
          undefined,
          'error'
        );
        return;
      }
      if (!isDemoMode) {
        try {
          await deleteDoc(doc(db, 'products', productId));
        } catch (e) {
          logFirestoreFailure(e, OperationType.DELETE, 'products');
          showToast(lang === 'ar' ? 'تعذر حذف المنتج' : 'Failed to delete product', undefined, 'error');
          return;
        }
      }
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      if (target) {
        await addAuditLog(
          `حذف المنتج «${target.titleAr}» من الكتالوج`,
          `Deleted product "${target.titleEn}"`,
          'product',
          productId
        );
      }
      showToast(lang === 'ar' ? 'تم حذف المنتج' : 'Product Deleted', undefined, 'info');
    },
    [currentUser, isDemoMode, products, addAuditLog, lang, showToast]
  );

  const bulkUpdateProductStatus = useCallback(
    async (productIds: string[], status: ProductStatus) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      if (currentUser.role === 'seller' && status === 'suspended') return;
      const eligibleIds = productIds.filter((id) => {
        const prod = products.find((p) => p.id === id);
        if (!prod) return false;
        if (currentUser.role === 'seller') {
          return prod.sellerId === currentUser.sellerId && prod.status !== 'suspended';
        }
        return true;
      });
      if (eligibleIds.length === 0) return;

      if (!isDemoMode) {
        try {
          for (const id of eligibleIds) {
            await updateDoc(doc(db, 'products', id), { status });
          }
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'products');
          showToast(lang === 'ar' ? 'تعذر تحديث المنتجات' : 'Failed to update products', undefined, 'error');
          return;
        }
      }
      setProducts((prev) => prev.map((p) => (eligibleIds.includes(p.id) ? { ...p, status } : p)));
      showToast(
        lang === 'ar'
          ? `تم تحديث حالة ${eligibleIds.length} منتجات`
          : `Updated ${eligibleIds.length} products`,
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, products, lang, showToast]
  );

  const updateProductStock = useCallback(
    async (productId: string, newStock: number, lowStockThreshold?: number) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = products.find((p) => p.id === productId);
      if (!target) return;
      if (currentUser.role === 'seller' && target.sellerId !== currentUser.sellerId) {
        showToast(lang === 'ar' ? 'لا يمكنك تعديل مخزون متجر آخر' : 'Cannot modify another seller inventory', undefined, 'error');
        return;
      }
      const nextStock = Math.max(0, newStock);
      const nextThreshold = lowStockThreshold ?? target.lowStockThreshold;
      const nextStatus: ProductStatus =
        nextStock <= 0 ? 'out_of_stock' : target.status === 'out_of_stock' ? 'active' : target.status;
      const updated: Product = {
        ...target,
        stock: nextStock,
        lowStockThreshold: nextThreshold,
        status: nextStatus,
      };
      if (!isDemoMode) {
        try {
          await updateDoc(doc(db, 'products', productId), {
            stock: nextStock,
            lowStockThreshold: nextThreshold,
            status: nextStatus,
          });
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'products');
          showToast(lang === 'ar' ? 'تعذر تحديث المخزون' : 'Failed to update stock', undefined, 'error');
          return;
        }
      }
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      await addAuditLog(
        `تحديث مخزون «${target.titleAr}» إلى ${newStock} قطعة`,
        `Updated stock for "${target.titleEn}" to ${newStock} units`,
        'product',
        productId
      );
      showToast(
        lang === 'ar' ? 'تم تحديث المخزون الفعلي بنجاح' : 'Inventory Stock Updated',
        `${lang === 'ar' ? target.titleAr : target.titleEn}: ${newStock}`,
        'success'
      );
    },
    [currentUser, isDemoMode, products, addAuditLog, lang, showToast]
  );

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      newStatus: OrderStatus,
      trackingNumber?: string,
      carrierAr?: string,
      carrierEn?: string,
      fulfillmentNote?: string
    ) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;

      if (currentUser.role === 'seller') {
        const belongsToSeller =
          target.sellerIds?.includes(currentUser.sellerId || '') ||
          target.items.some((item) => item.sellerId === currentUser.sellerId);
        if (!belongsToSeller) {
          showToast(
            lang === 'ar' ? 'لا يمكنك تحديث طلب لا يخص متجرك' : 'Cannot update order not belonging to your store',
            undefined,
            'error'
          );
          return;
        }
      }

      const nowIso = new Date().toISOString();
      const nowDate = nowIso.split('T')[0];
      const nextTracking = trackingNumber?.trim() || target.trackingNumber || '';
      const nextCarrierAr = carrierAr?.trim() || target.carrierAr || 'سبل إكسبريس VIP';
      const nextCarrierEn = carrierEn?.trim() || target.carrierEn || 'SPL Express VIP';
      const baseTimeline = buildOrderTimeline(newStatus, nowDate);
      const nextTimeline = fulfillmentNote?.trim()
        ? baseTimeline.map((ev) =>
            ev.status === newStatus
              ? {
                  ...ev,
                  descriptionAr: `${ev.descriptionAr} — ملاحظة التاجر: ${fulfillmentNote.trim()}`,
                  descriptionEn: `${ev.descriptionEn} — Merchant Note: ${fulfillmentNote.trim()}`,
                }
              : ev
          )
        : baseTimeline;

      const updated: Order = {
        ...target,
        status: newStatus,
        trackingNumber: nextTracking,
        carrierAr: nextCarrierAr,
        carrierEn: nextCarrierEn,
        timeline: nextTimeline,
        updatedAt: nowIso,
      };
      if (!isDemoMode) {
        try {
          // Only update fulfillment fields permitted by Firestore seller/admin order rules
          const fulfillmentPayload: Record<string, unknown> = {
            status: newStatus,
            trackingNumber: nextTracking,
            carrierAr: nextCarrierAr,
            carrierEn: nextCarrierEn,
            timeline: nextTimeline,
            updatedAt: nowIso,
          };
          await updateDoc(doc(db, 'orders', orderId), fulfillmentPayload);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'orders');
          showToast(
            lang === 'ar' ? 'تعذر تحديث حالة الطلب' : 'Failed to update order status',
            undefined,
            'error'
          );
          return;
        }
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      await addAuditLog(
        `تغيير حالة الطلب #${target.orderNumber} إلى (${newStatus})`,
        `Updated Order #${target.orderNumber} status to ${newStatus}`,
        'order',
        orderId
      );
      showToast(
        lang === 'ar'
          ? `تم تحديث حالة الطلب #${target.orderNumber}`
          : `Order #${target.orderNumber} Status Updated`,
        nextTracking ? `${nextCarrierAr} · ${nextTracking}` : undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, orders, addAuditLog, lang, showToast]
  );

  const saveCoupon = useCallback(
    async (coupon: Coupon) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const existingCoupon = coupons.find((c) => c.id === coupon.id);

      if (currentUser.role === 'seller') {
        if (!currentUser.sellerId) return;
        if (existingCoupon && existingCoupon.sellerId !== currentUser.sellerId) {
          showToast(lang === 'ar' ? 'لا يمكنك تعديل كوبون متجر آخر' : 'Cannot modify another seller coupon', undefined, 'error');
          return;
        }
      }

      // Protect `usedCount` and `sellerId` from seller manipulation
      const sanitizedCoupon: Coupon =
        currentUser.role === 'admin'
          ? coupon
          : existingCoupon
          ? {
              ...existingCoupon,
              code: coupon.code,
              titleAr: coupon.titleAr,
              titleEn: coupon.titleEn,
              type: coupon.type,
              value: coupon.value,
              minOrderAmount: coupon.minOrderAmount,
              maxDiscount: coupon.maxDiscount,
              maxUses: coupon.maxUses,
              expiresAt: coupon.expiresAt,
              isActive: coupon.isActive,
              // Immutable for sellers:
              sellerId: existingCoupon.sellerId,
              usedCount: existingCoupon.usedCount,
            }
          : {
              ...coupon,
              sellerId: currentUser.sellerId,
              usedCount: 0,
            };

      if (!isDemoMode) {
        try {
          if (currentUser.role === 'admin' || !existingCoupon) {
            const cleanCouponPayload = Object.fromEntries(
              Object.entries(sanitizedCoupon).filter(([, v]) => v !== undefined)
            );
            await setDoc(doc(db, 'coupons', sanitizedCoupon.id), cleanCouponPayload);
          } else {
            const allowedCouponUpdate: Record<string, unknown> = {
              code: sanitizedCoupon.code,
              titleAr: sanitizedCoupon.titleAr,
              titleEn: sanitizedCoupon.titleEn,
              type: sanitizedCoupon.type,
              value: sanitizedCoupon.value,
              minOrderAmount: sanitizedCoupon.minOrderAmount,
              maxUses: sanitizedCoupon.maxUses,
              expiresAt: sanitizedCoupon.expiresAt,
              isActive: sanitizedCoupon.isActive,
            };
            if (sanitizedCoupon.maxDiscount !== undefined) {
              allowedCouponUpdate.maxDiscount = sanitizedCoupon.maxDiscount;
            }
            if (sanitizedCoupon.sellerNameAr !== undefined) {
              allowedCouponUpdate.sellerNameAr = sanitizedCoupon.sellerNameAr;
            }
            await updateDoc(doc(db, 'coupons', sanitizedCoupon.id), allowedCouponUpdate);
          }
        } catch (e) {
          logFirestoreFailure(e, OperationType.WRITE, 'coupons');
          showToast(lang === 'ar' ? 'تعذر حفظ الكوبون' : 'Failed to save coupon', undefined, 'error');
          return;
        }
      }
      setCoupons((prev) => {
        const exists = prev.some((c) => c.id === sanitizedCoupon.id);
        return exists
          ? prev.map((c) => (c.id === sanitizedCoupon.id ? sanitizedCoupon : c))
          : [sanitizedCoupon, ...prev];
      });
      await addAuditLog(
        `إنشاء/تحديث كوبون الخصم ${sanitizedCoupon.code} بقيمة ${sanitizedCoupon.value}${
          sanitizedCoupon.type === 'percentage' ? '%' : ' ر.س'
        }`,
        `Saved coupon ${sanitizedCoupon.code}`,
        'coupon',
        sanitizedCoupon.id
      );
      showToast(
        lang === 'ar' ? `تم حفظ الكوبون ${sanitizedCoupon.code}` : `Coupon ${sanitizedCoupon.code} Saved`,
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, coupons, addAuditLog, lang, showToast]
  );

  const toggleCouponStatus = useCallback(
    async (couponId: string) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = coupons.find((c) => c.id === couponId);
      if (!target) return;
      if (currentUser.role === 'seller' && target.sellerId !== currentUser.sellerId) {
        showToast(lang === 'ar' ? 'لا يمكنك تعديل كوبون متجر آخر' : 'Cannot modify another seller coupon', undefined, 'error');
        return;
      }
      const updated = { ...target, isActive: !target.isActive };
      if (!isDemoMode) {
        try {
          await updateDoc(doc(db, 'coupons', couponId), { isActive: updated.isActive });
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'coupons');
          showToast(lang === 'ar' ? 'تعذر تحديث الكوبون' : 'Failed to update coupon', undefined, 'error');
          return;
        }
      }
      setCoupons((prev) => prev.map((c) => (c.id === couponId ? updated : c)));
      showToast(
        lang === 'ar'
          ? `تم ${updated.isActive ? 'تفعيل' : 'إيقاف'} الكوبون ${target.code}`
          : `Coupon ${target.code} ${updated.isActive ? 'activated' : 'paused'}`,
        undefined,
        'info'
      );
    },
    [currentUser, isDemoMode, coupons, lang, showToast]
  );

  const deleteCoupon = useCallback(
    async (couponId: string) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = coupons.find((c) => c.id === couponId);
      if (!target) return;
      if (currentUser.role === 'seller' && target.sellerId !== currentUser.sellerId) {
        showToast(
          lang === 'ar' ? 'لا يمكنك حذف كوبون متجر آخر' : 'Cannot delete another seller coupon',
          undefined,
          'error'
        );
        return;
      }
      if (!isDemoMode) {
        try {
          await deleteDoc(doc(db, 'coupons', couponId));
        } catch (e) {
          logFirestoreFailure(e, OperationType.DELETE, 'coupons');
          showToast(lang === 'ar' ? 'تعذر حذف الكوبون' : 'Failed to delete coupon', undefined, 'error');
          return;
        }
      }
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));
      await addAuditLog(
        `حذف كوبون الخصم ${target.code}`,
        `Deleted coupon ${target.code}`,
        'coupon',
        couponId
      );
      showToast(
        lang === 'ar' ? `تم حذف الكوبون ${target.code}` : `Coupon ${target.code} Deleted`,
        undefined,
        'info'
      );
    },
    [currentUser, isDemoMode, coupons, addAuditLog, lang, showToast]
  );

  const replyToReview = useCallback(
    async (reviewId: string, replyText: string) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = reviews.find((r) => r.id === reviewId);
      if (!target || !replyText.trim()) return;
      const prod = products.find((p) => p.id === target.productId);
      if (currentUser.role === 'seller' && prod && prod.sellerId !== currentUser.sellerId) {
        showToast(
          lang === 'ar' ? 'لا يمكنك الرد على تقييم منتج لا يخص متجرك' : 'Cannot reply to review on another seller product',
          undefined,
          'error'
        );
        return;
      }
      const nowDate = new Date().toISOString().split('T')[0];
      const updated: Review = {
        ...target,
        sellerReplyAr: replyText.trim(),
        sellerReplyEn: replyText.trim(),
        sellerReplyAt: nowDate,
      };
      if (!isDemoMode) {
        try {
          await updateDoc(doc(db, 'reviews', reviewId), {
            sellerReplyAr: updated.sellerReplyAr,
            sellerReplyEn: updated.sellerReplyEn,
            sellerReplyAt: updated.sellerReplyAt,
          });
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'reviews');
          showToast(
            lang === 'ar' ? 'تعذر نشر رد المتجر على التقييم' : 'Failed to publish merchant reply',
            undefined,
            'error'
          );
          return;
        }
      }
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      showToast(
        lang === 'ar' ? 'تم نشر رد المتجر الرسمي على التقييم' : 'Official Merchant Reply Published',
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, reviews, products, lang, showToast]
  );

  const respondToReturnRequest = useCallback(
    async (
      orderId: string,
      recommendation: 'approve_restock' | 'inspect_required' | 'dispute',
      merchantNote: string
    ) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = orders.find((o) => o.id === orderId);
      if (!target || !target.returnRequest) return;

      const belongsToSeller =
        currentUser.role === 'admin' ||
        target.sellerIds?.includes(currentUser.sellerId || '') ||
        target.items.some((item) => item.sellerId === currentUser.sellerId);
      if (!belongsToSeller) return;

      const updatedOrder: Order = {
        ...target,
        returnRequest: {
          ...target.returnRequest,
          sellerRecommendation: recommendation,
          sellerInspectionNote: merchantNote.trim(),
        },
        updatedAt: new Date().toISOString(),
      };

      if (!isDemoMode) {
        if (currentUser.role === 'admin') {
          try {
            await setDoc(doc(db, 'orders', orderId), updatedOrder);
          } catch (e) {
            logFirestoreFailure(e, OperationType.UPDATE, 'orders');
          }
        } else if (currentUser.role === 'seller') {
          // Production seller submits an official return inspection ticket for Admin/Treasury final disposition
          try {
            const returnTicket: SupportTicket = {
              id: `tkt-ret-${Date.now()}`,
              ticketNumber: `RET-${Math.floor(1000 + Math.random() * 9000)}`,
              userId: auth.currentUser?.uid || currentUser.id,
              userName: currentUser.name,
              userEmail: currentUser.email,
              categoryAr: 'توصية فحص مرتجعات التاجر',
              categoryEn: 'Merchant Return Inspection Report',
              subject: `تقرير فحص مرتجع الطلب #${target.orderNumber} (${recommendation})`,
              message: merchantNote.trim() || 'تم فحص حالة المرتجع من قِبل المتجر ورفع التوصية للإدارة.',
              orderNumber: target.orderNumber,
              returnRecommendation: recommendation,
              status: 'open',
              createdAt: new Date().toISOString().split('T')[0],
            };
            await setDoc(doc(db, 'tickets', returnTicket.id), returnTicket);
            setTickets((prev) => [returnTicket, ...prev]);
          } catch (e) {
            logFirestoreFailure(e, OperationType.CREATE, 'tickets');
          }
        }
      }

      setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
      showToast(
        lang === 'ar'
          ? `تم تسجيل قرار فحص المرتجع للطلب #${target.orderNumber}`
          : `Return Inspection Recorded for #${target.orderNumber}`,
        lang === 'ar'
          ? 'تم إرفاق ملاحظات الفحص الفني وإشعار فريق التسويات وحماية المشتري'
          : 'Inspection notes attached and forwarded to Marketplace Settlement team',
        'success'
      );
    },
    [currentUser, isDemoMode, orders, lang, showToast]
  );

  const submitSellerApplication = useCallback(
    async (sellerData: Partial<Seller>) => {
      if (!currentUser) {
        showToast(
          lang === 'ar' ? 'يرجى تسجيل الدخول لتقديم طلب انضمام كمتجر' : 'Please sign in to submit a seller application',
          undefined,
          'error'
        );
        return;
      }
      const newSeller: Seller = {
        id: `seller-${Date.now()}`,
        nameAr: sellerData.nameAr || 'متجر سعودي جديد',
        nameEn: sellerData.nameEn || 'New Saudi Boutique',
        descriptionAr: sellerData.descriptionAr || 'متجر متخصص في المنتجات الفاخرة.',
        descriptionEn: sellerData.descriptionEn || 'Curated luxury merchant.',
        cityAr: sellerData.cityAr || 'الرياض',
        cityEn: sellerData.cityEn || 'Riyadh',
        crNumber: sellerData.crNumber || '1010884920',
        vatNumber: sellerData.vatNumber || '310884920100003',
        iban: sellerData.iban || 'SA4480000000123456789012',
        ownerName: sellerData.ownerName || currentUser.name,
        email: sellerData.email || currentUser.email,
        phone: sellerData.phone || currentUser.phone || '+966 50 000 0000',
        status: 'pending',
        verifiedBadge: false,
        rating: 5.0,
        reviewCount: 1,
        commissionRate: 10,
        grossSales: 0,
        platformCommission: 0,
        refundsTotal: 0,
        netEarnings: 0,
        availableBalance: 0,
        nextPayoutDate: '2026-10-15',
        joinedAt: new Date().toISOString().split('T')[0],
        categories: sellerData.categories || ['perfumes'],
        payoutHistory: [],
      };

      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'sellers', newSeller.id), newSeller);
        } catch (e) {
          logFirestoreFailure(e, OperationType.CREATE, 'sellers');
          showToast(
            lang === 'ar' ? 'تعذر إرسال طلب الانضمام' : 'Failed to submit seller application',
            undefined,
            'error'
          );
          return;
        }
      }

      setSellers((prev) => [newSeller, ...prev]);
      showToast(
        lang === 'ar'
          ? 'تم إرسال طلب انضمام المتجر للاعتماد'
          : 'Seller Application Submitted',
        lang === 'ar'
          ? 'سيبقى حسابك بصفة عميل حتى تقوم الإدارة بمراجعة السجل التجاري واعتماد المتجر'
          : 'Your account remains a Customer until Executive Admin verifies your CR & VAT',
        'success'
      );
    },
    [currentUser, isDemoMode, lang, showToast]
  );

  const updateSellerProfile = useCallback(
    async (
      sellerId: string,
      safeUpdates: Partial<
        Pick<
          Seller,
          | 'nameAr'
          | 'nameEn'
          | 'descriptionAr'
          | 'descriptionEn'
          | 'cityAr'
          | 'cityEn'
          | 'phone'
          | 'email'
          | 'iban'
          | 'ownerName'
          | 'categories'
          | 'crNumber'
          | 'vatNumber'
          | 'operationalSettings'
        >
      >
    ) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) {
        showToast(lang === 'ar' ? 'غير مصرح بهذا الإجراء' : 'Unauthorized action', undefined, 'error');
        return;
      }
      if (currentUser.role === 'seller' && currentUser.sellerId !== sellerId) {
        showToast(
          lang === 'ar' ? 'لا يمكنك تعديل بيانات متجر آخر' : 'Cannot modify another seller profile',
          undefined,
          'error'
        );
        return;
      }
      const target = sellers.find((s) => s.id === sellerId);
      if (!target) return;

      // Strictly whitelist only safe business/profile/operational fields; never allow financial or approval fields
      const allowedPayload: Record<string, unknown> = {};
      const allowedKeys = [
        'nameAr',
        'nameEn',
        'descriptionAr',
        'descriptionEn',
        'cityAr',
        'cityEn',
        'phone',
        'email',
        'iban',
        'ownerName',
        'categories',
        'crNumber',
        'vatNumber',
        'operationalSettings',
      ] as const;

      for (const key of allowedKeys) {
        if (safeUpdates[key] !== undefined) {
          allowedPayload[key] = safeUpdates[key];
        }
      }

      if (!isDemoMode) {
        try {
          await updateDoc(doc(db, 'sellers', sellerId), allowedPayload);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'sellers');
          showToast(
            lang === 'ar' ? 'تعذر تحديث بيانات المتجر' : 'Failed to update seller profile',
            undefined,
            'error'
          );
          return;
        }
      }

      setSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? ({ ...s, ...allowedPayload } as Seller) : s))
      );
      showToast(
        lang === 'ar' ? 'تم تحديث بيانات المتجر بنجاح' : 'Seller Profile Updated',
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, sellers, lang, showToast]
  );

  const requestSellerPayout = useCallback(
    async (sellerId: string, amount: number) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = sellers.find((s) => s.id === sellerId);
      if (!target || amount <= 0 || amount > target.availableBalance) return;

      const updated: Seller = {
        ...target,
        availableBalance: target.availableBalance - amount,
        payoutHistory: [
          {
            id: `pay-${Date.now()}`,
            amount,
            status: 'processing',
            bankNameAr: 'البنك الأهلي السعودي SNB (تحويل سريع سار)',
            bankNameEn: 'Saudi National Bank (SARIE Transfer)',
            ibanLast4: target.iban.slice(-4),
            date: new Date().toISOString().split('T')[0],
          },
          ...target.payoutHistory,
        ],
      };

      if (!isDemoMode) {
        if (currentUser.role === 'admin') {
          try {
            await setDoc(doc(db, 'sellers', sellerId), updated);
          } catch (e) {
            logFirestoreFailure(e, OperationType.UPDATE, 'sellers');
            showToast(
              lang === 'ar' ? 'تعذر تنفيذ تسوية الأرباح' : 'Failed to process payout',
              undefined,
              'error'
            );
            return;
          }
        } else {
          // Sellers cannot directly modify authoritative financial balances in Firestore (`sellers/{sellerId}`);
          // submit a formal settlement request ticket for Admin/backend treasury execution.
          try {
            const payoutTicket: SupportTicket = {
              id: `tkt-payout-${Date.now()}`,
              ticketNumber: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
              userId: auth.currentUser?.uid || currentUser.id,
              userName: currentUser.name,
              userEmail: currentUser.email,
              categoryAr: 'تسوية الأرباح والتحويلات البنكية (سار)',
              categoryEn: 'Merchant Payout Settlement (SARIE)',
              subject: `طلب تحويل أرباح متجر (${target.nameAr}) بمبلغ ${amount} ر.س`,
              message: `طلب تسوية رصيد متاح بقيمة ${amount} ر.س إلى الحساب البنكي المعتمد (${target.iban}).`,
              status: 'open',
              createdAt: new Date().toISOString().split('T')[0],
            };
            await setDoc(doc(db, 'tickets', payoutTicket.id), payoutTicket);
            setTickets((prev) => [payoutTicket, ...prev]);
            showToast(
              lang === 'ar'
                ? `تم رفع طلب تسوية الأرباح (${formatPrice(amount)}) للإدارة المالية`
                : `Payout Request (${formatPrice(amount)}) Submitted to Treasury`,
              lang === 'ar'
                ? 'الأرصدة المالية محمية وتتم تسويتها واعتمادها عبر الإدارة المالية ونظام سار'
                : 'Financial balances are protected and settled by Executive Treasury',
              'success'
            );
            return;
          } catch (e) {
            logFirestoreFailure(e, OperationType.CREATE, 'tickets');
            showToast(
              lang === 'ar' ? 'تعذر إرسال طلب تحويل الأرباح' : 'Failed to submit payout request',
              undefined,
              'error'
            );
            return;
          }
        }
      }

      setSellers((prev) => prev.map((s) => (s.id === sellerId ? updated : s)));
      showToast(
        lang === 'ar'
          ? `تم طلب تحويل الأرباح (${formatPrice(amount)})`
          : `Payout of ${formatPrice(amount)} Initiated`,
        lang === 'ar'
          ? 'سيتم إيداع المبلغ في حسابكم البنكي عبر نظام سار خلال ٢٤ ساعة'
          : 'Funds will arrive via SARIE within 24 hours',
        'success'
      );
    },
    [currentUser, isDemoMode, sellers, formatPrice, lang, showToast]
  );

  // Admin Actions
  const updateSellerStatus = useCallback(
    async (sellerId: string, status: SellerStatus) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      const target = sellers.find((s) => s.id === sellerId);
      if (!target) return;
      const updated: Seller = {
        ...target,
        status,
        verifiedBadge: status === 'approved',
      };
      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'sellers', sellerId), updated);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'sellers');
          showToast(lang === 'ar' ? 'تعذر تحديث حالة التاجر' : 'Failed to update seller status', undefined, 'error');
          return;
        }
      }
      setSellers((prev) => prev.map((s) => (s.id === sellerId ? updated : s)));
      await addAuditLog(
        `تحديث حالة التاجر «${target.nameAr}» إلى (${
          status === 'approved' ? 'معتمد وموثق' : status === 'suspended' ? 'موقوف مؤقتاً' : 'مرفوض'
        })`,
        `Updated seller "${target.nameEn}" status to ${status}`,
        'seller',
        sellerId
      );
      showToast(
        lang === 'ar' ? `تم تحديث حالة متجر ${target.nameAr}` : `Updated ${target.nameEn} status`,
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, sellers, addAuditLog, lang, showToast]
  );

  const moderateProduct = useCallback(
    async (
      productId: string,
      updates: Partial<Product>,
      logReasonAr: string,
      logReasonEn: string
    ) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      const target = products.find((p) => p.id === productId);
      if (!target) return;
      const updated: Product = { ...target, ...updates };
      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'products', productId), updated);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'products');
          showToast(lang === 'ar' ? 'تعذر تحديث المنتج' : 'Failed to moderate product', undefined, 'error');
          return;
        }
      }
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      await addAuditLog(logReasonAr, logReasonEn, 'product', productId);
      showToast(lang === 'ar' ? logReasonAr : logReasonEn, undefined, 'success');
    },
    [currentUser, isDemoMode, products, addAuditLog, lang, showToast]
  );

  const processReturnRequest = useCallback(
    async (orderId: string, approve: boolean, adminNote: string) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;
      const updated: Order = {
        ...target,
        status: approve ? 'returned' : 'delivered',
        returnRequest: target.returnRequest
          ? {
              ...target.returnRequest,
              status: approve ? 'approved' : 'rejected',
              adminNote,
            }
          : undefined,
        updatedAt: new Date().toISOString(),
      };
      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'orders', orderId), updated);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'orders');
          showToast(lang === 'ar' ? 'تعذر معالجة طلب الإرجاع' : 'Failed to process return request', undefined, 'error');
          return;
        }
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      await addAuditLog(
        `${approve ? 'الموافقة على إرجاع واسترداد مبلغ' : 'رفض طلب إرجاع'} الطلب #${target.orderNumber}`,
        `${approve ? 'Approved return & refund for' : 'Declined return for'} Order #${target.orderNumber}`,
        'return',
        orderId
      );
      showToast(
        lang === 'ar'
          ? approve
            ? `تمت الموافقة على إرجاع الطلب #${target.orderNumber} وإيداع المبلغ في المحفظة`
            : `تم رفض طلب الإرجاع للطلب #${target.orderNumber}`
          : `Return request for #${target.orderNumber} processed`,
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, orders, addAuditLog, lang, showToast]
  );

  const updateHomepageConfig = useCallback(
    async (config: HomepageConfig) => {
      if (!currentUser || currentUser.role !== 'admin') return;
      if (!isDemoMode) {
        try {
          await setDoc(doc(db, 'settings', 'homepage'), config);
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'settings');
          showToast(lang === 'ar' ? 'تعذر تحديث إعدادات الواجهة' : 'Failed to update homepage settings', undefined, 'error');
          return;
        }
      }
      setHomepageConfig(config);
      await addAuditLog(
        'تحديث محتوى وبنرات الصفحة الرئيسية لمنصة أثيل',
        'Updated Atheel Homepage Editorial Hero & Campaign Banners',
        'homepage',
        'homepage'
      );
      showToast(
        lang === 'ar' ? 'تم تحديث محتوى الصفحة الرئيسية بنجاح' : 'Homepage Content Updated',
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, addAuditLog, lang, showToast]
  );

  const answerProductQuestion = useCallback(
    async (questionId: string, answerText: string) => {
      if (!currentUser || (currentUser.role !== 'seller' && currentUser.role !== 'admin')) return;
      const target = questions.find((q) => q.id === questionId);
      if (!target) return;
      const prod = products.find((p) => p.id === target.productId);
      if (currentUser.role === 'seller' && prod && prod.sellerId !== currentUser.sellerId) {
        showToast(
          lang === 'ar' ? 'لا يمكنك الإجابة على سؤال لمنتج لا يخص متجرك' : 'Cannot answer question for another seller product',
          undefined,
          'error'
        );
        return;
      }
      const sellerDoc = sellers.find((s) => s.id === (prod?.sellerId || currentUser.sellerId));
      const nowDate = new Date().toISOString().split('T')[0];
      const updated: ProductQuestion = {
        ...target,
        answerAr: answerText.trim(),
        answerEn: answerText.trim(),
        answeredByAr: sellerDoc ? `${sellerDoc.nameAr} (تاجر معتمد)` : currentUser.name || 'إدارة أثيل',
        answeredByEn: sellerDoc ? `${sellerDoc.nameEn} (Verified Seller)` : currentUser.name || 'Atheel Concierge',
        answeredAt: nowDate,
      };
      if (!isDemoMode) {
        try {
          await updateDoc(doc(db, 'questions', questionId), {
            answerAr: updated.answerAr,
            answerEn: updated.answerEn,
            answeredByAr: updated.answeredByAr,
            answeredByEn: updated.answeredByEn,
            answeredAt: updated.answeredAt,
          });
        } catch (e) {
          logFirestoreFailure(e, OperationType.UPDATE, 'questions');
          showToast(lang === 'ar' ? 'تعذر نشر الإجابة' : 'Failed to publish answer', undefined, 'error');
          return;
        }
      }
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
      showToast(
        lang === 'ar' ? 'تم نشر الإجابة على سؤال العميل' : 'Answer Published',
        undefined,
        'success'
      );
    },
    [currentUser, isDemoMode, questions, products, sellers, lang, showToast]
  );

  const value: MarketplaceContextType = {
    lang,
    setLang,
    isRtl,
    t,
    formatPrice,
    activeView,
    navigateTo,
    selectedProductId,
    lastCreatedOrder,
    pendingRedirectView,
    setPendingRedirectView,
    currentUser,
    isAuthLoading,
    isDemoMode,
    canAccessSellerDashboard,
    canAccessAdminDashboard,
    exitDemoMode,
    loginWithDemoRole,
    loginWithEmail,
    registerWithEmail,
    sendPasswordReset,
    loginWithCredentials,
    loginWithGoogle,
    registerAccount,
    logout,
    categories,
    brands,
    products,
    sellers,
    coupons,
    orders,
    reviews,
    questions,
    users,
    notifications,
    tickets,
    auditLogs,
    homepageConfig,
    isLoadingData,
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedSubcategory,
    setSelectedSubcategory,
    selectedBrandId,
    setSelectedBrandId,
    selectedSellerId,
    setSelectedSellerId,
    priceRange,
    setPriceRange,
    minRating,
    setMinRating,
    onlyInStock,
    setOnlyInStock,
    onlyDiscounted,
    setOnlyDiscounted,
    sortBy,
    setSortBy,
    recentSearches,
    addRecentSearch,
    resetFilters,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    appliedCoupon,
    applyCouponCode,
    removeCoupon,
    cartSummary,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompare,
    clearCompare,
    recentlyViewedIds,
    recordProductView,
    placeOrder,
    cancelOrder,
    requestReturn,
    saveAddress,
    deleteAddress,
    setDefaultAddress,
    updateUserProfile,
    submitReview,
    submitQuestion,
    submitSupportTicket,
    markAllNotificationsRead,
    saveProduct,
    deleteProduct,
    bulkUpdateProductStatus,
    updateProductStock,
    updateOrderStatus,
    saveCoupon,
    toggleCouponStatus,
    deleteCoupon,
    replyToReview,
    respondToReturnRequest,
    submitSellerApplication,
    updateSellerProfile,
    requestSellerPayout,
    updateSellerStatus,
    moderateProduct,
    processReturnRequest,
    updateHomepageConfig,
    answerProductQuestion,
    toasts,
    showToast,
    dismissToast,
  };

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
}
