package com.medchecklist.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface InkStrokeDao {
    @Query("SELECT * FROM ink_strokes WHERE encounterId = :encounterId AND pageIndex = :pageIndex AND targetCanvas = :targetCanvas ORDER BY timestamp ASC")
    fun getStrokesForPage(encounterId: String, pageIndex: Int, targetCanvas: String = "general"): Flow<List<InkStroke>>

    @Query("SELECT * FROM ink_strokes WHERE encounterId = :encounterId ORDER BY timestamp ASC")
    fun getAllStrokesForEncounter(encounterId: String): Flow<List<InkStroke>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStroke(stroke: InkStroke)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStrokes(strokes: List<InkStroke>)

    @Query("DELETE FROM ink_strokes WHERE encounterId = :encounterId AND pageIndex = :pageIndex AND targetCanvas = :targetCanvas")
    suspend fun clearPageStrokes(encounterId: String, pageIndex: Int, targetCanvas: String = "general")

    @Query("DELETE FROM ink_strokes WHERE id IN (:strokeIds)")
    suspend fun deleteStrokesByIds(strokeIds: List<String>)

    @Query("DELETE FROM ink_strokes WHERE encounterId = :encounterId")
    suspend fun deleteAllStrokesForEncounter(encounterId: String)
}
