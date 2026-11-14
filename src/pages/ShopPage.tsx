import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Filter, Footprints, Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { useReveal } from '../hooks/useReveal';
import { useAccessibleDialog } from '../hooks/useAccessibleDialog';
import {
  calculateDiscountPercent,
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

const RevealCard: React.FC<{ index: number; children: React.ReactNode }> = ({ index, children }) => {
  const { ref, revealed } = useReveal();
  return (
    <div
      ref={ref}
      className={`h-full reveal-item ${revealed ? 'is-revealed' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 7) * 60}ms` }}
    >
      {children}
    </div>
  );
};

export const ShopPage: React.FC<ShopPageProps> = ({ queryString, onNavigate }) => {
  const { loading, products, categories, brands, addToCart } = useStore();

  const urlParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const initialIsDiscount = urlParams.get('discount') === '1';

  const [search, setSearch] = useState(urlParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    const c = Number(urlParams.get('category'));
    return Number.isInteger(c) && c > 0 ? c : null;
  });
  const [selectedBrand, setSelectedBrand] = useState<string | null>(urlParams.get('brand') || null);
  const [selectedSize, setSelectedSize] = useState<string | null>(urlParams.get('size') || null);
  const [selectedColor, setSelectedColor] = useState<string | null>(urlParams.get('color') || null);
  const [onlyDiscounted, setOnlyDiscounted] = useState(initialIsDiscount);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<ProductSortOption>(() => {
    const s = urlParams.get('sort') as ProductSortOption | null;
    if (s) return s;
    return initialIsDiscount ? 'discount' : 'newest';
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filterDrawerRef = useRef<HTMLElement | null>(null);
  const filterCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const filterToggleRef = useRef<HTMLButtonElement | null>(null);

  useAccessibleDialog({
    isOpen: mobileFiltersOpen,
    onClose: () => setMobileFiltersOpen(false),
    containerRef: filterDrawerRef,
    initialFocusRef: filterCloseBtnRef,
    restoreFocusRef: filterToggleRef,
    closeOnDesktopBreakpoint: true,
  });

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const isDiscount = params.get('discount') === '1';
    setSearch(params.get('q') || '');
    const c = Number(params.get('category'));
    setSelectedCategory(Number.isInteger(c) && c > 0 ? c : null);
    setSelectedBrand(params.get('brand') || null);
    setSelectedSize(params.get('size') || null);
    setSelectedColor(params.get('color') || null);
    setOnlyDiscounted(isDiscount);
    setOnlyInStock(false);
    setMinPrice(null);
    setMaxPrice(null);
    const s = params.get('sort') as ProductSortOption | null;
    setSort(s || (isDiscount ? 'discount' : 'newest'));
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

  const maxDiscountPercent = useMemo(() => {
    let max = 0;
    for (const p of products) {
      const pct = calculateDiscountPercent(p.price, p.discountPrice);
      if (pct > max) max = pct;
    }
    return max;
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

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onRemove: () => void }> = [];
    if (search) {
      chips.push({ id: 'search', label: `جستجو: ${search}`, onRemove: () => setSearch('') });
    }
    if (selectedCategory !== null) {
      chips.push({
        id: 'cat',
        label: `دسته: ${categoryMap.get(selectedCategory)?.name || selectedCategory}`,
        onRemove: () => setSelectedCategory(null),
      });
    }
    if (selectedBrand) {
      chips.push({ id: 'brand', label: `برند: ${selectedBrand}`, onRemove: () => setSelectedBrand(null) });
    }
    if (selectedSize) {
      chips.push({ id: 'size', label: `سایز: ${selectedSize}`, onRemove: () => setSelectedSize(null) });
    }
    if (selectedColor) {
      chips.push({ id: 'color', label: `رنگ: ${selectedColor}`, onRemove: () => setSelectedColor(null) });
    }
    if (minPrice !== null || maxPrice !== null) {
      const priceLabel =
        minPrice && maxPrice
          ? `${formatToman(minPrice)} تا ${formatToman(maxPrice)}`
          : maxPrice
            ? `تا ${formatToman(maxPrice)}`
            : `بالای ${formatToman(minPrice || 0)}`;
      chips.push({
        id: 'price',
        label: priceLabel,
        onRemove: () => {
          setMinPrice(null);
          setMaxPrice(null);
        },
      });
    }
    if (onlyDiscounted) {
      chips.push({
        id: 'discount',
        label: 'فقط تخفیف‌دارها',
        onRemove: () => setOnlyDiscounted(false),
      });
    }
    if (onlyInStock) {
      chips.push({ id: 'stock', label: 'فقط موجودها', onRemove: () => setOnlyInStock(false) });
    }
    return chips;
  }, [
    search,
    selectedCategory,
    selectedBrand,
    selectedSize,
    selectedColor,
    minPrice,
    maxPrice,
    onlyDiscounted,
    onlyInStock,
    categoryMap,
  ]);

  const faCount = new Intl.NumberFormat('fa-IR').format(filteredProducts.length);
  const faMaxDiscount = new Intl.NumberFormat('fa-IR').format(maxDiscountPercent);

  const filterFormBody = (
    <>
      <div className="flex items-center justify-between border-b border-[#16141A]/[0.08] pb-3.5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#16141A]">
          <SlidersHorizontal className="w-4 h-4 text-[#C21E3C]" />
          <span>فیلترهای تخصصی</span>
        </span>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-[#B01D39] hover:underline font-medium min-h-[36px]"
            >
              <X className="w-3.5 h-3.5" />
              <span>پاک کردن</span>
            </button>
          )}
          <button
            ref={filterCloseBtnRef}
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="بستن فیلترها"
            className="lg:hidden p-2 text-[#16141A] hover:bg-[#EFEEEA] rounded-sm min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 01 — Brand */}
      <div className="space-y-2">
        <label htmlFor="filter-brand" className="block text-[11px] font-semibold tracking-widest text-[#B01D39]">
          ۰۱ — برند
        </label>
        <select
          id="filter-brand"
          value={selectedBrand ?? ''}
          onChange={(e) => setSelectedBrand(e.target.value || null)}
          className="w-full min-h-[44px] px-3 text-xs sm:text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
        >
          <option value="">همه برندها</option>
          {availableBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* 02 — Size */}
      {availableShoeSizes.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-[#16141A]/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۲ — سایز</span>
            {selectedSize && (
              <button
                type="button"
                onClick={() => setSelectedSize(null)}
                className="text-[11px] text-[#6A6670] hover:text-[#B01D39]"
              >
                همه سایزها
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="فیلتر بر اساس سایز کفش">
            {availableShoeSizes.map((size) => {
              const active = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(active ? null : size)}
                  aria-pressed={active}
                  className={`min-w-[44px] min-h-[44px] px-2.5 text-xs font-semibold rounded-sm border tabular-nums transition-colors ${
                    active
                      ? 'bg-[#16141A] text-[#EFEEEA] border-[#16141A]'
                      : 'bg-[#EFEEEA] text-[#16141A] border-[#16141A]/15 hover:border-[#C21E3C]'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 03 — Color */}
      {availableColors.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-[#16141A]/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-widest text-[#B01D39]">۰۳ — رنگ</span>
            {selectedColor && (
              <button
                type="button"
                onClick={() => setSelectedColor(null)}
                className="text-[11px] text-[#6A6670] hover:text-[#B01D39]"
              >
                {selectedColor} ×
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="فیلتر بر اساس رنگ">
            {availableColors.map((c) => {
              const active = selectedColor === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(active ? null : c.name)}
                  aria-label={`فیلتر رنگ ${c.name}`}
                  aria-pressed={active}
                  title={c.name}
                  className={`min-w-[44px] min-h-[44px] rounded-sm border flex items-center justify-center transition-colors ${
                    active
                      ? 'border-[#C21E3C] bg-[#EBDADD]/60'
                      : 'border-[#16141A]/10 bg-[#EFEEEA]/60 hover:border-[#16141A]/40'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full border border-[#16141A]/25 flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: c.hex }}
                  >
                    {active && <Check className="w-3.5 h-3.5 text-white drop-shadow" strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 04 — Price */}
      <div className="space-y-2 pt-3 border-t border-[#16141A]/[0.06]">
        <label htmlFor="filter-price-range" className="block text-[11px] font-semibold tracking-widest text-[#B01D39]">
          ۰۴ — قیمت
        </label>
        <select
          id="filter-price-range"
          value={`${minPrice ?? ''}-${maxPrice ?? ''}`}
          onChange={(e) => {
            const [minVal, maxVal] = e.target.value.split('-');
            setMinPrice(minVal ? Number(minVal) : null);
            setMaxPrice(maxVal ? Number(maxVal) : null);
          }}
          className="w-full min-h-[44px] px-3 text-xs sm:text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
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

      {/* Availability & Discount toggles */}
      <div className="space-y-1 pt-3 border-t border-[#16141A]/[0.06] text-xs">
        <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer text-[#16141A] font-medium">
          <input
            type="checkbox"
            checked={onlyDiscounted}
            onChange={(e) => setOnlyDiscounted(e.target.checked)}
            className="accent-[#C21E3C] w-4 h-4 rounded-sm"
          />
          <span>فقط کفش‌های تخفیف‌دار</span>
        </label>

        <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer text-[#16141A] font-medium">
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="accent-[#C21E3C] w-4 h-4 rounded-sm"
          />
          <span>فقط کالاهای موجود</span>
        </label>
      </div>
    </>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Top Editorial Header Band */}
      {onlyDiscounted ? (
        <section className="relative overflow-hidden bg-gradient-to-l from-[#2B1A2E] via-[#4C1730] to-[#7A1630] text-[#EFEEEA]">
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute -top-12 -end-10 w-56 h-56 rotate-45 border border-[#F2B6C0]/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none select-none absolute -bottom-16 end-24 w-44 h-44 rotate-45 border border-[#F2B6C0]/15"
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-4">
            <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-xs text-[#F2B6C0]/90">
              <button type="button" onClick={() => onNavigate('/')} className="hover:text-white transition-colors">
                خانه
              </button>
              <span aria-hidden="true">/</span>
              <span className="text-[#EFEEEA] font-medium">تخفیف‌های ویژه</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold tracking-widest text-[#F2B6C0]">
                  ۰۱ — پیشنهادهای ویژه فصل
                </div>
                <h1 className="text-4xl sm:text-5xl text-[#EFEEEA]">تخفیف‌های ویژه آدونیس</h1>
                <p className="text-xs sm:text-sm text-[#EFEEEA]/80 tabular-nums">
                  {faCount} مدل کفش و کتونی منتخب · تا پایان موجودی
                </p>
              </div>

              {maxDiscountPercent > 0 && (
                <div className="inline-flex items-center gap-3 self-start md:self-auto bg-[#C21E3C] text-white px-5 py-3 rounded-sm border border-[#F2B6C0]/40 shadow-lg">
                  <span className="text-xl sm:text-2xl font-bold tabular-nums">تا ٪{faMaxDiscount} تخفیف</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 meander meander-light" aria-hidden="true" />
        </section>
      ) : (
        <section className="relative overflow-hidden bg-[#2B1A2E] text-[#EFEEEA]">
          <div
            aria-hidden="true"
            className="pointer-events-none select-none font-display-serif text-[84px] sm:text-[150px] lg:text-[210px] leading-none tracking-[0.14em] text-transparent opacity-30 absolute -bottom-2 inset-x-0 text-center whitespace-nowrap overflow-hidden"
            style={{ WebkitTextStroke: '1px #F2B6C0' }}
          >
            ADONIS
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-4">
            <nav aria-label="مسیر صفحه" className="flex items-center gap-2 text-xs text-[#F2B6C0]/90">
              <button type="button" onClick={() => onNavigate('/')} className="hover:text-white transition-colors">
                خانه
              </button>
              <span aria-hidden="true">/</span>
              <span className="text-[#EFEEEA] font-medium">فروشگاه کفش</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="text-[11px] font-semibold tracking-widest text-[#F2B6C0]">۰۱ — کلکسیون کفش</div>
                <h1 className="text-4xl sm:text-5xl text-[#EFEEEA]">فروشگاه تخصصی کفش و کتونی</h1>
              </div>
              <p className="text-xs sm:text-sm text-[#F2B6C0] font-medium tabular-nums">
                نمایش {faCount} مدل کفش
              </p>
            </div>
          </div>

          <div className="relative z-10 meander meander-light" aria-hidden="true" />
        </section>
      )}

      {/* Horizontal Scrollable Category Pills Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2"
          role="navigation"
          aria-label="فیلتر سریع دسته‌بندی کفش"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`min-h-[44px] px-4 text-xs sm:text-sm font-medium rounded-sm border transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === null
                ? 'bg-[#16141A] text-[#EFEEEA] border-[#16141A]'
                : 'bg-white text-[#16141A] border-[#16141A]/15 hover:border-[#C21E3C]'
            }`}
          >
            همه کفش‌ها
          </button>
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(active ? null : cat.id)}
                className={`min-h-[44px] px-4 text-xs sm:text-sm font-medium rounded-sm border transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#16141A] text-[#EFEEEA] border-[#16141A]'
                    : 'bg-white text-[#16141A] border-[#16141A]/15 hover:border-[#C21E3C]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Catalog Workspace */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Desktop Sticky Filter Rail + Mobile Slide-over Drawer */}
          <aside
            ref={filterDrawerRef}
            id="shop-filters-panel"
            role={mobileFiltersOpen ? 'dialog' : undefined}
            aria-modal={mobileFiltersOpen ? true : undefined}
            aria-label="فیلترهای فروشگاه"
            className={`${
              mobileFiltersOpen
                ? 'fixed inset-0 z-50 lg:static lg:z-auto flex lg:block lg:col-span-3'
                : 'hidden lg:block lg:col-span-3 lg:sticky lg:top-24'
            }`}
          >
            {mobileFiltersOpen && (
              <div
                className="fixed inset-0 bg-[#2B1A2E]/60 backdrop-blur-[1px] lg:hidden"
                onClick={() => setMobileFiltersOpen(false)}
                aria-hidden="true"
              />
            )}

            <div className="relative z-10 w-full max-w-[340px] lg:max-w-none h-[100dvh] lg:h-auto bg-white border border-[#16141A]/10 border-t-2 border-t-[#16141A] rounded-sm flex flex-col lg:block shadow-2xl lg:shadow-none">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">{filterFormBody}</div>
              <div className="p-4 border-t border-[#16141A]/10 bg-[#EFEEEA] lg:hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full min-h-[44px] bg-[#C21E3C] text-white text-sm font-semibold rounded-sm hover:bg-[#16141A] transition-colors"
                >
                  اعمال فیلتر ({faCount} مدل)
                </button>
              </div>
            </div>
          </aside>

          {/* Products Area */}
          <div className="lg:col-span-9 space-y-5">
            {/* Toolbar Above Grid */}
            <div className="bg-white border border-[#16141A]/[0.08] rounded-sm p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-sm">
                  <Search className="w-4 h-4 text-[#6A6670] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <label htmlFor="shop-search-input" className="sr-only">
                    جستجو در کفش‌ها و کتونی‌ها
                  </label>
                  <input
                    id="shop-search-input"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="جستجوی نام کفش، برند یا مدل..."
                    className="w-full min-h-[44px] ps-9 pe-3 text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C]"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5">
                  <button
                    ref={filterToggleRef}
                    type="button"
                    onClick={() => setMobileFiltersOpen((v) => !v)}
                    aria-expanded={mobileFiltersOpen}
                    aria-controls="shop-filters-panel"
                    data-testid="mobile-filters-toggle"
                    className="lg:hidden inline-flex items-center gap-1.5 min-h-[44px] px-3.5 text-xs font-semibold bg-[#EFEEEA] border border-[#16141A]/20 rounded-sm text-[#16141A]"
                  >
                    <Filter className="w-3.5 h-3.5 text-[#C21E3C]" />
                    <span>فیلترها</span>
                    {hasActiveFilters && (
                      <span className="w-2 h-2 rounded-full bg-[#C21E3C]" aria-hidden="true" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <label htmlFor="shop-sort-select" className="text-xs text-[#6A6670] whitespace-nowrap">
                      مرتب‌سازی:
                    </label>
                    <select
                      id="shop-sort-select"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as ProductSortOption)}
                      className="min-h-[44px] px-3 text-xs sm:text-sm bg-[#EFEEEA] border border-[#16141A]/15 rounded-sm focus:border-[#C21E3C] font-medium text-[#16141A]"
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

              {activeFilterChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#16141A]/[0.06]">
                  {activeFilterChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={chip.onRemove}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1 text-xs font-medium bg-[#EFEEEA] text-[#16141A] border border-[#16141A]/15 rounded-sm hover:border-[#C21E3C] transition-colors"
                    >
                      <span>{chip.label}</span>
                      <X className="w-3.5 h-3.5 text-[#B01D39]" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-[#B01D39] hover:underline px-2 min-h-[36px]"
                  >
                    پاک کردن همه
                  </button>
                </div>
              )}
            </div>

            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6" aria-label="در حال بارگذاری محصولات">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#16141A]/[0.08] rounded-sm overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[4/5] w-full skeleton-shimmer" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 w-1/2 skeleton-shimmer rounded-sm" />
                      <div className="h-4 w-5/6 skeleton-shimmer rounded-sm" />
                      <div className="h-9 w-full skeleton-shimmer rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border border-[#16141A]/[0.08] rounded-sm py-16 px-6 text-center space-y-5">
                <div className="arch-frame w-28 h-36 mx-auto bg-[#E2E0DB] border border-[#16141A]/10 flex items-center justify-center">
                  <Footprints className="w-10 h-10 text-[#16141A]/35" strokeWidth={1.25} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base sm:text-lg font-semibold text-[#16141A]">
                    {onlyDiscounted
                      ? 'فعلاً تخفیفی فعال نیست؛ به‌زودی برمی‌گردیم'
                      : 'کفشی با این مشخصات پیدا نشد'}
                  </p>
                  <p className="text-xs sm:text-sm text-[#6A6670] max-w-md mx-auto">
                    {onlyDiscounted
                      ? 'می‌توانید کلکسیون اصلی کفش‌ها و کتونی‌های آدونیس را مشاهده کنید.'
                      : 'عبارت جستجو، برند، سایز یا محدوده قیمت را تغییر دهید.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-semibold bg-[#C21E3C] text-white rounded-sm hover:bg-[#16141A] transition-colors"
                >
                  نمایش همه کفش‌ها
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {filteredProducts.map((product, idx) => (
                  <RevealCard key={product.id} index={idx}>
                    <ProductCard
                      product={product}
                      category={product.categoryId ? categoryMap.get(product.categoryId) : undefined}
                      preferredSize={selectedSize}
                      onNavigate={onNavigate}
                      onQuickAdd={handleQuickAdd}
                    />
                  </RevealCard>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
