package com.medchecklist.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface EncounterDao {
    @Query("SELECT * FROM encounters WHERE isDeleted = 0 ORDER BY lastUpdated DESC")
    fun getAllActiveEncounters(): Flow<List<PatientEncounter>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEncounter(encounter: PatientEncounter)

    @Update
    suspend fun updateEncounter(encounter: PatientEncounter)
}

@Dao
interface InkStrokeDao {
    @Query("SELECT * FROM ink_strokes WHERE encounterId = :encounterId AND pageIndex = :pageIndex")
    fun getStrokesForPage(encounterId: String, pageIndex: Int): Flow<List<InkStroke>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStroke(stroke: InkStroke)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStrokes(strokes: List<InkStroke>)

    @Query("DELETE FROM ink_strokes WHERE encounterId = :encounterId AND id IN (:strokeIds)")
    suspend fun deleteStrokes(encounterId: String, strokeIds: List<String>)
}
