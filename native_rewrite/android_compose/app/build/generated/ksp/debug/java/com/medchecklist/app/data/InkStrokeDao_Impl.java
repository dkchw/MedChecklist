package com.medchecklist.app.data;

import android.database.Cursor;
import androidx.annotation.NonNull;
import androidx.room.CoroutinesRoom;
import androidx.room.EntityInsertionAdapter;
import androidx.room.RoomDatabase;
import androidx.room.RoomSQLiteQuery;
import androidx.room.SharedSQLiteStatement;
import androidx.room.util.CursorUtil;
import androidx.room.util.DBUtil;
import androidx.room.util.StringUtil;
import androidx.sqlite.db.SupportSQLiteStatement;
import java.lang.Class;
import java.lang.Exception;
import java.lang.Object;
import java.lang.Override;
import java.lang.String;
import java.lang.StringBuilder;
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
public final class InkStrokeDao_Impl implements InkStrokeDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<InkStroke> __insertionAdapterOfInkStroke;

  private final Converters __converters = new Converters();

  private final SharedSQLiteStatement __preparedStmtOfClearPageStrokes;

  private final SharedSQLiteStatement __preparedStmtOfDeleteAllStrokesForEncounter;

  public InkStrokeDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfInkStroke = new EntityInsertionAdapter<InkStroke>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `ink_strokes` (`id`,`encounterId`,`tool`,`color`,`size`,`opacity`,`pageIndex`,`targetCanvas`,`targetItemId`,`points`,`timestamp`) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final InkStroke entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getEncounterId());
        statement.bindString(3, entity.getTool());
        statement.bindString(4, entity.getColor());
        statement.bindDouble(5, entity.getSize());
        statement.bindDouble(6, entity.getOpacity());
        statement.bindLong(7, entity.getPageIndex());
        statement.bindString(8, entity.getTargetCanvas());
        if (entity.getTargetItemId() == null) {
          statement.bindNull(9);
        } else {
          statement.bindString(9, entity.getTargetItemId());
        }
        final String _tmp = __converters.fromStrokePoints(entity.getPoints());
        statement.bindString(10, _tmp);
        statement.bindLong(11, entity.getTimestamp());
      }
    };
    this.__preparedStmtOfClearPageStrokes = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM ink_strokes WHERE encounterId = ? AND pageIndex = ? AND targetCanvas = ?";
        return _query;
      }
    };
    this.__preparedStmtOfDeleteAllStrokesForEncounter = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM ink_strokes WHERE encounterId = ?";
        return _query;
      }
    };
  }

  @Override
  public Object insertStroke(final InkStroke stroke, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfInkStroke.insert(stroke);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object insertStrokes(final List<InkStroke> strokes,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfInkStroke.insert(strokes);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object clearPageStrokes(final String encounterId, final int pageIndex,
      final String targetCanvas, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfClearPageStrokes.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, encounterId);
        _argIndex = 2;
        _stmt.bindLong(_argIndex, pageIndex);
        _argIndex = 3;
        _stmt.bindString(_argIndex, targetCanvas);
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
          __preparedStmtOfClearPageStrokes.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object deleteAllStrokesForEncounter(final String encounterId,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfDeleteAllStrokesForEncounter.acquire();
        int _argIndex = 1;
        _stmt.bindString(_argIndex, encounterId);
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
          __preparedStmtOfDeleteAllStrokesForEncounter.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<InkStroke>> getStrokesForPage(final String encounterId, final int pageIndex,
      final String targetCanvas) {
    final String _sql = "SELECT * FROM ink_strokes WHERE encounterId = ? AND pageIndex = ? AND targetCanvas = ? ORDER BY timestamp ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 3);
    int _argIndex = 1;
    _statement.bindString(_argIndex, encounterId);
    _argIndex = 2;
    _statement.bindLong(_argIndex, pageIndex);
    _argIndex = 3;
    _statement.bindString(_argIndex, targetCanvas);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"ink_strokes"}, new Callable<List<InkStroke>>() {
      @Override
      @NonNull
      public List<InkStroke> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfEncounterId = CursorUtil.getColumnIndexOrThrow(_cursor, "encounterId");
          final int _cursorIndexOfTool = CursorUtil.getColumnIndexOrThrow(_cursor, "tool");
          final int _cursorIndexOfColor = CursorUtil.getColumnIndexOrThrow(_cursor, "color");
          final int _cursorIndexOfSize = CursorUtil.getColumnIndexOrThrow(_cursor, "size");
          final int _cursorIndexOfOpacity = CursorUtil.getColumnIndexOrThrow(_cursor, "opacity");
          final int _cursorIndexOfPageIndex = CursorUtil.getColumnIndexOrThrow(_cursor, "pageIndex");
          final int _cursorIndexOfTargetCanvas = CursorUtil.getColumnIndexOrThrow(_cursor, "targetCanvas");
          final int _cursorIndexOfTargetItemId = CursorUtil.getColumnIndexOrThrow(_cursor, "targetItemId");
          final int _cursorIndexOfPoints = CursorUtil.getColumnIndexOrThrow(_cursor, "points");
          final int _cursorIndexOfTimestamp = CursorUtil.getColumnIndexOrThrow(_cursor, "timestamp");
          final List<InkStroke> _result = new ArrayList<InkStroke>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final InkStroke _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpEncounterId;
            _tmpEncounterId = _cursor.getString(_cursorIndexOfEncounterId);
            final String _tmpTool;
            _tmpTool = _cursor.getString(_cursorIndexOfTool);
            final String _tmpColor;
            _tmpColor = _cursor.getString(_cursorIndexOfColor);
            final float _tmpSize;
            _tmpSize = _cursor.getFloat(_cursorIndexOfSize);
            final float _tmpOpacity;
            _tmpOpacity = _cursor.getFloat(_cursorIndexOfOpacity);
            final int _tmpPageIndex;
            _tmpPageIndex = _cursor.getInt(_cursorIndexOfPageIndex);
            final String _tmpTargetCanvas;
            _tmpTargetCanvas = _cursor.getString(_cursorIndexOfTargetCanvas);
            final String _tmpTargetItemId;
            if (_cursor.isNull(_cursorIndexOfTargetItemId)) {
              _tmpTargetItemId = null;
            } else {
              _tmpTargetItemId = _cursor.getString(_cursorIndexOfTargetItemId);
            }
            final List<StrokePoint> _tmpPoints;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfPoints);
            _tmpPoints = __converters.toStrokePoints(_tmp);
            final long _tmpTimestamp;
            _tmpTimestamp = _cursor.getLong(_cursorIndexOfTimestamp);
            _item = new InkStroke(_tmpId,_tmpEncounterId,_tmpTool,_tmpColor,_tmpSize,_tmpOpacity,_tmpPageIndex,_tmpTargetCanvas,_tmpTargetItemId,_tmpPoints,_tmpTimestamp);
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
  public Flow<List<InkStroke>> getAllStrokesForEncounter(final String encounterId) {
    final String _sql = "SELECT * FROM ink_strokes WHERE encounterId = ? ORDER BY timestamp ASC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, encounterId);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"ink_strokes"}, new Callable<List<InkStroke>>() {
      @Override
      @NonNull
      public List<InkStroke> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfEncounterId = CursorUtil.getColumnIndexOrThrow(_cursor, "encounterId");
          final int _cursorIndexOfTool = CursorUtil.getColumnIndexOrThrow(_cursor, "tool");
          final int _cursorIndexOfColor = CursorUtil.getColumnIndexOrThrow(_cursor, "color");
          final int _cursorIndexOfSize = CursorUtil.getColumnIndexOrThrow(_cursor, "size");
          final int _cursorIndexOfOpacity = CursorUtil.getColumnIndexOrThrow(_cursor, "opacity");
          final int _cursorIndexOfPageIndex = CursorUtil.getColumnIndexOrThrow(_cursor, "pageIndex");
          final int _cursorIndexOfTargetCanvas = CursorUtil.getColumnIndexOrThrow(_cursor, "targetCanvas");
          final int _cursorIndexOfTargetItemId = CursorUtil.getColumnIndexOrThrow(_cursor, "targetItemId");
          final int _cursorIndexOfPoints = CursorUtil.getColumnIndexOrThrow(_cursor, "points");
          final int _cursorIndexOfTimestamp = CursorUtil.getColumnIndexOrThrow(_cursor, "timestamp");
          final List<InkStroke> _result = new ArrayList<InkStroke>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final InkStroke _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpEncounterId;
            _tmpEncounterId = _cursor.getString(_cursorIndexOfEncounterId);
            final String _tmpTool;
            _tmpTool = _cursor.getString(_cursorIndexOfTool);
            final String _tmpColor;
            _tmpColor = _cursor.getString(_cursorIndexOfColor);
            final float _tmpSize;
            _tmpSize = _cursor.getFloat(_cursorIndexOfSize);
            final float _tmpOpacity;
            _tmpOpacity = _cursor.getFloat(_cursorIndexOfOpacity);
            final int _tmpPageIndex;
            _tmpPageIndex = _cursor.getInt(_cursorIndexOfPageIndex);
            final String _tmpTargetCanvas;
            _tmpTargetCanvas = _cursor.getString(_cursorIndexOfTargetCanvas);
            final String _tmpTargetItemId;
            if (_cursor.isNull(_cursorIndexOfTargetItemId)) {
              _tmpTargetItemId = null;
            } else {
              _tmpTargetItemId = _cursor.getString(_cursorIndexOfTargetItemId);
            }
            final List<StrokePoint> _tmpPoints;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfPoints);
            _tmpPoints = __converters.toStrokePoints(_tmp);
            final long _tmpTimestamp;
            _tmpTimestamp = _cursor.getLong(_cursorIndexOfTimestamp);
            _item = new InkStroke(_tmpId,_tmpEncounterId,_tmpTool,_tmpColor,_tmpSize,_tmpOpacity,_tmpPageIndex,_tmpTargetCanvas,_tmpTargetItemId,_tmpPoints,_tmpTimestamp);
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
  public Object deleteStrokesByIds(final List<String> strokeIds,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final StringBuilder _stringBuilder = StringUtil.newStringBuilder();
        _stringBuilder.append("DELETE FROM ink_strokes WHERE id IN (");
        final int _inputSize = strokeIds.size();
        StringUtil.appendPlaceholders(_stringBuilder, _inputSize);
        _stringBuilder.append(")");
        final String _sql = _stringBuilder.toString();
        final SupportSQLiteStatement _stmt = __db.compileStatement(_sql);
        int _argIndex = 1;
        for (String _item : strokeIds) {
          _stmt.bindString(_argIndex, _item);
          _argIndex++;
        }
        __db.beginTransaction();
        try {
          _stmt.executeUpdateDelete();
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @NonNull
  public static List<Class<?>> getRequiredConverters() {
    return Collections.emptyList();
  }
}
