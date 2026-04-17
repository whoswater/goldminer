package com.hairshop.member.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.hairshop.member.data.db.dao.BarberDao
import com.hairshop.member.data.db.dao.MemberDao
import com.hairshop.member.data.db.dao.OrderDao
import com.hairshop.member.data.db.dao.ProjectDao
import com.hairshop.member.data.db.dao.RechargeDao
import com.hairshop.member.data.db.entity.*

@Database(
    entities = [Member::class, ServiceProject::class, Recharge::class, Order::class, OrderItem::class, Barber::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun memberDao(): MemberDao
    abstract fun projectDao(): ProjectDao
    abstract fun rechargeDao(): RechargeDao
    abstract fun orderDao(): OrderDao
    abstract fun barberDao(): BarberDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null
        private const val DB_NAME = "hairshop.db"

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DB_NAME
                ).build().also { INSTANCE = it }
            }
        }

        fun getDbPath(context: Context): String {
            return context.getDatabasePath(DB_NAME).absolutePath
        }
    }
}
