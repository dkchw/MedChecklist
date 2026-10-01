package com.medchecklist.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ChecklistDao {
    @Query("SELECT * FROM checklists WHERE isDeleted = 0 ORDER BY isPinned DESC, title ASC")
    fun getAllChecklists(): Flow<List<ChecklistEntity>>

    @Query("SELECT * FROM checklists WHERE id = :id LIMIT 1")
    suspend fun getChecklistById(id: String): ChecklistEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChecklist(checklist: ChecklistEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChecklists(checklists: List<ChecklistEntity>)

    @Update
    suspend fun updateChecklist(checklist: ChecklistEntity)

    @Query("UPDATE checklists SET isDeleted = 1 WHERE id = :id")
    suspend fun softDeleteChecklist(id: String)
}
