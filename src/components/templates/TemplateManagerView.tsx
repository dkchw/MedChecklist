import React, { useState } from 'react';
import { ClinicalTemplate } from '../../types/template';
import { Checklist } from '../../types/checklist';
import {
  Plus,
  Pin,
  Building2,
  Copy,
  Edit,
  Trash2,
  Check,
  Layers,
  ClipboardCheck,
  FileText,
  Search,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { TemplateReaderModal } from './TemplateReaderModal';
import { ClinicalRecallModal } from '../common/ClinicalRecallModal';

interface TemplateManagerViewProps {
  templates: ClinicalTemplate[];
  availableChecklists: Checklist[];
  onOpenEditor: (template: ClinicalTemplate) => void;
  onCreateTemplate: () => void;
  onTogglePin: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplateToPatient: (template: ClinicalTemplate) => void;
}

export const TemplateManagerView: React.FC<TemplateManagerViewProps> = ({
  templates,
  availableChecklists,
  onOpenEditor,
  onCreateTemplate,
  onTogglePin,
  onDeleteTemplate,
  onApplyTemplateToPatient,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [readingTemplate, setReadingTemplate] = useState<ClinicalTemplate | null>(null);
  const [activeRecall, setActiveRecall] = useState<{
    title: string;
    subtitle?: string;
    category?: string;
    rationale?: string;
  } | null>(null);

  // Categories
  const categories = Array.from(
    new Set(templates.filter((t) => !t.isDeleted && t.category).map((t) => t.category))
  );

  // Tags
  const allTags = Array.from(
    new Set(templates.filter((t) => !t.isDeleted).flatMap((t) => t.tags || []))
  );

  const filteredTemplates = templates.filter((t) => {
    if (t.isDeleted) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedTag && !t.tags.includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchInst = (t.institution || '').toLowerCase().includes(q);
      const matchTag = t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchInst && !matchTag) return false;
    }
    return true;
  });

  const pinnedTemplates = filteredTemplates.filter((t) => t.isPinned);
  const unpinnedTemplates = filteredTemplates.filter((t) => !t.isPinned);

  const handleCopySummary = async (t: ClinicalTemplate) => {
    const checklistNames = t.checklistIds
      .map((cid) => availableChecklists.find((c) => c.id === cid)?.title)
      .filter(Boolean)
      .join(', ');

    const md = `# ${t.title}
> Department: ${t.category} | Institution: ${t.institution || 'Standard'}
> Bundled Checklists: ${checklistNames || 'None'}

${t.description || ''}

${t.protocolNotes ? `### Protocol Guidance Notes:\n${t.protocolNotes}` : ''}`;

    try {
      await navigator.clipboard.writeText(md);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const renderTemplateCard = (t: ClinicalTemplate) => {
    const bundledChecklists = t.checklistIds
      .map((cid) => availableChecklists.find((c) => c.id === cid))
      .filter((c): c is Checklist => !!c && !c.isDeleted);

    return (
      <div
        key={t.id}
        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 cursor-pointer" onClick={() => setReadingTemplate(t)}>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                  {t.category || 'General'}
                </span>
                {t.institution && (
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                    <Building2 className="w-3 h-3" />
                    <span>{t.institution}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {t.title}
                </h3>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRecall({
                      title: t.title,
                      subtitle: t.description,
                      category: t.category,
                      rationale: t.protocolNotes || 'Bundled clinical protocol directives.',
                    });
                  }}
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Clinical Recall Note"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={() => onTogglePin(t.id)}
              className={`p-1.5 rounded-lg transition-colors ${
                t.isPinned
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={t.isPinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Description */}
          {t.description && (
            <p
              onClick={() => setReadingTemplate(t)}
              className="text-xs text-slate-600 dark:text-slate-300 mb-3 line-clamp-2 cursor-pointer"
            >
              {t.description}
            </p>
          )}

          {/* Bundled Checklists list */}
          <div className="mb-3 cursor-pointer" onClick={() => setReadingTemplate(t)}>
            <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Bundled Checklists ({bundledChecklists.length}):</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {bundledChecklists.length > 0 ? (
                bundledChecklists.map((bc) => (
                  <span
                    key={bc.id}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md font-semibold border border-slate-200 dark:border-slate-700"
                  >
                    {bc.title}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-400 italic">No checklists bundled</span>
              )}
            </div>
          </div>

          {/* Protocol notes preview */}
          {t.protocolNotes && (
            <div
              onClick={() => setReadingTemplate(t)}
              className="mb-3 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
                <FileText className="w-3 h-3 text-indigo-500" />
                <span>Protocol Guidance:</span>
              </div>
              <p className="line-clamp-2 font-mono text-[10px]">{t.protocolNotes}</p>
            </div>
          )}

          {/* Tags */}
          {t.tags && t.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag(selectedTag === tag ? null : tag);
                  }}
                  className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    selectedTag === tag
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
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
              onClick={() => setReadingTemplate(t)}
              className="p-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition-colors flex items-center gap-1 font-semibold text-xs"
              title="Read & Run Bundle Interactively"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Read</span>
            </button>
            <button
              onClick={() => onOpenEditor(t)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit Template Bundle"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleCopySummary(t)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Copy Summary Markdown"
            >
              {copiedId === t.id ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onDeleteTemplate(t.id)}
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
              title="Delete Template"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onApplyTemplateToPatient(t)}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Apply to Patient</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Clinical Template Bundles
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bundles grouping multiple modular checklists and clinical protocol notes for quick patient setup
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateTemplate}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Template Bundle</span>
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
              placeholder="Search template bundles by title, department or tags..."
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
            All Template Bundles ({templates.filter((t) => !t.isDeleted).length})
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

      {/* Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8">
          <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Clinical Templates Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Create bundles of atomic checklists with standard protocol guidance.
          </p>
          <button
            onClick={onCreateTemplate}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Create Template Bundle
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedTemplates.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 fill-current text-amber-500" />
                <span>Pinned Template Bundles ({pinnedTemplates.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedTemplates.map(renderTemplateCard)}
              </div>
            </div>
          )}

          {unpinnedTemplates.length > 0 && (
            <div>
              {pinnedTemplates.length > 0 && (
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  All Clinical Templates ({unpinnedTemplates.length})
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedTemplates.map(renderTemplateCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standalone Interactive Template Bundle Reader */}
      {readingTemplate && (
        <TemplateReaderModal
          template={readingTemplate}
          availableChecklists={availableChecklists}
          onClose={() => setReadingTemplate(null)}
          onApplyTemplateToPatient={onApplyTemplateToPatient}
        />
      )}

      {/* Clinical Recall Popover */}
      {activeRecall && (
        <ClinicalRecallModal
          title={activeRecall.title}
          subtitle={activeRecall.subtitle}
          category={activeRecall.category}
          rationale={activeRecall.rationale}
          onClose={() => setActiveRecall(null)}
        />
      )}
    </div>
  );
};
