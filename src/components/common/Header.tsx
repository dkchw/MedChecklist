import React from 'react';
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
  ShieldCheck,
  Lock,
  Folder,
  Image as ImageIcon,
  Settings,
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
}

export const Header: React.FC<HeaderProps> = ({
  tabs,
  activeTabId,
  onOpenSidebar,
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
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const getTabIcon = (type: TabType) => {
    switch (type) {
      case 'encounters':
        return <ClipboardList className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />;
      case 'checklists':
        return <CheckSquare className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'templates':
        return <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 shrink-0" />;
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

  return (
    <header className="sticky top-0 z-40 bg-semantic-card/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-5 py-2 flex items-center justify-between transition-colors gap-3 flex-nowrap">
      {/* Brand & Sidebar Trigger */}
      <div className="flex items-center gap-3 flex-nowrap shrink-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer group border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
          title="Open Workspace Menu (or swipe right from left edge)"
        >
          <Menu className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
          <img
            src={appLogo}
            alt="MedChecklist Logo"
            className="w-7 h-7 rounded-lg object-contain shadow-xs border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0"
          />
          <div className="text-left hidden sm:block">
            <div className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>MedChecklist</span>
              <span className="text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                MD-First
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Active Workspace / Mode Indicator (Prominent & Big) */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/90 dark:border-indigo-800/90 text-sm sm:text-base font-black text-indigo-950 dark:text-indigo-100 shadow-xs truncate cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="Current Mode — Click to switch workspace or swipe from left"
        >
          {getTabIcon(activeTab.type)}
          <span className="truncate tracking-tight">{activeTab.title}</span>
        </button>
      </div>

      {/* Right Utility Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Manage Folders Shortcut */}
        <button
          onClick={onOpenFolders}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700 cursor-pointer"
          title="Manage Clinical Folders"
        >
          <Folder className="w-3.5 h-3.5 text-cyan-500" />
          <span>Folders</span>
        </button>

        {/* Encryption at Rest Status Badge & Vault Button */}
        <button
          type="button"
          onClick={onOpenVault}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors border ${
            isVaultLocked
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          title={isVaultLocked ? 'Security Vault Locked - Click to unlock' : 'Data Protected with AES-256-GCM'}
        >
          {isVaultLocked ? (
            <Lock className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          )}
          <span className="hidden xl:inline text-[11px] font-mono">
            {isVaultLocked ? 'Locked' : 'Encrypted'}
          </span>
        </button>

        {/* Global Search Bar Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs"
          title="Global Search (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden lg:inline">Search</span>
          <kbd className="hidden sm:inline-block text-[10px] bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-mono text-semantic-text-muted">
            ⌘K
          </kbd>
        </button>

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={`Theme: ${themeMode} (click to switch)`}
          className="p-2 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
        >
          {themeMode === 'light' ? (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
          )}
        </button>

        {/* Device Sync & P2P Button */}
        <button
          type="button"
          onClick={onOpenSync}
          title="Device Pairing & Sync (P2P / GitHub)"
          className="p-2 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Settings & Software Updates"
          className="p-2 rounded-xl border border-slate-200/60 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        </button>

        {/* Full JSON Backup Download & Upload */}
        <div className="hidden sm:flex items-center border border-slate-200/60 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={onExportBackup}
            title="Download full JSON backup (All patients, checklists & templates)"
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
          </button>
          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700" />
          <button
            type="button"
            onClick={onImportBackup}
            title="Restore / Import JSON backup"
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-purple-500" />
          </button>
        </div>
      </div>
    </header>
  );
};
