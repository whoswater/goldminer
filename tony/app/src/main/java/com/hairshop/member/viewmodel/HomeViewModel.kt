package com.hairshop.member.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import com.hairshop.member.HairShopApp
import kotlinx.coroutines.flow.Flow
import java.util.*

class HomeViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as HairShopApp
    private val memberRepo = app.memberRepository
    private val orderRepo = app.orderRepository

    private val todayStart: Long = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    val todayRevenue: Flow<Double> = orderRepo.getTodayRevenue(todayStart)
    val todayOrderCount: Flow<Int> = orderRepo.getTodayOrderCount(todayStart)
    val totalMemberCount: Flow<Int> = memberRepo.getTotalCount()
    val todayNewMemberCount: Flow<Int> = memberRepo.getCountSince(todayStart)
}
