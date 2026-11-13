import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import {
  filterAndSortProducts,
  formatToman,
  type ProductSortOption,
} from '../utils/commerce';
import type { Product } from '../types/store';

interface ShopPageProps {
  queryString: string;
  onNavigate: (path: string) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({ queryString, onNavigate }) => {
  const { products, categories, addToCart } = useStore();

  const urlParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const [search, setSearch] = useState(urlParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(() => {
    const c = Number(urlParams.get('category'));
    return Number.isInteger(c) && c > 0 ? c : null;
  });
  const [onlyDiscounted, setOnlyDiscounted] = useState(urlParams.get('discount') === '1');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<ProductSortOption>(
    (urlParams.get('sort') as ProductSortOption) || 'newest'
  );

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    setSearch(params.get('q') || '');
    const c = Number(params.get('category'));
    setSelectedCategory(Number.isInteger(c) && c > 0 ? c : null);
    setOnlyDiscounted(params.get('discount') === '1');
    const s = params.get('sort') as ProductSortOption | null;
    if (s) setSort(s);
  }, [queryString]);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filteredProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        search,
        categoryId: selectedCategory,
        onlyDiscounted,
        onlyInStock,
        maxPrice,
        sort,
      }),
    [products, search, selectedCategory, onlyDiscounted, onlyInStock, maxPrice, sort]
  );

  const handleQuickAdd = (product: Product) => {
    if (product.stock <= 0) return;
    addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] || '',
      price: product.price,
      discountPrice: product.discountPrice,
      selectedSize: product.sizes[0] || 'Free Size',
      selectedColor: product.colors[0]?.name || 'استاندارد',
      quantity: 1,
      maxStock: product.stock,
    });
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setOnlyDiscounted(false);
    setOnlyInStock(false);
    setMaxPrice(null);
    setSort('newest');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/[0.08] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#18181B]">فروشگاه پوشاک ورا</h1>
          <p className="text-xs sm:text-sm text-[#6B665F] mt-1 tabular-nums">
            نمایش {new Intl.NumberFormat('fa-IR').format(filteredProducts.length)} محصول
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B665F] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="shop-search-input" className="sr-only">
              جستجو در فروشگاه
            </label>
            <input
              id="shop-search-input"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی محصول..."
              className="w-full sm:w-64 h-10 ps-9 pe-3 text-sm bg-white border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="shop-sort-select" className="text-xs text-[#6B665F] whitespace-nowrap">
              مرتب‌سازی:
            </label>
            <select
              id="shop-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as ProductSortOption)}
              className="h-10 px-3 text-xs sm:text-sm bg-white border border-black/15 rounded-md focus:outline-none focus:border-[#18181B]"
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

      {/* Filter Bar */}
      <div className="bg-white border border-black/[0.06] rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#524E48] me-2">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            دسته‌بندی:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedCategory === null
                ? 'bg-[#18181B] text-white'
                : 'bg-[#FAF7F2] text-[#524E48] hover:text-[#18181B]'
            }`}
          >
            همه
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-[#18181B] text-white'
                  : 'bg-[#FAF7F2] text-[#524E48] hover:text-[#18181B]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-black/[0.05]">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyDiscounted}
                onChange={(e) => setOnlyDiscounted(e.target.checked)}
                className="accent-[#18181B] w-4 h-4"
              />
              <span>فقط تخفیف‌دار</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="accent-[#18181B] w-4 h-4"
              />
              <span>فقط کالاهای موجود</span>
            </label>

            <div className="flex items-center gap-2">
              <label htmlFor="max-price-range" className="text-[#524E48]">
                سقف قیمت:
              </label>
              <select
                id="max-price-range"
                value={maxPrice ?? ''}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                className="h-8 px-2 bg-[#FAF7F2] border border-black/15 rounded text-xs"
              >
                <option value="">همه قیمت‌ها</option>
                <option value="3500000">تا {formatToman(3500000)}</option>
                <option value="5000000">تا {formatToman(5000000)}</option>
                <option value="7500000">تا {formatToman(7500000)}</option>
                <option value="10000000">تا {formatToman(10000000)}</option>
              </select>
            </div>
          </div>

          {(search || selectedCategory || onlyDiscounted || onlyInStock || maxPrice) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-[#8F6E38] hover:text-[#18181B] font-medium"
            >
              <X className="w-3.5 h-3.5" />
              پاک کردن فیلترها
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-black/[0.06] rounded-lg py-16 px-4 text-center space-y-3">
          <p className="text-base font-medium text-[#18181B]">محصولی با فیلترهای انتخابی یافت نشد.</p>
          <p className="text-xs text-[#6B665F]">عبارت جستجو یا محدوده قیمت را تغییر دهید.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 text-xs font-medium bg-[#18181B] text-white rounded-md"
          >
            نمایش همه محصولات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              category={product.categoryId ? categoryMap.get(product.categoryId) : undefined}
              onNavigate={onNavigate}
              onQuickAdd={handleQuickAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
};
