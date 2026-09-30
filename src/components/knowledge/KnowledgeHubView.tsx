import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Quote,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  List,
  Printer,
  Info,
  Lightbulb,
  AlertTriangle,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Type,
  AlignLeft,
} from 'lucide-react';
import { KnowledgeNote } from '../../types/knowledge';
import { Checklist, Folder as ChecklistFolder } from '../../types/checklist';
import { ClinicalTemplate } from '../../types/template';
import { FolderItem } from '../../types/tab';
import { db } from '../../db/db';
import { ChecklistReaderModal } from '../checklists/ChecklistReaderModal';
import { VaultSyncModal } from './VaultSyncModal';
import { CitationModal } from './CitationModal';
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
  
  // Default to 'preview' (Reader mode) for immediate comfortable reading
  const [viewMode, setViewMode] = useState<'preview' | 'split' | 'edit'>('preview');
  
  // Reading & Layout View States
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [mobileShowList, setMobileShowList] = useState<boolean>(false);
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
  const [bibliography, setBibliography] = useState<BibliographyEntry[]>(DEFAULT_CLINICAL_BIBLIOGRAPHY);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const readerScrollRef = useRef<HTMLDivElement>(null);

  // Load knowledge notes and bibliography library from Dexie
  const loadNotes = async () => {
    try {
      const allNotes = await db.knowledgeNotes.filter((n) => !n.isDeleted).reverse().sortBy('updatedAt');
      setNotes(allNotes);
      if (allNotes.length > 0 && !selectedNoteId) {
        setSelectedNoteId(allNotes[0].id);
      }

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
        if (showOutline) {
          setShowOutline(false);
        } else if (isFocusMode) {
          setIsFocusMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, showOutline]);

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
      content: `# Clinical Study Note

## Clinical Overview & Indication
Write your clinical guideline, review, or patient study notes here.

### Key Clinical Pearls
- Key point 1
- Key point 2

> [!NOTE]
> Clinical Pearl: Document medication dosing and contraindications carefully.

### Treatment Protocol
| Drug | Dose | Route | Frequency | Notes |
| --- | --- | --- | --- | --- |
| Ceftriaxone | 1g-2g | IV | Q24H | Adjust for renal failure |
| Azithromycin | 500mg | PO | Q24H | Monitor QTc |

### Linked Protocols
`,
      folderId: selectedFolderFilter !== 'all' ? selectedFolderFilter : undefined,
      tags: ['clinical'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
    setViewMode('edit');
    setMobileShowList(false);
    await db.knowledgeNotes.put(newNote);
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
      const remaining = notes.filter((n) => n.id !== noteId);
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

  // Print current note
  const handlePrintNote = () => {
    window.print();
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

  // Extract document outline (headings H1, H2, H3)
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

  // Render markdown parser with interactive checklist badges, medical callouts, tables, and Zettlr citations
  const renderMarkdownPreview = (content: string) => {
    const lines = content.split('\n');

    // Extract all citations in this note
    const parsedCitations = extractCitationsFromMarkdown(content);
    const citedKeys = Array.from(new Set(parsedCitations.map((c) => c.citekey.toLowerCase())));
    const citedEntries = bibliography.filter((b) => citedKeys.includes(b.id.toLowerCase()));

    // Helper to render inline citations, highlights, bold, italic, code
    const renderInlineContent = (text: string) => {
      // 1. First parse citations
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const citeRegex = /\[([^\]]*?@[a-zA-Z0-9_:\.\-]+[^\]]*?)\]|(?<=^|[\s(])@([a-zA-Z0-9_:\.\-]+)/g;
      let match: RegExpExecArray | null;

      const parseSubInline = (subText: string, keyPrefix: string): React.ReactNode[] => {
        // Parse highlighted text ==text==, **bold**, *italic*, `code`
        const inlineTokens: React.ReactNode[] = [];
        let iLast = 0;
        const inlineRegex = /(==(.*?)==)|(\*\*(.*?)\*\*)|(\*(.*?)\*)|(`(.*?)`)/g;
        let im: RegExpExecArray | null;

        while ((im = inlineRegex.exec(subText)) !== null) {
          if (im.index > iLast) {
            inlineTokens.push(subText.substring(iLast, im.index));
          }
          if (im[1]) {
            // Highlight ==text==
            inlineTokens.push(
              <mark
                key={`${keyPrefix}-hl-${im.index}`}
                className="bg-amber-200/90 dark:bg-amber-900/60 text-slate-900 dark:text-amber-200 px-1 py-0.2 rounded font-medium"
              >
                {im[2]}
              </mark>
            );
          } else if (im[3]) {
            // Bold **bold**
            inlineTokens.push(
              <strong key={`${keyPrefix}-b-${im.index}`} className="font-bold text-slate-950 dark:text-white">
                {im[4]}
              </strong>
            );
          } else if (im[5]) {
            // Italic *italic*
            inlineTokens.push(
              <em key={`${keyPrefix}-i-${im.index}`} className="italic">
                {im[6]}
              </em>
            );
          } else if (im[7]) {
            // Code `code`
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

        const full = match[0];
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

        lastIndex = match.index + full.length;
      }

      if (lastIndex < text.length) {
        parts.push(...parseSubInline(text.substring(lastIndex), `post-${lastIndex}`));
      }

      return parts.length > 0 ? parts : parseSubInline(text, 'base');
    };

    // Pre-parse lines to group tables and multiline blocks
    const renderedElements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 1. Table Detection (| Header 1 | Header 2 |)
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

      // 2. Headings (with IDs for TOC Outline smooth scrolling)
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

      // 3. Medical Callout Blocks (> [!NOTE], > [!TIP], > [!WARNING], > [!CAUTION])
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

      // Standard Blockquote
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

      // 4. Obsidian / Zettlr Wikilinks [[Title]] or [[Title|Alias]]
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

      // Interactive Template Link [Template: Name](template://id)
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

      // 5. Checkbox Items (- [ ] or - [x])
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

      // 6. Bullets
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

      // 7. Numbered lists (1. , 2. )
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

      // 8. Horizontal rule
      if (line.trim() === '---') {
        renderedElements.push(<hr key={i} className="border-slate-200 dark:border-slate-800 my-4" />);
        i++;
        continue;
      }

      // 9. Standard paragraph
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
      <div
        className={`select-text ${fontFamily === 'serif' ? 'font-serif' : 'font-sans'} ${fontSizeClasses[fontSize]}`}
      >
        {renderedElements}

        {/* Automated Zettlr & Pandoc References / Bibliography Section */}
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

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 h-full p-2 sm:p-4 bg-slate-50/40 dark:bg-slate-950/40">
      {/* Knowledge Hub Top Bar */}
      <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Knowledge Hub
              </h1>
              <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                Study & Protocols
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Clinical guidelines, study notes, protocol checklists, and Zettlr citations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Toggle Sidebar on Desktop */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title={isSidebarOpen ? 'Collapse Notes List' : 'Expand Notes List'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
            <span>{isSidebarOpen ? 'Hide Notes' : 'Show Notes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCitationModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Manage Zettlr & BibTeX Citations (.bib)"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Bibliography</span>
            <span className="sm:hidden">Bib</span> ({bibliography.length})
          </button>

          <button
            type="button"
            onClick={() => setShowVaultModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Sync with Desktop Obsidian Vault, Zettlr, and markdown-oxide"
          >
            <HardDrive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Vault Sync</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Main Container: Flexible Master-Detail without Arbitrary Grid Limits */}
      <div className="flex-1 flex min-h-0 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        {/* Left Pane: Notes Browser (Master) */}
        {/* On Mobile: Shown when mobileShowList is true. On Desktop: Controlled by isSidebarOpen */}
        <div
          className={`${
            mobileShowList ? 'flex' : 'hidden'
          } md:${isSidebarOpen ? 'flex' : 'hidden'} w-full md:w-72 lg:w-84 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 p-3 min-h-0 bg-slate-50/40 dark:bg-slate-900/40`}
        >
          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes, tags, content..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Folder Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 text-xs border-b border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedFolderFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 ${
                selectedFolderFilter === 'all'
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All ({notes.length})
            </button>

            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedFolderFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                  selectedFolderFilter === f.id
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
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
                            onClick={() => {
                              setSelectedNoteId(note.id);
                              setMobileShowList(false);
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
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
                          onClick={() => {
                            setSelectedNoteId(note.id);
                            setMobileShowList(false);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-2xs'
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

        {/* Right Pane: Note Reader & Workspace (Detail) */}
        {/* On Mobile: Shown when !mobileShowList. On Desktop: Always shown, taking 100% of remaining width */}
        {selectedNote ? (
          <div
            className={`${
              mobileShowList ? 'hidden' : 'flex'
            } md:flex flex-1 flex-col min-h-0 bg-white dark:bg-slate-900 overflow-hidden`}
          >
            {/* Note Meta Header & Action Ribbon */}
            <div className="border-b border-slate-200 dark:border-slate-800 p-3 sm:px-6 flex items-start justify-between gap-3 flex-wrap bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex-1 min-w-[220px]">
                {/* Mobile Back to Notes List Button */}
                <div className="flex items-center gap-2 md:hidden mb-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileShowList(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 py-0.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>All Notes</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ~{readingTimeMinutes} min read
                  </span>
                </div>

                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => handleUpdateNote({ title: e.target.value })}
                  placeholder="Note Title"
                  className="text-base sm:text-xl font-bold w-full bg-transparent border-0 focus:outline-none text-slate-900 dark:text-slate-100 p-0"
                />

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                  {/* Folder / Ward Assignment */}
                  <div className="flex items-center gap-1">
                    <Folder className="w-3 h-3 text-indigo-500" />
                    <select
                      value={selectedNote.folderId || ''}
                      onChange={(e) => handleUpdateNote({ folderId: e.target.value || undefined })}
                      className="bg-slate-100 dark:bg-slate-800 border-0 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 focus:outline-none"
                    >
                      <option value="">No Folder (Unassigned)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">
                    ~{readingTimeMinutes} min read ({wordCount} words)
                  </span>

                  <span>•</span>
                  <span>Edited {new Date(selectedNote.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* View Mode Controls & Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Mode Selector: Reader / Split / Edit */}
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

                {/* Table of Contents / Outline Button */}
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
                  onClick={handlePrintNote}
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

            {/* Reading Customization Bar (Shown in 'preview' mode for effortless reading adjustment) */}
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

                  {/* Font Family Selector: Sans vs Serif */}
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
                      title="Optimal 70ch reading column"
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingWidth('wide')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        readingWidth === 'wide' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                      }`}
                      title="Wide reading area"
                    >
                      Wide
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingWidth('full')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        readingWidth === 'full' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                      }`}
                      title="100% full width (ideal for wide tables)"
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

            {/* Note Workspace Body: UNBOXED, NATURAL FLOW */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Textarea Editor (Shown in 'edit' and 'split' modes) */}
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
                    className="w-full flex-1 p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none text-slate-900 dark:text-slate-100 select-text"
                  />
                </div>
              )}

              {/* Rendered Reading Preview (Shown in 'preview' and 'split' modes) */}
              {/* NO INNER BORDER! NO INNER CARD! Text flows freely and comfortably! */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div
                  ref={readerScrollRef}
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 p-8 text-center">
            <div>
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No Note Selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a clinical note from the left sidebar or create a new one.</p>
              <button
                type="button"
                onClick={handleCreateNote}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Note</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zen / Focus Reader Fullscreen Mode */}
      {isFocusMode && selectedNote && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
          {/* Zen Top Header */}
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

            {/* Zen Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Font Size controls */}
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

              {/* Font Style Toggle */}
              <button
                type="button"
                onClick={() => setFontFamily(fontFamily === 'sans' ? 'serif' : 'sans')}
                className="px-2.5 py-1.5 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                title="Toggle Sans / Serif Typography"
              >
                {fontFamily === 'sans' ? 'Serif' : 'Sans'}
              </button>

              {/* Width Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (readingWidth === 'standard') setReadingWidth('wide');
                  else if (readingWidth === 'wide') setReadingWidth('full');
                  else setReadingWidth('standard');
                }}
                className="px-2.5 py-1.5 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                title="Toggle Reading Width"
              >
                Width: {readingWidth.charAt(0).toUpperCase() + readingWidth.slice(1)}
              </button>

              {/* Outline in Zen */}
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

              {/* Switch to Edit */}
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

              {/* Print in Zen */}
              <button
                type="button"
                onClick={handlePrintNote}
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

          {/* Zen Reading Body */}
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

            {/* Checklists List */}
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
    </div>
  );
};
