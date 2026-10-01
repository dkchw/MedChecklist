package com.medchecklist.app.data;

import androidx.annotation.NonNull;
import androidx.room.DatabaseConfiguration;
import androidx.room.InvalidationTracker;
import androidx.room.RoomDatabase;
import androidx.room.RoomOpenHelper;
import androidx.room.migration.AutoMigrationSpec;
import androidx.room.migration.Migration;
import androidx.room.util.DBUtil;
import androidx.room.util.TableInfo;
import androidx.sqlite.db.SupportSQLiteDatabase;
import androidx.sqlite.db.SupportSQLiteOpenHelper;
import java.lang.Class;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.processing.Generated;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class AppDatabase_Impl extends AppDatabase {
  private volatile EncounterDao _encounterDao;

  private volatile InkStrokeDao _inkStrokeDao;

  private volatile ChecklistDao _checklistDao;

  private volatile FolderDao _folderDao;

  private volatile TemplateDao _templateDao;

  @Override
  @NonNull
  protected SupportSQLiteOpenHelper createOpenHelper(@NonNull final DatabaseConfiguration config) {
    final SupportSQLiteOpenHelper.Callback _openCallback = new RoomOpenHelper(config, new RoomOpenHelper.Delegate(1) {
      @Override
      public void createAllTables(@NonNull final SupportSQLiteDatabase db) {
        db.execSQL("CREATE TABLE IF NOT EXISTS `encounters` (`id` TEXT NOT NULL, `patientIdentifier` TEXT NOT NULL, `facility` TEXT, `group` TEXT, `folderId` TEXT, `age` TEXT, `sex` TEXT, `bedNumber` TEXT, `chiefComplaint` TEXT NOT NULL, `status` TEXT NOT NULL, `archivedAt` INTEGER, `pagesCount` INTEGER NOT NULL, `templateId` TEXT, `templateTitle` TEXT, `checklists` TEXT NOT NULL, `generalNotes` TEXT, `images` TEXT NOT NULL, `links` TEXT NOT NULL, `tags` TEXT NOT NULL, `isPinned` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL, `updatedAt` INTEGER NOT NULL, `isDeleted` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `ink_strokes` (`id` TEXT NOT NULL, `encounterId` TEXT NOT NULL, `tool` TEXT NOT NULL, `color` TEXT NOT NULL, `size` REAL NOT NULL, `opacity` REAL NOT NULL, `pageIndex` INTEGER NOT NULL, `targetCanvas` TEXT NOT NULL, `targetItemId` TEXT, `points` TEXT NOT NULL, `timestamp` INTEGER NOT NULL, PRIMARY KEY(`id`), FOREIGN KEY(`encounterId`) REFERENCES `encounters`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE )");
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_ink_strokes_encounterId` ON `ink_strokes` (`encounterId`)");
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_ink_strokes_pageIndex` ON `ink_strokes` (`pageIndex`)");
        db.execSQL("CREATE TABLE IF NOT EXISTS `checklists` (`id` TEXT NOT NULL, `title` TEXT NOT NULL, `description` TEXT NOT NULL, `category` TEXT NOT NULL, `institution` TEXT, `tags` TEXT NOT NULL, `sections` TEXT NOT NULL, `isPinned` INTEGER NOT NULL, `isCustom` INTEGER NOT NULL, `updatedAt` INTEGER NOT NULL, `isDeleted` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `folders` (`id` TEXT NOT NULL, `name` TEXT NOT NULL, `description` TEXT, `icon` TEXT, `color` TEXT, `parentId` TEXT, `order` INTEGER NOT NULL, `updatedAt` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS `clinical_templates` (`id` TEXT NOT NULL, `title` TEXT NOT NULL, `description` TEXT NOT NULL, `category` TEXT NOT NULL, `defaultChecklistIds` TEXT NOT NULL, `defaultNotes` TEXT, `tags` TEXT NOT NULL, `isPinned` INTEGER NOT NULL, `updatedAt` INTEGER NOT NULL, PRIMARY KEY(`id`))");
        db.execSQL("CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY,identity_hash TEXT)");
        db.execSQL("INSERT OR REPLACE INTO room_master_table (id,identity_hash) VALUES(42, '98bd7a8c2029345a6be6974771d50605')");
      }

      @Override
      public void dropAllTables(@NonNull final SupportSQLiteDatabase db) {
        db.execSQL("DROP TABLE IF EXISTS `encounters`");
        db.execSQL("DROP TABLE IF EXISTS `ink_strokes`");
        db.execSQL("DROP TABLE IF EXISTS `checklists`");
        db.execSQL("DROP TABLE IF EXISTS `folders`");
        db.execSQL("DROP TABLE IF EXISTS `clinical_templates`");
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onDestructiveMigration(db);
          }
        }
      }

      @Override
      public void onCreate(@NonNull final SupportSQLiteDatabase db) {
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onCreate(db);
          }
        }
      }

      @Override
      public void onOpen(@NonNull final SupportSQLiteDatabase db) {
        mDatabase = db;
        db.execSQL("PRAGMA foreign_keys = ON");
        internalInitInvalidationTracker(db);
        final List<? extends RoomDatabase.Callback> _callbacks = mCallbacks;
        if (_callbacks != null) {
          for (RoomDatabase.Callback _callback : _callbacks) {
            _callback.onOpen(db);
          }
        }
      }

      @Override
      public void onPreMigrate(@NonNull final SupportSQLiteDatabase db) {
        DBUtil.dropFtsSyncTriggers(db);
      }

      @Override
      public void onPostMigrate(@NonNull final SupportSQLiteDatabase db) {
      }

      @Override
      @NonNull
      public RoomOpenHelper.ValidationResult onValidateSchema(
          @NonNull final SupportSQLiteDatabase db) {
        final HashMap<String, TableInfo.Column> _columnsEncounters = new HashMap<String, TableInfo.Column>(23);
        _columnsEncounters.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("patientIdentifier", new TableInfo.Column("patientIdentifier", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("facility", new TableInfo.Column("facility", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("group", new TableInfo.Column("group", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("folderId", new TableInfo.Column("folderId", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("age", new TableInfo.Column("age", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("sex", new TableInfo.Column("sex", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("bedNumber", new TableInfo.Column("bedNumber", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("chiefComplaint", new TableInfo.Column("chiefComplaint", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("status", new TableInfo.Column("status", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("archivedAt", new TableInfo.Column("archivedAt", "INTEGER", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("pagesCount", new TableInfo.Column("pagesCount", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("templateId", new TableInfo.Column("templateId", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("templateTitle", new TableInfo.Column("templateTitle", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("checklists", new TableInfo.Column("checklists", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("generalNotes", new TableInfo.Column("generalNotes", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("images", new TableInfo.Column("images", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("links", new TableInfo.Column("links", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("tags", new TableInfo.Column("tags", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("isPinned", new TableInfo.Column("isPinned", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("createdAt", new TableInfo.Column("createdAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("updatedAt", new TableInfo.Column("updatedAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsEncounters.put("isDeleted", new TableInfo.Column("isDeleted", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysEncounters = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesEncounters = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoEncounters = new TableInfo("encounters", _columnsEncounters, _foreignKeysEncounters, _indicesEncounters);
        final TableInfo _existingEncounters = TableInfo.read(db, "encounters");
        if (!_infoEncounters.equals(_existingEncounters)) {
          return new RoomOpenHelper.ValidationResult(false, "encounters(com.medchecklist.app.data.PatientEncounter).\n"
                  + " Expected:\n" + _infoEncounters + "\n"
                  + " Found:\n" + _existingEncounters);
        }
        final HashMap<String, TableInfo.Column> _columnsInkStrokes = new HashMap<String, TableInfo.Column>(11);
        _columnsInkStrokes.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("encounterId", new TableInfo.Column("encounterId", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("tool", new TableInfo.Column("tool", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("color", new TableInfo.Column("color", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("size", new TableInfo.Column("size", "REAL", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("opacity", new TableInfo.Column("opacity", "REAL", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("pageIndex", new TableInfo.Column("pageIndex", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("targetCanvas", new TableInfo.Column("targetCanvas", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("targetItemId", new TableInfo.Column("targetItemId", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("points", new TableInfo.Column("points", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsInkStrokes.put("timestamp", new TableInfo.Column("timestamp", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysInkStrokes = new HashSet<TableInfo.ForeignKey>(1);
        _foreignKeysInkStrokes.add(new TableInfo.ForeignKey("encounters", "CASCADE", "NO ACTION", Arrays.asList("encounterId"), Arrays.asList("id")));
        final HashSet<TableInfo.Index> _indicesInkStrokes = new HashSet<TableInfo.Index>(2);
        _indicesInkStrokes.add(new TableInfo.Index("index_ink_strokes_encounterId", false, Arrays.asList("encounterId"), Arrays.asList("ASC")));
        _indicesInkStrokes.add(new TableInfo.Index("index_ink_strokes_pageIndex", false, Arrays.asList("pageIndex"), Arrays.asList("ASC")));
        final TableInfo _infoInkStrokes = new TableInfo("ink_strokes", _columnsInkStrokes, _foreignKeysInkStrokes, _indicesInkStrokes);
        final TableInfo _existingInkStrokes = TableInfo.read(db, "ink_strokes");
        if (!_infoInkStrokes.equals(_existingInkStrokes)) {
          return new RoomOpenHelper.ValidationResult(false, "ink_strokes(com.medchecklist.app.data.InkStroke).\n"
                  + " Expected:\n" + _infoInkStrokes + "\n"
                  + " Found:\n" + _existingInkStrokes);
        }
        final HashMap<String, TableInfo.Column> _columnsChecklists = new HashMap<String, TableInfo.Column>(11);
        _columnsChecklists.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("title", new TableInfo.Column("title", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("description", new TableInfo.Column("description", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("category", new TableInfo.Column("category", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("institution", new TableInfo.Column("institution", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("tags", new TableInfo.Column("tags", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("sections", new TableInfo.Column("sections", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("isPinned", new TableInfo.Column("isPinned", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("isCustom", new TableInfo.Column("isCustom", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("updatedAt", new TableInfo.Column("updatedAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsChecklists.put("isDeleted", new TableInfo.Column("isDeleted", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysChecklists = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesChecklists = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoChecklists = new TableInfo("checklists", _columnsChecklists, _foreignKeysChecklists, _indicesChecklists);
        final TableInfo _existingChecklists = TableInfo.read(db, "checklists");
        if (!_infoChecklists.equals(_existingChecklists)) {
          return new RoomOpenHelper.ValidationResult(false, "checklists(com.medchecklist.app.data.ChecklistEntity).\n"
                  + " Expected:\n" + _infoChecklists + "\n"
                  + " Found:\n" + _existingChecklists);
        }
        final HashMap<String, TableInfo.Column> _columnsFolders = new HashMap<String, TableInfo.Column>(8);
        _columnsFolders.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsFolders.put("name", new TableInfo.Column("name", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsFolders.put("description", new TableInfo.Column("description", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsFolders.put("icon", new TableInfo.Column("icon", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsFolders.put("color", new TableInfo.Column("color", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsFolders.put("parentId", new TableInfo.Column("parentId", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsFolders.put("order", new TableInfo.Column("order", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsFolders.put("updatedAt", new TableInfo.Column("updatedAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysFolders = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesFolders = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoFolders = new TableInfo("folders", _columnsFolders, _foreignKeysFolders, _indicesFolders);
        final TableInfo _existingFolders = TableInfo.read(db, "folders");
        if (!_infoFolders.equals(_existingFolders)) {
          return new RoomOpenHelper.ValidationResult(false, "folders(com.medchecklist.app.data.FolderEntity).\n"
                  + " Expected:\n" + _infoFolders + "\n"
                  + " Found:\n" + _existingFolders);
        }
        final HashMap<String, TableInfo.Column> _columnsClinicalTemplates = new HashMap<String, TableInfo.Column>(9);
        _columnsClinicalTemplates.put("id", new TableInfo.Column("id", "TEXT", true, 1, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("title", new TableInfo.Column("title", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("description", new TableInfo.Column("description", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("category", new TableInfo.Column("category", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("defaultChecklistIds", new TableInfo.Column("defaultChecklistIds", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("defaultNotes", new TableInfo.Column("defaultNotes", "TEXT", false, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("tags", new TableInfo.Column("tags", "TEXT", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("isPinned", new TableInfo.Column("isPinned", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        _columnsClinicalTemplates.put("updatedAt", new TableInfo.Column("updatedAt", "INTEGER", true, 0, null, TableInfo.CREATED_FROM_ENTITY));
        final HashSet<TableInfo.ForeignKey> _foreignKeysClinicalTemplates = new HashSet<TableInfo.ForeignKey>(0);
        final HashSet<TableInfo.Index> _indicesClinicalTemplates = new HashSet<TableInfo.Index>(0);
        final TableInfo _infoClinicalTemplates = new TableInfo("clinical_templates", _columnsClinicalTemplates, _foreignKeysClinicalTemplates, _indicesClinicalTemplates);
        final TableInfo _existingClinicalTemplates = TableInfo.read(db, "clinical_templates");
        if (!_infoClinicalTemplates.equals(_existingClinicalTemplates)) {
          return new RoomOpenHelper.ValidationResult(false, "clinical_templates(com.medchecklist.app.data.ClinicalTemplateEntity).\n"
                  + " Expected:\n" + _infoClinicalTemplates + "\n"
                  + " Found:\n" + _existingClinicalTemplates);
        }
        return new RoomOpenHelper.ValidationResult(true, null);
      }
    }, "98bd7a8c2029345a6be6974771d50605", "6ccbd8c35e7e306e567bf1ba7b78714e");
    final SupportSQLiteOpenHelper.Configuration _sqliteConfig = SupportSQLiteOpenHelper.Configuration.builder(config.context).name(config.name).callback(_openCallback).build();
    final SupportSQLiteOpenHelper _helper = config.sqliteOpenHelperFactory.create(_sqliteConfig);
    return _helper;
  }

  @Override
  @NonNull
  protected InvalidationTracker createInvalidationTracker() {
    final HashMap<String, String> _shadowTablesMap = new HashMap<String, String>(0);
    final HashMap<String, Set<String>> _viewTables = new HashMap<String, Set<String>>(0);
    return new InvalidationTracker(this, _shadowTablesMap, _viewTables, "encounters","ink_strokes","checklists","folders","clinical_templates");
  }

  @Override
  public void clearAllTables() {
    super.assertNotMainThread();
    final SupportSQLiteDatabase _db = super.getOpenHelper().getWritableDatabase();
    final boolean _supportsDeferForeignKeys = android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP;
    try {
      if (!_supportsDeferForeignKeys) {
        _db.execSQL("PRAGMA foreign_keys = FALSE");
      }
      super.beginTransaction();
      if (_supportsDeferForeignKeys) {
        _db.execSQL("PRAGMA defer_foreign_keys = TRUE");
      }
      _db.execSQL("DELETE FROM `encounters`");
      _db.execSQL("DELETE FROM `ink_strokes`");
      _db.execSQL("DELETE FROM `checklists`");
      _db.execSQL("DELETE FROM `folders`");
      _db.execSQL("DELETE FROM `clinical_templates`");
      super.setTransactionSuccessful();
    } finally {
      super.endTransaction();
      if (!_supportsDeferForeignKeys) {
        _db.execSQL("PRAGMA foreign_keys = TRUE");
      }
      _db.query("PRAGMA wal_checkpoint(FULL)").close();
      if (!_db.inTransaction()) {
        _db.execSQL("VACUUM");
      }
    }
  }

  @Override
  @NonNull
  protected Map<Class<?>, List<Class<?>>> getRequiredTypeConverters() {
    final HashMap<Class<?>, List<Class<?>>> _typeConvertersMap = new HashMap<Class<?>, List<Class<?>>>();
    _typeConvertersMap.put(EncounterDao.class, EncounterDao_Impl.getRequiredConverters());
    _typeConvertersMap.put(InkStrokeDao.class, InkStrokeDao_Impl.getRequiredConverters());
    _typeConvertersMap.put(ChecklistDao.class, ChecklistDao_Impl.getRequiredConverters());
    _typeConvertersMap.put(FolderDao.class, FolderDao_Impl.getRequiredConverters());
    _typeConvertersMap.put(TemplateDao.class, TemplateDao_Impl.getRequiredConverters());
    return _typeConvertersMap;
  }

  @Override
  @NonNull
  public Set<Class<? extends AutoMigrationSpec>> getRequiredAutoMigrationSpecs() {
    final HashSet<Class<? extends AutoMigrationSpec>> _autoMigrationSpecsSet = new HashSet<Class<? extends AutoMigrationSpec>>();
    return _autoMigrationSpecsSet;
  }

  @Override
  @NonNull
  public List<Migration> getAutoMigrations(
      @NonNull final Map<Class<? extends AutoMigrationSpec>, AutoMigrationSpec> autoMigrationSpecs) {
    final List<Migration> _autoMigrations = new ArrayList<Migration>();
    return _autoMigrations;
  }

  @Override
  public EncounterDao encounterDao() {
    if (_encounterDao != null) {
      return _encounterDao;
    } else {
      synchronized(this) {
        if(_encounterDao == null) {
          _encounterDao = new EncounterDao_Impl(this);
        }
        return _encounterDao;
      }
    }
  }

  @Override
  public InkStrokeDao inkStrokeDao() {
    if (_inkStrokeDao != null) {
      return _inkStrokeDao;
    } else {
      synchronized(this) {
        if(_inkStrokeDao == null) {
          _inkStrokeDao = new InkStrokeDao_Impl(this);
        }
        return _inkStrokeDao;
      }
    }
  }

  @Override
  public ChecklistDao checklistDao() {
    if (_checklistDao != null) {
      return _checklistDao;
    } else {
      synchronized(this) {
        if(_checklistDao == null) {
          _checklistDao = new ChecklistDao_Impl(this);
        }
        return _checklistDao;
      }
    }
  }

  @Override
  public FolderDao folderDao() {
    if (_folderDao != null) {
      return _folderDao;
    } else {
      synchronized(this) {
        if(_folderDao == null) {
          _folderDao = new FolderDao_Impl(this);
        }
        return _folderDao;
      }
    }
  }

  @Override
  public TemplateDao templateDao() {
    if (_templateDao != null) {
      return _templateDao;
    } else {
      synchronized(this) {
        if(_templateDao == null) {
          _templateDao = new TemplateDao_Impl(this);
        }
        return _templateDao;
      }
    }
  }
}
