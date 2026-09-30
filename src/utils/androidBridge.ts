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
