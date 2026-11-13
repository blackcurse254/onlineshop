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
      className="group flex flex-col bg-white border border-black/[0.06] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4EFE6]">
        <button
          type="button"
          onClick={() => onNavigate(`/product/${product.slug}`)}
          className="block w-full h-full text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181B]"
          aria-label={`مشاهده جزئیات ${product.name}`}
        >
          <SafeImage
            src={product.images[0] || ''}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          {outOfStock && (
            <div className="absolute inset-0 bg-[#18181B]/45 flex items-center justify-center">
              <span className="text-xs font-medium text-white bg-[#18181B]/85 px-3 py-1 rounded">
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
              ? 'bg-[#18181B] text-[#E5CFA3] border-[#18181B] shadow-sm'
              : 'bg-white/90 text-[#18181B] border-black/10 hover:bg-white hover:border-[#B5945B]/50'
          }`}
        >
          <Heart className="w-4 h-4 transition-transform" fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-center justify-between gap-2 text-xs text-[#6B665F]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-[#18181B] shrink-0">{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{category?.name || 'کفش و کتونی'}</span>
          </div>
          {discountPct > 0 ? (
            <span className="text-[#8F6E38] font-semibold tabular-nums shrink-0">
              {new Intl.NumberFormat('fa-IR').format(discountPct)}٪ تخفیف
            </span>
          ) : product.isNew ? (
            <span className="text-[#8F6E38] font-medium shrink-0">جدید</span>
          ) : null}
        </div>

        <h3 className="text-sm sm:text-base font-semibold text-[#18181B] leading-snug line-clamp-1">
          <button
            type="button"
            onClick={() => onNavigate(`/product/${product.slug}`)}
            className="text-start hover:text-[#8F6E38] transition-colors w-full truncate"
          >
            {product.name}
          </button>
        </h3>

        <div className="flex items-center justify-between text-[11px] text-[#6B665F]">
          <span className="truncate">{product.model || product.upperMaterial}</span>
          <span className={`tabular-nums shrink-0 ${outOfStock ? 'text-red-700' : 'text-emerald-800'}`}>
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
                  className={`min-w-[28px] h-6 px-1.5 text-[11px] font-medium rounded border tabular-nums transition-colors ${
                    unavailable
                      ? 'bg-[#F4EFE6] text-[#A8A196] border-black/10 line-through cursor-not-allowed opacity-60'
                      : active
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-[#FAF7F2] text-[#3F3B36] border-black/10 hover:border-[#18181B]'
                  }`}
                >
                  {entry.size}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-auto pt-2.5 border-t border-black/[0.05] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            {discountPct > 0 && (
              <span className="text-xs text-[#8A847C] line-through tabular-nums">
                {formatToman(product.price)}
              </span>
            )}
            <span className="text-sm sm:text-[15px] font-semibold text-[#18181B] tabular-nums">
              {formatToman(effectivePrice)}
            </span>
          </div>

          {onQuickAdd ? (
            <button
              type="button"
              disabled={outOfStock || !selectedCardSize}
              onClick={() => onQuickAdd(product, selectedCardSize)}
              aria-label={`افزودن سریع ${product.name} به سبد خرید`}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[#18181B]/20 text-[#18181B] hover:bg-[#18181B] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              {outOfStock ? 'اتمام موجودی' : 'افزودن'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(`/product/${product.slug}`)}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[#18181B]/20 text-[#18181B] hover:bg-[#18181B] hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              جزئیات
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
