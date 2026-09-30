import React, { useState } from 'react';
import { ClinicalTemplate } from '../../types/template';
import { Checklist } from '../../types/checklist';
import {
  X,
  Layers,
  Building2,
  Copy,
  RotateCcw,
  Check,
  HelpCircle,
  Plus,
  BookOpen,
  FileText,
  Star,
} from 'lucide-react';
import { ClinicalRecallModal } from '../common/ClinicalRecallModal';

interface TemplateReaderModalProps {
  template: ClinicalTemplate;
  availableChecklists: Checklist[];
  onClose: () => void;
  onApplyTemplateToPatient?: (template: ClinicalTemplate) => void;
}

export const TemplateReaderModal: React.FC<TemplateReaderModalProps> = ({
  template,
  availableChecklists,
  onClose,
  onApplyTemplateToPatient,
}) => {
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
  } | null>(null);

  const bundledChecklists = template.checklistIds
    .map((cid) => availableChecklists.find((c) => c.id === cid))
    .filter((c): c is Checklist => !!c && !c.isDeleted);

  const allItems = bundledChecklists.flatMap((c) => c.sections.flatMap((s) => s.items));
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
    let md = `# Clinical Protocol: ${template.title}\n`;
    if (template.category) md += `> Department: ${template.category}\n`;
    if (template.institution) md += `> Institution: ${template.institution}\n`;
    if (template.description) md += `\n${template.description}\n\n`;

    if (template.protocolNotes) {
      md += `### Clinical Protocol Guidance Notes:\n${template.protocolNotes}\n\n`;
    }

    for (const chk of bundledChecklists) {
      md += `## Checklist: ${chk.title}\n`;
      for (const sec of chk.sections) {
        md += `### ${sec.title}\n`;
        for (const item of sec.items) {
          const isChecked = activeItems[item.id] ? 'x' : ' ';
          const star = item.starred ? ' ⭐' : '';
          const ref = item.referenceValue ? ` [Normal: ${item.referenceValue}]` : '';
          const note = item.note ? `\n  > Note: ${item.note}` : '';
          md += `- [${isChecked}] ${item.text}${star}${ref}${note}\n`;
        }
      }
      md += '\n';
    }

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh] transition-colors"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-850 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shadow-xs shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {template.title}
                </h2>
                {template.category && (
                  <span className="text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md">
                    {template.category}
                  </span>
                )}
                {/* Question Mark for Template Protocol Recall */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveRecall({
                      title: template.title,
                      subtitle: template.description,
                      category: template.category,
                      rationale: template.protocolNotes || 'Standard bundled clinical protocol directives.',
                    })
                  }
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  title="Clinical Recall: View Protocol Notes & Guidance"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {template.institution && (
                <div className="flex items-center gap-1 text-xs text-indigo-700 dark:text-indigo-400 font-medium mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{template.institution}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyMarkdown}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy Template Protocol as Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied MD' : 'Copy MD'}</span>
            </button>

            {/* Distinct divider separating close button */}
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Top Right Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Test Interactive Controls */}
        <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Bundle Interactive Test Run:
            </span>
            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300 rounded-full"
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

            {onApplyTemplateToPatient && (
              <button
                onClick={() => {
                  onApplyTemplateToPatient(template);
                  onClose();
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Apply to Bedside Pt</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body: Protocol Notes + Bundled Checklists */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Protocol Guidance Notes */}
          {template.protocolNotes && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Clinical Protocol Guidance & Directives:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-mono">
                {template.protocolNotes}
              </p>
            </div>
          )}

          {/* Bundled Checklists */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Bundled Modular Checklists ({bundledChecklists.length})
            </h3>

            {bundledChecklists.map((chk) => (
              <div
                key={chk.id}
                className="bg-slate-50/60 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {chk.title}
                    </h4>
                    {chk.category && (
                      <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                        {chk.category}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {chk.sections.reduce((acc, s) => acc + s.items.length, 0)} items
                  </span>
                </div>

                <div className="space-y-4">
                  {chk.sections.map((sec) => (
                    <div key={sec.id} className="space-y-2">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {sec.title}
                      </h5>

                      <div className="space-y-1.5">
                        {sec.items.map((item) => {
                          const isChecked = !!activeItems[item.id];
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleItem(item.id)}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                                isChecked
                                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleItem(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
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
                                  <Star className="w-3 h-3 text-amber-500 fill-current shrink-0" />
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {item.referenceValue && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    Normal: {item.referenceValue}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRecall({
                                      title: item.text,
                                      subtitle: `Checklist: ${chk.title} / ${sec.title}`,
                                      category: chk.category,
                                      rationale: item.note || `Bundled protocol item for ${template.title}`,
                                      normalRange: item.referenceValue,
                                      isRedFlag: item.starred,
                                    });
                                  }}
                                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 rounded-lg transition-colors"
                                  title="Clinical Recall"
                                >
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>Interactive reader mode for clinical protocol run-throughs.</span>
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
          onClose={() => setActiveRecall(null)}
        />
      )}
    </div>
  );
};
