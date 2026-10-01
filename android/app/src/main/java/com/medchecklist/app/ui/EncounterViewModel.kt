package com.medchecklist.app.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.medchecklist.app.data.AppDatabase
import com.medchecklist.app.data.ChecklistEntity
import com.medchecklist.app.data.ClinicalTemplateEntity
import com.medchecklist.app.data.EncounterChecklistInstance
import com.medchecklist.app.data.PatientEncounter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class EncounterViewModel(application: Application) : AndroidViewModel(application) {
    private val database = AppDatabase.getDatabase(application, viewModelScope)
    private val encounterDao = database.encounterDao()
    private val checklistDao = database.checklistDao()
    private val templateDao = database.templateDao()

    val encounters: StateFlow<List<PatientEncounter>> = encounterDao.getAllActiveEncounters()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val templates: StateFlow<List<ClinicalTemplateEntity>> = templateDao.getAllTemplates()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val checklists: StateFlow<List<ChecklistEntity>> = checklistDao.getAllChecklists()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _selectedEncounterId = MutableStateFlow<String?>(null)
    val selectedEncounterId: StateFlow<String?> = _selectedEncounterId.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun selectEncounter(id: String?) {
        _selectedEncounterId.value = id
    }

    fun createEncounter(
        patientIdentifier: String,
        bedNumber: String?,
        facility: String?,
        group: String?,
        chiefComplaint: String,
        template: ClinicalTemplateEntity? = null
    ) {
        viewModelScope.launch {
            val instances = mutableListOf<EncounterChecklistInstance>()
            if (template != null) {
                for (chkId in template.defaultChecklistIds) {
                    val chk = checklistDao.getChecklistById(chkId)
                    if (chk != null) {
                        instances.add(
                            EncounterChecklistInstance(
                                templateId = chk.id,
                                title = chk.title,
                                institution = chk.institution,
                                sections = chk.sections
                            )
                        )
                    }
                }
            }

            val newEncounter = PatientEncounter(
                patientIdentifier = patientIdentifier,
                bedNumber = bedNumber,
                facility = facility,
                group = group,
                chiefComplaint = chiefComplaint,
                templateId = template?.id,
                templateTitle = template?.title,
                generalNotes = template?.defaultNotes,
                checklists = instances,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis()
            )
            encounterDao.insertEncounter(newEncounter)
            _selectedEncounterId.value = newEncounter.id
        }
    }

    fun updateEncounter(encounter: PatientEncounter) {
        viewModelScope.launch {
            encounterDao.updateEncounter(encounter.copy(updatedAt = System.currentTimeMillis()))
        }
    }

    fun togglePinEncounter(encounter: PatientEncounter) {
        viewModelScope.launch {
            encounterDao.updateEncounter(
                encounter.copy(
                    isPinned = !encounter.isPinned,
                    updatedAt = System.currentTimeMillis()
                )
            )
        }
    }

    fun toggleChecklistItem(encounter: PatientEncounter, checklistId: String, sectionId: String, itemId: String) {
        val updatedChecklists = encounter.checklists.map { chk ->
            if (chk.id == checklistId) {
                chk.copy(
                    sections = chk.sections.map { sec ->
                        if (sec.id == sectionId) {
                            sec.copy(
                                items = sec.items.map { item ->
                                    if (item.id == itemId) item.copy(checked = !item.checked) else item
                                }
                            )
                        } else sec
                    }
                )
            } else chk
        }
        updateEncounter(encounter.copy(checklists = updatedChecklists))
    }

    fun deleteEncounter(id: String) {
        viewModelScope.launch {
            encounterDao.softDeleteEncounter(id)
            if (_selectedEncounterId.value == id) {
                _selectedEncounterId.value = null
            }
        }
    }
}
