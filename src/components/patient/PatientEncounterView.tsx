import React, { useState } from 'react';
import { PatientEncounter, EncounterChecklistInstance } from '../../types/patient';
import { ChecklistTemplate, MedicalImage, MedicalLink } from '../../types/checklist';
import { encounterToMarkdown } from '../../utils/markdownEngine';
import {
  User,
  Plus,
  Play,
  Sparkles,
  Copy,
  Star,
  Check,
  Building2,
  Trash2,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronRight,
  Archive,
  PenTool,
  Sliders,
  Image as ImageIcon,
  Link as LinkIcon,
  ExternalLink,
  Maximize2,
  Globe,
  Video,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttachModal } from '../common/AttachModal';

interface PatientEncounterViewProps {
  encounters: PatientEncounter[];
  selectedEncounterId: string | null;
  templates: ChecklistTemplate[];
  onSelectEncounter: (id: string) => void;
  onUpdateEncounter: (updated: PatientEncounter) => void;
  onOpenNewPatientModal: () => void;
  onEnterPatientFacingMode: () => void;
  onOpenLlmModal: () => void;
  onOpenTemplateEditor: (templateId: string) => void;
  onDeleteEncounter: (id: string) => void;
}

export const PatientEncounterView: React.FC<PatientEncounterViewProps> = ({
  encounters,
  selectedEncounterId,
  templates,
  onSelectEncounter,
  onUpdateEncounter,
  onOpenNewPatientModal,
  onEnterPatientFacingMode,
  onOpenLlmModal,
  onOpenTemplateEditor,
  onDeleteEncounter,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachTarget, setAttachTarget] = useState<
    | { type: 'encounter' }
    | { type: 'item'; checklistIdx: number; sectionIdx: number; itemIdx: number }
    | null
  >(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const activeEncounters = encounters.filter((e) => !e.isDeleted);
  const currentEncounter =
    activeEncounters.find((e) => e.id === selectedEncounterId) || activeEncounters[0];

  const handleCopyMarkdown = async () => {
    if (!currentEncounter) return;
    const md = encounterToMarkdown(currentEncounter);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleAttachImage = (image: MedicalImage) => {
    if (!currentEncounter || !attachTarget) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    if (attachTarget.type === 'encounter') {
      if (!updated.images) updated.images = [];
      updated.images.push(image);
    } else {
      const itm = updated.checklists[attachTarget.checklistIdx].sections[attachTarget.sectionIdx].items[attachTarget.itemIdx];
      if (!itm.images) itm.images = [];
      itm.images.push(image);
    }
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleAttachLink = (link: MedicalLink) => {
    if (!currentEncounter || !attachTarget) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    if (attachTarget.type === 'encounter') {
      if (!updated.links) updated.links = [];
      updated.links.push(link);
    } else {
      const itm = updated.checklists[attachTarget.checklistIdx].sections[attachTarget.sectionIdx].items[attachTarget.itemIdx];
      if (!itm.links) itm.links = [];
      itm.links.push(link);
    }
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleAddItemToSection = (checklistIdx: number, sectionIdx: number) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    const newItem = {
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      text: 'New Checklist Item (Click to edit)',
      checked: false,
    };
    updated.checklists[checklistIdx].sections[sectionIdx].items.push(newItem);
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleUpdateItemText = (
    checklistIdx: number,
    sectionIdx: number,
    itemIdx: number,
    text: string
  ) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx].text = text;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleDeleteItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    updated.checklists[checklistIdx].sections[sectionIdx].items = updated.checklists[
      checklistIdx
    ].sections[sectionIdx].items.filter((_, idx) => idx !== itemIdx);
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleToggleItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    const item = updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx];
    item.checked = !item.checked;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);

    if (item.checked && item.starred) {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
      });
    }
  };

  const handleToggleStar = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    const item = updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx];
    item.starred = !item.starred;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleUpdateItemNote = (
    checklistIdx: number,
    sectionIdx: number,
    itemIdx: number,
    noteText: string
  ) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx].note = noteText;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleUpdateItemLabValue = (
    checklistIdx: number,
    sectionIdx: number,
    itemIdx: number,
    val: string
  ) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx].labValue = val;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleAttachTemplate = (tpl: ChecklistTemplate) => {
    if (!currentEncounter) return;
    const newInstance: EncounterChecklistInstance = {
      id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      templateId: tpl.id,
      title: tpl.title,
      institution: tpl.institution,
      sections: JSON.parse(JSON.stringify(tpl.sections)),
    };
    const updated: PatientEncounter = {
      ...currentEncounter,
      checklists: [...currentEncounter.checklists, newInstance],
      updatedAt: Date.now(),
    };
    onUpdateEncounter(updated);
    setShowAttachMenu(false);
  };

  const handleRemoveChecklist = (checklistIdx: number) => {
    if (!currentEncounter) return;
    const updated: PatientEncounter = {
      ...currentEncounter,
      checklists: currentEncounter.checklists.filter((_, idx) => idx !== checklistIdx),
      updatedAt: Date.now(),
    };
    onUpdateEncounter(updated);
  };

  if (activeEncounters.length === 0 || !currentEncounter) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">No Active Patient Encounters</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Create a patient encounter group box to attach clinical checklists, customize reference lab values, and begin bedside rounds.
        </p>
        <button
          onClick={onOpenNewPatientModal}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Patient Encounter</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Patient Tabs Bar ("Patient Group Boxes") */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {activeEncounters.map((enc) => (
          <button
            key={enc.id}
            onClick={() => onSelectEncounter(enc.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              enc.id === currentEncounter.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{enc.patientIdentifier}</span>
            {enc.bedNumber && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                  enc.id === currentEncounter.id
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Bed {enc.bedNumber}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={onOpenNewPatientModal}
          className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border border-dashed border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-400 hover:bg-white flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Patient Box</span>
        </button>
      </div>

      {/* Patient Dossier Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-lg font-bold text-slate-900">
              {currentEncounter.patientIdentifier}
            </h1>
            {currentEncounter.bedNumber && (
              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-md">
                Bed {currentEncounter.bedNumber}
              </span>
            )}
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              {currentEncounter.status}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
            {currentEncounter.age && <span>Age: {currentEncounter.age}</span>}
            {currentEncounter.sex && <span>Sex: {currentEncounter.sex}</span>}
            {currentEncounter.chiefComplaint && (
              <span className="text-slate-700 font-medium">
                Chief Complaint: {currentEncounter.chiefComplaint}
              </span>
            )}
          </div>

          {/* Attached Links on Encounter */}
          {currentEncounter.links && currentEncounter.links.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {currentEncounter.links.map((lnk) => (
                <a
                  key={lnk.id}
                  href={lnk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100 transition-colors"
                >
                  {lnk.category === 'youtube' ? (
                    <Video className="w-3 h-3 text-rose-600" />
                  ) : lnk.category === 'pubmed' ? (
                    <FileText className="w-3 h-3 text-blue-600" />
                  ) : lnk.category === 'wiki' ? (
                    <Globe className="w-3 h-3 text-slate-600" />
                  ) : (
                    <BookOpen className="w-3 h-3 text-indigo-600" />
                  )}
                  <span>{lnk.title}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              ))}
            </div>
          )}

          {/* Attached Images Gallery on Encounter */}
          {currentEncounter.images && currentEncounter.images.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {currentEncounter.images.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setActiveLightboxImage(img.url)}
                  className="group relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden cursor-pointer shadow-2xs hover:shadow-xs transition-all bg-slate-900"
                >
                  <img src={img.url} alt={img.caption || 'Clinical Snapshot'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                  {img.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white px-1 truncate">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bedside Mode Button */}
          <button
            onClick={onEnterPatientFacingMode}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm ring-2 ring-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Bedside Mode (Pen / Stylus)</span>
          </button>

          {/* Attach Image / Snapshot */}
          <button
            onClick={() => setAttachTarget({ type: 'encounter' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            title="Attach ECG, rash photo, wound snapshot or medical link"
          >
            <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
            <span>Attach Image / Link</span>
          </button>

          {/* Copy for LLM */}
          <button
            onClick={onOpenLlmModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition-colors"
            title="Copy prompt for LLM or paste AI output"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>LLM Sync</span>
          </button>

          {/* Copy Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            title="Copy as Markdown"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Delete / Archive */}
          <button
            onClick={() => onDeleteEncounter(currentEncounter.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-colors"
            title="Delete Encounter"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Checklists Attached to Patient */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Active Checklists & Protocols ({currentEncounter.checklists.length})
          </h2>

          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-4 h-4" />
              <span>Attach Another Checklist / Template</span>
            </button>

            {showAttachMenu && (
              <div className="absolute right-0 mt-1 w-72 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-30 space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                  Select Template to Attach:
                </div>
                {templates
                  .filter((t) => !t.isDeleted)
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleAttachTemplate(t)}
                      className="w-full text-left p-2 rounded-lg text-xs hover:bg-slate-100 flex items-center justify-between text-slate-700"
                    >
                      <span className="truncate">{t.title}</span>
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Render each checklist */}
        {currentEncounter.checklists.map((chk, chkIdx) => (
          <div
            key={chk.id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs"
          >
            {/* Checklist Header */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{chk.title}</h3>
                {chk.institution && (
                  <span className="text-[11px] text-indigo-700 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{chk.institution}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenTemplateEditor(chk.templateId)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-200/60"
                  title="Customize Lab References & Bounds"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Customize Lab Bounds</span>
                </button>
                <button
                  onClick={() => handleRemoveChecklist(chkIdx)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                  title="Remove from encounter"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checklist Sections */}
            <div className="p-5 space-y-6">
              {chk.sections.map((sec, secIdx) => (
                <div key={sec.id} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {sec.title}
                  </h4>

                  <div className="space-y-1.5">
                    {sec.items.map((item, itmIdx) => (
                      <div
                        key={item.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          item.checked
                            ? 'bg-slate-50 border-slate-300'
                            : 'bg-white border-slate-200/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleItem(chkIdx, secIdx, itmIdx)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              item.checked
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'border-slate-300 hover:border-slate-400 bg-white'
                            }`}
                          >
                            {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          {/* Star */}
                          <button
                            onClick={() => handleToggleStar(chkIdx, secIdx, itmIdx)}
                            className={`p-0.5 rounded transition-colors ${
                              item.starred
                                ? 'text-amber-500'
                                : 'text-slate-300 hover:text-slate-400'
                            }`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>

                          {/* Item text */}
                          <span
                            onClick={() => handleToggleItem(chkIdx, secIdx, itmIdx)}
                            className={`text-xs flex-1 cursor-pointer select-none ${
                              item.checked
                                ? 'font-semibold text-slate-900'
                                : 'text-slate-700'
                            }`}
                          >
                            {item.text}
                          </span>

                          {/* Lab / reference bounds & recorded value */}
                          {item.referenceValue && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <input
                                type="text"
                                value={item.labValue || ''}
                                onChange={(e) =>
                                  handleUpdateItemLabValue(
                                    chkIdx,
                                    secIdx,
                                    itmIdx,
                                    e.target.value
                                  )
                                }
                                placeholder="Patient Value"
                                className="w-28 text-xs font-semibold px-2 py-0.5 border border-slate-200 rounded-md bg-white outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
                              />
                              <span className="text-[11px] text-slate-400">
                                [{item.referenceValue}]
                              </span>
                            </div>
                          )}

                          {/* Item Actions */}
                          <div className="flex items-center gap-1">
                            {/* Note button */}
                            <button
                              onClick={() =>
                                setActiveNoteItemId(
                                  activeNoteItemId === item.id ? null : item.id
                                )
                              }
                              className={`p-1 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                                item.note
                                  ? 'text-indigo-600 bg-indigo-50 font-medium'
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                              }`}
                              title="Add/Edit Markdown Note"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {item.note && <span className="text-[10px]">Note</span>}
                            </button>

                            {/* Attach media to item */}
                            <button
                              onClick={() =>
                                setAttachTarget({
                                  type: 'item',
                                  checklistIdx: chkIdx,
                                  sectionIdx: secIdx,
                                  itemIdx: itmIdx,
                                })
                              }
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Attach image or link to this item"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete item */}
                            <button
                              onClick={() => handleDeleteItem(chkIdx, secIdx, itmIdx)}
                              className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Attached Item Links */}
                        {item.links && item.links.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-9">
                            {item.links.map((lnk) => (
                              <a
                                key={lnk.id}
                                href={lnk.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 transition-colors"
                              >
                                {lnk.category === 'youtube' ? (
                                  <Video className="w-3 h-3 text-rose-600" />
                                ) : lnk.category === 'pubmed' ? (
                                  <FileText className="w-3 h-3 text-blue-600" />
                                ) : (
                                  <Globe className="w-3 h-3 text-slate-600" />
                                )}
                                <span>{lnk.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Attached Item Images */}
                        {item.images && item.images.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2 pl-9">
                            {item.images.map((img) => (
                              <div
                                key={img.id}
                                onClick={() => setActiveLightboxImage(img.url)}
                                className="group relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden cursor-pointer bg-slate-900"
                              >
                                <img
                                  src={img.url}
                                  alt={img.caption || 'Item snapshot'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="w-3 h-3" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Inline Note Editor */}
                        {(activeNoteItemId === item.id || item.note) && (
                          <div className="mt-2 pl-9">
                            <input
                              type="text"
                              value={item.note || ''}
                              onChange={(e) =>
                                handleUpdateItemNote(
                                  chkIdx,
                                  secIdx,
                                  itmIdx,
                                  e.target.value
                                )
                              }
                              placeholder="Clinical note (in Markdown)... e.g. Left sided, worsening with inspiration"
                              className="w-full text-xs font-mono px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-slate-900"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Item Button for manual typing */}
                  <button
                    onClick={() => handleAddItemToSection(chkIdx, secIdx)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 pl-2 pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item to {sec.title}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Bedside Notes & Inking Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Bedside & Handwritten Notes (Editable Markdown)
              </h3>
            </div>
            {currentEncounter.inkStrokes && currentEncounter.inkStrokes.length > 0 && (
              <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                <PenTool className="w-3 h-3" />
                <span>{currentEncounter.inkStrokes.length} Stylus Strokes Saved</span>
              </span>
            )}
          </div>

          <textarea
            rows={4}
            value={currentEncounter.generalNotes || ''}
            onChange={(e) =>
              onUpdateEncounter({
                ...currentEncounter,
                generalNotes: e.target.value,
                updatedAt: Date.now(),
              })
            }
            placeholder="Write clinical synthesis, differential diagnoses, or bedside observations here in Markdown...&#10;- Sublingual nitro administered&#10;- Serial ECG scheduled"
            className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
          />
        </div>
      </div>

      {/* Attach Modal */}
      {attachTarget && (
        <AttachModal
          onAttachImage={handleAttachImage}
          onAttachLink={handleAttachLink}
          onClose={() => setAttachTarget(null)}
        />
      )}

      {/* Lightbox Modal */}
      {activeLightboxImage && (
        <div
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activeLightboxImage}
              alt="Enlarged snapshot"
              className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black text-white rounded-full"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
