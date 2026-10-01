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
import java.lang.Long;
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
public final class EncounterDao_Impl implements EncounterDao {
  private final RoomDatabase __db;

  private final EntityInsertionAdapter<PatientEncounter> __insertionAdapterOfPatientEncounter;

  private final Converters __converters = new Converters();

  private final EntityDeletionOrUpdateAdapter<PatientEncounter> __updateAdapterOfPatientEncounter;

  private final SharedSQLiteStatement __preparedStmtOfSoftDeleteEncounter;

  private final SharedSQLiteStatement __preparedStmtOfHardDeleteEncounter;

  public EncounterDao_Impl(@NonNull final RoomDatabase __db) {
    this.__db = __db;
    this.__insertionAdapterOfPatientEncounter = new EntityInsertionAdapter<PatientEncounter>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "INSERT OR REPLACE INTO `encounters` (`id`,`patientIdentifier`,`facility`,`group`,`folderId`,`age`,`sex`,`bedNumber`,`chiefComplaint`,`status`,`archivedAt`,`pagesCount`,`templateId`,`templateTitle`,`checklists`,`generalNotes`,`images`,`links`,`tags`,`isPinned`,`createdAt`,`updatedAt`,`isDeleted`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final PatientEncounter entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getPatientIdentifier());
        if (entity.getFacility() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getFacility());
        }
        if (entity.getGroup() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getGroup());
        }
        if (entity.getFolderId() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getFolderId());
        }
        if (entity.getAge() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getAge());
        }
        if (entity.getSex() == null) {
          statement.bindNull(7);
        } else {
          statement.bindString(7, entity.getSex());
        }
        if (entity.getBedNumber() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getBedNumber());
        }
        statement.bindString(9, entity.getChiefComplaint());
        statement.bindString(10, entity.getStatus());
        if (entity.getArchivedAt() == null) {
          statement.bindNull(11);
        } else {
          statement.bindLong(11, entity.getArchivedAt());
        }
        statement.bindLong(12, entity.getPagesCount());
        if (entity.getTemplateId() == null) {
          statement.bindNull(13);
        } else {
          statement.bindString(13, entity.getTemplateId());
        }
        if (entity.getTemplateTitle() == null) {
          statement.bindNull(14);
        } else {
          statement.bindString(14, entity.getTemplateTitle());
        }
        final String _tmp = __converters.fromChecklists(entity.getChecklists());
        statement.bindString(15, _tmp);
        if (entity.getGeneralNotes() == null) {
          statement.bindNull(16);
        } else {
          statement.bindString(16, entity.getGeneralNotes());
        }
        final String _tmp_1 = __converters.fromImages(entity.getImages());
        statement.bindString(17, _tmp_1);
        final String _tmp_2 = __converters.fromLinks(entity.getLinks());
        statement.bindString(18, _tmp_2);
        final String _tmp_3 = __converters.fromStringList(entity.getTags());
        statement.bindString(19, _tmp_3);
        final int _tmp_4 = entity.isPinned() ? 1 : 0;
        statement.bindLong(20, _tmp_4);
        statement.bindLong(21, entity.getCreatedAt());
        statement.bindLong(22, entity.getUpdatedAt());
        final int _tmp_5 = entity.isDeleted() ? 1 : 0;
        statement.bindLong(23, _tmp_5);
      }
    };
    this.__updateAdapterOfPatientEncounter = new EntityDeletionOrUpdateAdapter<PatientEncounter>(__db) {
      @Override
      @NonNull
      protected String createQuery() {
        return "UPDATE OR ABORT `encounters` SET `id` = ?,`patientIdentifier` = ?,`facility` = ?,`group` = ?,`folderId` = ?,`age` = ?,`sex` = ?,`bedNumber` = ?,`chiefComplaint` = ?,`status` = ?,`archivedAt` = ?,`pagesCount` = ?,`templateId` = ?,`templateTitle` = ?,`checklists` = ?,`generalNotes` = ?,`images` = ?,`links` = ?,`tags` = ?,`isPinned` = ?,`createdAt` = ?,`updatedAt` = ?,`isDeleted` = ? WHERE `id` = ?";
      }

      @Override
      protected void bind(@NonNull final SupportSQLiteStatement statement,
          @NonNull final PatientEncounter entity) {
        statement.bindString(1, entity.getId());
        statement.bindString(2, entity.getPatientIdentifier());
        if (entity.getFacility() == null) {
          statement.bindNull(3);
        } else {
          statement.bindString(3, entity.getFacility());
        }
        if (entity.getGroup() == null) {
          statement.bindNull(4);
        } else {
          statement.bindString(4, entity.getGroup());
        }
        if (entity.getFolderId() == null) {
          statement.bindNull(5);
        } else {
          statement.bindString(5, entity.getFolderId());
        }
        if (entity.getAge() == null) {
          statement.bindNull(6);
        } else {
          statement.bindString(6, entity.getAge());
        }
        if (entity.getSex() == null) {
          statement.bindNull(7);
        } else {
          statement.bindString(7, entity.getSex());
        }
        if (entity.getBedNumber() == null) {
          statement.bindNull(8);
        } else {
          statement.bindString(8, entity.getBedNumber());
        }
        statement.bindString(9, entity.getChiefComplaint());
        statement.bindString(10, entity.getStatus());
        if (entity.getArchivedAt() == null) {
          statement.bindNull(11);
        } else {
          statement.bindLong(11, entity.getArchivedAt());
        }
        statement.bindLong(12, entity.getPagesCount());
        if (entity.getTemplateId() == null) {
          statement.bindNull(13);
        } else {
          statement.bindString(13, entity.getTemplateId());
        }
        if (entity.getTemplateTitle() == null) {
          statement.bindNull(14);
        } else {
          statement.bindString(14, entity.getTemplateTitle());
        }
        final String _tmp = __converters.fromChecklists(entity.getChecklists());
        statement.bindString(15, _tmp);
        if (entity.getGeneralNotes() == null) {
          statement.bindNull(16);
        } else {
          statement.bindString(16, entity.getGeneralNotes());
        }
        final String _tmp_1 = __converters.fromImages(entity.getImages());
        statement.bindString(17, _tmp_1);
        final String _tmp_2 = __converters.fromLinks(entity.getLinks());
        statement.bindString(18, _tmp_2);
        final String _tmp_3 = __converters.fromStringList(entity.getTags());
        statement.bindString(19, _tmp_3);
        final int _tmp_4 = entity.isPinned() ? 1 : 0;
        statement.bindLong(20, _tmp_4);
        statement.bindLong(21, entity.getCreatedAt());
        statement.bindLong(22, entity.getUpdatedAt());
        final int _tmp_5 = entity.isDeleted() ? 1 : 0;
        statement.bindLong(23, _tmp_5);
        statement.bindString(24, entity.getId());
      }
    };
    this.__preparedStmtOfSoftDeleteEncounter = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "UPDATE encounters SET isDeleted = 1, updatedAt = ? WHERE id = ?";
        return _query;
      }
    };
    this.__preparedStmtOfHardDeleteEncounter = new SharedSQLiteStatement(__db) {
      @Override
      @NonNull
      public String createQuery() {
        final String _query = "DELETE FROM encounters WHERE id = ?";
        return _query;
      }
    };
  }

  @Override
  public Object insertEncounter(final PatientEncounter encounter,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __insertionAdapterOfPatientEncounter.insert(encounter);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object updateEncounter(final PatientEncounter encounter,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        __db.beginTransaction();
        try {
          __updateAdapterOfPatientEncounter.handle(encounter);
          __db.setTransactionSuccessful();
          return Unit.INSTANCE;
        } finally {
          __db.endTransaction();
        }
      }
    }, $completion);
  }

  @Override
  public Object softDeleteEncounter(final String id, final long timestamp,
      final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfSoftDeleteEncounter.acquire();
        int _argIndex = 1;
        _stmt.bindLong(_argIndex, timestamp);
        _argIndex = 2;
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
          __preparedStmtOfSoftDeleteEncounter.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Object hardDeleteEncounter(final String id, final Continuation<? super Unit> $completion) {
    return CoroutinesRoom.execute(__db, true, new Callable<Unit>() {
      @Override
      @NonNull
      public Unit call() throws Exception {
        final SupportSQLiteStatement _stmt = __preparedStmtOfHardDeleteEncounter.acquire();
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
          __preparedStmtOfHardDeleteEncounter.release(_stmt);
        }
      }
    }, $completion);
  }

  @Override
  public Flow<List<PatientEncounter>> getAllActiveEncounters() {
    final String _sql = "SELECT * FROM encounters WHERE isDeleted = 0 ORDER BY isPinned DESC, updatedAt DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"encounters"}, new Callable<List<PatientEncounter>>() {
      @Override
      @NonNull
      public List<PatientEncounter> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfPatientIdentifier = CursorUtil.getColumnIndexOrThrow(_cursor, "patientIdentifier");
          final int _cursorIndexOfFacility = CursorUtil.getColumnIndexOrThrow(_cursor, "facility");
          final int _cursorIndexOfGroup = CursorUtil.getColumnIndexOrThrow(_cursor, "group");
          final int _cursorIndexOfFolderId = CursorUtil.getColumnIndexOrThrow(_cursor, "folderId");
          final int _cursorIndexOfAge = CursorUtil.getColumnIndexOrThrow(_cursor, "age");
          final int _cursorIndexOfSex = CursorUtil.getColumnIndexOrThrow(_cursor, "sex");
          final int _cursorIndexOfBedNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "bedNumber");
          final int _cursorIndexOfChiefComplaint = CursorUtil.getColumnIndexOrThrow(_cursor, "chiefComplaint");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfArchivedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "archivedAt");
          final int _cursorIndexOfPagesCount = CursorUtil.getColumnIndexOrThrow(_cursor, "pagesCount");
          final int _cursorIndexOfTemplateId = CursorUtil.getColumnIndexOrThrow(_cursor, "templateId");
          final int _cursorIndexOfTemplateTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "templateTitle");
          final int _cursorIndexOfChecklists = CursorUtil.getColumnIndexOrThrow(_cursor, "checklists");
          final int _cursorIndexOfGeneralNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "generalNotes");
          final int _cursorIndexOfImages = CursorUtil.getColumnIndexOrThrow(_cursor, "images");
          final int _cursorIndexOfLinks = CursorUtil.getColumnIndexOrThrow(_cursor, "links");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final List<PatientEncounter> _result = new ArrayList<PatientEncounter>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final PatientEncounter _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpPatientIdentifier;
            _tmpPatientIdentifier = _cursor.getString(_cursorIndexOfPatientIdentifier);
            final String _tmpFacility;
            if (_cursor.isNull(_cursorIndexOfFacility)) {
              _tmpFacility = null;
            } else {
              _tmpFacility = _cursor.getString(_cursorIndexOfFacility);
            }
            final String _tmpGroup;
            if (_cursor.isNull(_cursorIndexOfGroup)) {
              _tmpGroup = null;
            } else {
              _tmpGroup = _cursor.getString(_cursorIndexOfGroup);
            }
            final String _tmpFolderId;
            if (_cursor.isNull(_cursorIndexOfFolderId)) {
              _tmpFolderId = null;
            } else {
              _tmpFolderId = _cursor.getString(_cursorIndexOfFolderId);
            }
            final String _tmpAge;
            if (_cursor.isNull(_cursorIndexOfAge)) {
              _tmpAge = null;
            } else {
              _tmpAge = _cursor.getString(_cursorIndexOfAge);
            }
            final String _tmpSex;
            if (_cursor.isNull(_cursorIndexOfSex)) {
              _tmpSex = null;
            } else {
              _tmpSex = _cursor.getString(_cursorIndexOfSex);
            }
            final String _tmpBedNumber;
            if (_cursor.isNull(_cursorIndexOfBedNumber)) {
              _tmpBedNumber = null;
            } else {
              _tmpBedNumber = _cursor.getString(_cursorIndexOfBedNumber);
            }
            final String _tmpChiefComplaint;
            _tmpChiefComplaint = _cursor.getString(_cursorIndexOfChiefComplaint);
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final Long _tmpArchivedAt;
            if (_cursor.isNull(_cursorIndexOfArchivedAt)) {
              _tmpArchivedAt = null;
            } else {
              _tmpArchivedAt = _cursor.getLong(_cursorIndexOfArchivedAt);
            }
            final int _tmpPagesCount;
            _tmpPagesCount = _cursor.getInt(_cursorIndexOfPagesCount);
            final String _tmpTemplateId;
            if (_cursor.isNull(_cursorIndexOfTemplateId)) {
              _tmpTemplateId = null;
            } else {
              _tmpTemplateId = _cursor.getString(_cursorIndexOfTemplateId);
            }
            final String _tmpTemplateTitle;
            if (_cursor.isNull(_cursorIndexOfTemplateTitle)) {
              _tmpTemplateTitle = null;
            } else {
              _tmpTemplateTitle = _cursor.getString(_cursorIndexOfTemplateTitle);
            }
            final List<EncounterChecklistInstance> _tmpChecklists;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfChecklists);
            _tmpChecklists = __converters.toChecklists(_tmp);
            final String _tmpGeneralNotes;
            if (_cursor.isNull(_cursorIndexOfGeneralNotes)) {
              _tmpGeneralNotes = null;
            } else {
              _tmpGeneralNotes = _cursor.getString(_cursorIndexOfGeneralNotes);
            }
            final List<MedicalImage> _tmpImages;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfImages);
            _tmpImages = __converters.toImages(_tmp_1);
            final List<MedicalLink> _tmpLinks;
            final String _tmp_2;
            _tmp_2 = _cursor.getString(_cursorIndexOfLinks);
            _tmpLinks = __converters.toLinks(_tmp_2);
            final List<String> _tmpTags;
            final String _tmp_3;
            _tmp_3 = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp_3);
            final boolean _tmpIsPinned;
            final int _tmp_4;
            _tmp_4 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_4 != 0;
            final long _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getLong(_cursorIndexOfCreatedAt);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final boolean _tmpIsDeleted;
            final int _tmp_5;
            _tmp_5 = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp_5 != 0;
            _item = new PatientEncounter(_tmpId,_tmpPatientIdentifier,_tmpFacility,_tmpGroup,_tmpFolderId,_tmpAge,_tmpSex,_tmpBedNumber,_tmpChiefComplaint,_tmpStatus,_tmpArchivedAt,_tmpPagesCount,_tmpTemplateId,_tmpTemplateTitle,_tmpChecklists,_tmpGeneralNotes,_tmpImages,_tmpLinks,_tmpTags,_tmpIsPinned,_tmpCreatedAt,_tmpUpdatedAt,_tmpIsDeleted);
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
  public Flow<List<PatientEncounter>> getArchivedEncounters() {
    final String _sql = "SELECT * FROM encounters WHERE isDeleted = 0 AND status = 'archived' ORDER BY updatedAt DESC";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 0);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"encounters"}, new Callable<List<PatientEncounter>>() {
      @Override
      @NonNull
      public List<PatientEncounter> call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfPatientIdentifier = CursorUtil.getColumnIndexOrThrow(_cursor, "patientIdentifier");
          final int _cursorIndexOfFacility = CursorUtil.getColumnIndexOrThrow(_cursor, "facility");
          final int _cursorIndexOfGroup = CursorUtil.getColumnIndexOrThrow(_cursor, "group");
          final int _cursorIndexOfFolderId = CursorUtil.getColumnIndexOrThrow(_cursor, "folderId");
          final int _cursorIndexOfAge = CursorUtil.getColumnIndexOrThrow(_cursor, "age");
          final int _cursorIndexOfSex = CursorUtil.getColumnIndexOrThrow(_cursor, "sex");
          final int _cursorIndexOfBedNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "bedNumber");
          final int _cursorIndexOfChiefComplaint = CursorUtil.getColumnIndexOrThrow(_cursor, "chiefComplaint");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfArchivedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "archivedAt");
          final int _cursorIndexOfPagesCount = CursorUtil.getColumnIndexOrThrow(_cursor, "pagesCount");
          final int _cursorIndexOfTemplateId = CursorUtil.getColumnIndexOrThrow(_cursor, "templateId");
          final int _cursorIndexOfTemplateTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "templateTitle");
          final int _cursorIndexOfChecklists = CursorUtil.getColumnIndexOrThrow(_cursor, "checklists");
          final int _cursorIndexOfGeneralNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "generalNotes");
          final int _cursorIndexOfImages = CursorUtil.getColumnIndexOrThrow(_cursor, "images");
          final int _cursorIndexOfLinks = CursorUtil.getColumnIndexOrThrow(_cursor, "links");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final List<PatientEncounter> _result = new ArrayList<PatientEncounter>(_cursor.getCount());
          while (_cursor.moveToNext()) {
            final PatientEncounter _item;
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpPatientIdentifier;
            _tmpPatientIdentifier = _cursor.getString(_cursorIndexOfPatientIdentifier);
            final String _tmpFacility;
            if (_cursor.isNull(_cursorIndexOfFacility)) {
              _tmpFacility = null;
            } else {
              _tmpFacility = _cursor.getString(_cursorIndexOfFacility);
            }
            final String _tmpGroup;
            if (_cursor.isNull(_cursorIndexOfGroup)) {
              _tmpGroup = null;
            } else {
              _tmpGroup = _cursor.getString(_cursorIndexOfGroup);
            }
            final String _tmpFolderId;
            if (_cursor.isNull(_cursorIndexOfFolderId)) {
              _tmpFolderId = null;
            } else {
              _tmpFolderId = _cursor.getString(_cursorIndexOfFolderId);
            }
            final String _tmpAge;
            if (_cursor.isNull(_cursorIndexOfAge)) {
              _tmpAge = null;
            } else {
              _tmpAge = _cursor.getString(_cursorIndexOfAge);
            }
            final String _tmpSex;
            if (_cursor.isNull(_cursorIndexOfSex)) {
              _tmpSex = null;
            } else {
              _tmpSex = _cursor.getString(_cursorIndexOfSex);
            }
            final String _tmpBedNumber;
            if (_cursor.isNull(_cursorIndexOfBedNumber)) {
              _tmpBedNumber = null;
            } else {
              _tmpBedNumber = _cursor.getString(_cursorIndexOfBedNumber);
            }
            final String _tmpChiefComplaint;
            _tmpChiefComplaint = _cursor.getString(_cursorIndexOfChiefComplaint);
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final Long _tmpArchivedAt;
            if (_cursor.isNull(_cursorIndexOfArchivedAt)) {
              _tmpArchivedAt = null;
            } else {
              _tmpArchivedAt = _cursor.getLong(_cursorIndexOfArchivedAt);
            }
            final int _tmpPagesCount;
            _tmpPagesCount = _cursor.getInt(_cursorIndexOfPagesCount);
            final String _tmpTemplateId;
            if (_cursor.isNull(_cursorIndexOfTemplateId)) {
              _tmpTemplateId = null;
            } else {
              _tmpTemplateId = _cursor.getString(_cursorIndexOfTemplateId);
            }
            final String _tmpTemplateTitle;
            if (_cursor.isNull(_cursorIndexOfTemplateTitle)) {
              _tmpTemplateTitle = null;
            } else {
              _tmpTemplateTitle = _cursor.getString(_cursorIndexOfTemplateTitle);
            }
            final List<EncounterChecklistInstance> _tmpChecklists;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfChecklists);
            _tmpChecklists = __converters.toChecklists(_tmp);
            final String _tmpGeneralNotes;
            if (_cursor.isNull(_cursorIndexOfGeneralNotes)) {
              _tmpGeneralNotes = null;
            } else {
              _tmpGeneralNotes = _cursor.getString(_cursorIndexOfGeneralNotes);
            }
            final List<MedicalImage> _tmpImages;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfImages);
            _tmpImages = __converters.toImages(_tmp_1);
            final List<MedicalLink> _tmpLinks;
            final String _tmp_2;
            _tmp_2 = _cursor.getString(_cursorIndexOfLinks);
            _tmpLinks = __converters.toLinks(_tmp_2);
            final List<String> _tmpTags;
            final String _tmp_3;
            _tmp_3 = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp_3);
            final boolean _tmpIsPinned;
            final int _tmp_4;
            _tmp_4 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_4 != 0;
            final long _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getLong(_cursorIndexOfCreatedAt);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final boolean _tmpIsDeleted;
            final int _tmp_5;
            _tmp_5 = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp_5 != 0;
            _item = new PatientEncounter(_tmpId,_tmpPatientIdentifier,_tmpFacility,_tmpGroup,_tmpFolderId,_tmpAge,_tmpSex,_tmpBedNumber,_tmpChiefComplaint,_tmpStatus,_tmpArchivedAt,_tmpPagesCount,_tmpTemplateId,_tmpTemplateTitle,_tmpChecklists,_tmpGeneralNotes,_tmpImages,_tmpLinks,_tmpTags,_tmpIsPinned,_tmpCreatedAt,_tmpUpdatedAt,_tmpIsDeleted);
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
  public Flow<PatientEncounter> getEncounterById(final String id) {
    final String _sql = "SELECT * FROM encounters WHERE id = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    return CoroutinesRoom.createFlow(__db, false, new String[] {"encounters"}, new Callable<PatientEncounter>() {
      @Override
      @Nullable
      public PatientEncounter call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfPatientIdentifier = CursorUtil.getColumnIndexOrThrow(_cursor, "patientIdentifier");
          final int _cursorIndexOfFacility = CursorUtil.getColumnIndexOrThrow(_cursor, "facility");
          final int _cursorIndexOfGroup = CursorUtil.getColumnIndexOrThrow(_cursor, "group");
          final int _cursorIndexOfFolderId = CursorUtil.getColumnIndexOrThrow(_cursor, "folderId");
          final int _cursorIndexOfAge = CursorUtil.getColumnIndexOrThrow(_cursor, "age");
          final int _cursorIndexOfSex = CursorUtil.getColumnIndexOrThrow(_cursor, "sex");
          final int _cursorIndexOfBedNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "bedNumber");
          final int _cursorIndexOfChiefComplaint = CursorUtil.getColumnIndexOrThrow(_cursor, "chiefComplaint");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfArchivedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "archivedAt");
          final int _cursorIndexOfPagesCount = CursorUtil.getColumnIndexOrThrow(_cursor, "pagesCount");
          final int _cursorIndexOfTemplateId = CursorUtil.getColumnIndexOrThrow(_cursor, "templateId");
          final int _cursorIndexOfTemplateTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "templateTitle");
          final int _cursorIndexOfChecklists = CursorUtil.getColumnIndexOrThrow(_cursor, "checklists");
          final int _cursorIndexOfGeneralNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "generalNotes");
          final int _cursorIndexOfImages = CursorUtil.getColumnIndexOrThrow(_cursor, "images");
          final int _cursorIndexOfLinks = CursorUtil.getColumnIndexOrThrow(_cursor, "links");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final PatientEncounter _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpPatientIdentifier;
            _tmpPatientIdentifier = _cursor.getString(_cursorIndexOfPatientIdentifier);
            final String _tmpFacility;
            if (_cursor.isNull(_cursorIndexOfFacility)) {
              _tmpFacility = null;
            } else {
              _tmpFacility = _cursor.getString(_cursorIndexOfFacility);
            }
            final String _tmpGroup;
            if (_cursor.isNull(_cursorIndexOfGroup)) {
              _tmpGroup = null;
            } else {
              _tmpGroup = _cursor.getString(_cursorIndexOfGroup);
            }
            final String _tmpFolderId;
            if (_cursor.isNull(_cursorIndexOfFolderId)) {
              _tmpFolderId = null;
            } else {
              _tmpFolderId = _cursor.getString(_cursorIndexOfFolderId);
            }
            final String _tmpAge;
            if (_cursor.isNull(_cursorIndexOfAge)) {
              _tmpAge = null;
            } else {
              _tmpAge = _cursor.getString(_cursorIndexOfAge);
            }
            final String _tmpSex;
            if (_cursor.isNull(_cursorIndexOfSex)) {
              _tmpSex = null;
            } else {
              _tmpSex = _cursor.getString(_cursorIndexOfSex);
            }
            final String _tmpBedNumber;
            if (_cursor.isNull(_cursorIndexOfBedNumber)) {
              _tmpBedNumber = null;
            } else {
              _tmpBedNumber = _cursor.getString(_cursorIndexOfBedNumber);
            }
            final String _tmpChiefComplaint;
            _tmpChiefComplaint = _cursor.getString(_cursorIndexOfChiefComplaint);
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final Long _tmpArchivedAt;
            if (_cursor.isNull(_cursorIndexOfArchivedAt)) {
              _tmpArchivedAt = null;
            } else {
              _tmpArchivedAt = _cursor.getLong(_cursorIndexOfArchivedAt);
            }
            final int _tmpPagesCount;
            _tmpPagesCount = _cursor.getInt(_cursorIndexOfPagesCount);
            final String _tmpTemplateId;
            if (_cursor.isNull(_cursorIndexOfTemplateId)) {
              _tmpTemplateId = null;
            } else {
              _tmpTemplateId = _cursor.getString(_cursorIndexOfTemplateId);
            }
            final String _tmpTemplateTitle;
            if (_cursor.isNull(_cursorIndexOfTemplateTitle)) {
              _tmpTemplateTitle = null;
            } else {
              _tmpTemplateTitle = _cursor.getString(_cursorIndexOfTemplateTitle);
            }
            final List<EncounterChecklistInstance> _tmpChecklists;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfChecklists);
            _tmpChecklists = __converters.toChecklists(_tmp);
            final String _tmpGeneralNotes;
            if (_cursor.isNull(_cursorIndexOfGeneralNotes)) {
              _tmpGeneralNotes = null;
            } else {
              _tmpGeneralNotes = _cursor.getString(_cursorIndexOfGeneralNotes);
            }
            final List<MedicalImage> _tmpImages;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfImages);
            _tmpImages = __converters.toImages(_tmp_1);
            final List<MedicalLink> _tmpLinks;
            final String _tmp_2;
            _tmp_2 = _cursor.getString(_cursorIndexOfLinks);
            _tmpLinks = __converters.toLinks(_tmp_2);
            final List<String> _tmpTags;
            final String _tmp_3;
            _tmp_3 = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp_3);
            final boolean _tmpIsPinned;
            final int _tmp_4;
            _tmp_4 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_4 != 0;
            final long _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getLong(_cursorIndexOfCreatedAt);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final boolean _tmpIsDeleted;
            final int _tmp_5;
            _tmp_5 = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp_5 != 0;
            _result = new PatientEncounter(_tmpId,_tmpPatientIdentifier,_tmpFacility,_tmpGroup,_tmpFolderId,_tmpAge,_tmpSex,_tmpBedNumber,_tmpChiefComplaint,_tmpStatus,_tmpArchivedAt,_tmpPagesCount,_tmpTemplateId,_tmpTemplateTitle,_tmpChecklists,_tmpGeneralNotes,_tmpImages,_tmpLinks,_tmpTags,_tmpIsPinned,_tmpCreatedAt,_tmpUpdatedAt,_tmpIsDeleted);
          } else {
            _result = null;
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
  public Object getEncounterDirect(final String id,
      final Continuation<? super PatientEncounter> $completion) {
    final String _sql = "SELECT * FROM encounters WHERE id = ? LIMIT 1";
    final RoomSQLiteQuery _statement = RoomSQLiteQuery.acquire(_sql, 1);
    int _argIndex = 1;
    _statement.bindString(_argIndex, id);
    final CancellationSignal _cancellationSignal = DBUtil.createCancellationSignal();
    return CoroutinesRoom.execute(__db, false, _cancellationSignal, new Callable<PatientEncounter>() {
      @Override
      @Nullable
      public PatientEncounter call() throws Exception {
        final Cursor _cursor = DBUtil.query(__db, _statement, false, null);
        try {
          final int _cursorIndexOfId = CursorUtil.getColumnIndexOrThrow(_cursor, "id");
          final int _cursorIndexOfPatientIdentifier = CursorUtil.getColumnIndexOrThrow(_cursor, "patientIdentifier");
          final int _cursorIndexOfFacility = CursorUtil.getColumnIndexOrThrow(_cursor, "facility");
          final int _cursorIndexOfGroup = CursorUtil.getColumnIndexOrThrow(_cursor, "group");
          final int _cursorIndexOfFolderId = CursorUtil.getColumnIndexOrThrow(_cursor, "folderId");
          final int _cursorIndexOfAge = CursorUtil.getColumnIndexOrThrow(_cursor, "age");
          final int _cursorIndexOfSex = CursorUtil.getColumnIndexOrThrow(_cursor, "sex");
          final int _cursorIndexOfBedNumber = CursorUtil.getColumnIndexOrThrow(_cursor, "bedNumber");
          final int _cursorIndexOfChiefComplaint = CursorUtil.getColumnIndexOrThrow(_cursor, "chiefComplaint");
          final int _cursorIndexOfStatus = CursorUtil.getColumnIndexOrThrow(_cursor, "status");
          final int _cursorIndexOfArchivedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "archivedAt");
          final int _cursorIndexOfPagesCount = CursorUtil.getColumnIndexOrThrow(_cursor, "pagesCount");
          final int _cursorIndexOfTemplateId = CursorUtil.getColumnIndexOrThrow(_cursor, "templateId");
          final int _cursorIndexOfTemplateTitle = CursorUtil.getColumnIndexOrThrow(_cursor, "templateTitle");
          final int _cursorIndexOfChecklists = CursorUtil.getColumnIndexOrThrow(_cursor, "checklists");
          final int _cursorIndexOfGeneralNotes = CursorUtil.getColumnIndexOrThrow(_cursor, "generalNotes");
          final int _cursorIndexOfImages = CursorUtil.getColumnIndexOrThrow(_cursor, "images");
          final int _cursorIndexOfLinks = CursorUtil.getColumnIndexOrThrow(_cursor, "links");
          final int _cursorIndexOfTags = CursorUtil.getColumnIndexOrThrow(_cursor, "tags");
          final int _cursorIndexOfIsPinned = CursorUtil.getColumnIndexOrThrow(_cursor, "isPinned");
          final int _cursorIndexOfCreatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "createdAt");
          final int _cursorIndexOfUpdatedAt = CursorUtil.getColumnIndexOrThrow(_cursor, "updatedAt");
          final int _cursorIndexOfIsDeleted = CursorUtil.getColumnIndexOrThrow(_cursor, "isDeleted");
          final PatientEncounter _result;
          if (_cursor.moveToFirst()) {
            final String _tmpId;
            _tmpId = _cursor.getString(_cursorIndexOfId);
            final String _tmpPatientIdentifier;
            _tmpPatientIdentifier = _cursor.getString(_cursorIndexOfPatientIdentifier);
            final String _tmpFacility;
            if (_cursor.isNull(_cursorIndexOfFacility)) {
              _tmpFacility = null;
            } else {
              _tmpFacility = _cursor.getString(_cursorIndexOfFacility);
            }
            final String _tmpGroup;
            if (_cursor.isNull(_cursorIndexOfGroup)) {
              _tmpGroup = null;
            } else {
              _tmpGroup = _cursor.getString(_cursorIndexOfGroup);
            }
            final String _tmpFolderId;
            if (_cursor.isNull(_cursorIndexOfFolderId)) {
              _tmpFolderId = null;
            } else {
              _tmpFolderId = _cursor.getString(_cursorIndexOfFolderId);
            }
            final String _tmpAge;
            if (_cursor.isNull(_cursorIndexOfAge)) {
              _tmpAge = null;
            } else {
              _tmpAge = _cursor.getString(_cursorIndexOfAge);
            }
            final String _tmpSex;
            if (_cursor.isNull(_cursorIndexOfSex)) {
              _tmpSex = null;
            } else {
              _tmpSex = _cursor.getString(_cursorIndexOfSex);
            }
            final String _tmpBedNumber;
            if (_cursor.isNull(_cursorIndexOfBedNumber)) {
              _tmpBedNumber = null;
            } else {
              _tmpBedNumber = _cursor.getString(_cursorIndexOfBedNumber);
            }
            final String _tmpChiefComplaint;
            _tmpChiefComplaint = _cursor.getString(_cursorIndexOfChiefComplaint);
            final String _tmpStatus;
            _tmpStatus = _cursor.getString(_cursorIndexOfStatus);
            final Long _tmpArchivedAt;
            if (_cursor.isNull(_cursorIndexOfArchivedAt)) {
              _tmpArchivedAt = null;
            } else {
              _tmpArchivedAt = _cursor.getLong(_cursorIndexOfArchivedAt);
            }
            final int _tmpPagesCount;
            _tmpPagesCount = _cursor.getInt(_cursorIndexOfPagesCount);
            final String _tmpTemplateId;
            if (_cursor.isNull(_cursorIndexOfTemplateId)) {
              _tmpTemplateId = null;
            } else {
              _tmpTemplateId = _cursor.getString(_cursorIndexOfTemplateId);
            }
            final String _tmpTemplateTitle;
            if (_cursor.isNull(_cursorIndexOfTemplateTitle)) {
              _tmpTemplateTitle = null;
            } else {
              _tmpTemplateTitle = _cursor.getString(_cursorIndexOfTemplateTitle);
            }
            final List<EncounterChecklistInstance> _tmpChecklists;
            final String _tmp;
            _tmp = _cursor.getString(_cursorIndexOfChecklists);
            _tmpChecklists = __converters.toChecklists(_tmp);
            final String _tmpGeneralNotes;
            if (_cursor.isNull(_cursorIndexOfGeneralNotes)) {
              _tmpGeneralNotes = null;
            } else {
              _tmpGeneralNotes = _cursor.getString(_cursorIndexOfGeneralNotes);
            }
            final List<MedicalImage> _tmpImages;
            final String _tmp_1;
            _tmp_1 = _cursor.getString(_cursorIndexOfImages);
            _tmpImages = __converters.toImages(_tmp_1);
            final List<MedicalLink> _tmpLinks;
            final String _tmp_2;
            _tmp_2 = _cursor.getString(_cursorIndexOfLinks);
            _tmpLinks = __converters.toLinks(_tmp_2);
            final List<String> _tmpTags;
            final String _tmp_3;
            _tmp_3 = _cursor.getString(_cursorIndexOfTags);
            _tmpTags = __converters.toStringList(_tmp_3);
            final boolean _tmpIsPinned;
            final int _tmp_4;
            _tmp_4 = _cursor.getInt(_cursorIndexOfIsPinned);
            _tmpIsPinned = _tmp_4 != 0;
            final long _tmpCreatedAt;
            _tmpCreatedAt = _cursor.getLong(_cursorIndexOfCreatedAt);
            final long _tmpUpdatedAt;
            _tmpUpdatedAt = _cursor.getLong(_cursorIndexOfUpdatedAt);
            final boolean _tmpIsDeleted;
            final int _tmp_5;
            _tmp_5 = _cursor.getInt(_cursorIndexOfIsDeleted);
            _tmpIsDeleted = _tmp_5 != 0;
            _result = new PatientEncounter(_tmpId,_tmpPatientIdentifier,_tmpFacility,_tmpGroup,_tmpFolderId,_tmpAge,_tmpSex,_tmpBedNumber,_tmpChiefComplaint,_tmpStatus,_tmpArchivedAt,_tmpPagesCount,_tmpTemplateId,_tmpTemplateTitle,_tmpChecklists,_tmpGeneralNotes,_tmpImages,_tmpLinks,_tmpTags,_tmpIsPinned,_tmpCreatedAt,_tmpUpdatedAt,_tmpIsDeleted);
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
