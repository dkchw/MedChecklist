package com.medchecklist.app.data;

import android.database.Cursor;
import android.os.CancellationSignal;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
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
public final class TemplateDao_Impl implements TemplateDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<ClinicalTemplateEntity> __insertionAdapterOfClinicalTemplateEntity;

  private final Converters __converters = new Converters();

  public TemplateDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfClinicalTemplateEntity = new EntityInsertionAdapter<ClinicalTemplateEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `clinical_templates` (`id`,`title`,`description`,`category`,`defaultChecklistIds`,`defaultNotes`,`tags`,`isPinned`,`updatedAt`) VALUES (?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final ClinicalTemplateEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getTitle());
        statement.bindString(3, entity.getDescription());
        statement.bindString(4, entity.getCategory());
        final String _tmp = __converters.fromStringList(entity.getDefaultChecklistIds());
        statement.bindString(5, _tmp);
        if (entity.getDefaultNotes() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getDefaultNotes());
        }
        final String _tmp_1 = __converters.fromStringList(entity.getTags());
        statement.bindString(7, _tmp_1);
        final int _tmp_2 = entity.isPinned() ? 1 : 0;
        statement.bindLong(8, _tmp_2);
        statement.bindLong(9, entity.getUpdatedAt());
      }
    };
  }

  @Override
  public Object insertTemplate(final ClinicalTemplateEntity template,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfClinicalTemplateEntity.insert(template);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertTemplates(final List<ClinicalTemplateEntity> templates,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfClinicalTemplateEntity.insert(templates);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<ClinicalTemplateEntity>> getAllTemplates() {
    final String _sql = "SELECT * FROM clinical_templates ORDER BY isPinned DESC, title ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"clinical_templates"}, new Callable<List<ClinicalTemplateEntity>>() {
      @Override
      @NonNull
      public List<ClinicalTemplateEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "title");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfCategory = CursorUtil.getColumnIndexOrThrow(_cursor, "category");
          final int _cursorIndexOfDefaultChecklistIds = CursorUtil.getColumnIndexOrThrow(_cursor, "defaultChecklistIds");
          final int _cursorIndexOfDefaultNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "defaultNotes");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final List<ClinicalTemplateEntity> _result = new ArrayList<ClinicalTemplateEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final ClinicalTemplateEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpTitle;
            _tmpTitle = _cursor.getString(_cursorIndexOfTitle);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpCategory;
            _tmpCategory = _cursor.getString(_cursorIndexOfCategory);
            final List<String> _tmpDefaultChecklistIds;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfDefaultChecklistIds);
            _tmpDefaultChecklistIds = __converters.toStringList(_tmp);
            final String _tmpDefaultNotes;
            if (_cursor.isNull(_cursorIndexOfDefaultNotes)) {
              _tmpDefaultNotes = null;
            } else {
              _tmpDefaultNotes = _cursor.getString(_cursorIndexOfDefaultNotes);
            }
            final List<String> _tmpTags;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp_1);
            final boolean _tmpIsPinned;
            final int _tmp_2;
            _tmp_2 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_2 != 0;
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            _item = new ClinicalTemplateEntity(_tmpId,_tmpTitle,_tmpDescription,_tmpCategory,_tmpDefaultChecklistIds,_tmpDefaultNotes,_tmpTags,_tmpIsPinned,_tmpUpdatedAt);
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
  public Object getTemplateById(final String id,
      final Continuation<? super ClinicalTemplateEntity> $completion) {
    final String _sql = "SELECT * FROM clinical_templates WHERE id = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<ClinicalTemplateEntity>() {
      @Override
      @Nullable
      public ClinicalTemplateEntity call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "title");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfCategory = CursorUtil.getColumnIndexOrThrow(_cursor, "category");
          final int _cursorIndexOfDefaultChecklistIds = CursorUtil.getColumnIndexOrThrow(_cursor, "defaultChecklistIds");
          final int _cursorIndexOfDefaultNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "defaultNotes");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final ClinicalTemplateEntity _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpTitle;
            _tmpTitle = _cursor.getString(_cursorIndexOfTitle);
            final String _tmpDescription;
            _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            final String _tmpCategory;
            _tmpCategory = _cursor.getString(_cursorIndexOfCategory);
            final List<String> _tmpDefaultChecklistIds;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfDefaultChecklistIds);
            _tmpDefaultChecklistIds = __converters.toStringList(_tmp);
            final String _tmpDefaultNotes;
            if (_cursor.isNull(_cursorIndexOfDefaultNotes)) {
              _tmpDefaultNotes = null;
            } else {
              _tmpDefaultNotes = _cursor.getString(_cursorIndexOfDefaultNotes);
            }
            final List<String> _tmpTags;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp_1);
            final boolean _tmpIsPinned;
            final int _tmp_2;
            _tmp_2 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_2 != 0;
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            _result = new ClinicalTemplateEntity(_tmpId,_tmpTitle,_tmpDescription,_tmpCategory,_tmpDefaultChecklistIds,_tmpDefaultNotes,_tmpTags,_tmpIsPinned,_tmpUpdatedAt);
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
