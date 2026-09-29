import React, { useState } from 'react';
import { ChecklistTemplate, Folder } from '../../types/checklist';
import { Plus, Pin, FileText, Building2, Tag, Copy, Edit, Trash2, Check, Sparkles } from 'lucide-react';
import { templateToMarkdown } from '../../utils/markdownEngine';

interface TemplateManagerViewProps {
  templates: ChecklistTemplate[];
  folders: Folder[];
  onOpenEditor: (template: ChecklistTemplate) => void;
  onCreateTemplate: () => void;
  onTogglePin: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onInstantiateInEncounter: (template: ChecklistTemplate) => void;
  onOpenLlmModal: (template: ChecklistTemplate) => void;
}

export const TemplateManagerView: React.FC<TemplateManagerViewProps> = ({
  templates,
  folders,
  onOpenEditor,
  onCreateTemplate,
  onTogglePin,
  onDeleteTemplate,
  onInstantiateInEncounter,
  onOpenLlmModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = Array.from(
    new Set(templates.flatMap((t) => t.tags || []))
  );

  const filteredTemplates = templates.filter((t) => {
    if (t.isDeleted) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (selectedTag && !t.tags.includes(selectedTag)) return false;
    return true;
  });

  const pinnedTemplates = filteredTemplates.filter((t) => t.isPinned);
  const unpinnedTemplates = filteredTemplates.filter((t) => !t.isPinned);

  const handleCopyMarkdown = async (t: ChecklistTemplate) => {
    const md = templateToMarkdown(t);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const renderTemplateCard = (t: ChecklistTemplate) => (
    <div
      key={t.id}
      className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {t.category || 'General'}
              </span>
              {t.institution && (
                <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>{t.institution}</span>
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {t.title}
            </h3>
          </div>

          <button
            onClick={() => onTogglePin(t.id)}
            className={`p-1.5 rounded-lg transition-colors ${
              t.isPinned ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-slate-600'
            }`}
            title={t.isPinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Description */}
        {t.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{t.description}</p>
        )}

        {/* Section & item stats */}
        <div className="text-[11px] text-slate-400 mb-3 flex items-center gap-2">
          <span>{t.sections.length} Sections</span>
          <span>•</span>
          <span>{t.sections.reduce((acc, s) => acc + s.items.length, 0)} Checklist Items</span>
        </div>

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
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenEditor(t)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Template & Reference Values"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleCopyMarkdown(t)}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Copy as Markdown"
          >
            {copiedId === t.id ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onOpenLlmModal(t)}
            className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Generate LLM Prompt / Expand"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDeleteTemplate(t.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Template"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onInstantiateInEncounter(t)}
          className="text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Apply to Patient</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Clinical Checklists & Hospital Templates
          </h1>
          <p className="text-xs text-slate-500">
            Standard protocols, admission checklists, and lab reference values customized per hospital
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateTemplate}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Template</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs by Folder / Category */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setSelectedCategory('all');
            setSelectedTag(null);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all' && !selectedTag
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Templates ({templates.filter((t) => !t.isDeleted).length})
        </button>

        {folders.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setSelectedCategory(f.name);
              setSelectedTag(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === f.name
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.name}
          </button>
        ))}

        {selectedTag && (
          <div className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-xl text-xs font-semibold">
            <span>#{selectedTag}</span>
            <button onClick={() => setSelectedTag(null)} className="hover:text-indigo-900">
              ×
            </button>
          </div>
        )}
      </div>

      {/* Pinned Templates */}
      {pinnedTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>Pinned Checklists & Protocols</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedTemplates.map(renderTemplateCard)}
          </div>
        </div>
      )}

      {/* Standard / Unpinned Templates */}
      <div className="space-y-3">
        {pinnedTemplates.length > 0 && (
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            All Clinical Protocols
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unpinnedTemplates.map(renderTemplateCard)}
        </div>
      </div>
    </div>
  );
};
