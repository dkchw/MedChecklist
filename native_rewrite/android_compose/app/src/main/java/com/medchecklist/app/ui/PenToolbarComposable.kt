package com.medchecklist.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Redo
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medchecklist.app.data.PenTool

val PRESET_COLORS = listOf(
    Pair("Black", "#0f172a"),
    Pair("Blue", "#38bdf8"),
    Pair("Red", "#f87171"),
    Pair("Green", "#34d399"),
    Pair("Amber", "#fbbf24"),
    Pair("White", "#ffffff")
)

val PRESET_SIZES = listOf(
    Pair("Fine", 2f),
    Pair("Medium", 4f),
    Pair("Broad", 8f),
    Pair("Marker", 14f)
)

@Composable
fun PenToolbarComposable(
    uiState: InkingUiState,
    onSelectTool: (PenTool) -> Unit,
    onSelectColor: (String) -> Unit,
    onSelectSize: (Float) -> Unit,
    onTogglePenOnlyMode: () -> Unit,
    onUndo: () -> Unit,
    onRedo: () -> Unit,
    onClear: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .shadow(elevation = 12.dp, shape = RoundedCornerShape(20.dp))
            .clip(RoundedCornerShape(20.dp))
            .border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(20.dp)),
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // 1. Tool Selection Group
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Row(modifier = Modifier.padding(2.dp)) {
                    IconButton(
                        onClick = { onSelectTool(PenTool.PEN) },
                        colors = IconButtonDefaults.iconButtonColors(
                            containerColor = if (uiState.currentTool == PenTool.PEN) MaterialTheme.colorScheme.primaryContainer else Color.Transparent
                        )
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = "Pen", modifier = Modifier.size(20.dp))
                    }

                    IconButton(
                        onClick = { onSelectTool(PenTool.HIGHLIGHTER) },
                        colors = IconButtonDefaults.iconButtonColors(
                            containerColor = if (uiState.currentTool == PenTool.HIGHLIGHTER) MaterialTheme.colorScheme.primaryContainer else Color.Transparent
                        )
                    ) {
                        Icon(Icons.Default.Brush, contentDescription = "Highlighter", modifier = Modifier.size(20.dp))
                    }

                    IconButton(
                        onClick = { onSelectTool(PenTool.ERASER) },
                        colors = IconButtonDefaults.iconButtonColors(
                            containerColor = if (uiState.currentTool == PenTool.ERASER) MaterialTheme.colorScheme.primaryContainer else Color.Transparent
                        )
                    ) {
                        Icon(Icons.Default.AutoFixHigh, contentDescription = "Eraser", modifier = Modifier.size(20.dp))
                    }
                }
            }

            // 2. Palm Rejection Guard
            FilterChip(
                selected = uiState.penOnlyMode,
                onClick = onTogglePenOnlyMode,
                label = {
                    Text(
                        if (uiState.penOnlyMode) "Stylus Only" else "Touch + Pen",
                        fontSize = 11.sp
                    )
                },
                leadingIcon = {
                    Icon(
                        if (uiState.penOnlyMode) Icons.Default.Shield else Icons.Default.TouchApp,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                }
            )

            // 3. Color Picker Palette
            if (uiState.currentTool != PenTool.ERASER) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PRESET_COLORS.forEach { (_, hex) ->
                        val color = parseHexColor(hex)
                        val isSelected = uiState.currentColor == hex
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(color)
                                .border(
                                    width = if (isSelected) 2.5.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Gray.copy(alpha = 0.5f),
                                    shape = CircleShape
                                )
                                .clickable { onSelectColor(hex) }
                        )
                    }
                }
            }

            // 4. Thickness Selector
            if (uiState.currentTool != PenTool.ERASER) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant
                ) {
                    Row(modifier = Modifier.padding(2.dp)) {
                        PRESET_SIZES.forEach { (label, size) ->
                            val isSelected = uiState.currentSize == size
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent)
                                    .clickable { onSelectSize(size) }
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    label,
                                    fontSize = 11.sp,
                                    color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            // 5. Undo / Redo / Clear Actions
            IconButton(
                onClick = onUndo,
                enabled = uiState.canUndo
            ) {
                Icon(Icons.AutoMirrored.Filled.Undo, contentDescription = "Undo", modifier = Modifier.size(20.dp))
            }

            IconButton(
                onClick = onRedo,
                enabled = uiState.canRedo
            ) {
                Icon(Icons.AutoMirrored.Filled.Redo, contentDescription = "Redo", modifier = Modifier.size(20.dp))
            }

            IconButton(
                onClick = onClear
            ) {
                Icon(
                    Icons.Default.DeleteOutline,
                    contentDescription = "Clear Page",
                    tint = MaterialTheme.colorScheme.error,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
