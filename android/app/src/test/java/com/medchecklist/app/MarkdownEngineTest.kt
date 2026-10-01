package com.medchecklist.app

import com.medchecklist.app.data.*
import com.medchecklist.app.domain.MarkdownEngine
import org.junit.Assert.*
import org.junit.Test

class MarkdownEngineTest {

    // ==========================================
    // Tier 1: Feature Coverage (5 tests)
    // ==========================================

    @Test
    fun test_markdown_parse_checked_and_unchecked_items() {
        val markdown = """
            # Acute Care Triage
            ## Vital Signs
            - [x] SpO2 > 95% on room air
            - [ ] Blood Pressure check pending
            * [x] Heart rate regular
        """.trimIndent()

        val parsed = MarkdownEngine.parseMarkdownToChecklist(markdown)
        assertEquals("Acute Care Triage", parsed.title)
        assertEquals(1, parsed.sections.size)
        assertEquals("Vital Signs", parsed.sections[0].title)
        assertEquals(3, parsed.sections[0].items.size)

        assertTrue(parsed.sections[0].items[0].checked)
        assertEquals("SpO2 > 95% on room air", parsed.sections[0].items[0].text)

        assertFalse(parsed.sections[0].items[1].checked)
        assertEquals("Blood Pressure check pending", parsed.sections[0].items[1].text)

        assertTrue(parsed.sections[0].items[2].checked)
        assertEquals("Heart rate regular", parsed.sections[0].items[2].text)
    }

    @Test
    fun test_markdown_parse_starred_and_reference_ranges() {
        val markdown = """
            ## Cardiac Markers
            - [x] High-Sensitivity Troponin: 154 ng/L [Normal: < 14 ng/L] *starred*
            - [ ] BNP: 450 pg/mL [Normal: < 100 pg/mL] ⭐
            - [x] CK-MB [Normal: 0-5 ng/mL] [!]
        """.trimIndent()

        val parsed = MarkdownEngine.parseMarkdownToChecklist(markdown)
        val items = parsed.sections[0].items
        assertEquals(3, items.size)

        assertTrue(items[0].starred)
        assertEquals("< 14 ng/L", items[0].referenceValue)
        assertEquals("154 ng/L", items[0].labValue)
        assertEquals("High-Sensitivity Troponin", items[0].text)

        assertTrue(items[1].starred)
        assertEquals("< 100 pg/mL", items[1].referenceValue)
        assertEquals("450 pg/mL", items[1].labValue)

        assertTrue(items[2].starred)
        assertEquals("0-5 ng/mL", items[2].referenceValue)
    }

    @Test
    fun test_markdown_template_to_markdown_serialization() {
        val template = ClinicalTemplateEntity(
            id = "tmpl-sepsis",
            title = "Sepsis 1-Hour Protocol",
            description = "Emergency resuscitation protocol",
            category = "Critical Care",
            tags = listOf("sepsis", "emergency")
        )
        val checklist = ChecklistEntity(
            id = "chk-1",
            title = "Resuscitation Bundle",
            sections = listOf(
                ChecklistSection(
                    id = "sec-bundle",
                    title = "Initial 60 Minutes",
                    items = listOf(
                        ChecklistItem(id = "it-1", text = "Measure blood lactate", checked = true, labValue = "3.2 mmol/L", referenceValue = "0.5-2.0 mmol/L"),
                        ChecklistItem(id = "it-2", text = "Obtain blood cultures prior to antibiotics", checked = false, starred = true)
                    )
                )
            )
        )

        val md = MarkdownEngine.templateToMarkdown(template, listOf(checklist))
        assertTrue(md.contains("# Sepsis 1-Hour Protocol"))
        assertTrue(md.contains("> Emergency resuscitation protocol"))
        assertTrue(md.contains("> Tags: #sepsis #emergency"))
        assertTrue(md.contains("### Checklist: Resuscitation Bundle"))
        assertTrue(md.contains("## Initial 60 Minutes"))
        assertTrue(md.contains("- [x] Measure blood lactate: 3.2 mmol/L [Normal: 0.5-2.0 mmol/L]"))
        assertTrue(md.contains("- [ ] Obtain blood cultures prior to antibiotics *starred*"))
    }

    @Test
    fun test_markdown_encounter_to_markdown_serialization() {
        val encounter = PatientEncounter(
            patientIdentifier = "Bed 5 - Davis, R.",
            bedNumber = "5",
            group = "ICU",
            age = "71",
            sex = "F",
            chiefComplaint = "Septic shock secondary to pyelonephritis",
            generalNotes = "Patient intubated and sedated on Norepinephrine at 0.1 mcg/kg/min.",
            tags = listOf("critical", "ventilator")
        )

        val md = MarkdownEngine.encounterToMarkdown(encounter)
        assertTrue(md.contains("# Encounter: Bed 5 - Davis, R."))
        assertTrue(md.contains("Age: 71 | Sex: F | Bed/Room: 5 | Status: active"))
        assertTrue(md.contains("Chief Complaint: Septic shock secondary to pyelonephritis"))
        assertTrue(md.contains("Tags: #critical #ventilator"))
        assertTrue(md.contains("### Bedside & Handwritten Notes (Editable MD)"))
        assertTrue(md.contains("Norepinephrine at 0.1 mcg/kg/min"))
    }

    @Test
    fun test_markdown_build_llm_prompt_modes() {
        val baseMd = "- [x] Crushing retrosternal chest pain\n- [ ] Troponin serial check"

        val diffPrompt = MarkdownEngine.buildLlmPrompt(baseMd, "differential")
        assertTrue(diffPrompt.contains("=== MEDCHECKLIST FORMATTING INSTRUCTIONS (REQUIRED) ==="))
        assertTrue(diffPrompt.contains("Provide a prioritized differential diagnosis list"))
        assertTrue(diffPrompt.contains(baseMd))

        val soapPrompt = MarkdownEngine.buildLlmPrompt(baseMd, "soap")
        assertTrue(soapPrompt.contains("Synthesize the following checklist items into a structured clinical SOAP note"))

        val expandPrompt = MarkdownEngine.buildLlmPrompt(baseMd, "checklist_expansion")
        assertTrue(expandPrompt.contains("Expand the provided checklist into a comprehensive, evidence-based clinical protocol"))
    }

    // ==========================================
    // Tier 2: Boundary & Corner Cases (5 tests)
    // ==========================================

    @Test
    fun test_markdown_boundary_malformed_task_lines() {
        val malformed = """
            ## Lab Tests
            -[x] Item without space after dash
            *  [ ]  Item with extra spaces
            - [X] Upper case X
            * bullet without brackets
        """.trimIndent()

        val parsed = MarkdownEngine.parseMarkdownToChecklist(malformed)
        assertEquals(1, parsed.sections.size)
        assertEquals(4, parsed.sections[0].items.size)
        assertTrue(parsed.sections[0].items[0].checked) // -[x] Item without space
        assertFalse(parsed.sections[0].items[1].checked) // * [ ] Item with extra spaces
        assertTrue(parsed.sections[0].items[2].checked) // Upper case X
        assertFalse(parsed.sections[0].items[3].checked) // plain bullet
    }

    @Test
    fun test_markdown_boundary_embedded_html_and_code_blocks() {
        val mdWithHtml = """
            ## Clinical Symptoms
            - [x] Patient has <b>marked pallor</b> and `diaphoresis`
            - [ ] Note: <font color="red">Critical alert</font>
        """.trimIndent()

        val parsed = MarkdownEngine.parseMarkdownToChecklist(mdWithHtml)
        assertEquals(2, parsed.sections[0].items.size)
        assertTrue(parsed.sections[0].items[0].text.contains("<b>marked pallor</b>"))
        assertTrue(parsed.sections[0].items[0].text.contains("`diaphoresis`"))
    }

    @Test
    fun test_markdown_boundary_empty_and_whitespace_only_text() {
        val emptyParsed = MarkdownEngine.parseMarkdownToChecklist("")
        assertEquals("Imported Checklist", emptyParsed.title)
        assertEquals(1, emptyParsed.sections.size)
        assertEquals("Imported Items", emptyParsed.sections[0].title)
        assertTrue(emptyParsed.sections[0].items.isEmpty())

        val whitespaceParsed = MarkdownEngine.parseMarkdownToChecklist("   \n\n\t   \n  ")
        assertEquals(1, whitespaceParsed.sections.size)
        assertTrue(whitespaceParsed.sections[0].items.isEmpty())
    }

    @Test
    fun test_markdown_boundary_mixed_list_bullet_markers() {
        val mixedList = """
            ## Nursing Tasks
            - Standard bullet dash
            * Standard bullet asterisk
            - [x] Checkbox task
        """.trimIndent()

        val parsed = MarkdownEngine.parseMarkdownToChecklist(mixedList)
        assertEquals(3, parsed.sections[0].items.size)
        assertFalse(parsed.sections[0].items[0].checked)
        assertEquals("Standard bullet dash", parsed.sections[0].items[0].text)
        assertFalse(parsed.sections[0].items[1].checked)
        assertEquals("Standard bullet asterisk", parsed.sections[0].items[1].text)
        assertTrue(parsed.sections[0].items[2].checked)
    }

    @Test
    fun test_markdown_boundary_notes_section_extraction() {
        val mdWithNotes = """
            ## Symptoms
            - [x] Cough and fever

            ### Bedside & Handwritten Notes (Editable MD)
            Line 1 of free text notes.
            Line 2 of clinical assessment:
            - Differential: Bronchitis vs Pneumonia
            - Recommended: Chest X-ray AP view
        """.trimIndent()

        val parsed = MarkdownEngine.parseMarkdownToChecklist(mdWithNotes)
        assertNotNull(parsed.generalNotes)
        assertTrue(parsed.generalNotes!!.contains("Line 1 of free text notes."))
        assertTrue(parsed.generalNotes!!.contains("Differential: Bronchitis vs Pneumonia"))
        assertEquals(1, parsed.sections[0].items.size) // Notes lines should not bleed into section items
    }
}
