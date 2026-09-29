import Dexie, { type Table } from 'dexie';
import { ChecklistTemplate, Folder } from '../types/checklist';
import { PatientEncounter } from '../types/patient';
import { INITIAL_FOLDERS, INITIAL_TEMPLATES, INITIAL_ENCOUNTERS } from './initialData';

export class MedChecklistDB extends Dexie {
  templates!: Table<ChecklistTemplate, string>;
  encounters!: Table<PatientEncounter, string>;
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
  }

  async populateInitialDataIfEmpty() {
    const templateCount = await this.templates.count();
    if (templateCount === 0) {
      await this.templates.bulkAdd(INITIAL_TEMPLATES);
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
