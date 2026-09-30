import React, { useState, useEffect } from 'react';
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
  CheckSquare,
  Building2,
  Trash2,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  HelpCircle,
  ShieldCheck,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttachModal } from '../common/AttachModal';
import { ClinicalRecallModal } from '../common/ClinicalRecallModal';
import { ImageEditorModal } from '../common/ImageEditorModal';
import { AnonymizeShareModal } from './AnonymizeShareModal';
import { PenCanvas } from '../pen/PenCanvas';
import { HandwritingOcrService } from '../../utils/handwritingOcr';
import { PenTool as PenToolType } from '../../types/ink';
import { FolderItem } from '../../types/tab';
import { ClinicalFileManager, FileItem } from '../common/ClinicalFileManager';

interface PatientEncounterViewProps {
  encounters: PatientEncounter[];
  selectedEncounterId: string | null;
  templates: ChecklistTemplate[];
  folders?: FolderItem[];
  onCreateFolder?: (
    name: string,
    type: FolderItem['type'],
    color?: string,
    parentId?: string,
    facilityName?: string,
    wardName?: string
  ) => void;
  onSelectEncounter: (id: string) => void;
  onUpdateEncounter: (updated: PatientEncounter) => void;
  onOpenNewPatientModal: (facility?: string, ward?: string) => void;
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
  folders = [],
  onCreateFolder,
  onSelectEncounter,
  onUpdateEncounter,
  onOpenNewPatientModal,
  onEnterPatientFacingMode,
  onOpenLlmModal,
  onOpenTemplateEditor,
  onDeleteEncounter,
  onOpenGallery,
}) => {
  const [showFileManager, setShowFileManager] = useState<boolean>(!selectedEncounterId);

  // Active Handwriting & OCR scratchpad target
  const [activeHandwritingTarget, setActiveHandwritingTarget] = useState<{
    label: string;
    field: string;
    initialValue: string;
    isNumericOnly?: boolean;
    onAccept: (val: string) => void;
  } | null>(null);

  // Facility & Group & Status Filtering state
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState<string>('all');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [isEditingFacility, setIsEditingFacility] = useState<boolean>(false);
  const [isAddingNewFacility, setIsAddingNewFacility] = useState<boolean>(false);
  const [newFacilityInput, setNewFacilityInput] = useState<string>('');
  
  const [isEditingGroup, setIsEditingGroup] = useState<boolean>(false);
  const [isAddingNewGroup, setIsAddingNewGroup] = useState<boolean>(false);
  const [newGroupInput, setNewGroupInput] = useState<string>('');

  // Keep file manager closed when an encounter is selected
  React.useEffect(() => {
    if (selectedEncounterId) {
      setShowFileManager(false);
    }
  }, [selectedEncounterId]);

  // Clinical Recall Popover state
  const [activeRecall, setActiveRecall] = useState<{
    title: string;
    subtitle?: string;
    category?: string;
    rationale?: string;
    normalRange?: string;
    isRedFlag?: boolean;
    personalNotes?: string;
    onSaveNotes?: (notes: string) => void;
  } | null>(null);

  // End Note 3 Modes state: 'text' | 'handwriting' | 'convert'
  const [endNoteMode, setEndNoteMode] = useState<'text' | 'handwriting' | 'convert'>('text');
  const [endNoteTool, setEndNoteTool] = useState<PenToolType>('pen');
  const [endNoteColor, setEndNoteColor] = useState<string>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? '#c0caf5'
      : '#0f172a'
  );
  const [endNoteSize, setEndNoteSize] = useState<number>(3);
  const [endNotePenOnly, setEndNotePenOnly] = useState<boolean>(true);

  // Sync endNoteColor with dark mode
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setEndNoteColor((prev) => {
        // Only update if it's currently on one of the default colors (don't override user selection if they picked red/blue)
        if (prev === '#f8fafc' || prev === '#0f172a' || prev === '#1a1b26' || prev === '#c0caf5') {
          return isDark ? '#c0caf5' : '#0f172a';
        }
        return prev;
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

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
  const [showAnonymizeModal, setShowAnonymizeModal] = useState<boolean>(false);
  const [editingImage, setEditingImage] = useState<MedicalImage | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedDefault, setCopiedDefault] = useState<boolean>(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);

  // Extract unique facilities (Hospitals / Clinics) from folders, encounters, and defaults
  const availableFacilities = React.useMemo(() => {
    return Array.from(
      new Set([
        ...folders.filter((f) => f.type === 'facility').map((f) => f.name),
        ...encounters.filter((e) => !e.isDeleted && e.facility).map((e) => e.facility!),
        'General Hospital',
        'St. Jude Medical Center',
        'City Medical Center',
      ])
    );
  }, [folders, encounters]);

  // Extract unique patient groups / wards
  const availableGroups = React.useMemo(() => {
    return Array.from(
      new Set([
        ...folders.filter((f) => f.type === 'ward').map((f) => f.name),
        ...encounters.filter((e) => !e.isDeleted && e.group).map((e) => e.group!),
        'Emergency',
        'ICU',
        'Internal Med',
        'Cardiology',
      ])
    );
  }, [folders, encounters]);

  // Convert encounters into FileItem[] for ClinicalFileManager
  const fileItems: FileItem[] = React.useMemo(() => {
    return encounters
      .filter((e) => !e.isDeleted)
      .map((e) => ({
        id: e.id,
        title: e.patientIdentifier,
        subtitle: e.chiefComplaint,
        facility: e.facility,
        ward: e.group,
        bedNumber: e.bedNumber,
        status: e.status || 'active',
        tags: e.tags,
        isPinned: e.isPinned,
        updatedAt: e.updatedAt || e.createdAt,
        metadata: `${e.checklists?.length || 0} Protocols`,
        rawItem: e,
      }));
  }, [encounters]);

  const currentEncounter = encounters.find((e) => !e.isDeleted && e.id === selectedEncounterId);

  // Other patients in the same facility and ward for fast bedside round switching
  const wardPatients = React.useMemo(() => {
    if (!currentEncounter) return [];
    return encounters.filter(
      (e) =>
        !e.isDeleted &&
        (currentEncounter.facility ? e.facility === currentEncounter.facility : true) &&
        (currentEncounter.group ? e.group === currentEncounter.group : true)
    );
  }, [encounters, currentEncounter]);

  const currentWardIndex = wardPatients.findIndex((e) => e.id === currentEncounter?.id);

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

  // Update patient facility (Hospital / Clinic)
  const handleUpdateFacility = (newFac: string) => {
    if (!currentEncounter) return;
    const updated: PatientEncounter = {
      ...currentEncounter,
      facility: newFac.trim() || undefined,
      updatedAt: Date.now(),
    };
    onUpdateEncounter(updated);
    setIsEditingFacility(false);
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
      ...structuredClone(chk),
      id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: `${chk.title} (Copy)`,
    };
    onUpdateEncounter({
      ...currentEncounter,
      checklists: [...currentEncounter.checklists, cloned],
      updatedAt: Date.now(),
    });
  };

  // Checklist Item Interactions (Optimized immutable updates without deep cloning overhead)
  const handleToggleItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    let shouldConfetti = false;
    const updatedChecklists = currentEncounter.checklists.map((chk, cIdx) => {
      if (cIdx !== checklistIdx) return chk;
      return {
        ...chk,
        sections: chk.sections.map((sec, sIdx) => {
          if (sIdx !== sectionIdx) return sec;
          return {
            ...sec,
            items: sec.items.map((itm, iIdx) => {
              if (iIdx !== itemIdx) return itm;
              const nextChecked = !itm.checked;
              if (nextChecked && itm.starred) shouldConfetti = true;
              return { ...itm, checked: nextChecked };
            }),
          };
        }),
      };
    });
    onUpdateEncounter({ ...currentEncounter, checklists: updatedChecklists, updatedAt: Date.now() });

    if (shouldConfetti) {
      confetti({ particleCount: 25, spread: 50, origin: { y: 0.8 } });
    }
  };

  const handleToggleStar = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    const updatedChecklists = currentEncounter.checklists.map((chk, cIdx) => {
      if (cIdx !== checklistIdx) return chk;
      return {
        ...chk,
        sections: chk.sections.map((sec, sIdx) => {
          if (sIdx !== sectionIdx) return sec;
          return {
            ...sec,
            items: sec.items.map((itm, iIdx) =>
              iIdx === itemIdx ? { ...itm, starred: !itm.starred } : itm
            ),
          };
        }),
      };
    });
    onUpdateEncounter({ ...currentEncounter, checklists: updatedChecklists, updatedAt: Date.now() });
  };

  const handleUpdateItemNote = (
    checklistIdx: number,
    sectionIdx: number,
    itemIdx: number,
    note: string
  ) => {
    if (!currentEncounter) return;
    const updatedChecklists = currentEncounter.checklists.map((chk, cIdx) => {
      if (cIdx !== checklistIdx) return chk;
      return {
        ...chk,
        sections: chk.sections.map((sec, sIdx) => {
          if (sIdx !== sectionIdx) return sec;
          return {
            ...sec,
            items: sec.items.map((itm, iIdx) =>
              iIdx === itemIdx ? { ...itm, note } : itm
            ),
          };
        }),
      };
    });
    onUpdateEncounter({ ...currentEncounter, checklists: updatedChecklists, updatedAt: Date.now() });
  };

  const handleUpdateItemLabValue = (
    checklistIdx: number,
    sectionIdx: number,
    itemIdx: number,
    labValue: string
  ) => {
    if (!currentEncounter) return;
    const updatedChecklists = currentEncounter.checklists.map((chk, cIdx) => {
      if (cIdx !== checklistIdx) return chk;
      return {
        ...chk,
        sections: chk.sections.map((sec, sIdx) => {
          if (sIdx !== sectionIdx) return sec;
          return {
            ...sec,
            items: sec.items.map((itm, iIdx) =>
              iIdx === itemIdx ? { ...itm, labValue } : itm
            ),
          };
        }),
      };
    });
    onUpdateEncounter({ ...currentEncounter, checklists: updatedChecklists, updatedAt: Date.now() });
  };

  const handleDeleteItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    if (!currentEncounter) return;
    const updatedChecklists = currentEncounter.checklists.map((chk, cIdx) => {
      if (cIdx !== checklistIdx) return chk;
      return {
        ...chk,
        sections: chk.sections.map((sec, sIdx) => {
          if (sIdx !== sectionIdx) return sec;
          return {
            ...sec,
            items: sec.items.filter((_, iIdx) => iIdx !== itemIdx),
          };
        }),
      };
    });
    onUpdateEncounter({ ...currentEncounter, checklists: updatedChecklists, updatedAt: Date.now() });
  };

  const handleAttachTemplate = (tpl: ChecklistTemplate) => {
    if (!currentEncounter) return;
    const newInstance: EncounterChecklistInstance = {
      id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      templateId: tpl.id,
      title: tpl.title,
      institution: tpl.institution,
      sections: structuredClone(tpl.sections),
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
    const updated = structuredClone(currentEncounter) as PatientEncounter;
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

  const handleSaveEncounterEditedImage = (editedDataUrl: string, asNewCopy: boolean) => {
    if (!currentEncounter || !editingImage) return;

    const updated = structuredClone(currentEncounter) as PatientEncounter;

    if (asNewCopy) {
      const newImg: MedicalImage = {
        id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        url: editedDataUrl,
        caption: `[De-identified] ${editingImage.caption || 'Clinical Snapshot'}`,
        tags: Array.from(new Set([...(editingImage.tags || []), 'anonymized'])),
        timestamp: Date.now(),
      };
      updated.images = [...(updated.images || []), newImg];
    } else {
      let found = false;
      if (updated.images) {
        for (const img of updated.images) {
          if (img.id === editingImage.id) {
            img.url = editedDataUrl;
            img.tags = Array.from(new Set([...(img.tags || []), 'anonymized']));
            found = true;
            break;
          }
        }
      }
      if (!found) {
        for (const chk of updated.checklists || []) {
          for (const sec of chk.sections || []) {
            for (const itm of sec.items || []) {
              for (const img of itm.images || []) {
                if (img.id === editingImage.id) {
                  img.url = editedDataUrl;
                  img.tags = Array.from(new Set([...(img.tags || []), 'anonymized']));
                  found = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
    setEditingImage(null);
    setActiveLightboxImage(null);
  };

  const handleAttachLink = (lnk: MedicalLink) => {
    if (!currentEncounter || !attachTarget) return;
    const updated = structuredClone(currentEncounter) as PatientEncounter;
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

  if (showFileManager || !currentEncounter) {
    return (
      <ClinicalFileManager
        title="Patients"
        mode="encounters"
        items={fileItems}
        folders={folders}
        selectedFacility={selectedFacilityFilter === 'all' ? undefined : selectedFacilityFilter}
        selectedWard={selectedGroupFilter === 'all' ? undefined : selectedGroupFilter}
        onSelectFolder={(_, fac, ward) => {
          setSelectedFacilityFilter(fac || 'all');
          setSelectedGroupFilter(ward || 'all');
        }}
        onOpenItem={(item) => {
          onSelectEncounter(item.id);
          setShowFileManager(false);
        }}
        onNewItem={(fac, ward) => {
          onOpenNewPatientModal(fac, ward);
        }}
        onCreateFolder={onCreateFolder}
        onTogglePinItem={(item) => {
          const enc = item.rawItem as PatientEncounter;
          onUpdateEncounter({ ...enc, isPinned: !enc.isPinned, updatedAt: Date.now() });
        }}
        onDeleteItem={(item) => onDeleteEncounter(item.id)}
        statusFilter={statusFilter}
        onChangeStatusFilter={(st) => setStatusFilter(st as 'active' | 'archived')}
        statusOptions={[
          {
            id: 'active',
            label: 'Active Rounds',
            count: encounters.filter((e) => !e.isDeleted && (e.status || 'active') === 'active').length,
          },
          {
            id: 'archived',
            label: 'Archived',
            count: encounters.filter((e) => !e.isDeleted && e.status === 'archived').length,
          },
        ]}
      />
    );
  }

  return (
    <div className="w-full max-w-full px-3 sm:px-6 py-4 space-y-5 overflow-x-hidden">
      {/* File Explorer Navigation & Rapid Patient Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => {
              setShowFileManager(true);
              onSelectEncounter('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700 shrink-0"
            title="Return to Clinical File Explorer"
          >
            <Folder className="w-3.5 h-3.5 text-cyan-500" />
            <span>← File Explorer</span>
          </button>

          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">{currentEncounter.facility || 'Facility'}</span>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <Folder className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span className="truncate">{currentEncounter.group || 'Ward'}</span>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {currentEncounter.patientIdentifier}
            </span>
            {currentEncounter.bedNumber && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                Bed {currentEncounter.bedNumber}
              </span>
            )}
          </div>
        </div>

        {/* Rapid Patient Bed Switcher (Same Ward) & Actions */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {wardPatients.length > 1 && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                disabled={currentWardIndex <= 0}
                onClick={() => onSelectEncounter(wardPatients[currentWardIndex - 1].id)}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                title="Previous Patient in this Ward"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={currentEncounter.id}
                onChange={(e) => onSelectEncounter(e.target.value)}
                className="text-xs px-2 py-1 bg-transparent text-slate-800 dark:text-slate-200 outline-none font-medium cursor-pointer"
                title="Switch Patient in this Ward"
              >
                {wardPatients.map((enc) => (
                  <option key={enc.id} value={enc.id} className="dark:bg-slate-900">
                    {enc.patientIdentifier} {enc.bedNumber ? `(Bed ${enc.bedNumber})` : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={currentWardIndex >= wardPatients.length - 1}
                onClick={() => onSelectEncounter(wardPatients[currentWardIndex + 1].id)}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"
                title="Next Patient in this Ward"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pin Button */}
          <button
            type="button"
            onClick={() => onUpdateEncounter({ ...currentEncounter, isPinned: !currentEncounter.isPinned, updatedAt: Date.now() })}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              currentEncounter.isPinned
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-amber-500'
            }`}
            title={currentEncounter.isPinned ? 'Pinned to top quick-access' : 'Pin to top quick-access'}
          >
            <Star className={`w-3.5 h-3.5 ${currentEncounter.isPinned ? 'fill-current text-amber-400' : ''}`} />
            <span className="hidden sm:inline">{currentEncounter.isPinned ? 'Pinned' : 'Pin'}</span>
          </button>

          {/* Full Freeform Bedside Canvas Trigger */}
          <button
            onClick={onEnterPatientFacingMode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-2xs"
            title="Enter Full Bedside Drawing / Freeform Canvas Mode"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Full Canvas Inking</span>
          </button>

          {/* Gallery Button */}
          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-200/60 dark:border-slate-700 cursor-pointer"
              title="Open Clinical Medical Image Gallery"
            >
              <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
            </button>
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
          {/* Left Column: Patient Profile & Protocol Navigator */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4 mb-6 lg:mb-0">
            {/* Patient Dossier Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs transition-colors space-y-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {currentEncounter.patientIdentifier}
                  </h1>
                {currentEncounter.bedNumber && (
                  <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                    Bed {currentEncounter.bedNumber}
                  </span>
                )}

                {/* Hospital / Clinic (Facility) Tag with quick click-to-edit */}
                <div className="relative inline-flex items-center">
                  {isEditingFacility ? (
                    <div className="flex items-center gap-1">
                      {isAddingNewFacility ? (
                        <input
                          autoFocus
                          type="text"
                          value={newFacilityInput}
                          onChange={(e) => setNewFacilityInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (newFacilityInput.trim()) handleUpdateFacility(newFacilityInput.trim());
                              setIsAddingNewFacility(false);
                              setIsEditingFacility(false);
                            } else if (e.key === 'Escape') {
                              setIsAddingNewFacility(false);
                              setIsEditingFacility(false);
                            }
                          }}
                          onBlur={() => {
                            if (newFacilityInput.trim()) handleUpdateFacility(newFacilityInput.trim());
                            setIsAddingNewFacility(false);
                            setIsEditingFacility(false);
                          }}
                          placeholder="New Facility..."
                          className="text-xs px-2 py-0.5 border border-indigo-400 dark:border-indigo-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none w-32"
                        />
                      ) : (
                        <select
                          autoFocus
                          defaultValue={currentEncounter.facility || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setIsAddingNewFacility(true);
                              setNewFacilityInput('');
                            } else {
                              handleUpdateFacility(e.target.value);
                              setIsEditingFacility(false);
                            }
                          }}
                          onBlur={() => setIsEditingFacility(false)}
                          className="text-xs px-2 py-0.5 border border-indigo-400 dark:border-indigo-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                        >
                          <option value="">Select Facility...</option>
                          {availableFacilities.map((fac) => (
                            <option key={fac} value={fac}>
                              {fac}
                            </option>
                          ))}
                          <option value="__new__">+ Add New Facility...</option>
                        </select>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingFacility(true)}
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Click to choose or change Hospital / Clinic"
                    >
                      <Building2 className="w-3 h-3 text-indigo-500" />
                      <span>{currentEncounter.facility || 'Assign Facility'}</span>
                    </button>
                  )}
                </div>

                {/* Ward / Group Tag with quick click-to-edit */}
                <div className="relative inline-flex items-center">
                  {isEditingGroup ? (
                    <div className="flex items-center gap-1">
                      {isAddingNewGroup ? (
                        <input
                          autoFocus
                          type="text"
                          value={newGroupInput}
                          onChange={(e) => setNewGroupInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (newGroupInput.trim()) handleUpdateGroup(newGroupInput.trim());
                              setIsAddingNewGroup(false);
                              setIsEditingGroup(false);
                            } else if (e.key === 'Escape') {
                              setIsAddingNewGroup(false);
                              setIsEditingGroup(false);
                            }
                          }}
                          onBlur={() => {
                            if (newGroupInput.trim()) handleUpdateGroup(newGroupInput.trim());
                            setIsAddingNewGroup(false);
                            setIsEditingGroup(false);
                          }}
                          placeholder="New Ward..."
                          className="text-xs px-2 py-0.5 border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none w-32"
                        />
                      ) : (
                        <select
                          autoFocus
                          defaultValue={currentEncounter.group || ''}
                          onChange={(e) => {
                            if (e.target.value === '__new__') {
                              setIsAddingNewGroup(true);
                              setNewGroupInput('');
                            } else {
                              handleUpdateGroup(e.target.value);
                              setIsEditingGroup(false);
                            }
                          }}
                          onBlur={() => setIsEditingGroup(false)}
                          className="text-xs px-2 py-0.5 border border-indigo-300 dark:border-indigo-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
                        >
                          <option value="">Select Ward...</option>
                          {availableGroups.map((grp) => (
                            <option key={grp} value={grp}>
                              {grp}
                            </option>
                          ))}
                          <option value="__new__">+ Add New Ward...</option>
                        </select>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingGroup(true)}
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
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
                      onClick={() => setIsEditingComplaint(true)}
                      className="cursor-pointer text-slate-900 dark:text-slate-100 font-medium hover:underline"
                      title="Click to edit Chief Complaint with keyboard"
                    >
                      {currentEncounter.chiefComplaint || 'None specified (Click to add)'}
                    </span>
                  )}

                  {/* Stylus Write & OCR trigger button */}
                  <button
                    type="button"
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
                    className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md transition-colors"
                    title="Write Chief Complaint with Stylus (OCR)"
                  >
                    <Pen className="w-3.5 h-3.5" />
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
                          className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.2 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
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
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800">
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

              {/* Anonymize & Share Button */}
              <button
                onClick={() => setShowAnonymizeModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors border border-emerald-200 dark:border-emerald-800"
                title="De-identify and export anonymized case summary for medical sharing"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Anonymize & Share</span>
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
                onClick={() => {
                  if (confirm('Are you sure you want to delete this patient encounter?')) {
                    onDeleteEncounter(currentEncounter.id);
                  }
                }}
                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                title="Delete Encounter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Checklist TOC / Protocol Navigator */}
          {currentEncounter.checklists.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Protocols ({currentEncounter.checklists.length})</span>
                </h3>
                <button
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>Attach</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                {currentEncounter.checklists.map((chk) => {
                  const totalItems = chk.sections.reduce((acc, s) => acc + s.items.length, 0);
                  const doneItems = chk.sections.reduce(
                    (acc, s) => acc + s.items.filter((i) => i.checked).length,
                    0
                  );
                  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
                  return (
                    <a
                      key={chk.id}
                      href={`#chk-${chk.id}`}
                      className="block p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-xs group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                          {chk.title}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">
                          {doneItems}/{totalItems} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checklists, Protocols & Bedside Notes */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6">

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
                id={`chk-${chk.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs scroll-mt-20"
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
                    {/* Clinical Recall / Guidance button */}
                    <button
                      onClick={() =>
                        setActiveRecall({
                          title: chk.title,
                          subtitle: chk.institution ? `Institution: ${chk.institution}` : undefined,
                          category: 'Checklist Protocol',
                          rationale: 'Review clinical criteria, diagnostic indications, and protocol guidelines.',
                        })
                      }
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      title="Clinical Recall & Guideline Protocol"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Recall</span>
                    </button>

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
                            data-checklist-item="true"
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
                                  data-checklist-item="true"
                                  checked={item.checked}
                                  onChange={() => handleToggleItem(chkIdx, secIdx, itmIdx)}
                                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />

                                <span
                                  data-checklist-item="true"
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

                                {/* Clinical Recall & Personal Notes Question Mark */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveRecall({
                                      title: item.text,
                                      subtitle: item.referenceValue ? `Reference Range: ${item.referenceValue}` : undefined,
                                      category: sec.title,
                                      normalRange: item.referenceValue,
                                      isRedFlag: item.starred,
                                      personalNotes: item.note,
                                      onSaveNotes: (notes) => handleUpdateItemNote(chkIdx, secIdx, itmIdx, notes),
                                    })
                                  }
                                  className="p-0.5 rounded text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors"
                                  title="Clinical Recall & Notes"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
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
                              <div className="pl-6 pt-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-slate-500">
                                    Observation Note
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveHandwritingTarget({
                                        label: `Note: ${item.text}`,
                                        field: `note-${item.id}`,
                                        initialValue: item.note || '',
                                        isNumericOnly: false,
                                        onAccept: (val) => {
                                          const prev = item.note ? item.note + ' ' : '';
                                          handleUpdateItemNote(chkIdx, secIdx, itmIdx, prev + val);
                                        },
                                      })
                                    }
                                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    title="Write note with Stylus (OCR)"
                                  >
                                    <Pen className="w-3 h-3" />
                                    <span>Write & OCR</span>
                                  </button>
                                </div>
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

            {/* Bedside Notes Section with 3 Modes: Text Only | Handwriting Only | Handwriting & Convert */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Bedside & Clinical Notes
                  </h3>
                </div>

                {/* 3 Mode Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setEndNoteMode('text')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      endNoteMode === 'text'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Text Only</span>
                  </button>

                  <button
                    onClick={() => setEndNoteMode('handwriting')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      endNoteMode === 'handwriting'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Pen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Handwriting Only</span>
                  </button>

                  <button
                    onClick={() => setEndNoteMode('convert')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      endNoteMode === 'convert'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Handwriting & Convert</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Text Only (Markdown textarea) */}
              {endNoteMode === 'text' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Markdown Synthesis
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveHandwritingTarget({
                          label: 'Clinical Notes',
                          field: 'generalNotes',
                          initialValue: '',
                          isNumericOnly: false,
                          onAccept: (val) => {
                            const prev = currentEncounter.generalNotes ? currentEncounter.generalNotes + '\n' : '';
                            onUpdateEncounter({
                              ...currentEncounter,
                              generalNotes: prev + val,
                              updatedAt: Date.now(),
                            });
                          },
                        })
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                      title="Write notes with Stylus and convert to text via OCR"
                    >
                      <Pen className="w-3.5 h-3.5" />
                      <span>Write & OCR</span>
                    </button>
                  </div>
                  <textarea
                    rows={5}
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
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Supports GitHub Flavored Markdown (headings, bullet points, checklists).</span>
                    {currentEncounter.bedsideInkStrokes && currentEncounter.bedsideInkStrokes.length > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {currentEncounter.bedsideInkStrokes.length} handwriting strokes saved in background
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Mode 2: Handwriting Only */}
              {endNoteMode === 'handwriting' && (
                <div className="space-y-2">
                  {/* Canvas Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEndNoteTool('pen')}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                          endNoteTool === 'pen'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                        title="Pen with Pressure Sensitivity"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Pen</span>
                      </button>

                      <button
                        onClick={() => setEndNoteTool('highlighter')}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                          endNoteTool === 'highlighter'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                        title="Highlighter"
                      >
                        <span>Highlighter</span>
                      </button>

                      <button
                        onClick={() => setEndNoteTool('eraser')}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                          endNoteTool === 'eraser'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                        title="Eraser"
                      >
                        <span>Eraser</span>
                      </button>

                      <button
                        onClick={() => setEndNoteTool('selector')}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                          endNoteTool === 'selector'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                        title="Lasso Selector (Irregular Freehand)"
                      >
                        <span>Lasso</span>
                      </button>
                    </div>

                    {/* Colors & Palm Rejection Toggle */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[(typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a'), '#2563eb', '#dc2626', '#16a34a', '#d97706'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setEndNoteColor(c)}
                            style={{ backgroundColor: c }}
                            className={`w-5 h-5 rounded-full border-2 transition-transform ${
                              endNoteColor === c ? 'scale-125 border-indigo-500 ring-1 ring-indigo-400' : 'border-white dark:border-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        onClick={() => setEndNotePenOnly(!endNotePenOnly)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 border transition-colors ${
                          endNotePenOnly
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                        title="Palm Rejection: Ignore touch when using hardware stylus"
                      >
                        <span>{endNotePenOnly ? 'Pen Only (Palm Guard)' : 'Pen & Touch'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onUpdateEncounter({
                            ...currentEncounter,
                            bedsideInkStrokes: [],
                            updatedAt: Date.now(),
                          });
                        }}
                        className="px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors"
                        title="Clear all handwriting strokes"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* PenCanvas Drawing Area */}
                  <div className="w-full h-72 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-inner">
                    <PenCanvas
                      strokes={currentEncounter.bedsideInkStrokes || []}
                      onChangeStrokes={(newStrokes) => {
                        onUpdateEncounter({
                          ...currentEncounter,
                          bedsideInkStrokes: newStrokes,
                          updatedAt: Date.now(),
                        });
                      }}
                      tool={endNoteTool}
                      color={endNoteColor}
                      size={endNoteSize}
                      penOnlyMode={endNotePenOnly}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* Mode 3: Handwriting and Convert to Text */}
              {endNoteMode === 'convert' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Write note with stylus, then transcribe into Markdown</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const strokes = currentEncounter.bedsideInkStrokes || [];
                          if (strokes.length === 0) return;
                          const res = await HandwritingOcrService.recognizeStrokesAsync(strokes);
                          if (res.text) {
                            const prevNotes = currentEncounter.generalNotes ? currentEncounter.generalNotes + '\n' : '';
                            onUpdateEncounter({
                              ...currentEncounter,
                              generalNotes: prevNotes + res.text,
                              updatedAt: Date.now(),
                            });
                          }
                        }}
                        disabled={!(currentEncounter.bedsideInkStrokes && currentEncounter.bedsideInkStrokes.length > 0)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-xs transition-colors"
                        title="Transcribe handwritten strokes into Markdown note"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Transcribe Ink to Text</span>
                      </button>

                      <button
                        onClick={() => {
                          onUpdateEncounter({
                            ...currentEncounter,
                            bedsideInkStrokes: [],
                            updatedAt: Date.now(),
                          });
                        }}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40"
                      >
                        Clear Ink
                      </button>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="w-full h-48 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-inner">
                    <PenCanvas
                      strokes={currentEncounter.bedsideInkStrokes || []}
                      onChangeStrokes={(newStrokes) => {
                        onUpdateEncounter({
                          ...currentEncounter,
                          bedsideInkStrokes: newStrokes,
                          updatedAt: Date.now(),
                        });
                      }}
                      tool={endNoteTool}
                      color={endNoteColor}
                      size={endNoteSize}
                      penOnlyMode={endNotePenOnly}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Transcribed Markdown Textarea */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Transcribed Clinical Markdown Notes:
                    </label>
                    <textarea
                      rows={3}
                      value={currentEncounter.generalNotes || ''}
                      onChange={(e) =>
                        onUpdateEncounter({
                          ...currentEncounter,
                          generalNotes: e.target.value,
                          updatedAt: Date.now(),
                        })
                      }
                      placeholder="Transcribed text will appear here. You can also edit it directly..."
                      className="w-full text-xs font-mono p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Handwriting-in-Box Scratchpad */}
      {activeHandwritingTarget && (
        <div className="fixed bottom-3 sm:bottom-8 right-2 sm:right-8 z-50 w-full max-w-[420px] px-2 sm:px-0 animate-in slide-in-from-bottom-4 duration-200">
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
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const allImgs: MedicalImage[] = [
                    ...(currentEncounter.images || []),
                    ...currentEncounter.checklists.flatMap((c) =>
                      c.sections.flatMap((s) => s.items.flatMap((i) => i.images || []))
                    ),
                  ];
                  const found = allImgs.find((im) => im.url === activeLightboxImage);
                  setEditingImage(
                    found || {
                      id: 'img-' + Date.now(),
                      url: activeLightboxImage,
                      caption: 'Clinical Snapshot',
                      tags: [],
                      timestamp: Date.now(),
                    }
                  );
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors"
                title="Open Image Redaction & De-identification Editor"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Edit & Redact Image</span>
              </button>
            </div>
            <button
              onClick={() => setActiveLightboxImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black text-white rounded-full"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Clinical Recall Modal */}
      {activeRecall && (
        <ClinicalRecallModal
          title={activeRecall.title}
          subtitle={activeRecall.subtitle}
          category={activeRecall.category}
          rationale={activeRecall.rationale}
          normalRange={activeRecall.normalRange}
          isRedFlag={activeRecall.isRedFlag}
          personalNotes={activeRecall.personalNotes}
          onSavePersonalNotes={activeRecall.onSaveNotes}
          onClose={() => setActiveRecall(null)}
        />
      )}

      {/* Anonymize & Share Modal */}
      {showAnonymizeModal && currentEncounter && (
        <AnonymizeShareModal
          encounter={currentEncounter}
          onClose={() => setShowAnonymizeModal(false)}
        />
      )}

      {/* Image Redaction & Editor Modal */}
      {editingImage && (
        <ImageEditorModal
          imageUrl={editingImage.url}
          imageCaption={editingImage.caption}
          onSave={handleSaveEncounterEditedImage}
          onClose={() => setEditingImage(null)}
        />
      )}
    </div>
  );
};
