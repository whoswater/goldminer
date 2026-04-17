package com.hairshop.member.ui.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.hairshop.member.ui.screens.backup.BackupScreen
import com.hairshop.member.ui.screens.home.HomeScreen
import com.hairshop.member.ui.screens.member.MemberAddScreen
import com.hairshop.member.ui.screens.member.MemberDetailScreen
import com.hairshop.member.ui.screens.member.MemberEditScreen
import com.hairshop.member.ui.screens.member.MemberListScreen
import com.hairshop.member.ui.screens.more.MoreScreen
import com.hairshop.member.ui.screens.order.OrderCreateScreen
import com.hairshop.member.ui.screens.barber.BarberListScreen
import com.hairshop.member.ui.screens.project.ProjectListScreen
import com.hairshop.member.ui.screens.record.RecordListScreen
import com.hairshop.member.ui.screens.settings.SettingsScreen
import com.hairshop.member.viewmodel.MemberViewModel
import com.hairshop.member.viewmodel.OrderViewModel

@Composable
fun AppNavGraph(navController: NavHostController) {
    val memberViewModel: MemberViewModel = viewModel()
    val orderViewModel: OrderViewModel = viewModel()

    NavHost(navController = navController, startDestination = NavRoutes.HOME) {
        // Bottom nav destinations (no back button)
        composable(NavRoutes.HOME) {
            HomeScreen(onNavigate = { route -> navController.navigate(route) })
        }

        composable(NavRoutes.MEMBER_LIST) {
            MemberListScreen(
                onBack = null,
                onMemberClick = { id -> navController.navigate(NavRoutes.memberDetail(id)) },
                onAddMember = { navController.navigate(NavRoutes.MEMBER_ADD) },
                viewModel = memberViewModel
            )
        }

        composable(NavRoutes.ORDER_CREATE) {
            OrderCreateScreen(
                onBack = { navController.popBackStack() },
                orderViewModel = orderViewModel,
                memberViewModel = memberViewModel,
                isTopLevel = true
            )
        }

        composable(NavRoutes.RECORD_LIST) {
            RecordListScreen(
                onBack = null,
                viewModel = orderViewModel
            )
        }

        composable(NavRoutes.MORE) {
            MoreScreen(onNavigate = { route -> navController.navigate(route) })
        }

        // Sub-screens (with back button)
        composable(NavRoutes.MEMBER_ADD) {
            MemberAddScreen(
                onBack = { navController.popBackStack() },
                viewModel = memberViewModel
            )
        }

        composable(
            route = NavRoutes.MEMBER_DETAIL,
            arguments = listOf(navArgument("memberId") { type = NavType.LongType })
        ) { backStackEntry ->
            val memberId = backStackEntry.arguments?.getLong("memberId") ?: return@composable
            MemberDetailScreen(
                memberId = memberId,
                onBack = { navController.popBackStack() },
                onEdit = { id -> navController.navigate(NavRoutes.memberEdit(id)) },
                onCreateOrder = { id -> navController.navigate(NavRoutes.orderCreateForMember(id)) },
                memberViewModel = memberViewModel,
                orderViewModel = orderViewModel
            )
        }

        composable(
            route = NavRoutes.MEMBER_EDIT,
            arguments = listOf(navArgument("memberId") { type = NavType.LongType })
        ) { backStackEntry ->
            val memberId = backStackEntry.arguments?.getLong("memberId") ?: return@composable
            MemberEditScreen(
                memberId = memberId,
                onBack = { navController.popBackStack() },
                viewModel = memberViewModel
            )
        }

        composable(
            route = NavRoutes.ORDER_CREATE_FOR_MEMBER,
            arguments = listOf(navArgument("memberId") { type = NavType.LongType })
        ) { backStackEntry ->
            val memberId = backStackEntry.arguments?.getLong("memberId") ?: return@composable
            OrderCreateScreen(
                preselectedMemberId = memberId,
                onBack = { navController.popBackStack() },
                orderViewModel = orderViewModel,
                memberViewModel = memberViewModel
            )
        }

        composable(NavRoutes.PROJECT_LIST) {
            ProjectListScreen(onBack = { navController.popBackStack() })
        }

        composable(NavRoutes.BARBER_LIST) {
            BarberListScreen(onBack = { navController.popBackStack() })
        }

        composable(NavRoutes.BACKUP) {
            BackupScreen(onBack = { navController.popBackStack() })
        }

        composable(NavRoutes.SETTINGS) {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
    }
}
