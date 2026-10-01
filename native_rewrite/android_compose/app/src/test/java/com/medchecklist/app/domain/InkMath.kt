package com.medchecklist.app.domain

import com.medchecklist.app.data.InkStroke
import com.medchecklist.app.data.StrokePoint

data class BoundingBox(
    val minX: Float,
    val minY: Float,
    val maxX: Float,
    val maxY: Float
) {
    val width: Float get() = maxX - minX
    val height: Float get() = maxY - minY
}

object InkMath {

    fun isPointNearStroke(
        point: StrokePoint,
        stroke: InkStroke,
        threshold: Float = 20f
    ): Boolean {
        val threshSq = threshold * threshold
        for (p in stroke.points) {
            val dx = p.x - point.x
            val dy = p.y - point.y
            if (dx * dx + dy * dy <= threshSq) {
                return true
            }
        }
        return false
    }

    fun isPointInPolygon(
        point: StrokePoint,
        polygon: List<StrokePoint>
    ): Boolean {
        if (polygon.size < 3) return false
        var inside = false
        var j = polygon.size - 1
        for (i in polygon.indices) {
            val xi = polygon[i].x
            val yi = polygon[i].y
            val xj = polygon[j].x
            val yj = polygon[j].y

            val intersect = ((yi > point.y) != (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)
            if (intersect) inside = !inside
            j = i
        }
        return inside
    }

    fun isStrokeInPolygon(
        stroke: InkStroke,
        polygon: List<StrokePoint>
    ): Boolean {
        if (polygon.size < 3 || stroke.points.isEmpty()) return false

        for (pt in stroke.points) {
            if (isPointInPolygon(pt, polygon)) {
                return true
            }
        }

        val avgX = stroke.points.sumOf { it.x.toDouble() }.toFloat() / stroke.points.size
        val avgY = stroke.points.sumOf { it.y.toDouble() }.toFloat() / stroke.points.size
        return isPointInPolygon(StrokePoint(avgX, avgY), polygon)
    }

    fun computeBoundingBox(points: List<StrokePoint>): BoundingBox? {
        if (points.isEmpty()) return null
        var minX = Float.MAX_VALUE
        var minY = Float.MAX_VALUE
        var maxX = -Float.MAX_VALUE
        var maxY = -Float.MAX_VALUE

        for (p in points) {
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minY) minY = p.y
            if (p.y > maxY) maxY = p.y
        }
        return BoundingBox(minX, minY, maxX, maxY)
    }

    fun translateStroke(stroke: InkStroke, dx: Float, dy: Float): InkStroke {
        val translated = stroke.points.map { p ->
            p.copy(x = p.x + dx, y = p.y + dy)
        }
        return stroke.copy(points = translated)
    }
}
