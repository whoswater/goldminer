package com.hairshop.member.ui.screens.member

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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hairshop.member.data.db.dao.OrderWithMemberName
import com.hairshop.member.ui.components.*
import com.hairshop.member.viewmodel.MemberViewModel
import com.hairshop.member.viewmodel.OrderViewModel
import kotlinx.coroutines.flow.collectLatest

@Composable
fun MemberDetailScreen(
    memberId: Long,
    onBack: () -> Unit,
    onEdit: (Long) -> Unit,
    onCreateOrder: (Long) -> Unit,
    memberViewModel: MemberViewModel = viewModel(),
    orderViewModel: OrderViewModel = viewModel()
) {
    val member by memberViewModel.currentMember.collectAsState()
    val rechargeRecords by memberViewModel.rechargeRecords.collectAsState()
    val memberOrders by orderViewModel.getOrdersByMember(memberId).collectAsState(initial = emptyList())

    var showRechargeDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableIntStateOf(0) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(memberId) {
        memberViewModel.loadMember(memberId)
    }

    LaunchedEffect(Unit) {
        memberViewModel.message.collectLatest {
            snackbarHostState.showSnackbar(it)
        }
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "会员详情",
                onBack = onBack,
                actions = {
                    IconButton(onClick = { onEdit(memberId) }) {
                        Icon(Icons.Default.Edit, "编辑")
                    }
                    IconButton(onClick = { showDeleteDialog = true }) {
                        Icon(Icons.Default.Delete, "删除")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        member?.let { m ->
            Column(modifier = Modifier.fillMaxSize().padding(padding)) {
                // Member info card
                Card(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            AvatarCircle(name = m.name, size = 56.dp, fontSize = 24)
                            Spacer(Modifier.width(16.dp))
                            Column {
                                Text(m.name, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(4.dp))
                                Text(m.phone, fontSize = 14.sp)
                                if (m.gender.isNotBlank()) Text("性别：${m.gender}", fontSize = 14.sp)
                                if (m.birthday.isNotBlank()) Text("生日：${m.birthday}", fontSize = 14.sp)
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("余额", fontSize = 12.sp)
                                Text(formatMoney(m.balance), fontSize = 28.sp, fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        if (m.remark.isNotBlank()) {
                            Spacer(Modifier.height(8.dp))
                            Text("备注：${m.remark}", fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }

                        Spacer(Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Button(onClick = { showRechargeDialog = true }, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Default.AccountBalanceWallet, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("储值")
                            }
                            OutlinedButton(onClick = { onCreateOrder(memberId) }, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Default.Receipt, null, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("开单")
                            }
                        }
                    }
                }

                // Tabs
                TabRow(selectedTabIndex = selectedTab) {
                    Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }) {
                        Text("储值记录", modifier = Modifier.padding(12.dp))
                    }
                    Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }) {
                        Text("消费记录", modifier = Modifier.padding(12.dp))
                    }
                }

                when (selectedTab) {
                    0 -> RechargeRecordList(rechargeRecords)
                    1 -> MemberOrderList(memberOrders)
                }
            }
        } ?: Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
    }

    if (showRechargeDialog) {
        RechargeDialog(
            onDismiss = { showRechargeDialog = false },
            onConfirm = { amount, remark ->
                memberViewModel.recharge(memberId, amount, remark)
                showRechargeDialog = false
            }
        )
    }

    if (showDeleteDialog) {
        ConfirmDialog(
            title = "删除会员",
            text = "确定要删除该会员吗？删除后消费记录仍保留。",
            onConfirm = {
                memberViewModel.deleteMember(member!!) { onBack() }
                showDeleteDialog = false
            },
            onDismiss = { showDeleteDialog = false }
        )
    }
}

@Composable
private fun RechargeRecordList(records: List<com.hairshop.member.data.db.entity.Recharge>) {
    if (records.isEmpty()) {
        EmptyState(
            icon = Icons.Default.AccountBalanceWallet,
            message = "还没有储值记录"
        )
    } else {
        LazyColumn(modifier = Modifier.padding(horizontal = 16.dp)) {
            items(records) { record ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(formatTime(record.createTime), fontSize = 14.sp)
                            if (record.remark.isNotBlank()) {
                                Text(record.remark, fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("+${formatMoney(record.amount)}", fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary)
                            Text("余额：${formatMoney(record.balanceAfter)}", fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MemberOrderList(orders: List<OrderWithMemberName>) {
    if (orders.isEmpty()) {
        EmptyState(
            icon = Icons.Default.ReceiptLong,
            message = "还没有消费记录"
        )
    } else {
        LazyColumn(modifier = Modifier.padding(horizontal = 16.dp)) {
            items(orders) { order ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(formatTime(order.createTime), fontSize = 14.sp)
                            if (order.barberName != null) {
                                Text("理发师：${order.barberName}", fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.secondary)
                            }
                            Text("支付：${order.payType}", fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Text(formatMoney(order.totalAmount), fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
    }
}

@Composable
private fun RechargeDialog(
    onDismiss: () -> Unit,
    onConfirm: (Double, String) -> Unit
) {
    var amountText by remember { mutableStateOf("") }
    var remark by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("会员储值") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("快捷金额", style = MaterialTheme.typography.bodyMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(100, 200, 500, 1000).forEach { preset ->
                        FilterChip(
                            selected = amountText == preset.toString(),
                            onClick = { amountText = preset.toString() },
                            label = { Text("¥$preset") }
                        )
                    }
                }
                OutlinedTextField(
                    value = amountText,
                    onValueChange = { amountText = it },
                    label = { Text("充值金额") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Next),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = remark,
                    onValueChange = { remark = it },
                    label = { Text("备注") },
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val amount = amountText.toDoubleOrNull()
                    if (amount != null && amount > 0) {
                        onConfirm(amount, remark)
                    }
                },
                enabled = amountText.toDoubleOrNull()?.let { it > 0 } == true
            ) { Text("确认充值") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("取消") }
        }
    )
}
