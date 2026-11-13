import React, { useEffect, useState } from 'react';
import { LogOut, Package, Search, UserCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import { formatToman, getOrderStatusLabel } from '../utils/commerce';
import type { Order, UserProfile } from '../types/store';

interface AccountPageProps {
  queryString: string;
  onNavigate: (path: string) => void;
}

type GuestTab = 'login' | 'register' | 'track';

export const AccountPage: React.FC<AccountPageProps> = ({ queryString, onNavigate }) => {
  const { user, setUser, loginWithEmail, registerWithEmail, loginWithGoogle, logout } = useStore();
  const params = new URLSearchParams(queryString);
  const initialTab = params.get('tab') === 'track' ? 'track' : 'login';

  const [tab, setTab] = useState<GuestTab>(initialTab);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Login / Register fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

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
    if (params.get('tab') === 'track') {
      setTab('track');
    }
  }, [queryString]);

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

  if (user) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] pb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#18181B]">حساب کاربری: {user.fullName}</h1>
            <p className="text-xs sm:text-sm text-[#6B665F] mt-1">
              {user.email} · {user.role === 'admin' ? 'مدیر فروشگاه' : 'مشتری ورا بوتیک'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="px-4 py-2 text-xs font-medium bg-[#B5945B] text-white rounded-md hover:bg-[#9C7D47]"
              >
                ورود به پنل مدیریت
              </button>
            )}
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-black/15 text-[#18181B] rounded-md hover:bg-white"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Profile Form */}
          <form
            onSubmit={handleProfileSave}
            className="lg:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#18181B] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#8F6E38]" />
              <span>مشخصات و نشانی پیش‌فرض</span>
            </h2>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                {authError}
              </div>
            )}
            {profileSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                {profileSaved}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="prof-name" className="text-xs font-medium text-[#18181B]">
                نام و نام خانوادگی
              </label>
              <input
                id="prof-name"
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="prof-phone" className="text-xs font-medium text-[#18181B]">
                شماره موبایل
              </label>
              <input
                id="prof-phone"
                type="tel"
                dir="ltr"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="prof-postal" className="text-xs font-medium text-[#18181B]">
                کد پستی
              </label>
              <input
                id="prof-postal"
                type="text"
                dir="ltr"
                value={profilePostal}
                onChange={(e) => setProfilePostal(e.target.value)}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="prof-address" className="text-xs font-medium text-[#18181B]">
                آدرس پستی
              </label>
              <textarea
                id="prof-address"
                rows={3}
                value={profileAddress}
                onChange={(e) => setProfileAddress(e.target.value)}
                className="w-full p-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-xs sm:text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E]"
            >
              ذخیره تغییرات پروفایل
            </button>
          </form>

          {/* Order History */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-base font-semibold text-[#18181B] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#8F6E38]" />
              <span>سفارش‌های من</span>
            </h2>

            {myOrders.length === 0 ? (
              <div className="bg-white border border-black/[0.06] rounded-xl p-10 text-center text-sm text-[#6B665F]">
                شما هنوز سفارشی ثبت نکرده‌اید.
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-black/[0.06] rounded-xl p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.05] pb-3 text-xs sm:text-sm">
                      <div>
                        <span className="text-[#6B665F]">کد سفارش: </span>
                        <strong className="tabular-nums text-[#18181B]">{order.orderNumber}</strong>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-[#8F6E38]">
                          {getOrderStatusLabel(order.orderStatus)}
                        </span>
                        <span className="tabular-nums font-semibold">{formatToman(order.totalAmount)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#524E48]">
                      {(order.items ?? []).map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            {item.productName} ({item.selectedSize} · {item.selectedColor}) × {item.quantity}
                          </span>
                          <span className="tabular-nums">{formatToman(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex items-center gap-1 p-1 bg-[#EFEAE0] rounded-lg">
        {[
          { id: 'login' as const, label: 'ورود به حساب' },
          { id: 'register' as const, label: 'ثبت‌نام' },
          { id: 'track' as const, label: 'پیگیری سفارش' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setAuthError(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === item.id ? 'bg-white text-[#18181B] shadow-sm' : 'text-[#524E48]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'login' && (
        <div className="bg-white border border-black/[0.06] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#18181B]">ورود به ورا بوتیک</h1>
            <p className="text-xs text-[#6B665F]">برای مشاهده سفارش‌ها و ثبت سریع خرید وارد شوید.</p>
          </div>

          {authError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800">{authError}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="login-email" className="text-xs font-medium text-[#18181B]">
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
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="text-xs font-medium text-[#18181B]">
                رمز عبور
              </label>
              <input
                id="login-password"
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E] disabled:opacity-50"
            >
              {authLoading ? 'در حال بررسی...' : 'ورود'}
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-black/10" />
            <span className="shrink mx-3 text-xs text-[#8A847C]">یا</span>
            <div className="flex-grow border-t border-black/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full py-2.5 px-4 text-xs sm:text-sm font-medium border border-black/20 text-[#18181B] rounded-md hover:bg-[#FAF7F2] transition-colors"
          >
            ورود سریع با حساب گوگل
          </button>
        </div>
      )}

      {tab === 'register' && (
        <div className="bg-white border border-black/[0.06] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#18181B]">ایجاد حساب کاربری</h1>
            <p className="text-xs text-[#6B665F]">ثبت‌نام در کمتر از ۳۰ ثانیه</p>
          </div>

          {authError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800">{authError}</div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="reg-name" className="text-xs font-medium text-[#18181B]">
                نام و نام خانوادگی
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-email" className="text-xs font-medium text-[#18181B]">
                ایمیل
              </label>
              <input
                id="reg-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-phone" className="text-xs font-medium text-[#18181B]">
                شماره موبایل (اختیاری)
              </label>
              <input
                id="reg-phone"
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reg-pass" className="text-xs font-medium text-[#18181B]">
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
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E] disabled:opacity-50"
            >
              {authLoading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
            </button>
          </form>
        </div>
      )}

      {tab === 'track' && (
        <div className="bg-white border border-black/[0.06] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#18181B]">پیگیری سفارش مهمان</h1>
            <p className="text-xs text-[#6B665F]">
              برای امنیت اطلاعات، کد پیگیری و شماره موبایل ثبت‌شده در سفارش را وارد کنید (نمونه: VERA-1042 و 09123456789).
            </p>
          </div>

          {trackError && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-800">{trackError}</div>
          )}

          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="track-code" className="text-xs font-medium text-[#18181B]">
                کد پیگیری سفارش
              </label>
              <input
                id="track-code"
                type="text"
                required
                dir="ltr"
                value={trackOrderNumber}
                onChange={(e) => setTrackOrderNumber(e.target.value)}
                placeholder="VERA-1042"
                className="w-full h-10 px-3 text-sm text-end uppercase bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="track-phone" className="text-xs font-medium text-[#18181B]">
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
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 inline-flex items-center justify-center gap-2 text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E]"
            >
              <Search className="w-4 h-4" />
              <span>استعلام وضعیت سفارش</span>
            </button>
          </form>

          {trackedOrder && (
            <div className="mt-4 p-4 rounded-lg bg-[#FAF7F2] border border-black/[0.08] space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B665F]">وضعیت فعلی:</span>
                <strong className="text-[#8F6E38]">{getOrderStatusLabel(trackedOrder.orderStatus)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B665F]">تحویل‌گیرنده:</span>
                <span>{trackedOrder.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B665F]">مبلغ کل:</span>
                <strong className="tabular-nums">{formatToman(trackedOrder.totalAmount)}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
