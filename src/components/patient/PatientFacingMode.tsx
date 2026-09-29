import React, { useState, useEffect } from 'react';
import { PatientEncounter, EncounterChecklistInstance } from '../../types/patient';
import { ChecklistTemplate } from '../../types/checklist';
import { InkStroke, PenTool } from '../../types/ink';
import { PenCanvas } from '../pen/PenCanvas';
import { PenToolbar } from '../pen/PenToolbar';
import {
  PenTool as PenToolIcon,
  CheckSquare,
  Sparkles,
  ArrowLeft,
  Plus,
  Star,
  FileText,
  Sliders,
  Check,
  Edit3,
  Building2,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PatientFacingModeProps {
  encounter: PatientEncounter;
  onUpdateEncounter: (updated: PatientEncounter) => void;
  onExit: () => void;
  onOpenLlmModal: () => void;
  onOpenTemplateEditor: (templateId: string) => void;
}

export const PatientFacingMode: React.FC<PatientFacingModeProps> = ({
  encounter,
  onUpdateEncounter,
  onExit,
  onOpenLlmModal,
  onOpenTemplateEditor,
}) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [isPenMode, setIsPenMode] = useState<boolean>(true);
  const [currentTool, setCurrentTool] = useState<PenTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>(isDark ? '#f8fafc' : '#0f172a');
  const [currentSize, setCurrentSize] = useState<number>(3);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);
  const [quickItemText, setQuickItemText] = useState('');
  const [showAddQuickItem, setShowAddQuickItem] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  // Sync pen color when theme changes
  useEffect(() => {
    if (isDark && currentColor === '#0f172a') {
      setCurrentColor('#f8fafc');
    } else if (!isDark && currentColor === '#f8fafc') {
      setCurrentColor('#0f172a');
    }
  }, [isDark]);

  const strokes = encounter.inkStrokes || [];

  const handleUpdateStrokes = (newStrokes: InkStroke[]) => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: newStrokes,
      updatedAt: Date.now(),
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack((r) => [...r, strokes]);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: prev,
      updatedAt: Date.now(),
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack((u) => [...u, strokes]);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: next,
      updatedAt: Date.now(),
    });
  };

  const handleClearStrokes = () => {
    if (strokes.length === 0) return;
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: [],
      updatedAt: Date.now(),
    });
  };

  // Toggle item checked
  const handleToggleItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    const updated = JSON.parse(JSON.stringify(encounter)) as PatientEncounter;
    const item = updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx];
    item.checked = !item.checked;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);

    if (item.checked && item.starred) {
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.8 },
      });
    }
  };

  // Quick add missing symptom on the fly
  const handleAddQuickItem = () => {
    if (!quickItemText.trim() || encounter.checklists.length === 0) return;
    const updated = JSON.parse(JSON.stringify(encounter)) as PatientEncounter;
    updated.checklists[0].sections[0].items.push({
      id: 'quick-' + Date.now(),
      text: quickItemText.trim(),
      checked: true,
    });
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
    setQuickItemText('');
    setShowAddQuickItem(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative select-none transition-colors">
      {/* Top Clinical Bedside Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Bedside</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Patient Details */}
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{encounter.patientIdentifier}</span>
              {encounter.bedNumber && (
                <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                  Bed {encounter.bedNumber}
                </span>
              )}
            </div>
            {encounter.chiefComplaint && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                Complaint: {encounter.chiefComplaint}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher: Pen vs Touch */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setIsPenMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPenMode
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenToolIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Pen Mode</span>
            </button>
            <button
              onClick={() => setIsPenMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isPenMode
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Interactive</span>
            </button>
          </div>

          {/* Quick Add Missing Symptom */}
          <button
            onClick={() => setShowAddQuickItem(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            title="Write down missing symptom on the fly"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Symptom</span>
          </button>

          {/* Copy/Paste for LLM */}
          <button
            onClick={onOpenLlmModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-semibold transition-colors border border-indigo-200 dark:border-indigo-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>LLM Sync</span>
          </button>
        </div>
      </header>

      {/* Quick Add Missing Symptom Bar */}
      {showAddQuickItem && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 p-3 px-6 flex items-center gap-3">
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            Write or Add Missing Symptom at Bedside:
          </span>
          <input
            type="text"
            value={quickItemText}
            onChange={(e) => setQuickItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddQuickItem();
            }}
            placeholder="e.g. Diaphoresis onset 20 min ago, Left calf tender..."
            autoFocus
            className="flex-1 text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            onClick={handleAddQuickItem}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
          >
            Add to Checklist
          </button>
          <button
            onClick={() => setShowAddQuickItem(false)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Bedside Body with Stylus Canvas Layer */}
      <div className="flex-1 relative overflow-y-auto p-4 sm:p-8 max-w-5xl mx-auto w-full">
        {/* Stylus Inking Overlay (Active in Pen Mode) */}
        {isPenMode && (
          <PenCanvas
            strokes={strokes}
            onChangeStrokes={handleUpdateStrokes}
            tool={currentTool}
            color={currentColor}
            size={currentSize}
          />
        )}

        {/* Paper-Like Symptom Review Checklist Layout */}
        <div className="space-y-8 pb-32">
          {encounter.checklists.map((chk, chkIdx) => (
            <div key={chk.id} className="space-y-4">
              {/* Checklist / Protocol Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-200 pb-2">
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {chk.title}
                  </h2>
                  {chk.institution && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>{chk.institution}</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => onOpenTemplateEditor(chk.templateId)}
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit Template & Reference Values"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Edit Lab Ranges</span>
                </button>
              </div>

              {/* Sections & Symptom Rows */}
              <div className="space-y-6">
                {chk.sections.map((sec, secIdx) => (
                  <div key={sec.id} className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
                      {sec.title}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sec.items.map((item, itmIdx) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleItem(chkIdx, secIdx, itmIdx)}
                          className={`relative p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                            item.checked
                              ? 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {/* Large touch/pen-friendly checkbox */}
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                              item.checked
                                ? 'bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-xs font-medium leading-snug ${
                                  item.checked ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {item.text}
                              </span>
                              {item.starred && (
                                <Star className="w-3 h-3 text-amber-500 fill-current shrink-0" />
                              )}
                            </div>

                            {/* Reference value / Patient lab value */}
                            {(item.referenceValue || item.labValue) && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                {item.labValue && (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    Value: {item.labValue}
                                  </span>
                                )}
                                {item.referenceValue && (
                                  <span className="text-slate-400 dark:text-slate-500">
                                    [Ref: {item.referenceValue}]
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Item Clinical Note */}
                            {item.note && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded border border-slate-200/60 dark:border-slate-700 mt-1.5">
                                💬 {item.note}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Bedside & Handwritten Notes Section (Editable Markdown) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Bedside & Handwritten Notes (Editable Markdown)
                </h3>
              </div>
              <button
                onClick={() => setEditingNotes(!editingNotes)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editingNotes ? 'Done' : 'Edit with Keyboard'}</span>
              </button>
            </div>

            {editingNotes ? (
              <textarea
                rows={5}
                value={encounter.generalNotes || ''}
                onChange={(e) =>
                  onUpdateEncounter({
                    ...encounter,
                    generalNotes: e.target.value,
                    updatedAt: Date.now(),
                  })
                }
                placeholder="Write bedside observations, ECG readings, or treatment plans here in Markdown...&#10;- Vital signs stable&#10;- Repeat troponin in 2h"
                className="w-full text-xs font-mono p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            ) : (
              <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono bg-slate-50 dark:bg-slate-950 p-3 rounded-xl min-h-[60px] border border-slate-200/60 dark:border-slate-800">
                {encounter.generalNotes || (
                  <span className="text-slate-400 italic">
                    No keyboard notes yet. Tap 'Edit with Keyboard' or write anywhere on the screen with your stylus.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Stylus Toolbar (when in Pen Mode) */}
      {isPenMode && (
        <PenToolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          currentColor={currentColor}
          onSelectColor={setCurrentColor}
          currentSize={currentSize}
          onSelectSize={setCurrentSize}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClearStrokes}
          onClose={() => setIsPenMode(false)}
        />
      )}
    </div>
  );
};
