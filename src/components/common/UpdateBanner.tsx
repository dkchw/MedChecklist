import React, { useState, useEffect } from 'react';
import {
  Download,
  Sparkles,
  X,
  ExternalLink,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { UpdateCheckResult } from '../../utils/githubUpdater';
import {
  isAndroidApp,
  downloadAndInstallApk,
  cancelDownload,
  subscribeToUpdateProgress,
  openInstallPermissionSettings,
  AndroidUpdateProgressDetail,
} from '../../utils/androidBridge';

interface UpdateBannerProps {
  updateInfo: UpdateCheckResult;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateInfo, onDismiss }) => {
  const isAndroid = isAndroidApp();
  const [downloadDetail, setDownloadDetail] = useState<AndroidUpdateProgressDetail>({
    status: 'cancelled',
    progress: 0,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const apkAsset = updateInfo.assets.find((a) => a.name.endsWith('.apk'));
  const desktopAsset = updateInfo.assets.find(
    (a) => a.name.endsWith('.tar.gz') || a.name.endsWith('.AppImage') || a.name.endsWith('.deb')
  );

  useEffect(() => {
    if (!isAndroid) return;
    const unsubscribe = subscribeToUpdateProgress((detail) => {
      setDownloadDetail(detail);
      if (detail.status === 'starting' || detail.status === 'downloading') {
        setIsUpdating(true);
      } else if (detail.status === 'completed') {
        setTimeout(() => setIsUpdating(false), 8000);
      } else if (detail.status === 'cancelled' || detail.status === 'error') {
        setIsUpdating(false);
      }
    });
    return unsubscribe;
  }, [isAndroid]);

  const handleStartAutoUpdate = () => {
    if (!apkAsset) return;
    setIsUpdating(true);
    setDownloadDetail({ status: 'starting', progress: 0 });
    downloadAndInstallApk(apkAsset.downloadUrl, updateInfo.latestVersion);
  };

  const handleCancel = () => {
    cancelDownload();
    setIsUpdating(false);
    setDownloadDetail({ status: 'cancelled' });
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="bg-indigo-900 text-white px-4 py-2.5 shadow-md border-b border-indigo-800 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Version Notice */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="p-1 bg-indigo-700 rounded-lg shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold">New Version Available: </span>
              <span className="font-semibold text-indigo-200">v{updateInfo.latestVersion}</span>
              <span className="text-indigo-300">(Current: v{updateInfo.currentVersion})</span>
            </div>

            {/* In-Progress Progress Text */}
            {isAndroid && isUpdating && (
              <div className="text-[11px] text-indigo-200 mt-0.5 flex items-center gap-2">
                {downloadDetail.status === 'starting' && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-amber-300" /> Connecting to repository...
                  </span>
                )}
                {downloadDetail.status === 'downloading' && (
                  <span className="flex items-center gap-1">
                    <Download className="w-3 h-3 text-emerald-300 animate-bounce" />
                    Downloading APK: {downloadDetail.progress ?? 0}%
                    {downloadDetail.bytesDownloaded && downloadDetail.totalBytes && (
                      <span className="text-indigo-300">
                        ({formatBytes(downloadDetail.bytesDownloaded)} / {formatBytes(downloadDetail.totalBytes)})
                      </span>
                    )}
                  </span>
                )}
                {downloadDetail.status === 'completed' && (
                  <span className="flex items-center gap-1 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Download complete! Opening system installer...
                  </span>
                )}
              </div>
            )}

            {/* Permission Alert */}
            {isAndroid && downloadDetail.status === 'permission_required' && (
              <div className="text-[11px] text-amber-300 mt-0.5 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Install permission required: Enable "Allow from this source" in Android Settings.
              </div>
            )}

            {/* Error Message */}
            {isAndroid && downloadDetail.status === 'error' && (
              <div className="text-[11px] text-red-300 mt-0.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                Update failed: {downloadDetail.error || 'Network error'}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar (Visible while downloading on Android) */}
        {isAndroid && isUpdating && downloadDetail.status === 'downloading' && (
          <div className="w-full sm:w-48 bg-indigo-950/80 rounded-full h-2 overflow-hidden border border-indigo-700/60 my-1 sm:my-0">
            <div
              className="bg-emerald-400 h-full transition-all duration-200"
              style={{ width: `${Math.max(5, Math.min(100, downloadDetail.progress || 0))}%` }}
            />
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Android Auto-Update Button (Native App Mode) */}
          {isAndroid && apkAsset && (
            <>
              {(!isUpdating || downloadDetail.status === 'cancelled') && downloadDetail.status !== 'permission_required' && downloadDetail.status !== 'error' && (
                <button
                  onClick={handleStartAutoUpdate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Auto-Update & Install</span>
                </button>
              )}

              {isUpdating && downloadDetail.status === 'downloading' && (
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}

              {downloadDetail.status === 'permission_required' && (
                <button
                  onClick={() => openInstallPermissionSettings()}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Grant Install Permission</span>
                </button>
              )}

              {downloadDetail.status === 'error' && (
                <button
                  onClick={handleStartAutoUpdate}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Retry Auto-Update</span>
                </button>
              )}
            </>
          )}

          {/* Fallback Manual APK Download for Browser / non-app mode */}
          {!isAndroid && apkAsset && (
            <a
              href={apkAsset.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Download Android APK</span>
            </a>
          )}

          {/* Desktop Package Download */}
          {!isAndroid && desktopAsset && (
            <a
              href={desktopAsset.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop Package</span>
            </a>
          )}

          {/* View Release on GitHub */}
          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 rounded-lg text-xs font-medium transition-colors"
          >
            <span>View Release</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Dismiss Button */}
          <button
            onClick={onDismiss}
            className="p-1 text-indigo-300 hover:text-white rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
