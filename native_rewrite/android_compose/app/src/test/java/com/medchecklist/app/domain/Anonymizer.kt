package com.medchecklist.app.domain

import com.medchecklist.app.data.*
import kotlin.math.abs

data class AnonymizeOptions(
    val pseudonymizeId: Boolean = true,
    val maskBedAndWard: Boolean = true,
    val maskFacility: Boolean = true,
    val relativeDates: Boolean = true,
    val redactPhiInText: Boolean = true,
    val ageBracketOnly: Boolean = true,
    val removeUnredactedImages: Boolean = true,
    val removeRawInk: Boolean = true
)

object Anonymizer {

    fun hashString(str: String): String {
        var hash = 0
        for (ch in str) {
            hash = (hash shl 5) - hash + ch.code
        }
        return abs(hash).toString(16).uppercase().padStart(4, '0').takeLast(4)
    }

    fun generatePseudonym(originalId: String): String {
        val hash = hashString(originalId.ifEmpty { "patient" })
        return "Pt-ANON-$hash"
    }

    fun maskAgeBracket(ageStr: String?): String? {
        if (ageStr.isNullOrBlank()) return null
        val num = ageStr.trim().toIntOrNull() ?: return ageStr
        if (num >= 90) return "90+"
        if (num < 10) return "<10"
        val lower = (num / 10) * 10
        val upper = lower + 9
        return "$lower-$upper yo"
    }

    fun redactPhiFromText(text: String): String {
        if (text.isEmpty()) return ""
        var sanitized = text

        // 1. Phone numbers
        sanitized = sanitized.replace(
            Regex("""\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"""),
            "[REDACTED_PHONE]"
        )

        // 2. Email addresses
        sanitized = sanitized.replace(
            Regex("""\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"""),
            "[REDACTED_EMAIL]"
        )

        // 3. MRNs & Account numbers
        sanitized = sanitized.replace(
            Regex("""\b(?:MRN|MR#|FIN|SSN|NHS|ID|Record|Account)[\s#:]*([A-Za-z0-9-]{4,15})\b""", RegexOption.IGNORE_CASE),
            "MRN:[REDACTED_ID]"
        )
        sanitized = sanitized.replace(Regex("""\b\d{3}-\d{2}-\d{4}\b"""), "[REDACTED_SSN]")

        // 4. Dates
        sanitized = sanitized.replace(
            Regex("""\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b"""),
            "[REDACTED_DATE]"
        )
        sanitized = sanitized.replace(
            Regex("""\b(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b""", RegexOption.IGNORE_CASE),
            "[REDACTED_DATE]"
        )

        // 5. Clinician names
        sanitized = sanitized.replace(
            Regex("""\b(?:Dr\.|Doctor|Prof\.|RN|MD|DO|NP|PA-C)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b"""),
            "Dr. [REDACTED_CLINICIAN]"
        )

        return sanitized
    }

    fun anonymizePatientEncounter(
        encounter: PatientEncounter,
        options: AnonymizeOptions = AnonymizeOptions()
    ): PatientEncounter {
        val newPatientId = if (options.pseudonymizeId) generatePseudonym(encounter.patientIdentifier) else encounter.patientIdentifier
        val newBed = if (options.maskBedAndWard) null else encounter.bedNumber
        val newGroup = if (options.maskBedAndWard) (if (encounter.group != null) "Clinical Care Unit" else null) else encounter.group
        val newFacility = if (options.maskFacility) (if (encounter.facility != null) "Medical Center [De-identified]" else null) else encounter.facility
        val newAge = if (options.ageBracketOnly) maskAgeBracket(encounter.age) else encounter.age
        val newCreatedAt = if (options.relativeDates) 0L else encounter.createdAt
        val newUpdatedAt = if (options.relativeDates) 0L else encounter.updatedAt
        val newArchivedAt = if (options.relativeDates) null else encounter.archivedAt

        val notes = encounter.generalNotes
        val newComplaint = if (options.redactPhiInText) redactPhiFromText(encounter.chiefComplaint) else encounter.chiefComplaint
        val newGeneralNotes = if (options.redactPhiInText && notes != null) redactPhiFromText(notes) else notes

        val newChecklists = encounter.checklists.map { chk ->
            chk.copy(
                institution = if (options.maskFacility) null else chk.institution,
                sections = chk.sections.map { sec ->
                    sec.copy(
                        items = sec.items.map { itm ->
                            val rawNote = itm.note
                            val itmNote = if (options.redactPhiInText && rawNote != null) redactPhiFromText(rawNote) else rawNote
                            val itmImages = if (options.removeUnredactedImages) {
                                itm.images.filter { img ->
                                    img.tags.contains("anonymized") || img.tags.contains("redacted")
                                }
                            } else itm.images
                            itm.copy(note = itmNote, images = itmImages)
                        }
                    )
                }
            )
        }

        val newImages = if (options.removeUnredactedImages) {
            encounter.images.filter { img ->
                img.tags.contains("anonymized") || img.tags.contains("redacted")
            }
        } else encounter.images

        return encounter.copy(
            patientIdentifier = newPatientId,
            bedNumber = newBed,
            group = newGroup,
            facility = newFacility,
            age = newAge,
            createdAt = newCreatedAt,
            updatedAt = newUpdatedAt,
            archivedAt = newArchivedAt,
            chiefComplaint = newComplaint,
            generalNotes = newGeneralNotes,
            checklists = newChecklists,
            images = newImages
        )
    }
}
