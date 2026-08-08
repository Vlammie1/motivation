package com.vlammie.fitness.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.ArrowUUpLeft
import com.adamglin.phosphoricons.fill.CheckCircle
import com.adamglin.phosphoricons.fill.Drop
import com.adamglin.phosphoricons.fill.ForkKnife
import com.adamglin.phosphoricons.fill.Lightning
import com.adamglin.phosphoricons.fill.Play
import com.vlammie.fitness.data.model.DayPlan
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.WorkoutDay
import com.vlammie.fitness.ui.components.BigActionButton
import com.vlammie.fitness.ui.components.FillCircle
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.GlowBackdrop
import com.vlammie.fitness.ui.components.filmGrain
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.components.Sparkle
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
import java.time.DayOfWeek
import java.time.LocalDate

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
        onShiftDate = viewModel::shiftDate,
        onSelectDate = viewModel::selectDate,
        onToday = viewModel::goToToday,
    )
}

@Composable
internal fun HomeContent(
    state: HomeUiState,
    onToggleCheck: (String, Boolean) -> Unit,
    onStartSession: (String) -> Unit,
    onOpenMeals: () -> Unit,
    onOpenProgress: () -> Unit,
    onShiftDate: (Long) -> Unit = {},
    onSelectDate: (LocalDate) -> Unit = {},
    onToday: () -> Unit = {},
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

            item { WeekStrip(state, onShiftDate, onSelectDate) }

            item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (state.isToday) "VANDAAG" else dayLabel(state.date).uppercase(),
                            style = MaterialTheme.typography.displayMedium,
                            color = TextPrimary,
                        )
                        if (!state.isToday) {
                            Text(
                                text = shortDate(state.date) + if (state.isPast) " · terugkijken" else " · vooruitkijken",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextTertiary,
                            )
                        }
                    }
                    if (!state.isToday) {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(Surface2)
                                .clickable(onClick = onToday)
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(
                                PhosphorIcons.Fill.ArrowUUpLeft,
                                contentDescription = null,
                                tint = Accent,
                                modifier = Modifier.size(15.dp),
                            )
                            Text("Vandaag", style = MaterialTheme.typography.labelLarge, color = Accent)
                        }
                    }
                }
            }

            item { TodayHeroCard(state) }

            if (state.logged.isNotEmpty()) {
                item {
                    SectionHeader(
                        title = if (state.isToday) "Al gedaan" else "Wat je deed",
                        action = "${state.logged.sumOf { it.sets }} sets",
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                items(state.logged, key = { it.name }) { logged -> LoggedRow(logged) }
            }

            if (training != null) {
                item {
                    SectionHeader(
                        title = if (state.isPast) "Stond gepland" else "Te doen",
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
            items(state.upcoming, key = { it.date.toString() }) { day ->
                UpcomingRow(day, onClick = { onSelectDate(day.date) })
            }
        }

        // Vaste actieknop onderaan, met een scrim zodat de lijst er netjes onder wegvalt.
        Box(modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()) {
            // Korrel over de scrim: dat dithert het verloop naar zwart, dus geen banding.
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .filmGrain(0.06f)
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Ink, Ink)))
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 20.dp, end = 20.dp, top = 28.dp, bottom = 16.dp),
            ) {
                if (state.isToday) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            text = "Andere workout kiezen",
                            style = MaterialTheme.typography.labelLarge,
                            color = TextSecondary,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .clickable { showPicker = true }
                                .padding(horizontal = 14.dp, vertical = 6.dp),
                        )
                    }
                    BigActionButton(
                        text = if (training != null) "Sessie starten" else "Toch trainen",
                        icon = PhosphorIcons.Fill.Play,
                        onClick = {
                            if (training != null) onStartSession(training.id) else showPicker = true
                        },
                    )
                } else {
                    BigActionButton(
                        text = "Terug naar vandaag",
                        icon = PhosphorIcons.Fill.ArrowUUpLeft,
                        onClick = onToday,
                    )
                }
            }
        }
    }

    if (showPicker) {
        WorkoutPickerDialog(
            days = state.pickableDays,
            onDismiss = { showPicker = false },
            onPick = { dayId ->
                showPicker = false
                onStartSession(dayId)
            },
        )
    }
}

/**
 * De weekstrook. Tik op een dag om hem te openen, of houd vast en sleep naar
 * links/rechts om door de dagen te bladeren — terug om te zien wat je toen deed,
 * vooruit om te zien wat eraan komt.
 */
@Composable
private fun WeekStrip(
    state: HomeUiState,
    onShiftDate: (Long) -> Unit,
    onSelectDate: (LocalDate) -> Unit,
) {
    val monday = state.date.with(DayOfWeek.MONDAY)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 4.dp)
            .pointerInput(Unit) {
                var travelled = 0f
                detectHorizontalDragGestures(
                    onDragEnd = { travelled = 0f },
                    onDragCancel = { travelled = 0f },
                ) { change, drag ->
                    change.consume()
                    travelled += drag
                    val step = (size.width / 7f).coerceAtLeast(1f)
                    while (travelled <= -step) {
                        travelled += step
                        onShiftDate(1)
                    }
                    while (travelled >= step) {
                        travelled -= step
                        onShiftDate(-1)
                    }
                }
            },
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        (0..6).forEach { offset ->
            val day = monday.plusDays(offset.toLong())
            val selected = day == state.date
            val isToday = day == state.today
            val isTraining = Program.planFor(
                state.days.filter { it.routeKey == state.route.key },
                day.dayOfWeek,
            ) is DayPlan.Training
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (selected) Surface2 else Color.Transparent)
                    .clickable { onSelectDate(day) }
                    .padding(horizontal = 8.dp, vertical = 6.dp),
            ) {
                Text(
                    text = dayLabel(day).take(2),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (selected) Accent else TextTertiary,
                )
                Text(
                    text = "${day.dayOfMonth}",
                    style = MaterialTheme.typography.headlineMedium,
                    color = when {
                        selected -> Accent
                        isToday -> TextPrimary
                        isTraining -> TextSecondary
                        else -> TextTertiary
                    },
                )
                Box(
                    modifier = Modifier
                        .size(5.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isToday -> Accent
                                !isTraining -> Color.Transparent
                                else -> Surface3
                            }
                        ),
                )
            }
        }
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
                    Tag("Route ${plan.day.routeKey}", background = Color(0x4D1A0500), color = Color.White)
                    Tag(
                        "${plan.day.exercises.size} oefeningen",
                        background = Color(0x4D1A0500),
                        color = Color.White,
                    )
                }
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Sparkle,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(26.dp).rotate(-14f),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = plan.day.title.uppercase(),
                        style = MaterialTheme.typography.displayMedium,
                        color = TextPrimary,
                    )
                }
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
                    text = when {
                        state.sessionsToday > 0 && state.isToday -> "Sessie afgerond — goed bezig."
                        state.sessionsToday > 0 -> "Deze dag heb je getraind."
                        state.isPast -> "Geen sessie gelogd op deze dag."
                        else -> "${state.checkedCount} van ${plan.day.exercises.size} afgevinkt"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0xF2FFFFFF),
                )
            }

            is DayPlan.Rest -> {
                Tag("Route ${state.route.key}", background = Color(0x4D1A0500), color = Color.White)
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Sparkle,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(26.dp).rotate(-14f),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = plan.label.uppercase(),
                        style = MaterialTheme.typography.displayMedium,
                        color = TextPrimary,
                    )
                }
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
private fun LoggedRow(logged: LoggedExercise) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Surface1)
            .border(1.dp, Hairline, shape)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Icon(
            PhosphorIcons.Fill.CheckCircle,
            contentDescription = null,
            tint = Accent,
            modifier = Modifier.size(22.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(logged.name, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text(
                text = "${logged.sets} sets · ${logged.summary}" +
                    (logged.weightLabel?.let { " · $it" } ?: ""),
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
        }
        Text(
            text = "${logged.best}",
            style = MaterialTheme.typography.headlineMedium,
            color = Accent,
        )
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
        FillCircle(checked = checked)
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
            Text(
                text = if (state.isToday) "Voeding vandaag" else "Voeding die dag",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
            )
            Spacer(Modifier.weight(1f))
            Text("Openen", style = MaterialTheme.typography.labelLarge, color = Accent)
        }
        Spacer(Modifier.height(14.dp))
        val targets = state.nutrition.targets
        ThinProgressBar(progress = state.nutrition.kcal / targets.kcal.toFloat())
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            MiniStat(PhosphorIcons.Fill.Lightning, "${state.nutrition.kcal}", "van ${targets.kcal} kcal")
            MiniStat(null, "${state.nutrition.protein}g", "van ${targets.protein}g eiwit")
            MiniStat(
                PhosphorIcons.Fill.Drop,
                String.format("%.1fL", state.nutrition.waterMl / 1000f),
                "van %.1fL".format(targets.waterMl / 1000f),
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
private fun UpcomingRow(day: UpcomingDay, onClick: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Color(0xFF0D0D0F))
            .border(1.dp, Color(0xFF1D1D22), shape)
            .clickable(onClick = onClick)
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

/** Alle workouts uit beide routes — zo doe je de ene keer A en de andere keer B. */
@Composable
private fun WorkoutPickerDialog(
    days: List<WorkoutDay>,
    onDismiss: () -> Unit,
    onPick: (String) -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = { Text("Welke workout?", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
        text = {
            LazyColumn(
                modifier = Modifier.heightIn(max = 420.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(days, key = { it.id }) { day ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(Surface2)
                            .clickable { onPick(day.id) }
                            .padding(14.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Tag("Route ${day.routeKey}")
                            Text(day.title, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                        }
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
