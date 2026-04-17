package com.hairshop.member.data.db.dao

import androidx.room.*
import com.hairshop.member.data.db.entity.Order
import com.hairshop.member.data.db.entity.OrderItem
import kotlinx.coroutines.flow.Flow

data class OrderWithMemberName(
    val id: Long,
    @ColumnInfo(name = "order_sn") val orderSn: String,
    @ColumnInfo(name = "member_id") val memberId: Long?,
    @ColumnInfo(name = "member_name") val memberName: String?,
    @ColumnInfo(name = "member_phone") val memberPhone: String?,
    @ColumnInfo(name = "barber_id") val barberId: Long?,
    @ColumnInfo(name = "barber_name") val barberName: String?,
    @ColumnInfo(name = "total_amount") val totalAmount: Double,
    @ColumnInfo(name = "pay_type") val payType: String,
    @ColumnInfo(name = "create_time") val createTime: Long,
    val remark: String,
    val operator: String
)

@Dao
interface OrderDao {
    @Query("""
        SELECT o.id, o.order_sn, o.member_id, m.name as member_name, m.phone as member_phone,
               o.barber_id, b.name as barber_name,
               o.total_amount, o.pay_type, o.create_time, o.remark, o.operator
        FROM orders o
        LEFT JOIN member m ON o.member_id = m.id
        LEFT JOIN barber b ON o.barber_id = b.id
        ORDER BY o.create_time DESC
    """)
    fun getAllWithMember(): Flow<List<OrderWithMemberName>>

    @Query("""
        SELECT o.id, o.order_sn, o.member_id, m.name as member_name, m.phone as member_phone,
               o.barber_id, b.name as barber_name,
               o.total_amount, o.pay_type, o.create_time, o.remark, o.operator
        FROM orders o
        LEFT JOIN member m ON o.member_id = m.id
        LEFT JOIN barber b ON o.barber_id = b.id
        WHERE o.member_id = :memberId
        ORDER BY o.create_time DESC
    """)
    fun getByMemberId(memberId: Long): Flow<List<OrderWithMemberName>>

    @Query("""
        SELECT o.id, o.order_sn, o.member_id, m.name as member_name, m.phone as member_phone,
               o.barber_id, b.name as barber_name,
               o.total_amount, o.pay_type, o.create_time, o.remark, o.operator
        FROM orders o
        LEFT JOIN member m ON o.member_id = m.id
        LEFT JOIN barber b ON o.barber_id = b.id
        WHERE o.create_time >= :startTime AND o.create_time <= :endTime
        ORDER BY o.create_time DESC
    """)
    fun getByTimeRange(startTime: Long, endTime: Long): Flow<List<OrderWithMemberName>>

    @Query("""
        SELECT o.id, o.order_sn, o.member_id, m.name as member_name, m.phone as member_phone,
               o.barber_id, b.name as barber_name,
               o.total_amount, o.pay_type, o.create_time, o.remark, o.operator
        FROM orders o
        LEFT JOIN member m ON o.member_id = m.id
        LEFT JOIN barber b ON o.barber_id = b.id
        WHERE o.barber_id = :barberId
        ORDER BY o.create_time DESC
    """)
    fun getByBarberId(barberId: Long): Flow<List<OrderWithMemberName>>

    @Query("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE create_time >= :startTime")
    fun getTotalAmountSince(startTime: Long): Flow<Double>

    @Query("SELECT COUNT(*) FROM orders WHERE create_time >= :startTime")
    fun getCountSince(startTime: Long): Flow<Int>

    @Insert
    suspend fun insertOrder(order: Order): Long

    @Insert
    suspend fun insertItems(items: List<OrderItem>)

    @Transaction
    suspend fun insertOrderWithItems(order: Order, items: List<OrderItem>): Long {
        val orderId = insertOrder(order)
        val itemsWithOrderId = items.map { it.copy(orderId = orderId) }
        insertItems(itemsWithOrderId)
        return orderId
    }

    @Query("SELECT * FROM order_item WHERE order_id = :orderId")
    suspend fun getItemsByOrderId(orderId: Long): List<OrderItem>
}
