import React, { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { SafeImage } from './SafeImage';
import { useStore } from '../context/StoreContext';
import {
  calculateDiscountPercent,
  formatToman,
  getAvailableSizes,
  getEffectivePrice,
  getEffectiveTotalStock,
} from '../utils/commerce';
import type { Category, Product } from '../types/store';

interface ProductCardProps {
  product: Product;
  category?: Category;
  preferredSize?: string | null;
  onNavigate: (path: string) => void;
  onQuickAdd?: (product: Product, selectedSize?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  preferredSize,
  onNavigate,
  onQuickAdd,
}) => {
  const { isWishlisted, toggleWishlist } = useStore();
  const effectivePrice = getEffectivePrice(product.price, product.discountPrice);
  const discountPct = calculateDiscountPercent(product.price, product.discountPrice);
  const totalStock = getEffectiveTotalStock(product);
  const outOfStock = totalStock <= 0;
  const wishlisted = isWishlisted(product.id);

  const availableSizes = useMemo(() => getAvailableSizes(product), [product]);
  const [selectedCardSize, setSelectedCardSize] = useState<string>(() => {
    if (preferredSize && availableSizes.includes(preferredSize)) return preferredSize;
    return availableSizes[0] || '';
  });

  useEffect(() => {
    if (preferredSize && availableSizes.includes(preferredSize)) {
      setSelectedCardSize(preferredSize);
    } else if (!selectedCardSize || !availableSizes.includes(selectedCardSize)) {
      setSelectedCardSize(availableSizes[0] || '');
    }
  }, [preferredSize, availableSizes, product.id]);

  const sizeEntries = product.sizeInventory && product.sizeInventory.length > 0 ? product.sizeInventory : [];
  const primaryImage = product.images[0] || '';
  const secondaryImage = product.images.length > 1 ? product.images[1] : '';

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group h-full flex flex-col bg-white border border-[#0F1A1F]/[0.08] rounded-sm overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:border-[#0F1A1F]/20"
    >
      <div className="relative">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#E2E0DB]">
          <button
            type="button"
            onClick={() => onNavigate(`/product/${product.slug}`)}
            className="block w-full h-full text-start focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--adonis-accent)]"
            aria-label={`مشاهده جزئیات ${product.name}`}
          >
            <SafeImage
              src={primaryImage}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                outOfStock
                  ? 'grayscale opacity-90'
                  : secondaryImage
                    ? 'group-hover:scale-[1.04] md:group-hover:opacity-0'
                    : 'group-hover:scale-[1.04]'
              }`}
            />
            {secondaryImage && !outOfStock && (
              <SafeImage
                src={secondaryImage}
                alt={`${product.name} نمای دوم`}
                className="hidden md:block absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-[1.04]"
              />
            )}
            {outOfStock && (
              <div className="absolute inset-0 bg-[#EFEEEA]/70 backdrop-blur-[1px] flex items-center justify-center">
                <span className="text-xs font-semibold text-[#EFEEEA] bg-[#0F1A1F] px-3.5 py-1.5 rounded-sm shadow-xs">
                  ناموجود
                </span>
              </div>
            )}
          </button>

          {discountPct > 0 && (
            <span className="discount-tag-notched absolute top-3 start-3 z-10 bg-[#C9A24B] text-[#0F1A1F] text-[11px] font-semibold px-2.5 py-1 tabular-nums shadow-xs pointer-events-none">
              <span dir="ltr" className="inline-block">
                −{new Intl.NumberFormat('fa-IR').format(discountPct)}٪
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void toggleWishlist(product.id);
            }}
            data-testid={`wishlist-toggle-${product.id}`}
            title={wishlisted ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
            aria-label={wishlisted ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
            aria-pressed={wishlisted}
            className={`absolute top-3 end-3 z-10 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center backdrop-blur-xs border active:scale-95 transition-all cursor-pointer ${
              wishlisted
                ? 'bg-[#0B7A5F] text-white border-[#0B7A5F] shadow-sm'
                : 'bg-white/90 text-[#0F1A1F] border-[#0F1A1F]/15 hover:bg-white hover:border-[#0B7A5F]'
            }`}
          >
            <Heart className="w-4 h-4 transition-transform" fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.75} />
          </button>
        </div>

        {/* Size chips: single-row scrollable on mobile for equal card heights, slide-up overlay on desktop hover/focus */}
        {onQuickAdd && sizeEntries.length > 0 && !outOfStock && (
          <div
            role="group"
            aria-label={`انتخاب سایز ${product.name}`}
            className="px-3 pt-2.5 pb-1.5 bg-white border-b border-[#0F1A1F]/[0.05] md:border-b-0 md:border-t md:border-[#0F1A1F]/10 md:absolute md:inset-x-0 md:bottom-0 md:z-20 md:bg-white/95 md:backdrop-blur-xs md:p-2.5 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-focus-within:opacity-100 md:group-focus-within:translate-y-0 md:transition-all md:duration-200"
          >
            <div className="flex flex-nowrap md:flex-wrap items-center gap-1 overflow-x-auto md:overflow-visible">
              {sizeEntries.slice(0, 6).map((entry) => {
                const unavailable = entry.stock <= 0;
                const active = selectedCardSize === entry.size && !unavailable;
                return (
                  <button
                    key={entry.size}
                    type="button"
                    disabled={unavailable}
                    onClick={() => setSelectedCardSize(entry.size)}
                    aria-pressed={active}
                    aria-label={unavailable ? `سایز ${entry.size} ناموجود` : `انتخاب سایز ${entry.size}`}
                    className={`min-w-[30px] h-7 px-1.5 text-[11px] font-medium rounded-sm border tabular-nums transition-colors ${
                      unavailable
                        ? 'bg-[#E2E0DB] text-[#7C888D] border-[#0F1A1F]/10 line-through cursor-not-allowed opacity-70'
                        : active
                          ? 'bg-[#0F1A1F] text-white border-[#0F1A1F]'
                          : 'bg-[#EFEEEA] text-[#44525A] border-[#0F1A1F]/10 hover:border-[#0B7A5F]'
                    }`}
                  >
                    {entry.size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Thin 2px gold hover rule directly under image container */}
      <div className="h-[2px] w-full bg-[#0F1A1F]/[0.06] overflow-hidden shrink-0" aria-hidden="true">
        <div className="h-full w-full bg-[#C9A24B] origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
      </div>

      <div className="flex flex-col flex-1 p-3.5 sm:p-4 gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span dir="ltr" className="font-display-serif text-[10px] uppercase tracking-[0.06em] sm:tracking-[0.18em] text-[#5F6B70] shrink-0">
              {product.brand}
            </span>
            <span className="hidden sm:inline text-[#5F6B70] text-[10px] shrink-0" aria-hidden="true">·</span>
            <span className="hidden sm:inline text-[11px] text-[#5F6B70] truncate">{category?.name || 'کفش و کتونی'}</span>
          </div>
          {product.isNew && (
            <span className="text-[#0A6B54] text-[11px] font-semibold shrink-0">جدید</span>
          )}
        </div>

        <h3 className="text-sm sm:text-[15px] font-semibold text-[#0F1A1F] leading-snug line-clamp-2 min-h-[2.5rem]">
          <button
            type="button"
            onClick={() => onNavigate(`/product/${product.slug}`)}
            className="text-start hover:text-[#0A6B54] transition-colors w-full"
          >
            {product.name}
          </button>
        </h3>

        <div className="mt-auto pt-3 border-t border-[#0F1A1F]/[0.06] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-col min-w-0">
            {discountPct > 0 && (
              <span className="text-[11px] text-[#5F6B70] line-through tabular-nums">
                {formatToman(product.price)}
              </span>
            )}
            <span className="text-sm sm:text-[15px] font-semibold text-[#0F1A1F] tabular-nums">
              {formatToman(effectivePrice)}
            </span>
          </div>

          {onQuickAdd ? (
            <button
              type="button"
              disabled={outOfStock || !selectedCardSize}
              onClick={() => onQuickAdd(product, selectedCardSize)}
              aria-label={`افزودن سریع ${product.name} به سبد خرید`}
              className="min-h-[44px] px-3.5 text-xs font-medium rounded-sm bg-[#0F1A1F] text-white hover:bg-[#0B7A5F] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              {outOfStock ? 'ناموجود' : 'افزودن'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(`/product/${product.slug}`)}
              className="min-h-[44px] px-3.5 text-xs font-medium rounded-sm border border-[#0F1A1F] text-[#0F1A1F] hover:bg-[#0F1A1F] hover:text-[#EFEEEA] transition-colors whitespace-nowrap shrink-0"
            >
              جزئیات
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
