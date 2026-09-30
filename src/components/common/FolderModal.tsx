import React, { useState } from 'react';
import {
  Folder,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Users,
  ClipboardCheck,
  Building2,
  Layers,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { FolderItem } from '../../types/tab';
import { PatientEncounter } from '../../types/patient';

interface FolderModalProps {
  folders: FolderItem[];
  encounters: PatientEncounter[];
  onCreateFolder: (
    name: string,
    type: 'facility' | 'ward' | 'specialty' | 'patient' | 'checklist' | 'template' | 'knowledge',
    color?: string,
    parentId?: string,
    facilityName?: string,
    wardName?: string
  ) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onAssignEncounterToFolder: (encounterId: string, folderId?: string) => void;
  onClose: () => void;
}

const PRESET_FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
];

export const FolderModal: React.FC<FolderModalProps> = ({
  folders,
  encounters,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onAssignEncounterToFolder,
  onClose,
}) => {
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderType, setNewFolderType] = useState<
    'facility' | 'ward' | 'specialty' | 'patient' | 'checklist' | 'template' | 'knowledge'
  >('facility');
  const [parentFacilityId, setParentFacilityId] = useState<string>('');
  const [newFolderColor, setNewFolderColor] = useState(PRESET_FOLDER_COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [collapsedFacilities, setCollapsedFacilities] = useState<{ [id: string]: boolean }>({});

  const facilities = folders.filter((f) => f.type === 'facility');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const parentFacility = facilities.find((f) => f.id === parentFacilityId);

    onCreateFolder(
      newFolderName.trim(),
      newFolderType,
      newFolderColor,
      newFolderType === 'ward' ? parentFacilityId : undefined,
      newFolderType === 'ward' ? parentFacility?.name : undefined
    );
    setNewFolderName('');
  };

  const handleStartRename = (f: FolderItem) => {
    setEditingFolderId(f.id);
    setEditName(f.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      onRenameFolder(id, editName.trim());
    }
    setEditingFolderId(null);
  };

  const toggleFacilityCollapse = (id: string) => {
    setCollapsedFacilities((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Group wards under their parent facility
  const getWardsForFacility = (facilityId: string) => {
    return folders.filter((f) => f.type === 'ward' && f.parentId === facilityId);
  };

  // Other non-facility, non-ward folders
  const generalFolders = folders.filter((f) => f.type !== 'facility' && f.type !== 'ward');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Unified Clinical Folders System
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hierarchical Facility (Hospital/Clinic) & Ward organization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-900 dark:text-slate-100 text-xs">
          {/* Create New Folder Section */}
          <form
            onSubmit={handleCreate}
            className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Create New Folder / Unit
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder={
                    newFolderType === 'facility'
                      ? 'e.g. St. Jude Medical Center, Metro Clinic...'
                      : newFolderType === 'ward'
                      ? 'e.g. ICU, Emergency, Cardiology Stepdown...'
                      : 'Folder name...'
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <select
                  value={newFolderType}
                  onChange={(e) => setNewFolderType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="facility">🏥 Facility (Hospital/Clinic)</option>
                  <option value="ward">📁 Ward / Department</option>
                  <option value="specialty">⭐ Specialty / Group</option>
                  <option value="knowledge">📚 Knowledge & Study</option>
                  <option value="checklist">📋 Checklists Folder</option>
                </select>
              </div>
            </div>

            {/* Parent Facility Selector (when creating a Ward) */}
            {newFolderType === 'ward' && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Parent Facility (Hospital / Clinic):
                </label>
                <select
                  value={parentFacilityId}
                  onChange={(e) => setParentFacilityId(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">No Facility (General Ward)</option>
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      🏥 {fac.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Folder Color and Submit */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 mr-1">Color:</span>
                {PRESET_FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewFolderColor(c)}
                    style={{ backgroundColor: c }}
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  >
                    {newFolderColor === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </button>
            </div>
          </form>

          {/* Hierarchical Folders List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Facility & Ward Hierarchy
            </h3>

            {facilities.length === 0 && generalFolders.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <Folder className="w-8 h-8 mx-auto mb-1.5 opacity-60" />
                <p>No folders created yet. Add a Facility folder above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Facility Tree Nodes */}
                {facilities.map((fac) => {
                  const wards = getWardsForFacility(fac.id);
                  const isCollapsed = !!collapsedFacilities[fac.id];
                  const facilityPatients = encounters.filter(
                    (e) => !e.isDeleted && e.facility === fac.name
                  );

                  return (
                    <div
                      key={fac.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-850 shadow-2xs"
                    >
                      {/* Facility Header Row */}
                      <div className="p-3 bg-slate-100/70 dark:bg-slate-800/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleFacilityCollapse(fac.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: fac.color || '#6366f1' }}
                          />

                          <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />

                          {editingFolderId === fac.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="px-2 py-0.5 text-xs border rounded bg-white dark:bg-slate-900 border-indigo-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(fac.id)}
                                className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {fac.name}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                            {facilityPatients.length} patients • {wards.length} wards
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartRename(fac)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Rename Facility"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteFolder(fac.id)}
                            className="p-1 text-slate-400 hover:text-red-500"
                            title="Delete Facility"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Nested Wards inside this Facility */}
                      {!isCollapsed && (
                        <div className="p-3 pl-8 space-y-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                          {wards.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">
                              No wards added to this facility yet.
                            </p>
                          ) : (
                            wards.map((ward) => {
                              const wardPatients = encounters.filter(
                                (e) =>
                                  !e.isDeleted &&
                                  (e.group === ward.name || e.folderId === ward.id)
                              );

                              return (
                                <div
                                  key={ward.id}
                                  className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Folder className="w-3.5 h-3.5 text-cyan-500" />
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {ward.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      ({wardPatients.length} patients)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartRename(ward)}
                                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                      title="Rename Ward"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteFolder(ward.id)}
                                      className="p-1 text-slate-400 hover:text-red-500"
                                      title="Delete Ward"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* General Folders */}
                {generalFolders.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Specialty & Protocol Folders
                    </h4>
                    <div className="space-y-1.5">
                      {generalFolders.map((f) => (
                        <div
                          key={f.id}
                          className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {f.name}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase">
                              ({f.type})
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartRename(f)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteFolder(f.id)}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
