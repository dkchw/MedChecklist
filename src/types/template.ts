import { Checklist } from './checklist';

export interface ClinicalTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  institution?: string;
  tags: string[];
  checklistIds: string[]; // Modular checklists included in this template bundle
  protocolNotes?: string; // Default clinical guidance, protocol rules, or ward notes in Markdown
  isPinned?: boolean;
  isCustom?: boolean;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface ResolvedTemplate extends ClinicalTemplate {
  resolvedChecklists: Checklist[];
}
