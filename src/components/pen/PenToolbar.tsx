import React from 'react';
import { Pen, Highlighter, Eraser, MousePointer, RotateCcw, RotateCw, Trash2, Check } from 'lucide-react';
import { PenTool, PRESET_PEN_COLORS, PRESET_STROKE_SIZES } from '../../types/ink';

interface PenToolbarProps {
  currentTool: PenTool;
  onSelectTool: (tool: PenTool) => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  currentSize: number;
  onSelectSize: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const PenToolbar: React.FC<PenToolbarProps> = ({
  currentTool,
  onSelectTool,
  currentColor,
  onSelectColor,
  currentSize,
  onSelectSize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onClose,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2.5 flex items-center gap-3 transition-all duration-200 flex-wrap justify-center">
      {/* Tool Selector */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <button
          onClick={() => onSelectTool('pen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentTool === 'pen'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Ballpoint / Fine Pen"
        >
          <Pen className="w-3.5 h-3.5" />
          <span>Pen</span>
        </button>

        <button
          onClick={() => onSelectTool('highlighter')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentTool === 'highlighter'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Fluorescent Highlighter"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>Highlighter</span>
        </button>

        <button
          onClick={() => onSelectTool('eraser')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentTool === 'eraser'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Stroke Eraser"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Eraser</span>
        </button>

        <button
          onClick={() => onSelectTool('selector')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentTool === 'selector'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Lasso / Selector Tool (Move & Reposition Strokes)"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span>Select & Move</span>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

      {/* Colors */}
      {currentTool !== 'eraser' && currentTool !== 'selector' && (
        <div className="flex items-center gap-1.5">
          {PRESET_PEN_COLORS.slice(0, currentTool === 'highlighter' ? 9 : 6).map((col) => (
            <button
              key={col.name}
              onClick={() => onSelectColor(col.value)}
              className="relative w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 transition-transform hover:scale-110 flex items-center justify-center"
              style={{ backgroundColor: col.value }}
              title={col.name}
            >
              {currentColor === col.value && (
                <Check
                  className={`w-3.5 h-3.5 ${
                    col.name === 'Clinical Black' ? 'text-white' : 'text-slate-900'
                  }`}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {currentTool !== 'selector' && (
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
      )}

      {/* Stroke Sizes */}
      {currentTool !== 'selector' && (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {PRESET_STROKE_SIZES.map((sz) => (
            <button
              key={sz.label}
              onClick={() => onSelectSize(sz.size)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                currentSize === sz.size
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {sz.label}
            </button>
          ))}
        </div>
      )}

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Undo, Redo, Clear */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Undo Stroke"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Redo Stroke"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={onClear}
          className="p-1.5 text-red-500 hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
          title="Clear Bedside Ink"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

      {/* Close/Done button */}
      <button
        onClick={onClose}
        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors shadow-sm"
      >
        <Check className="w-3.5 h-3.5" />
        <span>Done Inking</span>
      </button>
    </div>
  );
};
