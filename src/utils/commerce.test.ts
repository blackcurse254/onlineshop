import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountPercent,
  calculateOrderTotals,
  filterAndSortProducts,
  getEffectivePrice,
  normalizeDigits,
  validateIranianPhone,
  validateIranianPostalCode,
} from './commerce';

test('normalizeDigits converts Persian and Arabic digits to Latin', () => {
  assert.equal(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
  assert.equal(normalizeDigits('١٢٣٤٥٦٧٨٩٠'), '1234567890');
});

test('validateIranianPhone and validateIranianPostalCode enforce strict format', () => {
  assert.equal(validateIranianPhone('۰۹۱۲۱۱۱۲۲۳۳'), true);
  assert.equal(validateIranianPhone('09121112233'), true);
  assert.equal(validateIranianPhone('02188451290'), false);
  assert.equal(validateIranianPostalCode('۱۹۶۸۷۳۴۵۱۱'), true);
  assert.equal(validateIranianPostalCode('12345'), false);
});

test('effective price and discount percentage calculate accurately', () => {
  assert.equal(getEffectivePrice(2000000, 1500000), 1500000);
  assert.equal(getEffectivePrice(2000000, null), 2000000);
  assert.equal(calculateDiscountPercent(2000000, 1500000), 25);
  assert.equal(calculateDiscountPercent(2000000, 2500000), 0);
});

test('calculateOrderTotals applies discount, shipping threshold, and express shipping', () => {
  const standardFree = calculateOrderTotals({
    items: [{ price: 5000000, discountPrice: null, quantity: 1 }],
    shippingMethod: 'standard',
    standardShippingCost: 85000,
    expressShippingCost: 165000,
    freeShippingThreshold: 4500000,
    discountPercent: 10,
    discountMinOrder: 1000000,
  });

  assert.equal(standardFree.subtotal, 5000000);
  assert.equal(standardFree.discountAmount, 500000);
  assert.equal(standardFree.qualifiesForFreeShipping, true);
  assert.equal(standardFree.shippingCost, 0);
  assert.equal(standardFree.totalAmount, 4500000);

  const expressPaid = calculateOrderTotals({
    items: [{ price: 3000000, discountPrice: 2400000, quantity: 1 }],
    shippingMethod: 'express',
    standardShippingCost: 85000,
    expressShippingCost: 165000,
    freeShippingThreshold: 4500000,
  });

  assert.equal(expressPaid.subtotal, 2400000);
  assert.equal(expressPaid.shippingCost, 165000);
  assert.equal(expressPaid.totalAmount, 2565000);
});

test('filterAndSortProducts filters by category, price, discount, and sorts properly', () => {
  const sample = [
    {
      id: 1,
      categoryId: 10,
      name: 'پالتو کشمیر کرم',
      slug: 'coat-1',
      description: 'پالتو پاییزه لوکس',
      price: 6000000,
      discountPrice: 4800000,
      stock: 5,
      isNew: true,
      isBestseller: false,
      isFeatured: true,
      isActive: true,
    },
    {
      id: 2,
      categoryId: 20,
      name: 'بلوز ابریشم سفید',
      slug: 'blouse-2',
      description: 'دوخت ظریف',
      price: 2500000,
      discountPrice: null,
      stock: 0,
      isNew: false,
      isBestseller: true,
      isFeatured: false,
      isActive: true,
    },
    {
      id: 3,
      categoryId: 10,
      name: 'کت بلیزر زغالی',
      slug: 'blazer-3',
      description: 'مدل رسمی',
      price: 4000000,
      discountPrice: null,
      stock: 4,
      isNew: false,
      isBestseller: true,
      isFeatured: true,
      isActive: true,
    },
  ];

  const filtered = filterAndSortProducts(sample, {
    categoryId: 10,
    onlyInStock: true,
    sort: 'price-asc',
  });

  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].id, 3);
  assert.equal(filtered[1].id, 1);

  const discountedOnly = filterAndSortProducts(sample, { onlyDiscounted: true });
  assert.equal(discountedOnly.length, 1);
  assert.equal(discountedOnly[0].id, 1);
});
