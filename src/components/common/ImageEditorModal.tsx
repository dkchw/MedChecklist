import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Square,
  PenTool,
  Sparkles,
  Crop,
  Check,
  EyeOff,
  Save,
  Undo,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Maximize,
} from 'lucide-react';

interface ImageEditorModalProps {
  imageUrl: string;
  imageCaption?: string;
  onSave: (editedDataUrl: string, saveAsNewCopy: boolean) => void;
  onClose: () => void;
}

type EditorTool = 'blackout' | 'whiteout' | 'blur' | 'marker' | 'crop' | 'stamp';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  imageUrl,
  imageCaption = 'Clinical Image',
  onSave,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<EditorTool>('blackout');
  const [markerSize, setMarkerSize] = useState<number>(14);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Interaction dragging states
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number } | null>(null);

  // Crop selection
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Push state to undo history
  const pushHistoryState = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, data];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Initialize canvas with source image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Fit to reasonable resolution (max 1920 width/height)
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      const maxDim = 1920;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const initialData = ctx.getImageData(0, 0, w, h);
        setHistory([initialData]);
        setHistoryIndex(0);
        setImageLoaded(true);
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Convert client pointer coordinates to canvas pixel space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetIdx = historyIndex - 1;
    const targetState = history[targetIdx];
    if (targetState) {
      canvas.width = targetState.width;
      canvas.height = targetState.height;
      ctx.putImageData(targetState, 0, 0);
      setHistoryIndex(targetIdx);
    }
  };

  // Reset to original
  const handleReset = () => {
    if (!originalImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = originalImage.naturalWidth || originalImage.width;
    let h = originalImage.naturalHeight || originalImage.height;
    const maxDim = 1920;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(originalImage, 0, 0, w, h);
    pushHistoryState(ctx, canvas);
  };

  // Pixelate / Blur rectangular region
  const applyPixelate = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const rx = Math.max(0, Math.min(x, ctx.canvas.width));
    const ry = Math.max(0, Math.min(y, ctx.canvas.height));
    const rw = Math.min(w, ctx.canvas.width - rx);
    const rh = Math.min(h, ctx.canvas.height - ry);
    if (rw <= 0 || rh <= 0) return;

    const blockSize = Math.max(8, Math.round(Math.min(rw, rh) / 8));
    const imgData = ctx.getImageData(rx, ry, rw, rh);
    const d = imgData.data;

    for (let py = 0; py < rh; py += blockSize) {
      for (let px = 0; px < rw; px += blockSize) {
        const i = (py * rw + px) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        for (let subY = 0; subY < blockSize && py + subY < rh; subY++) {
          for (let subX = 0; subX < blockSize && px + subX < rw; subX++) {
            const subI = ((py + subY) * rw + (px + subX)) * 4;
            d[subI] = r;
            d[subI + 1] = g;
            d[subI + 2] = b;
          }
        }
      }
    }
    ctx.putImageData(imgData, rx, ry);
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setDragStart(coords);
    setCurrentDrag(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'marker') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = markerSize;
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (activeTool === 'stamp') {
      // Draw Redacted Stamp
      ctx.save();
      ctx.fillStyle = '#000000';
      ctx.fillRect(coords.x - 70, coords.y - 14, 140, 28);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(coords.x - 68, coords.y - 12, 136, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[REDACTED PHI]', coords.x, coords.y);
      ctx.restore();
      pushHistoryState(ctx, canvas);
      setIsDrawing(false);
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !dragStart) return;
    const coords = getCanvasCoords(e);
    setCurrentDrag(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'marker') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  // Pointer Up
  const handlePointerUp = () => {
    if (!isDrawing || !dragStart || !currentDrag) {
      setIsDrawing(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = Math.min(dragStart.x, currentDrag.x);
    const y = Math.min(dragStart.y, currentDrag.y);
    const width = Math.abs(currentDrag.x - dragStart.x);
    const height = Math.abs(currentDrag.y - dragStart.y);

    if (activeTool === 'blackout') {
      if (width > 2 && height > 2) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, width, height);
        pushHistoryState(ctx, canvas);
      }
    } else if (activeTool === 'whiteout') {
      if (width > 2 && height > 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, width, height);
        pushHistoryState(ctx, canvas);
      }
    } else if (activeTool === 'blur') {
      if (width > 4 && height > 4) {
        applyPixelate(ctx, x, y, width, height);
        pushHistoryState(ctx, canvas);
      }
    } else if (activeTool === 'crop') {
      if (width > 20 && height > 20) {
        setCropBox({ x, y, width, height });
      }
    } else if (activeTool === 'marker') {
      ctx.closePath();
      pushHistoryState(ctx, canvas);
    }

    setIsDrawing(false);
    setDragStart(null);
    setCurrentDrag(null);
  };

  // Apply Crop
  const handleApplyCrop = () => {
    if (!cropBox) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const croppedData = ctx.getImageData(cropBox.x, cropBox.y, cropBox.width, cropBox.height);
    canvas.width = cropBox.width;
    canvas.height = cropBox.height;
    ctx.putImageData(croppedData, 0, 0);
    setCropBox(null);
    pushHistoryState(ctx, canvas);
  };

  // Export & Save
  const handleSaveResult = (asNewCopy: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSave(dataUrl, asNewCopy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/40">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Medical Image De-identification & Redaction Editor</span>
                <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>HIPAA Safe Harbor Tool</span>
                </span>
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {imageCaption} • Drag to redact patient stickers, names, ECG headers, or barcodes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 flex items-center gap-1 transition-colors"
              title="Undo last redaction (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
              title="Reset all redactions back to original"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setActiveTool('blackout');
                setCropBox(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'blackout'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
              title="Draw black solid box over text, barcodes, or labels"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Blackout Box</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('blur');
                setCropBox(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'blur'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
              title="Pixelate/Blur faces or identifying marks"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Pixelate / Blur</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('marker');
                setCropBox(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'marker'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
              title="Freehand blackout pen / marker"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Black Marker</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('whiteout');
                setCropBox(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'whiteout'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
              title="Draw white solid box for white document charts"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Whiteout Box</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('stamp');
                setCropBox(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'stamp'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
              title="Click anywhere to stamp [REDACTED PHI]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Stamp Redacted</span>
            </button>

            <button
              onClick={() => setActiveTool('crop')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTool === 'crop'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
              title="Crop image to remove hospital margins"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>Crop</span>
            </button>
          </div>

          {/* Marker Size Options */}
          {activeTool === 'marker' && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400">Brush Size:</span>
              {[8, 14, 24, 36].map((s) => (
                <button
                  key={s}
                  onClick={() => setMarkerSize(s)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                    markerSize === s ? 'border-indigo-400 bg-indigo-950/80' : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  <div
                    style={{ width: Math.min(s / 2, 14), height: Math.min(s / 2, 14) }}
                    className="bg-white rounded-full"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Apply Crop button */}
          {activeTool === 'crop' && cropBox && (
            <button
              onClick={handleApplyCrop}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors animate-pulse shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>Apply Crop Selection</span>
            </button>
          )}
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-4 relative"
        >
          {!imageLoaded && (
            <div className="text-xs text-slate-400 animate-pulse">Loading high-resolution image...</div>
          )}

          <div className="relative inline-block border border-slate-800 shadow-2xl">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`max-w-[80vw] max-h-[65vh] object-contain touch-none cursor-crosshair block`}
            />

            {/* Live Interactive Selection Preview Box */}
            {isDrawing && dragStart && currentDrag && activeTool !== 'marker' && activeTool !== 'stamp' && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(Math.min(dragStart.x, currentDrag.x) / (canvasRef.current?.width || 1)) * 100}%`,
                  top: `${(Math.min(dragStart.y, currentDrag.y) / (canvasRef.current?.height || 1)) * 100}%`,
                  width: `${(Math.abs(currentDrag.x - dragStart.x) / (canvasRef.current?.width || 1)) * 100}%`,
                  height: `${(Math.abs(currentDrag.y - dragStart.y) / (canvasRef.current?.height || 1)) * 100}%`,
                }}
                className={`pointer-events-none border-2 ${
                  activeTool === 'crop'
                    ? 'border-amber-400 bg-amber-400/20'
                    : activeTool === 'whiteout'
                    ? 'border-white bg-white/60'
                    : activeTool === 'blur'
                    ? 'border-cyan-400 bg-cyan-400/30'
                    : 'border-red-500 bg-black/80'
                }`}
              />
            )}

            {/* Crop Box Indicator */}
            {cropBox && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(cropBox.x / (canvasRef.current?.width || 1)) * 100}%`,
                  top: `${(cropBox.y / (canvasRef.current?.height || 1)) * 100}%`,
                  width: `${(cropBox.width / (canvasRef.current?.width || 1)) * 100}%`,
                  height: `${(cropBox.height / (canvasRef.current?.height || 1)) * 100}%`,
                }}
                className="pointer-events-none border-2 border-dashed border-amber-400 bg-amber-400/10 shadow-lg"
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Saving will tag this photo with <span className="font-mono text-emerald-300">#anonymized</span> for safe case presentations.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={() => handleSaveResult(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors flex items-center gap-1.5"
              title="Overwrite original image with de-identified version"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Replace Original</span>
            </button>

            <button
              onClick={() => handleSaveResult(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors flex items-center gap-1.5"
              title="Save a new de-identified copy, preserving original"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Save as Anonymized Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
