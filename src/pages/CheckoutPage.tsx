import React, { useEffect, useState } from 'react';
import { Check, CheckCircle2, Info, ShoppingBag, Tag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import { SafeImage } from '../components/SafeImage';
import {
  calculateOrderTotals,
  formatToman,
  getEffectivePrice,
  validateIranianPhone,
  validateIranianPostalCode,
} from '../utils/commerce';
import type { Order, OrderItem } from '../types/store';

interface CheckoutPageProps {
  onNavigate: (path: string) => void;
}

const CheckoutSteps: React.FC<{ activeStep: 1 | 2 | 3 }> = ({ activeStep }) => {
  const steps = [
    { id: 1 as const, label: 'سبد خرید' },
    { id: 2 as const, label: 'اطلاعات و ارسال' },
    { id: 3 as const, label: 'پرداخت' },
  ];

  return (
    <div
      className="bg-white border border-[#16141A]/[0.08] rounded-sm px-4 sm:px-6 py-4"
      aria-label="مراحل ثبت سفارش"
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {steps.map((step, idx) => {
          const done = step.id < activeStep;
          const active = step.id === activeStep;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <span
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold tabular-nums transition-colors ${
                    done
                      ? 'bg-[#16141A] text-[#EFEEEA]'
                      : active
                        ? 'bg-[#C21E3C] text-white ring-4 ring-[#EBDADD]'
                        : 'bg-[#E2E0DB] text-[#6A6670]'
                  }`}
                >
                  {done ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  ) : (
                    new Intl.NumberFormat('fa-IR').format(step.id)
                  )}
                </span>
                <span
                  className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                    active ? 'text-[#16141A] font-semibold' : done ? 'text-[#16141A]' : 'text-[#6A6670]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 min-w-[20px] meander opacity-70" aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate }) => {
  const { cart, settings, user, clearCart, refreshStorefront } = useStore();

  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(user?.address || '');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '');
  const [shippingMethod, setShippingMethod] = useState<'standard' | 'express'>('standard');
  const [notes, setNotes] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    title: string;
    percent: number;
    minOrderAmount: number;
  } | null>(null);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
  const [completedOrder, setCompletedOrder] = useState<{
    order: Order;
    items: OrderItem[];
    notice: string;
  } | null>(null);

  const cartSignature = cart.map((c) => `${c.key}:${c.quantity}`).join('|');

  useEffect(() => {
    setIdempotencyKey(
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    );
  }, [cartSignature]);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.fullName);
      if (!customerPhone) setCustomerPhone(user.phone);
      if (!customerAddress) setCustomerAddress(user.address);
      if (!postalCode) setPostalCode(user.postalCode);
    }
  }, [user]);

  const totals = calculateOrderTotals({
    items: cart.map((c) => ({
      price: c.price,
      discountPrice: c.discountPrice,
      quantity: c.quantity,
    })),
    shippingMethod,
    standardShippingCost: settings?.shippingBaseCost ?? 85000,
    expressShippingCost: settings?.expressShippingCost ?? 165000,
    freeShippingThreshold: settings?.freeShippingThreshold ?? 4500000,
    discountPercent: appliedCoupon?.percent,
    discountMinOrder: appliedCoupon?.minOrderAmount,
  });

  const handleApplyCoupon = async () => {
    setCouponMessage(null);
    if (!couponInput.trim()) return;
    try {
      const res = await apiFetch<{
        valid: boolean;
        code: string;
        title: string;
        percent: number;
        minOrderAmount: number;
      }>('/api/discounts/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponInput.trim(), subtotal: totals.subtotal }),
      });
      setAppliedCoupon(res);
      setCouponMessage(`کد تخفیف ${res.code} (${res.percent}٪) با موفقیت اعمال شد.`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponMessage(err.message || 'کد تخفیف معتبر نیست.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setError('نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.');
      return;
    }
    if (!validateIranianPhone(customerPhone)) {
      setError('شماره موبایل معتبر نیست (باید با ۰۹ شروع شود و ۱۱ رقم باشد).');
      return;
    }
    if (!customerAddress.trim() || customerAddress.trim().length < 8) {
      setError('آدرس کامل پستی را وارد کنید.');
      return;
    }
    if (!validateIranianPostalCode(postalCode)) {
      setError('کد پستی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ order: Order; items: OrderItem[]; notice: string }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey,
          customerName,
          customerPhone,
          customerAddress,
          postalCode,
          shippingMethod,
          discountCode: appliedCoupon?.code || null,
          notes,
          items: cart.map((c) => ({
            productId: c.productId,
            selectedSize: c.selectedSize,
            selectedColor: c.selectedColor,
            quantity: c.quantity,
          })),
        }),
      });

      setCompletedOrder(res);
      clearCart();
      await refreshStorefront();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت سفارش');
    } finally {
      setSubmitting(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-6">
        <CheckoutSteps activeStep={3} />

        <div className="bg-white border border-[#16141A]/10 border-t-2 border-t-[#C21E3C] rounded-sm p-6 sm:p-10 space-y-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-[#C21E3C] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۳ — تایید سفارش</div>
              <h1 className="text-3xl sm:text-4xl text-[#16141A]">سفارش شما ثبت شد (حالت آزمایشی)</h1>
              <p className="text-sm text-[#6A6670]">{completedOrder.notice}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#EFEEEA] p-4 rounded-sm border border-[#16141A]/[0.08] text-xs sm:text-sm">
            <div>
              <span className="text-[#6A6670]">کد پیگیری سفارش: </span>
              <strong dir="ltr" className="inline-block text-[#16141A] tabular-nums" data-testid="order-number">
                {completedOrder.order.orderNumber}
              </strong>
            </div>
            <div>
              <span className="text-[#6A6670]">وضعیت پرداخت: </span>
              <strong className="text-[#B01D39]">پرداخت آزمایشی شبیه‌سازی‌شده</strong>
            </div>
            <div>
              <span className="text-[#6A6670]">تحویل‌گیرنده: </span>
              <span className="font-medium text-[#16141A]">{completedOrder.order.customerName}</span>
            </div>
            <div>
              <span className="text-[#6A6670]">مبلغ نهایی سفارش: </span>
              <strong className="tabular-nums text-[#16141A]">
                {formatToman(completedOrder.order.totalAmount)}
              </strong>
            </div>
          </div>

          <div className="meander" aria-hidden="true" />

          <div className="space-y-3">
            <h2 className="text-xl text-[#16141A]">اقلام سفارش</h2>
            {completedOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs sm:text-sm py-2.5 border-b border-[#16141A]/[0.06]"
              >
                <div>
                  <span className="font-semibold text-[#16141A]">{item.productName}</span>
                  <span className="text-[#6A6670] ms-2 tabular-nums">
                    ({item.selectedSize} · {item.selectedColor} × {item.quantity})
                  </span>
                </div>
                <span className="tabular-nums font-semibold text-[#16141A]">
                  {formatToman(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/account?tab=track')}
              className="min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-semibold bg-[#C21E3C] text-white rounded-sm hover:bg-[#16141A] transition-colors"
            >
              پیگیری سفارش
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/shop')}
              className="min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-medium border border-[#16141A] text-[#16141A] rounded-sm hover:bg-[#16141A] hover:text-[#EFEEEA] transition-colors"
            >
              ادامه خرید
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 sm:py-20 text-center space-y-5">
        <div className="arch-frame w-28 h-36 mx-auto bg-[#E2E0DB] border border-[#16141A]/10 flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-[#16141A]/35" strokeWidth={1.25} />
        </div>
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۱ — تسویه حساب</div>
          <h1 className="text-3xl sm:text-4xl text-[#16141A]">سبد خرید شما خالی است</h1>
          <p className="text-sm text-[#6A6670]">ابتدا مدل مورد نظر خود را به سبد خرید اضافه کنید.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-semibold bg-[#C21E3C] text-white rounded-sm hover:bg-[#16141A] transition-colors"
        >
          مشاهده فروشگاه
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <div className="space-y-1 border-b border-[#16141A]/[0.08] pb-5">
        <div className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۱ — تسویه حساب</div>
        <h1 className="text-3xl sm:text-5xl text-[#16141A]">تکمیل اطلاعات و ثبت سفارش</h1>
      </div>

      <CheckoutSteps activeStep={2} />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-[#16141A]/[0.08] border-t-2 border-t-[#16141A] rounded-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl text-[#16141A]">اطلاعات تحویل‌گیرنده</h2>

          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-sm bg-[#EBDADD] border border-[#C21E3C]/35 border-s-2 border-s-[#C21E3C] text-xs sm:text-sm text-[#16141A] font-medium"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="checkout-name" className="block text-xs font-semibold text-[#16141A]">
                نام و نام خانوادگی
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: مریم رضایی"
                className="w-full min-h-[44px] px-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkout-phone" className="block text-xs font-semibold text-[#16141A]">
                شماره موبایل
              </label>
              <input
                id="checkout-phone"
                type="tel"
                required
                dir="ltr"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C] tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="checkout-address" className="block text-xs font-semibold text-[#16141A]">
              آدرس کامل پستی
            </label>
            <textarea
              id="checkout-address"
              required
              rows={3}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="استان، شهر، خیابان، پلاک، واحد"
              className="w-full p-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="checkout-postal" className="block text-xs font-semibold text-[#16141A]">
                کد پستی ۱۰ رقمی
              </label>
              <input
                id="checkout-postal"
                type="text"
                required
                dir="ltr"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1968734511"
                className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C] tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkout-notes" className="block text-xs font-semibold text-[#16141A]">
                یادداشت سفارش (اختیاری)
              </label>
              <input
                id="checkout-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات تحویل یا بسته‌بندی هدیه"
                className="w-full min-h-[44px] px-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#16141A]/[0.08]">
            <h3 className="text-sm font-semibold text-[#16141A]">روش ارسال</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-between p-3.5 min-h-[56px] rounded-sm border cursor-pointer transition-colors ${
                  shippingMethod === 'standard'
                    ? 'border-[#C21E3C] bg-[#EBDADD]/60'
                    : 'border-[#16141A]/15 hover:border-[#16141A]/35'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                    className="accent-[#C21E3C]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#16141A]">پست / پیک استاندارد</div>
                    <div className="text-[11px] text-[#6A6670]">۲ تا ۴ روز کاری</div>
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums text-[#16141A]">
                  {totals.qualifiesForFreeShipping
                    ? 'رایگان'
                    : formatToman(settings?.shippingBaseCost ?? 85000)}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-3.5 min-h-[56px] rounded-sm border cursor-pointer transition-colors ${
                  shippingMethod === 'express'
                    ? 'border-[#C21E3C] bg-[#EBDADD]/60'
                    : 'border-[#16141A]/15 hover:border-[#16141A]/35'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="accent-[#C21E3C]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#16141A]">ارسال اکسپرس ویژه</div>
                    <div className="text-[11px] text-[#6A6670]">تحویل سریع ۱ روزه</div>
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums text-[#16141A]">
                  {formatToman(settings?.expressShippingCost ?? 165000)}
                </span>
              </label>
            </div>
          </div>

          {/* Demo Payment Transparency Notice */}
          <div className="p-4 rounded-sm bg-[#EFEEEA] border border-[#16141A]/10 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#C21E3C] shrink-0 mt-0.5" />
            <div className="text-xs text-[#4B4752] space-y-1 leading-relaxed">
              <div className="font-semibold text-[#16141A]">پرداخت آزمایشی (نسخه نمایشی)</div>
              <p>
                در این پیش‌نمایش، ثبت سفارش و پرداخت به‌صورت آزمایشی شبیه‌سازی می‌شود و اتصال به درگاه بانکی واقعی انجام نگرفته است.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Order Summary */}
        <aside className="lg:col-span-5 bg-white border border-[#16141A]/[0.08] border-t-2 border-t-[#16141A] rounded-sm overflow-hidden lg:sticky lg:top-24">
          <div className="p-6 space-y-5">
            <h2 className="text-2xl sm:text-3xl text-[#16141A] border-b border-[#16141A]/[0.08] pb-3">
              خلاصه سفارش
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto pe-1">
              {cart.map((item) => {
                const unit = getEffectivePrice(item.price, item.discountPrice);
                return (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-sm overflow-hidden bg-[#E2E0DB] border border-[#16141A]/[0.08] shrink-0">
                        <SafeImage src={item.image} alt={item.name} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#16141A] truncate">{item.name}</div>
                        <div className="text-xs text-[#6A6670] tabular-nums">
                          سایز {item.selectedSize} · {item.selectedColor} × {item.quantity}
                        </div>
                      </div>
                    </div>
                    <span className="tabular-nums font-semibold text-[#16141A] shrink-0">
                      {formatToman(unit * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#16141A]/[0.06] space-y-2">
              <label htmlFor="coupon-code" className="block text-xs font-semibold text-[#16141A]">
                کد تخفیف (نمونه: ADONIS15)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-[#6A6670] absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="coupon-code"
                    type="text"
                    dir="ltr"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="ADONIS15"
                    className="w-full min-h-[44px] ps-8 pe-3 text-xs uppercase bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className="px-4 min-h-[44px] text-xs font-semibold border border-[#16141A] text-[#16141A] rounded-sm hover:bg-[#16141A] hover:text-[#EFEEEA] transition-colors whitespace-nowrap"
                >
                  اعمال کد
                </button>
              </div>
              {couponMessage && <p className="text-xs text-[#B01D39] font-medium">{couponMessage}</p>}
            </div>

            <div className="meander" aria-hidden="true" />

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-[#6A6670]">
                <span>جمع کالاها</span>
                <span className="tabular-nums font-medium text-[#16141A]">{formatToman(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-[#B01D39] font-semibold">
                  <span>تخفیف ({appliedCoupon?.code})</span>
                  <span className="tabular-nums">−{formatToman(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6A6670]">
                <span>هزینه ارسال</span>
                <span className="tabular-nums font-medium text-[#16141A]">
                  {totals.shippingCost === 0 ? 'رایگان' : formatToman(totals.shippingCost)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#2B1A2E] text-[#EFEEEA] px-6 py-4 flex items-center justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-[#F2B6C0]">مبلغ قابل پرداخت</span>
            <span className="text-lg sm:text-xl font-bold tabular-nums">{formatToman(totals.totalAmount)}</span>
          </div>

          <div className="p-5 bg-white">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] py-3 px-4 bg-[#C21E3C] text-white text-sm font-semibold rounded-sm hover:bg-[#16141A] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'در حال ثبت سفارش...' : 'ثبت سفارش و پرداخت آزمایشی'}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
};
