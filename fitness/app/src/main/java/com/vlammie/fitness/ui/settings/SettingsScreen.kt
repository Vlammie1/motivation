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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.CaretRight
import com.adamglin.phosphoricons.fill.Check
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.model.NutritionTargets
import com.vlammie.fitness.data.model.Route
import com.vlammie.fitness.data.model.WorkoutDay
import com.vlammie.fitness.data.repo.FitnessRepository
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.components.Tag
import com.vlammie.fitness.ui.meals.DarkField
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
    val days: List<WorkoutDay> = emptyList(),
    val targets: NutritionTargets = NutritionTargets(),
    val hasApiKey: Boolean = false,
)

class SettingsViewModel(private val repo: FitnessRepository) : ViewModel() {

    val state = combine(
        repo.settings.route,
        repo.settings.restFeedback,
        repo.workoutDays,
        repo.settings.targets,
        repo.settings.apiKey,
    ) { route, feedback, days, targets, apiKey ->
        SettingsUiState(route, feedback, days, targets, apiKey.isNotBlank())
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SettingsUiState())

    fun setRoute(route: Route) = viewModelScope.launch { repo.settings.setRoute(route) }

    fun setRestFeedback(enabled: Boolean) = viewModelScope.launch { repo.settings.setRestFeedback(enabled) }

    fun setApiKey(key: String) = viewModelScope.launch { repo.settings.setApiKey(key) }

    /** Maakt een lege workout aan en geeft het id terug zodat je meteen de editor in gaat. */
    fun createWorkout(route: Route, onCreated: (String) -> Unit) = viewModelScope.launch {
        val day = repo.newWorkout(route)
        repo.saveWorkout(day)
        onCreated(day.id)
    }

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
    onEditWorkout: (String) -> Unit,
    viewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    SettingsContent(
        state = state,
        onRoute = viewModel::setRoute,
        onRestFeedback = viewModel::setRestFeedback,
        onEditWorkout = onEditWorkout,
        onNewWorkout = { route -> viewModel.createWorkout(route, onEditWorkout) },
        onApiKey = viewModel::setApiKey,
    )
}

@Composable
internal fun SettingsContent(
    state: SettingsUiState,
    onRoute: (Route) -> Unit,
    onRestFeedback: (Boolean) -> Unit,
    onEditWorkout: (String) -> Unit = {},
    onNewWorkout: (Route) -> Unit = {},
    onApiKey: (String) -> Unit = {},
) {
    var editingKey by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Ink),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Spacer(Modifier.windowInsetsPadding(WindowInsets.statusBars).height(12.dp)) }
        item { Text("INSTELLINGEN", style = MaterialTheme.typography.displayMedium, color = TextPrimary) }

        item { SectionHeader(title = "Route in het weekschema") }
        item {
            Text(
                text = "Bepaalt welke workout er standaard op een dag staat. Je kunt altijd " +
                    "een workout uit de andere route starten via ‘Andere workout kiezen’.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
        }

        for (route in Route.entries) {
            item(key = route.key) {
                RouteCard(
                    route = route,
                    selected = state.route == route,
                    onClick = { onRoute(route) },
                )
            }
        }

        // ---- workouts ---------------------------------------------------

        for (route in Route.entries) {
            val days = state.days.filter { it.routeKey == route.key }
            item(key = "header-${route.key}") {
                SectionHeader(
                    title = "Workouts route ${route.key}",
                    action = "Nieuwe",
                    onAction = { onNewWorkout(route) },
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            if (days.isEmpty()) {
                item(key = "empty-${route.key}") {
                    Text(
                        text = "Nog geen workouts in deze route.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                }
            }
            days.forEach { day ->
                item(key = "day-${day.id}") {
                    WorkoutRow(day = day, onClick = { onEditWorkout(day.id) })
                }
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
                        onCheckedChange = onRestFeedback,
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

        item { SectionHeader(title = "Fotoherkenning", modifier = Modifier.padding(top = 6.dp)) }

        item {
            FitCard(onClick = { editingKey = true }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Gemini API-sleutel", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                        Text(
                            text = if (state.hasApiKey) {
                                "Ingesteld — de fotoknop bij Voeding werkt."
                            } else {
                                "Nog niet ingesteld. Zonder sleutel kan de AI je bord niet bekijken."
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (state.hasApiKey) TextTertiary else Accent,
                        )
                    }
                    Icon(PhosphorIcons.Fill.CaretRight, contentDescription = null, tint = TextTertiary, modifier = Modifier.size(18.dp))
                }
            }
        }

        item {
            Text(
                text = "Haal een gratis sleutel op bij aistudio.google.com. De foto gaat alleen " +
                    "naar Google op het moment dat je zelf op ‘Foto’ tikt.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
        }

        item { SectionHeader(title = "Het plan", modifier = Modifier.padding(top = 6.dp)) }

        item {
            FitCard {
                PlanLine("Doel", "55 kg → 70-74 kg bij 185-187 cm")
                PlanLine("Frequentie", "4 workouts per week (ma · di · do · vr)")
                PlanLine("Duur", "35-45 minuten per sessie")
                PlanLine(
                    "Voeding",
                    "${state.targets.kcal} kcal · ${state.targets.protein}g eiwit · " +
                        "${state.targets.carbs}g koolhydraten · ${state.targets.fat}g vet · " +
                        "%.1fL water".format(state.targets.waterMl / 1000f),
                )
                PlanLine("Check-in", "Zondag wegen en voortgang noteren")
            }
        }

        item {
            Text(
                text = "Je dagdoelen pas je aan op het voedingsscherm, met het knopje bij het " +
                    "kcal-totaal.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
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

    if (editingKey) {
        ApiKeyDialog(
            hasKey = state.hasApiKey,
            onDismiss = { editingKey = false },
            onSave = {
                editingKey = false
                onApiKey(it)
            },
        )
    }
}

@Composable
private fun ApiKeyDialog(hasKey: Boolean, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var key by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = { Text("Gemini API-sleutel", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = if (hasKey) {
                        "Er staat al een sleutel klaar. Plak hier een nieuwe om hem te vervangen, " +
                            "of laat het veld leeg en sla op om hem te wissen."
                    } else {
                        "Plak de sleutel uit Google AI Studio. Hij blijft op dit toestel."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
                DarkField(value = key, onValueChange = { key = it.trim() }, label = "AIza…")
            }
        },
        confirmButton = { TextButton(onClick = { onSave(key) }) { Text("Opslaan", color = Accent) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) } },
    )
}

@Composable
private fun WorkoutRow(day: WorkoutDay, onClick: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Surface1)
            .border(1.dp, Hairline, shape)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Tag(day.weekdayLabel.take(2))
                Text(day.title, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            }
            Text(
                text = "${day.exercises.size} oefeningen · ${day.totalSets} sets",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
        }
        Icon(PhosphorIcons.Fill.CaretRight, contentDescription = null, tint = TextTertiary, modifier = Modifier.size(18.dp))
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
                Icon(PhosphorIcons.Fill.Check, contentDescription = null, tint = Ink, modifier = Modifier.size(15.dp))
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
