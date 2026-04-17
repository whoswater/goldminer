package com.hairshop.member.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hairshop.member.HairShopApp
import com.hairshop.member.data.db.entity.Barber
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class BarberViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as HairShopApp
    private val barberRepo = app.barberRepository

    val barbers: StateFlow<List<Barber>> = barberRepo.getAllBarbers()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val activeBarbers: StateFlow<List<Barber>> = barberRepo.getActiveBarbers()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _message = MutableSharedFlow<String>()
    val message: SharedFlow<String> = _message.asSharedFlow()

    fun addBarber(name: String, phone: String, remark: String = "") {
        viewModelScope.launch {
            barberRepo.addBarber(Barber(name = name, phone = phone, remark = remark))
            _message.emit("理发师添加成功")
        }
    }

    fun updateBarber(barber: Barber) {
        viewModelScope.launch {
            barberRepo.updateBarber(barber)
            _message.emit("理发师信息已更新")
        }
    }

    fun toggleStatus(barber: Barber) {
        viewModelScope.launch {
            val newStatus = if (barber.status == 1) 0 else 1
            barberRepo.updateBarber(barber.copy(status = newStatus))
        }
    }

    fun deleteBarber(barber: Barber) {
        viewModelScope.launch {
            if (barberRepo.canDelete(barber.id)) {
                barberRepo.deleteBarber(barber)
                _message.emit("理发师已删除")
            } else {
                _message.emit("该理发师已有服务记录，只能设为离职不能删除")
            }
        }
    }
}
