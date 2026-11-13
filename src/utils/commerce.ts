export interface CartItemInput {
  productId: number;
  name: string;
  price: number;
  discountPrice: number | null;
  quantity: number;
  stock: number;
  selectedSize: string;
  selectedColor: string;
  image: string;
}

export interface ProductFilterItem {
  id: number;
  categoryId: number | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  stock: number;
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

export interface FilterCriteria {
  search?: string;
  categoryId?: number | null;
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
  const query = (criteria.search ?? '').trim().toLowerCase();

  const filtered = products.filter((item) => {
    if (!item.isActive) return false;
    if (criteria.categoryId && item.categoryId !== criteria.categoryId) return false;
    if (criteria.onlyInStock && item.stock <= 0) return false;

    const effective = getEffectivePrice(item.price, item.discountPrice);
    if (criteria.onlyDiscounted && effective >= item.price) return false;
    if (criteria.minPrice !== null && criteria.minPrice !== undefined && effective < criteria.minPrice) {
      return false;
    }
    if (criteria.maxPrice !== null && criteria.maxPrice !== undefined && effective > criteria.maxPrice) {
      return false;
    }

    if (query) {
      const hay = `${item.name} ${item.description}`.toLowerCase();
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
