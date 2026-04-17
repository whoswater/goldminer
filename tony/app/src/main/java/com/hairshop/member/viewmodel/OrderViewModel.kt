package com.hairshop.member.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hairshop.member.HairShopApp
import com.hairshop.member.data.db.dao.OrderWithMemberName
import com.hairshop.member.data.db.entity.Barber
import com.hairshop.member.data.db.entity.Member
import com.hairshop.member.data.db.entity.OrderItem
import com.hairshop.member.data.db.entity.ServiceProject
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class CartItem(
    val project: ServiceProject,
    val actualPrice: Double = project.price,
    val quantity: Int = 1
)

class OrderViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as HairShopApp
    private val orderRepo = app.orderRepository
    private val memberRepo = app.memberRepository
    private val projectRepo = app.projectRepository
    private val barberRepo = app.barberRepository

    val enabledProjects: StateFlow<List<ServiceProject>> = projectRepo.getEnabledProjects()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allOrders: StateFlow<List<OrderWithMemberName>> = orderRepo.getAllOrders()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _cart = MutableStateFlow<List<CartItem>>(emptyList())
    val cart: StateFlow<List<CartItem>> = _cart.asStateFlow()

    val cartTotal: StateFlow<Double> = _cart.map { items ->
        items.sumOf { it.actualPrice * it.quantity }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    private val _selectedMember = MutableStateFlow<Member?>(null)
    val selectedMember: StateFlow<Member?> = _selectedMember.asStateFlow()

    private val _memberSearchResults = MutableStateFlow<List<Member>>(emptyList())
    val memberSearchResults: StateFlow<List<Member>> = _memberSearchResults.asStateFlow()

    val activeBarbers: StateFlow<List<Barber>> = barberRepo.getActiveBarbers()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _selectedBarber = MutableStateFlow<Barber?>(null)
    val selectedBarber: StateFlow<Barber?> = _selectedBarber.asStateFlow()

    fun selectBarber(barber: Barber?) {
        _selectedBarber.value = barber
    }

    private val _orderItems = MutableStateFlow<List<OrderItem>>(emptyList())
    val orderItems: StateFlow<List<OrderItem>> = _orderItems.asStateFlow()

    private val _message = MutableSharedFlow<String>()
    val message: SharedFlow<String> = _message.asSharedFlow()

    fun searchMember(keyword: String) {
        viewModelScope.launch {
            memberRepo.searchMembers(keyword).collect {
                _memberSearchResults.value = it
            }
        }
    }

    fun selectMember(member: Member) {
        _selectedMember.value = member
    }

    fun clearMember() {
        _selectedMember.value = null
    }

    fun addToCart(project: ServiceProject) {
        val current = _cart.value.toMutableList()
        val index = current.indexOfFirst { it.project.id == project.id }
        if (index >= 0) {
            current[index] = current[index].copy(quantity = current[index].quantity + 1)
            _cart.value = current
        } else {
            _cart.value = current + CartItem(project)
        }
    }

    fun removeFromCart(projectId: Long) {
        _cart.value = _cart.value.filter { it.project.id != projectId }
    }

    fun updateCartItemPrice(projectId: Long, newPrice: Double) {
        val current = _cart.value.toMutableList()
        val index = current.indexOfFirst { it.project.id == projectId }
        if (index >= 0) {
            current[index] = current[index].copy(actualPrice = newPrice)
            _cart.value = current
        }
    }

    fun clearCart() {
        _cart.value = emptyList()
        _selectedMember.value = null
        _selectedBarber.value = null
    }

    fun submitOrder(payType: String, remark: String = "", operator: String = "", onSuccess: () -> Unit) {
        val member = _selectedMember.value
        val cartItems = _cart.value

        if (member == null) {
            viewModelScope.launch { _message.emit("请选择会员") }
            return
        }
        if (cartItems.isEmpty()) {
            viewModelScope.launch { _message.emit("请选择消费项目") }
            return
        }

        viewModelScope.launch {
            val total = cartItems.sumOf { it.actualPrice * it.quantity }

            // Fetch fresh member data for balance check
            if (payType == "余额") {
                val freshMember = memberRepo.getMemberById(member.id)
                if (freshMember == null || freshMember.balance < total) {
                    val bal = freshMember?.balance ?: 0.0
                    _message.emit("会员余额不足，当前余额：¥${"%.2f".format(bal)}")
                    return@launch
                }
            }

            val items = cartItems.map {
                OrderItem(
                    orderId = 0,
                    projectId = it.project.id,
                    projectName = it.project.name,
                    price = it.actualPrice,
                    num = it.quantity
                )
            }
            orderRepo.createOrder(
                memberId = member.id,
                items = items,
                payType = payType,
                barberId = _selectedBarber.value?.id,
                remark = remark,
                operator = operator
            )
            _message.emit("开单成功")
            clearCart()
            onSuccess()
        }
    }

    fun loadOrderItems(orderId: Long) {
        viewModelScope.launch {
            _orderItems.value = orderRepo.getOrderItems(orderId)
        }
    }

    fun getOrdersByMember(memberId: Long): Flow<List<OrderWithMemberName>> =
        orderRepo.getOrdersByMember(memberId)
}
