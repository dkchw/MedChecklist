export interface MedicalLink {
  id: string;
  title: string;
  url: string;
  category?: 'uptodate' | 'pubmed' | 'wiki' | 'youtube' | 'general';
}

export interface MedicalImage {
  id: string;
  url: string; // Base64 data URL or external URL
  caption?: string;
  timestamp: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  starred?: boolean;
  note?: string;
  category?: string;
  referenceValue?: string; // e.g. "Normal: 135-145 mEq/L"
  labValue?: string;        // Patient recorded value e.g. "131 (Low)"
  unit?: string;            // e.g. "mEq/L", "mg/dL"
  order?: number;
  images?: MedicalImage[];
  links?: MedicalLink[];
}

export interface ChecklistSection {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
}

/**
 * Modular atomic checklist (e.g. Sepsis 1-hr Bundle, Airway Checklist, Cardiac Troponin series)
 */
export interface Checklist {
  id: string;
  title: string;
  description: string;
  category: string;
  institution?: string; // e.g. "Hospital Central Lab", "AHA Guidelines"
  tags: string[];
  sections: ChecklistSection[];
  isPinned?: boolean;
  isCustom?: boolean; // user-created/modified
  updatedAt: number;
  isDeleted?: boolean; // soft delete for conflict prevention
  links?: MedicalLink[];
  images?: MedicalImage[];
}

// Backwards-compatible alias for existing imports
export type ChecklistTemplate = Checklist;

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  order: number;
}
