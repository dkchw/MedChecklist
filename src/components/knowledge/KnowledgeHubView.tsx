import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookOpen,
  Folder,
  FolderPlus,
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
  Upload,
  Copy,
  Link as LinkIcon,
  CheckSquare,
  Layers,
  Sparkles,
  Columns,
  Eye,
  GraduationCap,
  BookmarkCheck,
  HardDrive,
  Star,
  Quote,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutList,
  LayoutGrid,
  Printer,
  Info,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  MoreVertical,
  ArrowUpDown,
  Filter,
  Pen,
  Palette,
  ChevronsDown,
  ChevronsUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { KnowledgeNote } from '../../types/knowledge';
import { Checklist } from '../../types/checklist';
import { ClinicalTemplate } from '../../types/template';
import { FolderItem } from '../../types/tab';
import { db } from '../../db/db';
import { ChecklistReaderModal } from '../checklists/ChecklistReaderModal';
import { VaultSyncModal } from './VaultSyncModal';
import { CitationModal } from './CitationModal';
import { HandwritingInputBox } from '../pen/HandwritingInputBox';
import {
  BibliographyEntry,
  DEFAULT_CLINICAL_BIBLIOGRAPHY,
  extractCitationsFromMarkdown,
  formatAuthorShort,
  formatAuthorFull,
  formatBibliographyItem,
} from '../../utils/bibtexParser';

interface KnowledgeHubViewProps {
  checklists: Checklist[];
  templates: ClinicalTemplate[];
  folders: FolderItem[];
  onOpenChecklistReader?: (checklist: Checklist) => void;
  onCreateFolder?: (
    name: string,
    type: FolderItem['type'],
    color?: string,
    parentId?: string,
    facilityName?: string,
    wardName?: string
  ) => Promise<void> | void;
  onRenameFolder?: (id: string, newName: string) => Promise<void> | void;
  onDeleteFolder?: (id: string) => Promise<void> | void;
}

export const KnowledgeHubView: React.FC<KnowledgeHubViewProps> = ({
  checklists,
  templates,
  folders,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  // selectedNoteId is null by default so clinicians enter the full Knowledge File Explorer first
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  
  // File Explorer Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'title-desc' | 'created'>('updated');
  const [explorerViewMode, setExplorerViewMode] = useState<'grid' | 'table'>('grid');

  // Folder creation inline state (supports nested subfolders)
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6366f1');
  const [newFolderParentId, setNewFolderParentId] = useState<string>('');
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Record<string, boolean>>({});
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamedFolderName, setRenamedFolderName] = useState('');
  const [activeHandwritingTarget, setActiveHandwritingTarget] = useState<'content' | 'title' | null>(null);
  const [editingColorFolderId, setEditingColorFolderId] = useState<string | null>(null);
  const [isMobileFolderOpen, setIsMobileFolderOpen] = useState(false);

  // High-performance folder adjacency graph (O(1) child lookups)
  const folderHierarchy = useMemo(() => {
    const childrenMap = new Map<string, FolderItem[]>();
    const rootFolders: FolderItem[] = [];
    for (const f of folders) {
      if (f.parentId && folders.some((p) => p.id === f.parentId)) {
        const list = childrenMap.get(f.parentId) || [];
        list.push(f);
        childrenMap.set(f.parentId, list);
      } else {
        rootFolders.push(f);
      }
    }
    return { childrenMap, rootFolders };
  }, [folders]);

  // High-performance single-pass O(N) note counts
  const noteCounts = useMemo(() => {
    const folderCounts = new Map<string, number>();
    let totalNotes = 0;
    let starredCount = 0;
    let unassignedCount = 0;

    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      totalNotes++;
      if (n.isPinned) starredCount++;
      if (n.folderId) {
        folderCounts.set(n.folderId, (folderCounts.get(n.folderId) || 0) + 1);
      } else {
        unassignedCount++;
      }
    }
    return { folderCounts, totalNotes, starredCount, unassignedCount };
  }, [notes]);

  // Fast O(V) iterative descendant folder discovery
  const getDescendantFolderIds = useCallback(
    (folderId: string): string[] => {
      const descendants: string[] = [];
      const queue = [folderId];
      while (queue.length > 0) {
        const curr = queue.shift()!;
        const children = folderHierarchy.childrenMap.get(curr) || [];
        for (const child of children) {
          descendants.push(child.id);
          queue.push(child.id);
        }
      }
      return descendants;
    },
    [folderHierarchy.childrenMap]
  );

  // Fast cumulative count calculation
  const getCumulativeCount = useCallback(
    (folderId: string, folderName?: string): number => {
      let count = noteCounts.folderCounts.get(folderId) || 0;
      const descendants = getDescendantFolderIds(folderId);
      for (const dId of descendants) {
        count += noteCounts.folderCounts.get(dId) || 0;
      }
      if (folderName) {
        const legacyFacility = notes.filter((n) => !n.folderId && n.facility === folderName).length;
        count += legacyFacility;
      }
      return count;
    },
    [noteCounts.folderCounts, getDescendantFolderIds, notes]
  );

  // 4 Precise Folder Expansion & Collapse Actions
  // 1. Expand all recursively under folder
  const handleExpandAllRecursively = (folderId: string) => {
    const all = [folderId, ...getDescendantFolderIds(folderId)];
    setCollapsedFolderIds((prev) => {
      const next = { ...prev };
      for (const id of all) {
        delete next[id];
      }
      return next;
    });
  };

  // 2. Expand 1 layer under folder
  const handleExpandOneLayer = (folderId: string) => {
    const children = folderHierarchy.childrenMap.get(folderId) || [];
    setCollapsedFolderIds((prev) => {
      const next = { ...prev };
      delete next[folderId];
      for (const c of children) {
        delete next[c.id];
      }
      return next;
    });
  };

  // 3. Collapse all recursively under folder (Reverse of 1)
  const handleCollapseAllRecursively = (folderId: string) => {
    const all = [folderId, ...getDescendantFolderIds(folderId)];
    setCollapsedFolderIds((prev) => {
      const next = { ...prev };
      for (const id of all) {
        next[id] = true;
      }
      return next;
    });
  };

  // 4. Collapse 1 layer under folder (Reverse of 2)
  const handleCollapseOneLayer = (folderId: string) => {
    const children = folderHierarchy.childrenMap.get(folderId) || [];
    setCollapsedFolderIds((prev) => {
      const next = { ...prev };
      for (const c of children) {
        next[c.id] = true;
      }
      return next;
    });
  };

  // Global Expand All / Collapse All
  const handleExpandAllGlobal = () => {
    setCollapsedFolderIds({});
  };

  const handleCollapseAllGlobal = () => {
    const all: Record<string, boolean> = {};
    for (const f of folders) {
      all[f.id] = true;
    }
    setCollapsedFolderIds(all);
  };

  // Update folder color
  const handleUpdateFolderColor = async (folderId: string, color: string) => {
    const target = folders.find((f) => f.id === folderId);
    if (target) {
      await db.folders.put({ ...target, color } as any);
    }
    setEditingColorFolderId(null);
  };

  // Note Reader & Editor States
  const [viewMode, setViewMode] = useState<'preview' | 'split' | 'edit'>('preview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [showOutline, setShowOutline] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('sans');
  const [readingWidth, setReadingWidth] = useState<'standard' | 'wide' | 'full'>('wide');

  // Modals & Popovers
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [activeChecklistReader, setActiveChecklistReader] = useState<Checklist | null>(null);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [showCitationModal, setShowCitationModal] = useState<boolean>(false);
  const [activeCitationPopover, setActiveCitationPopover] = useState<BibliographyEntry | null>(null);
  const [activeNoteMenuId, setActiveNoteMenuId] = useState<string | null>(null);
  const [bibliography, setBibliography] = useState<BibliographyEntry[]>(DEFAULT_CLINICAL_BIBLIOGRAPHY);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load knowledge notes and bibliography library from Dexie
  const loadNotes = async () => {
    try {
      const allNotes = await db.knowledgeNotes.filter((n) => !n.isDeleted).reverse().sortBy('updatedAt');
      setNotes(allNotes);

      const savedBib = await db.settings.get('knowledge_bibliography');
      if (savedBib?.value && Array.isArray(savedBib.value) && savedBib.value.length > 0) {
        setBibliography(savedBib.value);
      } else {
        setBibliography(DEFAULT_CLINICAL_BIBLIOGRAPHY);
        await db.settings.put({ key: 'knowledge_bibliography', value: DEFAULT_CLINICAL_BIBLIOGRAPHY });
      }
    } catch (e) {
      console.error('Error loading knowledge notes & bibliography:', e);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  // Handle keyboard shortcuts (Escape exits focus mode or outline)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeCitationPopover) {
          setActiveCitationPopover(null);
        } else if (showOutline) {
          setShowOutline(false);
        } else if (isFocusMode) {
          setIsFocusMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, showOutline, activeCitationPopover]);

  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find((n) => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

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

  // Create new note (in current folder)
  const handleCreateNote = async (folderId?: string) => {
    const targetFolderId =
      folderId ||
      (selectedFolderFilter !== 'all' && selectedFolderFilter !== 'pinned' && selectedFolderFilter !== 'recent' && selectedFolderFilter !== 'unfiled'
        ? selectedFolderFilter
        : undefined);

    const newNote: KnowledgeNote = {
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: 'Untitled Clinical Note',
      content: `# Clinical Study Note

## Clinical Overview & Indication
Write your clinical guideline, patient review, or bedside study notes here.

### Key Clinical Pearls
- Key point 1
- Key point 2

> [!NOTE]
> Clinical Pearl: Document dosing guidelines, contraindications, and red flags carefully.

### Treatment Protocol
| Drug | Dose | Route | Frequency | Notes |
| --- | --- | --- | --- | --- |
| Ceftriaxone | 1g-2g | IV | Q24H | Adjust for renal impairment |
| Azithromycin | 500mg | PO | Q24H | Monitor QTc |

### Linked Protocols
`,
      folderId: targetFolderId,
      tags: ['clinical'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setViewMode('edit');
    await db.knowledgeNotes.put(newNote);
  };

  // Duplicate / Clone note
  const handleDuplicateNote = async (note: KnowledgeNote) => {
    const copy: KnowledgeNote = {
      ...note,
      id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: `${note.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.knowledgeNotes.put(copy);
    setNotes((prev) => [copy, ...prev]);
    setActiveNoteMenuId(null);
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this clinical note?')) return;
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const updated = { ...target, isDeleted: true, updatedAt: Date.now() };
    await db.knowledgeNotes.put(updated);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }
    setActiveNoteMenuId(null);
  };

  // Toggle pin note
  const handleTogglePinNote = async (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const updated = { ...target, isPinned: !target.isPinned, updatedAt: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    await db.knowledgeNotes.put(updated);
  };

  // Move note to folder
  const handleMoveNoteToFolder = async (noteId: string, folderId?: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;
    const updated = { ...target, folderId: folderId || undefined, updatedAt: Date.now() };
    setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
    await db.knowledgeNotes.put(updated);
    setActiveNoteMenuId(null);
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
    setActiveNoteMenuId(null);
  };

  // Import Markdown files (.md, .txt) from disk
  const handleImportMarkdownFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const importedNotes: KnowledgeNote[] = [];
    const targetFolderId =
      selectedFolderFilter !== 'all' && selectedFolderFilter !== 'pinned' && selectedFolderFilter !== 'recent' && selectedFolderFilter !== 'unfiled'
        ? selectedFolderFilter
        : undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      const fileNameWithoutExt = file.name.replace(/\.(md|markdown|txt)$/i, '');

      // Check if first line has # Title
      const headingMatch = text.match(/^#\s+(.+)$/m);
      const title = headingMatch ? headingMatch[1].trim() : fileNameWithoutExt;

      const newNote: KnowledgeNote = {
        id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7) + '-' + i,
        title,
        content: text,
        folderId: targetFolderId,
        tags: ['imported'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await db.knowledgeNotes.put(newNote);
      importedNotes.push(newNote);
    }

    await loadNotes();
    if (importedNotes.length === 1) {
      setSelectedNoteId(importedNotes[0].id);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Create folder (supports root or nested subfolder)
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const parentId = newFolderParentId || undefined;

    if (onCreateFolder) {
      await onCreateFolder(newFolderName.trim(), 'knowledge', newFolderColor, parentId);
    } else {
      const newFolder: FolderItem = {
        id: 'folder-k-' + Date.now(),
        name: newFolderName.trim(),
        type: 'knowledge',
        color: newFolderColor,
        parentId,
        order: folders.length,
      };
      await db.folders.put(newFolder as any);
    }

    setNewFolderName('');
    setNewFolderParentId('');
    setIsAddingFolder(false);
  };

  // Rename folder
  const handleRenameFolderSubmit = async (folderId: string) => {
    if (!renamedFolderName.trim()) return;
    if (onRenameFolder) {
      await onRenameFolder(folderId, renamedFolderName.trim());
    } else {
      const target = folders.find((f) => f.id === folderId);
      if (target) {
        await db.folders.put({ ...target, name: renamedFolderName.trim() } as any);
      }
    }
    setRenamingFolderId(null);
    setRenamedFolderName('');
  };

  // Delete folder
  const handleDeleteFolderSubmit = async (folderId: string) => {
    if (!confirm('Delete this folder? Notes inside will be moved to Unassigned.')) return;
    if (onDeleteFolder) {
      await onDeleteFolder(folderId);
    } else {
      await db.folders.delete(folderId);
    }
    // Update notes assigned to this folder
    const notesInFolder = notes.filter((n) => n.folderId === folderId);
    for (const n of notesInFolder) {
      await db.knowledgeNotes.put({ ...n, folderId: undefined, updatedAt: Date.now() });
    }
    await loadNotes();
    if (selectedFolderFilter === folderId) {
      setSelectedFolderFilter('all');
    }
  };

  // Insert formatting into textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
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

    const newLinkedChecklists = [...(selectedNote.linkedChecklistIds || [])];
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

  // Update bibliography entries in memory and Dexie database
  const handleUpdateBibliography = async (entries: BibliographyEntry[]) => {
    setBibliography(entries);
    await db.settings.put({ key: 'knowledge_bibliography', value: entries });
  };

  // Insert citation tag (e.g. [@citekey, p. 45]) into markdown at cursor
  const handleInsertCitation = (citationText: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !selectedNote) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedNote.content;
    const replacement = ` ${citationText} `;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateNote({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  // Filter & Sort Notes for File Explorer
  const filteredAndSortedNotes = useMemo(() => {
    return notes
      .filter((n) => {
        // Folder filter
        if (selectedFolderFilter === 'pinned') {
          if (!n.isPinned) return false;
        } else if (selectedFolderFilter === 'recent') {
          // Last 7 days or top 10
        } else if (selectedFolderFilter === 'unfiled') {
          if (n.folderId) return false;
        } else if (selectedFolderFilter !== 'all') {
          // Check if note matches this folder OR any of its recursive subfolders
          const matchingIds = new Set([selectedFolderFilter, ...getDescendantFolderIds(selectedFolderFilter)]);
          if (
            !matchingIds.has(n.folderId || '') &&
            !matchingIds.has(n.facility || '')
          ) {
            return false;
          }
        }

        // Tag filter
        if (selectedTagFilter && (!n.tags || !n.tags.includes(selectedTagFilter))) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchContent = n.content.toLowerCase().includes(q);
          const matchTag = n.tags && n.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchContent && !matchTag) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'updated') {
          return b.updatedAt - a.updatedAt;
        } else if (sortBy === 'created') {
          return (b.createdAt || 0) - (a.createdAt || 0);
        } else if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        } else if (sortBy === 'title-desc') {
          return b.title.localeCompare(a.title);
        }
        return 0;
      });
  }, [notes, selectedFolderFilter, selectedTagFilter, searchQuery, sortBy]);

  // Extract all unique tags across notes
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.tags) n.tags.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [notes]);

  // Extract document outline for selected note
  const outline = useMemo(() => {
    if (!selectedNote) return [];
    const lines = selectedNote.content.split('\n');
    const items: { id: string; text: string; level: number }[] = [];
    lines.forEach((line, idx) => {
      const m = line.match(/^(#{1,3})\s+(.+)/);
      if (m) {
        items.push({
          id: `heading-${idx}`,
          text: m[2].trim(),
          level: m[1].length,
        });
      }
    });
    return items;
  }, [selectedNote?.content]);

  // Reading statistics
  const wordCount = useMemo(() => {
    if (!selectedNote?.content) return 0;
    return selectedNote.content.trim().split(/\s+/).filter(Boolean).length;
  }, [selectedNote?.content]);

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Scroll to heading from outline
  const scrollToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowOutline(false);
  };

  // Typography helper classes
  const fontSizeClasses = {
    sm: 'text-xs sm:text-sm leading-relaxed',
    base: 'text-sm sm:text-base leading-relaxed',
    lg: 'text-base sm:text-lg leading-loose',
    xl: 'text-lg sm:text-xl leading-loose',
  };

  const readingWidthClasses = {
    standard: 'max-w-3xl mx-auto',
    wide: 'max-w-5xl mx-auto',
    full: 'w-full',
  };

  // Active folder name helper (with breadcrumb support for subfolders)
  const activeFolderName = useMemo(() => {
    if (selectedFolderFilter === 'all') return 'All Clinical Notes';
    if (selectedFolderFilter === 'pinned') return 'Starred / Pinned Notes';
    if (selectedFolderFilter === 'recent') return 'Recently Updated';
    if (selectedFolderFilter === 'unfiled') return 'Unassigned Notes';
    const f = folders.find((item) => item.id === selectedFolderFilter);
    if (!f) return 'Clinical Notes';
    if (f.parentId) {
      const parent = folders.find((p) => p.id === f.parentId);
      if (parent) return `${parent.name} / ${f.name}`;
    }
    return f.name;
  }, [selectedFolderFilter, folders]);

  // Render markdown parser with interactive checklist badges, medical callouts, tables, and Zettlr citations
  const renderMarkdownPreview = (content: string) => {
    const lines = content.split('\n');
    const parsedCitations = extractCitationsFromMarkdown(content);
    const citedKeys = Array.from(new Set(parsedCitations.map((c) => c.citekey.toLowerCase())));
    const citedEntries = bibliography.filter((b) => citedKeys.includes(b.id.toLowerCase()));

    const renderInlineContent = (text: string) => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const citeRegex = /\[([^\]]*?@[a-zA-Z0-9_:\.\-]+[^\]]*?)\]|(?<=^|[\s(])@([a-zA-Z0-9_:\.\-]+)/g;
      let match: RegExpExecArray | null;

      const parseSubInline = (subText: string, keyPrefix: string): React.ReactNode[] => {
        const inlineTokens: React.ReactNode[] = [];
        let iLast = 0;
        const inlineRegex = /(==(.*?)==)|(\*\*(.*?)\*\*)|(\*(.*?)\*)|(`(.*?)`)/g;
        let im: RegExpExecArray | null;

        while ((im = inlineRegex.exec(subText)) !== null) {
          if (im.index > iLast) {
            inlineTokens.push(subText.substring(iLast, im.index));
          }
          if (im[1]) {
            inlineTokens.push(
              <mark
                key={`${keyPrefix}-hl-${im.index}`}
                className="bg-amber-200/90 dark:bg-amber-900/60 text-slate-900 dark:text-amber-200 px-1 py-0.2 rounded font-medium"
              >
                {im[2]}
              </mark>
            );
          } else if (im[3]) {
            inlineTokens.push(
              <strong key={`${keyPrefix}-b-${im.index}`} className="font-bold text-slate-950 dark:text-white">
                {im[4]}
              </strong>
            );
          } else if (im[5]) {
            inlineTokens.push(
              <em key={`${keyPrefix}-i-${im.index}`} className="italic">
                {im[6]}
              </em>
            );
          } else if (im[7]) {
            inlineTokens.push(
              <code
                key={`${keyPrefix}-c-${im.index}`}
                className="font-mono text-[11px] sm:text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 border border-slate-200/60 dark:border-slate-700/60"
              >
                {im[8]}
              </code>
            );
          }
          iLast = im.index + im[0].length;
        }

        if (iLast < subText.length) {
          inlineTokens.push(subText.substring(iLast));
        }

        return inlineTokens;
      };

      while ((match = citeRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(...parseSubInline(text.substring(lastIndex, match.index), `pre-${match.index}`));
        }

        const bracketed = match[1];
        const standalone = match[2];

        if (bracketed) {
          const subparts = bracketed.split(';').map((s) => s.trim());
          parts.push(
            <span key={match.index} className="inline-flex flex-wrap items-center gap-1 mx-0.5 align-middle">
              {subparts.map((sub, sIdx) => {
                const cm = sub.match(/(.*?)(?:(-)?@([a-zA-Z0-9_:\.\-]+))(.*)/);
                if (cm) {
                  const prefix = cm[1]?.trim();
                  const suppress = Boolean(cm[2]);
                  const key = cm[3];
                  let locator = cm[4]?.trim();
                  if (locator?.startsWith(',')) locator = locator.substring(1).trim();

                  const entry = bibliography.find((b) => b.id.toLowerCase() === key.toLowerCase());
                  const author = entry ? formatAuthorShort(entry.author) : key;
                  const year = entry?.year || '';

                  let displayText = '';
                  if (suppress) {
                    displayText = [year, locator].filter(Boolean).join(', ');
                  } else {
                    const main = year ? `${author}, ${year}` : author;
                    const withPref = prefix ? `${prefix} ${main}` : main;
                    displayText = locator ? `${withPref}, ${locator}` : withPref;
                  }

                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setActiveCitationPopover(entry || { id: key, title: key, type: 'misc' })}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100/90 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 text-[11px] font-mono cursor-pointer transition-colors shadow-2xs"
                      title={entry ? `${entry.title} (${entry.author || 'Unknown'})` : `@${key}`}
                    >
                      <Quote className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                      <span>({displayText})</span>
                    </button>
                  );
                }
                return <span key={sIdx}>{sub}</span>;
              })}
            </span>
          );
        } else if (standalone) {
          const entry = bibliography.find((b) => b.id.toLowerCase() === standalone.toLowerCase());
          const author = entry ? formatAuthorShort(entry.author) : standalone;
          const year = entry?.year ? ` (${entry.year})` : '';

          parts.push(
            <button
              key={match.index}
              type="button"
              onClick={() => setActiveCitationPopover(entry || { id: standalone, title: standalone, type: 'misc' })}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-100/90 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-800 text-[11px] font-mono cursor-pointer transition-colors mx-0.5 shadow-2xs"
              title={entry ? `${entry.title} (${entry.author || 'Unknown'})` : `@${standalone}`}
            >
              <Quote className="w-2.5 h-2.5 text-purple-500 shrink-0" />
              <span>{author}{year}</span>
            </button>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        parts.push(...parseSubInline(text.substring(lastIndex), `post-${lastIndex}`));
      }

      return parts.length > 0 ? parts : parseSubInline(text, 'base');
    };

    const renderedElements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Table Detection
      if (line.trim().startsWith('|') && line.includes('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const splitRow = (r: string) =>
            r
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim());

          const headerRow = splitRow(tableLines[0]);
          const isSeparator = (r: string) => /^[\s\-|:]+$/.test(r);
          const bodyStartIdx = isSeparator(tableLines[1]) ? 2 : 1;
          const bodyRows = tableLines.slice(bodyStartIdx).map(splitRow);

          renderedElements.push(
            <div
              key={`table-${i}`}
              className="my-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs bg-white dark:bg-slate-900/60"
            >
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                    {headerRow.map((h, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]"
                      >
                        {renderInlineContent(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bodyRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors even:bg-slate-50/50 dark:even:bg-slate-850/30"
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300">
                          {renderInlineContent(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Headings with IDs
      if (line.startsWith('# ')) {
        renderedElements.push(
          <h1
            id={`heading-${i}`}
            key={i}
            className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mt-6 mb-3 first:mt-0 scroll-mt-6"
          >
            {renderInlineContent(line.substring(2))}
          </h1>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        renderedElements.push(
          <h2
            id={`heading-${i}`}
            key={i}
            className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200/60 dark:border-slate-800 pb-1.5 mt-5 mb-2.5 scroll-mt-6"
          >
            {renderInlineContent(line.substring(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('### ')) {
        renderedElements.push(
          <h3
            id={`heading-${i}`}
            key={i}
            className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2 scroll-mt-6"
          >
            {renderInlineContent(line.substring(4))}
          </h3>
        );
        i++;
        continue;
      }

      // Medical Callout Blocks
      if (line.startsWith('> [!NOTE]') || line.startsWith('> [!TIP]')) {
        const isTip = line.startsWith('> [!TIP]');
        const calloutLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].startsWith('>')) {
          calloutLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        renderedElements.push(
          <div
            key={`callout-note-${i}`}
            className="my-3 p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-2xl text-slate-800 dark:text-slate-200 shadow-2xs space-y-1"
          >
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              {isTip ? <Lightbulb className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              <span>{isTip ? 'Clinical Pearl / Pro Tip' : 'Clinical Guidance / Note'}</span>
            </div>
            <div className="text-xs sm:text-sm pl-6 leading-relaxed">
              {calloutLines.map((cl, cIdx) => (
                <p key={cIdx}>{renderInlineContent(cl)}</p>
              ))}
            </div>
          </div>
        );
        continue;
      }

      if (line.startsWith('> [!WARNING]') || line.startsWith('> [!CAUTION]')) {
        const isCaution = line.startsWith('> [!CAUTION]');
        const calloutLines: string[] = [];
        i++;
        while (i < lines.length && lines[i].startsWith('>')) {
          calloutLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        renderedElements.push(
          <div
            key={`callout-warn-${i}`}
            className="my-3 p-4 bg-amber-50/90 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-2xl text-slate-800 dark:text-slate-200 shadow-2xs space-y-1"
          >
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              {isCaution ? <AlertCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{isCaution ? 'High-Risk Caution / Red Flag' : 'Clinical Warning / Contraindication'}</span>
            </div>
            <div className="text-xs sm:text-sm pl-6 leading-relaxed font-medium">
              {calloutLines.map((cl, cIdx) => (
                <p key={cIdx}>{renderInlineContent(cl)}</p>
              ))}
            </div>
          </div>
        );
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        renderedElements.push(
          <div
            key={i}
            className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-500 rounded-r-2xl text-slate-700 dark:text-slate-300 font-medium italic my-2.5"
          >
            {renderInlineContent(line.substring(2))}
          </div>
        );
        i++;
        continue;
      }

      // Wikilinks [[Title]]
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

        if (targetChk) {
          renderedElements.push(
            <div
              key={i}
              className="my-2.5 p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Protocol Practice Wikilink
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    {displayName}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveChecklistReader(targetChk)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Study / Drill</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          );
          i++;
          continue;
        }
      }

      // Template Link [Template: Name](template://id)
      const tmplMatch = line.match(/\[Template:\s*([^\]]+)\]\(template:\/\/([^\)]+)\)/i);
      if (tmplMatch) {
        const [, title, id] = tmplMatch;
        const targetTmpl = templates.find((t) => t.id === id);
        renderedElements.push(
          <div
            key={i}
            className="my-2.5 p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Clinical Template Bundle
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </h4>
              </div>
            </div>

            {targetTmpl && (
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                {targetTmpl.checklistIds?.length || 0} Bundled Protocols
              </span>
            )}
          </div>
        );
        i++;
        continue;
      }

      // Checkbox Items
      if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
        const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
        const text = line.substring(6);
        renderedElements.push(
          <div key={i} className="flex items-start gap-2.5 py-1 pl-1">
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="mt-1 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 w-4 h-4 shrink-0"
            />
            <span
              className={
                isChecked
                  ? 'line-through text-slate-400 dark:text-slate-500 font-medium'
                  : 'text-slate-800 dark:text-slate-200 font-medium'
              }
            >
              {renderInlineContent(text)}
            </span>
          </div>
        );
        i++;
        continue;
      }

      // Bullets
      if (line.startsWith('- ') || line.startsWith('* ')) {
        renderedElements.push(
          <div key={i} className="flex items-start gap-2.5 py-0.5 pl-2">
            <span className="text-indigo-500 font-bold leading-normal select-none">•</span>
            <span className="text-slate-800 dark:text-slate-200">{renderInlineContent(line.substring(2))}</span>
          </div>
        );
        i++;
        continue;
      }

      // Numbered lists
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        renderedElements.push(
          <div key={i} className="flex items-start gap-2.5 py-0.5 pl-2">
            <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">
              {numMatch[1]}.
            </span>
            <span className="text-slate-800 dark:text-slate-200">{renderInlineContent(numMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // Horizontal rule
      if (line.trim() === '---') {
        renderedElements.push(<hr key={i} className="border-slate-200 dark:border-slate-800 my-4" />);
        i++;
        continue;
      }

      // Standard paragraph
      if (line.trim()) {
        renderedElements.push(
          <p key={i} className="my-1.5 text-slate-800 dark:text-slate-200">
            {renderInlineContent(line)}
          </p>
        );
      } else {
        renderedElements.push(<div key={i} className="h-2" />);
      }

      i++;
    }

    return (
      <div className={`select-text ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'} ${fontSizeClasses[fontSize]}`}>
        {renderedElements}

        {citedEntries.length > 0 && (
          <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-500" />
                <span>References</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {citedEntries.length} cited (CSL / Zettlr Standard)
              </span>
            </div>
            <div className="space-y-2.5 font-serif text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {citedEntries.map((entry, idx) => (
                <div key={entry.id} className="pl-6 -indent-6 flex items-start justify-between gap-2 group">
                  <div>
                    <span className="font-mono text-xs text-purple-600 dark:text-purple-400 mr-1.5 font-bold">
                      [{idx + 1}]
                    </span>
                    <span>{formatBibliographyItem(entry)}</span>
                  </div>
                  {entry.doi && (
                    <a
                      href={`https://doi.org/${entry.doi.replace(/^https?:\/\/doi\.org\//, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 shrink-0 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded opacity-60 group-hover:opacity-100 transition-opacity"
                      title="Open DOI"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // VIEW 1: FULL-FUNCTION CLINICAL FILE EXPLORER FOR KNOWLEDGE HUB
  // (Rendered when no note is selected)
  // =========================================================================
  if (!selectedNote) {
    return (
      <div className="w-full flex-1 flex flex-col min-h-full p-2 sm:p-4 bg-slate-50/50 dark:bg-slate-950/50 select-none">
        {/* Hidden File Input for Markdown Import */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportMarkdownFiles}
          accept=".md,.markdown,.txt"
          multiple
          className="hidden"
        />

        {/* File Explorer Header */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Knowledge Hub Explorer
                </h1>
                <span className="text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {notes.length} Notes
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize guidelines, study references, and clinical notes with full folder hierarchies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCitationModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Manage Zettlr & BibTeX Citations (.bib)"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Bibliography ({bibliography.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVaultModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Sync with Desktop Obsidian / Zettlr Vault"
            >
              <HardDrive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Vault Sync</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Import Markdown (.md) files from storage"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import .md</span>
            </button>

            <button
              type="button"
              onClick={() => handleCreateNote()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {/* Mobile Folder Toggle Bar */}
        <div className="md:hidden flex items-center justify-between p-2.5 mb-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xs">
          <button
            type="button"
            onClick={() => setIsMobileFolderOpen(!isMobileFolderOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Folder: {activeFolderName}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileFolderOpen ? 'rotate-180' : ''}`} />
          </button>
          <span className="text-xs text-slate-500 font-mono">
            {filteredAndSortedNotes.length} {filteredAndSortedNotes.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {/* Main Dual-Panel Explorer Layout */}
        <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm md:overflow-hidden">
          {/* Left Panel: Folders & Smart Filters Sidebar */}
          <div className={`w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-3 flex flex-col bg-slate-50/40 dark:bg-slate-900/40 shrink-0 ${isMobileFolderOpen ? 'flex' : 'hidden md:flex'}`}>
            {/* Quick Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, tags, text..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Smart Navigation Folders */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Navigation
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFolderFilter('all');
                  setSelectedTagFilter(null);
                  setIsMobileFolderOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedFolderFilter === 'all' && !selectedTagFilter
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>All Clinical Notes</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    selectedFolderFilter === 'all' && !selectedTagFilter
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {notes.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFolderFilter('pinned');
                  setSelectedTagFilter(null);
                  setIsMobileFolderOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedFolderFilter === 'pinned'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Starred / Pinned</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    selectedFolderFilter === 'pinned'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {notes.filter((n) => n.isPinned).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedFolderFilter('unfiled');
                  setSelectedTagFilter(null);
                  setIsMobileFolderOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedFolderFilter === 'unfiled'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-slate-400" />
                  <span>Unassigned / Inbox</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    selectedFolderFilter === 'unfiled'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {notes.filter((n) => !n.folderId).length}
                </span>
              </button>

              {/* Folders List Section with Global Controls */}
              <div className="pt-3 pb-1 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span>Folders</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleExpandAllGlobal}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Expand all folders"
                  >
                    <ChevronsDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseAllGlobal}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    title="Collapse all folders"
                  >
                    <ChevronsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingFolder(true);
                      setNewFolderParentId('');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 ml-1"
                    title="Add New Top-Level Folder"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Inline Add Folder Form with Parent Selector */}
              {isAddingFolder && (
                <form
                  onSubmit={handleCreateFolderSubmit}
                  className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm space-y-2 mb-2 animate-in fade-in"
                >
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name (e.g. Arrhythmias)"
                    autoFocus
                    className="w-full text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {/* Parent Folder Selector for Nesting */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">
                      Nest under folder:
                    </label>
                    <select
                      value={newFolderParentId}
                      onChange={(e) => setNewFolderParentId(e.target.value)}
                      className="w-full text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
                    >
                      <option value="">None (Top-Level Root Folder)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.parentId ? `└─ ${f.name}` : f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setNewFolderColor(col)}
                          className={`w-3.5 h-3.5 rounded-full transition-transform ${
                            newFolderColor === col ? 'scale-125 ring-2 ring-indigo-400' : ''
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingFolder(false);
                          setNewFolderParentId('');
                        }}
                        className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-md"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Nested Collapsible Custom Folders Tree with 4-Action Expand/Collapse & Color Customization */}
              {(() => {
                const PRESET_COLORS = [
                  '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
                  '#8b5cf6', '#ec4899', '#14b8a6', '#3b82f6', '#64748b'
                ];

                const renderFolderNode = (f: FolderItem, depth: number = 0): React.ReactNode => {
                  const children = folderHierarchy.childrenMap.get(f.id) || [];
                  const hasChildren = children.length > 0;
                  const isCollapsed = !!collapsedFolderIds[f.id];
                  const isSelected = selectedFolderFilter === f.id;
                  const count = getCumulativeCount(f.id, f.name);
                  const isColorEditing = editingColorFolderId === f.id;

                  return (
                    <div key={f.id} className="space-y-0.5">
                      {renamingFolderId === f.id ? (
                        <div className="p-1.5 flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl">
                          <input
                            type="text"
                            value={renamedFolderName}
                            onChange={(e) => setRenamedFolderName(e.target.value)}
                            autoFocus
                            className="flex-1 text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900 border rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameFolderSubmit(f.id)}
                            className="p-1 text-emerald-600 hover:text-emerald-500"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingFolderId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setSelectedFolderFilter(f.id);
                            setSelectedTagFilter(null);
                            setIsMobileFolderOpen(false);
                          }}
                          className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollapsedFolderIds((prev) => ({ ...prev, [f.id]: !prev[f.id] }));
                                }}
                                className="p-0.5 hover:bg-black/10 rounded cursor-pointer shrink-0"
                                title={isCollapsed ? 'Expand this folder' : 'Collapse this folder'}
                              >
                                <ChevronRight
                                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                                    isCollapsed ? '' : 'rotate-90'
                                  }`}
                                />
                              </button>
                            ) : (
                              <span className="w-3.5 shrink-0" />
                            )}

                            {/* Clickable Color Badge to Change Folder Color */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingColorFolderId(isColorEditing ? null : f.id);
                              }}
                              className="w-3 h-3 rounded-full shrink-0 hover:scale-125 transition-transform ring-1 ring-black/10 dark:ring-white/10"
                              style={{ backgroundColor: f.color || '#6366f1' }}
                              title="Click to change folder color"
                            />
                            <span className="truncate">{f.name}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* 4 Precise Recursive & 1-Layer Expand/Collapse Action Buttons */}
                            {hasChildren && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* 1. Expand all recursively */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpandAllRecursively(f.id);
                                  }}
                                  className={`p-0.5 rounded transition-colors ${
                                    isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                                  }`}
                                  title="Open all subfolders under this recursively"
                                >
                                  <ChevronsDown className="w-3 h-3 text-emerald-500" />
                                </button>
                                {/* 2. Expand 1 layer */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExpandOneLayer(f.id);
                                  }}
                                  className={`p-0.5 rounded transition-colors ${
                                    isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                                  }`}
                                  title="Open 1 layer of subfolders"
                                >
                                  <ChevronDown className="w-3 h-3 text-cyan-500" />
                                </button>
                                {/* 3. Collapse all recursively (Reverse of 1) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCollapseAllRecursively(f.id);
                                  }}
                                  className={`p-0.5 rounded transition-colors ${
                                    isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                                  }`}
                                  title="Collapse all subfolders under this recursively"
                                >
                                  <ChevronsUp className="w-3 h-3 text-amber-500" />
                                </button>
                                {/* 4. Collapse 1 layer (Reverse of 2) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCollapseOneLayer(f.id);
                                  }}
                                  className={`p-0.5 rounded transition-colors ${
                                    isSelected ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                                  }`}
                                  title="Collapse 1 layer of subfolders"
                                >
                                  <ChevronUp className="w-3 h-3 text-purple-500" />
                                </button>
                              </div>
                            )}

                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {count}
                            </span>

                            {/* Change Color Trigger */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingColorFolderId(isColorEditing ? null : f.id);
                              }}
                              className={`p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded ${
                                isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-indigo-600'
                              }`}
                              title="Change Folder Color"
                            >
                              <Palette className="w-3 h-3" />
                            </button>

                            {/* Quick Add Subfolder button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNewFolderParentId(f.id);
                                setIsAddingFolder(true);
                              }}
                              className={`p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded ${
                                isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-indigo-600'
                              }`}
                              title={`Add subfolder inside ${f.name}`}
                            >
                              <FolderPlus className="w-3 h-3" />
                            </button>

                            {/* Delete folder */}
                            {f.type === 'knowledge' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolderSubmit(f.id);
                                }}
                                className={`p-1 opacity-0 group-hover:opacity-100 transition-opacity rounded ${
                                  isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-red-500'
                                }`}
                                title="Delete Folder"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Color Picker Popover */}
                      {isColorEditing && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-lg flex items-center gap-1.5 flex-wrap my-1 animate-in fade-in"
                        >
                          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Color:</span>
                          {PRESET_COLORS.map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => handleUpdateFolderColor(f.id, col)}
                              className={`w-4 h-4 rounded-full transition-transform hover:scale-125 ${
                                f.color === col ? 'scale-125 ring-2 ring-indigo-500' : ''
                              }`}
                              style={{ backgroundColor: col }}
                              title={col}
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => setEditingColorFolderId(null)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 ml-auto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Recursive Children (Indented by hierarchy) */}
                      {!isCollapsed && hasChildren && (
                        <div className="pl-3.5 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-800 ml-3">
                          {children.map((child) => renderFolderNode(child, depth + 1))}
                        </div>
                      )}
                    </div>
                  );
                };

                return folderHierarchy.rootFolders.map((root) => renderFolderNode(root, 0));
              })()}

              {/* Tags Section */}
              {allTags.length > 0 && (
                <>
                  <div className="pt-4 pb-1 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Filter by Tag
                  </div>
                  <div className="flex flex-wrap gap-1 px-1">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          selectedTagFilter === tag
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Panel: File Grid / Table View */}
          <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
            {/* Explorer Toolbar */}
            <div className="p-3 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-slate-50/30 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Folder className="w-4 h-4 text-indigo-500" />
                  <span>{activeFolderName}</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  ({filteredAndSortedNotes.length} {filteredAndSortedNotes.length === 1 ? 'file' : 'files'})
                </span>
                {selectedTagFilter && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                    #{selectedTagFilter}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => setSelectedTagFilter(null)}
                    />
                  </span>
                )}
              </div>

              {/* View & Sort Controls */}
              <div className="flex items-center gap-2">
                {/* Sort Selector */}
                <div className="flex items-center gap-1 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 px-2 py-1 focus:outline-none"
                  >
                    <option value="updated">Recently Edited</option>
                    <option value="created">Date Created</option>
                    <option value="title">Title (A → Z)</option>
                    <option value="title-desc">Title (Z → A)</option>
                  </select>
                </div>

                {/* View Switcher: Grid vs Table */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setExplorerViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      explorerViewMode === 'grid'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Grid / Cards View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplorerViewMode('table')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      explorerViewMode === 'table'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Table / List View"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notes Explorer Canvas */}
            <div className="flex-1 md:overflow-y-auto p-4 sm:p-6">
              {filteredAndSortedNotes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                    No Clinical Notes Found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                    {searchQuery
                      ? `No notes matching "${searchQuery}". Try clearing the search filter.`
                      : 'This folder is currently empty. Create a new clinical note or import markdown files.'}
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleCreateNote()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Note Here</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import .md</span>
                    </button>
                  </div>
                </div>
              ) : explorerViewMode === 'grid' ? (
                /* GRID / CARDS VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAndSortedNotes.map((note) => {
                    const assignedFolder = folders.find((f) => f.id === note.folderId);
                    const words = note.content.trim().split(/\s+/).filter(Boolean).length;
                    const readTime = Math.max(1, Math.ceil(words / 200));

                    return (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className="group relative bg-white dark:bg-slate-850/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 truncate">
                              {assignedFolder && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 text-white shrink-0"
                                  style={{ backgroundColor: assignedFolder.color || '#6366f1' }}
                                >
                                  <Folder className="w-2.5 h-2.5" />
                                  <span>{assignedFolder.name}</span>
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-400">
                                ~{readTime}m read
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePinNote(note.id);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-500 rounded transition-colors"
                                title={note.isPinned ? 'Unpin' : 'Pin to Top'}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    note.isPinned ? 'fill-amber-400 text-amber-400' : ''
                                  }`}
                                />
                              </button>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveNoteMenuId(activeNoteMenuId === note.id ? null : note.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {/* Dropdown Menu */}
                                {activeNoteMenuId === note.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-6 z-20 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 text-xs animate-in fade-in"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateNote(note)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Duplicate Note</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleExportMarkdown(note)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                                    >
                                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>Export Markdown</span>
                                    </button>
                                    <div className="w-full h-px bg-slate-200 dark:bg-slate-700 my-1" />
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Note</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Title */}
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {note.title}
                          </h3>

                          {/* Preview snippet */}
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mt-1.5 leading-relaxed font-sans">
                            {note.content.replace(/[#*`\->|]/g, '').trim()}
                          </p>
                        </div>

                        {/* Card Footer */}
                        <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </span>

                          {note.tags && note.tags.length > 0 && (
                            <div className="flex items-center gap-1 overflow-hidden">
                              {note.tags.slice(0, 2).map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 text-[10px]"
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
              ) : (
                /* TABLE / LIST VIEW */
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3 w-8" />
                        <th className="p-3">Title & Summary</th>
                        <th className="p-3">Folder</th>
                        <th className="p-3">Tags</th>
                        <th className="p-3">Reading Stats</th>
                        <th className="p-3">Last Modified</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAndSortedNotes.map((note) => {
                        const assignedFolder = folders.find((f) => f.id === note.folderId);
                        const words = note.content.trim().split(/\s+/).filter(Boolean).length;
                        const readTime = Math.max(1, Math.ceil(words / 200));

                        return (
                          <tr
                            key={note.id}
                            onClick={() => setSelectedNoteId(note.id)}
                            className="hover:bg-indigo-50/40 dark:hover:bg-slate-850/60 transition-colors cursor-pointer group"
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleTogglePinNote(note.id)}
                                className="text-slate-300 hover:text-amber-500"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    note.isPinned ? 'fill-amber-400 text-amber-400' : ''
                                  }`}
                                />
                              </button>
                            </td>

                            <td className="p-3 max-w-xs">
                              <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                {note.title}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                {note.content.replace(/[#*`\->|]/g, '').trim()}
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              {assignedFolder ? (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white inline-flex items-center gap-1"
                                  style={{ backgroundColor: assignedFolder.color || '#6366f1' }}
                                >
                                  <Folder className="w-2.5 h-2.5" />
                                  <span>{assignedFolder.name}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-1 flex-wrap">
                                {note.tags && note.tags.length > 0 ? (
                                  note.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 text-[10px]"
                                    >
                                      #{t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 text-[10px]">-</span>
                                )}
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              ~{readTime}m ({words}w)
                            </td>

                            <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                              {new Date(note.updatedAt).toLocaleDateString()}
                            </td>

                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateNote(note)}
                                  className="p-1 text-slate-400 hover:text-indigo-500 rounded"
                                  title="Duplicate"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportMarkdown(note)}
                                  className="p-1 text-slate-400 hover:text-emerald-500 rounded"
                                  title="Export .md"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: NOTE WORKSPACE (READING & EDITING MODE)
  // (Rendered when a note is active)
  // =========================================================================
  return (
    <div className="w-full flex-1 flex flex-col min-h-[calc(100vh-80px)] p-2 sm:p-4 bg-slate-50/40 dark:bg-slate-950/40">
      {/* Note Workspace Main Container */}
      <div className="flex-1 flex min-h-0 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        {/* Optional Collapsible Sidebar Drawer inside Reader for Fast Switching */}
        {isSidebarOpen && (
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 p-3 shrink-0 min-h-0 animate-in slide-in-from-left duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Notes in Folder
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredAndSortedNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedNoteId(n.id)}
                  className={`w-full text-left p-2 rounded-xl text-xs font-semibold truncate transition-colors flex items-center gap-2 cursor-pointer ${
                    selectedNote.id === n.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{n.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note Workspace Body */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Header Navigation Ribbon */}
          <div className="border-b border-slate-200 dark:border-slate-800 p-3 sm:px-6 flex items-start justify-between gap-3 flex-wrap bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex-1 min-w-[220px]">
              {/* Back to File Explorer Button */}
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedNoteId(null)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>File Explorer</span>
                </button>

                {/* Collapsible Sidebar Toggle */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                  title={isSidebarOpen ? 'Hide Notes Drawer' : 'Show Notes Drawer'}
                >
                  {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                </button>

                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ~{readingTimeMinutes} min read ({wordCount} words)
                </span>
              </div>

              {/* Title input with stylus Write & OCR button */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote({ title: e.target.value })}
                  placeholder="Note Title"
                  className="text-base sm:text-xl font-bold flex-1 bg-transparent border-0 focus:outline-none text-slate-900 dark:text-slate-100 p-0"
                />
                <button
                  type="button"
                  onClick={() => setActiveHandwritingTarget('title')}
                  className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                  title="Write Note Title with Stylus & OCR"
                >
                  <Pen className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <Folder className="w-3 h-3 text-indigo-500" />
                  <select
                    value={selectedNote.folderId || ''}
                    onChange={(e) => handleUpdateNote({ folderId: e.target.value || undefined })}
                    className="bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 focus:outline-none"
                  >
                    <option value="">No Folder (Unassigned)</option>
                    {folders.map((f) => {
                      const parent = f.parentId ? folders.find((p) => p.id === f.parentId) : null;
                      const label = parent ? `${parent.name} / ${f.name}` : f.name;
                      return (
                        <option key={f.id} value={f.id}>
                          {label} ({f.type})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <span>•</span>
                <span>Edited {new Date(selectedNote.updatedAt).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* View Mode Controls & Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Mode Selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Reading Mode (Full Width & Clean Typography)"
                >
                  <Eye className="w-3 h-3 text-indigo-500" />
                  <span>Read</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`hidden lg:flex px-2.5 py-1 rounded-lg font-semibold items-center gap-1 transition-all ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Side-by-Side Editor & Preview"
                >
                  <Columns className="w-3 h-3" />
                  <span>Split</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                    viewMode === 'edit'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                  title="Markdown Editor"
                >
                  <Edit3 className="w-3 h-3 text-emerald-500" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Table of Contents Outline Button */}
              {outline.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOutline(!showOutline)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                    showOutline
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                      : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Document Outline / Table of Contents"
                >
                  <List className="w-3 h-3 text-indigo-500" />
                  <span className="hidden sm:inline">Outline</span> ({outline.length})
                </button>
              )}

              {/* Zen / Focus Reader Fullscreen Button */}
              <button
                type="button"
                onClick={() => setIsFocusMode(true)}
                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="Focus Reader (Zen Mode — Distraction Free)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Zen Reader</span>
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

              {/* Print Note */}
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden sm:flex p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Print Note"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>

              {/* Export Markdown */}
              <button
                type="button"
                onClick={() => handleExportMarkdown(selectedNote)}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                title="Export Markdown (.md)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Reading Customization Bar (Shown in 'preview' mode) */}
          {viewMode === 'preview' && (
            <div className="px-3 sm:px-6 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs bg-slate-50/30 dark:bg-slate-900/30 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Font Size Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Size</span>
                  <button
                    type="button"
                    onClick={() => setFontSize('sm')}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      fontSize === 'sm' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('base')}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      fontSize === 'base' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('lg')}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      fontSize === 'lg' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    L
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('xl')}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                      fontSize === 'xl' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    XL
                  </button>
                </div>

                {/* Font Family Selector */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFontFamily('sans')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold font-sans ${
                      fontFamily === 'sans' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Sans
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontFamily('serif')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold font-serif ${
                      fontFamily === 'serif' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Serif
                  </button>
                </div>

                {/* Reading Width Selector */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Width</span>
                  <button
                    type="button"
                    onClick={() => setReadingWidth('standard')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      readingWidth === 'standard' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingWidth('wide')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      readingWidth === 'wide' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Wide
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadingWidth('full')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      readingWidth === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Full
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Note</span>
                </button>
              </div>
            </div>
          )}

          {/* Markdown Toolbar (Shown in 'edit' and 'split' modes) */}
          {viewMode !== 'preview' && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-850 p-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs shrink-0">
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
                onClick={() => insertFormatting('==', '==')}
                className="px-2 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-950/60 rounded text-amber-700 dark:text-amber-300 font-semibold"
                title="Highlight (==text==)"
              >
                Highlight
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
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
                onClick={() => insertFormatting('> [!NOTE]\n> ')}
                className="px-2 py-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1"
                title="Clinical Pearl / Note Callout"
              >
                <Lightbulb className="w-3 h-3" />
                <span>Pearl</span>
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> [!WARNING]\n> ')}
                className="px-2 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-950/60 rounded text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1"
                title="Clinical Warning Callout"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Warning</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  insertFormatting(
                    '\n| Param | Value | Target | Notes |\n| --- | --- | --- | --- |\n|  |  |  |  |\n'
                  )
                }
                className="px-2 py-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200"
                title="Insert Clinical Table"
              >
                Table
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setShowLinkModal(true)}
                className="px-2 py-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 rounded text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                title="Insert Protocol Checklist Reference"
              >
                <Plus className="w-3 h-3" />
                <span>Link Protocol</span>
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setShowCitationModal(true)}
                className="px-2 py-0.5 hover:bg-purple-100 dark:hover:bg-purple-950/60 rounded text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                title="Insert Zettlr Citation ([@citekey, p. 45])"
              >
                <BookOpen className="w-3 h-3 text-purple-500" />
                <span>Citation</span>
              </button>
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={() => setActiveHandwritingTarget('content')}
                className="px-2 py-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                title="Write with Stylus & OCR into Note"
              >
                <Pen className="w-3 h-3 text-indigo-500" />
                <span>Write & OCR</span>
              </button>
            </div>
          )}

          {/* Document Outline Dropdown Drawer */}
          {showOutline && outline.length > 0 && (
            <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800 text-xs animate-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60 dark:border-indigo-800/60 mb-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200">
                  <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Table of Contents ({outline.length} Sections)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOutline(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                {outline.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToHeading(item.id)}
                    className={`w-full text-left py-1 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer ${
                      item.level === 1
                        ? 'font-bold pl-2 text-indigo-950 dark:text-indigo-200'
                        : item.level === 2
                        ? 'pl-5 font-semibold'
                        : 'pl-8 font-normal text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="truncate">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Workspace Body: UNBOXED, NATURAL FLOW, FULL-HEIGHT */}
          <div className="flex-1 flex min-h-0 h-full overflow-hidden">
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div
                className={`flex flex-col h-full min-h-0 ${
                  viewMode === 'split' ? 'w-1/2 border-r border-slate-200 dark:border-slate-800' : 'w-full'
                }`}
              >
                <textarea
                  id="knowledge-textarea"
                  ref={textareaRef}
                  value={selectedNote.content}
                  onChange={(e) => handleUpdateNote({ content: e.target.value })}
                  placeholder="Type Markdown notes here..."
                  rows={35}
                  className="w-full flex-1 min-h-[500px] h-full p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none text-slate-900 dark:text-slate-100 select-text overflow-y-auto"
                />
              </div>
            )}

            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                className={`flex-1 h-full min-h-0 overflow-y-auto px-4 sm:px-8 md:px-12 py-6 select-text transition-all ${
                  viewMode === 'split' ? 'w-1/2' : 'w-full'
                }`}
              >
                <div className={`${readingWidthClasses[readingWidth]}`}>
                  {renderMarkdownPreview(selectedNote.content)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Zen / Focus Reader Fullscreen Mode */}
      {isFocusMode && selectedNote && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
          <div className="px-4 sm:px-8 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsFocusMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Exit Focus Mode (Esc)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Exit Zen</span>
              </button>

              <div className="hidden sm:block">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-md">
                  {selectedNote.title}
                </h2>
                <span className="text-[11px] text-slate-500 font-mono">
                  ~{readingTimeMinutes} min read ({wordCount} words)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setFontSize('sm')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    fontSize === 'sm' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('base')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    fontSize === 'base' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('lg')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    fontSize === 'lg' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  L
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('xl')}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    fontSize === 'xl' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  XL
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFontFamily(fontFamily === 'sans' ? 'serif' : 'sans')}
                className="px-2.5 py-1.5 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                {fontFamily === 'sans' ? 'Serif' : 'Sans'}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (readingWidth === 'standard') setReadingWidth('wide');
                  else if (readingWidth === 'wide') setReadingWidth('full');
                  else setReadingWidth('standard');
                }}
                className="px-2.5 py-1.5 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                Width: {readingWidth.charAt(0).toUpperCase() + readingWidth.slice(1)}
              </button>

              {outline.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowOutline(!showOutline)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                    showOutline
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Outline</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsFocusMode(false);
                  setViewMode('edit');
                }}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Print Note"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zen Outline Drawer */}
          {showOutline && outline.length > 0 && (
            <div className="border-b border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/80 px-4 sm:px-8 py-3 shadow-md">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-200 dark:border-indigo-800">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                    Table of Contents
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOutline(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                  {outline.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToHeading(item.id)}
                      className={`text-left py-1 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors text-xs text-slate-800 dark:text-slate-200 truncate ${
                        item.level === 1 ? 'font-bold' : item.level === 2 ? 'pl-4 font-semibold' : 'pl-6 text-slate-500'
                      }`}
                    >
                      • {item.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-20 py-10">
            <div className={`${readingWidthClasses[readingWidth]}`}>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white pb-3 mb-6 border-b border-slate-200 dark:border-slate-800">
                {selectedNote.title}
              </h1>
              {renderMarkdownPreview(selectedNote.content)}
            </div>
          </div>
        </div>
      )}

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
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select a checklist or template bundle to embed an interactive launcher badge into your study notes:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Checklists ({checklists.length})
              </h4>
              {checklists.map((chk) => (
                <div
                  key={chk.id}
                  onClick={() => handleInsertLink({ type: 'checklist', id: chk.id, title: chk.title })}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors flex items-center justify-between cursor-pointer"
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
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors flex items-center justify-between cursor-pointer"
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

      {/* Zettlr & BibTeX Bibliography & Citation Modal */}
      {showCitationModal && (
        <CitationModal
          entries={bibliography}
          onInsertCitation={handleInsertCitation}
          onUpdateEntries={handleUpdateBibliography}
          onClose={() => setShowCitationModal(false)}
        />
      )}

      {/* Interactive Citation Detail Popover */}
      {activeCitationPopover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveCitationPopover(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  @{activeCitationPopover.id}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                  {activeCitationPopover.type}
                </span>
              </div>
              <button
                onClick={() => setActiveCitationPopover(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {activeCitationPopover.title}
              </h3>
              {activeCitationPopover.author && (
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                  {formatAuthorFull(activeCitationPopover.author)}
                </p>
              )}
              {activeCitationPopover.journal && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                  {activeCitationPopover.journal}
                  {activeCitationPopover.volume ? `, ${activeCitationPopover.volume}` : ''}
                  {activeCitationPopover.number ? `(${activeCitationPopover.number})` : ''}
                  {activeCitationPopover.pages ? `: ${activeCitationPopover.pages}` : ''}
                  {activeCitationPopover.year ? ` (${activeCitationPopover.year})` : ''}
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block mb-1">
                Full Bibliography Reference
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-serif leading-relaxed">
                {formatBibliographyItem(activeCitationPopover)}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              {activeCitationPopover.doi ? (
                <a
                  href={`https://doi.org/${activeCitationPopover.doi.replace(/^https?:\/\/doi\.org\//, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono"
                >
                  <span>Open DOI</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : <div />}

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`[@${activeCitationPopover.id}]`);
                  setActiveCitationPopover(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Copy [@{activeCitationPopover.id}]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Handwriting Scratchpad for Knowledge Hub */}
      {activeHandwritingTarget && selectedNote && (
        <div className="fixed bottom-3 sm:bottom-8 right-2 sm:right-8 z-50 w-full max-w-[420px] px-2 sm:px-0 animate-in slide-in-from-bottom-4 duration-200">
          <HandwritingInputBox
            label={activeHandwritingTarget === 'title' ? 'Note Title' : 'Note Content'}
            value={activeHandwritingTarget === 'title' ? selectedNote.title : ''}
            placeholder={
              activeHandwritingTarget === 'title'
                ? 'Write note title with stylus (OCR)...'
                : 'Write notes with stylus or finger (OCR)...'
            }
            isNumericOnly={false}
            onAccept={(val) => {
              if (activeHandwritingTarget === 'title') {
                handleUpdateNote({ title: val });
              } else {
                const prev = selectedNote.content ? selectedNote.content + '\n' : '';
                handleUpdateNote({ content: prev + val });
              }
              setActiveHandwritingTarget(null);
            }}
            onClose={() => setActiveHandwritingTarget(null)}
          />
        </div>
      )}
    </div>
  );
};
