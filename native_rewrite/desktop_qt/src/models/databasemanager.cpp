#include "databasemanager.h"
#include <QDebug>
#include <QUuid>
#include <QDateTime>

DatabaseManager::DatabaseManager(QObject *parent) : QObject(parent) {}

DatabaseManager::~DatabaseManager() {
    if (m_db.isOpen()) {
        m_db.close();
    }
}

DatabaseManager& DatabaseManager::instance() {
    static DatabaseManager s_instance;
    return s_instance;
}

bool DatabaseManager::initDatabase(const QString &dbPath) {
    m_db = QSqlDatabase::addDatabase("QSQLITE");
    m_db.setDatabaseName(dbPath);

    if (!m_db.open()) {
        qCritical() << "Failed to open SQLite database:" << m_db.lastError().text();
        return false;
    }

    if (!createTables()) {
        return false;
    }

    // Check if initial seeding is needed
    QSqlQuery query("SELECT COUNT(*) FROM encounters", m_db);
    if (query.next() && query.value(0).toInt() == 0) {
        seedDefaultData();
    }

    return true;
}

bool DatabaseManager::createTables() {
    QSqlQuery q(m_db);

    // 1. Encounters Table
    bool ok = q.exec(
        "CREATE TABLE IF NOT EXISTS encounters ("
        "  id TEXT PRIMARY KEY,"
        "  patient_identifier TEXT NOT NULL,"
        "  facility TEXT,"
        "  ward_group TEXT,"
        "  bed_number TEXT,"
        "  age TEXT,"
        "  sex TEXT,"
        "  chief_complaint TEXT,"
        "  status TEXT DEFAULT 'active',"
        "  general_notes TEXT,"
        "  checklists_json TEXT,"
        "  is_pinned INTEGER DEFAULT 0,"
        "  pages_count INTEGER DEFAULT 1,"
        "  created_at INTEGER,"
        "  updated_at INTEGER,"
        "  is_deleted INTEGER DEFAULT 0"
        ")"
    );
    if (!ok) {
        qCritical() << "Error creating encounters table:" << q.lastError().text();
        return false;
    }

    // 2. Ink Strokes Table
    ok = q.exec(
        "CREATE TABLE IF NOT EXISTS ink_strokes ("
        "  id TEXT PRIMARY KEY,"
        "  encounter_id TEXT NOT NULL,"
        "  page_index INTEGER NOT NULL,"
        "  tool TEXT NOT NULL,"
        "  color TEXT NOT NULL,"
        "  size REAL NOT NULL,"
        "  opacity REAL NOT NULL,"
        "  points_json TEXT NOT NULL,"
        "  timestamp INTEGER NOT NULL,"
        "  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE"
        ")"
    );
    if (!ok) {
        qCritical() << "Error creating ink_strokes table:" << q.lastError().text();
        return false;
    }

    return true;
}

void DatabaseManager::seedDefaultData() {
    PatientEncounter demo;
    demo.id = "demo-patient-1";
    demo.patientIdentifier = "Bed 4 - Smith, J.";
    demo.facility = "City General Hospital";
    demo.group = "Cardiology Ward";
    demo.bedNumber = "4";
    demo.age = "62";
    demo.sex = "M";
    demo.chiefComplaint = "Substernal chest pressure radiating to left arm x 2 hours";
    demo.status = "active";
    demo.generalNotes = "### Bedside Rounds Note\nPatient admitted via ED for acute chest pain. EKG shows T-wave inversions in V4-V6.\n\n- [ ] Follow up repeat high-sensitivity Troponin at 14:00\n- [ ] Bedside echocardiogram scheduled";
    demo.isPinned = true;
    demo.pagesCount = 1;

    // Default Checklist: Cardiovascular & Respiratory Signs
    EncounterChecklist chk;
    chk.id = "chk-ros-cardio";
    chk.templateId = "tmpl-cardio";
    chk.title = "Cardiovascular & Respiratory Signs";
    chk.institution = "Standard Clinical Guidelines";

    ChecklistSection sec;
    sec.id = "sec-cv-1";
    sec.title = "Cardiovascular Signs";

    ChecklistItem it1;
    it1.id = "it-1";
    it1.text = "Chest pain or pressure (substernal / pleuritic)";
    it1.starred = true;
    it1.checked = true;
    sec.items.append(it1);

    ChecklistItem it2;
    it2.id = "it-2";
    it2.text = "Dyspnea on exertion or at rest";
    it2.checked = true;
    sec.items.append(it2);

    ChecklistItem it3;
    it3.id = "it-3";
    it3.text = "Orthopnea (2+ pillows) or PND";
    sec.items.append(it3);

    ChecklistItem it4;
    it4.id = "it-4";
    it4.text = "Bilateral lower extremity edema";
    sec.items.append(it4);

    chk.sections.append(sec);
    demo.checklists.append(chk);

    insertOrUpdateEncounter(demo);
}

QVector<PatientEncounter> DatabaseManager::getAllActiveEncounters() {
    QVector<PatientEncounter> list;
    QSqlQuery q("SELECT * FROM encounters WHERE is_deleted = 0 AND status = 'active' ORDER BY is_pinned DESC, updated_at DESC", m_db);

    while (q.next()) {
        PatientEncounter enc;
        enc.id = q.value("id").toString();
        enc.patientIdentifier = q.value("patient_identifier").toString();
        enc.facility = q.value("facility").toString();
        enc.group = q.value("ward_group").toString();
        enc.bedNumber = q.value("bed_number").toString();
        enc.age = q.value("age").toString();
        enc.sex = q.value("sex").toString();
        enc.chiefComplaint = q.value("chief_complaint").toString();
        enc.status = q.value("status").toString();
        enc.generalNotes = q.value("general_notes").toString();
        enc.isPinned = q.value("is_pinned").toInt() == 1;
        enc.pagesCount = q.value("pages_count").toInt();
        enc.createdAt = q.value("created_at").toLongLong();
        enc.updatedAt = q.value("updated_at").toLongLong();

        QString jsonStr = q.value("checklists_json").toString();
        if (!jsonStr.isEmpty()) {
            QJsonDocument doc = QJsonDocument::fromJson(jsonStr.toUtf8());
            QJsonArray arr = doc.array();
            for (const auto &val : arr) {
                enc.checklists.append(EncounterChecklist::fromJson(val.toObject()));
            }
        }
        list.append(enc);
    }
    return list;
}

QVector<PatientEncounter> DatabaseManager::getArchivedEncounters() {
    QVector<PatientEncounter> list;
    QSqlQuery q("SELECT * FROM encounters WHERE is_deleted = 0 AND status = 'archived' ORDER BY updated_at DESC", m_db);

    while (q.next()) {
        PatientEncounter enc;
        enc.id = q.value("id").toString();
        enc.patientIdentifier = q.value("patient_identifier").toString();
        enc.facility = q.value("facility").toString();
        enc.group = q.value("ward_group").toString();
        enc.bedNumber = q.value("bed_number").toString();
        enc.chiefComplaint = q.value("chief_complaint").toString();
        enc.status = q.value("status").toString();
        enc.generalNotes = q.value("general_notes").toString();
        enc.isPinned = q.value("is_pinned").toInt() == 1;
        enc.pagesCount = q.value("pages_count").toInt();
        enc.createdAt = q.value("created_at").toLongLong();
        enc.updatedAt = q.value("updated_at").toLongLong();
        list.append(enc);
    }
    return list;
}

PatientEncounter DatabaseManager::getEncounterById(const QString &id, bool *found) {
    QSqlQuery q(m_db);
    q.prepare("SELECT * FROM encounters WHERE id = :id LIMIT 1");
    q.bindValue(":id", id);

    if (q.exec() && q.next()) {
        if (found) *found = true;
        PatientEncounter enc;
        enc.id = q.value("id").toString();
        enc.patientIdentifier = q.value("patient_identifier").toString();
        enc.facility = q.value("facility").toString();
        enc.group = q.value("ward_group").toString();
        enc.bedNumber = q.value("bed_number").toString();
        enc.age = q.value("age").toString();
        enc.sex = q.value("sex").toString();
        enc.chiefComplaint = q.value("chief_complaint").toString();
        enc.status = q.value("status").toString();
        enc.generalNotes = q.value("general_notes").toString();
        enc.isPinned = q.value("is_pinned").toInt() == 1;
        enc.pagesCount = q.value("pages_count").toInt();
        enc.createdAt = q.value("created_at").toLongLong();
        enc.updatedAt = q.value("updated_at").toLongLong();

        QString jsonStr = q.value("checklists_json").toString();
        if (!jsonStr.isEmpty()) {
            QJsonDocument doc = QJsonDocument::fromJson(jsonStr.toUtf8());
            QJsonArray arr = doc.array();
            for (const auto &val : arr) {
                enc.checklists.append(EncounterChecklist::fromJson(val.toObject()));
            }
        }
        return enc;
    }
    if (found) *found = false;
    return PatientEncounter();
}

bool DatabaseManager::insertOrUpdateEncounter(const PatientEncounter &enc) {
    QSqlQuery q(m_db);
    q.prepare(
        "INSERT OR REPLACE INTO encounters ("
        "  id, patient_identifier, facility, ward_group, bed_number, age, sex, "
        "  chief_complaint, status, general_notes, checklists_json, is_pinned, "
        "  pages_count, created_at, updated_at, is_deleted"
        ") VALUES ("
        "  :id, :pid, :fac, :grp, :bed, :age, :sex, :cc, :status, :notes, :chks, "
        "  :pinned, :pages, :created, :updated, 0"
        ")"
    );

    q.bindValue(":id", enc.id.isEmpty() ? QUuid::createUuid().toString(QUuid::WithoutBraces) : enc.id);
    q.bindValue(":pid", enc.patientIdentifier);
    q.bindValue(":fac", enc.facility);
    q.bindValue(":grp", enc.group);
    q.bindValue(":bed", enc.bedNumber);
    q.bindValue(":age", enc.age);
    q.bindValue(":sex", enc.sex);
    q.bindValue(":cc", enc.chiefComplaint);
    q.bindValue(":status", enc.status);
    q.bindValue(":notes", enc.generalNotes);

    QJsonArray chkArr;
    for (const auto &c : enc.checklists) chkArr.append(c.toJson());
    QJsonDocument doc(chkArr);
    q.bindValue(":chks", QString::fromUtf8(doc.toJson(QJsonDocument::Compact)));

    q.bindValue(":pinned", enc.isPinned ? 1 : 0);
    q.bindValue(":pages", qMax(1, enc.pagesCount));
    q.bindValue(":created", enc.createdAt);
    q.bindValue(":updated", QDateTime::currentMSecsSinceEpoch());

    return q.exec();
}

bool DatabaseManager::softDeleteEncounter(const QString &id) {
    QSqlQuery q(m_db);
    q.prepare("UPDATE encounters SET is_deleted = 1, updated_at = :time WHERE id = :id");
    q.bindValue(":time", QDateTime::currentMSecsSinceEpoch());
    q.bindValue(":id", id);
    return q.exec();
}

bool DatabaseManager::togglePin(const QString &id) {
    QSqlQuery q(m_db);
    q.prepare("UPDATE encounters SET is_pinned = NOT is_pinned, updated_at = :time WHERE id = :id");
    q.bindValue(":time", QDateTime::currentMSecsSinceEpoch());
    q.bindValue(":id", id);
    return q.exec();
}

QVector<InkStroke> DatabaseManager::getStrokesForPage(const QString &encounterId, int pageIndex) {
    QVector<InkStroke> list;
    QSqlQuery q(m_db);
    q.prepare("SELECT * FROM ink_strokes WHERE encounterId = :encId AND page_index = :page ORDER BY timestamp ASC");
    q.bindValue(":encId", encounterId);
    q.bindValue(":page", pageIndex);

    if (q.exec()) {
        while (q.next()) {
            InkStroke s;
            s.id = q.value("id").toString();
            s.encounterId = q.value("encounter_id").toString();
            s.pageIndex = q.value("page_index").toInt();
            s.tool = q.value("tool").toString();
            s.color = q.value("color").toString();
            s.size = q.value("size").toFloat();
            s.opacity = q.value("opacity").toFloat();
            s.timestamp = q.value("timestamp").toLongLong();

            QString ptsStr = q.value("points_json").toString();
            QJsonDocument doc = QJsonDocument::fromJson(ptsStr.toUtf8());
            QJsonArray arr = doc.array();
            for (const auto &val : arr) {
                s.points.append(StrokePoint::fromJson(val.toObject()));
            }
            list.append(s);
        }
    }
    return list;
}

bool DatabaseManager::insertStroke(const InkStroke &stroke) {
    QSqlQuery q(m_db);
    q.prepare(
        "INSERT OR REPLACE INTO ink_strokes ("
        "  id, encounter_id, page_index, tool, color, size, opacity, points_json, timestamp"
        ") VALUES ("
        "  :id, :encId, :page, :tool, :col, :size, :op, :pts, :time"
        ")"
    );

    q.bindValue(":id", stroke.id.isEmpty() ? QUuid::createUuid().toString(QUuid::WithoutBraces) : stroke.id);
    q.bindValue(":encId", stroke.encounterId);
    q.bindValue(":page", stroke.pageIndex);
    q.bindValue(":tool", stroke.tool);
    q.bindValue(":col", stroke.color);
    q.bindValue(":size", stroke.size);
    q.bindValue(":op", stroke.opacity);

    QJsonArray ptsArr;
    for (const auto &p : stroke.points) ptsArr.append(p.toJson());
    QJsonDocument doc(ptsArr);
    q.bindValue(":pts", QString::fromUtf8(doc.toJson(QJsonDocument::Compact)));
    q.bindValue(":time", stroke.timestamp);

    return q.exec();
}

bool DatabaseManager::clearPageStrokes(const QString &encounterId, int pageIndex) {
    QSqlQuery q(m_db);
    q.prepare("DELETE FROM ink_strokes WHERE encounter_id = :encId AND page_index = :page");
    q.bindValue(":encId", encounterId);
    q.bindValue(":page", pageIndex);
    return q.exec();
}

bool DatabaseManager::deleteStrokesByIds(const QStringList &ids) {
    if (ids.isEmpty()) return true;
    QStringList placeholders;
    for (int i = 0; i < ids.size(); ++i) placeholders.append("?");

    QSqlQuery q(m_db);
    q.prepare(QString("DELETE FROM ink_strokes WHERE id IN (%1)").arg(placeholders.join(",")));
    for (int i = 0; i < ids.size(); ++i) {
        q.addBindValue(ids.at(i));
    }
    return q.exec();
}
