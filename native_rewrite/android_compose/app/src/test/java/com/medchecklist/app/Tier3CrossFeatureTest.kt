package com.medchecklist.app

import com.medchecklist.app.data.*
import com.medchecklist.app.domain.*
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID

class Tier3CrossFeatureTest {

    // ==========================================
    // Tier 3: Cross-Feature Interactions (10 tests)
    // ==========================================

    @Test
    fun test_pipeline_1_encounter_to_markdown_llm_and_import() {
        // Pipeline 1: Encounter -> encounterToMarkdown -> buildLlmPrompt -> simulated LLM -> parseMarkdownToChecklist -> update encounter
        val initialEncounter = PatientEncounter(
            patientIdentifier = "Pt-Roundtrip-1",
            chiefComplaint = "Acute dyspnea and wheezing",
            checklists = listOf(
                EncounterChecklistInstance(
                    templateId = "tmpl-1",
                    title = "Respiratory Triage",
                    sections = listOf(
                        ChecklistSection(
                            title = "Initial Signs",
                            items = listOf(ChecklistItem(text = "Tachypnea RR > 24", checked = true))
                        )
                    )
                )
            )
        )

        // 1. Serialize to markdown
        val md = MarkdownEngine.encounterToMarkdown(initialEncounter)
        assertTrue(md.contains("Acute dyspnea and wheezing"))

        // 2. Build LLM prompt
        val prompt = MarkdownEngine.buildLlmPrompt(md, "differential")
        assertTrue(prompt.contains("Tachypnea RR > 24"))

        // 3. Simulated LLM Response in MedChecklist GFM format
        val llmResponse = """
            # Encounter: Pt-Roundtrip-1
            ## Initial Signs
            - [x] Tachypnea RR > 24
            - [ ] Obtain arterial blood gas *starred*
            - [ ] Administer nebulized Albuterol 2.5mg

            ### Bedside & Handwritten Notes (Editable MD)
            Differential: Acute asthma exacerbation vs COPD exacerbation.
        """.trimIndent()

        // 4. Parse back into structured checklist
        val parsed = MarkdownEngine.parseMarkdownToChecklist(llmResponse)
        assertEquals(3, parsed.sections[0].items.size)
        assertTrue(parsed.sections[0].items[0].checked)
        assertFalse(parsed.sections[0].items[1].checked)
        assertTrue(parsed.sections[0].items[1].starred)

        // 5. Update Encounter
        val updatedEncounter = initialEncounter.copy(
            checklists = listOf(
                EncounterChecklistInstance(
                    templateId = "tmpl-1",
                    title = parsed.title,
                    sections = parsed.sections
                )
            ),
            generalNotes = parsed.generalNotes
        )
        assertEquals(3, updatedEncounter.checklists[0].sections[0].items.size)
        assertNotNull(updatedEncounter.generalNotes)
        assertTrue(updatedEncounter.generalNotes!!.contains("Differential: Acute asthma"))
    }

    @Test
    fun test_pipeline_2_bedside_ocr_to_checklist_labs() {
        // Pipeline 2: Bedside OCR vitals string -> postProcessMedicalVocabulary -> parseClinicalVitals -> populate ChecklistItem.labValue
        val rawOcrInput = "13O/85 mmHg" // OCR confusion 'O' instead of '0'
        val normalized = ClinicalVitalsParser.postProcessMedicalVocabulary(rawOcrInput)
        assertEquals("130/85 mmHg", normalized)

        val vitals = ClinicalVitalsParser.parseClinicalVitals(normalized)
        assertEquals("130/85", vitals.bp)

        val bpChecklistItem = ChecklistItem(
            text = "Blood Pressure (Sitting)",
            referenceValue = "90-120 / 60-80 mmHg",
            labValue = vitals.bp
        )
        assertEquals("130/85", bpChecklistItem.labValue)
    }

    @Test
    fun test_pipeline_3_encounter_anonymize_to_pdf_assembly() {
        // Pipeline 3: Patient Encounter with Checklists and Vector Inking -> Anonymize -> Assemble PDF dossier
        val rawEncounter = PatientEncounter(
            patientIdentifier = "David K. Miller",
            facility = "St. Mary Medical Center",
            group = "ICU Bed 08",
            bedNumber = "8",
            age = "67",
            sex = "M",
            chiefComplaint = "Call Dr. Robert Chen at 555-432-1098 regarding acute chest pressure.",
            generalNotes = "Patient MRN 482910 evaluated on 12/04/2024. Plan: catheterization.",
            checklists = listOf(
                EncounterChecklistInstance(
                    templateId = "tmpl-cardio",
                    title = "Coronary Care",
                    sections = listOf(
                        ChecklistSection(
                            title = "Signs",
                            items = listOf(ChecklistItem(text = "Diaphoresis", checked = true))
                        )
                    )
                )
            )
        )
        val stroke = InkStroke(encounterId = rawEncounter.id, pageIndex = 0, points = listOf(StrokePoint(10f, 20f)))

        val anonymized = Anonymizer.anonymizePatientEncounter(rawEncounter)
        assertTrue(anonymized.patientIdentifier.startsWith("Pt-ANON-"))
        assertNull(anonymized.bedNumber)
        assertEquals("Clinical Care Unit", anonymized.group)
        assertEquals("Medical Center [De-identified]", anonymized.facility)
        assertEquals("60-69 yo", anonymized.age)
        assertFalse(anonymized.chiefComplaint.contains("555-432-1098"))
        assertFalse(anonymized.chiefComplaint.contains("Robert Chen"))
        assertFalse(anonymized.generalNotes!!.contains("482910"))
        assertFalse(anonymized.generalNotes!!.contains("12/04/2024"))

        // Assemble PDF
        val pdfHeader = PdfExportData.assembleHeader(anonymized)
        assertTrue(pdfHeader.title.contains("Pt-ANON-"))
        assertTrue(pdfHeader.metadataLine.contains("60-69 yo"))
        val rows = PdfExportData.assembleChecklistTable(anonymized)
        assertEquals(1, rows.size)
        assertEquals("[X] Diaphoresis", rows[0].formattedLine)
    }

    @Test
    fun test_pipeline_4_database_seeder_to_state_mutation() {
        // Pipeline 4: Seed demo patient -> retrieve encounter -> toggle 2 checklist items -> verify persistence serialization
        val demo = PatientEncounter(
            id = "demo-patient-1",
            patientIdentifier = "Bed 4 - Smith, J.",
            checklists = listOf(
                EncounterChecklistInstance(
                    id = "enc-chk-1",
                    templateId = "chk-ros-cardio-resp",
                    title = "Cardiovascular & Respiratory Signs",
                    sections = listOf(
                        ChecklistSection(
                            id = "sec-cv",
                            title = "Cardiovascular Signs",
                            items = listOf(
                                ChecklistItem(id = "item-cv-1", text = "Chest pain", checked = false),
                                ChecklistItem(id = "item-cv-2", text = "Dyspnea", checked = false)
                            )
                        )
                    )
                )
            )
        )

        // Toggle both items
        val updatedSections = demo.checklists[0].sections.map { sec ->
            sec.copy(items = sec.items.map { it.copy(checked = true) })
        }
        val updatedChecklists = listOf(demo.checklists[0].copy(sections = updatedSections))
        val updatedDemo = demo.copy(checklists = updatedChecklists)

        val converters = Converters()
        val json = converters.fromChecklists(updatedDemo.checklists)
        val restored = converters.toChecklists(json)

        assertEquals(2, restored[0].sections[0].items.size)
        assertTrue(restored[0].sections[0].items[0].checked)
        assertTrue(restored[0].sections[0].items[1].checked)
    }

    @Test
    fun test_pipeline_5_inking_lasso_selection_and_translation() {
        // Pipeline 5: Inking Stroke Creation -> Lasso Selection Point-in-Polygon -> Translate Points -> Serialization
        val strokeInside = InkStroke(
            encounterId = "enc-1",
            points = listOf(StrokePoint(50f, 50f), StrokePoint(60f, 60f))
        )
        val strokeOutside = InkStroke(
            encounterId = "enc-1",
            points = listOf(StrokePoint(300f, 300f), StrokePoint(310f, 310f))
        )

        val lasso = listOf(
            StrokePoint(0f, 0f),
            StrokePoint(100f, 0f),
            StrokePoint(100f, 100f),
            StrokePoint(0f, 100f)
        )

        assertTrue(InkMath.isStrokeInPolygon(strokeInside, lasso))
        assertFalse(InkMath.isStrokeInPolygon(strokeOutside, lasso))

        // Translate selected stroke by dx=20, dy=30
        val translated = InkMath.translateStroke(strokeInside, dx = 20f, dy = 30f)
        assertEquals(70f, translated.points[0].x, 0.001f)
        assertEquals(80f, translated.points[0].y, 0.001f)

        // Serialize
        val converters = Converters()
        val json = converters.fromStrokePoints(translated.points)
        val restored = converters.toStrokePoints(json)
        assertEquals(70f, restored[0].x, 0.001f)
    }

    @Test
    fun test_pipeline_6_checklist_serialization_and_markdown_export_parity() {
        val checklist = ChecklistEntity(
            id = "chk-parity",
            title = "Hypertension Protocol",
            description = "Standard protocol",
            tags = listOf("htn", "cardio"),
            sections = listOf(
                ChecklistSection(
                    id = "sec-htn",
                    title = "Medications",
                    items = listOf(ChecklistItem(id = "it-aml", text = "Amlodipine 5mg daily", checked = true))
                )
            )
        )

        val template = ClinicalTemplateEntity(
            id = "tmpl-htn",
            title = "Hypertension Management",
            description = "Outpatient guidance",
            category = "Internal Medicine",
            tags = listOf("htn")
        )

        val md = MarkdownEngine.templateToMarkdown(template, listOf(checklist))
        assertTrue(md.contains("Amlodipine 5mg daily"))

        val parsed = MarkdownEngine.parseMarkdownToChecklist(md)
        assertEquals("Hypertension Management", parsed.title)
        assertTrue(parsed.sections.any { s -> s.items.any { it.text.contains("Amlodipine") } })
    }

    @Test
    fun test_pipeline_7_clinical_media_attachment_workflow() {
        val photo = MedicalImage(id = "img-ecg-1", url = "content://media/external/images/1", caption = "12-Lead ECG STEMI")
        val referenceLink = MedicalLink(id = "lnk-ref-1", title = "AHA STEMI Guidelines", url = "https://ahajournals.org/stemi")

        val encounter = PatientEncounter(
            patientIdentifier = "Pt-Media",
            images = listOf(photo),
            links = listOf(referenceLink)
        )

        val md = MarkdownEngine.encounterToMarkdown(encounter)
        assertTrue(md.contains("![12-Lead ECG STEMI](content://media/external/images/1)"))
        assertTrue(md.contains("[AHA STEMI Guidelines](https://ahajournals.org/stemi)"))
    }

    @Test
    fun test_pipeline_8_fast_patient_switcher_and_status_transition() {
        val patient1 = PatientEncounter(patientIdentifier = "Patient A", status = "active")
        val patient2 = PatientEncounter(patientIdentifier = "Patient B", status = "active")
        val patientList = mutableListOf(patient1, patient2)

        // Complete patient1 and archive
        val archived1 = patient1.copy(status = "archived", archivedAt = System.currentTimeMillis())
        patientList[0] = archived1

        val activeList = patientList.filter { it.status == "active" }
        val archivedList = patientList.filter { it.status == "archived" }

        assertEquals(1, activeList.size)
        assertEquals("Patient B", activeList[0].patientIdentifier)
        assertEquals(1, archivedList.size)
        assertEquals("Patient A", archivedList[0].patientIdentifier)
    }

    @Test
    fun test_pipeline_9_comprehensive_phi_scrubbing_across_all_locations() {
        val itemWithPhi = ChecklistItem(
            text = "Follow up with Dr. Susan Vance",
            note = "Patient personal phone is 555-789-0123."
        )
        val checklist = EncounterChecklistInstance(
            templateId = "tmpl-1",
            title = "Clinic Visit",
            sections = listOf(ChecklistSection(title = "Care Plan", items = listOf(itemWithPhi)))
        )
        val enc = PatientEncounter(
            patientIdentifier = "Jane Doe",
            chiefComplaint = "Contact email: jane.doe@sample.com regarding surgery on 10/12/2024",
            generalNotes = "Dr. Susan Vance confirmed MRN #54321.",
            checklists = listOf(checklist)
        )

        val anonymized = Anonymizer.anonymizePatientEncounter(enc)
        // Check Complaint
        assertFalse(anonymized.chiefComplaint.contains("jane.doe@sample.com"))
        assertFalse(anonymized.chiefComplaint.contains("10/12/2024"))
        assertTrue(anonymized.chiefComplaint.contains("[REDACTED_EMAIL]"))
        assertTrue(anonymized.chiefComplaint.contains("[REDACTED_DATE]"))

        // Check Notes
        assertFalse(anonymized.generalNotes!!.contains("Susan Vance"))
        assertFalse(anonymized.generalNotes!!.contains("54321"))
        assertTrue(anonymized.generalNotes!!.contains("Dr. [REDACTED_CLINICIAN]"))
        assertTrue(anonymized.generalNotes!!.contains("MRN:[REDACTED_ID]"))

        // Check Item Note
        val itmNote = anonymized.checklists[0].sections[0].items[0].note
        assertNotNull(itmNote)
        assertFalse(itmNote!!.contains("555-789-0123"))
        assertTrue(itmNote.contains("[REDACTED_PHONE]"))
    }

    @Test
    fun test_pipeline_10_multi_page_inking_undo_redo_and_pdf_partition() {
        val page0Stroke1 = InkStroke(id = "s-1", encounterId = "enc-1", pageIndex = 0)
        val page0Stroke2 = InkStroke(id = "s-2", encounterId = "enc-1", pageIndex = 0)
        val page1Stroke1 = InkStroke(id = "s-3", encounterId = "enc-1", pageIndex = 1)

        val undoStack = mutableListOf<List<InkStroke>>()
        val currentStrokes = mutableListOf(page0Stroke1, page0Stroke2, page1Stroke1)

        // Simulate undo of last stroke (page1Stroke1)
        undoStack.add(ArrayList(currentStrokes))
        currentStrokes.removeAt(currentStrokes.size - 1)
        assertEquals(2, currentStrokes.size)

        // PDF Partition reflects current state
        val partitioned = PdfExportData.partitionStrokesByPage(currentStrokes, totalPages = 2)
        assertEquals(2, partitioned[0]?.size)
        assertEquals(0, partitioned[1]?.size)

        // Simulate redo
        val restoredState = undoStack.removeAt(undoStack.size - 1)
        currentStrokes.clear()
        currentStrokes.addAll(restoredState)
        assertEquals(3, currentStrokes.size)

        val repartitioned = PdfExportData.partitionStrokesByPage(currentStrokes, totalPages = 2)
        assertEquals(2, repartitioned[0]?.size)
        assertEquals(1, repartitioned[1]?.size)
    }
}
