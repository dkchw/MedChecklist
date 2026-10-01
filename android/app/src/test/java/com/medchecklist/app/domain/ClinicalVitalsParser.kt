package com.medchecklist.app.domain

data class ParsedVitals(
    val bp: String? = null,
    val pulse: Int? = null,
    val temp: Float? = null,
    val spo2: Int? = null
)

object ClinicalVitalsParser {

    val MEDICAL_KEYWORDS = listOf(
        "BP", "HR", "RR", "TEMP", "SPO2", "MG", "ML", "MCG", "TAB", "PO", "IV", "IM",
        "BID", "TID", "QID", "PRN", "STAT", "YO", "YOF", "YOM", "CC", "BPM", "MMHG",
        "KG", "G", "NORMAL", "HIGH", "LOW", "MILD", "PAIN", "SOB", "NAD"
    )

    fun postProcessMedicalVocabulary(text: String): String {
        val trimmed = text.trim()
        val upper = trimmed.uppercase()

        for (kw in MEDICAL_KEYWORDS) {
            if (upper == kw) return kw
            if (upper.length == kw.length && upper.length >= 2) {
                var diffs = 0
                for (i in upper.indices) {
                    if (upper[i] != kw[i]) diffs++
                }
                if (diffs == 1 && upper.length >= 3) {
                    return kw
                }
            }
        }

        // Process token by token for OCR digit confusion (e.g. "13O/85 mmHg" -> "130/85 mmHg")
        val words = trimmed.split(" ").map { word ->
            if (word.any { it.isDigit() } && (word.contains('O') || word.contains('o') || word.contains('l') || word.contains('I'))) {
                val corrected = word
                    .replace('O', '0')
                    .replace('o', '0')
                    .replace('l', '1')
                    .replace('I', '1')
                if (corrected.matches(Regex("""^[\d/.\-%+=]+$"""))) corrected else word
            } else word
        }
        val wordProcessed = words.joinToString(" ")

        if (wordProcessed.any { it.isDigit() } && (wordProcessed.contains('O') || wordProcessed.contains('o') || wordProcessed.contains('l') || wordProcessed.contains('I'))) {
            val corrected = wordProcessed
                .replace('O', '0')
                .replace('o', '0')
                .replace('l', '1')
                .replace('I', '1')
            if (corrected.matches(Regex("""^[\d/.\-%+= ]+$"""))) {
                return corrected
            }
        }

        return wordProcessed
    }

    fun parseClinicalVitals(text: String): ParsedVitals {
        // Pre-normalize OCR letter confusion in numbers
        val preprocessed = postProcessMedicalVocabulary(text)
        // Replace non-vital characters with spaces so digits from different measurements do not merge
        val cleaned = preprocessed.replace(Regex("""[^\d/.\-\s]"""), " ").trim()

        // 1. Blood Pressure: e.g. "120/80", "135/85", "110-70", "118 / 76"
        var bp: String? = null
        val bpMatch = Regex("""\b(\d{2,3})\s*[/\-]\s*(\d{2,3})\b""").find(cleaned) ?: Regex("""(\d{2,3})\s*[/\-]\s*(\d{2,3})""").find(cleaned)
        if (bpMatch != null) {
            val sys = bpMatch.groupValues[1].toIntOrNull()
            val dia = bpMatch.groupValues[2].toIntOrNull()
            if (sys != null && dia != null && sys in 50..260 && dia in 25..160) {
                bp = "$sys/$dia"
            }
        }

        // 2. Pulse / Heart Rate
        var pulse: Int? = null
        val tokens = cleaned.split(Regex("""\s+"""))
        for (token in tokens) {
            if (token.matches(Regex("""^\d{2,3}$"""))) {
                val v = token.toIntOrNull()
                if (v != null && v in 35..240) {
                    if (bp == null || !bp.split("/").contains(token)) {
                        pulse = v
                        break
                    }
                }
            }
        }

        // 3. Temperature (e.g. 36.5, 37.2, 38.8, 98.6)
        var temp: Float? = null
        val tempMatch = Regex("""\b(\d{2}\.\d)\b""").find(cleaned) ?: Regex("""(\d{2}\.\d)""").find(cleaned)
        if (tempMatch != null) {
            val v = tempMatch.groupValues[1].toFloatOrNull()
            if (v != null && ((v in 34.0f..43.0f) || (v in 94.0f..108.0f))) {
                temp = v
            }
        }

        // 4. SpO2 (e.g. 98%, 95%)
        var spo2: Int? = null
        val spo2Match = Regex("""(\d{2,3})\s*%""").find(text)
        if (spo2Match != null) {
            val v = spo2Match.groupValues[1].toIntOrNull()
            if (v != null && v in 50..100) {
                spo2 = v
            }
        }

        return ParsedVitals(bp = bp, pulse = pulse, temp = temp, spo2 = spo2)
    }
}
