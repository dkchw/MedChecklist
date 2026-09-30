import React, { useState } from 'react';
import { Checklist } from '../../types/checklist';
import { ClinicalTemplate } from '../../types/template';
import { ChecklistManagerView } from '../checklists/ChecklistManagerView';
import { TemplateManagerView } from '../templates/TemplateManagerView';
import { CheckSquare, Layers } from 'lucide-react';

interface ProtocolsViewProps {
  checklists: Checklist[];
  clinicalTemplates: ClinicalTemplate[];
  onOpenChecklistEditor: (checklist: Checklist) => void;
  onCreateChecklist: () => void;
  onDuplicateChecklist?: (checklist: Checklist) => void;
  onTogglePinChecklist: (checklistId: string) => void;
  onDeleteChecklist: (checklistId: string) => void;
  onInstantiateInEncounter?: (checklist: Checklist) => void;
  onOpenChecklistLlm: (checklist: Checklist) => void;
  onOpenTemplateEditor: (template: ClinicalTemplate) => void;
  onCreateTemplate: () => void;
  onTogglePinTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplateToPatient: (template: ClinicalTemplate) => void;
}

export const ProtocolsView: React.FC<ProtocolsViewProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState<'checklists' | 'templates'>('checklists');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Segmented Toggle */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('checklists')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'checklists'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            <span>Checklists</span>
          </button>
          <button
            onClick={() => setActiveSubTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'templates'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Template Bundles</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeSubTab === 'checklists' ? (
        <ChecklistManagerView
          checklists={props.checklists}
          onOpenEditor={props.onOpenChecklistEditor}
          onCreateChecklist={props.onCreateChecklist}
          onDuplicateChecklist={props.onDuplicateChecklist}
          onTogglePin={props.onTogglePinChecklist}
          onDeleteChecklist={props.onDeleteChecklist}
          onInstantiateInEncounter={props.onInstantiateInEncounter}
          onOpenLlmModal={props.onOpenChecklistLlm}
        />
      ) : (
        <TemplateManagerView
          templates={props.clinicalTemplates}
          availableChecklists={props.checklists}
          onOpenEditor={props.onOpenTemplateEditor}
          onCreateTemplate={props.onCreateTemplate}
          onTogglePin={props.onTogglePinTemplate}
          onDeleteTemplate={props.onDeleteTemplate}
          onApplyTemplateToPatient={props.onApplyTemplateToPatient}
        />
      )}
    </div>
  );
};
