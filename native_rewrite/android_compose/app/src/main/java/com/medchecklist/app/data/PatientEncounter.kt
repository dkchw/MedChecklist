package com.medchecklist.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "encounters")
data class PatientEncounter(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val patientIdentifier: String,
    val bedNumber: String? = null,
    val group: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val lastUpdated: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false,
    val status: String = "active" // active, discharged, transferred
)
