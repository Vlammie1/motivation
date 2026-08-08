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
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.ArrowDown
import com.adamglin.phosphoricons.fill.ArrowUp
import com.adamglin.phosphoricons.fill.CaretLeft
import com.adamglin.phosphoricons.fill.X
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.Route
import com.vlammie.fitness.data.model.Target
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.model.WorkoutDay
import com.vlammie.fitness.data.model.weekdayName
import com.vlammie.fitness.data.repo.FitnessRepository
import com.vlammie.fitness.data.repo.slugId
import com.vlammie.fitness.ui.components.BigActionButton
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.PillTabs
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.meals.DarkField
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.Danger
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.Surface1
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.Surface3
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import com.vlammie.fitness.ui.theme.TextTertiary
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class WorkoutEditorViewModel(
    private val repo: FitnessRepository,
    private val dayId: String,
) : ViewModel() {

    private val _day = MutableStateFlow<WorkoutDay?>(null)
    val day = _day.asStateFlow()

    /** Of dit een workout uit het standaardplan is; die kun je terugzetten. */
    val canReset: Boolean = com.vlammie.fitness.data.model.Program.findDay(dayId) != null

    init {
        viewModelScope.launch {
            _day.value = repo.workoutDay(dayId).filterNotNull().first()
        }
    }

    fun edit(transform: (WorkoutDay) -> WorkoutDay) = _day.update { it?.let(transform) }

    fun moveExercise(index: Int, delta: Int) = edit { day ->
        val target = index + delta
        if (target !in day.exercises.indices) return@edit day
        val list = day.exercises.toMutableList()
        val moved = list.removeAt(index)
        list.add(target, moved)
        day.copy(exercises = list)
    }

    fun removeExercise(index: Int) = edit { day ->
        day.copy(exercises = day.exercises.filterIndexed { i, _ -> i != index })
    }

    fun upsertExercise(index: Int?, exercise: Exercise) = edit { day ->
        val list = day.exercises.toMutableList()
        if (index == null) list.add(exercise) else list[index] = exercise
        day.copy(exercises = list)
    }

    fun save(onDone: () -> Unit) = viewModelScope.launch {
        _day.value?.let { repo.saveWorkout(it) }
        onDone()
    }

    fun delete(onDone: () -> Unit) = viewModelScope.launch {
        repo.deleteWorkout(dayId)
        onDone()
    }

    fun reset(onDone: () -> Unit) = viewModelScope.launch {
        repo.resetWorkout(dayId)
        onDone()
    }

    companion object {
        fun factory(dayId: String) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
                val app = extras[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                return WorkoutEditorViewModel(app.repository, dayId) as T
            }
        }
    }
}

@Composable
fun WorkoutEditorScreen(
    dayId: String,
    onBack: () -> Unit,
    viewModel: WorkoutEditorViewModel = viewModel(factory = WorkoutEditorViewModel.factory(dayId)),
) {
    val day by viewModel.day.collectAsStateWithLifecycle()

    WorkoutEditorContent(
        day = day,
        canReset = viewModel.canReset,
        onBack = onBack,
        onEdit = viewModel::edit,
        onMove = viewModel::moveExercise,
        onRemove = viewModel::removeExercise,
        onUpsert = viewModel::upsertExercise,
        onSave = { viewModel.save(onBack) },
        onDelete = { viewModel.delete(onBack) },
        onReset = { viewModel.reset(onBack) },
    )
}

@Composable
internal fun WorkoutEditorContent(
    day: WorkoutDay?,
    canReset: Boolean,
    onBack: () -> Unit,
    onEdit: ((WorkoutDay) -> WorkoutDay) -> Unit,
    onMove: (Int, Int) -> Unit,
    onRemove: (Int) -> Unit,
    onUpsert: (Int?, Exercise) -> Unit,
    onSave: () -> Unit,
    onDelete: () -> Unit,
    onReset: () -> Unit,
) {
    var editing by remember { mutableStateOf<Pair<Int?, Exercise>?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }

    if (day == null) {
        Box(modifier = Modifier.fillMaxSize().background(Ink), contentAlignment = Alignment.Center) {
            Text("Laden…", style = MaterialTheme.typography.titleLarge, color = TextTertiary)
        }
        return
    }

    Box(modifier = Modifier.fillMaxSize().background(Ink)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 120.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Spacer(Modifier.windowInsetsPadding(WindowInsets.statusBars).height(12.dp)) }

            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(RoundedCornerShape(50))
                            .background(Surface2)
                            .clickable(onClick = onBack),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            PhosphorIcons.Fill.CaretLeft,
                            contentDescription = "Terug",
                            tint = TextPrimary,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Text("WORKOUT", style = MaterialTheme.typography.displayMedium, color = TextPrimary)
                }
            }

            item {
                FitCard {
                    DarkField(day.title, { value -> onEdit { it.copy(title = value) } }, "Naam")
                    Spacer(Modifier.height(10.dp))
                    DarkField(day.focus, { value -> onEdit { it.copy(focus = value) } }, "Waar ligt de focus?")
                    Spacer(Modifier.height(14.dp))
                    Text("Route", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                    Spacer(Modifier.height(6.dp))
                    PillTabs(
                        options = Route.entries.map { "Route ${it.key}" },
                        selectedIndex = Route.entries.indexOfFirst { it.key == day.routeKey }.coerceAtLeast(0),
                        onSelect = { index -> onEdit { it.copy(routeKey = Route.entries[index].key) } },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(14.dp))
                    Text("Vaste dag in het weekschema", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                    Spacer(Modifier.height(8.dp))
                    WeekdayPicker(
                        selected = day.weekday,
                        onSelect = { value -> onEdit { it.copy(weekday = value) } },
                    )
                }
            }

            item {
                SectionHeader(
                    title = "Oefeningen",
                    action = "Toevoegen",
                    onAction = { editing = null to blankExercise() },
                    modifier = Modifier.padding(top = 6.dp),
                )
            }

            if (day.exercises.isEmpty()) {
                item {
                    Text(
                        text = "Nog geen oefeningen. Tik op ‘Toevoegen’.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                }
            }

            day.exercises.forEachIndexed { index, exercise ->
                item(key = "${exercise.id}-$index") {
                    ExerciseEditRow(
                        exercise = exercise,
                        onClick = { editing = index to exercise },
                        onUp = { onMove(index, -1) },
                        onDown = { onMove(index, 1) },
                        onRemove = { onRemove(index) },
                    )
                }
            }

            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.padding(top = 10.dp),
                ) {
                    if (canReset) {
                        Text(
                            text = "Terug naar standaard",
                            style = MaterialTheme.typography.labelLarge,
                            color = TextSecondary,
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .clickable(onClick = onReset)
                                .padding(vertical = 6.dp),
                        )
                    }
                    Text(
                        text = "Workout verwijderen",
                        style = MaterialTheme.typography.labelLarge,
                        color = Danger,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { confirmDelete = true }
                            .padding(vertical = 6.dp),
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(Ink)
                .padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = 16.dp),
        ) {
            BigActionButton(text = "Opslaan", onClick = onSave)
        }
    }

    val target = editing
    if (target != null) {
        ExerciseDialog(
            initial = target.second,
            onDismiss = { editing = null },
            onSave = { exercise ->
                onUpsert(target.first, exercise)
                editing = null
            },
        )
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            containerColor = Surface1,
            title = { Text("Workout verwijderen?", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
            text = {
                Text(
                    "Je gelogde sets blijven bewaard; alleen het schema verdwijnt.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    onDelete()
                }) { Text("Verwijderen", color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) { Text("Annuleren", color = TextSecondary) }
            },
        )
    }
}

@Composable
private fun WeekdayPicker(selected: Int?, onSelect: (Int?) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        (1..7).forEach { iso ->
            val active = selected == iso
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (active) Accent else Surface2)
                    .border(1.dp, if (active) Accent else Hairline, RoundedCornerShape(10.dp))
                    .clickable { onSelect(if (active) null else iso) }
                    .padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = weekdayName(iso).take(2),
                    style = MaterialTheme.typography.labelMedium,
                    color = if (active) Ink else TextSecondary,
                )
            }
        }
    }
}

@Composable
private fun ExerciseEditRow(
    exercise: Exercise,
    onClick: () -> Unit,
    onUp: () -> Unit,
    onDown: () -> Unit,
    onRemove: () -> Unit,
) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Surface1)
            .border(1.dp, Hairline, shape)
            .clickable(onClick = onClick)
            .padding(start = 14.dp, end = 6.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(exercise.name, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text(
                text = "${exercise.setsLabel} · ${exercise.restSeconds}s rust" +
                    if (exercise.weighted) " · met kg" else "",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
        }
        SmallIcon(PhosphorIcons.Fill.ArrowUp, onUp)
        SmallIcon(PhosphorIcons.Fill.ArrowDown, onDown)
        SmallIcon(PhosphorIcons.Fill.X, onRemove, tint = Danger)
    }
}

@Composable
private fun SmallIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    tint: Color = TextTertiary,
) {
    Icon(
        imageVector = icon,
        contentDescription = null,
        tint = tint,
        modifier = Modifier
            .size(30.dp)
            .clip(RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(7.dp),
    )
}

@Composable
private fun ExerciseDialog(
    initial: Exercise,
    onDismiss: () -> Unit,
    onSave: (Exercise) -> Unit,
) {
    var name by remember { mutableStateOf(initial.name) }
    var hint by remember { mutableStateOf(initial.hint ?: "") }
    var sets by remember { mutableStateOf(initial.sets.toString()) }
    var seconds by remember { mutableStateOf(initial.target.unit == MeasureUnit.SECONDS) }
    var min by remember { mutableStateOf(initial.target.min.toString()) }
    var max by remember { mutableStateOf(initial.target.max.toString()) }
    var amrap by remember { mutableStateOf(initial.target.amrap) }
    var perSide by remember { mutableStateOf(initial.target.perSide) }
    var weighted by remember { mutableStateOf(initial.weighted) }
    var rest by remember { mutableStateOf(initial.restSeconds.toString()) }

    val setsValue = sets.toIntOrNull()
    val minValue = min.toIntOrNull()
    val maxValue = max.toIntOrNull()

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = { Text("Oefening", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { DarkField(name, { name = it }, "Naam") }
                item { DarkField(hint, { hint = it }, "Toelichting (mag leeg)") }
                item {
                    DarkField(
                        value = sets,
                        onValueChange = { input -> sets = input.filter { it.isDigit() }.take(2) },
                        label = "Aantal sets",
                        number = true,
                    )
                }
                item {
                    PillTabs(
                        options = listOf("Herhalingen", "Seconden"),
                        selectedIndex = if (seconds) 1 else 0,
                        onSelect = { seconds = it == 1 },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(modifier = Modifier.weight(1f)) {
                            DarkField(
                                value = min,
                                onValueChange = { input -> min = input.filter { it.isDigit() }.take(3) },
                                label = "Van",
                                number = true,
                            )
                        }
                        Box(modifier = Modifier.weight(1f)) {
                            DarkField(
                                value = max,
                                onValueChange = { input -> max = input.filter { it.isDigit() }.take(3) },
                                label = "Tot",
                                number = true,
                            )
                        }
                    }
                }
                item {
                    DarkField(
                        value = rest,
                        onValueChange = { input -> rest = input.filter { it.isDigit() }.take(3) },
                        label = "Rust in seconden",
                        number = true,
                    )
                }
                item {
                    ToggleRow("Tot falen (maximaal)", amrap) { amrap = it }
                }
                item {
                    ToggleRow("Per kant", perSide) { perSide = it }
                }
                item {
                    ToggleRow("Met dumbbells (kg loggen)", weighted) { weighted = it }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val low = minValue ?: 1
                    val high = (maxValue ?: low).coerceAtLeast(low)
                    onSave(
                        initial.copy(
                            id = initial.id.ifBlank { slugId(name) },
                            name = name.trim(),
                            hint = hint.trim().ifBlank { null },
                            sets = (setsValue ?: 3).coerceIn(1, 20),
                            target = Target(
                                unit = if (seconds) MeasureUnit.SECONDS else MeasureUnit.REPS,
                                min = low,
                                max = high,
                                amrap = amrap,
                                perSide = perSide,
                            ),
                            restSeconds = (rest.toIntOrNull() ?: 60).coerceIn(0, 600),
                            weighted = weighted,
                        )
                    )
                },
                enabled = name.isNotBlank() && setsValue != null && minValue != null,
            ) { Text("Opslaan", color = Accent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

@Composable
private fun ToggleRow(label: String, checked: Boolean, onChange: (Boolean) -> kotlin.Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = TextPrimary, modifier = Modifier.weight(1f))
        Switch(
            checked = checked,
            onCheckedChange = onChange,
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

/** Een lege oefening; het id krijgt hij pas als je hem opslaat met een naam. */
private fun blankExercise() = Exercise(
    id = "",
    name = "",
    hint = null,
    sets = 3,
    target = Target(MeasureUnit.REPS, 10, 12),
    restSeconds = 60,
)
