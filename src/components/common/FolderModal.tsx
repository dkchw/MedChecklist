import React, { useState } from 'react';
import { Folder, Plus, Trash2, Edit2, Check, X, Users, ClipboardCheck } from 'lucide-react';
import { FolderItem } from '../../types/tab';
import { PatientEncounter } from '../../types/patient';

interface FolderModalProps {
  folders: FolderItem[];
  encounters: PatientEncounter[];
  onCreateFolder: (name: string, type: 'patient' | 'checklist' | 'template', color?: string) => void;
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
  const [newFolderType, setNewFolderType] = useState<'patient' | 'checklist' | 'template'>('patient');
  const [newFolderColor, setNewFolderColor] = useState(PRESET_FOLDER_COLORS[0]);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim(), newFolderType, newFolderColor);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clinical Folders & Organization
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Categorize patient rounds, checklists, and clinical protocols into organized folders
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-900 dark:text-slate-100">
          {/* Create New Folder Section */}
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Create New Folder
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. ICU Step-Down, Cardiology Rounds, Fast Track..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <select
                  value={newFolderType}
                  onChange={(e) => setNewFolderType(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="patient">Patients Folder</option>
                  <option value="checklist">Checklists Folder</option>
                  <option value="template">Templates Folder</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Color picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Color:</span>
                {PRESET_FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewFolderColor(c)}
                    className="w-5 h-5 rounded-full border border-white dark:border-slate-900 flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                  >
                    {newFolderColor === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-40 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Folder</span>
              </button>
            </div>
          </form>

          {/* Existing Folders List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Your Folders ({folders.length})
            </h3>

            {folders.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No folders created yet. Create folders above to organize patient encounters and checklists.
              </div>
            ) : (
              <div className="space-y-2">
                {folders.map((f) => {
                  const assignedCount = encounters.filter((e) => e.folderId === f.id && !e.isDeleted).length;
                  return (
                    <div
                      key={f.id}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: f.color || '#6366f1' }}
                        />

                        {editingFolderId === f.id ? (
                          <div className="flex items-center gap-1.5 flex-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(f.id)}
                              autoFocus
                              className="text-xs px-2 py-1 border border-indigo-400 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex-1 outline-none"
                            />
                            <button
                              onClick={() => handleSaveRename(f.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 truncate flex-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {f.name}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.2 rounded shrink-0">
                              {f.type}
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                              {assignedCount} patients
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartRename(f)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Rename Folder"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteFolder(f.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
