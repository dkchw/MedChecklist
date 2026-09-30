import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Folder,
  Plus,
  Search,
  FileText,
  Trash2,
  Edit3,
  Check,
  X,
  ExternalLink,
  Tag,
  Clock,
  Download,
  Link as LinkIcon,
  CheckSquare,
  Layers,
  Sparkles,
  Columns,
  Eye,
  Building2,
  GraduationCap,
  BookmarkCheck,
  HardDrive,
  Star,
} from 'lucide-react';
import { KnowledgeNote } from '../../types/knowledge';
import { Checklist, Folder as ChecklistFolder } from '../../types/checklist';
import { ClinicalTemplate } from '../../types/template';
import { FolderItem } from '../../types/tab';
import { db } from '../../db/db';
import { ChecklistReaderModal } from '../checklists/ChecklistReaderModal';
import { VaultSyncModal } from './VaultSyncModal';

interface KnowledgeHubViewProps {
  checklists: Checklist[];
  templates: ClinicalTemplate[];
  folders: FolderItem[];
  onOpenChecklistReader?: (checklist: Checklist) => void;
}

export const KnowledgeHubView: React.FC<KnowledgeHubViewProps> = ({
  checklists,
  templates,
  folders,
}) => {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderFacility, setNewFolderFacility] = useState('');
  const [activeChecklistReader, setActiveChecklistReader] = useState<Checklist | null>(null);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);

  // Load knowledge notes from Dexie
  const loadNotes = async () => {
    try {
      const allNotes = await db.knowledgeNotes.filter((n) => !n.isDeleted).reverse().sortBy('updatedAt');
      setNotes(allNotes);
      if (allNotes.length > 0 && !selectedNoteId) {
        setSelectedNoteId(allNotes[0].id);
      }
    } catch (e) {
      console.error('Error loading knowledge notes:', e);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  // Save changes to note
  const handleUpdateNote = async (updated: Partial<KnowledgeNote>) => {
    if (!selectedNote) return;
    const newNote: KnowledgeNote = {
      ...selectedNote,
      ...updated,
      updatedAt: Date.now(),
    };

    setNotes((prev) => prev.map((n) => (n.id === newNote.id ? newNote : n)));
    await db.knowledgeNotes.put(newNote);
  };

  // Create new note
  const handleCreateNote = async () => {
    const newNote: KnowledgeNote = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: 'Untitled Clinical Note',
      content: `# New Clinical Study Note

## Clinical Topic / Protocol
Write your lecture or bedside study notes here.

### Key Points
- 
- 

### Linked Checklists & Protocols
`,
      folderId: selectedFolderFilter !== 'all' ? selectedFolderFilter : undefined,
      tags: ['study'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.knowledgeNotes.put(newNote);
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this study note?')) return;
    await db.knowledgeNotes.update(noteId, { isDeleted: true, updatedAt: Date.now() });
    const remaining = notes.filter((n) => n.id !== noteId);
    setNotes(remaining);
    if (selectedNoteId === noteId) {
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Toggle pin note
  const handleTogglePinNote = async (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const updated = { ...target, isPinned: !target.isPinned, updatedAt: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    await db.knowledgeNotes.put(updated);
  };

  // Export note as Markdown (.md)
  const handleExportMarkdown = (note: KnowledgeNote) => {
    const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Insert formatting into textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('knowledge-textarea') as HTMLTextAreaElement | null;
    if (!textarea || !selectedNote) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedNote.content;
    const selected = text.substring(start, end);
    const replacement = prefix + selected + suffix;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateNote({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  // Link a checklist or template into note (Obsidian/Zettlr wikilink format [[Title]])
  const handleInsertLink = (item: { type: 'checklist' | 'template'; id: string; title: string }) => {
    const wikilink = `\n- [[${item.title}]]\n`;
    if (!selectedNote) return;

    const newLinkedChecklists = selectedNote.linkedChecklistIds || [];
    if (item.type === 'checklist' && !newLinkedChecklists.includes(item.id)) {
      newLinkedChecklists.push(item.id);
    }

    const newContent = selectedNote.content + wikilink;
    handleUpdateNote({
      content: newContent,
      linkedChecklistIds: newLinkedChecklists,
    });
    setShowLinkModal(false);
  };

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (selectedFolderFilter !== 'all' && n.folderId !== selectedFolderFilter && n.facility !== selectedFolderFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }
    return true;
  });

  // Extract unique facilities
  const facilities = Array.from(new Set(folders.filter((f) => f.type === 'facility').map((f) => f.name)));

  // Render markdown parser with interactive checklist badges
  const renderMarkdownPreview = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed select-text">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('# ')) {
            return (
              <h1
                key={idx}
                className="text-lg sm:text-xl font-bold text-slate-950 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5 mt-4 first:mt-0"
              >
                {line.substring(2)}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2
                key={idx}
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-1 mt-3"
              >
                {line.substring(3)}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mt-2">
                {line.substring(4)}
              </h3>
            );
          }

          // Blockquote
          if (line.startsWith('> ')) {
            return (
              <div
                key={idx}
                className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-500 rounded-r-xl text-slate-700 dark:text-slate-300 font-medium italic my-2"
              >
                {line.substring(2)}
              </div>
            );
          }

          // Obsidian / Zettlr / markdown-oxide Wikilinks [[Title]] or [[Title|Alias]]
          const wikiMatch = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
          if (wikiMatch) {
            const rawTitle = wikiMatch[1].trim();
            const displayName = wikiMatch[2]?.trim() || rawTitle;

            const targetChk = checklists.find(
              (c) =>
                c.title.toLowerCase() === rawTitle.toLowerCase() ||
                rawTitle.toLowerCase().includes(c.title.toLowerCase()) ||
                c.title.toLowerCase().includes(rawTitle.toLowerCase())
            );
            const targetTmpl = templates.find(
              (t) =>
                t.title.toLowerCase() === rawTitle.toLowerCase() ||
                rawTitle.toLowerCase().includes(t.title.toLowerCase()) ||
                t.title.toLowerCase().includes(rawTitle.toLowerCase())
            );
            const targetNote = notes.find(
              (n) =>
                n.title.toLowerCase() === rawTitle.toLowerCase() ||
                rawTitle.toLowerCase().includes(n.title.toLowerCase()) ||
                n.title.toLowerCase().includes(rawTitle.toLowerCase())
            );

            if (targetChk) {
              return (
                <div
                  key={idx}
                  className="my-2 p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Protocol Wikilink
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {displayName}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveChecklistReader(targetChk)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                  >
                    <span>Practice / Study</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              );
            }

            if (targetTmpl) {
              return (
                <div
                  key={idx}
                  className="my-2 p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Template Bundle Wikilink
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {displayName}
                      </h4>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    {targetTmpl.checklistIds?.length || 0} Bundled
                  </span>
                </div>
              );
            }

            if (targetNote) {
              return (
                <div key={idx} className="my-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedNoteId(targetNote.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>[[{displayName}]]</span>
                  </button>
                </div>
              );
            }
          }

          // Interactive Checklist Link [Checklist: Name](checklist://id)
          const chkMatch = line.match(/\[Checklist:\s*([^\]]+)\]\(checklist:\/\/([^\)]+)\)/i);
          if (chkMatch) {
            const [, title, id] = chkMatch;
            const targetChk = checklists.find((c) => c.id === id);
            return (
              <div
                key={idx}
                className="my-2 p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Linked Protocol Checklist
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {title}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => targetChk && setActiveChecklistReader(targetChk)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <span>Practice / Study</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            );
          }

          // Interactive Template Link [Template: Name](template://id)
          const tmplMatch = line.match(/\[Template:\s*([^\]]+)\]\(template:\/\/([^\)]+)\)/i);
          if (tmplMatch) {
            const [, title, id] = tmplMatch;
            const targetTmpl = templates.find((t) => t.id === id);
            return (
              <div
                key={idx}
                className="my-2 p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Linked Clinical Template Bundle
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {title}
                    </h4>
                  </div>
                </div>

                {targetTmpl && (
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    {targetTmpl.checklistIds?.length || 0} Bundled Checklists
                  </span>
                )}
              </div>
            );
          }

          // Checkbox Items
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
            const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
            const text = line.substring(6);
            return (
              <div key={idx} className="flex items-center gap-2 py-0.5 pl-2">
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  className="rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                />
                <span
                  className={
                    isChecked
                      ? 'line-through text-slate-400 dark:text-slate-500 font-medium'
                      : 'text-slate-800 dark:text-slate-200 font-medium'
                  }
                >
                  {text}
                </span>
              </div>
            );
          }

          // Bullet Items
          if (line.startsWith('- ')) {
            return (
              <div key={idx} className="flex items-start gap-2 py-0.5 pl-2">
                <span className="text-indigo-500 font-bold">•</span>
                <span>{line.substring(2)}</span>
              </div>
            );
          }

          // Horizontal rule
          if (line.trim() === '---') {
            return <hr key={idx} className="border-slate-200 dark:border-slate-800 my-3" />;
          }

          // Standard paragraph
          return line.trim() ? (
            <p key={idx} className="leading-relaxed">
              {line}
            </p>
          ) : (
            <div key={idx} className="h-2" />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 flex-1 flex flex-col h-[calc(100vh-68px)]">
      {/* Knowledge Hub Header */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Knowledge Hub & Clinical Notes
              </h1>
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Markdown & Protocols
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personal clinical documentation, study lecture notes, protocol references, and interactive checklists.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVaultModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            title="Sync with Desktop Obsidian Vault, Zettlr, and markdown-oxide"
          >
            <HardDrive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Vault Sync</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Layout: File Manager (Left) + Markdown Workspace (Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm overflow-hidden">
        {/* Left Column: File Manager & Note Browser */}
        <div className="md:col-span-4 lg:col-span-3.5 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pr-0 md:pr-3 min-h-0">
          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clinical notes & tags..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Folder Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 text-xs border-b border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setSelectedFolderFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                selectedFolderFilter === 'all'
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Notes ({notes.length})
            </button>

            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                  selectedFolderFilter === f.id
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <Folder className="w-2.5 h-2.5 text-indigo-400" />
                <span>{f.name}</span>
              </button>
            ))}
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-1.5 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold">No notes found</p>
                <p className="text-[11px]">Click "+ New Note" to start writing.</p>
              </div>
            ) : (
              <>
                {/* Pinned Notes Section */}
                {filteredNotes.some((n) => n.isPinned) && (
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>Pinned Notes ({filteredNotes.filter((n) => n.isPinned).length})</span>
                    </div>
                    {filteredNotes
                      .filter((n) => n.isPinned)
                      .map((note) => {
                        const isSelected = selectedNote?.id === note.id;
                        return (
                          <div
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs'
                                : 'bg-white dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={`text-xs font-bold truncate ${
                                  isSelected
                                    ? 'text-indigo-950 dark:text-white'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {note.title}
                              </h3>
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePinNote(note.id);
                                  }}
                                  className="p-1 text-amber-500 hover:text-amber-400 rounded transition-colors"
                                  title="Unpin Note"
                                >
                                  <Star className="w-3 h-3 fill-amber-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNote(note.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                  title="Delete Note"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                              {note.content.replace(/[#*`\->]/g, '').trim()}
                            </p>

                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(note.updatedAt).toLocaleDateString()}
                              </span>
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {note.tags.slice(0, 2).map((t) => (
                                    <span
                                      key={t}
                                      className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* All / Unpinned Notes Section */}
                <div className="space-y-1.5">
                  {filteredNotes.some((n) => n.isPinned) && (
                    <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      All Notes ({filteredNotes.filter((n) => !n.isPinned).length})
                    </div>
                  )}
                  {filteredNotes
                    .filter((n) => !filteredNotes.some((item) => item.isPinned) || !n.isPinned)
                    .map((note) => {
                      const isSelected = selectedNote?.id === note.id;
                      return (
                        <div
                          key={note.id}
                          onClick={() => setSelectedNoteId(note.id)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-xs'
                              : 'bg-white dark:bg-slate-850/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className={`text-xs font-bold truncate ${
                                isSelected
                                  ? 'text-indigo-950 dark:text-white'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {note.title}
                            </h3>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePinNote(note.id);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-500 rounded transition-colors"
                                title="Pin Note"
                              >
                                <Star className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNote(note.id);
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                title="Delete Note"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                            {note.content.replace(/[#*`\->]/g, '').trim()}
                          </p>

                          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </span>
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {note.tags.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Note Editor & Preview Workspace */}
        {selectedNote ? (
          <div className="md:col-span-8 lg:col-span-8.5 flex flex-col min-h-0 pl-0 md:pl-2">
            {/* Note Meta Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-3 flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote({ title: e.target.value })}
                  placeholder="Note Title"
                  className="text-base sm:text-lg font-bold w-full bg-transparent border-0 focus:outline-hidden text-slate-900 dark:text-slate-100 p-0"
                />

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  {/* Folder / Ward Assignment */}
                  <div className="flex items-center gap-1">
                    <Folder className="w-3 h-3 text-indigo-500" />
                    <select
                      value={selectedNote.folderId || ''}
                      onChange={(e) => handleUpdateNote({ folderId: e.target.value || undefined })}
                      className="bg-slate-100 dark:bg-slate-800 border-0 rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-1.5 py-0.5 focus:outline-hidden"
                    >
                      <option value="">No Folder (Unassigned)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <span>•</span>
                  <span>Last edited {new Date(selectedNote.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* View Mode Controls & Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Mode Selector */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                      viewMode === 'edit'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('split')}
                    className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                      viewMode === 'split'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    <span>Split</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('preview')}
                    className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                      viewMode === 'preview'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>

                {/* Link Checklist Button */}
                <button
                  type="button"
                  onClick={() => setShowLinkModal(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors"
                  title="Link Clinical Protocol Checklist or Template"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Link Protocol</span>
                </button>

                {/* Pin Note */}
                <button
                  type="button"
                  onClick={() => handleTogglePinNote(selectedNote.id)}
                  className={`p-1.5 rounded-xl transition-colors border ${
                    selectedNote.isPinned
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 border-amber-300 dark:border-amber-700'
                      : 'text-slate-400 hover:text-amber-500 border-slate-200 dark:border-slate-700'
                  }`}
                  title={selectedNote.isPinned ? 'Unpin Note' : 'Pin Note'}
                >
                  <Star className={`w-3.5 h-3.5 ${selectedNote.isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>

                {/* Export Markdown */}
                <button
                  type="button"
                  onClick={() => handleExportMarkdown(selectedNote)}
                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                  title="Export Markdown (.md)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Markdown Toolbar (Shown in edit and split modes) */}
            {viewMode !== 'preview' && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-2 overflow-x-auto text-xs">
                <button
                  type="button"
                  onClick={() => insertFormatting('# ')}
                  className="px-2 py-0.5 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('## ')}
                  className="px-2 py-0.5 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('### ')}
                  className="px-2 py-0.5 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                  title="Heading 3"
                >
                  H3
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**')}
                  className="px-2 py-0.5 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*')}
                  className="px-2 py-0.5 italic hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- [ ] ')}
                  className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 flex items-center gap-1"
                  title="Checklist item"
                >
                  <CheckSquare className="w-3 h-3 text-emerald-500" />
                  <span>Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('> ')}
                  className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                  title="Quote"
                >
                  Quote
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- ')}
                  className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                  title="Bullet list"
                >
                  List
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => setShowLinkModal(true)}
                  className="px-2 py-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1"
                  title="Insert Protocol Checklist Reference"
                >
                  <Plus className="w-3 h-3" />
                  <span>Checklist Link</span>
                </button>
              </div>
            )}

            {/* Note Editor / Preview Split View */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
              {/* Textarea Editor */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className={`flex flex-col h-full ${viewMode === 'edit' ? 'col-span-2' : ''}`}>
                  <textarea
                    id="knowledge-textarea"
                    value={selectedNote.content}
                    onChange={(e) => handleUpdateNote({ content: e.target.value })}
                    placeholder="Type Markdown notes here..."
                    className="w-full flex-1 p-4 font-mono text-xs leading-relaxed bg-slate-50/50 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800 rounded-2xl resize-none focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 select-text"
                  />
                </div>
              )}

              {/* Rendered Preview */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div
                  className={`flex flex-col h-full p-4 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl select-text ${
                    viewMode === 'preview' ? 'col-span-2' : ''
                  }`}
                >
                  {renderMarkdownPreview(selectedNote.content)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="md:col-span-8 lg:col-span-8.5 flex items-center justify-center text-slate-400">
            <p>Select a note from the left sidebar or create a new one.</p>
          </div>
        )}
      </div>

      {/* Link Protocol Picker Modal */}
      {showLinkModal && (
        <div
          onClick={() => setShowLinkModal(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Link Protocol Checklist or Template
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select a checklist or template bundle to embed an interactive launcher badge into your study notes:
            </p>

            {/* Checklists List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Checklists ({checklists.length})
              </h4>
              {checklists.map((chk) => (
                <div
                  key={chk.id}
                  onClick={() => handleInsertLink({ type: 'checklist', id: chk.id, title: chk.title })}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {chk.title}
                    </span>
                  </div>
                  {chk.category && (
                    <span className="text-[10px] text-slate-400 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {chk.category}
                    </span>
                  )}
                </div>
              ))}

              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-4">
                Clinical Templates ({templates.length})
              </h4>
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleInsertLink({ type: 'template', id: tmpl.id, title: tmpl.title })}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {tmpl.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Linked Interactive Checklist Reader Modal */}
      {activeChecklistReader && (
        <ChecklistReaderModal
          checklist={activeChecklistReader}
          onClose={() => setActiveChecklistReader(null)}
        />
      )}

      {/* Desktop Obsidian / Zettlr / Markdown-Oxide Vault Sync Modal */}
      {showVaultModal && (
        <VaultSyncModal
          checklists={checklists}
          templates={templates}
          notes={notes}
          folders={folders}
          onRefreshNotes={loadNotes}
          onClose={() => setShowVaultModal(false)}
        />
      )}
    </div>
  );
};
