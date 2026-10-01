#include "ui/mainwindow.h"
#include "models/databasemanager.h"
#include <QApplication>
#include <QDir>
#include <QStandardPaths>

int main(int argc, char *argv[]) {
    QApplication a(argc, argv);
    a.setApplicationName("MedChecklist");
    a.setApplicationDisplayName("MedChecklist — Clinical Workstation");
    a.setOrganizationName("MedChecklist");

    // Initialize Database in AppData or working dir
    QString dataDir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QDir().mkpath(dataDir);
    QString dbPath = dataDir + "/medchecklist_desktop.db";

    DatabaseManager::instance().initDatabase(dbPath);

    MainWindow w;
    w.show();
    return a.exec();
}
