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

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className="group flex flex-col bg-white border border-[#16141A]/[0.08] rounded-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-[var(--adonis-accent)]/40"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#E2E0DB]">
        <button
          type="button"
          onClick={() => onNavigate(`/product/${product.slug}`)}
          className="block w-full h-full text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--adonis-accent)]"
          aria-label={`مشاهده جزئیات ${product.name}`}
        >
          <SafeImage
            src={product.images[0] || ''}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {outOfStock && (
            <div className="absolute inset-0 bg-[#2B1A2E]/60 flex items-center justify-center">
              <span className="text-xs font-medium text-white bg-[#16141A]/90 px-3 py-1 rounded-sm">
                ناموجود
              </span>
            </div>
          )}
        </button>

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
          className={`absolute top-3 end-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm border active:scale-95 transition-all cursor-pointer ${
            wishlisted
              ? 'bg-[var(--adonis-accent)] text-white border-[var(--adonis-accent)] shadow-sm'
              : 'bg-white/95 text-[var(--adonis-primary)] border-[#16141A]/10 hover:bg-white hover:border-[var(--adonis-accent)]/50'
          }`}
        >
          <Heart className="w-4 h-4 transition-transform" fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center justify-between gap-2 text-xs text-[#85818A]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-[var(--adonis-primary)] shrink-0">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{category?.name || 'کفش و کتونی'}</span>
          </div>
          {discountPct > 0 ? (
            <span className="text-[#B01D39] font-semibold tabular-nums shrink-0">
              {new Intl.NumberFormat('fa-IR').format(discountPct)}٪ تخفیف
            </span>
          ) : product.isNew ? (
            <span className="text-[#B01D39] font-medium shrink-0">جدید</span>
          ) : null}
        </div>

        <h3 className="text-sm sm:text-base font-semibold text-[var(--adonis-primary)] leading-snug line-clamp-1">
          <button
            type="button"
            onClick={() => onNavigate(`/product/${product.slug}`)}
            className="text-start hover:text-[#B01D39] transition-colors w-full truncate"
          >
            {product.name}
          </button>
        </h3>

        <div className="flex items-center justify-between text-[11px] text-[#85818A]">
          <span className="truncate">{product.model || product.upperMaterial}</span>
          <span className={`tabular-nums font-medium shrink-0 ${outOfStock ? 'text-[#B01D39]' : 'text-emerald-700'}`}>
            {outOfStock ? 'ناموجود' : 'موجود'}
          </span>
        </div>

        {onQuickAdd && sizeEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-1" role="group" aria-label={`انتخاب سایز ${product.name}`}>
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
                      ? 'bg-[#E2E0DB] text-[#85818A] border-[#16141A]/10 line-through cursor-not-allowed opacity-70'
                      : active
                        ? 'bg-[var(--adonis-primary)] text-white border-[var(--adonis-primary)]'
                        : 'bg-[#EFEEEA] text-[#4B4752] border-[#16141A]/10 hover:border-[var(--adonis-accent)]'
                  }`}
                >
                  {entry.size}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-[#16141A]/[0.06] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            {discountPct > 0 && (
              <span className="text-xs text-[#85818A] line-through tabular-nums">
                {formatToman(product.price)}
              </span>
            )}
            <span className="text-sm sm:text-[15px] font-bold text-[var(--adonis-primary)] tabular-nums">
              {formatToman(effectivePrice)}
            </span>
          </div>

          {onQuickAdd ? (
            <button
              type="button"
              disabled={outOfStock || !selectedCardSize}
              onClick={() => onQuickAdd(product, selectedCardSize)}
              aria-label={`افزودن سریع ${product.name} به سبد خرید`}
              className="px-3.5 py-2 text-xs font-medium rounded-sm border border-[#16141A]/20 text-[var(--adonis-primary)] hover:bg-[var(--adonis-accent)] hover:text-white hover:border-[var(--adonis-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              {outOfStock ? 'اتمام موجودی' : 'افزودن'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(`/product/${product.slug}`)}
              className="px-3.5 py-2 text-xs font-medium rounded-sm border border-[#16141A]/20 text-[var(--adonis-primary)] hover:bg-[var(--adonis-accent)] hover:text-white hover:border-[var(--adonis-accent)] transition-colors whitespace-nowrap shrink-0"
            >
              جزئیات
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
