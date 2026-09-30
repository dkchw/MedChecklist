import React, { useState, useMemo } from 'react';
import { PatientEncounter } from '../../types/patient';
import {
  AnonymizeOptions,
  DEFAULT_ANONYMIZE_OPTIONS,
  anonymizePatientEncounter,
  generateAnonymizedMarkdown,
} from '../../utils/anonymizer';
import {
  ShieldCheck,
  X,
  Copy,
  Check,
  Download,
  Eye,
  FileText,
  AlertTriangle,
  Lock,
  Share2,
} from 'lucide-react';

interface AnonymizeShareModalProps {
  encounter: PatientEncounter;
  onClose: () => void;
}

export const AnonymizeShareModal: React.FC<AnonymizeShareModalProps> = ({
  encounter,
  onClose,
}) => {
  const [options, setOptions] = useState<AnonymizeOptions>(DEFAULT_ANONYMIZE_OPTIONS);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<'preview' | 'json'>('preview');

  // Generate anonymized Markdown and encounter
  const anonymizedMarkdown = useMemo(() => {
    return generateAnonymizedMarkdown(encounter, options);
  }, [encounter, options]);

  const anonymizedEncounter = useMemo(() => {
    return anonymizePatientEncounter(encounter, options);
  }, [encounter, options]);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(anonymizedMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([anonymizedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${anonymizedEncounter.patientIdentifier}_anonymized_case.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(anonymizedEncounter, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${anonymizedEncounter.patientIdentifier}_anonymized_case.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden transition-colors"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Anonymize & Share Clinical Information</span>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  HIPAA De-identification
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Safe medical de-identification algorithm for grand rounds, educational case sharing, and peer consults
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split into Settings (Left) & Preview (Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Settings Panel */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 p-5 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-900/50 shrink-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>De-identification Rules</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Toggle rules to customize how Protected Health Information (PHI) is redacted.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Rule 1: Pseudonymize Identifier */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.pseudonymizeId}
                  onChange={(e) => setOptions({ ...options, pseudonymizeId: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Pseudonymize Patient ID
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Replaces &quot;{encounter.patientIdentifier}&quot; with &quot;{anonymizedEncounter.patientIdentifier}&quot;
                  </div>
                </div>
              </label>

              {/* Rule 2: Mask Bed & Ward */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.maskBedAndWard}
                  onChange={(e) => setOptions({ ...options, maskBedAndWard: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Redact Bed & Ward
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Removes exact bed numbers and generalizes ward department.
                  </div>
                </div>
              </label>

              {/* Rule 3: Mask Facility */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.maskFacility}
                  onChange={(e) => setOptions({ ...options, maskFacility: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Redact Facility / Hospital
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Removes specific clinic or hospital institution names.
                  </div>
                </div>
              </label>

              {/* Rule 4: Redact PHI in Notes */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.redactPhiInText}
                  onChange={(e) => setOptions({ ...options, redactPhiInText: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Redact PHI in Clinical Text
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Scans notes and complaints for dates, phone numbers, MRNs, and clinician names.
                  </div>
                </div>
              </label>

              {/* Rule 5: Age Bracket */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.ageBracketOnly}
                  onChange={(e) => setOptions({ ...options, ageBracketOnly: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    10-Year Age Bracketing
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Generalizes exact ages (e.g. 67 -&gt; 60-69, &gt;89 -&gt; 90+).
                  </div>
                </div>
              </label>

              {/* Rule 6: Filter Unredacted Photos */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeUnredactedImages}
                  onChange={(e) => setOptions({ ...options, removeUnredactedImages: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Filter Unverified Images
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Only includes photos verified or edited with #anonymized tag.
                  </div>
                </div>
              </label>

              {/* Rule 7: Remove Raw Ink */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeRawInk}
                  onChange={(e) => setOptions({ ...options, removeRawInk: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 border-slate-300 dark:border-slate-700 focus:ring-emerald-500 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Omit Raw Stylus Strokes
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Strips raw vector drawings and handwriting signatures.
                  </div>
                </div>
              </label>
            </div>

            {/* Compliance Badge */}
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Safe for Medical Collaboration</span>
              </div>
              <p>
                Generated records remove all 18 HIPAA Safe Harbor identifiers for secure medical case discussions.
              </p>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {/* Tab switch between Markdown and JSON */}
            <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850">
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setViewTab('preview')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    viewTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Markdown Case View</span>
                </button>

                <button
                  onClick={() => setViewTab('json')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                    viewTab === 'json'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span>JSON Payload</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                {anonymizedEncounter.patientIdentifier}
              </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-950/30 whitespace-pre-wrap select-text leading-relaxed">
              {viewTab === 'preview' ? anonymizedMarkdown : JSON.stringify(anonymizedEncounter, null, 2)}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-850">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-emerald-500" />
            <span>Ready for external clinical communication.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              title="Download anonymized JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
              title="Download anonymized Markdown file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center gap-1.5"
              title="Copy de-identified case summary to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Anonymized Markdown'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
