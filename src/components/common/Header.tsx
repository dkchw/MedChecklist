import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  ClipboardList,
  CheckSquare,
  Layers,
  GraduationCap,
  Search,
  GitBranch,
  Download,
  Upload,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  Lock,
  Folder,
  Image as ImageIcon,
  Settings,
  Pen,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import appLogo from '../../../assets/app-icon.png';
import { ThemeMode } from '../../utils/theme';
import { WorkspaceTab, TabType } from '../../types/tab';
import { APP_VERSION } from '../../version';

interface HeaderProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onOpenSidebar: () => void;
  onGoHome?: () => void;
  onOpenFolders: () => void;
  onOpenSearch: () => void;
  onOpenSync: () => void;
  onOpenVault: () => void;
  isVaultLocked: boolean;
  onExportBackup: () => void;
  onImportBackup: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onCheckUpdate?: () => void;
  onOpenSettings?: () => void;
  onOpenInking?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabs,
  activeTabId,
  onOpenSidebar,
  onGoHome,
  onOpenFolders,
  onOpenSearch,
  onOpenSync,
  onOpenVault,
  isVaultLocked,
  onExportBackup,
  onImportBackup,
  themeMode,
  onToggleTheme,
  onCheckUpdate,
  onOpenSettings,
  onOpenInking,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMore]);

  const getTabIcon = (type: TabType) => {
    switch (type) {
      case 'encounters':
        return <ClipboardList className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case 'checklists':
        return <CheckSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'templates':
        return <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'protocols':
        return <CheckSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'knowledge':
        return <GraduationCap className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'gallery':
        return <ImageIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'folder':
        return <Folder className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />;
      default:
        return <ClipboardList className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />;
    }
  };

  const themeIcon = themeMode === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : themeMode === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Laptop className="w-4 h-4 text-cyan-400" />;

  return (
    <header className="sticky top-0 z-40 bg-semantic-card/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-2 flex items-center justify-between transition-colors gap-3 flex-nowrap">
      {/* Left: Menu + Logo/Home */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
          title="Open Workspace Menu (or swipe right from left edge)"
        >
          <Menu className="w-5 h-5 shrink-0" />
        </button>

        <button
          type="button"
          onClick={onGoHome || onOpenSidebar}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer group"
          title="Return to Home (Patient Rounds)"
        >
          <img
            src={appLogo}
            alt="MedChecklist Logo"
            className="w-7 h-7 rounded-lg object-contain shadow-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="text-left hidden sm:block">
            <div className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              MedChecklist
            </div>
          </div>
        </button>
      </div>

      {/* Center: Active Workspace Indicator */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/90 dark:border-indigo-800/90 text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-100 shadow-xs truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="Current Mode — Click to switch workspace"
        >
          {getTabIcon(activeTab.type)}
          <span className="truncate tracking-tight">{activeTab.title}</span>
        </button>
      </div>

      {/* Right: Search + Inking + More */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Global Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
          title="Global Search (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-indigo-500" />
          <kbd className="hidden sm:inline-block text-[10px] bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-mono text-semantic-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* Quick Inking */}
        {onOpenInking && (
          <button
            type="button"
            onClick={onOpenInking}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-xs cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
            title="Full Canvas Inking / Bedside Drawing Mode"
          >
            <Pen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Ink</span>
          </button>
        )}

        {/* More Menu */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              showMore
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                : 'border-slate-200/60 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMore && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Appearance */}
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Appearance</span>
              </div>
              <button
                onClick={() => { onToggleTheme(); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {themeIcon}
                  <span>Theme: <strong className="capitalize">{themeMode}</strong></span>
                </div>
                <span className="text-[10px] text-slate-400">Click to switch</span>
              </button>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* Data */}
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Data</span>
              </div>
              <button
                onClick={() => { onOpenFolders(); setShowMore(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Folder className="w-4 h-4 text-cyan-500" />
                <span>Manage Folders</span>
              </button>
              <button
                onClick={() => { onExportBackup(); setShowMore(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span>Export Backup</span>
              </button>
              <button
                onClick={() => { onImportBackup(); setShowMore(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Upload className="w-4 h-4 text-purple-500" />
                <span>Import Backup</span>
              </button>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* Connectivity */}
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Connectivity</span>
              </div>
              <button
                onClick={() => { onOpenSync(); setShowMore(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <GitBranch className="w-4 h-4 text-emerald-500" />
                <span>Sync & Device Pairing</span>
              </button>
              <button
                onClick={() => { onOpenVault(); setShowMore(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isVaultLocked ? <Lock className="w-4 h-4 text-amber-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                  <span>Security Vault</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isVaultLocked
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  {isVaultLocked ? 'Locked' : 'OK'}
                </span>
              </button>

              <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />

              {/* App */}
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">App</span>
              </div>
              {onOpenSettings && (
                <button
                  onClick={() => { onOpenSettings(); setShowMore(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Settings</span>
                </button>
              )}
              {onCheckUpdate && (
                <button
                  onClick={() => { onCheckUpdate(); setShowMore(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-blue-500" />
                  <span>Check for Updates</span>
                </button>
              )}
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-mono text-slate-400">v{APP_VERSION}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
