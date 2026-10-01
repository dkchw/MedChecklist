package com.medchecklist.app.data;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityDeletionOrUpdateAdapter;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.SuppressWarnings;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import javax.annotation.processing.Generated;
import kotlin.Unit;
import kotlin.coroutines.Continuation;
import kotlinx.coroutines.flow.Flow;

@Generated("androidx.room.RoomProcessor")
@SuppressWarnings({"unchecked", "deprecation"})
public final class ChecklistDao_Impl implements ChecklistDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<ChecklistEntity> __insertionAdapterOfChecklistEntity;

  private final Converters __converters = new Converters();

  private final EntityDeletionOrUpdateAdapter<ChecklistEntity> __updateAdapterOfChecklistEntity;

  private final SharedSQLiteStatement __preparedStmtOfSoftDeleteChecklist;

  public ChecklistDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfChecklistEntity = new EntityInsertionAdapter<ChecklistEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `checklists` (`id`,`title`,`description`,`category`,`institution`,`tags`,`sections`,`isPinned`,`isCustom`,`updatedAt`,`isDeleted`) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final ChecklistEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getTitle());
        statement.bindString(3, entity.getDescription());
        statement.bindString(4, entity.getCategory());
        if (entity.getInstitution() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getInstitution());
        }
        final String _tmp = __converters.fromStringList(entity.getTags());
        statement.bindString(6, _tmp);
        final String _tmp_1 = __converters.fromSections(entity.getSections());
        statement.bindString(7, _tmp_1);
        final int _tmp_2 = entity.isPinned() ? 1 : 0;
        statement.bindLong(8, _tmp_2);
        final int _tmp_3 = entity.isCustom() ? 1 : 0;
        statement.bindLong(9, _tmp_3);
        statement.bindLong(10, entity.getUpdatedAt());
        final int _tmp_4 = entity.isDeleted() ? 1 : 0;
        statement.bindLong(11, _tmp_4);
      }
    };
    this.__updateAdapterOfChecklistEntity = new EntityDeletionOrUpdateAdapter<ChecklistEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "UPDATE OR ABORT `checklists` SET `id` = ?,`title` = ?,`description` = ?,`category` = ?,`institution` = ?,`tags` = ?,`sections` = ?,`isPinned` = ?,`isCustom` = ?,`updatedAt` = ?,`isDeleted` = ? WHERE `id` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final ChecklistEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getTitle());
        statement.bindString(3, entity.getDescription());
        statement.bindString(4, entity.getCategory());
        if (entity.getInstitution() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getInstitution());
        }
        final String _tmp = __converters.fromStringList(entity.getTags());
        statement.bindString(6, _tmp);
        final String _tmp_1 = __converters.fromSections(entity.getSections());
        statement.bindString(7, _tmp_1);
        final int _tmp_2 = entity.isPinned() ? 1 : 0;
        statement.bindLong(8, _tmp_2);
        final int _tmp_3 = entity.isCustom() ? 1 : 0;
        statement.bindLong(9, _tmp_3);
        statement.bindLong(10, entity.getUpdatedAt());
        final int _tmp_4 = entity.isDeleted() ? 1 : 0;
        statement.bindLong(11, _tmp_4);
        statement.bindString(12, entity.getId());
      }
    };
    this.__preparedStmtOfSoftDeleteChecklist = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE checklists SET isDeleted = 1 WHERE id = ?";
        return _query;
      }
    };
  }

  @Override
  public Object insertChecklist(final ChecklistEntity checklist,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfChecklistEntity.insert(checklist);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertChecklists(final List<ChecklistEntity> checklists,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfChecklistEntity.insert(checklists);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object updateChecklist(final ChecklistEntity checklist,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __updateAdapterOfChecklistEntity.handle(checklist);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object softDeleteChecklist(final String id, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfSoftDeleteChecklist.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, id);
        try {
          __db.beginTransaction();
          try {
            _stmt.executeUpdateDelete();
            __db.setTransactionSuccessful();
            return Unit.INSTANCE;
          } finally {
            __db.endTransaction();
          }
        } finally {
          __preparedStmtOfSoftDeleteChecklist.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<ChecklistEntity>> getAllChecklists() {
    final String _sql = "SELECT * FROM checklists WHERE isDeleted = 0 ORDER BY isPinned DESC, title ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"checklists"}, new Callable<List<ChecklistEntity>>() {
      @Override
      @NonNull
      public List<ChecklistEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "title");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfCategory = CursorUtil.getColumnIndexOrThrow(_cursor, "category");
          final int _cursorIndexOfInstitution = CursorUtil.getColumnIndexOrThrow(_cursor, "institution");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfSections = CursorUtil.getColumnIndexOrThrow(_cursor, "sections");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfIsCustom = CursorUtil.getColumnIndexOrThrow(_cursor, "isCustom");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final List<ChecklistEntity> _result = new ArrayList<ChecklistEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final ChecklistEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpTitle;
            _tmpTitle = _cursor.getString(_cursorIndexOfTitle);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpCategory;
            _tmpCategory = _cursor.getString(_cursorIndexOfCategory);
            final String _tmpInstitution;
            if (_cursor.isNull(_cursorIndexOfInstitution)) {
              _tmpInstitution = null;
            } else {
              _tmpInstitution = _cursor.getString(_cursorIndexOfInstitution);
            }
            final List<String> _tmpTags;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp);
            final List<ChecklistSection> _tmpSections;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfSections);
            _tmpSections = __converters.toSections(_tmp_1);
            final boolean _tmpIsPinned;
            final int _tmp_2;
            _tmp_2 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_2 != 0;
            final boolean _tmpIsCustom;
            final int _tmp_3;
            _tmp_3 = _cursor.getInt(_cursorIndexOfIsCustom);
            _tmpIsCustom = _tmp_3 != 0;
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final boolean _tmpIsDeleted;
            final int _tmp_4;
            _tmp_4 = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp_4 != 0;
            _item = new ChecklistEntity(_tmpId,_tmpTitle,_tmpDescription,_tmpCategory,_tmpInstitution,_tmpTags,_tmpSections,_tmpIsPinned,_tmpIsCustom,_tmpUpdatedAt,_tmpIsDeleted);
            _result.add(_item);
          }
          return _result;
        } finally {
          _cursor.close();
        }
      }

      @Override
      protected void finalize() {
        _statement.release();
      }
    });
  }

  @Override
  public Object getChecklistById(final String id,
      final Continuation<? super ChecklistEntity> $completion) {
    final String _sql = "SELECT * FROM checklists WHERE id = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<ChecklistEntity>() {
      @Override
      @Nullable
      public ChecklistEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "title");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfCategory = CursorUtil.getColumnIndexOrThrow(_cursor, "category");
          final int _cursorIndexOfInstitution = CursorUtil.getColumnIndexOrThrow(_cursor, "institution");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfSections = CursorUtil.getColumnIndexOrThrow(_cursor, "sections");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfIsCustom = CursorUtil.getColumnIndexOrThrow(_cursor, "isCustom");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final ChecklistEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpTitle;
            _tmpTitle = _cursor.getString(_cursorIndexOfTitle);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpCategory;
            _tmpCategory = _cursor.getString(_cursorIndexOfCategory);
            final String _tmpInstitution;
            if (_cursor.isNull(_cursorIndexOfInstitution)) {
              _tmpInstitution = null;
            } else {
              _tmpInstitution = _cursor.getString(_cursorIndexOfInstitution);
            }
            final List<String> _tmpTags;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp);
            final List<ChecklistSection> _tmpSections;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfSections);
            _tmpSections = __converters.toSections(_tmp_1);
            final boolean _tmpIsPinned;
            final int _tmp_2;
            _tmp_2 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_2 != 0;
            final boolean _tmpIsCustom;
            final int _tmp_3;
            _tmp_3 = _cursor.getInt(_cursorIndexOfIsCustom);
            _tmpIsCustom = _tmp_3 != 0;
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final boolean _tmpIsDeleted;
            final int _tmp_4;
            _tmp_4 = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp_4 != 0;
            _result = new ChecklistEntity(_tmpId,_tmpTitle,_tmpDescription,_tmpCategory,_tmpInstitution,_tmpTags,_tmpSections,_tmpIsPinned,_tmpIsCustom,_tmpUpdatedAt,_tmpIsDeleted);
          } else {
            _result = null;
          }
          return _result;
        } finally {
          _cursor.close();
          _statement.release();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
