package com.medchecklist.app.domain

import com.medchecklist.app.data.InkStroke
import com.medchecklist.app.data.PatientEncounter
import com.medchecklist.app.data.StrokePoint

data class PdfHeader(
    val title: String,
    val metadataLine: String,
    val complaintLine: String
)

data class PdfChecklistRow(
    val checklistTitle: String,
    val sectionTitle: String,
    val itemText: String,
    val isChecked: Boolean,
    val referenceValue: String? = null,
    val labValue: String? = null
) {
    val formattedLine: String
        get() {
            val mark = if (isChecked) "[X]" else "[  ]"
            var line = "$mark $itemText"
            if (!labValue.isNullOrEmpty()) line += " -> $labValue"
            if (!referenceValue.isNullOrEmpty()) line += " ($referenceValue)"
            return line
        }
}

object PdfExportData {

    fun assembleHeader(encounter: PatientEncounter): PdfHeader {
        val title = "MedChecklist: ${encounter.patientIdentifier}"
        val metaParts = mutableListOf<String>()
        encounter.bedNumber?.let { metaParts.add("Bed: $it") }
        encounter.group?.let { metaParts.add("Ward: $it") }
        encounter.age?.let { metaParts.add("Age: $it") }
        encounter.sex?.let { metaParts.add("Sex: $it") }
        val metadataLine = metaParts.joinToString(" | ")
        val complaintLine = "Chief Complaint: ${encounter.chiefComplaint}"
        return PdfHeader(title, metadataLine, complaintLine)
    }

    fun assembleChecklistTable(encounter: PatientEncounter): List<PdfChecklistRow> {
        val rows = mutableListOf<PdfChecklistRow>()
        for (chk in encounter.checklists) {
            for (sec in chk.sections) {
                for (itm in sec.items) {
                    rows.add(
                        PdfChecklistRow(
                            checklistTitle = chk.title,
                            sectionTitle = sec.title,
                            itemText = itm.text,
                            isChecked = itm.checked,
                            referenceValue = itm.referenceValue,
                            labValue = itm.labValue
                        )
                    )
                }
            }
        }
        return rows
    }

    fun splitNotesToLines(notes: String?, maxCharsPerLine: Int = 80): List<String> {
        if (notes.isNullOrBlank()) return emptyList()
        val result = mutableListOf<String>()
        val paragraphs = notes.lines()
        for (para in paragraphs) {
            if (para.length <= maxCharsPerLine) {
                result.add(para)
            } else {
                val words = para.split(" ")
                val currentLine = StringBuilder()
                for (word in words) {
                    if (currentLine.length + word.length + 1 > maxCharsPerLine) {
                        result.add(currentLine.toString())
                        currentLine.clear()
                    }
                    if (currentLine.isNotEmpty()) currentLine.append(" ")
                    currentLine.append(word)
                }
                if (currentLine.isNotEmpty()) {
                    result.add(currentLine.toString())
                }
            }
        }
        return result
    }

    fun scalePointsToPdf(points: List<StrokePoint>, scale: Float = 0.22f): List<StrokePoint> {
        return points.map { p ->
            p.copy(x = p.x * scale, y = p.y * scale)
        }
    }

    fun partitionStrokesByPage(strokes: List<InkStroke>, totalPages: Int): Map<Int, List<InkStroke>> {
        val map = mutableMapOf<Int, MutableList<InkStroke>>()
        for (p in 0 until maxOf(totalPages, 1)) {
            map[p] = mutableListOf()
        }
        for (s in strokes) {
            val page = s.pageIndex
            map.getOrPut(page) { mutableListOf() }.add(s)
        }
        return map
    }

    fun sanitizePdfFilename(patientIdentifier: String): String {
        val sanitized = patientIdentifier.replace(Regex("""[^a-zA-Z0-9_-]"""), "_")
        return "${sanitized}_bedside_rounds.pdf"
    }
}
