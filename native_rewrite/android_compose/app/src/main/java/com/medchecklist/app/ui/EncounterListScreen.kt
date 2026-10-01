package com.medchecklist.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.medchecklist.app.data.ClinicalTemplateEntity
import com.medchecklist.app.data.PatientEncounter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EncounterListScreen(
    encounters: List<PatientEncounter>,
    templates: List<ClinicalTemplateEntity>,
    onSelectEncounter: (String) -> Unit,
    onCreateEncounter: (String, String?, String?, String?, String, ClinicalTemplateEntity?) -> Unit,
    onTogglePin: (PatientEncounter) -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var showNewPatientDialog by remember { mutableStateOf(false) }

    val filteredEncounters = remember(encounters, searchQuery) {
        if (searchQuery.isBlank()) {
            encounters
        } else {
            val q = searchQuery.lowercase()
            encounters.filter {
                it.patientIdentifier.lowercase().contains(q) ||
                (it.bedNumber?.lowercase()?.contains(q) == true) ||
                (it.group?.lowercase()?.contains(q) == true) ||
                it.chiefComplaint.lowercase().contains(q)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("MedChecklist", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Text(
                            "${encounters.size} Active Patients",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showNewPatientDialog = true }) {
                        Icon(Icons.Default.PersonAdd, contentDescription = "Add Patient")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showNewPatientDialog = true },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("New Admission") }
            )
        },
        modifier = modifier
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                placeholder = { Text("Search patient, bed, or diagnosis...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Patient Cards List
            if (filteredEncounters.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.LocalHospital,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            if (searchQuery.isEmpty()) "No active patients on rounds" else "No matching patients found",
                            color = MaterialTheme.colorScheme.outline
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredEncounters, key = { it.id }) { encounter ->
                        PatientCard(
                            encounter = encounter,
                            onClick = { onSelectEncounter(encounter.id) },
                            onTogglePin = { onTogglePin(encounter) }
                        )
                    }
                }
            }
        }
    }

    if (showNewPatientDialog) {
        NewPatientDialog(
            templates = templates,
            onDismiss = { showNewPatientDialog = false },
            onConfirm = { id, bed, fac, grp, cc, tmpl ->
                onCreateEncounter(id, bed, fac, grp, cc, tmpl)
                showNewPatientDialog = false
            }
        )
    }
}

@Composable
fun PatientCard(
    encounter: PatientEncounter,
    onClick: () -> Unit,
    onTogglePin: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (encounter.isPinned) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
                             else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        )
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = encounter.patientIdentifier,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    encounter.bedNumber?.let { bed ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.primary
                        ) {
                            Text(
                                text = "Bed $bed",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                    }
                }

                IconButton(onClick = onTogglePin, modifier = Modifier.size(24.dp)) {
                    Icon(
                        if (encounter.isPinned) Icons.Default.Star else Icons.Default.StarBorder,
                        contentDescription = "Pin",
                        tint = if (encounter.isPinned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                    )
                }
            }

            if (encounter.group != null || encounter.facility != null) {
                Text(
                    text = listOfNotNull(encounter.facility, encounter.group).joinToString(" • "),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            if (encounter.chiefComplaint.isNotBlank()) {
                Text(
                    text = encounter.chiefComplaint,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(top = 8.dp),
                    maxLines = 2
                )
            }

            // Checklist Counter Progress
            val totalItems = encounter.checklists.sumOf { chk -> chk.sections.sumOf { it.items.size } }
            val checkedItems = encounter.checklists.sumOf { chk -> chk.sections.sumOf { sec -> sec.items.count { it.checked } } }

            if (totalItems > 0) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    LinearProgressIndicator(
                        progress = { checkedItems.toFloat() / totalItems.toFloat() },
                        modifier = Modifier
                            .weight(1f)
                            .height(6.dp)
                            .padding(end = 12.dp)
                    )
                    Text(
                        text = "$checkedItems / $totalItems done",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun NewPatientDialog(
    templates: List<ClinicalTemplateEntity>,
    onDismiss: () -> Unit,
    onConfirm: (String, String?, String?, String?, String, ClinicalTemplateEntity?) -> Unit
) {
    var identifier by remember { mutableStateOf("") }
    var bedNumber by remember { mutableStateOf("") }
    var ward by remember { mutableStateOf("") }
    var chiefComplaint by remember { mutableStateOf("") }
    var selectedTemplate by remember { mutableStateOf<ClinicalTemplateEntity?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Patient Admission") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = identifier,
                    onValueChange = { identifier = it },
                    label = { Text("Patient Identifier / Name *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = bedNumber,
                        onValueChange = { bedNumber = it },
                        label = { Text("Bed #") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        value = ward,
                        onValueChange = { ward = it },
                        label = { Text("Ward / Dept") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = chiefComplaint,
                    onValueChange = { chiefComplaint = it },
                    label = { Text("Chief Complaint / Diagnosis") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )

                if (templates.isNotEmpty()) {
                    Text(
                        "Clinical Protocol Bundle:",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        templates.take(2).forEach { tmpl ->
                            FilterChip(
                                selected = selectedTemplate?.id == tmpl.id,
                                onClick = {
                                    selectedTemplate = if (selectedTemplate?.id == tmpl.id) null else tmpl
                                },
                                label = { Text(tmpl.title, fontSize = 11.sp, maxLines = 1) }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (identifier.isNotBlank()) {
                        onConfirm(
                            identifier,
                            bedNumber.ifBlank { null },
                            null,
                            ward.ifBlank { null },
                            chiefComplaint,
                            selectedTemplate
                        )
                    }
                },
                enabled = identifier.isNotBlank()
            ) {
                Text("Admit Patient")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}
