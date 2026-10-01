package com.medchecklist.app

import com.medchecklist.app.data.*
import com.medchecklist.app.domain.*
import org.junit.Assert.*
import org.junit.Test

class Tier4ClinicalScenariosTest {

    // ==========================================
    // Tier 4: Real-World Clinical Application Scenarios (3 tests)
    // ==========================================

    @Test
    fun test_scenario_1_acute_coronary_syndrome_icu_admission() {
        // --- Step 1: Patient Admission via New Patient Dialog ---
        val patientId = "Bed 4 - Smith, J."
        val acsEncounter = PatientEncounter(
            patientIdentifier = patientId,
            facility = "City General Hospital",
            group = "Cardiology ICU",
            bedNumber = "4",
            age = "62",
            sex = "M",
            chiefComplaint = "Substernal chest pressure radiating to left arm x 2 hours",
            status = "active",
            tags = listOf("telemetry", "stemi", "urgent"),
            isPinned = true
        )
        assertEquals("Cardiology ICU", acsEncounter.group)
        assertTrue(acsEncounter.isPinned)

        // --- Step 2: Instantiation of ACS Template Bundle ---
        val cvSection = ChecklistSection(
            id = "sec-cv",
            title = "Cardiovascular & Respiratory Signs",
            items = listOf(
                ChecklistItem(id = "cv-1", text = "Chest pain or pressure (substernal / pleuritic)", starred = true, checked = false),
                ChecklistItem(id = "cv-2", text = "Dyspnea on exertion or at rest", checked = false),
                ChecklistItem(id = "cv-3", text = "Diaphoresis", checked = false)
            )
        )
        val labSection = ChecklistSection(
            id = "sec-lab",
            title = "Cardiac Biomarkers & CBC",
            items = listOf(
                ChecklistItem(id = "lab-trop", text = "High-Sensitivity Troponin I", referenceValue = "< 0.04 ng/mL", unit = "ng/mL"),
                ChecklistItem(id = "lab-wbc", text = "WBC", referenceValue = "4.5 - 11.0 x10^3/uL", unit = "x10^3/uL")
            )
        )
        val instantiatedChecklists = listOf(
            EncounterChecklistInstance(
                templateId = "chk-ros-cardio",
                title = "Cardiovascular Signs",
                sections = listOf(cvSection)
            ),
            EncounterChecklistInstance(
                templateId = "chk-labs",
                title = "Hospital Labs",
                sections = listOf(labSection)
            )
        )
        var activeEncounter = acsEncounter.copy(checklists = instantiatedChecklists)
        assertEquals(2, activeEncounter.checklists.size)

        // --- Step 3: Bedside Vitals Ingestion via Handwriting OCR ---
        val rawVitalsOcr = "BP: 16O/95 HR 105 SPO2 94%"
        val normalizedVitals = ClinicalVitalsParser.postProcessMedicalVocabulary(rawVitalsOcr)
        val vitals = ClinicalVitalsParser.parseClinicalVitals(normalizedVitals)
        assertEquals("160/95", vitals.bp)
        assertEquals(94, vitals.spo2)

        // --- Step 4: Clinician Bedside Item Toggling & Lab Entry ---
        val updatedChecklists = activeEncounter.checklists.map { chk ->
            if (chk.templateId == "chk-ros-cardio") {
                val updatedSec = chk.sections.map { sec ->
                    sec.copy(items = sec.items.map { itm ->
                        if (itm.id == "cv-1" || itm.id == "cv-3") itm.copy(checked = true) else itm
                    })
                }
                chk.copy(sections = updatedSec)
            } else if (chk.templateId == "chk-labs") {
                val updatedSec = chk.sections.map { sec ->
                    sec.copy(items = sec.items.map { itm ->
                        if (itm.id == "lab-trop") itm.copy(checked = true, labValue = "2.40 ng/mL (High)") else itm
                    })
                }
                chk.copy(sections = updatedSec)
            } else chk
        }

        activeEncounter = activeEncounter.copy(
            checklists = updatedChecklists,
            generalNotes = "### Bedside Rounds Note\nPatient received 324mg chewed aspirin and IV heparin bolus. EKG shows ST-elevation in leads V2-V4. Urgent cath lab team activated."
        )

        val cardioItems = activeEncounter.checklists[0].sections[0].items
        assertTrue(cardioItems[0].checked) // Chest pain checked
        assertTrue(cardioItems[2].checked) // Diaphoresis checked
        val tropItem = activeEncounter.checklists[1].sections[0].items[0]
        assertEquals("2.40 ng/mL (High)", tropItem.labValue)

        // --- Step 5: Bedside Stylus ECG Sketch Persistence ---
        val ecgStroke = InkStroke(
            encounterId = activeEncounter.id,
            tool = "pen",
            color = "#dc2626", // Red for arterial/cardiac
            size = 3f,
            pageIndex = 0,
            points = listOf(
                StrokePoint(50f, 100f),
                StrokePoint(60f, 70f),  // R wave spike
                StrokePoint(70f, 110f), // S wave
                StrokePoint(85f, 90f)   // ST elevation tombstone
            )
        )
        val strokes = listOf(ecgStroke)
        assertEquals(4, strokes[0].points.size)

        // --- Step 6: HIPAA Anonymization for Cardiology Case Consult ---
        val anonymized = Anonymizer.anonymizePatientEncounter(activeEncounter)
        assertTrue(anonymized.patientIdentifier.startsWith("Pt-ANON-"))
        assertNull(anonymized.bedNumber)
        assertEquals("Clinical Care Unit", anonymized.group)
        assertEquals("60-69 yo", anonymized.age)

        // --- Step 7: PDF Export Dossier Assembly ---
        val pdfHeader = PdfExportData.assembleHeader(anonymized)
        assertTrue(pdfHeader.title.contains("Pt-ANON-"))
        val rows = PdfExportData.assembleChecklistTable(anonymized)
        assertTrue(rows.any { it.itemText.contains("Chest pain") && it.isChecked })
        assertTrue(rows.any { it.itemText.contains("Troponin") && it.labValue!!.contains("2.40") })

        val partitionedStrokes = PdfExportData.partitionStrokesByPage(strokes, totalPages = 1)
        assertEquals(1, partitionedStrokes[0]?.size)
    }

    @Test
    fun test_scenario_2_sepsis_one_hour_bundle_protocol() {
        // --- Step 1: Emergency Department Sepsis Triage ---
        val sepsisEncounter = PatientEncounter(
            patientIdentifier = "Bed 7 - Miller, E.",
            facility = "Memorial ER",
            group = "Emergency",
            bedNumber = "7",
            age = "74",
            sex = "F",
            chiefComplaint = "High fever, acute confusion, suspected urosepsis",
            status = "active",
            tags = listOf("sepsis", "critical")
        )

        // --- Step 2: Vitals Recognition ---
        val rawVitals = "TEMP 39.2 BP 82/46 HR 128 SPO2 91%"
        val vitals = ClinicalVitalsParser.parseClinicalVitals(rawVitals)
        assertEquals("82/46", vitals.bp)
        assertEquals(91, vitals.spo2)

        // --- Step 3: Sepsis 1-Hour Bundle Execution ---
        val bundleItems = listOf(
            ChecklistItem(id = "sep-1", text = "1. Measure blood lactate level", checked = true, labValue = "4.2 mmol/L", referenceValue = "0.5-2.0 mmol/L"),
            ChecklistItem(id = "sep-2", text = "2. Obtain blood cultures prior to antibiotics", checked = true),
            ChecklistItem(id = "sep-3", text = "3. Administer broad-spectrum antibiotics (Vancomycin + Cefepime)", checked = true, note = "Administered at 14:15"),
            ChecklistItem(id = "sep-4", text = "4. Begin rapid administration of 30mL/kg crystalloid for hypotension", checked = true, note = "2000mL Normal Saline running"),
            ChecklistItem(id = "sep-5", text = "5. Apply vasopressors if MAP < 65 mmHg", checked = true, labValue = "Norepinephrine 0.08 mcg/kg/min", starred = true)
        )
        val sepsisChecklist = EncounterChecklistInstance(
            templateId = "tmpl-sepsis-1hr",
            title = "Surviving Sepsis 1-Hour Bundle",
            sections = listOf(ChecklistSection(title = "Immediate Interventions", items = bundleItems))
        )
        val encounterWithProtocol = sepsisEncounter.copy(checklists = listOf(sepsisChecklist))

        // Verify all 5 bundle steps completed
        val executedSteps = encounterWithProtocol.checklists[0].sections[0].items
        assertEquals(5, executedSteps.size)
        assertTrue(executedSteps.all { it.checked })

        // --- Step 4: Markdown Handover Generation ---
        val md = MarkdownEngine.encounterToMarkdown(encounterWithProtocol)
        assertTrue(md.contains("Surviving Sepsis 1-Hour Bundle"))
        assertTrue(md.contains("Measure blood lactate level: 4.2 mmol/L"))
        assertTrue(md.contains("Apply vasopressors if MAP < 65 mmHg *starred*"))
        assertTrue(md.contains("2000mL Normal Saline running"))
    }

    @Test
    fun test_scenario_3_emergency_department_bedside_rounds_and_triage() {
        // --- Step 1: Multi-Patient Triage Intake ---
        val ptA = PatientEncounter(
            id = "enc-pt-a",
            patientIdentifier = "Bed 1 - Taylor, A.",
            group = "ER Acute",
            bedNumber = "1",
            chiefComplaint = "Severe acute asthma exacerbation",
            isPinned = true,
            status = "active"
        )
        val ptB = PatientEncounter(
            id = "enc-pt-b",
            patientIdentifier = "Bed 2 - Williams, B.",
            group = "ER Acute",
            bedNumber = "2",
            chiefComplaint = "Acute lower quadrant abdominal pain, rule out appendicitis",
            isPinned = true,
            status = "active"
        )
        val ptC = PatientEncounter(
            id = "enc-pt-c",
            patientIdentifier = "Bed 3 - Clark, C.",
            group = "ER Fast Track",
            bedNumber = "3",
            chiefComplaint = "Right forearm laceration 3cm, bleeding controlled",
            isPinned = false,
            status = "active"
        )

        val roundsRoster = mutableListOf(ptA, ptB, ptC)
        assertEquals(3, roundsRoster.size)

        // --- Step 2: Bedside Rounds Fast Patient Switching & Vitals ---
        // Patient A Vitals: SpO2 88%
        val vitalsA = ClinicalVitalsParser.parseClinicalVitals("SpO2 88%")
        assertEquals(88, vitalsA.spo2)

        // Patient B Vitals: Temp 38.3°C
        val vitalsB = ClinicalVitalsParser.parseClinicalVitals("38.3")
        assertEquals(38.3f, vitalsB.temp ?: 0f, 0.01f)

        // Patient C Vitals: BP 120/75, HR 70
        val vitalsC = ClinicalVitalsParser.parseClinicalVitals("120/75")
        assertEquals("120/75", vitalsC.bp)

        // --- Step 3: Patient C Treated, Sutured and Discharged (Archived) ---
        val dischargedPtC = ptC.copy(
            status = "archived",
            archivedAt = System.currentTimeMillis(),
            generalNotes = "Laceration repaired with 4 simple interrupted 4-0 Ethilon sutures. Tetanus toxoid booster administered. Discharge instructions provided."
        )
        val cIdx = roundsRoster.indexOfFirst { it.id == ptC.id }
        roundsRoster[cIdx] = dischargedPtC

        // --- Step 4: Verify Active Rounds Roster Filters ---
        val activeRounds = roundsRoster.filter { it.status == "active" }
        val archivedRecords = roundsRoster.filter { it.status == "archived" }

        assertEquals(2, activeRounds.size)
        assertEquals(listOf("Bed 1 - Taylor, A.", "Bed 2 - Williams, B."), activeRounds.map { it.patientIdentifier })
        assertEquals(1, archivedRecords.size)
        assertEquals("Bed 3 - Clark, C.", archivedRecords[0].patientIdentifier)

        // Pinned high-priority patients check
        val pinnedPatients = activeRounds.filter { it.isPinned }
        assertEquals(2, pinnedPatients.size)
    }
}
