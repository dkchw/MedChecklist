import React, { useState } from 'react';
import { Checklist } from '../../types/checklist';
import { ClinicalTemplate } from '../../types/template';
import { PatientEncounter, EncounterChecklistInstance } from '../../types/patient';
import { UserPlus, Check, X, ClipboardCheck, Layers, Folder, FileText, Building2 } from 'lucide-react';

interface NewPatientModalProps {
  checklists: Checklist[];
  templates: ClinicalTemplate[];
  initialGroup?: string;
  initialFacility?: string;
  facilities?: string[];
  wards?: string[];
  onCreate: (encounter: PatientEncounter) => void;
  onClose: () => void;
}

const DEFAULT_FACILITIES = ['General Hospital', 'City Medical Center', 'Memorial Clinic', 'University Hospital', 'St. Jude Medical'];
const DEFAULT_WARDS = ['Emergency', 'ICU', 'Internal Med', 'Cardiology', 'Surgery', 'Pediatrics'];

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
  checklists,
  templates,
  initialGroup,
  initialFacility,
  facilities = [],
  wards = [],
  onCreate,
  onClose,
}) => {
  const mergedFacilities = Array.from(new Set([...facilities, ...DEFAULT_FACILITIES]));
  const mergedWards = Array.from(new Set([...wards, ...DEFAULT_WARDS]));

  const [identifier, setIdentifier] = useState('');
  const [facility, setFacility] = useState(initialFacility || mergedFacilities[0] || 'General Hospital');
  const [group, setGroup] = useState(initialGroup || 'Emergency');
  const [bedNumber, setBedNumber] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'M' | 'F' | 'Other'>('M');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<string[]>([]);
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Handle template selection change
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      return;
    }
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      // Pre-select bundled checklists
      setSelectedChecklistIds(tmpl.checklistIds || []);
      // Pre-populate protocol guidance notes if notes are empty or previous template notes
      if (tmpl.protocolNotes) {
        setGeneralNotes((prev) => {
          if (!prev.trim() || prev.startsWith('### Protocol Guidance:')) {
            return `### Protocol Guidance: ${tmpl.title}\n\n${tmpl.protocolNotes}`;
          }
          return `${prev}\n\n### Protocol Guidance: ${tmpl.title}\n\n${tmpl.protocolNotes}`;
        });
      }
    }
  };

  const toggleChecklist = (id: string) => {
    if (selectedChecklistIds.includes(id)) {
      setSelectedChecklistIds(selectedChecklistIds.filter((cid) => cid !== id));
    } else {
      setSelectedChecklistIds([...selectedChecklistIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    const chosenTemplate = templates.find((t) => t.id === selectedTemplateId);

    const chosenChecklists: EncounterChecklistInstance[] = checklists
      .filter((c) => selectedChecklistIds.includes(c.id) && !c.isDeleted)
      .map((c) => ({
        id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        templateId: c.id,
        title: c.title,
        institution: c.institution,
        sections: JSON.parse(JSON.stringify(c.sections)),
      }));

    const newEncounter: PatientEncounter = {
      id: 'enc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      patientIdentifier: identifier.trim(),
      facility: facility.trim() || undefined,
      group: group.trim() || undefined,
      bedNumber: bedNumber.trim() || undefined,
      age: age.trim() || undefined,
      sex,
      chiefComplaint: chiefComplaint.trim(),
      status: 'active',
      templateId: chosenTemplate?.id,
      templateTitle: chosenTemplate?.title,
      checklists: chosenChecklists,
      generalNotes: generalNotes.trim() || undefined,
      tags: ['#admit', group.trim() ? `#${group.trim().toLowerCase().replace(/\s+/g, '-')}` : '']
        .filter(Boolean),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreate(newEncounter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                New Patient Encounter Dossier
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bundle clinical templates, atomic checklists, and ward assignment
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-900 dark:text-slate-100">
          {/* Patient Identifier */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Patient Identifier / Name *
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. Doe, John or Pt #4092"
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Hospital / Clinic / Facility Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Hospital / Clinic / Medical Center</span>
              </label>
              {mergedFacilities.length > 0 && (
                <select
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  className="text-[11px] px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                >
                  {mergedFacilities.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {mergedFacilities.slice(0, 6).map((fac) => (
                <button
                  key={fac}
                  type="button"
                  onClick={() => setFacility(fac)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                    facility === fac
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {fac}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              placeholder="Or type custom facility name..."
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-sans"
            />
          </div>

          {/* Ward / Group Assignment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-500" />
                <span>Ward / Unit / Bed Block</span>
              </label>
              {mergedWards.length > 0 && (
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="text-[11px] px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                >
                  {mergedWards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {mergedWards.slice(0, 6).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setGroup(w)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                    group === w
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Custom ward/group e.g. Step-down Unit, Trauma Bay 1..."
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Bed / Room, Age, Sex */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bed / Room
              </label>
              <input
                type="text"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                placeholder="e.g. 12B"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Age
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 64"
                className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sex
              </label>
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

          {/* Chief Complaint */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Chief Complaint / Clinical Indication
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="e.g. Acute chest pressure radiating to left jaw, dyspnea"
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Clinical Template Bundle Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Base Clinical Template (Bundle)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Optional</span>
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">None (Custom empty bundle)</option>
              {templates
                .filter((t) => !t.isDeleted)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.checklistIds.length} checklists) - {t.category}
                  </option>
                ))}
            </select>
          </div>

          {/* Modular Checklists Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Attached Modular Checklists</span>
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                {selectedChecklistIds.length} attached
              </span>
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40">
              {checklists
                .filter((c) => !c.isDeleted)
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => toggleChecklist(c.id)}
                    className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      selectedChecklistIds.includes(c.id)
                        ? 'bg-white dark:bg-slate-800 border-indigo-600 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                        : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ClipboardCheck
                        className={`w-4 h-4 shrink-0 ${
                          selectedChecklistIds.includes(c.id)
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{c.title}</span>
                      {c.category && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          {c.category}
                        </span>
                      )}
                    </div>
                    {selectedChecklistIds.includes(c.id) && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Initial Clinical Markdown Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Initial Clinical & Protocol Notes (Markdown)</span>
            </label>
            <textarea
              rows={3}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Clinical protocol directives, handoff instructions, or template guidance..."
              className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Create Patient Encounter Dossier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
