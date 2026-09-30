import React from 'react';
import {
  X,
  Stethoscope,
  CheckSquare,
  Layers,
  GraduationCap,
  ImageIcon,
  Folder,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Settings,
  Sun,
  Moon,
  Laptop,
  ChevronRight,
  Shield,
  Smartphone,
} from 'lucide-react';
import appLogo from '../../../assets/app-icon.png';
import { WorkspaceTab, TabType } from '../../types/tab';
import { ThemeMode } from '../../utils/theme';
import { APP_VERSION } from '../../version';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  activePatientCount?: number;
  checklistCount?: number;
  templateCount?: number;
  knowledgeNoteCount?: number;
  onOpenFolders: () => void;
  onOpenSearch: () => void;
  onOpenSync: () => void;
  onOpenVault: () => void;
  isVaultLocked: boolean;
  onOpenSettings: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  tabs,
  activeTabId,
  onSelectTab,
  activePatientCount = 0,
  checklistCount = 0,
  templateCount = 0,
  knowledgeNoteCount = 0,
  onOpenFolders,
  onOpenSearch,
  onOpenSync,
  onOpenVault,
  isVaultLocked,
  onOpenSettings,
  themeMode,
  onToggleTheme,
}) => {
  const getTabIcon = (type: TabType, isActive: boolean) => {
    const iconClass = `w-4 h-4 shrink-0 transition-transform ${
      isActive ? 'scale-110' : 'group-hover:scale-105'
    }`;
    switch (type) {
      case 'encounters':
        return <Stethoscope className={`${iconClass} text-indigo-500`} />;
      case 'checklists':
        return <CheckSquare className={`${iconClass} text-emerald-500`} />;
      case 'templates':
        return <Layers className={`${iconClass} text-amber-500`} />;
      case 'knowledge':
        return <GraduationCap className={`${iconClass} text-purple-500`} />;
      case 'gallery':
        return <ImageIcon className={`${iconClass} text-rose-500`} />;
      default:
        return <Folder className={`${iconClass} text-slate-400`} />;
    }
  };

  const getTabBadge = (type: TabType) => {
    switch (type) {
      case 'encounters':
        return activePatientCount > 0 ? `${activePatientCount} active` : undefined;
      case 'checklists':
        return checklistCount > 0 ? `${checklistCount}` : undefined;
      case 'templates':
        return templateCount > 0 ? `${templateCount}` : undefined;
      case 'knowledge':
        return knowledgeNoteCount > 0 ? `${knowledgeNoteCount}` : undefined;
      default:
        return undefined;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden animate-in fade-in duration-200">
      {/* Semi-transparent Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Sidebar Panel Drawer */}
      <div
        className="relative w-80 max-w-[85vw] h-full bg-slate-900 text-slate-100 shadow-2xl flex flex-col justify-between z-10 border-r border-slate-800 animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Branding */}
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              <img
                src={appLogo}
                alt="MedChecklist Logo"
                className="w-9 h-9 rounded-xl object-contain shadow-xs border border-slate-700 bg-slate-900"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-white">MedChecklist</span>
                  <span className="text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                    MD-First
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Clinical Protocol Engine</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Close Menu (Esc or Swipe Left)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items (Modes & Workspaces) */}
          <div className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Workspaces & Modes
            </div>

            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const badge = getTabBadge(tab.type);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {getTabIcon(tab.type, isActive)}
                    <span className="truncate">{tab.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {badge && (
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? 'bg-indigo-700/80 text-white'
                            : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                    <ChevronRight
                      className={`w-3.5 h-3.5 opacity-40 transition-transform ${
                        isActive ? 'opacity-100 translate-x-0.5' : 'group-hover:opacity-80'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Management Shortcuts */}
          <div className="p-3 border-t border-slate-800/80 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Clinical Tools
            </div>

            <button
              onClick={() => {
                onOpenFolders();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <Folder className="w-4 h-4 text-cyan-400" />
              <span>Manage Hospital & Ward Folders</span>
            </button>

            <button
              onClick={() => {
                onOpenSearch();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-indigo-400" />
                <span>Search Everything</span>
              </div>
              <kbd className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => {
                onOpenSync();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Device Pairing & GitHub Sync</span>
            </button>

            <button
              onClick={() => {
                onOpenVault();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {isVaultLocked ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-emerald-400" />
                )}
                <span>Data Security Vault</span>
              </div>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isVaultLocked
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                }`}
              >
                {isVaultLocked ? 'Locked' : 'Unlocked'}
              </span>
            </button>
          </div>
        </div>

        {/* Footer Area: Theme Switcher, Settings, Version */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
          {/* Theme Quick Switcher */}
          <div className="flex items-center justify-between p-1 bg-slate-900 rounded-xl border border-slate-800">
            <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center gap-1.5">
              <span>Theme:</span>
              <span className="font-semibold text-slate-200 capitalize">{themeMode}</span>
            </span>

            <button
              onClick={onToggleTheme}
              className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Toggle Theme: Light → Dark → System"
            >
              {themeMode === 'light' && <Sun className="w-3.5 h-3.5 text-amber-400" />}
              {themeMode === 'dark' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              {themeMode === 'system' && <Laptop className="w-3.5 h-3.5 text-cyan-400" />}
              <span>Switch</span>
            </button>
          </div>

          {/* Settings & Version */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings & Updates</span>
            </button>

            <span className="text-[11px] font-mono text-slate-400">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
