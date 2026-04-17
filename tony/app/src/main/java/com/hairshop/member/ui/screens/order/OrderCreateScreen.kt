package com.hairshop.member.ui.screens.order

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.hairshop.member.data.db.entity.Member
import com.hairshop.member.data.db.entity.ServiceProject
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.ui.components.formatMoney
import com.hairshop.member.viewmodel.CartItem
import com.hairshop.member.viewmodel.MemberViewModel
import com.hairshop.member.viewmodel.OrderViewModel
import kotlinx.coroutines.flow.collectLatest

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OrderCreateScreen(
    preselectedMemberId: Long? = null,
    onBack: () -> Unit,
    orderViewModel: OrderViewModel = viewModel(),
    memberViewModel: MemberViewModel = viewModel(),
    isTopLevel: Boolean = false
) {
    val enabledProjects by orderViewModel.enabledProjects.collectAsState()
    val cart by orderViewModel.cart.collectAsState()
    val cartTotal by orderViewModel.cartTotal.collectAsState()
    val selectedMember by orderViewModel.selectedMember.collectAsState()
    val memberSearchResults by orderViewModel.memberSearchResults.collectAsState()
    val activeBarbers by orderViewModel.activeBarbers.collectAsState()
    val selectedBarber by orderViewModel.selectedBarber.collectAsState()

    var memberSearchText by remember { mutableStateOf("") }
    var showMemberSearch by remember { mutableStateOf(preselectedMemberId == null) }
    var payType by remember { mutableStateOf("余额") }
    var remark by remember { mutableStateOf("") }
    var showDiscardDialog by remember { mutableStateOf(false) }
    var showSuccessDialog by remember { mutableStateOf(false) }

    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(preselectedMemberId) {
        if (preselectedMemberId != null) {
            memberViewModel.loadMember(preselectedMemberId)
        }
    }

    val loadedMember by memberViewModel.currentMember.collectAsState()
    LaunchedEffect(loadedMember, preselectedMemberId) {
        if (preselectedMemberId != null && loadedMember != null && loadedMember!!.id == preselectedMemberId) {
            orderViewModel.selectMember(loadedMember!!)
        }
    }

    LaunchedEffect(Unit) {
        orderViewModel.message.collectLatest {
            snackbarHostState.showSnackbar(it)
        }
    }

    // Discard cart confirmation dialog
    if (showDiscardDialog) {
        AlertDialog(
            onDismissRequest = { showDiscardDialog = false },
            title = { Text("放弃开单？") },
            text = { Text("已选择的项目将被清空，确定要离开吗？") },
            confirmButton = {
                TextButton(onClick = {
                    showDiscardDialog = false
                    orderViewModel.clearCart()
                    onBack()
                }) { Text("离开", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDiscardDialog = false }) { Text("继续开单") }
            }
        )
    }

    // Order success dialog
    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = {
                showSuccessDialog = false
                if (!isTopLevel) onBack()
            },
            icon = { Icon(Icons.Default.CheckCircle, null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp)) },
            title = { Text("开单成功") },
            text = { Text("消费记录已保存") },
            confirmButton = {
                TextButton(onClick = {
                    showSuccessDialog = false
                    if (!isTopLevel) onBack()
                }) { Text("确定") }
            }
        )
    }

    val handleBack: () -> Unit = {
        if (cart.isNotEmpty() && !isTopLevel) {
            showDiscardDialog = true
        } else {
            orderViewModel.clearCart()
            onBack()
        }
    }

    Scaffold(
        topBar = { AppTopBar(title = "消费开单",
            onBack = if (isTopLevel) null else handleBack) },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            // Step 1: Select member
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp, 16.dp, 16.dp, 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("1. 选择会员", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(Modifier.height(8.dp))

                    if (selectedMember != null) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(selectedMember!!.name, fontWeight = FontWeight.Bold)
                                Text(selectedMember!!.phone, fontSize = 13.sp)
                                Text("余额：${formatMoney(selectedMember!!.balance)}", fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.primary)
                            }
                            TextButton(onClick = {
                                orderViewModel.clearMember()
                                showMemberSearch = true
                            }) { Text("更换") }
                        }
                    } else {
                        OutlinedTextField(
                            value = memberSearchText,
                            onValueChange = {
                                memberSearchText = it
                                if (it.length >= 2) orderViewModel.searchMember(it)
                            },
                            label = { Text("搜索会员姓名/手机号") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            leadingIcon = { Icon(Icons.Default.Search, null) }
                        )
                        memberSearchResults.take(5).forEach { member ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        orderViewModel.selectMember(member)
                                        showMemberSearch = false
                                        memberSearchText = ""
                                    }
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("${member.name} (${member.phone})")
                                Text(formatMoney(member.balance), color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }

            // Step 2: Select projects
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp, 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("2. 选择项目", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(Modifier.height(8.dp))

                    val grouped = enabledProjects.groupBy { it.category.ifBlank { "其他" } }
                    grouped.forEach { (category, projects) ->
                        Text(category, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            projects.forEach { project ->
                                val inCart = cart.any { it.project.id == project.id }
                                FilterChip(
                                    selected = inCart,
                                    onClick = {
                                        if (inCart) orderViewModel.removeFromCart(project.id)
                                        else orderViewModel.addToCart(project)
                                    },
                                    label = { Text("${project.name} ${formatMoney(project.price)}") }
                                )
                            }
                        }
                    }
                }
            }

            // Cart items with editable prices
            if (cart.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(16.dp, 8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("已选项目", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Spacer(Modifier.height(8.dp))

                        cart.forEach { item ->
                            CartItemRow(
                                item = item,
                                onPriceChange = { orderViewModel.updateCartItemPrice(item.project.id, it) },
                                onRemove = { orderViewModel.removeFromCart(item.project.id) }
                            )
                        }

                        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("合计", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(formatMoney(cartTotal), fontWeight = FontWeight.Bold,
                                fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }

            // Step 3: Select barber
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp, 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("3. 选择理发师", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(Modifier.height(8.dp))
                    if (activeBarbers.isEmpty()) {
                        Text("暂无在职理发师", fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        FlowRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            activeBarbers.forEach { barber ->
                                FilterChip(
                                    selected = selectedBarber?.id == barber.id,
                                    onClick = {
                                        if (selectedBarber?.id == barber.id) orderViewModel.selectBarber(null)
                                        else orderViewModel.selectBarber(barber)
                                    },
                                    label = { Text(barber.name) },
                                    leadingIcon = {
                                        if (selectedBarber?.id == barber.id) {
                                            Icon(Icons.Default.Check, null, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // Step 4: Payment
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp, 8.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("4. 支付方式", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("余额", "现金", "微信", "支付宝").forEach { type ->
                            FilterChip(
                                selected = payType == type,
                                onClick = { payType = type },
                                label = { Text(type) }
                            )
                        }
                    }

                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = remark,
                        onValueChange = { remark = it },
                        label = { Text("备注（如会员折扣）") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
            }

            // Submit
            Button(
                onClick = {
                    orderViewModel.submitOrder(payType, remark) { showSuccessDialog = true }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(56.dp),
                enabled = selectedMember != null && cart.isNotEmpty()
            ) {
                Text("确认开单 ${formatMoney(cartTotal)}",
                    fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun CartItemRow(
    item: CartItem,
    onPriceChange: (Double) -> Unit,
    onRemove: () -> Unit
) {
    var priceText by remember(item.actualPrice) { mutableStateOf("%.2f".format(item.actualPrice)) }

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(item.project.name, modifier = Modifier.weight(1f))
        OutlinedTextField(
            value = priceText,
            onValueChange = {
                priceText = it
                it.toDoubleOrNull()?.let(onPriceChange)
            },
            modifier = Modifier.width(100.dp),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            prefix = { Text("¥") }
        )
        IconButton(onClick = onRemove) {
            Icon(Icons.Default.Close, "移除", tint = MaterialTheme.colorScheme.error)
        }
    }
}
