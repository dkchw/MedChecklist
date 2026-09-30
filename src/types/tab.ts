export type TabType = 'encounters' | 'checklists' | 'templates' | 'protocols' | 'gallery' | 'folder' | 'knowledge';

export interface WorkspaceTab {
  id: string;
  title: string;
  type: TabType;
  folderId?: string;
  wardFilter?: string;
  isClosable?: boolean;
  order: number;
}

export interface FolderItem {
  id: string;
  name: string;
  type: 'facility' | 'ward' | 'specialty' | 'patient' | 'checklist' | 'template' | 'knowledge';
  description?: string;
  color?: string;
  parentId?: string; // Links Ward to Facility, or Subfolder to Parent
  facilityName?: string;
  wardName?: string;
  itemCount?: number;
  order: number;
}

export const DEFAULT_TABS: WorkspaceTab[] = [
  { id: 'tab-encounters', title: 'Patients', type: 'encounters', isClosable: false, order: 0 },
  { id: 'tab-protocols', title: 'Protocols', type: 'protocols', isClosable: false, order: 1 },
  { id: 'tab-knowledge', title: 'Knowledge Hub', type: 'knowledge', isClosable: false, order: 2 },
];
