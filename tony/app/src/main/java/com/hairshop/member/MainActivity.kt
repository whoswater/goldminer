package com.hairshop.member

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.hairshop.member.ui.navigation.AppNavGraph
import com.hairshop.member.ui.navigation.NavRoutes
import com.hairshop.member.ui.theme.HairShopTheme

data class BottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem(NavRoutes.HOME, "首页", Icons.Default.Home),
    BottomNavItem(NavRoutes.MEMBER_LIST, "会员", Icons.Default.People),
    BottomNavItem(NavRoutes.ORDER_CREATE, "开单", Icons.Default.AddCircle),
    BottomNavItem(NavRoutes.RECORD_LIST, "记录", Icons.Default.History),
    BottomNavItem(NavRoutes.MORE, "更多", Icons.Default.Menu),
)

// Routes that show the bottom bar
private val bottomBarRoutes = setOf(
    NavRoutes.HOME, NavRoutes.MEMBER_LIST, NavRoutes.ORDER_CREATE,
    NavRoutes.RECORD_LIST, NavRoutes.MORE
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HairShopTheme {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    bottomBar = {
                        if (currentRoute in bottomBarRoutes) {
                            NavigationBar {
                                bottomNavItems.forEach { item ->
                                    NavigationBarItem(
                                        icon = {
                                            Icon(
                                                item.icon, item.label,
                                                modifier = if (item.route == NavRoutes.ORDER_CREATE)
                                                    Modifier else Modifier
                                            )
                                        },
                                        label = { Text(item.label, fontSize = 11.sp) },
                                        selected = currentRoute == item.route,
                                        onClick = {
                                            if (currentRoute != item.route) {
                                                navController.navigate(item.route) {
                                                    popUpTo(navController.graph.findStartDestination().id) {
                                                        saveState = true
                                                    }
                                                    launchSingleTop = true
                                                    restoreState = true
                                                }
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                ) { innerPadding ->
                    Surface(modifier = Modifier.padding(innerPadding)) {
                        AppNavGraph(navController = navController)
                    }
                }
            }
        }
    }
}
