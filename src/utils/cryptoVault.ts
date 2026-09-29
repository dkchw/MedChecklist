/**
 * Client-Side Encryption at Rest Engine (AES-256-GCM + PBKDF2)
 * Ensures all clinical data, patient records, and notes are encrypted at rest.
 */

const STORAGE_KEY_SALT = 'medchecklist_vault_salt';
const STORAGE_KEY_HASH_CHECK = 'medchecklist_vault_verifier';
const STORAGE_KEY_AUTO_KEY = 'medchecklist_vault_device_key';
const STORAGE_KEY_ENCRYPTION_ENABLED = 'medchecklist_vault_enabled';

export class CryptoVaultService {
  private activeKey: CryptoKey | null = null;
  private isLocked: boolean = false;

  constructor() {
    this.initDefaultDeviceKey();
  }

  /**
   * Initializes or loads default device key for seamless encryption at rest
   */
  private async initDefaultDeviceKey() {
    try {
      let deviceKeyRaw = localStorage.getItem(STORAGE_KEY_AUTO_KEY);
      if (!deviceKeyRaw) {
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);
        deviceKeyRaw = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(STORAGE_KEY_AUTO_KEY, deviceKeyRaw);
      }

      if (!this.hasUserPassphrase()) {
        this.activeKey = await this.deriveKeyFromPassphrase(deviceKeyRaw, 'device-salt-medchecklist');
      } else {
        // Vault is locked until user enters their master passphrase
        this.isLocked = true;
      }
    } catch (e) {
      console.error('Failed to init crypto vault device key:', e);
    }
  }

  public hasUserPassphrase(): boolean {
    return !!localStorage.getItem(STORAGE_KEY_HASH_CHECK);
  }

  public isVaultLocked(): boolean {
    return this.hasUserPassphrase() && (this.isLocked || !this.activeKey);
  }

  public isEncryptionAtRestActive(): boolean {
    return true; // Always active (either device key or user master passphrase)
  }

  /**
   * Derive a 256-bit AES-GCM CryptoKey from a passphrase and salt using PBKDF2
   */
  private async deriveKeyFromPassphrase(passphrase: string, saltString: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = enc.encode(saltString);

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Set or update Master Passphrase for the Vault
   */
  public async setMasterPassphrase(newPassphrase: string): Promise<boolean> {
    try {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const key = await this.deriveKeyFromPassphrase(newPassphrase, saltHex);
      
      // Encrypt a known verification string to check passphrase on unlock
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode('MEDCHECKLIST_VAULT_VERIFIED')
      );

      const verifier = {
        iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
        data: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join(''),
      };

      localStorage.setItem(STORAGE_KEY_SALT, saltHex);
      localStorage.setItem(STORAGE_KEY_HASH_CHECK, JSON.stringify(verifier));
      localStorage.setItem(STORAGE_KEY_ENCRYPTION_ENABLED, 'true');

      this.activeKey = key;
      this.isLocked = false;
      return true;
    } catch (e) {
      console.error('Failed to set master passphrase:', e);
      return false;
    }
  }

  /**
   * Unlock Vault with Master Passphrase
   */
  public async unlockVault(passphrase: string): Promise<boolean> {
    try {
      const saltHex = localStorage.getItem(STORAGE_KEY_SALT);
      const verifierRaw = localStorage.getItem(STORAGE_KEY_HASH_CHECK);
      if (!saltHex || !verifierRaw) return false;

      const verifier = JSON.parse(verifierRaw);
      const key = await this.deriveKeyFromPassphrase(passphrase, saltHex);

      // Verify key
      const iv = new Uint8Array(verifier.iv.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
      const ciphertext = new Uint8Array(verifier.data.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const decoded = new TextDecoder().decode(decrypted);
      if (decoded === 'MEDCHECKLIST_VAULT_VERIFIED') {
        this.activeKey = key;
        this.isLocked = false;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public lockVault(): void {
    if (this.hasUserPassphrase()) {
      this.activeKey = null;
      this.isLocked = true;
    }
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  public async encryptString(plaintext: string): Promise<string> {
    if (!this.activeKey) {
      await this.initDefaultDeviceKey();
    }
    if (!this.activeKey) {
      throw new Error('Encryption vault is locked. Please unlock to encrypt data.');
    }

    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.activeKey,
      enc.encode(plaintext)
    );

    const payload = {
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      ct: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join(''),
    };

    return JSON.stringify(payload);
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  public async decryptString(encryptedJson: string): Promise<string> {
    if (!this.activeKey) {
      await this.initDefaultDeviceKey();
    }
    if (!this.activeKey) {
      throw new Error('Encryption vault is locked. Please unlock to view clinical data.');
    }

    try {
      const payload = JSON.parse(encryptedJson);
      if (!payload.iv || !payload.ct) {
        return encryptedJson; // Return as-is if not formatted as ciphertext
      }

      const iv = new Uint8Array(payload.iv.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
      const ciphertext = new Uint8Array(payload.ct.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.activeKey,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.warn('Decryption skipped or failed for payload:', e);
      return encryptedJson;
    }
  }
}

export const cryptoVault = new CryptoVaultService();
