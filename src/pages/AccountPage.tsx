import React, { useEffect, useState } from 'react';
import { Check, Heart, LogOut, Package, Search, UserCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import { ProductCard } from '../components/ProductCard';
import { formatToman, getOrderStatusLabel } from '../utils/commerce';
import type { Order, UserProfile } from '../types/store';

interface AccountPageProps {
  queryString: string;
  onNavigate: (path: string) => void;
}

type GuestTab = 'login' | 'register' | 'track' | 'wishlist';
type AuthTab = 'overview' | 'wishlist' | 'track';

const ORDER_STEPS: Array<{ key: Order['orderStatus']; label: string }> = [
  { key: 'pending', label: 'ثبت شده' },
  { key: 'processing', label: 'در حال آماده‌سازی' },
  { key: 'shipped', label: 'ارسال شده' },
  { key: 'delivered', label: 'تحویل شد' },
];

function getOrderStatusBadgeClass(status: Order['orderStatus']): string {
  switch (status) {
    case 'delivered':
      return 'bg-[#0F1A1F] text-[#EFEEEA]';
    case 'shipped':
      return 'bg-[#0B1F2E] text-[#8FE3C8]';
    case 'processing':
      return 'bg-[#DCEBE5] text-[#0A6B54]';
    case 'cancelled':
      return 'bg-[#DCEBE5] text-[#0A6B54] border border-[#0B7A5F]/35';
    default:
      return 'bg-[#E2E0DB] text-[#0F1A1F]';
  }
}

const OrderStatusTimeline: React.FC<{ status: Order['orderStatus'] }> = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div className="p-2.5 rounded-sm bg-[#DCEBE5]/60 border border-[#0B7A5F]/25 text-xs text-[#0A6B54] font-medium">
        این سفارش لغو شده است.
      </div>
    );
  }

  const activeIdx = Math.max(
    0,
    ORDER_STEPS.findIndex((s) => s.key === status)
  );

  return (
    <div className="pt-2" aria-label="روند وضعیت سفارش">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {ORDER_STEPS.map((step, idx) => {
          const doneOrActive = idx <= activeIdx;
          const isCurrent = idx === activeIdx;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    isCurrent
                      ? 'bg-[#0B7A5F] text-white ring-2 ring-[#DCEBE5]'
                      : doneOrActive
                        ? 'bg-[#0F1A1F] text-[#EFEEEA]'
                        : 'bg-[#E2E0DB] text-[#5F6B70]'
                  }`}
                >
                  {doneOrActive ? (
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  ) : (
                    new Intl.NumberFormat('fa-IR').format(idx + 1)
                  )}
                </span>
                <span
                  className={`text-[10px] sm:text-[11px] text-center whitespace-nowrap ${
                    doneOrActive ? 'text-[#0F1A1F] font-semibold' : 'text-[#5F6B70]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < ORDER_STEPS.length - 1 && (
                <div
                  className={`flex-1 h-[2px] -mt-4 ${
                    idx < activeIdx ? 'bg-[#0B7A5F]' : 'bg-[#E2E0DB]'
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export const AccountPage: React.FC<AccountPageProps> = ({ queryString, onNavigate }) => {
  const {
    user,
    setUser,
    products,
    categories,
    wishlistIds,
    passwordResetEnabled,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
  } = useStore();
  const params = new URLSearchParams(queryString);
  const urlTab = params.get('tab');
  const urlToken = params.get('token') ?? '';
  const initialTab: GuestTab =
    urlTab === 'track'
      ? 'track'
      : urlTab === 'wishlist'
        ? 'wishlist'
        : urlTab === 'register'
          ? 'register'
          : 'login';
  const initialAuthTab: AuthTab =
    urlTab === 'track' ? 'track' : urlTab === 'wishlist' ? 'wishlist' : 'overview';

  const [tab, setTab] = useState<GuestTab>(initialTab);
  const [authTab, setAuthTab] = useState<AuthTab>(initialAuthTab);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Login / Register fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showResetMode, setShowResetMode] = useState(
    () => urlTab === 'reset' && passwordResetEnabled
  );
  const [resetToken, setResetToken] = useState(() => (passwordResetEnabled ? urlToken : ''));
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Profile fields
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profilePostal, setProfilePostal] = useState('');
  const [profileSaved, setProfileSaved] = useState<string | null>(null);

  // Orders & tracking
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(queryString);
    const t = p.get('tab');
    const tok = p.get('token') ?? '';
    if (t === 'track') {
      setTab('track');
      setAuthTab('track');
      setShowResetMode(false);
    } else if (t === 'wishlist') {
      setTab('wishlist');
      setAuthTab('wishlist');
      setShowResetMode(false);
    } else if (t === 'register') {
      setTab('register');
      setAuthTab('overview');
      setShowResetMode(false);
    } else if (t === 'reset') {
      setTab('login');
      setAuthTab('overview');
      if (passwordResetEnabled) {
        setShowResetMode(true);
        if (tok) setResetToken(tok);
      } else {
        setShowResetMode(false);
        setAuthError('بازیابی رمز عبور تا زمان پیکربندی سرویس ارسال ایمیل روی سرور فعال نیست.');
      }
    } else {
      setAuthTab('overview');
      setTab((prev) => (prev === 'register' ? 'register' : 'login'));
      if (!passwordResetEnabled) {
        setShowResetMode(false);
      }
    }
  }, [queryString, passwordResetEnabled]);

  useEffect(() => {
    if (user) {
      setProfileName(user.fullName);
      setProfilePhone(user.phone);
      setProfileAddress(user.address);
      setProfilePostal(user.postalCode);
      apiFetch<{ orders: Order[] }>('/api/orders/my')
        .then((res) => setMyOrders(res.orders))
        .catch(() => {});
    } else {
      setMyOrders([]);
    }
  }, [user]);

  const wishlistedProducts = products.filter((p) => wishlistIds.includes(p.id));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setAuthError(err.message || 'خطا در ورود');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      await registerWithEmail({ fullName, email, password, phone });
    } catch (err: any) {
      setAuthError(err.message || 'خطا در ثبت‌نام');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'ورود با گوگل تکمیل نشد.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetMessage(null);
    setAuthLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setResetMessage(res.message);
    } catch (err: any) {
      setAuthError(err.message || 'خطا در ارسال درخواست بازیابی');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetMessage(null);
    setAuthLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      setResetMessage(res.message);
      setResetToken('');
      setNewPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'خطا در تغییر رمز عبور');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(null);
    setAuthError(null);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName: profileName,
          phone: profilePhone,
          address: profileAddress,
          postalCode: profilePostal,
        }),
      });
      setUser(res.user);
      setProfileSaved('اطلاعات کاربری با موفقیت ذخیره شد.');
    } catch (err: any) {
      setAuthError(err.message || 'خطا در ذخیره اطلاعات');
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError(null);
    setTrackedOrder(null);
    try {
      const res = await apiFetch<{ order: Order }>('/api/orders/track', {
        method: 'POST',
        body: JSON.stringify({ orderNumber: trackOrderNumber, phone: trackPhone }),
      });
      setTrackedOrder(res.order);
    } catch (err: any) {
      setTrackError(err.message || 'سفارشی یافت نشد.');
    }
  };

  const renderWishlistView = () => (
    <section aria-labelledby="wishlist-heading" className="space-y-6" data-testid="account-wishlist-view">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#0F1A1F]/[0.08] pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold tracking-widest text-[#0A6B54]">۰۲ — علاقه‌مندی‌ها</div>
          <h2 id="wishlist-heading" className="text-2xl sm:text-3xl text-[#0F1A1F] flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#0B7A5F]" fill="currentColor" />
            <span>لیست علاقه‌مندی‌های شما</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#5F6B70]">
            مدل‌های کفش و کتونی ذخیره‌شده برای مقایسه، بررسی سایز و خرید بعدی
          </p>
        </div>
        <span className="text-xs font-semibold text-[#5F6B70] tabular-nums">
          {new Intl.NumberFormat('fa-IR').format(wishlistedProducts.length)} محصول ذخیره‌شده
        </span>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="max-w-lg mx-auto bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-10 text-center space-y-5">
          <div className="arch-frame w-24 h-32 mx-auto bg-[#E2E0DB] border border-[#0F1A1F]/10 flex items-center justify-center">
            <Heart className="w-9 h-9 text-[#0F1A1F]/30" strokeWidth={1.25} />
          </div>
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-semibold text-[#0F1A1F]">لیست علاقه‌مندی‌های شما خالی است.</p>
            <p className="text-xs text-[#5F6B70]">با زدن آیکون قلب روی هر کفش، آن را اینجا ذخیره کنید.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/shop')}
            className="min-h-[44px] px-6 py-2.5 text-xs font-semibold bg-[#0B7A5F] text-white rounded-sm hover:bg-[#0F1A1F] transition-colors"
          >
            مشاهده فروشگاه کفش
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {wishlistedProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              category={p.categoryId ? categories.find((c) => c.id === p.categoryId) : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </section>
  );

  if (user) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#0F1A1F]/[0.08] pb-5">
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-widest text-[#0A6B54]">۰۱ — حساب کاربری</div>
            <h1 className="text-3xl sm:text-5xl text-[#0F1A1F]">حساب کاربری: {user.fullName}</h1>
            <p className="text-xs sm:text-sm text-[#5F6B70]">
              {user.email} · {user.role === 'admin' ? 'مدیر فروشگاه' : 'مشتری آدونیس'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-[#0B7A5F] text-white rounded-sm hover:bg-[#0F1A1F] transition-colors"
              >
                ورود به پنل مدیریت
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#0F1A1F] text-[#0F1A1F] rounded-sm hover:bg-[#0F1A1F] hover:text-[#EFEEEA] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Restyled Navigation Tabs */}
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1 bg-[#E2E0DB] rounded-sm border border-[#0F1A1F]/[0.08]">
          {[
            { id: 'overview' as const, label: 'پروفایل و سفارش‌ها' },
            {
              id: 'wishlist' as const,
              label: `علاقه‌مندی‌ها (${new Intl.NumberFormat('fa-IR').format(wishlistedProducts.length)})`,
            },
            { id: 'track' as const, label: 'پیگیری سفارش' },
          ].map((item) => {
            const active = authTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAuthTab(item.id);
                  onNavigate(item.id === 'overview' ? '/account' : `/account?tab=${item.id}`);
                }}
                className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-medium rounded-sm transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#0F1A1F] text-[#EFEEEA] border-b-2 border-[#0B7A5F] font-semibold'
                    : 'bg-white text-[#5F6B70] hover:text-[#0F1A1F]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {authTab === 'wishlist' ? (
          renderWishlistView()
        ) : authTab === 'track' ? (
          <div className="max-w-lg bg-white border border-[#0F1A1F]/[0.08] border-t-2 border-t-[#0F1A1F] rounded-sm p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold tracking-widest text-[#0A6B54]">۰۲ — پیگیری مرسوله</div>
              <h2 className="text-2xl sm:text-3xl text-[#0F1A1F]">پیگیری سفارش</h2>
              <p className="text-xs text-[#5F6B70]">
                برای استعلام وضعیت سفارش، کد پیگیری و شماره موبایل ثبت‌شده هنگام خرید را وارد کنید.
              </p>
            </div>
            {trackError && (
              <div className="p-3 rounded-sm bg-[#DCEBE5] border border-[#0B7A5F]/35 text-xs text-[#0F1A1F] font-medium">
                {trackError}
              </div>
            )}
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="auth-track-code" className="block text-xs font-semibold text-[#0F1A1F]">
                  کد پیگیری سفارش
                </label>
                <input
                  id="auth-track-code"
                  type="text"
                  required
                  dir="ltr"
                  value={trackOrderNumber}
                  onChange={(e) => setTrackOrderNumber(e.target.value)}
                  placeholder="ADONIS-251113-XXXXXX"
                  className="w-full min-h-[44px] px-3 text-sm text-end uppercase bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="auth-track-phone" className="block text-xs font-semibold text-[#0F1A1F]">
                  شماره موبایل سفارش
                </label>
                <input
                  id="auth-track-phone"
                  type="tel"
                  required
                  dir="ltr"
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F] tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[44px] py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#0B7A5F] text-white rounded-sm hover:bg-[#0F1A1F] transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>استعلام وضعیت سفارش</span>
              </button>
            </form>
            {trackedOrder && (
              <div className="mt-4 p-4 rounded-sm bg-[#EFEEEA] border border-[#0F1A1F]/[0.08] space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#5F6B70]">وضعیت فعلی:</span>
                  <span className={`px-2.5 py-0.5 rounded-sm text-xs font-semibold ${getOrderStatusBadgeClass(trackedOrder.orderStatus)}`}>
                    {getOrderStatusLabel(trackedOrder.orderStatus)}
                  </span>
                </div>
                <OrderStatusTimeline status={trackedOrder.orderStatus} />
                <div className="flex justify-between pt-2 border-t border-[#0F1A1F]/[0.08]">
                  <span className="text-[#5F6B70]">تحویل‌گیرنده:</span>
                  <span className="font-medium text-[#0F1A1F]">{trackedOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5F6B70]">مبلغ کل:</span>
                  <strong className="tabular-nums text-[#0F1A1F]">{formatToman(trackedOrder.totalAmount)}</strong>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Profile Form */}
            <form
              onSubmit={handleProfileSave}
              className="lg:col-span-5 bg-white border border-[#0F1A1F]/[0.08] border-t-2 border-t-[#0F1A1F] rounded-sm p-6 space-y-4"
            >
              <h2 className="text-2xl text-[#0F1A1F] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0B7A5F]" />
                <span>مشخصات و نشانی پیش‌فرض</span>
              </h2>

              {authError && (
                <div className="p-3 bg-[#DCEBE5] border border-[#0B7A5F]/35 rounded-sm text-xs text-[#0F1A1F] font-medium">
                  {authError}
                </div>
              )}
              {profileSaved && (
                <div className="p-3 bg-[#EFEEEA] border border-[#0F1A1F]/20 border-s-2 border-s-[#0B7A5F] rounded-sm text-xs text-[#0F1A1F] font-medium">
                  {profileSaved}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="prof-name" className="block text-xs font-semibold text-[#0F1A1F]">
                  نام و نام خانوادگی
                </label>
                <input
                  id="prof-name"
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full min-h-[44px] px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prof-phone" className="block text-xs font-semibold text-[#0F1A1F]">
                  شماره موبایل
                </label>
                <input
                  id="prof-phone"
                  type="tel"
                  dir="ltr"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F] tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prof-postal" className="block text-xs font-semibold text-[#0F1A1F]">
                  کد پستی
                </label>
                <input
                  id="prof-postal"
                  type="text"
                  dir="ltr"
                  value={profilePostal}
                  onChange={(e) => setProfilePostal(e.target.value)}
                  className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F] tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="prof-address" className="block text-xs font-semibold text-[#0F1A1F]">
                  آدرس پستی
                </label>
                <textarea
                  id="prof-address"
                  rows={3}
                  value={profileAddress}
                  onChange={(e) => setProfileAddress(e.target.value)}
                  className="w-full p-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-2.5 text-xs sm:text-sm font-semibold bg-[#0F1A1F] text-white rounded-sm hover:bg-[#0B7A5F] transition-colors"
              >
                ذخیره تغییرات پروفایل
              </button>
            </form>

            {/* Order History */}
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-2xl text-[#0F1A1F] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0B7A5F]" />
                <span>سفارش‌های من</span>
              </h2>

              {myOrders.length === 0 ? (
                <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-10 text-center space-y-3">
                  <Package className="w-9 h-9 mx-auto text-[#0F1A1F]/25" strokeWidth={1.25} />
                  <p className="text-sm text-[#5F6B70]">شما هنوز سفارشی ثبت نکرده‌اید.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white border border-[#0F1A1F]/[0.08] border-t-2 border-t-[#0F1A1F] rounded-sm p-5 space-y-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0F1A1F]/[0.08] pb-3 text-xs sm:text-sm">
                        <div>
                          <span className="text-[#5F6B70]">کد سفارش: </span>
                          <strong dir="ltr" className="inline-block tabular-nums text-[#0F1A1F]">
                            {order.orderNumber}
                          </strong>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-sm text-xs font-semibold ${getOrderStatusBadgeClass(order.orderStatus)}`}
                          >
                            {getOrderStatusLabel(order.orderStatus)}
                          </span>
                          <span className="tabular-nums font-bold text-[#0F1A1F]">
                            {formatToman(order.totalAmount)}
                          </span>
                        </div>
                      </div>

                      <OrderStatusTimeline status={order.orderStatus} />

                      <div className="space-y-1.5 text-xs text-[#44525A] pt-2 border-t border-[#0F1A1F]/[0.06]">
                        {(order.items ?? []).map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.productName} (سایز {item.selectedSize} · {item.selectedColor}) × {item.quantity}
                            </span>
                            <span className="tabular-nums font-medium">{formatToman(item.unitPrice * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${tab === 'wishlist' ? 'max-w-6xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6`}>
      <div className="max-w-lg mx-auto space-y-1 text-center">
        <div className="text-[11px] font-semibold tracking-widest text-[#0A6B54]">۰۱ — حساب کاربری آدونیس</div>
      </div>

      <div className="max-w-lg mx-auto flex flex-wrap items-center gap-1 p-1 bg-[#E2E0DB] border border-[#0F1A1F]/[0.08] rounded-sm">
        {[
          { id: 'login' as const, label: 'ورود' },
          { id: 'register' as const, label: 'ثبت‌نام' },
          { id: 'track' as const, label: 'پیگیری سفارش' },
          {
            id: 'wishlist' as const,
            label:
              wishlistedProducts.length > 0
                ? `علاقه‌مندی‌ها (${new Intl.NumberFormat('fa-IR').format(wishlistedProducts.length)})`
                : 'علاقه‌مندی‌ها',
          },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setAuthError(null);
              }}
              className={`flex-1 min-h-[44px] px-2.5 py-2 text-xs sm:text-sm font-medium rounded-sm transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#0F1A1F] text-[#EFEEEA] border-b-2 border-[#0B7A5F] font-semibold'
                  : 'text-[#5F6B70] hover:text-[#0F1A1F] hover:bg-white/70'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'login' && (
        <div className="bg-white border border-[#0F1A1F]/[0.08] border-t-2 border-t-[#0F1A1F] rounded-sm p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl text-[#0F1A1F]">
              {passwordResetEnabled && showResetMode ? 'بازیابی رمز عبور' : 'ورود به حساب کاربری'}
            </h1>
            <p className="text-xs text-[#5F6B70]">
              {passwordResetEnabled && showResetMode
                ? 'ایمیل خود را برای ارسال لینک یک‌بارمصرف بازیابی وارد کنید یا کد دریافتی را ثبت نمایید.'
                : 'برای مشاهده سفارش‌ها و مدیریت لیست علاقه‌مندی‌ها وارد شوید.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-sm bg-[#DCEBE5] border border-[#0B7A5F]/35 text-xs text-[#0F1A1F] font-medium">
              {authError}
            </div>
          )}
          {resetMessage && (
            <div className="p-3 rounded-sm bg-[#EFEEEA] border border-[#0F1A1F]/20 border-s-2 border-s-[#0B7A5F] text-xs text-[#0F1A1F] font-medium">
              {resetMessage}
            </div>
          )}

          {passwordResetEnabled && showResetMode ? (
            <div className="space-y-5">
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-[#0F1A1F]">
                    ایمیل حساب کاربری
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full min-h-[44px] py-2.5 text-sm font-semibold bg-[#0B7A5F] text-white rounded-sm hover:bg-[#0F1A1F] disabled:opacity-50 transition-colors"
                >
                  {authLoading ? 'در حال ارسال...' : 'درخواست بازیابی رمز عبور'}
                </button>
              </form>

              <form onSubmit={handleResetPassword} className="space-y-3 pt-4 border-t border-[#0F1A1F]/10">
                <div className="space-y-1.5">
                  <label htmlFor="reset-token" className="block text-xs font-semibold text-[#0F1A1F]">
                    کد بازیابی دریافت‌شده
                  </label>
                  <input
                    id="reset-token"
                    type="text"
                    required
                    minLength={32}
                    dir="ltr"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="reset-new-pass" className="block text-xs font-semibold text-[#0F1A1F]">
                    رمز عبور جدید (حداقل ۸ کاراکتر)
                  </label>
                  <input
                    id="reset-new-pass"
                    type="password"
                    required
                    minLength={8}
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full min-h-[44px] py-2.5 text-sm font-semibold border border-[#0F1A1F] text-[#0F1A1F] rounded-sm hover:bg-[#0F1A1F] hover:text-[#EFEEEA] disabled:opacity-50 transition-colors"
                >
                  ثبت رمز عبور جدید
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowResetMode(false);
                  setAuthError(null);
                  setResetMessage(null);
                }}
                className="w-full min-h-[44px] text-center text-xs font-semibold text-[#0A6B54] hover:underline"
              >
                بازگشت به فرم ورود
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="block text-xs font-semibold text-[#0F1A1F]">
                    ایمیل
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="text-xs font-semibold text-[#0F1A1F]">
                      رمز عبور
                    </label>
                    {passwordResetEnabled && (
                      <button
                        type="button"
                        data-testid="forgot-password-trigger"
                        onClick={() => {
                          setShowResetMode(true);
                          setAuthError(null);
                          setResetMessage(null);
                        }}
                        className="text-xs font-medium text-[#0A6B54] hover:underline"
                      >
                        فراموشی رمز عبور؟
                      </button>
                    )}
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full min-h-[44px] py-2.5 text-sm font-semibold bg-[#0B7A5F] text-white rounded-sm hover:bg-[#0F1A1F] disabled:opacity-50 transition-colors"
                >
                  {authLoading ? 'در حال بررسی...' : 'ورود'}
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[#0F1A1F]/10" />
                <span className="shrink mx-3 text-xs text-[#5F6B70]">یا</span>
                <div className="flex-grow border-t border-[#0F1A1F]/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full min-h-[44px] py-2.5 px-4 text-xs sm:text-sm font-medium border border-[#0F1A1F] text-[#0F1A1F] rounded-sm hover:bg-[#0F1A1F] hover:text-[#EFEEEA] transition-colors"
              >
                ورود سریع با حساب گوگل
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'register' && (
        <div className="bg-white border border-[#0F1A1F]/[0.08] border-t-2 border-t-[#0F1A1F] rounded-sm p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl text-[#0F1A1F]">ایجاد حساب کاربری</h1>
            <p className="text-xs text-[#5F6B70]">ثبت‌نام سریع در فروشگاه تخصصی کفش و کتونی</p>
          </div>

          {authError && (
            <div className="p-3 rounded-sm bg-[#DCEBE5] border border-[#0B7A5F]/35 text-xs text-[#0F1A1F] font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reg-name" className="block text-xs font-semibold text-[#0F1A1F]">
                نام و نام خانوادگی
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full min-h-[44px] px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="block text-xs font-semibold text-[#0F1A1F]">
                ایمیل
              </label>
              <input
                id="reg-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-[#0F1A1F]">
                شماره موبایل (اختیاری)
              </label>
              <input
                id="reg-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F] tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-pass" className="block text-xs font-semibold text-[#0F1A1F]">
                رمز عبور (حداقل ۸ کاراکتر)
              </label>
              <input
                id="reg-pass"
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full min-h-[44px] py-2.5 text-sm font-semibold bg-[#0B7A5F] text-white rounded-sm hover:bg-[#0F1A1F] disabled:opacity-50 transition-colors"
            >
              {authLoading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
            </button>
          </form>
        </div>
      )}

      {tab === 'track' && (
        <div className="bg-white border border-[#0F1A1F]/[0.08] border-t-2 border-t-[#0F1A1F] rounded-sm p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl text-[#0F1A1F]">پیگیری سفارش</h1>
            <p className="text-xs text-[#5F6B70]">
              برای استعلام وضعیت سفارش، کد پیگیری و شماره موبایل ثبت‌شده هنگام خرید را وارد کنید.
            </p>
          </div>

          {trackError && (
            <div className="p-3 rounded-sm bg-[#DCEBE5] border border-[#0B7A5F]/35 text-xs text-[#0F1A1F] font-medium">
              {trackError}
            </div>
          )}

          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="track-code" className="block text-xs font-semibold text-[#0F1A1F]">
                کد پیگیری سفارش
              </label>
              <input
                id="track-code"
                type="text"
                required
                dir="ltr"
                value={trackOrderNumber}
                onChange={(e) => setTrackOrderNumber(e.target.value)}
                placeholder="ADONIS-251113-XXXXXX"
                className="w-full min-h-[44px] px-3 text-sm text-end uppercase bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="track-phone" className="block text-xs font-semibold text-[#0F1A1F]">
                شماره موبایل سفارش
              </label>
              <input
                id="track-phone"
                type="tel"
                required
                dir="ltr"
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full min-h-[44px] px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[#0B7A5F] tabular-nums"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#0B7A5F] text-white rounded-sm hover:bg-[#0F1A1F] transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>استعلام وضعیت سفارش</span>
            </button>
          </form>

          {trackedOrder && (
            <div className="mt-4 p-4 rounded-sm bg-[#EFEEEA] border border-[#0F1A1F]/[0.08] space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#5F6B70]">وضعیت فعلی:</span>
                <span className={`px-2.5 py-0.5 rounded-sm text-xs font-semibold ${getOrderStatusBadgeClass(trackedOrder.orderStatus)}`}>
                  {getOrderStatusLabel(trackedOrder.orderStatus)}
                </span>
              </div>
              <OrderStatusTimeline status={trackedOrder.orderStatus} />
              <div className="flex justify-between pt-2 border-t border-[#0F1A1F]/[0.08]">
                <span className="text-[#5F6B70]">تحویل‌گیرنده:</span>
                <span className="font-medium text-[#0F1A1F]">{trackedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6B70]">مبلغ کل:</span>
                <strong className="tabular-nums text-[#0F1A1F]">{formatToman(trackedOrder.totalAmount)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'wishlist' && renderWishlistView()}
    </div>
  );
};
