package com.medchecklist.app

import com.medchecklist.app.data.Converters
import com.medchecklist.app.data.InkStroke
import com.medchecklist.app.data.PenTool
import com.medchecklist.app.data.StrokePoint
import com.medchecklist.app.domain.InkMath
import org.junit.Assert.*
import org.junit.Test

class InkVectorMathTest {

    // ==========================================
    // Tier 1: Feature Coverage (5 tests)
    // ==========================================

    @Test
    fun test_ink_stroke_point_creation_and_pressure() {
        val defaultPoint = StrokePoint(x = 100f, y = 200f)
        assertEquals(100f, defaultPoint.x, 0.001f)
        assertEquals(200f, defaultPoint.y, 0.001f)
        assertEquals(0.5f, defaultPoint.pressure, 0.001f)

        val customPressurePoint = StrokePoint(x = 150f, y = 250f, pressure = 0.85f)
        assertEquals(0.85f, customPressurePoint.pressure, 0.001f)
    }

    @Test
    fun test_ink_pen_tool_enumeration() {
        assertEquals(PenTool.PEN, PenTool.fromString("pen"))
        assertEquals(PenTool.HIGHLIGHTER, PenTool.fromString("highlighter"))
        assertEquals(PenTool.ERASER, PenTool.fromString("eraser"))
        assertEquals(PenTool.SELECTOR, PenTool.fromString("selector"))
        // Case insensitive fallback
        assertEquals(PenTool.PEN, PenTool.fromString("unknown_tool"))
    }

    @Test
    fun test_ink_points_json_serialization_roundtrip() {
        val converters = Converters()
        val originalPoints = listOf(
            StrokePoint(10f, 20f, 0.4f),
            StrokePoint(35.5f, 48.2f, 0.7f),
            StrokePoint(100f, 200f, 0.95f)
        )

        val json = converters.fromStrokePoints(originalPoints)
        assertNotNull(json)
        assertTrue(json.contains("35.5"))

        val restoredPoints = converters.toStrokePoints(json)
        assertEquals(3, restoredPoints.size)
        assertEquals(10f, restoredPoints[0].x, 0.001f)
        assertEquals(48.2f, restoredPoints[1].y, 0.001f)
        assertEquals(0.95f, restoredPoints[2].pressure, 0.001f)
    }

    @Test
    fun test_ink_eraser_collision_distance_math() {
        val stroke = InkStroke(
            encounterId = "enc-1",
            points = listOf(
                StrokePoint(50f, 50f),
                StrokePoint(100f, 100f),
                StrokePoint(150f, 150f)
            )
        )

        // Point near (100, 100) -> distance is 5px <= threshold 20px
        val nearPoint = StrokePoint(103f, 104f)
        assertTrue(InkMath.isPointNearStroke(nearPoint, stroke, threshold = 20f))

        // Point far away -> distance ~100px > threshold 20px
        val farPoint = StrokePoint(200f, 200f)
        assertFalse(InkMath.isPointNearStroke(farPoint, stroke, threshold = 20f))
    }

    @Test
    fun test_ink_lasso_ray_casting_point_in_polygon() {
        // Square polygon from (0,0) to (100,100)
        val square = listOf(
            StrokePoint(0f, 0f),
            StrokePoint(100f, 0f),
            StrokePoint(100f, 100f),
            StrokePoint(0f, 100f)
        )

        val insidePoint = StrokePoint(50f, 50f)
        assertTrue(InkMath.isPointInPolygon(insidePoint, square))

        val outsidePoint = StrokePoint(150f, 50f)
        assertFalse(InkMath.isPointInPolygon(outsidePoint, square))

        // Stroke enclosed in square
        val enclosedStroke = InkStroke(
            encounterId = "enc-1",
            points = listOf(StrokePoint(20f, 20f), StrokePoint(30f, 40f))
        )
        assertTrue(InkMath.isStrokeInPolygon(enclosedStroke, square))
    }

    // ==========================================
    // Tier 2: Boundary & Corner Cases (5 tests)
    // ==========================================

    @Test
    fun test_ink_boundary_single_point_tap() {
        val tapStroke = InkStroke(
            encounterId = "enc-1",
            points = listOf(StrokePoint(50f, 50f))
        )
        val testPoint = StrokePoint(52f, 51f)
        assertTrue(InkMath.isPointNearStroke(testPoint, tapStroke, threshold = 10f))

        val boundingBox = InkMath.computeBoundingBox(tapStroke.points)
        assertNotNull(boundingBox)
        assertEquals(50f, boundingBox!!.minX, 0.001f)
        assertEquals(50f, boundingBox.maxX, 0.001f)
        assertEquals(0f, boundingBox.width, 0.001f)
    }

    @Test
    fun test_ink_boundary_collinear_and_zero_length_segments() {
        val collinearPoints = listOf(
            StrokePoint(10f, 10f),
            StrokePoint(10f, 10f),
            StrokePoint(10f, 10f)
        )
        val bbox = InkMath.computeBoundingBox(collinearPoints)
        assertNotNull(bbox)
        assertEquals(0f, bbox!!.width, 0.001f)
        assertEquals(0f, bbox.height, 0.001f)
    }

    @Test
    fun test_ink_boundary_dense_stroke_performance() {
        val densePoints = (0 until 1000).map { i ->
            StrokePoint(i.toFloat(), (i % 50).toFloat(), 0.5f)
        }
        val denseStroke = InkStroke(encounterId = "enc-dense", points = densePoints)

        val target = StrokePoint(500f, 2f)
        val isNear = InkMath.isPointNearStroke(target, denseStroke, threshold = 10f)
        assertTrue(isNear)

        val bbox = InkMath.computeBoundingBox(densePoints)
        assertNotNull(bbox)
        assertEquals(0f, bbox!!.minX, 0.001f)
        assertEquals(999f, bbox.maxX, 0.001f)
    }

    @Test
    fun test_ink_boundary_degenerate_lasso_polygons() {
        val point = StrokePoint(10f, 10f)
        // 0, 1, or 2 points cannot form a closed polygon
        assertFalse(InkMath.isPointInPolygon(point, emptyList()))
        assertFalse(InkMath.isPointInPolygon(point, listOf(StrokePoint(0f, 0f))))
        assertFalse(InkMath.isPointInPolygon(point, listOf(StrokePoint(0f, 0f), StrokePoint(20f, 20f))))
    }

    @Test
    fun test_ink_boundary_point_translation() {
        val stroke = InkStroke(
            encounterId = "enc-1",
            points = listOf(StrokePoint(10f, 20f), StrokePoint(30f, 40f))
        )
        val translated = InkMath.translateStroke(stroke, dx = 15f, dy = -5f)
        assertEquals(25f, translated.points[0].x, 0.001f)
        assertEquals(15f, translated.points[0].y, 0.001f)
        assertEquals(45f, translated.points[1].x, 0.001f)
        assertEquals(35f, translated.points[1].y, 0.001f)
    }
}
