import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckSquare, Stethoscope, Layers, ArrowRight, X } from 'lucide-react';
import { Checklist } from '../../types/checklist';
import { ClinicalTemplate } from '../../types/template';
import { PatientEncounter } from '../../types/patient';

interface SearchResult {
  type: 'checklist' | 'template' | 'encounter' | 'item' | 'note';
  title: string;
  subtitle: string;
  badge: string;
  targetId: string;
}

interface SearchModalProps {
  checklists: Checklist[];
  templates: ClinicalTemplate[];
  encounters: PatientEncounter[];
  onSelectChecklist: (checklistId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onSelectEncounter: (encounterId: string) => void;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  checklists,
  templates,
  encounters,
  onSelectChecklist,
  onSelectTemplate,
  onSelectEncounter,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results: SearchResult[] = [];
  const q = query.trim().toLowerCase();

  if (q.length > 0) {
    // 1. Search modular checklists
    for (const chk of checklists) {
      if (chk.isDeleted) continue;
      if (
        chk.title.toLowerCase().includes(q) ||
        chk.description?.toLowerCase().includes(q) ||
        chk.tags?.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'checklist',
          title: chk.title,
          subtitle: `${chk.category || 'General'} • ${(chk.tags || []).join(', ')}`,
          badge: 'Checklist',
          targetId: chk.id,
        });
      }

      // Search checklist items
      for (const sec of chk.sections || []) {
        for (const itm of sec.items || []) {
          if (
            itm.text.toLowerCase().includes(q) ||
            itm.referenceValue?.toLowerCase().includes(q)
          ) {
            results.push({
              type: 'checklist',
              title: itm.text,
              subtitle: `In ${chk.title} > ${sec.title} ${
                itm.referenceValue ? `[${itm.referenceValue}]` : ''
              }`,
              badge: 'Checklist Item',
              targetId: chk.id,
            });
          }
        }
      }
    }

    // 2. Search clinical templates
    for (const tpl of templates) {
      if (tpl.isDeleted) continue;
      if (
        tpl.title.toLowerCase().includes(q) ||
        tpl.description?.toLowerCase().includes(q) ||
        tpl.protocolNotes?.toLowerCase().includes(q) ||
        tpl.tags?.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'template',
          title: tpl.title,
          subtitle: `${tpl.category || 'General'} • Bundle with ${tpl.checklistIds?.length || 0} checklists`,
          badge: 'Template Bundle',
          targetId: tpl.id,
        });
      }
    }

    // 3. Search encounters
    for (const enc of encounters) {
      if (enc.isDeleted) continue;
      if (
        enc.patientIdentifier.toLowerCase().includes(q) ||
        enc.chiefComplaint?.toLowerCase().includes(q) ||
        enc.generalNotes?.toLowerCase().includes(q) ||
        enc.group?.toLowerCase().includes(q) ||
        enc.tags?.some((t) => t.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'encounter',
          title: enc.patientIdentifier,
          subtitle: `${enc.group ? `[${enc.group}] ` : ''}Complaint: ${
            enc.chiefComplaint || 'None'
          } ${enc.bedNumber ? `• Bed: ${enc.bedNumber}` : ''}`,
          badge: 'Patient',
          targetId: enc.id,
        });
      }

      // Search encounter items & notes
      for (const chk of enc.checklists || []) {
        for (const sec of chk.sections || []) {
          for (const itm of sec.items || []) {
            if (
              itm.text.toLowerCase().includes(q) ||
              itm.note?.toLowerCase().includes(q) ||
              itm.labValue?.toLowerCase().includes(q)
            ) {
              results.push({
                type: 'encounter',
                title: itm.text,
                subtitle: `${enc.patientIdentifier} > ${chk.title} ${
                  itm.note ? `• Note: "${itm.note}"` : ''
                }`,
                badge: itm.note?.toLowerCase().includes(q) ? 'Clinical Note' : 'Encounter Step',
                targetId: enc.id,
              });
            }
          }
        }
      }
    }
  }

  const handleSelect = (r: SearchResult) => {
    if (r.type === 'encounter') {
      onSelectEncounter(r.targetId);
    } else if (r.type === 'template') {
      onSelectTemplate(r.targetId);
    } else {
      onSelectChecklist(r.targetId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden transition-colors">
        {/* Search Input */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, ward, checklists, templates, patient notes..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Type to search across modular checklists, clinical template bundles, wards, and patient encounters.
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
              No results found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {results.slice(0, 15).map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-xs transition-all">
                      {r.badge.includes('Template') ? (
                        <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : r.badge === 'Patient' ? (
                        <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <CheckSquare className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {r.subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium border border-transparent dark:border-slate-700">
                      {r.badge}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
