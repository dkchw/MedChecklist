import Dexie, { type Table } from 'dexie';
import { Checklist, ChecklistTemplate, Folder } from '../types/checklist';
import { ClinicalTemplate } from '../types/template';
import { PatientEncounter } from '../types/patient';
import { SavedDevice } from '../types/security';
import {
  INITIAL_FOLDERS,
  INITIAL_CHECKLISTS,
  INITIAL_CLINICAL_TEMPLATES,
  INITIAL_ENCOUNTERS,
} from './initialData';

export class MedChecklistDB extends Dexie {
  checklists!: Table<Checklist, string>;
  clinicalTemplates!: Table<ClinicalTemplate, string>;
  templates!: Table<ChecklistTemplate, string>; // Backwards compatible table
  encounters!: Table<PatientEncounter, string>;
  savedDevices!: Table<SavedDevice, string>;
  folders!: Table<Folder, string>;
  settings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('MedChecklistDatabase');

    this.version(1).stores({
      templates: 'id, title, category, institution, isPinned, isDeleted, updatedAt',
      encounters: 'id, patientIdentifier, status, bedNumber, isDeleted, updatedAt, createdAt',
      folders: 'id, name, order',
      settings: 'key',
    });

    this.version(2).stores({
      checklists: 'id, title, category, institution, isPinned, isDeleted, updatedAt',
      clinicalTemplates: 'id, title, category, institution, isPinned, isDeleted, updatedAt',
      templates: 'id, title, category, institution, isPinned, isDeleted, updatedAt',
      encounters: 'id, patientIdentifier, group, status, bedNumber, isDeleted, updatedAt, createdAt',
      savedDevices: 'id, name, pairedAt',
      folders: 'id, name, order',
      settings: 'key',
    });
  }

  async populateInitialDataIfEmpty() {
    const checklistCount = await this.checklists.count();
    if (checklistCount === 0) {
      await this.checklists.bulkAdd(INITIAL_CHECKLISTS);
    }

    const templateCount = await this.templates.count();
    if (templateCount === 0) {
      await this.templates.bulkAdd(INITIAL_CHECKLISTS);
    }

    const clinicalTemplateCount = await this.clinicalTemplates.count();
    if (clinicalTemplateCount === 0) {
      await this.clinicalTemplates.bulkAdd(INITIAL_CLINICAL_TEMPLATES);
    }

    const folderCount = await this.folders.count();
    if (folderCount === 0) {
      await this.folders.bulkAdd(INITIAL_FOLDERS);
    }

    const encounterCount = await this.encounters.count();
    if (encounterCount === 0) {
      await this.encounters.bulkAdd(INITIAL_ENCOUNTERS);
    }
  }
}

export const db = new MedChecklistDB();

// Initialize data on load
db.on('ready', () => {
  return db.populateInitialDataIfEmpty();
});
