package com.hairshop.member.ui.screens.backup

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.ui.components.ConfirmDialog
import com.hairshop.member.ui.components.EmptyState
import com.hairshop.member.viewmodel.BackupViewModel
import kotlinx.coroutines.flow.collectLatest
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun BackupScreen(
    onBack: () -> Unit,
    viewModel: BackupViewModel = viewModel()
) {
    val backupFiles by viewModel.backupFiles.collectAsState()
    var showClearDialog by remember { mutableStateOf(false) }
    var restorePath by remember { mutableStateOf<String?>(null) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        viewModel.message.collectLatest {
            snackbarHostState.showSnackbar(it)
        }
    }

    Scaffold(
        topBar = { AppTopBar(title = "数据备份", onBack = onBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Backup button
            Button(
                onClick = { viewModel.backup() },
                modifier = Modifier.fillMaxWidth().height(56.dp)
            ) {
                Icon(Icons.Default.Backup, null, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(8.dp))
                Text("一键备份", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }

            // Clear data button
            OutlinedButton(
                onClick = { showClearDialog = true },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error
                )
            ) {
                Icon(Icons.Default.DeleteForever, null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("清空所有数据")
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            Text("历史备份", fontWeight = FontWeight.Bold, fontSize = 16.sp)

            if (backupFiles.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.CloudOff,
                    message = "还没有备份文件\n点击上方按钮创建第一个备份"
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(backupFiles) { file ->
                        Card(
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(file.name, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                    val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.CHINA)
                                    Text(sdf.format(Date(file.lastModified())),
                                        fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${file.length() / 1024} KB",
                                        fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                TextButton(onClick = { restorePath = file.absolutePath }) {
                                    Text("恢复")
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showClearDialog) {
        ConfirmDialog(
            title = "清空数据",
            text = "此操作将删除所有数据且不可恢复！建议先备份。确定要继续吗？",
            onConfirm = {
                viewModel.clearAllData()
                showClearDialog = false
            },
            onDismiss = { showClearDialog = false }
        )
    }

    restorePath?.let { path ->
        ConfirmDialog(
            title = "恢复数据",
            text = "恢复将覆盖当前所有数据，确定要继续吗？",
            onConfirm = {
                viewModel.restore(path)
                restorePath = null
            },
            onDismiss = { restorePath = null }
        )
    }
}
