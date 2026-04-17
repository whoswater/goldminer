package com.hairshop.member.data.db.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "project")
data class ServiceProject(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val price: Double,
    val category: String = "",
    val status: Int = 1, // 1=启用, 0=禁用
    @ColumnInfo(name = "create_time") val createTime: Long = System.currentTimeMillis()
)
