import React, { useState } from 'react';
import { Copy, Check, Sparkles, ArrowRight, FileText, AlertCircle, Plus, X } from 'lucide-react';
import { buildLlmPrompt, parseMarkdownToChecklist, encounterToMarkdown, templateToMarkdown } from '../../utils/markdownEngine';
import { PatientEncounter } from '../../types/patient';
import { ChecklistTemplate, ChecklistSection } from '../../types/checklist';

interface LlmModalProps {
  encounter?: PatientEncounter;
  template?: ChecklistTemplate;
  onClose: () => void;
  onApplyMarkdown: (parsedData: {
    sections: ChecklistSection[];
    generalNotes?: string;
  }) => void;
}

export const LlmModal: React.FC<LlmModalProps> = ({
  encounter,
  template,
  onClose,
  onApplyMarkdown,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [promptMode, setPromptMode] = useState<'differential' | 'soap' | 'checklist_expansion' | 'custom'>('differential');
  const [customPrompt, setCustomPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [previewData, setPreviewData] = useState<ReturnType<typeof parseMarkdownToChecklist> | null>(null);

  // Source markdown
  const sourceMarkdown = encounter
    ? encounterToMarkdown(encounter)
    : template
    ? templateToMarkdown(template)
    : '';

  const fullPrompt = buildLlmPrompt(sourceMarkdown, promptMode, customPrompt);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleInputChange = (text: string) => {
    setPasteInput(text);
    if (text.trim()) {
      try {
        const parsed = parseMarkdownToChecklist(text);
        setPreviewData(parsed);
      } catch (e) {
        setPreviewData(null);
      }
    } else {
      setPreviewData(null);
    }
  };

  const handleApply = () => {
    if (!previewData) return;
    onApplyMarkdown({
      sections: previewData.sections,
      generalNotes: previewData.generalNotes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">LLM Chatbox Interoperability</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Format-first Markdown exchange with ChatGPT, Claude, DeepSeek
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-white dark:bg-slate-900 transition-colors">
          <button
            onClick={() => setTab('export')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'export'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>1. Copy Formatted Prompt for LLM</span>
          </button>
          <button
            onClick={() => setTab('import')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'import'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Paste & Import Output from Chatbox</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'export' ? (
            <div className="space-y-4">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-3 text-xs text-indigo-900 dark:text-indigo-200">
                <span className="font-semibold">Format-First Architecture: </span>
                This prompt begins with strict MedChecklist Markdown formatting instructions. When the AI responds, it produces standard GFM task lists and metadata that this software will import back seamlessly.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Clinical Objective:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPromptMode('differential')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      promptMode === 'differential'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-1 ring-indigo-600 dark:ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Differential Diagnosis & Workup</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Analyze positive symptoms & suggest missing tests</div>
                  </button>

                  <button
                    onClick={() => setPromptMode('soap')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      promptMode === 'soap'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-1 ring-indigo-600 dark:ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Clinical SOAP Synthesis</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Format into Subjective, Objective, Assessment, Plan</div>
                  </button>

                  <button
                    onClick={() => setPromptMode('checklist_expansion')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      promptMode === 'checklist_expansion'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-1 ring-indigo-600 dark:ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Protocol & Checklist Expansion</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Add comprehensive guidelines & missing criteria</div>
                  </button>

                  <button
                    onClick={() => setPromptMode('custom')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      promptMode === 'custom'
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/40 ring-1 ring-indigo-600 dark:ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Custom Clinical Prompt</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Write your own instructions for the LLM</div>
                  </button>
                </div>
              </div>

              {promptMode === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Custom Instruction:
                  </label>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Compare patient's current lab values with target ICU guidelines..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Prompt Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Generated Prompt Preview:
                  </label>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Ready to paste into ChatGPT / Claude</span>
                </div>
                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-all border border-slate-800">
                    {fullPrompt}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-600 dark:text-slate-300">
                Paste the markdown response from your LLM chatbox below. The software will automatically extract sections, positive findings (<code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">- [x]</code>), pending items (<code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">- [ ]</code>), notes, and lab references.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Paste Chatbox Output (Markdown):
                </label>
                <textarea
                  rows={6}
                  value={pasteInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Paste markdown output here... (e.g. ## Cardiovascular&#10;- [x] Chest pain&#10;  > Note: Sublingual nitro given&#10;- [ ] Repeat Troponin in 2h)"
                  className="w-full font-mono text-xs p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {previewData && (
                <div className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Recognized: {previewData.sections.reduce((acc, s) => acc + s.items.length, 0)} Items across {previewData.sections.length} Sections
                    </span>
                    {previewData.generalNotes && (
                      <span className="text-[11px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        Bedside Notes Detected
                      </span>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 text-xs">
                    {previewData.sections.map((sec, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{sec.title}</div>
                        <div className="pl-3 space-y-0.5">
                          {sec.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                                item.checked ? 'bg-indigo-600 text-white font-bold' : 'border border-slate-300 dark:border-slate-600'
                              }`}>
                                {item.checked ? '✓' : ''}
                              </span>
                              <span className={item.checked ? 'font-medium' : ''}>{item.text}</span>
                              {item.starred && <span className="text-amber-500 text-[10px]">★</span>}
                              {item.referenceValue && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">[{item.referenceValue}]</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tab === 'export' ? 'Format-first clinical prompt' : 'Parse standard Markdown checklist'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            {tab === 'export' ? (
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt for LLM'}</span>
              </button>
            ) : (
              <button
                onClick={handleApply}
                disabled={!previewData || previewData.sections.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Import Findings into Checklist</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
