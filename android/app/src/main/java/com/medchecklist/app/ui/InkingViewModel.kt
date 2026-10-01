package com.medchecklist.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.medchecklist.app.data.AppDatabase
import com.medchecklist.app.data.InkStroke
import com.medchecklist.app.data.PenTool
import com.medchecklist.app.data.StrokePoint
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class InkingUiState(
    val currentTool: PenTool = PenTool.PEN,
    val currentColor: String = "#0f172a",
    val currentSize: Float = 4f,
    val currentPageIndex: Int = 0,
    val pagesCount: Int = 1,
    val penOnlyMode: Boolean = false,
    val canUndo: Boolean = false,
    val canRedo: Boolean = false
)

@OptIn(ExperimentalCoroutinesApi::class)
class InkingViewModel(application: Application) : AndroidViewModel(application) {
    private val database = AppDatabase.getDatabase(application, viewModelScope)
    private val inkStrokeDao = database.inkStrokeDao()

    private val _uiState = MutableStateFlow(InkingUiState())
    val uiState: StateFlow<InkingUiState> = _uiState.asStateFlow()

    private val _currentEncounterId = MutableStateFlow<String?>(null)
    private val _undoStack = mutableListOf<List<InkStroke>>()
    private val _redoStack = mutableListOf<List<InkStroke>>()

    val pageStrokes: StateFlow<List<InkStroke>> = combine(
        _currentEncounterId,
        _uiState.map { it.currentPageIndex }.distinctUntilChanged()
    ) { encounterId, pageIndex ->
        Pair(encounterId, pageIndex)
    }.flatMapLatest { (encounterId, pageIndex) ->
        if (encounterId == null) {
            flowOf(emptyList())
        } else {
            inkStrokeDao.getStrokesForPage(encounterId, pageIndex)
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setEncounter(encounterId: String?, pagesCount: Int = 1) {
        _currentEncounterId.value = encounterId
        _undoStack.clear()
        _redoStack.clear()
        _uiState.update { it.copy(pagesCount = maxOf(1, pagesCount), canUndo = false, canRedo = false) }
    }

    fun setTool(tool: PenTool) {
        _uiState.update { it.copy(currentTool = tool) }
    }

    fun setColor(color: String) {
        _uiState.update { it.copy(currentColor = color) }
    }

    fun setSize(size: Float) {
        _uiState.update { it.copy(currentSize = size) }
    }

    fun setPageIndex(index: Int) {
        _uiState.update { it.copy(currentPageIndex = index) }
        _undoStack.clear()
        _redoStack.clear()
        updateUndoRedoAvailability()
    }

    fun addPage() {
        _uiState.update {
            val newCount = it.pagesCount + 1
            it.copy(pagesCount = newCount, currentPageIndex = newCount - 1)
        }
    }

    fun togglePenOnlyMode() {
        _uiState.update { it.copy(penOnlyMode = !it.penOnlyMode) }
    }

    fun commitStroke(points: List<StrokePoint>) {
        val encounterId = _currentEncounterId.value ?: return
        if (points.isEmpty()) return

        val state = _uiState.value
        val stroke = InkStroke(
            encounterId = encounterId,
            tool = when (state.currentTool) {
                PenTool.HIGHLIGHTER -> "highlighter"
                PenTool.ERASER -> "eraser"
                PenTool.SELECTOR -> "selector"
                else -> "pen"
            },
            color = state.currentColor,
            size = state.currentSize,
            opacity = if (state.currentTool == PenTool.HIGHLIGHTER) 0.35f else 1.0f,
            pageIndex = state.currentPageIndex,
            points = points
        )

        viewModelScope.launch {
            _undoStack.add(pageStrokes.value)
            _redoStack.clear()
            inkStrokeDao.insertStroke(stroke)
            updateUndoRedoAvailability()
        }
    }

    fun eraseStrokesAt(point: StrokePoint, threshold: Float = 25f) {
        val strokes = pageStrokes.value
        val toDelete = strokes.filter { stroke ->
            stroke.points.any { p ->
                val dx = p.x - point.x
                val dy = p.y - point.y
                (dx * dx + dy * dy) <= (threshold * threshold)
            }
        }.map { it.id }

        if (toDelete.isNotEmpty()) {
            viewModelScope.launch {
                _undoStack.add(strokes)
                _redoStack.clear()
                inkStrokeDao.deleteStrokesByIds(toDelete)
                updateUndoRedoAvailability()
            }
        }
    }

    fun undo() {
        if (_undoStack.isEmpty()) return
        val current = pageStrokes.value
        val previous = _undoStack.removeAt(_undoStack.size - 1)
        _redoStack.add(current)

        val encounterId = _currentEncounterId.value ?: return
        val pageIndex = _uiState.value.currentPageIndex

        viewModelScope.launch {
            inkStrokeDao.clearPageStrokes(encounterId, pageIndex)
            inkStrokeDao.insertStrokes(previous)
            updateUndoRedoAvailability()
        }
    }

    fun redo() {
        if (_redoStack.isEmpty()) return
        val current = pageStrokes.value
        val next = _redoStack.removeAt(_redoStack.size - 1)
        _undoStack.add(current)

        val encounterId = _currentEncounterId.value ?: return
        val pageIndex = _uiState.value.currentPageIndex

        viewModelScope.launch {
            inkStrokeDao.clearPageStrokes(encounterId, pageIndex)
            inkStrokeDao.insertStrokes(next)
            updateUndoRedoAvailability()
        }
    }

    fun clearPage() {
        val encounterId = _currentEncounterId.value ?: return
        val pageIndex = _uiState.value.currentPageIndex
        val current = pageStrokes.value
        if (current.isEmpty()) return

        _undoStack.add(current)
        _redoStack.clear()

        viewModelScope.launch {
            inkStrokeDao.clearPageStrokes(encounterId, pageIndex)
            updateUndoRedoAvailability()
        }
    }

    private fun updateUndoRedoAvailability() {
        _uiState.update {
            it.copy(
                canUndo = _undoStack.isNotEmpty(),
                canRedo = _redoStack.isNotEmpty()
            )
        }
    }
}
