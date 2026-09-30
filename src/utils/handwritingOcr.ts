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

/**
 * 16x16 Aspect-Ratio Preserved Bitmask Prototypes
 * Each 16x16 grid is represented as 16 binary numbers (rows 0-15).
 * Multi-prototype templates support diverse clinician handwriting styles.
 */
const OCR_PROTOTYPES: Record<string, { char: string; grid: number[]; category: 'digit' | 'symbol' | 'letter' }[]> = {
  // Digit 0 (Oval, wide zero, slashed zero)
  '0': [
    {
      char: '0',
      category: 'digit',
      grid: [
        0x03c0, 0x0ff0, 0x1c38, 0x381c, 0x300c, 0x700e, 0x6006, 0x6006,
        0x6006, 0x6006, 0x700e, 0x300c, 0x381c, 0x1c38, 0x0ff0, 0x03c0,
      ],
    },
    {
      char: '0',
      category: 'digit',
      grid: [
        0x0180, 0x07e0, 0x0e70, 0x1818, 0x300c, 0x300c, 0x6006, 0x6006,
        0x6006, 0x6006, 0x300c, 0x300c, 0x1818, 0x0e70, 0x07e0, 0x0180,
      ],
    },
  ],
  // Digit 1 (Simple stick, top-serif)
  '1': [
    {
      char: '1',
      category: 'digit',
      grid: [
        0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180,
        0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180,
      ],
    },
    {
      char: '1',
      category: 'digit',
      grid: [
        0x0080, 0x0180, 0x0380, 0x0780, 0x0f80, 0x0180, 0x0180, 0x0180,
        0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x07e0, 0x07e0,
      ],
    },
  ],
  // Digit 2 (Swan curve + baseline, looped 2)
  '2': [
    {
      char: '2',
      category: 'digit',
      grid: [
        0x07e0, 0x0ff0, 0x1838, 0x301c, 0x001c, 0x0038, 0x0070, 0x00e0,
        0x01c0, 0x0380, 0x0700, 0x0e00, 0x1c00, 0x3ffe, 0x7ffe, 0x7ffe,
      ],
    },
    {
      char: '2',
      category: 'digit',
      grid: [
        0x03c0, 0x0ee0, 0x1c30, 0x1830, 0x0070, 0x00e0, 0x01c0, 0x0380,
        0x0700, 0x0e00, 0x1c00, 0x3000, 0x3f00, 0x7ff8, 0x7ffe, 0x7ffe,
      ],
    },
  ],
  // Digit 3 (Double loop, flat top)
  '3': [
    {
      char: '3',
      category: 'digit',
      grid: [
        0x07e0, 0x1ff0, 0x3038, 0x3018, 0x0018, 0x0030, 0x07e0, 0x0fe0,
        0x0030, 0x0018, 0x000c, 0x300c, 0x301c, 0x3838, 0x1ff0, 0x07e0,
      ],
    },
    {
      char: '3',
      category: 'digit',
      grid: [
        0x3ffe, 0x3ffe, 0x001c, 0x0038, 0x0070, 0x00e0, 0x0fe0, 0x0fe0,
        0x0038, 0x001c, 0x000e, 0x300e, 0x301c, 0x383c, 0x1ff8, 0x07e0,
      ],
    },
  ],
  // Digit 4 (Open top, closed triangle)
  '4': [
    {
      char: '4',
      category: 'digit',
      grid: [
        0x0030, 0x0070, 0x00f0, 0x0170, 0x0270, 0x0470, 0x0c70, 0x1870,
        0x3070, 0x6070, 0x7ffe, 0x7ffe, 0x0070, 0x0070, 0x0070, 0x0070,
      ],
    },
    {
      char: '4',
      category: 'digit',
      grid: [
        0x0c18, 0x0c18, 0x0c18, 0x1c18, 0x1818, 0x3018, 0x3018, 0x6018,
        0x7ffe, 0x7ffe, 0x0018, 0x0018, 0x0018, 0x0018, 0x0018, 0x0018,
      ],
    },
  ],
  // Digit 5 (Flag + belly)
  '5': [
    {
      char: '5',
      category: 'digit',
      grid: [
        0x1ffe, 0x1ffe, 0x1800, 0x1800, 0x1800, 0x1fe0, 0x1ff8, 0x003c,
        0x001c, 0x000e, 0x000e, 0x300e, 0x301c, 0x3838, 0x1ff0, 0x07e0,
      ],
    },
  ],
  // Digit 6 (Bottom loop)
  '6': [
    {
      char: '6',
      category: 'digit',
      grid: [
        0x01f0, 0x07f8, 0x0e1c, 0x1c0c, 0x3800, 0x7000, 0x77e0, 0x7ff8,
        0x781c, 0x700e, 0x700e, 0x700e, 0x381c, 0x3c38, 0x1ff0, 0x07e0,
      ],
    },
  ],
  // Digit 7 (Straight, crossed)
  '7': [
    {
      char: '7',
      category: 'digit',
      grid: [
        0x7ffe, 0x7ffe, 0x001c, 0x0038, 0x0070, 0x00e0, 0x01c0, 0x0380,
        0x0380, 0x0700, 0x0700, 0x0e00, 0x0e00, 0x1c00, 0x1c00, 0x1c00,
      ],
    },
    {
      char: '7',
      category: 'digit',
      grid: [
        0x7ffe, 0x7ffe, 0x0038, 0x0070, 0x00e0, 0x01c0, 0x0ff0, 0x0ff0,
        0x0700, 0x0e00, 0x0e00, 0x1c00, 0x1c00, 0x3800, 0x3800, 0x3800,
      ],
    },
  ],
  // Digit 8 (Two loops)
  '8': [
    {
      char: '8',
      category: 'digit',
      grid: [
        0x07e0, 0x1ff0, 0x381c, 0x300c, 0x300c, 0x1818, 0x0ff0, 0x0ff0,
        0x1ff8, 0x381c, 0x300c, 0x300c, 0x300c, 0x381c, 0x1ff0, 0x07e0,
      ],
    },
  ],
  // Digit 9 (Top loop + stem)
  '9': [
    {
      char: '9',
      category: 'digit',
      grid: [
        0x07e0, 0x1ff0, 0x381c, 0x300c, 0x300c, 0x300c, 0x381c, 0x1ffc,
        0x0ffc, 0x001c, 0x0018, 0x0038, 0x3030, 0x3860, 0x1fc0, 0x0780,
      ],
    },
    {
      char: '9',
      category: 'digit',
      grid: [
        0x07e0, 0x1ff0, 0x381c, 0x700e, 0x700e, 0x700e, 0x381e, 0x1ffe,
        0x0ffe, 0x000e, 0x000e, 0x000e, 0x000e, 0x000e, 0x000e, 0x000e,
      ],
    },
  ],
  // Symbols
  '/': [
    {
      char: '/',
      category: 'symbol',
      grid: [
        0x0003, 0x0006, 0x000c, 0x0018, 0x0030, 0x0060, 0x00c0, 0x0180,
        0x0300, 0x0600, 0x0c00, 0x1800, 0x3000, 0x6000, 0xc000, 0x8000,
      ],
    },
  ],
  '.': [
    {
      char: '.',
      category: 'symbol',
      grid: [
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
        0x0000, 0x0000, 0x0000, 0x0000, 0x0180, 0x03c0, 0x03c0, 0x0180,
      ],
    },
  ],
  '-': [
    {
      char: '-',
      category: 'symbol',
      grid: [
        0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x7ffe,
        0x7ffe, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
      ],
    },
  ],
  '+': [
    {
      char: '+',
      category: 'symbol',
      grid: [
        0x0000, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x7ffe,
        0x7ffe, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0000,
      ],
    },
  ],
  '%': [
    {
      char: '%',
      category: 'symbol',
      grid: [
        0x0c01, 0x1e03, 0x1e06, 0x0c0c, 0x0018, 0x0030, 0x0060, 0x00c0,
        0x0180, 0x0300, 0x0600, 0x0c00, 0x1818, 0x303c, 0x603c, 0xc018,
      ],
    },
  ],
  // Common Medical Letters
  'B': [
    {
      char: 'B',
      category: 'letter',
      grid: [
        0x1ff0, 0x1ffc, 0x180e, 0x180e, 0x180e, 0x1ffe, 0x1ff8, 0x180c,
        0x180e, 0x180e, 0x180e, 0x180e, 0x1ffc, 0x1ff0, 0x0000, 0x0000,
      ],
    },
  ],
  'P': [
    {
      char: 'P',
      category: 'letter',
      grid: [
        0x1ff0, 0x1ffc, 0x180e, 0x180e, 0x180e, 0x1ffc, 0x1ff0, 0x1800,
        0x1800, 0x1800, 0x1800, 0x1800, 0x1800, 0x1800, 0x0000, 0x0000,
      ],
    },
  ],
  'H': [
    {
      char: 'H',
      category: 'letter',
      grid: [
        0x1818, 0x1818, 0x1818, 0x1818, 0x1818, 0x1ffe, 0x1ffe, 0x1818,
        0x1818, 0x1818, 0x1818, 0x1818, 0x1818, 0x1818, 0x0000, 0x0000,
      ],
    },
  ],
  'R': [
    {
      char: 'R',
      category: 'letter',
      grid: [
        0x1ff0, 0x1ffc, 0x180e, 0x180e, 0x180e, 0x1ff8, 0x1ffc, 0x181e,
        0x180e, 0x180e, 0x1806, 0x1806, 0x1806, 0x1806, 0x0000, 0x0000,
      ],
    },
  ],
  'T': [
    {
      char: 'T',
      category: 'letter',
      grid: [
        0x7ffe, 0x7ffe, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180,
        0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0000, 0x0000,
      ],
    },
  ],
  'S': [
    {
      char: 'S',
      category: 'letter',
      grid: [
        0x07e0, 0x1ff0, 0x3818, 0x3000, 0x1f80, 0x0fe0, 0x01f0, 0x0038,
        0x0018, 0x3018, 0x3838, 0x1ff0, 0x07e0, 0x0000, 0x0000, 0x0000,
      ],
    },
  ],
};

// Flattened prototype list for rapid classification
const PROTOTYPE_LIST: { char: string; grid: number[]; category: 'digit' | 'symbol' | 'letter' }[] = [];
for (const [key, protos] of Object.entries(OCR_PROTOTYPES)) {
  for (const p of protos) {
    PROTOTYPE_LIST.push(p);
  }
}

/**
 * Common medical abbreviations and vocabulary
 */
const MEDICAL_KEYWORDS: string[] = [
  'BP', 'HR', 'RR', 'TEMP', 'SPO2', 'MG', 'ML', 'MCG', 'TAB', 'PO', 'IV', 'IM',
  'BID', 'TID', 'QID', 'PRN', 'STAT', 'YO', 'YOF', 'YOM', 'CC', 'BPM', 'MMHG',
  'KG', 'G', 'NORMAL', 'HIGH', 'LOW', 'MILD', 'PAIN', 'SOB', 'NAD',
];

export class HandwritingOcrService {
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

    const isNumeric = /^[\d\s\/\.\-%+]+$/.test(finalOutput.trim());

    return {
      text: finalOutput,
      confidence: Math.round(avgConfidence * 100) / 100,
      isNumeric,
      parsedVitals: vitals,
    };
  }

  /**
   * Groups strokes into separate character glyphs based on X-axis overlap and spacing.
   * FIX: Never merge adjacent digits separated by a horizontal gap!
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

    // Sort strokes by horizontal position (minX)
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
      // Check horizontal overlap between previous glyph and current stroke
      const overlapX = Math.min(last.maxX, sb.maxX) - Math.max(last.minX, sb.minX);
      const minW = Math.min(last.width, sb.width);
      const isContainedX = sb.minX >= last.minX - 4 && sb.maxX <= last.maxX + 4;
      const isOverlappingSignificantly = overlapX > 0.3 * minW;

      // Vertical proximity check (ensures they aren't on different lines)
      const overlapY = Math.min(last.maxY, sb.maxY) - Math.max(last.minY, sb.minY);
      const hasVerticalProximity = overlapY > -15;

      // Only merge if strokes are part of the same multi-stroke character (e.g. cross of +, t, 4, %)
      // or one stroke is contained inside another horizontally
      if ((isOverlappingSignificantly || isContainedX) && hasVerticalProximity) {
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
   * Classifies a glyph using geometric properties, Euler/loop topological features,
   * aspect-ratio preserved bitmasking, and multi-template matching.
   */
  private static classifyGlyph(glyph: GlyphBounds): { char: string; confidence: number } {
    // 1. Check for single dot or period
    if (glyph.width < 12 && glyph.height < 12) {
      return { char: '.', confidence: 0.95 };
    }

    // 2. Check for horizontal hyphen or minus
    const aspectRatio = glyph.width / Math.max(1, glyph.height);
    if (aspectRatio > 2.2 && glyph.height < 18) {
      return { char: '-', confidence: 0.94 };
    }

    // 3. Aspect-ratio-preserved rasterization
    const grid16 = this.rasterizeToGrid16(glyph);

    // 4. Topological Loop Detection using Flood Fill
    const loops = this.detectEnclosedLoops(grid16);

    // 5. Stroke Trajectory Analysis
    const isSingleStroke = glyph.strokes.length === 1;
    let isStraightVertical = false;
    let isForwardSlash = false;

    if (isSingleStroke && glyph.strokes[0].points.length >= 2) {
      const pts = glyph.strokes[0].points;
      const startP = pts[0];
      const endP = pts[pts.length - 1];
      const dx = endP.x - startP.x;
      const dy = endP.y - startP.y;

      // Vertical line test (Digit '1')
      if (Math.abs(dx) < Math.abs(dy) * 0.35 && Math.abs(dy) > 15) {
        isStraightVertical = true;
      }

      // Forward slash test ('/')
      // Either starts top-right and goes bottom-left (dx < 0, dy > 0)
      // or starts bottom-left and goes top-right (dx > 0, dy < 0)
      const slope = dx !== 0 ? dy / dx : 999;
      if (slope < -0.4 && slope > -4.0) {
        isForwardSlash = true;
      }
    }

    // 6. Base & Top Arc Features
    let maxBottomSpan = 0;
    for (let r = 13; r <= 15; r++) {
      const row = grid16[r] || 0;
      let minC = 16, maxC = -1;
      for (let c = 0; c < 16; c++) {
        if ((row & (1 << (15 - c))) !== 0) {
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
      if (maxC >= minC) {
        maxBottomSpan = Math.max(maxBottomSpan, maxC - minC + 1);
      }
    }
    const hasWideBottomBase = maxBottomSpan >= 6;

    let topHasLeft = false, topHasRight = false;
    for (let r = 0; r <= 4; r++) {
      const row = grid16[r] || 0;
      if (row & 0xfe00) topHasLeft = true;
      if (row & 0x01fe) topHasRight = true;
    }
    const hasTopArc = topHasLeft && topHasRight;

    // 7. Multi-template Jaccard similarity comparison
    let bestChar = '0';
    let bestScore = -1;

    for (const proto of PROTOTYPE_LIST) {
      const sim = this.computeGridSimilarity(grid16, proto.grid);
      let score = sim;

      // Boost / Penalty adjustments based on extracted structural features

      // Digit '1': tall, narrow, vertical, zero loops
      if (proto.char === '1') {
        if (isStraightVertical || (aspectRatio < 0.4 && !hasWideBottomBase && !hasTopArc)) {
          score += 0.35;
        }
        if (loops.count > 0 || hasWideBottomBase) {
          score -= 0.4;
        }
      }

      // Slash '/': tilted, moderate aspect ratio, zero loops
      if (proto.char === '/') {
        if (isForwardSlash && loops.count === 0) {
          score += 0.38;
        }
        if (loops.count > 0) {
          score -= 0.5;
        }
      }

      // Digit '2': curved top + wide horizontal base
      if (proto.char === '2') {
        if (hasWideBottomBase) score += 0.22;
        if (hasTopArc && hasWideBottomBase) score += 0.15;
        if (isStraightVertical) score -= 0.4;
      }

      // Digit '0': single enclosed loop in center
      if (proto.char === '0') {
        if (loops.count === 1 && loops.avgY >= 5 && loops.avgY <= 10) {
          score += 0.3;
        }
        if (isStraightVertical || isForwardSlash) {
          score -= 0.5;
        }
      }

      // Digit '8': two enclosed loops (or stacked loops)
      if (proto.char === '8') {
        if (loops.count >= 2) {
          score += 0.45;
        } else if (loops.count === 1) {
          score += 0.1;
        }
      }

      // Digit '6': enclosed loop at bottom
      if (proto.char === '6') {
        if (loops.count === 1 && loops.avgY >= 8) {
          score += 0.35;
        }
      }

      // Digit '9': enclosed loop at top
      if (proto.char === '9') {
        if (loops.count === 1 && loops.avgY <= 7) {
          score += 0.35;
        }
      }

      // Digit '7': wide top bar, slanting down to bottom
      if (proto.char === '7') {
        if (loops.count === 0 && !hasWideBottomBase && topHasRight) {
          score += 0.18;
        }
      }

      // Digit '4': two strokes or open top
      if (proto.char === '4') {
        if (glyph.strokes.length >= 2 || (loops.count === 1 && loops.avgY <= 9)) {
          score += 0.15;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestChar = proto.char;
      }
    }

    const confidence = Math.min(0.99, Math.max(0.4, bestScore));
    return { char: bestChar, confidence };
  }

  /**
   * Rasterizes glyph stroke points into a 16-row integer bitmask (16x16 binary grid)
   * PRESERVES ASPECT RATIO to avoid distorting narrow strokes or flat symbols!
   */
  private static rasterizeToGrid16(glyph: GlyphBounds): number[] {
    const grid: number[] = new Array(16).fill(0);
    const maxDim = Math.max(glyph.width, glyph.height, 1);

    // Scale uniformly to fit within 13x13 box inside the 16x16 canvas
    const scale = 13.0 / maxDim;

    const scaledW = glyph.width * scale;
    const scaledH = glyph.height * scale;
    const offsetX = Math.round((15 - scaledW) / 2);
    const offsetY = Math.round((15 - scaledH) / 2);

    for (const stroke of glyph.strokes) {
      for (let i = 0; i < stroke.points.length; i++) {
        const p1 = stroke.points[i];
        const gx = Math.min(15, Math.max(0, Math.round(offsetX + (p1.x - glyph.minX) * scale)));
        const gy = Math.min(15, Math.max(0, Math.round(offsetY + (p1.y - glyph.minY) * scale)));
        grid[gy] |= 1 << (15 - gx);

        // Interpolate line between points to ensure solid strokes
        if (i > 0) {
          const p0 = stroke.points[i - 1];
          const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y) * scale;
          const steps = Math.max(1, Math.round(dist * 2));
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const ix = Math.round(offsetX + (p0.x + (p1.x - p0.x) * t - glyph.minX) * scale);
            const iy = Math.round(offsetY + (p0.y + (p1.y - p0.y) * t - glyph.minY) * scale);
            if (ix >= 0 && ix <= 15 && iy >= 0 && iy <= 15) {
              grid[iy] |= 1 << (15 - ix);
            }
          }
        }
      }
    }

    return grid;
  }

  /**
   * Topological Loop Detection:
   * Uses 2D Flood Fill from the 16x16 border to find interior enclosed background regions (holes).
   */
  private static detectEnclosedLoops(grid16: number[]): { count: number; avgY: number } {
    // 0 = background, 1 = stroke
    const matrix: number[][] = Array.from({ length: 16 }, (_, r) => {
      const row = grid16[r] || 0;
      return Array.from({ length: 16 }, (_, c) => ((row & (1 << (15 - c))) !== 0 ? 1 : 0));
    });

    const visited: boolean[][] = Array.from({ length: 16 }, () => new Array(16).fill(false));

    // Flood fill from all outer borders
    const queue: [number, number][] = [];
    for (let r = 0; r < 16; r++) {
      if (matrix[r][0] === 0) { visited[r][0] = true; queue.push([r, 0]); }
      if (matrix[r][15] === 0) { visited[r][15] = true; queue.push([r, 15]); }
    }
    for (let c = 0; c < 16; c++) {
      if (matrix[0][c] === 0 && !visited[0][c]) { visited[0][c] = true; queue.push([0, c]); }
      if (matrix[15][c] === 0 && !visited[15][c]) { visited[15][c] = true; queue.push([15, c]); }
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
        if (nr >= 0 && nr < 16 && nc >= 0 && nc < 16) {
          if (!visited[nr][nc] && matrix[nr][nc] === 0) {
            visited[nr][nc] = true;
            queue.push([nr, nc]);
          }
        }
      }
    }

    // Any unvisited 0 is an interior hole/loop!
    let loopCount = 0;
    let totalLoopY = 0;
    let loopPixels = 0;

    for (let r = 1; r < 15; r++) {
      for (let c = 1; c < 15; c++) {
        if (matrix[r][c] === 0 && !visited[r][c]) {
          // Found a new enclosed component
          loopCount++;
          const loopQ: [number, number][] = [[r, c]];
          visited[r][c] = true;

          while (loopQ.length > 0) {
            const [lr, lc] = loopQ.shift()!;
            totalLoopY += lr;
            loopPixels++;

            const nbs = [
              [lr - 1, lc],
              [lr + 1, lc],
              [lr, lc - 1],
              [lr, lc + 1],
            ];
            for (const [nnr, nnc] of nbs) {
              if (nnr >= 0 && nnr < 16 && nnc >= 0 && nnc < 16) {
                if (!visited[nnr][nnc] && matrix[nnr][nnc] === 0) {
                  visited[nnr][nnc] = true;
                  loopQ.push([nnr, nnc]);
                }
              }
            }
          }
        }
      }
    }

    const avgY = loopPixels > 0 ? totalLoopY / loopPixels : 8;
    return { count: loopCount, avgY };
  }

  /**
   * Computes Jaccard bit similarity between two 16x16 grids
   */
  private static computeGridSimilarity(gridA: number[], gridB: number[]): number {
    let intersection = 0;
    let union = 0;

    for (let r = 0; r < 16; r++) {
      const a = gridA[r] || 0;
      const b = gridB[r] || 0;

      const andBits = a & b;
      const orBits = a | b;

      intersection += this.countSetBits(andBits);
      union += this.countSetBits(orBits);
    }

    if (union === 0) return 0;
    return intersection / union;
  }

  private static countSetBits(n: number): number {
    let count = 0;
    let val = n;
    while (val > 0) {
      val &= val - 1;
      count++;
    }
    return count;
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
    if (/[0-9]/.test(trimmed) && (trimmed.includes('O') || trimmed.includes('o') || trimmed.includes('l') || trimmed.includes('I'))) {
      const corrected = trimmed
        .replace(/[Oo]/g, '0')
        .replace(/[lI]/g, '1');
      if (/^[\d\/\.\-%+ ]+$/.test(corrected)) {
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
