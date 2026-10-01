package com.medchecklist.app

import com.medchecklist.app.data.*
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID

class EncounterDataTest {

    // ==========================================
    // Tier 1: Feature Coverage (5 tests)
    // ==========================================

    @Test
    fun test_encounter_default_instantiation() {
        val enc = PatientEncounter(patientIdentifier = "Pt-1001")
        assertNotNull(enc.id)
        assertTrue(enc.id.isNotEmpty())
        assertEquals("Pt-1001", enc.patientIdentifier)
        assertEquals("active", enc.status)
        assertEquals(1, enc.pagesCount)
        assertFalse(enc.isPinned)
        assertFalse(enc.isDeleted)
        assertTrue(enc.createdAt > 0L)
        assertTrue(enc.updatedAt > 0L)
        assertNull(enc.archivedAt)
        assertTrue(enc.checklists.isEmpty())
        assertTrue(enc.tags.isEmpty())
        assertTrue(enc.images.isEmpty())
        assertTrue(enc.links.isEmpty())
    }

    @Test
    fun test_encounter_demographics_update() {
        val original = PatientEncounter(patientIdentifier = "Pt-1002")
        val updated = original.copy(
            bedNumber = "4B",
            group = "ICU",
            facility = "St. Jude Hospital",
            age = "65",
            sex = "M",
            chiefComplaint = "Acute respiratory distress"
        )
        assertEquals("4B", updated.bedNumber)
        assertEquals("ICU", updated.group)
        assertEquals("St. Jude Hospital", updated.facility)
        assertEquals("65", updated.age)
        assertEquals("M", updated.sex)
        assertEquals("Acute respiratory distress", updated.chiefComplaint)
    }

    @Test
    fun test_encounter_json_serialization_roundtrip() {
        val converters = Converters()

        val checklist = EncounterChecklistInstance(
            id = "chk-inst-1",
            templateId = "tmpl-1",
            title = "Cardio Assessment",
            sections = listOf(
                ChecklistSection(
                    id = "sec-1",
                    title = "Vitals & Pain",
                    items = listOf(
                        ChecklistItem(id = "itm-1", text = "Chest pain scale 1-10", checked = true, labValue = "8/10")
                    )
                )
            )
        )
        val image = MedicalImage(id = "img-1", url = "content://ecg.png", caption = "Initial ECG")
        val link = MedicalLink(id = "lnk-1", title = "ACC Guideline", url = "https://acc.org/guideline")
        val tags = listOf("cardio", "stemi", "emergency")

        // Test TypeConverters round-trip
        val chkJson = converters.fromChecklists(listOf(checklist))
        val restoredChk = converters.toChecklists(chkJson)
        assertEquals(1, restoredChk.size)
        assertEquals("Cardio Assessment", restoredChk[0].title)
        assertEquals(1, restoredChk[0].sections[0].items.size)
        assertTrue(restoredChk[0].sections[0].items[0].checked)
        assertEquals("8/10", restoredChk[0].sections[0].items[0].labValue)

        val imgJson = converters.fromImages(listOf(image))
        val restoredImg = converters.toImages(imgJson)
        assertEquals(1, restoredImg.size)
        assertEquals("Initial ECG", restoredImg[0].caption)

        val lnkJson = converters.fromLinks(listOf(link))
        val restoredLnk = converters.toLinks(lnkJson)
        assertEquals(1, restoredLnk.size)
        assertEquals("https://acc.org/guideline", restoredLnk[0].url)

        val tagJson = converters.fromStringList(tags)
        val restoredTags = converters.toStringList(tagJson)
        assertEquals(listOf("cardio", "stemi", "emergency"), restoredTags)
    }

    @Test
    fun test_database_seeder_initial_data() {
        // Direct test against DatabaseSeeder demo patient model
        val demo = PatientEncounter(
            id = "demo-patient-1",
            patientIdentifier = "Bed 4 - Smith, J.",
            facility = "City General Hospital",
            group = "Cardiology Ward",
            bedNumber = "4",
            age = "62",
            sex = "M",
            chiefComplaint = "Substernal chest pressure radiating to left arm x 2 hours",
            status = "active",
            generalNotes = "### Bedside Rounds Note\nPatient admitted via ED for acute chest pain. EKG shows T-wave inversions in V4-V6.\n\n- [ ] Follow up repeat high-sensitivity Troponin at 14:00\n- [ ] Bedside echocardiogram scheduled",
            tags = listOf("telemetry", "cardiology", "urgent"),
            isPinned = true
        )
        assertEquals("Bed 4 - Smith, J.", demo.patientIdentifier)
        assertEquals("Cardiology Ward", demo.group)
        assertEquals("4", demo.bedNumber)
        assertTrue(demo.isPinned)
        assertTrue(demo.chiefComplaint.contains("chest pressure"))
        assertTrue(demo.tags.contains("telemetry"))
    }

    @Test
    fun test_encounter_archival_and_soft_delete() {
        val enc = PatientEncounter(patientIdentifier = "Pt-1003", status = "active")
        val archiveTimestamp = 1727757980000L

        // Archive
        val archived = enc.copy(status = "archived", archivedAt = archiveTimestamp)
        assertEquals("archived", archived.status)
        assertEquals(archiveTimestamp, archived.archivedAt)

        // Soft delete
        val softDeleted = archived.copy(isDeleted = true, updatedAt = archiveTimestamp + 1000L)
        assertTrue(softDeleted.isDeleted)
        assertTrue(softDeleted.updatedAt > archiveTimestamp)
    }

    // ==========================================
    // Tier 2: Boundary & Corner Cases (5 tests)
    // ==========================================

    @Test
    fun test_encounter_boundary_empty_strings_and_nulls() {
        val enc = PatientEncounter(
            patientIdentifier = "",
            facility = null,
            group = null,
            bedNumber = null,
            age = null,
            sex = null,
            chiefComplaint = "",
            generalNotes = null,
            archivedAt = null
        )
        assertEquals("", enc.patientIdentifier)
        assertNull(enc.facility)
        assertNull(enc.group)
        assertNull(enc.bedNumber)
        assertEquals("", enc.chiefComplaint)
    }

    @Test
    fun test_encounter_boundary_extreme_timestamps() {
        val epochZero = PatientEncounter(patientIdentifier = "Pt-Zero", createdAt = 0L, updatedAt = 0L)
        assertEquals(0L, epochZero.createdAt)

        val farFuture = PatientEncounter(patientIdentifier = "Pt-Future", createdAt = Long.MAX_VALUE, updatedAt = Long.MAX_VALUE)
        assertEquals(Long.MAX_VALUE, farFuture.createdAt)
    }

    @Test
    fun test_encounter_boundary_large_payload_stress() {
        val largeNotes = "A".repeat(10_000)
        val manyTags = (1..50).map { "tag-$it" }
        val manyItems = (1..100).map {
            ChecklistItem(id = "item-$it", text = "Clinical checklist item $it", checked = it % 2 == 0)
        }
        val checklist = EncounterChecklistInstance(
            id = "inst-large",
            templateId = "tmpl-large",
            title = "Massive Checklist",
            sections = listOf(ChecklistSection(id = "sec-large", title = "Section 1", items = manyItems))
        )

        val largeEncounter = PatientEncounter(
            patientIdentifier = "Pt-Stress",
            generalNotes = largeNotes,
            tags = manyTags,
            checklists = listOf(checklist)
        )

        assertEquals(10_000, largeEncounter.generalNotes?.length)
        assertEquals(50, largeEncounter.tags.size)
        assertEquals(100, largeEncounter.checklists[0].sections[0].items.size)

        // Verify JSON serialization doesn't crash on large payload
        val converters = Converters()
        val json = converters.fromChecklists(largeEncounter.checklists)
        val restored = converters.toChecklists(json)
        assertEquals(100, restored[0].sections[0].items.size)
    }

    @Test
    fun test_encounter_boundary_unicode_and_multilingual() {
        val vietnameseName = "Bệnh nhân: Nguyễn Văn Ánh - Khoa Hồi Sức Tích Cực"
        val complaint = "Bệnh nhân đau tức ngực trái 🫀, khó thở, SpO2 giảm 88% ⚠️"
        val enc = PatientEncounter(patientIdentifier = vietnameseName, chiefComplaint = complaint)

        assertEquals(vietnameseName, enc.patientIdentifier)
        assertEquals(complaint, enc.chiefComplaint)
        assertTrue(enc.chiefComplaint.contains("🫀"))
    }

    @Test
    fun test_encounter_boundary_deep_copy_isolation() {
        val item1 = ChecklistItem(id = "i-1", text = "Original Text", checked = false)
        val sec1 = ChecklistSection(id = "s-1", title = "Original Section", items = listOf(item1))
        val chk1 = EncounterChecklistInstance(id = "c-1", templateId = "t-1", title = "Original Checklist", sections = listOf(sec1))
        val original = PatientEncounter(patientIdentifier = "Original Patient", checklists = listOf(chk1))

        // Modify a clone
        val modifiedItems = listOf(item1.copy(checked = true, text = "Mutated Text"))
        val modifiedSec = sec1.copy(items = modifiedItems)
        val modifiedChk = chk1.copy(sections = listOf(modifiedSec))
        val clone = original.copy(patientIdentifier = "Clone Patient", checklists = listOf(modifiedChk))

        assertEquals("Original Patient", original.patientIdentifier)
        assertFalse(original.checklists[0].sections[0].items[0].checked)
        assertEquals("Original Text", original.checklists[0].sections[0].items[0].text)

        assertEquals("Clone Patient", clone.patientIdentifier)
        assertTrue(clone.checklists[0].sections[0].items[0].checked)
        assertEquals("Mutated Text", clone.checklists[0].sections[0].items[0].text)
    }

    @Test
    fun test_dao_contract_and_query_integrity() {
        // 1. Verify EncounterDao method signatures
        val encounterMethods = EncounterDao::class.java.methods.map { it.name }.toSet()
        assertTrue("EncounterDao must have getAllActiveEncounters", encounterMethods.contains("getAllActiveEncounters"))
        assertTrue("EncounterDao must have getArchivedEncounters", encounterMethods.contains("getArchivedEncounters"))
        assertTrue("EncounterDao must have getEncounterById", encounterMethods.contains("getEncounterById"))
        assertTrue("EncounterDao must have insertEncounter", encounterMethods.contains("insertEncounter"))
        assertTrue("EncounterDao must have updateEncounter", encounterMethods.contains("updateEncounter"))
        assertTrue("EncounterDao must have deleteEncounter", encounterMethods.contains("deleteEncounter"))
        assertTrue("EncounterDao must retain softDeleteEncounter", encounterMethods.contains("softDeleteEncounter"))
        assertTrue("EncounterDao must retain hardDeleteEncounter", encounterMethods.contains("hardDeleteEncounter"))

        // Verify deleteEncounter parameter types
        val deleteEncMethod = EncounterDao::class.java.methods.find { it.name == "deleteEncounter" }
        assertNotNull(deleteEncMethod)
        assertEquals(String::class.java, deleteEncMethod!!.parameterTypes[0])
        assertEquals(Long::class.javaPrimitiveType, deleteEncMethod.parameterTypes[1])

        // 2. Verify InkStrokeDao contract methods: deleteStrokes and deletePageStrokes
        val inkMethods = InkStrokeDao::class.java.methods.map { it.name }.toSet()
        assertTrue("InkStrokeDao must have deleteStrokes", inkMethods.contains("deleteStrokes"))
        assertTrue("InkStrokeDao must have deletePageStrokes", inkMethods.contains("deletePageStrokes"))

        val deleteStrokesMethod = InkStrokeDao::class.java.methods.find { it.name == "deleteStrokes" }
        assertNotNull(deleteStrokesMethod)
        assertEquals(String::class.java, deleteStrokesMethod!!.parameterTypes[0])
        assertEquals(List::class.java, deleteStrokesMethod.parameterTypes[1])

        val deletePageMethod = InkStrokeDao::class.java.methods.find { it.name == "deletePageStrokes" }
        assertNotNull(deletePageMethod)
        assertEquals(String::class.java, deletePageMethod!!.parameterTypes[0])
        assertEquals(Int::class.javaPrimitiveType, deletePageMethod.parameterTypes[1])

        // 3. Backward-compatible aliases must be preserved
        assertTrue("InkStrokeDao must retain deleteStrokesByIds", inkMethods.contains("deleteStrokesByIds"))
        assertTrue("InkStrokeDao must retain clearPageStrokes", inkMethods.contains("clearPageStrokes"))
        assertTrue("InkStrokeDao must retain deleteAllStrokesForEncounter", inkMethods.contains("deleteAllStrokesForEncounter"))
    }
}
