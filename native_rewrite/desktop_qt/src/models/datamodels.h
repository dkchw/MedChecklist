#ifndef DATAMODELS_H
#define DATAMODELS_H

#include <QString>
#include <QVector>
#include <QPointF>
#include <QDateTime>
#include <QJsonObject>
#include <QJsonArray>
#include <QJsonDocument>

struct StrokePoint {
    float x;
    float y;
    float pressure;

    StrokePoint() : x(0), y(0), pressure(0.5f) {}
    StrokePoint(float _x, float _y, float _p = 0.5f) : x(_x), y(_y), pressure(_p) {}

    QJsonObject toJson() const {
        QJsonObject obj;
        obj["x"] = x;
        obj["y"] = y;
        obj["p"] = pressure;
        return obj;
    }

    static StrokePoint fromJson(const QJsonObject &obj) {
        return StrokePoint(obj["x"].toDouble(), obj["y"].toDouble(), obj["p"].toDouble(0.5));
    }
};

enum class PenTool {
    Pen,
    Highlighter,
    Eraser
};

struct InkStroke {
    QString id;
    QString encounterId;
    int pageIndex;
    QString tool; // "pen", "highlighter", "eraser"
    QString color;
    float size;
    float opacity;
    QVector<StrokePoint> points;
    qint64 timestamp;

    InkStroke() : pageIndex(0), tool("pen"), color("#0f172a"), size(3.0f), opacity(1.0f), timestamp(QDateTime::currentMSecsSinceEpoch()) {}
};

struct ChecklistItem {
    QString id;
    QString text;
    bool checked;
    bool starred;
    QString note;
    QString referenceValue;
    QString labValue;

    ChecklistItem() : checked(false), starred(false) {}

    QJsonObject toJson() const {
        QJsonObject obj;
        obj["id"] = id;
        obj["text"] = text;
        obj["checked"] = checked;
        obj["starred"] = starred;
        obj["note"] = note;
        obj["referenceValue"] = referenceValue;
        obj["labValue"] = labValue;
        return obj;
    }

    static ChecklistItem fromJson(const QJsonObject &obj) {
        ChecklistItem it;
        it.id = obj["id"].toString();
        it.text = obj["text"].toString();
        it.checked = obj["checked"].toBool();
        it.starred = obj["starred"].toBool();
        it.note = obj["note"].toString();
        it.referenceValue = obj["referenceValue"].toString();
        it.labValue = obj["labValue"].toString();
        return it;
    }
};

struct ChecklistSection {
    QString id;
    QString title;
    QString description;
    QVector<ChecklistItem> items;

    QJsonObject toJson() const {
        QJsonObject obj;
        obj["id"] = id;
        obj["title"] = title;
        obj["description"] = description;
        QJsonArray arr;
        for (const auto &it : items) arr.append(it.toJson());
        obj["items"] = arr;
        return obj;
    }

    static ChecklistSection fromJson(const QJsonObject &obj) {
        ChecklistSection sec;
        sec.id = obj["id"].toString();
        sec.title = obj["title"].toString();
        sec.description = obj["description"].toString();
        QJsonArray arr = obj["items"].toArray();
        for (const auto &val : arr) sec.items.append(ChecklistItem::fromJson(val.toObject()));
        return sec;
    }
};

struct EncounterChecklist {
    QString id;
    QString templateId;
    QString title;
    QString institution;
    QVector<ChecklistSection> sections;

    QJsonObject toJson() const {
        QJsonObject obj;
        obj["id"] = id;
        obj["templateId"] = templateId;
        obj["title"] = title;
        obj["institution"] = institution;
        QJsonArray arr;
        for (const auto &sec : sections) arr.append(sec.toJson());
        obj["sections"] = arr;
        return obj;
    }

    static EncounterChecklist fromJson(const QJsonObject &obj) {
        EncounterChecklist chk;
        chk.id = obj["id"].toString();
        chk.templateId = obj["templateId"].toString();
        chk.title = obj["title"].toString();
        chk.institution = obj["institution"].toString();
        QJsonArray arr = obj["sections"].toArray();
        for (const auto &val : arr) chk.sections.append(ChecklistSection::fromJson(val.toObject()));
        return chk;
    }
};

struct PatientEncounter {
    QString id;
    QString patientIdentifier;
    QString facility;
    QString group; // ward / block
    QString bedNumber;
    QString age;
    QString sex;
    QString chiefComplaint;
    QString status; // "active" or "archived"
    QString generalNotes;
    QVector<EncounterChecklist> checklists;
    bool isPinned;
    int pagesCount;
    qint64 createdAt;
    qint64 updatedAt;

    PatientEncounter()
        : status("active")
        , isPinned(false)
        , pagesCount(1)
        , createdAt(QDateTime::currentMSecsSinceEpoch())
        , updatedAt(QDateTime::currentMSecsSinceEpoch()) {}
};

#endif // DATAMODELS_H
