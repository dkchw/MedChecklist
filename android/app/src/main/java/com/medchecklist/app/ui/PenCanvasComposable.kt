package com.medchecklist.app.ui

import android.view.MotionEvent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInteropFilter
import com.medchecklist.app.data.InkStroke
import com.medchecklist.app.data.PenTool
import com.medchecklist.app.data.StrokePoint

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun PenCanvasComposable(
    strokes: List<InkStroke>,
    uiState: InkingUiState,
    onCommitStroke: (List<StrokePoint>) -> Unit,
    onEraseAt: (StrokePoint) -> Unit,
    modifier: Modifier = Modifier
) {
    val activePoints = remember { mutableStateListOf<StrokePoint>() }
    var activePath by remember { mutableStateOf<Path?>(null) }

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
            .pointerInteropFilter { event ->
                val isStylus = event.getToolType(0) == MotionEvent.TOOL_TYPE_STYLUS ||
                               event.getToolType(0) == MotionEvent.TOOL_TYPE_ERASER

                // Palm Rejection: if penOnlyMode is enabled, strictly ignore finger/touch
                if (uiState.penOnlyMode && !isStylus) {
                    return@pointerInteropFilter false
                }

                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        activePoints.clear()
                        val p = StrokePoint(event.x, event.y, event.pressure)
                        activePoints.add(p)

                        if (uiState.currentTool == PenTool.ERASER) {
                            onEraseAt(p)
                        } else {
                            val path = Path().apply { moveTo(event.x, event.y) }
                            activePath = path
                        }
                        true
                    }

                    MotionEvent.ACTION_MOVE -> {
                        val historySize = event.historySize

                        if (uiState.currentTool == PenTool.ERASER) {
                            for (i in 0 until historySize) {
                                onEraseAt(StrokePoint(event.getHistoricalX(i), event.getHistoricalY(i)))
                            }
                            onEraseAt(StrokePoint(event.x, event.y))
                        } else {
                            activePath?.let { path ->
                                for (i in 0 until historySize) {
                                    val hx = event.getHistoricalX(i)
                                    val hy = event.getHistoricalY(i)
                                    val hp = event.getHistoricalPressure(i)
                                    activePoints.add(StrokePoint(hx, hy, hp))
                                    path.lineTo(hx, hy)
                                }
                                activePoints.add(StrokePoint(event.x, event.y, event.pressure))
                                path.lineTo(event.x, event.y)

                                // Trigger recomposition for real-time stroke tracking
                                activePath = Path().apply { addPath(path) }
                            }
                        }
                        true
                    }

                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        if (uiState.currentTool != PenTool.ERASER && activePoints.isNotEmpty()) {
                            onCommitStroke(activePoints.toList())
                        }
                        activePoints.clear()
                        activePath = null
                        true
                    }

                    else -> false
                }
            }
    ) {
        // 1. Draw all committed page strokes
        for (stroke in strokes) {
            if (stroke.points.size < 2) continue
            val strokePath = Path().apply {
                moveTo(stroke.points[0].x, stroke.points[0].y)
                for (i in 1 until stroke.points.size) {
                    lineTo(stroke.points[i].x, stroke.points[i].y)
                }
            }

            val strokeColor = parseHexColor(stroke.color, stroke.opacity)
            val strokeWidth = stroke.size * if (stroke.tool == "highlighter") 2.5f else 1.0f

            drawPath(
                path = strokePath,
                color = strokeColor,
                style = Stroke(
                    width = strokeWidth,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }

        // 2. Draw currently in-progress active stroke
        activePath?.let { path ->
            val activeColor = parseHexColor(
                uiState.currentColor,
                if (uiState.currentTool == PenTool.HIGHLIGHTER) 0.35f else 1.0f
            )
            val activeWidth = uiState.currentSize * if (uiState.currentTool == PenTool.HIGHLIGHTER) 2.5f else 1.0f

            drawPath(
                path = path,
                color = activeColor,
                style = Stroke(
                    width = activeWidth,
                    cap = StrokeCap.Round,
                    join = StrokeJoin.Round
                )
            )
        }
    }
}

fun parseHexColor(hex: String, opacity: Float = 1.0f): Color {
    return try {
        val clean = hex.removePrefix("#")
        val colorInt = clean.toLong(16)
        when (clean.length) {
            6 -> Color(
                red = ((colorInt shr 16) and 0xFF) / 255f,
                green = ((colorInt shr 8) and 0xFF) / 255f,
                blue = (colorInt and 0xFF) / 255f,
                alpha = opacity
            )
            8 -> Color(
                alpha = (((colorInt shr 24) and 0xFF) / 255f) * opacity,
                red = ((colorInt shr 16) and 0xFF) / 255f,
                green = ((colorInt shr 8) and 0xFF) / 255f,
                blue = (colorInt and 0xFF) / 255f
            )
            else -> Color.Black.copy(alpha = opacity)
        }
    } catch (_: Exception) {
        Color.Black.copy(alpha = opacity)
    }
}
