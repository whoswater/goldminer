package com.hairshop.member.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hairshop.member.HairShopApp
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File

class BackupViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as HairShopApp
    private val backupRepo = app.backupRepository

    private val _backupFiles = MutableStateFlow<List<File>>(emptyList())
    val backupFiles: StateFlow<List<File>> = _backupFiles.asStateFlow()

    private val _message = MutableSharedFlow<String>()
    val message: SharedFlow<String> = _message.asSharedFlow()

    init {
        refreshBackups()
    }

    fun refreshBackups() {
        _backupFiles.value = backupRepo.getBackupFiles()
    }

    fun backup() {
        viewModelScope.launch {
            backupRepo.backup().fold(
                onSuccess = {
                    _message.emit("备份成功：$it")
                    refreshBackups()
                },
                onFailure = {
                    _message.emit("备份失败：${it.message ?: "未知错误"}")
                }
            )
        }
    }

    fun restore(path: String) {
        viewModelScope.launch {
            backupRepo.restore(path).fold(
                onSuccess = { _message.emit("恢复成功，请重启应用") },
                onFailure = { _message.emit("恢复失败：${it.message ?: "未知错误"}") }
            )
        }
    }

    fun clearAllData() {
        viewModelScope.launch {
            backupRepo.clearAllData().fold(
                onSuccess = { _message.emit("数据已清空，请重启应用") },
                onFailure = { _message.emit("清空失败：${it.message ?: "未知错误"}") }
            )
        }
    }
}
