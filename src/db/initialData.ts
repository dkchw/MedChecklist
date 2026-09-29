import { Checklist, Folder } from '../types/checklist';
import { ClinicalTemplate } from '../types/template';
import { PatientEncounter } from '../types/patient';

export const INITIAL_FOLDERS: Folder[] = [
  { id: 'f-cardio', name: 'Cardiology & ER', icon: 'HeartPulse', order: 1 },
  { id: 'f-icu', name: 'ICU & Critical Care', icon: 'Activity', order: 2 },
  { id: 'f-labs', name: 'Hospital Lab References', icon: 'FlaskConical', order: 3 },
  { id: 'f-ward', name: 'Internal Medicine & Ward', icon: 'Stethoscope', order: 4 },
  { id: 'f-surgery', name: 'Surgical & Pre-Op', icon: 'Scissors', order: 5 },
];

/**
 * Atomic, modular clinical checklists
 */
export const INITIAL_CHECKLISTS: Checklist[] = [
  {
    id: 'chk-ros-general',
    title: 'Constitutional & General ROS',
    description: 'Systemic signs: fever, weight loss, night sweats, fatigue.',
    category: 'Internal Medicine & Ward',
    institution: 'Standard Clinical Guidelines',
    tags: ['ros', 'history', 'admission'],
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
      }
    ]
  },
  {
    id: 'chk-ros-cardio-resp',
    title: 'Cardiovascular & Respiratory Signs',
    description: 'Chest pain, orthopnea, dyspnea, edema, palpitations.',
    category: 'Cardiology & ER',
    institution: 'Standard Clinical Guidelines',
    tags: ['cardio', 'respiratory', 'ros'],
    isPinned: true,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-ros-cv',
        title: 'Cardiovascular & Respiratory Signs',
        items: [
          { id: 'item-cv-1', text: 'Chest pain or pressure (substernal / pleuritic)', checked: false, starred: true },
          { id: 'item-cv-2', text: 'Dyspnea on exertion or at rest', checked: false },
          { id: 'item-cv-3', text: 'Orthopnea (2+ pillows) or PND', checked: false },
          { id: 'item-cv-4', text: 'Palpitations or irregular pulse', checked: false },
          { id: 'item-cv-5', text: 'Bilateral lower extremity edema', checked: false },
        ]
      }
    ]
  },
  {
    id: 'chk-cbc-panel',
    title: 'Complete Blood Count (CBC) Reference',
    description: 'Hospital laboratory standards for WBC, Hemoglobin, and Platelets.',
    category: 'Hospital Lab References',
    institution: 'Hospital Central Lab (Customizable)',
    tags: ['labs', 'cbc', 'hematology'],
    isPinned: true,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-lab-cbc',
        title: 'Complete Blood Count (CBC)',
        description: 'Adult reference standards.',
        items: [
          { id: 'item-cbc-wbc', text: 'WBC (White Blood Cells)', checked: false, referenceValue: '4.5 - 11.0 x10^3/uL', unit: 'x10^3/uL' },
          { id: 'item-cbc-hgb', text: 'Hemoglobin (Hgb)', checked: false, referenceValue: '13.5 - 17.5 g/dL (M), 12.0 - 15.5 g/dL (F)', unit: 'g/dL' },
          { id: 'item-cbc-plt', text: 'Platelets', checked: false, referenceValue: '150 - 450 x10^3/uL', unit: 'x10^3/uL' },
        ]
      }
    ]
  },
  {
    id: 'chk-bmp-panel',
    title: 'Basic Metabolic Panel (BMP) Reference',
    description: 'Electrolyte, glucose, and renal function reference standards.',
    category: 'Hospital Lab References',
    institution: 'Hospital Central Lab (Customizable)',
    tags: ['labs', 'bmp', 'electrolytes', 'renal'],
    isPinned: true,
    updatedAt: Date.now(),
    sections: [
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
      }
    ]
  },
  {
    id: 'chk-cardiac-biomarkers',
    title: 'Cardiac Biomarkers & Coagulation',
    description: 'High-sensitivity Troponin I, BNP, INR, and D-Dimer bounds.',
    category: 'Hospital Lab References',
    institution: 'Hospital Central Lab',
    tags: ['troponin', 'cardiac', 'coagulation', 'd-dimer'],
    isPinned: true,
    updatedAt: Date.now(),
    sections: [
      {
        id: 'sec-lab-cardiac',
        title: 'Cardiac Biomarkers & Coagulation',
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
    id: 'chk-acs-triage',
    title: 'Emergency Chest Pain Triage Checklist',
    description: 'Red flags, ischemic radiation, hemodynamic stability.',
    category: 'Cardiology & ER',
    institution: 'AHA/ACC Guidelines',
    tags: ['acs', 'chest-pain', 'triage', 'urgent'],
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
        title: 'Immediate Antithrombotic & Cath Protocol',
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
    id: 'chk-sepsis-bundle',
    title: 'Sepsis 3.0 & Hour-1 Resuscitation Checklist',
    description: 'qSOFA screening and initial hour-1 resuscitation steps.',
    category: 'ICU & Critical Care',
    institution: 'Surviving Sepsis Campaign',
    tags: ['sepsis', 'icu', 'resuscitation', 'qsofa'],
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
    id: 'chk-preop-status',
    title: 'Pre-Operative Anesthesia Safety Verification',
    description: 'NPO compliance, consent, airway assessment, and anticoagulation check.',
    category: 'Surgical & Pre-Op',
    institution: 'Surgical Safety Protocol',
    tags: ['pre-op', 'surgery', 'anesthesia'],
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

// Backwards-compatible alias
export const INITIAL_TEMPLATES = INITIAL_CHECKLISTS;

/**
 * Clinical Templates: Group of modular Checklists + Protocol Notes
 */
export const INITIAL_CLINICAL_TEMPLATES: ClinicalTemplate[] = [
  {
    id: 'tpl-acs-bundle',
    title: 'Acute Coronary Syndrome (ACS) Admission Template',
    description: 'Bundles Chest Pain Triage, 12-Lead ECG series, Cardiac Biomarkers, and BMP with cardiology protocol instructions.',
    category: 'Cardiology & ER',
    institution: 'AHA/ACC Guidelines',
    tags: ['acs', 'cardiology', 'triage', 'bundle'],
    checklistIds: ['chk-acs-triage', 'chk-cardiac-biomarkers', 'chk-bmp-panel'],
    isPinned: true,
    updatedAt: Date.now(),
    protocolNotes: `### Acute Coronary Syndrome (ACS) Protocol Guidance:
- **Telemetry**: Continuous ECG monitoring required.
- **Serial Biomarkers**: Repeat High-Sensitivity Troponin at 0h and 2h; delta > 5 ng/L indicates acute myocardial injury.
- **Revascularization**: Notify Cath lab immediately if STEMI or refractory ischemic chest pain with hemodynamic instability.
- **Antiplatelet Therapy**: Administer Aspirin 324 mg chewable + Ticagrelor 180 mg loading dose.`
  },
  {
    id: 'tpl-sepsis-bundle',
    title: 'Severe Sepsis & Septic Shock Resuscitation Template',
    description: 'Combines Sepsis 3.0 Hour-1 Bundle, Complete Blood Count, and Basic Metabolic Panel with Surviving Sepsis guidelines.',
    category: 'ICU & Critical Care',
    institution: 'Surviving Sepsis Campaign',
    tags: ['sepsis', 'icu', 'resuscitation', 'bundle'],
    checklistIds: ['chk-sepsis-bundle', 'chk-cbc-panel', 'chk-bmp-panel'],
    isPinned: true,
    updatedAt: Date.now(),
    protocolNotes: `### Sepsis Hour-1 Clinical Pathway:
- **Resuscitation Target**: Maintain Mean Arterial Pressure (MAP) >= 65 mmHg.
- **Fluid Challenge**: Initial 30 mL/kg balanced crystalloids within first 3 hours if hypotensive or lactate >= 4.0 mmol/L.
- **Cultures & Antibiotics**: Two sets of peripheral blood cultures drawn before broad-spectrum IV antibiotics.
- **Vasopressors**: Norepinephrine infusion as first-choice vasopressor.`
  },
  {
    id: 'tpl-ward-admission',
    title: 'General Internal Medicine Ward Admission Template',
    description: 'Comprehensive admission protocol grouping Review of Systems, CBC, and BMP with standard rounding instructions.',
    category: 'Internal Medicine & Ward',
    institution: 'Hospital Central Medicine',
    tags: ['admission', 'internal-medicine', 'ward', 'bundle'],
    checklistIds: ['chk-ros-general', 'chk-ros-cardio-resp', 'chk-cbc-panel', 'chk-bmp-panel'],
    isPinned: false,
    updatedAt: Date.now(),
    protocolNotes: `### Ward Admission Routine:
- **VTE Prophylaxis**: Subcutaneous Enoxaparin 40 mg daily or SCDs confirmed.
- **Medication Reconciliation**: Pharmacy review within 24 hours of bed assignment.
- **Diet & Activity**: Order specific dietary restrictions and bed rest/ambulation limits.`
  },
  {
    id: 'tpl-preop-surgical',
    title: 'Pre-Operative Assessment & Surgical Clearance Template',
    description: 'Combines Pre-Op clearance checklist, CBC, and Coagulation panel for operative readiness.',
    category: 'Surgical & Pre-Op',
    institution: 'Surgical Safety Department',
    tags: ['surgery', 'pre-op', 'anesthesia', 'bundle'],
    checklistIds: ['chk-preop-status', 'chk-cbc-panel', 'chk-cardiac-biomarkers'],
    isPinned: false,
    updatedAt: Date.now(),
    protocolNotes: `### Pre-Operative Clearance Verification:
- Strict NPO compliance verified.
- Informed consent completed and signed by patient or surrogate.
- Transfusion medicine: Valid Type and Screen confirmed.`
  }
];

export const INITIAL_ENCOUNTERS: PatientEncounter[] = [
  {
    id: 'enc-sample-1',
    patientIdentifier: 'Bed 4 - Doe, J.',
    group: 'Emergency Dept',
    age: '62',
    sex: 'M',
    bedNumber: '4A',
    chiefComplaint: 'Acute retrosternal chest pain with diaphoresis',
    status: 'active',
    templateId: 'tpl-acs-bundle',
    templateTitle: 'Acute Coronary Syndrome (ACS) Admission Template',
    tags: ['#cardio', '#urgent', '#triage'],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    generalNotes: `- Bedside ECG: T-wave inversion in V3-V5
- Sublingual nitro x1 administered at 14:15, partial relief
- Cardiology fellow on call paged`,
    checklists: [
      {
        id: 'inst-1',
        templateId: 'chk-acs-triage',
        title: 'Emergency Chest Pain Triage Checklist',
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
        templateId: 'chk-cardiac-biomarkers',
        title: 'Cardiac Biomarkers & Coagulation',
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
    group: 'Medical Ward A',
    age: '49',
    sex: 'F',
    bedNumber: '7B',
    chiefComplaint: 'Fever, cough, and right lower lobe consolidation',
    status: 'active',
    templateId: 'tpl-ward-admission',
    templateTitle: 'General Internal Medicine Ward Admission Template',
    tags: ['#ward', '#pulm', '#antibiotics'],
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now(),
    generalNotes: `- O2 sat 94% on room air
- Started on Ceftriaxone + Azithromycin
- Sputum culture sent to microbiology`,
    checklists: [
      {
        id: 'inst-3',
        templateId: 'chk-ros-general',
        title: 'Constitutional & General ROS',
        sections: [
          {
            id: 'sec-ros-gen',
            title: 'Constitutional & General',
            items: [
              { id: 'item-cg-1', text: 'Fever or chills', checked: true, note: 'Tmax 38.9 C at home' },
              { id: 'item-cg-2', text: 'Unexplained weight loss or night sweats', checked: false },
              { id: 'item-cg-3', text: 'Severe fatigue or generalized weakness', checked: true },
            ]
          }
        ]
      },
      {
        id: 'inst-4',
        templateId: 'chk-ros-cardio-resp',
        title: 'Cardiovascular & Respiratory Signs',
        sections: [
          {
            id: 'sec-ros-cv',
            title: 'Cardiovascular & Respiratory Signs',
            items: [
              { id: 'item-cv-1', text: 'Chest pain or pressure (substernal / pleuritic)', checked: true, note: 'Right pleuritic chest pain with deep inspiration' },
              { id: 'item-cv-2', text: 'Dyspnea on exertion or at rest', checked: true, note: 'Mild dyspnea with walking to bathroom' },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'enc-sample-archived',
    patientIdentifier: 'Bed 1 - Taylor, R. (Discharged)',
    group: 'ICU',
    age: '71',
    sex: 'M',
    bedNumber: 'ICU-1',
    chiefComplaint: 'Urosepsis with acute kidney injury - successfully resolved',
    status: 'archived',
    archivedAt: Date.now() - 86400000,
    templateId: 'tpl-sepsis-bundle',
    templateTitle: 'Severe Sepsis & Septic Shock Resuscitation Template',
    tags: ['#icu', '#sepsis', '#discharged'],
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 86400000,
    generalNotes: `- Extubated on Day 2
- Lactate normalized to 1.1 mmol/L
- Discharged to stepdown ward in stable condition`,
    checklists: [
      {
        id: 'inst-5',
        templateId: 'chk-sepsis-bundle',
        title: 'Sepsis 3.0 & Hour-1 Resuscitation Checklist',
        institution: 'Surviving Sepsis Campaign',
        sections: [
          {
            id: 'sec-sep-hour1',
            title: 'Hour-1 Bundle Interventions',
            items: [
              { id: 'item-h1-1', text: 'Measure initial blood lactate level', checked: true, labValue: '4.8 mmol/L' },
              { id: 'item-h1-2', text: 'Obtain 2 sets of blood cultures prior to antibiotics', checked: true },
              { id: 'item-h1-3', text: 'Administer broad-spectrum IV antimicrobials', checked: true, note: 'Meropenem started' },
              { id: 'item-h1-4', text: 'Rapid 30 mL/kg crystalloid bolus for hypotension or lactate >= 4 mmol/L', checked: true },
            ]
          }
        ]
      }
    ]
  }
];
