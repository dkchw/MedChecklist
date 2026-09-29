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
  { name: 'Clinical White', value: '#f8fafc' },
  { name: 'Clinical Black', value: '#0f172a' },
  { name: 'Medical Blue', value: '#38bdf8' },
  { name: 'Critical Red', value: '#f87171' },
  { name: 'Alert Amber', value: '#fbbf24' },
  { name: 'Vitals Green', value: '#34d399' },
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
