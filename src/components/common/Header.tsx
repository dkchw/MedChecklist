import React, { useState } from 'react';
import {
  Stethoscope,
  ClipboardList,
  CheckSquare,
  Layers,
  Search,
  GitBranch,
  Download,
  Upload,
  Sun,
  Moon,
  ShieldCheck,
  Lock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Folder,
  Image as ImageIcon,
  Edit2,
  Check,
} from 'lucide-react';
import { ThemeMode } from '../../utils/theme';
import { WorkspaceTab, TabType } from '../../types/tab';
import { APP_VERSION } from '../../version';

interface HeaderProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab?: (title: string, type: TabType) => void;
  onRemoveTab?: (tabId: string) => void;
  onRenameTab?: (tabId: string, newTitle: string) => void;
  onReorderTabs?: (newTabs: WorkspaceTab[]) => void;
  onOpenFolders: () => void;
  onOpenSearch: () => void;
  onOpenSync: () => void;
  onOpenVault: () => void;
  isVaultLocked: boolean;
  onExportBackup: () => void;
  onImportBackup: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onOpenFolders,
  onOpenSearch,
  onOpenSync,
  onOpenVault,
  isVaultLocked,
  onExportBackup,
  onImportBackup,
  themeMode,
  onToggleTheme,
}) => {

  const getTabIcon = (type: TabType) => {
    switch (type) {
      case 'encounters':
        return <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />;
      case 'checklists':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'templates':
        return <Layers className="w-3.5 h-3.5 text-amber-500" />;
      case 'gallery':
        return <ImageIcon className="w-3.5 h-3.5 text-rose-500" />;
      case 'folder':
        return <Folder className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2 flex items-center justify-between transition-colors gap-3 flex-wrap">
      {/* Brand & Dynamic Tabs */}
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap flex-1 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs border border-slate-800 dark:border-slate-700">
            <Stethoscope className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>MedChecklist</span>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                MD-First
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                v{APP_VERSION}
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Stationary Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                }`}
              >
                {getTabIcon(tab.type)}
                <span>{tab.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Manage Folders Button */}
        <button
          onClick={onOpenFolders}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200/60 dark:border-slate-700"
          title="Manage Clinical Folders"
        >
          <Folder className="w-3.5 h-3.5 text-cyan-500" />
          <span className="hidden md:inline">Folders</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Encryption at Rest Status Badge & Vault Button */}
        <button
          onClick={onOpenVault}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
            isVaultLocked
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
          }`}
          title="Client-Side Encryption at Rest (AES-256-GCM)"
        >
          {isVaultLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden lg:inline">Vault Locked</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden lg:inline">Encrypted at Rest</span>
            </>
          )}
        </button>

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
          title="Search checklists and notes (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline text-[10px] bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            ⌘K
          </kbd>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          title={themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {themeMode === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Sync Modal Button */}
        <button
          onClick={onOpenSync}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200/50 dark:border-slate-700"
          title="GitHub PAT & Local P2P Wi-Fi Sync"
        >
          <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden md:inline">Sync</span>
        </button>

        {/* Export / Import Full Backup */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5">
          <button
            onClick={onExportBackup}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
            title="Download JSON Clinical Backup"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onImportBackup}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors"
            title="Restore from JSON Clinical Backup"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
