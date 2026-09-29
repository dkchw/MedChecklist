import React, { useState, useEffect } from 'react';
import { db } from './db/db';
import { ChecklistTemplate, Folder } from './types/checklist';
import { PatientEncounter, EncounterChecklistInstance } from './types/patient';
import { Header } from './components/common/Header';
import { SearchModal } from './components/common/SearchModal';
import { SyncModal } from './components/sync/SyncModal';
import { LlmModal } from './components/llm/LlmModal';
import { TemplateManagerView } from './components/templates/TemplateManagerView';
import { TemplateEditorModal } from './components/templates/TemplateEditorModal';
import { PatientEncounterView } from './components/patient/PatientEncounterView';
import { PatientFacingMode } from './components/patient/PatientFacingMode';
import { NewPatientModal } from './components/patient/NewPatientModal';
import { P2PSyncService } from './utils/p2pSync';
import { checkForGitHubUpdate, UpdateCheckResult } from './utils/githubUpdater';
import { UpdateBanner } from './components/common/UpdateBanner';

export function App() {
  const [currentTab, setCurrentTab] = useState<'encounters' | 'templates'>('encounters');
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [encounters, setEncounters] = useState<PatientEncounter[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  // Modals & Mode States
  const [isBedsideMode, setIsBedsideMode] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [llmTarget, setLlmTarget] = useState<{
    encounter?: PatientEncounter;
    template?: ChecklistTemplate;
  } | null>(null);

  // Load database data
  const refreshData = async () => {
    const tpls = await db.templates.toArray();
    const encs = await db.encounters.toArray();
    const flds = await db.folders.orderBy('order').toArray();

    setTemplates(tpls);
    setEncounters(encs);
    setFolders(flds);

    if (!selectedEncounterId && encs.length > 0) {
      const firstActive = encs.find((e) => !e.isDeleted);
      if (firstActive) setSelectedEncounterId(firstActive.id);
    }
  };

  useEffect(() => {
    refreshData();
    checkForGitHubUpdate('dkchw', 'MedChecklist').then((res) => {
      if (res && res.hasUpdate) {
        setUpdateInfo(res);
      }
    });
  }, []);

  // Keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearchModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update Encounter
  const handleUpdateEncounter = async (updated: PatientEncounter) => {
    await db.encounters.put(updated);
    setEncounters((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  // Delete Encounter (Soft delete with tombstone to prevent sync conflict/loss)
  const handleDeleteEncounter = async (id: string) => {
    const enc = encounters.find((e) => e.id === id);
    if (!enc) return;
    const softDeleted = { ...enc, isDeleted: true, updatedAt: Date.now() };
    await db.encounters.put(softDeleted);
    await refreshData();
  };

  // Create Patient Encounter
  const handleCreateEncounter = async (newEnc: PatientEncounter) => {
    await db.encounters.put(newEnc);
    setSelectedEncounterId(newEnc.id);
    await refreshData();
  };

  // Save Template
  const handleSaveTemplate = async (tpl: ChecklistTemplate) => {
    await db.templates.put(tpl);
    await refreshData();
  };

  // Delete Template (Soft delete)
  const handleDeleteTemplate = async (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const softDeleted = { ...tpl, isDeleted: true, updatedAt: Date.now() };
    await db.templates.put(softDeleted);
    await refreshData();
  };

  // Toggle Template Pin
  const handleTogglePinTemplate = async (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    const updated = { ...tpl, isPinned: !tpl.isPinned, updatedAt: Date.now() };
    await db.templates.put(updated);
    await refreshData();
  };

  // Add Template directly to active encounter
  const handleInstantiateInEncounter = async (tpl: ChecklistTemplate) => {
    let target = encounters.find((e) => e.id === selectedEncounterId && !e.isDeleted);
    if (!target) {
      target = encounters.find((e) => !e.isDeleted);
    }
    if (!target) {
      // Create new encounter with this template
      const newEnc: PatientEncounter = {
        id: 'enc-' + Date.now(),
        patientIdentifier: 'Bed 1 - New Patient',
        chiefComplaint: 'Clinical Consult',
        status: 'active',
        tags: ['#consult'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checklists: [
          {
            id: 'inst-' + Date.now(),
            templateId: tpl.id,
            title: tpl.title,
            institution: tpl.institution,
            sections: JSON.parse(JSON.stringify(tpl.sections)),
          },
        ],
      };
      await handleCreateEncounter(newEnc);
      setCurrentTab('encounters');
      return;
    }

    const newInstance: EncounterChecklistInstance = {
      id: 'inst-' + Date.now(),
      templateId: tpl.id,
      title: tpl.title,
      institution: tpl.institution,
      sections: JSON.parse(JSON.stringify(tpl.sections)),
    };
    const updated: PatientEncounter = {
      ...target,
      checklists: [...target.checklists, newInstance],
      updatedAt: Date.now(),
    };
    await handleUpdateEncounter(updated);
    setSelectedEncounterId(target.id);
    setCurrentTab('encounters');
  };

  // Export Full Backup
  const handleExportBackup = async () => {
    const payload = await P2PSyncService.exportSyncPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medchecklist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Full Backup
  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const payload = JSON.parse(text);
        await P2PSyncService.importSyncPayload(payload);
        await refreshData();
        alert('Backup successfully restored and merged!');
      } catch (err: any) {
        alert('Error restoring backup: ' + err.message);
      }
    };
    input.click();
  };

  const currentEncounter =
    encounters.find((e) => e.id === selectedEncounterId && !e.isDeleted) ||
    encounters.find((e) => !e.isDeleted);

  // If in Bedside Patient-Facing Mode, render full-screen paper-like view
  if (isBedsideMode && currentEncounter) {
    return (
      <PatientFacingMode
        encounter={currentEncounter}
        onUpdateEncounter={handleUpdateEncounter}
        onExit={() => setIsBedsideMode(false)}
        onOpenLlmModal={() => setLlmTarget({ encounter: currentEncounter })}
        onOpenTemplateEditor={(templateId) => {
          const tpl = templates.find((t) => t.id === templateId);
          if (tpl) setEditingTemplate(tpl);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {updateInfo && updateInfo.hasUpdate && (
        <UpdateBanner
          updateInfo={updateInfo}
          onDismiss={() => setUpdateInfo(null)}
        />
      )}

      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenSync={() => setShowSyncModal(true)}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      <main className="flex-1">
        {currentTab === 'encounters' ? (
          <PatientEncounterView
            encounters={encounters}
            selectedEncounterId={selectedEncounterId}
            templates={templates}
            onSelectEncounter={setSelectedEncounterId}
            onUpdateEncounter={handleUpdateEncounter}
            onOpenNewPatientModal={() => setShowNewPatientModal(true)}
            onEnterPatientFacingMode={() => setIsBedsideMode(true)}
            onOpenLlmModal={() => {
              if (currentEncounter) setLlmTarget({ encounter: currentEncounter });
            }}
            onOpenTemplateEditor={(tplId) => {
              const tpl = templates.find((t) => t.id === tplId);
              if (tpl) setEditingTemplate(tpl);
            }}
            onDeleteEncounter={handleDeleteEncounter}
          />
        ) : (
          <TemplateManagerView
            templates={templates}
            folders={folders}
            onOpenEditor={(tpl) => setEditingTemplate(tpl)}
            onCreateTemplate={() => {
              const newTpl: ChecklistTemplate = {
                id: 'tpl-' + Date.now(),
                title: 'New Clinical Checklist',
                description: 'Custom clinical protocol',
                category: 'General',
                tags: ['custom'],
                sections: [
                  {
                    id: 'sec-' + Date.now(),
                    title: 'Section 1',
                    items: [{ id: 'item-' + Date.now(), text: 'New item', checked: false }],
                  },
                ],
                updatedAt: Date.now(),
              };
              setEditingTemplate(newTpl);
            }}
            onTogglePin={handleTogglePinTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onInstantiateInEncounter={handleInstantiateInEncounter}
            onOpenLlmModal={(tpl) => setLlmTarget({ template: tpl })}
          />
        )}
      </main>

      {/* Modals */}
      {showSearchModal && (
        <SearchModal
          templates={templates}
          encounters={encounters}
          onSelectTemplate={(tplId) => {
            const tpl = templates.find((t) => t.id === tplId);
            if (tpl) {
              setEditingTemplate(tpl);
              setCurrentTab('templates');
            }
          }}
          onSelectEncounter={(encId) => {
            setSelectedEncounterId(encId);
            setCurrentTab('encounters');
          }}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {showSyncModal && <SyncModal onClose={() => setShowSyncModal(false)} />}

      {showNewPatientModal && (
        <NewPatientModal
          templates={templates}
          onCreate={handleCreateEncounter}
          onClose={() => setShowNewPatientModal(false)}
        />
      )}

      {editingTemplate && (
        <TemplateEditorModal
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}

      {llmTarget && (
        <LlmModal
          encounter={llmTarget.encounter}
          template={llmTarget.template}
          onClose={() => setLlmTarget(null)}
          onApplyMarkdown={({ sections, generalNotes }) => {
            if (llmTarget.encounter) {
              const updated: PatientEncounter = {
                ...llmTarget.encounter,
                checklists: [
                  ...llmTarget.encounter.checklists,
                  {
                    id: 'inst-llm-' + Date.now(),
                    templateId: 'tpl-imported',
                    title: 'Imported Findings from Chatbox',
                    sections,
                  },
                ],
                generalNotes: generalNotes
                  ? (llmTarget.encounter.generalNotes
                      ? `${llmTarget.encounter.generalNotes}\n\n${generalNotes}`
                      : generalNotes)
                  : llmTarget.encounter.generalNotes,
                updatedAt: Date.now(),
              };
              handleUpdateEncounter(updated);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
