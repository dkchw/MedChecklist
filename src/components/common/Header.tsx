import React from 'react';
import { Stethoscope, ClipboardList, BookOpen, Search, GitBranch, Download, Upload, Shield } from 'lucide-react';

interface HeaderProps {
  currentTab: 'encounters' | 'templates';
  onSelectTab: (tab: 'encounters' | 'templates') => void;
  onOpenSearch: () => void;
  onOpenSync: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onOpenSync,
  onExportBackup,
  onImportBackup,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Brand & Mode Switcher */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Stethoscope className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>MedChecklist</span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">MD-First</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => onSelectTab('encounters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'encounters'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Patient Encounters</span>
          </button>

          <button
            onClick={() => onSelectTab('templates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'templates'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Templates & Library</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-xl text-xs font-medium transition-colors"
          title="Search checklists and notes (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline text-[10px] bg-white text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">
            ⌘K
          </kbd>
        </button>

        {/* Sync */}
        <button
          onClick={onOpenSync}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
          title="GitHub PAT & P2P Sync"
        >
          <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden md:inline">Sync</span>
        </button>

        {/* Backup / Export */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
          <button
            onClick={onExportBackup}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Export Full Backup (JSON)"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onImportBackup}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Import Backup (JSON)"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
