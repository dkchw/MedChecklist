import React, { useState, useEffect } from 'react';
import { X, Sparkles, Trash2, Check, Copy, Clock, PenTool } from 'lucide-react';
import { PendingInkItem, getPendingInkItems, removePendingInkItem } from '../../utils/pendingInk';
import { HandwritingOcrService } from '../../utils/handwritingOcr';

interface PendingInkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyText?: (text: string) => void;
}

export const PendingInkModal: React.FC<PendingInkModalProps> = ({ isOpen, onClose, onApplyText }) => {
  const [items, setItems] = useState<PendingInkItem[]>([]);
  const [transcribedTexts, setTranscribedTexts] = useState<Record<string, string>>({});
  const [isTranscribing, setIsTranscribing] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadItems = async () => {
    const list = await getPendingInkItems();
    setItems(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTranscribe = async (item: PendingInkItem) => {
    setIsTranscribing((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await HandwritingOcrService.recognizeStrokes(item.strokes);
      const text = res.text.trim();
      setTranscribedTexts((prev) => ({ ...prev, [item.id]: text || '(No legible text recognized)' }));
    } catch (e) {
      console.error('OCR failed:', e);
      setTranscribedTexts((prev) => ({ ...prev, [item.id]: '(Recognition failed)' }));
    } finally {
      setIsTranscribing((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleTranscribeAll = async () => {
    for (const item of items) {
      if (!transcribedTexts[item.id]) {
        await handleTranscribe(item);
      }
    }
  };

  const handleDelete = async (id: string) => {
    await removePendingInkItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-850 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Saved Handwriting Queue</span>
                <span className="text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fast bedside rounds ink notes waiting for OCR conversion into clinical text.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleTranscribeAll}
                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                Transcribe All
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of Pending Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center">
              <PenTool className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">Queue is empty</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                When using the handwriting scratchpad, tap "Save Ink" to store handwriting directly without OCR and transcribe it here anytime.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const text = transcribedTexts[item.id];
              const loading = isTranscribing[item.id];

              return (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Field: {item.fieldLabel}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Strokes preview stats */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>{item.strokes.length} raw ink strokes</span>
                  </div>

                  {/* Transcribed text result */}
                  {text && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-pre-wrap select-text">
                      {text}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTranscribe(item)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{loading ? 'Transcribing...' : text ? 'Re-OCR' : 'Convert to Text'}</span>
                      </button>

                      {text && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.id, text)}
                            className="px-2.5 py-1.5 bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                          </button>

                          {onApplyText && (
                            <button
                              type="button"
                              onClick={() => {
                                onApplyText(text);
                                handleDelete(item.id);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Apply to Note</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Delete from Queue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
