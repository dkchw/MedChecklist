export type TabType = 'encounters' | 'checklists' | 'templates' | 'gallery' | 'folder';

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
  type: 'patient' | 'checklist' | 'template';
  description?: string;
  color?: string;
  parentId?: string;
  itemCount?: number;
  order: number;
}

export const DEFAULT_TABS: WorkspaceTab[] = [
  { id: 'tab-encounters', title: 'Patients', type: 'encounters', isClosable: false, order: 0 },
  { id: 'tab-checklists', title: 'Checklists', type: 'checklists', isClosable: false, order: 1 },
  { id: 'tab-templates', title: 'Templates', type: 'templates', isClosable: false, order: 2 },
  { id: 'tab-gallery', title: 'Image Gallery', type: 'gallery', isClosable: true, order: 3 },
];
