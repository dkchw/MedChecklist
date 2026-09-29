import React, { useState } from 'react';
import { Download, Sparkles, X, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import { UpdateCheckResult } from '../../utils/githubUpdater';

interface UpdateBannerProps {
  updateInfo: UpdateCheckResult;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateInfo, onDismiss }) => {
  const [showDetails, setShowDetails] = useState(false);

  const apkAsset = updateInfo.assets.find(a => a.name.endsWith('.apk'));
  const desktopAsset = updateInfo.assets.find(a => a.name.endsWith('.tar.gz') || a.name.endsWith('.AppImage') || a.name.endsWith('.deb'));

  return (
    <div className="bg-indigo-900 text-white px-4 py-2.5 shadow-md border-b border-indigo-800 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs">
          <div className="p-1 bg-indigo-700 rounded-lg">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <span className="font-bold">New Version Available: </span>
            <span className="font-semibold text-indigo-200">v{updateInfo.latestVersion}</span>
            <span className="text-indigo-300 ml-1.5">(Current: v{updateInfo.currentVersion})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {apkAsset && (
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

          {desktopAsset && (
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

          <a
            href={updateInfo.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 rounded-lg text-xs font-medium transition-colors"
          >
            <span>View Release</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onDismiss}
            className="p-1 text-indigo-300 hover:text-white rounded"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
