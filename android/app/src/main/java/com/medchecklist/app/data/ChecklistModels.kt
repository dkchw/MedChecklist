package com.medchecklist.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

data class MedicalLink(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val url: String,
    val category: String? = "general"
)

data class MedicalImage(
    val id: String = UUID.randomUUID().toString(),
    val url: String,
    val caption: String? = null,
    val tags: List<String> = emptyList(),
    val category: String? = "other",
    val patientId: String? = null,
    val patientIdentifier: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

data class ChecklistItem(
    val id: String = UUID.randomUUID().toString(),
    val text: String,
    val checked: Boolean = false,
    val starred: Boolean = false,
    val note: String? = null,
    val category: String? = null,
    val referenceValue: String? = null,
    val labValue: String? = null,
    val unit: String? = null,
    val order: Int = 0,
    val images: List<MedicalImage> = emptyList(),
    val links: List<MedicalLink> = emptyList()
)

data class ChecklistSection(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String? = null,
    val items: List<ChecklistItem> = emptyList()
)

data class EncounterChecklistInstance(
    val id: String = UUID.randomUUID().toString(),
    val templateId: String,
    val title: String,
    val institution: String? = null,
    val sections: List<ChecklistSection> = emptyList(),
    val completedAt: Long? = null
)

@Entity(tableName = "checklists")
data class ChecklistEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String = "",
    val category: String = "General",
    val institution: String? = null,
    val tags: List<String> = emptyList(),
    val sections: List<ChecklistSection> = emptyList(),
    val isPinned: Boolean = false,
    val isCustom: Boolean = true,
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false
)

@Entity(tableName = "folders")
data class FolderEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val name: String,
    val description: String? = null,
    val icon: String? = null,
    val color: String? = null,
    val parentId: String? = null,
    val order: Int = 0,
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "clinical_templates")
data class ClinicalTemplateEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String,
    val category: String,
    val defaultChecklistIds: List<String> = emptyList(),
    val defaultNotes: String? = null,
    val tags: List<String> = emptyList(),
    val isPinned: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
) {
    val checklistIds: List<String>
        get() = defaultChecklistIds

    val protocolNotes: String?
        get() = defaultNotes
}
