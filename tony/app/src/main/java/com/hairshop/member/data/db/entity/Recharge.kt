package com.hairshop.member.data.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey

@Entity(
    tableName = "recharge",
    foreignKeys = [ForeignKey(
        entity = Member::class,
        parentColumns = ["id"],
        childColumns = ["member_id"],
        onDelete = ForeignKey.SET_NULL
    )]
)
data class Recharge(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "member_id") val memberId: Long?,
    val amount: Double,
    @ColumnInfo(name = "balance_after") val balanceAfter: Double,
    @ColumnInfo(name = "create_time") val createTime: Long = System.currentTimeMillis(),
    val remark: String = ""
)
