#include "mainwindow.h"
#include "newpatientdialog.h"
#include "../models/databasemanager.h"

#include <QSplitter>
#include <QHBoxLayout>
#include <QMenuBar>
#include <QMenu>
#include <QAction>
#include <QFileDialog>
#include <QMessageBox>
#include <QCheckBox>
#include <QGroupBox>
#include <QPdfWriter>
#include <QPainter>
#include <QStandardPaths>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , m_currentPageIndex(0)
{
    setWindowTitle("MedChecklist — Clinical Workstation");
    resize(1280, 840);

    setupUi();
    setupMenuBar();
    refreshPatientList();

    if (!m_encounters.isEmpty()) {
        m_patientList->setCurrentRow(0);
        onPatientSelected(0);
    }
}

MainWindow::~MainWindow() {}

void MainWindow::setupUi() {
    QWidget *centralWidget = new QWidget(this);
    setCentralWidget(centralWidget);

    QHBoxLayout *rootLayout = new QHBoxLayout(centralWidget);
    rootLayout->setContentsMargins(0, 0, 0, 0);

    QSplitter *splitter = new QSplitter(Qt::Horizontal, centralWidget);
    rootLayout->addWidget(splitter);

    // 1. Left Patient Sidebar
    QWidget *sidebarWidget = new QWidget(splitter);
    sidebarWidget->setMinimumWidth(260);
    sidebarWidget->setMaximumWidth(340);
    QVBoxLayout *sidebarLayout = new QVBoxLayout(sidebarWidget);
    sidebarLayout->setContentsMargins(8, 8, 8, 8);

    m_searchEdit = new QLineEdit(sidebarWidget);
    m_searchEdit->setPlaceholderText("Search patients, beds...");
    connect(m_searchEdit, &QLineEdit::textChanged, this, &MainWindow::onSearchTextChanged);
    sidebarLayout->addWidget(m_searchEdit);

    m_patientList = new QListWidget(sidebarWidget);
    connect(m_patientList, &QListWidget::currentRowChanged, this, &MainWindow::onPatientSelected);
    sidebarLayout->addWidget(m_patientList);

    QHBoxLayout *sidebarBtns = new QHBoxLayout();
    m_newPatientBtn = new QPushButton("+ New Admission", sidebarWidget);
    m_newPatientBtn->setStyleSheet("background-color: #4f46e5; color: white; font-weight: bold; padding: 6px; border-radius: 6px;");
    connect(m_newPatientBtn, &QPushButton::clicked, this, &MainWindow::onNewPatientClicked);
    sidebarBtns->addWidget(m_newPatientBtn);

    m_deletePatientBtn = new QPushButton("Archive", sidebarWidget);
    connect(m_deletePatientBtn, &QPushButton::clicked, this, &MainWindow::onDeletePatientClicked);
    sidebarBtns->addWidget(m_deletePatientBtn);

    sidebarLayout->addLayout(sidebarBtns);
    splitter->addWidget(sidebarWidget);

    // 2. Right Central Workspace
    QWidget *workspaceWidget = new QWidget(splitter);
    QVBoxLayout *workspaceLayout = new QVBoxLayout(workspaceWidget);
    workspaceLayout->setContentsMargins(8, 8, 8, 8);

    // Workspace Header Bar
    QWidget *headerWidget = new QWidget(workspaceWidget);
    headerWidget->setStyleSheet("background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 4px;");
    QHBoxLayout *headerLayout = new QHBoxLayout(headerWidget);

    QVBoxLayout *titleCol = new QVBoxLayout();
    m_patientTitleLabel = new QLabel("Select Patient", headerWidget);
    m_patientTitleLabel->setStyleSheet("font-size: 16px; font-weight: bold; color: #0f172a;");
    m_patientDetailsLabel = new QLabel("No patient selected", headerWidget);
    m_patientDetailsLabel->setStyleSheet("font-size: 11px; color: #64748b;");
    titleCol->addWidget(m_patientTitleLabel);
    titleCol->addWidget(m_patientDetailsLabel);
    headerLayout->addLayout(titleCol);

    headerLayout->addStretch();

    // Mode Selector: Inking Canvas vs Dossier
    m_modeSelector = new QComboBox(headerWidget);
    m_modeSelector->addItem("Bedside Canvas", 0);
    m_modeSelector->addItem("Dossier Checklists", 1);
    connect(m_modeSelector, QOverload<int>::of(&QComboBox::currentIndexChanged), this, &MainWindow::onModeChanged);
    headerLayout->addWidget(m_modeSelector);

    // Multi-page navigation
    m_pageLabel = new QLabel("Page 1/1", headerWidget);
    m_prevPageBtn = new QPushButton("<", headerWidget);
    m_prevPageBtn->setFixedWidth(28);
    connect(m_prevPageBtn, &QPushButton::clicked, this, [this]() { onPageChanged(-1); });

    m_nextPageBtn = new QPushButton(">", headerWidget);
    m_nextPageBtn->setFixedWidth(28);
    connect(m_nextPageBtn, &QPushButton::clicked, this, [this]() { onPageChanged(1); });

    m_addPageBtn = new QPushButton("+ Page", headerWidget);
    connect(m_addPageBtn, &QPushButton::clicked, this, &MainWindow::onAddPageClicked);

    headerLayout->addWidget(m_pageLabel);
    headerLayout->addWidget(m_prevPageBtn);
    headerLayout->addWidget(m_nextPageBtn);
    headerLayout->addWidget(m_addPageBtn);

    workspaceLayout->addWidget(headerWidget);

    // Stacked Central Area (Canvas vs Dossier)
    m_stackedWidget = new QStackedWidget(workspaceWidget);

    // Page 0: Canvas + Stylus Toolbar
    QWidget *canvasPageWidget = new QWidget(m_stackedWidget);
    QVBoxLayout *canvasPageLayout = new QVBoxLayout(canvasPageWidget);
    canvasPageLayout->setContentsMargins(0, 0, 0, 0);

    m_canvas = new InkingCanvas(canvasPageWidget);
    connect(m_canvas, &InkingCanvas::undoRedoChanged, this, &MainWindow::updateUndoRedoState);
    canvasPageLayout->addWidget(m_canvas);

    setupStylusToolbar(canvasPageLayout);
    m_stackedWidget->addWidget(canvasPageWidget);

    // Page 1: Dossier View (Checklists & Notes)
    QScrollArea *dossierScroll = new QScrollArea(m_stackedWidget);
    dossierScroll->setWidgetResizable(true);
    m_dossierWidget = new QWidget(dossierScroll);
    m_dossierLayout = new QVBoxLayout(m_dossierWidget);
    m_dossierLayout->setAlignment(Qt::AlignTop);
    dossierScroll->setWidget(m_dossierWidget);

    m_stackedWidget->addWidget(dossierScroll);

    workspaceLayout->addWidget(m_stackedWidget);
    splitter->addWidget(workspaceWidget);
    splitter->setStretchFactor(0, 1);
    splitter->setStretchFactor(1, 4);
}

void MainWindow::setupStylusToolbar(QVBoxLayout *parentLayout) {
    QWidget *bar = new QWidget(this);
    bar->setStyleSheet("background-color: #f1f5f9; border-radius: 12px; padding: 4px;");
    QHBoxLayout *layout = new QHBoxLayout(bar);

    QPushButton *penBtn = new QPushButton("Pen", bar);
    connect(penBtn, &QPushButton::clicked, this, [this]() { onToolSelected(PenTool::Pen); });
    layout->addWidget(penBtn);

    QPushButton *highlighterBtn = new QPushButton("Highlighter", bar);
    connect(highlighterBtn, &QPushButton::clicked, this, [this]() { onToolSelected(PenTool::Highlighter); });
    layout->addWidget(highlighterBtn);

    QPushButton *eraserBtn = new QPushButton("Eraser", bar);
    connect(eraserBtn, &QPushButton::clicked, this, [this]() { onToolSelected(PenTool::Eraser); });
    layout->addWidget(eraserBtn);

    // Color buttons
    QVector<QPair<QString, QString>> colors = {
        {"Black", "#0f172a"}, {"Blue", "#38bdf8"}, {"Red", "#f87171"},
        {"Green", "#34d399"}, {"Amber", "#fbbf24"}
    };
    for (const auto &pair : colors) {
        QPushButton *colBtn = new QPushButton("", bar);
        colBtn->setFixedSize(22, 22);
        colBtn->setStyleSheet(QString("background-color: %1; border-radius: 11px; border: 1px solid gray;").arg(pair.second));
        connect(colBtn, &QPushButton::clicked, this, [this, pair]() { onColorSelected(QColor(pair.second)); });
        layout->addWidget(colBtn);
    }

    // Stroke Thickness
    QComboBox *sizeCombo = new QComboBox(bar);
    sizeCombo->addItem("Fine (2px)", 2.0f);
    sizeCombo->addItem("Medium (4px)", 4.0f);
    sizeCombo->addItem("Broad (8px)", 8.0f);
    sizeCombo->addItem("Marker (14px)", 14.0f);
    sizeCombo->setCurrentIndex(1);
    connect(sizeCombo, QOverload<int>::of(&QComboBox::currentIndexChanged), this, [this, sizeCombo](int idx) {
        onSizeSelected(sizeCombo->itemData(idx).toFloat());
    });
    layout->addWidget(sizeCombo);

    layout->addStretch();

    m_undoBtn = new QPushButton("Undo", bar);
    m_undoBtn->setEnabled(false);
    connect(m_undoBtn, &QPushButton::clicked, this, &MainWindow::onUndo);
    layout->addWidget(m_undoBtn);

    m_redoBtn = new QPushButton("Redo", bar);
    m_redoBtn->setEnabled(false);
    connect(m_redoBtn, &QPushButton::clicked, this, &MainWindow::onRedo);
    layout->addWidget(m_redoBtn);

    QPushButton *clearBtn = new QPushButton("Clear Page", bar);
    clearBtn->setStyleSheet("color: red;");
    connect(clearBtn, &QPushButton::clicked, this, &MainWindow::onClear);
    layout->addWidget(clearBtn);

    parentLayout->addWidget(bar);
}

void MainWindow::setupMenuBar() {
    QMenuBar *mb = menuBar();

    // File Menu
    QMenu *fileMenu = mb->addMenu("&File");
    QAction *newAct = fileMenu->addAction("&New Patient Admission", this, &MainWindow::onNewPatientClicked, QKeySequence::New);
    QAction *exportPdfAct = fileMenu->addAction("&Export Dossier as PDF...", this, &MainWindow::onExportPdf, QKeySequence("Ctrl+P"));
    QAction *exportImgAct = fileMenu->addAction("Export Canvas as Image...", this, &MainWindow::onExportImage);
    fileMenu->addSeparator();
    QAction *exitAct = fileMenu->addAction("E&xit", this, &QWidget::close, QKeySequence::Quit);

    // Edit Menu
    QMenu *editMenu = mb->addMenu("&Edit");
    QAction *undoAct = editMenu->addAction("&Undo Stroke", this, &MainWindow::onUndo, QKeySequence::Undo);
    QAction *redoAct = editMenu->addAction("&Redo Stroke", this, &MainWindow::onRedo, QKeySequence::Redo);
    QAction *clearAct = editMenu->addAction("&Clear Bedside Ink", this, &MainWindow::onClear);

    // View Menu
    QMenu *viewMenu = mb->addMenu("&View");
    QAction *canvasAct = viewMenu->addAction("Bedside &Canvas Mode", this, [this]() { m_modeSelector->setCurrentIndex(0); }, QKeySequence("Ctrl+1"));
    QAction *dossierAct = viewMenu->addAction("Clinical &Dossier Mode", this, [this]() { m_modeSelector->setCurrentIndex(1); }, QKeySequence("Ctrl+2"));
}

void MainWindow::refreshPatientList() {
    m_encounters = DatabaseManager::instance().getAllActiveEncounters();
    m_patientList->clear();

    QString query = m_searchEdit->text().trimmed().toLower();

    for (const auto &enc : m_encounters) {
        if (!query.isEmpty()) {
            bool match = enc.patientIdentifier.toLower().contains(query) ||
                         enc.bedNumber.toLower().contains(query) ||
                         enc.group.toLower().contains(query) ||
                         enc.chiefComplaint.toLower().contains(query);
            if (!match) continue;
        }

        QString label = enc.patientIdentifier;
        if (!enc.bedNumber.isEmpty()) {
            label += QString(" (Bed %1)").arg(enc.bedNumber);
        }
        if (!enc.group.isEmpty()) {
            label += QString(" • %1").arg(enc.group);
        }
        if (enc.isPinned) {
            label = "★ " + label;
        }

        QListWidgetItem *item = new QListWidgetItem(label, m_patientList);
        item->setData(Qt::UserRole, enc.id);
    }
}

void MainWindow::onSearchTextChanged(const QString &) {
    refreshPatientList();
}

void MainWindow::onPatientSelected(int row) {
    if (row < 0 || row >= m_patientList->count()) return;
    QListWidgetItem *item = m_patientList->item(row);
    if (!item) return;

    QString id = item->data(Qt::UserRole).toString();
    loadEncounter(id);
}

void MainWindow::loadEncounter(const QString &id) {
    bool found = false;
    m_currentEncounter = DatabaseManager::instance().getEncounterById(id, &found);
    if (!found) return;

    m_currentPageIndex = 0;
    m_patientTitleLabel->setText(m_currentEncounter.patientIdentifier);

    QString details = QString("Bed %1 • %2 • %3")
                          .arg(m_currentEncounter.bedNumber.isEmpty() ? "Unassigned" : m_currentEncounter.bedNumber)
                          .arg(m_currentEncounter.group.isEmpty() ? "Ward" : m_currentEncounter.group)
                          .arg(m_currentEncounter.facility.isEmpty() ? "Hospital" : m_currentEncounter.facility);
    m_patientDetailsLabel->setText(details);

    m_canvas->setEncounter(m_currentEncounter.id, m_currentPageIndex);
    m_pageLabel->setText(QString("Page %1/%2").arg(m_currentPageIndex + 1).arg(qMax(1, m_currentEncounter.pagesCount)));

    buildDossierView();
}

void MainWindow::onModeChanged(int index) {
    m_stackedWidget->setCurrentIndex(index);
}

void MainWindow::onPageChanged(int delta) {
    int newPage = m_currentPageIndex + delta;
    if (newPage >= 0 && newPage < m_currentEncounter.pagesCount) {
        m_currentPageIndex = newPage;
        m_canvas->setPageIndex(m_currentPageIndex);
        m_pageLabel->setText(QString("Page %1/%2").arg(m_currentPageIndex + 1).arg(m_currentEncounter.pagesCount));
    }
}

void MainWindow::onAddPageClicked() {
    m_currentEncounter.pagesCount++;
    DatabaseManager::instance().insertOrUpdateEncounter(m_currentEncounter);
    m_currentPageIndex = m_currentEncounter.pagesCount - 1;
    m_canvas->setPageIndex(m_currentPageIndex);
    m_pageLabel->setText(QString("Page %1/%2").arg(m_currentPageIndex + 1).arg(m_currentEncounter.pagesCount));
}

void MainWindow::buildDossierView() {
    // Clear previous dossier layout items
    QLayoutItem *child;
    while ((child = m_dossierLayout->takeAt(0)) != nullptr) {
        if (child->widget()) delete child->widget();
        delete child;
    }

    // 1. Clinical Notes Section
    QGroupBox *notesBox = new QGroupBox("Clinical Notes & Bedside Instructions", m_dossierWidget);
    QVBoxLayout *notesLayout = new QVBoxLayout(notesBox);

    m_notesEdit = new QTextEdit(notesBox);
    m_notesEdit->setPlainText(m_currentEncounter.generalNotes);
    m_notesEdit->setMinimumHeight(120);
    connect(m_notesEdit, &QTextEdit::textChanged, this, [this]() {
        m_currentEncounter.generalNotes = m_notesEdit->toPlainText();
        DatabaseManager::instance().insertOrUpdateEncounter(m_currentEncounter);
    });
    notesLayout->addWidget(m_notesEdit);
    m_dossierLayout->addWidget(notesBox);

    // 2. Attached Modular Checklists
    for (int cIdx = 0; cIdx < m_currentEncounter.checklists.size(); ++cIdx) {
        const auto &chk = m_currentEncounter.checklists[cIdx];
        QGroupBox *chkBox = new QGroupBox(chk.title, m_dossierWidget);
        chkBox->setStyleSheet("QGroupBox { font-weight: bold; color: #4338ca; }");
        QVBoxLayout *chkLayout = new QVBoxLayout(chkBox);

        for (int sIdx = 0; sIdx < chk.sections.size(); ++sIdx) {
            const auto &sec = chk.sections[sIdx];
            QLabel *secTitle = new QLabel(sec.title, chkBox);
            secTitle->setStyleSheet("font-weight: bold; color: #1e293b; padding-top: 6px;");
            chkLayout->addWidget(secTitle);

            for (int iIdx = 0; iIdx < sec.items.size(); ++iIdx) {
                const auto &item = sec.items[iIdx];
                QCheckBox *cb = new QCheckBox(item.text, chkBox);
                cb->setChecked(item.checked);

                connect(cb, &QCheckBox::toggled, this, [this, cIdx, sIdx, iIdx](bool checked) {
                    m_currentEncounter.checklists[cIdx].sections[sIdx].items[iIdx].checked = checked;
                    DatabaseManager::instance().insertOrUpdateEncounter(m_currentEncounter);
                });
                chkLayout->addWidget(cb);
            }
        }
        m_dossierLayout->addWidget(chkBox);
    }

    m_dossierLayout->addStretch();
}

void MainWindow::onNewPatientClicked() {
    NewPatientDialog dlg(this);
    if (dlg.exec() == QDialog::Accepted) {
        PatientEncounter newEnc = dlg.getEncounter();
        DatabaseManager::instance().insertOrUpdateEncounter(newEnc);
        refreshPatientList();
        loadEncounter(newEnc.id);
    }
}

void MainWindow::onDeletePatientClicked() {
    if (m_currentEncounter.id.isEmpty()) return;

    auto reply = QMessageBox::question(
        this,
        "Archive Patient",
        QString("Archive %1 from active rounds?").arg(m_currentEncounter.patientIdentifier),
        QMessageBox::Yes | QMessageBox::No
    );

    if (reply == QMessageBox::Yes) {
        DatabaseManager::instance().softDeleteEncounter(m_currentEncounter.id);
        refreshPatientList();
        if (m_patientList->count() > 0) {
            m_patientList->setCurrentRow(0);
        }
    }
}

void MainWindow::onToolSelected(PenTool tool) {
    m_canvas->setTool(tool);
}

void MainWindow::onColorSelected(const QColor &color) {
    m_canvas->setColor(color);
}

void MainWindow::onSizeSelected(float size) {
    m_canvas->setStrokeSize(size);
}

void MainWindow::onUndo() {
    m_canvas->undo();
}

void MainWindow::onRedo() {
    m_canvas->redo();
}

void MainWindow::onClear() {
    m_canvas->clearPage();
}

void MainWindow::updateUndoRedoState() {
    m_undoBtn->setEnabled(m_canvas->canUndo());
    m_redoBtn->setEnabled(m_canvas->canRedo());
}

void MainWindow::onExportPdf() {
    if (m_currentEncounter.id.isEmpty()) return;

    QString defaultName = QString("%1_dossier.pdf").arg(m_currentEncounter.patientIdentifier.replace(QRegularExpression("[^a-zA-Z0-9_-]"), "_"));
    QString filePath = QFileDialog::getSaveFileName(this, "Export Clinical Dossier to PDF", defaultName, "PDF Files (*.pdf)");
    if (filePath.isEmpty()) return;

    QPdfWriter writer(filePath);
    writer.setPageSize(QPageSize(QPageSize::A4));
    writer.setResolution(300);

    QPainter painter(&writer);
    painter.setPen(Qt::black);

    // Header
    QFont titleFont("Arial", 16, QFont::Bold);
    painter.setFont(titleFont);
    painter.drawText(100, 150, "MedChecklist — Bedside Clinical Record");

    QFont subFont("Arial", 11);
    painter.setFont(subFont);
    painter.drawText(100, 220, QString("Patient: %1    Bed: %2    Ward: %3")
                                   .arg(m_currentEncounter.patientIdentifier)
                                   .arg(m_currentEncounter.bedNumber)
                                   .arg(m_currentEncounter.group));
    painter.drawText(100, 280, QString("Chief Complaint: %1").arg(m_currentEncounter.chiefComplaint));
    painter.drawLine(100, 310, 2300, 310);

    // Notes
    painter.drawText(100, 370, "Clinical Notes & Instructions:");
    painter.drawText(QRectF(100, 400, 2200, 600), m_currentEncounter.generalNotes);

    // Vector inking overlay
    writer.newPage();
    painter.drawText(100, 150, QString("Bedside Inking Notes (Page %1)").arg(m_currentPageIndex + 1));
    m_canvas->render(&painter);

    painter.end();
    QMessageBox::information(this, "PDF Export Complete", QString("Exported clinical dossier to:\n%1").arg(filePath));
}

void MainWindow::onExportImage() {
    if (m_currentEncounter.id.isEmpty()) return;

    QString defaultName = QString("%1_canvas_page%2.png").arg(m_currentEncounter.patientIdentifier.replace(QRegularExpression("[^a-zA-Z0-9_-]"), "_")).arg(m_currentPageIndex + 1);
    QString filePath = QFileDialog::getSaveFileName(this, "Export Canvas Image", defaultName, "PNG Images (*.png)");
    if (filePath.isEmpty()) return;

    QImage image(m_canvas->scene()->sceneRect().size().toSize(), QImage::Format_ARGB32);
    image.fill(Qt::white);

    QPainter painter(&image);
    painter.setRenderHint(QPainter::Antialiasing);
    m_canvas->scene()->render(&painter);
    painter.end();

    if (image.save(filePath)) {
        QMessageBox::information(this, "Image Export Complete", QString("Exported canvas image to:\n%1").arg(filePath));
    }
}
