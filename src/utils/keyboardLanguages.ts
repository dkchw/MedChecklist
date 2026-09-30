import { db } from '../db/db';

export interface KeyboardLanguageConfig {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  keys: string[];
  clinicalShortcuts: string[];
}

export const SUPPORTED_KEYBOARDS: KeyboardLanguageConfig[] = [
  {
    id: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    keys: [
      'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
      'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
      'z', 'x', 'c', 'v', 'b', 'n', 'm',
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
      '/', '.', '-', '+', '%', '=', '<', '>', '(', ')'
    ],
    clinicalShortcuts: ['BP', 'HR', 'RR', 'SpO2', 'Temp', 'mg', 'ml', 'mcg', 'IV', 'PO', 'q4h', 'PRN', 'BID', 'TID', 'STAT']
  },
  {
    id: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    keys: [
      'ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư',
      'á', 'à', 'ả', 'ã', 'ạ',
      'ắ', 'ằ', 'ẳ', 'ẵ', 'ặ',
      'ấ', 'ầ', 'ẩ', 'ẫ', 'ậ',
      'ế', 'ề', 'ể', 'ễ', 'ệ',
      'ố', 'ồ', 'ổ', 'ỗ', 'ộ',
      'ớ', 'ờ', 'ở', 'ỡ', 'ợ',
      'ứ', 'ừ', 'ử', 'ữ', 'ự',
      'í', 'ì', 'ỉ', 'ĩ', 'ị',
      'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ'
    ],
    clinicalShortcuts: ['Huyết áp', 'Mạch', 'Nhiệt độ', 'Nhịp thở', 'SpO2', 'Tiền sử', 'Bệnh sử', 'Chẩn đoán', 'Xử trí', 'Thuốc', 'Khám']
  },
  {
    id: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    keys: [
      'ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡',
      'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
      'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
      'z', 'x', 'c', 'v', 'b', 'n', 'm'
    ],
    clinicalShortcuts: ['Presión', 'Pulso', 'Temp', 'SatO2', 'Frecuencia', 'Dolor', 'Diagnóstico', 'Tratamiento']
  },
  {
    id: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    keys: [
      'é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'ù', 'û', 'œ', 'æ',
      'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
      'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
      'z', 'x', 'c', 'v', 'b', 'n', 'm'
    ],
    clinicalShortcuts: ['TA', 'Pouls', 'Temp', 'SpO2', 'FR', 'Douleur', 'Ordonnance', 'Bilan']
  },
  {
    id: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    keys: [
      'ä', 'ö', 'ü', 'ß',
      'q', 'w', 'e', 'r', 't', 'z', 'u', 'i', 'o', 'p',
      'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
      'y', 'x', 'c', 'v', 'b', 'n', 'm'
    ],
    clinicalShortcuts: ['RR', 'Puls', 'Temp', 'SpO2', 'AF', 'Befund', 'Diagnose', 'Therapie']
  },
  {
    id: 'ja',
    name: 'Japanese Medical',
    nativeName: '日本語',
    flag: '🇯🇵',
    keys: [
      '血圧', '脈拍', '体温', 'SpO2', '呼吸', '心拍',
      '主訴', '現病歴', '既往歴', '処方', '点滴',
      '右', '左', '両側', '正常', '異常', '投与', '検査'
    ],
    clinicalShortcuts: ['BP', 'HR', 'SpO2', '血圧正常', '発熱あり', '疼痛なし']
  },
  {
    id: 'zh',
    name: 'Chinese Medical',
    nativeName: '中文',
    flag: '🇨🇳',
    keys: [
      '血压', '心率', '体温', '血氧', '呼吸',
      '主诉', '现病史', '既往史', '诊断', '处方',
      '左', '右', '双侧', '正常', '异常', '阴性', '阳性'
    ],
    clinicalShortcuts: ['血压', '心率', 'SpO2', '无特殊', '对症支持']
  },
  {
    id: 'med_symbols',
    name: 'Medical & Scientific Symbols',
    nativeName: 'Symbols & Units',
    flag: '⚕️',
    keys: [
      'α', 'β', 'γ', 'δ', 'Δ', 'μ', 'λ', 'π', 'θ',
      '±', '°', '≥', '≤', '≠', '≈', '×', '÷',
      '♀', '♂', '↑', '↓', '→', '←', '‰', '~',
      'mmHg', 'bpm', '°C', '°F', 'mg/dL', 'mmol/L',
      'μg/kg/min', 'mEq/L', 'g/dL', '/min'
    ],
    clinicalShortcuts: ['120/80', '72 bpm', '37.0°C', '98%', 'IV bolus', 'PO bid']
  }
];

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
