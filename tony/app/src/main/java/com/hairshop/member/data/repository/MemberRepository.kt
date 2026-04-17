package com.hairshop.member.data.repository

import androidx.room.withTransaction
import com.hairshop.member.data.db.AppDatabase
import com.hairshop.member.data.db.dao.MemberDao
import com.hairshop.member.data.db.dao.RechargeDao
import com.hairshop.member.data.db.entity.Member
import com.hairshop.member.data.db.entity.Recharge
import kotlinx.coroutines.flow.Flow

class MemberRepository(
    private val memberDao: MemberDao,
    private val rechargeDao: RechargeDao,
    private val database: AppDatabase
) {
    fun getAllMembers(): Flow<List<Member>> = memberDao.getAll()
    fun getAllByBalance(): Flow<List<Member>> = memberDao.getAllByBalance()
    fun getAllByRecentConsume(): Flow<List<Member>> = memberDao.getAllByRecentConsume()
    fun searchMembers(keyword: String): Flow<List<Member>> = memberDao.search(keyword)
    fun getTotalCount(): Flow<Int> = memberDao.getTotalCount()
    fun getCountSince(startTime: Long): Flow<Int> = memberDao.getCountSince(startTime)

    suspend fun getMemberById(id: Long): Member? = memberDao.getById(id)

    suspend fun addMember(member: Member): Long = memberDao.insert(member)

    suspend fun updateMember(member: Member) = memberDao.update(member)

    suspend fun deleteMember(member: Member) = memberDao.delete(member)

    suspend fun recharge(memberId: Long, amount: Double, remark: String = ""): Boolean {
        return database.withTransaction {
            val member = memberDao.getById(memberId) ?: return@withTransaction false
            val newBalance = member.balance + amount
            memberDao.updateBalance(memberId, amount)
            rechargeDao.insert(
                Recharge(
                    memberId = memberId,
                    amount = amount,
                    balanceAfter = newBalance,
                    remark = remark
                )
            )
            true
        }
    }

    fun getRechargeRecords(memberId: Long): Flow<List<Recharge>> =
        rechargeDao.getByMemberId(memberId)
}
