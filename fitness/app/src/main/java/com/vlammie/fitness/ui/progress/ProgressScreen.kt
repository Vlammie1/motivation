package com.vlammie.fitness.ui.progress

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
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.ArrowDown
import com.adamglin.phosphoricons.fill.ArrowUp
import com.adamglin.phosphoricons.fill.CaretDown
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.PillTabs
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.components.SecondaryButton
import com.vlammie.fitness.ui.components.StatTile
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.AccentBright
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.Surface1
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import com.vlammie.fitness.ui.theme.TextTertiary
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProgressScreen(
    viewModel: ProgressViewModel = viewModel(factory = ProgressViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    ProgressContent(
        state = state,
        onRange = viewModel::selectRange,
        onMetric = viewModel::selectMetric,
        onSelectExercise = viewModel::selectExercise,
        onSelectPoint = viewModel::selectPoint,
        onLogWeight = viewModel::logWeight,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ProgressContent(
    state: ProgressUiState,
    onRange: (Int) -> Unit,
    onMetric: (Int) -> Unit,
    onSelectExercise: (String) -> Unit,
    onSelectPoint: (Int?) -> Unit,
    onLogWeight: (Double) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState()
    val pickerState = rememberModalBottomSheetState()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Ink),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { Spacer(Modifier.windowInsetsPadding(WindowInsets.statusBars).height(12.dp)) }
        item {
            Text("VOORTGANG", style = MaterialTheme.typography.displayMedium, color = TextPrimary)
        }

        item { SummaryCard(state, onRange) }

        item { CheckInCard(state.latestWeight, onLogWeight) }

        item {
            SectionHeader(
                title = "Per oefening",
                modifier = Modifier.padding(top = 6.dp),
            )
        }

        item {
            ExercisePickerRow(
                name = state.series?.name ?: "Nog geen data",
                sessions = state.series?.points?.size ?: 0,
                onClick = { showPicker = true },
            )
        }

        if (state.series?.id != WEIGHT_ID) {
            item {
                PillTabs(
                    options = listOf("Beste set", "Totaal"),
                    selectedIndex = state.metricIndex,
                    onSelect = onMetric,
                )
            }
        }

        item { ChartCard(state, onSelectPoint) }
    }

    val detail = state.detail
    if (detail != null) {
        ModalBottomSheet(
            onDismissRequest = { onSelectPoint(null) },
            sheetState = sheetState,
            containerColor = Surface1,
        ) {
            DayDetailSheet(detail)
        }
    }

    if (showPicker) {
        ModalBottomSheet(
            onDismissRequest = { showPicker = false },
            sheetState = pickerState,
            containerColor = Surface1,
        ) {
            Column(modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 32.dp)) {
                Text("Kies een oefening", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
                Spacer(Modifier.height(12.dp))
                state.options.forEach { option ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .clickable {
                                onSelectExercise(option.id)
                                showPicker = false
                            }
                            .padding(vertical = 12.dp, horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = option.name,
                            style = MaterialTheme.typography.titleLarge,
                            color = if (option.id == state.series?.id) Accent else TextPrimary,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            text = if (option.sessions == 1) "1 keer" else "${option.sessions} keer",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextTertiary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(state: ProgressUiState, onRange: (Int) -> Unit) {
    FitCard {
        PillTabs(
            options = listOf("7 dagen", "30 dagen", "Totaal"),
            selectedIndex = state.rangeIndex,
            onSelect = onRange,
        )
        Spacer(Modifier.height(18.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            StatTile("%.1f".format(state.hoursInRange), "uur getraind")
            StatTile("${state.sessionsInRange}", "sessies")
            StatTile("${state.setsInRange}", "sets")
        }
    }
}

@Composable
private fun ExercisePickerRow(name: String, sessions: Int, onClick: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Surface2)
            .border(1.dp, Hairline, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(name, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text(
                text = if (sessions == 0) "nog niet gelogd" else "$sessions metingen",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
        }
        Icon(PhosphorIcons.Fill.CaretDown, contentDescription = null, tint = Accent)
    }
}

@Composable
private fun ChartCard(state: ProgressUiState, onSelectPoint: (Int?) -> Unit) {
    val series = state.series
    FitCard {
        if (series == null || series.points.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().height(200.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Nog geen metingen", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Start een sessie en log je sets — dan verschijnt hier je lijn.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
            }
            return@FitCard
        }

        ProgressChart(
            points = series.points,
            average = series.average,
            forecast = series.forecast,
            selectedIndex = state.selectedPoint,
            onSelect = { onSelectPoint(it) },
            modifier = Modifier.fillMaxWidth().height(220.dp),
        )

        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Legend(Accent, "gemeten")
            Legend(TextTertiary, "gemiddeld")
            Legend(AccentBright, "verwacht")
        }

        Spacer(Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            StatTile(format(series.last), "laatste")
            StatTile(format(series.best), "beste")
            StatTile(format(series.average), "gemiddeld")
            StatTile(
                value = series.forecast?.let { format(it) } ?: "—",
                label = "over 1 week",
                accent = true,
            )
        }

        val perWeek = series.perWeek
        if (perWeek != null) {
            Spacer(Modifier.height(12.dp))
            Text(
                text = when {
                    perWeek > 0.05f -> "+${"%.1f".format(perWeek)} ${series.unitLabel} per week — de lijn loopt op."
                    perWeek < -0.05f -> "${"%.1f".format(perWeek)} ${series.unitLabel} per week — je zakt iets."
                    else -> "Vlakke lijn: tijd om er een setje bovenop te doen."
                },
                style = MaterialTheme.typography.bodyMedium,
                color = if (perWeek >= 0f) TextSecondary else TextTertiary,
            )
        }

        Spacer(Modifier.height(8.dp))
        Text(
            text = "Tik op een punt voor de details van die dag.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary,
        )
    }
}

@Composable
private fun Legend(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(modifier = Modifier.size(8.dp).clip(RoundedCornerShape(50)).background(color))
        Text(label, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
    }
}

@Composable
internal fun DayDetailSheet(detail: DayDetail) {
    Column(modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 36.dp)) {
        Text(
            text = dutchDate(detail.date).uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Accent,
        )
        Spacer(Modifier.height(4.dp))
        Text(detail.title, style = MaterialTheme.typography.displayMedium, color = TextPrimary)
        Spacer(Modifier.height(16.dp))

        if (detail.entries.isEmpty()) {
            Text("Geen details voor deze dag.", style = MaterialTheme.typography.bodyLarge, color = TextTertiary)
        }

        detail.entries.forEach { entry ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(entry.name, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    Text(
                        text = "${format(entry.value)} ${entry.unitLabel}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                }
                val delta = entry.delta
                if (delta != null && delta != 0f) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(50))
                            .background(if (delta > 0) Color(0xFF10301A) else Color(0xFF3A1414))
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    ) {
                        Icon(
                            imageVector = if (delta > 0) PhosphorIcons.Fill.ArrowUp else PhosphorIcons.Fill.ArrowDown,
                            contentDescription = null,
                            tint = if (delta > 0) Color(0xFF56C271) else Color(0xFFE0483C),
                            modifier = Modifier.size(14.dp),
                        )
                        Text(
                            text = format(kotlin.math.abs(delta)),
                            style = MaterialTheme.typography.labelMedium,
                            color = if (delta > 0) Color(0xFF56C271) else Color(0xFFE0483C),
                        )
                    }
                } else {
                    Text(
                        text = if (delta == null) "eerste keer" else "gelijk",
                        style = MaterialTheme.typography.labelMedium,
                        color = TextTertiary,
                    )
                }
            }
        }
    }
}

@Composable
private fun CheckInCard(latestWeight: Double?, onSave: (Double) -> Unit) {
    var text by remember(latestWeight) { mutableStateOf(latestWeight?.toString() ?: "") }
    FitCard(modifier = Modifier.padding(top = 6.dp)) {
        Text("Wekelijkse check-in", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
        Text(
            text = "Zondag wegen en noteren. Doel: 70-74 kg.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary,
        )
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = text,
                onValueChange = { new -> text = new.filter { it.isDigit() || it == '.' }.take(5) },
                singleLine = true,
                label = { Text("kg", color = TextTertiary) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.weight(1f),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Surface2,
                    unfocusedContainerColor = Surface2,
                    focusedIndicatorColor = Accent,
                    unfocusedIndicatorColor = Hairline,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    cursorColor = Accent,
                ),
            )
            SecondaryButton(
                text = "Opslaan",
                onClick = { text.toDoubleOrNull()?.let(onSave) },
            )
        }
    }
}

private fun format(value: Float?): String = when {
    value == null -> "—"
    value % 1f == 0f -> value.toInt().toString()
    else -> "%.1f".format(value)
}

private fun dutchDate(date: LocalDate): String {
    val days = listOf("maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag")
    val months = listOf(
        "januari", "februari", "maart", "april", "mei", "juni",
        "juli", "augustus", "september", "oktober", "november", "december",
    )
    return "${days[date.dayOfWeek.value - 1]} ${date.dayOfMonth} ${months[date.monthValue - 1]}"
}
