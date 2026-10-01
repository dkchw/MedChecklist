#ifndef INKINGCANVAS_H
#define INKINGCANVAS_H

#include <QGraphicsView>
#include <QGraphicsScene>
#include <QGraphicsPathItem>
#include <QMouseEvent>
#include <QTabletEvent>
#include <QWheelEvent>
#include <QVector>
#include <QStack>
#include "../models/datamodels.h"

class InkingCanvas : public QGraphicsView {
    Q_OBJECT

public:
    explicit InkingCanvas(QWidget *parent = nullptr);

    void setEncounter(const QString &encounterId, int pageIndex = 0);
    void setTool(PenTool tool);
    void setColor(const QColor &color);
    void setStrokeSize(float size);
    void setPageIndex(int pageIndex);

    void undo();
    void redo();
    void clearPage();

    bool canUndo() const { return !m_undoStack.isEmpty(); }
    bool canRedo() const { return !m_redoStack.isEmpty(); }

signals:
    void strokeCommitted();
    void undoRedoChanged();

protected:
    void mousePressEvent(QMouseEvent *event) override;
    void mouseMoveEvent(QMouseEvent *event) override;
    void mouseReleaseEvent(QMouseEvent *event) override;
    void tabletEvent(QTabletEvent *event) override;
    void wheelEvent(QWheelEvent *event) override;
    void drawBackground(QPainter *painter, const QRectF &rect) override;

private:
    void commitCurrentStroke();
    void renderStrokes();
    QPainterPath createPathFromPoints(const QVector<StrokePoint> &points);
    void eraseAt(const QPointF &pos, float radius = 20.0f);

    QGraphicsScene *m_scene;
    QString m_currentEncounterId;
    int m_currentPageIndex;

    PenTool m_tool;
    QColor m_color;
    float m_size;

    bool m_isDrawing;
    QVector<StrokePoint> m_currentPoints;
    QGraphicsPathItem *m_activePathItem;

    QVector<InkStroke> m_strokes;
    QStack<QVector<InkStroke>> m_undoStack;
    QStack<QVector<InkStroke>> m_redoStack;
};

#endif // INKINGCANVAS_H
