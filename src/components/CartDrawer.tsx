import React, { useRef } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import { SafeImage } from './SafeImage';
import { calculateOrderTotals, formatToman, getEffectivePrice } from '../utils/commerce';

interface CartDrawerProps {
  onNavigate: (path: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const { cart, isCartOpen, setIsCartOpen, updateCartQty, removeFromCart, settings } = useStore();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const { markNavigationClose } = useAccessibleDialog({
    isOpen: isCartOpen,
    onClose: () => setIsCartOpen(false),
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
  });

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
    <div
      ref={drawerRef}
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      data-testid="cart-drawer"
    >
      <div
        className="fixed inset-0 bg-[#2B1A2E]/60 backdrop-blur-[1px]"
        data-testid="cart-drawer-backdrop"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <aside className="relative z-10 w-full max-w-md bg-[#EFEEEA] h-[100dvh] max-h-[100dvh] flex flex-col shadow-2xl border-s border-[#16141A]/10 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overscroll-contain">
        <div className="px-5 py-4 bg-[#2B1A2E] text-[#EFEEEA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#F2B6C0]" strokeWidth={1.75} />
            <h2 id="cart-drawer-title" className="text-xl text-[#EFEEEA]">
              سبد خرید شما
            </h2>
            {cart.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#C21E3C] text-white rounded-sm tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(cart.reduce((s, i) => s + i.quantity, 0))}
              </span>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="بستن سبد خرید"
            data-testid="cart-drawer-close"
            className="p-2 text-[#F2B6C0] hover:text-white hover:bg-white/10 rounded-sm min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-3 bg-[#E2E0DB] border-b border-[#16141A]/[0.08] text-xs text-[#4B4752]">
            {remainingForFree === 0 ? (
              <p className="font-medium text-[#16141A]">
                سفارش شما مشمول ارسال رایگان استاندارد است.
              </p>
            ) : (
              <p>
                تنها <span className="font-semibold text-[#B01D39] tabular-nums">{formatToman(remainingForFree)}</span> تا ارسال رایگان فاصله دارید.
              </p>
            )}
            <div className="w-full h-1.5 bg-[#16141A]/10 rounded-sm mt-2 overflow-hidden">
              <div
                className="h-full bg-[#C21E3C] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="arch-frame w-24 h-28 bg-[#E2E0DB] border border-[#16141A]/10 flex items-center justify-center mb-4">
                <ShoppingBag className="w-9 h-9 text-[#16141A]/35" strokeWidth={1.25} />
              </div>
              <p className="text-base font-semibold text-[#16141A] mb-1">سبد خرید شما خالی است</p>
              <p className="text-xs text-[#6A6670] mb-6 max-w-xs leading-relaxed">
                مدل‌های منتخب کفش و کتونی کلکسیون جدید را بررسی کنید.
              </p>
              <button
                type="button"
                onClick={() => {
                  markNavigationClose();
                  setIsCartOpen(false);
                  onNavigate('/shop');
                }}
                className="min-h-[44px] px-6 py-2.5 text-xs font-semibold bg-[#C21E3C] text-white rounded-sm hover:bg-[#16141A] transition-colors"
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
                  className="flex gap-3.5 bg-white p-3.5 rounded-sm border border-[#16141A]/[0.08]"
                >
                  <div className="w-20 h-20 rounded-sm overflow-hidden bg-[#E2E0DB] border border-[#16141A]/[0.06] shrink-0">
                    <SafeImage src={item.image} alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-sm font-semibold text-[#16141A] line-clamp-1">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium bg-[#EFEEEA] border border-[#16141A]/10 rounded-sm text-[#16141A] tabular-nums">
                            سایز {item.selectedSize}
                          </span>
                          <span className="text-[11px] text-[#6A6670]">{item.selectedColor}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.key)}
                        aria-label={`حذف ${item.name} از سبد خرید`}
                        className="text-[#6A6670] hover:text-[#B01D39] p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-[#16141A]/15 rounded-sm bg-[#EFEEEA]/50">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.key, item.quantity - 1)}
                          aria-label={`کاهش تعداد ${item.name}`}
                          className="w-9 h-9 flex items-center justify-center text-[#16141A] hover:bg-[#16141A]/5 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold tabular-nums">
                          {new Intl.NumberFormat('fa-IR').format(item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.key, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          aria-label={`افزایش تعداد ${item.name}`}
                          className="w-9 h-9 flex items-center justify-center text-[#16141A] hover:bg-[#16141A]/5 disabled:opacity-30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-[#16141A] tabular-nums">
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
          <div className="bg-white border-t border-[#16141A]/[0.08]">
            <div className="meander" aria-hidden="true" />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-[#6A6670]">
                <span>جمع کل کالاها</span>
                <span className="tabular-nums font-medium text-[#16141A]">{formatToman(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#6A6670]">
                <span>هزینه ارسال استاندارد</span>
                <span className="tabular-nums font-medium text-[#16141A]">
                  {totals.shippingCost === 0 ? 'رایگان' : formatToman(totals.shippingCost)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-[#16141A] pt-2.5 border-t border-[#16141A]/[0.08]">
                <span>مبلغ قابل پرداخت</span>
                <span className="tabular-nums text-base">{formatToman(totals.totalAmount)}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  markNavigationClose();
                  setIsCartOpen(false);
                  onNavigate('/checkout');
                }}
                data-testid="cart-checkout-button"
                className="w-full min-h-[48px] py-3 px-4 bg-[#C21E3C] text-white text-sm font-semibold rounded-sm hover:bg-[#16141A] transition-colors"
              >
                ادامه و ثبت سفارش
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
