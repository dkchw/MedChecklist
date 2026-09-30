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
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Active in-progress stroke points kept in ref for 0-lag 120 FPS rendering without React re-renders
  const activePointsRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  // Irregular Freehand Lasso Selector state
  const activeLassoRef = useRef<StrokePoint[]>([]);
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const isDraggingSelectionRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

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

  // Convert client pointer coordinates to canvas virtual coordinate space
  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? (canvas.clientWidth || rect.width) / rect.width : 1;
      const scaleY = rect.height > 0 ? (canvas.clientHeight || rect.height) / rect.height : 1;
      const localX = (clientX - rect.left) * scaleX;
      const localY = (clientY - rect.top) * scaleY;
      return {
        x: (localX - panX) / (zoom || 1),
        y: (localY - panY) / (zoom || 1),
      };
    },
    [panX, panY, zoom]
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
    if (buffer) {
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
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
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
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      const pad = 8 / zoom;
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

  // Setup HiDPI Canvas Dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth || rect.width || 300;
      const cssH = canvas.clientHeight || rect.height || 300;
      const newWidth = Math.round(cssW * dpr);
      const newHeight = Math.round(cssH * dpr);

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
      }
      updateBackgroundBuffer();
      renderDisplay();
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

  // CRITICAL: Prevent browser from hijacking touch/pen events as scroll/gesture.
  // CSS touch-action:none is NOT sufficient on Android WebView — JS-level preventDefault()
  // on touchstart/touchmove is required to stop the gesture recognizer from firing
  // pointercancel events which kill in-progress strokes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouch = (e: TouchEvent) => {
      // Only prevent default when we're actively drawing or the tool requires it
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // { passive: false } is required to allow preventDefault() in touch handlers
    canvas.addEventListener('touchstart', preventTouch, { passive: false });
    canvas.addEventListener('touchmove', preventTouch, { passive: false });
    canvas.addEventListener('touchend', preventTouch, { passive: false });
    canvas.addEventListener('contextmenu', preventContextMenu);

    return () => {
      canvas.removeEventListener('touchstart', preventTouch);
      canvas.removeEventListener('touchmove', preventTouch);
      canvas.removeEventListener('touchend', preventTouch);
      canvas.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

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
  const isPenEraserActive = (e: React.PointerEvent<HTMLCanvasElement> | PointerEvent): boolean => {
    return (
      (e.pointerType as string) === 'eraser' ||
      ((e.pointerType as string) === 'pen' &&
        ((e.buttons & 2) !== 0 ||
          (e.buttons & 4) !== 0 ||
          (e.buttons & 32) !== 0 ||
          e.button === 2 ||
          e.button === 5 ||
          (e as any).altKey))
    );
  };

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Palm Rejection Guard
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
      if (
        selectedBounds &&
        x >= selectedBounds.minX - 12 &&
        x <= selectedBounds.maxX + 12 &&
        y >= selectedBounds.minY - 12 &&
        y <= selectedBounds.maxY + 12
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

  // Pointer Move (Zero-Lag with Coalesced Events & RAF Scheduling)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') return;
    if (!isDrawingRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    // Use coalesced events to capture full digitizer sample rate without latency
    const coalescedEvents = (e.nativeEvent as any).getCoalescedEvents
      ? (e.nativeEvent as any).getCoalescedEvents()
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

  // Pointer Up (Commit Stroke Once)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (penOnlyMode && (e.pointerType as string) !== 'pen' && (e.pointerType as string) !== 'eraser') return;
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
        scheduleRender();
      } else if (activeLassoRef.current.length > 2) {
        const lasso = activeLassoRef.current;
        const selectedIds: string[] = [];
        for (const s of pageStrokes) {
          if (isStrokeInPolygon(s, lasso)) {
            selectedIds.push(s.id);
          }
        }
        setSelectedStrokeIds(selectedIds);
        activeLassoRef.current = [];
        scheduleRender();
      } else {
        activeLassoRef.current = [];
        scheduleRender();
      }
    } else if (activePointsRef.current.length > 0) {
      // Check if stylus tapped or ticked a checklist item element underneath
      const elements = typeof document !== 'undefined' ? document.elementsFromPoint(e.clientX, e.clientY) : [];
      let checkedItem = false;
      for (const el of elements) {
        if (el === canvasRef.current) continue;
        const target = el.closest('[data-checklist-item]');
        if (target) {
          (target as HTMLElement).click();
          checkedItem = true;
          break;
        }
      }

      // If it was a quick tap or small tick that successfully toggled the item, clean up without committing stray ink mark
      if (checkedItem && activePointsRef.current.length <= 8) {
        activePointsRef.current = [];
        scheduleRender();
        return;
      }

      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        points: [...activePointsRef.current],
        color,
        size,
        tool,
        pageIndex,
        timestamp: Date.now(),
      };
      activePointsRef.current = [];
      onChangeStrokes([...strokes, newStroke]);
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

  const wrapperClass = className.includes('absolute')
    ? `w-full h-full select-none touch-none ${className}`
    : `relative w-full h-full select-none touch-none ${className}`;

  return (
    <div className={wrapperClass} style={{ touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        onPointerCancel={() => {
          // Commit in-flight stroke if valid to prevent gesture cancellation data loss on Android
          if (isDrawingRef.current && activePointsRef.current.length > 1 && tool !== 'eraser' && tool !== 'selector') {
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
        }}
        className="w-full h-full block cursor-crosshair touch-none"
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
