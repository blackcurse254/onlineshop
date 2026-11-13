import React, { useCallback, useEffect, useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import { formatToman, getOrderStatusLabel } from '../utils/commerce';
import type {
  Banner,
  Category,
  Discount,
  Order,
  Product,
  StoreSettings,
} from '../types/store';

type AdminTab = 'overview' | 'products' | 'categories' | 'orders' | 'discounts' | 'banners' | 'settings';

interface AdminOverviewData {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    lowStockCount: number;
    totalCustomers: number;
  };
  products: Product[];
  categories: Category[];
  orders: Order[];
  discounts: Discount[];
  banners: Banner[];
  settings: StoreSettings;
}

export const AdminPage: React.FC = () => {
  const { user, loginWithEmail, loginWithGoogle, refreshStorefront } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Admin login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Product form state
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    slug: '',
    sku: '',
    categoryId: '',
    description: '',
    fabricCare: '',
    price: '',
    discountPrice: '',
    stock: '10',
    sizes: 'S, M, L',
    colorName: 'مشکی زغالی',
    colorHex: '#18181B',
    imageUrl: '/src/assets/images/cat_coats_blazers_1794595829730.jpg',
    isNew: true,
    isBestseller: false,
    isFeatured: true,
    isActive: true,
  });

  // Category form state
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImg, setCatImg] = useState('/src/assets/images/cat_dresses_sets_1794595830804.jpg');

  // Discount form state
  const [discCode, setDiscCode] = useState('');
  const [discTitle, setDiscTitle] = useState('');
  const [discPercent, setDiscPercent] = useState('15');
  const [discMin, setDiscMin] = useState('0');

  // Store settings form
  const [settingsForm, setSettingsForm] = useState<StoreSettings | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await apiFetch<AdminOverviewData>('/api/admin/overview');
      setData(overview);
      setSettingsForm(overview.settings);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری پنل مدیریت');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [user, loadAdminData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const logged = await loginWithEmail(loginEmail, loginPassword);
      if (logged.role !== 'admin') {
        setError('این حساب کاربری مجوز مدیریت ندارد.');
      }
    } catch (err: any) {
      setError(err.message || 'ایمیل یا رمز عبور مدیر اشتباه است.');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-black/[0.08] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5 text-[#18181B]">
            <Lock className="w-5 h-5 text-[#8F6E38]" />
            <h1 className="text-xl font-bold">ورود به پنل مدیریت</h1>
          </div>
          <p className="text-xs text-[#6B665F] leading-relaxed">
            دسترسی به داشبورد، موجودی کالاها و تنظیمات برند تنها با احراز هویت مدیر در سمت سرور مجاز است.
          </p>

          {(error || (user && user.role !== 'admin')) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              {error || 'حساب فعلی شما نقش مدیر ندارد.'}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="admin-email" className="text-xs font-medium text-[#18181B]">
                ایمیل مدیر
              </label>
              <input
                id="admin-email"
                type="email"
                required
                dir="ltr"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@veraboutique.ir"
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-xs font-medium text-[#18181B]">
                رمز عبور مدیر
              </label>
              <input
                id="admin-password"
                type="password"
                required
                dir="ltr"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E]"
            >
              ورود مدیر
            </button>
          </form>

          <button
            type="button"
            onClick={() => loginWithGoogle().catch((e) => setError(e.message))}
            className="w-full py-2.5 text-xs sm:text-sm font-medium border border-black/20 rounded-md hover:bg-[#FAF7F2]"
          >
            ورود با حساب گوگل مدیر
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setError(null);

    const payload = {
      name: prodForm.name,
      slug: prodForm.slug || `product-${Date.now()}`,
      sku: prodForm.sku || `VR-${Math.floor(100 + Math.random() * 899)}`,
      categoryId: prodForm.categoryId ? Number(prodForm.categoryId) : null,
      description: prodForm.description,
      fabricCare: prodForm.fabricCare,
      price: Number(prodForm.price),
      discountPrice: prodForm.discountPrice ? Number(prodForm.discountPrice) : null,
      stock: Number(prodForm.stock),
      sizes: prodForm.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      colors: [{ name: prodForm.colorName.trim() || 'مشکی', hex: prodForm.colorHex }],
      images: [prodForm.imageUrl.trim()],
      isNew: prodForm.isNew,
      isBestseller: prodForm.isBestseller,
      isFeatured: prodForm.isFeatured,
      isActive: prodForm.isActive,
    };

    try {
      if (editingProductId) {
        await apiFetch(`/api/admin/products/${editingProductId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setFeedback('محصول با موفقیت ویرایش شد.');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback('محصول جدید با موفقیت اضافه شد.');
      }
      setEditingProductId(null);
      setProdForm({
        ...prodForm,
        name: '',
        slug: '',
        sku: '',
        description: '',
        price: '',
        discountPrice: '',
      });
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProdForm({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      categoryId: p.categoryId ? String(p.categoryId) : '',
      description: p.description,
      fabricCare: p.fabricCare,
      price: String(p.price),
      discountPrice: p.discountPrice ? String(p.discountPrice) : '',
      stock: String(p.stock),
      sizes: p.sizes.join(', '),
      colorName: p.colors[0]?.name || 'مشکی',
      colorHex: p.colors[0]?.hex || '#18181B',
      imageUrl: p.images[0] || '/src/assets/images/cat_coats_blazers_1794595829730.jpg',
      isNew: p.isNew,
      isBestseller: p.isBestseller,
      isFeatured: p.isFeatured,
      isActive: p.isActive,
    });
  };

  const handleDeleteProduct = async (id: number) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      setFeedback('محصول حذف شد.');
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOrderStatusChange = async (orderId: number, orderStatus: string) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ orderStatus }),
      });
      setFeedback('وضعیت سفارش به‌روزرسانی شد.');
      await loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: catName,
          slug: catSlug,
          description: catDesc,
          imageUrl: catImg,
          sortOrder: (data?.categories.length ?? 0) + 1,
          isActive: true,
        }),
      });
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      setFeedback('دسته‌بندی جدید ایجاد شد.');
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/admin/discounts', {
        method: 'POST',
        body: JSON.stringify({
          code: discCode,
          title: discTitle,
          percent: Number(discPercent),
          minOrderAmount: Number(discMin),
          isActive: true,
        }),
      });
      setDiscCode('');
      setDiscTitle('');
      setFeedback('کد تخفیف ایجاد شد.');
      await loadAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setError(null);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...settingsForm,
          shippingBaseCost: Number(settingsForm.shippingBaseCost),
          expressShippingCost: Number(settingsForm.expressShippingCost),
          freeShippingThreshold: Number(settingsForm.freeShippingThreshold),
        }),
      });
      setFeedback('تنظیمات و هویت بصری فروشگاه ذخیره و اعمال شد.');
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveBanner = async (banner: Banner) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/banners/${banner.id}`, {
        method: 'PUT',
        body: JSON.stringify(banner),
      });
      setFeedback('بنر با موفقیت ذخیره شد.');
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#18181B]">پنل مدیریت فروشگاه</h1>
          <p className="text-xs sm:text-sm text-[#6B665F]">مدیریت محصولات، موجودی، سفارش‌ها، بنرها و هویت برند</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#EFEAE0] rounded-lg">
        {[
          { id: 'overview' as const, label: 'داشبورد' },
          { id: 'products' as const, label: 'محصولات و موجودی' },
          { id: 'categories' as const, label: 'دسته‌بندی‌ها' },
          { id: 'orders' as const, label: 'سفارش‌ها' },
          { id: 'discounts' as const, label: 'تخفیف‌ها' },
          { id: 'banners' as const, label: 'بنرها' },
          { id: 'settings' as const, label: 'تنظیمات فروشگاه' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setFeedback(null);
              setError(null);
            }}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              tab === item.id ? 'bg-white text-[#18181B] shadow-sm' : 'text-[#524E48] hover:text-[#18181B]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs sm:text-sm text-red-800">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs sm:text-sm text-emerald-800">
          {feedback}
        </div>
      )}

      {loading && !data ? (
        <div className="py-12 text-center text-sm text-[#6B665F]">در حال بارگذاری اطلاعات مدیریت...</div>
      ) : null}

      {/* 1. Overview */}
      {data && tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-black/[0.06] rounded-xl p-5 space-y-1">
              <div className="text-xs text-[#6B665F]">کل سفارش‌ها</div>
              <div className="text-2xl font-bold text-[#18181B] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(data.stats.totalOrders)}
              </div>
            </div>
            <div className="bg-white border border-black/[0.06] rounded-xl p-5 space-y-1">
              <div className="text-xs text-[#6B665F]">ارزش کل سفارش‌ها</div>
              <div className="text-xl sm:text-2xl font-bold text-[#18181B] tabular-nums">
                {formatToman(data.stats.totalRevenue)}
              </div>
            </div>
            <div className="bg-white border border-black/[0.06] rounded-xl p-5 space-y-1">
              <div className="text-xs text-[#6B665F]">محصولات کم‌موجودی (≤۵)</div>
              <div className="text-2xl font-bold text-[#8F6E38] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(data.stats.lowStockCount)}
              </div>
            </div>
            <div className="bg-white border border-black/[0.06] rounded-xl p-5 space-y-1">
              <div className="text-xs text-[#6B665F]">کاربران ثبت‌نام‌شده</div>
              <div className="text-2xl font-bold text-[#18181B] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(data.stats.totalCustomers)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-black/[0.06] rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#18181B]">آخرین سفارش‌های ثبت‌شده</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-start">
                <thead className="border-b border-black/[0.08] text-[#6B665F]">
                  <tr>
                    <th className="py-2.5 text-start font-medium">کد سفارش</th>
                    <th className="py-2.5 text-start font-medium">خریدار</th>
                    <th className="py-2.5 text-start font-medium">مبلغ</th>
                    <th className="py-2.5 text-start font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {data.orders.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td className="py-3 font-medium tabular-nums">{o.orderNumber}</td>
                      <td className="py-3">{o.customerName}</td>
                      <td className="py-3 tabular-nums">{formatToman(o.totalAmount)}</td>
                      <td className="py-3 text-[#8F6E38]">{getOrderStatusLabel(o.orderStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Products & Inventory */}
      {data && tab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#18181B]">
              {editingProductId ? 'ویرایش محصول' : 'افزودن محصول جدید'}
            </h2>

            <div className="space-y-1">
              <label htmlFor="p-name" className="text-xs font-medium">نام محصول</label>
              <input
                id="p-name"
                type="text"
                required
                value={prodForm.name}
                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="p-slug" className="text-xs font-medium">اسلاگ (لاتین)</label>
                <input
                  id="p-slug"
                  type="text"
                  dir="ltr"
                  required
                  value={prodForm.slug}
                  onChange={(e) => setProdForm({ ...prodForm, slug: e.target.value })}
                  placeholder="camel-wool-coat"
                  className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="p-sku" className="text-xs font-medium">کد کالا (SKU)</label>
                <input
                  id="p-sku"
                  type="text"
                  dir="ltr"
                  required
                  value={prodForm.sku}
                  onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                  placeholder="VR-601"
                  className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="p-cat" className="text-xs font-medium">دسته‌بندی</label>
                <select
                  id="p-cat"
                  value={prodForm.categoryId}
                  onChange={(e) => setProdForm({ ...prodForm, categoryId: e.target.value })}
                  className="w-full h-9 px-2 text-xs bg-[#FAF7F2] border border-black/15 rounded"
                >
                  <option value="">بدون دسته‌بندی</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="p-stock" className="text-xs font-medium">موجودی انبار</label>
                <input
                  id="p-stock"
                  type="number"
                  min={0}
                  required
                  value={prodForm.stock}
                  onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                  className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="p-price" className="text-xs font-medium">قیمت اصلی (تومان)</label>
                <input
                  id="p-price"
                  type="number"
                  min={1000}
                  required
                  value={prodForm.price}
                  onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
                  className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="p-disc" className="text-xs font-medium">قیمت تخفیف (اختیاری)</label>
                <input
                  id="p-disc"
                  type="number"
                  value={prodForm.discountPrice}
                  onChange={(e) => setProdForm({ ...prodForm, discountPrice: e.target.value })}
                  className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="p-sizes" className="text-xs font-medium">سایزها (با کاما جدا کنید)</label>
              <input
                id="p-sizes"
                type="text"
                dir="ltr"
                value={prodForm.sizes}
                onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })}
                className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="p-img" className="text-xs font-medium">آدرس تصویر محصول</label>
              <input
                id="p-img"
                type="text"
                dir="ltr"
                required
                value={prodForm.imageUrl}
                onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })}
                className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="p-desc" className="text-xs font-medium">توضیحات</label>
              <textarea
                id="p-desc"
                rows={3}
                required
                value={prodForm.description}
                onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                className="w-full p-2.5 text-xs bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={prodForm.isNew}
                  onChange={(e) => setProdForm({ ...prodForm, isNew: e.target.checked })}
                />
                <span>جدید</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={prodForm.isBestseller}
                  onChange={(e) => setProdForm({ ...prodForm, isBestseller: e.target.checked })}
                />
                <span>پرفروش</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs sm:text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E]"
              >
                {editingProductId ? 'ذخیره ویرایش' : 'ثبت محصول'}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={() => setEditingProductId(null)}
                  className="px-4 py-2.5 text-xs border border-black/15 rounded-md"
                >
                  انصراف
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 bg-white border border-black/[0.06] rounded-xl p-5 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-black/[0.08] text-[#6B665F]">
                <tr>
                  <th className="py-2 text-start font-medium">محصول</th>
                  <th className="py-2 text-start font-medium">قیمت</th>
                  <th className="py-2 text-start font-medium">موجودی</th>
                  <th className="py-2 text-end font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {data.products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-[#18181B]">
                      <div>{p.name}</div>
                      <div className="text-[11px] text-[#6B665F]">{p.sku}</div>
                    </td>
                    <td className="py-3 tabular-nums">{formatToman(p.discountPrice ?? p.price)}</td>
                    <td className="py-3 tabular-nums">
                      <span className={p.stock <= 5 ? 'text-red-700 font-semibold' : ''}>{p.stock}</span>
                    </td>
                    <td className="py-3 text-end space-x-2 space-x-reverse whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(p)}
                        className="text-xs text-[#8F6E38] hover:underline"
                      >
                        ویرایش
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        aria-label={`حذف ${p.name}`}
                        className="text-xs text-red-700 hover:underline"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Categories */}
      {data && tab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateCategory}
            className="md:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#18181B]">افزودن دسته‌بندی</h2>
            <div className="space-y-1">
              <label htmlFor="c-name" className="text-xs font-medium">عنوان دسته‌بندی</label>
              <input
                id="c-name"
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="c-slug" className="text-xs font-medium">نامک (Slug)</label>
              <input
                id="c-slug"
                type="text"
                dir="ltr"
                required
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="c-desc" className="text-xs font-medium">توضیح کوتاه</label>
              <input
                id="c-desc"
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="c-img" className="text-xs font-medium">آدرس تصویر</label>
              <input
                id="c-img"
                type="text"
                dir="ltr"
                required
                value={catImg}
                onChange={(e) => setCatImg(e.target.value)}
                className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-xs sm:text-sm font-medium bg-[#18181B] text-white rounded-md inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن دسته‌بندی</span>
            </button>
          </form>

          <div className="md:col-span-7 bg-white border border-black/[0.06] rounded-xl p-5 space-y-3">
            {data.categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2.5 border-b border-black/[0.05] last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-[#18181B]">{c.name}</div>
                  <div className="text-xs text-[#6B665F]">{c.description || c.slug}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                    await Promise.all([loadAdminData(), refreshStorefront()]);
                  }}
                  aria-label={`حذف دسته‌بندی ${c.name}`}
                  className="p-1.5 text-red-700 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Orders */}
      {data && tab === 'orders' && (
        <div className="space-y-4">
          {data.orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-black/[0.06] rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] pb-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-[#18181B] tabular-nums">
                    {order.orderNumber} · {order.customerName}
                  </div>
                  <div className="text-xs text-[#6B665F]">
                    {order.customerPhone} · {order.customerAddress} (کد پستی: {order.postalCode})
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{formatToman(order.totalAmount)}</span>
                  <select
                    aria-label={`تغییر وضعیت سفارش ${order.orderNumber}`}
                    value={order.orderStatus}
                    onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                    className="h-9 px-2.5 text-xs bg-[#FAF7F2] border border-black/15 rounded-md"
                  >
                    <option value="pending">ثبت اولیه</option>
                    <option value="processing">در حال آماده‌سازی</option>
                    <option value="shipped">تحویل به پیک / پست</option>
                    <option value="delivered">تحویل شده</option>
                    <option value="cancelled">لغو شده</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-[#524E48] space-y-1">
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

      {/* 5. Discounts */}
      {data && tab === 'discounts' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateDiscount}
            className="md:col-span-5 bg-white border border-black/[0.06] rounded-xl p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#18181B]">ایجاد کد تخفیف جدید</h2>
            <div className="space-y-1">
              <label htmlFor="d-code" className="text-xs font-medium">کد تخفیف (انگلیسی)</label>
              <input
                id="d-code"
                type="text"
                dir="ltr"
                required
                value={discCode}
                onChange={(e) => setDiscCode(e.target.value)}
                placeholder="SPRING20"
                className="w-full h-9 px-3 text-xs text-end uppercase bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="d-title" className="text-xs font-medium">عنوان کمپین</label>
              <input
                id="d-title"
                type="text"
                required
                value={discTitle}
                onChange={(e) => setDiscTitle(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="d-pct" className="text-xs font-medium">درصد تخفیف</label>
                <input
                  id="d-pct"
                  type="number"
                  min={1}
                  max={90}
                  required
                  value={discPercent}
                  onChange={(e) => setDiscPercent(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="d-min" className="text-xs font-medium">حداقل خرید (تومان)</label>
                <input
                  id="d-min"
                  type="number"
                  min={0}
                  required
                  value={discMin}
                  onChange={(e) => setDiscMin(e.target.value)}
                  className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-xs sm:text-sm font-medium bg-[#18181B] text-white rounded-md"
            >
              ثبت کد تخفیف
            </button>
          </form>

          <div className="md:col-span-7 bg-white border border-black/[0.06] rounded-xl p-5 space-y-3">
            {data.discounts.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2.5 border-b border-black/[0.05] last:border-0 text-xs sm:text-sm"
              >
                <div>
                  <strong className="text-[#18181B]">{d.code}</strong>
                  <span className="text-[#6B665F] ms-2">
                    ({d.percent}٪ · {d.title})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/discounts/${d.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isActive: !d.isActive }),
                      });
                      await loadAdminData();
                    }}
                    className={`text-xs font-medium ${d.isActive ? 'text-emerald-700' : 'text-[#6B665F]'}`}
                  >
                    {d.isActive ? 'فعال' : 'غیرفعال'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/discounts/${d.id}`, { method: 'DELETE' });
                      await loadAdminData();
                    }}
                    className="text-xs text-red-700"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Banners */}
      {data && tab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.banners.map((banner) => (
            <BannerEditorCard key={banner.id} banner={banner} onSave={handleSaveBanner} />
          ))}
        </div>
      )}

      {/* 7. Store White-Label Settings */}
      {settingsForm && tab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-black/[0.06] rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2 className="text-base font-semibold text-[#18181B]">
              شخصی‌سازی برند، رنگ‌بندی و اطلاعات بوتیک (White-Label)
            </h2>
            <p className="text-xs text-[#6B665F] mt-1">
              تمامی تغییرات پس از ذخیره فوراً در کل فروشگاه اعمال می‌شوند.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-name" className="text-xs font-medium">نام برند / فروشگاه</label>
              <input
                id="s-name"
                type="text"
                required
                value={settingsForm.storeName}
                onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-sub" className="text-xs font-medium">شعار یا زیرعنوان</label>
              <input
                id="s-sub"
                type="text"
                required
                value={settingsForm.storeSubtitle}
                onChange={(e) => setSettingsForm({ ...settingsForm, storeSubtitle: e.target.value })}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-logo" className="text-xs font-medium">آدرس تصویر لوگو (اختیاری)</label>
              <input
                id="s-logo"
                type="text"
                dir="ltr"
                value={settingsForm.logoUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                className="w-full h-10 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-c1" className="text-xs font-medium">رنگ اصلی (زغالی)</label>
              <input
                id="s-c1"
                type="color"
                value={settingsForm.primaryColor}
                onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                className="w-full h-10 p-1 bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-c2" className="text-xs font-medium">رنگ تاکیدی (طلایی ملایم)</label>
              <input
                id="s-c2"
                type="color"
                value={settingsForm.accentColor}
                onChange={(e) => setSettingsForm({ ...settingsForm, accentColor: e.target.value })}
                className="w-full h-10 p-1 bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-c3" className="text-xs font-medium">رنگ پس‌زمینه (کرم روشن)</label>
              <input
                id="s-c3"
                type="color"
                value={settingsForm.backgroundColor}
                onChange={(e) => setSettingsForm({ ...settingsForm, backgroundColor: e.target.value })}
                className="w-full h-10 p-1 bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-phone" className="text-xs font-medium">تلفن تماس</label>
              <input
                id="s-phone"
                type="text"
                dir="ltr"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-ig" className="text-xs font-medium">اینستاگرام</label>
              <input
                id="s-ig"
                type="text"
                dir="ltr"
                value={settingsForm.instagram}
                onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-tg" className="text-xs font-medium">تلگرام / واتساپ</label>
              <input
                id="s-tg"
                type="text"
                dir="ltr"
                value={settingsForm.telegram}
                onChange={(e) => setSettingsForm({ ...settingsForm, telegram: e.target.value })}
                className="w-full h-10 px-3 text-sm text-end bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-ship-std" className="text-xs font-medium">هزینه ارسال استاندارد (تومان)</label>
              <input
                id="s-ship-std"
                type="number"
                value={settingsForm.shippingBaseCost}
                onChange={(e) => setSettingsForm({ ...settingsForm, shippingBaseCost: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-ship-exp" className="text-xs font-medium">هزینه ارسال اکسپرس (تومان)</label>
              <input
                id="s-ship-exp"
                type="number"
                value={settingsForm.expressShippingCost}
                onChange={(e) => setSettingsForm({ ...settingsForm, expressShippingCost: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-ship-free" className="text-xs font-medium">سقف ارسال رایگان (تومان)</label>
              <input
                id="s-ship-free"
                type="number"
                value={settingsForm.freeShippingThreshold}
                onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThreshold: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="s-ann" className="text-xs font-medium">متن نوار اطلاعیه بالای صفحه</label>
            <input
              id="s-ann"
              type="text"
              value={settingsForm.announcementText}
              onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="s-about" className="text-xs font-medium">معرفی فروشگاه</label>
            <textarea
              id="s-about"
              rows={2}
              value={settingsForm.aboutText}
              onChange={(e) => setSettingsForm({ ...settingsForm, aboutText: e.target.value })}
              className="w-full p-3 text-sm bg-[#FAF7F2] border border-black/15 rounded-md"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-medium bg-[#18181B] text-white rounded-md hover:bg-[#2A2A2E]"
          >
            ذخیره تنظیمات فروشگاه
          </button>
        </form>
      )}
    </div>
  );
};

const BannerEditorCard: React.FC<{ banner: Banner; onSave: (b: Banner) => Promise<void> }> = ({
  banner,
  onSave,
}) => {
  const [form, setForm] = useState(banner);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="bg-white border border-black/[0.06] rounded-xl p-6 space-y-3"
    >
      <div className="text-xs font-medium text-[#8F6E38]">
        موقعیت: {form.position === 'hero' ? 'بنر اصلی بالای صفحه' : 'بنر تبلیغاتی میانی'}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">عنوان</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full h-9 px-3 text-sm bg-[#FAF7F2] border border-black/15 rounded"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">زیرعنوان</label>
        <textarea
          rows={2}
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          className="w-full p-2.5 text-xs bg-[#FAF7F2] border border-black/15 rounded"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">متن دکمه</label>
          <input
            type="text"
            value={form.ctaText}
            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            className="w-full h-9 px-3 text-xs bg-[#FAF7F2] border border-black/15 rounded"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">مسیر لینک</label>
          <input
            type="text"
            dir="ltr"
            value={form.ctaLink}
            onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
            className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">آدرس تصویر بنر</label>
        <input
          type="text"
          dir="ltr"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="w-full h-9 px-3 text-xs text-end bg-[#FAF7F2] border border-black/15 rounded"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 text-xs font-medium bg-[#18181B] text-white rounded-md"
      >
        ذخیره بنر
      </button>
    </form>
  );
};
