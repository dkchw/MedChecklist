package com.medchecklist.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "encounters")
data class PatientEncounter(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val patientIdentifier: String,
    val facility: String? = null,
    val group: String? = null,
    val folderId: String? = null,
    val age: String? = null,
    val sex: String? = null, // "M", "F", "Other"
    val bedNumber: String? = null,
    val chiefComplaint: String = "",
    val status: String = "active", // "active" or "archived"
    val archivedAt: Long? = null,
    val pagesCount: Int = 1,
    val templateId: String? = null,
    val templateTitle: String? = null,
    val checklists: List<EncounterChecklistInstance> = emptyList(),
    val generalNotes: String? = null,
    val images: List<MedicalImage> = emptyList(),
    val links: List<MedicalLink> = emptyList(),
    val tags: List<String> = emptyList(),
    val isPinned: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false
) {
    val lastUpdated: Long
        get() = updatedAt

    val checklistsJson: String
        get() = Converters().fromChecklists(checklists)

    val imagesJson: String
        get() = Converters().fromImages(images)

    val linksJson: String
        get() = Converters().fromLinks(links)

    val tagsJson: String
        get() = Converters().fromStringList(tags)
}
