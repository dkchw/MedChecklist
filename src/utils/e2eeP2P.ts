import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { DeviceIdentity, DevicePairingPayload, E2EEEncryptedPayload, SavedDevice } from '../types/security';
import { db } from '../db/db';

const STORAGE_KEY_DEVICE_IDENTITY = 'medchecklist_local_device';

export class E2EEP2PService {
  /**
   * Retrieves or initializes this local device's identity and E2EE secret key
   */
  public static getOrCreateLocalDevice(): DeviceIdentity {
    const existing = localStorage.getItem(STORAGE_KEY_DEVICE_IDENTITY);
    if (existing) {
      try {
        return JSON.parse(existing);
      } catch {}
    }

    // Determine default device name based on platform
    let defaultName = 'MedChecklist Device';
    if (navigator.userAgent.includes('Android')) {
      defaultName = 'Bedside Tablet (Android)';
    } else if (navigator.userAgent.includes('Linux')) {
      defaultName = 'Clinical Workstation (Linux)';
    } else if (navigator.userAgent.includes('Mac')) {
      defaultName = 'Doctor Laptop (macOS)';
    } else if (navigator.userAgent.includes('Windows')) {
      defaultName = 'Hospital Workstation (Windows)';
    }

    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    const pairingKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    const newIdentity: DeviceIdentity = {
      deviceId: 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      deviceName: defaultName,
      pairingKey,
      createdAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY_DEVICE_IDENTITY, JSON.stringify(newIdentity));
    return newIdentity;
  }

  public static updateLocalDeviceName(name: string): DeviceIdentity {
    const current = this.getOrCreateLocalDevice();
    current.deviceName = name.trim() || current.deviceName;
    localStorage.setItem(STORAGE_KEY_DEVICE_IDENTITY, JSON.stringify(current));
    return current;
  }

  /**
   * Generates a QR Code (Data URL) containing this device's pairing payload
   */
  public static async generatePairingQRDataUrl(): Promise<string> {
    const device = this.getOrCreateLocalDevice();
    const payload: DevicePairingPayload = {
      version: '1.0',
      protocol: 'medchecklist-e2ee',
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      pairingKey: device.pairingKey,
      timestamp: Date.now(),
    };

    const payloadString = JSON.stringify(payload);
    return await QRCode.toDataURL(payloadString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }

  /**
   * Generates a string version of pairing payload for clipboard copy
   */
  public static getPairingCode(): string {
    const device = this.getOrCreateLocalDevice();
    const payload: DevicePairingPayload = {
      version: '1.0',
      protocol: 'medchecklist-e2ee',
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      pairingKey: device.pairingKey,
      timestamp: Date.now(),
    };
    return JSON.stringify(payload);
  }

  /**
   * Validates and parses pairing payload from scanned QR or pasted string
   */
  public static parsePairingPayload(payloadStr: string): DevicePairingPayload | null {
    try {
      const parsed = JSON.parse(payloadStr.trim());
      if (
        parsed.protocol === 'medchecklist-e2ee' &&
        parsed.deviceId &&
        parsed.pairingKey
      ) {
        return parsed as DevicePairingPayload;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Decodes QR Code from HTML5 Canvas / Video frame using jsQR
   */
  public static decodeQrFromImageData(imageData: ImageData): string | null {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    return code ? code.data : null;
  }

  /**
   * Decodes QR Code from an uploaded image file
   */
  public static async decodeQrFromImageFile(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, canvas.width, canvas.height);
          resolve(result ? result.data : null);
        };
        img.onerror = () => resolve(null);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Saved Connected Devices management
   */
  public static async getSavedDevices(): Promise<SavedDevice[]> {
    return await db.savedDevices.toArray();
  }

  public static async saveConnectedDevice(devicePayload: DevicePairingPayload): Promise<SavedDevice> {
    const local = this.getOrCreateLocalDevice();
    if (devicePayload.deviceId === local.deviceId) {
      throw new Error('Cannot pair device with itself.');
    }

    const device: SavedDevice = {
      id: devicePayload.deviceId,
      name: devicePayload.deviceName,
      pairingKey: devicePayload.pairingKey,
      pairedAt: Date.now(),
      isTrusted: true,
    };

    await db.savedDevices.put(device);
    return device;
  }

  public static async removeSavedDevice(id: string): Promise<void> {
    await db.savedDevices.delete(id);
  }

  /**
   * Derives a CryptoKey for E2EE using the target device's pairing key
   */
  private static async deriveE2EEKey(pairingKey: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(pairingKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode('medchecklist-p2p-e2ee-salt'),
        iterations: 50000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts clinical sync package for a target paired device
   */
  public static async encryptE2EEPayload(
    data: any,
    targetDevice: SavedDevice
  ): Promise<E2EEEncryptedPayload> {
    const local = this.getOrCreateLocalDevice();
    const key = await this.deriveE2EEKey(targetDevice.pairingKey);

    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = JSON.stringify(data);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );

    return {
      version: '1.0',
      protocol: 'medchecklist-e2ee-payload',
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      ciphertext: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join(''),
      senderDeviceId: local.deviceId,
      senderDeviceName: local.deviceName,
      targetDeviceId: targetDevice.id,
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypts an incoming E2EE package using local pairing key or matching saved device
   */
  public static async decryptE2EEPayload(
    payload: E2EEEncryptedPayload
  ): Promise<{ data: any; senderDeviceName: string }> {
    if (payload.protocol !== 'medchecklist-e2ee-payload') {
      throw new Error('Invalid or unencrypted sync payload.');
    }

    const local = this.getOrCreateLocalDevice();
    
    // First try using our own local pairing key (if the sender encrypted for us)
    let key = await this.deriveE2EEKey(local.pairingKey);
    let decrypted: ArrayBuffer | null = null;

    const iv = new Uint8Array(payload.iv.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
    const ct = new Uint8Array(payload.ciphertext.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));

    try {
      decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ct
      );
    } catch {
      // If decryption with local key failed, look up if sender is in saved devices
      const sender = await db.savedDevices.get(payload.senderDeviceId);
      if (sender) {
        key = await this.deriveE2EEKey(sender.pairingKey);
        decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ct
        );
      }
    }

    if (!decrypted) {
      throw new Error('E2EE Decryption Failed: device pairing key does not match.');
    }

    const json = new TextDecoder().decode(decrypted);
    const parsedData = JSON.parse(json);

    // Update last sync timestamp on saved device
    const sender = await db.savedDevices.get(payload.senderDeviceId);
    if (sender) {
      await db.savedDevices.update(sender.id, { lastSyncAt: Date.now() });
    }

    return {
      data: parsedData,
      senderDeviceName: payload.senderDeviceName || 'Paired Device',
    };
  }
}
