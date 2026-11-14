import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Heart,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Star,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { SafeImage } from '../components/SafeImage';
import { ProductCard } from '../components/ProductCard';
import { SizeGuideModal } from '../components/SizeGuideModal';
import {
  calculateDiscountPercent,
  formatToman,
  getAvailableSizes,
  getEffectivePrice,
  getEffectiveTotalStock,
  getSizeStock,
} from '../utils/commerce';
import type { Product, Review } from '../types/store';

interface ProductDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug, onNavigate }) => {
  const { categories, user, addToCart, isWishlisted, toggleWishlist } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImage, setActiveImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const zoomModalRef = useRef<HTMLDivElement | null>(null);
  const zoomCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  useAccessibleDialog({
    isOpen: zoomOpen,
    onClose: () => setZoomOpen(false),
    containerRef: zoomModalRef,
    initialFocusRef: zoomCloseBtnRef,
  });

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Review form
  const [revName, setRevName] = useState(user?.fullName || '');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [revStatus, setRevStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName && !revName) {
      setRevName(user.fullName);
    }
  }, [user, revName]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<{
      product: Product;
      similar: Product[];
      related: Product[];
      reviews: Review[];
    }>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setSimilar(res.similar ?? []);
        setRelated(res.related ?? []);
        setReviews(res.reviews ?? []);
        setActiveImage(0);
        const avail = getAvailableSizes(res.product);
        setSelectedSize(avail[0] || res.product.sizeInventory?.[0]?.size || '');
        setSelectedColor(res.product.colors[0]?.name || 'استاندارد');
        setQuantity(1);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err.message || 'خطا در بارگذاری محصول');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const ratingStats = useMemo(() => {
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = count > 0 ? sum / count : 0;
    const distribution = [5, 4, 3, 2, 1].map((stars) => {
      const n = reviews.filter((r) => r.rating === stars).length;
      const pct = count > 0 ? Math.round((n / count) * 100) : 0;
      return { stars, count: n, pct };
    });
    return { count, avg, distribution };
  }, [reviews]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 aspect-[4/4] skeleton-shimmer rounded-sm" />
        <div className="lg:col-span-5 space-y-4">
          <div className="h-6 w-1/3 skeleton-shimmer rounded-sm" />
          <div className="h-10 w-3/4 skeleton-shimmer rounded-sm" />
          <div className="h-40 w-full skeleton-shimmer rounded-sm" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <div className="bg-white border border-[#16141A]/10 border-t-2 border-t-[#C21E3C] rounded-sm p-8 space-y-4">
          <p className="text-base font-semibold text-[#16141A]">{error || 'محصول یافت نشد'}</p>
          <button
            type="button"
            onClick={() => onNavigate('/shop')}
            className="min-h-[44px] px-6 py-2.5 text-xs font-semibold bg-[#C21E3C] text-white rounded-sm hover:bg-[#16141A] transition-colors"
          >
            بازگشت به فروشگاه
          </button>
        </div>
      </div>
    );
  }

  const category = categories.find((c) => c.id === product.categoryId);
  const effectivePrice = getEffectivePrice(product.price, product.discountPrice);
  const discountPct = calculateDiscountPercent(product.price, product.discountPrice);

  const sizeEntries =
    product.sizeInventory && product.sizeInventory.length > 0 ? product.sizeInventory : [];

  const totalStock = getEffectiveTotalStock(product);
  const selectedSizeStock = selectedSize ? getSizeStock(product, selectedSize) : 0;
  const outOfStockAll = totalStock <= 0;
  const outOfStockSelected = selectedSizeStock <= 0;
  const wishlisted = isWishlisted(product.id);

  const handleSizeSelect = (size: string, stockForSize: number) => {
    if (stockForSize <= 0) return;
    setSelectedSize(size);
    setQuantity((q) => Math.min(q, stockForSize));
  };

  const handleAddToCart = () => {
    if (outOfStockAll || outOfStockSelected) return;
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || '',
      price: product.price,
      discountPrice: product.discountPrice,
      selectedSize,
      selectedColor,
      quantity: Math.min(quantity, selectedSizeStock),
      maxStock: selectedSizeStock,
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevStatus(null);
    try {
      const res = await apiFetch<{ review: Review; pendingModeration: boolean; message: string }>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          authorName: revName,
          rating: revRating,
          comment: revComment,
        }),
      });
      if (!res.pendingModeration) {
        setReviews((prev) => [res.review, ...prev]);
      }
      setRevComment('');
      setRevStatus(res.message);
    } catch (err: any) {
      setRevStatus(err.message || 'خطا در ثبت دیدگاه');
    }
  };

  const faReviewsCount = new Intl.NumberFormat('fa-IR').format(ratingStats.count);
  const faAvgRating = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(ratingStats.avg);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 lg:pb-14 space-y-14 sm:space-y-16">
      {/* Editorial Breadcrumb */}
      <nav aria-label="مسیر محصول" className="flex flex-wrap items-center gap-2 text-xs text-[#6A6670]">
        <button type="button" onClick={() => onNavigate('/')} className="hover:text-[#B01D39] transition-colors">
          خانه
        </button>
        <span aria-hidden="true">/</span>
        <button type="button" onClick={() => onNavigate('/shop')} className="hover:text-[#B01D39] transition-colors">
          فروشگاه کفش
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-[#16141A] font-medium truncate max-w-[220px] sm:max-w-md">{product.name}</span>
      </nav>

      {/* Main Split: Gallery + Accordions (Start) | Sticky Buy Box (End); Mobile order: Gallery -> Buy Box -> Accordions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-x-12 lg:gap-y-8 items-start">
        {/* Gallery */}
        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1 space-y-4">
          <div className="flex flex-col md:flex-row gap-3.5 items-start">
            {/* Desktop vertical thumbnail rail on start side */}
            {product.images.length > 1 && (
              <div className="hidden md:flex flex-col gap-2.5 w-20 shrink-0" role="group" aria-label="تصاویر محصول">
                {product.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImage(idx)}
                    aria-label={`تصویر ${idx + 1} ${product.name}`}
                    aria-pressed={activeImage === idx}
                    className={`aspect-[4/5] w-full rounded-sm overflow-hidden border transition-all bg-[#E2E0DB] ${
                      activeImage === idx
                        ? 'border-[#C21E3C] ring-2 ring-[#C21E3C]'
                        : 'border-[#16141A]/15 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SafeImage src={img} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Main Image Frame with subtle arch-frame */}
            <div className="relative flex-1 w-full">
              <div className="relative group w-full arch-frame aspect-[4/4] sm:aspect-[4/5] bg-[#E2E0DB] border border-[#16141A]/10 shadow-xs">
                <SafeImage
                  src={product.images[activeImage] || product.images[0] || ''}
                  alt={product.name}
                  loading="eager"
                  onClick={() => setZoomOpen(true)}
                  className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  aria-label="بزرگنمایی تصویر کفش"
                  className="absolute bottom-4 end-4 min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-white/95 text-[#16141A] text-xs font-semibold shadow-sm border border-[#16141A]/10 hover:bg-[#16141A] hover:text-white transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span>بزرگنمایی</span>
                </button>
              </div>
              {discountPct > 0 && (
                <span className="discount-tag-notched absolute top-2 start-2 z-10 bg-[#C21E3C] text-white text-xs font-semibold px-3 py-1.5 tabular-nums shadow-sm pointer-events-none">
                  <span dir="ltr" className="inline-block">
                    −{new Intl.NumberFormat('fa-IR').format(discountPct)}٪
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Mobile horizontal thumbnails */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2.5 md:hidden" role="group" aria-label="تصاویر محصول">
              {product.images.map((img, idx) => (
                <button
                  key={`${img}-m-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  aria-label={`تصویر ${idx + 1} ${product.name}`}
                  className={`aspect-[4/4] rounded-sm overflow-hidden border transition-all bg-[#E2E0DB] ${
                    activeImage === idx
                      ? 'border-[#C21E3C] ring-2 ring-[#C21E3C]'
                      : 'border-[#16141A]/15 opacity-75'
                  }`}
                >
                  <SafeImage src={img} alt={`${product.name} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sticky Buy Box (2nd on mobile, End column spanning rows on desktop) */}
        <aside className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 bg-white border border-[#16141A]/10 border-t-2 border-t-[#16141A] rounded-sm p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2.5 border-b border-[#16141A]/[0.08] pb-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">
                ۰۱ — {category?.name || 'کلکسیون آدونیس'}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#6A6670] tabular-nums">
                <span className="font-display-serif tracking-[0.14em] uppercase">{product.brand}</span>
                <span aria-hidden="true">·</span>
                <span>کد {product.sku}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl text-[#16141A] leading-[1.18] text-balance">{product.name}</h1>

            {/* Rating summary line */}
            <div className="flex items-center gap-2 text-xs text-[#6A6670] tabular-nums pt-0.5">
              <div className="flex items-center gap-0.5 text-[#C21E3C]" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    fill={ratingStats.count > 0 && i < Math.round(ratingStats.avg) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              {ratingStats.count > 0 ? (
                <span>
                  <strong className="text-[#16141A]">{faAvgRating}</strong> از ۵ ({faReviewsCount} دیدگاه)
                </span>
              ) : (
                <span>بدون دیدگاه ثبت‌شده</span>
              )}
            </div>

            {/* Price block */}
            <div className="flex flex-wrap items-baseline gap-3 pt-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#16141A] tabular-nums">
                {formatToman(effectivePrice)}
              </span>
              {discountPct > 0 && (
                <>
                  <span className="text-sm text-[#6A6670] line-through tabular-nums">
                    {formatToman(product.price)}
                  </span>
                  <span dir="ltr" className="discount-tag-notched bg-[#C21E3C] text-white text-[11px] font-semibold px-2.5 py-0.5 tabular-nums">
                    −{new Intl.NumberFormat('fa-IR').format(discountPct)}٪
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-[#4B4752] leading-relaxed">{product.description}</p>

          {/* Color Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#16141A]">رنگ انتخابی: {selectedColor}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {product.colors.map((color) => {
                const active = selectedColor === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    aria-label={`انتخاب رنگ ${color.name}`}
                    aria-pressed={active}
                    className={`min-h-[44px] inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs transition-colors ${
                      active
                        ? 'border-[#C21E3C] bg-[#EBDADD] font-semibold text-[#16141A]'
                        : 'border-[#16141A]/15 text-[#4B4752] hover:border-[#16141A]/40'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-[#16141A]/25 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span>{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Per-Size Shoe Selector */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-[#16141A]">انتخاب سایز کفش</span>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-[#B01D39] hover:underline font-semibold min-h-[36px]"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>راهنمای سایز</span>
                </button>
              </div>
              <span
                className={`tabular-nums font-medium ${
                  outOfStockAll || outOfStockSelected || (selectedSizeStock > 0 && selectedSizeStock <= 3)
                    ? 'text-[#B01D39]'
                    : 'text-[#6A6670]'
                }`}
                data-testid="selected-size-stock"
              >
                {outOfStockAll
                  ? 'ناموجود'
                  : outOfStockSelected
                    ? `سایز ${selectedSize} ناموجود`
                    : selectedSizeStock <= 3
                      ? `تنها ${new Intl.NumberFormat('fa-IR').format(selectedSizeStock)} جفت باقی‌مانده`
                      : `موجودی سایز ${selectedSize}: ${new Intl.NumberFormat('fa-IR').format(selectedSizeStock)} جفت`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {sizeEntries.map((entry) => {
                const active = selectedSize === entry.size;
                const unavailable = entry.stock <= 0;
                return (
                  <button
                    key={entry.size}
                    type="button"
                    disabled={unavailable}
                    onClick={() => handleSizeSelect(entry.size, entry.stock)}
                    aria-pressed={active}
                    aria-label={unavailable ? `سایز ${entry.size} ناموجود` : `انتخاب سایز ${entry.size}`}
                    className={`min-w-[48px] min-h-[44px] px-3 text-xs font-semibold rounded-sm border tabular-nums transition-colors ${
                      unavailable
                        ? 'bg-[#E2E0DB] text-[#6A6670] border-[#16141A]/15 cursor-not-allowed opacity-70 bg-[linear-gradient(-32deg,transparent_47%,rgba(22,20,26,0.38)_48%,rgba(22,20,26,0.38)_52%,transparent_53%)]'
                        : active
                          ? 'bg-[#16141A] text-white border-[#16141A]'
                          : 'bg-white text-[#16141A] border-[#16141A]/15 hover:border-[#C21E3C]'
                    }`}
                  >
                    {entry.size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity + Primary Anemone CTA + Wishlist */}
          <div className="flex items-stretch gap-2.5 pt-2">
            <div className="inline-flex items-center border border-[#16141A]/15 rounded-sm min-h-[52px] bg-[#EFEEEA]/60">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="کاهش تعداد"
                className="w-11 h-full flex items-center justify-center text-[#16141A] hover:bg-[#16141A]/5 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-bold tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(quantity)}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(selectedSizeStock || 1, q + 1))}
                disabled={outOfStockSelected || quantity >= selectedSizeStock}
                aria-label="افزایش تعداد"
                className="w-11 h-full flex items-center justify-center text-[#16141A] hover:bg-[#16141A]/5 disabled:opacity-35 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStockAll || outOfStockSelected}
              onClick={handleAddToCart}
              className="flex-1 min-h-[52px] px-5 bg-[#C21E3C] text-white text-sm font-semibold rounded-sm hover:bg-[#16141A] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              {outOfStockAll || outOfStockSelected ? 'ناموجود' : 'افزودن به سبد خرید'}
            </button>

            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={wishlisted ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
              aria-pressed={wishlisted}
              className={`min-w-[52px] min-h-[52px] rounded-sm border flex items-center justify-center transition-colors ${
                wishlisted
                  ? 'bg-[#C21E3C] text-white border-[#C21E3C]'
                  : 'bg-white text-[#16141A] border-[#16141A]/20 hover:border-[#C21E3C]'
              }`}
            >
              <Heart className="w-5 h-5" fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.75} />
            </button>
          </div>

          {/* Compact 4-item trust row */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-[#16141A]/[0.08] text-xs text-[#4B4752]">
            <div className="flex items-center gap-2 bg-[#EFEEEA] px-3 py-2.5 rounded-sm">
              <Truck className="w-4 h-4 text-[#C21E3C] shrink-0" />
              <span>ارسال به سراسر ایران</span>
            </div>
            <div className="flex items-center gap-2 bg-[#EFEEEA] px-3 py-2.5 rounded-sm">
              <RefreshCw className="w-4 h-4 text-[#C21E3C] shrink-0" />
              <span>تعویض ۷ روزه</span>
            </div>
            <div className="flex items-center gap-2 bg-[#EFEEEA] px-3 py-2.5 rounded-sm">
              <ShieldCheck className="w-4 h-4 text-[#C21E3C] shrink-0" />
              <span>ضمانت اصالت</span>
            </div>
            <div className="flex items-center gap-2 bg-[#EFEEEA] px-3 py-2.5 rounded-sm">
              <Lock className="w-4 h-4 text-[#C21E3C] shrink-0" />
              <span>پرداخت امن</span>
            </div>
          </div>
        </aside>

        {/* Accordions (<details>): 3rd on mobile, beneath Gallery on desktop */}
        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2 space-y-3">
          <details open className="group bg-white border border-[#16141A]/10 rounded-sm">
            <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4 min-h-[48px]">
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۱ — مشخصات فنی</div>
                <div className="text-sm sm:text-base font-semibold text-[#16141A]">ساختار و مشخصات فنی کفش</div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#6A6670] transition-transform duration-200 group-open:rotate-180 shrink-0" />
            </summary>
            <div className="px-5 pb-5 pt-2 border-t border-[#16141A]/[0.06] space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="bg-[#EFEEEA] p-3.5 rounded-sm border border-[#16141A]/[0.05]">
                  <dt className="text-[#6A6670] text-xs">برند</dt>
                  <dd className="font-semibold text-[#16141A] mt-0.5">{product.brand}</dd>
                </div>
                {product.model && (
                  <div className="bg-[#EFEEEA] p-3.5 rounded-sm border border-[#16141A]/[0.05]">
                    <dt className="text-[#6A6670] text-xs">مدل</dt>
                    <dd className="font-semibold text-[#16141A] mt-0.5">{product.model}</dd>
                  </div>
                )}
                {product.upperMaterial && (
                  <div className="bg-[#EFEEEA] p-3.5 rounded-sm border border-[#16141A]/[0.05]">
                    <dt className="text-[#6A6670] text-xs">جنس رویه</dt>
                    <dd className="font-medium text-[#16141A] mt-0.5">{product.upperMaterial}</dd>
                  </div>
                )}
                {product.soleMaterial && (
                  <div className="bg-[#EFEEEA] p-3.5 rounded-sm border border-[#16141A]/[0.05]">
                    <dt className="text-[#6A6670] text-xs">جنس زیره</dt>
                    <dd className="font-medium text-[#16141A] mt-0.5">{product.soleMaterial}</dd>
                  </div>
                )}
              </dl>

              {product.features && product.features.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h3 className="text-xs font-semibold text-[#16141A]">ویژگی‌های برجسته</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4B4752]">
                    {product.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#C21E3C] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>

          <details className="group bg-white border border-[#16141A]/10 rounded-sm">
            <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4 min-h-[48px]">
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۲ — ارسال و نگهداری</div>
                <div className="text-sm sm:text-base font-semibold text-[#16141A]">نگهداری، ارسال و تعویض سایز</div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#6A6670] transition-transform duration-200 group-open:rotate-180 shrink-0" />
            </summary>
            <div className="px-5 pb-5 pt-3 border-t border-[#16141A]/[0.06] space-y-2.5 text-xs sm:text-sm text-[#4B4752] leading-relaxed">
              {product.fabricCare && (
                <p>
                  <strong className="text-[#16141A]">روش نظافت و نگهداری: </strong>
                  {product.fabricCare}
                </p>
              )}
              <p>
                <strong className="text-[#16141A]">زمان‌بندی ارسال: </strong>
                ارسال ۱ تا ۲ روز کاری در تهران و ۲ تا ۴ روز کاری به سراسر کشور با بسته‌بندی و جعبه اصلی.
              </p>
              <p>
                <strong className="text-[#16141A]">تعویض سایز: </strong>
                امکان تعویض سایز تا ۷ روز پس از تحویل در صورت استفاده نشدن در فضای باز.
              </p>
            </div>
          </details>
        </div>
      </div>

      <div className="meander" aria-hidden="true" />

      {/* Product Reviews Section with CSS rating distribution bars */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-5">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۲ — دیدگاه خریداران</div>
            <h2 className="text-2xl sm:text-3xl text-[#16141A]">نظرات کاربران درباره این کفش</h2>
          </div>

          {/* CSS Rating Distribution Chart */}
          <div className="bg-white border border-[#16141A]/[0.08] rounded-sm p-5 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-4 text-center sm:border-e sm:border-[#16141A]/[0.08] sm:pe-4 space-y-1">
              <div className="text-3xl sm:text-4xl font-bold text-[#16141A] tabular-nums">
                {ratingStats.count > 0 ? faAvgRating : '—'}
              </div>
              <div className="flex items-center justify-center gap-0.5 text-[#C21E3C]" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    fill={ratingStats.count > 0 && i < Math.round(ratingStats.avg) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <div className="text-xs text-[#6A6670] tabular-nums">{faReviewsCount} دیدگاه</div>
            </div>

            <div className="sm:col-span-8 space-y-2">
              {ratingStats.distribution.map((row) => (
                <div key={row.stars} className="flex items-center gap-2.5 text-xs tabular-nums">
                  <span className="w-10 text-[#4B4752] font-medium shrink-0">
                    {new Intl.NumberFormat('fa-IR').format(row.stars)} ★
                  </span>
                  <div className="flex-1 h-2 bg-[#E2E0DB] rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-[#C21E3C] transition-all duration-300"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-end text-[#6A6670] shrink-0">
                    {new Intl.NumberFormat('fa-IR').format(row.pct)}٪
                  </span>
                </div>
              ))}
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white border border-[#16141A]/[0.08] rounded-sm p-6 text-xs sm:text-sm text-[#6A6670]">
              هنوز دیدگاهی برای این محصول ثبت نشده است. اولین نفری باشید که تجربه خود را می‌نویسد.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-[#16141A]/[0.08] rounded-sm p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#16141A]">{rev.authorName}</span>
                    <div className="flex items-center gap-0.5 text-[#C21E3C]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5" fill={i < rev.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#4B4752] leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleReviewSubmit}
          className="lg:col-span-5 bg-white border border-[#16141A]/[0.08] border-t-2 border-t-[#16141A] rounded-sm p-6 space-y-4"
        >
          <h3 className="text-base font-semibold text-[#16141A]">ثبت دیدگاه خریدار</h3>
          {revStatus && (
            <div className="p-3 rounded-sm bg-[#EBDADD] border border-[#C21E3C]/30 text-xs text-[#16141A]">
              {revStatus}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="rev-name" className="block text-xs font-medium text-[#16141A]">
              نام شما
            </label>
            <input
              id="rev-name"
              type="text"
              required
              value={revName}
              onChange={(e) => setRevName(e.target.value)}
              placeholder="مثال: علی محمدی"
              className="w-full min-h-[44px] px-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="rev-rating" className="block text-xs font-medium text-[#16141A]">
              امتیاز
            </label>
            <select
              id="rev-rating"
              value={revRating}
              onChange={(e) => setRevRating(Number(e.target.value))}
              className="w-full min-h-[44px] px-3 text-xs sm:text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
            >
              <option value={5}>۵ از ۵ (عالی)</option>
              <option value={4}>۴ از ۵ (بسیار خوب)</option>
              <option value={3}>۳ از ۵ (متوسط)</option>
              <option value={2}>۲ از ۵ (ضعیف)</option>
              <option value={1}>۱ از ۵ (نامناسب)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="rev-comment" className="block text-xs font-medium text-[#16141A]">
              تجربه شما از سایز و کیفیت کفش
            </label>
            <textarea
              id="rev-comment"
              required
              rows={3}
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="درباره راحتی قالب، کیفیت رویه و اندازه بودن سایز بنویسید..."
              className="w-full p-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
            />
          </div>
          <button
            type="submit"
            className="w-full min-h-[44px] py-2.5 text-xs sm:text-sm font-semibold bg-[#16141A] text-white rounded-sm hover:bg-[#C21E3C] transition-colors"
          >
            ثبت دیدگاه
          </button>
        </form>
      </section>

      {/* Similar Products */}
      {similar.length > 0 && (
        <>
          <div className="meander" aria-hidden="true" />
          <section className="space-y-6">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۳ — کفش‌های مشابه</div>
              <h2 className="text-2xl sm:text-3xl text-[#16141A]">کفش‌های مشابه در این دسته‌بندی</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {similar.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  category={item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <>
          <div className="meander" aria-hidden="true" />
          <section className="space-y-6">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۴ — محصولات مرتبط</div>
              <h2 className="text-2xl sm:text-3xl text-[#16141A]">محصولات مرتبط و مراقبت از کفش</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {related.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  category={item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Mobile Sticky Bottom Purchase Bar (<= 68px tall, strictly < 15% of mobile viewport) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#16141A]/15 px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] text-[#6A6670] truncate">
            {selectedSize ? `سایز ${selectedSize}` : product.brand}
          </span>
          <span className="text-sm font-bold text-[#16141A] tabular-nums">{formatToman(effectivePrice)}</span>
        </div>
        <button
          type="button"
          disabled={outOfStockAll || outOfStockSelected}
          onClick={handleAddToCart}
          className="min-h-[44px] px-5 bg-[#C21E3C] text-white text-xs font-semibold rounded-sm hover:bg-[#16141A] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
        >
          {outOfStockAll || outOfStockSelected ? 'ناموجود' : 'افزودن به سبد'}
        </button>
      </div>

      {/* Image Zoom Modal */}
      {zoomOpen && (
        <div
          ref={zoomModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B1A2E]/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="بزرگنمایی تصویر محصول"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-sm border border-[#16141A]/15 border-t-2 border-t-[#C21E3C] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-[#EFEEEA] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#16141A] truncate">{product.name}</span>
              <button
                ref={zoomCloseBtnRef}
                type="button"
                onClick={() => setZoomOpen(false)}
                aria-label="بستن بزرگنمایی"
                className="p-2 rounded-sm text-[#16141A] hover:bg-[#16141A]/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="meander" aria-hidden="true" />
            <div className="bg-[#E2E0DB] flex items-center justify-center p-2">
              <SafeImage
                src={product.images[activeImage] || product.images[0] || ''}
                alt={product.name}
                loading="eager"
                className="max-h-[75vh] w-auto rounded-sm object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
};
