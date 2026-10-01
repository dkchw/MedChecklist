import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { InkStroke, PenTool, StrokePoint } from '../../types/ink';
import {
  strokeToSvgPath,
  pointsToSvgPath,
  getAdaptiveInkColor,
  isPointNearStroke,
  isStrokeInPolygon,
} from '../../utils/inkUtils';
import { Copy, Trash2, X } from 'lucide-react';

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

/**
 * Modern Vector SVG Inking Engine.
 * Replaces fragile HTML5 Canvas 2D rasterization with pure hardware-accelerated vector SVG.
 * Immune to GPU texture size limits, device pixel ratio scaling artifacts, or blank-screen resets on Android WebView.
 */
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
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Active in-progress stroke points
  const [activePoints, setActivePoints] = useState<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  // Lasso Selector state
  const [activeLasso, setActiveLasso] = useState<StrokePoint[]>([]);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const isDraggingSelectionRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Theme detection
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const activeAdaptiveColor = getAdaptiveInkColor(color, isDark);

  // Filter strokes belonging to current page
  const pageStrokes = useMemo(
    () => strokes.filter((s) => (s.pageIndex ?? 0) === pageIndex),
    [strokes, pageIndex]
  );

  // Memoized SVG paths for all committed page strokes
  const strokePathMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of pageStrokes) {
      map.set(s.id, strokeToSvgPath(s));
    }
    return map;
  }, [pageStrokes]);

  // Calculate bounding box of selected strokes
  const selectedBounds = useMemo((): SelectionBounds | null => {
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
  }, [pageStrokes, selectedStrokeIds]);

  // Convert screen pointer coordinates to canvas virtual coordinate space
  const getVirtualCoords = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const zm = zoom || 1;
      return {
        x: (localX - panX) / zm,
        y: (localY - panY) / zm,
      };
    },
    [panX, panY, zoom]
  );

  // Helper to detect stylus barrel / side eraser button
  const isPenEraserActive = (e: React.PointerEvent<SVGSVGElement>): boolean => {
    return (
      (e.pointerType as string) === 'eraser' ||
      (e.pointerType === 'pen' &&
        ((e.buttons & 2) !== 0 ||
          (e.buttons & 4) !== 0 ||
          (e.buttons & 32) !== 0 ||
          e.button === 2 ||
          e.button === 5 ||
          (e as any).altKey))
    );
  };

  // POINTER DOWN
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Palm Rejection: reject finger touch when pen-only mode is active
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') {
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;

    try {
      svg.setPointerCapture(e.pointerId);
    } catch (_) {}

    if (e.cancelable) {
      e.preventDefault();
    }

    isDrawingRef.current = true;

    const { x, y } = getVirtualCoords(e.clientX, e.clientY);
    const pressure = e.pressure && e.pressure > 0 ? Math.max(0.12, Math.min(1.0, e.pressure)) : 0.5;

    const isEraser = tool === 'eraser' || isPenEraserActive(e);

    if (isEraser) {
      setActivePoints([]);
      const remaining = strokes.filter(
        (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 3)
      );
      if (remaining.length !== strokes.length) {
        onChangeStrokes(remaining);
      }
    } else if (tool === 'selector') {
      if (
        selectedBounds &&
        x >= selectedBounds.minX - 12 &&
        x <= selectedBounds.maxX + 12 &&
        y >= selectedBounds.minY - 12 &&
        y <= selectedBounds.maxY + 12
      ) {
        isDraggingSelectionRef.current = true;
        dragStartPosRef.current = { x, y };
        setDragDelta({ dx: 0, dy: 0 });
      } else {
        setSelectedStrokeIds([]);
        setActiveLasso([{ x, y, pressure }]);
      }
    } else {
      setActivePoints([{ x, y, pressure }]);
    }
  };

  // POINTER MOVE
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') return;

    if (e.cancelable) {
      e.preventDefault();
    }

    // Capture coalesced events if available for high-rate 120Hz/240Hz digitizers
    let coalescedEvents: any[] = [e];
    try {
      if ((e.nativeEvent as any).getCoalescedEvents) {
        coalescedEvents = (e.nativeEvent as any).getCoalescedEvents();
      }
    } catch (err) {
      console.warn('getCoalescedEvents failed:', err);
    }
      
    // Android WebView bug: getCoalescedEvents() exists but sometimes returns an empty array or throws!
    if (!coalescedEvents || coalescedEvents.length === 0) {
      coalescedEvents = [e];
    }

    const isEraser = tool === 'eraser' || isPenEraserActive(e);

    if (isEraser) {
      for (const ev of coalescedEvents) {
        const { x, y } = getVirtualCoords(ev.clientX, ev.clientY);
        const remaining = strokes.filter(
          (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 3)
        );
        if (remaining.length !== strokes.length) {
          onChangeStrokes(remaining);
        }
      }
    } else if (tool === 'selector') {
      const { x, y } = getVirtualCoords(e.clientX, e.clientY);
      if (isDraggingSelectionRef.current && dragStartPosRef.current) {
        setDragDelta({
          dx: x - dragStartPosRef.current.x,
          dy: y - dragStartPosRef.current.y,
        });
      } else {
        setActiveLasso((prev) => [...prev, { x, y, pressure: 0.5 }]);
      }
    } else {
      const newPoints: StrokePoint[] = [];
      for (const ev of coalescedEvents) {
        const { x, y } = getVirtualCoords(ev.clientX, ev.clientY);
        const pressure = ev.pressure && ev.pressure > 0 ? Math.max(0.12, Math.min(1.0, ev.pressure)) : 0.5;
        newPoints.push({ x, y, pressure });
      }
      setActivePoints((prev) => [...prev, ...newPoints]);
    }
  };

  // POINTER UP
  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') return;
    if (!isDrawingRef.current) return;

    const svg = svgRef.current;
    if (svg) {
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    isDrawingRef.current = false;

    const isEraser = tool === 'eraser' || isPenEraserActive(e);
    if (isEraser) {
      setActivePoints([]);
      return;
    }

    if (tool === 'selector') {
      if (isDraggingSelectionRef.current) {
        if (dragDelta.dx !== 0 || dragDelta.dy !== 0) {
          const updated = strokes.map((s) => {
            if (selectedStrokeIds.includes(s.id) && (s.pageIndex ?? 0) === pageIndex) {
              return {
                ...s,
                points: s.points.map((p) => ({
                  ...p,
                  x: p.x + dragDelta.dx,
                  y: p.y + dragDelta.dy,
                })),
              };
            }
            return s;
          });
          onChangeStrokes(updated);
        }
        isDraggingSelectionRef.current = false;
        dragStartPosRef.current = null;
        setDragDelta({ dx: 0, dy: 0 });
      } else if (activeLasso.length > 2) {
        const polygon = activeLasso.map((p) => ({ x: p.x, y: p.y }));
        const selected = strokes
          .filter((s) => (s.pageIndex ?? 0) === pageIndex && isStrokeInPolygon(s, polygon))
          .map((s) => s.id);
        setSelectedStrokeIds(selected);
        setActiveLasso([]);
      } else {
        setActiveLasso([]);
        setSelectedStrokeIds([]);
      }
      return;
    }

    // Commit Inking Stroke
    if (activePoints.length > 0) {
      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        points: [...activePoints],
        color,
        size,
        tool,
        pageIndex,
        timestamp: Date.now(),
      };
      onChangeStrokes([...strokes, newStroke]);
    }

    setActivePoints([]);
  };

  // POINTER CANCEL: Never lose in-progress user work
  const handlePointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg) {
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (isDrawingRef.current && activePoints.length > 0 && tool !== 'eraser' && tool !== 'selector') {
      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        points: [...activePoints],
        color,
        size,
        tool,
        pageIndex,
        timestamp: Date.now(),
      };
      onChangeStrokes([...strokes, newStroke]);
    }

    isDrawingRef.current = false;
    setActivePoints([]);
    setActiveLasso([]);
    isDraggingSelectionRef.current = false;
    setDragDelta({ dx: 0, dy: 0 });
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

  // Compute active in-progress SVG path
  const activeStrokePath = useMemo(() => {
    if (activePoints.length === 0 || tool === 'eraser' || tool === 'selector') return '';
    return pointsToSvgPath(activePoints, size, tool);
  }, [activePoints, size, tool]);

  // Compute lasso polygon points string
  const lassoPointsString = useMemo(() => {
    if (activeLasso.length < 2) return '';
    return activeLasso.map((p) => `${p.x},${p.y}`).join(' ');
  }, [activeLasso]);

  const wrapperClass = className.includes('absolute')
    ? `w-full h-full select-none touch-none ${className}`
    : `relative w-full h-full select-none touch-none ${className}`;

  return (
    <div className={wrapperClass} style={{ touchAction: 'none' }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block cursor-crosshair touch-none select-none overflow-hidden"
        style={{ touchAction: 'none', WebkitUserSelect: 'none' }}
      >
        <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
          {/* 1. Committed Page Strokes */}
          {pageStrokes.map((s) => {
            const isSelected = selectedStrokeIds.includes(s.id);
            const dx = isSelected && isDraggingSelectionRef.current ? dragDelta.dx : 0;
            const dy = isSelected && isDraggingSelectionRef.current ? dragDelta.dy : 0;
            const pathD = strokePathMap.get(s.id) || '';
            if (!pathD) return null;

            const strokeColor = getAdaptiveInkColor(s.color, isDark);
            const opacity = s.tool === 'highlighter' ? 0.35 : (s.opacity ?? 1.0);

            return (
              <path
                key={s.id}
                d={pathD}
                fill={strokeColor}
                opacity={opacity}
                transform={dx !== 0 || dy !== 0 ? `translate(${dx}, ${dy})` : undefined}
                className="transition-opacity"
              />
            );
          })}

          {/* 2. Active In-Progress Vector Stroke */}
          {activeStrokePath && (
            <path
              d={activeStrokePath}
              fill={activeAdaptiveColor}
              opacity={tool === 'highlighter' ? 0.35 : 1.0}
            />
          )}

          {/* 3. Active Lasso Selection Polygon */}
          {lassoPointsString && (
            <polygon
              points={lassoPointsString}
              fill="rgba(99, 102, 241, 0.08)"
              stroke="#6366f1"
              strokeWidth={2 / (zoom || 1)}
              strokeDasharray={`${6 / (zoom || 1)}, ${4 / (zoom || 1)}`}
            />
          )}

          {/* 4. Selection Bounding Marquee */}
          {selectedBounds && tool === 'selector' && (
            <rect
              x={selectedBounds.minX + dragDelta.dx - 8 / (zoom || 1)}
              y={selectedBounds.minY + dragDelta.dy - 8 / (zoom || 1)}
              width={selectedBounds.maxX - selectedBounds.minX + 16 / (zoom || 1)}
              height={selectedBounds.maxY - selectedBounds.minY + 16 / (zoom || 1)}
              fill="none"
              stroke="#4f46e5"
              strokeWidth={2 / (zoom || 1)}
              strokeDasharray={`${6 / (zoom || 1)}, ${4 / (zoom || 1)}`}
              rx={6 / (zoom || 1)}
            />
          )}
        </g>
      </svg>

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
          <span className="text-[10px] text-slate-400 font-mono px-1">
            {selectedStrokeIds.length} selected
          </span>

          <button
            onClick={handleDuplicateSelected}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            title="Duplicate Selected Strokes"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px]">Duplicate</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            className="p-1.5 hover:bg-red-950/80 rounded-lg text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
            title="Delete Selected Strokes"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Delete</span>
          </button>

          <button
            onClick={() => setSelectedStrokeIds([])}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white ml-1 transition-colors cursor-pointer"
            title="Deselect"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
