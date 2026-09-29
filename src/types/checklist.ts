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

export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  institution?: string; // e.g. "General Hospital", "Mayo Clinic Protocol"
  tags: string[];
  sections: ChecklistSection[];
  isPinned?: boolean;
  isCustom?: boolean; // user-created/modified
  updatedAt: number;
  isDeleted?: boolean; // soft delete for conflict prevention
  links?: MedicalLink[];
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  order: number;
}
