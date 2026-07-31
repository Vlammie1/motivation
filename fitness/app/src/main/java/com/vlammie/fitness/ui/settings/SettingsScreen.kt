package com.vlammie.fitness.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Route
import com.vlammie.fitness.data.repo.FitnessRepository
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.Surface1
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.Surface3
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import com.vlammie.fitness.ui.theme.TextTertiary
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class SettingsUiState(
    val route: Route = Route.A,
    val restFeedback: Boolean = true,
)

class SettingsViewModel(private val repo: FitnessRepository) : ViewModel() {

    val state = combine(repo.settings.route, repo.settings.restFeedback) { route, feedback ->
        SettingsUiState(route, feedback)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    fun setRoute(route: Route) = viewModelScope.launch { repo.settings.setRoute(route) }

    fun setRestFeedback(enabled: Boolean) = viewModelScope.launch { repo.settings.setRestFeedback(enabled) }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                SettingsViewModel(app.repository)
            }
        }
    }
}

@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Ink),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Spacer(Modifier.windowInsetsPadding(WindowInsets.statusBars).height(12.dp)) }
        item { Text("INSTELLINGEN", style = MaterialTheme.typography.displayMedium, color = TextPrimary) }

        item { SectionHeader(title = "Route") }

        for (route in Route.entries) {
            item(key = route.key) {
                RouteCard(
                    route = route,
                    selected = state.route == route,
                    onClick = { viewModel.setRoute(route) },
                )
            }
        }

        item {
            FitCard(modifier = Modifier.padding(top = 6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Trillen bij einde pauze", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                        Text(
                            "Korte trilling zodra de rusttijd voorbij is.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextTertiary,
                        )
                    }
                    Switch(
                        checked = state.restFeedback,
                        onCheckedChange = viewModel::setRestFeedback,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Ink,
                            checkedTrackColor = Accent,
                            uncheckedThumbColor = TextTertiary,
                            uncheckedTrackColor = Surface3,
                            uncheckedBorderColor = Hairline,
                        ),
                    )
                }
            }
        }

        item { SectionHeader(title = "Het plan", modifier = Modifier.padding(top = 6.dp)) }

        item {
            FitCard {
                PlanLine("Doel", "55 kg → 70-74 kg bij 185-187 cm")
                PlanLine("Frequentie", "4 workouts per week (ma · di · do · vr)")
                PlanLine("Duur", "35-45 minuten per sessie")
                PlanLine(
                    "Voeding",
                    "${NutritionPlan.KCAL_MIN}-${NutritionPlan.KCAL_MAX} kcal · " +
                        "${NutritionPlan.PROTEIN_MIN}-${NutritionPlan.PROTEIN_MAX}g eiwit · " +
                        "${NutritionPlan.WATER_MIN_ML / 1000f}-${NutritionPlan.WATER_MAX_ML / 1000}L water",
                )
                PlanLine("Check-in", "Zondag wegen en voortgang noteren")
            }
        }

        item { SectionHeader(title = "Workouts in deze route", modifier = Modifier.padding(top = 6.dp)) }

        item {
            FitCard {
                Program.days(state.route).forEachIndexed { index, day ->
                    if (index > 0) {
                        Spacer(Modifier.height(10.dp))
                        Box(Modifier.fillMaxWidth().height(1.dp).background(Hairline))
                        Spacer(Modifier.height(10.dp))
                    }
                    Text(day.title, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                    Text(day.focus, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
                    Spacer(Modifier.height(6.dp))
                    day.exercises.forEach { exercise ->
                        Text(
                            text = "· ${exercise.name} — ${exercise.setsLabel}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                        )
                    }
                }
            }
        }

        item {
            Text(
                text = "Alle gegevens staan lokaal op dit toestel. Geen account, geen server.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}

@Composable
private fun RouteCard(route: Route, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(18.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (selected) Surface2 else Surface1)
            .border(1.dp, if (selected) Accent else Hairline, shape)
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Route ${route.key} · ${route.title}",
                style = MaterialTheme.typography.titleLarge,
                color = if (selected) Accent else TextPrimary,
            )
            Text(route.subtitle, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
        }
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(RoundedCornerShape(50))
                .background(if (selected) Accent else Color.Transparent)
                .border(1.5.dp, if (selected) Accent else Surface3, RoundedCornerShape(50)),
            contentAlignment = Alignment.Center,
        ) {
            if (selected) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = Ink, modifier = Modifier.size(15.dp))
            }
        }
    }
}

@Composable
private fun PlanLine(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary,
            modifier = Modifier.width(96.dp),
        )
        Text(value, style = MaterialTheme.typography.bodyLarge, color = TextPrimary)
    }
}
