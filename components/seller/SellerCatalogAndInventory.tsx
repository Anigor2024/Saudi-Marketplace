'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Layers,
  Tag,
  Boxes,
  ArrowUpDown,
  CheckSquare,
  Square,
  RefreshCw,
  ShieldCheck,
  X,
  Image as ImageIcon,
  Sliders,
} from 'lucide-react';
import { useMarketplace } from '@/context/MarketplaceContext';
import {
  Product,
  ProductStatus,
  ProductVariantGroup,
  ProductSpec,
  Seller,
} from '@/lib/types';

interface SellerCatalogProps {
  seller: Seller;
  sellerProducts: Product[];
  mode: 'products' | 'inventory';
}

const LUXURY_IMAGE_PRESETS = [
  {
    labelAr: 'ساعة كرونوغراف فاخرة',
    labelEn: 'Luxury Chronograph Watch',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=85',
  },
  {
    labelAr: 'دهن عود وعطور ملكية',
    labelEn: 'Royal Oud & Perfumery',
    url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=85',
  },
  {
    labelAr: 'هاتف ذكي رائد',
    labelEn: 'Flagship Smartphone',
    url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=85',
  },
  {
    labelAr: 'حاسوب محمول احترافي',
    labelEn: 'Pro Laptop Workstation',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=85',
  },
  {
    labelAr: 'سماعة لاسلكية فاخرة',
    labelEn: 'Wireless Studio Headphones',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85',
  },
  {
    labelAr: 'ماكينة قهوة مختصة',
    labelEn: 'Specialty Espresso Machine',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=85',
  },
];

export default function SellerCatalogAndInventory({
  seller,
  sellerProducts,
  mode,
}: SellerCatalogProps) {
  const {
    lang,
    t,
    formatPrice,
    categories,
    brands,
    saveProduct,
    deleteProduct,
    bulkUpdateProductStatus,
    updateProductStock,
    navigateTo,
  } = useMarketplace();

  // Search, Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_desc' | 'price_asc' | 'stock_asc' | 'sold_desc'>('newest');

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Inventory Inline Edits State
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, number>>({});

  // Product Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalTab, setModalTab] = useState<'basic' | 'pricing' | 'media' | 'variants' | 'specs'>('basic');

  // Form Fields for Add/Edit Modal
  const [formTitleAr, setFormTitleAr] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formDescAr, setFormDescAr] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('electronics');
  const [formSubcategoryAr, setFormSubcategoryAr] = useState('');
  const [formSubcategoryEn, setFormSubcategoryEn] = useState('');
  const [formBrandId, setFormBrandId] = useState('');
  const [formPrice, setFormPrice] = useState<number>(1000);
  const [formOriginalPrice, setFormOriginalPrice] = useState<number>(1200);
  const [formStock, setFormStock] = useState<number>(15);
  const [formThreshold, setFormThreshold] = useState<number>(5);
  const [formStatus, setFormStatus] = useState<ProductStatus>('active');
  const [formWarrantyAr, setFormWarrantyAr] = useState('ضمان الوكيل الرسمي لمدة ٢٤ شهراً في المملكة');
  const [formWarrantyEn, setFormWarrantyEn] = useState('24-Month Official KSA Warranty');
  const [formDeliveryAr, setFormDeliveryAr] = useState('توصيل سريع خلال ٢٤ - ٤٨ ساعة');
  const [formDeliveryEn, setFormDeliveryEn] = useState('Express Delivery in 24-48 Hours');
  const [formIsFlashDeal, setFormIsFlashDeal] = useState(false);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formVariants, setFormVariants] = useState<ProductVariantGroup[]>([]);
  const [formSpecs, setFormSpecs] = useState<ProductSpec[]>([]);

  // Inventory KPIs
  const inventoryStats = useMemo(() => {
    const healthy = sellerProducts.filter((p) => p.stock > p.lowStockThreshold);
    const low = sellerProducts.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    const out = sellerProducts.filter((p) => p.stock <= 0 || p.status === 'out_of_stock');
    const totalUnits = sellerProducts.reduce((sum, p) => sum + Math.max(0, p.stock), 0);
    const totalValuation = sellerProducts.reduce((sum, p) => sum + Math.max(0, p.stock) * p.price, 0);
    return {
      healthyCount: healthy.length,
      lowCount: low.length,
      outCount: out.length,
      totalUnits,
      totalValuation,
    };
  }, [sellerProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return sellerProducts
      .filter((p) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitleAr = p.titleAr.toLowerCase().includes(q);
          const matchTitleEn = p.titleEn.toLowerCase().includes(q);
          const matchSku = p.sku.toLowerCase().includes(q);
          const matchBrand =
            p.brandNameAr.toLowerCase().includes(q) || p.brandNameEn.toLowerCase().includes(q);
          if (!matchTitleAr && !matchTitleEn && !matchSku && !matchBrand) return false;
        }
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
        if (stockFilter === 'low' && !(p.stock > 0 && p.stock <= p.lowStockThreshold)) return false;
        if (stockFilter === 'out' && !(p.stock <= 0 || p.status === 'out_of_stock')) return false;
        if (stockFilter === 'healthy' && !(p.stock > p.lowStockThreshold)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        if (sortBy === 'sold_desc') return b.soldCount - a.soldCount;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [sellerProducts, searchTerm, statusFilter, categoryFilter, stockFilter, sortBy]);

  // Open Modal for New or Existing Product
  const openProductModal = (prod?: Product) => {
    setModalTab('basic');
    if (prod) {
      setEditingProduct(prod);
      setFormTitleAr(prod.titleAr);
      setFormTitleEn(prod.titleEn);
      setFormDescAr(prod.descriptionAr);
      setFormDescEn(prod.descriptionEn);
      setFormSku(prod.sku);
      setFormCategoryId(prod.categoryId);
      setFormSubcategoryAr(prod.subcategoryAr);
      setFormSubcategoryEn(prod.subcategoryEn);
      setFormBrandId(prod.brandId);
      setFormPrice(prod.price);
      setFormOriginalPrice(prod.originalPrice);
      setFormStock(prod.stock);
      setFormThreshold(prod.lowStockThreshold);
      setFormStatus(prod.status === 'suspended' ? 'draft' : prod.status);
      setFormWarrantyAr(prod.warrantyAr);
      setFormWarrantyEn(prod.warrantyEn);
      setFormDeliveryAr(prod.deliveryEstimateAr);
      setFormDeliveryEn(prod.deliveryEstimateEn);
      setFormIsFlashDeal(prod.isFlashDeal);
      setFormImages(prod.images.length > 0 ? [...prod.images] : [LUXURY_IMAGE_PRESETS[0].url]);
      setFormVariants(prod.variants ? JSON.parse(JSON.stringify(prod.variants)) : []);
      setFormSpecs(prod.specifications ? JSON.parse(JSON.stringify(prod.specifications)) : []);
    } else {
      const defaultCat = categories.find((c) => c.id === seller.categories[0]) || categories[0];
      const defaultSub = defaultCat?.subcategories[0];
      const defaultBrand = brands.find((b) => b.categoryIds.includes(defaultCat?.id || '')) || brands[0];
      setEditingProduct(null);
      setFormTitleAr('');
      setFormTitleEn('');
      setFormDescAr('');
      setFormDescEn('');
      setFormSku(`ATH-${Math.floor(100 + Math.random() * 899)}-${Date.now().toString().slice(-3)}`);
      setFormCategoryId(defaultCat?.id || 'electronics');
      setFormSubcategoryAr(defaultSub?.nameAr || 'إصدارات فاخرة');
      setFormSubcategoryEn(defaultSub?.nameEn || 'Luxury Editions');
      setFormBrandId(defaultBrand?.id || 'brand-1');
      setFormPrice(1450);
      setFormOriginalPrice(1750);
      setFormStock(20);
      setFormThreshold(5);
      setFormStatus('active');
      setFormWarrantyAr('ضمان أثيل الذهبي وضمان الوكيل المعتمد لمدة ٢٤ شهراً');
      setFormWarrantyEn('24-Month Official Agent & Atheel Golden Warranty');
      setFormDeliveryAr('شحن مبرد وسريع خلال ٢٤ - ٤٨ ساعة لكافة مدن المملكة');
      setFormDeliveryEn('Express VIP Delivery within 24-48 Hours across KSA');
      setFormIsFlashDeal(false);
      setFormImages([LUXURY_IMAGE_PRESETS[0].url]);
      setFormVariants([
        {
          id: `vg-${Date.now()}`,
          nameAr: 'الإصدار / الخيار',
          nameEn: 'Edition / Option',
          type: 'option',
          options: [
            {
              id: `vo-${Date.now()}-1`,
              labelAr: 'الإصدار الملكي القياسي',
              labelEn: 'Standard Royal Edition',
              value: 'standard',
              priceDelta: 0,
              inStock: true,
            },
          ],
        },
      ]);
      setFormSpecs([
        {
          keyAr: 'بلد المنشأ والأصالة',
          keyEn: 'Origin & Authenticity',
          valueAr: 'أصلي ١٠٠٪ مرفق بشهادة الضمان الموثقة',
          valueEn: '100% Authentic with Verified Certificate',
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleDuplicateProduct = async (prod: Product) => {
    const cloned: Product = {
      ...prod,
      id: `prod-${Date.now()}`,
      sku: `${prod.sku}-COPY`,
      titleAr: `${prod.titleAr} (نسخة)`,
      titleEn: `${prod.titleEn} (Copy)`,
      status: 'draft',
      rating: 0,
      reviewCount: 0,
      soldCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    await saveProduct(cloned);
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleAr.trim() || !formTitleEn.trim()) return;

    const selectedBrand = brands.find((b) => b.id === formBrandId) || brands[0];
    const cleanPrice = Math.max(1, Number(formPrice) || 1);
    const cleanOrig = Math.max(cleanPrice, Number(formOriginalPrice) || cleanPrice);
    const discountPct =
      cleanOrig > cleanPrice ? Math.round(((cleanOrig - cleanPrice) / cleanOrig) * 100) : 0;
    const cleanStock = Math.max(0, Number(formStock) || 0);
    const computedStatus: ProductStatus =
      cleanStock <= 0 ? 'out_of_stock' : formStatus === 'out_of_stock' ? 'active' : formStatus;

    const productPayload: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      sku: formSku.trim() || `ATH-SKU-${Date.now().toString().slice(-4)}`,
      titleAr: formTitleAr.trim(),
      titleEn: formTitleEn.trim(),
      descriptionAr: formDescAr.trim() || formTitleAr.trim(),
      descriptionEn: formDescEn.trim() || formTitleEn.trim(),
      categoryId: formCategoryId,
      subcategoryAr: formSubcategoryAr.trim() || 'مقتنيات فاخرة',
      subcategoryEn: formSubcategoryEn.trim() || 'Luxury Goods',
      brandId: selectedBrand?.id || 'brand-1',
      brandNameAr: selectedBrand?.nameAr || 'علامة معتمدة',
      brandNameEn: selectedBrand?.nameEn || 'Verified Brand',
      sellerId: seller.id,
      sellerNameAr: seller.nameAr,
      sellerNameEn: seller.nameEn,
      sellerRating: seller.rating,
      sellerVerified: seller.verifiedBadge,
      price: cleanPrice,
      originalPrice: cleanOrig,
      discountPercent: discountPct,
      stock: cleanStock,
      lowStockThreshold: Math.max(1, Number(formThreshold) || 5),
      status: computedStatus,
      rating: editingProduct ? editingProduct.rating : 0,
      reviewCount: editingProduct ? editingProduct.reviewCount : 0,
      soldCount: editingProduct ? editingProduct.soldCount : 0,
      images: formImages.length > 0 ? formImages : [LUXURY_IMAGE_PRESETS[0].url],
      variants: formVariants,
      specifications: formSpecs,
      warrantyAr: formWarrantyAr.trim(),
      warrantyEn: formWarrantyEn.trim(),
      deliveryEstimateAr: formDeliveryAr.trim(),
      deliveryEstimateEn: formDeliveryEn.trim(),
      isFlashDeal: formIsFlashDeal,
      flashDealEndsAt: formIsFlashDeal ? '2026-12-31T23:59:59Z' : undefined,
      isFeatured: editingProduct ? editingProduct.isFeatured : false,
      isTrending: editingProduct ? editingProduct.isTrending : false,
      isBestSeller: editingProduct ? editingProduct.isBestSeller : false,
      isNewArrival: editingProduct ? editingProduct.isNewArrival : true,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString().split('T')[0],
    };

    await saveProduct(productPayload);
    setIsModalOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkStatus = async (status: ProductStatus) => {
    if (selectedIds.length === 0) return;
    await bulkUpdateProductStatus(selectedIds, status);
    setSelectedIds([]);
  };

  const handleRestockAllLow = async () => {
    const lowList = sellerProducts.filter((p) => p.stock <= p.lowStockThreshold);
    for (const p of lowList) {
      await updateProductStock(p.id, p.stock + 15, p.lowStockThreshold);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#EBF3F0] text-[#0B4F3F] text-[11px] font-bold">
              {mode === 'inventory'
                ? t('إدارة المخزون والعتبات الذكية', 'Inventory & Stock Control')
                : t('إدارة كتالوج المنتجات', 'Merchant Catalog Management')}
            </span>
            <span className="text-xs text-[#8C857B] font-mono">
              {sellerProducts.length} {t('منتج مسجل', 'SKUs')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#141413] mt-1">
            {mode === 'inventory'
              ? t('مراقبة المستودع والكميات الفورية', 'Live Warehouse Stock & Thresholds')
              : t('كتالوج منتجات المتجر والتسعير الضريبي', 'Store Product Catalog & VAT Pricing')}
          </h2>
          <p className="text-xs text-[#57534E] mt-0.5">
            {mode === 'inventory'
              ? t(
                  'عدّل الكميات المتاحة وحدود التنبيه بانخفاض المخزون مباشرة مع تحديث فوري لحالة التوفر.',
                  'Adjust live unit counts and low-stock thresholds with automatic availability status sync.'
                )
              : t(
                  'جميع الأسعار شاملة ضريبة القيمة المضافة ١٥٪. المقاييس المملوكة للمنصة (التقييمات والمبيعات) محمية تلقائياً.',
                  'All prices include 15% Saudi VAT. Platform-owned metrics (ratings, sold count) are rule-protected.'
                )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {mode === 'inventory' && (inventoryStats.lowCount > 0 || inventoryStats.outCount > 0) && (
            <button
              type="button"
              onClick={handleRestockAllLow}
              className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#C59B27]/50 hover:bg-[#FBF7EC] text-[#141413] text-xs font-bold inline-flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>
                {t('تزويد جميع المنتجات المنخفضة (+١٥ قطعة)', 'Restock All Low/Out SKUs (+15)')}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => openProductModal()}
            className="px-4 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#C59B27]" />
            <span>{t('إضافة منتج جديد للكتالوج', 'Add New Product')}</span>
          </button>
        </div>
      </div>

      {/* Inventory KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStockFilter('all')}
          className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all ${
            stockFilter === 'all' ? 'border-[#0B4F3F] ring-1 ring-[#0B4F3F]/20' : 'border-[#E6E0D6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#57534E]">
              {t('إجمالي وحدات المخزون والقيمة', 'Total Stock Units & Retail Value')}
            </span>
            <Boxes className="w-4 h-4 text-[#0B4F3F]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#141413] mt-2">
            {inventoryStats.totalUnits.toLocaleString()}{' '}
            <span className="text-xs font-normal text-[#8C857B]">{t('قطعة', 'units')}</span>
          </div>
          <div className="text-[11px] text-[#0B4F3F] font-mono font-semibold mt-1">
            {t('القيمة السوقية:', 'Retail Valuation:')} {formatPrice(inventoryStats.totalValuation)}
          </div>
        </div>

        <div
          onClick={() => setStockFilter('healthy')}
          className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all ${
            stockFilter === 'healthy' ? 'border-[#1E6B47] ring-1 ring-[#1E6B47]/20' : 'border-[#E6E0D6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#57534E]">
              {t('منتجات بمخزون وفير وآمن', 'Healthy Stock SKUs')}
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#1E6B47]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#1E6B47] mt-2">
            {inventoryStats.healthyCount}
          </div>
          <div className="text-[11px] text-[#8C857B] mt-1">
            {t('أعلى من حد التنبيه الأدنى', 'Above low-stock threshold')}
          </div>
        </div>

        <div
          onClick={() => setStockFilter('low')}
          className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all ${
            stockFilter === 'low' ? 'border-[#C87D12] ring-1 ring-[#C87D12]/20' : 'border-[#E6E0D6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#57534E]">
              {t('تنبيهات انخفاض المخزون', 'Low Stock Alerts')}
            </span>
            <AlertTriangle className="w-4 h-4 text-[#C87D12]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#C87D12] mt-2">
            {inventoryStats.lowCount}
          </div>
          <div className="text-[11px] text-[#C87D12] font-semibold mt-1">
            {t('تحتاج لإعادة التزويد قريباً', 'Requires replenishment soon')}
          </div>
        </div>

        <div
          onClick={() => setStockFilter('out')}
          className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all ${
            stockFilter === 'out' ? 'border-[#9E2A2B] ring-1 ring-[#9E2A2B]/20' : 'border-[#E6E0D6]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#57534E]">
              {t('منتجات نفدت من المخزون', 'Out-of-Stock SKUs')}
            </span>
            <XCircle className="w-4 h-4 text-[#9E2A2B]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#9E2A2B] mt-2">
            {inventoryStats.outCount}
          </div>
          <div className="text-[11px] text-[#8C857B] mt-1">
            {t('متوقفة عن البيع مؤقتاً حتى التزويد', 'Hidden from checkout until restocked')}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#8C857B] absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t(
                'ابحث باسم المنتج، رمز SKU، أو العلامة التجارية...',
                'Search by product title, SKU, or brand...'
              )}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs focus:outline-none focus:border-[#0B4F3F]"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ProductStatus)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع الحالات', 'All Statuses')}</option>
              <option value="active">{t('نشط (Active)', 'Active')}</option>
              <option value="draft">{t('مسودة (Draft)', 'Draft')}</option>
              <option value="out_of_stock">{t('نفد المخزون (Out of Stock)', 'Out of Stock')}</option>
              <option value="suspended">{t('موقوف إدارياً (Suspended)', 'Suspended')}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="all">{t('جميع الأقسام', 'All Categories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {lang === 'ar' ? cat.nameAr : cat.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'newest' | 'price_desc' | 'price_asc' | 'stock_asc' | 'sold_desc'
                )
              }
              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold text-[#141413]"
            >
              <option value="newest">{t('الأحدث إضافة', 'Newest First')}</option>
              <option value="sold_desc">{t('الأعلى مبيعاً', 'Best Selling')}</option>
              <option value="stock_asc">{t('الأقل مخزوناً أولاً', 'Lowest Stock First')}</option>
              <option value="price_desc">{t('السعر: من الأعلى للأقل', 'Price: High to Low')}</option>
              <option value="price_asc">{t('السعر: من الأقل للأعلى', 'Price: Low to High')}</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar when items are selected */}
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-xl bg-[#EBF3F0] border border-[#0B4F3F]/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B4F3F]">
              <CheckSquare className="w-4 h-4" />
              <span>
                {t(
                  `تم تحديد ${selectedIds.length} منتجات لتنفيذ إجراء جماعي:`,
                  `${selectedIds.length} SKUs selected for bulk operation:`
                )}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkStatus('active')}
                className="px-3 py-1.5 rounded-lg bg-[#1E6B47] text-white text-xs font-bold"
              >
                {t('تفعيل المحدد (Active)', 'Set Active')}
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('draft')}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E6E0D6] text-[#141413] text-xs font-bold"
              >
                {t('تحويل لمسودة (Draft)', 'Set Draft')}
              </button>
              <button
                type="button"
                onClick={() => handleBulkStatus('out_of_stock')}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold"
              >
                {t('تعليم كنافد المخزون', 'Mark Out of Stock')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#57534E] hover:underline"
              >
                {t('إلغاء التحديد', 'Clear')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products / Inventory Table */}
      <div className="bg-white rounded-2xl border border-[#E6E0D6] overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-[#C59B27] mx-auto" />
            <h3 className="text-base font-bold text-[#141413]">
              {t('لا توجد منتجات مطابقة لمعايير البحث', 'No products match your filter criteria')}
            </h3>
            <p className="text-xs text-[#57534E]">
              {t(
                'جرب تغيير الفلاتر أو أضف منتجاً جديداً إلى كتالوج متجرك.',
                'Try resetting filters or add a new product to your boutique catalog.'
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
                setStockFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold text-[#0B4F3F]"
            >
              {t('إعادة ضبط الفلاتر', 'Reset Filters')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6E0D6] uppercase">
                <tr>
                  <th className="py-3.5 px-4 text-start w-10">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[#0B4F3F] flex items-center"
                    >
                      {selectedIds.length === filteredProducts.length &&
                      filteredProducts.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8C857B]" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4 text-start">{t('المنتج ورمز SKU', 'Product & SKU')}</th>
                  <th className="py-3.5 px-4 text-start">{t('القسم والعلامة', 'Category & Brand')}</th>
                  <th className="py-3.5 px-4 text-start">{t('السعر وصافي التاجر', 'Price & Net')}</th>
                  <th className="py-3.5 px-4 text-start">
                    {mode === 'inventory'
                      ? t('التحكم المباشر بالمخزون والعتبة', 'Live Stock & Threshold Control')
                      : t('المخزون والمبيعات', 'Stock & Sold')}
                  </th>
                  <th className="py-3.5 px-4 text-start">{t('الحالة', 'Status')}</th>
                  <th className="py-3.5 px-4 text-end">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EFEA]">
                {filteredProducts.map((prod) => {
                  const isLow = prod.stock > 0 && prod.stock <= prod.lowStockThreshold;
                  const isOut = prod.stock <= 0 || prod.status === 'out_of_stock';
                  const currentDraftStock = stockDrafts[prod.id] ?? prod.stock;
                  const currentDraftThreshold = thresholdDrafts[prod.id] ?? prod.lowStockThreshold;
                  const netAfterComm = Math.round(prod.price * (1 - seller.commissionRate / 100));

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-[#FAF8F5]/60 transition-colors ${
                        selectedIds.includes(prod.id) ? 'bg-[#EBF3F0]/30' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(prod.id)}
                          className="text-[#0B4F3F] flex items-center"
                        >
                          {selectedIds.includes(prod.id) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-[#8C857B]" />
                          )}
                        </button>
                      </td>

                      {/* Product & SKU */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 max-w-xs">
                          <img
                            src={prod.images[0]}
                            alt={lang === 'ar' ? prod.titleAr : prod.titleEn}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover bg-[#F3EFEA] border border-[#E6E0D6] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[#141413] truncate">
                              {lang === 'ar' ? prod.titleAr : prod.titleEn}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] text-[#57534E]">
                                {prod.sku}
                              </span>
                              {prod.isFlashDeal && (
                                <span className="px-2 py-0.5 rounded bg-[#FBF7EC] text-[#B8860B] text-[10px] font-bold">
                                  {t('عرض خاطف ⚡', 'Flash Deal ⚡')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-[#141413]">
                          {lang === 'ar' ? prod.brandNameAr : prod.brandNameEn}
                        </div>
                        <div className="text-[11px] text-[#8C857B] mt-0.5">
                          {lang === 'ar' ? prod.subcategoryAr : prod.subcategoryEn}
                        </div>
                      </td>

                      {/* Price & Net Seller Proceeds */}
                      <td className="py-4 px-4">
                        <div className="font-mono font-bold text-[#0B4F3F] text-sm">
                          {formatPrice(prod.price)}
                        </div>
                        {prod.originalPrice > prod.price && (
                          <div className="text-[11px] text-[#8C857B] line-through font-mono">
                            {formatPrice(prod.originalPrice)} (-{prod.discountPercent}%)
                          </div>
                        )}
                        <div className="text-[10px] text-[#57534E] mt-0.5">
                          {t('صافي التاجر:', 'Net after comm:')} {formatPrice(netAfterComm)}
                        </div>
                      </td>

                      {/* Stock & Threshold / Inventory Controls */}
                      <td className="py-4 px-4">
                        {mode === 'inventory' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setStockDrafts((prev) => ({
                                    ...prev,
                                    [prod.id]: Math.max(0, currentDraftStock - 1),
                                  }))
                                }
                                className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] font-bold text-[#141413] hover:bg-[#F3EFEA]"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={currentDraftStock}
                                onChange={(e) =>
                                  setStockDrafts((prev) => ({
                                    ...prev,
                                    [prod.id]: Math.max(0, Number(e.target.value) || 0),
                                  }))
                                }
                                className="w-16 px-2 py-1 rounded-lg bg-white border border-[#E6E0D6] text-center font-mono font-bold text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setStockDrafts((prev) => ({
                                    ...prev,
                                    [prod.id]: currentDraftStock + 1,
                                  }))
                                }
                                className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] font-bold text-[#141413] hover:bg-[#F3EFEA]"
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStockDrafts((prev) => ({
                                    ...prev,
                                    [prod.id]: currentDraftStock + 10,
                                  }))
                                }
                                className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-[10px] font-mono font-bold text-[#0B4F3F]"
                              >
                                +10
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#8C857B]">
                                {t('حد التنبيه:', 'Alert <=')}
                              </span>
                              <input
                                type="number"
                                min={1}
                                value={currentDraftThreshold}
                                onChange={(e) =>
                                  setThresholdDrafts((prev) => ({
                                    ...prev,
                                    [prod.id]: Math.max(1, Number(e.target.value) || 1),
                                  }))
                                }
                                className="w-12 px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#E6E0D6] text-center font-mono text-[11px]"
                              />
                              {(currentDraftStock !== prod.stock ||
                                currentDraftThreshold !== prod.lowStockThreshold) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateProductStock(
                                      prod.id,
                                      currentDraftStock,
                                      currentDraftThreshold
                                    )
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#0B4F3F] text-white text-[10px] font-bold"
                                >
                                  {t('حفظ', 'Save')}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono font-bold text-sm ${
                                  isOut
                                    ? 'text-[#9E2A2B]'
                                    : isLow
                                    ? 'text-[#C87D12]'
                                    : 'text-[#1E6B47]'
                                }`}
                              >
                                {prod.stock}
                              </span>
                              <span className="text-[11px] text-[#8C857B]">
                                {t('متوفر', 'in stock')}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#57534E] mt-0.5 font-mono">
                              {t('المبيعات:', 'Sold:')} {prod.soldCount} · ★ {prod.rating}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            prod.status === 'active' && !isOut
                              ? 'bg-[#EBF3F0] text-[#1E6B47]'
                              : prod.status === 'draft'
                              ? 'bg-[#F3EFEA] text-[#57534E]'
                              : prod.status === 'suspended'
                              ? 'bg-red-100 text-[#9E2A2B]'
                              : 'bg-amber-50 text-[#C87D12]'
                          }`}
                        >
                          {prod.status === 'active' && !isOut
                            ? t('نشط', 'Active')
                            : prod.status === 'draft'
                            ? t('مسودة', 'Draft')
                            : prod.status === 'suspended'
                            ? t('موقوف إدارياً', 'Suspended')
                            : t('نفد المخزون', 'Out of Stock')}
                        </span>
                        {isLow && !isOut && (
                          <div className="text-[10px] text-[#C87D12] font-bold mt-1">
                            {t('مخزون منخفض!', 'Low Stock!')}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigateTo('product', { productId: prod.id })}
                            title={t('معاينة في المتجر', 'View in Storefront')}
                            className="p-2 rounded-lg bg-[#FAF8F5] hover:bg-[#F3EFEA] text-[#57534E] border border-[#E6E0D6]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openProductModal(prod)}
                            disabled={prod.status === 'suspended'}
                            title={t('تعديل كامل للمنتج', 'Edit Product')}
                            className="p-2 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF3F0] text-[#0B4F3F] border border-[#E6E0D6] disabled:opacity-40"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateProduct(prod)}
                            title={t('تكرار المنتج كمسودة', 'Duplicate as Draft')}
                            className="p-2 rounded-lg bg-[#FAF8F5] hover:bg-[#FBF7EC] text-[#B8860B] border border-[#E6E0D6]"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteId === prod.id ? (
                            <div className="inline-flex items-center gap-1 bg-red-50 border border-[#9E2A2B]/30 px-2 py-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteProduct(prod.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="text-[10px] font-bold text-[#9E2A2B]"
                              >
                                {t('تأكيد الحذف', 'Confirm')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[10px] text-[#57534E]"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(prod.id)}
                              title={t('حذف المنتج', 'Delete Product')}
                              className="p-2 rounded-lg bg-[#FAF8F5] hover:bg-red-50 text-[#9E2A2B] border border-[#E6E0D6]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complete Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-[#E6E0D6] max-w-4xl w-full overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0B4F3F] text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C59B27]">
                  {editingProduct
                    ? t('تحديث بيانات منتج معتمد', 'Edit Verified SKU')
                    : t('إدراج منتج فاخر جديد', 'Create New Luxury Product')}
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  {editingProduct
                    ? lang === 'ar'
                      ? editingProduct.titleAr
                      : editingProduct.titleEn
                    : t('إضافة منتج جديد لمتجر ' + seller.nameAr, 'Add Product to ' + seller.nameEn)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex flex-wrap border-b border-[#E6E0D6] bg-[#FAF8F5] px-6 gap-2 pt-2">
              {(
                [
                  { id: 'basic', labelAr: '١. البيانات الأساسية', labelEn: '1. Basic Info' },
                  { id: 'pricing', labelAr: '٢. التسعير والمخزون', labelEn: '2. Pricing & Stock' },
                  { id: 'media', labelAr: '٣. الصور والعرض', labelEn: '3. Media & Gallery' },
                  { id: 'variants', labelAr: '٤. الخيارات والمقاسات', labelEn: '4. Variants' },
                  { id: 'specs', labelAr: '٥. المواصفات والضمان', labelEn: '5. Specs & Warranty' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalTab(tab.id)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-colors ${
                    modalTab === tab.id
                      ? 'border-[#0B4F3F] text-[#0B4F3F] bg-white'
                      : 'border-transparent text-[#57534E] hover:text-[#141413]'
                  }`}
                >
                  {lang === 'ar' ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveProductSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* TAB 1: BASIC INFO */}
              {modalTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('عنوان المنتج بالعربية *', 'Product Title (Arabic) *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitleAr}
                        onChange={(e) => setFormTitleAr(e.target.value)}
                        placeholder={t('مثال: ساعة كرونوغراف سويسرية إصدار خاص', 'Arabic Title')}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('عنوان المنتج بالإنجليزية *', 'Product Title (English) *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitleEn}
                        onChange={(e) => setFormTitleEn(e.target.value)}
                        placeholder="e.g. Swiss Automatic Chronograph Royal Edition"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('رمز المخزون (SKU) *', 'SKU Code *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('القسم الرئيسي', 'Primary Category')}
                      </label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => {
                          const nextCat = categories.find((c) => c.id === e.target.value);
                          setFormCategoryId(e.target.value);
                          if (nextCat && nextCat.subcategories[0]) {
                            setFormSubcategoryAr(nextCat.subcategories[0].nameAr);
                            setFormSubcategoryEn(nextCat.subcategories[0].nameEn);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {lang === 'ar' ? cat.nameAr : cat.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('العلامة التجارية', 'Brand')}
                      </label>
                      <select
                        value={formBrandId}
                        onChange={(e) => setFormBrandId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-semibold"
                      >
                        {brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {lang === 'ar' ? b.nameAr : b.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('الوصف التفصيلي بالعربية', 'Description (Arabic)')}
                      </label>
                      <textarea
                        rows={3}
                        value={formDescAr}
                        onChange={(e) => setFormDescAr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('الوصف التفصيلي بالإنجليزية', 'Description (English)')}
                      </label>
                      <textarea
                        rows={3}
                        value={formDescEn}
                        onChange={(e) => setFormDescEn(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING & STOCK */}
              {modalTab === 'pricing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('سعر البيع النهائي (شامل الضريبة ١٥٪) ر.س *', 'Final Selling Price (Incl. 15% VAT) SAR *')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formPrice}
                        onChange={(e) => setFormPrice(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono font-bold text-[#0B4F3F]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('السعر قبل الخصم (ر.س)', 'Original Price Before Discount (SAR)')}
                      </label>
                      <input
                        type="number"
                        min={formPrice}
                        value={formOriginalPrice}
                        onChange={(e) => setFormOriginalPrice(Number(e.target.value) || formPrice)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('حالة العرض في المتجر', 'Listing Status')}
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as ProductStatus)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-bold"
                      >
                        <option value="active">{t('نشط ومتاح للبيع (Active)', 'Active')}</option>
                        <option value="draft">{t('مسودة غير منشورة (Draft)', 'Draft')}</option>
                        <option value="out_of_stock">{t('نفد المخزون (Out of Stock)', 'Out of Stock')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Live VAT & Commission Breakdown Card */}
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-[#8C857B] block">
                        {t('ضريبة القيمة المضافة المتضمنة (١٥٪)', 'Included 15% Saudi VAT')}
                      </span>
                      <span className="font-mono font-bold text-[#141413] mt-0.5 block">
                        {formatPrice(Number(((formPrice * 15) / 115).toFixed(2)))}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C857B] block">
                        {t(`عمولة منصة أثيل (${seller.commissionRate}%)`, `Atheel Commission (${seller.commissionRate}%)`)}
                      </span>
                      <span className="font-mono font-bold text-[#C87D12] mt-0.5 block">
                        -{formatPrice(Number(((formPrice * seller.commissionRate) / 100).toFixed(2)))}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C857B] block">
                        {t('صافي ربح التاجر لكل قطعة', 'Net Merchant Proceeds / Unit')}
                      </span>
                      <span className="font-mono font-bold text-[#1E6B47] text-sm mt-0.5 block">
                        {formatPrice(Number((formPrice * (1 - seller.commissionRate / 100)).toFixed(2)))}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#8C857B] block">
                        {t('نسبة الخصم الظاهرة للعميل', 'Customer Discount Badge')}
                      </span>
                      <span className="font-mono font-bold text-[#0B4F3F] mt-0.5 block">
                        {formOriginalPrice > formPrice
                          ? `${Math.round(((formOriginalPrice - formPrice) / formOriginalPrice) * 100)}% OFF`
                          : t('بدون خصم', 'No Discount')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('الكمية المتوفرة في المستودع *', 'Available Warehouse Stock *')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formStock}
                        onChange={(e) => setFormStock(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('حد التنبيه بانخفاض المخزون', 'Low Stock Alert Threshold')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formThreshold}
                        onChange={(e) => setFormThreshold(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#FBF7EC] border border-[#C59B27]/40 w-full cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsFlashDeal}
                          onChange={(e) => setFormIsFlashDeal(e.target.checked)}
                          className="rounded text-[#0B4F3F]"
                        />
                        <span className="text-xs font-bold text-[#141413]">
                          {t('إدراج ضمن عروض الفخامة الخاطفة ⚡', 'Include in Luxury Flash Deals ⚡')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MEDIA & GALLERY */}
              {modalTab === 'media' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#141413] mb-1">
                      {t('إضافة رابط صورة عالية الدقة', 'Add High-Resolution Image URL')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newImageUrl.trim()) {
                            setFormImages((prev) => [...prev, newImageUrl.trim()]);
                            setNewImageUrl('');
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#0B4F3F] text-white text-xs font-bold"
                      >
                        {t('إضافة الصورة', 'Add Image')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-[#57534E] mb-2">
                      {t('أو اختر من مكتبة الصور الفاخرة الجاهزة:', 'Or pick from curated luxury presets:')}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {LUXURY_IMAGE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setFormImages((prev) =>
                              prev.includes(preset.url) ? prev : [...prev, preset.url]
                            )
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EBF3F0] border border-[#E6E0D6] text-[11px] font-semibold text-[#141413]"
                        >
                          + {lang === 'ar' ? preset.labelAr : preset.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {formImages.map((img, i) => (
                      <div
                        key={i}
                        className="relative rounded-xl overflow-hidden border border-[#E6E0D6] bg-[#FAF8F5] group"
                      >
                        <img
                          src={img}
                          alt={`Product ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-28 object-cover"
                        />
                        <div className="p-2 flex items-center justify-between bg-white text-[10px]">
                          <span className="font-bold text-[#0B4F3F]">
                            {i === 0 ? t('الصورة الرئيسية', 'Primary') : `#${i + 1}`}
                          </span>
                          {formImages.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormImages((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="text-[#9E2A2B] font-bold"
                            >
                              {t('حذف', 'Remove')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: VARIANTS BUILDER */}
              {modalTab === 'variants' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#57534E]">
                      {t(
                        'أضف مجموعات الخيارات مثل (المقاس، السعة، اللون، أو الحجم بالتولة).',
                        'Configure option groups such as Size, Storage Capacity, Color, or Packaging.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setFormVariants((prev) => [
                          ...prev,
                          {
                            id: `vg-${Date.now()}`,
                            nameAr: 'خيار إضافي',
                            nameEn: 'Custom Option',
                            type: 'option',
                            options: [
                              {
                                id: `vo-${Date.now()}`,
                                labelAr: 'الخيار الأول',
                                labelEn: 'Option 1',
                                value: 'opt-1',
                                priceDelta: 0,
                                inStock: true,
                              },
                            ],
                          },
                        ])
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-[#0B4F3F]/30 text-xs font-bold text-[#0B4F3F]"
                    >
                      + {t('إضافة مجموعة خيارات', 'Add Variant Group')}
                    </button>
                  </div>

                  {formVariants.map((group, gIdx) => (
                    <div
                      key={group.id}
                      className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={group.nameAr}
                            onChange={(e) => {
                              const next = [...formVariants];
                              next[gIdx].nameAr = e.target.value;
                              setFormVariants(next);
                            }}
                            placeholder={t('اسم المجموعة بالعربية (مثل: المقاس)', 'Group Name Ar')}
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#E6E0D6] text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={group.nameEn}
                            onChange={(e) => {
                              const next = [...formVariants];
                              next[gIdx].nameEn = e.target.value;
                              setFormVariants(next);
                            }}
                            placeholder="Group Name En (e.g. Size)"
                            className="px-3 py-1.5 rounded-lg bg-white border border-[#E6E0D6] text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFormVariants((prev) => prev.filter((_, idx) => idx !== gIdx))
                          }
                          className="text-xs text-[#9E2A2B] font-bold"
                        >
                          {t('حذف المجموعة', 'Remove Group')}
                        </button>
                      </div>

                      <div className="space-y-2">
                        {group.options.map((opt, oIdx) => (
                          <div key={opt.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                            <input
                              type="text"
                              value={opt.labelAr}
                              onChange={(e) => {
                                const next = [...formVariants];
                                next[gIdx].options[oIdx].labelAr = e.target.value;
                                setFormVariants(next);
                              }}
                              placeholder={t('الخيار بالعربية', 'Label Ar')}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E6E0D6] text-xs"
                            />
                            <input
                              type="text"
                              value={opt.labelEn}
                              onChange={(e) => {
                                const next = [...formVariants];
                                next[gIdx].options[oIdx].labelEn = e.target.value;
                                setFormVariants(next);
                              }}
                              placeholder="Label En"
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E6E0D6] text-xs"
                            />
                            <input
                              type="number"
                              value={opt.priceDelta || 0}
                              onChange={(e) => {
                                const next = [...formVariants];
                                next[gIdx].options[oIdx].priceDelta = Number(e.target.value) || 0;
                                setFormVariants(next);
                              }}
                              placeholder={t('فرق السعر ر.س', 'Price Delta SAR')}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E6E0D6] text-xs font-mono"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-1 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={opt.inStock}
                                  onChange={(e) => {
                                    const next = [...formVariants];
                                    next[gIdx].options[oIdx].inStock = e.target.checked;
                                    setFormVariants(next);
                                  }}
                                />
                                <span>{t('متوفر', 'In Stock')}</span>
                              </label>
                              {group.options.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...formVariants];
                                    next[gIdx].options = next[gIdx].options.filter(
                                      (_, i) => i !== oIdx
                                    );
                                    setFormVariants(next);
                                  }}
                                  className="text-[#9E2A2B] text-xs font-bold"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...formVariants];
                            next[gIdx].options.push({
                              id: `vo-${Date.now()}`,
                              labelAr: 'خيار جديد',
                              labelEn: 'New Option',
                              value: `opt-${Date.now()}`,
                              priceDelta: 0,
                              inStock: true,
                            });
                            setFormVariants(next);
                          }}
                          className="text-[11px] font-bold text-[#0B4F3F] hover:underline"
                        >
                          + {t('إضافة خيار فرعي', 'Add Option Value')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: SPECIFICATIONS & WARRANTY */}
              {modalTab === 'specs' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('تفاصيل الضمان (بالعربية)', 'Warranty Policy (Arabic)')}
                      </label>
                      <input
                        type="text"
                        value={formWarrantyAr}
                        onChange={(e) => setFormWarrantyAr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('تفاصيل الضمان (بالإنجليزية)', 'Warranty Policy (English)')}
                      </label>
                      <input
                        type="text"
                        value={formWarrantyEn}
                        onChange={(e) => setFormWarrantyEn(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('تقدير التوصيل (بالعربية)', 'Delivery Estimate (Arabic)')}
                      </label>
                      <input
                        type="text"
                        value={formDeliveryAr}
                        onChange={(e) => setFormDeliveryAr(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#141413] mb-1">
                        {t('تقدير التوصيل (بالإنجليزية)', 'Delivery Estimate (English)')}
                      </label>
                      <input
                        type="text"
                        value={formDeliveryEn}
                        onChange={(e) => setFormDeliveryEn(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E6E0D6]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#141413]">
                        {t('جدول المواصفات الفنية', 'Technical Specifications Table')}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setFormSpecs((prev) => [
                            ...prev,
                            { keyAr: '', keyEn: '', valueAr: '', valueEn: '' },
                          ])
                        }
                        className="text-xs font-bold text-[#0B4F3F] hover:underline"
                      >
                        + {t('إضافة سطر مواصفات', 'Add Specification Row')}
                      </button>
                    </div>
                    {formSpecs.map((spec, sIdx) => (
                      <div key={sIdx} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <input
                          type="text"
                          value={spec.keyAr}
                          onChange={(e) => {
                            const next = [...formSpecs];
                            next[sIdx].keyAr = e.target.value;
                            setFormSpecs(next);
                          }}
                          placeholder={t('المعيار (عربي)', 'Spec Name Ar')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                        />
                        <input
                          type="text"
                          value={spec.valueAr}
                          onChange={(e) => {
                            const next = [...formSpecs];
                            next[sIdx].valueAr = e.target.value;
                            setFormSpecs(next);
                          }}
                          placeholder={t('القيمة (عربي)', 'Value Ar')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                        />
                        <input
                          type="text"
                          value={spec.keyEn}
                          onChange={(e) => {
                            const next = [...formSpecs];
                            next[sIdx].keyEn = e.target.value;
                            setFormSpecs(next);
                          }}
                          placeholder="Spec Name En"
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={spec.valueEn}
                            onChange={(e) => {
                              const next = [...formSpecs];
                              next[sIdx].valueEn = e.target.value;
                              setFormSpecs(next);
                            }}
                            placeholder="Value En"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] text-xs"
                          />
                          {formSpecs.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setFormSpecs((prev) => prev.filter((_, i) => i !== sIdx))
                              }
                              className="text-[#9E2A2B] font-bold px-1"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security & Governance Notice inside Modal */}
              <div className="p-3 rounded-xl bg-[#EBF3F0]/60 border border-[#0B4F3F]/20 flex items-center gap-2.5 text-[11px] text-[#0B4F3F]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {t(
                    'حماية النزاهة: معرّف المتجر (sellerId) والتقييمات وعدد المبيعات الفعلية محمية بواسطة قواعد Firestore ولا يمكن تعديلها يدوياً.',
                    'Integrity Protection: sellerId, product ratings, review counts, and soldCount are protected by Firestore security rules.'
                  )}
                </span>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E0D6]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E6E0D6] text-xs font-bold text-[#57534E]"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0B4F3F] hover:bg-[#083B2F] text-white text-xs font-bold shadow-xs"
                >
                  {editingProduct
                    ? t('حفظ تعديلات المنتج', 'Save Product Changes')
                    : t('نشر وإدراج المنتج في الكتالوج', 'Publish Product to Catalog')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
