package com.medchecklist.app.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        PatientEncounter::class,
        InkStroke::class,
        ChecklistEntity::class,
        FolderEntity::class,
        ClinicalTemplateEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun encounterDao(): EncounterDao
    abstract fun inkStrokeDao(): InkStrokeDao
    abstract fun checklistDao(): ChecklistDao
    abstract fun folderDao(): FolderDao
    abstract fun templateDao(): TemplateDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context, scope: CoroutineScope = CoroutineScope(Dispatchers.IO)): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "medchecklist_native_db"
                )
                .addCallback(DatabaseCallback(scope, context))
                .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(
            private val scope: CoroutineScope,
            private val context: Context
        ) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                scope.launch(Dispatchers.IO) {
                    val database = INSTANCE ?: getDatabase(context, scope)
                    DatabaseSeeder.seedDatabase(database)
                }
            }
        }
    }
}
