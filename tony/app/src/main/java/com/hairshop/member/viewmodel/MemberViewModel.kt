package com.hairshop.member.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hairshop.member.HairShopApp
import com.hairshop.member.data.db.entity.Member
import com.hairshop.member.data.db.entity.Recharge
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class MemberViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as HairShopApp
    private val memberRepo = app.memberRepository

    private val _searchKeyword = MutableStateFlow("")
    private val _sortType = MutableStateFlow(SortType.CREATE_TIME)

    enum class SortType { CREATE_TIME, BALANCE, RECENT_CONSUME }

    val members: StateFlow<List<Member>> = combine(_searchKeyword, _sortType) { keyword, sort ->
        keyword to sort
    }.flatMapLatest { (keyword, sort) ->
        val source = if (keyword.isNotBlank()) {
            memberRepo.searchMembers(keyword)
        } else {
            memberRepo.getAllMembers()
        }
        source.map { list ->
            when (sort) {
                SortType.CREATE_TIME -> list.sortedByDescending { it.createTime }
                SortType.BALANCE -> list.sortedByDescending { it.balance }
                SortType.RECENT_CONSUME -> list.sortedByDescending { it.updateTime }
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _currentMember = MutableStateFlow<Member?>(null)
    val currentMember: StateFlow<Member?> = _currentMember.asStateFlow()

    private val _rechargeRecords = MutableStateFlow<List<Recharge>>(emptyList())
    val rechargeRecords: StateFlow<List<Recharge>> = _rechargeRecords.asStateFlow()

    private val _message = MutableSharedFlow<String>()
    val message: SharedFlow<String> = _message.asSharedFlow()

    fun search(keyword: String) {
        _searchKeyword.value = keyword
    }

    fun setSortType(sortType: SortType) {
        _sortType.value = sortType
    }

    fun loadMember(id: Long) {
        viewModelScope.launch {
            _currentMember.value = memberRepo.getMemberById(id)
        }
        viewModelScope.launch {
            memberRepo.getRechargeRecords(id).collect {
                _rechargeRecords.value = it
            }
        }
    }

    fun addMember(name: String, phone: String, gender: String, birthday: String, remark: String,
                  onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                memberRepo.addMember(
                    Member(name = name, phone = phone, gender = gender, birthday = birthday, remark = remark)
                )
                _message.emit("会员添加成功")
                onSuccess()
            } catch (e: Exception) {
                _message.emit("添加失败：手机号可能已存在")
            }
        }
    }

    fun updateMember(member: Member, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                memberRepo.updateMember(member.copy(updateTime = System.currentTimeMillis()))
                _message.emit("会员信息已更新")
                onSuccess()
            } catch (e: Exception) {
                _message.emit("更新失败：${e.message}")
            }
        }
    }

    fun deleteMember(member: Member, onSuccess: () -> Unit) {
        viewModelScope.launch {
            memberRepo.deleteMember(member)
            _message.emit("会员已删除")
            onSuccess()
        }
    }

    fun recharge(memberId: Long, amount: Double, remark: String = "") {
        viewModelScope.launch {
            val success = memberRepo.recharge(memberId, amount, remark)
            if (success) {
                _message.emit("充值成功")
                loadMember(memberId)
            } else {
                _message.emit("充值失败")
            }
        }
    }
}
