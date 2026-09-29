import React, { useState } from 'react';
import { Checklist, ChecklistSection, ChecklistItem } from '../../types/checklist';
import { templateToMarkdown, parseMarkdownToChecklist } from '../../utils/markdownEngine';
import { Plus, Trash2, Save, FileCode, Check, X, Building2, Tag } from 'lucide-react';

interface ChecklistEditorModalProps {
  checklist: Checklist;
  onSave: (updated: Checklist) => void;
  onClose: () => void;
}

export const ChecklistEditorModal: React.FC<ChecklistEditorModalProps> = ({
  checklist,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');
  const [title, setTitle] = useState(checklist.title);
  const [description, setDescription] = useState(checklist.description || '');
  const [category, setCategory] = useState(checklist.category || 'General');
  const [institution, setInstitution] = useState(checklist.institution || '');
  const [tagsStr, setTagsStr] = useState(checklist.tags.join(', '));
  const [sections, setSections] = useState<ChecklistSection[]>(
    JSON.parse(JSON.stringify(checklist.sections || []))
  );
  const [markdownText, setMarkdownText] = useState(templateToMarkdown(checklist));

  const handleSwitchToMarkdown = () => {
    const currentChecklist: Checklist = {
      ...checklist,
      title,
      description,
      category,
      institution,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      sections,
      updatedAt: Date.now(),
    };
    setMarkdownText(templateToMarkdown(currentChecklist));
    setActiveTab('markdown');
  };

  const handleSwitchToVisual = () => {
    try {
      const parsed = parseMarkdownToChecklist(markdownText);
      setTitle(parsed.title);
      setDescription(parsed.description || '');
      if (parsed.institution) setInstitution(parsed.institution);
      if (parsed.tags.length > 0) setTagsStr(parsed.tags.join(', '));
      setSections(parsed.sections);
    } catch {}
    setActiveTab('visual');
  };

  const handleAddSection = () => {
    const newSec: ChecklistSection = {
      id: 'sec-' + Math.random().toString(36).substring(2, 9),
      title: 'New Section',
      items: [
        {
          id: 'item-' + Math.random().toString(36).substring(2, 9),
          text: 'New Checklist Item',
          checked: false,
        },
      ],
    };
    setSections([...sections, newSec]);
  };

  const handleRemoveSection = (sectionIndex: number) => {
    setSections(sections.filter((_, idx) => idx !== sectionIndex));
  };

  const handleAddItem = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].items.push({
      id: 'item-' + Math.random().toString(36).substring(2, 9),
      text: '',
      checked: false,
    });
    setSections(updated);
  };

  const handleRemoveItem = (sectionIndex: number, itemIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].items = updated[sectionIndex].items.filter((_, idx) => idx !== itemIndex);
    setSections(updated);
  };

  const handleSave = () => {
    if (activeTab === 'markdown') {
      const parsed = parseMarkdownToChecklist(markdownText);
      const updated: Checklist = {
        ...checklist,
        title: parsed.title,
        description: parsed.description || description,
        category: category || 'General',
        institution: parsed.institution || institution,
        tags: parsed.tags.length > 0 ? parsed.tags : tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
        sections: parsed.sections,
        updatedAt: Date.now(),
      };
      onSave(updated);
    } else {
      const updated: Checklist = {
        ...checklist,
        title: title.trim() || 'Untitled Checklist',
        description: description.trim(),
        category: category.trim() || 'General',
        institution: institution.trim() || undefined,
        tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
        sections,
        updatedAt: Date.now(),
      };
      onSave(updated);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {checklist.id ? 'Edit Checklist' : 'New Atomic Checklist'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visual structured checklist builder or direct Markdown editor
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300/60 dark:border-slate-700">
              <button
                type="button"
                onClick={handleSwitchToVisual}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'visual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Visual
              </button>
              <button
                type="button"
                onClick={handleSwitchToMarkdown}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === 'markdown'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Markdown (GFM)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-900 dark:text-slate-100">
          {activeTab === 'visual' ? (
            <>
              {/* Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Checklist Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sepsis One-Hour Bundle"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category / Specialty
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. ICU, Emergency, Cardiology, Surgery"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institution / Hospital
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. General Hospital / Surviving Sepsis"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="sepsis, lactate, resuscitation"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Clinical Summary
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Immediate interventions recommended within the first hour of sepsis recognition"
                  className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Sections & Items */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Checklist Sections ({sections.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddSection}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>

                {sections.map((sec, secIdx) => (
                  <div
                    key={sec.id || secIdx}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const updated = [...sections];
                          updated[secIdx].title = e.target.value;
                          setSections(updated);
                        }}
                        className="font-bold text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex-1 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(secIdx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Section Items */}
                    <div className="space-y-2 pl-2">
                      {sec.items.map((item, itemIdx) => (
                        <div key={item.id || itemIdx} className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-mono select-none">•</span>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[secIdx].items[itemIdx].text = e.target.value;
                              setSections(updated);
                            }}
                            placeholder="Checklist step description..."
                            className="flex-1 text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                          />
                          <input
                            type="text"
                            value={item.referenceValue || ''}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[secIdx].items[itemIdx].referenceValue = e.target.value;
                              setSections(updated);
                            }}
                            placeholder="Ref / Target (optional)"
                            className="w-36 text-xs px-2 py-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(secIdx, itemIdx)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddItem(secIdx)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 pt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Checklist Item</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {"Edit markdown directly. Format uses `# Title`, `> Metadata`, `## Section`, and `- [ ] Item (ref)`."}
              </p>
              <textarea
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                rows={18}
                className="w-full font-mono text-xs p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-900 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save Checklist</span>
          </button>
        </div>
      </div>
    </div>
  );
};
