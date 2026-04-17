package com.hairshop.member.data.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey

@Entity(
    tableName = "orders",
    foreignKeys = [
        ForeignKey(
            entity = Member::class,
            parentColumns = ["id"],
            childColumns = ["member_id"],
            onDelete = ForeignKey.SET_NULL
        ),
        ForeignKey(
            entity = Barber::class,
            parentColumns = ["id"],
            childColumns = ["barber_id"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class Order(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "order_sn") val orderSn: String,
    @ColumnInfo(name = "member_id") val memberId: Long?,
    @ColumnInfo(name = "barber_id") val barberId: Long? = null,
    @ColumnInfo(name = "total_amount") val totalAmount: Double,
    @ColumnInfo(name = "pay_type") val payType: String, // 余额/现金/微信/支付宝
    @ColumnInfo(name = "create_time") val createTime: Long = System.currentTimeMillis(),
    val remark: String = "",
    val operator: String = ""
)
