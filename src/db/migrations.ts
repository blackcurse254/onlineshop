import { asc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { orders, products, storeSettings, storeSettingsSnapshots } from './schema.ts';
import {
  ADONIS_PALETTE_V2_MIGRATION_KEY,
  ADONIS_PALETTE_V3_MIGRATION_KEY,
  ADONIS_PALETTE_V4_MIGRATION_KEY,
  ADONIS_SETTINGS_MIGRATION_KEY,
  extractSettingsSnapshot,
  planOrderNumberMigration,
  planPaletteV2Migration,
  planPaletteV4Migration,
  planProductSlugMigration,
  planStoreSettingsMigration,
} from '../utils/settingsMigration.ts';

export async function applyAdonisSettingsMigration(
  migrationKey: string = ADONIS_SETTINGS_MIGRATION_KEY
): Promise<{
  status: 'already_recorded' | 'applied' | 'no_settings_row';
  changedFields: string[];
  preservedCustomFields: string[];
}> {
  return db.transaction(async (tx) => {
    const existingRecord = await tx
      .select()
      .from(storeSettingsSnapshots)
      .where(eq(storeSettingsSnapshots.migrationKey, migrationKey))
      .limit(1);

    if (existingRecord.length > 0) {
      return {
        status: 'already_recorded',
        changedFields: [],
        preservedCustomFields: [],
      };
    }

    const rows = await tx.select().from(storeSettings).orderBy(asc(storeSettings.id)).limit(1);
    if (rows.length === 0) {
      return {
        status: 'no_settings_row',
        changedFields: [],
        preservedCustomFields: [],
      };
    }

    const current = rows[0];
    const plan =
      migrationKey === ADONIS_PALETTE_V4_MIGRATION_KEY
        ? planPaletteV4Migration(current)
        : migrationKey === ADONIS_PALETTE_V2_MIGRATION_KEY ||
            migrationKey === ADONIS_PALETTE_V3_MIGRATION_KEY
          ? planPaletteV2Migration(current)
          : planStoreSettingsMigration(current);

    if (plan.hasChanges) {
      await tx
        .update(storeSettings)
        .set({
          ...plan.nextSnapshot,
          updatedAt: new Date(),
        })
        .where(eq(storeSettings.id, current.id));
    }

    const notes = plan.hasChanges
      ? `Changed: ${plan.changedFields.join(', ')}; Preserved: ${plan.preservedCustomFields.join(', ') || 'none'}`
      : `Baseline verified ADONIS settings (${migrationKey}); Preserved: ${plan.preservedCustomFields.join(', ') || 'none'}`;

    await tx.insert(storeSettingsSnapshots).values({
      migrationKey,
      settingsId: current.id,
      previousSnapshot: plan.previousSnapshot,
      appliedSnapshot: extractSettingsSnapshot(plan.nextSnapshot),
      status: 'applied',
      notes,
    });

    return {
      status: 'applied',
      changedFields: plan.changedFields,
      preservedCustomFields: plan.preservedCustomFields,
    };
  });
}

export async function applyAdonisPaletteV2Migration() {
  return applyAdonisSettingsMigration(ADONIS_PALETTE_V2_MIGRATION_KEY);
}

export async function applyAdonisPaletteV3Migration() {
  return applyAdonisSettingsMigration(ADONIS_PALETTE_V3_MIGRATION_KEY);
}

export async function applyAdonisPaletteV4Migration() {
  return applyAdonisSettingsMigration(ADONIS_PALETTE_V4_MIGRATION_KEY);
}

export async function rollbackAdonisSettingsMigration(
  migrationKey: string = ADONIS_SETTINGS_MIGRATION_KEY
): Promise<{
  rolledBack: boolean;
  reason?: string;
}> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(storeSettingsSnapshots)
      .where(eq(storeSettingsSnapshots.migrationKey, migrationKey))
      .limit(1);

    if (rows.length === 0) {
      return { rolledBack: false, reason: 'Migration snapshot not found.' };
    }

    const snap = rows[0];
    if (snap.status === 'rolled_back') {
      return { rolledBack: false, reason: 'Migration has already been rolled back.' };
    }

    await tx
      .update(storeSettings)
      .set({
        ...snap.previousSnapshot,
        updatedAt: new Date(),
      })
      .where(eq(storeSettings.id, snap.settingsId));

    await tx
      .update(storeSettingsSnapshots)
      .set({
        status: 'rolled_back',
        rolledBackAt: new Date(),
      })
      .where(eq(storeSettingsSnapshots.id, snap.id));

    return { rolledBack: true };
  });
}

export async function getSettingsMigrationStatus(
  migrationKey: string = ADONIS_SETTINGS_MIGRATION_KEY
) {
  const rows = await db
    .select()
    .from(storeSettingsSnapshots)
    .where(eq(storeSettingsSnapshots.migrationKey, migrationKey))
    .limit(1);
  return rows[0] ?? null;
}

let productSlugMigrationPromise: Promise<{ changedCount: number; skippedCount: number }> | null = null;

export async function applyAdonisProductSlugMigration(): Promise<{
  changedCount: number;
  skippedCount: number;
}> {
  if (productSlugMigrationPromise) {
    return productSlugMigrationPromise;
  }

  productSlugMigrationPromise = db
    .transaction(async (tx) => {
      const rows = await tx
        .select({ id: products.id, slug: products.slug })
        .from(products)
        .orderBy(asc(products.id));

      const plan = planProductSlugMigration(rows);

      for (const item of plan.updates) {
        await tx
          .update(products)
          .set({ slug: item.toSlug })
          .where(eq(products.id, item.id));
      }

      console.log(
        `[migrations] Product slug migration (vera- -> adonis-): ${plan.updates.length} row(s) changed` +
          (plan.skipped.length > 0 ? `, ${plan.skipped.length} row(s) skipped (slug already exists)` : '') +
          '.'
      );

      return {
        changedCount: plan.updates.length,
        skippedCount: plan.skipped.length,
      };
    })
    .catch((err) => {
      productSlugMigrationPromise = null;
      throw err;
    });

  return productSlugMigrationPromise;
}

let orderNumberMigrationPromise: Promise<{ changedCount: number; skippedCount: number }> | null = null;

export async function applyAdonisOrderNumberMigration(): Promise<{
  changedCount: number;
  skippedCount: number;
}> {
  if (orderNumberMigrationPromise) {
    return orderNumberMigrationPromise;
  }

  orderNumberMigrationPromise = db
    .transaction(async (tx) => {
      const rows = await tx
        .select({ id: orders.id, orderNumber: orders.orderNumber })
        .from(orders)
        .orderBy(asc(orders.id));

      const plan = planOrderNumberMigration(rows);

      for (const item of plan.updates) {
        await tx
          .update(orders)
          .set({ orderNumber: item.toOrderNumber })
          .where(eq(orders.id, item.id));
      }

      console.log(
        `[migrations] Order number migration (VERA- -> ADONIS-): ${plan.updates.length} row(s) changed` +
          (plan.skipped.length > 0 ? `, ${plan.skipped.length} row(s) skipped (order number already exists)` : '') +
          '.'
      );

      return {
        changedCount: plan.updates.length,
        skippedCount: plan.skipped.length,
      };
    })
    .catch((err) => {
      orderNumberMigrationPromise = null;
      throw err;
    });

  return orderNumberMigrationPromise;
}
