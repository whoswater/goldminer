package com.hairshop.member.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.viewmodel.SettingsViewModel

@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = viewModel()
) {
    val shopName by viewModel.shopName.collectAsState()
    val adminName by viewModel.adminName.collectAsState()
    var editingShopName by remember(shopName) { mutableStateOf(shopName) }
    var editingAdminName by remember(adminName) { mutableStateOf(adminName) }

    Scaffold(
        topBar = { AppTopBar(title = "系统设置", onBack = onBack) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("基本设置", fontWeight = FontWeight.Bold, fontSize = 16.sp)

            OutlinedTextField(
                value = editingShopName,
                onValueChange = {
                    editingShopName = it
                    viewModel.updateShopName(it)
                },
                label = { Text("店铺名称") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = editingAdminName,
                onValueChange = {
                    editingAdminName = it
                    viewModel.updateAdminName(it)
                },
                label = { Text("管理员昵称") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            Text("系统信息", fontWeight = FontWeight.Bold, fontSize = 16.sp)

            SettingsInfoRow("应用名称", "理发店会员管理系统")
            SettingsInfoRow("版本", "1.0.0")
            SettingsInfoRow("数据存储位置", viewModel.dbPath)

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            Text("关于", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(
                "理发店会员管理系统（本地版）\n\n" +
                "一款可在安卓端独立运行的本地会员管理工具，" +
                "无需联网、无需服务器，所有数据保存在设备本地。\n\n" +
                "面向小型理发店、美发工作室、个人理发师使用。",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 22.sp
            )
        }
    }
}

@Composable
private fun SettingsInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 14.sp, modifier = Modifier.widthIn(max = 220.dp))
    }
}
