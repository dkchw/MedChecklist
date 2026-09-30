import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderPlus,
  Building2,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  Search,
  Plus,
  Trash2,
  Edit2,
  LayoutList,
  LayoutGrid,
  CheckCircle2,
  Archive,
  User,
  CheckSquare,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowRight,
  MoreVertical,
} from 'lucide-react';
import { FolderItem } from '../../types/tab';

export interface FileItem {
  id: string;
  title: string;
  subtitle?: string;
  facility?: string;
  ward?: string;
  folderId?: string;
  bedNumber?: string;
  status?: string;
  tags?: string[];
  isPinned?: boolean;
  updatedAt: number;
  metadata?: string;
  rawItem: any;
}

interface ClinicalFileManagerProps {
  title: string;
  mode: 'encounters' | 'checklists' | 'templates' | 'knowledge';
  items: FileItem[];
  folders: FolderItem[];
  selectedFolderId?: string;
  selectedFacility?: string;
  selectedWard?: string;
  onSelectFolder?: (folderId: string | undefined, facility?: string, ward?: string) => void;
  onOpenItem: (item: FileItem) => void;
  onNewItem: (facility?: string, ward?: string) => void;
  onCreateFolder?: (
    name: string,
    type: FolderItem['type'],
    color?: string,
    parentId?: string,
    facilityName?: string,
    wardName?: string
  ) => void;
  onRenameFolder?: (id: string, newName: string) => void;
  onDeleteFolder?: (id: string) => void;
  onTogglePinItem?: (item: FileItem) => void;
  onDeleteItem?: (item: FileItem) => void;
  statusFilter?: string;
  onChangeStatusFilter?: (status: string) => void;
  statusOptions?: { id: string; label: string; count?: number }[];
}

export const ClinicalFileManager: React.FC<ClinicalFileManagerProps> = ({
  title,
  mode,
  items,
  folders,
  selectedFolderId,
  selectedFacility: propFacility,
  selectedWard: propWard,
  onSelectFolder,
  onOpenItem,
  onNewItem,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onTogglePinItem,
  onDeleteItem,
  statusFilter,
  onChangeStatusFilter,
  statusOptions,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFacility, setIsAddingFacility] = useState(false);
  const [isAddingWardForFacilityId, setIsAddingWardForFacilityId] = useState<string | null>(null);
  const [newWardName, setNewWardName] = useState('');

  // Local folder selection
  const [currentFacility, setCurrentFacility] = useState<string | undefined>(propFacility);
  const [currentWard, setCurrentWard] = useState<string | undefined>(propWard);

  // Extract all unique facilities from both folders and items
  const allFacilities = useMemo(() => {
    const fromFolders = folders.filter((f) => f.type === 'facility').map((f) => ({
      id: f.id,
      name: f.name,
    }));
    const fromItems = Array.from(new Set(items.map((i) => i.facility).filter(Boolean) as string[])).map((name) => ({
      id: `fac-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
    }));

    const map = new Map<string, { id: string; name: string }>();
    for (const fac of [...fromFolders, ...fromItems]) {
      if (!map.has(fac.name)) {
        map.set(fac.name, fac);
      }
    }
    return Array.from(map.values());
  }, [folders, items]);

  // Extract wards for each facility
  const getWardsForFacility = (facName: string) => {
    const fromFolders = folders
      .filter((f) => f.type === 'ward' && (f.facilityName === facName || f.parentId === facName))
      .map((f) => f.name);
    const fromItems = Array.from(
      new Set(
        items
          .filter((i) => i.facility === facName && i.ward)
          .map((i) => i.ward!)
      )
    );
    return Array.from(new Set([...fromFolders, ...fromItems]));
  };

  // Pinned items
  const pinnedItems = useMemo(() => {
    return items.filter((i) => i.isPinned);
  }, [items]);

  // Recent items (last 5, excluding pinned)
  const recentItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 6);
  }, [items]);

  // Filtered explorer items
  const explorerItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter && item.status && item.status !== statusFilter) {
        return false;
      }
      // Hierarchy filter
      if (currentFacility && item.facility && item.facility !== currentFacility) {
        return false;
      }
      if (currentWard && item.ward && item.ward !== currentWard) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSubtitle = (item.subtitle || '').toLowerCase().includes(q);
        const matchFacility = (item.facility || '').toLowerCase().includes(q);
        const matchWard = (item.ward || '').toLowerCase().includes(q);
        const matchBed = (item.bedNumber || '').toLowerCase().includes(q);
        const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchSubtitle && !matchFacility && !matchWard && !matchBed && !matchTags) {
          return false;
        }
      }
      return true;
    });
  }, [items, statusFilter, currentFacility, currentWard, searchQuery]);

  const handleSelectFacility = (facName?: string) => {
    setCurrentFacility(facName);
    setCurrentWard(undefined);
    onSelectFolder?.(undefined, facName, undefined);
  };

  const handleSelectWard = (facName: string, wardName?: string) => {
    setCurrentFacility(facName);
    setCurrentWard(wardName);
    onSelectFolder?.(undefined, facName, wardName);
  };

  const handleCreateFacilitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !onCreateFolder) return;
    onCreateFolder(newFolderName.trim(), 'facility');
    setCurrentFacility(newFolderName.trim());
    setNewFolderName('');
    setIsAddingFacility(false);
  };

  const handleCreateWardSubmit = (e: React.FormEvent, facName: string) => {
    e.preventDefault();
    if (!newWardName.trim() || !onCreateFolder) return;
    const facObj = allFacilities.find((f) => f.name === facName);
    onCreateFolder(newWardName.trim(), 'ward', undefined, facObj?.id, facName);
    setCurrentFacility(facName);
    setCurrentWard(newWardName.trim());
    setNewWardName('');
    setIsAddingWardForFacilityId(null);
  };

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return 'Recently';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getItemIcon = () => {
    switch (mode) {
      case 'encounters':
        return <User className="w-4 h-4 text-indigo-500" />;
      case 'checklists':
        return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case 'templates':
        return <Layers className="w-4 h-4 text-amber-500" />;
      case 'knowledge':
        return <GraduationCap className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
      {/* 1. TOP QUICK-ACCESS SECTION: PINNED & RECENT ITEMS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pinned Card Deck */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Pinned Items ({pinnedItems.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              Quick Bedside Access
            </span>
          </div>

          {pinnedItems.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-850/50">
              <p>No pinned items yet.</p>
              <p className="text-[10px] mt-0.5">Click ⭐ on any item in the file explorer to pin it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pinnedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenItem(item)}
                  className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all cursor-pointer group flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getItemIcon()}
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.bedNumber ? `Bed ${item.bedNumber} • ` : ''}
                      {item.facility || item.ward || item.subtitle || 'Active'}
                    </div>
                  </div>

                  {onTogglePinItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinItem(item);
                      }}
                      className="p-1 text-amber-400 hover:text-slate-400 transition-colors cursor-pointer"
                      title="Unpin"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Items Strip */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Recent Activity</span>
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              Auto-saved
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {recentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenItem(item)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer max-w-[220px]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">{item.title}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                  {formatRelativeTime(item.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN TECHNICAL FILE EXPLORER WORKSPACE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        {/* Left Sidebar: Folder & Hierarchy Tree */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            {/* Tree Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-cyan-500" />
                <span>Directories</span>
              </span>

              {onCreateFolder && (
                <button
                  type="button"
                  onClick={() => setIsAddingFacility(!isAddingFacility)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Add New Facility / Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
                </button>
              )}
            </div>

            {/* Inline Add Facility Form */}
            {isAddingFacility && (
              <form onSubmit={handleCreateFacilitySubmit} className="space-y-1.5 p-2 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800">
                <input
                  type="text"
                  autoFocus
                  placeholder="Facility Name e.g. St. Jude"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none text-slate-900 dark:text-slate-100"
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingFacility(false)}
                    className="px-2 py-0.5 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-0.5 text-[10px] bg-indigo-600 text-white rounded font-bold"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Folder Hierarchy Tree List */}
            <div className="space-y-1 text-xs">
              {/* All Items Root */}
              <button
                type="button"
                onClick={() => handleSelectFacility(undefined)}
                className={`w-full px-2.5 py-1.5 rounded-xl font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  !currentFacility && !currentWard
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="w-3.5 h-3.5" />
                  <span className="truncate">All {title}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  !currentFacility && !currentWard ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {items.length}
                </span>
              </button>

              {/* Facilities / Folders */}
              {allFacilities.map((fac) => {
                const wards = getWardsForFacility(fac.name);
                const isSelected = currentFacility === fac.name && !currentWard;
                const isCollapsed = collapsedFolders[fac.id];
                const facItemCount = items.filter((i) => i.facility === fac.name).length;

                return (
                  <div key={fac.id} className="space-y-0.5">
                    <div
                      className={`w-full px-2 py-1.5 rounded-xl font-medium flex items-center justify-between transition-colors group cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div
                        className="flex items-center gap-1.5 min-w-0 flex-1"
                        onClick={() => handleSelectFacility(fac.name)}
                      >
                        <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate text-xs font-semibold">{fac.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono px-1 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {facItemCount}
                        </span>

                        {wards.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollapsedFolders((prev) => ({ ...prev, [fac.id]: !prev[fac.id] }));
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          >
                            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {onCreateFolder && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAddingWardForFacilityId(fac.id);
                            }}
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-opacity"
                            title="Add Ward inside this Facility"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Add Ward Form */}
                    {isAddingWardForFacilityId === fac.id && (
                      <form
                        onSubmit={(e) => handleCreateWardSubmit(e, fac.name)}
                        className="ml-4 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1"
                      >
                        <input
                          type="text"
                          autoFocus
                          placeholder="Ward/Unit Name..."
                          value={newWardName}
                          onChange={(e) => setNewWardName(e.target.value)}
                          className="w-full text-xs px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                        />
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingWardForFacilityId(null)}
                            className="text-[10px] text-slate-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Nested Wards under Facility */}
                    {!isCollapsed && (
                      <div className="ml-3 pl-2 border-l border-slate-200 dark:border-slate-800 space-y-0.5">
                        {wards.map((ward) => {
                          const isWardSelected = currentFacility === fac.name && currentWard === ward;
                          const wardItemCount = items.filter(
                            (i) => i.facility === fac.name && i.ward === ward
                          ).length;

                          return (
                            <button
                              key={ward}
                              type="button"
                              onClick={() => handleSelectWard(fac.name, ward)}
                              className={`w-full px-2 py-1 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isWardSelected
                                  ? 'bg-indigo-600 text-white font-semibold'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                <span className="truncate">{ward}</span>
                              </div>
                              <span className="text-[10px] font-mono opacity-80">{wardItemCount}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Technical Details Badge at bottom of sidebar */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{items.length} Total Records</span>
            <span>Vault Sync OK</span>
          </div>
        </div>

        {/* Right Main Explorer: Breadcrumbs, Toolbar & Items Table/Grid */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
          {/* Breadcrumbs & Primary Actions Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-850/40">
            {/* Breadcrumb Path */}
            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 font-mono truncate">
              <button
                type="button"
                onClick={() => handleSelectFacility(undefined)}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Root</span>
              </button>
              {currentFacility && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <button
                    type="button"
                    onClick={() => handleSelectFacility(currentFacility)}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold truncate cursor-pointer"
                  >
                    {currentFacility}
                  </button>
                </>
              )}
              {currentWard && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-900 dark:text-slate-100 font-bold truncate">
                    {currentWard}
                  </span>
                </>
              )}
            </div>

            {/* Action Buttons: New Item & View Mode */}
            <div className="flex items-center gap-2">
              {/* Status Filter Pills (e.g. Active vs Archived) */}
              {statusOptions && statusOptions.length > 0 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeStatusFilter?.(opt.id)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                        statusFilter === opt.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-950'
                      }`}
                    >
                      {opt.label} {opt.count !== undefined ? `(${opt.count})` : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Technical Table View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* + New Item Primary Button */}
              <button
                type="button"
                onClick={() => onNewItem(currentFacility, currentWard)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {mode === 'encounters'
                    ? 'New Patient'
                    : mode === 'checklists'
                    ? 'New Checklist'
                    : mode === 'templates'
                    ? 'New Template'
                    : 'New Note'}
                </span>
              </button>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder={`Filter in ${currentWard || currentFacility || 'all folders'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Item List / Table / Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {explorerItems.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <Folder className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No records found in this folder
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {currentFacility
                      ? `Create an item assigned to ${currentFacility}${currentWard ? ` (${currentWard})` : ''}.`
                      : 'Create your first clinical record to get started.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNewItem(currentFacility, currentWard)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Item in this Folder</span>
                </button>
              </div>
            ) : viewMode === 'table' ? (
              /* Technical Table View */
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Title / Identifier</th>
                      <th className="py-2.5 px-3 hidden sm:table-cell">Facility & Ward</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Details / Tags</th>
                      <th className="py-2.5 px-3 w-28">Modified</th>
                      <th className="py-2.5 px-3 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {explorerItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => onOpenItem(item)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors group"
                      >
                        {/* Pin Star */}
                        <td
                          className="py-2.5 px-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePinItem?.(item);
                          }}
                        >
                          <Star
                            className={`w-3.5 h-3.5 transition-colors ${
                              item.isPinned
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                            }`}
                          />
                        </td>

                        {/* Title & Bed */}
                        <td className="py-2.5 px-3 min-w-0">
                          <div className="flex items-center gap-2">
                            {getItemIcon()}
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                                {item.title}
                              </span>
                              {item.subtitle && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                            {item.bedNumber && (
                              <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800 shrink-0">
                                Bed {item.bedNumber}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Facility & Ward */}
                        <td className="py-2.5 px-3 hidden sm:table-cell text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                          {item.facility || item.ward ? (
                            <span className="truncate">
                              {item.facility ? `${item.facility}` : ''}
                              {item.facility && item.ward ? ' / ' : ''}
                              {item.ward ? `${item.ward}` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Details / Tags */}
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          <div className="flex items-center gap-1 flex-wrap">
                            {item.metadata && (
                              <span className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {item.metadata}
                              </span>
                            )}
                            {(item.tags || []).slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Last Modified */}
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {formatRelativeTime(item.updatedAt)}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-2.5 px-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenItem(item)}
                              className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                              title="Open"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteItem && (
                              <button
                                type="button"
                                onClick={() => onDeleteItem(item)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Card Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {explorerItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenItem(item)}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {getItemIcon()}
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </span>
                        </div>
                        {onTogglePinItem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePinItem(item);
                            }}
                            className="p-0.5 text-slate-300 dark:text-slate-600 hover:text-amber-400"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                item.isPinned ? 'text-amber-400 fill-amber-400' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                          {item.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="truncate">
                        {item.bedNumber ? `Bed ${item.bedNumber}` : item.ward || item.facility || ''}
                      </span>
                      <span>{formatRelativeTime(item.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
