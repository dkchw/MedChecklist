package com.medchecklist.app.domain

import com.medchecklist.app.data.*
import java.util.UUID

data class ParsedMarkdownResult(
    val title: String,
    val description: String,
    val institution: String? = null,
    val tags: List<String> = emptyList(),
    val links: List<MedicalLink> = emptyList(),
    val sections: List<ChecklistSection> = emptyList(),
    val generalNotes: String? = null
)

object MarkdownEngine {

    fun templateToMarkdown(template: ClinicalTemplateEntity, checklists: List<ChecklistEntity>): String {
        val lines = mutableListOf<String>()
        lines.add("# ${template.title}")
        if (template.description.isNotEmpty()) {
            lines.add("> ${template.description}")
        }
        if (template.tags.isNotEmpty()) {
            lines.add("> Tags: ${template.tags.joinToString(" ") { if (it.startsWith("#")) it else "#$it" }}")
        }
        lines.add("")

        for (checklist in checklists) {
            lines.add("---")
            lines.add("### Checklist: ${checklist.title}${checklist.institution?.let { " ($it)" } ?: ""}")
            lines.add("")
            for (section in checklist.sections) {
                lines.add("## ${section.title}")
                if (!section.description.isNullOrEmpty()) {
                    lines.add("_${section.description}_")
                    lines.add("")
                }
                for (item in section.items) {
                    var line = if (item.checked) "- [x] " else "- [ ] "
                    line += item.text
                    if (!item.labValue.isNullOrEmpty()) {
                        line += ": ${item.labValue}"
                    }
                    if (!item.referenceValue.isNullOrEmpty()) {
                        line += " [Normal: ${item.referenceValue}]"
                    }
                    if (item.starred) {
                        line += " *starred*"
                    }
                    lines.add(line)
                    if (!item.note.isNullOrEmpty()) {
                        lines.add("  > Note: ${item.note}")
                    }
                    for (l in item.links) {
                        lines.add("  > Link: [${l.title}](${l.url})")
                    }
                    for (img in item.images) {
                        lines.add("  > ![${img.caption ?: "Attached Image"}](${img.url})")
                    }
                }
                lines.add("")
            }
        }
        return lines.joinToString("\n")
    }

    fun encounterToMarkdown(encounter: PatientEncounter): String {
        val lines = mutableListOf<String>()
        lines.add("# Encounter: ${encounter.patientIdentifier}")

        val metaParts = mutableListOf<String>()
        encounter.age?.let { metaParts.add("Age: $it") }
        encounter.sex?.let { metaParts.add("Sex: $it") }
        encounter.bedNumber?.let { metaParts.add("Bed/Room: $it") }
        metaParts.add("Status: ${encounter.status}")
        if (metaParts.isNotEmpty()) {
            lines.add("> ${metaParts.joinToString(" | ")}")
        }

        if (encounter.chiefComplaint.isNotEmpty()) {
            lines.add("> Chief Complaint: ${encounter.chiefComplaint}")
        }
        if (encounter.tags.isNotEmpty()) {
            lines.add("> Tags: ${encounter.tags.joinToString(" ") { if (it.startsWith("#")) it else "#$it" }}")
        }
        if (encounter.links.isNotEmpty()) {
            lines.add("> Clinical References: ${encounter.links.joinToString(" | ") { "[${it.title}](${it.url})" }}")
        }
        lines.add("")

        for (chk in encounter.checklists) {
            lines.add("---")
            lines.add("### Checklist: ${chk.title}${chk.institution?.let { " ($it)" } ?: ""}")
            lines.add("")
            for (section in chk.sections) {
                lines.add("#### ${section.title}")
                for (item in section.items) {
                    var line = if (item.checked) "- [x] " else "- [ ] "
                    line += item.text
                    if (!item.labValue.isNullOrEmpty()) {
                        line += ": ${item.labValue}"
                    }
                    if (!item.referenceValue.isNullOrEmpty()) {
                        line += " [Normal: ${item.referenceValue}]"
                    }
                    if (item.starred) {
                        line += " *starred*"
                    }
                    lines.add(line)
                    if (!item.note.isNullOrEmpty()) {
                        lines.add("  > Note: ${item.note}")
                    }
                    for (l in item.links) {
                        lines.add("  > Link: [${l.title}](${l.url})")
                    }
                    for (img in item.images) {
                        lines.add("  > ![${img.caption ?: "Attached Image"}](${img.url})")
                    }
                }
                lines.add("")
            }
        }

        if (encounter.images.isNotEmpty()) {
            lines.add("---")
            lines.add("### Attached Clinical Images")
            for (img in encounter.images) {
                lines.add("![${img.caption ?: "Clinical Snapshot"}](${img.url})")
            }
            lines.add("")
        }

        val notes = encounter.generalNotes
        if (!notes.isNullOrEmpty()) {
            lines.add("---")
            lines.add("### Bedside & Handwritten Notes (Editable MD)")
            lines.add(notes)
            lines.add("")
        }

        return lines.joinToString("\n")
    }

    fun parseMarkdownToChecklist(md: String): ParsedMarkdownResult {
        val lines = md.lines()
        var title = "Imported Checklist"
        var description = ""
        var institution: String? = null
        val tags = mutableListOf<String>()
        val links = mutableListOf<MedicalLink>()
        val sections = mutableListOf<ChecklistSection>()
        var currentSection: ChecklistSection? = null
        var currentItem: ChecklistItem? = null
        var inNotesSection = false
        val notesLines = mutableListOf<String>()

        val taskRegex = Regex("""^[-*]\s*\[([ xX])\]\s*(.+)$""")
        val bulletRegex = Regex("""^[-*]\s+(?!\[[ xX]\])(.+)$""")
        val refRegex = Regex("""\[(?:Normal|Ref):\s*([^\]]+)\]""", RegexOption.IGNORE_CASE)
        val linkRegex = Regex("""\[([^\]]+)\]\(([^)]+)\)""")
        val imgRegex = Regex("""!\[([^\]]*)\]\(([^)]+)\)""")

        for (rawLine in lines) {
            val line = rawLine.trim()
            if (line.isEmpty()) continue

            if (line.startsWith("# ") && !inNotesSection) {
                title = line.substring(2).trim()
                continue
            }

            if (line.startsWith("> ") && currentSection == null && !inNotesSection) {
                val meta = line.substring(2).trim()
                val lowerMeta = meta.lowercase()
                if (lowerMeta.startsWith("tags:")) {
                    val tagTokens = Regex("""#[\w-]+""").findAll(meta.substring(5)).map { it.value }.toList()
                    tags.addAll(tagTokens)
                } else if (lowerMeta.startsWith("institution:")) {
                    institution = meta.substring(12).trim()
                } else if (lowerMeta.contains("links:") || lowerMeta.contains("references:")) {
                    for (match in linkRegex.findAll(meta)) {
                        links.add(MedicalLink(title = match.groupValues[1], url = match.groupValues[2]))
                    }
                } else if (description.isEmpty()) {
                    description = meta
                }
                continue
            }

            if (line.lowercase().contains("bedside & handwritten notes") || line.lowercase().contains("clinical notes")) {
                inNotesSection = true
                continue
            }

            if (inNotesSection) {
                notesLines.add(rawLine)
                continue
            }

            if (line.startsWith("## ") || line.startsWith("### ") || line.startsWith("#### ")) {
                val sectionTitle = line.replace(Regex("""^#+\s*"""), "").trim()
                currentSection = ChecklistSection(id = "sec-${UUID.randomUUID()}", title = sectionTitle, items = emptyList())
                sections.add(currentSection)
                currentItem = null
                continue
            }

            val taskMatch = taskRegex.find(line)
            if (taskMatch != null) {
                if (currentSection == null) {
                    currentSection = ChecklistSection(id = "sec-gen-${UUID.randomUUID()}", title = "General", items = emptyList())
                    sections.add(currentSection)
                }
                val isChecked = taskMatch.groupValues[1].lowercase() == "x"
                var content = taskMatch.groupValues[2].trim()

                val isStarred = content.contains("*starred*") || content.contains("⭐") || content.contains("[!]")
                content = content.replace("*starred*", "").replace("⭐", "").replace("[!]", "").trim()

                var referenceValue: String? = null
                val refMatch = refRegex.find(content)
                if (refMatch != null) {
                    referenceValue = refMatch.groupValues[1].trim()
                    content = content.replace(refMatch.value, "").trim()
                }

                var text = content
                var labValue: String? = null
                if (content.contains(":") && referenceValue != null) {
                    val parts = content.split(":")
                    text = parts[0].trim()
                    labValue = parts.drop(1).joinToString(":").trim()
                }

                currentItem = ChecklistItem(
                    id = "item-${UUID.randomUUID()}",
                    text = text,
                    checked = isChecked,
                    starred = isStarred,
                    referenceValue = referenceValue,
                    labValue = labValue
                )
                val updatedItems = currentSection.items.toMutableList().apply { add(currentItem!!) }
                val idx = sections.indexOf(currentSection)
                currentSection = currentSection.copy(items = updatedItems)
                sections[idx] = currentSection
                continue
            }

            val bulletMatch = bulletRegex.find(line)
            if (bulletMatch != null && !line.startsWith(">")) {
                if (currentSection == null) {
                    currentSection = ChecklistSection(id = "sec-gen-${UUID.randomUUID()}", title = "General", items = emptyList())
                    sections.add(currentSection)
                }
                currentItem = ChecklistItem(
                    id = "item-${UUID.randomUUID()}",
                    text = bulletMatch.groupValues[1].trim(),
                    checked = false
                )
                val updatedItems = currentSection.items.toMutableList().apply { add(currentItem!!) }
                val idx = sections.indexOf(currentSection)
                currentSection = currentSection.copy(items = updatedItems)
                sections[idx] = currentSection
                continue
            }

            if ((line.startsWith(">") || rawLine.startsWith("  >")) && currentItem != null) {
                val imgMatch = imgRegex.find(line)
                if (imgMatch != null) {
                    val newImg = MedicalImage(caption = imgMatch.groupValues[1].ifEmpty { "Attached Image" }, url = imgMatch.groupValues[2])
                    val updatedImages = currentItem.images + newImg
                    currentItem = currentItem.copy(images = updatedImages)
                    val sIdx = sections.indexOf(currentSection)
                    val itmIdx = currentSection!!.items.indexOfFirst { it.id == currentItem!!.id }
                    if (itmIdx >= 0) {
                        val items = currentSection.items.toMutableList().apply { set(itmIdx, currentItem!!) }
                        currentSection = currentSection.copy(items = items)
                        sections[sIdx] = currentSection
                    }
                    continue
                }

                val linkMatch = linkRegex.find(line)
                if (linkMatch != null && line.lowercase().contains("link:")) {
                    val newLink = MedicalLink(title = linkMatch.groupValues[1], url = linkMatch.groupValues[2])
                    val updatedLinks = currentItem.links + newLink
                    currentItem = currentItem.copy(links = updatedLinks)
                    val sIdx = sections.indexOf(currentSection)
                    val itmIdx = currentSection!!.items.indexOfFirst { it.id == currentItem!!.id }
                    if (itmIdx >= 0) {
                        val items = currentSection.items.toMutableList().apply { set(itmIdx, currentItem!!) }
                        currentSection = currentSection.copy(items = items)
                        sections[sIdx] = currentSection
                    }
                    continue
                }

                val noteText = line.replace(Regex("""^>+\s*(?:Note:\s*)?""", RegexOption.IGNORE_CASE), "").trim()
                val updatedNote = if (currentItem.note.isNullOrEmpty()) noteText else "${currentItem.note}\n$noteText"
                currentItem = currentItem.copy(note = updatedNote)
                val sIdx = sections.indexOf(currentSection)
                val itmIdx = currentSection!!.items.indexOfFirst { it.id == currentItem!!.id }
                if (itmIdx >= 0) {
                    val items = currentSection.items.toMutableList().apply { set(itmIdx, currentItem!!) }
                    currentSection = currentSection.copy(items = items)
                    sections[sIdx] = currentSection
                }
                continue
            }
        }

        if (sections.isEmpty()) {
            sections.add(ChecklistSection(id = "sec-default", title = "Imported Items", items = emptyList()))
        }

        return ParsedMarkdownResult(
            title = title,
            description = description,
            institution = institution,
            tags = tags,
            links = links,
            sections = sections,
            generalNotes = if (notesLines.isNotEmpty()) notesLines.joinToString("\n").trim() else null
        )
    }

    fun buildLlmPrompt(currentMarkdown: String, mode: String, customInstruction: String? = null): String {
        val formatInstructions = """
=== MEDCHECKLIST FORMATTING INSTRUCTIONS (REQUIRED) ===
You must format your checklist response in standard MedChecklist Markdown so the software can directly recognize, parse, and import it:

1. Use standard Markdown task list syntax:
   - `- [ ] Item text` for unchecked/pending/negative items
   - `- [x] Item text` for checked/positive/completed findings
2. For starred/critical items, add `*starred*` at the end of the line:
   - `- [x] Severe crushing chest pain *starred*`
3. For notes or clinical commentary on an item, indent a blockquote immediately under the item:
   - `- [x] Retrosternal pain`
     `  > Note: Radiates to left jaw, lasted 45 minutes`
4. For labs with reference values, use `[Normal: <range>]` and optional recorded value:
   - `- [x] High-Sensitivity Troponin: 154 ng/L [Normal: < 14 ng/L] *starred*`
5. For clinical reference links (UpToDate, PubMed, Guidelines):
   - `  > Link: [UpToDate: Acute Coronary Syndrome](https://www.uptodate.com/...)`
6. Group items under Markdown headers (`## Section Name`).
7. Place patient metadata at the top:
   `> Patient: [ID] | Age: [Age] | Sex: [M/F] | Complaint: [Complaint]`
   `> Tags: #cardiology #urgent`
8. Place any free-text clinical discussion, differential diagnoses, or bedside synthesis under:
   `### Bedside & Handwritten Notes (Editable MD)`
=== END FORMATTING INSTRUCTIONS ===
""".trimIndent()

        val taskInstruction = when (mode) {
            "differential" -> """
### CLINICAL TASK:
Review the following patient checklist and findings.
1. Identify high-priority and positive findings (`- [x]`).
2. Provide a prioritized differential diagnosis list under `### Bedside & Handwritten Notes (Editable MD)`.
3. Add any crucial diagnostic workups, missing red-flag symptoms, or lab tests as uncompleted items (`- [ ]`) in appropriate sections.
4. Include evidence-based reference links to UpToDate or PubMed where relevant.
""".trimIndent()
            "soap" -> """
### CLINICAL TASK:
Synthesize the following checklist items into a structured clinical SOAP note (Subjective, Objective, Assessment, Plan).
Keep items structured in MedChecklist markdown with `- [x]` and `- [ ]`, and place the narrative Assessment and Plan in the `### Bedside & Handwritten Notes (Editable MD)` section.
""".trimIndent()
            "checklist_expansion" -> """
### CLINICAL TASK:
Expand the provided checklist into a comprehensive, evidence-based clinical protocol/checklist. Add necessary screening questions, laboratory tests with reference values, procedural steps, and clinical reference links.
""".trimIndent()
            else -> """
### CLINICAL TASK:
${customInstruction ?: "Analyze the provided clinical checklist and update it with relevant findings, suggested additions, and clinical notes."}
""".trimIndent()
        }

        return """
$formatInstructions

$taskInstruction

### CURRENT DATA (MARKDOWN):
```markdown
$currentMarkdown
```
""".trimIndent()
    }
}
