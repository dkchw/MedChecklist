import React, { useState } from 'react';
import { ClinicalTemplate } from '../../types/template';
import { Checklist } from '../../types/checklist';
import { Layers, Save, X, ClipboardCheck, Check, FileText } from 'lucide-react';

interface ClinicalTemplateEditorModalProps {
  template: ClinicalTemplate;
  availableChecklists: Checklist[];
  onSave: (updated: ClinicalTemplate) => void;
  onClose: () => void;
}

export const ClinicalTemplateEditorModal: React.FC<ClinicalTemplateEditorModalProps> = ({
  template,
  availableChecklists,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description || '');
  const [category, setCategory] = useState(template.category || 'General');
  const [institution, setInstitution] = useState(template.institution || '');
  const [tagsStr, setTagsStr] = useState((template.tags || []).join(', '));
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<string[]>(
    template.checklistIds || []
  );
  const [protocolNotes, setProtocolNotes] = useState<string>(template.protocolNotes || '');

  const toggleChecklist = (id: string) => {
    if (selectedChecklistIds.includes(id)) {
      setSelectedChecklistIds(selectedChecklistIds.filter((cid) => cid !== id));
    } else {
      setSelectedChecklistIds([...selectedChecklistIds, id]);
    }
  };

  const handleSave = () => {
    const updated: ClinicalTemplate = {
      ...template,
      title: title.trim() || 'Untitled Template Bundle',
      description: description.trim(),
      category: category.trim() || 'General',
      institution: institution.trim() || undefined,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      checklistIds: selectedChecklistIds,
      protocolNotes: protocolNotes.trim() || undefined,
      updatedAt: Date.now(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {template.id ? 'Edit Clinical Template Bundle' : 'New Clinical Template Bundle'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Group modular checklists with clinical guidelines & protocol notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-900 dark:text-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Template Bundle Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sepsis Shock Resuscitation Bundle"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category / Department
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. ICU, Emergency, Inpatient Med"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Institution / Guidelines Origin
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Surviving Sepsis Campaign / Hospital Protocol"
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
                placeholder="sepsis, resuscitation, critical-care"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Clinical Objective
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Comprehensive admission bundle combining immediate resuscitation, labs, and monitoring"
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Bundled Modular Checklists Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Group Modular Checklists into this Template</span>
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                {selectedChecklistIds.length} checklists grouped
              </span>
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40">
              {availableChecklists
                .filter((c) => !c.isDeleted)
                .map((c) => {
                  const isSelected = selectedChecklistIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleChecklist(c.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-white dark:bg-slate-800 border-indigo-600 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                          : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <ClipboardCheck
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{c.title}</span>
                        {c.category && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {c.category}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          ({c.sections?.reduce((sum, s) => sum + s.items.length, 0) || 0} items)
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Clinical Protocol Guidance Notes in Markdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Protocol Guidance & Clinical Notes (Markdown)</span>
              </span>
              <span className="text-[11px] text-slate-400">Pre-populated onto new patient</span>
            </label>
            <textarea
              rows={6}
              value={protocolNotes}
              onChange={(e) => setProtocolNotes(e.target.value)}
              placeholder="e.g.&#10;1. Fluid challenge: 30 mL/kg crystalloid within 3 hours.&#10;2. Vasopressors: Initiate norepinephrine if MAP < 65 mmHg after fluids.&#10;3. Antibiotics: Administer empiric broad-spectrum coverage within 1 hour."
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono resize-none leading-relaxed"
            />
          </div>
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
            <span>Save Template Bundle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
