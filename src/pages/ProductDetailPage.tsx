import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Minus, Plus, ShieldCheck, Truck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';
import { SafeImage } from '../components/SafeImage';
import { ProductCard } from '../components/ProductCard';
import { calculateDiscountPercent, formatToman, getEffectivePrice } from '../utils/commerce';
import type { Product } from '../types/store';

interface ProductDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ slug, onNavigate }) => {
  const { categories, addToCart } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImage, setActiveImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<{ product: Product; related: Product[] }>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!active) return;
        setProduct(res.product);
        setRelated(res.related);
        setActiveImage(0);
        setSelectedSize(res.product.sizes[0] || 'Free Size');
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
        در حال دریافت اطلاعات محصول...
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
  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (outOfStock) return;
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || '',
      price: product.price,
      discountPrice: product.discountPrice,
      selectedSize,
      selectedColor,
      quantity,
      maxStock: product.stock,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-16">
      <button
        type="button"
        onClick={() => onNavigate('/shop')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#524E48] hover:text-[#18181B]"
      >
        <ArrowRight className="w-4 h-4" />
        <span>بازگشت به فروشگاه</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#F4EFE6] border border-black/[0.06]">
            <SafeImage
              src={product.images[activeImage] || product.images[0] || ''}
              alt={product.name}
              className="w-full h-full object-cover"
            />
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
        </div>

        {/* Contiguous Purchase Module */}
        <div className="lg:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2 border-b border-black/[0.06] pb-5">
            <div className="flex items-center gap-2 text-xs text-[#6B665F]">
              <span>{category?.name || 'پوشاک ورا'}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">کد {product.sku}</span>
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

          {/* Size Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#18181B]">انتخاب سایز</span>
              <span className={`tabular-nums ${outOfStock ? 'text-red-700' : 'text-[#6B665F]'}`}>
                {outOfStock
                  ? 'ناموجود'
                  : `موجودی انبار: ${new Intl.NumberFormat('fa-IR').format(product.stock)} عدد`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                const active = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={active}
                    className={`min-w-[48px] h-10 px-3 text-xs font-medium rounded-md border transition-colors ${
                      active
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-white text-[#18181B] border-black/15 hover:border-[#18181B]'
                    }`}
                  >
                    {size}
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
                onClick={() => setQuantity((q) => Math.min(product.stock || 1, q + 1))}
                disabled={outOfStock || quantity >= product.stock}
                aria-label="افزایش تعداد"
                className="px-3 h-full text-[#18181B] hover:bg-black/5 disabled:opacity-35"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={outOfStock}
              onClick={handleAddToCart}
              className="flex-1 h-11 px-6 bg-[#18181B] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2E] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              {outOfStock ? 'ناموجود' : 'افزودن به سبد خرید'}
            </button>
          </div>

          {product.fabricCare && (
            <div className="pt-4 border-t border-black/[0.06] space-y-2 text-xs text-[#524E48]">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#8F6E38] shrink-0" />
                <span>جنس و نگهداری: {product.fabricCare}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#8F6E38] shrink-0" />
                <span>ارسال ۱ تا ۲ روز کاری در تهران و ۲ تا ۴ روز کاری سراسر کشور</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8F6E38] shrink-0" />
                <span>۷ روز ضمانت تعویض سایز و اصالت کالا</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Similar Products */}
      {related.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-black/[0.08]">
          <h2 className="text-xl font-bold text-[#18181B]">محصولات مشابه</h2>
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
    </div>
  );
};
