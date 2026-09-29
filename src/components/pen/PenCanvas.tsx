import React, { useRef, useEffect, useState, useCallback } from 'react';
import { InkStroke, PenTool, StrokePoint } from '../../types/ink';
import { drawStrokeOnCanvas, isPointNearStroke } from '../../utils/inkUtils';
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[] | null>(null);
  const isDrawingRef = useRef(false);

  // Selector state
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // Filter strokes belonging to current page
  const pageStrokes = strokes.filter((s) => (s.pageIndex ?? 0) === pageIndex);

  // Calculate bounding box of selected strokes
  const getSelectedBounds = (): SelectionBounds | null => {
    if (selectedStrokeIds.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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

  // Redraw all strokes on canvas
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
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

    // Draw marquee selection box
    if (selectionBox) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      const x = Math.min(selectionBox.startX, selectionBox.endX);
      const y = Math.min(selectionBox.startY, selectionBox.endY);
      const w = Math.abs(selectionBox.endX - selectionBox.startX);
      const h = Math.abs(selectionBox.endY - selectionBox.startY);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    // Highlight selected strokes bounding box
    if (selectedBounds && tool === 'selector') {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 3 / zoom]);
      const pad = 6 / zoom;
      ctx.strokeRect(
        selectedBounds.minX - pad,
        selectedBounds.minY - pad,
        selectedBounds.maxX - selectedBounds.minX + pad * 2,
        selectedBounds.maxY - selectedBounds.minY + pad * 2
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [pageStrokes, currentStroke, tool, color, size, panX, panY, zoom, selectionBox, selectedBounds, pageIndex]);

  // Handle canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();

      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
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

  // Convert screen coordinates to canvas space (accounting for pan and zoom)
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser') {
      const remaining = strokes.filter(
        (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 2)
      );
      if (remaining.length !== strokes.length) {
        onChangeStrokes(remaining);
      }
    } else if (tool === 'selector') {
      // Check if clicking inside current selected bounding box to start dragging
      if (
        selectedBounds &&
        x >= selectedBounds.minX - 10 &&
        x <= selectedBounds.maxX + 10 &&
        y >= selectedBounds.minY - 10 &&
        y <= selectedBounds.maxY + 10
      ) {
        setIsDraggingSelection(true);
        dragStartPos.current = { x, y };
      } else {
        // Start new selection marquee
        setSelectedStrokeIds([]);
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
      }
    } else {
      setCurrentStroke([{ x, y, pressure }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser') {
      const remaining = strokes.filter(
        (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 2)
      );
      if (remaining.length !== strokes.length) {
        onChangeStrokes(remaining);
      }
    } else if (tool === 'selector') {
      if (isDraggingSelection && dragStartPos.current) {
        const dx = x - dragStartPos.current.x;
        const dy = y - dragStartPos.current.y;
        dragStartPos.current = { x, y };

        // Translate selected strokes
        const updated = strokes.map((s) => {
          if (selectedStrokeIds.includes(s.id)) {
            return {
              ...s,
              points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
            };
          }
          return s;
        });
        onChangeStrokes(updated);
      } else if (selectionBox) {
        setSelectionBox((prev) => (prev ? { ...prev, endX: x, endY: y } : null));
      }
    } else {
      setCurrentStroke((prev) => (prev ? [...prev, { x, y, pressure }] : [{ x, y, pressure }]));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (tool === 'selector') {
      if (selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        // Find strokes inside or intersecting marquee
        const newlySelected: string[] = [];
        for (const s of pageStrokes) {
          const hasPointInside = s.points.some(
            (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
          );
          if (hasPointInside) {
            newlySelected.push(s.id);
          }
        }
        setSelectedStrokeIds(newlySelected);
        setSelectionBox(null);
      }
      setIsDraggingSelection(false);
      dragStartPos.current = null;
    } else if (tool !== 'eraser' && currentStroke && currentStroke.length > 1) {
      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        points: currentStroke,
        color,
        size,
        tool,
        pageIndex,
        timestamp: Date.now(),
      };
      onChangeStrokes([...strokes, newStroke]);
      setCurrentStroke(null);
    } else {
      setCurrentStroke(null);
    }
  };

  // Selector Action Handlers
  const handleDeleteSelected = () => {
    const remaining = strokes.filter((s) => !selectedStrokeIds.includes(s.id));
    onChangeStrokes(remaining);
    setSelectedStrokeIds([]);
  };

  const handleDuplicateSelected = () => {
    const duplicated: InkStroke[] = [];
    for (const s of pageStrokes) {
      if (selectedStrokeIds.includes(s.id)) {
        duplicated.push({
          ...s,
          id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          points: s.points.map((p) => ({ ...p, x: p.x + 20, y: p.y + 20 })),
          timestamp: Date.now(),
        });
      }
    }
    onChangeStrokes([...strokes, ...duplicated]);
    setSelectedStrokeIds(duplicated.map((d) => d.id));
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-auto">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        className={`w-full h-full block ${
          tool === 'selector' ? 'cursor-move' : tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
        } ${className}`}
      />

      {/* Floating Selector Action Bar */}
      {tool === 'selector' && selectedBounds && selectedStrokeIds.length > 0 && (
        <div
          className="absolute z-30 flex items-center gap-1.5 bg-slate-900/90 text-white text-xs px-2.5 py-1.5 rounded-xl shadow-xl backdrop-blur-xs border border-slate-700 animate-in fade-in"
          style={{
            left: `${Math.max(10, selectedBounds.minX * zoom + panX)}px`,
            top: `${Math.max(10, (selectedBounds.minY - 35) * zoom + panY)}px`,
          }}
        >
          <span className="text-[11px] text-indigo-300 font-medium mr-1 flex items-center gap-1">
            <Move className="w-3 h-3" />
            <span>{selectedStrokeIds.length} strokes</span>
          </span>
          <button
            type="button"
            onClick={handleDuplicateSelected}
            className="p-1 hover:bg-slate-700 rounded text-slate-200 hover:text-white"
            title="Duplicate Selected"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="p-1 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300"
            title="Delete Selected"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedStrokeIds([])}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Deselect"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
