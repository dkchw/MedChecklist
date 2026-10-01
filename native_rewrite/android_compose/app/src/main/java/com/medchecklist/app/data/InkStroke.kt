package com.medchecklist.app.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey
import androidx.room.Index
import java.util.UUID

@Entity(
    tableName = "ink_strokes",
    foreignKeys = [
        ForeignKey(
            entity = PatientEncounter::class,
            parentColumns = ["id"],
            childColumns = ["encounterId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("encounterId")]
)
data class InkStroke(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val encounterId: String,
    val tool: String, // "pen", "highlighter", "eraser"
    val color: String,
    val size: Float,
    val pageIndex: Int,
    val opacity: Float = 1.0f,
    // Store JSON serialized points to avoid excessive joining for millions of points
    val pointsJson: String 
)
