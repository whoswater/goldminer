package com.hairshop.member.data.db.dao

import androidx.room.*
import com.hairshop.member.data.db.entity.Barber
import kotlinx.coroutines.flow.Flow

@Dao
interface BarberDao {
    @Query("SELECT * FROM barber ORDER BY status DESC, create_time DESC")
    fun getAll(): Flow<List<Barber>>

    @Query("SELECT * FROM barber WHERE status = 1 ORDER BY name")
    fun getActive(): Flow<List<Barber>>

    @Query("SELECT * FROM barber WHERE id = :id")
    suspend fun getById(id: Long): Barber?

    @Insert
    suspend fun insert(barber: Barber): Long

    @Update
    suspend fun update(barber: Barber)

    @Delete
    suspend fun delete(barber: Barber)

    @Query("SELECT COUNT(*) FROM orders WHERE barber_id = :barberId")
    suspend fun getOrderCount(barberId: Long): Int
}
