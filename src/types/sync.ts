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
  templates: import('./checklist').ChecklistTemplate[];
  encounters: import('./patient').PatientEncounter[];
  folders: import('./checklist').Folder[];
}
