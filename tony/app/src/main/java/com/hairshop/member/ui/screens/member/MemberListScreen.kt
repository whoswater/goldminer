package com.hairshop.member.ui.screens.member

import androidx.compose.foundation.clickable
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
import com.hairshop.member.data.db.entity.Member
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import com.hairshop.member.ui.components.AppTopBar
import com.hairshop.member.ui.components.AvatarCircle
import com.hairshop.member.ui.components.EmptyState
import com.hairshop.member.ui.components.formatMoney
import com.hairshop.member.ui.components.formatTime
import com.hairshop.member.viewmodel.MemberViewModel

@Composable
fun MemberListScreen(
    onBack: (() -> Unit)?,
    onMemberClick: (Long) -> Unit,
    onAddMember: () -> Unit,
    viewModel: MemberViewModel = viewModel()
) {
    val members by viewModel.members.collectAsState()
    var searchText by remember { mutableStateOf("") }
    var showSortMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "会员列表",
                onBack = onBack,
                actions = {
                    Box {
                        IconButton(onClick = { showSortMenu = true }) {
                            Icon(Icons.Default.Sort, "排序")
                        }
                        DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("按注册时间") },
                                onClick = {
                                    viewModel.setSortType(MemberViewModel.SortType.CREATE_TIME)
                                    showSortMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("按余额") },
                                onClick = {
                                    viewModel.setSortType(MemberViewModel.SortType.BALANCE)
                                    showSortMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("按最近消费") },
                                onClick = {
                                    viewModel.setSortType(MemberViewModel.SortType.RECENT_CONSUME)
                                    showSortMenu = false
                                }
                            )
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddMember) {
                Icon(Icons.Default.Add, "新增会员")
            }
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Search bar
            OutlinedTextField(
                value = searchText,
                onValueChange = {
                    searchText = it
                    viewModel.search(it)
                },
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                placeholder = { Text("搜索姓名或手机号") },
                leadingIcon = { Icon(Icons.Default.Search, "搜索") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                trailingIcon = {
                    if (searchText.isNotEmpty()) {
                        IconButton(onClick = { searchText = ""; viewModel.search("") }) {
                            Icon(Icons.Default.Clear, "清除")
                        }
                    }
                }
            )

            if (members.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.People,
                    message = "还没有会员\n点击下方按钮添加第一位会员",
                    actionLabel = "新增会员",
                    onAction = onAddMember
                )
            } else {
                LazyColumn {
                    items(members, key = { it.id }) { member ->
                        MemberItem(member = member, onClick = { onMemberClick(member.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun MemberItem(member: Member, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            AvatarCircle(name = member.name, size = 44.dp, fontSize = 18)
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(member.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(Modifier.height(4.dp))
                Text(member.phone, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp)
                Spacer(Modifier.height(2.dp))
                Text("注册: ${formatTime(member.createTime)}", fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(formatMoney(member.balance), fontWeight = FontWeight.Bold,
                    fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                Text("余额", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
