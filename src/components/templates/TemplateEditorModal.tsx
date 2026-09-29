import React, { useState } from 'react';
import { ChecklistTemplate, ChecklistSection, ChecklistItem } from '../../types/checklist';
import { templateToMarkdown, parseMarkdownToChecklist } from '../../utils/markdownEngine';
import { Plus, Trash2, Star, Save, FileCode, Check, X, Building2 } from 'lucide-react';

interface TemplateEditorModalProps {
  template: ChecklistTemplate;
  onSave: (updated: ChecklistTemplate) => void;
  onClose: () => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  template,
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description || '');
  const [category, setCategory] = useState(template.category || 'General');
  const [institution, setInstitution] = useState(template.institution || '');
  const [tagsStr, setTagsStr] = useState(template.tags.join(', '));
  const [sections, setSections] = useState<ChecklistSection[]>(JSON.parse(JSON.stringify(template.sections)));
  const [markdownText, setMarkdownText] = useState(templateToMarkdown(template));

  // Switch to markdown tab
  const handleSwitchToMarkdown = () => {
    const currentTemplate: ChecklistTemplate = {
      ...template,
      title,
      description,
      category,
      institution,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      sections,
      updatedAt: Date.now(),
    };
    setMarkdownText(templateToMarkdown(currentTemplate));
    setActiveTab('markdown');
  };

  // Switch to visual tab
  const handleSwitchToVisual = () => {
    try {
      const parsed = parseMarkdownToChecklist(markdownText);
      setTitle(parsed.title);
      setDescription(parsed.description);
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
        }
      ]
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
      const updated: ChecklistTemplate = {
        ...template,
        title: parsed.title,
        description: parsed.description || description,
        category: category || 'General',
        institution: parsed.institution || institution,
        tags: parsed.tags.length > 0 ? parsed.tags : tagsStr.split(',').map(t => t.trim()).filter(Boolean),
        sections: parsed.sections,
        isCustom: true,
        updatedAt: Date.now(),
      };
      onSave(updated);
    } else {
      const updated: ChecklistTemplate = {
        ...template,
        title,
        description,
        category,
        institution,
        tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
        sections,
        isCustom: true,
        updatedAt: Date.now(),
      };
      onSave(updated);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Edit Template & Hospital Reference Values
            </h2>
            <p className="text-xs text-slate-500">
              Tailor reference lab ranges, clinical criteria, and sections to your hospital
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === 'markdown') handleSwitchToVisual();
              }}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'visual'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Visual Form Editor
            </button>
            <button
              onClick={() => {
                if (activeTab === 'visual') handleSwitchToMarkdown();
              }}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'markdown'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Direct Markdown Editor</span>
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'markdown' ? (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Template Markdown (Full GFM Specification):
              </label>
              <textarea
                rows={18}
                value={markdownText}
                onChange={(e) => setMarkdownText(e.target.value)}
                className="w-full font-mono text-xs p-4 bg-slate-900 text-slate-100 rounded-xl leading-relaxed outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Title:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hospital / Institution Name:</span>
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. St. Jude Hospital, Central Medical"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category:
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tags (comma separated):
                  </label>
                  <input
                    type="text"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    placeholder="labs, troponin, icu"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Sections & Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Sections & Checklist Items
                  </h3>
                  <button
                    onClick={handleAddSection}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Section</span>
                  </button>
                </div>

                {sections.map((sec, secIdx) => (
                  <div key={sec.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => {
                          const updated = [...sections];
                          updated[secIdx].title = e.target.value;
                          setSections(updated);
                        }}
                        placeholder="Section Title"
                        className="font-bold text-sm text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-slate-900 outline-none pb-0.5 flex-1"
                      />
                      <button
                        onClick={() => handleRemoveSection(secIdx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded"
                        title="Delete Section"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sec.items.map((item, itmIdx) => (
                        <div key={item.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-xs">
                          <button
                            onClick={() => {
                              const updated = [...sections];
                              updated[secIdx].items[itmIdx].starred = !updated[secIdx].items[itmIdx].starred;
                              setSections(updated);
                            }}
                            className={`p-1 rounded ${
                              item.starred ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
                            }`}
                            title="Star / Important"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[secIdx].items[itmIdx].text = e.target.value;
                              setSections(updated);
                            }}
                            placeholder="Item name / Clinical symptom / Test name"
                            className="flex-1 bg-white px-2.5 py-1.5 rounded border border-slate-200 outline-none"
                          />

                          <input
                            type="text"
                            value={item.referenceValue || ''}
                            onChange={(e) => {
                              const updated = [...sections];
                              updated[secIdx].items[itmIdx].referenceValue = e.target.value;
                              setSections(updated);
                            }}
                            placeholder="Ref: e.g. < 14 ng/L, 3.5 - 5.0"
                            className="w-48 bg-white px-2.5 py-1.5 rounded border border-slate-200 outline-none text-slate-600"
                            title="Hospital Reference Value / Cutoff"
                          />

                          <button
                            onClick={() => handleRemoveItem(secIdx, itmIdx)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => handleAddItem(secIdx)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {institution ? `Target: ${institution}` : 'Standard Institutional Template'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
