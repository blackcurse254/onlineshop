import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, ShoppingBag, Tag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-[#16141A]/[0.08] rounded-sm p-6 sm:p-10 space-y-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-[var(--adonis-accent)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl text-[var(--adonis-primary)]">
                سفارش شما ثبت شد (حالت آزمایشی)
              </h1>
              <p className="text-sm text-[#6A6670]">{completedOrder.notice}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#EFEEEA] p-4 rounded-sm border border-[#16141A]/[0.06] text-xs sm:text-sm">
            <div>
              <span className="text-[#85818A]">کد پیگیری سفارش: </span>
              <strong dir="ltr" className="inline-block text-[var(--adonis-primary)] tabular-nums" data-testid="order-number">
                {completedOrder.order.orderNumber}
              </strong>
            </div>
            <div>
              <span className="text-[#85818A]">وضعیت پرداخت: </span>
              <strong className="text-[#B01D39]">پرداخت آزمایشی شبیه‌سازی‌شده</strong>
            </div>
            <div>
              <span className="text-[#85818A]">تحویل‌گیرنده: </span>
              <span>{completedOrder.order.customerName}</span>
            </div>
            <div>
              <span className="text-[#85818A]">مبلغ نهایی سفارش: </span>
              <strong className="tabular-nums">{formatToman(completedOrder.order.totalAmount)}</strong>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base text-[var(--adonis-primary)]">اقلام سفارش</h2>
            {completedOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs sm:text-sm py-2 border-b border-[#16141A]/[0.05]"
              >
                <div>
                  <span className="font-medium text-[var(--adonis-primary)]">{item.productName}</span>
                  <span className="text-[#85818A] ms-2">
                    ({item.selectedSize} · {item.selectedColor} × {item.quantity})
                  </span>
                </div>
                <span className="tabular-nums font-medium">
                  {formatToman(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/account?tab=track')}
              className="px-5 py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:bg-[#B01D39]"
            >
              پیگیری سفارش
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/shop')}
              className="px-5 py-2.5 text-xs sm:text-sm font-medium border border-[#16141A]/15 text-[var(--adonis-primary)] rounded-sm hover:bg-[#EFEEEA]"
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
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <ShoppingBag className="w-12 h-12 mx-auto text-[#16141A]/20" strokeWidth={1.25} />
        <h1 className="text-2xl text-[var(--adonis-primary)]">سبد خرید شما خالی است</h1>
        <p className="text-sm text-[#85818A]">ابتدا محصول مورد نظر خود را به سبد خرید اضافه کنید.</p>
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="px-5 py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:bg-[#B01D39]"
        >
          مشاهده فروشگاه
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <h1 className="text-2xl sm:text-3xl text-[var(--adonis-primary)] border-b border-[#16141A]/[0.08] pb-4">
        تکمیل اطلاعات و ثبت سفارش
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-[#16141A]/[0.08] rounded-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-lg text-[var(--adonis-primary)]">اطلاعات تحویل‌گیرنده</h2>

          {error && (
            <div role="alert" className="p-3.5 rounded-sm bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="checkout-name" className="block text-xs font-medium text-[var(--adonis-primary)]">
                نام و نام خانوادگی
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: مریم رضایی"
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkout-phone" className="block text-xs font-medium text-[var(--adonis-primary)]">
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
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="checkout-address" className="block text-xs font-medium text-[var(--adonis-primary)]">
              آدرس کامل پستی
            </label>
            <textarea
              id="checkout-address"
              required
              rows={3}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="استان، شهر، خیابان، پلاک، واحد"
              className="w-full p-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="checkout-postal" className="block text-xs font-medium text-[var(--adonis-primary)]">
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
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkout-notes" className="block text-xs font-medium text-[var(--adonis-primary)]">
                یادداشت سفارش (اختیاری)
              </label>
              <input
                id="checkout-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات تحویل یا بسته‌بندی هدیه"
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#16141A]/[0.06]">
            <h3 className="text-sm font-semibold text-[var(--adonis-primary)]">روش ارسال</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-between p-3.5 rounded-sm border cursor-pointer transition-colors ${
                  shippingMethod === 'standard'
                    ? 'border-[var(--adonis-accent)] bg-[#EBDADD]'
                    : 'border-[#16141A]/15 hover:border-[#16141A]/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                    className="accent-[var(--adonis-accent)]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[var(--adonis-primary)]">پست / پیک استاندارد</div>
                    <div className="text-[11px] text-[#85818A]">۲ تا ۴ روز کاری</div>
                  </div>
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {totals.qualifiesForFreeShipping
                    ? 'رایگان'
                    : formatToman(settings?.shippingBaseCost ?? 85000)}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-3.5 rounded-sm border cursor-pointer transition-colors ${
                  shippingMethod === 'express'
                    ? 'border-[var(--adonis-accent)] bg-[#EBDADD]'
                    : 'border-[#16141A]/15 hover:border-[#16141A]/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="accent-[var(--adonis-accent)]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[var(--adonis-primary)]">ارسال اکسپرس ویژه</div>
                    <div className="text-[11px] text-[#85818A]">تحویل سریع ۱ روزه</div>
                  </div>
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {formatToman(settings?.expressShippingCost ?? 165000)}
                </span>
              </label>
            </div>
          </div>

          {/* Demo Payment Transparency Notice */}
          <div className="p-4 rounded-sm bg-[#EBDADD] border border-[#C21E3C]/25 flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--adonis-accent)] shrink-0 mt-0.5" />
            <div className="text-xs text-[#4B4752] space-y-1 leading-relaxed">
              <div className="font-semibold text-[var(--adonis-primary)]">پرداخت آزمایشی (نسخه نمایشی)</div>
              <p>
                در این پیش‌نمایش، ثبت سفارش و پرداخت به‌صورت آزمایشی شبیه‌سازی می‌شود و اتصال به درگاه بانکی واقعی انجام نگرفته است.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Order Summary */}
        <aside className="lg:col-span-5 bg-white border border-[#16141A]/[0.08] rounded-sm p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-lg text-[var(--adonis-primary)] border-b border-[#16141A]/[0.06] pb-3">
            خلاصه سفارش
          </h2>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.map((item) => {
              const unit = getEffectivePrice(item.price, item.discountPrice);
              return (
                <div key={item.key} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--adonis-primary)] truncate">{item.name}</div>
                    <div className="text-xs text-[#85818A]">
                      سایز {item.selectedSize} · {item.selectedColor} × {item.quantity}
                    </div>
                  </div>
                  <span className="tabular-nums font-medium shrink-0">
                    {formatToman(unit * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#16141A]/[0.06] space-y-2">
            <label htmlFor="coupon-code" className="block text-xs font-medium text-[var(--adonis-primary)]">
              کد تخفیف (نمونه: ADONIS15)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-[#85818A] absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  id="coupon-code"
                  type="text"
                  dir="ltr"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="ADONIS15"
                  className="w-full h-9 ps-8 pe-3 text-xs uppercase bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3.5 h-9 text-xs font-medium border border-[var(--adonis-primary)] text-[var(--adonis-primary)] rounded-sm hover:bg-[var(--adonis-primary)] hover:text-white transition-colors whitespace-nowrap"
              >
                اعمال کد
              </button>
            </div>
            {couponMessage && <p className="text-xs text-[#B01D39] font-medium">{couponMessage}</p>}
          </div>

          <div className="space-y-2 pt-3 border-t border-[#16141A]/[0.06] text-xs sm:text-sm">
            <div className="flex justify-between text-[#6A6670]">
              <span>جمع کالاها</span>
              <span className="tabular-nums">{formatToman(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-[#B01D39] font-medium">
                <span>تخفیف ({appliedCoupon?.code})</span>
                <span className="tabular-nums">-{formatToman(totals.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#6A6670]">
              <span>هزینه ارسال</span>
              <span className="tabular-nums">
                {totals.shippingCost === 0 ? 'رایگان' : formatToman(totals.shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-[var(--adonis-primary)] pt-2 border-t border-[#16141A]/[0.06]">
              <span>مبلغ نهایی</span>
              <span className="tabular-nums">{formatToman(totals.totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-[var(--adonis-accent)] text-white text-sm font-semibold rounded-sm hover:bg-[#B01D39] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'در حال ثبت سفارش...' : 'ثبت سفارش و پرداخت آزمایشی'}
          </button>
        </aside>
      </form>
    </div>
  );
};
