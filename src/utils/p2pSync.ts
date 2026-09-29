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
    const checklists = await db.checklists.filter((c) => !c.isDeleted).toArray();
    const clinicalTemplates = await db.clinicalTemplates.filter((t) => !t.isDeleted).toArray();
    const templates = await db.templates.filter((t) => !t.isDeleted).toArray();
    const encounters = await db.encounters.filter((e) => !e.isDeleted).toArray();
    const folders = await db.folders.toArray();

    return {
      version: '2.0',
      timestamp: Date.now(),
      deviceId: 'dev-' + Math.random().toString(36).substring(2, 8),
      checklists,
      clinicalTemplates,
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
    checklistsUpdated: number;
    clinicalTemplatesUpdated: number;
    encountersUpdated: number;
    foldersUpdated: number;
  }> {
    let checklistsUpdated = 0;
    let clinicalTemplatesUpdated = 0;
    let encountersUpdated = 0;
    let foldersUpdated = 0;

    // Merge modular checklists
    if (payload.checklists && payload.checklists.length > 0) {
      for (const remoteChecklist of payload.checklists) {
        const local = await db.checklists.get(remoteChecklist.id);
        if (!local || remoteChecklist.updatedAt >= local.updatedAt) {
          await db.checklists.put(remoteChecklist);
          checklistsUpdated++;
        }
      }
    }

    // Merge clinical template bundles
    if (payload.clinicalTemplates && payload.clinicalTemplates.length > 0) {
      for (const remoteTemplate of payload.clinicalTemplates) {
        const local = await db.clinicalTemplates.get(remoteTemplate.id);
        if (!local || remoteTemplate.updatedAt >= local.updatedAt) {
          await db.clinicalTemplates.put(remoteTemplate);
          clinicalTemplatesUpdated++;
        }
      }
    }

    // Merge legacy templates
    if (payload.templates && payload.templates.length > 0) {
      for (const remoteTpl of payload.templates) {
        const localTpl = await db.templates.get(remoteTpl.id);
        if (!localTpl || remoteTpl.updatedAt >= localTpl.updatedAt) {
          await db.templates.put(remoteTpl);
        }
      }
    }

    // Merge encounters safely
    if (payload.encounters && payload.encounters.length > 0) {
      for (const remoteEnc of payload.encounters) {
        const localEnc = await db.encounters.get(remoteEnc.id);
        if (!localEnc || remoteEnc.updatedAt >= localEnc.updatedAt) {
          await db.encounters.put(remoteEnc);
          encountersUpdated++;
        }
      }
    }

    // Merge folders
    if (payload.folders && payload.folders.length > 0) {
      for (const remoteFolder of payload.folders) {
        const localFolder = await db.folders.get(remoteFolder.id);
        if (!localFolder) {
          await db.folders.put(remoteFolder);
          foldersUpdated++;
        }
      }
    }

    return { checklistsUpdated, clinicalTemplatesUpdated, encountersUpdated, foldersUpdated };
  }
}
