import { db } from '../db/db';

export interface KeyboardLanguageConfig {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  rows: string[][];
  keys: string[];
  clinicalShortcuts: string[];
}

export const SUPPORTED_KEYBOARDS: KeyboardLanguageConfig[] = [
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    rows: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '/', '.', '-'],
      ['+', '%', '=', '<', '>', '(', ')', '#', '@', ':']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['BP', 'HR', 'RR', 'SpO2', 'Temp', 'mg', 'ml', 'mcg', 'IV', 'PO', 'q4h', 'PRN', 'BID', 'TID', 'STAT']
  },
  {
    id: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    rows: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '/', '-'],
      ['á', 'à', 'ả', 'ã', 'ạ', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'í', 'ì', 'ỉ', 'ĩ', 'ị'],
      ['ó', 'ò', 'ỏ', 'õ', 'ọ', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['Huyết áp', 'Mạch', 'Nhiệt độ', 'Nhịp thở', 'SpO2', 'Tiền sử', 'Bệnh sử', 'Chẩn đoán', 'Xử trí', 'Thuốc', 'Khám']
  },
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    rows: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '¿', '¡', '.'],
      ['á', 'é', 'í', 'ó', 'ú', 'ü', '/', '-', '+', '%']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['Presión', 'Pulso', 'Temp', 'SatO2', 'Frecuencia', 'Dolor', 'Diagnóstico', 'Tratamiento']
  },
  {
    id: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    rows: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
      ['w', 'x', 'c', 'v', 'b', 'n', 'é', 'è', 'ê', 'ë'],
      ['à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ', 'æ', '.', '/']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['TA', 'Pouls', 'Temp', 'SpO2', 'FR', 'Douleur', 'Ordonnance', 'Bilan']
  },
  {
    id: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    rows: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p', 'ü'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ö', 'ä'],
      ['y', 'x', 'c', 'v', 'b', 'n', 'm', 'ß', '.', '/', '-']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['RR', 'Puls', 'Temp', 'SpO2', 'AF', 'Befund', 'Diagnose', 'Therapie']
  },
  {
    id: 'ja',
    name: 'Japanese Medical',
    nativeName: '日本語',
    flag: '🇯🇵',
    rows: [
      ['血圧', '脈拍', '体温', 'SpO2', '呼吸', '心拍'],
      ['主訴', '現病歴', '既往歴', '処方', '点滴', '投薬'],
      ['右', '左', '両側', '正常', '異常', '検査', '所見'],
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '/', '.']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['BP', 'HR', 'SpO2', '血圧正常', '発熱あり', '疼痛なし']
  },
  {
    id: 'zh',
    name: 'Chinese Medical',
    nativeName: '中文',
    flag: '🇨🇳',
    rows: [
      ['血压', '心率', '体温', '血氧', '呼吸', '心搏'],
      ['主诉', '现病史', '既往史', '诊断', '处方', '给药'],
      ['左', '右', '双侧', '正常', '异常', '阴性', '阳性'],
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '/', '.']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['血压', '心率', 'SpO2', '无特殊', '对症支持']
  },
  {
    id: 'med_symbols',
    name: 'Medical & Scientific Symbols',
    nativeName: 'Symbols & Units',
    flag: '⚕️',
    rows: [
      ['α', 'β', 'γ', 'δ', 'Δ', 'μ', 'λ', 'π', 'θ', '±', '°'],
      ['≥', '≤', '≠', '≈', '×', '÷', '↑', '↓', '→', '←', '‰'],
      ['♀', '♂', '~', '<', '>', '=', '(', ')', '[', ']', '/'],
      ['mmHg', 'bpm', '°C', '°F', 'mg/dL', 'mmol/L', 'g/dL', '/min']
    ],
    get keys() {
      return this.rows.flat();
    },
    clinicalShortcuts: ['120/80', '72 bpm', '37.0°C', '98%', 'IV bolus', 'PO bid']
  }
];

export const getKeyboardRows = (kb: KeyboardLanguageConfig): string[][] => {
  if (kb.rows && kb.rows.length > 0) return kb.rows;
  const rows: string[][] = [];
  for (let i = 0; i < kb.keys.length; i += 10) {
    rows.push(kb.keys.slice(i, i + 10));
  }
  return rows;
};

export const DEFAULT_KEYBOARDS = ['en', 'vi', 'med_symbols'];

export const getEnabledKeyboards = async (): Promise<string[]> => {
  try {
    const record = await db.settings.get('enabled_keyboards');
    if (record && Array.isArray(record.value) && record.value.length > 0) {
      return record.value;
    }
  } catch {}
  return DEFAULT_KEYBOARDS;
};

export const saveEnabledKeyboards = async (ids: string[]): Promise<void> => {
  try {
    await db.settings.put({ key: 'enabled_keyboards', value: ids });
  } catch {}
};
