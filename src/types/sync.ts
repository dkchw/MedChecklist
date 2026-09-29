import { Checklist, ChecklistTemplate, Folder } from './checklist';
import { ClinicalTemplate } from './template';
import { PatientEncounter } from './patient';

export interface GitHubSyncConfig {
  personalAccessToken: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  autoSyncIntervalMinutes: number; // 0 = manual only
  lastSyncedAt?: number;
  lastCommitSha?: string;
}

export interface P2PSyncConfig {
  peerId: string;
  roomCode: string;
  isHost: boolean;
  connectedPeersCount: number;
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime?: number;
  errorMessage?: string;
  lastAction?: string;
}

export interface SyncPayload {
  version: string;
  timestamp: number;
  deviceId: string;
  checklists?: Checklist[];
  clinicalTemplates?: ClinicalTemplate[];
  templates: ChecklistTemplate[]; // backwards compatibility
  encounters: PatientEncounter[];
  folders: Folder[];
}
