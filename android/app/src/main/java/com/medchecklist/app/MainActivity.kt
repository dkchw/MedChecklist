package com.medchecklist.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.medchecklist.app.ui.BedsideInkingScreen
import com.medchecklist.app.ui.EncounterListScreen
import com.medchecklist.app.ui.EncounterViewModel
import com.medchecklist.app.ui.InkingViewModel

class MainActivity : ComponentActivity() {
    private val encounterViewModel: EncounterViewModel by viewModels()
    private val inkingViewModel: InkingViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MedChecklistApp(
                        encounterViewModel = encounterViewModel,
                        inkingViewModel = inkingViewModel
                    )
                }
            }
        }
    }
}

@Composable
fun MedChecklistApp(
    encounterViewModel: EncounterViewModel,
    inkingViewModel: InkingViewModel
) {
    val encounters by encounterViewModel.encounters.collectAsStateWithLifecycle()
    val templates by encounterViewModel.templates.collectAsStateWithLifecycle()
    val selectedId by encounterViewModel.selectedEncounterId.collectAsStateWithLifecycle()

    val currentEncounter = remember(encounters, selectedId) {
        encounters.find { it.id == selectedId }
    }

    LaunchedEffect(currentEncounter?.id) {
        inkingViewModel.setEncounter(currentEncounter?.id, currentEncounter?.pagesCount ?: 1)
    }

    if (currentEncounter == null) {
        EncounterListScreen(
            encounters = encounters,
            templates = templates,
            onSelectEncounter = { encounterViewModel.selectEncounter(it) },
            onCreateEncounter = { id, bed, fac, grp, cc, tmpl ->
                encounterViewModel.createEncounter(id, bed, fac, grp, cc, tmpl)
            },
            onTogglePin = { encounterViewModel.togglePinEncounter(it) }
        )
    } else {
        val strokes by inkingViewModel.pageStrokes.collectAsStateWithLifecycle()
        val inkingUiState by inkingViewModel.uiState.collectAsStateWithLifecycle()

        BedsideInkingScreen(
            encounter = currentEncounter,
            allEncounters = encounters,
            strokes = strokes,
            uiState = inkingUiState,
            onBack = { encounterViewModel.selectEncounter(null) },
            onSelectPatient = { encounterViewModel.selectEncounter(it) },
            onCommitStroke = { inkingViewModel.commitStroke(it) },
            onEraseAt = { inkingViewModel.eraseStrokesAt(it) },
            onSelectTool = { inkingViewModel.setTool(it) },
            onSelectColor = { inkingViewModel.setColor(it) },
            onSelectSize = { inkingViewModel.setSize(it) },
            onTogglePenOnlyMode = { inkingViewModel.togglePenOnlyMode() },
            onUndo = { inkingViewModel.undo() },
            onRedo = { inkingViewModel.redo() },
            onClear = { inkingViewModel.clearPage() },
            onSetPageIndex = { inkingViewModel.setPageIndex(it) },
            onAddPage = { inkingViewModel.addPage() },
            onToggleChecklistItem = { chkId, secId, itemId ->
                encounterViewModel.toggleChecklistItem(currentEncounter, chkId, secId, itemId)
            }
        )
    }
}
