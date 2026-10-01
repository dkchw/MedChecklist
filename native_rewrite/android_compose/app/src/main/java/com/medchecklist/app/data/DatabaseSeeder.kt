package com.medchecklist.app.data

object DatabaseSeeder {
    suspend fun seedDatabase(database: AppDatabase) {
        val folderDao = database.folderDao()
        val checklistDao = database.checklistDao()
        val templateDao = database.templateDao()
        val encounterDao = database.encounterDao()

        // 1. Initial Folders (from src/db/initialData.ts)
        val folders = listOf(
            FolderEntity(id = "f-cardio", name = "Cardiology & ER", icon = "HeartPulse", order = 1),
            FolderEntity(id = "f-icu", name = "ICU & Critical Care", icon = "Activity", order = 2),
            FolderEntity(id = "f-labs", name = "Hospital Lab References", icon = "FlaskConical", order = 3),
            FolderEntity(id = "f-ward", name = "Internal Medicine & Ward", icon = "Stethoscope", order = 4),
            FolderEntity(id = "f-surgery", name = "Surgical & Pre-Op", icon = "Scissors", order = 5)
        )
        folderDao.insertFolders(folders)

        // 2. Initial Modular Checklists (from src/db/initialData.ts)
        val chkRosGeneral = ChecklistEntity(
            id = "chk-ros-general",
            title = "Constitutional & General ROS",
            description = "Systemic signs: fever, weight loss, night sweats, fatigue.",
            category = "Internal Medicine & Ward",
            institution = "Standard Clinical Guidelines",
            tags = listOf("ros", "history", "admission"),
            isPinned = true,
            sections = listOf(
                ChecklistSection(
                    id = "sec-ros-gen",
                    title = "Constitutional & General",
                    items = listOf(
                        ChecklistItem(id = "item-cg-1", text = "Fever or chills"),
                        ChecklistItem(id = "item-cg-2", text = "Unexplained weight loss or night sweats"),
                        ChecklistItem(id = "item-cg-3", text = "Severe fatigue or generalized weakness")
                    )
                )
            )
        )

        val chkRosCardioResp = ChecklistEntity(
            id = "chk-ros-cardio-resp",
            title = "Cardiovascular & Respiratory Signs",
            description = "Chest pain, orthopnea, dyspnea, edema, palpitations.",
            category = "Cardiology & ER",
            institution = "Standard Clinical Guidelines",
            tags = listOf("cardio", "respiratory", "ros"),
            isPinned = true,
            sections = listOf(
                ChecklistSection(
                    id = "sec-ros-cv",
                    title = "Cardiovascular & Respiratory Signs",
                    items = listOf(
                        ChecklistItem(id = "item-cv-1", text = "Chest pain or pressure (substernal / pleuritic)", starred = true),
                        ChecklistItem(id = "item-cv-2", text = "Dyspnea on exertion or at rest"),
                        ChecklistItem(id = "item-cv-3", text = "Orthopnea (2+ pillows) or PND"),
                        ChecklistItem(id = "item-cv-4", text = "Palpitations or irregular pulse"),
                        ChecklistItem(id = "item-cv-5", text = "Bilateral lower extremity edema")
                    )
                )
            )
        )

        val chkCbcPanel = ChecklistEntity(
            id = "chk-cbc-panel",
            title = "Complete Blood Count (CBC) Reference",
            description = "Hospital laboratory standards for WBC, Hemoglobin, and Platelets.",
            category = "Hospital Lab References",
            institution = "Hospital Central Lab (Customizable)",
            tags = listOf("labs", "cbc", "hematology"),
            isPinned = true,
            sections = listOf(
                ChecklistSection(
                    id = "sec-lab-cbc",
                    title = "Complete Blood Count (CBC)",
                    description = "Adult reference standards.",
                    items = listOf(
                        ChecklistItem(id = "item-cbc-wbc", text = "WBC (White Blood Cells)", referenceValue = "4.5 - 11.0 x10^3/uL", unit = "x10^3/uL"),
                        ChecklistItem(id = "item-cbc-hgb", text = "Hemoglobin (Hgb)", referenceValue = "13.5 - 17.5 g/dL (M), 12.0 - 15.5 g/dL (F)", unit = "g/dL"),
                        ChecklistItem(id = "item-cbc-plt", text = "Platelets", referenceValue = "150 - 450 x10^3/uL", unit = "x10^3/uL")
                    )
                )
            )
        )

        val chkBmpPanel = ChecklistEntity(
            id = "chk-bmp-panel",
            title = "Basic Metabolic Panel (BMP) Reference",
            description = "Electrolyte, glucose, and renal function reference standards.",
            category = "Hospital Lab References",
            institution = "Hospital Central Lab (Customizable)",
            tags = listOf("labs", "bmp", "electrolytes", "renal"),
            isPinned = true,
            sections = listOf(
                ChecklistSection(
                    id = "sec-lab-bmp",
                    title = "Basic Metabolic Panel (BMP)",
                    description = "Renal & Electrolyte bounds.",
                    items = listOf(
                        ChecklistItem(id = "item-bmp-na", text = "Sodium (Na+)", referenceValue = "135 - 145 mEq/L", unit = "mEq/L"),
                        ChecklistItem(id = "item-bmp-k", text = "Potassium (K+)", referenceValue = "3.5 - 5.0 mEq/L", unit = "mEq/L"),
                        ChecklistItem(id = "item-bmp-cl", text = "Chloride (Cl-)", referenceValue = "96 - 106 mEq/L", unit = "mEq/L"),
                        ChecklistItem(id = "item-bmp-co2", text = "Bicarbonate (CO2)", referenceValue = "22 - 29 mEq/L", unit = "mEq/L"),
                        ChecklistItem(id = "item-bmp-bun", text = "Blood Urea Nitrogen (BUN)", referenceValue = "7 - 20 mg/dL", unit = "mg/dL"),
                        ChecklistItem(id = "item-bmp-cr", text = "Serum Creatinine", referenceValue = "0.7 - 1.3 mg/dL", unit = "mg/dL"),
                        ChecklistItem(id = "item-bmp-glu", text = "Fasting Glucose", referenceValue = "70 - 99 mg/dL", unit = "mg/dL")
                    )
                )
            )
        )

        val chkCardiacBiomarkers = ChecklistEntity(
            id = "chk-cardiac-biomarkers",
            title = "Cardiac Biomarkers & Coagulation",
            description = "High-sensitivity Troponin I, BNP, INR, and D-Dimer bounds.",
            category = "Hospital Lab References",
            institution = "Hospital Central Lab",
            tags = listOf("troponin", "cardiac", "coagulation", "d-dimer"),
            isPinned = true,
            sections = listOf(
                ChecklistSection(
                    id = "sec-lab-cardiac",
                    title = "Cardiac Biomarkers & Coagulation",
                    items = listOf(
                        ChecklistItem(id = "item-card-trop", text = "High-Sensitivity Troponin I", referenceValue = "< 14 ng/L (Normal)", unit = "ng/L", starred = true),
                        ChecklistItem(id = "item-card-bnp", text = "BNP (B-type Natriuretic Peptide)", referenceValue = "< 100 pg/mL", unit = "pg/mL"),
                        ChecklistItem(id = "item-coag-inr", text = "INR (International Normalized Ratio)", referenceValue = "0.8 - 1.1 (Non-anticoagulated)", unit = "ratio"),
                        ChecklistItem(id = "item-coag-ddimer", text = "D-Dimer", referenceValue = "< 0.50 ug/mL FEU", unit = "ug/mL")
                    )
                )
            )
        )

        val chkAcsTriage = ChecklistEntity(
            id = "chk-acs-triage",
            title = "Emergency Chest Pain Triage Checklist",
            description = "Red flags, ischemic radiation, hemodynamic stability.",
            category = "Cardiology & ER",
            institution = "AHA/ACC Guidelines",
            tags = listOf("acs", "chest-pain", "triage", "urgent"),
            isPinned = true,
            sections = listOf(
                ChecklistSection(
                    id = "sec-acs-triage",
                    title = "Initial Red Flags & Presentation",
                    items = listOf(
                        ChecklistItem(id = "item-acs-1", text = "Pain radiating to left shoulder/arm or jaw", starred = true),
                        ChecklistItem(id = "item-acs-2", text = "Associated diaphoresis, dyspnea, nausea"),
                        ChecklistItem(id = "item-acs-3", text = "Hemodynamic instability (BP < 90 mmHg or HR > 110)", starred = true),
                        ChecklistItem(id = "item-acs-4", text = "Relief with sublingual nitroglycerin")
                    )
                ),
                ChecklistSection(
                    id = "sec-acs-ecg",
                    title = "12-Lead ECG Findings (< 10 minutes)",
                    items = listOf(
                        ChecklistItem(id = "item-ecg-1", text = "ST elevation >= 1mm in 2 contiguous leads (STEMI)", starred = true),
                        ChecklistItem(id = "item-ecg-2", text = "New or presumed new Left Bundle Branch Block (LBBB)", starred = true),
                        ChecklistItem(id = "item-ecg-3", text = "ST depressions or T-wave inversions (NSTEMI / Unstable Angina)")
                    )
                ),
                ChecklistSection(
                    id = "sec-acs-tx",
                    title = "Immediate Antithrombotic & Cath Protocol",
                    items = listOf(
                        ChecklistItem(id = "item-tx-1", text = "Aspirin 324 mg chewable given"),
                        ChecklistItem(id = "item-tx-2", text = "P2Y12 inhibitor loaded (Ticagrelor 180mg or Clopidogrel 600mg)"),
                        ChecklistItem(id = "item-tx-3", text = "Anticoagulation initiated (Heparin IV bolus + drip)"),
                        ChecklistItem(id = "item-tx-4", text = "Cath lab notified (Door-to-Balloon target < 90 min)", starred = true)
                    )
                )
            )
        )

        val chkSepsisBundle = ChecklistEntity(
            id = "chk-sepsis-bundle",
            title = "Sepsis 3.0 & Hour-1 Resuscitation Checklist",
            description = "qSOFA screening and initial hour-1 resuscitation steps.",
            category = "ICU & Critical Care",
            institution = "Surviving Sepsis Campaign",
            tags = listOf("sepsis", "icu", "resuscitation", "qsofa"),
            isPinned = false,
            sections = listOf(
                ChecklistSection(
                    id = "sec-sep-qsofa",
                    title = "qSOFA Screening (>= 2 criteria)",
                    items = listOf(
                        ChecklistItem(id = "item-qsofa-1", text = "Respiratory rate >= 22 /min"),
                        ChecklistItem(id = "item-qsofa-2", text = "Altered mentation (GCS < 15)"),
                        ChecklistItem(id = "item-qsofa-3", text = "Systolic blood pressure <= 100 mmHg", starred = true)
                    )
                ),
                ChecklistSection(
                    id = "sec-sep-hour1",
                    title = "Hour-1 Bundle Interventions",
                    items = listOf(
                        ChecklistItem(id = "item-h1-1", text = "Measure initial blood lactate level"),
                        ChecklistItem(id = "item-h1-2", text = "Obtain 2 sets of blood cultures prior to antibiotics"),
                        ChecklistItem(id = "item-h1-3", text = "Administer broad-spectrum IV antimicrobials", starred = true),
                        ChecklistItem(id = "item-h1-4", text = "Rapid 30 mL/kg crystalloid bolus for hypotension or lactate >= 4 mmol/L"),
                        ChecklistItem(id = "item-h1-5", text = "Start vasopressors (Norepinephrine) if MAP < 65 mmHg after fluid", starred = true)
                    )
                )
            )
        )

        val chkPreopStatus = ChecklistEntity(
            id = "chk-preop-status",
            title = "Pre-Operative Anesthesia Safety Verification",
            description = "NPO compliance, consent, airway assessment, and anticoagulation check.",
            category = "Surgical & Pre-Op",
            institution = "Surgical Safety Protocol",
            tags = listOf("pre-op", "surgery", "anesthesia"),
            isPinned = false,
            sections = listOf(
                ChecklistSection(
                    id = "sec-preop-status",
                    title = "Patient Status & Clearance",
                    items = listOf(
                        ChecklistItem(id = "item-pre-1", text = "Strict NPO confirmed (>= 6 hrs light meal, >= 2 hrs clear liquids)"),
                        ChecklistItem(id = "item-pre-2", text = "Informed surgical & anesthesia consent signed and in chart", starred = true),
                        ChecklistItem(id = "item-pre-3", text = "Airway evaluated (Mallampati score documented)"),
                        ChecklistItem(id = "item-pre-4", text = "Anticoagulation held (Warfarin/DOAC hold schedule verified)", starred = true),
                        ChecklistItem(id = "item-pre-5", text = "Type & Screen / Crossmatch active in Blood Bank")
                    )
                )
            )
        )

        val allChecklists = listOf(
            chkRosGeneral,
            chkRosCardioResp,
            chkCbcPanel,
            chkBmpPanel,
            chkCardiacBiomarkers,
            chkAcsTriage,
            chkSepsisBundle,
            chkPreopStatus
        )
        checklistDao.insertChecklists(allChecklists)

        // 3. Initial Clinical Templates (from src/db/initialData.ts)
        val templates = listOf(
            ClinicalTemplateEntity(
                id = "tpl-acs-bundle",
                title = "Acute Coronary Syndrome (ACS) Admission Template",
                description = "Bundles Chest Pain Triage, 12-Lead ECG series, Cardiac Biomarkers, and BMP with cardiology protocol instructions.",
                category = "Cardiology & ER",
                defaultChecklistIds = listOf("chk-acs-triage", "chk-cardiac-biomarkers", "chk-bmp-panel"),
                defaultNotes = """### Acute Coronary Syndrome (ACS) Protocol Guidance:
- **Telemetry**: Continuous ECG monitoring required.
- **Serial Biomarkers**: Repeat High-Sensitivity Troponin at 0h and 2h; delta > 5 ng/L indicates acute myocardial injury.
- **Revascularization**: Notify Cath lab immediately if STEMI or refractory ischemic chest pain with hemodynamic instability.
- **Antiplatelet Therapy**: Administer Aspirin 324 mg chewable + Ticagrelor 180 mg loading dose.""",
                tags = listOf("acs", "cardiology", "triage", "bundle"),
                isPinned = true
            ),
            ClinicalTemplateEntity(
                id = "tpl-sepsis-bundle",
                title = "Severe Sepsis & Septic Shock Resuscitation Template",
                description = "Combines Sepsis 3.0 Hour-1 Bundle, Complete Blood Count, and Basic Metabolic Panel with Surviving Sepsis guidelines.",
                category = "ICU & Critical Care",
                defaultChecklistIds = listOf("chk-sepsis-bundle", "chk-cbc-panel", "chk-bmp-panel"),
                defaultNotes = """### Sepsis Hour-1 Clinical Pathway:
- **Resuscitation Target**: Maintain Mean Arterial Pressure (MAP) >= 65 mmHg.
- **Fluid Challenge**: Initial 30 mL/kg balanced crystalloids within first 3 hours if hypotensive or lactate >= 4.0 mmol/L.
- **Cultures & Antibiotics**: Two sets of peripheral blood cultures drawn before broad-spectrum IV antibiotics.
- **Vasopressors**: Norepinephrine infusion as first-choice vasopressor.""",
                tags = listOf("sepsis", "icu", "resuscitation", "bundle"),
                isPinned = true
            ),
            ClinicalTemplateEntity(
                id = "tpl-ward-admission",
                title = "General Internal Medicine Ward Admission Template",
                description = "Comprehensive admission protocol grouping Review of Systems, CBC, and BMP with standard rounding instructions.",
                category = "Internal Medicine & Ward",
                defaultChecklistIds = listOf("chk-ros-general", "chk-ros-cardio-resp", "chk-cbc-panel", "chk-bmp-panel"),
                defaultNotes = """### Ward Admission Routine:
- **VTE Prophylaxis**: Subcutaneous Enoxaparin 40 mg daily or SCDs confirmed.
- **Medication Reconciliation**: Pharmacy review within 24 hours of bed assignment.
- **Diet & Activity**: Order specific dietary restrictions and bed rest/ambulation limits.""",
                tags = listOf("admission", "internal-medicine", "ward", "bundle"),
                isPinned = false
            ),
            ClinicalTemplateEntity(
                id = "tpl-preop-surgical",
                title = "Pre-Operative Assessment & Surgical Clearance Template",
                description = "Combines Pre-Op clearance checklist, CBC, and Coagulation panel for operative readiness.",
                category = "Surgical & Pre-Op",
                defaultChecklistIds = listOf("chk-preop-status", "chk-cbc-panel", "chk-cardiac-biomarkers"),
                defaultNotes = """### Pre-Operative Clearance Verification:
- Strict NPO compliance verified.
- Informed consent completed and signed by patient or surrogate.
- Transfusion medicine: Valid Type and Screen confirmed.""",
                tags = listOf("surgery", "pre-op", "anesthesia", "bundle"),
                isPinned = false
            )
        )
        templateDao.insertTemplates(templates)

        // 4. Initial Sample Patient Encounters (from src/db/initialData.ts)
        val now = System.currentTimeMillis()
        val sampleEncounter1 = PatientEncounter(
            id = "enc-sample-1",
            patientIdentifier = "Bed 4 - Doe, J.",
            facility = "City General Hospital",
            group = "Emergency Dept",
            bedNumber = "4A",
            age = "62",
            sex = "M",
            chiefComplaint = "Acute retrosternal chest pain with diaphoresis",
            status = "active",
            templateId = "tpl-acs-bundle",
            templateTitle = "Acute Coronary Syndrome (ACS) Admission Template",
            generalNotes = """- Bedside ECG: T-wave inversion in V3-V5
- Sublingual nitro x1 administered at 14:15, partial relief
- Cardiology fellow on call paged""",
            tags = listOf("#cardio", "#urgent", "#triage"),
            isPinned = true,
            createdAt = now - 3600000,
            updatedAt = now,
            checklists = listOf(
                EncounterChecklistInstance(
                    id = "inst-1",
                    templateId = "chk-acs-triage",
                    title = "Emergency Chest Pain Triage Checklist",
                    institution = "AHA/ACC Guidelines",
                    sections = listOf(
                        ChecklistSection(
                            id = "sec-acs-triage",
                            title = "Initial Red Flags & Presentation",
                            items = listOf(
                                ChecklistItem(id = "item-acs-1", text = "Pain radiating to left shoulder/arm or jaw", checked = true, starred = true, note = "Radiating to left shoulder & arm for 90 minutes"),
                                ChecklistItem(id = "item-acs-2", text = "Associated diaphoresis, dyspnea, nausea", checked = true, note = "Profuse sweating upon EMS arrival"),
                                ChecklistItem(id = "item-acs-3", text = "Hemodynamic instability (BP < 90 mmHg or HR > 110)", checked = false, starred = true, note = "BP 138/84, HR 88"),
                                ChecklistItem(id = "item-acs-4", text = "Relief with sublingual nitroglycerin", checked = true, note = "Pain reduced from 8/10 to 4/10")
                            )
                        ),
                        ChecklistSection(
                            id = "sec-acs-ecg",
                            title = "12-Lead ECG Findings (< 10 minutes)",
                            items = listOf(
                                ChecklistItem(id = "item-ecg-1", text = "ST elevation >= 1mm in 2 contiguous leads (STEMI)", checked = false, starred = true),
                                ChecklistItem(id = "item-ecg-2", text = "New or presumed new Left Bundle Branch Block (LBBB)", checked = false, starred = true),
                                ChecklistItem(id = "item-ecg-3", text = "ST depressions or T-wave inversions (NSTEMI / Unstable Angina)", checked = true, note = "Deep TWI in anterior leads")
                            )
                        )
                    )
                ),
                EncounterChecklistInstance(
                    id = "inst-2",
                    templateId = "chk-cardiac-biomarkers",
                    title = "Cardiac Biomarkers & Coagulation",
                    institution = "Hospital Central Lab",
                    sections = listOf(
                        ChecklistSection(
                            id = "sec-lab-cardiac",
                            title = "Cardiac Biomarkers & Coagulation",
                            items = listOf(
                                ChecklistItem(id = "item-card-trop", text = "High-Sensitivity Troponin I", checked = true, referenceValue = "< 14 ng/L (Normal)", labValue = "148 ng/L (Elevated)", starred = true, note = "Stat delta troponin ordered in 1 hour"),
                                ChecklistItem(id = "item-coag-inr", text = "INR (International Normalized Ratio)", checked = false, referenceValue = "0.8 - 1.1", labValue = "1.0")
                            )
                        )
                    )
                )
            )
        )

        val sampleEncounter2 = PatientEncounter(
            id = "enc-sample-2",
            patientIdentifier = "Bed 7 - Chen, M.",
            facility = "City General Hospital",
            group = "Medical Ward A",
            bedNumber = "7B",
            age = "49",
            sex = "F",
            chiefComplaint = "Fever, cough, and right lower lobe consolidation",
            status = "active",
            templateId = "tpl-ward-admission",
            templateTitle = "General Internal Medicine Ward Admission Template",
            generalNotes = """- O2 sat 94% on room air
- Started on Ceftriaxone + Azithromycin
- Sputum culture sent to microbiology""",
            tags = listOf("#ward", "#pulm", "#antibiotics"),
            isPinned = false,
            createdAt = now - 7200000,
            updatedAt = now,
            checklists = listOf(
                EncounterChecklistInstance(
                    id = "inst-3",
                    templateId = "chk-ros-general",
                    title = "Constitutional & General ROS",
                    sections = listOf(
                        ChecklistSection(
                            id = "sec-ros-gen",
                            title = "Constitutional & General",
                            items = listOf(
                                ChecklistItem(id = "item-cg-1", text = "Fever or chills", checked = true, note = "Tmax 38.9 C at home"),
                                ChecklistItem(id = "item-cg-2", text = "Unexplained weight loss or night sweats", checked = false),
                                ChecklistItem(id = "item-cg-3", text = "Severe fatigue or generalized weakness", checked = true)
                            )
                        )
                    )
                ),
                EncounterChecklistInstance(
                    id = "inst-4",
                    templateId = "chk-ros-cardio-resp",
                    title = "Cardiovascular & Respiratory Signs",
                    sections = listOf(
                        ChecklistSection(
                            id = "sec-ros-cv",
                            title = "Cardiovascular & Respiratory Signs",
                            items = listOf(
                                ChecklistItem(id = "item-cv-1", text = "Chest pain or pressure (substernal / pleuritic)", checked = true, note = "Right pleuritic chest pain with deep inspiration"),
                                ChecklistItem(id = "item-cv-2", text = "Dyspnea on exertion or at rest", checked = true, note = "Mild dyspnea with walking to bathroom")
                            )
                        )
                    )
                )
            )
        )

        val sampleEncounterArchived = PatientEncounter(
            id = "enc-sample-archived",
            patientIdentifier = "Bed 1 - Taylor, R. (Discharged)",
            facility = "City General Hospital",
            group = "ICU",
            bedNumber = "ICU-1",
            age = "71",
            sex = "M",
            chiefComplaint = "Urosepsis with acute kidney injury - successfully resolved",
            status = "archived",
            archivedAt = now - 86400000,
            templateId = "tpl-sepsis-bundle",
            templateTitle = "Severe Sepsis & Septic Shock Resuscitation Template",
            generalNotes = """- Extubated on Day 2
- Lactate normalized to 1.1 mmol/L
- Discharged to stepdown ward in stable condition""",
            tags = listOf("#icu", "#sepsis", "#discharged"),
            isPinned = false,
            createdAt = now - 172800000,
            updatedAt = now - 86400000,
            checklists = listOf(
                EncounterChecklistInstance(
                    id = "inst-5",
                    templateId = "chk-sepsis-bundle",
                    title = "Sepsis 3.0 & Hour-1 Resuscitation Checklist",
                    institution = "Surviving Sepsis Campaign",
                    sections = listOf(
                        ChecklistSection(
                            id = "sec-sep-hour1",
                            title = "Hour-1 Bundle Interventions",
                            items = listOf(
                                ChecklistItem(id = "item-h1-1", text = "Measure initial blood lactate level", checked = true, labValue = "4.8 mmol/L"),
                                ChecklistItem(id = "item-h1-2", text = "Obtain 2 sets of blood cultures prior to antibiotics", checked = true),
                                ChecklistItem(id = "item-h1-3", text = "Administer broad-spectrum IV antimicrobials", checked = true, note = "Meropenem started"),
                                ChecklistItem(id = "item-h1-4", text = "Rapid 30 mL/kg crystalloid bolus for hypotension or lactate >= 4 mmol/L", checked = true)
                            )
                        )
                    )
                )
            )
        )

        encounterDao.insertEncounter(sampleEncounter1)
        encounterDao.insertEncounter(sampleEncounter2)
        encounterDao.insertEncounter(sampleEncounterArchived)
    }
}
