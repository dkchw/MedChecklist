import { ChecklistTemplate, Folder } from '../types/checklist';
import { PatientEncounter } from '../types/patient';

export const INITIAL_FOLDERS: Folder[] = [
  { id: 'f-cardio', name: 'Cardiology & ER', icon: 'HeartPulse', order: 1 },
  { id: 'f-icu', name: 'ICU & Critical Care', icon: 'Activity', order: 2 },
  { id: 'f-labs', name: 'Hospital Lab References', icon: 'FlaskConical', order: 3 },
  { id: 'f-ward', name: 'Internal Medicine & Ward', icon: 'Stethoscope', order: 4 },
  { id: 'f-surgery', name: 'Surgical & Pre-Op', icon: 'Scissors', order: 5 },
];

export const INITIAL_TEMPLATES: ChecklistTemplate[] = [
  {
    id: 'tpl-ros-soap',
    title: 'Review of Systems & History (H&P)',
    description: 'Comprehensive review of systems for bedside admissions and consultations.',
    category: 'Internal Medicine & Ward',
    institution: 'Standard Clinical Guidelines',
    tags: ['history', 'ros', 'admission', 'internal-medicine'],
    isPinned: true,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-ros-gen',
        title: 'Constitutional & General',
        items: [
          { id: 'item-cg-1', text: 'Fever or chills', checked: false },
          { id: 'item-cg-2', text: 'Unexplained weight loss or night sweats', checked: false },
          { id: 'item-cg-3', text: 'Severe fatigue or generalized weakness', checked: false },
        ]
      },
      {
        id: 'sec-ros-cv',
        title: 'Cardiovascular & Respiratory',
        items: [
          { id: 'item-cv-1', text: 'Chest pain or pressure (substernal / pleuritic)', checked: false, starred: true },
          { id: 'item-cv-2', text: 'Dyspnea on exertion or at rest', checked: false },
          { id: 'item-cv-3', text: 'Orthopnea (2+ pillows) or PND', checked: false },
          { id: 'item-cv-4', text: 'Palpitations or irregular pulse', checked: false },
          { id: 'item-cv-5', text: 'Bilateral lower extremity edema', checked: false },
        ]
      },
      {
        id: 'sec-ros-gi',
        title: 'Gastrointestinal & Abdomen',
        items: [
          { id: 'item-gi-1', text: 'Nausea or vomiting', checked: false },
          { id: 'item-gi-2', text: 'Abdominal pain (RUQ, RLQ, epigastric)', checked: false },
          { id: 'item-gi-3', text: 'Melena, hematochezia, or hematemesis', checked: false, starred: true },
          { id: 'item-gi-4', text: 'Change in bowel habits or jaundice', checked: false },
        ]
      },
      {
        id: 'sec-ros-neuro',
        title: 'Neurological & Cognitive',
        items: [
          { id: 'item-neuro-1', text: 'Acute focal neurological deficit (FAST)', checked: false, starred: true },
          { id: 'item-neuro-2', text: 'Syncope or presyncope episode', checked: false },
          { id: 'item-neuro-3', text: 'Altered mental status / confusion', checked: false },
          { id: 'item-neuro-4', text: 'Severe thunderclap headache', checked: false, starred: true },
        ]
      }
    ]
  },
  {
    id: 'tpl-labs-ref',
    title: 'Hospital Lab Reference Ranges Panel',
    description: 'Customizable hospital laboratory reference ranges (CBC, BMP, Coagulation, Cardiac Troponin).',
    category: 'Hospital Lab References',
    institution: 'Hospital Central Lab (Customizable)',
    tags: ['labs', 'reference-values', 'chemistry', 'hematology'],
    isPinned: true,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-lab-cbc',
        title: 'Complete Blood Count (CBC)',
        description: 'Adult reference standards - adjust to match your hospital laboratory cutoff.',
        items: [
          { id: 'item-cbc-wbc', text: 'WBC (White Blood Cells)', checked: false, referenceValue: '4.5 - 11.0 x10^3/uL', unit: 'x10^3/uL' },
          { id: 'item-cbc-hgb', text: 'Hemoglobin (Hgb)', checked: false, referenceValue: '13.5 - 17.5 g/dL (M), 12.0 - 15.5 g/dL (F)', unit: 'g/dL' },
          { id: 'item-cbc-plt', text: 'Platelets', checked: false, referenceValue: '150 - 450 x10^3/uL', unit: 'x10^3/uL' },
        ]
      },
      {
        id: 'sec-lab-bmp',
        title: 'Basic Metabolic Panel (BMP)',
        description: 'Renal & Electrolyte bounds.',
        items: [
          { id: 'item-bmp-na', text: 'Sodium (Na+)', checked: false, referenceValue: '135 - 145 mEq/L', unit: 'mEq/L' },
          { id: 'item-bmp-k', text: 'Potassium (K+)', checked: false, referenceValue: '3.5 - 5.0 mEq/L', unit: 'mEq/L' },
          { id: 'item-bmp-cl', text: 'Chloride (Cl-)', checked: false, referenceValue: '96 - 106 mEq/L', unit: 'mEq/L' },
          { id: 'item-bmp-co2', text: 'Bicarbonate (CO2)', checked: false, referenceValue: '22 - 29 mEq/L', unit: 'mEq/L' },
          { id: 'item-bmp-bun', text: 'Blood Urea Nitrogen (BUN)', checked: false, referenceValue: '7 - 20 mg/dL', unit: 'mg/dL' },
          { id: 'item-bmp-cr', text: 'Serum Creatinine', checked: false, referenceValue: '0.7 - 1.3 mg/dL', unit: 'mg/dL' },
          { id: 'item-bmp-glu', text: 'Fasting Glucose', checked: false, referenceValue: '70 - 99 mg/dL', unit: 'mg/dL' },
        ]
      },
      {
        id: 'sec-lab-cardiac',
        title: 'Cardiac Biomarkers & Coagulation',
        description: 'Troponin and coagulation parameters.',
        items: [
          { id: 'item-card-trop', text: 'High-Sensitivity Troponin I', checked: false, referenceValue: '< 14 ng/L (Normal)', unit: 'ng/L', starred: true },
          { id: 'item-card-bnp', text: 'BNP (B-type Natriuretic Peptide)', checked: false, referenceValue: '< 100 pg/mL', unit: 'pg/mL' },
          { id: 'item-coag-inr', text: 'INR (International Normalized Ratio)', checked: false, referenceValue: '0.8 - 1.1 (Non-anticoagulated)', unit: 'ratio' },
          { id: 'item-coag-ddimer', text: 'D-Dimer', checked: false, referenceValue: '< 0.50 ug/mL FEU', unit: 'ug/mL' },
        ]
      }
    ]
  },
  {
    id: 'tpl-chest-pain-acs',
    title: 'Emergency Chest Pain / ACS Protocol',
    description: 'Acute coronary syndrome triage, TIMI score evaluation, and serial biomarkers.',
    category: 'Cardiology & ER',
    institution: 'AHA/ACC Guidelines',
    tags: ['acs', 'chest-pain', 'triage', 'cardiology', 'urgent'],
    isPinned: true,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-acs-triage',
        title: 'Initial Red Flags & Presentation',
        items: [
          { id: 'item-acs-1', text: 'Pain radiating to left shoulder/arm or jaw', checked: false, starred: true },
          { id: 'item-acs-2', text: 'Associated diaphoresis, dyspnea, nausea', checked: false },
          { id: 'item-acs-3', text: 'Hemodynamic instability (BP < 90 mmHg or HR > 110)', checked: false, starred: true },
          { id: 'item-acs-4', text: 'Relief with sublingual nitroglycerin', checked: false },
        ]
      },
      {
        id: 'sec-acs-ecg',
        title: '12-Lead ECG Findings (< 10 minutes)',
        items: [
          { id: 'item-ecg-1', text: 'ST elevation >= 1mm in 2 contiguous leads (STEMI)', checked: false, starred: true },
          { id: 'item-ecg-2', text: 'New or presumed new Left Bundle Branch Block (LBBB)', checked: false, starred: true },
          { id: 'item-ecg-3', text: 'ST depressions or T-wave inversions (NSTEMI / Unstable Angina)', checked: false },
        ]
      },
      {
        id: 'sec-acs-tx',
        title: 'Immediate Treatment & Antithrombotic',
        items: [
          { id: 'item-tx-1', text: 'Aspirin 324 mg chewable given', checked: false },
          { id: 'item-tx-2', text: 'P2Y12 inhibitor loaded (Ticagrelor 180mg or Clopidogrel 600mg)', checked: false },
          { id: 'item-tx-3', text: 'Anticoagulation initiated (Heparin IV bolus + drip)', checked: false },
          { id: 'item-tx-4', text: 'Cath lab notified (Door-to-Balloon target < 90 min)', checked: false, starred: true },
        ]
      }
    ]
  },
  {
    id: 'tpl-sepsis-bundle',
    title: 'Sepsis 3.0 & SOFA Resuscitation Bundle',
    description: 'Hour-1 Sepsis resuscitation checklist and qSOFA scoring.',
    category: 'ICU & Critical Care',
    institution: 'Surviving Sepsis Campaign',
    tags: ['sepsis', 'icu', 'resuscitation', 'qsofa', 'urgent'],
    isPinned: false,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-sep-qsofa',
        title: 'qSOFA Screening (>= 2 criteria)',
        items: [
          { id: 'item-qsofa-1', text: 'Respiratory rate >= 22 /min', checked: false },
          { id: 'item-qsofa-2', text: 'Altered mentation (GCS < 15)', checked: false },
          { id: 'item-qsofa-3', text: 'Systolic blood pressure <= 100 mmHg', checked: false, starred: true },
        ]
      },
      {
        id: 'sec-sep-hour1',
        title: 'Hour-1 Bundle Interventions',
        items: [
          { id: 'item-h1-1', text: 'Measure initial blood lactate level', checked: false },
          { id: 'item-h1-2', text: 'Obtain 2 sets of blood cultures prior to antibiotics', checked: false },
          { id: 'item-h1-3', text: 'Administer broad-spectrum IV antimicrobials', checked: false, starred: true },
          { id: 'item-h1-4', text: 'Rapid 30 mL/kg crystalloid bolus for hypotension or lactate >= 4 mmol/L', checked: false },
          { id: 'item-h1-5', text: 'Start vasopressors (Norepinephrine) if MAP < 65 mmHg after fluid', checked: false, starred: true },
        ]
      }
    ]
  },
  {
    id: 'tpl-preop-eval',
    title: 'Pre-Operative Assessment & Clearance',
    description: 'Anesthesia and surgical safety verification prior to surgery.',
    category: 'Surgical & Pre-Op',
    institution: 'Surgical Safety Checklist',
    tags: ['pre-op', 'surgery', 'anesthesia', 'safety'],
    isPinned: false,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-preop-status',
        title: 'Patient Status & Clearance',
        items: [
          { id: 'item-pre-1', text: 'Strict NPO confirmed (>= 6 hrs light meal, >= 2 hrs clear liquids)', checked: false },
          { id: 'item-pre-2', text: 'Informed surgical & anesthesia consent signed and in chart', checked: false, starred: true },
          { id: 'item-pre-3', text: 'Airway evaluated (Mallampati score documented)', checked: false },
          { id: 'item-pre-4', text: 'Anticoagulation held (Warfarin/DOAC hold schedule verified)', checked: false, starred: true },
          { id: 'item-pre-5', text: 'Type & Screen / Crossmatch active in Blood Bank', checked: false },
        ]
      }
    ]
  }
];

export const INITIAL_ENCOUNTERS: PatientEncounter[] = [
  {
    id: 'enc-sample-1',
    patientIdentifier: 'Bed 4 - Doe, J.',
    age: '62',
    sex: 'M',
    bedNumber: '4A',
    chiefComplaint: 'Acute retrosternal chest pain with diaphoresis',
    status: 'active',
    tags: ['#cardio', '#urgent', '#triage'],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    generalNotes: `- Bedside ECG: T-wave inversion in V3-V5
- Sublingual nitro x1 administered at 14:15, partial relief
- Cardiology fellow on call paged`,
    checklists: [
      {
        id: 'inst-1',
        templateId: 'tpl-chest-pain-acs',
        title: 'Emergency Chest Pain / ACS Protocol',
        institution: 'AHA/ACC Guidelines',
        sections: [
          {
            id: 'sec-acs-triage',
            title: 'Initial Red Flags & Presentation',
            items: [
              { id: 'item-acs-1', text: 'Pain radiating to left shoulder/arm or jaw', checked: true, starred: true, note: 'Radiating to left shoulder & arm for 90 minutes' },
              { id: 'item-acs-2', text: 'Associated diaphoresis, dyspnea, nausea', checked: true, note: 'Profuse sweating upon EMS arrival' },
              { id: 'item-acs-3', text: 'Hemodynamic instability (BP < 90 mmHg or HR > 110)', checked: false, starred: true, note: 'BP 138/84, HR 88' },
              { id: 'item-acs-4', text: 'Relief with sublingual nitroglycerin', checked: true, note: 'Pain reduced from 8/10 to 4/10' },
            ]
          },
          {
            id: 'sec-acs-ecg',
            title: '12-Lead ECG Findings (< 10 minutes)',
            items: [
              { id: 'item-ecg-1', text: 'ST elevation >= 1mm in 2 contiguous leads (STEMI)', checked: false, starred: true },
              { id: 'item-ecg-2', text: 'New or presumed new Left Bundle Branch Block (LBBB)', checked: false, starred: true },
              { id: 'item-ecg-3', text: 'ST depressions or T-wave inversions (NSTEMI / Unstable Angina)', checked: true, note: 'Deep TWI in anterior leads' },
            ]
          }
        ]
      },
      {
        id: 'inst-2',
        templateId: 'tpl-labs-ref',
        title: 'Hospital Lab Reference Ranges Panel',
        institution: 'Hospital Central Lab',
        sections: [
          {
            id: 'sec-lab-cardiac',
            title: 'Cardiac Biomarkers & Coagulation',
            items: [
              { id: 'item-card-trop', text: 'High-Sensitivity Troponin I', checked: true, referenceValue: '< 14 ng/L (Normal)', labValue: '148 ng/L (Elevated)', starred: true, note: 'Stat delta troponin ordered in 1 hour' },
              { id: 'item-coag-inr', text: 'INR (International Normalized Ratio)', checked: false, referenceValue: '0.8 - 1.1', labValue: '1.0' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'enc-sample-2',
    patientIdentifier: 'Bed 7 - Chen, M.',
    age: '49',
    sex: 'F',
    bedNumber: '7B',
    chiefComplaint: 'Fever, cough, and right lower lobe consolidation',
    status: 'active',
    tags: ['#ward', '#pulm', '#antibiotics'],
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now(),
    generalNotes: `- O2 sat 94% on room air
- Started on Ceftriaxone + Azithromycin
- Sputum culture sent to microbiology`,
    checklists: [
      {
        id: 'inst-3',
        templateId: 'tpl-ros-soap',
        title: 'Review of Systems & History (H&P)',
        sections: [
          {
            id: 'sec-ros-gen',
            title: 'Constitutional & General',
            items: [
              { id: 'item-cg-1', text: 'Fever or chills', checked: true, note: 'Tmax 38.9 C at home' },
              { id: 'item-cg-2', text: 'Unexplained weight loss or night sweats', checked: false },
              { id: 'item-cg-3', text: 'Severe fatigue or generalized weakness', checked: true },
            ]
          },
          {
            id: 'sec-ros-cv',
            title: 'Cardiovascular & Respiratory',
            items: [
              { id: 'item-cv-1', text: 'Chest pain or pressure (substernal / pleuritic)', checked: true, note: 'Right pleuritic chest pain with deep inspiration' },
              { id: 'item-cv-2', text: 'Dyspnea on exertion or at rest', checked: true, note: 'Mild dyspnea with walking to bathroom' },
            ]
          }
        ]
      }
    ]
  }
];
