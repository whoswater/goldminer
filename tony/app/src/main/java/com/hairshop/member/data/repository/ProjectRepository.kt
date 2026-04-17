package com.hairshop.member.data.repository

import com.hairshop.member.data.db.dao.ProjectDao
import com.hairshop.member.data.db.entity.ServiceProject
import kotlinx.coroutines.flow.Flow

class ProjectRepository(private val projectDao: ProjectDao) {
    fun getAllProjects(): Flow<List<ServiceProject>> = projectDao.getAll()
    fun getEnabledProjects(): Flow<List<ServiceProject>> = projectDao.getEnabled()

    suspend fun getProjectById(id: Long): ServiceProject? = projectDao.getById(id)

    suspend fun addProject(project: ServiceProject): Long = projectDao.insert(project)

    suspend fun updateProject(project: ServiceProject) = projectDao.update(project)

    suspend fun canDelete(projectId: Long): Boolean = projectDao.getUsageCount(projectId) == 0

    suspend fun deleteProject(project: ServiceProject) = projectDao.delete(project)
}
