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

export interface SellerOperationalSettings {
  defaultCarrier: string;
  sameDayCutoff: string;
  luxuryPackagingEnabled: boolean;
  coldChainEnabled: boolean;
  autoZatcaInvoice: boolean;
  whatsappOrderAlerts: boolean;
  lowStockEmailAlerts: boolean;
  updatedAt?: string;
}

export interface Seller {
  id: string;
  applicantUserId?: string; // UID of the customer who submitted the seller onboarding application
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
  operationalSettings?: SellerOperationalSettings;
}

export interface PublicSellerProfile {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  cityAr: string;
  cityEn: string;
  status: SellerStatus;
  verifiedBadge: boolean;
  rating: number;
  reviewCount: number;
  categories: string[];
  joinedAt: string;
}

export function toPublicSellerProfile(
  seller: Seller | PublicSellerProfile
): PublicSellerProfile {
  return {
    id: seller.id,
    nameAr: seller.nameAr,
    nameEn: seller.nameEn,
    descriptionAr: seller.descriptionAr,
    descriptionEn: seller.descriptionEn,
    cityAr: seller.cityAr,
    cityEn: seller.cityEn,
    status: seller.status,
    verifiedBadge: Boolean(seller.verifiedBadge),
    rating: Number(seller.rating || 0),
    reviewCount: Number(seller.reviewCount || 0),
    categories: Array.isArray(seller.categories) ? [...seller.categories] : [],
    joinedAt: seller.joinedAt || '',
  };
}

export function publicProfileToStorefrontSeller(profile: PublicSellerProfile): Seller {
  return {
    id: profile.id,
    nameAr: profile.nameAr,
    nameEn: profile.nameEn,
    descriptionAr: profile.descriptionAr,
    descriptionEn: profile.descriptionEn,
    cityAr: profile.cityAr,
    cityEn: profile.cityEn,
    crNumber: '',
    vatNumber: '',
    iban: '',
    ownerName: '',
    email: '',
    phone: '',
    status: profile.status,
    verifiedBadge: profile.verifiedBadge,
    rating: profile.rating,
    reviewCount: profile.reviewCount,
    commissionRate: 0,
    grossSales: 0,
    platformCommission: 0,
    refundsTotal: 0,
    netEarnings: 0,
    availableBalance: 0,
    nextPayoutDate: '',
    joinedAt: profile.joinedAt,
    categories: Array.isArray(profile.categories) ? [...profile.categories] : [],
    payoutHistory: [],
  };
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
  refundStatus: 'none' | 'wallet_completed' | 'external_authorized_pending' | 'failed';
  refundAmount?: number;
  refundUpdatedAt?: string;
  adminNote?: string;
  sellerInspectionNote?: string;
  sellerRecommendation?: 'approve_restock' | 'inspect_required' | 'dispute';
  resolvedBy?: string;
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

export type SellerFulfillmentStatus =
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered';

export const SELLER_FULFILLMENT_STATUSES: readonly SellerFulfillmentStatus[] = [
  'confirmed',
  'preparing',
  'shipped',
  'out_for_delivery',
  'delivered',
] as const;

export interface SellerFulfillment {
  id: string; // `${orderId}_${sellerId}`
  orderId: string;
  sellerId: string;
  customerId: string;
  sellerItemProductIds: string[];
  status: SellerFulfillmentStatus;
  trackingNumber: string;
  carrierAr: string;
  carrierEn: string;
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Derives a read-only aggregate OrderStatus from seller-specific fulfillment states.
 * Never pretends a multi-vendor Order is 'delivered' until ALL seller shipments are 'delivered'.
 * Preserves order-level terminal/post-delivery states ('cancelled', 'return_requested', 'returned').
 */
export function deriveAggregateOrderStatus(
  order: Order,
  fulfillments: SellerFulfillment[]
): OrderStatus {
  if (
    order.status === 'cancelled' ||
    order.status === 'return_requested' ||
    order.status === 'returned'
  ) {
    return order.status;
  }

  const orderFulfillments = fulfillments.filter((f) => f.orderId === order.id);
  const itemSellerIds = Array.from(
    new Set(
      order.items
        .map((i) => i.sellerId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    )
  );
  const expectedSellerIds =
    itemSellerIds.length > 0 ? itemSellerIds : order.sellerIds || [];

  if (orderFulfillments.length === 0) {
    // When no fulfillment records exist yet, do not falsely claim 'delivered' or in-transit states
    return order.status === 'placed' ? 'placed' : 'confirmed';
  }

  // Ensure every expected seller in the order is accounted for before claiming full progression
  const statuses: SellerFulfillmentStatus[] = expectedSellerIds.map((sid) => {
    const found = orderFulfillments.find((f) => f.sellerId === sid);
    return found ? found.status : 'confirmed';
  });

  if (statuses.every((s) => s === 'delivered')) {
    return 'delivered';
  }
  if (statuses.every((s) => s === 'out_for_delivery' || s === 'delivered')) {
    return 'out_for_delivery';
  }
  if (statuses.every((s) => s === 'shipped' || s === 'out_for_delivery' || s === 'delivered')) {
    return 'shipped';
  }
  if (
    statuses.some(
      (s) =>
        s === 'preparing' ||
        s === 'shipped' ||
        s === 'out_for_delivery' ||
        s === 'delivered'
    )
  ) {
    return 'preparing';
  }
  return order.status === 'placed' ? 'placed' : 'confirmed';
}

/**
 * UID Privacy Architecture Note:
 * `Review` and `ProductQuestion` store `userId` so Firestore security rules can verify
 * authenticated ownership (`request.resource.data.userId == request.auth.uid`) and enforce
 * immutable author identity on updates. The storefront UI never renders `userId`.
 * However, because Firestore security rules operate at the document level and cannot filter
 * individual fields out of publicly readable documents, `userId` remains readable in the
 * raw Firestore document payload. Full field-level redaction in production requires a trusted
 * backend or Cloud Function maintaining a separate public projection collection.
 */
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
  sellerReplyAr?: string;
  sellerReplyEn?: string;
  sellerReplyAt?: string;
}

export interface ProductQuestion {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  questionAr: string;
  questionEn: string;
  answerAr?: string;
  answerEn?: string;
  answeredByAr?: string;
  answeredByEn?: string;
  answeredAt?: string;
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
  workflowType?: 'support' | 'return_inspection' | 'payout' | 'seller_application_info';
  sellerId?: string;
  relatedOrderId?: string;
  orderId?: string;
  orderNumber?: string;
  payoutAmount?: number;
  ibanLast4?: string;
  treasuryStatus?: 'requested' | 'under_review' | 'approved_for_treasury' | 'rejected' | 'completed';
  returnRecommendation?: 'approve_restock' | 'inspect_required' | 'dispute';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  replyAr?: string;
  replyEn?: string;
  repliedAt?: string;
}

export const ACTIVE_PAYOUT_RESERVATION_STATUSES: ReadonlyArray<
  NonNullable<SupportTicket['treasuryStatus']>
> = ['requested', 'under_review', 'approved_for_treasury'];

/**
 * Calculates a Seller's payout reservation summary from structured `payout` tickets.
 *
 * Tickets with `workflowType === 'payout'` and `treasuryStatus` in
 * `['requested', 'under_review', 'approved_for_treasury']` reserve funds against `availableBalance`.
 * Rejected (`'rejected'`) and backend-completed (`'completed'`) tickets do not reserve pending funds.
 *
 * Architectural Note: Because client-side Firestore cannot enforce a tamper-proof aggregate reservation
 * across arbitrary ticket documents, production-grade atomic payout reservation ultimately requires a
 * trusted backend / Cloud Function transaction service.
 */
export function calculateSellerPayoutReservation(
  seller: Pick<Seller, 'id' | 'availableBalance'>,
  tickets: SupportTicket[]
): {
  availableBalance: number;
  reservedPendingPayoutAmount: number;
  requestableBalance: number;
} {
  const availableBalance = Math.max(0, Number((seller.availableBalance || 0).toFixed(2)));
  const reservedPendingPayoutAmount = Number(
    tickets
      .filter((tkt) => {
        if (tkt.workflowType !== 'payout' || tkt.sellerId !== seller.id) {
          return false;
        }
        const treasuryState = tkt.treasuryStatus || 'requested';
        return (
          treasuryState === 'requested' ||
          treasuryState === 'under_review' ||
          treasuryState === 'approved_for_treasury'
        );
      })
      .reduce((sum, tkt) => sum + Math.max(0, Number(tkt.payoutAmount || 0)), 0)
      .toFixed(2)
  );
  const requestableBalance = Math.max(
    0,
    Number((availableBalance - reservedPendingPayoutAmount).toFixed(2))
  );
  return {
    availableBalance,
    reservedPendingPayoutAmount,
    requestableBalance,
  };
}

/**
 * Maps a payout ticket's `treasuryStatus` deterministically to its synchronized `SupportTicket['status']`:
 * - `requested` -> `open`
 * - `under_review` -> `in_progress`
 * - `approved_for_treasury` -> `in_progress`
 * - `rejected` -> `resolved`
 * - `completed` -> `resolved` (backend-confirmed only in production)
 */
export function getSynchronizedPayoutTicketStatus(
  treasuryStatus?: SupportTicket['treasuryStatus']
): SupportTicket['status'] {
  const state = treasuryStatus || 'requested';
  if (state === 'requested') return 'open';
  if (state === 'under_review' || state === 'approved_for_treasury') return 'in_progress';
  return 'resolved';
}


export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: UserRole;
  actionAr: string;
  actionEn: string;
  targetType:
    | 'seller'
    | 'product'
    | 'order'
    | 'coupon'
    | 'homepage'
    | 'settings'
    | 'return'
    | 'customer'
    | 'ticket'
    | 'review'
    | 'question';
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
  updatedAt?: string;
}

export interface PublicPlatformSettings {
  marketplaceNameAr: string;
  marketplaceNameEn: string;
  supportEmail: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportHoursAr: string;
  supportHoursEn: string;
  defaultLanguage: Language;
  currencyCode: 'SAR';
  vatRatePercent: 15;
  vatInclusivePricing: true;
  freeShippingThreshold: number;
  standardShippingFee: number;
  expressShippingFee: number;
  minimumPayoutAmount: number;
  maintenanceBannerActive: boolean;
  maintenanceBannerAr: string;
  maintenanceBannerEn: string;
  checkoutEnabled: boolean;
  sellerApplicationsEnabled: boolean;
  customerReviewsEnabled: boolean;
  productQuestionsEnabled: boolean;
  updatedAt: string;
}

export interface PrivatePlatformSettings {
  defaultSellerCommissionRate: number;
  payoutSlaBusinessDays: number;
  requireVerifiedBadgeForFeatured: boolean;
  autoApproveVerifiedSellerProducts: boolean;
  returnWindowDays: number;
  allowOriginalPaymentRefunds: boolean;
  lowStockGlobalDefaultThreshold: number;
  internalGovernanceNotesAr: string;
  internalGovernanceNotesEn: string;
  updatedAt: string;
  updatedBy: string;
}

