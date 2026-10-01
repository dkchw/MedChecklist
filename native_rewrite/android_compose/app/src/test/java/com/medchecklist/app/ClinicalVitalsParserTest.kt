package com.medchecklist.app

import com.medchecklist.app.domain.ClinicalVitalsParser
import org.junit.Assert.*
import org.junit.Test

class ClinicalVitalsParserTest {

    // ==========================================
    // Tier 1: Feature Coverage (5 tests)
    // ==========================================

    @Test
    fun test_vitals_parse_blood_pressure() {
        val vitals1 = ClinicalVitalsParser.parseClinicalVitals("120/80")
        assertEquals("120/80", vitals1.bp)

        val vitals2 = ClinicalVitalsParser.parseClinicalVitals("BP: 135/85 mmHg")
        assertEquals("135/85", vitals2.bp)

        val vitals3 = ClinicalVitalsParser.parseClinicalVitals("110-70")
        assertEquals("110/70", vitals3.bp)
    }

    @Test
    fun test_vitals_parse_heart_rate_pulse() {
        val vitals = ClinicalVitalsParser.parseClinicalVitals("72")
        assertEquals(72, vitals.pulse)

        val vitalsHigh = ClinicalVitalsParser.parseClinicalVitals("140")
        assertEquals(140, vitalsHigh.pulse)
    }

    @Test
    fun test_vitals_parse_body_temperature() {
        val vitalsC = ClinicalVitalsParser.parseClinicalVitals("37.8")
        assertEquals(37.8f, vitalsC.temp ?: 0f, 0.01f)

        val vitalsF = ClinicalVitalsParser.parseClinicalVitals("98.6")
        assertEquals(98.6f, vitalsF.temp ?: 0f, 0.01f)
    }

    @Test
    fun test_vitals_parse_spo2_saturation() {
        val vitals1 = ClinicalVitalsParser.parseClinicalVitals("98%")
        assertEquals(98, vitals1.spo2)

        val vitals2 = ClinicalVitalsParser.parseClinicalVitals("Room air SpO2 94 %")
        assertEquals(94, vitals2.spo2)
    }

    @Test
    fun test_vitals_post_process_medical_vocabulary() {
        // OCR character confusion: 'O'/'o' -> '0', 'l'/'I' -> '1'
        val correctedBp = ClinicalVitalsParser.postProcessMedicalVocabulary("12O/8O")
        assertEquals("120/80", correctedBp)

        val correctedPulse = ClinicalVitalsParser.postProcessMedicalVocabulary("7l")
        assertEquals("71", correctedPulse)

        // Medical abbreviations: exact and single-diff
        val exactKw = ClinicalVitalsParser.postProcessMedicalVocabulary("spo2")
        assertEquals("SPO2", exactKw)

        val closeKw = ClinicalVitalsParser.postProcessMedicalVocabulary("BPN") // 1 char diff from BPM
        assertEquals("BPM", closeKw)

        val exactTemp = ClinicalVitalsParser.postProcessMedicalVocabulary("TEMP")
        assertEquals("TEMP", exactTemp)
    }

    // ==========================================
    // Tier 2: Boundary & Corner Cases (5 tests)
    // ==========================================

    @Test
    fun test_vitals_boundary_physiological_range_gating() {
        // Impossible blood pressure: Sys > 260 or Dia < 25 or Dia > 160
        val impossibleBp1 = ClinicalVitalsParser.parseClinicalVitals("350/200")
        assertNull(impossibleBp1.bp)

        val impossibleBp2 = ClinicalVitalsParser.parseClinicalVitals("40/15")
        assertNull(impossibleBp2.bp)

        // Impossible pulse (<35 or >240)
        val impossiblePulse1 = ClinicalVitalsParser.parseClinicalVitals("12")
        assertNull(impossiblePulse1.pulse)

        val impossiblePulse2 = ClinicalVitalsParser.parseClinicalVitals("280")
        assertNull(impossiblePulse2.pulse)

        // Impossible temp (<34.0 or (temp > 43.0 and temp < 94.0) or temp > 108.0)
        val impossibleTemp1 = ClinicalVitalsParser.parseClinicalVitals("22.5")
        assertNull(impossibleTemp1.temp)

        val impossibleTemp2 = ClinicalVitalsParser.parseClinicalVitals("55.0")
        assertNull(impossibleTemp2.temp)

        // Impossible SpO2 (<50 or >100)
        val impossibleSpo2_1 = ClinicalVitalsParser.parseClinicalVitals("120%")
        assertNull(impossibleSpo2_1.spo2)

        val impossibleSpo2_2 = ClinicalVitalsParser.parseClinicalVitals("35%")
        assertNull(impossibleSpo2_2.spo2)
    }

    @Test
    fun test_vitals_boundary_noisy_surrounding_clinical_text() {
        val rawInput = "Vitals taken at 14:30 bedside rounds: BP is 125/82 with heart rate stable"
        val vitals = ClinicalVitalsParser.parseClinicalVitals(rawInput)
        assertEquals("125/82", vitals.bp)
    }

    @Test
    fun test_vitals_boundary_separator_variations() {
        val slashBp = ClinicalVitalsParser.parseClinicalVitals("130/85")
        assertEquals("130/85", slashBp.bp)

        val hyphenBp = ClinicalVitalsParser.parseClinicalVitals("130-85")
        assertEquals("130/85", hyphenBp.bp)
    }

    @Test
    fun test_vitals_boundary_exact_cutoff_thresholds() {
        // Lower bound BP: Sys 50, Dia 25
        val minBp = ClinicalVitalsParser.parseClinicalVitals("50/25")
        assertEquals("50/25", minBp.bp)

        // Upper bound BP: Sys 260, Dia 160
        val maxBp = ClinicalVitalsParser.parseClinicalVitals("260/160")
        assertEquals("260/160", maxBp.bp)

        // Min Pulse: 35
        val minPulse = ClinicalVitalsParser.parseClinicalVitals("35")
        assertEquals(35, minPulse.pulse)

        // Max Pulse: 240
        val maxPulse = ClinicalVitalsParser.parseClinicalVitals("240")
        assertEquals(240, maxPulse.pulse)

        // Min Temp C: 34.0
        val minTemp = ClinicalVitalsParser.parseClinicalVitals("34.0")
        assertEquals(34.0f, minTemp.temp ?: 0f, 0.01f)

        // Max Temp C: 43.0
        val maxTemp = ClinicalVitalsParser.parseClinicalVitals("43.0")
        assertEquals(43.0f, maxTemp.temp ?: 0f, 0.01f)
    }

    @Test
    fun test_vitals_boundary_case_insensitivity_and_whitespace() {
        val paddedInput = "   118 / 76   "
        val vitals = ClinicalVitalsParser.parseClinicalVitals(paddedInput)
        assertEquals("118/76", vitals.bp)

        val lowerKw = ClinicalVitalsParser.postProcessMedicalVocabulary("   bp   ")
        assertEquals("BP", lowerKw)
    }
}
