import React, { useState, useEffect } from 'react';
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
  Save,
  Clock,
  FileText,
  BookmarkCheck,
  Sparkles,
  ChevronRight,
  Folder,
} from 'lucide-react';
import { ClinicalRecallModal } from '../common/ClinicalRecallModal';
import { db } from '../../db/db';
import { ChecklistRunSession } from '../../types/knowledge';

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
  // Interactive test run state (does NOT alter master checklist definition)
  const [activeItems, setActiveItems] = useState<{ [itemId: string]: boolean }>({});
  const [lessonNotes, setLessonNotes] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState<string>(
    `${checklist.title} - Study Session (${new Date().toLocaleDateString()})`
  );
  const [savedRuns, setSavedRuns] = useState<ChecklistRunSession[]>([]);
  const [activeTab, setActiveTab] = useState<'run' | 'history'>('run');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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

  // Load past study sessions for this checklist
  const loadSavedRuns = async () => {
    try {
      const runs = await db.checklistRuns
        .filter((r) => r.checklistId === checklist.id && !r.isDeleted)
        .reverse()
        .sortBy('createdAt');
      setSavedRuns(runs);
    } catch (e) {
      console.error('Error loading saved checklist runs:', e);
    }
  };

  useEffect(() => {
    loadSavedRuns();
  }, [checklist.id]);

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
    setLessonNotes('');
  };

  // Save current study session to database
  const handleSaveStudyRun = async () => {
    const checkedItemIds = Object.keys(activeItems).filter((k) => activeItems[k]);
    const newSession: ChecklistRunSession = {
      id: 'run-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      checklistId: checklist.id,
      title: sessionTitle.trim() || `${checklist.title} - Study Session`,
      sessionNotes: lessonNotes.trim(),
      checkedItemIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await db.checklistRuns.put(newSession);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await loadSavedRuns();
    } catch (err) {
      console.error('Failed to save study run:', err);
    }
  };

  const handleLoadPastRun = (run: ChecklistRunSession) => {
    const map: { [id: string]: boolean } = {};
    for (const id of run.checkedItemIds) {
      map[id] = true;
    }
    setActiveItems(map);
    setLessonNotes(run.sessionNotes || '');
    setSessionTitle(run.title || `${checklist.title} - Study Session`);
    setActiveTab('run');
  };

  const handleCopyMarkdown = async () => {
    let md = `# ${checklist.title}\n`;
    if (checklist.category) md += `> Category: ${checklist.category}\n`;
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

    if (lessonNotes.trim()) {
      md += `### Study & Lesson Notes\n${lessonNotes}\n`;
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
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[92vh] transition-colors"
      >
        {/* Top Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-850 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xs shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {checklist.title}
                </h2>
                {checklist.category && (
                  <span className="text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700">
                    {checklist.category}
                  </span>
                )}
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
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                  title="Clinical Protocol Overview"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {checklist.institution && (
                <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{checklist.institution}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar + Dedicated Top Right Close Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Switcher: Interactive Run vs Saved History */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('run')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'run'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Study
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Runs ({savedRuns.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy Checklist as GitHub Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy MD'}</span>
            </button>

            {/* Distinct divider separating close button */}
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Interactive Run View */}
        {activeTab === 'run' ? (
          <>
            {/* Progress Bar & Test Controls */}
            <div className="px-5 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">
                  Practice Progress:
                </span>
                <div className="flex-1 h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                  {checkedCount}/{totalCount} ({progressPercent}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {checkedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                {/* Save Practice Run with Notes Button */}
                <button
                  type="button"
                  onClick={handleSaveStudyRun}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                  title="Save this practice run and lesson notes"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Study Run</span>
                    </>
                  )}
                </button>

                {onInstantiateInEncounter && (
                  <button
                    type="button"
                    onClick={() => {
                      onInstantiateInEncounter(checklist);
                      onClose();
                    }}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Apply to Patient</span>
                  </button>
                )}
              </div>
            </div>

            {/* Checklist Content Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {checklist.description && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {checklist.description}
                </div>
              )}

              {/* Sections & Items */}
              {checklist.sections.map((section) => (
                <div
                  key={section.id}
                  className="space-y-3 bg-slate-50/60 dark:bg-slate-850/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {section.title}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {section.items.filter((i) => activeItems[i.id]).length}/{section.items.length} Checked
                    </span>
                  </div>

                  <div className="space-y-2">
                    {section.items.map((item) => {
                      const isChecked = !!activeItems[item.id];
                      return (
                        <div
                          key={item.id}
                          data-checklist-item="true"
                          onClick={() => handleToggleItem(item.id)}
                          className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
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
                                className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isChecked
                                    ? 'text-slate-900 dark:text-slate-100 line-through opacity-80'
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
                                className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                title="Clinical Recall & Guideline Details"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

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

              {/* Lesson & Study Notes Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Lesson & Study Notes (Saved with this Practice Run)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Preserved in Knowledge History</span>
                </div>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Session title (e.g. Ward Rounds Lesson 3, Sepsis Study)"
                  className="w-full text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
                <textarea
                  value={lessonNotes}
                  onChange={(e) => setLessonNotes(e.target.value)}
                  rows={3}
                  placeholder="Take notes during teaching rounds or lecture (e.g. Dr. House emphasized checking lactate clearance within 2-4 hours, repeat ECG if symptoms persist...)"
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </>
        ) : (
          /* Tab 2: Saved Study Runs History View */
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Saved Study Sessions & Practice Runs
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Previous practice sessions, test scores, and lesson notes recorded for this checklist.
                </p>
              </div>
            </div>

            {savedRuns.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <BookmarkCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No saved practice runs yet.
                </p>
                <p className="text-[11px] text-slate-500">
                  Tick items and click "Save Study Run" in the Interactive Study tab to save your first session.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedRuns.map((run) => (
                  <div
                    key={run.id}
                    className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2 hover:border-indigo-400 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {run.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(run.createdAt).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {run.checkedItemIds.length}/{totalCount} Completed (
                            {totalCount > 0
                              ? Math.round((run.checkedItemIds.length / totalCount) * 100)
                              : 0}
                            %)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadPastRun(run)}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl font-semibold text-xs flex items-center gap-1 border border-indigo-200 dark:border-indigo-800 transition-colors"
                      >
                        <span>Resume Run</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {run.sessionNotes && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap">
                        {run.sessionNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <BookOpen className="w-4 h-4 text-emerald-500" />
            <span>Interactive reader does not overwrite master protocol definition.</span>
          </div>
          <button
            type="button"
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
