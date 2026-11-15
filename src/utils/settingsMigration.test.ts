import assert from 'node:assert/strict';
import test from 'node:test';
import type { StoreSettingsSnapshotData } from '../db/schema.ts';
import {
  ADONIS_V2_PALETTE,
  ADONIS_V4_PALETTE,
  extractSettingsSnapshot,
  isKnownDemoContactValue,
  planOrderNumberMigration,
  planPaletteV2Migration,
  planPaletteV4Migration,
  planProductSlugMigration,
  planStoreSettingsMigration,
} from './settingsMigration.ts';

function makeBaseSettings(overrides: Partial<StoreSettingsSnapshotData> = {}): StoreSettingsSnapshotData {
  return {
    storeName: 'ADONIS',
    storeSubtitle: 'فروشگاه تخصصی کفش و کتونی',
    logoText: 'ADONIS',
    logoUrl: '',
    primaryColor: '#18181B',
    accentColor: '#B5945B',
    backgroundColor: '#FAF7F2',
    phone: '',
    email: '',
    instagram: '',
    telegram: '',
    whatsapp: '',
    address: '',
    shippingBaseCost: 85000,
    expressShippingCost: 165000,
    freeShippingThreshold: 4500000,
    aboutText: 'فروشگاه تخصصی کفش و کتونی ADONIS',
    shippingPolicy: 'ارسال با جعبه اصلی',
    returnPolicy: '۷ روز تعویض سایز',
    announcementText: 'ارسال رایگان بالای ۴,۵۰۰,۰۰۰ تومان',
    ...overrides,
  };
}

test('planStoreSettingsMigration cleans legacy VERA branding and demo contacts while keeping reversible snapshot', () => {
  const legacy = makeBaseSettings({
    storeName: 'VERA BOUTIQUE',
    logoText: 'VERA',
    phone: '021-88451290',
    email: 'hello@verashoes.ir',
    instagram: '@vera.shoes.ir',
    telegram: '@verashoes_support',
    whatsapp: '09120004512',
    address: 'تهران، جردن، بلوار ناهید شرقی، پلاک ۱۸، طبقه اول',
    aboutText: 'فروشگاه VERA BOUTIQUE ارائه‌دهنده کفش چرم',
    announcementText: 'کد تخفیف VERA15 فعال شد',
  });

  const plan = planStoreSettingsMigration(legacy);
  assert.equal(plan.hasChanges, true);
  assert.equal(plan.nextSnapshot.storeName, 'ADONIS');
  assert.equal(plan.nextSnapshot.logoText, 'ADONIS');
  assert.equal(plan.nextSnapshot.phone, '');
  assert.equal(plan.nextSnapshot.email, '');
  assert.equal(plan.nextSnapshot.instagram, '');
  assert.equal(plan.nextSnapshot.telegram, '');
  assert.equal(plan.nextSnapshot.whatsapp, '');
  assert.equal(plan.nextSnapshot.address, '');
  assert.ok(plan.nextSnapshot.aboutText.includes('ADONIS'));
  assert.ok(!plan.nextSnapshot.aboutText.includes('VERA'));
  assert.ok(plan.nextSnapshot.announcementText.includes('ADONIS15'));

  // Previous snapshot retains exact original values for rollback
  assert.equal(plan.previousSnapshot.storeName, 'VERA BOUTIQUE');
  assert.equal(plan.previousSnapshot.phone, '021-88451290');
  assert.equal(plan.previousSnapshot.address, 'تهران، جردن، بلوار ناهید شرقی، پلاک ۱۸، طبقه اول');
});

test('planStoreSettingsMigration NEVER deletes real or owner-configured contact data', () => {
  const realOwnerSettings = makeBaseSettings({
    storeName: 'VERA BOUTIQUE',
    logoText: 'ADONIS',
    phone: '021-44556677',
    email: 'support@adonisshoes.ir',
    instagram: '@adonis.official',
    address: 'تهران، خیابان شریعتی، پلاک ۲۱۰',
  });

  const plan = planStoreSettingsMigration(realOwnerSettings);
  assert.equal(plan.nextSnapshot.storeName, 'ADONIS');
  assert.equal(plan.nextSnapshot.phone, '021-44556677');
  assert.equal(plan.nextSnapshot.email, 'support@adonisshoes.ir');
  assert.equal(plan.nextSnapshot.instagram, '@adonis.official');
  assert.equal(plan.nextSnapshot.address, 'تهران، خیابان شریعتی، پلاک ۲۱۰');
  assert.deepEqual(plan.preservedCustomFields, ['phone', 'email', 'instagram', 'address']);
});

test('isKnownDemoContactValue recognizes only known demo entries', () => {
  assert.equal(isKnownDemoContactValue('phone', '021-88451290'), true);
  assert.equal(isKnownDemoContactValue('phone', '021-77889900'), false);
  assert.equal(isKnownDemoContactValue('email', 'HELLO@VERASHOES.IR'), true);
  assert.equal(isKnownDemoContactValue('email', 'owner@realstore.ir'), false);
});

test('extractSettingsSnapshot returns clean copy without mutating source', () => {
  const src = makeBaseSettings({ phone: '021-12345678' });
  const snap = extractSettingsSnapshot(src);
  snap.phone = '';
  assert.equal(src.phone, '021-12345678');
});

test('planPaletteV2Migration upgrades legacy default colors while keeping previous snapshot', () => {
  const legacy = makeBaseSettings();
  const plan = planPaletteV2Migration(legacy);
  assert.equal(plan.hasChanges, true);
  assert.equal(plan.nextSnapshot.primaryColor, ADONIS_V2_PALETTE.primaryColor);
  assert.equal(plan.nextSnapshot.accentColor, ADONIS_V2_PALETTE.accentColor);
  assert.equal(plan.nextSnapshot.backgroundColor, ADONIS_V2_PALETTE.backgroundColor);
  assert.equal(plan.previousSnapshot.primaryColor, '#18181B');
  assert.equal(plan.previousSnapshot.accentColor, '#B5945B');
  assert.equal(plan.previousSnapshot.backgroundColor, '#FAF7F2');
});

test('planPaletteV2Migration preserves custom owner-configured palette colors', () => {
  const custom = makeBaseSettings({
    primaryColor: '#1E293B',
    accentColor: '#DC2626',
  });
  const plan = planPaletteV2Migration(custom);
  assert.equal(plan.hasChanges, true);
  assert.equal(plan.nextSnapshot.primaryColor, '#1E293B');
  assert.equal(plan.nextSnapshot.accentColor, '#DC2626');
  assert.equal(plan.nextSnapshot.backgroundColor, ADONIS_V2_PALETTE.backgroundColor);
  assert.deepEqual(plan.preservedCustomFields, ['primaryColor', 'accentColor']);
});

test('planProductSlugMigration renames vera- slugs to adonis- and skips collisions idempotently', () => {
  const rows = [
    { id: 1, slug: 'vera-court-leather-mens-sneaker' },
    { id: 2, slug: 'nike-pegasus-pro-charcoal-sport' },
    { id: 3, slug: 'vera-cedar-shoe-care-kit' },
    { id: 4, slug: 'adonis-cedar-shoe-care-kit' },
    { id: 5, slug: 'vera-milano-ivory-womens-sneaker' },
  ];

  const firstRun = planProductSlugMigration(rows);
  assert.deepEqual(firstRun.updates, [
    {
      id: 1,
      fromSlug: 'vera-court-leather-mens-sneaker',
      toSlug: 'adonis-court-leather-mens-sneaker',
    },
    {
      id: 5,
      fromSlug: 'vera-milano-ivory-womens-sneaker',
      toSlug: 'adonis-milano-ivory-womens-sneaker',
    },
  ]);
  assert.deepEqual(firstRun.skipped, [
    {
      id: 3,
      slug: 'vera-cedar-shoe-care-kit',
      conflictingSlug: 'adonis-cedar-shoe-care-kit',
    },
  ]);

  // Simulate persisted rows after first run and re-run to confirm idempotency
  const updatedMap = new Map(firstRun.updates.map((u) => [u.id, u.toSlug]));
  const rowsAfter = rows.map((r) => ({ ...r, slug: updatedMap.get(r.id) ?? r.slug }));
  const secondRun = planProductSlugMigration(rowsAfter);
  assert.equal(secondRun.updates.length, 0);
  assert.equal(secondRun.skipped.length, 1);
});

test('planOrderNumberMigration renames VERA- order numbers to ADONIS- and skips collisions idempotently', () => {
  const rows = [
    { id: 1, orderNumber: 'VERA-1042' },
    { id: 2, orderNumber: 'ADONIS-250101-AB12CD' },
    { id: 3, orderNumber: 'VERA-894357' },
    { id: 4, orderNumber: 'ADONIS-894357' },
    { id: 5, orderNumber: 'VERA-1043' },
  ];

  const firstRun = planOrderNumberMigration(rows);
  assert.deepEqual(firstRun.updates, [
    { id: 1, fromOrderNumber: 'VERA-1042', toOrderNumber: 'ADONIS-1042' },
    { id: 5, fromOrderNumber: 'VERA-1043', toOrderNumber: 'ADONIS-1043' },
  ]);
  assert.deepEqual(firstRun.skipped, [
    {
      id: 3,
      orderNumber: 'VERA-894357',
      conflictingOrderNumber: 'ADONIS-894357',
    },
  ]);

  const updatedMap = new Map(firstRun.updates.map((u) => [u.id, u.toOrderNumber]));
  const rowsAfter = rows.map((r) => ({
    ...r,
    orderNumber: updatedMap.get(r.id) ?? r.orderNumber,
  }));
  const secondRun = planOrderNumberMigration(rowsAfter);
  assert.equal(secondRun.updates.length, 0);
  assert.equal(secondRun.skipped.length, 1);
});

test('planPaletteV4Migration upgrades old ink/plum/charcoal and red accent to emerald agate without touching other settings', () => {
  const prevV3 = makeBaseSettings({
    primaryColor: '#16141A',
    accentColor: '#C21E3C',
    backgroundColor: '#EFEEEA',
    storeName: 'ADONIS',
    phone: '021-44556677',
  });

  const plan = planPaletteV4Migration(prevV3);
  assert.equal(plan.hasChanges, true);
  assert.equal(plan.nextSnapshot.primaryColor, ADONIS_V4_PALETTE.primaryColor);
  assert.equal(plan.nextSnapshot.accentColor, ADONIS_V4_PALETTE.accentColor);
  assert.equal(plan.nextSnapshot.backgroundColor, '#EFEEEA');
  assert.equal(plan.nextSnapshot.phone, '021-44556677');
  assert.equal(plan.nextSnapshot.storeName, 'ADONIS');

  // Plum/charcoal primary maps to #0B1F2E
  const plumPrimary = makeBaseSettings({
    primaryColor: '#2B1A2E',
    accentColor: '#C21E3C',
    backgroundColor: '#E8E7E2',
  });
  const plumPlan = planPaletteV4Migration(plumPrimary);
  assert.equal(plumPlan.nextSnapshot.primaryColor, '#0B1F2E');
  assert.equal(plumPlan.nextSnapshot.accentColor, '#0B7A5F');
  assert.equal(plumPlan.nextSnapshot.backgroundColor, '#E8E7E2');

  // Idempotent on second run
  const secondRun = planPaletteV4Migration(plan.nextSnapshot);
  assert.equal(secondRun.hasChanges, false);
});

test('planPaletteV4Migration preserves custom owner-configured colors', () => {
  const custom = makeBaseSettings({
    primaryColor: '#1E293B',
    accentColor: '#2563EB',
    backgroundColor: '#F5F5F4',
  });
  const plan = planPaletteV4Migration(custom);
  assert.equal(plan.hasChanges, false);
  assert.equal(plan.nextSnapshot.primaryColor, '#1E293B');
  assert.equal(plan.nextSnapshot.accentColor, '#2563EB');
  assert.equal(plan.nextSnapshot.backgroundColor, '#F5F5F4');
  assert.deepEqual(plan.preservedCustomFields, ['primaryColor', 'accentColor']);
});
