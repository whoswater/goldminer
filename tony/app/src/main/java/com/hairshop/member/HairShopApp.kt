package com.hairshop.member

import android.app.Application
import com.hairshop.member.data.db.AppDatabase
import com.hairshop.member.data.repository.BackupRepository
import com.hairshop.member.data.repository.BarberRepository
import com.hairshop.member.data.repository.MemberRepository
import com.hairshop.member.data.repository.OrderRepository
import com.hairshop.member.data.repository.ProjectRepository

class HairShopApp : Application() {
    val database by lazy { AppDatabase.getInstance(this) }
    val memberRepository by lazy {
        MemberRepository(database.memberDao(), database.rechargeDao(), database)
    }
    val projectRepository by lazy { ProjectRepository(database.projectDao()) }
    val barberRepository by lazy { BarberRepository(database.barberDao()) }
    val orderRepository by lazy { OrderRepository(database.orderDao(), database.memberDao(), database) }
    val backupRepository by lazy { BackupRepository(this) }
}
