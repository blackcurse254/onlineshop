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

export const ADONIS_PALETTE_V2_MIGRATION_KEY = 'adonis-palette-v2';
export const ADONIS_PALETTE_V3_MIGRATION_KEY = 'adonis-palette-v3-marble';

export const ADONIS_V2_PALETTE = {
  primaryColor: '#16141A',
  accentColor: '#C21E3C',
  backgroundColor: '#EFEEEA',
} as const;

export const ADONIS_V3_PALETTE = ADONIS_V2_PALETTE;

const LEGACY_HEX_SETS = {
  primaryColor: new Set(['18181B', '0F172A', '111827']),
  accentColor: new Set(['B5945B', '1D4ED8', '047857', 'C2410C']),
  backgroundColor: new Set(['FAF7F2', 'F4F6F9', 'F8FAFC']),
} as const;

export function planPaletteV2Migration(
  current: StoreSettingsSnapshotData
): StoreSettingsMigrationPlan {
  const previousSnapshot = extractSettingsSnapshot(current);
  const nextSnapshot: StoreSettingsSnapshotData = { ...previousSnapshot };
  const changedFields: string[] = [];
  const preservedCustomFields: string[] = [];

  const colorKeys = ['primaryColor', 'accentColor', 'backgroundColor'] as const;
  for (const key of colorKeys) {
    const val = previousSnapshot[key].trim().toUpperCase();
    const hexDigits = val.replace(/^#/, '');
    if (!val || LEGACY_HEX_SETS[key].has(hexDigits)) {
      if (val !== ADONIS_V2_PALETTE[key]) {
        nextSnapshot[key] = ADONIS_V2_PALETTE[key];
        changedFields.push(key);
      }
    } else if (val !== ADONIS_V2_PALETTE[key]) {
      preservedCustomFields.push(key);
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

export const planPaletteV3Migration = planPaletteV2Migration;

export const ADONIS_PALETTE_V4_MIGRATION_KEY = 'adonis-palette-v4-emerald-agate';

export const ADONIS_V4_PALETTE = {
  primaryColor: '#0F1A1F',
  accentColor: '#0B7A5F',
  backgroundColor: '#EFEEEA',
} as const;

const LEGACY_V4_INK_PRIMARY_HEX = new Set(['18181B', '0F172A', '111827', '16141A', '171615']);
const LEGACY_V4_NAVY_PRIMARY_HEX = new Set(['2B1A2E', '1F1D1C']);
const LEGACY_V4_ACCENT_HEX = new Set(['B5945B', '1D4ED8', '047857', 'C2410C', 'C21E3C', 'B01D39', '9E1B34']);

export function planPaletteV4Migration(
  current: StoreSettingsSnapshotData
): StoreSettingsMigrationPlan {
  const previousSnapshot = extractSettingsSnapshot(current);
  const nextSnapshot: StoreSettingsSnapshotData = { ...previousSnapshot };
  const changedFields: string[] = [];
  const preservedCustomFields: string[] = [];

  const primaryVal = previousSnapshot.primaryColor.trim().toUpperCase();
  const primaryHex = primaryVal.replace(/^#/, '');
  if (!primaryVal || LEGACY_V4_INK_PRIMARY_HEX.has(primaryHex)) {
    if (primaryVal !== ADONIS_V4_PALETTE.primaryColor) {
      nextSnapshot.primaryColor = ADONIS_V4_PALETTE.primaryColor;
      changedFields.push('primaryColor');
    }
  } else if (LEGACY_V4_NAVY_PRIMARY_HEX.has(primaryHex)) {
    if (primaryVal !== '#0B1F2E') {
      nextSnapshot.primaryColor = '#0B1F2E';
      changedFields.push('primaryColor');
    }
  } else if (primaryVal !== ADONIS_V4_PALETTE.primaryColor && primaryVal !== '#0B1F2E') {
    preservedCustomFields.push('primaryColor');
  }

  const accentVal = previousSnapshot.accentColor.trim().toUpperCase();
  const accentHex = accentVal.replace(/^#/, '');
  if (!accentVal || LEGACY_V4_ACCENT_HEX.has(accentHex)) {
    if (accentVal !== ADONIS_V4_PALETTE.accentColor) {
      nextSnapshot.accentColor = ADONIS_V4_PALETTE.accentColor;
      changedFields.push('accentColor');
    }
  } else if (accentVal !== ADONIS_V4_PALETTE.accentColor) {
    preservedCustomFields.push('accentColor');
  }

  return {
    previousSnapshot,
    nextSnapshot,
    changedFields,
    preservedCustomFields,
    hasChanges: changedFields.length > 0,
  };
}

export interface ProductSlugRow {
  id: number;
  slug: string;
}

export interface ProductSlugMigrationPlan {
  updates: { id: number; fromSlug: string; toSlug: string }[];
  skipped: { id: number; slug: string; conflictingSlug: string }[];
}

export function planProductSlugMigration(rows: ProductSlugRow[]): ProductSlugMigrationPlan {
  const existingSlugs = new Set(rows.map((r) => r.slug));
  const updates: { id: number; fromSlug: string; toSlug: string }[] = [];
  const skipped: { id: number; slug: string; conflictingSlug: string }[] = [];

  for (const row of rows) {
    if (!row.slug.startsWith('vera-')) continue;
    const toSlug = `adonis-${row.slug.slice('vera-'.length)}`;
    if (existingSlugs.has(toSlug)) {
      skipped.push({ id: row.id, slug: row.slug, conflictingSlug: toSlug });
      continue;
    }
    updates.push({ id: row.id, fromSlug: row.slug, toSlug });
    existingSlugs.delete(row.slug);
    existingSlugs.add(toSlug);
  }

  return { updates, skipped };
}

export interface OrderNumberRow {
  id: number;
  orderNumber: string;
}

export interface OrderNumberMigrationPlan {
  updates: { id: number; fromOrderNumber: string; toOrderNumber: string }[];
  skipped: { id: number; orderNumber: string; conflictingOrderNumber: string }[];
}

export function planOrderNumberMigration(rows: OrderNumberRow[]): OrderNumberMigrationPlan {
  const existingNumbers = new Set(rows.map((r) => r.orderNumber));
  const updates: { id: number; fromOrderNumber: string; toOrderNumber: string }[] = [];
  const skipped: { id: number; orderNumber: string; conflictingOrderNumber: string }[] = [];

  for (const row of rows) {
    if (!row.orderNumber.startsWith('VERA-')) continue;
    const toOrderNumber = `ADONIS-${row.orderNumber.slice('VERA-'.length)}`;
    if (existingNumbers.has(toOrderNumber)) {
      skipped.push({
        id: row.id,
        orderNumber: row.orderNumber,
        conflictingOrderNumber: toOrderNumber,
      });
      continue;
    }
    updates.push({
      id: row.id,
      fromOrderNumber: row.orderNumber,
      toOrderNumber,
    });
    existingNumbers.delete(row.orderNumber);
    existingNumbers.add(toOrderNumber);
  }

  return { updates, skipped };
}


