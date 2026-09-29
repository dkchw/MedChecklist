import React, { useState } from 'react';
import { PatientEncounter, EncounterChecklistInstance } from '../../types/patient';
import { ChecklistTemplate, MedicalImage, MedicalLink } from '../../types/checklist';
import { InputMode } from '../../types/ink';
import { encounterToMarkdown } from '../../utils/markdownEngine';
import { HandwritingInputBox } from '../pen/HandwritingInputBox';
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
  RotateCcw,
  PenTool,
  Sliders,
  Image as ImageIcon,
  Link as LinkIcon,
  ExternalLink,
  Maximize2,
  Globe,
  Video,
  BookOpen,
  Folder,
  Layers,
  Users,
  Tag,
  Keyboard,
  Pen,
  FileDown,
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
  onOpenGallery?: () => void;
}

const PRESET_PATIENT_TAGS = ['critical', 'admit', 'pre-op', 'isolation', 'fall-risk', 'dnr', 'allergy'];

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
  onOpenGallery,
}) => {
  // Input Modes: 'keyboard' | 'box_handwriting' | 'full_handwriting'
  const [inputMode, setInputMode] = useState<InputMode>('keyboard');
  const [activeHandwritingTarget, setActiveHandwritingTarget] = useState<{
    label: string;
    field: string;
    initialValue: string;
    isNumericOnly?: boolean;
    onAccept: (val: string) => void;
  } | null>(null);

  // Group & Status Filtering state
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [isEditingGroup, setIsEditingGroup] = useState<boolean>(false);

  // Patient Tagging state
  const [showAddTag, setShowAddTag] = useState<boolean>(false);
  const [newTagInput, setNewTagInput] = useState<string>('');

  // Chief Complaint inline editing
  const [isEditingComplaint, setIsEditingComplaint] = useState<boolean>(false);

  // UI modal states
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [attachTarget, setAttachTarget] = useState<{
    type: 'encounter' | 'item';
    checklistIdx?: number;
    sectionIdx?: number;
    itemIdx?: number;
  } | null>(null);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedDefault, setCopiedDefault] = useState<boolean>(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);

  // Extract unique patient groups / wards
  const availableGroups = Array.from(
    new Set(
      encounters
        .filter((e) => !e.isDeleted && e.group)
        .map((e) => e.group!)
    )
  );

  // Filter encounters by status (active vs archived) and ward group
  const visibleEncounters = encounters.filter((e) => {
    if (e.isDeleted) return false;
    const itemStatus = e.status || 'active';
    if (itemStatus !== statusFilter) return false;
    if (selectedGroupFilter !== 'all' && e.group !== selectedGroupFilter) return false;
    return true;
  });

  const currentEncounter =
    visibleEncounters.find((e) => e.id === selectedEncounterId) ||
    visibleEncounters[0] ||
    encounters.find((e) => !e.isDeleted && (e.status || 'active') === statusFilter);

  // Archive / Discharge patient
  const handleArchiveEncounter = (id: string) => {
    const enc = encounters.find((e) => e.id === id);
    if (!enc) return;
    const updated: PatientEncounter = {
      ...enc,
      status: 'archived',
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateEncounter(updated);
  };

  // Restore patient
  const handleRestoreEncounter = (id: string) => {
    const enc = encounters.find((e) => e.id === id);
    if (!enc) return;
    const updated: PatientEncounter = {
      ...enc,
      status: 'active',
      archivedAt: undefined,
      updatedAt: Date.now(),
    };
    onUpdateEncounter(updated);
  };

  // Update patient ward
  const handleUpdateGroup = (newGroup: string) => {
    if (!currentEncounter) return;
    const updated: PatientEncounter = {
      ...currentEncounter,
      group: newGroup.trim() || undefined,
      updatedAt: Date.now(),
    };
    onUpdateEncounter(updated);
    setIsEditingGroup(false);
  };

  // Patient Tagging Handlers
  const handleAddPatientTag = (tag: string) => {
    if (!currentEncounter || !tag.trim()) return;
    const cleaned = tag.trim().toLowerCase().replace(/^#/, '');
    const currentTags = currentEncounter.tags || [];
    if (!currentTags.includes(cleaned)) {
      onUpdateEncounter({
        ...currentEncounter,
        tags: [...currentTags, cleaned],
        updatedAt: Date.now(),
      });
    }
    setNewTagInput('');
    setShowAddTag(false);
  };

  const handleRemovePatientTag = (tagToRemove: string) => {
    if (!currentEncounter) return;
    const currentTags = currentEncounter.tags || [];
    onUpdateEncounter({
      ...currentEncounter,
      tags: currentTags.filter((t) => t !== tagToRemove && t !== `#${tagToRemove}`),
      updatedAt: Date.now(),
    });
  };

  // Quick Duplicate Checklist
  const handleDuplicateChecklist = (chk: EncounterChecklistInstance) => {
    if (!currentEncounter) return;
    const cloned: EncounterChecklistInstance = {
      ...JSON.parse(JSON.stringify(chk)),
      id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: `${chk.title} (Copy)`,
    };
    onUpdateEncounter({
      ...currentEncounter,
      checklists: [...currentEncounter.checklists, cloned],
      updatedAt: Date.now(),
    });
  };

  // Checklist Item Interactions
  const handleToggleItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    const item = updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx];
    item.checked = !item.checked;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);

    if (item.checked && item.starred) {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 } });
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
    note: string
  ) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx].note = note;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleUpdateItemLabValue = (
    checklistIdx: number,
    sectionIdx: number,
    itemIdx: number,
    labValue: string
  ) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx].labValue = labValue;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleDeleteItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    updated.checklists[checklistIdx].sections[sectionIdx].items.splice(itemIdx, 1);
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

  const handleAttachImage = (img: MedicalImage) => {
    if (!currentEncounter || !attachTarget) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    if (attachTarget.type === 'encounter') {
      updated.images = [...(updated.images || []), img];
    } else if (
      attachTarget.checklistIdx !== undefined &&
      attachTarget.sectionIdx !== undefined &&
      attachTarget.itemIdx !== undefined
    ) {
      const itm =
        updated.checklists[attachTarget.checklistIdx].sections[attachTarget.sectionIdx].items[
          attachTarget.itemIdx
        ];
      itm.images = [...(itm.images || []), img];
    }
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleAttachLink = (lnk: MedicalLink) => {
    if (!currentEncounter || !attachTarget) return;
    const updated = JSON.parse(JSON.stringify(currentEncounter)) as PatientEncounter;
    if (attachTarget.type === 'encounter') {
      updated.links = [...(updated.links || []), lnk];
    } else if (
      attachTarget.checklistIdx !== undefined &&
      attachTarget.sectionIdx !== undefined &&
      attachTarget.itemIdx !== undefined
    ) {
      const itm =
        updated.checklists[attachTarget.checklistIdx].sections[attachTarget.sectionIdx].items[
          attachTarget.itemIdx
        ];
      itm.links = [...(itm.links || []), lnk];
    }
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
  };

  const handleCopyMarkdown = async () => {
    if (!currentEncounter) return;
    const md = encounterToMarkdown(currentEncounter);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // Export Default Viewer Mode (Clean text, numbers, lab values, omitting full scratch drawings)
  const handleExportDefaultViewer = async () => {
    if (!currentEncounter) return;
    const md = encounterToMarkdown(currentEncounter);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedDefault(true);
      setTimeout(() => setCopiedDefault(false), 2000);
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* 1. Status Filter Tabs & Ward Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {/* Active Rounds vs Archived Patients */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => {
                setStatusFilter('active');
                const firstActive = encounters.find((e) => !e.isDeleted && e.status === 'active');
                if (firstActive) onSelectEncounter(firstActive.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'active'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Active Rounds ({encounters.filter((e) => !e.isDeleted && e.status === 'active').length})</span>
            </button>

            <button
              onClick={() => {
                setStatusFilter('archived');
                const firstArchived = encounters.find((e) => !e.isDeleted && e.status === 'archived');
                if (firstArchived) onSelectEncounter(firstArchived.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === 'archived'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-500" />
              <span>Archived / Discharged ({encounters.filter((e) => !e.isDeleted && e.status === 'archived').length})</span>
            </button>
          </div>

          {/* Gallery Button */}
          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-200/60 dark:border-slate-700"
              title="Open Clinical Medical Image Gallery"
            >
              <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>Image Gallery</span>
            </button>
          )}
        </div>

        {/* 3 Interaction Modes Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setInputMode('keyboard')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              inputMode === 'keyboard'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Standard Keyboard Input Mode"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keyboard</span>
          </button>

          <button
            onClick={() => setInputMode('box_handwriting')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              inputMode === 'box_handwriting'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Handwriting in Box: click any field to write with OCR"
          >
            <Pen className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Box OCR</span>
          </button>

          <button
            onClick={onEnterPatientFacingMode}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all"
            title="Enter Full Bedside Handwriting Mode"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Full Inking</span>
          </button>
        </div>
      </div>

      {/* Ward Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
          <Folder className="w-3 h-3 text-indigo-500" />
          <span>Wards:</span>
        </span>

        <button
          onClick={() => setSelectedGroupFilter('all')}
          className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
            selectedGroupFilter === 'all'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white font-semibold'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          All Wards / Units
        </button>

        {availableGroups.map((grp) => (
          <button
            key={grp}
            onClick={() => setSelectedGroupFilter(grp)}
            className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
              selectedGroupFilter === grp
                ? 'bg-slate-900 dark:bg-indigo-600 text-white font-semibold'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {grp} ({encounters.filter((e) => !e.isDeleted && e.group === grp && (e.status || 'active') === statusFilter).length})
          </button>
        ))}
      </div>

      {/* Patient Encounter Tabs Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200/80 dark:border-slate-800">
        {visibleEncounters.map((enc) => (
          <button
            key={enc.id}
            onClick={() => onSelectEncounter(enc.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
              currentEncounter?.id === enc.id
                ? 'bg-white dark:bg-slate-900 border-slate-900 dark:border-indigo-500 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{enc.patientIdentifier}</span>
            {enc.bedNumber && (
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono font-normal">
                {enc.bedNumber}
              </span>
            )}
            {enc.group && (
              <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                {enc.group}
              </span>
            )}
          </button>
        ))}

        {statusFilter === 'active' && (
          <button
            onClick={onOpenNewPatientModal}
            className="px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Patient Box</span>
          </button>
        )}
      </div>

      {(!currentEncounter || visibleEncounters.length === 0) ? (
        <div className="max-w-4xl mx-auto p-12 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400">
            {statusFilter === 'archived' ? <Archive className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {statusFilter === 'archived' ? 'No Archived Patients' : 'No Active Patients in this View'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {statusFilter === 'archived'
              ? 'Completed patient encounters will appear here when archived from bedside rounds.'
              : 'Create a new patient box or select "All Wards / Units" above.'}
          </p>
          {statusFilter === 'active' && (
            <button
              onClick={onOpenNewPatientModal}
              className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Patient Encounter</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Patient Dossier Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {currentEncounter.patientIdentifier}
                </h1>
                {currentEncounter.bedNumber && (
                  <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                    Bed {currentEncounter.bedNumber}
                  </span>
                )}

                {/* Ward / Group Tag with quick click-to-edit */}
                <div className="relative inline-flex items-center">
                  {isEditingGroup ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        defaultValue={currentEncounter.group || ''}
                        placeholder="Enter Ward/Group..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateGroup((e.target as HTMLInputElement).value);
                          } else if (e.key === 'Escape') {
                            setIsEditingGroup(false);
                          }
                        }}
                        onBlur={(e) => handleUpdateGroup(e.target.value)}
                        autoFocus
                        className="text-xs px-2 py-0.5 border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingGroup(true)}
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                      title="Click to change Ward / Patient Group"
                    >
                      <Folder className="w-3 h-3 text-indigo-500" />
                      <span>{currentEncounter.group || 'Assign Ward/Group'}</span>
                    </button>
                  )}
                </div>

                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                    currentEncounter.status === 'archived'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900'
                  }`}
                >
                  {currentEncounter.status}
                </span>
              </div>

              {/* Template Origin attribution banner */}
              {currentEncounter.templateTitle && (
                <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/50 inline-flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3 h-3 text-indigo-500" />
                  <span>Derived from Template: {currentEncounter.templateTitle}</span>
                </div>
              )}

              {/* Age, Sex, Chief Complaint with Direct Handwriting / OCR */}
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap mt-1">
                {currentEncounter.age && <span>Age: {currentEncounter.age}</span>}
                {currentEncounter.sex && <span>Sex: {currentEncounter.sex}</span>}

                {/* Chief Complaint: Clickable or Handwriting-in-Box */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Chief Complaint:</span>

                  {isEditingComplaint ? (
                    <input
                      type="text"
                      defaultValue={currentEncounter.chiefComplaint}
                      autoFocus
                      onBlur={(e) => {
                        onUpdateEncounter({
                          ...currentEncounter,
                          chiefComplaint: e.target.value.trim(),
                          updatedAt: Date.now(),
                        });
                        setIsEditingComplaint(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onUpdateEncounter({
                            ...currentEncounter,
                            chiefComplaint: (e.target as HTMLInputElement).value.trim(),
                            updatedAt: Date.now(),
                          });
                          setIsEditingComplaint(false);
                        } else if (e.key === 'Escape') {
                          setIsEditingComplaint(false);
                        }
                      }}
                      className="text-xs px-2 py-0.5 border border-indigo-400 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                    />
                  ) : (
                    <span
                      onClick={() => {
                        if (inputMode === 'box_handwriting') {
                          setActiveHandwritingTarget({
                            label: 'Chief Complaint',
                            field: 'chiefComplaint',
                            initialValue: currentEncounter.chiefComplaint,
                            onAccept: (val) => {
                              onUpdateEncounter({
                                ...currentEncounter,
                                chiefComplaint: val,
                                updatedAt: Date.now(),
                              });
                            },
                          });
                        } else {
                          setIsEditingComplaint(true);
                        }
                      }}
                      className="cursor-pointer text-slate-900 dark:text-slate-100 font-medium hover:underline"
                      title={
                        inputMode === 'box_handwriting'
                          ? 'Click to write Chief Complaint with Stylus (OCR)'
                          : 'Click to edit Chief Complaint'
                      }
                    >
                      {currentEncounter.chiefComplaint || 'None specified (Click to add)'}
                    </span>
                  )}

                  {/* Handwriting in box trigger button */}
                  <button
                    onClick={() =>
                      setActiveHandwritingTarget({
                        label: 'Chief Complaint',
                        field: 'chiefComplaint',
                        initialValue: currentEncounter.chiefComplaint,
                        onAccept: (val) => {
                          onUpdateEncounter({
                            ...currentEncounter,
                            chiefComplaint: val,
                            updatedAt: Date.now(),
                          });
                        },
                      })
                    }
                    className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md"
                    title="Write Chief Complaint with Stylus (OCR)"
                  >
                    <Pen className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Patient Tags Row */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <Tag className="w-3 h-3 text-slate-400" />
                {(currentEncounter.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  >
                    <span>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                    <button
                      onClick={() => handleRemovePatientTag(tag)}
                      className="hover:text-red-500 font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {showAddTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddPatientTag(newTagInput);
                        else if (e.key === 'Escape') setShowAddTag(false);
                      }}
                      placeholder="tag name..."
                      autoFocus
                      className="text-[11px] px-2 py-0.5 border border-indigo-400 rounded-md bg-white dark:bg-slate-900 outline-none w-24"
                    />
                    <button
                      onClick={() => handleAddPatientTag(newTagInput)}
                      className="text-xs text-indigo-600 font-bold px-1"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowAddTag(true)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tag Patient</span>
                    </button>

                    {/* Quick Preset Tags */}
                    {PRESET_PATIENT_TAGS.filter(
                      (pt) => !(currentEncounter.tags || []).includes(pt)
                    )
                      .slice(0, 3)
                      .map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handleAddPatientTag(preset)}
                          className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.2 rounded hover:border-slate-300"
                        >
                          +{preset}
                        </button>
                      ))}
                  </div>
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
                      className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/60 transition-colors"
                    >
                      {lnk.category === 'youtube' ? (
                        <Video className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                      ) : lnk.category === 'pubmed' ? (
                        <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      ) : lnk.category === 'wiki' ? (
                        <Globe className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <BookOpen className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
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
                      className="group relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer shadow-2xs hover:shadow-xs transition-all bg-slate-900"
                    >
                      <img
                        src={img.url}
                        alt={img.caption || 'Clinical Snapshot'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
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
              {currentEncounter.status === 'active' && (
                <button
                  onClick={onEnterPatientFacingMode}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm ring-2 ring-emerald-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Bedside Inking Mode</span>
                </button>
              )}

              {/* Restore button */}
              {currentEncounter.status === 'archived' && (
                <button
                  onClick={() => handleRestoreEncounter(currentEncounter.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore to Active</span>
                </button>
              )}

              {/* Attach Media */}
              <button
                onClick={() => setAttachTarget({ type: 'encounter' })}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-200/50 dark:border-slate-700"
                title="Attach ECG, rash photo, wound snapshot or medical link"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Attach Media</span>
              </button>

              {/* Copy for LLM */}
              <button
                onClick={onOpenLlmModal}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold transition-colors border border-indigo-100 dark:border-indigo-900/50"
                title="Copy prompt for LLM or paste AI output"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>LLM Sync</span>
              </button>

              {/* Export Default Viewer Mode (Clean text, numbers, omitting full scratch drawings) */}
              <button
                onClick={handleExportDefaultViewer}
                className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-200 dark:border-slate-700"
                title="Export clean report with keyboard text, numbers, and lab bounds (omits full scratch inking)"
              >
                {copiedDefault ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                )}
                <span>{copiedDefault ? 'Report Copied!' : 'Default View'}</span>
              </button>

              {/* Copy Full Markdown */}
              <button
                onClick={handleCopyMarkdown}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                title="Copy Full Markdown (including stroke data)"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>

              {/* Archive / Discharge Patient Button */}
              {currentEncounter.status === 'active' && (
                <button
                  onClick={() => handleArchiveEncounter(currentEncounter.id)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Archive / Discharge Patient from Bedside Rounds"
                >
                  <Archive className="w-4 h-4" />
                </button>
              )}

              {/* Delete Encounter */}
              <button
                onClick={() => onDeleteEncounter(currentEncounter.id)}
                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                title="Delete Encounter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floating Handwriting-in-Box Scratchpad */}
          {activeHandwritingTarget && (
            <div className="fixed bottom-8 right-8 z-50 w-96 max-w-[90vw]">
              <HandwritingInputBox
                label={activeHandwritingTarget.label}
                value={activeHandwritingTarget.initialValue}
                isNumericOnly={activeHandwritingTarget.isNumericOnly}
                onAccept={(val) => {
                  activeHandwritingTarget.onAccept(val);
                  setActiveHandwritingTarget(null);
                }}
                onClose={() => setActiveHandwritingTarget(null)}
              />
            </div>
          )}

          {/* Checklists Attached to Patient */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Active Checklists & Protocols ({currentEncounter.checklists.length})
              </h2>

              <div className="relative">
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>Attach Another Checklist / Template</span>
                </button>

                {showAttachMenu && (
                  <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-30 space-y-1">
                    <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">
                      Select Template to Attach:
                    </div>
                    {templates
                      .filter((t) => !t.isDeleted)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleAttachTemplate(t)}
                          className="w-full text-left p-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200"
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
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs"
              >
                {/* Checklist Header */}
                <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {chk.title}
                    </h3>
                    {chk.institution && (
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{chk.institution}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick Copy / Duplicate Checklist Button */}
                    <button
                      onClick={() => handleDuplicateChecklist(chk)}
                      className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      title="Quickly Duplicate / Copy this Checklist"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Checklist</span>
                    </button>

                    <button
                      onClick={() => onOpenTemplateEditor(chk.templateId)}
                      className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      title="Customize Lab References & Bounds"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Edit Bounds</span>
                    </button>
                  </div>
                </div>

                {/* Checklist Sections */}
                <div className="p-5 space-y-5">
                  {chk.sections.map((sec, secIdx) => (
                    <div key={sec.id} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          {sec.title}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {sec.items.filter((i) => i.checked).length}/{sec.items.length} completed
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        {sec.items.map((item, itmIdx) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                              item.checked
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                                : 'bg-white dark:bg-slate-850 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => handleToggleItem(chkIdx, secIdx, itmIdx)}
                                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />

                                <span
                                  onClick={() => handleToggleItem(chkIdx, secIdx, itmIdx)}
                                  className={`text-xs font-medium cursor-pointer truncate ${
                                    item.checked
                                      ? 'text-slate-900 dark:text-slate-100 font-semibold'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {item.text}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleToggleStar(chkIdx, secIdx, itmIdx)}
                                  className={`p-0.5 rounded transition-colors ${
                                    item.starred
                                      ? 'text-amber-500'
                                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                                  }`}
                                  title="Mark as Starred / Red Flag"
                                >
                                  <Star
                                    className={`w-3.5 h-3.5 ${item.starred ? 'fill-current' : ''}`}
                                  />
                                </button>
                              </div>

                              {/* Lab value input with direct OCR trigger */}
                              {item.referenceValue && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <div className="relative flex items-center">
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
                                      onClick={() => {
                                        if (inputMode === 'box_handwriting') {
                                          setActiveHandwritingTarget({
                                            label: item.text,
                                            field: `lab-${item.id}`,
                                            initialValue: item.labValue || '',
                                            isNumericOnly: true,
                                            onAccept: (val) =>
                                              handleUpdateItemLabValue(chkIdx, secIdx, itmIdx, val),
                                          });
                                        }
                                      }}
                                      placeholder="Value / BP"
                                      className="w-28 text-xs font-semibold px-2 py-0.5 pr-6 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveHandwritingTarget({
                                          label: item.text,
                                          field: `lab-${item.id}`,
                                          initialValue: item.labValue || '',
                                          isNumericOnly: true,
                                          onAccept: (val) =>
                                            handleUpdateItemLabValue(chkIdx, secIdx, itmIdx, val),
                                        })
                                      }
                                      className="absolute right-1 text-slate-400 hover:text-indigo-600"
                                      title="Write value with Stylus (OCR)"
                                    >
                                      <Pen className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    [{item.referenceValue}]
                                  </span>
                                </div>
                              )}

                              {/* Item Actions */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    setActiveNoteItemId(
                                      activeNoteItemId === item.id ? null : item.id
                                    )
                                  }
                                  className={`p-1 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                                    item.note
                                      ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 font-medium'
                                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                  title="Add/Edit Markdown Note"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {item.note && <span className="text-[10px]">Note</span>}
                                </button>

                                <button
                                  onClick={() =>
                                    setAttachTarget({
                                      type: 'item',
                                      checklistIdx: chkIdx,
                                      sectionIdx: secIdx,
                                      itemIdx: itmIdx,
                                    })
                                  }
                                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Attach image or link to this item"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteItem(chkIdx, secIdx, itmIdx)}
                                  className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Attached Item Links */}
                            {item.links && item.links.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pl-6">
                                {item.links.map((lnk) => (
                                  <a
                                    key={lnk.id}
                                    href={lnk.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    <LinkIcon className="w-2.5 h-2.5" />
                                    <span>{lnk.title}</span>
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Attached Item Images */}
                            {item.images && item.images.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pl-6 pt-1">
                                {item.images.map((img) => (
                                  <div
                                    key={img.id}
                                    onClick={() => setActiveLightboxImage(img.url)}
                                    className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer"
                                  >
                                    <img
                                      src={img.url}
                                      alt={img.caption || 'Item snapshot'}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Item Inline Note Editor */}
                            {activeNoteItemId === item.id && (
                              <div className="pl-6 pt-1">
                                <textarea
                                  rows={2}
                                  value={item.note || ''}
                                  onChange={(e) =>
                                    handleUpdateItemNote(chkIdx, secIdx, itmIdx, e.target.value)
                                  }
                                  placeholder="Write clinical observations, exam notes, or differential thoughts in Markdown..."
                                  className="w-full text-xs font-mono p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Bedside Notes Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Bedside & Handwritten Notes (Editable Markdown)
                  </h3>
                </div>
                {currentEncounter.inkStrokes && currentEncounter.inkStrokes.length > 0 && (
                  <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-medium flex items-center gap-1 border border-indigo-100 dark:border-indigo-900/50">
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
                className="w-full text-xs font-mono p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>
        </>
      )}

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
