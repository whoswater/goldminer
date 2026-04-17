package com.hairshop.member.viewmodel

import android.app.Application
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hairshop.member.data.db.AppDatabase
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

private val Application.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsViewModel(application: Application) : AndroidViewModel(application) {
    private val dataStore = application.dataStore

    companion object {
        val KEY_SHOP_NAME = stringPreferencesKey("shop_name")
        val KEY_ADMIN_NAME = stringPreferencesKey("admin_name")
    }

    val shopName: StateFlow<String> = dataStore.data
        .map { it[KEY_SHOP_NAME] ?: "我的理发店" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "我的理发店")

    val adminName: StateFlow<String> = dataStore.data
        .map { it[KEY_ADMIN_NAME] ?: "管理员" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "管理员")

    val dbPath: String = AppDatabase.getDbPath(application)

    fun updateShopName(name: String) {
        viewModelScope.launch {
            dataStore.edit { it[KEY_SHOP_NAME] = name }
        }
    }

    fun updateAdminName(name: String) {
        viewModelScope.launch {
            dataStore.edit { it[KEY_ADMIN_NAME] = name }
        }
    }
}
