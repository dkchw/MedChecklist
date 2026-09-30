import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Moon,
  Sun,
  ShieldCheck,
  FolderSync,
  Database,
  ExternalLink,
  Smartphone,
  Laptop,
  Globe,
} from 'lucide-react';
import { APP_VERSION } from '../../version';
import { checkForGitHubUpdate, UpdateCheckResult } from '../../utils/githubUpdater';
import { isAndroidApp, downloadAndInstallApk, subscribeToUpdateProgress } from '../../utils/androidBridge';
import { ThemeMode } from '../../utils/theme';

interface SettingsModalProps {
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onOpenVault: () => void;
  onOpenSync: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  themeMode,
  onToggleTheme,
  onOpenVault,
  onOpenSync,
  onExportBackup,
  onImportBackup,
  onClose,
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  const isAndroid = isAndroidApp();

  useEffect(() => {
    if (!isAndroid) return;
    const unsubscribe = subscribeToUpdateProgress((detail) => {
      if (detail.status === 'downloading' && detail.progress !== undefined) {
        setDownloadProgress(detail.progress);
        setDownloadStatus(`Downloading: ${detail.progress}%`);
      } else if (detail.status === 'completed') {
        setDownloadProgress(100);
        setDownloadStatus('Download complete. Launching installer...');
      } else if (detail.status === 'error') {
        setDownloadStatus(`Update failed: ${detail.error || 'Unknown error'}`);
      }
    });
    return () => unsubscribe();
  }, [isAndroid]);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    setUpdateResult(null);
    try {
      const res = await checkForGitHubUpdate('dkchw', 'MedChecklist');
      setUpdateResult(res);
      if (!res) {
        setUpdateError('Unable to connect to GitHub releases. Please check your network connection.');
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to check for updates.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleStartUpdate = (url: string, version: string) => {
    if (isAndroid) {
      setDownloadProgress(0);
      setDownloadStatus('Starting download...');
      downloadAndInstallApk(url, version);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Application Settings</span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  v{APP_VERSION}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Updates, theme customization, security vault, and clinical data management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-900 dark:text-slate-100">
          {/* Section 1: Software Updates */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-indigo-500" />
                  <span>Software Updates</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Current installed version: <strong className="font-mono text-indigo-600 dark:text-indigo-400">v{APP_VERSION}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'Checking...' : 'Check for Updates'}</span>
              </button>
            </div>

            {/* Update Check Results */}
            {checkingUpdate && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Querying latest releases from GitHub repository...</span>
              </div>
            )}

            {updateError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{updateError}</span>
              </div>
            )}

            {updateResult && !updateResult.hasUpdate && !checkingUpdate && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>MedChecklist is up to date (v{APP_VERSION}). You have the latest clinical tools and security patches.</span>
              </div>
            )}

            {updateResult && updateResult.hasUpdate && (
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                  <div className="flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>New Version Available: {updateResult.latestVersion}</span>
                  </div>
                  <span className="text-[10px] bg-indigo-200/80 dark:bg-indigo-900 px-2 py-0.5 rounded-full font-mono">
                    Published
                  </span>
                </div>

                {updateResult.releaseNotes && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900 max-h-32 overflow-y-auto leading-relaxed whitespace-pre-line font-sans">
                    {updateResult.releaseNotes}
                  </div>
                )}

                {downloadStatus && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300">
                      {downloadStatus}
                    </div>
                    {downloadProgress !== null && (
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full transition-all duration-200"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {(() => {
                  const apkAsset = updateResult.assets?.find((a) => a.name.endsWith('.apk'));
                  return (
                    <div className="pt-1 flex items-center gap-2">
                      {isAndroid && apkAsset ? (
                        <button
                          type="button"
                          onClick={() => handleStartUpdate(apkAsset.downloadUrl, updateResult.latestVersion)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download & Install APK</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => window.open(updateResult.releaseUrl, '_blank')}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View GitHub Release</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Section 2: Appearance & Tokyo Night Theme */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {themeMode === 'dark' ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>Appearance & Color Theme</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  High-contrast Tokyo Night dark mode tailored for dim bedside ward rounds
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleTheme}
                className="px-3.5 py-2 bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {themeMode === 'light' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                    <span>Switch to Tokyo Night</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch to Light Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 3: Clinical Vault & Security */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Data Protection & Encryption</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All clinical records and notes are protected with client-side <strong>AES-256-GCM</strong> encryption at rest.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVault();
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-left flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Manage Security Vault</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSync();
                }}
                className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-left flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FolderSync className="w-3.5 h-3.5 text-indigo-500" />
                <span>Wi-Fi P2P & GitHub Sync</span>
              </button>
            </div>
          </div>

          {/* Section 4: Backup & System Info */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-500" />
              <span>Clinical Backup & Device Information</span>
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={onExportBackup}
                className="px-3 py-1.5 bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl font-semibold cursor-pointer transition-colors"
              >
                Export JSON Backup
              </button>
              <button
                type="button"
                onClick={onImportBackup}
                className="px-3 py-1.5 bg-slate-200/80 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl font-semibold cursor-pointer transition-colors"
              >
                Import JSON Backup
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-4 border-t border-slate-200/60 dark:border-slate-700/60 mt-2">
              <span className="flex items-center gap-1">
                {isAndroid ? <Smartphone className="w-3 h-3 text-indigo-400" /> : <Laptop className="w-3 h-3 text-indigo-400" />}
                <span>Platform: {isAndroid ? 'Android Tablet' : 'Linux / Desktop / Web'}</span>
              </span>
              <span>DB: IndexedDB (Dexie)</span>
              <span>Cipher: AES-256-GCM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
