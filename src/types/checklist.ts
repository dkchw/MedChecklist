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
}

export interface Folder {
  id: string;
  name: string;
  icon?: string;
  order: number;
}
