package com.hairshop.member.ui.screens.project

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hairshop.member.data.db.entity.ServiceProject
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.ui.components.ConfirmDialog
import com.hairshop.member.ui.components.EmptyState
import com.hairshop.member.ui.components.formatMoney
import com.hairshop.member.viewmodel.ProjectViewModel
import kotlinx.coroutines.flow.collectLatest

@Composable
fun ProjectListScreen(
    onBack: () -> Unit,
    viewModel: ProjectViewModel = viewModel()
) {
    val projects by viewModel.projects.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var editingProject by remember { mutableStateOf<ServiceProject?>(null) }
    var deletingProject by remember { mutableStateOf<ServiceProject?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.message.collectLatest {
            snackbarHostState.showSnackbar(it)
        }
    }

    Scaffold(
        topBar = { AppTopBar(title = "项目管理", onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, "新增项目")
            }
        }
    ) { padding ->
        if (projects.isEmpty()) {
            EmptyState(
                icon = Icons.Default.ContentCut,
                message = "还没有服务项目\n添加项目后即可用于开单",
                actionLabel = "新增项目",
                onAction = { showAddDialog = true }
            )
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {
                val grouped = projects.groupBy { it.category.ifBlank { "未分类" } }
                grouped.forEach { (category, categoryProjects) ->
                    item {
                        Text(
                            category,
                            modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 4.dp),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    items(categoryProjects, key = { it.id }) { project ->
                        ProjectItem(
                            project = project,
                            onToggle = { viewModel.toggleStatus(project) },
                            onEdit = { editingProject = project },
                            onDelete = { deletingProject = project }
                        )
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        ProjectDialog(
            title = "新增项目",
            onDismiss = { showAddDialog = false },
            onConfirm = { name, price, category ->
                viewModel.addProject(name, price, category)
                showAddDialog = false
            }
        )
    }

    editingProject?.let { project ->
        ProjectDialog(
            title = "编辑项目",
            initialName = project.name,
            initialPrice = project.price,
            initialCategory = project.category,
            onDismiss = { editingProject = null },
            onConfirm = { name, price, category ->
                viewModel.updateProject(project.copy(name = name, price = price, category = category))
                editingProject = null
            }
        )
    }

    deletingProject?.let { project ->
        ConfirmDialog(
            title = "删除项目",
            text = "确定要删除「${project.name}」吗？",
            onConfirm = {
                viewModel.deleteProject(project)
                deletingProject = null
            },
            onDismiss = { deletingProject = null }
        )
    }
}

@Composable
private fun ProjectItem(
    project: ServiceProject,
    onToggle: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (project.status == 1) MaterialTheme.colorScheme.surface
                else MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(project.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    if (project.status == 0) {
                        Spacer(Modifier.width(8.dp))
                        Text("已禁用", fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.error)
                    }
                }
                Text(formatMoney(project.price), fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.primary)
            }
            Row {
                Switch(checked = project.status == 1, onCheckedChange = { onToggle() })
                IconButton(onClick = onEdit) {
                    Icon(Icons.Default.Edit, "编辑", modifier = Modifier.size(20.dp))
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, "删除", modifier = Modifier.size(20.dp),
                        tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    }
}

@Composable
private fun ProjectDialog(
    title: String,
    initialName: String = "",
    initialPrice: Double = 0.0,
    initialCategory: String = "",
    onDismiss: () -> Unit,
    onConfirm: (String, Double, String) -> Unit
) {
    var name by remember { mutableStateOf(initialName) }
    var priceText by remember { mutableStateOf(if (initialPrice > 0) "%.2f".format(initialPrice) else "") }
    var category by remember { mutableStateOf(initialCategory) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("项目名称") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = priceText,
                    onValueChange = { priceText = it },
                    label = { Text("价格") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Next),
                    prefix = { Text("¥") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("分类") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val price = priceText.toDoubleOrNull()
                    if (name.isNotBlank() && price != null && price > 0) {
                        onConfirm(name, price, category)
                    }
                },
                enabled = name.isNotBlank() && priceText.toDoubleOrNull()?.let { it > 0 } == true
            ) { Text("确认") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}
