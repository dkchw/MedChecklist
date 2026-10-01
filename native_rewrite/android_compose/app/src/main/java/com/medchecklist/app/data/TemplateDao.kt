package com.medchecklist.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface TemplateDao {
    @Query("SELECT * FROM clinical_templates ORDER BY isPinned DESC, title ASC")
    fun getAllTemplates(): Flow<List<ClinicalTemplateEntity>>

    @Query("SELECT * FROM clinical_templates WHERE id = :id LIMIT 1")
    suspend fun getTemplateById(id: String): ClinicalTemplateEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTemplate(template: ClinicalTemplateEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTemplates(templates: List<ClinicalTemplateEntity>)
}
