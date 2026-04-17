package com.hairshop.member.data.repository

import com.hairshop.member.data.db.dao.BarberDao
import com.hairshop.member.data.db.entity.Barber
import kotlinx.coroutines.flow.Flow

class BarberRepository(private val barberDao: BarberDao) {
    fun getAllBarbers(): Flow<List<Barber>> = barberDao.getAll()
    fun getActiveBarbers(): Flow<List<Barber>> = barberDao.getActive()

    suspend fun getBarberById(id: Long): Barber? = barberDao.getById(id)

    suspend fun addBarber(barber: Barber): Long = barberDao.insert(barber)

    suspend fun updateBarber(barber: Barber) = barberDao.update(barber)

    suspend fun canDelete(barberId: Long): Boolean = barberDao.getOrderCount(barberId) == 0

    suspend fun deleteBarber(barber: Barber) = barberDao.delete(barber)
}
