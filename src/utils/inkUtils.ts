import { getStroke } from 'perfect-freehand';
import { InkStroke, StrokePoint, PenTool } from '../types/ink';

export function getSvgPathFromStroke(strokePoints: number[][]): string {
  if (!strokePoints.length) return '';

  const d: (string | number)[] = ['M', strokePoints[0][0], strokePoints[0][1], 'Q'];
  for (let i = 0; i < strokePoints.length; i++) {
    const [x0, y0] = strokePoints[i];
    const [x1, y1] = strokePoints[(i + 1) % strokePoints.length];
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  d.push('Z');
  return d.join(' ');
}

export function pointsToSvgPath(
  strokePoints: StrokePoint[],
  size: number = 3,
  tool: PenTool = 'pen'
): string {
  if (!strokePoints || strokePoints.length === 0) return '';

  if (strokePoints.length === 1) {
    const p = strokePoints[0];
    const r = Math.max(1, size / 2);
    return `M ${p.x - r} ${p.y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
  }

  const hasHardwarePressure = strokePoints.some(
    (p) => p.pressure !== undefined && p.pressure > 0 && p.pressure !== 0.5
  );

  const points = strokePoints.map((p) => {
    const pres = p.pressure && p.pressure > 0 ? Math.max(0.12, Math.min(1.0, p.pressure)) : 0.5;
    return [p.x, p.y, pres];
  });

  let outline: number[][] = [];
  try {
    outline = getStroke(points, {
      size: tool === 'highlighter' ? size * 2.2 : size,
      thinning: tool === 'highlighter' ? 0 : 0.6,
      smoothing: 0.72,
      streamline: 0.58,
      simulatePressure: !hasHardwarePressure,
      start: {
        taper: tool === 'highlighter' ? 0 : size * 0.4,
        cap: true,
      },
      end: {
        taper: tool === 'highlighter' ? 0 : size * 0.4,
        cap: true,
      },
    });
  } catch (err) {
    console.warn('perfect-freehand getStroke failed, using fallback path:', err);
  }

  if (!outline || !outline.length) {
    // Fallback: simple polyline with stroke-width
    const validPoints = points.filter(p => !isNaN(p[0]) && !isNaN(p[1]));
    if (!validPoints.length) return '';
    const d = validPoints.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
    return d ? `${d}` : '';
  }

  const svgPath = getSvgPathFromStroke(outline);
  if (svgPath.includes('NaN')) {
    console.error('SVG Path contains NaN:', svgPath);
    return '';
  }
  return svgPath;
}

export function strokeToSvgPath(stroke: InkStroke): string {
  return pointsToSvgPath(stroke.points, stroke.size, stroke.tool);
}

export function drawStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  scale: number = 1
) {
  if (!stroke.points || stroke.points.length === 0) return;

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const renderColor = getAdaptiveInkColor(stroke.color, isDark);

  ctx.save();

  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = renderColor;
    ctx.strokeStyle = renderColor;
  } else {
    ctx.globalAlpha = stroke.opacity ?? 1.0;
    ctx.fillStyle = renderColor;
    ctx.strokeStyle = renderColor;
  }

  // Handle single-point dot (tap)
  if (stroke.points.length === 1) {
    const pt = stroke.points[0];
    const r = Math.max(1, (stroke.size * scale) / 2);
    ctx.beginPath();
    ctx.arc(pt.x * scale, pt.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Generate smooth polygon outline with perfect-freehand
  try {
    const hasHardwarePressure = stroke.points.some(
      (p) => p.pressure !== undefined && p.pressure > 0 && p.pressure !== 0.5
    );

    const points = stroke.points.map((p) => {
      const pres = p.pressure && p.pressure > 0 ? Math.max(0.12, Math.min(1.0, p.pressure)) : 0.5;
      return [p.x * scale, p.y * scale, pres];
    });

    const outline = getStroke(points, {
      size: stroke.size * scale,
      thinning: stroke.tool === 'highlighter' ? 0 : 0.6,
      smoothing: 0.72,
      streamline: 0.58,
      simulatePressure: !hasHardwarePressure,
      start: {
        taper: stroke.tool === 'highlighter' ? 0 : stroke.size * scale * 0.4,
        cap: true,
      },
      end: {
        taper: stroke.tool === 'highlighter' ? 0 : stroke.size * scale * 0.4,
        cap: true,
      },
    });

    if (outline && outline.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i++) {
        ctx.lineTo(outline[i][0], outline[i][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
  } catch (_) {
    // Fallback to native Bézier curve stroke below
  }

  // Direct quadratic Bézier path fail-safe fallback
  ctx.lineWidth = stroke.size * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const pts = stroke.points;
  ctx.moveTo(pts[0].x * scale, pts[0].y * scale);
  for (let i = 1; i < pts.length; i++) {
    const midX = ((pts[i - 1].x + pts[i].x) / 2) * scale;
    const midY = ((pts[i - 1].y + pts[i].y) / 2) * scale;
    ctx.quadraticCurveTo(pts[i - 1].x * scale, pts[i - 1].y * scale, midX, midY);
  }
  ctx.lineTo(pts[pts.length - 1].x * scale, pts[pts.length - 1].y * scale);
  ctx.stroke();

  ctx.restore();
}

/**
 * Returns an ink color adapted to the current theme so text/strokes are visible in both light and dark modes
 */
export function getAdaptiveInkColor(color: string, isDark: boolean): string {
  if (!color) return isDark ? '#f8fafc' : '#0f172a';

  // If black or near-black ink in dark mode, adapt to white/light slate
  if (isDark && (color === '#0f172a' || color === '#000000' || color === '#1e293b' || color === '#334155')) {
    return '#f8fafc';
  }
  // If white or near-white ink in light mode, adapt to dark slate
  if (!isDark && (color === '#f8fafc' || color === '#ffffff' || color === '#f1f5f9' || color === '#e2e8f0')) {
    return '#0f172a';
  }
  return color;
}

/**
 * Checks if a point is close to any point in a stroke (for eraser tool)
 */
export function isPointNearStroke(
  point: { x: number; y: number },
  stroke: InkStroke,
  threshold: number = 20
): boolean {
  for (const p of stroke.points) {
    const dx = p.x - point.x;
    const dy = p.y - point.y;
    if (dx * dx + dy * dy <= threshold * threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Point-in-polygon ray casting algorithm for irregular freehand lasso selection
 */
export function isPointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[]
): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks if a stroke is enclosed or intersects an irregular lasso polygon
 */
export function isStrokeInPolygon(
  stroke: InkStroke,
  polygon: { x: number; y: number }[]
): boolean {
  if (polygon.length < 3 || !stroke.points || stroke.points.length === 0) return false;

  // Check if any point of the stroke is inside the polygon
  for (const pt of stroke.points) {
    if (isPointInPolygon(pt, polygon)) {
      return true;
    }
  }

  // Also check average center point
  const avgX = stroke.points.reduce((sum, p) => sum + p.x, 0) / stroke.points.length;
  const avgY = stroke.points.reduce((sum, p) => sum + p.y, 0) / stroke.points.length;
  return isPointInPolygon({ x: avgX, y: avgY }, polygon);
}
