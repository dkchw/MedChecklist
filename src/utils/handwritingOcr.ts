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
 * 16x16 Normalized Prototype Bitmasks for Digits 0-9 and Symbols /, ., -, %
 * Each 16x16 grid is represented as 16 binary numbers (rows).
 */
const DIGIT_PROTOTYPES: Record<string, number[]> = {
  '0': [
    0x07e0, 0x1ff8, 0x3c3c, 0x781e, 0x700e, 0xf00f, 0xe007, 0xe007,
    0xe007, 0xe007, 0xf00f, 0x700e, 0x781e, 0x3c3c, 0x1ff8, 0x07e0,
  ],
  '1': [
    0x0180, 0x0380, 0x0780, 0x0f80, 0x1b80, 0x0180, 0x0180, 0x0180,
    0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0180, 0x0ff0, 0x0ff0,
  ],
  '2': [
    0x0fe0, 0x1ff0, 0x3038, 0x601c, 0x001c, 0x003c, 0x0078, 0x00f0,
    0x01e0, 0x03c0, 0x0780, 0x0f00, 0x1e00, 0x3ffc, 0x7ffe, 0x7ffe,
  ],
  '3': [
    0x0fe0, 0x1ff8, 0x383c, 0x701c, 0x001c, 0x0038, 0x03f0, 0x03f0,
    0x0038, 0x001c, 0x000e, 0x700e, 0x781e, 0x3c3c, 0x1ff8, 0x0fe0,
  ],
  '4': [
    0x0038, 0x0078, 0x00f8, 0x01b8, 0x0338, 0x0638, 0x0c38, 0x1838,
    0x3038, 0x6038, 0x7ffe, 0x7ffe, 0x0038, 0x0038, 0x0038, 0x0038,
  ],
  '5': [
    0x1ffc, 0x1ffc, 0x1c00, 0x1c00, 0x1c00, 0x1fe0, 0x1ff8, 0x003c,
    0x001c, 0x000e, 0x000e, 0x700e, 0x701e, 0x3c3c, 0x1ff8, 0x07e0,
  ],
  '6': [
    0x03f0, 0x0ff8, 0x1e1c, 0x380e, 0x7000, 0xe000, 0xefe0, 0xfff8,
    0xf01c, 0xe00e, 0xe00e, 0xf00e, 0x781c, 0x3c38, 0x1ff0, 0x07e0,
  ],
  '7': [
    0x7ffe, 0x7ffe, 0x001c, 0x0038, 0x0070, 0x00e0, 0x01c0, 0x0380,
    0x0380, 0x0700, 0x0700, 0x0e00, 0x0e00, 0x1c00, 0x1c00, 0x1c00,
  ],
  '8': [
    0x0fe0, 0x1ff8, 0x381c, 0x700e, 0x700e, 0x381c, 0x1ff8, 0x0fe0,
    0x1ff8, 0x381c, 0x700e, 0x700e, 0x700e, 0x381c, 0x1ff8, 0x0fe0,
  ],
  '9': [
    0x0fe0, 0x1ff8, 0x381c, 0x700e, 0xe00e, 0xe00e, 0x701e, 0x3ffc,
    0x1ffc, 0x000e, 0x000e, 0x001c, 0x7038, 0x7870, 0x3fe0, 0x0f80,
  ],
  '/': [
    0x0003, 0x0006, 0x000c, 0x0018, 0x0030, 0x0060, 0x00c0, 0x0180,
    0x0300, 0x0600, 0x0c00, 0x1800, 0x3000, 0x6000, 0xc000, 0x8000,
  ],
  '.': [
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    0x0000, 0x0000, 0x0000, 0x0000, 0x0380, 0x07c0, 0x07c0, 0x0380,
  ],
  '-': [
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x7ffe,
    0x7ffe, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
  ],
};

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

    // 3. Post-process clinical patterns (e.g. BP "120/80", Pulse "72", Temp "37.5")
    const vitals = this.parseClinicalVitals(rawText);
    if (vitals.bp) {
      rawText = vitals.bp;
    }

    const isNumeric = /^[\d\s\/\.\-%+]+$/.test(rawText.trim());

    return {
      text: rawText,
      confidence: Math.round(avgConfidence * 100) / 100,
      isNumeric,
      parsedVitals: vitals,
    };
  }

  /**
   * Groups strokes into separate character glyphs based on X-axis overlap and spacing
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
      // Check if this stroke overlaps or is close to the previous glyph (e.g., crossing of 4 or %)
      const overlapX = Math.min(last.maxX, sb.maxX) - Math.max(last.minX, sb.minX);
      const gapX = sb.minX - last.maxX;
      const avgWidth = (last.width + sb.width) / 2;

      // If strokes overlap significantly or gap is very small compared to glyph height
      if (overlapX > -avgWidth * 0.25 || gapX < last.height * 0.2) {
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
   * Classifies a glyph using geometric properties and normalized 16x16 grid template matching
   */
  private static classifyGlyph(glyph: GlyphBounds): { char: string; confidence: number } {
    // 1. Check for single dot or period
    if (glyph.width < 12 && glyph.height < 12) {
      return { char: '.', confidence: 0.95 };
    }

    // 2. Check for horizontal hyphen or minus
    const aspectRatio = glyph.width / Math.max(1, glyph.height);
    if (aspectRatio > 2.8 && glyph.height < 18) {
      return { char: '-', confidence: 0.92 };
    }

    // 3. Rasterize strokes into a 16x16 binary grid
    const grid16 = this.rasterizeToGrid16(glyph);

    // 4. Compare against prototypes using Jaccard Similarity / Hamming Distance
    let bestChar = '0';
    let bestSimilarity = -1;

    for (const [char, proto] of Object.entries(DIGIT_PROTOTYPES)) {
      const sim = this.computeGridSimilarity(grid16, proto);

      // Heuristic boosters based on stroke geometry
      let adjustedSim = sim;

      // Slash '/' should be tilted: starts top-right, ends bottom-left (or vice versa)
      if (char === '/') {
        if (aspectRatio > 0.4 && aspectRatio < 1.4) {
          const firstStroke = glyph.strokes[0];
          if (firstStroke && firstStroke.points.length >= 2) {
            const startP = firstStroke.points[0];
            const endP = firstStroke.points[firstStroke.points.length - 1];
            const isForwardSlash = (startP.x < endP.x && startP.y > endP.y) || (startP.x > endP.x && startP.y < endP.y);
            if (isForwardSlash) adjustedSim += 0.15;
          }
        }
      }

      // '1' is typically tall and narrow
      if (char === '1' && aspectRatio < 0.45) {
        adjustedSim += 0.2;
      }

      if (adjustedSim > bestSimilarity) {
        bestSimilarity = adjustedSim;
        bestChar = char;
      }
    }

    const confidence = Math.min(0.99, Math.max(0.4, bestSimilarity));
    return { char: bestChar, confidence };
  }

  /**
   * Rasterizes glyph stroke points into a 16-row integer bitmask (16x16 binary grid)
   */
  private static rasterizeToGrid16(glyph: GlyphBounds): number[] {
    const grid: number[] = new Array(16).fill(0);
    const scaleX = 15 / Math.max(1, glyph.width);
    const scaleY = 15 / Math.max(1, glyph.height);

    for (const stroke of glyph.strokes) {
      for (let i = 0; i < stroke.points.length; i++) {
        const p1 = stroke.points[i];
        const gx = Math.min(15, Math.max(0, Math.round((p1.x - glyph.minX) * scaleX)));
        const gy = Math.min(15, Math.max(0, Math.round((p1.y - glyph.minY) * scaleY)));
        grid[gy] |= 1 << (15 - gx);

        // Interpolate line between points to ensure solid strokes
        if (i > 0) {
          const p0 = stroke.points[i - 1];
          const steps = Math.max(
            Math.abs(p1.x - p0.x) * scaleX,
            Math.abs(p1.y - p0.y) * scaleY
          );
          for (let s = 1; s < steps; s++) {
            const interX = Math.round((p0.x + ((p1.x - p0.x) * s) / steps - glyph.minX) * scaleX);
            const interY = Math.round((p0.y + ((p1.y - p0.y) * s) / steps - glyph.minY) * scaleY);
            if (interX >= 0 && interX <= 15 && interY >= 0 && interY <= 15) {
              grid[interY] |= 1 << (15 - interX);
            }
          }
        }
      }
    }

    return grid;
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
      if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 160) {
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

    return { bp, pulse, temp };
  }
}
