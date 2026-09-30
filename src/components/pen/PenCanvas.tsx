import React, { useRef, useEffect, useState, useCallback } from 'react';
import { InkStroke, PenTool, StrokePoint } from '../../types/ink';
import { drawStrokeOnCanvas, isPointNearStroke, isStrokeInPolygon } from '../../utils/inkUtils';
import { Copy, Trash2, X, Move } from 'lucide-react';

interface PenCanvasProps {
  strokes: InkStroke[];
  onChangeStrokes: (strokes: InkStroke[]) => void;
  tool: PenTool;
  color: string;
  size: number;
  pageIndex?: number;
  panX?: number;
  panY?: number;
  zoom?: number;
  className?: string;
  penOnlyMode?: boolean;
}

interface SelectionBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const PenCanvas: React.FC<PenCanvasProps> = ({
  strokes,
  onChangeStrokes,
  tool,
  color,
  size,
  pageIndex = 0,
  panX = 0,
  panY = 0,
  zoom = 1,
  className = '',
  penOnlyMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[] | null>(null);
  const isDrawingRef = useRef(false);

  // Irregular Freehand Lasso Selector state
  const [lassoPath, setLassoPath] = useState<StrokePoint[] | null>(null);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Filter strokes belonging to current page
  const pageStrokes = strokes.filter((s) => (s.pageIndex ?? 0) === pageIndex);

  // Calculate tight bounding box of selected strokes
  const getSelectedBounds = (): SelectionBounds | null => {
    if (selectedStrokeIds.length === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const s of pageStrokes) {
      if (selectedStrokeIds.includes(s.id)) {
        for (const p of s.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
      }
    }
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  };

  const selectedBounds = getSelectedBounds();

  // Redraw all strokes on canvas with High-DPI scaling
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Draw saved page strokes
    for (const stroke of pageStrokes) {
      drawStrokeOnCanvas(ctx, stroke);
    }

    // Draw active stroke currently being drawn
    if (currentStroke && currentStroke.length > 0 && tool !== 'eraser' && tool !== 'selector') {
      const activeStrokeObj: InkStroke = {
        id: 'active',
        points: currentStroke,
        color,
        size,
        tool,
        pageIndex,
        timestamp: Date.now(),
      };
      drawStrokeOnCanvas(ctx, activeStrokeObj);
    }

    // Draw freehand irregular lasso path
    if (lassoPath && lassoPath.length > 1) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      ctx.stroke();

      // Translucent lasso fill
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.closePath();
      ctx.fill();
      ctx.setLineDash([]);
    }

    // Highlight selected strokes with tight dashed marquee box
    if (selectedBounds && tool === 'selector') {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      const pad = 8 / zoom;
      ctx.strokeRect(
        selectedBounds.minX - pad,
        selectedBounds.minY - pad,
        selectedBounds.maxX - selectedBounds.minX + pad * 2,
        selectedBounds.maxY - selectedBounds.minY + pad * 2
      );
      ctx.fillStyle = 'rgba(79, 70, 229, 0.05)';
      ctx.fillRect(
        selectedBounds.minX - pad,
        selectedBounds.minY - pad,
        selectedBounds.maxX - selectedBounds.minX + pad * 2,
        selectedBounds.maxY - selectedBounds.minY + pad * 2
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [pageStrokes, currentStroke, tool, color, size, panX, panY, zoom, lassoPath, selectedBounds, pageIndex]);

  // Handle canvas sizing with High-DPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        redrawAll();
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [redrawAll]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  // Convert screen coordinates to canvas space (accounting for pan, zoom, and device pixel ratio)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    return {
      x: (rawX - panX) / zoom,
      y: (rawY - panY) / zoom,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Stylus / Palm Rejection Guard:
    if (penOnlyMode && e.pointerType !== 'pen') {
      e.preventDefault();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pressure && e.pressure > 0 ? Math.max(0.12, Math.min(1.0, e.pressure)) : 0.5;

    if (tool === 'eraser') {
      const remaining = strokes.filter(
        (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 2.5)
      );
      if (remaining.length !== strokes.length) {
        onChangeStrokes(remaining);
      }
    } else if (tool === 'selector') {
      // Check if clicking inside current selected bounding box to start dragging
      if (
        selectedBounds &&
        x >= selectedBounds.minX - 12 &&
        x <= selectedBounds.maxX + 12 &&
        y >= selectedBounds.minY - 12 &&
        y <= selectedBounds.maxY + 12
      ) {
        setIsDraggingSelection(true);
        dragStartPos.current = { x, y };
      } else {
        // Start new freehand irregular lasso
        setSelectedStrokeIds([]);
        setLassoPath([{ x, y, pressure }]);
      }
    } else {
      setCurrentStroke([{ x, y, pressure }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && e.pointerType !== 'pen') {
      return;
    }

    if (!isDrawingRef.current) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pressure && e.pressure > 0 ? Math.max(0.12, Math.min(1.0, e.pressure)) : 0.5;

    if (tool === 'eraser') {
      const remaining = strokes.filter(
        (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 2.5)
      );
      if (remaining.length !== strokes.length) {
        onChangeStrokes(remaining);
      }
    } else if (tool === 'selector') {
      if (isDraggingSelection && dragStartPos.current) {
        const dx = x - dragStartPos.current.x;
        const dy = y - dragStartPos.current.y;

        // Move all selected strokes by delta
        const updated = strokes.map((s) => {
          if (selectedStrokeIds.includes(s.id) && (s.pageIndex ?? 0) === pageIndex) {
            return {
              ...s,
              points: s.points.map((p) => ({
                ...p,
                x: p.x + dx,
                y: p.y + dy,
              })),
            };
          }
          return s;
        });

        dragStartPos.current = { x, y };
        onChangeStrokes(updated);
      } else if (lassoPath) {
        // Continue drawing irregular lasso boundary
        setLassoPath((prev) => (prev ? [...prev, { x, y, pressure }] : [{ x, y, pressure }]));
      }
    } else if (currentStroke) {
      setCurrentStroke((prev) => (prev ? [...prev, { x, y, pressure }] : [{ x, y, pressure }]));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && e.pointerType !== 'pen') {
      return;
    }

    isDrawingRef.current = false;

    if (tool === 'selector') {
      if (isDraggingSelection) {
        setIsDraggingSelection(false);
        dragStartPos.current = null;
      } else if (lassoPath && lassoPath.length > 2) {
        // Point-in-polygon freehand irregular lasso detection
        const selectedIds: string[] = [];
        for (const s of pageStrokes) {
          if (isStrokeInPolygon(s, lassoPath)) {
            selectedIds.push(s.id);
          }
        }
        setSelectedStrokeIds(selectedIds);
        setLassoPath(null);
      } else {
        setLassoPath(null);
      }
    } else if (currentStroke && currentStroke.length > 0) {
      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        points: currentStroke,
        color,
        size,
        tool,
        pageIndex,
        timestamp: Date.now(),
      };
      onChangeStrokes([...strokes, newStroke]);
      setCurrentStroke(null);
    }
  };

  // Actions on Selected Strokes
  const handleDeleteSelected = () => {
    const remaining = strokes.filter(
      (s) => !selectedStrokeIds.includes(s.id) || (s.pageIndex ?? 0) !== pageIndex
    );
    onChangeStrokes(remaining);
    setSelectedStrokeIds([]);
  };

  const handleDuplicateSelected = () => {
    const duplicated: InkStroke[] = [];
    for (const s of pageStrokes) {
      if (selectedStrokeIds.includes(s.id)) {
        duplicated.push({
          ...s,
          id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          points: s.points.map((p) => ({ x: p.x + 20, y: p.y + 20, pressure: p.pressure })),
          timestamp: Date.now(),
        });
      }
    }
    onChangeStrokes([...strokes, ...duplicated]);
    setSelectedStrokeIds(duplicated.map((d) => d.id));
  };

  return (
    <div className={`relative w-full h-full select-none touch-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          isDrawingRef.current = false;
          setCurrentStroke(null);
          setLassoPath(null);
          setIsDraggingSelection(false);
        }}
        className="w-full h-full block cursor-crosshair touch-none"
      />

      {/* Floating Action Menu for Selected Strokes */}
      {selectedBounds && selectedStrokeIds.length > 0 && tool === 'selector' && (
        <div
          style={{
            position: 'absolute',
            left: `${selectedBounds.minX * zoom + panX}px`,
            top: `${Math.max(10, selectedBounds.minY * zoom + panY - 48)}px`,
            transform: 'translateY(-100%)',
          }}
          className="z-30 bg-slate-900/90 text-white backdrop-blur-md rounded-xl shadow-xl px-2 py-1.5 flex items-center gap-1.5 border border-slate-700 text-xs animate-in fade-in"
        >
          <span className="text-[10px] text-slate-300 font-semibold px-1">
            {selectedStrokeIds.length} ink strokes
          </span>

          <div className="h-4 w-px bg-slate-700" />

          <button
            type="button"
            onClick={handleDuplicateSelected}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors font-medium text-[11px]"
            title="Duplicate Selected Strokes"
          >
            <Copy className="w-3 h-3 text-indigo-400" />
            <span>Duplicate</span>
          </button>

          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1 px-2 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 hover:text-white rounded-lg transition-colors font-medium text-[11px]"
            title="Delete Selected Strokes"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStrokeIds([])}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Deselect"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
