import React, { useState } from 'react';
import { HelpCircle, X, BookOpen, AlertTriangle, ExternalLink, Save, Check } from 'lucide-react';

interface ClinicalRecallModalProps {
  title: string;
  subtitle?: string;
  category?: string;
  rationale?: string;
  normalRange?: string;
  isRedFlag?: boolean;
  personalNotes?: string;
  links?: { title: string; url: string }[];
  onSavePersonalNotes?: (notes: string) => void;
  onClose: () => void;
}

export const ClinicalRecallModal: React.FC<ClinicalRecallModalProps> = ({
  title,
  subtitle,
  category,
  rationale,
  normalRange,
  isRedFlag,
  personalNotes = '',
  links = [],
  onSavePersonalNotes,
  onClose,
}) => {
  const [notes, setNotes] = useState(personalNotes);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (onSavePersonalNotes) {
      onSavePersonalNotes(notes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Clinical Recall & Context
                </h3>
                {category && (
                  <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                    {category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-sm font-medium">
                {title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Item Text & Subtitle */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Clinical Item / Checklist
            </span>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
            {subtitle && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{subtitle}</p>
            )}
          </div>

          {/* Red Flag Warning */}
          {isRedFlag && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  Critical Red Flag Symptom
                </p>
                <p className="text-amber-800 dark:text-amber-300 text-[11px] mt-0.5">
                  Positive finding strongly indicates acute decompensation or high-risk pathology. Immediate physician review recommended.
                </p>
              </div>
            </div>
          )}

          {/* Normal Reference Range */}
          {normalRange && (
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 block mb-1">
                Normal Physiological Reference Range
              </span>
              <p className="font-mono font-semibold text-indigo-950 dark:text-indigo-200">
                {normalRange}
              </p>
            </div>
          )}

          {/* Clinical Rationale / Pearl */}
          {rationale && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold">
                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span>Diagnostic Background & Clinical Pearls:</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 leading-relaxed whitespace-pre-wrap">
                {rationale}
              </p>
            </div>
          )}

          {/* Doctor Personal Quick Recall Notes (Editable) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <span>Personal Bedside Recall Notes (Markdown)</span>
              </label>
              {onSavePersonalNotes && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                >
                  {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  <span>{saved ? 'Saved' : 'Save Note'}</span>
                </button>
              )}
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your personal bedside mnemonics, institutional dosage cutoffs, or clinical recall reminders..."
              className="w-full font-mono text-xs p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Reference Links */}
          {links && links.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Evidence Guidelines & Literature:
              </span>
              <div className="flex flex-wrap gap-2">
                {links.map((lnk, idx) => (
                  <a
                    key={idx}
                    href={lnk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors text-xs font-medium"
                  >
                    <span>{lnk.title}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Click 'Save Note' to persist your personal recall notes.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
