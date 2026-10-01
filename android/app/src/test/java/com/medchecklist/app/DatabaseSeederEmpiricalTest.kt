package com.medchecklist.app

import androidx.room.InvalidationTracker
import androidx.sqlite.db.SupportSQLiteOpenHelper
import com.medchecklist.app.data.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class DatabaseSeederEmpiricalTest {

    private class FakeFolderDao : FolderDao {
        val folders = mutableListOf<FolderEntity>()
        override fun getAllFolders(): Flow<List<FolderEntity>> = emptyFlow()
        override suspend fun insertFolder(folder: FolderEntity) {
            folders.removeAll { it.id == folder.id }
            folders.add(folder)
        }
        override suspend fun insertFolders(folders: List<FolderEntity>) {
            for (f in folders) insertFolder(f)
        }
        override suspend fun deleteFolder(folder: FolderEntity) {
            folders.removeAll { it.id == folder.id }
        }
    }

    private class FakeChecklistDao : ChecklistDao {
        val checklists = mutableListOf<ChecklistEntity>()
        override fun getAllChecklists(): Flow<List<ChecklistEntity>> = emptyFlow()
        override suspend fun getChecklistById(id: String): ChecklistEntity? = checklists.find { it.id == id }
        override suspend fun insertChecklist(checklist: ChecklistEntity) {
            checklists.removeAll { it.id == checklist.id }
            checklists.add(checklist)
        }
        override suspend fun insertChecklists(checklists: List<ChecklistEntity>) {
            for (c in checklists) insertChecklist(c)
        }
        override suspend fun updateChecklist(checklist: ChecklistEntity) {
            insertChecklist(checklist)
        }
        override suspend fun softDeleteChecklist(id: String) {
            val idx = checklists.indexOfFirst { it.id == id }
            if (idx >= 0) checklists[idx] = checklists[idx].copy(isDeleted = true)
        }
    }

    private class FakeTemplateDao : TemplateDao {
        val templates = mutableListOf<ClinicalTemplateEntity>()
        override fun getAllTemplates(): Flow<List<ClinicalTemplateEntity>> = emptyFlow()
        override suspend fun getTemplateById(id: String): ClinicalTemplateEntity? = templates.find { it.id == id }
        override suspend fun insertTemplate(template: ClinicalTemplateEntity) {
            templates.removeAll { it.id == template.id }
            templates.add(template)
        }
        override suspend fun insertTemplates(templates: List<ClinicalTemplateEntity>) {
            for (t in templates) insertTemplate(t)
        }
    }

    private class FakeEncounterDao : EncounterDao {
        val encounters = mutableListOf<PatientEncounter>()
        override fun getAllActiveEncounters(): Flow<List<PatientEncounter>> = emptyFlow()
        override fun getArchivedEncounters(): Flow<List<PatientEncounter>> = emptyFlow()
        override fun getEncounterById(id: String): Flow<PatientEncounter?> = emptyFlow()
        override suspend fun getEncounterDirect(id: String): PatientEncounter? = encounters.find { it.id == id }
        override suspend fun insertEncounter(encounter: PatientEncounter) {
            encounters.removeAll { it.id == encounter.id }
            encounters.add(encounter)
        }
        override suspend fun updateEncounter(encounter: PatientEncounter) {
            insertEncounter(encounter)
        }
        override suspend fun deleteEncounter(id: String, timestamp: Long) {
            softDeleteEncounter(id, timestamp)
        }
        override suspend fun softDeleteEncounter(id: String, timestamp: Long) {
            val idx = encounters.indexOfFirst { it.id == id }
            if (idx >= 0) encounters[idx] = encounters[idx].copy(isDeleted = true, updatedAt = timestamp)
        }
        override suspend fun hardDeleteEncounter(id: String) {
            encounters.removeAll { it.id == id }
        }
    }

    private class FakeInkStrokeDao : InkStrokeDao {
        val strokes = mutableListOf<InkStroke>()
        override fun getStrokesForPage(encounterId: String, pageIndex: Int, targetCanvas: String): Flow<List<InkStroke>> = emptyFlow()
        override fun getAllStrokesForEncounter(encounterId: String): Flow<List<InkStroke>> = emptyFlow()
        override suspend fun insertStroke(stroke: InkStroke) {
            strokes.removeAll { it.id == stroke.id }
            strokes.add(stroke)
        }
        override suspend fun insertStrokes(strokes: List<InkStroke>) {
            for (s in strokes) insertStroke(s)
        }
        override suspend fun deleteStrokes(encounterId: String, strokeIds: List<String>) {
            strokes.removeAll { it.encounterId == encounterId && it.id in strokeIds }
        }
        override suspend fun deletePageStrokes(encounterId: String, pageIndex: Int) {
            strokes.removeAll { it.encounterId == encounterId && it.pageIndex == pageIndex }
        }
        override suspend fun clearPageStrokes(encounterId: String, pageIndex: Int, targetCanvas: String) {
            strokes.removeAll { it.encounterId == encounterId && it.pageIndex == pageIndex && it.targetCanvas == targetCanvas }
        }
        override suspend fun deleteStrokesByIds(strokeIds: List<String>) {
            strokes.removeAll { it.id in strokeIds }
        }
        override suspend fun deleteAllStrokesForEncounter(encounterId: String) {
            strokes.removeAll { it.encounterId == encounterId }
        }
    }

    private class FakeAppDatabase(
        private val fakeFolderDao: FakeFolderDao,
        private val fakeChecklistDao: FakeChecklistDao,
        private val fakeTemplateDao: FakeTemplateDao,
        private val fakeEncounterDao: FakeEncounterDao,
        private val fakeInkStrokeDao: FakeInkStrokeDao
    ) : AppDatabase() {
        override fun encounterDao(): EncounterDao = fakeEncounterDao
        override fun inkStrokeDao(): InkStrokeDao = fakeInkStrokeDao
        override fun checklistDao(): ChecklistDao = fakeChecklistDao
        override fun folderDao(): FolderDao = fakeFolderDao
        override fun templateDao(): TemplateDao = fakeTemplateDao

        override fun createInvalidationTracker(): InvalidationTracker {
            return InvalidationTracker(this, emptyMap(), emptyMap(), "folders", "checklists", "clinical_templates", "encounters", "ink_strokes")
        }

        override fun createOpenHelper(config: androidx.room.DatabaseConfiguration): SupportSQLiteOpenHelper {
            throw UnsupportedOperationException("Not needed for fake unit test")
        }

        override fun clearAllTables() {
            fakeFolderDao.folders.clear()
            fakeChecklistDao.checklists.clear()
            fakeTemplateDao.templates.clear()
            fakeEncounterDao.encounters.clear()
            fakeInkStrokeDao.strokes.clear()
        }
    }

    @Test
    fun test_database_seeder_executes_without_pk_collisions() = runBlocking {
        val fakeFolderDao = FakeFolderDao()
        val fakeChecklistDao = FakeChecklistDao()
        val fakeTemplateDao = FakeTemplateDao()
        val fakeEncounterDao = FakeEncounterDao()
        val fakeInkStrokeDao = FakeInkStrokeDao()

        val fakeDb = FakeAppDatabase(
            fakeFolderDao,
            fakeChecklistDao,
            fakeTemplateDao,
            fakeEncounterDao,
            fakeInkStrokeDao
        )

        // Track raw inserted IDs to detect any duplicate inserts before deduplication
        val rawFolderIds = mutableListOf<String>()
        val rawChecklistIds = mutableListOf<String>()
        val rawTemplateIds = mutableListOf<String>()
        val rawEncounterIds = mutableListOf<String>()

        val spyFolderDao = object : FolderDao by fakeFolderDao {
            override suspend fun insertFolders(folders: List<FolderEntity>) {
                rawFolderIds.addAll(folders.map { it.id })
                fakeFolderDao.insertFolders(folders)
            }
        }
        val spyChecklistDao = object : ChecklistDao by fakeChecklistDao {
            override suspend fun insertChecklists(checklists: List<ChecklistEntity>) {
                rawChecklistIds.addAll(checklists.map { it.id })
                fakeChecklistDao.insertChecklists(checklists)
            }
        }
        val spyTemplateDao = object : TemplateDao by fakeTemplateDao {
            override suspend fun insertTemplates(templates: List<ClinicalTemplateEntity>) {
                rawTemplateIds.addAll(templates.map { it.id })
                fakeTemplateDao.insertTemplates(templates)
            }
        }
        val spyEncounterDao = object : EncounterDao by fakeEncounterDao {
            override suspend fun insertEncounter(encounter: PatientEncounter) {
                rawEncounterIds.add(encounter.id)
                fakeEncounterDao.insertEncounter(encounter)
            }
        }

        val spyDb = object : AppDatabase() {
            override fun folderDao(): FolderDao = spyFolderDao
            override fun checklistDao(): ChecklistDao = spyChecklistDao
            override fun templateDao(): TemplateDao = spyTemplateDao
            override fun encounterDao(): EncounterDao = spyEncounterDao
            override fun inkStrokeDao(): InkStrokeDao = fakeInkStrokeDao

            override fun createInvalidationTracker(): InvalidationTracker {
                return InvalidationTracker(this, emptyMap(), emptyMap(), "folders")
            }
            override fun createOpenHelper(config: androidx.room.DatabaseConfiguration): SupportSQLiteOpenHelper {
                throw UnsupportedOperationException()
            }
            override fun clearAllTables() {}
        }

        // 1. Run seedDatabase
        DatabaseSeeder.seedDatabase(spyDb)

        // 2. Verify Folder Primary Keys
        assertEquals("Expected 5 folders", 5, rawFolderIds.size)
        assertEquals("Folder IDs must be completely unique (no PK collisions)", 5, rawFolderIds.toSet().size)
        assertTrue(rawFolderIds.containsAll(listOf("f-cardio", "f-icu", "f-labs", "f-ward", "f-surgery")))

        // 3. Verify Checklist Primary Keys
        assertEquals("Expected 8 checklists", 8, rawChecklistIds.size)
        assertEquals("Checklist IDs must be completely unique (no PK collisions)", 8, rawChecklistIds.toSet().size)
        assertTrue(rawChecklistIds.containsAll(listOf(
            "chk-ros-general", "chk-ros-cardio-resp", "chk-cbc-panel", "chk-bmp-panel",
            "chk-cardiac-biomarkers", "chk-acs-triage", "chk-sepsis-bundle", "chk-preop-status"
        )))

        // 4. Verify Template Primary Keys
        assertEquals("Expected 4 templates", 4, rawTemplateIds.size)
        assertEquals("Template IDs must be completely unique (no PK collisions)", 4, rawTemplateIds.toSet().size)
        assertTrue(rawTemplateIds.containsAll(listOf(
            "tpl-acs-bundle", "tpl-sepsis-bundle", "tpl-ward-admission", "tpl-preop-surgical"
        )))

        // 5. Verify Encounter Primary Keys
        assertEquals("Expected 3 encounters", 3, rawEncounterIds.size)
        assertEquals("Encounter IDs must be completely unique (no PK collisions)", 3, rawEncounterIds.toSet().size)
        assertTrue(rawEncounterIds.containsAll(listOf("enc-sample-1", "enc-sample-2", "enc-sample-archived")))

        // 6. Verify Section and Item IDs within Checklists are also unique
        val allSections = fakeChecklistDao.checklists.flatMap { it.sections }
        val sectionIds = allSections.map { it.id }
        assertEquals("All section IDs across all checklists must be unique", sectionIds.size, sectionIds.toSet().size)

        val allItems = allSections.flatMap { it.items }
        val itemIds = allItems.map { it.id }
        assertEquals("All item IDs across all checklists must be unique", itemIds.size, itemIds.toSet().size)

        // 7. Verify Referential Integrity: Template defaultChecklistIds point to existing checklists
        val seededChecklistIdSet = fakeChecklistDao.checklists.map { it.id }.toSet()
        for (template in fakeTemplateDao.templates) {
            for (referencedChkId in template.defaultChecklistIds) {
                assertTrue(
                    "Template ${template.id} references non-existent checklist $referencedChkId",
                    seededChecklistIdSet.contains(referencedChkId)
                )
            }
        }

        // 8. Verify Referential Integrity: Encounter templateId points to existing template
        val seededTemplateIdSet = fakeTemplateDao.templates.map { it.id }.toSet()
        for (encounter in fakeEncounterDao.encounters) {
            if (encounter.templateId != null) {
                assertTrue(
                    "Encounter ${encounter.id} references non-existent template ${encounter.templateId}",
                    seededTemplateIdSet.contains(encounter.templateId)
                )
            }
            // Also verify encounter checklist instances point to existing templates
            for (chkInstance in encounter.checklists) {
                assertTrue(
                    "Encounter checklist instance ${chkInstance.id} references non-existent checklist template ${chkInstance.templateId}",
                    seededChecklistIdSet.contains(chkInstance.templateId)
                )
            }
        }

        // 9. Verify Idempotence: Running seedDatabase a second time causes zero crashes / errors
        // because all DAOs use OnConflictStrategy.REPLACE
        DatabaseSeeder.seedDatabase(fakeDb)
        assertEquals("Folder count after reseeding must remain 5", 5, fakeFolderDao.folders.size)
        assertEquals("Checklist count after reseeding must remain 8", 8, fakeChecklistDao.checklists.size)
        assertEquals("Template count after reseeding must remain 4", 4, fakeTemplateDao.templates.size)
        assertEquals("Encounter count after reseeding must remain 3", 3, fakeEncounterDao.encounters.size)
    }
}
