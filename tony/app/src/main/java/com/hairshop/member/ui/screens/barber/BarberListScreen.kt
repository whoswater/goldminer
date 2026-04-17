package com.hairshop.member.ui.screens.barber

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
import com.hairshop.member.data.db.entity.Barber
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.ui.components.EmptyState
import com.hairshop.member.ui.components.ConfirmDialog
import com.hairshop.member.ui.components.formatTime
import com.hairshop.member.viewmodel.BarberViewModel
import kotlinx.coroutines.flow.collectLatest

@Composable
fun BarberListScreen(
    onBack: () -> Unit,
    viewModel: BarberViewModel = viewModel()
) {
    val barbers by viewModel.barbers.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var editingBarber by remember { mutableStateOf<Barber?>(null) }
    var deletingBarber by remember { mutableStateOf<Barber?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.message.collectLatest {
            snackbarHostState.showSnackbar(it)
        }
    }

    Scaffold(
        topBar = { AppTopBar(title = "理发师管理", onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAddDialog = true }) {
                Icon(Icons.Default.Add, "新增理发师")
            }
        }
    ) { padding ->
        if (barbers.isEmpty()) {
            EmptyState(
                icon = Icons.Default.Face,
                message = "还没有理发师\n添加理发师后即可在开单时选择",
                actionLabel = "新增理发师",
                onAction = { showAddDialog = true }
            )
        } else {
            LazyColumn(modifier = Modifier.padding(padding)) {
                // Active barbers
                val active = barbers.filter { it.status == 1 }
                val inactive = barbers.filter { it.status == 0 }

                if (active.isNotEmpty()) {
                    item {
                        Text(
                            "在职 (${active.size})",
                            modifier = Modifier.padding(16.dp, 12.dp, 16.dp, 4.dp),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    items(active, key = { it.id }) { barber ->
                        BarberItem(
                            barber = barber,
                            onToggle = { viewModel.toggleStatus(barber) },
                            onEdit = { editingBarber = barber },
                            onDelete = { deletingBarber = barber }
                        )
                    }
                }

                if (inactive.isNotEmpty()) {
                    item {
                        Text(
                            "离职 (${inactive.size})",
                            modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 4.dp),
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                    items(inactive, key = { it.id }) { barber ->
                        BarberItem(
                            barber = barber,
                            onToggle = { viewModel.toggleStatus(barber) },
                            onEdit = { editingBarber = barber },
                            onDelete = { deletingBarber = barber }
                        )
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        BarberDialog(
            title = "新增理发师",
            onDismiss = { showAddDialog = false },
            onConfirm = { name, phone, remark ->
                viewModel.addBarber(name, phone, remark)
                showAddDialog = false
            }
        )
    }

    editingBarber?.let { barber ->
        BarberDialog(
            title = "编辑理发师",
            initialName = barber.name,
            initialPhone = barber.phone,
            initialRemark = barber.remark,
            onDismiss = { editingBarber = null },
            onConfirm = { name, phone, remark ->
                viewModel.updateBarber(barber.copy(name = name, phone = phone, remark = remark))
                editingBarber = null
            }
        )
    }

    deletingBarber?.let { barber ->
        ConfirmDialog(
            title = "删除理发师",
            text = "确定要删除「${barber.name}」吗？有服务记录的理发师只能设为离职。",
            onConfirm = {
                viewModel.deleteBarber(barber)
                deletingBarber = null
            },
            onDismiss = { deletingBarber = null }
        )
    }
}

@Composable
private fun BarberItem(
    barber: Barber,
    onToggle: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (barber.status == 1) MaterialTheme.colorScheme.surface
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
                    Icon(Icons.Default.Person, null,
                        modifier = Modifier.size(20.dp),
                        tint = if (barber.status == 1) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(8.dp))
                    Text(barber.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    if (barber.status == 0) {
                        Spacer(Modifier.width(8.dp))
                        Text("已离职", fontSize = 11.sp, color = MaterialTheme.colorScheme.error)
                    }
                }
                if (barber.phone.isNotBlank()) {
                    Text(barber.phone, fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 28.dp))
                }
                if (barber.remark.isNotBlank()) {
                    Text(barber.remark, fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 28.dp))
                }
            }
            Row {
                Switch(checked = barber.status == 1, onCheckedChange = { onToggle() })
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
private fun BarberDialog(
    title: String,
    initialName: String = "",
    initialPhone: String = "",
    initialRemark: String = "",
    onDismiss: () -> Unit,
    onConfirm: (String, String, String) -> Unit
) {
    var name by remember { mutableStateOf(initialName) }
    var phone by remember { mutableStateOf(initialPhone) }
    var remark by remember { mutableStateOf(initialRemark) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("姓名 *") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("手机号") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = remark,
                    onValueChange = { remark = it },
                    label = { Text("备注") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { if (name.isNotBlank()) onConfirm(name, phone, remark) },
                enabled = name.isNotBlank()
            ) { Text("确认") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}
