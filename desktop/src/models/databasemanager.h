#ifndef DATABASEMANAGER_H
#define DATABASEMANAGER_H

#include <QObject>
#include <QSqlDatabase>
#include <QSqlQuery>
#include <QSqlError>
#include <QVector>
#include "datamodels.h"

class DatabaseManager : public QObject {
    Q_OBJECT

public:
    static DatabaseManager& instance();

    bool initDatabase(const QString &dbPath = "medchecklist_desktop.db");

    // Encounter Operations
    QVector<PatientEncounter> getAllActiveEncounters();
    QVector<PatientEncounter> getArchivedEncounters();
    PatientEncounter getEncounterById(const QString &id, bool *found = nullptr);
    bool insertOrUpdateEncounter(const PatientEncounter &encounter);
    bool softDeleteEncounter(const QString &id);
    bool togglePin(const QString &id);

    // Ink Stroke Operations
    QVector<InkStroke> getStrokesForPage(const QString &encounterId, int pageIndex);
    bool insertStroke(const InkStroke &stroke);
    bool clearPageStrokes(const QString &encounterId, int pageIndex);
    bool deleteStrokesByIds(const QStringList &ids);

private:
    DatabaseManager(QObject *parent = nullptr);
    ~DatabaseManager();
    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    bool createTables();
    void seedDefaultData();

    QSqlDatabase m_db;
};

#endif // DATABASEMANAGER_H
