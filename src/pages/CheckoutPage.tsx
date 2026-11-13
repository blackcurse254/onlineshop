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
        <div className="bg-white border border-black/[0.08] rounded-xl p-6 sm:p-10 space-y-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-7 h-7 text-[#8F6E38] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[#18181B]">
                سفارش شما ثبت شد (حالت آزمایشی)
              </h1>
              <p className="text-sm text-[#524E48]">{completedOrder.notice}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAF7F2] p-4 rounded-lg border border-black/[0.06] text-xs sm:text-sm">
            <div>
              <span className="text-[#6B665F]">کد پیگیری سفارش: </span>
              <strong dir="ltr" className="inline-block text-[#18181B] tabular-nums" data-testid="order-number">
                {completedOrder.order.orderNumber}
              </strong>
            </div>
            <div>
              <span className="text-[#6B665F]">وضعیت پرداخت: </span>
              <strong className="text-[#8F6E38]">پرداخت آزمایشی شبیه‌سازی‌شده</strong>
            </div>
            <div>
              <span className="text-[#6B665F]">تحویل‌گیرنده: </span>
              <span>{completedOrder.order.customerName}</span>
            </div>
            <div>
              <span className="text-[#6B665F]">مبلغ نهایی سفارش: </span>
              <strong className="tabular-nums">{formatToman(completedOrder.order.totalAmount)}</strong>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#18181B]">اقلام سفارش</h2>
            {completedOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs sm:text-sm py-2 border-b border-black/[0.05]"
              >
                <div>
                  <span className="font-medium text-[#18181B]">{item.productName}</span>
                  <span className="text-[#6B665F] ms-2">
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
              className="px-5 py-2.5 text-xs sm:text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E]"
            >
              پیگیری سفارش
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/shop')}
              className="px-5 py-2.5 text-xs sm:text-sm font-medium border border-black/15 text-[#18181B] rounded-md hover:bg-[#FAF7F2]"
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
        <ShoppingBag className="w-12 h-12 mx-auto text-[#18181B]/25" strokeWidth={1.25} />
        <h1 className="text-xl font-bold text-[#18181B]">سبد خرید شما خالی است</h1>
        <p className="text-sm text-[#6B665F]">ابتدا محصول مورد نظر خود را به سبد خرید اضافه کنید.</p>
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="px-5 py-2.5 text-xs sm:text-sm font-medium bg-[#18181B] text-white rounded-md"
        >
          مشاهده فروشگاه
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#18181B] border-b border-black/[0.08] pb-4">
        تکمیل اطلاعات و ثبت سفارش
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-black/[0.06] rounded-xl p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-semibold text-[#18181B]">اطلاعات تحویل‌گیرنده</h2>

          {error && (
            <div role="alert" className="p-3.5 rounded-md bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="checkout-name" className="block text-xs font-medium text-[#18181B]">
                نام و نام خانوادگی
              </label>
              <input
                id="checkout-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: مریم رضایی"
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkout-phone" className="block text-xs font-medium text-[#18181B]">
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
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="checkout-address" className="block text-xs font-medium text-[#18181B]">
              آدرس کامل پستی
            </label>
            <textarea
              id="checkout-address"
              required
              rows={3}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="استان، شهر، خیابان، پلاک، واحد"
              className="w-full p-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="checkout-postal" className="block text-xs font-medium text-[#18181B]">
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
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="checkout-notes" className="block text-xs font-medium text-[#18181B]">
                یادداشت سفارش (اختیاری)
              </label>
              <input
                id="checkout-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات تحویل یا بسته‌بندی هدیه"
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-black/[0.06]">
            <h3 className="text-sm font-semibold text-[#18181B]">روش ارسال</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                  shippingMethod === 'standard'
                    ? 'border-[#18181B] bg-[#FAF7F2]'
                    : 'border-black/15 hover:border-black/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'standard'}
                    onChange={() => setShippingMethod('standard')}
                    className="accent-[#18181B]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#18181B]">پست / پیک استاندارد</div>
                    <div className="text-[11px] text-[#6B665F]">۲ تا ۴ روز کاری</div>
                  </div>
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {totals.qualifiesForFreeShipping
                    ? 'رایگان'
                    : formatToman(settings?.shippingBaseCost ?? 85000)}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                  shippingMethod === 'express'
                    ? 'border-[#18181B] bg-[#FAF7F2]'
                    : 'border-black/15 hover:border-black/30'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="accent-[#18181B]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-[#18181B]">ارسال اکسپرس ویژه</div>
                    <div className="text-[11px] text-[#6B665F]">تحویل سریع ۱ روزه</div>
                  </div>
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {formatToman(settings?.expressShippingCost ?? 165000)}
                </span>
              </label>
            </div>
          </div>

          {/* Demo Payment Transparency Notice */}
          <div className="p-4 rounded-lg bg-[#F4EFE6] border border-[#B5945B]/35 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#8F6E38] shrink-0 mt-0.5" />
            <div className="text-xs text-[#3F3B36] space-y-1 leading-relaxed">
              <div className="font-semibold text-[#18181B]">پرداخت آزمایشی (نسخه نمایشی)</div>
              <p>
                در این پیش‌نمایش، ثبت سفارش و پرداخت به‌صورت آزمایشی شبیه‌سازی می‌شود و اتصال به درگاه بانکی واقعی انجام نگرفته است.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Order Summary */}
        <aside className="lg:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-[#18181B] border-b border-black/[0.06] pb-3">
            خلاصه سفارش
          </h2>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.map((item) => {
              const unit = getEffectivePrice(item.price, item.discountPrice);
              return (
                <div key={item.key} className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-[#18181B] truncate">{item.name}</div>
                    <div className="text-xs text-[#6B665F]">
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

          <div className="pt-3 border-t border-black/[0.06] space-y-2">
            <label htmlFor="coupon-code" className="block text-xs font-medium text-[#18181B]">
              کد تخفیف (نمونه: ADONIS15)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-[#6B665F] absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  id="coupon-code"
                  type="text"
                  dir="ltr"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="ADONIS15"
                  className="w-full h-9 ps-8 pe-3 text-xs uppercase bg-[#FAF7F2] border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3.5 h-9 text-xs font-medium border border-[#18181B] text-[#18181B] rounded-md hover:bg-[#18181B] hover:text-white transition-colors whitespace-nowrap"
              >
                اعمال کد
              </button>
            </div>
            {couponMessage && <p className="text-xs text-[#8F6E38]">{couponMessage}</p>}
          </div>

          <div className="space-y-2 pt-3 border-t border-black/[0.06] text-xs sm:text-sm">
            <div className="flex justify-between text-[#524E48]">
              <span>جمع کالاها</span>
              <span className="tabular-nums">{formatToman(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-[#8F6E38]">
                <span>تخفیف ({appliedCoupon?.code})</span>
                <span className="tabular-nums">-{formatToman(totals.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#524E48]">
              <span>هزینه ارسال</span>
              <span className="tabular-nums">
                {totals.shippingCost === 0 ? 'رایگان' : formatToman(totals.shippingCost)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#18181B] pt-2 border-t border-black/[0.06]">
              <span>مبلغ نهایی</span>
              <span className="tabular-nums">{formatToman(totals.totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-[#18181B] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2E] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'در حال ثبت سفارش...' : 'ثبت سفارش و پرداخت آزمایشی'}
          </button>
        </aside>
      </form>
    </div>
  );
};
