package com.hairshop.member.data.db.dao

import androidx.room.*
import com.hairshop.member.data.db.entity.Recharge
import kotlinx.coroutines.flow.Flow

@Dao
interface RechargeDao {
    @Query("SELECT * FROM recharge WHERE member_id = :memberId ORDER BY create_time DESC")
    fun getByMemberId(memberId: Long): Flow<List<Recharge>>

    @Insert
    suspend fun insert(recharge: Recharge): Long
}
