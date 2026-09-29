import React, { useState } from 'react';
import { ChecklistTemplate } from '../../types/checklist';
import { PatientEncounter, EncounterChecklistInstance } from '../../types/patient';
import { UserPlus, Check, X, ClipboardCheck } from 'lucide-react';

interface NewPatientModalProps {
  templates: ChecklistTemplate[];
  onCreate: (encounter: PatientEncounter) => void;
  onClose: () => void;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
  templates,
  onCreate,
  onClose,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [bedNumber, setBedNumber] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | 'Other'>('M');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [tagsStr, setTagsStr] = useState('#admit');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    templates.filter(t => t.isPinned).map(t => t.id)
  );

  const toggleTemplate = (id: string) => {
    if (selectedTemplateIds.includes(id)) {
      setSelectedTemplateIds(selectedTemplateIds.filter(t => t !== id));
    } else {
      setSelectedTemplateIds([...selectedTemplateIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    const chosenChecklists: EncounterChecklistInstance[] = templates
      .filter(t => selectedTemplateIds.includes(t.id))
      .map(t => ({
        id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        templateId: t.id,
        title: t.title,
        institution: t.institution,
        sections: JSON.parse(JSON.stringify(t.sections)),
      }));

    const newEncounter: PatientEncounter = {
      id: 'enc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      patientIdentifier: identifier.trim(),
      bedNumber: bedNumber.trim() || undefined,
      age: age.trim() || undefined,
      sex,
      chiefComplaint: chiefComplaint.trim(),
      status: 'active',
      checklists: chosenChecklists,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreate(newEncounter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">New Patient Encounter Box</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Create a bedside encounter dossier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Patient Identifier / Name *
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. Bed 12 - Doe, J. or Pt #4092"
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bed / Room</label>
              <input
                type="text"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                placeholder="e.g. 12B"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Age</label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 64"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chief Complaint / Reason for Encounter
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Acute dyspnea, suspected pulmonary embolism"
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Attach Initial Checklists & Templates:</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                {selectedTemplateIds.length} selected
              </span>
            </label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40">
              {templates.filter(t => !t.isDeleted).map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTemplate(t.id)}
                  className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                    selectedTemplateIds.includes(t.id)
                      ? 'bg-white dark:bg-slate-800 border-slate-900 dark:border-indigo-500 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                      : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <ClipboardCheck className={`w-4 h-4 shrink-0 ${selectedTemplateIds.includes(t.id) ? 'text-slate-900 dark:text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{t.title}</span>
                  </div>
                  {selectedTemplateIds.includes(t.id) && (
                    <Check className="w-4 h-4 text-slate-900 dark:text-indigo-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Create Patient Encounter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
