export interface AndroidUpdateProgressDetail {
  status: 'starting' | 'downloading' | 'completed' | 'permission_required' | 'cancelled' | 'error';
  progress?: number; // 0 to 100
  bytesDownloaded?: number;
  totalBytes?: number;
  error?: string;
}

declare global {
  interface Window {
    AndroidApp?: {
      isAndroidApp: () => boolean;
      getAppVersion: () => string;
      checkCanInstallPackages: () => boolean;
      openInstallPermissionSettings: () => void;
      downloadAndInstallApk: (downloadUrl: string, versionName: string) => void;
      cancelDownload: () => void;
    };
    AndroidDigitalInk?: {
      isAvailable: () => boolean;
      isModelReady: (languageTag?: string) => boolean;
      checkAndDownloadModel: (languageTag?: string) => void;
      recognizeInk: (requestId: string, jsonStrokes: string, languageTag?: string) => void;
    };
  }
}

/**
 * Returns true if running inside the MedChecklist Android native wrapper
 */
export function isAndroidApp(): boolean {
  try {
    return Boolean(typeof window !== 'undefined' && window.AndroidApp && window.AndroidApp.isAndroidApp());
  } catch {
    return false;
  }
}

/**
 * Gets native app version string if available
 */
export function getAndroidAppVersion(): string | null {
  try {
    if (isAndroidApp() && window.AndroidApp) {
      return window.AndroidApp.getAppVersion();
    }
  } catch {}
  return null;
}

/**
 * Checks if the app has permission to install packages (Android 8.0+)
 */
export function checkCanInstallPackages(): boolean {
  try {
    if (isAndroidApp() && window.AndroidApp) {
      return window.AndroidApp.checkCanInstallPackages();
    }
  } catch {}
  return true;
}

/**
 * Opens system settings for Unknown App Sources permission
 */
export function openInstallPermissionSettings(): void {
  try {
    if (isAndroidApp() && window.AndroidApp) {
      window.AndroidApp.openInstallPermissionSettings();
    }
  } catch (err) {
    console.error('Failed to open install settings:', err);
  }
}

/**
 * Initiates APK download and triggers system package installer upon completion
 */
export function downloadAndInstallApk(downloadUrl: string, versionName: string): void {
  if (isAndroidApp() && window.AndroidApp) {
    window.AndroidApp.downloadAndInstallApk(downloadUrl, versionName);
  }
}

/**
 * Cancels active APK download
 */
export function cancelDownload(): void {
  if (isAndroidApp() && window.AndroidApp) {
    window.AndroidApp.cancelDownload();
  }
}

/**
 * Subscribes to native Android download and install progress events
 */
export function subscribeToUpdateProgress(
  callback: (detail: AndroidUpdateProgressDetail) => void
): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<AndroidUpdateProgressDetail>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  window.addEventListener('android-update-progress', handler);
  return () => {
    window.removeEventListener('android-update-progress', handler);
  };
}

export interface DigitalInkRecognitionResponse {
  requestId: string;
  status: 'success' | 'model_not_ready' | 'error';
  candidates: string[];
  topCandidate: string;
  error?: string;
}

/**
 * Returns true if running on Android with Google ML Kit Digital Ink Recognition available
 */
export function isDigitalInkAvailable(): boolean {
  try {
    return Boolean(
      typeof window !== 'undefined' &&
      window.AndroidDigitalInk &&
      window.AndroidDigitalInk.isAvailable()
    );
  } catch {
    return false;
  }
}

/**
 * Checks if the specified language ML model is downloaded and ready for inference
 */
export function isDigitalInkModelReady(languageTag = 'en-US'): boolean {
  try {
    return Boolean(
      typeof window !== 'undefined' &&
      window.AndroidDigitalInk &&
      window.AndroidDigitalInk.isModelReady(languageTag)
    );
  } catch {
    return false;
  }
}

/**
 * Initiates background download of ML Kit model for given language
 */
export function requestDigitalInkModelDownload(languageTag = 'en-US'): void {
  try {
    if (typeof window !== 'undefined' && window.AndroidDigitalInk) {
      window.AndroidDigitalInk.checkAndDownloadModel(languageTag);
    }
  } catch {}
}

/**
 * Invokes native Google ML Kit Digital Ink Recognition asynchronously
 */
export async function recognizeDigitalInkNative(
  strokes: any[],
  languageTag = 'en-US',
  timeoutMs = 4000
): Promise<string[] | null> {
  if (!isDigitalInkAvailable()) return null;

  return new Promise((resolve) => {
    const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

    const timer = setTimeout(() => {
      window.removeEventListener('digitalInkRecognitionResult', handler as EventListener);
      resolve(null);
    }, timeoutMs);

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<DigitalInkRecognitionResponse>;
      if (customEvent.detail && customEvent.detail.requestId === requestId) {
        clearTimeout(timer);
        window.removeEventListener('digitalInkRecognitionResult', handler as EventListener);
        if (
          customEvent.detail.status === 'success' &&
          customEvent.detail.candidates &&
          customEvent.detail.candidates.length > 0
        ) {
          resolve(customEvent.detail.candidates);
        } else {
          resolve(null);
        }
      }
    };

    window.addEventListener('digitalInkRecognitionResult', handler as EventListener);

    try {
      const serialized = JSON.stringify(strokes);
      window.AndroidDigitalInk!.recognizeInk(requestId, serialized, languageTag);
    } catch (err) {
      clearTimeout(timer);
      window.removeEventListener('digitalInkRecognitionResult', handler as EventListener);
      resolve(null);
    }
  });
}

