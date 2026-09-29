import React from 'react';
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
  Lock
} from 'lucide-react';
import { ThemeMode } from '../../utils/theme';

interface HeaderProps {
  currentTab: 'encounters' | 'checklists' | 'templates';
  onSelectTab: (tab: 'encounters' | 'checklists' | 'templates') => void;
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
  currentTab,
  onSelectTab,
  onOpenSearch,
  onOpenSync,
  onOpenVault,
  isVaultLocked,
  onExportBackup,
  onImportBackup,
  themeMode,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors">
      {/* Brand & Mode Switcher */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs border border-slate-800 dark:border-slate-700">
            <Stethoscope className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>MedChecklist</span>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                MD-First
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs: Patients | Checklists | Templates */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => onSelectTab('encounters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'encounters'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
            <span>Patients</span>
          </button>

          <button
            onClick={() => onSelectTab('checklists')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'checklists'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>Checklists</span>
          </button>

          <button
            onClick={() => onSelectTab('templates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'templates'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Templates</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
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
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title={`Theme: ${themeMode} (Click to toggle)`}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Sync */}
        <button
          onClick={onOpenSync}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors"
          title="GitHub PAT & P2P E2EE Sync"
        >
          <GitBranch className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden md:inline">Sync & P2P</span>
        </button>

        {/* Backup / Export */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={onExportBackup}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Export Full Backup (JSON)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onImportBackup}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Import Backup (JSON)"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
