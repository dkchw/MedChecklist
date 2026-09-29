import { SyncPayload } from '../types/sync';
import { db } from '../db/db';

/**
 * P2P Sync Utility for Local Hospital Wi-Fi or Direct Tablet <-> PC Transfer
 * Uses direct data exchange packets or WebRTC Broadcast/DataChannel
 */
export class P2PSyncService {
  /**
   * Generates a full synchronization payload
   */
  static async exportSyncPayload(): Promise<SyncPayload> {
    const templates = await db.templates.filter(t => !t.isDeleted).toArray();
    const encounters = await db.encounters.filter(e => !e.isDeleted).toArray();
    const folders = await db.folders.toArray();

    return {
      version: '1.0',
      timestamp: Date.now(),
      deviceId: 'dev-' + Math.random().toString(36).substring(2, 8),
      templates,
      encounters,
      folders,
    };
  }

  /**
   * Imports a sync payload with safe non-destructive merging
   * (Prevents overwriting newer edits or accidental deletes)
   */
  static async importSyncPayload(payload: SyncPayload): Promise<{
    templatesUpdated: number;
    encountersUpdated: number;
    foldersUpdated: number;
  }> {
    let templatesUpdated = 0;
    let encountersUpdated = 0;
    let foldersUpdated = 0;

    // Merge templates safely (keep newer updatedAt)
    for (const remoteTpl of payload.templates) {
      const localTpl = await db.templates.get(remoteTpl.id);
      if (!localTpl || remoteTpl.updatedAt >= localTpl.updatedAt) {
        await db.templates.put(remoteTpl);
        templatesUpdated++;
      }
    }

    // Merge encounters safely
    for (const remoteEnc of payload.encounters) {
      const localEnc = await db.encounters.get(remoteEnc.id);
      if (!localEnc || remoteEnc.updatedAt >= localEnc.updatedAt) {
        await db.encounters.put(remoteEnc);
        encountersUpdated++;
      }
    }

    // Merge folders
    for (const remoteFolder of payload.folders) {
      const localFolder = await db.folders.get(remoteFolder.id);
      if (!localFolder) {
        await db.folders.put(remoteFolder);
        foldersUpdated++;
      }
    }

    return { templatesUpdated, encountersUpdated, foldersUpdated };
  }
}
