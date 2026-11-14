import assert from 'node:assert/strict';
import test from 'node:test';
import type { StoreSettingsSnapshotData } from '../db/schema.ts';
import {
  extractSettingsSnapshot,
  isKnownDemoContactValue,
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
