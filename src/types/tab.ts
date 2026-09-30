export type TabType = 'encounters' | 'checklists' | 'templates' | 'gallery' | 'folder' | 'knowledge';

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
  { id: 'tab-checklists', title: 'Checklists', type: 'checklists', isClosable: false, order: 1 },
  { id: 'tab-templates', title: 'Templates', type: 'templates', isClosable: false, order: 2 },
  { id: 'tab-knowledge', title: 'Knowledge Hub', type: 'knowledge', isClosable: false, order: 3 },
  { id: 'tab-gallery', title: 'Image Gallery', type: 'gallery', isClosable: true, order: 4 },
];
