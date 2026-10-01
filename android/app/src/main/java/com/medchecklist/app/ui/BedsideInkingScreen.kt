package com.medchecklist.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medchecklist.app.data.InkStroke
import com.medchecklist.app.data.PatientEncounter

enum class BedsideLayout {
    CANVAS, DOSSIER
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BedsideInkingScreen(
    encounter: PatientEncounter,
    allEncounters: List<PatientEncounter>,
    strokes: List<InkStroke>,
    uiState: InkingUiState,
    onBack: () -> Unit,
    onSelectPatient: (String) -> Unit,
    onCommitStroke: (List<com.medchecklist.app.data.StrokePoint>) -> Unit,
    onEraseAt: (com.medchecklist.app.data.StrokePoint) -> Unit,
    onSelectTool: (com.medchecklist.app.data.PenTool) -> Unit,
    onSelectColor: (String) -> Unit,
    onSelectSize: (Float) -> Unit,
    onTogglePenOnlyMode: () -> Unit,
    onUndo: () -> Unit,
    onRedo: () -> Unit,
    onClear: () -> Unit,
    onSetPageIndex: (Int) -> Unit,
    onAddPage: () -> Unit,
    onToggleChecklistItem: (String, String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    var layout by remember { mutableStateOf(BedsideLayout.CANVAS) }
    var showPatientDropdown by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                title = {
                    Box {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                encounter.patientIdentifier,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            encounter.bedNumber?.let { bed ->
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer
                                ) {
                                    Text(
                                        "Bed $bed",
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                            }
                            IconButton(onClick = { showPatientDropdown = true }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = "Switch Patient")
                            }
                        }

                        DropdownMenu(
                            expanded = showPatientDropdown,
                            onDismissRequest = { showPatientDropdown = false }
                        ) {
                            allEncounters.forEach { other ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            "${other.patientIdentifier}${other.bedNumber?.let { " (Bed $it)" } ?: ""}",
                                            fontWeight = if (other.id == encounter.id) FontWeight.Bold else FontWeight.Normal
                                        )
                                    },
                                    onClick = {
                                        showPatientDropdown = false
                                        onSelectPatient(other.id)
                                    }
                                )
                            }
                        }
                    }
                },
                actions = {
                    // Layout Toggle (Full Canvas vs Dossier)
                    Row(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
                            .padding(2.dp)
                    ) {
                        IconButton(
                            onClick = { layout = BedsideLayout.CANVAS },
                            colors = IconButtonDefaults.iconButtonColors(
                                containerColor = if (layout == BedsideLayout.CANVAS) MaterialTheme.colorScheme.primaryContainer else Color.Transparent
                            )
                        ) {
                            Icon(Icons.Default.Gesture, contentDescription = "Canvas", modifier = Modifier.size(18.dp))
                        }

                        IconButton(
                            onClick = { layout = BedsideLayout.DOSSIER },
                            colors = IconButtonDefaults.iconButtonColors(
                                containerColor = if (layout == BedsideLayout.DOSSIER) MaterialTheme.colorScheme.primaryContainer else Color.Transparent
                            )
                        ) {
                            Icon(Icons.Default.Checklist, contentDescription = "Dossier", modifier = Modifier.size(18.dp))
                        }
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Multi-page navigation (for Canvas mode)
                    if (layout == BedsideLayout.CANVAS) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    "Page ${uiState.currentPageIndex + 1}/${uiState.pagesCount}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )

                                IconButton(
                                    onClick = {
                                        if (uiState.currentPageIndex > 0) {
                                            onSetPageIndex(uiState.currentPageIndex - 1)
                                        }
                                    },
                                    enabled = uiState.currentPageIndex > 0,
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(Icons.Default.ChevronLeft, contentDescription = "Prev Page")
                                }

                                IconButton(
                                    onClick = {
                                        if (uiState.currentPageIndex < uiState.pagesCount - 1) {
                                            onSetPageIndex(uiState.currentPageIndex + 1)
                                        } else {
                                            onAddPage()
                                        }
                                    },
                                    modifier = Modifier.size(24.dp)
                                ) {
                                    Icon(
                                        if (uiState.currentPageIndex < uiState.pagesCount - 1) Icons.Default.ChevronRight else Icons.Default.Add,
                                        contentDescription = "Next/Add Page"
                                    )
                                }
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        modifier = modifier
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (layout) {
                BedsideLayout.CANVAS -> {
                    // 1. Pure Native Compose Vector Inking Canvas
                    PenCanvasComposable(
                        strokes = strokes,
                        uiState = uiState,
                        onCommitStroke = onCommitStroke,
                        onEraseAt = onEraseAt,
                        modifier = Modifier.fillMaxSize()
                    )

                    // 2. Floating Pen Toolbar
                    PenToolbarComposable(
                        uiState = uiState,
                        onSelectTool = onSelectTool,
                        onSelectColor = onSelectColor,
                        onSelectSize = onSelectSize,
                        onTogglePenOnlyMode = onTogglePenOnlyMode,
                        onUndo = onUndo,
                        onRedo = onRedo,
                        onClear = onClear,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(bottom = 16.dp)
                    )
                }

                BedsideLayout.DOSSIER -> {
                    // Clinical Dossier & Checklists View
                    DossierView(
                        encounter = encounter,
                        onToggleChecklistItem = onToggleChecklistItem,
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }
}

@Composable
fun DossierView(
    encounter: PatientEncounter,
    onToggleChecklistItem: (String, String, String) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Clinical Notes Card
        if (!encounter.generalNotes.isNullOrBlank()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Clinical Notes & Instructions",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            encounter.generalNotes,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        // Modular Checklists
        if (encounter.checklists.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No clinical protocol checklists attached to this patient.")
                }
            }
        } else {
            items(encounter.checklists, key = { it.id }) { chk ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                    )
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            chk.title,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        chk.institution?.let {
                            Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.outline)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        chk.sections.forEach { section ->
                            Text(
                                section.title,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(vertical = 4.dp)
                            )

                            section.items.forEach { item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Checkbox(
                                        checked = item.checked,
                                        onCheckedChange = {
                                            onToggleChecklistItem(chk.id, section.id, item.id)
                                        }
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            item.text,
                                            fontSize = 13.sp,
                                            fontWeight = if (item.starred) FontWeight.Bold else FontWeight.Normal
                                        )
                                        item.referenceValue?.let { ref ->
                                            Text(
                                                ref,
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.outline
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
