#include "inkingcanvas.h"
#include "../models/databasemanager.h"
#include <QPainter>
#include <QScrollBar>
#include <QUuid>

InkingCanvas::InkingCanvas(QWidget *parent)
    : QGraphicsView(parent)
    , m_currentPageIndex(0)
    , m_tool(PenTool::Pen)
    , m_color(QColor("#0f172a"))
    , m_size(3.0f)
    , m_isDrawing(false)
    , m_activePathItem(nullptr)
{
    m_scene = new QGraphicsScene(this);
    m_scene->setSceneRect(0, 0, 1600, 2200); // Standard high-res digital page
    setScene(m_scene);

    setRenderHint(QPainter::Antialiasing);
    setRenderHint(QPainter::SmoothPixmapTransform);
    setViewportUpdateMode(QGraphicsView::FullViewportUpdate);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    setVerticalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    setDragMode(QGraphicsView::NoDrag);
    setCursor(Qt::CrossCursor);
}

void InkingCanvas::setEncounter(const QString &encounterId, int pageIndex) {
    m_currentEncounterId = encounterId;
    m_currentPageIndex = pageIndex;
    m_undoStack.clear();
    m_redoStack.clear();

    if (!m_currentEncounterId.isEmpty()) {
        m_strokes = DatabaseManager::instance().getStrokesForPage(m_currentEncounterId, m_currentPageIndex);
    } else {
        m_strokes.clear();
    }

    renderStrokes();
    emit undoRedoChanged();
}

void InkingCanvas::setTool(PenTool tool) {
    m_tool = tool;
    if (m_tool == PenTool::Eraser) {
        setCursor(Qt::PointingHandCursor);
    } else {
        setCursor(Qt::CrossCursor);
    }
}

void InkingCanvas::setColor(const QColor &color) {
    m_color = color;
}

void InkingCanvas::setStrokeSize(float size) {
    m_size = size;
}

void InkingCanvas::setPageIndex(int pageIndex) {
    if (m_currentPageIndex == pageIndex) return;
    m_currentPageIndex = pageIndex;
    setEncounter(m_currentEncounterId, m_currentPageIndex);
}

void InkingCanvas::drawBackground(QPainter *painter, const QRectF &rect) {
    // Fill clean medical whiteboard paper background
    painter->fillRect(rect, Qt::white);

    // Draw subtle medical grid pattern
    QPen gridPen(QColor(226, 232, 240), 1, Qt::DotLine);
    painter->setPen(gridPen);

    qreal left = int(rect.left()) - (int(rect.left()) % 24);
    qreal top = int(rect.top()) - (int(rect.top()) % 24);

    QVector<QLineF> lines;
    for (qreal x = left; x < rect.right(); x += 24) {
        lines.append(QLineF(x, rect.top(), x, rect.bottom()));
    }
    for (qreal y = top; y < rect.bottom(); y += 24) {
        lines.append(QLineF(rect.left(), y, rect.right(), y));
    }
    painter->drawLines(lines);
}

QPainterPath InkingCanvas::createPathFromPoints(const QVector<StrokePoint> &points) {
    QPainterPath path;
    if (points.isEmpty()) return path;

    path.moveTo(points.first().x, points.first().y);
    if (points.size() == 1) {
        path.addEllipse(QPointF(points.first().x, points.first().y), 1.5, 1.5);
        return path;
    }

    for (int i = 1; i < points.size(); ++i) {
        path.lineTo(points[i].x, points[i].y);
    }
    return path;
}

void InkingCanvas::renderStrokes() {
    m_scene->clear();
    m_activePathItem = nullptr;

    for (const auto &stroke : m_strokes) {
        QPainterPath path = createPathFromPoints(stroke.points);
        if (path.isEmpty()) continue;

        QColor col(stroke.color);
        qreal width = stroke.size;

        if (stroke.tool == "highlighter") {
            col.setAlphaF(0.35);
            width *= 2.5;
        }

        QPen pen(col, width, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
        QGraphicsPathItem *item = m_scene->addPath(path, pen);
        item->setZValue(1.0);
    }
}

void InkingCanvas::mousePressEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton) {
        QPointF scenePos = mapToScene(event->pos());
        m_isDrawing = true;
        m_currentPoints.clear();
        m_currentPoints.append(StrokePoint(scenePos.x(), scenePos.y(), 0.5f));

        if (m_tool == PenTool::Eraser) {
            eraseAt(scenePos);
        } else {
            QPainterPath path;
            path.moveTo(scenePos);

            QColor col = m_color;
            qreal width = m_size;
            if (m_tool == PenTool::Highlighter) {
                col.setAlphaF(0.35);
                width *= 2.5;
            }

            QPen pen(col, width, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
            m_activePathItem = m_scene->addPath(path, pen);
            m_activePathItem->setZValue(2.0);
        }
        event->accept();
        return;
    }
    QGraphicsView::mousePressEvent(event);
}

void InkingCanvas::mouseMoveEvent(QMouseEvent *event) {
    if (m_isDrawing) {
        QPointF scenePos = mapToScene(event->pos());

        if (m_tool == PenTool::Eraser) {
            eraseAt(scenePos);
        } else {
            m_currentPoints.append(StrokePoint(scenePos.x(), scenePos.y(), 0.5f));
            if (m_activePathItem) {
                QPainterPath path = createPathFromPoints(m_currentPoints);
                m_activePathItem->setPath(path);
            }
        }
        event->accept();
        return;
    }
    QGraphicsView::mouseMoveEvent(event);
}

void InkingCanvas::mouseReleaseEvent(QMouseEvent *event) {
    if (event->button() == Qt::LeftButton && m_isDrawing) {
        m_isDrawing = false;
        if (m_tool != PenTool::Eraser) {
            commitCurrentStroke();
        }
        m_currentPoints.clear();
        m_activePathItem = nullptr;
        event->accept();
        return;
    }
    QGraphicsView::mouseReleaseEvent(event);
}

void InkingCanvas::tabletEvent(QTabletEvent *event) {
    QPointF scenePos = mapToScene(event->position().toPoint());
    float pressure = event->pressure();

    switch (event->type()) {
    case QEvent::TabletPress:
        m_isDrawing = true;
        m_currentPoints.clear();
        m_currentPoints.append(StrokePoint(scenePos.x(), scenePos.y(), pressure));
        if (m_tool == PenTool::Eraser || event->pointerType() == QPointingDevice::PointerType::Eraser) {
            eraseAt(scenePos);
        } else {
            QPainterPath path;
            path.moveTo(scenePos);
            QColor col = m_color;
            qreal width = m_size * (0.4f + pressure * 0.8f);
            if (m_tool == PenTool::Highlighter) {
                col.setAlphaF(0.35);
                width *= 2.5;
            }
            QPen pen(col, width, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
            m_activePathItem = m_scene->addPath(path, pen);
            m_activePathItem->setZValue(2.0);
        }
        event->accept();
        break;

    case QEvent::TabletMove:
        if (m_isDrawing) {
            if (m_tool == PenTool::Eraser || event->pointerType() == QPointingDevice::PointerType::Eraser) {
                eraseAt(scenePos);
            } else {
                m_currentPoints.append(StrokePoint(scenePos.x(), scenePos.y(), pressure));
                if (m_activePathItem) {
                    QPainterPath path = createPathFromPoints(m_currentPoints);
                    m_activePathItem->setPath(path);
                }
            }
            event->accept();
        }
        break;

    case QEvent::TabletRelease:
        if (m_isDrawing) {
            m_isDrawing = false;
            if (m_tool != PenTool::Eraser && event->pointerType() != QPointingDevice::PointerType::Eraser) {
                commitCurrentStroke();
            }
            m_currentPoints.clear();
            m_activePathItem = nullptr;
            event->accept();
        }
        break;

    default:
        break;
    }
}

void InkingCanvas::wheelEvent(QWheelEvent *event) {
    if (event->modifiers() & Qt::ControlModifier) {
        // Zoom on Ctrl + Wheel
        double scaleFactor = event->angleDelta().y() > 0 ? 1.15 : 0.85;
        scale(scaleFactor, scaleFactor);
        event->accept();
    } else {
        QGraphicsView::wheelEvent(event);
    }
}

void InkingCanvas::commitCurrentStroke() {
    if (m_currentEncounterId.isEmpty() || m_currentPoints.size() < 2) return;

    InkStroke stroke;
    stroke.id = QUuid::createUuid().toString(QUuid::WithoutBraces);
    stroke.encounterId = m_currentEncounterId;
    stroke.pageIndex = m_currentPageIndex;
    stroke.tool = (m_tool == PenTool::Highlighter) ? "highlighter" : "pen";
    stroke.color = m_color.name();
    stroke.size = m_size;
    stroke.opacity = (m_tool == PenTool::Highlighter) ? 0.35f : 1.0f;
    stroke.points = m_currentPoints;
    stroke.timestamp = QDateTime::currentMSecsSinceEpoch();

    m_undoStack.push(m_strokes);
    m_redoStack.clear();

    m_strokes.append(stroke);
    DatabaseManager::instance().insertStroke(stroke);

    emit strokeCommitted();
    emit undoRedoChanged();
}

void InkingCanvas::eraseAt(const QPointF &pos, float radius) {
    float rSquared = radius * radius;
    QStringList toDeleteIds;
    QVector<InkStroke> remaining;

    for (const auto &stroke : m_strokes) {
        bool hit = false;
        for (const auto &p : stroke.points) {
            float dx = p.x - pos.x();
            float dy = p.y - pos.y();
            if ((dx * dx + dy * dy) <= rSquared) {
                hit = true;
                break;
            }
        }
        if (hit) {
            toDeleteIds.append(stroke.id);
        } else {
            remaining.append(stroke);
        }
    }

    if (!toDeleteIds.isEmpty()) {
        m_undoStack.push(m_strokes);
        m_redoStack.clear();
        m_strokes = remaining;
        DatabaseManager::instance().deleteStrokesByIds(toDeleteIds);
        renderStrokes();
        emit undoRedoChanged();
    }
}

void InkingCanvas::undo() {
    if (m_undoStack.isEmpty() || m_currentEncounterId.isEmpty()) return;

    m_redoStack.push(m_strokes);
    m_strokes = m_undoStack.pop();

    DatabaseManager::instance().clearPageStrokes(m_currentEncounterId, m_currentPageIndex);
    for (const auto &s : m_strokes) {
        DatabaseManager::instance().insertStroke(s);
    }

    renderStrokes();
    emit undoRedoChanged();
}

void InkingCanvas::redo() {
    if (m_redoStack.isEmpty() || m_currentEncounterId.isEmpty()) return;

    m_undoStack.push(m_strokes);
    m_strokes = m_redoStack.pop();

    DatabaseManager::instance().clearPageStrokes(m_currentEncounterId, m_currentPageIndex);
    for (const auto &s : m_strokes) {
        DatabaseManager::instance().insertStroke(s);
    }

    renderStrokes();
    emit undoRedoChanged();
}

void InkingCanvas::clearPage() {
    if (m_strokes.isEmpty() || m_currentEncounterId.isEmpty()) return;

    m_undoStack.push(m_strokes);
    m_redoStack.clear();
    m_strokes.clear();

    DatabaseManager::instance().clearPageStrokes(m_currentEncounterId, m_currentPageIndex);
    renderStrokes();
    emit undoRedoChanged();
}
