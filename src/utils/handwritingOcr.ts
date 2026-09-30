import { InkStroke, StrokePoint } from '../types/ink';

export interface OcrResult {
  text: string;
  confidence: number;
  isNumeric: boolean;
  parsedVitals?: {
    bp?: string; // e.g. "120/80"
    pulse?: number;
    temp?: number;
    spo2?: number;
  };
}

interface GlyphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  strokes: InkStroke[];
}

interface NormalizedPoint {
  x: number;
  y: number;
}

interface TemplatePrototype {
  char: string;
  category: 'digit' | 'symbol' | 'letter';
  points: NormalizedPoint[];
  loopRequirement?: number; // Optional expected loops: 0, 1, or 2
  loopYRange?: [number, number]; // [minY, maxY] of loop center
}

/**
 * Pure function: Resamples an arbitrary polyline into N equidistant points along its path length
 */
function resamplePolyline(points: NormalizedPoint[], n: number = 32): NormalizedPoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
  }

  const lengths: number[] = [0];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    totalLength += d;
    lengths.push(totalLength);
  }

  if (totalLength === 0) {
    return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
  }

  const step = totalLength / (n - 1);
  const resampled: NormalizedPoint[] = [{ x: points[0].x, y: points[0].y }];

  let currentDist = step;
  let segIdx = 0;

  for (let i = 1; i < n - 1; i++) {
    while (segIdx < lengths.length - 1 && lengths[segIdx + 1] < currentDist) {
      segIdx++;
    }
    const segStartLen = lengths[segIdx];
    const segEndLen = lengths[segIdx + 1];
    const segLen = segEndLen - segStartLen;
    const t = segLen > 0 ? (currentDist - segStartLen) / segLen : 0;

    const p0 = points[segIdx];
    const p1 = points[segIdx + 1];
    resampled.push({
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
    });

    currentDist += step;
  }

  resampled.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
  return resampled;
}

// 32-point normalized polyline prototypes
const RAW_PROTOTYPES: { char: string; category: 'digit' | 'symbol' | 'letter'; controlPoints: NormalizedPoint[]; loops?: number; loopY?: [number, number] }[] = [
  // Digit 0 (Oval counter-clockwise)
  {
    char: '0',
    category: 'digit',
    loops: 1,
    loopY: [0.25, 0.75],
    controlPoints: [
      { x: 0.5, y: 0.08 }, { x: 0.22, y: 0.25 }, { x: 0.15, y: 0.5 }, { x: 0.22, y: 0.78 },
      { x: 0.5, y: 0.92 }, { x: 0.78, y: 0.78 }, { x: 0.85, y: 0.5 }, { x: 0.78, y: 0.25 },
      { x: 0.5, y: 0.08 }
    ]
  },
  // Digit 0 (Oval clockwise)
  {
    char: '0',
    category: 'digit',
    loops: 1,
    loopY: [0.25, 0.75],
    controlPoints: [
      { x: 0.5, y: 0.08 }, { x: 0.78, y: 0.25 }, { x: 0.85, y: 0.5 }, { x: 0.78, y: 0.78 },
      { x: 0.5, y: 0.92 }, { x: 0.22, y: 0.78 }, { x: 0.15, y: 0.5 }, { x: 0.22, y: 0.25 },
      { x: 0.5, y: 0.08 }
    ]
  },
  // Digit 1 (Straight vertical downward)
  {
    char: '1',
    category: 'digit',
    loops: 0,
    controlPoints: [{ x: 0.5, y: 0.05 }, { x: 0.5, y: 0.95 }]
  },
  // Digit 1 (Top serif hook + downward stem)
  {
    char: '1',
    category: 'digit',
    loops: 0,
    controlPoints: [{ x: 0.32, y: 0.22 }, { x: 0.5, y: 0.05 }, { x: 0.5, y: 0.95 }]
  },
  // Digit 2 (Swan curve to flat horizontal base)
  {
    char: '2',
    category: 'digit',
    loops: 0,
    controlPoints: [
      { x: 0.22, y: 0.25 }, { x: 0.5, y: 0.08 }, { x: 0.78, y: 0.25 },
      { x: 0.75, y: 0.45 }, { x: 0.22, y: 0.9 }, { x: 0.85, y: 0.9 }
    ]
  },
  // Digit 2 (Looped 2)
  {
    char: '2',
    category: 'digit',
    controlPoints: [
      { x: 0.25, y: 0.22 }, { x: 0.52, y: 0.08 }, { x: 0.78, y: 0.25 },
      { x: 0.65, y: 0.5 }, { x: 0.25, y: 0.85 }, { x: 0.18, y: 0.95 },
      { x: 0.35, y: 0.9 }, { x: 0.85, y: 0.9 }
    ]
  },
  // Digit 3 (Double right-facing arcs)
  {
    char: '3',
    category: 'digit',
    loops: 0,
    controlPoints: [
      { x: 0.22, y: 0.15 }, { x: 0.5, y: 0.08 }, { x: 0.78, y: 0.26 },
      { x: 0.45, y: 0.48 }, { x: 0.8, y: 0.7 }, { x: 0.5, y: 0.92 }, { x: 0.2, y: 0.85 }
    ]
  },
  // Digit 3 (Flat-top 3)
  {
    char: '3',
    category: 'digit',
    loops: 0,
    controlPoints: [
      { x: 0.22, y: 0.1 }, { x: 0.8, y: 0.1 }, { x: 0.45, y: 0.48 },
      { x: 0.8, y: 0.7 }, { x: 0.5, y: 0.92 }, { x: 0.2, y: 0.85 }
    ]
  },
  // Digit 4 (Single stroke: down, right, up, down)
  {
    char: '4',
    category: 'digit',
    controlPoints: [
      { x: 0.75, y: 0.1 }, { x: 0.2, y: 0.65 }, { x: 0.88, y: 0.65 },
      { x: 0.75, y: 0.1 }, { x: 0.75, y: 0.95 }
    ]
  },
  // Digit 4 (Open 4)
  {
    char: '4',
    category: 'digit',
    controlPoints: [
      { x: 0.25, y: 0.1 }, { x: 0.2, y: 0.62 }, { x: 0.85, y: 0.62 },
      { x: 0.75, y: 0.15 }, { x: 0.75, y: 0.95 }
    ]
  },
  // Digit 5 (Top bar, down stem, bottom belly)
  {
    char: '5',
    category: 'digit',
    loops: 0,
    controlPoints: [
      { x: 0.82, y: 0.1 }, { x: 0.25, y: 0.1 }, { x: 0.22, y: 0.45 },
      { x: 0.5, y: 0.42 }, { x: 0.82, y: 0.65 }, { x: 0.5, y: 0.92 }, { x: 0.22, y: 0.85 }
    ]
  },
  // Digit 6 (Descending spine into bottom loop)
  {
    char: '6',
    category: 'digit',
    loops: 1,
    loopY: [0.45, 0.95],
    controlPoints: [
      { x: 0.72, y: 0.1 }, { x: 0.35, y: 0.25 }, { x: 0.18, y: 0.58 },
      { x: 0.45, y: 0.92 }, { x: 0.82, y: 0.75 }, { x: 0.5, y: 0.52 }, { x: 0.2, y: 0.62 }
    ]
  },
  // Digit 7 (Top bar + slanting down-left)
  {
    char: '7',
    category: 'digit',
    loops: 0,
    controlPoints: [
      { x: 0.15, y: 0.1 }, { x: 0.85, y: 0.1 }, { x: 0.38, y: 0.95 }
    ]
  },
  // Digit 7 (Crossed 7)
  {
    char: '7',
    category: 'digit',
    loops: 0,
    controlPoints: [
      { x: 0.15, y: 0.1 }, { x: 0.85, y: 0.1 }, { x: 0.55, y: 0.52 },
      { x: 0.3, y: 0.52 }, { x: 0.7, y: 0.52 }, { x: 0.38, y: 0.95 }
    ]
  },
  // Digit 8 (Figure eight with central cross)
  {
    char: '8',
    category: 'digit',
    loops: 2,
    controlPoints: [
      { x: 0.5, y: 0.5 }, { x: 0.25, y: 0.28 }, { x: 0.5, y: 0.08 }, { x: 0.75, y: 0.28 },
      { x: 0.5, y: 0.5 }, { x: 0.2, y: 0.75 }, { x: 0.5, y: 0.92 }, { x: 0.8, y: 0.75 },
      { x: 0.5, y: 0.5 }
    ]
  },
  // Digit 9 (Top loop + right downward stem)
  {
    char: '9',
    category: 'digit',
    loops: 1,
    loopY: [0.08, 0.55],
    controlPoints: [
      { x: 0.78, y: 0.45 }, { x: 0.5, y: 0.08 }, { x: 0.22, y: 0.28 }, { x: 0.5, y: 0.5 },
      { x: 0.78, y: 0.45 }, { x: 0.75, y: 0.95 }
    ]
  },
  // '/' Forward Slash
  {
    char: '/',
    category: 'symbol',
    loops: 0,
    controlPoints: [{ x: 0.85, y: 0.08 }, { x: 0.15, y: 0.92 }]
  },
  // '-' Hyphen / Minus
  {
    char: '-',
    category: 'symbol',
    loops: 0,
    controlPoints: [{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }]
  },
  // '+' Plus
  {
    char: '+',
    category: 'symbol',
    loops: 0,
    controlPoints: [
      { x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.9 }
    ]
  },
  // '=' Equal sign
  {
    char: '=',
    category: 'symbol',
    loops: 0,
    controlPoints: [
      { x: 0.15, y: 0.38 }, { x: 0.85, y: 0.38 }, { x: 0.5, y: 0.5 },
      { x: 0.15, y: 0.62 }, { x: 0.85, y: 0.62 }
    ]
  },
  // '%' Percent
  {
    char: '%',
    category: 'symbol',
    controlPoints: [
      { x: 0.85, y: 0.1 }, { x: 0.15, y: 0.9 },
      { x: 0.25, y: 0.2 }, { x: 0.35, y: 0.2 }, { x: 0.25, y: 0.2 },
      { x: 0.75, y: 0.8 }, { x: 0.65, y: 0.8 }
    ]
  },
  // 'B'
  {
    char: 'B',
    category: 'letter',
    loops: 2,
    controlPoints: [
      { x: 0.2, y: 0.95 }, { x: 0.2, y: 0.08 }, { x: 0.65, y: 0.15 }, { x: 0.45, y: 0.5 },
      { x: 0.7, y: 0.65 }, { x: 0.2, y: 0.95 }
    ]
  },
  // 'P'
  {
    char: 'P',
    category: 'letter',
    loops: 1,
    loopY: [0.08, 0.55],
    controlPoints: [
      { x: 0.2, y: 0.95 }, { x: 0.2, y: 0.08 }, { x: 0.7, y: 0.15 }, { x: 0.7, y: 0.48 },
      { x: 0.2, y: 0.52 }
    ]
  },
  // 'H'
  {
    char: 'H',
    category: 'letter',
    controlPoints: [
      { x: 0.2, y: 0.08 }, { x: 0.2, y: 0.95 }, { x: 0.2, y: 0.5 },
      { x: 0.8, y: 0.5 }, { x: 0.8, y: 0.08 }, { x: 0.8, y: 0.95 }
    ]
  },
  // 'R'
  {
    char: 'R',
    category: 'letter',
    controlPoints: [
      { x: 0.2, y: 0.95 }, { x: 0.2, y: 0.08 }, { x: 0.7, y: 0.15 }, { x: 0.7, y: 0.48 },
      { x: 0.2, y: 0.52 }, { x: 0.8, y: 0.95 }
    ]
  },
  // 'S'
  {
    char: 'S',
    category: 'letter',
    controlPoints: [
      { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.08 }, { x: 0.2, y: 0.28 },
      { x: 0.78, y: 0.68 }, { x: 0.5, y: 0.92 }, { x: 0.2, y: 0.8 }
    ]
  },
  // 'T'
  {
    char: 'T',
    category: 'letter',
    controlPoints: [
      { x: 0.1, y: 0.08 }, { x: 0.9, y: 0.08 }, { x: 0.5, y: 0.08 }, { x: 0.5, y: 0.95 }
    ]
  },
  // 'C'
  {
    char: 'C',
    category: 'letter',
    controlPoints: [
      { x: 0.8, y: 0.2 }, { x: 0.5, y: 0.08 }, { x: 0.2, y: 0.5 },
      { x: 0.5, y: 0.92 }, { x: 0.8, y: 0.8 }
    ]
  },
  // 'M'
  {
    char: 'M',
    category: 'letter',
    controlPoints: [
      { x: 0.15, y: 0.95 }, { x: 0.15, y: 0.08 }, { x: 0.5, y: 0.65 },
      { x: 0.85, y: 0.08 }, { x: 0.85, y: 0.95 }
    ]
  },
  // 'L'
  {
    char: 'L',
    category: 'letter',
    controlPoints: [
      { x: 0.2, y: 0.08 }, { x: 0.2, y: 0.92 }, { x: 0.85, y: 0.92 }
    ]
  },
  // 'A'
  {
    char: 'A',
    category: 'letter',
    controlPoints: [
      { x: 0.15, y: 0.95 }, { x: 0.5, y: 0.08 }, { x: 0.85, y: 0.95 },
      { x: 0.7, y: 0.55 }, { x: 0.3, y: 0.55 }
    ]
  },
  // 'E'
  {
    char: 'E',
    category: 'letter',
    controlPoints: [
      { x: 0.85, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.2, y: 0.5 },
      { x: 0.7, y: 0.5 }, { x: 0.2, y: 0.5 }, { x: 0.2, y: 0.92 }, { x: 0.85, y: 0.92 }
    ]
  },
  // 'O'
  {
    char: 'O',
    category: 'letter',
    loops: 1,
    loopY: [0.25, 0.75],
    controlPoints: [
      { x: 0.5, y: 0.08 }, { x: 0.22, y: 0.25 }, { x: 0.15, y: 0.5 }, { x: 0.22, y: 0.78 },
      { x: 0.5, y: 0.92 }, { x: 0.78, y: 0.78 }, { x: 0.85, y: 0.5 }, { x: 0.78, y: 0.25 },
      { x: 0.5, y: 0.08 }
    ]
  }
];

let _compiledTemplates: TemplatePrototype[] | null = null;
function getCompiledTemplates(): TemplatePrototype[] {
  if (!_compiledTemplates) {
    _compiledTemplates = RAW_PROTOTYPES.map((p) => ({
      char: p.char,
      category: p.category,
      points: resamplePolyline(p.controlPoints, 32),
      loopRequirement: p.loops,
      loopYRange: p.loopY,
    }));
  }
  return _compiledTemplates;
}

const MEDICAL_KEYWORDS: string[] = [
  'BP', 'HR', 'RR', 'TEMP', 'SPO2', 'MG', 'ML', 'MCG', 'TAB', 'PO', 'IV', 'IM',
  'BID', 'TID', 'QID', 'PRN', 'STAT', 'YO', 'YOF', 'YOM', 'CC', 'BPM', 'MMHG',
  'KG', 'G', 'NORMAL', 'HIGH', 'LOW', 'MILD', 'PAIN', 'SOB', 'NAD',
];

export class HandwritingOcrService {
  /**
   * Resamples an arbitrary polyline into N equidistant points along its path length
   */
  public static resamplePolyline(points: NormalizedPoint[], n: number = 32): NormalizedPoint[] {
    return resamplePolyline(points, n);
  }

  /**
   * Determines if two line segments (p0-p1) and (p2-p3) intersect
   */
  private static segmentsIntersect(
    p0: NormalizedPoint,
    p1: NormalizedPoint,
    p2: NormalizedPoint,
    p3: NormalizedPoint
  ): boolean {
    const ccw = (A: NormalizedPoint, B: NormalizedPoint, C: NormalizedPoint) =>
      (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    return (
      ccw(p0, p2, p3) !== ccw(p1, p2, p3) && ccw(p0, p1, p2) !== ccw(p0, p1, p3)
    );
  }

  /**
   * Checks if two strokes intersect geometrically
   */
  private static doStrokesIntersect(strokeA: InkStroke, strokeB: InkStroke): boolean {
    const ptsA = strokeA.points;
    const ptsB = strokeB.points;
    if (ptsA.length < 2 || ptsB.length < 2) return false;

    // Step by 2 for high performance
    for (let i = 1; i < ptsA.length; i += 2) {
      for (let j = 1; j < ptsB.length; j += 2) {
        if (
          this.segmentsIntersect(
            ptsA[i - 1],
            ptsA[i],
            ptsB[j - 1],
            ptsB[j]
          )
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Segment raw ink strokes into distinct character glyphs.
   * FIX: Avoid falsely merging sequential digits (e.g. '1' and '2' in '120/80')!
   */
  private static segmentGlyphs(strokes: InkStroke[]): GlyphBounds[] {
    const strokeBoxes = strokes.map((s) => {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      for (const p of s.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return {
        stroke: s,
        minX,
        minY,
        maxX,
        maxY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
      };
    });

    // Sort strokes strictly from left to right by their start/minX
    strokeBoxes.sort((a, b) => a.minX - b.minX);

    const glyphs: GlyphBounds[] = [];

    for (const sb of strokeBoxes) {
      if (glyphs.length === 0) {
        glyphs.push({
          minX: sb.minX,
          minY: sb.minY,
          maxX: sb.maxX,
          maxY: sb.maxY,
          width: sb.width,
          height: sb.height,
          strokes: [sb.stroke],
        });
        continue;
      }

      const last = glyphs[glyphs.length - 1];

      // Check geometric intersection between strokes (crossbar of '+', 't', '4', 'X')
      let intersects = false;
      for (const s of last.strokes) {
        if (this.doStrokesIntersect(s, sb.stroke)) {
          intersects = true;
          break;
        }
      }

      // Check horizontal containment (e.g. dot over i/j or small mark)
      const isContainedX = sb.minX >= last.minX - 3 && sb.maxX <= last.maxX + 3;

      // Check significant horizontal overlap (strokes forming the same glyph)
      const overlapX = Math.min(last.maxX, sb.maxX) - Math.max(last.minX, sb.minX);
      const maxW = Math.max(last.width, sb.width);
      const isSubstantialOverlap = overlapX > 0.65 * maxW;

      // Vertical proximity check
      const overlapY = Math.min(last.maxY, sb.maxY) - Math.max(last.minY, sb.minY);
      const hasVerticalProximity = overlapY > -20;

      if ((intersects || isContainedX || isSubstantialOverlap) && hasVerticalProximity) {
        last.minX = Math.min(last.minX, sb.minX);
        last.minY = Math.min(last.minY, sb.minY);
        last.maxX = Math.max(last.maxX, sb.maxX);
        last.maxY = Math.max(last.maxY, sb.maxY);
        last.width = last.maxX - last.minX;
        last.height = last.maxY - last.minY;
        last.strokes.push(sb.stroke);
      } else {
        glyphs.push({
          minX: sb.minX,
          minY: sb.minY,
          maxX: sb.maxX,
          maxY: sb.maxY,
          width: sb.width,
          height: sb.height,
          strokes: [sb.stroke],
        });
      }
    }

    return glyphs;
  }

  /**
   * Topological Loop Detection using 2D flood fill on an aspect-ratio-preserved binary grid
   */
  private static detectLoops(
    glyph: GlyphBounds
  ): { count: number; avgY: number; loopRatio: number } {
    const GRID_SIZE = 20;
    const matrix: number[][] = Array.from({ length: GRID_SIZE }, () =>
      new Array(GRID_SIZE).fill(0)
    );

    const maxDim = Math.max(glyph.width, glyph.height, 1);
    const scale = (GRID_SIZE - 4) / maxDim;
    const offsetX = Math.round((GRID_SIZE - glyph.width * scale) / 2);
    const offsetY = Math.round((GRID_SIZE - glyph.height * scale) / 2);

    for (const stroke of glyph.strokes) {
      for (let i = 0; i < stroke.points.length; i++) {
        const p1 = stroke.points[i];
        const gx = Math.min(
          GRID_SIZE - 1,
          Math.max(0, Math.round(offsetX + (p1.x - glyph.minX) * scale))
        );
        const gy = Math.min(
          GRID_SIZE - 1,
          Math.max(0, Math.round(offsetY + (p1.y - glyph.minY) * scale))
        );
        matrix[gy][gx] = 1;

        if (i > 0) {
          const p0 = stroke.points[i - 1];
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y) * scale;
          const steps = Math.max(1, Math.round(dist * 2));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const ix = Math.min(
              GRID_SIZE - 1,
              Math.max(0, Math.round(offsetX + (p0.x + (p1.x - p0.x) * t - glyph.minX) * scale))
            );
            const iy = Math.min(
              GRID_SIZE - 1,
              Math.max(0, Math.round(offsetY + (p0.y + (p1.y - p0.y) * t - glyph.minY) * scale))
            );
            matrix[iy][ix] = 1;
          }
        }
      }
    }

    const visited: boolean[][] = Array.from({ length: GRID_SIZE }, () =>
      new Array(GRID_SIZE).fill(false)
    );

    // Flood fill from outer boundaries
    const queue: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (matrix[r][0] === 0) {
        visited[r][0] = true;
        queue.push([r, 0]);
      }
      if (matrix[r][GRID_SIZE - 1] === 0) {
        visited[r][GRID_SIZE - 1] = true;
        queue.push([r, GRID_SIZE - 1]);
      }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
      if (matrix[0][c] === 0 && !visited[0][c]) {
        visited[0][c] = true;
        queue.push([0, c]);
      }
      if (matrix[GRID_SIZE - 1][c] === 0 && !visited[GRID_SIZE - 1][c]) {
        visited[GRID_SIZE - 1][c] = true;
        queue.push([GRID_SIZE - 1, c]);
      }
    }

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (
          nr >= 0 &&
          nr < GRID_SIZE &&
          nc >= 0 &&
          nc < GRID_SIZE &&
          !visited[nr][nc] &&
          matrix[nr][nc] === 0
        ) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }

    let loopCount = 0;
    let totalLoopY = 0;
    let loopPixels = 0;

    for (let r = 1; r < GRID_SIZE - 1; r++) {
      for (let c = 1; c < GRID_SIZE - 1; c++) {
        if (matrix[r][c] === 0 && !visited[r][c]) {
          const loopQ: [number, number][] = [[r, c]];
          visited[r][c] = true;
          let currentLoopSize = 0;

          while (loopQ.length > 0) {
            const [lr, lc] = loopQ.shift()!;
            totalLoopY += lr;
            loopPixels++;
            currentLoopSize++;

            const nbs = [
              [lr - 1, lc],
              [lr + 1, lc],
              [lr, lc - 1],
              [lr, lc + 1],
            ];
            for (const [nnr, nnc] of nbs) {
              if (
                nnr >= 0 &&
                nnr < GRID_SIZE &&
                nnc >= 0 &&
                nnc < GRID_SIZE &&
                !visited[nnr][nnc] &&
                matrix[nnr][nnc] === 0
              ) {
                visited[nnr][nnc] = true;
                loopQ.push([nnr, nnc]);
              }
            }
          }

          // Filter out single-pixel noise artifacts
          if (currentLoopSize >= 2) {
            loopCount++;
          }
        }
      }
    }

    const avgY = loopPixels > 0 ? (totalLoopY / loopPixels) / GRID_SIZE : 0.5;
    const loopRatio = loopPixels / (GRID_SIZE * GRID_SIZE);
    return { count: loopCount, avgY, loopRatio };
  }

  /**
   * Classify an individual character glyph using trajectory distance and topological gating
   */
  private static classifyGlyph(glyph: GlyphBounds): { char: string; confidence: number } {
    // 1. Check for single dot or period '.'
    if (glyph.width < 12 && glyph.height < 12) {
      return { char: '.', confidence: 0.98 };
    }

    // 2. Check for horizontal hyphen or minus '-'
    const aspectRatio = glyph.width / Math.max(1, glyph.height);
    if (aspectRatio > 2.2 && glyph.height < 20) {
      return { char: '-', confidence: 0.96 };
    }

    // 3. Collect and normalize all points in the glyph
    const allPoints: NormalizedPoint[] = [];
    const maxDim = Math.max(glyph.width, glyph.height, 1);
    const offsetX = (maxDim - glyph.width) / 2;
    const offsetY = (maxDim - glyph.height) / 2;

    for (const stroke of glyph.strokes) {
      for (const p of stroke.points) {
        allPoints.push({
          x: (p.x - glyph.minX + offsetX) / maxDim,
          y: (p.y - glyph.minY + offsetY) / maxDim,
        });
      }
    }

    const resampled = this.resamplePolyline(allPoints, 32);

    // 4. Extract structural trajectory metrics
    const startP = resampled[0];
    const endP = resampled[31];
    const netDx = endP.x - startP.x;
    const netDy = endP.y - startP.y;

    const isStraightVertical =
      Math.abs(netDx) < 0.22 && Math.abs(netDy) > 0.65 && aspectRatio < 0.45;
    const isForwardSlash =
      aspectRatio > 0.35 &&
      aspectRatio < 1.4 &&
      ((netDx < -0.3 && netDy > 0.4) || (netDx > 0.3 && netDy < -0.4));

    // 5. Detect enclosed loops
    const loops = this.detectLoops(glyph);

    // 6. Template matching using forward & reverse Point-Cloud distance
    let bestChar = '1';
    let bestScore = -Infinity;

    for (const template of getCompiledTemplates()) {
      let fwdDist = 0;
      let revDist = 0;
      const tPts = template.points;

      for (let i = 0; i < 32; i++) {
        fwdDist += Math.hypot(resampled[i].x - tPts[i].x, resampled[i].y - tPts[i].y);
        revDist += Math.hypot(resampled[i].x - tPts[31 - i].x, resampled[i].y - tPts[31 - i].y);
      }

      const meanDist = Math.min(fwdDist, revDist) / 32;
      let score = 1.0 - meanDist * 1.8;

      // Apply Topological & Structural Feature Gating
      if (template.char === '1') {
        if (isStraightVertical) score += 0.35;
        if (loops.count > 0 || isForwardSlash) score -= 0.5;
      } else if (template.char === '/') {
        if (isForwardSlash && loops.count === 0) score += 0.38;
        if (loops.count > 0 || isStraightVertical) score -= 0.5;
      } else if (template.char === '8') {
        if (loops.count >= 2) score += 0.45;
        else if (loops.count === 0) score -= 0.25;
      } else if (template.char === '0' || template.char === 'O') {
        if (loops.count === 1 && loops.avgY >= 0.25 && loops.avgY <= 0.75) {
          score += 0.32;
        } else if (loops.count === 0) {
          score -= 0.25;
        }
      } else if (template.char === '6') {
        if (loops.count === 1 && loops.avgY >= 0.5) {
          score += 0.35;
        } else if (loops.count === 0) {
          score -= 0.2;
        }
      } else if (template.char === '9') {
        if (loops.count === 1 && loops.avgY <= 0.55) {
          score += 0.35;
        } else if (loops.count === 0) {
          score -= 0.2;
        }
      } else if (template.char === '2') {
        if (isStraightVertical || isForwardSlash) score -= 0.4;
      }

      if (score > bestScore) {
        bestScore = score;
        bestChar = template.char;
      }
    }

    const confidence = Math.min(0.99, Math.max(0.4, (bestScore + 1) / 2));
    return { char: bestChar, confidence };
  }

  /**
   * Main entry point: recognizes handwriting strokes into text or clinical measurements
   */
  public static recognizeStrokes(strokes: InkStroke[]): OcrResult {
    const validStrokes = strokes.filter(
      (s) => s.tool !== 'eraser' && s.points && s.points.length > 0
    );

    if (validStrokes.length === 0) {
      return { text: '', confidence: 0, isNumeric: false };
    }

    // 1. Group strokes into horizontal glyph clusters (left-to-right)
    const glyphs = this.segmentGlyphs(validStrokes);

    // 2. Classify each glyph
    const recognizedChars: { char: string; confidence: number }[] = [];
    for (const glyph of glyphs) {
      const match = this.classifyGlyph(glyph);
      recognizedChars.push(match);
    }

    let rawText = recognizedChars.map((c) => c.char).join('');
    const avgConfidence =
      recognizedChars.reduce((sum, c) => sum + c.confidence, 0) /
      Math.max(1, recognizedChars.length);

    // 3. Post-process medical vocabulary & abbreviations
    const refinedText = this.postProcessMedicalVocabulary(rawText);

    // 4. Post-process clinical patterns (e.g. BP "120/80", Pulse "72", Temp "37.5")
    const vitals = this.parseClinicalVitals(refinedText);

    let finalOutput = refinedText;
    if (vitals.bp) {
      finalOutput = vitals.bp;
    }

    const isNumeric = /^[\d\s\/\.\-%+=]+$/.test(finalOutput.trim());

    return {
      text: finalOutput,
      confidence: Math.round(avgConfidence * 100) / 100,
      isNumeric,
      parsedVitals: vitals,
    };
  }

  /**
   * Refines recognized raw string against known clinical abbreviations
   */
  private static postProcessMedicalVocabulary(text: string): string {
    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();

    // Check for exact or single-character off medical abbreviations
    for (const kw of MEDICAL_KEYWORDS) {
      if (upper === kw) return kw;
      if (upper.length === kw.length && upper.length >= 2) {
        let diffs = 0;
        for (let i = 0; i < upper.length; i++) {
          if (upper[i] !== kw[i]) diffs++;
        }
        if (diffs === 1 && upper.length >= 3) {
          return kw;
        }
      }
    }

    // Number sequences with letter confusion (e.g. "12O/8O" -> "120/80")
    if (
      /[0-9]/.test(trimmed) &&
      (trimmed.includes('O') ||
        trimmed.includes('o') ||
        trimmed.includes('l') ||
        trimmed.includes('I'))
    ) {
      const corrected = trimmed
        .replace(/[Oo]/g, '0')
        .replace(/[lI]/g, '1');
      if (/^[\d\/\.\-%+= ]+$/.test(corrected)) {
        return corrected;
      }
    }

    return trimmed;
  }

  /**
   * Parses common clinical measurements from recognized string
   */
  public static parseClinicalVitals(text: string): {
    bp?: string;
    pulse?: number;
    temp?: number;
    spo2?: number;
  } {
    const cleaned = text.replace(/[^\d\/\.\-]/g, '').trim();

    // 1. Blood Pressure: e.g. "120/80", "135/85", "110-70", "120 80"
    const bpMatch = cleaned.match(/(\d{2,3})[\/\-](\d{2,3})/);
    let bp: string | undefined = undefined;
    if (bpMatch) {
      const sys = parseInt(bpMatch[1], 10);
      const dia = parseInt(bpMatch[2], 10);
      if (sys >= 50 && sys <= 260 && dia >= 25 && dia <= 160) {
        bp = `${sys}/${dia}`;
      }
    }

    // 2. Pulse / Heart Rate
    let pulse: number | undefined = undefined;
    if (!bp && /^\d{2,3}$/.test(cleaned)) {
      const val = parseInt(cleaned, 10);
      if (val >= 35 && val <= 240) {
        pulse = val;
      }
    }

    // 3. Temperature (e.g. 36.5, 37.2, 38.8, 98.6)
    let temp: number | undefined = undefined;
    const tempMatch = cleaned.match(/(\d{2}\.\d)/);
    if (tempMatch) {
      const val = parseFloat(tempMatch[1]);
      if ((val >= 34 && val <= 43) || (val >= 94 && val <= 108)) {
        temp = val;
      }
    }

    // 4. SpO2 (e.g. 98%, 95)
    let spo2: number | undefined = undefined;
    const spo2Match = text.match(/(\d{2,3})\s*%/);
    if (spo2Match) {
      const val = parseInt(spo2Match[1], 10);
      if (val >= 50 && val <= 100) {
        spo2 = val;
      }
    }

    return { bp, pulse, temp, spo2 };
  }
}
