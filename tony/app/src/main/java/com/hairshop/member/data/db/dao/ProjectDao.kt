package com.hairshop.member.data.db.dao

import androidx.room.*
import com.hairshop.member.data.db.entity.ServiceProject
import kotlinx.coroutines.flow.Flow

@Dao
interface ProjectDao {
    @Query("SELECT * FROM project ORDER BY create_time DESC")
    fun getAll(): Flow<List<ServiceProject>>

    @Query("SELECT * FROM project WHERE status = 1 ORDER BY category, name")
    fun getEnabled(): Flow<List<ServiceProject>>

    @Query("SELECT * FROM project WHERE id = :id")
    suspend fun getById(id: Long): ServiceProject?

    @Query("SELECT COUNT(*) FROM order_item WHERE project_id = :projectId")
    suspend fun getUsageCount(projectId: Long): Int

    @Insert
    suspend fun insert(project: ServiceProject): Long

    @Update
    suspend fun update(project: ServiceProject)

    @Delete
    suspend fun delete(project: ServiceProject)
}
