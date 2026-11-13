import React from 'react';
import { SafeImage } from './SafeImage';
import { calculateDiscountPercent, formatToman, getEffectivePrice } from '../utils/commerce';
import type { Category, Product } from '../types/store';

interface ProductCardProps {
  product: Product;
  category?: Category;
  onNavigate: (path: string) => void;
  onQuickAdd?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  category,
  onNavigate,
  onQuickAdd,
}) => {
  const effectivePrice = getEffectivePrice(product.price, product.discountPrice);
  const discountPct = calculateDiscountPercent(product.price, product.discountPrice);
  const outOfStock = product.stock <= 0;

  return (
    <article className="group flex flex-col bg-white border border-black/[0.06] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onNavigate(`/product/${product.slug}`)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4EFE6] text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18181B]"
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

      <div className="flex flex-col flex-1 p-4 gap-2.5">
        <div className="flex items-center gap-1.5 text-xs text-[#6B665F]">
          <span className="truncate">{category?.name || 'پوشاک ورا'}</span>
          {discountPct > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#8F6E38] font-medium tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(discountPct)}٪ تخفیف
              </span>
            </>
          ) : product.isNew ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#8F6E38] font-medium">کالکشن جدید</span>
            </>
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

        <div className="mt-auto pt-2 border-t border-black/[0.05] flex items-center justify-between gap-3">
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

          {onQuickAdd && (
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => onQuickAdd(product)}
              aria-label={`افزودن سریع ${product.name} به سبد خرید`}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[#18181B]/20 text-[#18181B] hover:bg-[#18181B] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
            >
              {outOfStock ? 'اتمام موجودی' : 'افزودن'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
