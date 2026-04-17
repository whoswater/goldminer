package com.hairshop.member.data.repository

import androidx.room.withTransaction
import com.hairshop.member.data.db.AppDatabase
import com.hairshop.member.data.db.dao.MemberDao
import com.hairshop.member.data.db.dao.OrderDao
import com.hairshop.member.data.db.dao.OrderWithMemberName
import com.hairshop.member.data.db.entity.Order
import com.hairshop.member.data.db.entity.OrderItem
import kotlinx.coroutines.flow.Flow
import java.text.SimpleDateFormat
import java.util.*

class OrderRepository(
    private val orderDao: OrderDao,
    private val memberDao: MemberDao,
    private val database: AppDatabase
) {
    fun getAllOrders(): Flow<List<OrderWithMemberName>> = orderDao.getAllWithMember()

    fun getOrdersByMember(memberId: Long): Flow<List<OrderWithMemberName>> =
        orderDao.getByMemberId(memberId)

    fun getOrdersByTimeRange(start: Long, end: Long): Flow<List<OrderWithMemberName>> =
        orderDao.getByTimeRange(start, end)

    fun getTodayRevenue(todayStart: Long): Flow<Double> =
        orderDao.getTotalAmountSince(todayStart)

    fun getTodayOrderCount(todayStart: Long): Flow<Int> =
        orderDao.getCountSince(todayStart)

    suspend fun getOrderItems(orderId: Long): List<OrderItem> =
        orderDao.getItemsByOrderId(orderId)

    fun getOrdersByBarber(barberId: Long): Flow<List<OrderWithMemberName>> =
        orderDao.getByBarberId(barberId)

    suspend fun createOrder(
        memberId: Long,
        items: List<OrderItem>,
        payType: String,
        barberId: Long? = null,
        remark: String = "",
        operator: String = ""
    ): Long {
        val totalAmount = items.sumOf { it.price * it.num }
        val orderSn = generateOrderSn()

        val order = Order(
            orderSn = orderSn,
            memberId = memberId,
            barberId = barberId,
            totalAmount = totalAmount,
            payType = payType,
            remark = remark,
            operator = operator
        )

        return database.withTransaction {
            val orderId = orderDao.insertOrderWithItems(order, items)
            if (payType == "余额") {
                memberDao.updateBalance(memberId, -totalAmount)
            }
            orderId
        }
    }

    private fun generateOrderSn(): String {
        val sdf = SimpleDateFormat("yyyyMMddHHmmss", Locale.CHINA)
        val random = (1000..9999).random()
        return "${sdf.format(Date())}$random"
    }
}
