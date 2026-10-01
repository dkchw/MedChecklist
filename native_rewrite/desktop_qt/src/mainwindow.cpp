#include "mainwindow.h"
#include <QVBoxLayout>

MainWindow::MainWindow(QWidget *parent) : QMainWindow(parent) {
    setWindowTitle("MedChecklist (Qt Native)");
    resize(1024, 768);

    QWidget *central = new QWidget(this);
    setCentralWidget(central);
    
    QVBoxLayout *layout = new QVBoxLayout(central);
    
    scene = new QGraphicsScene(this);
    view = new QGraphicsView(scene);
    view->setRenderHint(QPainter::Antialiasing);
    
    layout->addWidget(view);
    
    // Demo Text
    scene->addText("MedChecklist Qt C++ Proof-of-Concept Canvas");
}

MainWindow::~MainWindow() {}
