import React from 'react';
import { Pen, Highlighter, Eraser, RotateCcw, RotateCw, Trash2, Check, X } from 'lucide-react';
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-2xl p-2.5 flex items-center gap-3 transition-all duration-200">
      {/* Tool Selector */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => onSelectTool('pen')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            currentTool === 'pen'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
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
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
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
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Stroke Eraser"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Eraser</span>
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* Colors */}
      {currentTool !== 'eraser' && (
        <div className="flex items-center gap-1.5">
          {PRESET_PEN_COLORS.slice(0, currentTool === 'highlighter' ? 8 : 5).map((col) => (
            <button
              key={col.name}
              onClick={() => onSelectColor(col.value)}
              className="relative w-6 h-6 rounded-full border border-slate-300 transition-transform hover:scale-110 flex items-center justify-center"
              style={{ backgroundColor: col.value }}
              title={col.name}
            >
              {currentColor === col.value && (
                <Check className={`w-3.5 h-3.5 ${col.name === 'Clinical Black' ? 'text-white' : 'text-slate-900'}`} />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="h-6 w-px bg-slate-200" />

      {/* Stroke Sizes */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        {PRESET_STROKE_SIZES.map((sz) => (
          <button
            key={sz.label}
            onClick={() => onSelectSize(sz.size)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              currentSize === sz.size
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {sz.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* Undo, Redo, Clear */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-slate-100"
          title="Undo Stroke"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded-lg hover:bg-slate-100"
          title="Redo Stroke"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={onClear}
          className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
          title="Clear Bedside Ink"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      {/* Close/Done button */}
      <button
        onClick={onClose}
        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors shadow-sm"
      >
        <Check className="w-3.5 h-3.5" />
        <span>Done Inking</span>
      </button>
    </div>
  );
};
