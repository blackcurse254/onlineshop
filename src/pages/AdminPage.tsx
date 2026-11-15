import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Lock, Plus, Trash2, Upload } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';
import { formatToman, getOrderStatusLabel, getTotalStockFromSizes } from '../utils/commerce';
import type {
  Banner,
  Brand,
  Category,
  Discount,
  Order,
  Product,
  ProductSizeStock,
  Review,
  StoreSettings,
} from '../types/store';

type AdminTab =
  | 'overview'
  | 'products'
  | 'categories'
  | 'brands'
  | 'orders'
  | 'reviews'
  | 'discounts'
  | 'banners'
  | 'settings';

interface AdminOverviewData {
  stats: {
    totalOrders: number;
    newOrdersCount: number;
    totalRevenue: number;
    lowStockCount: number;
    totalCustomers: number;
  };
  products: Product[];
  categories: Category[];
  brands: Brand[];
  orders: Order[];
  discounts: Discount[];
  banners: Banner[];
  reviews: Review[];
  settings: StoreSettings;
}

const DEFAULT_SIZE_INVENTORY: ProductSizeStock[] = [
  { size: '39', stock: 2 },
  { size: '40', stock: 4 },
  { size: '41', stock: 5 },
  { size: '42', stock: 4 },
  { size: '43', stock: 3 },
  { size: '44', stock: 2 },
];

export const AdminPage: React.FC = () => {
  const { user, loginWithEmail, loginWithGoogle, refreshStorefront } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Admin login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Product form state
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [sizeInventory, setSizeInventory] = useState<ProductSizeStock[]>(DEFAULT_SIZE_INVENTORY);
  const [prodForm, setProdForm] = useState({
    name: '',
    slug: '',
    sku: '',
    brand: 'ADONIS Studio',
    model: '',
    categoryId: '',
    upperMaterial: 'چرم طبیعی گاوی',
    soleMaterial: 'لاستیک طبیعی ضدسایش',
    featuresText: 'کفی طبی قابل تعویض\nآستر تنفس‌پذیر',
    description: '',
    fabricCare: 'تمیزکاری با دستمال مرطوب و اسپری محافظ',
    price: '',
    discountPrice: '',
    colorName: 'مشکی جوهر',
    colorHex: '#0F1A1F',
    imageUrlsText: '/src/assets/images/shoe_mens_sneaker_cream_1794597375882.jpg',
    isNew: true,
    isBestseller: false,
    isFeatured: true,
    isActive: true,
  });

  // Category form state
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImg, setCatImg] = useState('/src/assets/images/shoe_mens_sneaker_cream_1794597375882.jpg');

  // Brand form state
  const [brandName, setBrandName] = useState('');
  const [brandSlug, setBrandSlug] = useState('');
  const [brandCountry, setBrandCountry] = useState('');

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

  const handleFileUpload = async (file: File, onUploaded: (url: string) => void) => {
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم تصویر نباید بیشتر از ۲ مگابایت باشد.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'));
        reader.readAsDataURL(file);
      });

      const res = await apiFetch<{ url: string }>('/api/admin/upload', {
        method: 'POST',
        body: JSON.stringify({ dataUrl }),
      });
      onUploaded(res.url);
      setFeedback('تصویر با موفقیت آپلود و تایید امنیتی شد.');
    } catch (err: any) {
      setError(err.message || 'خطا در آپلود تصویر.');
    } finally {
      setUploading(false);
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-14" data-testid="admin-forbidden">
        <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 sm:p-8 space-y-4 text-center shadow-sm">
          <Lock className="w-8 h-8 text-red-700 mx-auto" />
          <h1 className="text-xl text-[#0F1A1F]">دسترسی غیرمجاز</h1>
          <p className="text-xs sm:text-sm text-[#5F6B70] leading-relaxed">
            حساب کاربری فعلی شما مجوز دسترسی به پنل مدیریت فروشگاه ADONIS را ندارد.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-primary)] text-white rounded-sm hover:opacity-90 transition-opacity"
          >
            بازگشت به صفحه اصلی
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-[#0F1A1F]">
            <Lock className="w-5 h-5 text-[var(--adonis-accent)]" />
            <h1 className="text-xl">ورود به پنل مدیریت</h1>
          </div>
          <p className="text-xs text-[#5F6B70] leading-relaxed">
            دسترسی به داشبورد، موجودی سایز کفش‌ها و تنظیمات فروشگاه تنها با احراز هویت مدیر در سمت سرور مجاز است.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="admin-email" className="text-xs font-medium text-[#0F1A1F]">
                ایمیل مدیر
              </label>
              <input
                id="admin-email"
                type="email"
                required
                dir="ltr"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@yourstore.ir"
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[var(--adonis-accent)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-xs font-medium text-[#0F1A1F]">
                رمز عبور مدیر
              </label>
              <input
                id="admin-password"
                type="password"
                required
                dir="ltr"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm focus:border-[var(--adonis-accent)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:opacity-90 transition-opacity"
            >
              ورود مدیر
            </button>
          </form>

          <button
            type="button"
            onClick={() => loginWithGoogle().catch((e) => setError(e.message))}
            className="w-full py-2.5 text-xs sm:text-sm font-medium border border-[#0F1A1F]/20 rounded-sm hover:bg-[#EFEEEA] transition-colors"
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

    const cleanedSizes = sizeInventory
      .map((s) => ({ size: s.size.trim(), stock: Math.max(0, Math.floor(Number(s.stock) || 0)) }))
      .filter((s) => s.size.length > 0);

    if (cleanedSizes.length === 0) {
      setError('حداقل یک سایز کفش وارد کنید.');
      return;
    }

    const images = prodForm.imageUrlsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (images.length === 0) {
      setError('حداقل یک تصویر محصول وارد یا آپلود کنید.');
      return;
    }

    const payload = {
      name: prodForm.name,
      slug: prodForm.slug || `shoe-${Date.now()}`,
      sku: prodForm.sku || `AD-${Math.floor(100 + Math.random() * 899)}`,
      brand: prodForm.brand.trim() || 'ADONIS Studio',
      model: prodForm.model.trim(),
      categoryId: prodForm.categoryId ? Number(prodForm.categoryId) : null,
      upperMaterial: prodForm.upperMaterial.trim(),
      soleMaterial: prodForm.soleMaterial.trim(),
      features: prodForm.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      description: prodForm.description,
      fabricCare: prodForm.fabricCare,
      price: Number(prodForm.price),
      discountPrice: prodForm.discountPrice ? Number(prodForm.discountPrice) : null,
      sizeInventory: cleanedSizes,
      colors: [{ name: prodForm.colorName.trim() || 'مشکی', hex: prodForm.colorHex }],
      images,
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
        setFeedback('کفش با موفقیت ویرایش شد.');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback('محصول جدید با موفقیت اضافه شد.');
      }
      setEditingProductId(null);
      setSizeInventory(DEFAULT_SIZE_INVENTORY);
      setProdForm({
        ...prodForm,
        name: '',
        slug: '',
        sku: '',
        model: '',
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
    setSizeInventory(
      p.sizeInventory && p.sizeInventory.length > 0
        ? p.sizeInventory
        : (p.sizes || []).map((s) => ({ size: s, stock: 0 }))
    );
    setProdForm({
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      brand: p.brand || 'ADONIS Studio',
      model: p.model || '',
      categoryId: p.categoryId ? String(p.categoryId) : '',
      upperMaterial: p.upperMaterial || '',
      soleMaterial: p.soleMaterial || '',
      featuresText: (p.features || []).join('\n'),
      description: p.description,
      fabricCare: p.fabricCare,
      price: String(p.price),
      discountPrice: p.discountPrice ? String(p.discountPrice) : '',
      colorName: p.colors[0]?.name || 'مشکی',
      colorHex: p.colors[0]?.hex || '#0F1A1F',
      imageUrlsText: (p.images || []).join('\n'),
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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingCatId) {
        const existing = data?.categories.find((c) => c.id === editingCatId);
        await apiFetch(`/api/admin/categories/${editingCatId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: catName,
            slug: catSlug,
            description: catDesc,
            imageUrl: catImg,
            sortOrder: existing?.sortOrder ?? 1,
            isActive: existing?.isActive ?? true,
          }),
        });
        setFeedback('دسته‌بندی ویرایش شد.');
      } else {
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
        setFeedback('دسته‌بندی جدید ایجاد شد.');
      }
      setEditingCatId(null);
      setCatName('');
      setCatSlug('');
      setCatDesc('');
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMoveCategory = async (cat: Category, delta: number) => {
    setError(null);
    try {
      await apiFetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl: cat.imageUrl,
          sortOrder: Math.max(0, cat.sortOrder + delta),
          isActive: cat.isActive,
        }),
      });
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiFetch('/api/admin/brands', {
        method: 'POST',
        body: JSON.stringify({
          name: brandName,
          slug: brandSlug,
          country: brandCountry,
          sortOrder: (data?.brands.length ?? 0) + 1,
          isActive: true,
        }),
      });
      setBrandName('');
      setBrandSlug('');
      setBrandCountry('');
      setFeedback('برند جدید ثبت شد.');
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

  const calculatedTotalStock = getTotalStockFromSizes(sizeInventory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0F1A1F]/[0.08] pb-4">
        <div>
          <h1 className="text-2xl text-[#0F1A1F]">پنل مدیریت فروشگاه کفش و کتونی</h1>
          <p className="text-xs sm:text-sm text-[#5F6B70]">
            مدیریت کفش‌ها، موجودی مستقل هر سایز، دسته‌بندی‌ها، برندها، سفارش‌ها و هویت بصری برند
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#E2E0DB] rounded-sm">
        {[
          { id: 'overview' as const, label: 'داشبورد' },
          { id: 'products' as const, label: 'محصولات و سایزبندی' },
          { id: 'categories' as const, label: 'دسته‌بندی‌ها' },
          { id: 'brands' as const, label: 'برندها' },
          { id: 'orders' as const, label: 'سفارش‌ها' },
          { id: 'reviews' as const, label: 'نظرات' },
          { id: 'discounts' as const, label: 'تخفیف‌ها' },
          { id: 'banners' as const, label: 'بنرها' },
          { id: 'settings' as const, label: 'تنظیمات برند' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setFeedback(null);
              setError(null);
            }}
            className={`px-3.5 py-2 text-xs font-medium rounded-sm transition-colors whitespace-nowrap ${
              tab === item.id ? 'bg-white text-[#0F1A1F] shadow-sm' : 'text-[#44525A] hover:text-[#0F1A1F]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-xs sm:text-sm text-red-800">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-xs sm:text-sm text-emerald-800">
          {feedback}
        </div>
      )}

      {loading && !data ? (
        <div className="py-12 text-center text-sm text-[#5F6B70]">در حال بارگذاری اطلاعات مدیریت...</div>
      ) : null}

      {/* 1. Overview */}
      {data && tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-1">
              <div className="text-xs text-[#5F6B70]">کل سفارش‌ها</div>
              <div className="text-2xl font-bold text-[#0F1A1F] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(data.stats.totalOrders)}
              </div>
            </div>
            <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-1">
              <div className="text-xs text-[#5F6B70]">سفارش‌های جدید</div>
              <div className="text-2xl font-bold text-[var(--adonis-accent)] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(data.stats.newOrdersCount)}
              </div>
            </div>
            <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-1">
              <div className="text-xs text-[#5F6B70]">ارزش کل فروش</div>
              <div className="text-lg sm:text-xl font-bold text-[#0F1A1F] tabular-nums">
                {formatToman(data.stats.totalRevenue)}
              </div>
            </div>
            <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-1">
              <div className="text-xs text-[#5F6B70]">کفش‌های کم‌موجودی (≤۵)</div>
              <div className="text-2xl font-bold text-red-700 tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(data.stats.lowStockCount)}
              </div>
            </div>
            <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-1">
              <div className="text-xs text-[#5F6B70]">مشتریان ثبت‌نام‌شده</div>
              <div className="text-2xl font-bold text-[#0F1A1F] tabular-nums">
                {new Intl.NumberFormat('fa-IR').format(data.stats.totalCustomers)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#0F1A1F]">آخرین سفارش‌های ثبت‌شده</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-start">
                <thead className="border-b border-[#0F1A1F]/[0.08] text-[#5F6B70]">
                  <tr>
                    <th className="py-2.5 text-start font-medium">کد سفارش</th>
                    <th className="py-2.5 text-start font-medium">خریدار</th>
                    <th className="py-2.5 text-start font-medium">مبلغ</th>
                    <th className="py-2.5 text-start font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0F1A1F]/[0.06]">
                  {data.orders.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td dir="ltr" className="py-3 font-medium tabular-nums text-end">
                        {o.orderNumber}
                      </td>
                      <td className="py-3">{o.customerName}</td>
                      <td className="py-3 tabular-nums">{formatToman(o.totalAmount)}</td>
                      <td className="py-3 text-[var(--adonis-accent)] font-medium">{getOrderStatusLabel(o.orderStatus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Footwear Products & Per-Size Stock Matrix */}
      {data && tab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveProduct}
            className="lg:col-span-5 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#0F1A1F]">
              {editingProductId ? 'ویرایش کفش' : 'افزودن کفش / کتونی جدید'}
            </h2>

            <div className="space-y-1">
              <label htmlFor="p-name" className="text-xs font-medium">نام کفش یا کتونی</label>
              <input
                id="p-name"
                type="text"
                required
                value={prodForm.name}
                onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                placeholder="مثال: کتونی رانینگ مدل کورت"
                className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="p-brand" className="text-xs font-medium">برند</label>
                <input
                  id="p-brand"
                  type="text"
                  required
                  list="brand-suggestions"
                  value={prodForm.brand}
                  onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                />
                <datalist id="brand-suggestions">
                  {data.brands.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <label htmlFor="p-model" className="text-xs font-medium">مدل</label>
                <input
                  id="p-model"
                  type="text"
                  value={prodForm.model}
                  onChange={(e) => setProdForm({ ...prodForm, model: e.target.value })}
                  placeholder="Court Classic 01"
                  className="w-full h-9 px-3 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
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
                  placeholder="adonis-runner-pro"
                  className="w-full h-9 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                  placeholder="AD-105"
                  className="w-full h-9 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                  className="w-full h-9 px-2 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                >
                  <option value="">بدون دسته‌بندی</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="p-color" className="text-xs font-medium">رنگ اصلی</label>
                <div className="flex gap-1.5">
                  <input
                    id="p-color"
                    type="text"
                    value={prodForm.colorName}
                    onChange={(e) => setProdForm({ ...prodForm, colorName: e.target.value })}
                    className="flex-1 h-9 px-2 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                  />
                  <input
                    type="color"
                    aria-label="کد رنگ"
                    value={prodForm.colorHex}
                    onChange={(e) => setProdForm({ ...prodForm, colorHex: e.target.value })}
                    className="w-9 h-9 p-0.5 bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="p-upper" className="text-xs font-medium">جنس رویه</label>
                <input
                  id="p-upper"
                  type="text"
                  value={prodForm.upperMaterial}
                  onChange={(e) => setProdForm({ ...prodForm, upperMaterial: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="p-sole" className="text-xs font-medium">جنس زیره</label>
                <input
                  id="p-sole"
                  type="text"
                  value={prodForm.soleMaterial}
                  onChange={(e) => setProdForm({ ...prodForm, soleMaterial: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                  className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="p-disc" className="text-xs font-medium">قیمت تخفیف (اختیاری)</label>
                <input
                  id="p-disc"
                  type="number"
                  value={prodForm.discountPrice}
                  onChange={(e) => setProdForm({ ...prodForm, discountPrice: e.target.value })}
                  className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
            </div>

            {/* Per-Size Independent Stock Matrix */}
            <div className="space-y-2 p-3 bg-[#EFEEEA] border border-[#0F1A1F]/10 rounded-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0F1A1F]">
                  موجودی مستقل هر سایز (مجموع: {new Intl.NumberFormat('fa-IR').format(calculatedTotalStock)} جفت)
                </span>
                <button
                  type="button"
                  onClick={() => setSizeInventory((prev) => [...prev, { size: '45', stock: 1 }])}
                  className="text-[11px] font-medium text-[var(--adonis-accent)] hover:underline"
                >
                  + افزودن سایز
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sizeInventory.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-white p-1.5 rounded-sm border border-[#0F1A1F]/10">
                    <input
                      type="text"
                      aria-label={`سایز ${idx + 1}`}
                      value={entry.size}
                      onChange={(e) =>
                        setSizeInventory((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, size: e.target.value } : row))
                        )
                      }
                      className="w-14 h-7 px-1.5 text-xs text-center border border-[#0F1A1F]/10 rounded-sm tabular-nums"
                    />
                    <input
                      type="number"
                      min={0}
                      aria-label={`موجودی سایز ${entry.size}`}
                      value={entry.stock}
                      onChange={(e) =>
                        setSizeInventory((prev) =>
                          prev.map((row, i) => (i === idx ? { ...row, stock: Number(e.target.value) } : row))
                        )
                      }
                      className="flex-1 min-w-0 h-7 px-1.5 text-xs text-center border border-[#0F1A1F]/10 rounded-sm tabular-nums"
                    />
                    {sizeInventory.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSizeInventory((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`حذف سایز ${entry.size}`}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Product Images + Secure Upload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="p-imgs" className="text-xs font-medium">آدرس تصاویر (هر خط یک تصویر)</label>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[var(--adonis-primary)] text-white rounded-sm cursor-pointer hover:opacity-90">
                  <Upload className="w-3 h-3" />
                  <span>{uploading ? 'در حال آپلود...' : 'آپلود تصویر'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) {
                        handleFileUpload(file, (url) => {
                          setProdForm((prev) => ({
                            ...prev,
                            imageUrlsText: prev.imageUrlsText ? `${prev.imageUrlsText}\n${url}` : url,
                          }));
                        });
                      }
                    }}
                  />
                </label>
              </div>
              <textarea
                id="p-imgs"
                rows={2}
                dir="ltr"
                required
                value={prodForm.imageUrlsText}
                onChange={(e) => setProdForm({ ...prodForm, imageUrlsText: e.target.value })}
                className="w-full p-2 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="p-feats" className="text-xs font-medium">ویژگی‌های کفش (هر خط یک مورد)</label>
              <textarea
                id="p-feats"
                rows={2}
                value={prodForm.featuresText}
                onChange={(e) => setProdForm({ ...prodForm, featuresText: e.target.value })}
                className="w-full p-2 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="p-desc" className="text-xs font-medium">توضیحات کامل</label>
              <textarea
                id="p-desc"
                rows={3}
                required
                value={prodForm.description}
                onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                className="w-full p-2.5 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={prodForm.isFeatured}
                  onChange={(e) => setProdForm({ ...prodForm, isFeatured: e.target.checked })}
                />
                <span>ویژه</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={prodForm.isActive}
                  onChange={(e) => setProdForm({ ...prodForm, isActive: e.target.checked })}
                />
                <span>فعال</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:opacity-90"
              >
                {editingProductId ? 'ذخیره ویرایش' : 'ثبت کفش جدید'}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProductId(null);
                    setSizeInventory(DEFAULT_SIZE_INVENTORY);
                  }}
                  className="px-4 py-2.5 text-xs border border-[#0F1A1F]/15 rounded-sm hover:bg-[#EFEEEA]"
                >
                  انصراف
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-[#0F1A1F]/[0.08] text-[#5F6B70]">
                <tr>
                  <th className="py-2 text-start font-medium">مدل و برند</th>
                  <th className="py-2 text-start font-medium">قیمت</th>
                  <th className="py-2 text-start font-medium">موجودی سایزها</th>
                  <th className="py-2 text-end font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F1A1F]/[0.06]">
                {data.products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-[#0F1A1F]">
                      <div>{p.name}</div>
                      <div className="text-[11px] text-[#5F6B70]">
                        {p.brand} · {p.sku} {!p.isActive && '· غیرفعال'}
                      </div>
                    </td>
                    <td className="py-3 tabular-nums">{formatToman(p.discountPrice ?? p.price)}</td>
                    <td className="py-3 text-xs tabular-nums">
                      <span className={p.stock <= 5 ? 'text-red-700 font-semibold' : ''}>{p.stock} جفت</span>
                      <div className="text-[10px] text-[#5F6B70]">
                        {(p.sizeInventory || []).map((s) => `${s.size}:${s.stock}`).join(' · ')}
                      </div>
                    </td>
                    <td className="py-3 text-end space-x-2 space-x-reverse whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(p)}
                        className="text-xs text-[var(--adonis-accent)] hover:underline"
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

      {/* 3. Categories (Add, Edit, Reorder, Delete) */}
      {data && tab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveCategory}
            className="md:col-span-5 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#0F1A1F]">
              {editingCatId ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی کفش'}
            </h2>
            <div className="space-y-1">
              <label htmlFor="c-name" className="text-xs font-medium">عنوان دسته‌بندی</label>
              <input
                id="c-name"
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                className="w-full h-9 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="c-desc" className="text-xs font-medium">توضیح کوتاه</label>
              <input
                id="c-desc"
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                className="w-full h-9 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm inline-flex items-center justify-center gap-1.5 hover:opacity-90"
              >
                <Plus className="w-4 h-4" />
                <span>{editingCatId ? 'ذخیره تغییرات' : 'افزودن دسته‌بندی'}</span>
              </button>
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName('');
                    setCatSlug('');
                    setCatDesc('');
                  }}
                  className="px-4 py-2 text-xs border border-[#0F1A1F]/15 rounded-sm hover:bg-[#EFEEEA]"
                >
                  انصراف
                </button>
              )}
            </div>
          </form>

          <div className="md:col-span-7 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-3">
            {data.categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-[#0F1A1F]/[0.06] last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-[#0F1A1F]">
                    {c.name}{' '}
                    <span className="text-[11px] text-[#7C888D] tabular-nums">(#{c.sortOrder})</span>
                  </div>
                  <div className="text-xs text-[#5F6B70]">{c.description || c.slug}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMoveCategory(c, -1)}
                    aria-label={`اولویت بالاتر ${c.name}`}
                    className="p-1.5 border border-[#0F1A1F]/10 rounded-sm hover:bg-[#EFEEEA]"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveCategory(c, 1)}
                    aria-label={`اولویت پایین‌تر ${c.name}`}
                    className="p-1.5 border border-[#0F1A1F]/10 rounded-sm hover:bg-[#EFEEEA]"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(c.id);
                      setCatName(c.name);
                      setCatSlug(c.slug);
                      setCatDesc(c.description);
                      setCatImg(c.imageUrl);
                    }}
                    className="px-2 py-1 text-xs text-[var(--adonis-accent)] hover:underline"
                  >
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      try {
                        await apiFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                        setFeedback('دسته‌بندی حذف شد.');
                        await Promise.all([loadAdminData(), refreshStorefront()]);
                      } catch (err: any) {
                        setError(err.message || 'خطا در حذف دسته‌بندی');
                      }
                    }}
                    aria-label={`حذف دسته‌بندی ${c.name}`}
                    className="p-1.5 text-red-700 hover:bg-red-50 rounded-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Brands */}
      {data && tab === 'brands' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateBrand}
            className="md:col-span-5 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#0F1A1F]">افزودن برند کفش</h2>
            <div className="space-y-1">
              <label htmlFor="b-name" className="text-xs font-medium">نام برند</label>
              <input
                id="b-name"
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Puma"
                className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="b-slug" className="text-xs font-medium">اسلاگ (لاتین)</label>
              <input
                id="b-slug"
                type="text"
                dir="ltr"
                required
                value={brandSlug}
                onChange={(e) => setBrandSlug(e.target.value)}
                placeholder="puma"
                className="w-full h-9 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="b-country" className="text-xs font-medium">کشور مبدا</label>
              <input
                id="b-country"
                type="text"
                value={brandCountry}
                onChange={(e) => setBrandCountry(e.target.value)}
                placeholder="آلمان"
                className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:opacity-90"
            >
              ثبت برند
            </button>
          </form>

          <div className="md:col-span-7 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-3">
            {data.brands.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2.5 border-b border-[#0F1A1F]/[0.06] last:border-0"
              >
                <div>
                  <div className="text-sm font-semibold text-[#0F1A1F]">{b.name}</div>
                  <div className="text-xs text-[#5F6B70]">{b.country || b.slug}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    try {
                      await apiFetch(`/api/admin/brands/${b.id}`, { method: 'DELETE' });
                      setFeedback('برند حذف شد.');
                      await Promise.all([loadAdminData(), refreshStorefront()]);
                    } catch (err: any) {
                      setError(err.message || 'خطا در حذف برند');
                    }
                  }}
                  aria-label={`حذف برند ${b.name}`}
                  className="p-1.5 text-red-700 hover:bg-red-50 rounded-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Orders */}
      {data && tab === 'orders' && (
        <div className="space-y-4">
          {data.orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0F1A1F]/[0.06] pb-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-[#0F1A1F] tabular-nums">
                    <span dir="ltr" className="inline-block">{order.orderNumber}</span> · {order.customerName}
                  </div>
                  <div className="text-xs text-[#5F6B70]">
                    <span dir="ltr" className="inline-block">{order.customerPhone}</span> · {order.customerAddress} (کد پستی: <span dir="ltr" className="inline-block">{order.postalCode}</span>)
                  </div>
                  {order.notes && <div className="text-[11px] text-[var(--adonis-accent)]">یادداشت: {order.notes}</div>}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{formatToman(order.totalAmount)}</span>
                  <select
                    aria-label={`تغییر وضعیت سفارش ${order.orderNumber}`}
                    value={order.orderStatus}
                    onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                    className="h-9 px-2.5 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                  >
                    <option value="pending">ثبت اولیه</option>
                    <option value="processing">در حال آماده‌سازی</option>
                    <option value="shipped">تحویل به پیک / پست</option>
                    <option value="delivered">تحویل شده</option>
                    <option value="cancelled">لغو شده</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-[#44525A] space-y-1">
                {(order.items ?? []).map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.productName} (سایز {item.selectedSize} · {item.selectedColor}) × {item.quantity}
                    </span>
                    <span className="tabular-nums">{formatToman(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. Reviews Moderation */}
      {data && tab === 'reviews' && (
        <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-3">
          {data.reviews.map((rev) => (
            <div
              key={rev.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-[#0F1A1F]/[0.06] last:border-0"
            >
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-semibold text-[#0F1A1F]">
                  {rev.authorName} · <span className="text-[var(--adonis-accent)]">{rev.productName || 'عمومی'}</span>
                </div>
                <p className="text-xs text-[#44525A]">{rev.comment}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    try {
                      await apiFetch(`/api/admin/reviews/${rev.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ isApproved: !rev.isApproved }),
                      });
                      setFeedback('وضعیت نظر به‌روزرسانی شد.');
                      await Promise.all([loadAdminData(), refreshStorefront()]);
                    } catch (err: any) {
                      setError(err.message || 'خطا در تغییر وضعیت نظر');
                    }
                  }}
                  className={`px-3 py-1 rounded-sm text-xs font-medium ${
                    rev.isApproved ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {rev.isApproved ? 'تایید شده (نمایش)' : 'در انتظار تایید'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    try {
                      await apiFetch(`/api/admin/reviews/${rev.id}`, { method: 'DELETE' });
                      setFeedback('نظر حذف شد.');
                      await Promise.all([loadAdminData(), refreshStorefront()]);
                    } catch (err: any) {
                      setError(err.message || 'خطا در حذف نظر');
                    }
                  }}
                  className="text-xs text-red-700 hover:underline"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Discounts */}
      {data && tab === 'discounts' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateDiscount}
            className="md:col-span-5 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#0F1A1F]">ایجاد کد تخفیف جدید</h2>
            <div className="space-y-1">
              <label htmlFor="d-code" className="text-xs font-medium">کد تخفیف (انگلیسی)</label>
              <input
                id="d-code"
                type="text"
                dir="ltr"
                required
                value={discCode}
                onChange={(e) => setDiscCode(e.target.value)}
                placeholder="SNEAKER20"
                className="w-full h-9 px-3 text-xs text-end uppercase bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                  className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                  className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-xs sm:text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:opacity-90"
            >
              ثبت کد تخفیف
            </button>
          </form>

          <div className="md:col-span-7 bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-5 space-y-3">
            {data.discounts.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2.5 border-b border-[#0F1A1F]/[0.06] last:border-0 text-xs sm:text-sm"
              >
                <div>
                  <strong className="text-[#0F1A1F]">{d.code}</strong>
                  <span className="text-[#5F6B70] ms-2">
                    ({d.percent}٪ · {d.title})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      try {
                        await apiFetch(`/api/admin/discounts/${d.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ isActive: !d.isActive }),
                        });
                        setFeedback('وضعیت کد تخفیف تغییر کرد.');
                        await loadAdminData();
                      } catch (err: any) {
                        setError(err.message || 'خطا در تغییر وضعیت کد تخفیف');
                      }
                    }}
                    className={`text-xs font-medium ${d.isActive ? 'text-emerald-700' : 'text-[#7C888D]'}`}
                  >
                    {d.isActive ? 'فعال' : 'غیرفعال'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      try {
                        await apiFetch(`/api/admin/discounts/${d.id}`, { method: 'DELETE' });
                        setFeedback('کد تخفیف حذف شد.');
                        await loadAdminData();
                      } catch (err: any) {
                        setError(err.message || 'خطا در حذف کد تخفیف');
                      }
                    }}
                    className="text-xs text-red-700 hover:underline"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Banners */}
      {data && tab === 'banners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.banners.map((banner) => (
            <BannerEditorCard key={banner.id} banner={banner} onSave={handleSaveBanner} />
          ))}
        </div>
      )}

      {/* 9. Store White-Label Settings */}
      {settingsForm && tab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2 className="text-base font-semibold text-[#0F1A1F]">
              شخصی‌سازی برند، رنگ‌بندی و اطلاعات فروشگاه کفش (White-Label)
            </h2>
            <p className="text-xs text-[#5F6B70] mt-1">
              تمامی تغییرات پس از ذخیره فوراً در کل فروشگاه اعمال می‌شوند.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-name" className="text-xs font-medium">نام برند / فروشگاه</label>
              <input
                id="s-name"
                type="text"
                required
                value={settingsForm.storeName}
                onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-logo-text" className="text-xs font-medium">متن لوگوی هدر</label>
              <input
                id="s-logo-text"
                type="text"
                required
                value={settingsForm.logoText}
                onChange={(e) => setSettingsForm({ ...settingsForm, logoText: e.target.value })}
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                className="w-full h-10 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
          </div>

          <div className="space-y-3 p-4 bg-[#EFEEEA] border border-[#0F1A1F]/[0.08] rounded-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#0F1A1F]">پالت‌های آماده فروشگاه</span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    label: 'زمرد و مرمر (پیش‌فرض ADONIS)',
                    primaryColor: '#0F1A1F',
                    accentColor: '#0B7A5F',
                    backgroundColor: '#EFEEEA',
                  },
                  {
                    label: 'سرمه‌ای عقیق و زمرد',
                    primaryColor: '#0B1F2E',
                    accentColor: '#0B7A5F',
                    backgroundColor: '#EFEEEA',
                  },
                  {
                    label: 'جوهر و زمرد تیره',
                    primaryColor: '#0F1A1F',
                    accentColor: '#085544',
                    backgroundColor: '#E8E7E2',
                  },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setSettingsForm({
                        ...settingsForm,
                        primaryColor: preset.primaryColor,
                        accentColor: preset.accentColor,
                        backgroundColor: preset.backgroundColor,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#0F1A1F]/15 rounded-sm text-[11px] font-medium text-[#0F1A1F] hover:border-[var(--adonis-accent)] transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-[#0F1A1F]/20"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-[#0F1A1F]/20"
                      style={{ backgroundColor: preset.accentColor }}
                    />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label htmlFor="s-c1" className="text-xs font-medium">رنگ اصلی</label>
                <input
                  id="s-c1"
                  type="color"
                  value={settingsForm.primaryColor}
                  onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                  className="w-full h-10 p-1 bg-white border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="s-c2" className="text-xs font-medium">رنگ تاکیدی</label>
                <input
                  id="s-c2"
                  type="color"
                  value={settingsForm.accentColor}
                  onChange={(e) => setSettingsForm({ ...settingsForm, accentColor: e.target.value })}
                  className="w-full h-10 p-1 bg-white border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="s-c3" className="text-xs font-medium">رنگ پس‌زمینه</label>
                <input
                  id="s-c3"
                  type="color"
                  value={settingsForm.backgroundColor}
                  onChange={(e) => setSettingsForm({ ...settingsForm, backgroundColor: e.target.value })}
                  className="w-full h-10 p-1 bg-white border border-[#0F1A1F]/15 rounded-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-phone" className="text-xs font-medium">تلفن تماس</label>
              <input
                id="s-phone"
                type="text"
                dir="ltr"
                value={settingsForm.phone}
                onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-email" className="text-xs font-medium">ایمیل پشتیبانی</label>
              <input
                id="s-email"
                type="email"
                dir="ltr"
                value={settingsForm.email}
                onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
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
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-tg" className="text-xs font-medium">تلگرام</label>
              <input
                id="s-tg"
                type="text"
                dir="ltr"
                value={settingsForm.telegram}
                onChange={(e) => setSettingsForm({ ...settingsForm, telegram: e.target.value })}
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-wa" className="text-xs font-medium">واتساپ</label>
              <input
                id="s-wa"
                type="text"
                dir="ltr"
                value={settingsForm.whatsapp}
                onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                className="w-full h-10 px-3 text-sm text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-address" className="text-xs font-medium">آدرس فروشگاه</label>
              <input
                id="s-address"
                type="text"
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-ship1" className="text-xs font-medium">هزینه ارسال استاندارد (تومان)</label>
              <input
                id="s-ship1"
                type="number"
                value={settingsForm.shippingBaseCost}
                onChange={(e) => setSettingsForm({ ...settingsForm, shippingBaseCost: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-ship2" className="text-xs font-medium">هزینه ارسال اکسپرس (تومان)</label>
              <input
                id="s-ship2"
                type="number"
                value={settingsForm.expressShippingCost}
                onChange={(e) => setSettingsForm({ ...settingsForm, expressShippingCost: Number(e.target.value) })}
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-free" className="text-xs font-medium">سقف ارسال رایگان (تومان)</label>
              <input
                id="s-free"
                type="number"
                value={settingsForm.freeShippingThreshold}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, freeShippingThreshold: Number(e.target.value) })
                }
                className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="s-ann" className="text-xs font-medium">متن نوار اطلاعیه بالای سایت</label>
            <input
              id="s-ann"
              type="text"
              value={settingsForm.announcementText}
              onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}
              className="w-full h-10 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="s-ship-pol" className="text-xs font-medium">سیاست ارسال سفارش</label>
              <textarea
                id="s-ship-pol"
                rows={2}
                value={settingsForm.shippingPolicy}
                onChange={(e) => setSettingsForm({ ...settingsForm, shippingPolicy: e.target.value })}
                className="w-full p-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="s-ret-pol" className="text-xs font-medium">سیاست تعویض و بازگشت سایز</label>
              <textarea
                id="s-ret-pol"
                rows={2}
                value={settingsForm.returnPolicy}
                onChange={(e) => setSettingsForm({ ...settingsForm, returnPolicy: e.target.value })}
                className="w-full p-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="s-about" className="text-xs font-medium">درباره فروشگاه</label>
            <textarea
              id="s-about"
              rows={2}
              value={settingsForm.aboutText}
              onChange={(e) => setSettingsForm({ ...settingsForm, aboutText: e.target.value })}
              className="w-full p-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 text-sm font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:opacity-90"
          >
            ذخیره و اعمال تنظیمات فروشگاه
          </button>
        </form>
      )}
    </div>
  );
};

const BannerEditorCard: React.FC<{ banner: Banner; onSave: (banner: Banner) => void }> = ({
  banner,
  onSave,
}) => {
  const [form, setForm] = useState(banner);
  return (
    <div className="bg-white border border-[#0F1A1F]/[0.08] rounded-sm p-6 space-y-4">
      <div className="text-xs font-semibold text-[var(--adonis-accent)]">
        بنر {banner.position === 'hero' ? 'اصلی (Hero)' : 'تبلیغاتی میانی'}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">عنوان</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full h-9 px-3 text-sm bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">زیرعنوان</label>
        <textarea
          rows={2}
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          className="w-full p-2.5 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">متن دکمه</label>
          <input
            type="text"
            value={form.ctaText}
            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            className="w-full h-9 px-3 text-xs bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">لینک</label>
          <input
            type="text"
            dir="ltr"
            value={form.ctaLink}
            onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
            className="w-full h-9 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">آدرس تصویر</label>
        <input
          type="text"
          dir="ltr"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          className="w-full h-9 px-3 text-xs text-end bg-[#EFEEEA] border border-[#0F1A1F]/15 rounded-sm"
        />
      </div>
      <button
        type="button"
        onClick={() => onSave(form)}
        className="px-4 py-2 text-xs font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:opacity-90"
      >
        ذخیره بنر
      </button>
    </div>
  );
};
