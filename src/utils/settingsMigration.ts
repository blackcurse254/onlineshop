import type { StoreSettingsSnapshotData } from '../db/schema.ts';

export const ADONIS_SETTINGS_MIGRATION_KEY = 'adonis-settings-v1';

const KNOWN_LEGACY_STORE_NAMES = new Set(['', 'VERA BOUTIQUE', 'VERA', 'ورا بوتیک', 'فروشگاه ورا']);
const KNOWN_DEMO_PHONES = new Set(['021-88451290', '02188451290', '021-00000000']);
const KNOWN_DEMO_EMAILS = new Set([
  'hello@verashoes.ir',
  'hello@veraboutique.ir',
  'info@veraboutique.ir',
  'support@verashoes.ir',
]);
const KNOWN_DEMO_INSTAGRAMS = new Set(['@vera.shoes.ir', '@veraboutique.ir', '@vera.boutique']);
const KNOWN_DEMO_TELEGRAMS = new Set(['@verashoes_support', '@veraboutique_support', '@veraboutique']);
const KNOWN_DEMO_WHATSAPPS = new Set(['09120004512', '09120000000']);
const KNOWN_DEMO_ADDRESSES = new Set([
  'تهران، جردن، بلوار ناهید شرقی، پلاک ۱۸، طبقه اول',
  'تهران، خیابان ولیعصر، پلاک ۱۰۰',
]);

export function extractSettingsSnapshot(row: StoreSettingsSnapshotData): StoreSettingsSnapshotData {
  return {
    storeName: row.storeName,
    storeSubtitle: row.storeSubtitle,
    logoText: row.logoText,
    logoUrl: row.logoUrl,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    backgroundColor: row.backgroundColor,
    phone: row.phone,
    email: row.email,
    instagram: row.instagram,
    telegram: row.telegram,
    whatsapp: row.whatsapp,
    address: row.address,
    shippingBaseCost: row.shippingBaseCost,
    expressShippingCost: row.expressShippingCost,
    freeShippingThreshold: row.freeShippingThreshold,
    aboutText: row.aboutText,
    shippingPolicy: row.shippingPolicy,
    returnPolicy: row.returnPolicy,
    announcementText: row.announcementText,
  };
}

export function isKnownDemoContactValue(
  field: 'phone' | 'email' | 'instagram' | 'telegram' | 'whatsapp' | 'address',
  value: string
): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();

  switch (field) {
    case 'phone':
      return KNOWN_DEMO_PHONES.has(trimmed);
    case 'email':
      return KNOWN_DEMO_EMAILS.has(lower);
    case 'instagram':
      return KNOWN_DEMO_INSTAGRAMS.has(lower);
    case 'telegram':
      return KNOWN_DEMO_TELEGRAMS.has(lower);
    case 'whatsapp':
      return KNOWN_DEMO_WHATSAPPS.has(trimmed);
    case 'address':
      return KNOWN_DEMO_ADDRESSES.has(trimmed);
  }
}

export interface StoreSettingsMigrationPlan {
  previousSnapshot: StoreSettingsSnapshotData;
  nextSnapshot: StoreSettingsSnapshotData;
  changedFields: string[];
  preservedCustomFields: string[];
  hasChanges: boolean;
}

export function planStoreSettingsMigration(
  current: StoreSettingsSnapshotData
): StoreSettingsMigrationPlan {
  const previousSnapshot = extractSettingsSnapshot(current);
  const nextSnapshot: StoreSettingsSnapshotData = { ...previousSnapshot };
  const changedFields: string[] = [];
  const preservedCustomFields: string[] = [];

  if (KNOWN_LEGACY_STORE_NAMES.has(previousSnapshot.storeName.trim().toUpperCase()) ||
      KNOWN_LEGACY_STORE_NAMES.has(previousSnapshot.storeName.trim())) {
    if (previousSnapshot.storeName !== 'ADONIS') {
      nextSnapshot.storeName = 'ADONIS';
      changedFields.push('storeName');
    }
  } else if (previousSnapshot.storeName.trim() !== 'ADONIS') {
    nextSnapshot.storeName = 'ADONIS';
    changedFields.push('storeName');
  }

  if (
    KNOWN_LEGACY_STORE_NAMES.has(previousSnapshot.logoText.trim().toUpperCase()) ||
    KNOWN_LEGACY_STORE_NAMES.has(previousSnapshot.logoText.trim())
  ) {
    if (previousSnapshot.logoText !== 'ADONIS') {
      nextSnapshot.logoText = 'ADONIS';
      changedFields.push('logoText');
    }
  }

  if (previousSnapshot.aboutText.includes('VERA BOUTIQUE') || previousSnapshot.aboutText.includes('VERA')) {
    nextSnapshot.aboutText = previousSnapshot.aboutText
      .replaceAll('VERA BOUTIQUE', 'ADONIS')
      .replaceAll('VERA', 'ADONIS');
    if (nextSnapshot.aboutText !== previousSnapshot.aboutText) {
      changedFields.push('aboutText');
    }
  }

  if (
    previousSnapshot.announcementText.includes('VERA') ||
    previousSnapshot.announcementText.includes('VERA15')
  ) {
    nextSnapshot.announcementText = previousSnapshot.announcementText
      .replaceAll('VERA15', 'ADONIS15')
      .replaceAll('VERA BOUTIQUE', 'ADONIS')
      .replaceAll('VERA', 'ADONIS');
    if (nextSnapshot.announcementText !== previousSnapshot.announcementText) {
      changedFields.push('announcementText');
    }
  }

  const contactFields = ['phone', 'email', 'instagram', 'telegram', 'whatsapp', 'address'] as const;
  for (const field of contactFields) {
    const val = previousSnapshot[field].trim();
    if (!val) continue;
    if (isKnownDemoContactValue(field, val)) {
      nextSnapshot[field] = '';
      changedFields.push(field);
    } else {
      preservedCustomFields.push(field);
    }
  }

  return {
    previousSnapshot,
    nextSnapshot,
    changedFields,
    preservedCustomFields,
    hasChanges: changedFields.length > 0,
  };
}
