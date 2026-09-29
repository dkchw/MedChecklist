import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckSquare, Stethoscope, Tag, ArrowRight, X } from 'lucide-react';
import { ChecklistTemplate } from '../../types/checklist';
import { PatientEncounter } from '../../types/patient';

interface SearchResult {
  type: 'template' | 'encounter' | 'item' | 'note';
  title: string;
  subtitle: string;
  badge: string;
  targetId: string;
  targetSection?: string;
}

interface SearchModalProps {
  templates: ChecklistTemplate[];
  encounters: PatientEncounter[];
  onSelectTemplate: (templateId: string) => void;
  onSelectEncounter: (encounterId: string) => void;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  templates,
  encounters,
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
    // Search templates
    for (const tpl of templates) {
      if (tpl.isDeleted) continue;
      if (
        tpl.title.toLowerCase().includes(q) ||
        tpl.description?.toLowerCase().includes(q) ||
        tpl.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'template',
          title: tpl.title,
          subtitle: `${tpl.category || 'General'} • ${tpl.tags.join(', ')}`,
          badge: 'Template',
          targetId: tpl.id,
        });
      }

      // Search template items
      for (const sec of tpl.sections) {
        for (const itm of sec.items) {
          if (itm.text.toLowerCase().includes(q) || itm.referenceValue?.toLowerCase().includes(q)) {
            results.push({
              type: 'item',
              title: itm.text,
              subtitle: `In ${tpl.title} > ${sec.title} ${itm.referenceValue ? `[${itm.referenceValue}]` : ''}`,
              badge: 'Item',
              targetId: tpl.id,
            });
          }
        }
      }
    }

    // Search encounters
    for (const enc of encounters) {
      if (enc.isDeleted) continue;
      if (
        enc.patientIdentifier.toLowerCase().includes(q) ||
        enc.chiefComplaint?.toLowerCase().includes(q) ||
        enc.generalNotes?.toLowerCase().includes(q) ||
        enc.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push({
          type: 'encounter',
          title: enc.patientIdentifier,
          subtitle: `Complaint: ${enc.chiefComplaint || 'None'} ${enc.bedNumber ? `• Bed: ${enc.bedNumber}` : ''}`,
          badge: 'Encounter',
          targetId: enc.id,
        });
      }

      // Search encounter items & notes
      for (const chk of enc.checklists) {
        for (const sec of chk.sections) {
          for (const itm of sec.items) {
            if (
              itm.text.toLowerCase().includes(q) ||
              itm.note?.toLowerCase().includes(q) ||
              itm.labValue?.toLowerCase().includes(q)
            ) {
              results.push({
                type: itm.note?.toLowerCase().includes(q) ? 'note' : 'item',
                title: itm.text,
                subtitle: `${enc.patientIdentifier} > ${chk.title} ${itm.note ? `• Note: "${itm.note}"` : ''}`,
                badge: itm.note?.toLowerCase().includes(q) ? 'Note' : 'Finding',
                targetId: enc.id,
              });
            }
          }
        }
      }
    }
  }

  const handleSelect = (r: SearchResult) => {
    if (r.type === 'encounter' || r.type === 'note') {
      onSelectEncounter(r.targetId);
    } else {
      onSelectTemplate(r.targetId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
        {/* Search Input */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, lab bounds, patient notes, #tags..."
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Type to search across medical checklists, symptoms, hospital reference ranges, and patient notes.
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No results found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {results.slice(0, 15).map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(r)}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-white group-hover:shadow-xs transition-all">
                      {r.badge === 'Template' ? (
                        <FileText className="w-4 h-4 text-indigo-600" />
                      ) : r.badge === 'Encounter' ? (
                        <Stethoscope className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <CheckSquare className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {r.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{r.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-medium">
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
