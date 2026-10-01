package com.medchecklist.app

import com.medchecklist.app.data.*
import com.medchecklist.app.domain.Anonymizer
import org.junit.Assert.*
import org.junit.Test

class HipaaAnonymizerTest {

    // ==========================================
    // Tier 1: Feature Coverage (5 tests)
    // ==========================================

    @Test
    fun test_anonymizer_deterministic_pseudonym_generation() {
        val id1 = "Smith, John 1962-04-12"
        val pseudo1 = Anonymizer.generatePseudonym(id1)
        val pseudo2 = Anonymizer.generatePseudonym(id1)

        assertTrue(pseudo1.startsWith("Pt-ANON-"))
        assertEquals(pseudo1, pseudo2) // Must be deterministic

        val id2 = "Doe, Jane 1985-09-21"
        val pseudo3 = Anonymizer.generatePseudonym(id2)
        assertNotEquals(pseudo1, pseudo3)
    }

    @Test
    fun test_anonymizer_ward_and_bed_masking() {
        val enc = PatientEncounter(
            patientIdentifier = "Bed 12 - Jackson, M.",
            bedNumber = "12",
            group = "Cardiovascular ICU"
        )
        val anonymized = Anonymizer.anonymizePatientEncounter(enc)

        assertNull(anonymized.bedNumber)
        assertEquals("Clinical Care Unit", anonymized.group)
    }

    @Test
    fun test_anonymizer_facility_masking() {
        val enc = PatientEncounter(
            patientIdentifier = "Patient 450",
            facility = "Memorial Regional Hospital"
        )
        val anonymized = Anonymizer.anonymizePatientEncounter(enc)

        assertEquals("Medical Center [De-identified]", anonymized.facility)
    }

    @Test
    fun test_anonymizer_age_bracket_generalization() {
        assertEquals("60-69 yo", Anonymizer.maskAgeBracket("67"))
        assertEquals("40-49 yo", Anonymizer.maskAgeBracket("42"))
        assertEquals("90+", Anonymizer.maskAgeBracket("92"))
        assertEquals("90+", Anonymizer.maskAgeBracket("101"))
        assertEquals("<10", Anonymizer.maskAgeBracket("7"))
    }

    @Test
    fun test_anonymizer_phi_regex_redaction() {
        val textWithPhone = "Contact daughter at (555) 234-5678 or 555-987-6543."
        val redactedPhone = Anonymizer.redactPhiFromText(textWithPhone)
        assertFalse(redactedPhone.contains("555"))
        assertTrue(redactedPhone.contains("[REDACTED_PHONE]"))

        val textWithEmail = "Send report to surgeon.smith@hospital.org."
        val redactedEmail = Anonymizer.redactPhiFromText(textWithEmail)
        assertFalse(redactedEmail.contains("surgeon.smith"))
        assertTrue(redactedEmail.contains("[REDACTED_EMAIL]"))

        val textWithMrn = "Patient MRN #1234567 admitted yesterday."
        val redactedMrn = Anonymizer.redactPhiFromText(textWithMrn)
        assertFalse(redactedMrn.contains("1234567"))
        assertTrue(redactedMrn.contains("MRN:[REDACTED_ID]"))

        val textWithSsn = "SSN on file: 123-45-6789."
        val redactedSsn = Anonymizer.redactPhiFromText(textWithSsn)
        assertFalse(redactedSsn.contains("123-45-6789"))
        assertTrue(redactedSsn.contains("[REDACTED_SSN]"))

        val textWithDoctor = "Reviewed with Dr. Alice Walker at bedside."
        val redactedDoctor = Anonymizer.redactPhiFromText(textWithDoctor)
        assertFalse(redactedDoctor.contains("Alice Walker"))
        assertTrue(redactedDoctor.contains("Dr. [REDACTED_CLINICIAN]"))
    }

    // ==========================================
    // Tier 2: Boundary & Corner Cases (5 tests)
    // ==========================================

    @Test
    fun test_anonymizer_boundary_clean_text_no_false_positives() {
        val cleanMedicalText = "Patient has acute bronchitis with productive cough and mild wheezing. Prescribed Albuterol inhaler 2 puffs q4h prn."
        val result = Anonymizer.redactPhiFromText(cleanMedicalText)
        assertEquals(cleanMedicalText, result)
    }

    @Test
    fun test_anonymizer_boundary_dense_adjacent_phi() {
        val denseText = "Contact Dr. Gregory House at 555-019-2831 or email g.house@princeton.edu regarding MRN 987654321."
        val redacted = Anonymizer.redactPhiFromText(denseText)
        assertFalse(redacted.contains("Gregory House"))
        assertFalse(redacted.contains("555-019-2831"))
        assertFalse(redacted.contains("g.house@princeton.edu"))
        assertFalse(redacted.contains("987654321"))
        assertTrue(redacted.contains("Dr. [REDACTED_CLINICIAN]"))
        assertTrue(redacted.contains("[REDACTED_PHONE]"))
        assertTrue(redacted.contains("[REDACTED_EMAIL]"))
    }

    @Test
    fun test_anonymizer_boundary_age_bracket_edges() {
        assertEquals("<10", Anonymizer.maskAgeBracket("0"))
        assertEquals("<10", Anonymizer.maskAgeBracket("9"))
        assertEquals("10-19 yo", Anonymizer.maskAgeBracket("10"))
        assertEquals("80-89 yo", Anonymizer.maskAgeBracket("89"))
        assertEquals("90+", Anonymizer.maskAgeBracket("90"))
        assertEquals("90+", Anonymizer.maskAgeBracket("105"))
        // Non numeric input should return as is
        assertEquals("Adult", Anonymizer.maskAgeBracket("Adult"))
    }

    @Test
    fun test_anonymizer_boundary_date_redaction() {
        val textWithDate = "Admitted on 12/04/2024 and evaluated on November 5, 2024."
        val redacted = Anonymizer.redactPhiFromText(textWithDate)
        assertFalse(redacted.contains("12/04/2024"))
        assertFalse(redacted.contains("November 5, 2024"))
        assertTrue(redacted.contains("[REDACTED_DATE]"))
    }

    @Test
    fun test_anonymizer_boundary_strip_unredacted_images() {
        val unredactedImg = MedicalImage(id = "img-unredacted", url = "photo.jpg", tags = listOf("wound", "bedside"))
        val redactedImg = MedicalImage(id = "img-redacted", url = "photo_anonymized.jpg", tags = listOf("wound", "anonymized"))

        val item = ChecklistItem(
            id = "it-1",
            text = "Wound site photo",
            images = listOf(unredactedImg, redactedImg)
        )
        val checklist = EncounterChecklistInstance(
            id = "c-1",
            templateId = "t-1",
            title = "Wound Protocol",
            sections = listOf(ChecklistSection(id = "s-1", title = "Site", items = listOf(item)))
        )
        val enc = PatientEncounter(
            patientIdentifier = "Pt-Images",
            checklists = listOf(checklist),
            images = listOf(unredactedImg, redactedImg)
        )

        val anonymized = Anonymizer.anonymizePatientEncounter(enc)
        // Only images with tag 'anonymized' or 'redacted' must remain
        assertEquals(1, anonymized.images.size)
        assertEquals("img-redacted", anonymized.images[0].id)

        val itemImages = anonymized.checklists[0].sections[0].items[0].images
        assertEquals(1, itemImages.size)
        assertEquals("img-redacted", itemImages[0].id)
    }
}
