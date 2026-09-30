import React from 'react';
import {
  X,
  Stethoscope,
  CheckSquare,
  Layers,
  GraduationCap,
  ImageIcon,
  Folder,
  ChevronRight,
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
}) => {
  const getTabIcon = (type: TabType, isActive: boolean) => {
    const iconClass = `w-5 h-5 shrink-0 transition-transform ${
      isActive ? 'scale-110' : 'group-hover:scale-105'
    }`;
    switch (type) {
      case 'encounters':
        return <Stethoscope className={`${iconClass} text-indigo-500`} />;
      case 'checklists':
        return <CheckSquare className={`${iconClass} text-emerald-500`} />;
      case 'templates':
        return <Layers className={`${iconClass} text-amber-500`} />;
      case 'protocols':
        return <CheckSquare className={`${iconClass} text-emerald-500`} />;
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
      case 'protocols':
        return (checklistCount + templateCount) > 0 ? `${checklistCount + templateCount}` : undefined;
      case 'templates':
        return templateCount > 0 ? `${templateCount}` : undefined;
      case 'knowledge':
        return knowledgeNoteCount > 0 ? `${knowledgeNoteCount}` : undefined;
      default:
        return undefined;
    }
  };

  const getTabDescription = (type: TabType) => {
    switch (type) {
      case 'encounters':
        return 'Patient rounds & bedside data';
      case 'protocols':
        return 'Checklists & template bundles';
      case 'knowledge':
        return 'Clinical notes & references';
      case 'checklists':
        return 'Modular clinical checklists';
      case 'templates':
        return 'Multi-checklist bundles';
      case 'gallery':
        return 'Medical images & photos';
      default:
        return '';
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

      {/* Sidebar Panel */}
      <div
        className="relative w-80 max-w-[85vw] h-full bg-slate-900 text-slate-100 shadow-2xl flex flex-col justify-between z-10 border-r border-slate-800 animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top: Branding */}
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-3">
              <img
                src={appLogo}
                alt="MedChecklist Logo"
                className="w-10 h-10 rounded-xl object-contain shadow-xs border border-slate-700 bg-slate-900"
              />
              <div>
                <span className="font-bold text-lg tracking-tight text-white">MedChecklist</span>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">Clinical Workspace</p>
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

          {/* Workspace Navigation */}
          <div className="p-4 space-y-1.5">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              const badge = getTabBadge(tab.type);
              const description = getTabDescription(tab.type);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {getTabIcon(tab.type, isActive)}
                    <div className="text-left truncate">
                      <span className="block truncate">{tab.title}</span>
                      {description && (
                        <span className={`block text-[11px] font-normal truncate ${
                          isActive ? 'text-indigo-200' : 'text-slate-500 group-hover:text-slate-400'
                        }`}>
                          {description}
                        </span>
                      )}
                    </div>
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
        </div>

        {/* Footer: Version */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <span className="text-[11px] font-mono text-slate-500">MedChecklist v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
};
