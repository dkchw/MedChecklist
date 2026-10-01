package com.medchecklist.app.data;

import android.database.Cursor;
import androidx.annotation.NonNull;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityDeletionOrUpdateAdapter;
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
public final class FolderDao_Impl implements FolderDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<FolderEntity> __insertionAdapterOfFolderEntity;

  private final EntityDeletionOrUpdateAdapter<FolderEntity> __deletionAdapterOfFolderEntity;

  public FolderDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfFolderEntity = new EntityInsertionAdapter<FolderEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `folders` (`id`,`name`,`description`,`icon`,`color`,`parentId`,`order`,`updatedAt`) VALUES (?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final FolderEntity entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getName());
        if (entity.getDescription() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getDescription());
        }
        if (entity.getIcon() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getIcon());
        }
        if (entity.getColor() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getColor());
        }
        if (entity.getParentId() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getParentId());
        }
        statement.bindLong(7, entity.getOrder());
        statement.bindLong(8, entity.getUpdatedAt());
      }
    };
    this.__deletionAdapterOfFolderEntity = new EntityDeletionOrUpdateAdapter<FolderEntity>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "DELETE FROM `folders` WHERE `id` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final FolderEntity entity) {
        statement.bindString(1, entity.getId());
      }
    };
  }

  @Override
  public Object insertFolder(final FolderEntity folder,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfFolderEntity.insert(folder);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertFolders(final List<FolderEntity> folders,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfFolderEntity.insert(folders);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object deleteFolder(final FolderEntity folder,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __deletionAdapterOfFolderEntity.handle(folder);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<FolderEntity>> getAllFolders() {
    final String _sql = "SELECT * FROM folders ORDER BY `order` ASC, name ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"folders"}, new Callable<List<FolderEntity>>() {
      @Override
      @NonNull
      public List<FolderEntity> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfName = CursorUtil.getColumnIndexOrThrow(_cursor, "name");
          final int _cursorIndexOfDescription = CursorUtil.getColumnIndexOrThrow(_cursor, "description");
          final int _cursorIndexOfIcon = CursorUtil.getColumnIndexOrThrow(_cursor, "icon");
          final int _cursorIndexOfColor = CursorUtil.getColumnIndexOrThrow(_cursor, "color");
          final int _cursorIndexOfParentId = CursorUtil.getColumnIndexOrThrow(_cursor, "parentId");
          final int _cursorIndexOfOrder = CursorUtil.getColumnIndexOrThrow(_cursor, "order");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final List<FolderEntity> _result = new ArrayList<FolderEntity>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final FolderEntity _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpName;
            _tmpName = _cursor.getString(_cursorIndexOfName);
            final String _tmpDescription;
            if (_cursor.isNull(_cursorIndexOfDescription)) {
              _tmpDescription = null;
            } else {
              _tmpDescription = _cursor.getString(_cursorIndexOfDescription);
            }
            final String _tmpIcon;
            if (_cursor.isNull(_cursorIndexOfIcon)) {
              _tmpIcon = null;
            } else {
              _tmpIcon = _cursor.getString(_cursorIndexOfIcon);
            }
            final String _tmpColor;
            if (_cursor.isNull(_cursorIndexOfColor)) {
              _tmpColor = null;
            } else {
              _tmpColor = _cursor.getString(_cursorIndexOfColor);
            }
            final String _tmpParentId;
            if (_cursor.isNull(_cursorIndexOfParentId)) {
              _tmpParentId = null;
            } else {
              _tmpParentId = _cursor.getString(_cursorIndexOfParentId);
            }
            final int _tmpOrder;
            _tmpOrder = _cursor.getInt(_cursorIndexOfOrder);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            _item = new FolderEntity(_tmpId,_tmpName,_tmpDescription,_tmpIcon,_tmpColor,_tmpParentId,_tmpOrder,_tmpUpdatedAt);
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

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
