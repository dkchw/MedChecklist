import React, { useState, useEffect } from 'react';
import { db } from './db/db';
import { Checklist } from './types/checklist';
import { ClinicalTemplate } from './types/template';
import { PatientEncounter, EncounterChecklistInstance } from './types/patient';
import { WorkspaceTab, FolderItem, DEFAULT_TABS, TabType } from './types/tab';
import { Header } from './components/common/Header';
import { SearchModal } from './components/common/SearchModal';
import { SyncModal } from './components/sync/SyncModal';
import { LlmModal } from './components/llm/LlmModal';
import { FolderModal } from './components/common/FolderModal';
import { ChecklistManagerView } from './components/checklists/ChecklistManagerView';
import { ChecklistEditorModal } from './components/checklists/ChecklistEditorModal';
import { TemplateManagerView } from './components/templates/TemplateManagerView';
import { ClinicalTemplateEditorModal } from './components/templates/ClinicalTemplateEditorModal';
import { PatientEncounterView } from './components/patient/PatientEncounterView';
import { PatientFacingMode } from './components/patient/PatientFacingMode';
import { NewPatientModal } from './components/patient/NewPatientModal';
import { VaultModal } from './components/security/VaultModal';
import { ImageGalleryModal } from './components/patient/ImageGalleryModal';
import { P2PSyncService } from './utils/p2pSync';
import { cryptoVault } from './utils/cryptoVault';
import { checkForGitHubUpdate, UpdateCheckResult } from './utils/githubUpdater';
import { UpdateBanner } from './components/common/UpdateBanner';
import { getInitialTheme, applyTheme, ThemeMode } from './utils/theme';

export function App() {
  // Customizable Tabs State
  const [tabs, setTabs] = useState<WorkspaceTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('tab-encounters');

  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme());
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [clinicalTemplates, setClinicalTemplates] = useState<ClinicalTemplate[]>([]);
  const [encounters, setEncounters] = useState<PatientEncounter[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

  // Security & Vault State
  const [isVaultLocked, setIsVaultLocked] = useState<boolean>(cryptoVault.isVaultLocked());
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);

  // Modals & Mode States
  const [isBedsideMode, setIsBedsideMode] = useState<boolean>(false);
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);

  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [editingClinicalTemplate, setEditingClinicalTemplate] = useState<ClinicalTemplate | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [llmTarget, setLlmTarget] = useState<{
    encounter?: PatientEncounter;
    checklist?: Checklist;
  } | null>(null);

  // Load database data
  const refreshData = async () => {
    const chks = await db.checklists.toArray();
    const tmpls = await db.clinicalTemplates.toArray();
    const encs = await db.encounters.toArray();
    const flds = (await db.folders.orderBy('order').toArray()) as any;

    setChecklists(chks);
    setClinicalTemplates(tmpls);
    setEncounters(encs);
    setFolders(flds || []);
    setIsVaultLocked(cryptoVault.isVaultLocked());

    // Load saved tabs
    try {
      const savedTabs = await db.settings.get('workspace_tabs');
      if (savedTabs && savedTabs.value && savedTabs.value.length > 0) {
        setTabs(savedTabs.value);
      }
    } catch {}

    if (!selectedEncounterId && encs.length > 0) {
      const firstActive = encs.find((e) => !e.isDeleted && e.status === 'active') || encs.find((e) => !e.isDeleted);
      if (firstActive) setSelectedEncounterId(firstActive.id);
    }
  };

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const handleToggleTheme = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'));
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

  // Workspace Tabs Management
  const handleAddTab = async (title: string, type: TabType) => {
    const newTab: WorkspaceTab = {
      id: 'tab-' + Date.now(),
      title,
      type,
      isClosable: true,
      order: tabs.length,
    };
    const updated = [...tabs, newTab];
    setTabs(updated);
    setActiveTabId(newTab.id);
    await db.settings.put({ key: 'workspace_tabs', value: updated });
  };

  const handleRemoveTab = async (tabId: string) => {
    if (tabs.length <= 1) return;
    const updated = tabs.filter((t) => t.id !== tabId);
    setTabs(updated);
    if (activeTabId === tabId) {
      setActiveTabId(updated[0].id);
    }
    await db.settings.put({ key: 'workspace_tabs', value: updated });
  };

  const handleRenameTab = async (tabId: string, newTitle: string) => {
    const updated = tabs.map((t) => (t.id === tabId ? { ...t, title: newTitle } : t));
    setTabs(updated);
    await db.settings.put({ key: 'workspace_tabs', value: updated });
  };

  const handleReorderTabs = async (newTabs: WorkspaceTab[]) => {
    const reindexed = newTabs.map((t, idx) => ({ ...t, order: idx }));
    setTabs(reindexed);
    await db.settings.put({ key: 'workspace_tabs', value: reindexed });
  };

  // Folder Management Handlers
  const handleCreateFolder = async (
    name: string,
    type: 'patient' | 'checklist' | 'template',
    color?: string
  ) => {
    const newFolder: any = {
      id: 'fld-' + Date.now(),
      name,
      type,
      color: color || '#6366f1',
      order: folders.length,
    };
    await db.folders.put(newFolder);
    await refreshData();
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    const f = folders.find((fld) => fld.id === id);
    if (f) {
      await db.folders.put({ ...f, name: newName } as any);
      await refreshData();
    }
  };

  const handleDeleteFolder = async (id: string) => {
    await db.folders.delete(id);
    await refreshData();
  };

  const handleAssignEncounterToFolder = async (encounterId: string, folderId?: string) => {
    const enc = encounters.find((e) => e.id === encounterId);
    if (enc) {
      await db.encounters.put({ ...enc, folderId, updatedAt: Date.now() });
      await refreshData();
    }
  };

  // Update Encounter
  const handleUpdateEncounter = async (updated: PatientEncounter) => {
    await db.encounters.put(updated);
    setEncounters((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  // Delete Encounter (Soft delete with tombstone)
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
    setActiveTabId('tab-encounters');
    await refreshData();
  };

  // Checklist Actions
  const handleSaveChecklist = async (chk: Checklist) => {
    await db.checklists.put(chk);
    await refreshData();
  };

  const handleDeleteChecklist = async (id: string) => {
    const chk = checklists.find((c) => c.id === id);
    if (!chk) return;
    const softDeleted = { ...chk, isDeleted: true, updatedAt: Date.now() };
    await db.checklists.put(softDeleted);
    await refreshData();
  };

  const handleTogglePinChecklist = async (id: string) => {
    const chk = checklists.find((c) => c.id === id);
    if (!chk) return;
    const updated = { ...chk, isPinned: !chk.isPinned, updatedAt: Date.now() };
    await db.checklists.put(updated);
    await refreshData();
  };

  const handleDuplicateChecklist = async (chk: Checklist) => {
    const cloned: Checklist = {
      ...JSON.parse(JSON.stringify(chk)),
      id: 'chk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: `${chk.title} (Copy)`,
      updatedAt: Date.now(),
    };
    await db.checklists.put(cloned);
    await refreshData();
  };

  // Add individual checklist to current active patient
  const handleAddChecklistToActivePatient = async (chk: Checklist) => {
    let target = encounters.find((e) => e.id === selectedEncounterId && !e.isDeleted);
    if (!target) {
      target = encounters.find((e) => !e.isDeleted && e.status === 'active');
    }

    if (!target) {
      setShowNewPatientModal(true);
      return;
    }

    const newInstance: EncounterChecklistInstance = {
      id: 'inst-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      templateId: chk.id,
      title: chk.title,
      institution: chk.institution,
      sections: JSON.parse(JSON.stringify(chk.sections)),
    };

    const updated: PatientEncounter = {
      ...target,
      checklists: [...target.checklists, newInstance],
      updatedAt: Date.now(),
    };

    await handleUpdateEncounter(updated);
    setSelectedEncounterId(target.id);
    setActiveTabId('tab-encounters');
  };

  // Clinical Template Actions
  const handleSaveClinicalTemplate = async (tmpl: ClinicalTemplate) => {
    await db.clinicalTemplates.put(tmpl);
    await refreshData();
  };

  const handleDeleteClinicalTemplate = async (id: string) => {
    const tmpl = clinicalTemplates.find((t) => t.id === id);
    if (!tmpl) return;
    const softDeleted = { ...tmpl, isDeleted: true, updatedAt: Date.now() };
    await db.clinicalTemplates.put(softDeleted);
    await refreshData();
  };

  const handleTogglePinClinicalTemplate = async (id: string) => {
    const tmpl = clinicalTemplates.find((t) => t.id === id);
    if (!tmpl) return;
    const updated = { ...tmpl, isPinned: !tmpl.isPinned, updatedAt: Date.now() };
    await db.clinicalTemplates.put(updated);
    await refreshData();
  };

  const handleApplyClinicalTemplateToPatient = (tmpl: ClinicalTemplate) => {
    setShowNewPatientModal(true);
  };

  // Full Backup Export/Import
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
          const chk = checklists.find((c) => c.id === templateId);
          if (chk) setEditingChecklist(chk);
        }}
      />
    );
  }

  // Active Tab Type
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || DEFAULT_TABS[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {updateInfo && updateInfo.hasUpdate && (
        <UpdateBanner updateInfo={updateInfo} onDismiss={() => setUpdateInfo(null)} />
      )}

      <Header
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onAddTab={handleAddTab}
        onRemoveTab={handleRemoveTab}
        onRenameTab={handleRenameTab}
        onReorderTabs={handleReorderTabs}
        onOpenFolders={() => setShowFolderModal(true)}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenSync={() => setShowSyncModal(true)}
        onOpenVault={() => setShowVaultModal(true)}
        isVaultLocked={isVaultLocked}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />

      <main className="flex-1">
        {activeTab.type === 'encounters' && (
          <PatientEncounterView
            encounters={encounters}
            selectedEncounterId={selectedEncounterId}
            templates={checklists}
            onSelectEncounter={setSelectedEncounterId}
            onUpdateEncounter={handleUpdateEncounter}
            onOpenNewPatientModal={() => setShowNewPatientModal(true)}
            onEnterPatientFacingMode={() => setIsBedsideMode(true)}
            onOpenLlmModal={() => {
              if (currentEncounter) setLlmTarget({ encounter: currentEncounter });
            }}
            onOpenTemplateEditor={(chkId) => {
              const chk = checklists.find((c) => c.id === chkId);
              if (chk) setEditingChecklist(chk);
            }}
            onDeleteEncounter={handleDeleteEncounter}
            onOpenGallery={() => setShowGalleryModal(true)}
          />
        )}

        {activeTab.type === 'checklists' && (
          <ChecklistManagerView
            checklists={checklists}
            onOpenEditor={(chk) => setEditingChecklist(chk)}
            onCreateChecklist={() => {
              const newChk: Checklist = {
                id: 'chk-' + Date.now(),
                title: 'New Modular Checklist',
                description: 'Clinical protocol steps and bounds',
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
              setEditingChecklist(newChk);
            }}
            onDuplicateChecklist={handleDuplicateChecklist}
            onTogglePin={handleTogglePinChecklist}
            onDeleteChecklist={handleDeleteChecklist}
            onInstantiateInEncounter={handleAddChecklistToActivePatient}
            onOpenLlmModal={(chk) => setLlmTarget({ checklist: chk })}
          />
        )}

        {activeTab.type === 'templates' && (
          <TemplateManagerView
            templates={clinicalTemplates}
            availableChecklists={checklists}
            onOpenEditor={(tmpl) => setEditingClinicalTemplate(tmpl)}
            onCreateTemplate={() => {
              const newTmpl: ClinicalTemplate = {
                id: 'tmpl-' + Date.now(),
                title: 'New Clinical Template Bundle',
                description: 'Bundle grouping multiple checklists and protocol guidance',
                category: 'General',
                tags: ['bundle'],
                checklistIds: [],
                protocolNotes:
                  '### Standard Ward Guidance:\n- Step 1: Initial assessment\n- Step 2: Handoff protocol',
                updatedAt: Date.now(),
              };
              setEditingClinicalTemplate(newTmpl);
            }}
            onTogglePin={handleTogglePinClinicalTemplate}
            onDeleteTemplate={handleDeleteClinicalTemplate}
            onApplyTemplateToPatient={handleApplyClinicalTemplateToPatient}
          />
        )}

        {activeTab.type === 'gallery' && (
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <ImageGalleryModal
              encounters={encounters}
              selectedEncounterId={selectedEncounterId}
              onUpdateEncounter={handleUpdateEncounter}
              onClose={() => setActiveTabId(tabs[0].id)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {showSearchModal && (
        <SearchModal
          checklists={checklists}
          templates={clinicalTemplates}
          encounters={encounters}
          onSelectChecklist={(chkId) => {
            const chk = checklists.find((c) => c.id === chkId);
            if (chk) {
              setEditingChecklist(chk);
              setActiveTabId('tab-checklists');
            }
          }}
          onSelectTemplate={(tmplId) => {
            const tmpl = clinicalTemplates.find((t) => t.id === tmplId);
            if (tmpl) {
              setEditingClinicalTemplate(tmpl);
              setActiveTabId('tab-templates');
            }
          }}
          onSelectEncounter={(encId) => {
            setSelectedEncounterId(encId);
            setActiveTabId('tab-encounters');
          }}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {showSyncModal && <SyncModal onClose={() => setShowSyncModal(false)} />}

      {showNewPatientModal && (
        <NewPatientModal
          checklists={checklists}
          templates={clinicalTemplates}
          onCreate={handleCreateEncounter}
          onClose={() => setShowNewPatientModal(false)}
        />
      )}

      {showVaultModal && (
        <VaultModal
          onClose={() => {
            setShowVaultModal(false);
            setIsVaultLocked(cryptoVault.isVaultLocked());
          }}
          onVaultStateChanged={refreshData}
        />
      )}

      {showFolderModal && (
        <FolderModal
          folders={folders}
          encounters={encounters}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onAssignEncounterToFolder={handleAssignEncounterToFolder}
          onClose={() => setShowFolderModal(false)}
        />
      )}

      {showGalleryModal && (
        <ImageGalleryModal
          encounters={encounters}
          selectedEncounterId={selectedEncounterId}
          onUpdateEncounter={handleUpdateEncounter}
          onClose={() => setShowGalleryModal(false)}
        />
      )}

      {editingChecklist && (
        <ChecklistEditorModal
          checklist={editingChecklist}
          onSave={handleSaveChecklist}
          onClose={() => setEditingChecklist(null)}
        />
      )}

      {editingClinicalTemplate && (
        <ClinicalTemplateEditorModal
          template={editingClinicalTemplate}
          availableChecklists={checklists}
          onSave={handleSaveClinicalTemplate}
          onClose={() => setEditingClinicalTemplate(null)}
        />
      )}

      {llmTarget && (
        <LlmModal
          encounter={llmTarget.encounter}
          template={llmTarget.checklist}
          onClose={() => setLlmTarget(null)}
          onApplyMarkdown={({ sections, generalNotes }) => {
            if (llmTarget.encounter) {
              const updated: PatientEncounter = {
                ...llmTarget.encounter,
                checklists: [
                  ...llmTarget.encounter.checklists,
                  {
                    id: 'inst-llm-' + Date.now(),
                    templateId: 'chk-imported',
                    title: 'Imported Findings from Chatbox',
                    sections,
                  },
                ],
                generalNotes: generalNotes
                  ? llmTarget.encounter.generalNotes
                    ? `${llmTarget.encounter.generalNotes}\n\n${generalNotes}`
                    : generalNotes
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
