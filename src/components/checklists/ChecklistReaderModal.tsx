import React, { useState } from 'react';
import { Checklist, ChecklistItem } from '../../types/checklist';
import {
  X,
  CheckSquare,
  Star,
  Building2,
  Copy,
  RotateCcw,
  Check,
  HelpCircle,
  Plus,
  BookOpen,
} from 'lucide-react';
import { ClinicalRecallModal } from '../common/ClinicalRecallModal';

interface ChecklistReaderModalProps {
  checklist: Checklist;
  onClose: () => void;
  onInstantiateInEncounter?: (checklist: Checklist) => void;
  onUpdateChecklist?: (updated: Checklist) => void;
}

export const ChecklistReaderModal: React.FC<ChecklistReaderModalProps> = ({
  checklist,
  onClose,
  onInstantiateInEncounter,
  onUpdateChecklist,
}) => {
  // Local state for interactive checking without modifying database
  const [activeItems, setActiveItems] = useState<{ [itemId: string]: boolean }>({});
  const [copied, setCopied] = useState(false);
  const [activeRecall, setActiveRecall] = useState<{
    title: string;
    subtitle?: string;
    category?: string;
    rationale?: string;
    normalRange?: string;
    isRedFlag?: boolean;
    personalNotes?: string;
    itemId?: string;
  } | null>(null);

  const allItems = checklist.sections.flatMap((s) => s.items);
  const totalCount = allItems.length;
  const checkedCount = allItems.filter((i) => activeItems[i.id]).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const handleToggleItem = (itemId: string) => {
    setActiveItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleReset = () => {
    setActiveItems({});
  };

  const handleCopyMarkdown = async () => {
    let md = `# ${checklist.title}\n`;
    if (checklist.category) md += `> Specialty: ${checklist.category}\n`;
    if (checklist.institution) md += `> Institution: ${checklist.institution}\n`;
    if (checklist.description) md += `\n${checklist.description}\n\n`;

    for (const sec of checklist.sections) {
      md += `### ${sec.title}\n`;
      for (const item of sec.items) {
        const isChecked = activeItems[item.id] ? 'x' : ' ';
        const star = item.starred ? ' ⭐' : '';
        const ref = item.referenceValue ? ` [Normal: ${item.referenceValue}]` : '';
        const note = item.note ? `\n  > Note: ${item.note}` : '';
        md += `- [${isChecked}] ${item.text}${star}${ref}${note}\n`;
      }
      md += '\n';
    }

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSaveItemRecall = (notes: string) => {
    if (!onUpdateChecklist || !activeRecall?.itemId) return;
    const updated = JSON.parse(JSON.stringify(checklist)) as Checklist;
    for (const sec of updated.sections) {
      for (const itm of sec.items) {
        if (itm.id === activeRecall.itemId) {
          itm.note = notes;
        }
      }
    }
    onUpdateChecklist(updated);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {checklist.title}
                </h2>
                {checklist.category && (
                  <span className="text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md">
                    {checklist.category}
                  </span>
                )}
                {/* Question Mark for Checklist Overview Recall */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveRecall({
                      title: checklist.title,
                      subtitle: checklist.description,
                      category: checklist.category,
                      rationale: `Clinical Guideline & Protocol Overview: ${checklist.description || 'Standard institutional bedside checklist.'}`,
                      isRedFlag: false,
                    })
                  }
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  title="Clinical Recall: View Guideline & Notes"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {checklist.institution && (
                <div className="flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{checklist.institution}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Copy Checklist as GitHub Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied MD' : 'Copy MD'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Test Interactive Controls */}
        <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Interactive Test Run:
            </span>
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {checkedCount}/{totalCount} ({progressPercent}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {checkedCount > 0 && (
              <button
                onClick={handleReset}
                className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}

            {onInstantiateInEncounter && (
              <button
                onClick={() => {
                  onInstantiateInEncounter(checklist);
                  onClose();
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Bedside Pt</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body: Sections and Items */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {checklist.description && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              {checklist.description}
            </div>
          )}

          {checklist.sections.map((section) => (
            <div
              key={section.id}
              className="space-y-3 bg-slate-50/50 dark:bg-slate-850/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {section.title}
                </h3>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {section.items.filter((i) => activeItems[i.id]).length}/{section.items.length} Checked
                </span>
              </div>

              <div className="space-y-2">
                {section.items.map((item) => {
                  const isChecked = !!activeItems[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleItem(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span
                            className={`text-xs font-semibold truncate ${
                              isChecked
                                ? 'text-slate-950 dark:text-white line-through opacity-85'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.text}
                          </span>
                          {item.starred && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-current shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.referenceValue && (
                            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Normal: {item.referenceValue}
                            </span>
                          )}

                          {/* Item-level Question Mark Clinical Recall Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRecall({
                                title: item.text,
                                subtitle: `Section: ${section.title}`,
                                category: checklist.category,
                                rationale: item.note || `Clinical assessment criterion for ${checklist.title}.`,
                                normalRange: item.referenceValue,
                                isRedFlag: item.starred,
                                personalNotes: item.note || '',
                                itemId: item.id,
                              });
                            }}
                            className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Clinical Recall: View Notes & Criteria"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Display Clinical Notes if Present */}
                      {item.note && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 pl-7 leading-relaxed font-medium">
                          &gt; {item.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Interactive reader mode does not alter patient encounters.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close Reader
          </button>
        </div>
      </div>

      {/* Clinical Recall Popover */}
      {activeRecall && (
        <ClinicalRecallModal
          title={activeRecall.title}
          subtitle={activeRecall.subtitle}
          category={activeRecall.category}
          rationale={activeRecall.rationale}
          normalRange={activeRecall.normalRange}
          isRedFlag={activeRecall.isRedFlag}
          personalNotes={activeRecall.personalNotes}
          onSavePersonalNotes={handleSaveItemRecall}
          onClose={() => setActiveRecall(null)}
        />
      )}
    </div>
  );
};
