package com.vlammie.fitness.ui.home

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.runtime.DisposableEffect
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.Check
import com.adamglin.phosphoricons.fill.Drop
import com.adamglin.phosphoricons.fill.ForkKnife
import com.adamglin.phosphoricons.fill.Lightning
import com.adamglin.phosphoricons.fill.Play
import com.vlammie.fitness.data.model.DayPlan
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.ui.components.BigActionButton
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.GlowBackdrop
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.components.Tag
import com.vlammie.fitness.ui.components.ThinProgressBar
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.Surface1
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.Surface3
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import com.vlammie.fitness.ui.theme.TextTertiary

@Composable
fun HomeScreen(
    onStartSession: (String) -> Unit,
    onOpenMeals: () -> Unit,
    onOpenProgress: () -> Unit,
    viewModel: HomeViewModel = viewModel(factory = HomeViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Na middernacht moet de homepage de nieuwe dag laten zien.
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.refreshDate()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    HomeContent(
        state = state,
        onToggleCheck = viewModel::toggleCheck,
        onStartSession = onStartSession,
        onOpenMeals = onOpenMeals,
        onOpenProgress = onOpenProgress,
    )
}

@Composable
internal fun HomeContent(
    state: HomeUiState,
    onToggleCheck: (String, Boolean) -> Unit,
    onStartSession: (String) -> Unit,
    onOpenMeals: () -> Unit,
    onOpenProgress: () -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val training = state.trainingDay

    Box(modifier = Modifier.fillMaxSize().background(Ink)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 120.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { Spacer(Modifier.windowInsetsPadding(WindowInsets.statusBars).height(12.dp)) }

            item {
                Column {
                    Text(
                        text = "${dayLabel(state.date).uppercase()} · ${shortDate(state.date)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Accent,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text("VANDAAG", style = MaterialTheme.typography.displayMedium, color = TextPrimary)
                }
            }

            item { TodayHeroCard(state) }

            if (training != null) {
                item {
                    SectionHeader(
                        title = "Te doen",
                        action = "${state.checkedCount}/${training.exercises.size}",
                    )
                }
                items(training.exercises, key = { it.id }) { exercise ->
                    ExerciseCheckRow(
                        exercise = exercise,
                        checked = exercise.id in state.checked,
                        onToggle = { onToggleCheck(exercise.id, it) },
                    )
                }
            }

            item { NutritionStrip(state, onOpenMeals) }

            item {
                SectionHeader(
                    title = "Komende dagen",
                    action = "Voortgang",
                    onAction = onOpenProgress,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            items(state.upcoming, key = { it.date.toString() }) { day -> UpcomingRow(day) }
        }

        // Vaste actieknop onderaan, met een scrim zodat de lijst er netjes onder wegvalt.
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(Color.Transparent, Ink, Ink)))
                .padding(start = 20.dp, end = 20.dp, top = 28.dp, bottom = 16.dp),
        ) {
            BigActionButton(
                text = if (training != null) "Sessie starten" else "Toch trainen",
                icon = PhosphorIcons.Fill.Play,
                onClick = {
                    if (training != null) onStartSession(training.id) else showPicker = true
                },
            )
        }
    }

    if (showPicker) {
        WorkoutPickerDialog(
            onDismiss = { showPicker = false },
            onPick = { dayId ->
                showPicker = false
                onStartSession(dayId)
            },
            route = state.route,
        )
    }
}

@Composable
private fun TodayHeroCard(state: HomeUiState) {
    val shape = RoundedCornerShape(24.dp)
    Box(modifier = Modifier.fillMaxWidth().clip(shape)) {
        GlowBackdrop(modifier = Modifier.matchParentSize())
        HeroCardContent(state)
    }
}

@Composable
private fun HeroCardContent(state: HomeUiState) {
    Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
        when (val plan = state.plan) {
            is DayPlan.Training -> {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Tag("Route ${state.route.key}", background = Color(0x66000000), color = Color.White)
                    Tag(
                        "${plan.day.exercises.size} oefeningen",
                        background = Color(0x66000000),
                        color = Color.White,
                    )
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    text = plan.day.title.uppercase(),
                    style = MaterialTheme.typography.displayMedium,
                    color = TextPrimary,
                )
                Text(plan.day.focus, style = MaterialTheme.typography.bodyLarge, color = Color(0xF2FFFFFF))
                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    HeroStat("${plan.day.estimatedMinutes}", "minuten")
                    HeroStat("${plan.day.totalSets}", "sets")
                    HeroStat("${state.sessionsThisWeek}/4", "deze week")
                }
                Spacer(Modifier.height(18.dp))
                ThinProgressBar(
                    progress = state.progress,
                    track = Color(0x33000000),
                    brush = Brush.horizontalGradient(listOf(Color.White, Color(0xFFFFD9B8))),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text = if (state.sessionsToday > 0) {
                        "Sessie afgerond — goed bezig."
                    } else {
                        "${state.checkedCount} van ${plan.day.exercises.size} afgevinkt"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xF2FFFFFF),
                )
            }

            is DayPlan.Rest -> {
                Tag("Route ${state.route.key}", background = Color(0x66000000), color = Color.White)
                Spacer(Modifier.height(14.dp))
                Text(
                    text = plan.label.uppercase(),
                    style = MaterialTheme.typography.displayMedium,
                    color = TextPrimary,
                )
                Text(plan.note, style = MaterialTheme.typography.bodyLarge, color = Color(0xF2FFFFFF))
                Spacer(Modifier.height(18.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    HeroStat("${state.sessionsThisWeek}/4", "deze week")
                    HeroStat("${state.nutrition.kcal}", "kcal")
                }
            }
        }
    }
}

@Composable
private fun HeroStat(value: String, label: String) {
    Column {
        Text(value, style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        Text(label, style = MaterialTheme.typography.bodyMedium, color = Color(0xCCFFFFFF))
    }
}

@Composable
private fun ExerciseCheckRow(
    exercise: Exercise,
    checked: Boolean,
    onToggle: (Boolean) -> Unit,
) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (checked) Surface2 else Surface1)
            .border(1.dp, if (checked) Color(0xFF3D2412) else Hairline, shape)
            .clickable { onToggle(!checked) }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .size(26.dp)
                .clip(RoundedCornerShape(50))
                .background(if (checked) Accent else Color.Transparent)
                .border(1.5.dp, if (checked) Accent else Surface3, RoundedCornerShape(50)),
            contentAlignment = Alignment.Center,
        ) {
            if (checked) {
                Icon(PhosphorIcons.Fill.Check, contentDescription = null, tint = Ink, modifier = Modifier.size(16.dp))
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = exercise.setsLabel,
                style = MaterialTheme.typography.bodyMedium,
                color = if (checked) TextSecondary else Accent,
            )
            Text(
                text = exercise.name,
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
            )
            if (exercise.hint != null) {
                Text(exercise.hint, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
            }
        }
        Text(
            text = "${exercise.restSeconds}s rust",
            style = MaterialTheme.typography.labelSmall,
            color = TextTertiary,
        )
    }
}

@Composable
private fun NutritionStrip(state: HomeUiState, onOpen: () -> Unit) {
    FitCard(onClick = onOpen, modifier = Modifier.padding(top = 6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(PhosphorIcons.Fill.ForkKnife, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp))
            Text("Voeding vandaag", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Spacer(Modifier.weight(1f))
            Text("Openen", style = MaterialTheme.typography.labelLarge, color = Accent)
        }
        Spacer(Modifier.height(14.dp))
        ThinProgressBar(progress = state.nutrition.kcal / NutritionPlan.KCAL_MAX.toFloat())
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            MiniStat(PhosphorIcons.Fill.Lightning, "${state.nutrition.kcal}", "van ${NutritionPlan.KCAL_MAX} kcal")
            MiniStat(null, "${state.nutrition.protein}g", "van ${NutritionPlan.PROTEIN_MAX}g eiwit")
            MiniStat(
                PhosphorIcons.Fill.Drop,
                String.format("%.1fL", state.nutrition.waterMl / 1000f),
                "van ${NutritionPlan.WATER_MAX_ML / 1000}L",
            )
        }
    }
}

@Composable
private fun MiniStat(
    icon: androidx.compose.ui.graphics.vector.ImageVector?,
    value: String,
    label: String,
) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            if (icon != null) {
                Icon(icon, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(14.dp))
            }
            Text(value, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
        }
        Text(label, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
    }
}

@Composable
private fun UpcomingRow(day: UpcomingDay) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Color(0xFF0D0D0F))
            .border(1.dp, Color(0xFF1D1D22), shape)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Column(
            modifier = Modifier.width(52.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = dayLabel(day.date).take(2).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = TextTertiary,
            )
            Text(
                text = "${day.date.dayOfMonth}",
                style = MaterialTheme.typography.headlineMedium,
                color = if (day.isRest) TextTertiary else TextSecondary,
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = day.title,
                style = MaterialTheme.typography.titleMedium,
                color = if (day.isRest) TextTertiary else TextSecondary,
            )
            Text(day.focus, style = MaterialTheme.typography.bodyMedium, color = Color(0xFF55555C))
        }
        if (!day.isRest) {
            Icon(
                PhosphorIcons.Fill.Lightning,
                contentDescription = null,
                tint = Color(0xFF4A3122),
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

@Composable
private fun WorkoutPickerDialog(
    route: com.vlammie.fitness.data.model.Route,
    onDismiss: () -> Unit,
    onPick: (String) -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = { Text("Welke workout?", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Program.days(route).forEach { day ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Surface2)
                            .clickable { onPick(day.id) }
                            .padding(14.dp),
                    ) {
                        Text(day.title, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                        Text(day.focus, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = Accent) }
        },
    )
}
