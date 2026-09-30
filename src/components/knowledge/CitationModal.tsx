import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Download,
  Upload,
  Quote,
  Trash2,
} from 'lucide-react';
import {
  BibliographyEntry,
  formatAuthorFull,
  formatAuthorShort,
  formatBibliographyItem,
  parseBibtex,
  exportToBibtex,
} from '../../utils/bibtexParser';

interface CitationModalProps {
  entries: BibliographyEntry[];
  onInsertCitation?: (citationText: string) => void;
  onUpdateEntries: (entries: BibliographyEntry[]) => void;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({
  entries,
  onInsertCitation,
  onUpdateEntries,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<BibliographyEntry | null>(
    entries[0] || null
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [bibtexInput, setBibtexInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [citationFormat, setCitationFormat] = useState<'parenthetical' | 'intext'>('parenthetical');
  const [locatorInput, setLocatorInput] = useState('');

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      (e.author && e.author.toLowerCase().includes(q)) ||
      (e.journal && e.journal.toLowerCase().includes(q)) ||
      (e.year && e.year.includes(q))
    );
  });

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(`@${key}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleInsert = (entry: BibliographyEntry) => {
    if (!onInsertCitation) return;
    const locator = locatorInput.trim() ? `, ${locatorInput.trim()}` : '';
    const citeText =
      citationFormat === 'parenthetical'
        ? `[@${entry.id}${locator}]`
        : `@${entry.id}${locator}`;
    onInsertCitation(citeText);
    onClose();
  };

  const handleImportBibtex = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const parsed = parseBibtex(text);
        if (parsed.length > 0) {
          // Merge avoiding duplicate citekeys
          const existingKeys = new Set(entries.map((item) => item.id));
          const newItems = parsed.filter((item) => !existingKeys.has(item.id));
          onUpdateEntries([...entries, ...newItems]);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExportBibtex = () => {
    const text = exportToBibtex(entries);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'references.bib';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddManualBibtex = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bibtexInput.trim()) return;
    const parsed = parseBibtex(bibtexInput);
    if (parsed.length > 0) {
      const existingKeys = new Set(entries.map((item) => item.id));
      const newItems = parsed.filter((item) => !existingKeys.has(item.id));
      onUpdateEntries([...entries, ...newItems]);
      setBibtexInput('');
      setIsAddingNew(false);
      setSelectedEntry(parsed[0]);
    }
  };

  const handleDeleteEntry = (key: string) => {
    if (window.confirm(`Remove reference @${key}?`)) {
      const updated = entries.filter((e) => e.id !== key);
      onUpdateEntries(updated);
      if (selectedEntry?.id === key) {
        setSelectedEntry(updated[0] || null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Bibliography & Citations</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Zettlr / BibTeX
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {entries.length} references in library (.bib synced)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Import / Export .bib */}
            <label
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
              title="Import .bib file"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Import .bib</span>
              <input
                type="file"
                accept=".bib,.txt,.json"
                className="hidden"
                onChange={handleImportBibtex}
              />
            </label>

            <button
              onClick={handleExportBibtex}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
              title="Export library as references.bib"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add BibTeX</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add BibTeX Collapsible Form */}
        {isAddingNew && (
          <form
            onSubmit={handleAddManualBibtex}
            className="p-4 border-b border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                Paste BibTeX Entry:
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                e.g. @article&#123;citekey, author=&#123;...&#125;, title=&#123;...&#125;&#125;
              </span>
            </div>
            <textarea
              autoFocus
              rows={4}
              value={bibtexInput}
              onChange={(e) => setBibtexInput(e.target.value)}
              placeholder={`@article{example2023,\n  title = {Clinical Note Protocols},\n  author = {Smith, John},\n  year = {2023}\n}`}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
              >
                Parse & Add Reference
              </button>
            </div>
          </form>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Reference List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search citekey, author, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  No references match search.
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedEntry(entry)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          @{entry.id}
                        </span>
                        {entry.year && (
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {entry.year}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold line-clamp-1">{entry.title}</div>
                      <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {formatAuthorShort(entry.author)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Reference Detail View */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {selectedEntry ? (
              <>
                {/* Citekey & Quick Copy Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      @{selectedEntry.id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                      {selectedEntry.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyKey(selectedEntry.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy @citekey"
                    >
                      {copiedKey === selectedEntry.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteEntry(selectedEntry.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Delete reference"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title & Metadata */}
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                    {selectedEntry.title}
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {formatAuthorFull(selectedEntry.author)}
                  </div>
                  {selectedEntry.journal && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                      {selectedEntry.journal}
                      {selectedEntry.volume ? `, Vol. ${selectedEntry.volume}` : ''}
                      {selectedEntry.number ? `(${selectedEntry.number})` : ''}
                      {selectedEntry.pages ? `: pp. ${selectedEntry.pages}` : ''}
                    </div>
                  )}
                  {selectedEntry.doi && (
                    <div className="text-xs">
                      <a
                        href={`https://doi.org/${selectedEntry.doi.replace(/^https?:\/\/doi\.org\//, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        <span>doi:{selectedEntry.doi}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Formatted Citation (APA / Chicago Standard) */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Formatted Bibliography Entry (Zettlr Standard)
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                    {formatBibliographyItem(selectedEntry)}
                  </p>
                </div>

                {/* Insert into Note Configurator (if note open) */}
                {onInsertCitation && (
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5" />
                      <span>Insert Citation into Current Note</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Format Style
                        </label>
                        <select
                          value={citationFormat}
                          onChange={(e) => setCitationFormat(e.target.value as any)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                        >
                          <option value="parenthetical">
                            Parenthetical: [@{selectedEntry.id}]
                          </option>
                          <option value="intext">
                            Narrative: @{selectedEntry.id}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Locator / Page (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. p. 45 or ch. 2"
                          value={locatorInput}
                          onChange={(e) => setLocatorInput(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleInsert(selectedEntry)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        Insert {citationFormat === 'parenthetical' ? `[@${selectedEntry.id}${locatorInput ? `, ${locatorInput}` : ''}]` : `@${selectedEntry.id}${locatorInput ? `, ${locatorInput}` : ''}`}
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Select a reference from the library or click "Add BibTeX"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
