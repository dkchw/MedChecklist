package com.medchecklist.app.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

data class StrokePoint(
    val x: Float,
    val y: Float,
    val pressure: Float = 0.5f
)

enum class PenTool {
    PEN, HIGHLIGHTER, ERASER, SELECTOR;

    companion object {
        fun fromString(str: String): PenTool {
            return when (str.lowercase()) {
                "highlighter" -> HIGHLIGHTER
                "eraser" -> ERASER
                "selector" -> SELECTOR
                else -> PEN
            }
        }
    }
}

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
    indices = [Index("encounterId"), Index("pageIndex")]
)
data class InkStroke(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    val encounterId: String,
    val tool: String = "pen", // "pen", "highlighter", "eraser", "selector"
    val color: String = "#0f172a",
    val size: Float = 4f,
    val opacity: Float = 1.0f,
    val pageIndex: Int = 0,
    val targetCanvas: String = "general", // "general" vs "bedside_note"
    val targetItemId: String? = null,
    val points: List<StrokePoint> = emptyList(),
    val timestamp: Long = System.currentTimeMillis()
) {
    val pointsJson: String
        get() = Converters().fromStrokePoints(points)
}
