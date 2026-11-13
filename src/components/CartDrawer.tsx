import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SafeImage } from './SafeImage';
import { calculateOrderTotals, formatToman, getEffectivePrice } from '../utils/commerce';

interface CartDrawerProps {
  onNavigate: (path: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const { cart, isCartOpen, setIsCartOpen, updateCartQty, removeFromCart, settings } = useStore();

  if (!isCartOpen) return null;

  const threshold = settings?.freeShippingThreshold ?? 4500000;
  const standardCost = settings?.shippingBaseCost ?? 85000;
  const expressCost = settings?.expressShippingCost ?? 165000;

  const totals = calculateOrderTotals({
    items: cart.map((c) => ({
      price: c.price,
      discountPrice: c.discountPrice,
      quantity: c.quantity,
    })),
    shippingMethod: 'standard',
    standardShippingCost: standardCost,
    expressShippingCost: expressCost,
    freeShippingThreshold: threshold,
  });

  const remainingForFree = Math.max(0, threshold - totals.subtotal);
  const progressPct = Math.min(100, Math.round((totals.subtotal / Math.max(1, threshold)) * 100));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="سبد خرید">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={() => setIsCartOpen(false)}
      />

      <aside className="relative z-10 w-full max-w-md bg-[#FAF7F2] h-full flex flex-col shadow-2xl border-s border-black/10">
        <div className="px-5 py-4 bg-white border-b border-black/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#18181B]" strokeWidth={1.75} />
            <h2 className="text-base font-semibold text-[#18181B]">سبد خرید شما</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="بستن سبد خرید"
            className="p-2 text-[#524E48] hover:text-[#18181B] rounded-md min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-3 bg-[#F3EDE2] border-b border-black/[0.06] text-xs text-[#3F3B36]">
            {remainingForFree === 0 ? (
              <p className="font-medium text-[#18181B]">
                سفارش شما مشمول ارسال رایگان استاندارد است.
              </p>
            ) : (
              <p>
                تنها <span className="font-semibold tabular-nums">{formatToman(remainingForFree)}</span> تا ارسال رایگان فاصله دارید.
              </p>
            )}
            <div className="w-full h-1.5 bg-black/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[#B5945B] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#18181B]/25 mb-3" strokeWidth={1.25} />
              <p className="text-sm font-medium text-[#18181B] mb-1">سبد خرید شما خالی است</p>
              <p className="text-xs text-[#6B665F] mb-6">
                محصولات منتخب کلکسیون جدید را بررسی کنید.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  onNavigate('/shop');
                }}
                className="px-5 py-2.5 text-xs font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E] transition-colors"
              >
                مشاهده فروشگاه
              </button>
            </div>
          ) : (
            cart.map((item) => {
              const unit = getEffectivePrice(item.price, item.discountPrice);
              return (
                <div
                  key={item.key}
                  className="flex gap-3.5 bg-white p-3 rounded-lg border border-black/[0.06]"
                >
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-[#F4EFE6] shrink-0">
                    <SafeImage src={item.image} alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium text-[#18181B] line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-[#6B665F] mt-0.5">
                          سایز {item.selectedSize} · {item.selectedColor}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.key)}
                        aria-label={`حذف ${item.name} از سبد خرید`}
                        className="text-[#8A847C] hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-black/15 rounded-md">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.key, item.quantity - 1)}
                          aria-label={`کاهش تعداد ${item.name}`}
                          className="p-1.5 text-[#18181B] hover:bg-black/5"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-medium tabular-nums">
                          {new Intl.NumberFormat('fa-IR').format(item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.key, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          aria-label={`افزایش تعداد ${item.name}`}
                          className="p-1.5 text-[#18181B] hover:bg-black/5 disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-[#18181B] tabular-nums">
                        {formatToman(unit * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 bg-white border-t border-black/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6B665F]">
              <span>جمع کل کالاها</span>
              <span className="tabular-nums font-medium text-[#18181B]">{formatToman(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6B665F]">
              <span>هزینه ارسال استاندارد</span>
              <span className="tabular-nums font-medium text-[#18181B]">
                {totals.shippingCost === 0 ? 'رایگان' : formatToman(totals.shippingCost)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-[#18181B] pt-2 border-t border-black/[0.06]">
              <span>مبلغ قابل پرداخت</span>
              <span className="tabular-nums">{formatToman(totals.totalAmount)}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                onNavigate('/checkout');
              }}
              className="w-full py-3 px-4 bg-[#18181B] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2E] transition-colors"
            >
              ادامه و ثبت سفارش
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
