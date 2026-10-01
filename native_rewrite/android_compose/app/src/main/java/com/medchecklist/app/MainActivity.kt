package com.medchecklist.app

import android.os.Bundle
import android.view.MotionEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInteropFilter

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MedChecklistApp()
        }
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun MedChecklistApp() {
    // A simple proof-of-concept Native Compose Canvas for Bedside Inking
    val paths = remember { mutableStateListOf<Path>() }
    var currentPath by remember { mutableStateOf<Path?>(null) }

    Canvas(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .pointerInteropFilter { event ->
                when (event.actionMasked) {
                    MotionEvent.ACTION_DOWN -> {
                        val path = Path()
                        path.moveTo(event.x, event.y)
                        currentPath = path
                        true
                    }
                    MotionEvent.ACTION_MOVE -> {
                        // Capture historical coalesced events for smooth digitizer strokes
                        currentPath?.let { path ->
                            val historySize = event.historySize
                            for (i in 0 until historySize) {
                                path.lineTo(event.getHistoricalX(i), event.getHistoricalY(i))
                            }
                            path.lineTo(event.x, event.y)
                            // Re-assign to trigger recomposition
                            currentPath = Path().apply { addPath(path) }
                        }
                        true
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        currentPath?.let { path ->
                            paths.add(path)
                        }
                        currentPath = null
                        true
                    }
                    else -> false
                }
            }
    ) {
        // Draw committed strokes
        for (path in paths) {
            drawPath(
                path = path,
                color = Color.Black,
                style = Stroke(width = 5f)
            )
        }
        // Draw active stroke
        currentPath?.let { path ->
            drawPath(
                path = path,
                color = Color.Blue,
                style = Stroke(width = 5f)
            )
        }
    }
}
