export type Language = 'ar' | 'en';
export type UserRole = 'customer' | 'seller' | 'admin';

export interface Subcategory {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  iconName: string;
  image: string;
  featuredBannerAr?: string;
  featuredBannerEn?: string;
  subcategories: Subcategory[];
}

export interface Brand {
  id: string;
  nameAr: string;
  nameEn: string;
  originAr: string;
  originEn: string;
  categoryIds: string[];
  featured: boolean;
  productCount?: number;
}

export interface ProductVariantOption {
  id: string;
  labelAr: string;
  labelEn: string;
  value: string;
  colorHex?: string;
  priceDelta?: number;
  inStock: boolean;
}

export interface ProductVariantGroup {
  id: string;
  nameAr: string;
  nameEn: string;
  type: 'color' | 'size' | 'capacity' | 'option';
  options: ProductVariantOption[];
}

export interface ProductSpec {
  keyAr: string;
  keyEn: string;
  valueAr: string;
  valueEn: string;
}

export type ProductStatus = 'active' | 'draft' | 'out_of_stock' | 'suspended';

export interface Product {
  id: string;
  sku: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  categoryId: string;
  subcategoryAr: string;
  subcategoryEn: string;
  brandId: string;
  brandNameAr: string;
  brandNameEn: string;
  sellerId: string;
  sellerNameAr: string;
  sellerNameEn: string;
  sellerRating: number;
  sellerVerified: boolean;
  price: number; // SAR
  originalPrice: number; // SAR before discount
  discountPercent: number;
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  rating: number;
  reviewCount: number;
  soldCount: number;
  images: string[];
  variants: ProductVariantGroup[];
  specifications: ProductSpec[];
  warrantyAr: string;
  warrantyEn: string;
  deliveryEstimateAr: string;
  deliveryEstimateEn: string;
  isFlashDeal: boolean;
  flashDealEndsAt?: string;
  isFeatured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isSeasonal?: boolean;
  frequentlyBoughtWith?: string[];
  createdAt: string;
}

export type SellerStatus = 'approved' | 'pending' | 'suspended' | 'rejected';

export interface SellerPayout {
  id: string;
  amount: number;
  status: 'completed' | 'processing' | 'scheduled';
  bankNameAr: string;
  bankNameEn: string;
  ibanLast4: string;
  date: string;
}

export interface Seller {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  cityAr: string;
  cityEn: string;
  crNumber: string; // السجل التجاري
  vatNumber: string; // الرقم الضريبي
  iban: string;
  ownerName: string;
  email: string;
  phone: string;
  status: SellerStatus;
  verifiedBadge: boolean;
  rating: number;
  reviewCount: number;
  commissionRate: number; // e.g., 12 (%)
  grossSales: number;
  platformCommission: number;
  refundsTotal: number;
  netEarnings: number;
  availableBalance: number;
  nextPayoutDate: string;
  joinedAt: string;
  categories: string[];
  payoutHistory: SellerPayout[];
}

export interface SaudiAddress {
  id: string;
  labelAr: string; // المنزل، العمل، الاستراحة
  labelEn: string;
  recipientName: string;
  phone: string; // +966 5X XXX XXXX
  cityAr: string;
  cityEn: string;
  districtAr: string; // الحي
  streetAr: string; // الشارع
  buildingNumber: string; // رقم المبنى (4 أرقام)
  postalCode: string; // الرمز البريدي (5 أرقام)
  additionalNumber: string; // الرقم الإضافي (4 أرقام)
  landmarkAr: string; // العلامة المميزة
  isDefault: boolean;
}

export interface CartItem {
  id: string; // composite of productId + selectedVariants
  productId: string;
  product: Product;
  quantity: number;
  selectedVariants: Record<string, string>; // groupId -> optionLabelAr/En
  unitPrice: number;
}

export interface Coupon {
  id: string;
  code: string;
  titleAr: string;
  titleEn: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount?: number;
  maxUses: number;
  usedCount: number;
  sellerId?: string; // undefined or 'all' means platform-wide
  sellerNameAr?: string;
  expiresAt: string;
  isActive: boolean;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'return_requested'
  | 'returned';

export interface OrderTimelineEvent {
  status: OrderStatus;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  timestamp: string;
  completed: boolean;
}

export interface OrderItem {
  productId: string;
  sku: string;
  titleAr: string;
  titleEn: string;
  image: string;
  sellerId: string;
  sellerNameAr: string;
  sellerNameEn: string;
  quantity: number;
  unitPrice: number;
  selectedVariants: Record<string, string>;
}

export interface ReturnRequest {
  reasonAr: string;
  reasonEn: string;
  details: string;
  refundMethod: 'wallet' | 'original_payment';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
}

export type PaymentMethodType = 'mada' | 'apple_pay' | 'visa_mastercard' | 'stc_pay' | 'cod' | 'wallet';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sellerIds?: string[];
  productIds: string[];
  items: OrderItem[];
  address: SaudiAddress;
  deliverySpeed: 'express' | 'standard';
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingFee: number;
  vatAmount: number; // 15% VAT
  total: number;
  status: OrderStatus;
  trackingNumber?: string;
  carrierAr?: string;
  carrierEn?: string;
  timeline: OrderTimelineEvent[];
  cancelReason?: string;
  returnRequest?: ReturnRequest;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productTitleAr?: string;
  productTitleEn?: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  verifiedPurchase: boolean;
  verifiedOrderId?: string;
  helpfulCount: number;
  createdAt: string;
  status: 'approved' | 'pending' | 'hidden';
}

export interface ProductQuestion {
  id: string;
  productId: string;
  userName: string;
  questionAr: string;
  questionEn: string;
  answerAr?: string;
  answerEn?: string;
  answeredByAr?: string;
  answeredByEn?: string;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  titleAr: string;
  titleEn: string;
  points: number; // positive earned, negative redeemed
  date: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  sellerId?: string; // if role === 'seller'
  avatar?: string;
  walletBalance: number;
  loyaltyPoints: number;
  loyaltyTier: 'Bronze' | 'Silver' | 'Gold' | 'Royal Obsidian';
  referralCode: string;
  addresses: SaudiAddress[];
  wishlist: string[];
  loyaltyHistory: LoyaltyTransaction[];
  preferences: {
    newsletter: boolean;
    smsAlerts: boolean;
    whatsappUpdates: boolean;
    language: Language;
  };
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // 'all' or specific user/role
  type: 'order' | 'promo' | 'shipping' | 'system' | 'seller';
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  read: boolean;
  linkView?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  categoryAr: string;
  categoryEn: string;
  subject: string;
  message: string;
  orderNumber?: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  replyAr?: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: UserRole;
  actionAr: string;
  actionEn: string;
  targetType: 'seller' | 'product' | 'order' | 'coupon' | 'homepage' | 'return';
  targetId: string;
  createdAt: string;
}

export interface HomepageConfig {
  heroBadgeAr: string;
  heroBadgeEn: string;
  heroTitleAr: string;
  heroTitleEn: string;
  heroSubtitleAr: string;
  heroSubtitleEn: string;
  heroCtaAr: string;
  heroCtaEn: string;
  heroSecondaryBannerTitleAr: string;
  heroSecondaryBannerTitleEn: string;
  seasonalBannerTitleAr: string;
  seasonalBannerTitleEn: string;
  seasonalBannerSubtitleAr: string;
  seasonalBannerSubtitleEn: string;
  flashDealsActive: boolean;
  freeShippingThreshold: number;
}
