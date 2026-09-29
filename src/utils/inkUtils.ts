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

  const points = stroke.points.map(p => [p.x * scale, p.y * scale, p.pressure ?? 0.5]);

  const outline = getStroke(points, {
    size: stroke.size * scale,
    thinning: stroke.tool === 'highlighter' ? 0 : 0.45,
    smoothing: 0.6,
    streamline: 0.5,
    simulatePressure: false,
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
