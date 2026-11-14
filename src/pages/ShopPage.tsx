import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import {
  filterAndSortProducts,
  formatToman,
  getAvailableSizes,
  getEffectiveTotalStock,
  getSizeStock,
  type ProductSortOption,
} from '../utils/commerce';
import type { Product } from '../types/store';

interface ShopPageProps {
  queryString: string;
  onNavigate: (path: string) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({ queryString, onNavigate }) => {
  const { products, categories, brands, addToCart } = useStore();

  const urlParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const [search, setSearch] = useState(urlParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    const c = Number(urlParams.get('category'));
    return Number.isInteger(c) && c > 0 ? c : null;
  });
  const [selectedBrand, setSelectedBrand] = useState<string | null>(urlParams.get('brand') || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(urlParams.get('size') || null);
  const [selectedColor, setSelectedColor] = useState<string | null>(urlParams.get('color') || null);
  const [onlyDiscounted, setOnlyDiscounted] = useState(urlParams.get('discount') === '1');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<ProductSortOption>(
    (urlParams.get('sort') as ProductSortOption) || 'newest'
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    setSearch(params.get('q') || '');
    const c = Number(params.get('category'));
    setSelectedCategory(Number.isInteger(c) && c > 0 ? c : null);
    setSelectedBrand(params.get('brand') || null);
    setSelectedSize(params.get('size') || null);
    setSelectedColor(params.get('color') || null);
    setOnlyDiscounted(params.get('discount') === '1');
    setOnlyInStock(false);
    setMinPrice(null);
    setMaxPrice(null);
    const s = params.get('sort') as ProductSortOption | null;
    setSort(s || 'newest');
  }, [queryString]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>(brands.map((b) => b.name));
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set);
  }, [brands, products]);

  const availableShoeSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      (p.sizeInventory || []).forEach((entry) => {
        if (entry.stock > 0) set.add(entry.size);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  }, [products]);

  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      p.colors.forEach((c) => {
        if (!map.has(c.name)) map.set(c.name, c.hex);
      });
    });
    return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
  }, [products]);

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        search,
        categoryId: selectedCategory,
        brand: selectedBrand,
        size: selectedSize,
        color: selectedColor,
        onlyDiscounted,
        onlyInStock,
        minPrice,
        maxPrice,
        sort,
      }),
    [
      products,
      search,
      selectedCategory,
      selectedBrand,
      selectedSize,
      selectedColor,
      onlyDiscounted,
      onlyInStock,
      minPrice,
      maxPrice,
      sort,
    ]
  );

  const handleQuickAdd = (product: Product, cardChosenSize?: string) => {
    const totalStock = getEffectiveTotalStock(product);
    if (totalStock <= 0) return;

    const available = getAvailableSizes(product);
    const chosenSize =
      cardChosenSize && available.includes(cardChosenSize)
        ? cardChosenSize
        : selectedSize && available.includes(selectedSize)
          ? selectedSize
          : available[0];
    if (!chosenSize) return;
    const maxStock = getSizeStock(product, chosenSize);
    if (maxStock <= 0) return;

    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || '',
      price: product.price,
      discountPrice: product.discountPrice,
      selectedSize: chosenSize,
      selectedColor:
        selectedColor && product.colors.some((c) => c.name === selectedColor)
          ? selectedColor
          : product.colors[0]?.name || 'استاندارد',
      quantity: 1,
      maxStock,
    });
  };

  const hasActiveFilters = Boolean(
    search ||
      selectedCategory ||
      selectedBrand ||
      selectedSize ||
      selectedColor ||
      onlyDiscounted ||
      onlyInStock ||
      minPrice ||
      maxPrice
  );

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedSize(null);
    setSelectedColor(null);
    setOnlyDiscounted(false);
    setOnlyInStock(false);
    setMinPrice(null);
    setMaxPrice(null);
    setSort('newest');
    if (queryString) {
      onNavigate('/shop');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#16141A]/[0.08] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl text-[var(--adonis-primary)]">فروشگاه تخصصی کفش و کتونی</h1>
          <p className="text-xs sm:text-sm text-[#6A6670] mt-1 tabular-nums">
            نمایش {new Intl.NumberFormat('fa-IR').format(filteredProducts.length)} مدل کفش
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#85818A] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="shop-search-input" className="sr-only">
              جستجو در کفش‌ها و کتونی‌ها
            </label>
            <input
              id="shop-search-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="نام کفش، برند یا مدل..."
              className="w-full sm:w-64 h-10 ps-9 pe-3 text-sm bg-white border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="shop-filters-panel"
              data-testid="mobile-filters-toggle"
              className="lg:hidden inline-flex items-center gap-1.5 h-10 px-3 text-xs font-medium bg-white border border-[#16141A]/15 rounded-sm text-[var(--adonis-primary)]"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>فیلترها</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--adonis-accent)]" aria-hidden="true" />
              )}
            </button>

            <label htmlFor="shop-sort-select" className="text-xs text-[#6A6670] whitespace-nowrap">
              مرتب‌سازی:
            </label>
            <select
              id="shop-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSortOption)}
              className="h-10 px-3 text-xs sm:text-sm bg-white border border-[#16141A]/15 rounded-sm focus:outline-none focus:border-[var(--adonis-accent)]"
            >
              <option value="newest">جدیدترین</option>
              <option value="bestseller">پرفروش‌ترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
              <option value="discount">بیشترین تخفیف</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sticky Desktop Sidebar Filter Rail / Collapsible Mobile Filter Panel */}
        <aside
          id="shop-filters-panel"
          className={`${
            mobileFiltersOpen ? 'block' : 'hidden lg:block'
          } lg:col-span-3 lg:sticky lg:top-24 bg-white border border-[#16141A]/[0.08] rounded-sm p-5 space-y-5`}
        >
          <div className="flex items-center justify-between border-b border-[#16141A]/[0.06] pb-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--adonis-primary)]">
              <SlidersHorizontal className="w-4 h-4 text-[var(--adonis-accent)]" />
              <span>فیلترهای تخصصی</span>
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-[#B01D39] hover:underline font-medium"
              >
                <X className="w-3.5 h-3.5" />
                <span>پاک کردن</span>
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--adonis-primary)]">دسته‌بندی</div>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-2 text-xs font-medium rounded-sm transition-colors text-start ${
                  selectedCategory === null
                    ? 'bg-[var(--adonis-primary)] text-white'
                    : 'bg-[#EFEEEA] text-[#6A6670] hover:text-[var(--adonis-primary)] hover:bg-[#E2E0DB]'
                }`}
              >
                همه کفش‌ها
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-sm transition-colors text-start ${
                    selectedCategory === cat.id
                      ? 'bg-[var(--adonis-primary)] text-white'
                      : 'bg-[#EFEEEA] text-[#6A6670] hover:text-[var(--adonis-primary)] hover:bg-[#E2E0DB]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Brand, Size, Color, Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5 pt-3 border-t border-[#16141A]/[0.06]">
            <div className="space-y-1">
              <label htmlFor="filter-brand" className="text-xs font-medium text-[#4B4752]">
                برند کفش
              </label>
              <select
                id="filter-brand"
                value={selectedBrand ?? ''}
                onChange={(e) => setSelectedBrand(e.target.value || null)}
                className="w-full h-9 px-2.5 text-xs bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm"
              >
                <option value="">همه برندها</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="filter-size" className="text-xs font-medium text-[#4B4752]">
                سایز کفش (موجود)
              </label>
              <select
                id="filter-size"
                value={selectedSize ?? ''}
                onChange={(e) => setSelectedSize(e.target.value || null)}
                className="w-full h-9 px-2.5 text-xs bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm tabular-nums"
              >
                <option value="">همه سایزها</option>
                {availableShoeSizes.map((size) => (
                  <option key={size} value={size}>
                    سایز {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="filter-color" className="text-xs font-medium text-[#4B4752]">
                رنگ
              </label>
              <select
                id="filter-color"
                value={selectedColor ?? ''}
                onChange={(e) => setSelectedColor(e.target.value || null)}
                className="w-full h-9 px-2.5 text-xs bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm"
              >
                <option value="">همه رنگ‌ها</option>
                {availableColors.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="filter-price-range" className="text-xs font-medium text-[#4B4752]">
                محدوده قیمت
              </label>
              <select
                id="filter-price-range"
                value={`${minPrice ?? ''}-${maxPrice ?? ''}`}
                onChange={(e) => {
                  const [minVal, maxVal] = e.target.value.split('-');
                  setMinPrice(minVal ? Number(minVal) : null);
                  setMaxPrice(maxVal ? Number(maxVal) : null);
                }}
                className="w-full h-9 px-2.5 text-xs bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm"
              >
                <option value="-">همه قیمت‌ها</option>
                <option value="-3500000">تا {formatToman(3500000)}</option>
                <option value="3500000-6500000">
                  {formatToman(3500000)} تا {formatToman(6500000)}
                </option>
                <option value="6500000-9000000">
                  {formatToman(6500000)} تا {formatToman(9000000)}
                </option>
                <option value="9000000-">بالای {formatToman(9000000)}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-[#16141A]/[0.06] text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-[#4B4752]">
              <input
                type="checkbox"
                checked={onlyDiscounted}
                onChange={(e) => setOnlyDiscounted(e.target.checked)}
                className="accent-[var(--adonis-accent)] w-4 h-4"
              />
              <span>فقط کفش‌های تخفیف‌دار</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[#4B4752]">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="accent-[var(--adonis-accent)] w-4 h-4"
              />
              <span>فقط کالاهای موجود</span>
            </label>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-[#16141A]/[0.08] rounded-sm py-16 px-4 text-center space-y-3">
              <p className="text-base font-medium text-[var(--adonis-primary)]">کفشی با فیلترهای انتخابی یافت نشد.</p>
              <p className="text-xs text-[#85818A]">عبارت جستجو، برند، سایز یا محدوده قیمت را تغییر دهید.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-xs font-medium bg-[var(--adonis-accent)] text-white rounded-sm hover:bg-[#B01D39]"
              >
                نمایش همه کفش‌ها
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  category={product.categoryId ? categoryMap.get(product.categoryId) : undefined}
                  preferredSize={selectedSize}
                  onNavigate={onNavigate}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
