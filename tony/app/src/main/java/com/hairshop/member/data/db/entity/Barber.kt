package com.hairshop.member.data.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "barber")
data class Barber(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phone: String = "",
    val status: Int = 1, // 1=在职, 0=离职
    val remark: String = "",
    @ColumnInfo(name = "create_time") val createTime: Long = System.currentTimeMillis()
)
