package com.hairshop.member.data.repository

import android.content.Context
import android.os.Environment
import com.hairshop.member.data.db.AppDatabase
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*

class BackupRepository(private val context: Context) {

    fun backup(): Result<String> {
        return try {
            val dbFile = File(AppDatabase.getDbPath(context))
            if (!dbFile.exists()) return Result.failure(Exception("数据库文件不存在"))

            val backupDir = File(
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                "HairShopBackup"
            )
            if (!backupDir.exists()) backupDir.mkdirs()

            val sdf = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.CHINA)
            val backupFile = File(backupDir, "hairshop_${sdf.format(Date())}.db")

            FileInputStream(dbFile).use { input ->
                FileOutputStream(backupFile).use { output ->
                    input.copyTo(output)
                }
            }
            // Also copy WAL and SHM files if they exist
            copyIfExists("${dbFile.path}-wal", "${backupFile.path}-wal")
            copyIfExists("${dbFile.path}-shm", "${backupFile.path}-shm")

            Result.success(backupFile.absolutePath)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun restore(backupPath: String): Result<Unit> {
        return try {
            val backupFile = File(backupPath)
            if (!backupFile.exists()) return Result.failure(Exception("备份文件不存在"))

            val dbFile = File(AppDatabase.getDbPath(context))
            // Close database before restore
            AppDatabase.getInstance(context).close()

            FileInputStream(backupFile).use { input ->
                FileOutputStream(dbFile).use { output ->
                    input.copyTo(output)
                }
            }
            copyIfExists("${backupPath}-wal", "${dbFile.path}-wal")
            copyIfExists("${backupPath}-shm", "${dbFile.path}-shm")

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getBackupFiles(): List<File> {
        val backupDir = File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            "HairShopBackup"
        )
        if (!backupDir.exists()) return emptyList()
        return backupDir.listFiles { file -> file.extension == "db" }
            ?.sortedByDescending { it.lastModified() }
            ?: emptyList()
    }

    fun clearAllData(): Result<Unit> {
        return try {
            context.deleteDatabase("hairshop.db")
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun copyIfExists(src: String, dst: String) {
        val srcFile = File(src)
        if (srcFile.exists()) {
            FileInputStream(srcFile).use { input ->
                FileOutputStream(File(dst)).use { output ->
                    input.copyTo(output)
                }
            }
        }
    }
}
