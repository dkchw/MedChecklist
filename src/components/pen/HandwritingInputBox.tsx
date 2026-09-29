import React, { useRef, useState, useEffect } from 'react';
import getStroke from 'perfect-freehand';
import { HandwritingOcrService, OcrResult } from '../../utils/handwritingOcr';
import { InkStroke, StrokePoint } from '../../types/ink';
import { Pen, Check, RotateCcw, X, Sparkles, Keyboard } from 'lucide-react';

interface HandwritingInputBoxProps {
  label?: string;
  value: string;
  placeholder?: string;
  isNumericOnly?: boolean;
  onAccept: (recognizedValue: string) => void;
  onClose: () => void;
}

export const HandwritingInputBox: React.FC<HandwritingInputBoxProps> = ({
  label,
  value,
  placeholder,
  isNumericOnly,
  onAccept,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[] | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Resize canvas to parent container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    renderCanvas();
  }, []);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw guideline baseline
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const h = canvas.height / window.devicePixelRatio;
    ctx.moveTo(10, h * 0.75);
    ctx.lineTo(canvas.width / window.devicePixelRatio - 10, h * 0.75);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw saved strokes
    for (const stroke of strokes) {
      drawStroke(ctx, stroke.points, stroke.color, stroke.size);
    }

    // Draw currently active stroke
    if (currentStroke && currentStroke.length > 0) {
      drawStroke(ctx, currentStroke, '#0f172a', 4);
    }
  };

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    color: string,
    size: number
  ) => {
    if (points.length === 0) return;
    const outlinePoints = getStroke(points, {
      size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    if (outlinePoints.length === 0) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1]);
    for (let i = 1; i < outlinePoints.length; i++) {
      ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    setCurrentStroke([{ x, y, pressure }]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    const updated = [...currentStroke, { x, y, pressure }];
    setCurrentStroke(updated);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke) return;
    const newStroke: InkStroke = {
      id: 'stroke-' + Date.now(),
      points: currentStroke,
      color: '#0f172a',
      size: 4,
      tool: 'pen',
      timestamp: Date.now(),
    };

    const newStrokes = [...strokes, newStroke];
    setStrokes(newStrokes);
    setCurrentStroke(null);

    // Run OCR
    runOcr(newStrokes);
  };

  const runOcr = (currentStrokes: InkStroke[]) => {
    setIsRecognizing(true);
    const result = HandwritingOcrService.recognizeStrokes(currentStrokes);
    setOcrResult(result);
    setIsRecognizing(false);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    setOcrResult(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleAcceptOcr = () => {
    if (ocrResult && ocrResult.text.trim()) {
      onAccept(ocrResult.text.trim());
    }
    onClose();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-2xl shadow-xl p-3 z-40 transition-all space-y-2 animate-in fade-in duration-100">
      {/* Box Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <Pen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Write with Stylus: {label || 'Input Field'}</span>
          {isNumericOnly && (
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-500">
              Numbers / BP
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawing Canvas Area */}
      <div className="relative w-full h-28 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-crosshair touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full block"
        />

        {strokes.length === 0 && !currentStroke && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic select-none">
            {placeholder || 'Write here with stylus or finger... (e.g. 120/80)'}
          </div>
        )}
      </div>

      {/* Real-time OCR Recognition Status Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {ocrResult && ocrResult.text ? (
            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Recognized:</span>
              <span className="font-mono text-sm underline">{ocrResult.text}</span>
              <span className="text-[10px] opacity-75">
                ({Math.round(ocrResult.confidence * 100)}%)
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">
              {isRecognizing ? 'Recognizing...' : 'Write digits or text above'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
            title="Clear Scratchpad"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleAcceptOcr}
            disabled={!ocrResult || !ocrResult.text}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Field</span>
          </button>
        </div>
      </div>
    </div>
  );
};
