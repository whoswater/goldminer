package com.hairshop.member.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.hairshop.member.HairShopApp
import com.hairshop.member.data.db.entity.ServiceProject
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class ProjectViewModel(application: Application) : AndroidViewModel(application) {
    private val app = application as HairShopApp
    private val projectRepo = app.projectRepository

    val projects: StateFlow<List<ServiceProject>> = projectRepo.getAllProjects()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _message = MutableSharedFlow<String>()
    val message: SharedFlow<String> = _message.asSharedFlow()

    fun addProject(name: String, price: Double, category: String) {
        viewModelScope.launch {
            projectRepo.addProject(
                ServiceProject(name = name, price = price, category = category)
            )
            _message.emit("项目添加成功")
        }
    }

    fun updateProject(project: ServiceProject) {
        viewModelScope.launch {
            projectRepo.updateProject(project)
            _message.emit("项目已更新")
        }
    }

    fun toggleStatus(project: ServiceProject) {
        viewModelScope.launch {
            val newStatus = if (project.status == 1) 0 else 1
            projectRepo.updateProject(project.copy(status = newStatus))
        }
    }

    fun deleteProject(project: ServiceProject) {
        viewModelScope.launch {
            if (projectRepo.canDelete(project.id)) {
                projectRepo.deleteProject(project)
                _message.emit("项目已删除")
            } else {
                _message.emit("该项目已有消费记录，只能禁用不能删除")
            }
        }
    }
}
