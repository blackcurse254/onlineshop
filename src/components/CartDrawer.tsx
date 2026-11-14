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
        <div className="px-5 py-4 bg-white border-b border-[#16141A]/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[var(--adonis-primary)]" strokeWidth={1.75} />
            <h2 id="cart-drawer-title" className="text-lg text-[var(--adonis-primary)]">
              سبد خرید شما
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="بستن سبد خرید"
            data-testid="cart-drawer-close"
            className="p-2 text-[#6A6670] hover:text-[var(--adonis-primary)] rounded-sm min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-3 bg-[#E2E0DB] border-b border-[#16141A]/[0.06] text-xs text-[#4B4752]">
            {remainingForFree === 0 ? (
              <p className="font-medium text-[var(--adonis-primary)]">
                سفارش شما مشمول ارسال رایگان استاندارد است.
              </p>
            ) : (
              <p>
                تنها <span className="font-semibold tabular-nums">{formatToman(remainingForFree)}</span> تا ارسال رایگان فاصله دارید.
              </p>
            )}
            <div className="w-full h-1.5 bg-[#16141A]/10 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[var(--adonis-accent)] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag className="w-12 h-12 text-[#16141A]/20 mb-3" strokeWidth={1.25} />
              <p className="text-sm font-medium text-[var(--adonis-primary)] mb-1">سبد خرید شما خالی است</p>
              <p className="text-xs text-[#85818A] mb-6">
                محصولات منتخب کلکسیون جدید را بررسی کنید.
              </p>
              <button
                type="button"
                onClick={() => {
                  markNavigationClose();
                  setIsCartOpen(false);
                  onNavigate('/shop');
                }}
                className="px-5 py-2.5 text-xs font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:bg-[#B01D39] transition-colors"
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
                  className="flex gap-3.5 bg-white p-3 rounded-sm border border-[#16141A]/[0.08]"
                >
                  <div className="w-20 h-20 rounded-sm overflow-hidden bg-[#E2E0DB] shrink-0">
                    <SafeImage src={item.image} alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium text-[var(--adonis-primary)] line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-[#85818A] mt-0.5">
                          سایز {item.selectedSize} · {item.selectedColor}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.key)}
                        aria-label={`حذف ${item.name} از سبد خرید`}
                        className="text-[#85818A] hover:text-[#B01D39] p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="inline-flex items-center border border-[#16141A]/15 rounded-sm">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.key, item.quantity - 1)}
                          aria-label={`کاهش تعداد ${item.name}`}
                          className="p-1.5 text-[var(--adonis-primary)] hover:bg-[#16141A]/5"
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
                          className="p-1.5 text-[var(--adonis-primary)] hover:bg-[#16141A]/5 disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-semibold text-[var(--adonis-primary)] tabular-nums">
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
          <div className="p-5 bg-white border-t border-[#16141A]/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6A6670]">
              <span>جمع کل کالاها</span>
              <span className="tabular-nums font-medium text-[var(--adonis-primary)]">{formatToman(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-[#6A6670]">
              <span>هزینه ارسال استاندارد</span>
              <span className="tabular-nums font-medium text-[var(--adonis-primary)]">
                {totals.shippingCost === 0 ? 'رایگان' : formatToman(totals.shippingCost)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-semibold text-[var(--adonis-primary)] pt-2 border-t border-[#16141A]/[0.06]">
              <span>مبلغ قابل پرداخت</span>
              <span className="tabular-nums">{formatToman(totals.totalAmount)}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                markNavigationClose();
                setIsCartOpen(false);
                onNavigate('/checkout');
              }}
              data-testid="cart-checkout-button"
              className="w-full py-3 px-4 bg-[var(--adonis-accent)] text-white text-sm font-medium rounded-sm hover:bg-[#B01D39] transition-colors"
            >
              ادامه و ثبت سفارش
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
