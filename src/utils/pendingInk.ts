import { db } from '../db/db';
import { InkStroke } from '../types/ink';

export interface PendingInkItem {
  id: string;
  fieldLabel: string;
  strokes: InkStroke[];
  timestamp: number;
}

const SETTINGS_KEY = 'pending_handwritings';

export async function getPendingInkItems(): Promise<PendingInkItem[]> {
  try {
    const record = await db.settings.get(SETTINGS_KEY);
    if (record && Array.isArray(record.value)) {
      return record.value;
    }
  } catch (err) {
    console.error('Failed to get pending ink items:', err);
  }
  return [];
}

export async function savePendingInkItem(item: PendingInkItem): Promise<void> {
  try {
    const existing = await getPendingInkItems();
    const filtered = existing.filter((p) => p.id !== item.id);
    await db.settings.put({
      key: SETTINGS_KEY,
      value: [item, ...filtered],
    });
  } catch (err) {
    console.error('Failed to save pending ink item:', err);
  }
}

export async function removePendingInkItem(id: string): Promise<void> {
  try {
    const existing = await getPendingInkItems();
    const updated = existing.filter((p) => p.id !== id);
    await db.settings.put({
      key: SETTINGS_KEY,
      value: updated,
    });
  } catch (err) {
    console.error('Failed to remove pending ink item:', err);
  }
}
