import { getStroke } from 'perfect-freehand';
import { InkStroke, StrokePoint } from '../types/ink';

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

export function drawStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: InkStroke,
  scale: number = 1
) {
  if (!stroke.points || stroke.points.length === 0) return;

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

  const pathData = getSvgPathFromStroke(outline);
  if (!pathData) return;

  const path = new Path2D(pathData);

  ctx.save();
  if (stroke.tool === 'highlighter') {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = stroke.color;
  } else {
    ctx.globalAlpha = stroke.opacity ?? 1.0;
    ctx.fillStyle = stroke.color;
  }

  ctx.fill(path);
  ctx.restore();
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
