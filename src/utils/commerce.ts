export interface ProductSizeStockInput {
  size: string;
  stock: number;
}

export interface ProductColorInput {
  name: string;
  hex: string;
}

export interface ProductFilterItem {
  id: number;
  categoryId: number | null;
  name: string;
  slug: string;
  brand: string;
  model: string;
  upperMaterial: string;
  soleMaterial: string;
  description: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  sizes: string[];
  sizeInventory: ProductSizeStockInput[];
  colors: ProductColorInput[];
  isNew: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  isActive: boolean;
  createdAt?: string | Date;
}

export type ProductSortOption = 'newest' | 'price-asc' | 'price-desc' | 'bestseller' | 'discount';

export function normalizeDigits(input: string): string {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return input
    .replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)))
    .trim();
}

export function formatToman(amount: number): string {
  const safe = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return `${new Intl.NumberFormat('fa-IR').format(safe)} تومان`;
}

export function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value);
}

export function getEffectivePrice(price: number, discountPrice: number | null): number {
  if (discountPrice !== null && discountPrice > 0 && discountPrice < price) {
    return discountPrice;
  }
  return price;
}

export function calculateDiscountPercent(price: number, discountPrice: number | null): number {
  if (!discountPrice || discountPrice <= 0 || discountPrice >= price || price <= 0) {
    return 0;
  }
  return Math.round(((price - discountPrice) / price) * 100);
}

export function getTotalStockFromSizes(sizeInventory: ProductSizeStockInput[]): number {
  if (!Array.isArray(sizeInventory) || sizeInventory.length === 0) return 0;
  return sizeInventory.reduce((sum, entry) => {
    const s = Number.isFinite(entry.stock) ? Math.max(0, Math.floor(entry.stock)) : 0;
    return sum + s;
  }, 0);
}

export function getEffectiveTotalStock(
  product: Pick<ProductFilterItem, 'sizeInventory'>
): number {
  return getTotalStockFromSizes(product.sizeInventory ?? []);
}

export function getSizeStock(
  product: Pick<ProductFilterItem, 'sizeInventory'>,
  size: string
): number {
  if (!Array.isArray(product.sizeInventory) || product.sizeInventory.length === 0) {
    // Never repeat aggregate stock across sizes when sizeInventory is absent
    return 0;
  }
  const match = product.sizeInventory.find((s) => s.size === size);
  if (!match || !Number.isFinite(match.stock)) return 0;
  return Math.max(0, Math.floor(match.stock));
}

export function getAvailableSizes(product: Pick<ProductFilterItem, 'sizeInventory'>): string[] {
  if (!Array.isArray(product.sizeInventory) || product.sizeInventory.length === 0) {
    return [];
  }
  return product.sizeInventory.filter((s) => Number.isFinite(s.stock) && s.stock > 0).map((s) => s.size);
}

export function normalizeSizeInventory(entries: ProductSizeStockInput[]): ProductSizeStockInput[] {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('حداقل یک سایز معتبر با موجودی مستقل تعریف کنید.');
  }
  const seen = new Set<string>();
  const normalized: ProductSizeStockInput[] = [];
  for (const entry of entries) {
    const size = String(entry.size ?? '').trim();
    if (!size) {
      throw new Error('نام سایز نمی‌تواند خالی باشد.');
    }
    if (seen.has(size)) {
      throw new Error(`سایز «${size}» تکراری است.`);
    }
    if (!Number.isInteger(entry.stock) || entry.stock < 0) {
      throw new Error(`موجودی سایز «${size}» باید عدد صحیح و غیرمنفی باشد.`);
    }
    seen.add(size);
    normalized.push({ size, stock: entry.stock });
  }
  return normalized;
}

export function migrateLegacySizeInventory(
  sizes: string[],
  legacyStock: number
): ProductSizeStockInput[] {
  const uniqueSizes: string[] = [];
  const seen = new Set<string>();
  for (const raw of sizes ?? []) {
    const clean = String(raw ?? '').trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      uniqueSizes.push(clean);
    }
  }
  if (uniqueSizes.length === 0) {
    return [];
  }
  const safeTotal = Number.isFinite(legacyStock) ? Math.max(0, Math.floor(legacyStock)) : 0;
  if (safeTotal === 0) {
    return uniqueSizes.map((size) => ({ size, stock: 0 }));
  }
  // Conserve total legacy stock without repeating it across every size
  const base = Math.floor(safeTotal / uniqueSizes.length);
  const remainder = safeTotal % uniqueSizes.length;
  return uniqueSizes.map((size, idx) => ({
    size,
    stock: base + (idx < remainder ? 1 : 0),
  }));
}

export function decrementSizeInventory(
  sizeInventory: ProductSizeStockInput[],
  size: string,
  quantity: number
): { nextSizeInventory: ProductSizeStockInput[]; nextTotalStock: number } {
  if (!Array.isArray(sizeInventory) || sizeInventory.length === 0) {
    throw new Error('موجودی سایزهای این کفش هنوز پیکربندی نشده است.');
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('تعداد سفارش باید عدد صحیح و بزرگ‌تر از صفر باشد.');
  }
  const idx = sizeInventory.findIndex((entry) => entry.size === size);
  if (idx === -1) {
    throw new Error(`سایز ${size} برای این کفش تعریف نشده است.`);
  }
  const currentStock = sizeInventory[idx].stock;
  if (!Number.isInteger(currentStock) || currentStock < 0) {
    throw new Error(`موجودی ثبت‌شده برای سایز ${size} نامعتبر است.`);
  }
  if (currentStock < quantity) {
    throw new Error(`موجودی سایز ${size} کافی نیست (موجودی فعلی: ${currentStock} جفت).`);
  }
  const nextSizeInventory = sizeInventory.map((entry, i) =>
    i === idx ? { size: entry.size, stock: entry.stock - quantity } : { size: entry.size, stock: Math.max(0, Math.floor(entry.stock)) }
  );
  return {
    nextSizeInventory,
    nextTotalStock: getTotalStockFromSizes(nextSizeInventory),
  };
}

export function validateIranianPhone(phone: string): boolean {
  const normalized = normalizeDigits(phone).replace(/[\s-]/g, '');
  return /^09\d{9}$/.test(normalized);
}

export function validateIranianPostalCode(code: string): boolean {
  const normalized = normalizeDigits(code).replace(/[\s-]/g, '');
  return /^\d{10}$/.test(normalized);
}

export interface OrderCalculationInput {
  items: Array<{
    price: number;
    discountPrice: number | null;
    quantity: number;
  }>;
  shippingMethod: 'standard' | 'express';
  standardShippingCost: number;
  expressShippingCost: number;
  freeShippingThreshold: number;
  discountPercent?: number;
  discountMinOrder?: number;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  qualifiesForFreeShipping: boolean;
}

export function calculateOrderTotals(input: OrderCalculationInput): OrderTotals {
  const subtotal = input.items.reduce((sum, item) => {
    const qty = Math.max(0, Math.floor(item.quantity));
    const unit = getEffectivePrice(item.price, item.discountPrice);
    return sum + unit * qty;
  }, 0);

  let discountAmount = 0;
  if (
    input.discountPercent &&
    input.discountPercent > 0 &&
    input.discountPercent <= 90 &&
    subtotal >= (input.discountMinOrder ?? 0)
  ) {
    discountAmount = Math.round((subtotal * input.discountPercent) / 100);
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const qualifiesForFreeShipping =
    input.shippingMethod === 'standard' &&
    subtotal > 0 &&
    afterDiscount >= input.freeShippingThreshold;

  const shippingCost =
    subtotal === 0
      ? 0
      : input.shippingMethod === 'express'
        ? input.expressShippingCost
        : qualifiesForFreeShipping
          ? 0
          : input.standardShippingCost;

  return {
    subtotal,
    discountAmount,
    shippingCost,
    totalAmount: afterDiscount + shippingCost,
    qualifiesForFreeShipping,
  };
}

export interface DeduplicatedColorSwatch {
  name: string;
  hex: string;
  normalizedHex: string;
  names: string[];
}

export function normalizeHexColor(hex: string): string {
  return hex.trim().toLowerCase();
}

export function deduplicateColorSwatches(
  products: ReadonlyArray<Pick<ProductFilterItem, 'colors'>>
): DeduplicatedColorSwatch[] {
  const byHex = new Map<string, DeduplicatedColorSwatch>();
  for (const product of products) {
    for (const color of product.colors ?? []) {
      const normalizedHex = normalizeHexColor(color.hex ?? '');
      const cleanName = String(color.name ?? '').trim();
      if (!normalizedHex || !cleanName) continue;
      const existing = byHex.get(normalizedHex);
      if (!existing) {
        byHex.set(normalizedHex, {
          name: cleanName,
          hex: color.hex.trim(),
          normalizedHex,
          names: [cleanName],
        });
      } else if (!existing.names.includes(cleanName)) {
        existing.names.push(cleanName);
      }
    }
  }
  return Array.from(byHex.values());
}

export interface FilterCriteria {
  search?: string;
  categoryId?: number | null;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  colorHex?: string | null;
  onlyDiscounted?: boolean;
  onlyInStock?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: ProductSortOption;
}

export function filterAndSortProducts<T extends ProductFilterItem>(
  products: T[],
  criteria: FilterCriteria
): T[] {
  const query = normalizeDigits(criteria.search ?? '').toLowerCase();

  const filtered = products.filter((item) => {
    if (!item.isActive) return false;
    if (criteria.categoryId && item.categoryId !== criteria.categoryId) return false;
    if (criteria.brand && item.brand !== criteria.brand) return false;

    const totalStock = getEffectiveTotalStock(item);

    if (criteria.onlyInStock && totalStock <= 0) return false;

    if (criteria.size) {
      const sizeCount = getSizeStock(item, criteria.size);
      if (sizeCount <= 0) return false;
    }

    if (criteria.color || criteria.colorHex) {
      const targetHex = criteria.colorHex ? normalizeHexColor(criteria.colorHex) : '';
      const hasColor = item.colors.some(
        (c) =>
          (criteria.color && c.name === criteria.color) ||
          (targetHex && normalizeHexColor(c.hex) === targetHex)
      );
      if (!hasColor) return false;
    }

    const effective = getEffectivePrice(item.price, item.discountPrice);
    if (criteria.onlyDiscounted && effective >= item.price) return false;
    if (criteria.minPrice !== null && criteria.minPrice !== undefined && effective < criteria.minPrice) {
      return false;
    }
    if (criteria.maxPrice !== null && criteria.maxPrice !== undefined && effective > criteria.maxPrice) {
      return false;
    }

    if (query) {
      const hay = `${item.name} ${item.brand} ${item.model} ${item.upperMaterial} ${item.soleMaterial} ${item.description}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }

    return true;
  });

  const sorted = [...filtered];
  switch (criteria.sort) {
    case 'price-asc':
      sorted.sort((a, b) => getEffectivePrice(a.price, a.discountPrice) - getEffectivePrice(b.price, b.discountPrice));
      break;
    case 'price-desc':
      sorted.sort((a, b) => getEffectivePrice(b.price, b.discountPrice) - getEffectivePrice(a.price, a.discountPrice));
      break;
    case 'bestseller':
      sorted.sort((a, b) => Number(b.isBestseller) - Number(a.isBestseller) || b.id - a.id);
      break;
    case 'discount':
      sorted.sort(
        (a, b) =>
          calculateDiscountPercent(b.price, b.discountPrice) -
          calculateDiscountPercent(a.price, a.discountPrice)
      );
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.id - a.id);
      break;
  }

  return sorted;
}

export function getOrderStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'ثبت اولیه';
    case 'processing':
      return 'در حال آماده‌سازی';
    case 'shipped':
      return 'تحویل به پیک / پست';
    case 'delivered':
      return 'تحویل شده';
    case 'cancelled':
      return 'لغو شده';
    default:
      return 'نامشخص';
  }
}

export const SHOE_SIZE_GUIDE = [
  { eu: '37', cm: '23.5', uk: '4', usWomen: '6.5', usMen: '5' },
  { eu: '38', cm: '24.1', uk: '5', usWomen: '7.5', usMen: '5.5' },
  { eu: '39', cm: '24.8', uk: '5.5', usWomen: '8', usMen: '6.5' },
  { eu: '40', cm: '25.4', uk: '6.5', usWomen: '9', usMen: '7' },
  { eu: '41', cm: '26.0', uk: '7', usWomen: '9.5', usMen: '8' },
  { eu: '42', cm: '26.7', uk: '8', usWomen: '10.5', usMen: '8.5' },
  { eu: '43', cm: '27.3', uk: '9', usWomen: '—', usMen: '9.5' },
  { eu: '44', cm: '28.0', uk: '9.5', usWomen: '—', usMen: '10.5' },
  { eu: '45', cm: '28.6', uk: '10.5', usWomen: '—', usMen: '11.5' },
];
