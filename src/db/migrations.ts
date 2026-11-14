import { asc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { storeSettings, storeSettingsSnapshots } from './schema.ts';
import {
  ADONIS_SETTINGS_MIGRATION_KEY,
  extractSettingsSnapshot,
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
    const plan = planStoreSettingsMigration(current);

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
      : `Baseline verified ADONIS settings; Preserved: ${plan.preservedCustomFields.join(', ') || 'none'}`;

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
