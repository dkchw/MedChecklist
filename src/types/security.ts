export interface SavedDevice {
  id: string;
  name: string;
  pairingKey: string;
  pairedAt: number;
  lastSyncAt?: number;
  isTrusted: boolean;
}

export interface DeviceIdentity {
  deviceId: string;
  deviceName: string;
  pairingKey: string;
  createdAt: number;
}

export interface DevicePairingPayload {
  version: '1.0';
  protocol: 'medchecklist-e2ee';
  deviceId: string;
  deviceName: string;
  pairingKey: string;
  timestamp: number;
}

export interface E2EEEncryptedPayload {
  version: '1.0';
  protocol: 'medchecklist-e2ee-payload';
  iv: string; // Base64 12-byte IV
  ciphertext: string; // Base64 encrypted JSON
  senderDeviceId: string;
  senderDeviceName: string;
  targetDeviceId?: string;
  timestamp: number;
}

export interface VaultState {
  isEnabled: boolean;
  isLocked: boolean;
  hasKey: boolean;
}
