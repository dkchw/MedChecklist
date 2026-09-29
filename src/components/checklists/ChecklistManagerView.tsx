import React, { useState } from 'react';
import { Checklist } from '../../types/checklist';
import { Plus, Pin, Building2, Copy, Edit, Trash2, Check, Sparkles, ClipboardCheck, Search } from 'lucide-react';
import { templateToMarkdown } from '../../utils/markdownEngine';

interface ChecklistManagerViewProps {
  checklists: Checklist[];
  onOpenEditor: (checklist: Checklist) => void;
  onCreateChecklist: () => void;
  onDuplicateChecklist?: (checklist: Checklist) => void;
  onTogglePin: (checklistId: string) => void;
  onDeleteChecklist: (checklistId: string) => void;
  onInstantiateInEncounter?: (checklist: Checklist) => void;
  onOpenLlmModal: (checklist: Checklist) => void;
}

export const ChecklistManagerView: React.FC<ChecklistManagerViewProps> = ({
  checklists,
  onOpenEditor,
  onCreateChecklist,
  onDuplicateChecklist,
  onTogglePin,
  onDeleteChecklist,
  onInstantiateInEncounter,
  onOpenLlmModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique categories
  const categories = Array.from(
    new Set(checklists.filter((c) => !c.isDeleted && c.category).map((c) => c.category!))
  );

  // Extract unique tags
  const allTags = Array.from(
    new Set(checklists.filter((c) => !c.isDeleted).flatMap((c) => c.tags || []))
  );

  const filteredChecklists = checklists.filter((c) => {
    if (c.isDeleted) return false;
    if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
    if (selectedTag && !c.tags.includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchDesc = (c.description || '').toLowerCase().includes(q);
      const matchInst = (c.institution || '').toLowerCase().includes(q);
      const matchTag = c.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchInst && !matchTag) return false;
    }
    return true;
  });

  const pinnedChecklists = filteredChecklists.filter((c) => c.isPinned);
  const unpinnedChecklists = filteredChecklists.filter((c) => !c.isPinned);

  const handleCopyMarkdown = async (c: Checklist) => {
    const md = templateToMarkdown(c);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const renderChecklistCard = (c: Checklist) => (
    <div
      key={c.id}
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                {c.category || 'General'}
              </span>
              {c.institution && (
                <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-100/50 dark:border-indigo-900/50">
                  <Building2 className="w-3 h-3" />
                  <span>{c.institution}</span>
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {c.title}
            </h3>
          </div>

          <button
            onClick={() => onTogglePin(c.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              c.isPinned
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title={c.isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Description */}
        {c.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
            {c.description}
          </p>
        )}

        {/* Stats */}
        <div className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
          <span>{c.sections.length} Sections</span>
          <span>•</span>
          <span>{c.sections.reduce((acc, s) => acc + s.items.length, 0)} Items</span>
        </div>

        {/* Tags */}
        {c.tags && c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {c.tags.map((tag) => (
              <span
                key={tag}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTag(selectedTag === tag ? null : tag);
                }}
                className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenEditor(c)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Edit Checklist & Reference Values"
          >
            <Edit className="w-4 h-4" />
          </button>
          {onDuplicateChecklist && (
            <button
              onClick={() => onDuplicateChecklist(c)}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Duplicate / Copy this Checklist"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleCopyMarkdown(c)}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Copy as Markdown"
          >
            {copiedId === c.id ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onOpenLlmModal(c)}
            className="p-1.5 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
            title="Generate LLM Prompt / Expand"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteChecklist(c.id)}
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
            title="Delete Checklist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {onInstantiateInEncounter && (
          <button
            onClick={() => onInstantiateInEncounter(c)}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Active Pt</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Modular Clinical Checklists
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Atomic symptom reviews, diagnostic panels, procedural steps, and lab reference values
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateChecklist}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Atomic Checklist</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search checklists by title, lab value, specialty or tag..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {selectedTag && (
            <div className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <span>Filter: #{selectedTag}</span>
              <button onClick={() => setSelectedTag(null)} className="ml-1 hover:text-indigo-900">
                ×
              </button>
            </div>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-colors shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
            }`}
          >
            All Checklists ({checklists.filter((c) => !c.isDeleted).length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {filteredChecklists.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8">
          <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Checklists Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Try adjusting your search query or create a new modular checklist.
          </p>
          <button
            onClick={onCreateChecklist}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Create Checklist
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedChecklists.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 fill-current text-amber-500" />
                <span>Pinned / Core Protocols ({pinnedChecklists.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedChecklists.map(renderChecklistCard)}
              </div>
            </div>
          )}

          {unpinnedChecklists.length > 0 && (
            <div>
              {pinnedChecklists.length > 0 && (
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  All Modular Protocols ({unpinnedChecklists.length})
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedChecklists.map(renderChecklistCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
