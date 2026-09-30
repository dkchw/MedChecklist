export interface KnowledgeNote {
  id: string;
  title: string;
  content: string; // Markdown body
  folderId?: string; // Reference to unified FolderItem
  facility?: string; // e.g. St. Jude Hospital
  ward?: string; // e.g. ICU, Cardiology
  tags?: string[];
  linkedChecklistIds?: string[];
  linkedTemplateIds?: string[];
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface ChecklistRunSession {
  id: string;
  checklistId?: string;
  templateId?: string;
  title: string;
  sessionNotes?: string; // Lesson or study notes
  checkedItemIds: string[];
  customValues?: Record<string, string>;
  itemNotes?: Record<string, string>;
  folderId?: string;
  facility?: string;
  ward?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}
