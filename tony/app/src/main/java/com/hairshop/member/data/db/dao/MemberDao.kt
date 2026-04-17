package com.hairshop.member.data.db.dao

import androidx.room.*
import com.hairshop.member.data.db.entity.Member
import kotlinx.coroutines.flow.Flow

@Dao
interface MemberDao {
    @Query("SELECT * FROM member ORDER BY create_time DESC")
    fun getAll(): Flow<List<Member>>

    @Query("SELECT * FROM member WHERE id = :id")
    suspend fun getById(id: Long): Member?

    @Query("SELECT * FROM member WHERE name LIKE '%' || :keyword || '%' OR phone LIKE '%' || :keyword || '%'")
    fun search(keyword: String): Flow<List<Member>>

    @Query("SELECT COUNT(*) FROM member")
    fun getTotalCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM member WHERE create_time >= :startTime")
    fun getCountSince(startTime: Long): Flow<Int>

    @Insert
    suspend fun insert(member: Member): Long

    @Update
    suspend fun update(member: Member)

    @Query("UPDATE member SET balance = balance + :amount, update_time = :time WHERE id = :memberId")
    suspend fun updateBalance(memberId: Long, amount: Double, time: Long = System.currentTimeMillis())

    @Delete
    suspend fun delete(member: Member)

    @Query("SELECT * FROM member ORDER BY balance DESC")
    fun getAllByBalance(): Flow<List<Member>>

    @Query("SELECT * FROM member ORDER BY update_time DESC")
    fun getAllByRecentConsume(): Flow<List<Member>>
}
