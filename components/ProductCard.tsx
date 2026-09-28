'use client';

import React, { useState } from 'react';
import {
  Heart,
  ShoppingBag,
  Star,
  ArrowLeftRight,
  ShieldCheck,
  Zap,
  Eye,
  Check,
} from 'lucide-react';
import { Product } from '../lib/types';
import { useMarketplace } from '../context/MarketplaceContext';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

export function ProductCard({ product, compact = false }: ProductCardProps) {
  const {
    lang,
    t,
    formatPrice,
    navigateTo,
    addToCart,
    wishlistIds,
    toggleWishlist,
    compareIds,
    toggleCompare,
  } = useMarketplace();

  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isWishlisted = wishlistIds.includes(product.id);
  const isCompared = compareIds.includes(product.id);

  const fallbackImg =
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <div
      onClick={() => navigateTo('product', { productId: product.id })}
      className="group relative flex flex-col bg-white rounded-xl border border-[#E6E0D6] hover:border-[#C59B27]/60 transition-all duration-300 hover:shadow-[0_14px_34px_-12px_rgba(20,20,19,0.09)] overflow-hidden cursor-pointer"
    >
      {/* Image Container */}
      <div className={`relative w-full ${compact ? 'aspect-square' : 'aspect-[4/4.4]'} bg-[#F6F3EE] overflow-hidden`}>
        <img
          src={imgError ? fallbackImg : product.images[0] || fallbackImg}
          alt={lang === 'ar' ? product.titleAr : product.titleEn}
          onError={() => setImgError(true)}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex flex-col gap-1.5">
            {product.discountPercent > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide bg-[#9E2A2B] text-white shadow-sm font-mono">
                -{product.discountPercent}%
              </span>
            )}
            {product.isFlashDeal && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#141413]/90 text-[#F5E6C8] backdrop-blur-sm">
                <Zap className="w-3 h-3 text-[#C59B27] fill-[#C59B27]" />
                {t('عرض خاطف', 'Flash Deal')}
              </span>
            )}
            {!product.isFlashDeal && product.isNewArrival && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#0B4F3F] text-white">
                {t('وصل حديثاً', 'New')}
              </span>
            )}
          </div>

          {/* Floating Quick Buttons */}
          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              aria-label={t('إضافة للمفضلة', 'Add to Wishlist')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                isWishlisted
                  ? 'bg-[#9E2A2B] text-white'
                  : 'bg-white/90 hover:bg-white text-[#141413]'
              }`}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCompare(product.id);
              }}
              aria-label={t('مقارنة المنتج', 'Compare Product')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                isCompared
                  ? 'bg-[#0B4F3F] text-white'
                  : 'bg-white/90 hover:bg-white text-[#141413] opacity-0 group-hover:opacity-100'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Low Stock Warning Pill */}
        {product.stock > 0 && product.stock <= product.lowStockThreshold && (
          <div className="absolute bottom-2.5 start-3 px-2.5 py-0.5 rounded bg-amber-950/85 text-amber-200 text-[11px] font-medium backdrop-blur-sm">
            {t(`متبقي ${product.stock} قطع فقط`, `Only ${product.stock} left`)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 justify-between gap-3">
        <div>
          {/* Brand & Verified Boutique Row */}
          <div className="flex items-center justify-between gap-2 text-xs text-[#8C857B] mb-1">
            <span className="font-semibold text-[#0B4F3F] truncate">
              {lang === 'ar' ? product.brandNameAr : product.brandNameEn}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#57534E] truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C59B27] shrink-0" />
              <span className="truncate">
                {lang === 'ar' ? product.sellerNameAr : product.sellerNameEn}
              </span>
            </span>
          </div>

          {/* Product Title */}
          <h3 className="text-sm font-semibold text-[#141413] group-hover:text-[#0B4F3F] transition-colors line-clamp-2 leading-snug min-h-[2.5rem]">
            {lang === 'ar' ? product.titleAr : product.titleEn}
          </h3>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FBF7EC] border border-[#E6E0D6]">
              <Star className="w-3.5 h-3.5 text-[#B8860B] fill-[#B8860B]" />
              <span className="text-xs font-bold text-[#141413] font-mono">{product.rating}</span>
            </div>
            <span className="text-xs text-[#8C857B]">
              ({product.reviewCount} {t('تقييم', 'reviews')})
            </span>
          </div>
        </div>

        {/* Price & Action Footer */}
        <div className="pt-2.5 border-t border-[#F3EFEA] flex items-end justify-between gap-2">
          <div>
            {product.originalPrice > product.price && (
              <div className="text-xs text-[#8C857B] line-through font-mono">
                {formatPrice(product.originalPrice)}
              </div>
            )}
            <div className="text-base font-bold text-[#141413] font-mono tracking-tight">
              {formatPrice(product.price)}
            </div>
            <div className="text-[10px] text-[#8C857B]">
              {t('شامل ضريبة القيمة المضافة ١٥٪', 'Incl. 15% VAT')}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigateTo('product', { productId: product.id });
              }}
              className="p-2.5 rounded-lg border border-[#E6E0D6] text-[#57534E] hover:text-[#141413] hover:bg-[#F3EFEA] transition-colors"
              title={t('عرض التفاصيل', 'View Details')}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                justAdded
                  ? 'bg-[#15803D] text-white'
                  : product.stock <= 0
                  ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                  : 'bg-[#0B4F3F] hover:bg-[#083B2F] text-white shadow-sm'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{t('تمت الإضافة', 'Added')}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t('أضف للسلة', 'Add')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
