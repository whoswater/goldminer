package com.hairshop.member.data.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "member",
    indices = [Index(value = ["phone"], unique = true)]
)
data class Member(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phone: String,
    val balance: Double = 0.0,
    val gender: String = "",
    val birthday: String = "",
    val remark: String = "",
    @ColumnInfo(name = "create_time") val createTime: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "update_time") val updateTime: Long = System.currentTimeMillis()
)
