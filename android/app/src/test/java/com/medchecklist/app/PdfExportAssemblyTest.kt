package com.medchecklist.app

import com.medchecklist.app.data.*
import com.medchecklist.app.domain.PdfExportData
import org.junit.Assert.*
import org.junit.Test

class PdfExportAssemblyTest {

    // ==========================================
    // Tier 1: Feature Coverage (5 tests)
    // ==========================================

    @Test
    fun test_pdf_header_and_metadata_assembly() {
        val enc = PatientEncounter(
            patientIdentifier = "Bed 3 - Johnson, K.",
            bedNumber = "3",
            group = "ICU",
            age = "58",
            sex = "M",
            chiefComplaint = "Acute hypoxemic respiratory failure"
        )
        val header = PdfExportData.assembleHeader(enc)
        assertEquals("MedChecklist: Bed 3 - Johnson, K.", header.title)
        assertEquals("Bed: 3 | Ward: ICU | Age: 58 | Sex: M", header.metadataLine)
        assertEquals("Chief Complaint: Acute hypoxemic respiratory failure", header.complaintLine)
    }

    @Test
    fun test_pdf_checklist_sections_and_item_lines() {
        val item1 = ChecklistItem(id = "it-1", text = "Supplemental O2 administered", checked = true)
        val item2 = ChecklistItem(id = "it-2", text = "Arterial Blood Gas drawn", checked = true, labValue = "PaO2: 68 mmHg", referenceValue = "80-100 mmHg")
        val item3 = ChecklistItem(id = "it-3", text = "Chest CT scan with contrast", checked = false)

        val checklist = EncounterChecklistInstance(
            id = "c-1",
            templateId = "t-1",
            title = "Respiratory Protocol",
            sections = listOf(
                ChecklistSection(id = "s-1", title = "Interventions", items = listOf(item1, item2, item3))
            )
        )
        val enc = PatientEncounter(patientIdentifier = "Pt-Resp", checklists = listOf(checklist))
        val rows = PdfExportData.assembleChecklistTable(enc)

        assertEquals(3, rows.size)
        assertEquals("[X] Supplemental O2 administered", rows[0].formattedLine)
        assertEquals("[X] Arterial Blood Gas drawn -> PaO2: 68 mmHg (80-100 mmHg)", rows[1].formattedLine)
        assertEquals("[  ] Chest CT scan with contrast", rows[2].formattedLine)
    }

    @Test
    fun test_pdf_multiline_general_notes_pagination() {
        val longNotes = "Patient is a 58yo male admitted for acute respiratory failure. Sputum cultures pending. Intravenous Levofloxacin 750mg daily ordered."
        val lines = PdfExportData.splitNotesToLines(longNotes, maxCharsPerLine = 40)
        assertTrue(lines.size >= 3)
        for (line in lines) {
            assertTrue(line.length <= 45) // margin of word boundaries
        }
    }

    @Test
    fun test_pdf_vector_ink_stroke_scaling_math() {
        val screenPoints = listOf(
            StrokePoint(100f, 200f),
            StrokePoint(300f, 400f)
        )
        val pdfPoints = PdfExportData.scalePointsToPdf(screenPoints, scale = 0.22f)
        assertEquals(22f, pdfPoints[0].x, 0.001f)
        assertEquals(44f, pdfPoints[0].y, 0.001f)
        assertEquals(66f, pdfPoints[1].x, 0.001f)
        assertEquals(88f, pdfPoints[1].y, 0.001f)
    }

    @Test
    fun test_pdf_page_partitioning_and_footer() {
        val strokes = listOf(
            InkStroke(encounterId = "enc-1", pageIndex = 0),
            InkStroke(encounterId = "enc-1", pageIndex = 0),
            InkStroke(encounterId = "enc-1", pageIndex = 1)
        )
        val partitioned = PdfExportData.partitionStrokesByPage(strokes, totalPages = 2)
        assertEquals(2, partitioned[0]?.size)
        assertEquals(1, partitioned[1]?.size)
    }

    // ==========================================
    // Tier 2: Boundary & Corner Cases (5 tests)
    // ==========================================

    @Test
    fun test_pdf_boundary_text_only_zero_ink_strokes() {
        val partitioned = PdfExportData.partitionStrokesByPage(emptyList(), totalPages = 1)
        assertEquals(1, partitioned.size)
        assertTrue(partitioned[0]!!.isEmpty())
    }

    @Test
    fun test_pdf_boundary_multi_page_continuation_sheets() {
        val strokes = listOf(
            InkStroke(encounterId = "enc-1", pageIndex = 0),
            InkStroke(encounterId = "enc-1", pageIndex = 4) // Page 5
        )
        val partitioned = PdfExportData.partitionStrokesByPage(strokes, totalPages = 5)
        assertEquals(5, partitioned.size)
        assertEquals(1, partitioned[0]?.size)
        assertEquals(0, partitioned[1]?.size)
        assertEquals(1, partitioned[4]?.size)
    }

    @Test
    fun test_pdf_boundary_filename_sanitization() {
        val dirtyId1 = "Bed 4/Smith*J:Pt#101?"
        val clean1 = PdfExportData.sanitizePdfFilename(dirtyId1)
        assertEquals("Bed_4_Smith_J_Pt_101__bedside_rounds.pdf", clean1)

        val dirtyId2 = "Patient <Emergency> | ICU"
        val clean2 = PdfExportData.sanitizePdfFilename(dirtyId2)
        assertFalse(clean2.contains("<"))
        assertFalse(clean2.contains(">"))
        assertFalse(clean2.contains("|"))
    }

    @Test
    fun test_pdf_boundary_extreme_ink_coordinates() {
        val extremePoints = listOf(
            StrokePoint(-50f, -100f),
            StrokePoint(10_000f, 20_000f)
        )
        val scaled = PdfExportData.scalePointsToPdf(extremePoints, scale = 0.5f)
        assertEquals(-25f, scaled[0].x, 0.001f)
        assertEquals(5_000f, scaled[1].x, 0.001f)
    }

    @Test
    fun test_pdf_boundary_empty_encounter_sections() {
        val emptyEnc = PatientEncounter(patientIdentifier = "Pt-Empty")
        val rows = PdfExportData.assembleChecklistTable(emptyEnc)
        assertTrue(rows.isEmpty())

        val noteLines = PdfExportData.splitNotesToLines(emptyEnc.generalNotes)
        assertTrue(noteLines.isEmpty())
    }
}
