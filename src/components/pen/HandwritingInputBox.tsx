import React, { useRef, useState, useEffect, useCallback } from 'react';
import getStroke from 'perfect-freehand';
import { HandwritingOcrService, OcrResult } from '../../utils/handwritingOcr';
import { InkStroke, StrokePoint } from '../../types/ink';
import { isPointNearStroke, getAdaptiveInkColor } from '../../utils/inkUtils';
import {
  Pen,
  Eraser,
  Check,
  RotateCcw,
  X,
  Sparkles,
  ArrowRightLeft,
  Delete,
  Keyboard,
  Move,
  GripHorizontal,
} from 'lucide-react';
import {
  SUPPORTED_KEYBOARDS,
  KeyboardLanguageConfig,
  getEnabledKeyboards,
  getKeyboardRows,
} from '../../utils/keyboardLanguages';
import { savePendingInkItem } from '../../utils/pendingInk';

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activePointsRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [recognizedText, setRecognizedText] = useState<string>(value || '');
  const baseTextRef = useRef<string>(value || '');

  const [boxTool, setBoxTool] = useState<'pen' | 'eraser'>('pen');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState<boolean>(false);
  const [enabledKeyboards, setEnabledKeyboards] = useState<string[]>(['en', 'vi', 'med_symbols']);
  const [activeKeyboardId, setActiveKeyboardId] = useState<string>('en');
  const [isShiftActive, setIsShiftActive] = useState<boolean>(false);

  // Movable / Draggable canvas state
  const [modalPos, setModalPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Pen Only mode (reject touch, only recognize pen)
  const [penOnlyMode, setPenOnlyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('medchecklist_pen_only') === 'true';
    } catch {
      return false;
    }
  });

  // Append mode toggle
  const [appendMode, setAppendMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('medchecklist_ocr_append') === 'true';
    } catch {
      return false;
    }
  });

  // Auto-scroll input to the latest text so clinician doesn't have to scroll
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [recognizedText]);

  useEffect(() => {
    getEnabledKeyboards().then((ids) => {
      if (ids && ids.length > 0) {
        setEnabledKeyboards(ids);
        setActiveKeyboardId(ids[0]);
      }
    });
  }, []);

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
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    ctx.fillStyle = getAdaptiveInkColor(color, isDark);
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
    if (activePts.length > 0 && boxTool !== 'eraser') {
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      drawStroke(ctx, activePts, isDark ? '#f8fafc' : '#0f172a', 3.5);
    }
  }, [boxTool]);

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

  // Native contextmenu prevention
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventContext = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('contextmenu', preventContext);
    return () => {
      canvas.removeEventListener('contextmenu', preventContext);
    };
  }, []);

  useEffect(() => {
    updateBackgroundBuffer();
    renderCanvas();
  }, [strokes, updateBackgroundBuffer, renderCanvas]);

  // Stylus button detection (barrel button / side eraser / eraser pointerType)
  const isPenEraserActive = (e: React.PointerEvent<HTMLCanvasElement> | PointerEvent): boolean => {
    return (
      boxTool === 'eraser' ||
      e.pointerType === 'eraser' ||
      ((e.buttons & 2) !== 0 ||
        (e.buttons & 4) !== 0 ||
        (e.buttons & 32) !== 0 ||
        e.button === 2 ||
        e.button === 5 ||
        (e as any).altKey)
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // User requirement: Pen Only mode - reject finger touches (allow eraser device)
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (e.cancelable) {
      e.preventDefault();
    }

    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    // Stylus button or tool eraser
    if (isPenEraserActive(e)) {
      activePointsRef.current = [];
      const remaining = strokes.filter((s) => !isPointNearStroke({ x, y }, s, 25));
      if (remaining.length !== strokes.length) {
        setStrokes(remaining);
        // User requirement: link stroke erase to OCR text directly
        if (remaining.length > 0) {
          runOcr(remaining);
        } else {
          setRecognizedText(appendMode && baseTextRef.current ? baseTextRef.current : '');
          setOcrResult(null);
        }
      }
      scheduleRender();
      return;
    }

    activePointsRef.current = [{ x, y, pressure }];
    scheduleRender();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') return;
    if (!isDrawingRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }

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

      if (isPenEraserActive(ev)) {
        activePointsRef.current = [];
        const remaining = strokes.filter((s) => !isPointNearStroke({ x, y }, s, 25));
        if (remaining.length !== strokes.length) {
          setStrokes(remaining);
          // Link stroke erase to OCR text directly
          if (remaining.length > 0) {
            runOcr(remaining);
          } else {
            setRecognizedText(appendMode && baseTextRef.current ? baseTextRef.current : '');
            setOcrResult(null);
          }
        }
        scheduleRender();
        continue;
      }

      activePointsRef.current.push({ x, y, pressure });
    }
    scheduleRender();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') return;
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (isPenEraserActive(e)) {
      activePointsRef.current = [];
      scheduleRender();
      return;
    }

    if (activePointsRef.current.length > 0) {
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        points: [...activePointsRef.current],
        color: isDark ? '#f8fafc' : '#0f172a',
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

  // OCR Recognition with Append vs Replace support
  const runOcr = async (currentStrokes: InkStroke[]) => {
    if (currentStrokes.length === 0) return;
    setIsRecognizing(true);
    try {
      const result = await HandwritingOcrService.recognizeStrokesAsync(currentStrokes, activeKeyboardId);
      setOcrResult(result);
      if (result.text) {
        if (appendMode) {
          const base = baseTextRef.current.trim();
          if (base) {
            const separator =
              base.endsWith('/') || base.endsWith('-') || base.endsWith('+') || base.endsWith('.')
                ? ''
                : ' ';
            setRecognizedText(`${base}${separator}${result.text}`);
          } else {
            setRecognizedText(result.text);
          }
        } else {
          setRecognizedText(result.text);
        }
      }
    } catch (err) {
      console.error('OCR Error:', err);
    } finally {
      setIsRecognizing(false);
    }
  };

  // Clean writing zone should NOT clean entire text box
  const handleClearCanvas = () => {
    setStrokes([]);
    activePointsRef.current = [];
    baseTextRef.current = recognizedText;
    setOcrResult(null);
    updateBackgroundBuffer();
    renderCanvas();
  };

  // Delete entire line
  const handleClearLine = () => {
    setRecognizedText('');
    baseTextRef.current = '';
    setStrokes([]);
    activePointsRef.current = [];
    setOcrResult(null);
    updateBackgroundBuffer();
    renderCanvas();
  };

  // Delete single character backspace
  const handleBackspace = () => {
    setRecognizedText((prev) => {
      const next = prev.slice(0, -1);
      baseTextRef.current = next;
      return next;
    });
  };

  // Unit Converter handler
  const handleConvertUnit = () => {
    const num = parseFloat(recognizedText);
    if (isNaN(num)) return;

    if (selectedUnit === '°C') {
      const f = (num * 9) / 5 + 32;
      setRecognizedText(f.toFixed(1));
      baseTextRef.current = f.toFixed(1);
      setSelectedUnit('°F');
    } else if (selectedUnit === '°F') {
      const c = ((num - 32) * 5) / 9;
      setRecognizedText(c.toFixed(1));
      baseTextRef.current = c.toFixed(1);
      setSelectedUnit('°C');
    } else if (selectedUnit === 'mg/dL') {
      const mmol = num / 18.018;
      setRecognizedText(mmol.toFixed(2));
      baseTextRef.current = mmol.toFixed(2);
      setSelectedUnit('mmol/L');
    } else if (selectedUnit === 'mmol/L') {
      const mg = num * 18.018;
      setRecognizedText(Math.round(mg).toString());
      baseTextRef.current = Math.round(mg).toString();
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

  // User requirement: Save handwriting directly if OCR keeps failing or doctor is in a rush
  const handleSaveInkDirectly = async () => {
    if (strokes.length === 0) return;
    const inkId = 'ink-' + Date.now();
    await savePendingInkItem({
      id: inkId,
      fieldLabel: label || 'Clinical Field',
      strokes: [...strokes],
      timestamp: Date.now(),
    });
    const inkPlaceholder = `✍️ [Ink: ${label || 'Note'}]`;
    onAccept(inkPlaceholder);
    onClose();
  };

  // Dragging handlers for movable modal
  const handleDragStart = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: modalPos.x,
      origY: modalPos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setModalPos({
      x: dragStartRef.current.origX + dx,
      y: dragStartRef.current.origY + dy,
    });
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const canConvert =
    ['°C', '°F', 'mg/dL', 'mmol/L'].includes(selectedUnit) && !isNaN(parseFloat(recognizedText));

  return (
    <div
      style={{
        transform: `translate(${modalPos.x}px, ${modalPos.y}px)`,
      }}
      className="bg-white dark:bg-slate-900 border-2 border-indigo-500 rounded-2xl shadow-2xl p-3.5 z-40 transition-shadow space-y-2.5 animate-in fade-in duration-100 max-w-lg w-full"
    >
      {/* Box Header - Draggable & Functional */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 flex-wrap gap-2">
        {/* Draggable Title Bar */}
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          className="flex items-center gap-1.5 min-w-0 cursor-move touch-none select-none p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Drag to reposition input canvas anywhere on screen"
        >
          <GripHorizontal className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="truncate font-bold text-xs sm:text-sm">Stylus: {label || 'Vitals / Field'}</span>
          {isNumericOnly && (
            <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800 shrink-0">
              Vitals OCR
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Tool Switcher: Pen vs Eraser */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setBoxTool('pen')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                boxTool === 'pen'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Pen drawing tool"
            >
              <Pen className="w-3 h-3" />
              <span>Pen</span>
            </button>
            <button
              type="button"
              onClick={() => setBoxTool('eraser')}
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                boxTool === 'eraser'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Eraser tool (or use stylus barrel button)"
            >
              <Eraser className="w-3 h-3" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Pen Only mode */}
          <button
            type="button"
            onClick={() => {
              const next = !penOnlyMode;
              setPenOnlyMode(next);
              try {
                localStorage.setItem('medchecklist_pen_only', String(next));
              } catch {}
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
              penOnlyMode
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={penOnlyMode ? 'Pen-Only Active (Finger touches rejected)' : 'Touch+Pen Active (Finger drawing enabled)'}
          >
            <Pen className="w-3 h-3" />
            <span>{penOnlyMode ? 'Pen Only' : 'Touch+Pen'}</span>
          </button>

          {/* Append mode toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !appendMode;
              setAppendMode(next);
              baseTextRef.current = recognizedText;
              try {
                localStorage.setItem('medchecklist_ocr_append', String(next));
              } catch {}
            }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
              appendMode
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={appendMode ? 'Append Mode Active (Appends OCR to text box)' : 'Replace Mode Active (Overwrites text box)'}
          >
            <span>{appendMode ? '➕ Append' : '🔄 Replace'}</span>
          </button>

          {/* Virtual Keyboard Toggle Button */}
          <button
            type="button"
            onClick={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
              showVirtualKeyboard
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Toggle Multilingual Virtual Keyboard"
          >
            <Keyboard className="w-3 h-3" />
            <span>{showVirtualKeyboard ? 'Hide Keys' : 'Keys'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Close Stylus Box"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Multilingual Virtual Keyboard Panel (Compact & Fits Without Scrolling) */}
      {showVirtualKeyboard && (
        <div className="p-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-slate-50 dark:bg-slate-800/80 space-y-1.5 animate-in fade-in duration-100">
          {/* Language Selector Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-700 text-xs">
            {SUPPORTED_KEYBOARDS.filter((kb) => enabledKeyboards.includes(kb.id)).map((kb) => (
              <button
                key={kb.id}
                type="button"
                onClick={() => setActiveKeyboardId(kb.id)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                  activeKeyboardId === kb.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
                }`}
              >
                <span>{kb.flag}</span>
                <span>{kb.name}</span>
              </button>
            ))}
          </div>

          {/* Standard Compact Keyboard Grid (Non-scrolling layout) */}
          {(() => {
            const currentKb =
              SUPPORTED_KEYBOARDS.find((kb) => kb.id === activeKeyboardId) || SUPPORTED_KEYBOARDS[0];
            const rows = getKeyboardRows(currentKb);

            return (
              <div className="space-y-1">
                <div className="p-1 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                  {rows.map((row, rIdx) => (
                    <div key={rIdx} className="flex justify-center items-center gap-0.5 flex-nowrap w-full">
                      {row.map((k, kIdx) => {
                        const displayChar = isShiftActive && k.length === 1 ? k.toUpperCase() : k;
                        return (
                          <button
                            key={`${k}-${kIdx}`}
                            type="button"
                            onClick={() => {
                              const charToInsert = isShiftActive && k.length === 1 ? k.toUpperCase() : k;
                              setRecognizedText((prev) => {
                                const next = prev + charToInsert;
                                baseTextRef.current = next;
                                return next;
                              });
                            }}
                            className="flex-1 min-w-0 h-6 sm:h-7 px-0.5 rounded bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-900/60 text-slate-800 dark:text-slate-100 font-semibold text-[11px] sm:text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95 cursor-pointer transition-all"
                          >
                            {displayChar}
                          </button>
                        );
                      })}
                    </div>
                  ))}

                  {/* Standard Bottom Function Row: Shift, Space, Backspace, Clear */}
                  <div className="flex justify-center items-center gap-1 pt-0.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => setIsShiftActive(!isShiftActive)}
                      className={`h-6 sm:h-7 px-2 rounded text-[11px] font-bold flex items-center justify-center transition-colors border shadow-2xs ${
                        isShiftActive
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                      }`}
                      title="Shift / Uppercase"
                    >
                      ⇧
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecognizedText((prev) => {
                          const next = prev + ' ';
                          baseTextRef.current = next;
                          return next;
                        });
                      }}
                      className="flex-1 h-6 sm:h-7 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
                      title="Spacebar"
                    >
                      Space
                    </button>

                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="h-6 sm:h-7 px-2 rounded bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold text-xs flex items-center gap-0.5 border border-amber-300 dark:border-amber-700 shadow-2xs cursor-pointer"
                      title="Backspace"
                    >
                      <Delete className="w-3 h-3" />
                      <span>⌫</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearLine}
                      className="h-6 sm:h-7 px-2 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs flex items-center gap-0.5 border border-red-300 dark:border-red-700 shadow-2xs cursor-pointer"
                      title="Delete entire line"
                    >
                      <X className="w-3 h-3" />
                      <span>✕</span>
                    </button>
                  </div>
                </div>

                {/* Clinical Shortcuts for Active Language */}
                {currentKb.clinicalShortcuts && currentKb.clinicalShortcuts.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px] py-0.5">
                    <span className="font-bold text-slate-500 uppercase shrink-0">Shortcuts:</span>
                    {currentKb.clinicalShortcuts.map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => {
                          setRecognizedText((prev) => {
                            const next = prev ? `${prev} ${sc}` : sc;
                            baseTextRef.current = next;
                            return next;
                          });
                        }}
                        className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 shrink-0 cursor-pointer transition-colors text-[10px]"
                      >
                        {sc}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

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

      {/* Drawing Canvas Area (Retina Crisp, Touch-none, Stylus Aware) */}
      <div
        className="relative w-full h-36 sm:h-44 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden cursor-crosshair touch-none select-none"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          onPointerCancel={() => {
            // Commit in-flight stroke if valid to prevent gesture cancellation data loss on Android
            if (isDrawingRef.current && activePointsRef.current.length > 1) {
              const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
              const newStroke: InkStroke = {
                id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                points: [...activePointsRef.current],
                color: isDark ? '#f8fafc' : '#0f172a',
                size: 3.5,
                tool: 'pen',
                timestamp: Date.now(),
              };
              const newStrokes = [...strokes, newStroke];
              setStrokes(newStrokes);
              runOcr(newStrokes);
            }
            isDrawingRef.current = false;
            activePointsRef.current = [];
            scheduleRender();
          }}
          className="w-full h-full block cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />

        {strokes.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 dark:text-slate-400 italic select-none">
            {placeholder || (penOnlyMode ? 'Write with stylus pen only...' : 'Write with stylus or finger...')}
          </div>
        )}
      </div>

      {/* Quick Tap Digits & Symbols Bar */}
      <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono py-0.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '/', '.', '-', '+'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setRecognizedText((prev) => {
                const next = prev + d;
                baseTextRef.current = next;
                return next;
              });
            }}
            className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center transition-colors border border-slate-200/80 dark:border-slate-700/80 shrink-0"
          >
            {d}
          </button>
        ))}

        {/* Quick Backspace */}
        <button
          type="button"
          onClick={handleBackspace}
          className="px-2 h-6 rounded-md bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold flex items-center justify-center transition-colors border border-amber-200 dark:border-amber-800 shrink-0 text-xs gap-1"
          title="Backspace (delete last character)"
        >
          <Delete className="w-3 h-3" />
          <span>⌫</span>
        </button>

        {/* Delete All Line */}
        <button
          type="button"
          onClick={handleClearLine}
          className="px-2 h-6 rounded-md bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold flex items-center justify-center transition-colors border border-red-200 dark:border-red-800 shrink-0 text-xs gap-1"
          title="Clear entire text line"
        >
          <X className="w-3 h-3" />
          <span>✕ Line</span>
        </button>

        {/* Quick Space */}
        <button
          type="button"
          onClick={() => {
            setRecognizedText((prev) => {
              const next = prev + ' ';
              baseTextRef.current = next;
              return next;
            });
          }}
          className="px-2 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700 shrink-0 text-[10px]"
          title="Insert space"
        >
          Space
        </button>
      </div>

      {/* Real-time OCR Recognition Status Bar - Bigger Textbox That Auto-Follows Latest Text */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-200 dark:border-slate-800 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          {/* User requirement: Bigger textbox that follows latest text without manual scroll */}
          <input
            ref={inputRef}
            type="text"
            value={recognizedText}
            onChange={(e) => {
              setRecognizedText(e.target.value);
              baseTextRef.current = e.target.value;
            }}
            placeholder="Recognized clinical text..."
            className="font-mono text-sm font-bold px-2.5 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 outline-none flex-1 min-w-[150px] focus:ring-2 focus:ring-indigo-500 shadow-inner"
          />
          {selectedUnit !== 'None' && (
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
              {selectedUnit}
            </span>
          )}

          {/* Dedicated Backspace button */}
          <button
            type="button"
            onClick={handleBackspace}
            className="p-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-amber-300 dark:border-amber-700 shrink-0"
            title="Backspace (delete previous character)"
          >
            <Delete className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[11px]">⌫</span>
          </button>

          {/* Delete entire line button next to backspace */}
          <button
            type="button"
            onClick={handleClearLine}
            className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-300 dark:border-red-700 shrink-0"
            title="Clear entire text line"
          >
            <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="text-[11px]">✕</span>
          </button>

          {/* Manual OCR button */}
          <button
            type="button"
            onClick={() => runOcr(strokes)}
            className="px-2 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-800 shrink-0"
            title="Re-run OCR recognition on current handwriting"
          >
            OCR
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* User requirement: Save handwriting directly if OCR fails or doctor needs fast input */}
          <button
            type="button"
            onClick={handleSaveInkDirectly}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            title="Save raw handwriting directly without OCR and remind to transcribe later"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Save Ink</span>
          </button>

          {/* Clean writing zone should NOT clean entire text box */}
          <button
            type="button"
            onClick={handleClearCanvas}
            className="flex items-center gap-1 px-2 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            title="Clear Scratchpad Only (preserves recognized text box)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px]">Clear Pad</span>
          </button>

          <button
            type="button"
            onClick={handleAcceptOcr}
            disabled={!recognizedText.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
