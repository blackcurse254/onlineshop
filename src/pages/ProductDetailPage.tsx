import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Heart,
  Minus,
  Plus,
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-sm text-[#6A6670]">
        در حال دریافت اطلاعات کفش...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-base font-semibold text-[var(--adonis-primary)]">{error || 'محصول یافت نشد'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="px-5 py-2.5 text-xs font-medium bg-[var(--adonis-primary)] text-white rounded-sm"
        >
          بازگشت به فروشگاه
        </button>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-16">
      <button
        type="button"
        onClick={() => onNavigate('/shop')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6A6670] hover:text-[#B01D39]"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به فروشگاه کفش</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Image Gallery + Zoom */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative group aspect-[4/3] w-full rounded-sm overflow-hidden bg-[#E2E0DB] border border-[#16141A]/[0.08]">
            <SafeImage
              src={product.images[activeImage] || product.images[0] || ''}
              alt={product.name}
              loading="eager"
              onClick={() => setZoomOpen(true)}
              className="w-full h-full object-cover cursor-zoom-in"
            />
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="بزرگنمایی تصویر کفش"
              className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/95 text-[var(--adonis-primary)] text-xs font-medium shadow-sm hover:bg-white transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
              <span>بزرگنمایی</span>
            </button>
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  aria-label={`تصویر ${idx + 1} ${product.name}`}
                  className={`aspect-[4/3] rounded-sm overflow-hidden border transition-all ${
                    activeImage === idx
                      ? 'border-[var(--adonis-accent)] ring-2 ring-[var(--adonis-accent)]'
                      : 'border-[#16141A]/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img} alt={`${product.name} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}

          {/* Technical Footwear Specs */}
          <div className="bg-white border border-[#16141A]/[0.08] rounded-sm p-5 sm:p-6 space-y-4">
            <h2 className="text-lg text-[var(--adonis-primary)]">مشخصات فنی کفش</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="bg-[#EFEEEA] p-3 rounded-sm">
                <dt className="text-[#85818A] text-xs">برند</dt>
                <dd className="font-semibold text-[var(--adonis-primary)] mt-0.5">{product.brand}</dd>
              </div>
              {product.model && (
                <div className="bg-[#EFEEEA] p-3 rounded-sm">
                  <dt className="text-[#85818A] text-xs">مدل</dt>
                  <dd className="font-semibold text-[var(--adonis-primary)] mt-0.5">{product.model}</dd>
                </div>
              )}
              {product.upperMaterial && (
                <div className="bg-[#EFEEEA] p-3 rounded-sm">
                  <dt className="text-[#85818A] text-xs">جنس رویه</dt>
                  <dd className="font-medium text-[var(--adonis-primary)] mt-0.5">{product.upperMaterial}</dd>
                </div>
              )}
              {product.soleMaterial && (
                <div className="bg-[#EFEEEA] p-3 rounded-sm">
                  <dt className="text-[#85818A] text-xs">جنس زیره</dt>
                  <dd className="font-medium text-[var(--adonis-primary)] mt-0.5">{product.soleMaterial}</dd>
                </div>
              )}
            </dl>

            {product.features && product.features.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-[var(--adonis-primary)]">ویژگی‌های برجسته</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4B4752]">
                  {product.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[var(--adonis-accent)] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Module */}
        <div className="lg:col-span-5 bg-white border border-[#16141A]/[0.08] rounded-sm p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2 border-b border-[#16141A]/[0.06] pb-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[#85818A]">
                <span className="font-semibold text-[var(--adonis-primary)]">{product.brand}</span>
                <span aria-hidden="true">·</span>
                <span>{category?.name || 'کفش و کتونی'}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">کد {product.sku}</span>
              </div>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label={wishlisted ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                aria-pressed={wishlisted}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm border text-xs transition-colors ${
                  wishlisted
                    ? 'bg-[var(--adonis-accent)] text-white border-[var(--adonis-accent)]'
                    : 'border-[#16141A]/15 text-[#6A6670] hover:text-[var(--adonis-primary)]'
                }`}
              >
                <Heart className="w-3.5 h-3.5" fill={wishlisted ? 'currentColor' : 'none'} />
                <span>{wishlisted ? 'ذخیره شد' : 'علاقه‌مندی'}</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl text-[var(--adonis-primary)] leading-snug">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-xl sm:text-2xl font-bold text-[var(--adonis-primary)] tabular-nums">
                {formatToman(effectivePrice)}
              </span>
              {discountPct > 0 && (
                <>
                  <span className="text-sm text-[#85818A] line-through tabular-nums">
                    {formatToman(product.price)}
                  </span>
                  <span className="text-xs font-semibold text-[#B01D39] tabular-nums">
                    ({new Intl.NumberFormat('fa-IR').format(discountPct)}٪ تخفیف)
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-[#4B4752] leading-relaxed">{product.description}</p>

          {/* Color Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--adonis-primary)]">رنگ انتخابی: {selectedColor}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {product.colors.map((color) => {
                const active = selectedColor === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => setSelectedColor(color.name)}
                    aria-label={`انتخاب رنگ ${color.name}`}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs transition-colors ${
                      active
                        ? 'border-[var(--adonis-accent)] bg-[#EBDADD] font-medium text-[var(--adonis-primary)]'
                        : 'border-[#16141A]/15 text-[#6A6670] hover:border-[#16141A]/40'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-[#16141A]/20 shrink-0"
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
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--adonis-primary)]">انتخاب سایز کفش</span>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-[#B01D39] hover:underline font-medium"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>راهنمای سایز</span>
                </button>
              </div>
              <span
                className={`tabular-nums font-medium ${
                  outOfStockAll || outOfStockSelected ? 'text-[#B01D39]' : 'text-[#6A6670]'
                }`}
                data-testid="selected-size-stock"
              >
                {outOfStockAll
                  ? 'ناموجود'
                  : outOfStockSelected
                    ? `سایز ${selectedSize} ناموجود`
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
                    className={`min-w-[52px] h-11 px-3 text-xs font-medium rounded-sm border tabular-nums transition-colors ${
                      unavailable
                        ? 'bg-[#E2E0DB] text-[#85818A] border-[#16141A]/10 line-through cursor-not-allowed opacity-70'
                        : active
                          ? 'bg-[var(--adonis-primary)] text-white border-[var(--adonis-primary)]'
                          : 'bg-white text-[var(--adonis-primary)] border-[#16141A]/15 hover:border-[var(--adonis-accent)]'
                    }`}
                  >
                    {entry.size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Add to Cart */}
          <div className="flex items-center gap-3 pt-2">
            <div className="inline-flex items-center border border-[#16141A]/15 rounded-sm h-11">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="کاهش تعداد"
                className="px-3 h-full text-[var(--adonis-primary)] hover:bg-[#16141A]/5"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-semibold tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(quantity)}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(selectedSizeStock || 1, q + 1))}
                disabled={outOfStockSelected || quantity >= selectedSizeStock}
                aria-label="افزایش تعداد"
                className="px-3 h-full text-[var(--adonis-primary)] hover:bg-[#16141A]/5 disabled:opacity-35"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStockAll || outOfStockSelected}
              onClick={handleAddToCart}
              className="flex-1 h-11 px-6 bg-[var(--adonis-accent)] text-white text-sm font-semibold rounded-sm hover:bg-[#B01D39] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              {outOfStockAll || outOfStockSelected ? 'ناموجود' : 'افزودن به سبد خرید'}
            </button>
          </div>

          <div className="pt-4 border-t border-[#16141A]/[0.06] space-y-2 text-xs text-[#6A6670]">
            {product.fabricCare && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[var(--adonis-accent)] shrink-0" />
                <span>نگهداری و نظافت: {product.fabricCare}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[var(--adonis-accent)] shrink-0" />
              <span>ارسال ۱ تا ۲ روز کاری در تهران و ۲ تا ۴ روز کاری سراسر کشور با جعبه اصلی</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--adonis-accent)] shrink-0" />
              <span>۷ روز ضمانت تعویض سایز و سلامت فیزیکی کفش</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-[#16141A]/[0.08]">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl sm:text-2xl text-[var(--adonis-primary)]">نظرات کاربران درباره این کفش</h2>
          {reviews.length === 0 ? (
            <div className="bg-white border border-[#16141A]/[0.08] rounded-sm p-6 text-xs sm:text-sm text-[#85818A]">
              هنوز دیدگاهی برای این محصول ثبت نشده است. اولین نفری باشید که تجربه خود را می‌نویسد.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-[#16141A]/[0.08] rounded-sm p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--adonis-primary)]">{rev.authorName}</span>
                    <div className="flex items-center gap-0.5 text-[var(--adonis-accent)]">
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
          className="lg:col-span-5 bg-white border border-[#16141A]/[0.08] rounded-sm p-6 space-y-4 self-start"
        >
          <h3 className="text-base font-semibold text-[var(--adonis-primary)]">ثبت دیدگاه خریدار</h3>
          {revStatus && (
            <div className="p-3 rounded-sm bg-[#EBDADD] border border-[#C21E3C]/30 text-xs text-[var(--adonis-primary)]">
              {revStatus}
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="rev-name" className="text-xs font-medium">نام شما</label>
            <input
              id="rev-name"
              type="text"
              required
              value={revName}
              onChange={(e) => setRevName(e.target.value)}
              placeholder="مثال: علی محمدی"
              className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="rev-rating" className="text-xs font-medium">امتیاز</label>
            <select
              id="rev-rating"
              value={revRating}
              onChange={(e) => setRevRating(Number(e.target.value))}
              className="w-full h-9 px-3 text-xs bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm"
            >
              <option value={5}>۵ از ۵ (عالی)</option>
              <option value={4}>۴ از ۵ (بسیار خوب)</option>
              <option value={3}>۳ از ۵ (متوسط)</option>
              <option value={2}>۲ از ۵ (ضعیف)</option>
              <option value={1}>۱ از ۵ (نامناسب)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="rev-comment" className="text-xs font-medium">تجربه شما از سایز و کیفیت کفش</label>
            <textarea
              id="rev-comment"
              required
              rows={3}
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="درباره راحتی قالب، کیفیت رویه و اندازه بودن سایز بنویسید..."
              className="w-full p-2.5 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-primary)] text-white rounded-sm hover:bg-[#B01D39] transition-colors"
          >
            ثبت دیدگاه
          </button>
        </form>
      </section>

      {/* Similar Products */}
      {similar.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-[#16141A]/[0.08]">
          <h2 className="text-xl sm:text-2xl text-[var(--adonis-primary)]">کفش‌های مشابه در این دسته‌بندی</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-[#16141A]/[0.08]">
          <h2 className="text-xl sm:text-2xl text-[var(--adonis-primary)]">محصولات مرتبط و مراقبت از کفش</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      )}

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
          <button
            ref={zoomCloseBtnRef}
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="بستن بزرگنمایی"
            className="absolute top-4 end-4 p-2 rounded-full bg-white text-[var(--adonis-primary)] min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <SafeImage
            src={product.images[activeImage] || product.images[0] || ''}
            alt={product.name}
            loading="eager"
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] w-auto rounded-sm object-contain bg-[#E2E0DB]"
          />
        </div>
      )}

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
};
