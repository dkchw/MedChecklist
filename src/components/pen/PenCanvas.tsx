import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { InkStroke, PenTool, StrokePoint } from '../../types/ink';
import { drawStrokeOnCanvas, isPointNearStroke, isStrokeInPolygon } from '../../utils/inkUtils';
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
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Active in-progress stroke points kept in ref for zero-lag 120 FPS rendering
  const activePointsRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  // Irregular Freehand Lasso Selector state
  const activeLassoRef = useRef<StrokePoint[]>([]);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const isDraggingSelectionRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Refs for current props to avoid stale closures in native DOM event listeners
  const propsRef = useRef({
    strokes,
    onChangeStrokes,
    tool,
    color,
    size,
    pageIndex,
    panX,
    panY,
    zoom,
    penOnlyMode,
  });

  useEffect(() => {
    propsRef.current = {
      strokes,
      onChangeStrokes,
      tool,
      color,
      size,
      pageIndex,
      panX,
      panY,
      zoom,
      penOnlyMode,
    };
  });

  // Filter strokes belonging to current page (memoized)
  const pageStrokes = useMemo(
    () => strokes.filter((s) => (s.pageIndex ?? 0) === pageIndex),
    [strokes, pageIndex]
  );

  // Calculate tight bounding box of selected strokes
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

  // Convert client pointer coordinates to canvas virtual coordinate space
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const pX = propsRef.current.panX;
      const pY = propsRef.current.panY;
      const zm = propsRef.current.zoom || 1;
      return {
        x: (localX - pX) / zm,
        y: (localY - pY) / zm,
      };
    },
    []
  );

  // 1. Render all committed strokes to the background buffer canvas
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

    bCtx.save();
    bCtx.scale(dpr, dpr);
    bCtx.translate(panX, panY);
    bCtx.scale(zoom, zoom);

    for (const stroke of pageStrokes) {
      drawStrokeOnCanvas(bCtx, stroke);
    }
    bCtx.restore();
  }, [pageStrokes, panX, panY, zoom]);

  // 2. Fast single-frame blit + active overlay render
  const renderDisplay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = bufferCanvasRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Blit pre-rendered background buffer in 1 hardware-accelerated drawImage call
    if (buffer && buffer.width > 0 && buffer.height > 0) {
      ctx.drawImage(buffer, 0, 0);
    }

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // If currently dragging selected strokes, render their preview with delta
    if (isDraggingSelectionRef.current && (dragDeltaRef.current.dx !== 0 || dragDeltaRef.current.dy !== 0)) {
      const { dx, dy } = dragDeltaRef.current;
      for (const s of pageStrokes) {
        if (selectedStrokeIds.includes(s.id)) {
          const previewStroke: InkStroke = {
            ...s,
            points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy, pressure: p.pressure })),
          };
          drawStrokeOnCanvas(ctx, previewStroke);
        }
      }
    }

    // Render active stroke currently being drawn with sub-millisecond vector pathing
    const pts = activePointsRef.current;
    if (pts.length > 0 && tool !== 'eraser' && tool !== 'selector') {
      const activeStrokeObj: InkStroke = {
        id: 'active',
        points: pts,
        color,
        size,
        tool,
        pageIndex,
        timestamp: 0,
      };
      drawStrokeOnCanvas(ctx, activeStrokeObj);
    }

    // Render active freehand lasso path
    const lasso = activeLassoRef.current;
    if (lasso.length > 1) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2 / (zoom || 1);
      ctx.setLineDash([6 / (zoom || 1), 4 / (zoom || 1)]);
      ctx.beginPath();
      ctx.moveTo(lasso[0].x, lasso[0].y);
      for (let i = 1; i < lasso.length; i++) {
        ctx.lineTo(lasso[i].x, lasso[i].y);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.closePath();
      ctx.fill();
      ctx.setLineDash([]);
    }

    // Render selection dashed marquee box
    if (selectedBounds && tool === 'selector') {
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2 / (zoom || 1);
      ctx.setLineDash([6 / (zoom || 1), 4 / (zoom || 1)]);
      const pad = 8 / (zoom || 1);
      const { dx, dy } = dragDeltaRef.current;
      ctx.strokeRect(
        selectedBounds.minX + dx - pad,
        selectedBounds.minY + dy - pad,
        selectedBounds.maxX - selectedBounds.minX + pad * 2,
        selectedBounds.maxY - selectedBounds.minY + pad * 2
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [color, pageIndex, pageStrokes, panX, panY, selectedBounds, selectedStrokeIds, size, tool, zoom]);

  // Request display frame on next animation frame
  const scheduleRender = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderDisplay();
    });
  }, [renderDisplay]);

  // Setup HiDPI Canvas Dimensions & Resize Observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || rect.width || 300;
      const cssH = canvas.clientHeight || rect.height || 300;
      const newWidth = Math.max(1, Math.round(cssW * dpr));
      const newHeight = Math.max(1, Math.round(cssH * dpr));

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        updateBackgroundBuffer();
        renderDisplay();
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [updateBackgroundBuffer, renderDisplay]);

  // Update background buffer whenever committed strokes or viewport transform changes
  useEffect(() => {
    updateBackgroundBuffer();
    renderDisplay();
  }, [updateBackgroundBuffer, renderDisplay]);

  // Re-render buffer canvas when dark/light mode class changes on html
  useEffect(() => {
    const observer = new MutationObserver(() => {
      updateBackgroundBuffer();
      renderDisplay();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [updateBackgroundBuffer, renderDisplay]);

  // Helper to detect if stylus barrel / eraser button is currently pressed
  const isPenEraserActive = (e: PointerEvent): boolean => {
    return (
      e.pointerType === 'eraser' ||
      (e.pointerType === 'pen' &&
        ((e.buttons & 2) !== 0 ||
          (e.buttons & 4) !== 0 ||
          (e.buttons & 32) !== 0 ||
          e.button === 2 ||
          e.button === 5 ||
          e.altKey))
    );
  };

  // NATIVE DOM POINTER EVENT PIPELINE:
  // Using direct DOM listeners with { passive: false } ensures 100% reliable touch & stylus capture
  // on Android WebView, iOS Safari, desktop browsers, avoiding React synthetic event bubbling quirks.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      const { penOnlyMode, tool, size, pageIndex, strokes, onChangeStrokes } = propsRef.current;

      // Palm Rejection Guard
      if (penOnlyMode && e.pointerType !== 'pen' && e.pointerType !== 'eraser') {
        return;
      }

      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}

      if (e.cancelable) {
        e.preventDefault();
      }

      isDrawingRef.current = true;

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const pressure = e.pressure && e.pressure > 0 ? Math.max(0.12, Math.min(1.0, e.pressure)) : 0.5;

      const isEraser = tool === 'eraser' || isPenEraserActive(e);

      if (isEraser) {
        activePointsRef.current = [];
        const remaining = strokes.filter(
          (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 2.5)
        );
        if (remaining.length !== strokes.length) {
          onChangeStrokes(remaining);
        }
        scheduleRender();
      } else if (tool === 'selector') {
        const bounds = selectedBounds;
        if (
          bounds &&
          x >= bounds.minX - 12 &&
          x <= bounds.maxX + 12 &&
          y >= bounds.minY - 12 &&
          y <= bounds.maxY + 12
        ) {
          isDraggingSelectionRef.current = true;
          dragStartPosRef.current = { x, y };
          dragDeltaRef.current = { dx: 0, dy: 0 };
        } else {
          setSelectedStrokeIds([]);
          activeLassoRef.current = [{ x, y, pressure }];
          scheduleRender();
        }
      } else {
        activePointsRef.current = [{ x, y, pressure }];
        scheduleRender();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const { penOnlyMode, tool, size, pageIndex, strokes, onChangeStrokes } = propsRef.current;

      if (!isDrawingRef.current) return;
      if (penOnlyMode && e.pointerType !== 'pen' && e.pointerType !== 'eraser') return;

      if (e.cancelable) {
        e.preventDefault();
      }

      // Capture all high-frequency digitizer samples via coalesced events if available
      const coalescedEvents = (e as any).getCoalescedEvents
        ? (e as any).getCoalescedEvents()
        : [e];

      for (const ev of coalescedEvents) {
        const { x, y } = getCanvasCoords(ev.clientX, ev.clientY);
        const pressure = ev.pressure && ev.pressure > 0 ? Math.max(0.12, Math.min(1.0, ev.pressure)) : 0.5;

        const isEraser = tool === 'eraser' || isPenEraserActive(ev);

        if (isEraser) {
          activePointsRef.current = [];
          const remaining = strokes.filter(
            (s) => (s.pageIndex ?? 0) !== pageIndex || !isPointNearStroke({ x, y }, s, size * 2.5)
          );
          if (remaining.length !== strokes.length) {
            onChangeStrokes(remaining);
          }
          scheduleRender();
        } else if (tool === 'selector') {
          if (isDraggingSelectionRef.current && dragStartPosRef.current) {
            dragDeltaRef.current = {
              dx: x - dragStartPosRef.current.x,
              dy: y - dragStartPosRef.current.y,
            };
            scheduleRender();
          } else if (activeLassoRef.current.length > 0) {
            activeLassoRef.current.push({ x, y, pressure });
            scheduleRender();
          }
        } else {
          activePointsRef.current.push({ x, y, pressure });
          scheduleRender();
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const { penOnlyMode, tool, color, size, pageIndex, strokes, onChangeStrokes } = propsRef.current;

      if (penOnlyMode && e.pointerType !== 'pen' && e.pointerType !== 'eraser') return;
      if (!isDrawingRef.current) return;

      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}

      isDrawingRef.current = false;

      const isEraser = tool === 'eraser' || isPenEraserActive(e);
      if (isEraser) {
        activePointsRef.current = [];
        scheduleRender();
        return;
      }

      if (tool === 'selector') {
        if (isDraggingSelectionRef.current) {
          const { dx, dy } = dragDeltaRef.current;
          if (dx !== 0 || dy !== 0) {
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
            onChangeStrokes(updated);
          }
          isDraggingSelectionRef.current = false;
          dragStartPosRef.current = null;
          dragDeltaRef.current = { dx: 0, dy: 0 };
        } else if (activeLassoRef.current.length > 2) {
          const polygon = activeLassoRef.current.map((p) => ({ x: p.x, y: p.y }));
          const selected = strokes
            .filter((s) => (s.pageIndex ?? 0) === pageIndex && isStrokeInPolygon(s, polygon))
            .map((s) => s.id);
          setSelectedStrokeIds(selected);
          activeLassoRef.current = [];
        } else {
          activeLassoRef.current = [];
          setSelectedStrokeIds([]);
        }
        scheduleRender();
        return;
      }

      // Commit Inking Stroke
      if (activePointsRef.current.length > 0) {
        const newStroke: InkStroke = {
          id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          points: [...activePointsRef.current],
          color,
          size,
          tool,
          pageIndex,
          timestamp: Date.now(),
        };
        onChangeStrokes([...strokes, newStroke]);
      }

      activePointsRef.current = [];
      scheduleRender();
    };

    const onPointerCancel = (e: PointerEvent) => {
      const { tool, color, size, pageIndex, strokes, onChangeStrokes } = propsRef.current;

      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}

      // Preserve stroke data on gesture cancel so user never loses written ink
      if (isDrawingRef.current && activePointsRef.current.length > 0 && tool !== 'eraser' && tool !== 'selector') {
        const newStroke: InkStroke = {
          id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          points: [...activePointsRef.current],
          color,
          size,
          tool,
          pageIndex,
          timestamp: Date.now(),
        };
        onChangeStrokes([...strokes, newStroke]);
      }

      isDrawingRef.current = false;
      activePointsRef.current = [];
      activeLassoRef.current = [];
      isDraggingSelectionRef.current = false;
      dragDeltaRef.current = { dx: 0, dy: 0 };
      scheduleRender();
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp, { passive: false });
    canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }, [getCanvasCoords, scheduleRender, selectedBounds, selectedStrokeIds]);

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

  const wrapperClass = className.includes('absolute')
    ? `w-full h-full select-none touch-none ${className}`
    : `relative w-full h-full select-none touch-none ${className}`;

  return (
    <div className={wrapperClass} style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-crosshair touch-none select-none"
        style={{ touchAction: 'none' }}
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
          <span className="text-[10px] text-slate-400 font-mono px-1">
            {selectedStrokeIds.length} selected
          </span>

          <button
            onClick={handleDuplicateSelected}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white flex items-center gap-1 transition-colors"
            title="Duplicate Selected Strokes"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px]">Duplicate</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            className="p-1.5 hover:bg-red-950/80 rounded-lg text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
            title="Delete Selected Strokes"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Delete</span>
          </button>

          <button
            onClick={() => setSelectedStrokeIds([])}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white ml-1 transition-colors"
            title="Deselect"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
