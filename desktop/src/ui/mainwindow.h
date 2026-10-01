#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QListWidget>
#include <QStackedWidget>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QComboBox>
#include <QTextEdit>
#include <QScrollArea>
#include <QVBoxLayout>
#include "../models/datamodels.h"
#include "../canvas/inkingcanvas.h"

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void onPatientSelected(int row);
    void onNewPatientClicked();
    void onDeletePatientClicked();
    void onSearchTextChanged(const QString &text);
    void onModeChanged(int index);
    void onPageChanged(int delta);
    void onAddPageClicked();
    void onExportPdf();
    void onExportImage();

    // Canvas slots
    void onToolSelected(PenTool tool);
    void onColorSelected(const QColor &color);
    void onSizeSelected(float size);
    void onUndo();
    void onRedo();
    void onClear();
    void updateUndoRedoState();

private:
    void setupUi();
    void setupMenuBar();
    void setupPatientSidebar();
    void setupCentralWorkspace();
    void setupStylusToolbar(QVBoxLayout *parentLayout);
    void refreshPatientList();
    void loadEncounter(const QString &id);
    void buildDossierView();

    // Data
    QVector<PatientEncounter> m_encounters;
    PatientEncounter m_currentEncounter;
    int m_currentPageIndex;

    // Sidebar UI
    QLineEdit *m_searchEdit;
    QListWidget *m_patientList;
    QPushButton *m_newPatientBtn;
    QPushButton *m_deletePatientBtn;

    // Header UI
    QLabel *m_patientTitleLabel;
    QLabel *m_patientDetailsLabel;
    QComboBox *m_modeSelector;
    QLabel *m_pageLabel;
    QPushButton *m_prevPageBtn;
    QPushButton *m_nextPageBtn;
    QPushButton *m_addPageBtn;

    // Central UI
    QStackedWidget *m_stackedWidget;
    InkingCanvas *m_canvas;
    QWidget *m_dossierWidget;
    QVBoxLayout *m_dossierLayout;
    QTextEdit *m_notesEdit;

    // Stylus toolbar action states
    QPushButton *m_undoBtn;
    QPushButton *m_redoBtn;
};

#endif // MAINWINDOW_H
