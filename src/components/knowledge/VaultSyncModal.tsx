import React, { useState, useEffect } from 'react';
import {
  Folder,
  RefreshCw,
  Download,
  Upload,
  Check,
  AlertCircle,
  X,
  HardDrive,
  FileText,
  Layers,
  CheckSquare,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Checklist } from '../../types/checklist';
import { ClinicalTemplate } from '../../types/template';
import { KnowledgeNote, ChecklistRunSession } from '../../types/knowledge';
import { FolderItem } from '../../types/tab';
import { db } from '../../db/db';
import {
  isFileSystemAccessSupported,
  pickVaultDirectory,
  generateObsidianVaultFiles,
  writeVaultFilesToDirectory,
  importVaultFilesFromDirectory,
  downloadVaultZip,
  parseYamlFrontmatter,
  VaultSyncResult,
} from '../../utils/obsidianVaultSync';

interface VaultSyncModalProps {
  checklists: Checklist[];
  templates: ClinicalTemplate[];
  notes: KnowledgeNote[];
  folders: FolderItem[];
  onRefreshNotes: () => Promise<void>;
  onClose: () => void;
}

export const VaultSyncModal: React.FC<VaultSyncModalProps> = ({
  checklists,
  templates,
  notes,
  folders,
  onRefreshNotes,
  onClose,
}) => {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [vaultName, setVaultName] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<VaultSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const isFSSupported = isFileSystemAccessSupported();

  // Load saved vault metadata on mount
  useEffect(() => {
    db.settings.get('obsidian_vault_info').then((info) => {
      if (info && info.value) {
        setVaultName(info.value.name || '');
        if (info.value.lastSync) {
          setLastSyncResult(info.value.lastSync);
        }
      }
    });
  }, []);

  const executeSync = async (handle: FileSystemDirectoryHandle) => {
    setIsSyncing(true);
    setErrorMessage(null);
    setImportSummary(null);

    try {
      // 1. Fetch study runs from database
      const studyRuns = await db.checklistRuns.filter((r) => !r.isDeleted).toArray();

      // 2. Generate Obsidian vault structure
      const vaultFiles = generateObsidianVaultFiles({
        notes,
        checklists,
        templates,
        studyRuns,
        folders,
      });

      // 3. Write files to local desktop folder
      const filesWritten = await writeVaultFilesToDirectory(handle, vaultFiles);

      // 4. Import any new / updated .md notes from the directory
      const importRes = await importVaultFilesFromDirectory(handle);

      const result: VaultSyncResult = {
        filesWritten,
        vaultName: handle.name,
        notesCount: notes.length,
        protocolsCount: checklists.length,
        templatesCount: templates.length,
        studyRunsCount: studyRuns.length,
        timestamp: Date.now(),
      };

      setDirHandle(handle);
      setVaultName(handle.name);
      setLastSyncResult(result);

      if (importRes.notesImported > 0 || importRes.protocolsImported > 0) {
        setImportSummary(
          `Imported ${importRes.notesImported} notes & ${importRes.protocolsImported} protocols from desktop.`
        );
        await onRefreshNotes();
      }

      // Save in settings
      await db.settings.put({
        key: 'obsidian_vault_info',
        value: {
          name: handle.name,
          lastSync: result,
        },
      });
    } catch (err: any) {
      console.error('Vault sync error:', err);
      setErrorMessage(err.message || 'Failed to sync with local desktop directory.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePickDirectoryAndSync = async () => {
    try {
      const handle = await pickVaultDirectory();
      await executeSync(handle);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMessage(err.message || 'Error opening folder picker.');
      }
    }
  };

  const handleDownloadZip = async () => {
    try {
      const studyRuns = await db.checklistRuns.filter((r) => !r.isDeleted).toArray();
      const vaultFiles = generateObsidianVaultFiles({
        notes,
        checklists,
        templates,
        studyRuns,
        folders,
      });
      downloadVaultZip(vaultFiles, `MedChecklist-Vault-${new Date().toISOString().substring(0, 10)}.zip`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate vault ZIP archive.');
    }
  };

  const handleImportFolderInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsSyncing(true);
    let imported = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.md')) {
          const text = await file.text();
          const { meta } = parseYamlFrontmatter(text);
          const title = meta.title || file.name.replace(/\.md$/, '');

          const existing = await db.knowledgeNotes.where('title').equalsIgnoreCase(title).first();
          const noteObj: KnowledgeNote = {
            id: existing?.id || 'note-imp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            title,
            content: text,
            facility: meta.facility,
            ward: meta.ward,
            tags: meta.tags || ['imported'],
            createdAt: existing?.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
          await db.knowledgeNotes.put(noteObj);
          imported++;
        }
      }

      setImportSummary(`Successfully imported ${imported} markdown notes from folder.`);
      await onRefreshNotes();
    } catch (err: any) {
      setErrorMessage('Failed to read folder files: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Desktop Vault Sync</span>
                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-full">
                  Obsidian & Zettlr
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bidirectional synchronization with your local desktop notes & LSP workspace
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status Box */}
          <div className="p-4 rounded-xl border bg-slate-50/70 dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-purple-500" />
                <span>Connected Vault Folder:</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                {vaultName ? `/${vaultName}` : 'No Desktop Folder Connected'}
              </span>
            </div>

            {lastSyncResult ? (
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span>Last Synced:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(lastSyncResult.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Files on disk:</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {lastSyncResult.filesWritten} files ({lastSyncResult.notesCount} notes, {lastSyncResult.protocolsCount} protocols, {lastSyncResult.studyRunsCount} study runs)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Select your Obsidian vault folder or any desktop directory. All notes, protocols, and lesson runs will be formatted as clean Markdown with YAML frontmatter and [[wikilinks]].
              </p>
            )}
          </div>

          {/* Sync Success or Info Banner */}
          {importSummary && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{importSummary}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {isFSSupported ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handlePickDirectoryAndSync}
                  disabled={isSyncing}
                  className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{dirHandle ? 'Sync Now with Desktop Folder' : 'Connect Desktop Folder & Sync'}</span>
                </button>

                <button
                  onClick={handleDownloadZip}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5"
                  title="Download full Obsidian vault as a .zip archive"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Download .zip</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                  Direct folder access is restricted by your browser. You can export the vault as a ZIP or import a directory.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadZip}
                    className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Obsidian Vault (.zip)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Import Folder Option */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Import external Obsidian / Zettlr markdown files:
              </span>
              <label className="cursor-pointer px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import Folder</span>
                <input
                  type="file"
                  multiple
                  /* @ts-ignore */
                  webkitdirectory=""
                  directory=""
                  onChange={handleImportFolderInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Compatibility Details Accordion */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/70 dark:border-slate-800 text-xs space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Full Obsidian, Zettlr & Markdown-Oxide Compatibility:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              <li>
                <strong>Structured Directories:</strong> <code>Clinical Protocols/</code>, <code>Clinical Templates/</code>, <code>Study Sessions/</code>, and <code>Knowledge Notes/Facility/Ward/</code>.
              </li>
              <li>
                <strong>YAML Frontmatter:</strong> Every note features standard frontmatter (<code>title</code>, <code>tags</code>, <code>facility</code>, <code>ward</code>, <code>aliases</code>, <code>updated</code>).
              </li>
              <li>
                <strong>Wikilinks & MOC:</strong> Protocols and templates link seamlessly using <code>[[wikilinks]]</code> for instant graph mapping and autocompletion.
              </li>
              <li>
                <strong>LSP & Editor Ready:</strong> Generates <code>.obsidian/app.json</code> and <code>.moxide.toml</code> for instant zero-config LSP support in Neovim, VSCode, and Helix.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
