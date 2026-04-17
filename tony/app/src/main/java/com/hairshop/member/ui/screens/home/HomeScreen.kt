package com.hairshop.member.ui.screens.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.ui.components.StatCard
import com.hairshop.member.ui.components.formatMoney
import com.hairshop.member.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    onNavigate: (String) -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val todayRevenue by viewModel.todayRevenue.collectAsState(initial = 0.0)
    val todayOrders by viewModel.todayOrderCount.collectAsState(initial = 0)
    val totalMembers by viewModel.totalMemberCount.collectAsState(initial = 0)
    val todayNewMembers by viewModel.todayNewMemberCount.collectAsState(initial = 0)

    Scaffold(
        topBar = { AppTopBar(title = "理发店会员管理") }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            // Stats overview
            Text("今日概览", fontSize = 18.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard("今日营业额", formatMoney(todayRevenue), Modifier.weight(1f))
                StatCard("今日开单", "$todayOrders 单", Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                StatCard("总会员数", "$totalMembers 人", Modifier.weight(1f))
                StatCard("今日新增", "$todayNewMembers 人", Modifier.weight(1f))
            }

            Spacer(Modifier.height(24.dp))
            Text("快捷操作", fontSize = 18.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 12.dp))

            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { QuickAction(Icons.Default.PersonAdd, "新增会员") { onNavigate("member_add") } }
                item { QuickAction(Icons.Default.Receipt, "快速开单") { onNavigate("order_create") } }
                item { QuickAction(Icons.Default.People, "会员列表") { onNavigate("member_list") } }
                item { QuickAction(Icons.Default.History, "消费记录") { onNavigate("record_list") } }
                item { QuickAction(Icons.Default.ContentCut, "项目管理") { onNavigate("project_list") } }
                item { QuickAction(Icons.Default.Face, "理发师") { onNavigate("barber_list") } }
                item { QuickAction(Icons.Default.Backup, "数据备份") { onNavigate("backup") } }
                item { QuickAction(Icons.Default.Settings, "系统设置") { onNavigate("settings") } }
            }
        }
    }
}

@Composable
private fun QuickAction(icon: ImageVector, label: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(icon, label, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(36.dp))
            Spacer(Modifier.height(8.dp))
            Text(label, fontSize = 14.sp)
        }
    }
}
