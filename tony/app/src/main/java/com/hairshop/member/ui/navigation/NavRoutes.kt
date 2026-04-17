package com.hairshop.member.ui.navigation

object NavRoutes {
    const val HOME = "home"
    const val MEMBER_LIST = "member_list"
    const val MEMBER_ADD = "member_add"
    const val MEMBER_DETAIL = "member_detail/{memberId}"
    const val MEMBER_EDIT = "member_edit/{memberId}"
    const val ORDER_CREATE = "order_create"
    const val ORDER_CREATE_FOR_MEMBER = "order_create/{memberId}"
    const val RECORD_LIST = "record_list"
    const val PROJECT_LIST = "project_list"
    const val BARBER_LIST = "barber_list"
    const val MORE = "more"
    const val BACKUP = "backup"
    const val SETTINGS = "settings"

    fun memberDetail(id: Long) = "member_detail/$id"
    fun memberEdit(id: Long) = "member_edit/$id"
    fun orderCreateForMember(id: Long) = "order_create/$id"
}
