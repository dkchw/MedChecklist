import { ChecklistSection, MedicalImage, MedicalLink } from './checklist';
import { InkStroke } from './ink';

export interface EncounterChecklistInstance {
  id: string;
  templateId: string; // Checklist ID that this instance was instantiated from
  title: string;
  institution?: string;
  sections: ChecklistSection[];
  completedAt?: number;
}

export interface PatientEncounter {
  id: string;
  patientIdentifier: string; // e.g. "Bed 4 - Smith, J." or "Pt #8832"
  facility?: string;         // Hospital / Clinic / Medical Center e.g. "City General", "St. Jude Clinic"
  group?: string;            // Patient ward / room block / department e.g. "ICU", "Cardiology Ward", "Emergency"
  folderId?: string;         // Folder classification ID
  age?: string;
  sex?: 'M' | 'F' | 'Other';
  bedNumber?: string;
  chiefComplaint: string;
  status: 'active' | 'archived'; // Active for current bedside rounds, Archived for discharged/completed
  archivedAt?: number;       // Timestamp when encounter was archived
  pagesCount?: number;       // Number of pages in full handwriting mode (default 1)
  templateId?: string;       // Originating ClinicalTemplate bundle ID (if instantiated from template)
  templateTitle?: string;    // Name of template used (e.g. "Acute Coronary Syndrome Admission")
  checklists: EncounterChecklistInstance[]; // Modular checklists attached to this patient
  generalNotes?: string;     // Editable Markdown clinical notes / SOAP / instructions
  inkStrokes?: InkStroke[];  // Bedside handwritten notes and pen drawings (full mode)
  bedsideInkStrokes?: InkStroke[]; // Dedicated handwriting strokes for end-of-dossier note
  images?: MedicalImage[];   // Attached clinical images (ECG, rashes, wounds, labs)
  links?: MedicalLink[];     // Attached reference links (UpToDate, PubMed, Guidelines)
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;       // Soft delete tombstone for conflict prevention
}
