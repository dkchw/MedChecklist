package com.medchecklist.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface EncounterDao {
    @Query("SELECT * FROM encounters WHERE isDeleted = 0 AND status = 'active' ORDER BY isPinned DESC, updatedAt DESC")
    fun getAllActiveEncounters(): Flow<List<PatientEncounter>>

    @Query("SELECT * FROM encounters WHERE isDeleted = 0 AND status = 'archived' ORDER BY updatedAt DESC")
    fun getArchivedEncounters(): Flow<List<PatientEncounter>>

    @Query("SELECT * FROM encounters WHERE id = :id LIMIT 1")
    fun getEncounterById(id: String): Flow<PatientEncounter?>

    @Query("SELECT * FROM encounters WHERE id = :id LIMIT 1")
    suspend fun getEncounterDirect(id: String): PatientEncounter?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEncounter(encounter: PatientEncounter)

    @Update
    suspend fun updateEncounter(encounter: PatientEncounter)

    @Query("UPDATE encounters SET isDeleted = 1, updatedAt = :timestamp WHERE id = :id")
    suspend fun deleteEncounter(id: String, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE encounters SET isDeleted = 1, updatedAt = :timestamp WHERE id = :id")
    suspend fun softDeleteEncounter(id: String, timestamp: Long = System.currentTimeMillis())

    @Query("DELETE FROM encounters WHERE id = :id")
    suspend fun hardDeleteEncounter(id: String)
}
