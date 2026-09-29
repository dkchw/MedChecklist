import { ChecklistSection } from './checklist';
import { InkStroke } from './ink';

export interface EncounterChecklistInstance {
  id: string;
  templateId: string;
  title: string;
  institution?: string;
  sections: ChecklistSection[];
  completedAt?: number;
}

export interface PatientEncounter {
  id: string;
  patientIdentifier: string; // e.g. "Bed 4 - Smith, J." or "Pt #8832"
  age?: string;
  sex?: 'M' | 'F' | 'Other';
  bedNumber?: string;
  chiefComplaint: string;
  status: 'active' | 'completed' | 'archived';
  checklists: EncounterChecklistInstance[];
  generalNotes?: string;
  inkStrokes?: InkStroke[]; // Bedside handwritten notes and drawings
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean; // Soft delete for conflict prevention
}
