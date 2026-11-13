import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountPercent,
  calculateOrderTotals,
  decrementSizeInventory,
  filterAndSortProducts,
  getAvailableSizes,
  getEffectivePrice,
  getSizeStock,
  getTotalStockFromSizes,
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
  assert.equal(getEffectivePrice(6500000, 5200000), 5200000);
  assert.equal(getEffectivePrice(6500000, null), 6500000);
  assert.equal(calculateDiscountPercent(6500000, 5200000), 20);
  assert.equal(calculateDiscountPercent(6500000, 7000000), 0);
});

test('per-size shoe inventory tracks independent sizes and prevents overselling', () => {
  const sizeInventory = [
    { size: '40', stock: 2 },
    { size: '41', stock: 0 },
    { size: '42', stock: 1 },
  ];

  assert.equal(getTotalStockFromSizes(sizeInventory), 3);
  assert.equal(getSizeStock({ sizeInventory, stock: 3 }, '41'), 0);
  assert.deepEqual(getAvailableSizes({ sizeInventory, sizes: ['40', '41', '42'] }), ['40', '42']);

  const firstOrder = decrementSizeInventory(sizeInventory, '42', 1);
  assert.equal(firstOrder.nextTotalStock, 2);
  assert.equal(getSizeStock({ sizeInventory: firstOrder.nextSizeInventory, stock: firstOrder.nextTotalStock }, '42'), 0);

  // Concurrent second order for size 42 must fail cleanly
  assert.throws(() => decrementSizeInventory(firstOrder.nextSizeInventory, '42', 1), /موجودی سایز 42 کافی نیست/);
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

test('filterAndSortProducts filters by brand, shoe size stock, color, price, and sorts', () => {
  const sample = [
    {
      id: 1,
      categoryId: 10,
      name: 'کتونی چرم کرم کورت',
      slug: 'court-cream',
      brand: 'VERA Studio',
      model: 'Court 01',
      upperMaterial: 'چرم طبیعی',
      soleMaterial: 'لاستیک طبیعی',
      description: 'کتونی روزمره',
      price: 6200000,
      discountPrice: 5200000,
      stock: 4,
      sizes: ['41', '42'],
      sizeInventory: [
        { size: '41', stock: 4 },
        { size: '42', stock: 0 },
      ],
      colors: [{ name: 'کرم', hex: '#EDE4D3' }],
      isNew: true,
      isBestseller: false,
      isFeatured: true,
      isActive: true,
    },
    {
      id: 2,
      categoryId: 20,
      name: 'کتونی رانینگ زغالی',
      slug: 'runner-charcoal',
      brand: 'Nike',
      model: 'Pegasus Trail',
      upperMaterial: 'مش تنفس‌پذیر',
      soleMaterial: 'فوم EVA',
      description: 'کفش دویدن',
      price: 7800000,
      discountPrice: null,
      stock: 3,
      sizes: ['42', '43'],
      sizeInventory: [
        { size: '42', stock: 2 },
        { size: '43', stock: 1 },
      ],
      colors: [{ name: 'زغالی', hex: '#2A2B2E' }],
      isNew: false,
      isBestseller: true,
      isFeatured: true,
      isActive: true,
    },
  ];

  const size42 = filterAndSortProducts(sample, { size: '42' });
  assert.equal(size42.length, 1);
  assert.equal(size42[0].id, 2);

  const byBrand = filterAndSortProducts(sample, { brand: 'VERA Studio', color: 'کرم' });
  assert.equal(byBrand.length, 1);
  assert.equal(byBrand[0].id, 1);
});
