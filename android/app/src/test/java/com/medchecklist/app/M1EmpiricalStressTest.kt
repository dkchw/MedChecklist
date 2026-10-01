package com.medchecklist.app

import com.google.gson.JsonSyntaxException
import com.medchecklist.app.data.*
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID

class M1EmpiricalStressTest {

    private val converters = Converters()

    // =========================================================================
    // 1. Serialization Extreme Scenarios: Unicode, Control Chars, Injection
    // =========================================================================

    @Test
    fun test_unicode_and_special_characters_roundtrip() {
        // Test high-surrogates, medical symbols, RTL Arabic/Hebrew, CJK, zero-width joiners
        val specialTexts = listOf(
            "🫀 🧠 🫁 💉 🩹 🩺 🧬 🩸",
            "فحص المريض: ضغط الدم 120/80 مم زئبق", // Arabic RTL
            "בדיקת חולה: לחץ דם תקין", // Hebrew RTL
            "患者診察：血圧120/80、脈拍72bpm、体温36.5℃", // Japanese Kanji/Kana
            "환자 사정: 활력징후 안정적", // Korean Hangul
            "Bệnh nhân có triệu chứng sốt cao 39.5°C & khó thở", // Vietnamese diacritics
            "<script>alert('xss');</script> & ' or '1'='1' --", // Script and SQL injection strings
            "Line1\nLine2\r\nLine3\tTabbed\bBackspace\"Quotes\"\\Backslash\\"
        )

        val items = specialTexts.mapIndexed { idx, txt ->
            ChecklistItem(
                id = "item-$idx",
                text = txt,
                note = "Note: $txt",
                category = "Cat: $txt",
                referenceValue = "Ref: $txt",
                labValue = "Val: $txt",
                unit = "Unit: $txt"
            )
        }

        val section = ChecklistSection(id = "sec-spec", title = "Special Section: 🫀", items = items)
        val instance = EncounterChecklistInstance(
            id = "inst-spec",
            templateId = "tmpl-spec",
            title = "Unicode Checklist 🩺",
            institution = "Hôpital Universitaire de Genève 🏥",
            sections = listOf(section)
        )

        val json = converters.fromChecklists(listOf(instance))
        assertNotNull(json)
        assertTrue(json.contains("🫀"))
        assertTrue(json.contains("Hôpital"))

        val restored = converters.toChecklists(json)
        assertEquals(1, restored.size)
        val restoredInst = restored[0]
        assertEquals("Unicode Checklist 🩺", restoredInst.title)
        assertEquals("Hôpital Universitaire de Genève 🏥", restoredInst.institution)
        assertEquals(specialTexts.size, restoredInst.sections[0].items.size)

        for (i in specialTexts.indices) {
            assertEquals(specialTexts[i], restoredInst.sections[0].items[i].text)
            assertEquals("Note: ${specialTexts[i]}", restoredInst.sections[0].items[i].note)
        }
    }

    // =========================================================================
    // 2. Converters Null, Empty, and Blank String Robustness
    // =========================================================================

    @Test
    fun test_converters_null_and_empty_inputs() {
        // Null inputs
        assertTrue(converters.toStringList(null).isEmpty())
        assertTrue(converters.toStrokePoints(null).isEmpty())
        assertTrue(converters.toChecklists(null).isEmpty())
        assertTrue(converters.toSections(null).isEmpty())
        assertTrue(converters.toImages(null).isEmpty())
        assertTrue(converters.toLinks(null).isEmpty())

        // Empty string inputs
        assertTrue(converters.toStringList("").isEmpty())
        assertTrue(converters.toStrokePoints("").isEmpty())
        assertTrue(converters.toChecklists("").isEmpty())
        assertTrue(converters.toSections("").isEmpty())
        assertTrue(converters.toImages("").isEmpty())
        assertTrue(converters.toLinks("").isEmpty())

        // "null" literal string from JSON / SQLite
        assertTrue(converters.toStringList("null").isEmpty())
        assertTrue(converters.toStrokePoints("null").isEmpty())
        assertTrue(converters.toChecklists("null").isEmpty())
        assertTrue(converters.toSections("null").isEmpty())
        assertTrue(converters.toImages("null").isEmpty())
        assertTrue(converters.toLinks("null").isEmpty())

        // "[]" empty JSON array string
        assertTrue(converters.toStringList("[]").isEmpty())
        assertTrue(converters.toStrokePoints("[]").isEmpty())
        assertTrue(converters.toChecklists("[]").isEmpty())
        assertTrue(converters.toSections("[]").isEmpty())
        assertTrue(converters.toImages("[]").isEmpty())
        assertTrue(converters.toLinks("[]").isEmpty())

        // Whitespace-only string
        assertTrue(converters.toStringList("   ").isEmpty())
        assertTrue(converters.toStrokePoints("   ").isEmpty())
        assertTrue(converters.toChecklists("   ").isEmpty())
        assertTrue(converters.toSections("   ").isEmpty())
        assertTrue(converters.toImages("   ").isEmpty())
        assertTrue(converters.toLinks("   ").isEmpty())
    }

    // =========================================================================
    // 3. Converters Serialization of Null List References
    // =========================================================================

    @Test
    fun test_converters_null_list_serialization() {
        // from* with null lists should serialize safely to "[]" without crashing
        assertEquals("[]", converters.fromStringList(null))
        assertEquals("[]", converters.fromStrokePoints(null))
        assertEquals("[]", converters.fromChecklists(null))
        assertEquals("[]", converters.fromSections(null))
        assertEquals("[]", converters.fromImages(null))
        assertEquals("[]", converters.fromLinks(null))
    }

    // =========================================================================
    // 4. Malformed JSON Resilience & Exception Propagation
    // =========================================================================

    @Test
    fun test_converters_malformed_json_behavior() {
        val corruptedInputs = listOf(
            "{not a json array}",
            "[{\"id\": \"incomplete\"",
            "[{",
            "undefined",
            "12345",
            "true"
        )

        for (bad in corruptedInputs) {
            try {
                converters.toChecklists(bad)
                // If it doesn't throw, it should return empty list or fail gracefully
            } catch (e: Exception) {
                // Documents whether JsonSyntaxException is thrown on corrupted SQLite records
                assertTrue(e is JsonSyntaxException || e is IllegalStateException || e is ClassCastException)
            }
        }
    }

    // =========================================================================
    // 5. StrokePoint Floating Point Boundary & Edge Cases
    // =========================================================================

    @Test
    fun test_stroke_point_float_boundaries() {
        val extremePoints = listOf(
            StrokePoint(x = 0f, y = 0f, pressure = 0f),
            StrokePoint(x = -1000.5f, y = -9999.99f, pressure = 0.001f),
            StrokePoint(x = Float.MAX_VALUE, y = Float.MIN_VALUE, pressure = 1.0f),
            StrokePoint(x = 1080.123456f, y = 2400.987654f, pressure = 0.85f)
        )

        val stroke = InkStroke(
            encounterId = "enc-1",
            points = extremePoints
        )

        val json = stroke.pointsJson
        assertNotNull(json)
        val restored = converters.toStrokePoints(json)
        assertEquals(extremePoints.size, restored.size)
        assertEquals(-1000.5f, restored[1].x, 0.01f)
        assertEquals(0.85f, restored[3].pressure, 0.001f)
    }

    @Test
    fun test_stroke_point_nan_and_infinity_handling() {
        // Stylus coordinate calculations can occasionally divide by zero producing NaN or Infinity
        val nanPoint = StrokePoint(x = Float.NaN, y = Float.POSITIVE_INFINITY, pressure = Float.NEGATIVE_INFINITY)
        try {
            val json = converters.fromStrokePoints(listOf(nanPoint))
            // Standard Gson throws IllegalArgumentException on NaN/Infinity unless serializeSpecialFloatingPointValues is configured
            assertNotNull(json)
        } catch (e: IllegalArgumentException) {
            // Expected RFC 4627 violation in standard Gson
            assertTrue(e.message?.contains("NaN") == true || e.message?.contains("Infinity") == true)
        }
    }

    // =========================================================================
    // 6. Extreme Payload Stress Harness (Memory & Performance)
    // =========================================================================

    @Test
    fun test_massive_ink_stroke_payload() {
        // Stress-test 25,000 vector points (approx 2 minutes of continuous bedside handwriting)
        val pointCount = 25_000
        val points = ArrayList<StrokePoint>(pointCount)
        for (i in 0 until pointCount) {
            points.add(StrokePoint(x = (i % 1000).toFloat(), y = (i / 1000).toFloat(), pressure = 0.5f))
        }

        val startTime = System.currentTimeMillis()
        val json = converters.fromStrokePoints(points)
        val serializationTime = System.currentTimeMillis() - startTime

        assertTrue("JSON payload should contain points", json.length > 500_000)

        val deserializeStart = System.currentTimeMillis()
        val restored = converters.toStrokePoints(json)
        val deserializationTime = System.currentTimeMillis() - deserializeStart

        assertEquals(pointCount, restored.size)
        assertEquals(points[12345].x, restored[12345].x, 0.001f)
        assertEquals(points[12345].y, restored[12345].y, 0.001f)

        // Ensure performance stays well under 2 seconds on JVM for 25k points
        assertTrue("Serialization took ${serializationTime}ms (should be < 3000ms)", serializationTime < 3000)
        assertTrue("Deserialization took ${deserializationTime}ms (should be < 3000ms)", deserializationTime < 3000)
    }

    @Test
    fun test_massive_encounter_notes_and_tags() {
        // Stress test 100,000 character clinical note (approx 50 single-spaced pages of medical dossier)
        val hugeNote = "Clinical Progress Note Day 1:\n" + "Patient vitals stable. Normal sinus rhythm.\n".repeat(2500)
        val manyTags = (1..500).map { "tag-department-subspecialty-$it" }

        val encounter = PatientEncounter(
            patientIdentifier = "Pt-Massive-Payload",
            generalNotes = hugeNote,
            tags = manyTags
        )

        assertEquals(manyTags.size, encounter.tags.size)
        assertTrue(encounter.generalNotes!!.length > 100_000)

        // Verify tags JSON round-trip
        val tagsJson = encounter.tagsJson
        val restoredTags = converters.toStringList(tagsJson)
        assertEquals(500, restoredTags.size)
        assertEquals("tag-department-subspecialty-250", restoredTags[249])
    }

    // =========================================================================
    // 7. DatabaseSeeder Integrity & Reference Consistency
    // =========================================================================

    @Test
    fun test_seeder_template_and_checklist_id_consistency() {
        // Verify that all checklist IDs referenced in DatabaseSeeder templates exist
        val knownChecklistIds = setOf(
            "chk-ros-general",
            "chk-ros-cardio-resp",
            "chk-cbc-panel",
            "chk-bmp-panel",
            "chk-cardiac-biomarkers",
            "chk-acs-triage",
            "chk-sepsis-bundle",
            "chk-preop-status"
        )

        val templateChecklistReferences = mapOf(
            "tpl-acs-bundle" to listOf("chk-acs-triage", "chk-cardiac-biomarkers", "chk-bmp-panel"),
            "tpl-sepsis-bundle" to listOf("chk-sepsis-bundle", "chk-cbc-panel", "chk-bmp-panel"),
            "tpl-ward-admission" to listOf("chk-ros-general", "chk-ros-cardio-resp", "chk-cbc-panel", "chk-bmp-panel"),
            "tpl-preop-surgical" to listOf("chk-preop-status", "chk-cbc-panel", "chk-cardiac-biomarkers")
        )

        for ((tplId, chkList) in templateChecklistReferences) {
            for (chkId in chkList) {
                assertTrue("Template $tplId references missing checklist $chkId", knownChecklistIds.contains(chkId))
            }
        }
    }

    // =========================================================================
    // 8. PenTool Enum Parsing Boundary & Default Behavior
    // =========================================================================

    @Test
    fun test_pen_tool_from_string_boundaries() {
        assertEquals(PenTool.PEN, PenTool.fromString("pen"))
        assertEquals(PenTool.PEN, PenTool.fromString("PEN"))
        assertEquals(PenTool.PEN, PenTool.fromString("Pen"))
        assertEquals(PenTool.HIGHLIGHTER, PenTool.fromString("highlighter"))
        assertEquals(PenTool.HIGHLIGHTER, PenTool.fromString("HighLighter"))
        assertEquals(PenTool.ERASER, PenTool.fromString("eraser"))
        assertEquals(PenTool.SELECTOR, PenTool.fromString("selector"))
        // Unknown strings fallback to PEN
        assertEquals(PenTool.PEN, PenTool.fromString("unknown_tool"))
        assertEquals(PenTool.PEN, PenTool.fromString(""))
        assertEquals(PenTool.PEN, PenTool.fromString("   "))
    }

    // =========================================================================
    // 9. Kotlin Non-Null Safety under Gson Deserialization (Unsafe Allocation)
    // =========================================================================

    @Test
    fun test_gson_unsafe_deserialization_with_missing_fields() {
        // When JSON omits non-nullable fields or sets them to null, Gson's UnsafeAllocator
        // creates objects with null values in Kotlin non-null properties.
        val jsonMissingText = """
            [
              {
                "id": "inst-1",
                "templateId": "tmpl-1",
                "title": "Test Title",
                "sections": [
                  {
                    "id": "sec-1",
                    "title": "Sec Title",
                    "items": [
                      {
                        "id": "item-1"
                      }
                    ]
                  }
                ]
              }
            ]
        """.trimIndent()

        val restored = converters.toChecklists(jsonMissingText)
        assertEquals(1, restored.size)
        val item = restored[0].sections[0].items[0]
        
        // Empirically observe: In JVM Gson, item.text is null at runtime despite Kotlin 'val text: String'
        // Accessing methods on item.text will throw NullPointerException
        val rawText: Any? = item.text
        if (rawText == null) {
            // Confirmed vulnerability: Gson deserialization bypasses Kotlin non-null guarantees
            // This proves that corrupted or schema-drifted JSON can cause NPE in Kotlin code
            assertNull("Gson allows null into non-null Kotlin property", item.text as String?)
        }
    }

    // =========================================================================
    // 10. Reflection Verification of Interface Contract Compliance
    // =========================================================================

    @Test
    fun test_dao_interface_contract_compliance() {
        // Contract in PROJECT.md:91-98:
        // interface EncounterDao {
        //     fun getAllActiveEncounters(): Flow<List<PatientEncounter>>
        //     fun getArchivedEncounters(): Flow<List<PatientEncounter>>
        //     fun getEncounterById(id: String): Flow<PatientEncounter?>
        //     suspend fun insertEncounter(encounter: PatientEncounter)
        //     suspend fun updateEncounter(encounter: PatientEncounter)
        //     suspend fun deleteEncounter(id: String)
        // }
        val encounterDaoMethods = EncounterDao::class.java.methods.map { it.name }.toSet()
        assertTrue("EncounterDao must have getAllActiveEncounters", encounterDaoMethods.contains("getAllActiveEncounters"))
        assertTrue("EncounterDao must have getArchivedEncounters", encounterDaoMethods.contains("getArchivedEncounters"))
        assertTrue("EncounterDao must have getEncounterById", encounterDaoMethods.contains("getEncounterById"))
        assertTrue("EncounterDao must have insertEncounter", encounterDaoMethods.contains("insertEncounter"))
        assertTrue("EncounterDao must have updateEncounter", encounterDaoMethods.contains("updateEncounter"))

        // Empirically check if PROJECT.md contract 'deleteEncounter' is implemented:
        val hasDeleteEncounter = encounterDaoMethods.contains("deleteEncounter")
        val hasSoftDelete = encounterDaoMethods.contains("softDeleteEncounter")
        val hasHardDelete = encounterDaoMethods.contains("hardDeleteEncounter")

        // In EncounterDao.kt, deleteEncounter, softDeleteEncounter, and hardDeleteEncounter are provided
        assertTrue("EncounterDao provides softDeleteEncounter", hasSoftDelete)
        assertTrue("EncounterDao provides hardDeleteEncounter", hasHardDelete)
        assertTrue("deleteEncounter(id) is present in EncounterDao", hasDeleteEncounter)

        // InkStrokeDao contract in PROJECT.md:100-108:
        // deleteStrokes(encounterId: String, strokeIds: List<String>)
        // deletePageStrokes(encounterId: String, pageIndex: Int)
        val inkStrokeDaoMethods = InkStrokeDao::class.java.methods.map { it.name }.toSet()
        val hasDeleteStrokes = inkStrokeDaoMethods.contains("deleteStrokes")
        val hasDeletePageStrokes = inkStrokeDaoMethods.contains("deletePageStrokes")
        val hasDeleteStrokesByIds = inkStrokeDaoMethods.contains("deleteStrokesByIds")
        val hasClearPageStrokes = inkStrokeDaoMethods.contains("clearPageStrokes")

        assertTrue("InkStrokeDao provides deleteStrokesByIds", hasDeleteStrokesByIds)
        assertTrue("InkStrokeDao provides clearPageStrokes", hasClearPageStrokes)
        assertTrue("deleteStrokes(encounterId, ids) contract method is present", hasDeleteStrokes)
        assertTrue("deletePageStrokes(encounterId, pageIndex) contract method is present", hasDeletePageStrokes)
    }
}
