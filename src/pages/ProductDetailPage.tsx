import React, { useEffect, useState } from 'react';
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
import { SafeImage } from '../components/SafeImage';
import { ProductCard } from '../components/ProductCard';
import { SizeGuideModal } from '../components/SizeGuideModal';
import {
  calculateDiscountPercent,
  formatToman,
  getAvailableSizes,
  getEffectivePrice,
  getSizeStock,
  getTotalStockFromSizes,
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
        setSelectedSize(avail[0] || res.product.sizes[0] || '41');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center text-sm text-[#6B665F]">
        در حال دریافت اطلاعات کفش...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-base font-semibold text-[#18181B]">{error || 'محصول یافت نشد'}</p>
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="px-5 py-2.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
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
    product.sizeInventory && product.sizeInventory.length > 0
      ? product.sizeInventory
      : product.sizes.map((size) => ({ size, stock: product.stock }));

  const totalStock =
    product.sizeInventory && product.sizeInventory.length > 0
      ? getTotalStockFromSizes(product.sizeInventory)
      : product.stock;

  const selectedSizeStock = getSizeStock(product, selectedSize);
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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#524E48] hover:text-[#18181B]"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به فروشگاه کفش</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Image Gallery + Zoom */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative group aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#F4EFE6] border border-black/[0.06]">
            <SafeImage
              src={product.images[activeImage] || product.images[0] || ''}
              alt={product.name}
              className="w-full h-full object-cover cursor-zoom-in"
            />
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="بزرگنمایی تصویر کفش"
              className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/90 text-[#18181B] text-xs font-medium shadow-sm hover:bg-white transition-colors"
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
                  className={`aspect-[4/3] rounded-md overflow-hidden border transition-all ${
                    activeImage === idx
                      ? 'border-[#18181B] ring-1 ring-[#18181B]'
                      : 'border-black/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <SafeImage src={img} alt={`${product.name} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}

          {/* Technical Footwear Specs */}
          <div className="bg-white border border-black/[0.06] rounded-xl p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#18181B]">مشخصات فنی کفش</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="bg-[#FAF7F2] p-3 rounded-lg">
                <dt className="text-[#6B665F] text-xs">برند</dt>
                <dd className="font-semibold text-[#18181B] mt-0.5">{product.brand}</dd>
              </div>
              {product.model && (
                <div className="bg-[#FAF7F2] p-3 rounded-lg">
                  <dt className="text-[#6B665F] text-xs">مدل</dt>
                  <dd className="font-semibold text-[#18181B] mt-0.5">{product.model}</dd>
                </div>
              )}
              {product.upperMaterial && (
                <div className="bg-[#FAF7F2] p-3 rounded-lg">
                  <dt className="text-[#6B665F] text-xs">جنس رویه</dt>
                  <dd className="font-medium text-[#18181B] mt-0.5">{product.upperMaterial}</dd>
                </div>
              )}
              {product.soleMaterial && (
                <div className="bg-[#FAF7F2] p-3 rounded-lg">
                  <dt className="text-[#6B665F] text-xs">جنس زیره</dt>
                  <dd className="font-medium text-[#18181B] mt-0.5">{product.soleMaterial}</dd>
                </div>
              )}
            </dl>

            {product.features && product.features.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-[#18181B]">ویژگی‌های برجسته</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#4A4640]">
                  {product.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[#8F6E38] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Module */}
        <div className="lg:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2 border-b border-black/[0.06] pb-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-[#6B665F]">
                <span className="font-semibold text-[#18181B]">{product.brand}</span>
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
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
                  wishlisted
                    ? 'bg-[#18181B] text-[#E5CFA3] border-[#18181B]'
                    : 'border-black/15 text-[#524E48] hover:text-[#18181B]'
                }`}
              >
                <Heart className="w-3.5 h-3.5" fill={wishlisted ? 'currentColor' : 'none'} />
                <span>{wishlisted ? 'ذخیره شد' : 'علاقه‌مندی'}</span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-[#18181B] leading-snug">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-xl sm:text-2xl font-bold text-[#18181B] tabular-nums">
                {formatToman(effectivePrice)}
              </span>
              {discountPct > 0 && (
                <>
                  <span className="text-sm text-[#8A847C] line-through tabular-nums">
                    {formatToman(product.price)}
                  </span>
                  <span className="text-xs font-medium text-[#8F6E38] tabular-nums">
                    ({new Intl.NumberFormat('fa-IR').format(discountPct)}٪ تخفیف)
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-[#4A4640] leading-relaxed">{product.description}</p>

          {/* Color Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#18181B]">رنگ انتخابی: {selectedColor}</span>
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
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                      active
                        ? 'border-[#18181B] bg-[#FAF7F2] font-medium text-[#18181B]'
                        : 'border-black/15 text-[#524E48] hover:border-black/40'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
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
                <span className="font-medium text-[#18181B]">انتخاب سایز کفش</span>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-[#8F6E38] hover:underline font-medium"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>راهنمای سایز</span>
                </button>
              </div>
              <span
                className={`tabular-nums font-medium ${
                  outOfStockAll || outOfStockSelected ? 'text-red-700' : 'text-[#6B665F]'
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
                    className={`min-w-[52px] h-10 px-3 text-xs font-medium rounded-md border tabular-nums transition-colors ${
                      unavailable
                        ? 'bg-[#F4EFE6] text-[#9E978E] border-black/10 line-through cursor-not-allowed opacity-60'
                        : active
                          ? 'bg-[#18181B] text-white border-[#18181B]'
                          : 'bg-white text-[#18181B] border-black/15 hover:border-[#18181B]'
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
            <div className="inline-flex items-center border border-black/15 rounded-md h-11">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="کاهش تعداد"
                className="px-3 h-full text-[#18181B] hover:bg-black/5"
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
                className="px-3 h-full text-[#18181B] hover:bg-black/5 disabled:opacity-35"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStockAll || outOfStockSelected}
              onClick={handleAddToCart}
              className="flex-1 h-11 px-6 bg-[#18181B] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2E] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              {outOfStockAll || outOfStockSelected ? 'ناموجود' : 'افزودن به سبد خرید'}
            </button>
          </div>

          <div className="pt-4 border-t border-black/[0.06] space-y-2 text-xs text-[#524E48]">
            {product.fabricCare && (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8F6E38] shrink-0" />
                <span>نگهداری و نظافت: {product.fabricCare}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#8F6E38] shrink-0" />
              <span>ارسال ۱ تا ۲ روز کاری در تهران و ۲ تا ۴ روز کاری سراسر کشور با جعبه اصلی</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8F6E38] shrink-0" />
              <span>۷ روز ضمانت تعویض سایز و سلامت فیزیکی کفش</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-black/[0.08]">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-[#18181B]">نظرات کاربران درباره این کفش</h2>
          {reviews.length === 0 ? (
            <div className="bg-white border border-black/[0.06] rounded-xl p-6 text-xs sm:text-sm text-[#6B665F]">
              هنوز دیدگاهی برای این محصول ثبت نشده است. اولین نفری باشید که تجربه خود را می‌نویسد.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-black/[0.06] rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#18181B]">{rev.authorName}</span>
                    <div className="flex items-center gap-0.5 text-[#B5945B]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5" fill={i < rev.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#4A4640] leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={handleReviewSubmit}
          className="lg:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 space-y-4 self-start"
        >
          <h3 className="text-base font-semibold text-[#18181B]">ثبت دیدگاه خریدار</h3>
          {revStatus && (
            <div className="p-3 rounded bg-[#FAF7F2] border border-[#B5945B]/40 text-xs text-[#18181B]">
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
              className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="rev-rating" className="text-xs font-medium">امتیاز</label>
            <select
              id="rev-rating"
              value={revRating}
              onChange={(e) => setRevRating(Number(e.target.value))}
              className="w-full h-9 px-3 text-xs bg-[#FAF7F2] border border-black/15 rounded-md"
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
              className="w-full p-2.5 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 text-xs sm:text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E]"
          >
            ثبت دیدگاه
          </button>
        </form>
      </section>

      {/* Similar Products */}
      {similar.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-black/[0.08]">
          <h2 className="text-xl font-bold text-[#18181B]">کفش‌های مشابه در این دسته‌بندی</h2>
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
        <section className="space-y-6 pt-8 border-t border-black/[0.08]">
          <h2 className="text-xl font-bold text-[#18181B]">محصولات مرتبط و مراقبت از کفش</h2>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="بزرگنمایی تصویر محصول"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="بستن بزرگنمایی"
            className="absolute top-4 end-4 p-2 rounded-full bg-white text-[#18181B]"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={product.images[activeImage] || product.images[0] || ''}
            alt={product.name}
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] w-auto rounded-lg object-contain bg-[#F4EFE6]"
          />
        </div>
      )}

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  );
};
