package com.hairshop.member.ui.screens.record

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hairshop.member.data.db.dao.OrderWithMemberName
import com.hairshop.member.data.db.entity.OrderItem
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.ui.components.EmptyState
import com.hairshop.member.ui.components.formatMoney
import com.hairshop.member.ui.components.formatTime
import com.hairshop.member.viewmodel.OrderViewModel

@Composable
fun RecordListScreen(
    onBack: (() -> Unit)?,
    viewModel: OrderViewModel = viewModel()
) {
    val allOrders by viewModel.allOrders.collectAsState()
    var selectedFilter by remember { mutableStateOf("全部") }
    var expandedOrderId by remember { mutableStateOf<Long?>(null) }
    val orderItems by viewModel.orderItems.collectAsState()

    Scaffold(
        topBar = {
            AppTopBar(title = "消费记录", onBack = onBack)
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Filter chips
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp, 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("全部", "余额", "现金", "微信", "支付宝").forEach { filter ->
                    FilterChip(
                        selected = selectedFilter == filter,
                        onClick = { selectedFilter = filter },
                        label = { Text(filter, fontSize = 13.sp) }
                    )
                }
            }

            val filtered = if (selectedFilter == "全部") allOrders
                else allOrders.filter { it.payType == selectedFilter }

            if (filtered.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.ReceiptLong,
                    message = "还没有消费记录"
                )
            } else {
                LazyColumn {
                    items(filtered, key = { it.id }) { order ->
                        OrderRecordItem(
                            order = order,
                            isExpanded = expandedOrderId == order.id,
                            items = if (expandedOrderId == order.id) orderItems else emptyList(),
                            onClick = {
                                if (expandedOrderId == order.id) {
                                    expandedOrderId = null
                                } else {
                                    expandedOrderId = order.id
                                    viewModel.loadOrderItems(order.id)
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderRecordItem(
    order: OrderWithMemberName,
    isExpanded: Boolean,
    items: List<OrderItem>,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        order.memberName ?: "已删除会员",
                        fontWeight = FontWeight.Bold, fontSize = 15.sp
                    )
                    Text(formatTime(order.createTime), fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (order.barberName != null) {
                        Text("理发师：${order.barberName}", fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.secondary)
                    }
                    Text("单号：${order.orderSn}", fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(formatMoney(order.totalAmount), fontWeight = FontWeight.Bold,
                        fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
                    Text(order.payType, fontSize = 12.sp)
                }
            }

            if (order.remark.isNotBlank()) {
                Text("备注：${order.remark}", fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp))
            }

            if (isExpanded && items.isNotEmpty()) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                Text("消费明细：", fontSize = 13.sp, fontWeight = FontWeight.Medium)
                items.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("  ${item.projectName} x${item.num}", fontSize = 13.sp)
                        Text(formatMoney(item.price * item.num), fontSize = 13.sp)
                    }
                }
            }
        }
    }
}
