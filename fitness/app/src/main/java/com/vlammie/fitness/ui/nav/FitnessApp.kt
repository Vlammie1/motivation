package com.vlammie.fitness.ui.nav

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.CalendarBlank
import com.adamglin.phosphoricons.fill.ChartLineUp
import com.adamglin.phosphoricons.fill.ForkKnife
import com.adamglin.phosphoricons.fill.GearSix
import com.vlammie.fitness.ui.home.HomeScreen
import com.vlammie.fitness.ui.meals.MealsScreen
import com.vlammie.fitness.ui.progress.ProgressScreen
import com.vlammie.fitness.ui.session.SessionScreen
import com.vlammie.fitness.ui.settings.SettingsScreen
import com.vlammie.fitness.ui.settings.WorkoutEditorScreen
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.TextTertiary

object Routes {
    const val HOME = "home"
    const val PROGRESS = "progress"
    const val MEALS = "meals"
    const val SETTINGS = "settings"
    const val SESSION = "session/{dayId}"
    const val WORKOUT = "workout/{dayId}"

    fun session(dayId: String) = "session/$dayId"

    fun workout(dayId: String) = "workout/$dayId"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.HOME, "Vandaag", PhosphorIcons.Fill.CalendarBlank),
    Tab(Routes.PROGRESS, "Voortgang", PhosphorIcons.Fill.ChartLineUp),
    Tab(Routes.MEALS, "Voeding", PhosphorIcons.Fill.ForkKnife),
    Tab(Routes.SETTINGS, "Instellingen", PhosphorIcons.Fill.GearSix),
)

@Composable
fun FitnessApp() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute != Routes.SESSION && currentRoute != Routes.WORKOUT

    Scaffold(
        containerColor = Ink,
        bottomBar = {
            if (showBottomBar) {
                BottomBar(currentRoute = currentRoute, onSelect = navController::navigateToTab)
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = if (showBottomBar) padding.calculateBottomPadding() else 0.dp),
        ) {
            composable(Routes.HOME) {
                HomeScreen(
                    onStartSession = { dayId -> navController.navigate(Routes.session(dayId)) },
                    onOpenMeals = { navController.navigateToTab(Routes.MEALS) },
                    onOpenProgress = { navController.navigateToTab(Routes.PROGRESS) },
                )
            }
            composable(Routes.PROGRESS) { ProgressScreen() }
            composable(Routes.MEALS) { MealsScreen() }
            composable(Routes.SETTINGS) {
                SettingsScreen(
                    onEditWorkout = { dayId -> navController.navigate(Routes.workout(dayId)) },
                )
            }
            composable(Routes.SESSION) { entry ->
                SessionScreen(
                    dayId = entry.arguments?.getString("dayId").orEmpty(),
                    onExit = { navController.popBackStack() },
                )
            }
            composable(Routes.WORKOUT) { entry ->
                WorkoutEditorScreen(
                    dayId = entry.arguments?.getString("dayId").orEmpty(),
                    onBack = { navController.popBackStack() },
                )
            }
        }
    }
}

private fun NavHostController.navigateToTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

@Composable
internal fun BottomBar(currentRoute: String?, onSelect: (String) -> Unit) {
    Column {
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(Hairline))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0A0A0C))
                
                .padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            tabs.forEach { tab ->
                val selected = currentRoute == tab.route
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { onSelect(tab.route) }
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                ) {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.label,
                        tint = if (selected) Accent else TextTertiary,
                        modifier = Modifier.size(22.dp),
                    )
                    Text(
                        text = tab.label,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (selected) Accent else TextTertiary,
                    )
                }
            }
        }
    }
}
