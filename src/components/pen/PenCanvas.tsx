import React, { useRef, useEffect, useState, useCallback } from 'react';
import { InkStroke, PenTool, StrokePoint } from '../../types/ink';
import { drawStrokeOnCanvas, isPointNearStroke } from '../../utils/inkUtils';

interface PenCanvasProps {
  strokes: InkStroke[];
  onChangeStrokes: (strokes: InkStroke[]) => void;
  tool: PenTool;
  color: string;
  size: number;
  className?: string;
}

export const PenCanvas: React.FC<PenCanvasProps> = ({
  strokes,
  onChangeStrokes,
  tool,
  color,
  size,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[] | null>(null);
  const isDrawingRef = useRef(false);

  // Redraw all strokes on canvas
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved strokes
    for (const stroke of strokes) {
      drawStrokeOnCanvas(ctx, stroke);
    }

    // Draw active stroke being currently drawn
    if (currentStroke && currentStroke.length > 0 && tool !== 'eraser') {
      const activeStrokeObj: InkStroke = {
        id: 'active',
        points: currentStroke,
        color,
        size,
        tool,
        timestamp: Date.now(),
      };
      drawStrokeOnCanvas(ctx, activeStrokeObj);
    }
  }, [strokes, currentStroke, tool, color, size]);

  // Adjust canvas size to parent container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Handle high-DPI displays (tablets)
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

  // Pointer event handlers with hardware pen pressure support
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Palm rejection: allow pen or mouse or single finger touch
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser') {
      // Erase any stroke touching this point
      const filtered = strokes.filter(s => !isPointNearStroke({ x, y }, s, size * 2));
      if (filtered.length !== strokes.length) {
        onChangeStrokes(filtered);
      }
    } else {
      setCurrentStroke([{ x, y, pressure }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser') {
      const filtered = strokes.filter(s => !isPointNearStroke({ x, y }, s, size * 2));
      if (filtered.length !== strokes.length) {
        onChangeStrokes(filtered);
      }
    } else {
      setCurrentStroke(prev => (prev ? [...prev, { x, y, pressure }] : [{ x, y, pressure }]));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (tool !== 'eraser' && currentStroke && currentStroke.length > 1) {
      const newStroke: InkStroke = {
        id: 'stroke-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        points: currentStroke,
        color,
        size,
        tool,
        timestamp: Date.now(),
      };
      onChangeStrokes([...strokes, newStroke]);
    }
    setCurrentStroke(null);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
      className={`absolute inset-0 z-20 cursor-crosshair ${className}`}
    />
  );
};
