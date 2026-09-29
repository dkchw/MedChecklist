export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export type PenTool = 'pen' | 'highlighter' | 'eraser';

export interface InkStroke {
  id: string;
  points: StrokePoint[];
  color: string;
  size: number;
  tool: PenTool;
  opacity?: number;
  targetItemId?: string; // Optional anchor to a specific symptom or item
  timestamp: number;
}

export interface PenSettings {
  tool: PenTool;
  color: string;
  size: number;
}

export const PRESET_PEN_COLORS = [
  { name: 'Clinical Black', value: '#0f172a' },
  { name: 'Medical Blue', value: '#0284c7' },
  { name: 'Critical Red', value: '#ef4444' },
  { name: 'Alert Amber', value: '#f59e0b' },
  { name: 'Vitals Green', value: '#10b981' },
  { name: 'Highlighter Yellow', value: 'rgba(250, 204, 21, 0.45)' },
  { name: 'Highlighter Mint', value: 'rgba(52, 211, 153, 0.45)' },
  { name: 'Highlighter Cyan', value: 'rgba(56, 189, 248, 0.45)' },
];

export const PRESET_STROKE_SIZES = [
  { label: 'Fine', size: 2 },
  { label: 'Medium', size: 4 },
  { label: 'Broad', size: 8 },
  { label: 'Marker', size: 14 },
];
