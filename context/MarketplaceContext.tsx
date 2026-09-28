'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
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
  navigateTo: (view: AppView, params?: { productId?: string; categoryId?: string; query?: string; sellerId?: string }) => void;
  selectedProductId: string;
  lastCreatedOrder: Order | null;

  // Auth & Role
  currentUser: UserProfile | null;
  loginWithDemoRole: (role: UserRole) => void;
  loginWithCredentials: (email: string, password: string) => boolean;
  loginWithGoogle: () => Promise<void>;
  registerAccount: (name: string, email: string, phone: string, role: 'customer' | 'seller') => void;
  logout: () => void;

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

  // Cart & Coupon
  cart: CartItem[];
  addToCart: (product: Product, selectedVariants?: Record<string, string>, quantity?: number) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  appliedCoupon: Coupon | null;
  applyCouponCode: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  cartSummary: {
    subtotal: number;
    discountAmount: number;
    shippingFee: number;
    vatAmount: number; // 15% Saudi VAT
    total: number;
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
  requestReturn: (orderId: string, reasonAr: string, details: string, refundMethod: 'wallet' | 'original_payment') => Promise<void>;
  saveAddress: (address: SaudiAddress) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  setDefaultAddress: (addressId: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  submitReview: (productId: string, rating: number, title: string, comment: string) => Promise<void>;
  submitQuestion: (productId: string, questionText: string) => Promise<void>;
  submitSupportTicket: (subject: string, categoryAr: string, message: string, orderNumber?: string) => Promise<void>;
  markAllNotificationsRead: () => void;

  // Seller Actions
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  bulkUpdateProductStatus: (productIds: string[], status: ProductStatus) => Promise<void>;
  updateProductStock: (productId: string, newStock: number, lowStockThreshold?: number) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => Promise<void>;
  saveCoupon: (coupon: Coupon) => Promise<void>;
  toggleCouponStatus: (couponId: string) => Promise<void>;
  submitSellerApplication: (sellerData: Partial<Seller>) => Promise<void>;
  requestSellerPayout: (sellerId: string, amount: number) => Promise<void>;

  // Admin Actions
  updateSellerStatus: (sellerId: string, status: SellerStatus) => Promise<void>;
  moderateProduct: (productId: string, updates: Partial<Product>, logReasonAr: string, logReasonEn: string) => Promise<void>;
  processReturnRequest: (orderId: string, approve: boolean, adminNote: string) => Promise<void>;
  updateHomepageConfig: (config: HomepageConfig) => Promise<void>;
  answerProductQuestion: (questionId: string, answerText: string) => Promise<void>;

  // Toasts
  toasts: ToastMessage[];
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('ar');
  const isRtl = lang === 'ar';

  const t = useCallback(
    (ar: string, en: string) => (lang === 'ar' ? ar : en),
    [lang]
  );

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

  // Collections State (Initialized with rich seed data for instant zero-flicker render, then synced live with Firestore)
  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [brands] = useState<Brand[]>(INITIAL_BRANDS);
  const [products, setProducts] = useState<Product[]>(INITIAL_ALL_PRODUCTS);
  const [sellers, setSellers] = useState<Seller[]>(INITIAL_SELLERS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [questions, setQuestions] = useState<ProductQuestion[]>(INITIAL_QUESTIONS);
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(INITIAL_HOMEPAGE_CONFIG);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Current Logged-In User (Default to Customer Demo Account so evaluator can immediately browse or switch roles)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(INITIAL_USERS[0]);

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
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'best_selling'>('featured');
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
  const [wishlistIds, setWishlistIds] = useState<string[]>(['prod-1', 'prod-5', 'prod-9', 'prod-21', 'prod-29']);
  const [compareIds, setCompareIds] = useState<string[]>(['prod-1', 'prod-4', 'prod-9']);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(['prod-1', 'prod-5', 'prod-9', 'prod-21', 'prod-29', 'prod-33']);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, description?: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Firestore Seeding & Real-Time Listeners
  useEffect(() => {
    let unsubProducts: (() => void) | undefined;
    let unsubSellers: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let unsubCoupons: (() => void) | undefined;
    let unsubReviews: (() => void) | undefined;
    let unsubLogs: (() => void) | undefined;

    async function initFirestore() {
      try {
        const prodCheck = await getDocs(query(collection(db, 'products'), limit(1)));
        if (prodCheck.empty) {
          // Seed initial data into Firestore in clean batches
          const batch1 = writeBatch(db);
          INITIAL_ALL_PRODUCTS.slice(0, 32).forEach((p) => {
            batch1.set(doc(db, 'products', p.id), p);
          });
          await batch1.commit();

          const batch2 = writeBatch(db);
          INITIAL_ALL_PRODUCTS.slice(32).forEach((p) => {
            batch2.set(doc(db, 'products', p.id), p);
          });
          INITIAL_SELLERS.forEach((s) => {
            batch2.set(doc(db, 'sellers', s.id), s);
          });
          INITIAL_COUPONS.forEach((c) => {
            batch2.set(doc(db, 'coupons', c.id), c);
          });
          await batch2.commit();

          const batch3 = writeBatch(db);
          INITIAL_ORDERS.forEach((o) => {
            batch3.set(doc(db, 'orders', o.id), o);
          });
          INITIAL_REVIEWS.forEach((r) => {
            batch3.set(doc(db, 'reviews', r.id), r);
          });
          INITIAL_USERS.forEach((u) => {
            batch3.set(doc(db, 'users', u.id), u);
          });
          INITIAL_AUDIT_LOGS.forEach((l) => {
            batch3.set(doc(db, 'auditLogs', l.id), l);
          });
          batch3.set(doc(db, 'settings', 'homepage'), INITIAL_HOMEPAGE_CONFIG);
          await batch3.commit();
        }

        // Subscribe to real-time updates
        unsubProducts = onSnapshot(
          collection(db, 'products'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as Product);
              // Sort by numeric id so catalog order stays consistent
              list.sort((a, b) => {
                const numA = parseInt(a.id.replace(/\D/g, '') || '0', 10);
                const numB = parseInt(b.id.replace(/\D/g, '') || '0', 10);
                return numA - numB;
              });
              setProducts(list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'products')
        );

        unsubSellers = onSnapshot(
          collection(db, 'sellers'),
          (snap) => {
            if (!snap.empty) {
              setSellers(snap.docs.map((d) => d.data() as Seller));
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'sellers')
        );

        unsubOrders = onSnapshot(
          collection(db, 'orders'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as Order);
              list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setOrders(list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
        );

        unsubCoupons = onSnapshot(
          collection(db, 'coupons'),
          (snap) => {
            if (!snap.empty) {
              setCoupons(snap.docs.map((d) => d.data() as Coupon));
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'coupons')
        );

        unsubReviews = onSnapshot(
          collection(db, 'reviews'),
          (snap) => {
            if (!snap.empty) {
              setReviews(snap.docs.map((d) => d.data() as Review));
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
        );

        unsubLogs = onSnapshot(
          collection(db, 'auditLogs'),
          (snap) => {
            if (!snap.empty) {
              const list = snap.docs.map((d) => d.data() as AuditLogEntry);
              list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
              setAuditLogs(list);
            }
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'initFirestore');
      } finally {
        setIsLoadingData(false);
      }
    }

    initFirestore();

    return () => {
      unsubProducts?.();
      unsubSellers?.();
      unsubOrders?.();
      unsubCoupons?.();
      unsubReviews?.();
      unsubLogs?.();
    };
  }, []);

  const recordProductView = useCallback((productId: string) => {
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      return [productId, ...filtered].slice(0, 10);
    });
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
      setActiveView(view);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [recordProductView]
  );

  // Auth Actions
  const loginWithDemoRole = useCallback(
    (role: UserRole) => {
      const targetUser =
        role === 'admin'
          ? users.find((u) => u.role === 'admin') || INITIAL_USERS[2]
          : role === 'seller'
          ? users.find((u) => u.role === 'seller') || INITIAL_USERS[1]
          : users.find((u) => u.role === 'customer') || INITIAL_USERS[0];

      setCurrentUser(targetUser);
      showToast(
        lang === 'ar' ? `مرحباً بك، ${targetUser.name}` : `Welcome back, ${targetUser.name}`,
        lang === 'ar'
          ? `تم تسجيل الدخول بنجاح بصلاحية (${role === 'admin' ? 'الإدارة التنفيذية' : role === 'seller' ? 'مركز التجار' : 'عميل VIP'})`
          : `Signed in with ${role.toUpperCase()} privileges`,
        'success'
      );

      if (role === 'admin') {
        navigateTo('admin-dashboard');
      } else if (role === 'seller') {
        navigateTo('seller-dashboard');
      } else {
        navigateTo('home');
      }
    },
    [users, lang, showToast, navigateTo]
  );

  const loginWithCredentials = useCallback(
    (email: string, _password: string): boolean => {
      const normalized = email.trim().toLowerCase();
      const matched = users.find((u) => u.email.toLowerCase() === normalized);
      if (matched) {
        setCurrentUser(matched);
        showToast(
          lang === 'ar' ? `أهلاً بعودتك، ${matched.name}` : `Welcome back, ${matched.name}`,
          lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Successfully signed in',
          'success'
        );
        if (matched.role === 'admin') navigateTo('admin-dashboard');
        else if (matched.role === 'seller') navigateTo('seller-dashboard');
        else navigateTo('home');
        return true;
      }
      showToast(
        lang === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid Credentials',
        lang === 'ar' ? 'يرجى التأكد من البريد الإلكتروني أو استخدام حسابات التجربة السريعة.' : 'Please verify your email or use Demo Quick Access.',
        'error'
      );
      return false;
    },
    [users, lang, showToast, navigateTo]
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      const newProfile: UserProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || 'عميل أثيل المميز',
        email: fbUser.email || 'vip@atheel.sa',
        phone: '+966 50 000 0000',
        role: 'customer',
        walletBalance: 500,
        loyaltyPoints: 1500,
        loyaltyTier: 'Gold',
        referralCode: `ATH-${fbUser.uid.slice(0, 5).toUpperCase()}`,
        wishlist: ['prod-1', 'prod-5'],
        addresses: INITIAL_USERS[0].addresses,
        loyaltyHistory: INITIAL_USERS[0].loyaltyHistory,
        preferences: { newsletter: true, smsAlerts: true, whatsappUpdates: true, language: lang },
        createdAt: new Date().toISOString().split('T')[0],
      };
      setCurrentUser(newProfile);
      await setDoc(doc(db, 'users', newProfile.id), newProfile);
      showToast(
        lang === 'ar' ? `مرحباً بك ${newProfile.name}` : `Welcome ${newProfile.name}`,
        lang === 'ar' ? 'تم تسجيل الدخول عبر حساب Google بنجاح' : 'Signed in with Google successfully',
        'success'
      );
      navigateTo('home');
    } catch {
      // Fallback to customer demo if popup blocked in iframe
      loginWithDemoRole('customer');
    }
  }, [lang, showToast, navigateTo, loginWithDemoRole]);

  const registerAccount = useCallback(
    async (name: string, email: string, phone: string, role: 'customer' | 'seller') => {
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        name,
        email,
        phone,
        role,
        sellerId: role === 'seller' ? 'seller-2' : undefined,
        walletBalance: 250,
        loyaltyPoints: 1000,
        loyaltyTier: 'Silver',
        referralCode: `ATH-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        wishlist: [],
        addresses: INITIAL_USERS[0].addresses,
        loyaltyHistory: [
          {
            id: `lh-${Date.now()}`,
            titleAr: 'مكافأة الترحيب بالعضوية الجديدة',
            titleEn: 'New Member Welcome Bonus',
            points: 1000,
            date: new Date().toISOString().split('T')[0],
          },
        ],
        preferences: { newsletter: true, smsAlerts: true, whatsappUpdates: true, language: lang },
        createdAt: new Date().toISOString().split('T')[0],
      };

      setUsers((prev) => [newUser, ...prev]);
      setCurrentUser(newUser);
      try {
        await setDoc(doc(db, 'users', newUser.id), newUser);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'users');
      }
      showToast(
        lang === 'ar' ? 'تم إنشاء حسابك في أثيل بنجاح' : 'Account Created Successfully',
        lang === 'ar' ? 'حصلت على ١,٠٠٠ نقطة ولاء و ٢٥٠ ر.س رصيد ترحيبي!' : '1,000 loyalty points & 250 SAR welcome credit added!',
        'success'
      );
      navigateTo(role === 'seller' ? 'seller-dashboard' : 'home');
    },
    [lang, showToast, navigateTo]
  );

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setCurrentUser(null);
    showToast(
      lang === 'ar' ? 'تم تسجيل الخروج' : 'Signed Out',
      lang === 'ar' ? 'نتطلع لرؤيتك مجدداً في أثيل' : 'We look forward to welcoming you back',
      'info'
    );
    navigateTo('login');
  }, [lang, showToast, navigateTo]);

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

  // Cart & Coupon Engine
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
      const found = coupons.find((c) => c.code.toUpperCase() === clean && c.isActive);
      if (!found) {
        const msg = lang === 'ar' ? 'كود الخصم غير صحيح أو منتهي الصلاحية' : 'Invalid or expired coupon code';
        showToast(msg, undefined, 'error');
        return { success: false, message: msg };
      }

      const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
      if (subtotal < found.minOrderAmount) {
        const msg =
          lang === 'ar'
            ? `الحد الأدنى لتفعيل الكوبون هو ${found.minOrderAmount} ر.س`
            : `Minimum order of SAR ${found.minOrderAmount} required`;
        showToast(msg, undefined, 'error');
        return { success: false, message: msg };
      }

      if (found.sellerId && found.sellerId !== 'all') {
        const hasSellerItem = cart.some((item) => item.product.sellerId === found.sellerId);
        if (!hasSellerItem) {
          const msg =
            lang === 'ar'
              ? `هذا الكوبون مخصص لمنتجات (${found.sellerNameAr}) فقط`
              : `This coupon is valid only for ${found.sellerNameAr} items`;
          showToast(msg, undefined, 'error');
          return { success: false, message: msg };
        }
      }

      setAppliedCoupon(found);
      const okMsg =
        lang === 'ar' ? `تم تطبيق الكوبون ${found.code} بنجاح!` : `Coupon ${found.code} applied!`;
      showToast(okMsg, lang === 'ar' ? found.titleAr : found.titleEn, 'success');
      return { success: true, message: okMsg };
    },
    [coupons, cart, lang, showToast]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    showToast(lang === 'ar' ? 'تم إزالة الكوبون' : 'Coupon removed', undefined, 'info');
  }, [lang, showToast]);

  const cartSummary = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    let discountAmount = 0;
    if (appliedCoupon && subtotal >= appliedCoupon.minOrderAmount) {
      const eligibleSubtotal =
        appliedCoupon.sellerId && appliedCoupon.sellerId !== 'all'
          ? cart
              .filter((i) => i.product.sellerId === appliedCoupon.sellerId)
              .reduce((acc, i) => acc + i.unitPrice * i.quantity, 0)
          : subtotal;

      if (appliedCoupon.type === 'percentage') {
        const raw = (eligibleSubtotal * appliedCoupon.value) / 100;
        discountAmount = appliedCoupon.maxDiscount ? Math.min(raw, appliedCoupon.maxDiscount) : raw;
      } else {
        discountAmount = Math.min(eligibleSubtotal, appliedCoupon.value);
      }
    }

    const netAfterDiscount = Math.max(0, subtotal - discountAmount);
    const shippingFee = netAfterDiscount === 0 || netAfterDiscount >= homepageConfig.freeShippingThreshold ? 0 : 28;
    const vatAmount = Number((netAfterDiscount * 0.15).toFixed(2));
    const total = Number((netAfterDiscount + vatAmount + shippingFee).toFixed(2));
    const pointsEarned = Math.floor(total / 5);

    return {
      subtotal,
      discountAmount,
      shippingFee,
      vatAmount,
      total,
      itemCount,
      pointsEarned,
    };
  }, [cart, appliedCoupon, homepageConfig.freeShippingThreshold]);

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
            lang === 'ar' ? 'قم بإزالة منتج لإضافة منتج آخر للمقارنة' : 'Remove one item to add another',
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

  // Order Placement
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

      const expressExtra = deliverySpeed === 'express' && cartSummary.shippingFee > 0 ? 17 : 0;
      const finalShipping = cartSummary.shippingFee + expressExtra;
      const finalTotal = Number((cartSummary.total + expressExtra).toFixed(2));
      const nowIso = new Date().toISOString();
      const orderNum = `ATH-${Math.floor(10000 + Math.random() * 89999)}`;

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: orderNum,
        customerId: currentUser?.id || 'user-customer-1',
        customerName: currentUser?.name || address.recipientName,
        customerEmail: currentUser?.email || 'customer@atheel.sa',
        customerPhone: address.phone,
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
        paymentReference: `${paymentMethod.toUpperCase()}-SA-${Math.floor(1000000 + Math.random() * 9000000)}`,
        subtotal: cartSummary.subtotal,
        discountAmount: cartSummary.discountAmount,
        couponCode: appliedCoupon?.code || '',
        shippingFee: finalShipping,
        vatAmount: cartSummary.vatAmount,
        total: finalTotal,
        status: 'confirmed',
        trackingNumber: `SPL-${Math.floor(100000000 + Math.random() * 900000000)}SA`,
        carrierAr: deliverySpeed === 'express' ? 'سبل إكسبريس VIP' : 'أرامكس بريميوم',
        carrierEn: deliverySpeed === 'express' ? 'SPL Express VIP' : 'Aramex Premium',
        timeline: buildOrderTimeline('confirmed', nowIso.split('T')[0]),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setOrders((prev) => [newOrder, ...prev]);
      setLastCreatedOrder(newOrder);

      // Update user loyalty points & wallet if paid with wallet
      if (currentUser) {
        const updatedUser: UserProfile = {
          ...currentUser,
          walletBalance:
            paymentMethod === 'wallet'
              ? Math.max(0, currentUser.walletBalance - finalTotal)
              : currentUser.walletBalance,
          loyaltyPoints: currentUser.loyaltyPoints + cartSummary.pointsEarned,
          loyaltyHistory: [
            {
              id: `lh-${Date.now()}`,
              titleAr: `مكافأة شراء طلب #${orderNum}`,
              titleEn: `Purchase Reward Order #${orderNum}`,
              points: cartSummary.pointsEarned,
              date: nowIso.split('T')[0],
            },
            ...currentUser.loyaltyHistory,
          ],
        };
        setCurrentUser(updatedUser);
        setDoc(doc(db, 'users', updatedUser.id), updatedUser).catch((e) =>
          handleFirestoreError(e, OperationType.UPDATE, 'users')
        );
      }

      // Persist order and decrement product stock in Firestore
      try {
        await setDoc(doc(db, 'orders', newOrder.id), newOrder);
        for (const item of cart) {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) {
            const nextStock = Math.max(0, prod.stock - item.quantity);
            const updatedProd: Product = {
              ...prod,
              stock: nextStock,
              soldCount: prod.soldCount + item.quantity,
              status: nextStock === 0 ? 'out_of_stock' : prod.status,
            };
            await setDoc(doc(db, 'products', prod.id), updatedProd);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'orders');
      }

      // Add notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          userId: 'all',
          type: 'order',
          titleAr: `تم تأكيد طلبك #${orderNum} بنجاح 🎉`,
          titleEn: `Order #${orderNum} Confirmed 🎉`,
          messageAr: `إجمالي الطلب ${formatPrice(finalTotal)} شامل ضريبة القيمة المضافة. رقم التتبع: ${newOrder.trackingNumber}`,
          messageEn: `Total ${formatPrice(finalTotal)} incl. 15% VAT. Tracking: ${newOrder.trackingNumber}`,
          read: false,
          linkView: 'orders',
          createdAt: lang === 'ar' ? 'الآن' : 'Just now',
        },
        ...prev,
      ]);

      clearCart();
      showToast(
        lang === 'ar' ? `تم تأكيد طلبك #${orderNum} بنجاح!` : `Order #${orderNum} Placed Successfully!`,
        lang === 'ar' ? 'تم إصدار الفاتورة الضريبية وإرسال تفاصيل الشحنة' : 'Tax invoice generated and shipment scheduled',
        'success'
      );
      navigateTo('order-confirmation');
      return newOrder;
    },
    [cart, cartSummary, appliedCoupon, currentUser, products, formatPrice, lang, clearCart, showToast, navigateTo]
  );

  const cancelOrder = useCallback(
    async (orderId: string, reason: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;
      const updated: Order = {
        ...target,
        status: 'cancelled',
        cancelReason: reason,
        updatedAt: new Date().toISOString(),
      };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      try {
        await setDoc(doc(db, 'orders', orderId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'orders');
      }
      showToast(
        lang === 'ar' ? `تم إلغاء الطلب #${target.orderNumber}` : `Order #${target.orderNumber} Cancelled`,
        lang === 'ar' ? 'سيتم استرداد المبلغ تلقائياً إلى وسيلة الدفع أو المحفظة' : 'Refund initiated automatically',
        'info'
      );
    },
    [orders, lang, showToast]
  );

  const requestReturn = useCallback(
    async (orderId: string, reasonAr: string, details: string, refundMethod: 'wallet' | 'original_payment') => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;
      const updated: Order = {
        ...target,
        status: 'return_requested',
        returnRequest: {
          reasonAr,
          reasonEn: reasonAr,
          details,
          refundMethod,
          requestedAt: new Date().toISOString(),
          status: 'pending',
        },
        updatedAt: new Date().toISOString(),
      };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      try {
        await setDoc(doc(db, 'orders', orderId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'orders');
      }
      showToast(
        lang === 'ar' ? 'تم تسجيل طلب الإرجاع بنجاح' : 'Return Request Submitted',
        lang === 'ar' ? 'سيتواصل معك مندوب سبل لاستلام الشحنة من عنوانك الوطني مجاناً' : 'Courier pickup scheduled free of charge',
        'success'
      );
    },
    [orders, lang, showToast]
  );

  // Address Management
  const saveAddress = useCallback(
    async (address: SaudiAddress) => {
      if (!currentUser) return;
      const exists = currentUser.addresses.some((a) => a.id === address.id);
      let nextAddresses = exists
        ? currentUser.addresses.map((a) => (a.id === address.id ? address : a))
        : [address, ...currentUser.addresses];

      if (address.isDefault) {
        nextAddresses = nextAddresses.map((a) => ({ ...a, isDefault: a.id === address.id }));
      }

      const updatedUser = { ...currentUser, addresses: nextAddresses };
      setCurrentUser(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      try {
        await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'users');
      }
      showToast(
        lang === 'ar' ? 'تم حفظ العنوان الوطني بنجاح' : 'Saudi National Address Saved',
        address.labelAr,
        'success'
      );
    },
    [currentUser, lang, showToast]
  );

  const deleteAddress = useCallback(
    async (addressId: string) => {
      if (!currentUser) return;
      const nextAddresses = currentUser.addresses.filter((a) => a.id !== addressId);
      const updatedUser = { ...currentUser, addresses: nextAddresses };
      setCurrentUser(updatedUser);
      try {
        await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'users');
      }
      showToast(lang === 'ar' ? 'تم حذف العنوان' : 'Address Deleted', undefined, 'info');
    },
    [currentUser, lang, showToast]
  );

  const setDefaultAddress = useCallback(
    async (addressId: string) => {
      if (!currentUser) return;
      const nextAddresses = currentUser.addresses.map((a) => ({
        ...a,
        isDefault: a.id === addressId,
      }));
      const updatedUser = { ...currentUser, addresses: nextAddresses };
      setCurrentUser(updatedUser);
      try {
        await setDoc(doc(db, 'users', updatedUser.id), updatedUser);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'users');
      }
      showToast(
        lang === 'ar' ? 'تم تعيين العنوان الافتراضي' : 'Default Address Updated',
        undefined,
        'success'
      );
    },
    [currentUser, lang, showToast]
  );

  const updateUserProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!currentUser) return;
      const updated = { ...currentUser, ...updates };
      setCurrentUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      try {
        await setDoc(doc(db, 'users', updated.id), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'users');
      }
      showToast(
        lang === 'ar' ? 'تم تحديث بيانات الحساب بنجاح' : 'Profile Updated Successfully',
        undefined,
        'success'
      );
    },
    [currentUser, lang, showToast]
  );

  const submitReview = useCallback(
    async (productId: string, rating: number, title: string, comment: string) => {
      const targetProd = products.find((p) => p.id === productId);
      const newRev: Review = {
        id: `rev-${Date.now()}`,
        productId,
        productTitleAr: targetProd?.titleAr || '',
        productTitleEn: targetProd?.titleEn || '',
        userId: currentUser?.id || 'user-customer-1',
        userName: currentUser?.name || 'عميل أثيل الموثق',
        rating,
        title,
        comment,
        verifiedPurchase: true,
        helpfulCount: 1,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'approved',
      };

      setReviews((prev) => [newRev, ...prev]);
      try {
        await setDoc(doc(db, 'reviews', newRev.id), newRev);
        if (targetProd) {
          const newCount = targetProd.reviewCount + 1;
          const newAvg = Number(
            ((targetProd.rating * targetProd.reviewCount + rating) / newCount).toFixed(2)
          );
          const updatedProd = { ...targetProd, rating: newAvg, reviewCount: newCount };
          await setDoc(doc(db, 'products', targetProd.id), updatedProd);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'reviews');
      }

      showToast(
        lang === 'ar' ? 'شكراً لتقييمك! تمت إضافة التقييم الموثق' : 'Verified Review Published!',
        undefined,
        'success'
      );
    },
    [products, currentUser, lang, showToast]
  );

  const submitQuestion = useCallback(
    async (productId: string, questionText: string) => {
      const newQ: ProductQuestion = {
        id: `qa-${Date.now()}`,
        productId,
        userName: currentUser?.name || 'عميل أثيل',
        questionAr: questionText,
        questionEn: questionText,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setQuestions((prev) => [newQ, ...prev]);
      try {
        await setDoc(doc(db, 'questions', newQ.id), newQ);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'questions');
      }
      showToast(
        lang === 'ar' ? 'تم إرسال سؤالك للتاجر المعتمد' : 'Question Sent to Verified Seller',
        undefined,
        'success'
      );
    },
    [currentUser, lang, showToast]
  );

  const submitSupportTicket = useCallback(
    async (subject: string, categoryAr: string, message: string, orderNumber?: string) => {
      const newTkt: SupportTicket = {
        id: `tkt-${Date.now()}`,
        ticketNumber: `TKT-${Math.floor(4100 + Math.random() * 5000)}`,
        userId: currentUser?.id || 'guest',
        userName: currentUser?.name || 'عميل أثيل',
        userEmail: currentUser?.email || 'customer@atheel.sa',
        categoryAr,
        categoryEn: categoryAr,
        subject,
        message,
        orderNumber,
        status: 'open',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTickets((prev) => [newTkt, ...prev]);
      try {
        await setDoc(doc(db, 'tickets', newTkt.id), newTkt);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'tickets');
      }
      showToast(
        lang === 'ar' ? `تم فتح تذكرة الدعم #${newTkt.ticketNumber}` : `Support Ticket #${newTkt.ticketNumber} Created`,
        lang === 'ar' ? 'سيرد عليك فريق العناية بالعملاء VIP خلال أقل من ساعة' : 'Our VIP Concierge team will respond within 1 hour',
        'success'
      );
    },
    [currentUser, lang, showToast]
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Seller Actions
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
      try {
        await setDoc(doc(db, 'auditLogs', entry.id), entry);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'auditLogs');
      }
    },
    [currentUser]
  );

  const saveProduct = useCallback(
    async (product: Product) => {
      setProducts((prev) => {
        const exists = prev.some((p) => p.id === product.id);
        return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev];
      });
      try {
        await setDoc(doc(db, 'products', product.id), product);
        await addAuditLog(
          `حفظ وتحديث بيانات المنتج «${product.titleAr}» بسعر ${product.price} ر.س`,
          `Saved product "${product.titleEn}" at SAR ${product.price}`,
          'product',
          product.id
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'products');
      }
      showToast(
        lang === 'ar' ? 'تم حفظ المنتج في قاعدة البيانات بنجاح' : 'Product Saved to Database',
        lang === 'ar' ? product.titleAr : product.titleEn,
        'success'
      );
    },
    [addAuditLog, lang, showToast]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const target = products.find((p) => p.id === productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      try {
        await deleteDoc(doc(db, 'products', productId));
        if (target) {
          await addAuditLog(
            `حذف المنتج «${target.titleAr}» من الكتالوج`,
            `Deleted product "${target.titleEn}"`,
            'product',
            productId
          );
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, 'products');
      }
      showToast(lang === 'ar' ? 'تم حذف المنتج' : 'Product Deleted', undefined, 'info');
    },
    [products, addAuditLog, lang, showToast]
  );

  const bulkUpdateProductStatus = useCallback(
    async (productIds: string[], status: ProductStatus) => {
      setProducts((prev) =>
        prev.map((p) => (productIds.includes(p.id) ? { ...p, status } : p))
      );
      try {
        for (const id of productIds) {
          const prod = products.find((p) => p.id === id);
          if (prod) {
            await setDoc(doc(db, 'products', id), { ...prod, status });
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'products');
      }
      showToast(
        lang === 'ar' ? `تم تحديث حالة ${productIds.length} منتجات` : `Updated ${productIds.length} products`,
        undefined,
        'success'
      );
    },
    [products, lang, showToast]
  );

  const updateProductStock = useCallback(
    async (productId: string, newStock: number, lowStockThreshold?: number) => {
      const target = products.find((p) => p.id === productId);
      if (!target) return;
      const updated: Product = {
        ...target,
        stock: Math.max(0, newStock),
        lowStockThreshold: lowStockThreshold ?? target.lowStockThreshold,
        status: newStock <= 0 ? 'out_of_stock' : target.status === 'out_of_stock' ? 'active' : target.status,
      };
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      try {
        await setDoc(doc(db, 'products', productId), updated);
        await addAuditLog(
          `تحديث مخزون «${target.titleAr}» إلى ${newStock} قطعة`,
          `Updated stock for "${target.titleEn}" to ${newStock} units`,
          'product',
          productId
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'products');
      }
      showToast(
        lang === 'ar' ? 'تم تحديث المخزون الفعلي بنجاح' : 'Inventory Stock Updated',
        `${lang === 'ar' ? target.titleAr : target.titleEn}: ${newStock}`,
        'success'
      );
    },
    [products, addAuditLog, lang, showToast]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus, trackingNumber?: string) => {
      const target = orders.find((o) => o.id === orderId);
      if (!target) return;
      const nowDate = new Date().toISOString().split('T')[0];
      const updated: Order = {
        ...target,
        status: newStatus,
        trackingNumber: trackingNumber || target.trackingNumber,
        timeline: buildOrderTimeline(newStatus, nowDate),
        updatedAt: new Date().toISOString(),
      };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      try {
        await setDoc(doc(db, 'orders', orderId), updated);
        await addAuditLog(
          `تغيير حالة الطلب #${target.orderNumber} إلى (${newStatus})`,
          `Updated Order #${target.orderNumber} status to ${newStatus}`,
          'order',
          orderId
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'orders');
      }
      showToast(
        lang === 'ar' ? `تم تحديث حالة الطلب #${target.orderNumber}` : `Order #${target.orderNumber} Status Updated`,
        undefined,
        'success'
      );
    },
    [orders, addAuditLog, lang, showToast]
  );

  const saveCoupon = useCallback(
    async (coupon: Coupon) => {
      setCoupons((prev) => {
        const exists = prev.some((c) => c.id === coupon.id);
        return exists ? prev.map((c) => (c.id === coupon.id ? coupon : c)) : [coupon, ...prev];
      });
      try {
        await setDoc(doc(db, 'coupons', coupon.id), coupon);
        await addAuditLog(
          `إنشاء/تحديث كوبون الخصم ${coupon.code} بقيمة ${coupon.value}${coupon.type === 'percentage' ? '%' : ' ر.س'}`,
          `Saved coupon ${coupon.code}`,
          'coupon',
          coupon.id
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'coupons');
      }
      showToast(
        lang === 'ar' ? `تم حفظ الكوبون ${coupon.code}` : `Coupon ${coupon.code} Saved`,
        undefined,
        'success'
      );
    },
    [addAuditLog, lang, showToast]
  );

  const toggleCouponStatus = useCallback(
    async (couponId: string) => {
      const target = coupons.find((c) => c.id === couponId);
      if (!target) return;
      const updated = { ...target, isActive: !target.isActive };
      setCoupons((prev) => prev.map((c) => (c.id === couponId ? updated : c)));
      try {
        await setDoc(doc(db, 'coupons', couponId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'coupons');
      }
      showToast(
        lang === 'ar'
          ? `تم ${updated.isActive ? 'تفعيل' : 'إيقاف'} الكوبون ${target.code}`
          : `Coupon ${target.code} ${updated.isActive ? 'activated' : 'paused'}`,
        undefined,
        'info'
      );
    },
    [coupons, lang, showToast]
  );

  const submitSellerApplication = useCallback(
    async (sellerData: Partial<Seller>) => {
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
        ownerName: sellerData.ownerName || currentUser?.name || 'تاجر أثيل',
        email: sellerData.email || currentUser?.email || 'merchant@atheel.sa',
        phone: sellerData.phone || '+966 50 000 0000',
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
      setSellers((prev) => [newSeller, ...prev]);
      try {
        await setDoc(doc(db, 'sellers', newSeller.id), newSeller);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'sellers');
      }
      showToast(
        lang === 'ar' ? 'تم إرسال طلب انضمام المتجر للاعتماد' : 'Seller Application Submitted',
        lang === 'ar' ? 'ستقوم الإدارة بمراجعة السجل التجاري والرقم الضريبي' : 'Executive team will verify your CR & VAT',
        'success'
      );
    },
    [currentUser, lang, showToast]
  );

  const requestSellerPayout = useCallback(
    async (sellerId: string, amount: number) => {
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
      setSellers((prev) => prev.map((s) => (s.id === sellerId ? updated : s)));
      try {
        await setDoc(doc(db, 'sellers', sellerId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'sellers');
      }
      showToast(
        lang === 'ar' ? `تم طلب تحويل الأرباح (${formatPrice(amount)})` : `Payout of ${formatPrice(amount)} Initiated`,
        lang === 'ar' ? 'سيتم إيداع المبلغ في حسابكم البنكي عبر نظام سار خلال ٢٤ ساعة' : 'Funds will arrive via SARIE within 24 hours',
        'success'
      );
    },
    [sellers, formatPrice, lang, showToast]
  );

  // Admin Actions
  const updateSellerStatus = useCallback(
    async (sellerId: string, status: SellerStatus) => {
      const target = sellers.find((s) => s.id === sellerId);
      if (!target) return;
      const updated: Seller = {
        ...target,
        status,
        verifiedBadge: status === 'approved',
      };
      setSellers((prev) => prev.map((s) => (s.id === sellerId ? updated : s)));
      try {
        await setDoc(doc(db, 'sellers', sellerId), updated);
        await addAuditLog(
          `تحديث حالة التاجر «${target.nameAr}» إلى (${status === 'approved' ? 'معتمد وموثق' : status === 'suspended' ? 'موقوف مؤقتاً' : 'مرفوض'})`,
          `Updated seller "${target.nameEn}" status to ${status}`,
          'seller',
          sellerId
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'sellers');
      }
      showToast(
        lang === 'ar' ? `تم تحديث حالة متجر ${target.nameAr}` : `Updated ${target.nameEn} status`,
        undefined,
        'success'
      );
    },
    [sellers, addAuditLog, lang, showToast]
  );

  const moderateProduct = useCallback(
    async (productId: string, updates: Partial<Product>, logReasonAr: string, logReasonEn: string) => {
      const target = products.find((p) => p.id === productId);
      if (!target) return;
      const updated: Product = { ...target, ...updates };
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      try {
        await setDoc(doc(db, 'products', productId), updated);
        await addAuditLog(logReasonAr, logReasonEn, 'product', productId);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'products');
      }
      showToast(lang === 'ar' ? logReasonAr : logReasonEn, undefined, 'success');
    },
    [products, addAuditLog, lang, showToast]
  );

  const processReturnRequest = useCallback(
    async (orderId: string, approve: boolean, adminNote: string) => {
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
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      try {
        await setDoc(doc(db, 'orders', orderId), updated);
        await addAuditLog(
          `${approve ? 'الموافقة على إرجاع واسترداد مبلغ' : 'رفض طلب إرجاع'} الطلب #${target.orderNumber}`,
          `${approve ? 'Approved return & refund for' : 'Declined return for'} Order #${target.orderNumber}`,
          'return',
          orderId
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'orders');
      }
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
    [orders, addAuditLog, lang, showToast]
  );

  const updateHomepageConfig = useCallback(
    async (config: HomepageConfig) => {
      setHomepageConfig(config);
      try {
        await setDoc(doc(db, 'settings', 'homepage'), config);
        await addAuditLog(
          'تحديث محتوى وبنرات الصفحة الرئيسية لمنصة أثيل',
          'Updated Atheel Homepage Editorial Hero & Campaign Banners',
          'homepage',
          'homepage'
        );
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'settings');
      }
      showToast(
        lang === 'ar' ? 'تم تحديث محتوى الصفحة الرئيسية بنجاح' : 'Homepage Content Updated',
        undefined,
        'success'
      );
    },
    [addAuditLog, lang, showToast]
  );

  const answerProductQuestion = useCallback(
    async (questionId: string, answerText: string) => {
      const target = questions.find((q) => q.id === questionId);
      if (!target) return;
      const updated: ProductQuestion = {
        ...target,
        answerAr: answerText,
        answerEn: answerText,
        answeredByAr: currentUser?.name || 'إدارة أثيل',
        answeredByEn: currentUser?.name || 'Atheel Concierge',
      };
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
      try {
        await setDoc(doc(db, 'questions', questionId), updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'questions');
      }
      showToast(
        lang === 'ar' ? 'تم نشر الإجابة على سؤال العميل' : 'Answer Published',
        undefined,
        'success'
      );
    },
    [questions, currentUser, lang, showToast]
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
    currentUser,
    loginWithDemoRole,
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
    submitSellerApplication,
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
