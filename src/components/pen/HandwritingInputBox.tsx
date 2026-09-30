import React, { useRef, useState, useEffect, useCallback } from 'react';
import getStroke from 'perfect-freehand';
import { HandwritingOcrService, OcrResult } from '../../utils/handwritingOcr';
import { InkStroke, StrokePoint } from '../../types/ink';
import { Pen, Check, RotateCcw, X, Sparkles, ArrowRightLeft, Sliders } from 'lucide-react';

interface HandwritingInputBoxProps {
  label?: string;
  value: string;
  placeholder?: string;
  isNumericOnly?: boolean;
  onAccept: (recognizedValue: string) => void;
  onClose: () => void;
}

const COMMON_UNITS = ['mmHg', 'bpm', '°C', '°F', 'mg/dL', 'mmol/L', '%', '/min', 'None'];

export const HandwritingInputBox: React.FC<HandwritingInputBoxProps> = ({
  label = '',
  value,
  placeholder,
  isNumericOnly,
  onAccept,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointsRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>(value || '');
  const [isRecognizing, setIsRecognizing] = useState(false);

  // Determine initial preset unit based on field label
  const getInitialUnit = (): string => {
    const l = label.toLowerCase();
    if (l.includes('bp') || l.includes('pressure') || l.includes('arterial')) return 'mmHg';
    if (l.includes('pulse') || l.includes('heart') || l.includes('hr')) return 'bpm';
    if (l.includes('temp')) return '°C';
    if (l.includes('glucose') || l.includes('sugar') || l.includes('bsl')) return 'mg/dL';
    if (l.includes('spo2') || l.includes('sat')) return '%';
    if (l.includes('resp') || l.includes('rr')) return '/min';
    return 'None';
  };

  const [selectedUnit, setSelectedUnit] = useState<string>(getInitialUnit);

  const drawStroke = (
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    color: string,
    size: number
  ) => {
    if (points.length === 0) return;
    const outlinePoints = getStroke(
      points.map((p) => [p.x, p.y, p.pressure ?? 0.5]),
      {
        size,
        thinning: 0.5,
        smoothing: 0.65,
        streamline: 0.55,
      }
    );
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

  // Pre-render guideline and saved strokes to offscreen buffer
  const updateBackgroundBuffer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!bufferCanvasRef.current) {
      bufferCanvasRef.current = document.createElement('canvas');
    }
    const buffer = bufferCanvasRef.current;
    const dpr = window.devicePixelRatio || 1;

    if (buffer.width !== canvas.width || buffer.height !== canvas.height) {
      buffer.width = canvas.width;
      buffer.height = canvas.height;
    }

    const bCtx = buffer.getContext('2d');
    if (!bCtx) return;

    bCtx.setTransform(1, 0, 0, 1, 0, 0);
    bCtx.clearRect(0, 0, buffer.width, buffer.height);
    bCtx.scale(dpr, dpr);

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Draw guideline baseline
    bCtx.strokeStyle = '#94a3b8';
    bCtx.lineWidth = 1;
    bCtx.setLineDash([4, 4]);
    bCtx.beginPath();
    bCtx.moveTo(10, h * 0.75);
    bCtx.lineTo(w - 10, h * 0.75);
    bCtx.stroke();
    bCtx.setLineDash([]);

    // Draw saved strokes
    for (const stroke of strokes) {
      drawStroke(bCtx, stroke.points, stroke.color, stroke.size);
    }
  }, [strokes]);

  // Fast single-blit display render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = bufferCanvasRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (buffer) {
      ctx.drawImage(buffer, 0, 0);
    }

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // Draw active stroke on top without React state overhead
    const activePts = activePointsRef.current;
    if (activePts.length > 0) {
      drawStroke(ctx, activePts, '#0f172a', 3.5);
    }
  }, []);

  const scheduleRender = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderCanvas();
    });
  }, [renderCanvas]);

  // Resize canvas to parent container with high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    updateBackgroundBuffer();
    renderCanvas();
  }, [updateBackgroundBuffer, renderCanvas]);

  useEffect(() => {
    updateBackgroundBuffer();
    renderCanvas();
  }, [strokes, updateBackgroundBuffer, renderCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    activePointsRef.current = [{ x, y, pressure }];
    scheduleRender();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const coalescedEvents = (e.nativeEvent as any).getCoalescedEvents
      ? (e.nativeEvent as any).getCoalescedEvents()
      : [e];

    for (const ev of coalescedEvents) {
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      const pressure = ev.pressure && ev.pressure > 0 ? ev.pressure : 0.5;
      activePointsRef.current.push({ x, y, pressure });
    }
    scheduleRender();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activePointsRef.current.length > 0) {
      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now(),
        points: [...activePointsRef.current],
        color: '#0f172a',
        size: 3.5,
        tool: 'pen',
        timestamp: Date.now(),
      };

      activePointsRef.current = [];
      const newStrokes = [...strokes, newStroke];
      setStrokes(newStrokes);
      runOcr(newStrokes);
    }
  };

  const runOcr = (currentStrokes: InkStroke[]) => {
    setIsRecognizing(true);
    const result = HandwritingOcrService.recognizeStrokes(currentStrokes);
    setOcrResult(result);
    if (result.text) {
      setRecognizedText(result.text);
    }
    setIsRecognizing(false);
  };

  const handleClear = () => {
    setStrokes([]);
    activePointsRef.current = [];
    setOcrResult(null);
    setRecognizedText('');
    updateBackgroundBuffer();
    renderCanvas();
  };

  // Unit Converter handler
  const handleConvertUnit = () => {
    const num = parseFloat(recognizedText);
    if (isNaN(num)) return;

    if (selectedUnit === '°C') {
      const f = (num * 9) / 5 + 32;
      setRecognizedText(f.toFixed(1));
      setSelectedUnit('°F');
    } else if (selectedUnit === '°F') {
      const c = ((num - 32) * 5) / 9;
      setRecognizedText(c.toFixed(1));
      setSelectedUnit('°C');
    } else if (selectedUnit === 'mg/dL') {
      const mmol = num / 18.018;
      setRecognizedText(mmol.toFixed(2));
      setSelectedUnit('mmol/L');
    } else if (selectedUnit === 'mmol/L') {
      const mg = num * 18.018;
      setRecognizedText(Math.round(mg).toString());
      setSelectedUnit('mg/dL');
    }
  };

  const handleAcceptOcr = () => {
    const raw = recognizedText.trim();
    if (!raw) {
      onClose();
      return;
    }

    // Auto-append selected preset unit
    let finalValue = raw;
    if (selectedUnit && selectedUnit !== 'None' && !raw.includes(selectedUnit)) {
      finalValue = `${raw} ${selectedUnit}`;
    }

    onAccept(finalValue);
    onClose();
  };

  const canConvert =
    ['°C', '°F', 'mg/dL', 'mmol/L'].includes(selectedUnit) && !isNaN(parseFloat(recognizedText));

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-2xl shadow-2xl p-3.5 z-40 transition-all space-y-2.5 animate-in fade-in duration-100 max-w-md w-full">
      {/* Box Header */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-1.5">
          <Pen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Stylus Input: {label || 'Vitals / Field'}</span>
          {isNumericOnly && (
            <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
              Auto-Vitals OCR
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Preset Unit Bar & Converter */}
      <div className="flex items-center justify-between gap-1 flex-wrap pt-0.5 pb-0.5 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 mr-0.5">
            Unit:
          </span>
          {COMMON_UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setSelectedUnit(u)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                selectedUnit === u
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* 1-Click Unit Converter */}
        {canConvert && (
          <button
            type="button"
            onClick={handleConvertUnit}
            className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold rounded-md border border-amber-200 dark:border-amber-800 transition-colors"
            title="Convert between units"
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>
              Convert to {selectedUnit === '°C' ? '°F' : selectedUnit === '°F' ? '°C' : selectedUnit === 'mg/dL' ? 'mmol/L' : 'mg/dL'}
            </span>
          </button>
        )}
      </div>

      {/* Drawing Canvas Area (Retina Crisp) */}
      <div className="relative w-full h-28 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-crosshair touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full block"
        />

        {strokes.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 dark:text-slate-400 italic select-none">
            {placeholder || 'Write digits with stylus (e.g. 120/80)...'}
          </div>
        )}
      </div>

      {/* Quick Tap Digits Bar for 1-Tap Adjustments */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-mono py-0.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '/', '.'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setRecognizedText((prev) => prev + d)}
            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center transition-colors border border-slate-200/80 dark:border-slate-700/80"
          >
            {d}
          </button>
        ))}
      </div>

      {/* Real-time OCR Recognition Status Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            type="text"
            value={recognizedText}
            onChange={(e) => setRecognizedText(e.target.value)}
            placeholder="Recognized value..."
            className="font-mono text-xs font-bold px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 outline-none w-32 focus:ring-1 focus:ring-indigo-500"
          />
          {selectedUnit !== 'None' && (
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {selectedUnit}
            </span>
          )}
          {ocrResult && (
            <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">
              ({Math.round(ocrResult.confidence * 100)}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors"
            title="Clear Scratchpad"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleAcceptOcr}
            disabled={!recognizedText.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
