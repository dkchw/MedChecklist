package com.medchecklist.app

import com.medchecklist.app.data.*
import org.junit.Assert.*
import org.junit.Test

class ChecklistHierarchyTest {

    // ==========================================
    // Tier 1: Feature Coverage (5 tests)
    // ==========================================

    @Test
    fun test_checklist_section_and_item_hierarchy() {
        val item1 = ChecklistItem(id = "it-1", text = "Assess airway patency")
        val item2 = ChecklistItem(id = "it-2", text = "Measure respiratory rate")
        val section = ChecklistSection(id = "sec-airway", title = "Primary Airway Survey", items = listOf(item1, item2))
        val checklist = ChecklistEntity(
            id = "chk-trauma",
            title = "ATLS Primary Survey",
            category = "Emergency",
            sections = listOf(section)
        )

        assertEquals("ATLS Primary Survey", checklist.title)
        assertEquals(1, checklist.sections.size)
        assertEquals("Primary Airway Survey", checklist.sections[0].title)
        assertEquals(2, checklist.sections[0].items.size)
        assertEquals("Assess airway patency", checklist.sections[0].items[0].text)
    }

    @Test
    fun test_checklist_item_checked_toggle() {
        val item = ChecklistItem(id = "it-toggle", text = "Blood glucose check", checked = false)
        assertFalse(item.checked)

        val toggledOn = item.copy(checked = true)
        assertTrue(toggledOn.checked)

        val toggledOff = toggledOn.copy(checked = false)
        assertFalse(toggledOff.checked)
    }

    @Test
    fun test_checklist_item_starred_priority_toggle() {
        val item = ChecklistItem(id = "it-star", text = "Acute ST elevation on 12-lead ECG", starred = false)
        assertFalse(item.starred)

        val starredItem = item.copy(starred = true)
        assertTrue(starredItem.starred)
    }

    @Test
    fun test_checklist_item_clinical_note_attachment() {
        val item = ChecklistItem(id = "it-note", text = "Bilateral lung auscultation")
        assertNull(item.note)

        val withNote = item.copy(note = "Crackles present at bilateral lung bases; wheezing in right upper lobe.")
        assertNotNull(withNote.note)
        assertTrue(withNote.note!!.contains("Crackles present"))
    }

    @Test
    fun test_checklist_item_lab_value_and_reference_bounds() {
        val item = ChecklistItem(
            id = "it-trop",
            text = "Troponin I High Sensitivity",
            referenceValue = "< 0.04 ng/mL",
            unit = "ng/mL"
        )
        assertEquals("< 0.04 ng/mL", item.referenceValue)
        assertEquals("ng/mL", item.unit)
        assertNull(item.labValue)

        val recorded = item.copy(labValue = "1.85 ng/mL (High)")
        assertEquals("1.85 ng/mL (High)", recorded.labValue)
    }

    // ==========================================
    // Tier 2: Boundary & Corner Cases (5 tests)
    // ==========================================

    @Test
    fun test_checklist_boundary_empty_checklist() {
        val emptyChecklist = ChecklistEntity(
            id = "chk-empty",
            title = "Empty Protocol",
            sections = emptyList()
        )
        assertEquals(0, emptyChecklist.sections.size)
        assertTrue(emptyChecklist.sections.isEmpty())
    }

    @Test
    fun test_checklist_boundary_special_characters_in_reference_bounds() {
        val specialItem = ChecklistItem(
            id = "it-spec",
            text = "Serum Potassium",
            referenceValue = ">= 3.5 & <= 5.0 mEq/L (Normal range)",
            unit = "mEq/L"
        )
        assertTrue(specialItem.referenceValue!!.contains(">="))
        assertTrue(specialItem.referenceValue!!.contains("<="))
        assertTrue(specialItem.referenceValue!!.contains("&"))
    }

    @Test
    fun test_checklist_boundary_long_multiline_item_notes() {
        val multilineNote = """
            - Patient reported onset of pain at 04:30 AM while sleeping.
            - Radiates to left jaw and shoulder.
            - Sublingual nitroglycerin x 1 administered with partial relief.
            - Pain scale 8/10 at peak, now 4/10.
        """.trimIndent()

        val item = ChecklistItem(id = "it-multi", text = "Chest Pain Characteristics", note = multilineNote)
        assertEquals(4, item.note?.lines()?.size)
        assertTrue(item.note!!.contains("nitroglycerin"))
    }

    @Test
    fun test_checklist_boundary_duplicate_ids_handling() {
        // Items with identical IDs should still be distinct objects in memory
        val item1 = ChecklistItem(id = "it-dup", text = "Item First Instance", checked = false)
        val item2 = ChecklistItem(id = "it-dup", text = "Item Second Instance", checked = true)
        val section = ChecklistSection(id = "sec-dup", title = "Section", items = listOf(item1, item2))

        assertEquals(2, section.items.size)
        assertFalse(section.items[0].checked)
        assertTrue(section.items[1].checked)
    }

    @Test
    fun test_checklist_boundary_deep_section_item_immutability() {
        val item = ChecklistItem(id = "it-base", text = "Base Item", checked = false)
        val section = ChecklistSection(id = "sec-base", title = "Base Section", items = listOf(item))
        val instance = EncounterChecklistInstance(id = "inst-base", templateId = "tmpl-base", title = "Base Checklist", sections = listOf(section))

        // Toggle item within deep structure by creating updated copies
        val updatedSections = instance.sections.map { s ->
            s.copy(items = s.items.map { i ->
                if (i.id == "it-base") i.copy(checked = true) else i
            })
        }
        val updatedInstance = instance.copy(sections = updatedSections)

        assertFalse(instance.sections[0].items[0].checked)
        assertTrue(updatedInstance.sections[0].items[0].checked)
    }
}
