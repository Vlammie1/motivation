package com.vlammie.fitness.ui.session

import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.Check
import com.adamglin.phosphoricons.fill.Pause
import com.adamglin.phosphoricons.fill.Play
import com.adamglin.phosphoricons.fill.SkipForward
import com.adamglin.phosphoricons.fill.X
import com.vlammie.fitness.data.model.Side
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.model.WEIGHT_STEP_KG
import com.vlammie.fitness.data.model.formatKg
import com.vlammie.fitness.ui.components.BigActionButton
import com.vlammie.fitness.ui.components.Sparkle
import com.vlammie.fitness.ui.components.Tag
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.AccentBright
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.Surface1
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import com.vlammie.fitness.ui.theme.TextTertiary

@Composable
fun SessionScreen(
    dayId: String,
    onExit: () -> Unit,
    viewModel: SessionViewModel = viewModel(factory = SessionViewModel.factory(dayId)),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val restSignal by viewModel.restFinishedSignal.collectAsStateWithLifecycle()
    val restFeedback by viewModel.restFeedback.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showQuit by remember { mutableStateOf(false) }
    var showCustom by remember { mutableStateOf(false) }
    var showWeight by remember { mutableStateOf(false) }

    KeepScreenOn()

    LaunchedEffect(restSignal) {
        if (restSignal > 0 && restFeedback) context.vibrate()
    }

    BackHandler(enabled = state.phase != Phase.FINISHED) { showQuit = true }

    SessionContent(
        state = state,
        onTap = viewModel::completeSet,
        onQuit = { showQuit = true },
        onTogglePause = viewModel::togglePause,
        onAnswer = viewModel::answer,
        onCustom = { showCustom = true },
        onSkipExercise = viewModel::skipExercise,
        onAddRest = viewModel::addRest,
        onSkipRest = viewModel::skipRest,
        onExit = onExit,
        onWeightStep = viewModel::adjustWeight,
        onPickWeight = { showWeight = true },
    )

    if (showQuit) {
        AlertDialog(
            onDismissRequest = { showQuit = false },
            containerColor = Surface1,
            title = { Text("Sessie stoppen?", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
            text = {
                Text(
                    "Wat je al gelogd hebt blijft bewaard.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    showQuit = false
                    viewModel.quit()
                    onExit()
                }) { Text("Stoppen", color = Accent) }
            },
            dismissButton = {
                TextButton(onClick = { showQuit = false }) { Text("Doorgaan", color = TextSecondary) }
            },
        )
    }

    val question = state.question
    if (showCustom && question != null) {
        CustomValueDialog(
            unit = question.exercise.target.unit,
            initial = question.default,
            onDismiss = { showCustom = false },
            onConfirm = {
                showCustom = false
                viewModel.answer(it)
            },
        )
    }

    if (showWeight && question?.weightKg != null) {
        WeightDialog(
            initial = question.weightKg,
            onDismiss = { showWeight = false },
            onConfirm = {
                showWeight = false
                viewModel.setWeight(it)
            },
        )
    }
}

@Composable
internal fun SessionContent(
    state: SessionUiState,
    onTap: () -> Unit,
    onQuit: () -> Unit,
    onTogglePause: () -> Unit,
    onAnswer: (Int) -> Unit,
    onCustom: () -> Unit,
    onSkipExercise: () -> Unit,
    onSkipRest: () -> Unit,
    onExit: () -> Unit,
    onAddRest: (Int) -> Unit = {},
    onWeightStep: (Double) -> Unit = {},
    onPickWeight: () -> Unit = {},
) {
    val tapEnabled = state.phase == Phase.WORK && !state.paused
    val interaction = remember { MutableInteractionSource() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Ink)
            .clickable(
                interactionSource = interaction,
                indication = null,
                enabled = tapEnabled,
            ) { onTap() },
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.systemBars)
                .padding(horizontal = 20.dp),
        ) {
            SegmentedProgress(
                total = state.totalSets,
                done = state.completedSets,
                modifier = Modifier.padding(top = 10.dp),
            )
            Spacer(Modifier.height(18.dp))
            SessionHeader(
                state = state,
                onQuit = onQuit,
                onTogglePause = onTogglePause,
                onSkipExercise = onSkipExercise,
            )

            when (state.phase) {
                Phase.WORK -> WorkContent(state, Modifier.weight(1f))
                Phase.REST -> RestContent(
                    state = state,
                    modifier = Modifier.weight(1f),
                    onAnswer = onAnswer,
                    onCustom = onCustom,
                    onWeightStep = onWeightStep,
                    onPickWeight = onPickWeight,
                )

                Phase.FINISHED -> FinishedContent(state, Modifier.weight(1f))
            }

            SessionBottomBar(
                state = state,
                onAddRest = onAddRest,
                onSkipRest = onSkipRest,
                onExit = onExit,
            )
            Spacer(Modifier.height(if (state.phase == Phase.REST) 30.dp else 12.dp))
        }

        // De pauzebalk: dik, vierkant en helemaal onderaan het scherm.
        if (state.phase == Phase.REST) {
            RestBar(
                progress = if (state.restTotal == 0) 0f else state.restLeft / state.restTotal.toFloat(),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .windowInsetsPadding(WindowInsets.navigationBars),
            )
        }
    }
}

@Composable
private fun SegmentedProgress(total: Int, done: Int, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        repeat(total.coerceAtLeast(1)) { index ->
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(4.dp)
                    .clip(RoundedCornerShape(50))
                    .background(if (index < done) Accent else Surface2),
            )
        }
    }
}

/** Puur oranje, geen randen, geen verloop — alleen zolang de pauze loopt. */
@Composable
private fun RestBar(progress: Float, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(16.dp)
            .background(Surface2),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .fillMaxHeight()
                .background(Accent),
        )
    }
}

/**
 * Links de oefening waar je mee bezig bent, rechts de knoppen. Zo staat de titel
 * ("Push-ups") met de subtekst ("Of knee push-ups") boven in beeld en blijft het
 * midden van het scherm leeg voor alleen het aantal.
 */
@Composable
private fun SessionHeader(
    state: SessionUiState,
    onQuit: () -> Unit,
    onTogglePause: () -> Unit,
    onSkipExercise: () -> Unit,
) {
    val exercise = state.exercise
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = exercise?.name ?: state.dayTitle,
                    style = MaterialTheme.typography.headlineLarge,
                    color = TextPrimary,
                )
                Text(
                    text = exercise?.hint ?: state.focus,
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextTertiary,
                )
            }
            if (state.phase != Phase.FINISHED) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .clickable(onClick = onSkipExercise)
                        .padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(
                        PhosphorIcons.Fill.SkipForward,
                        contentDescription = null,
                        tint = TextPrimary,
                        modifier = Modifier.size(18.dp),
                    )
                    Text("Skip", style = MaterialTheme.typography.labelLarge, color = TextPrimary)
                }
                Spacer(Modifier.width(6.dp))
                CircleIcon(
                    icon = if (state.paused) PhosphorIcons.Fill.Play else PhosphorIcons.Fill.Pause,
                    onClick = onTogglePause,
                )
                Spacer(Modifier.width(6.dp))
            }
            CircleIcon(icon = PhosphorIcons.Fill.X, onClick = onQuit)
        }

        if (state.phase != Phase.FINISHED) {
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (exercise != null) Tag("Set ${state.setIndex + 1} van ${exercise.sets}")
                Text(
                    text = "${state.dayTitle} · ${formatClock(state.totalElapsed)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
            }
        }
    }
}

@Composable
private fun CircleIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(RoundedCornerShape(50))
            .background(Surface2)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(18.dp))
    }
}

/**
 * Alleen het getal. Verder niets, zodat je in één oogopslag ziet wat je moet
 * doen. Het getal is je doel: wat je bij de vorige set (of de vorige training)
 * deed plus één. Gaat de oefening per kant, dan staat erboven welke kant.
 */
@Composable
private fun WorkContent(state: SessionUiState, modifier: Modifier = Modifier) {
    val exercise = state.exercise ?: return
    val countdown = state.countdownLeft
    val goal = state.goal
    val side = state.currentSide
    val bigText = when {
        countdown != null -> formatDuration(countdown)
        goal != null -> "${goal.target}"
        else -> exercise.target.shortLabel()
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        if (side != null) {
            SideSwitch(active = side)
            Spacer(Modifier.height(18.dp))
        }
        Text(
            text = bigText,
            style = MaterialTheme.typography.displayLarge.copy(
                fontSize = if (bigText.length <= 3) 148.sp else 108.sp,
                lineHeight = if (bigText.length <= 3) 148.sp else 108.sp,
            ),
            color = Accent,
            textAlign = TextAlign.Center,
        )
        if (side != null) {
            Spacer(Modifier.height(6.dp))
            Text(
                text = "per kant",
                style = MaterialTheme.typography.bodyLarge,
                color = TextTertiary,
            )
        }
        val weight = goal?.targetWeight?.takeIf { exercise.weighted }
        if (weight != null) {
            Spacer(Modifier.height(10.dp))
            Tag("${formatKg(weight)} kg per dumbbell")
        }
        if (goal != null) {
            Spacer(Modifier.height(if (weight != null) 10.dp else 6.dp))
            Text(
                text = buildString {
                    append("${goal.source.label} ${goal.previous}")
                    if (exercise.target.unit == MeasureUnit.SECONDS) append(" sec")
                    goal.previousWeight?.let { append(" met ${formatKg(it)} kg") }
                },
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
            )
            // Reps op het maximum uit het schema: dan wordt het tijd voor zwaarder.
            if (goal.steppedUp) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "Repbereik vol — pak de zwaardere dumbbell",
                    style = MaterialTheme.typography.bodyMedium,
                    color = AccentBright,
                )
            }
        }
        Spacer(Modifier.height(20.dp))
        Text(
            text = when {
                state.paused -> "Gepauzeerd"
                side == Side.RIGHT -> "Tik als rechts klaar is — dan links"
                side == Side.LEFT -> "Tik als links ook klaar is"
                else -> "Tik op het scherm als je klaar bent"
            },
            style = MaterialTheme.typography.bodyLarge,
            color = if (state.paused) Accent else TextTertiary,
            textAlign = TextAlign.Center,
        )
    }
}

/**
 * Rechts en links naast elkaar, in de volgorde waarin je ze doet: de kant die
 * aan de beurt is oranje, de kant die je al gehad hebt met een vinkje. Zo zie je
 * niet alleen wélke kant je doet, maar ook of de andere nog komt of al was.
 */
@Composable
private fun SideSwitch(active: Side) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Side.entries.forEach { side ->
            val on = side == active
            val done = !on && side.ordinal < active.ordinal
            val shape = RoundedCornerShape(50)
            Row(
                modifier = Modifier
                    .clip(shape)
                    .background(if (on) Color(0xFF4A2210) else Surface1)
                    .border(1.dp, if (on) Accent else Hairline, shape)
                    .padding(horizontal = 22.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                if (done) {
                    Icon(
                        PhosphorIcons.Fill.Check,
                        contentDescription = null,
                        tint = TextSecondary,
                        modifier = Modifier.size(15.dp),
                    )
                }
                Text(
                    text = side.label.uppercase(),
                    style = MaterialTheme.typography.labelLarge,
                    color = when {
                        on -> AccentBright
                        done -> TextSecondary
                        else -> TextTertiary
                    },
                )
            }
        }
    }
}

@Composable
private fun RestContent(
    state: SessionUiState,
    modifier: Modifier = Modifier,
    onAnswer: (Int) -> Unit,
    onCustom: () -> Unit,
    onWeightStep: (Double) -> Unit = {},
    onPickWeight: () -> Unit = {},
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = when {
                state.restTotal == 0 -> "LAATSTE SET"
                state.restLeft > 0 -> "PAUZE"
                else -> "KLAAR"
            },
            style = MaterialTheme.typography.labelSmall,
            color = Accent,
        )
        // Na de laatste set staat er geen klok meer te lopen; alleen nog de vraag.
        if (state.restTotal > 0) {
            Text(
                text = formatDuration(state.restLeft),
                style = MaterialTheme.typography.displayLarge.copy(fontSize = 96.sp, lineHeight = 96.sp),
                color = TextPrimary,
            )
        }

        Spacer(Modifier.height(26.dp))

        val question = state.question
        if (question != null) {
            QuestionCard(
                question = question,
                onAnswer = onAnswer,
                onCustom = onCustom,
                onWeightStep = onWeightStep,
                onPickWeight = onPickWeight,
            )
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Hierna", style = MaterialTheme.typography.labelSmall, color = TextTertiary)
                Spacer(Modifier.height(4.dp))
                val upcoming = if (state.setIndex + 1 < (state.exercise?.sets ?: 0)) {
                    "${state.exercise?.name} · set ${state.setIndex + 2}"
                } else {
                    state.next?.name ?: "Laatste set — bijna klaar"
                }
                Text(
                    text = upcoming,
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun QuestionCard(
    question: PendingQuestion,
    onAnswer: (Int) -> Unit,
    onCustom: () -> Unit,
    onWeightStep: (Double) -> Unit = {},
    onPickWeight: () -> Unit = {},
) {
    val shape = RoundedCornerShape(20.dp)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Surface1)
            .border(1.dp, Hairline, shape)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = when {
                question.exercise.target.unit == MeasureUnit.SECONDS && question.perSide ->
                    "Hoeveel seconden per kant?"

                question.exercise.target.unit == MeasureUnit.SECONDS -> "Hoeveel seconden hield je vol?"
                question.perSide -> "Hoeveel herhalingen per kant?"
                else -> "Hoeveel herhalingen deed je?"
            },
            style = MaterialTheme.typography.titleLarge,
            color = TextPrimary,
            textAlign = TextAlign.Center,
        )
        Text(
            text = question.exercise.name + if (question.perSide) " · links en rechts" else "",
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary,
            textAlign = TextAlign.Center,
        )

        // Bij dumbbells staat het gewicht boven de reps: eerst instellen, dan tikken.
        val weight = question.weightKg
        if (weight != null) {
            Spacer(Modifier.height(14.dp))
            WeightPicker(
                weightKg = weight,
                onStep = onWeightStep,
                onPick = onPickWeight,
            )
        }

        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            question.options.forEach { option ->
                val highlight = option == question.default
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .background(if (highlight) Color(0xFF4A2210) else Surface2)
                        .border(
                            1.dp,
                            if (highlight) Accent else Hairline,
                            RoundedCornerShape(14.dp),
                        )
                        .clickable { onAnswer(option) }
                        .padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "$option",
                        style = MaterialTheme.typography.headlineMedium,
                        color = if (highlight) AccentBright else TextPrimary,
                    )
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(
            text = "Anders…",
            style = MaterialTheme.typography.labelLarge,
            color = Accent,
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .clickable(onClick = onCustom)
                .padding(horizontal = 14.dp, vertical = 8.dp),
        )
    }
}

/**
 * De kg per dumbbell: min, het getal, plus. Het getal zelf is aan te tikken voor
 * een gewicht dat niet op de stapjes van 2,5 kg valt.
 */
@Composable
private fun WeightPicker(
    weightKg: Double,
    onStep: (Double) -> Unit,
    onPick: () -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "KG PER DUMBBELL",
            style = MaterialTheme.typography.labelSmall,
            color = TextTertiary,
        )
        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            StepButton(text = "− ${formatKg(WEIGHT_STEP_KG)}", enabled = weightKg > 0.0) {
                onStep(-WEIGHT_STEP_KG)
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .clip(shape)
                    .background(Surface2)
                    .border(1.dp, Hairline, shape)
                    .clickable(onClick = onPick)
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = if (weightKg <= 0.0) "geen" else "${formatKg(weightKg)} kg",
                    style = MaterialTheme.typography.headlineMedium,
                    color = if (weightKg <= 0.0) TextTertiary else AccentBright,
                )
            }
            StepButton(text = "+ ${formatKg(WEIGHT_STEP_KG)}", enabled = true) { onStep(WEIGHT_STEP_KG) }
        }
    }
}

@Composable
private fun StepButton(text: String, enabled: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(14.dp)
    Box(
        modifier = Modifier
            .width(78.dp)
            .height(52.dp)
            .clip(shape)
            .background(Surface2)
            .border(1.dp, Hairline, shape)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.titleLarge,
            color = if (enabled) TextPrimary else TextTertiary,
        )
    }
}

@Composable
private fun FinishedContent(state: SessionUiState, modifier: Modifier = Modifier) {
    val summary = state.summary
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(
            imageVector = Sparkle,
            contentDescription = null,
            tint = Accent,
            modifier = Modifier.size(56.dp).rotate(-14f),
        )
        Spacer(Modifier.height(14.dp))
        Text("SESSIE KLAAR", style = MaterialTheme.typography.displayLarge, color = TextPrimary)
        Spacer(Modifier.height(8.dp))
        Text(state.focus, style = MaterialTheme.typography.bodyLarge, color = TextTertiary)
        Spacer(Modifier.height(30.dp))
        if (summary != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(28.dp)) {
                SummaryStat(formatDuration(summary.durationSec), "tijd")
                SummaryStat("${summary.sets}", "sets")
                SummaryStat("${summary.totalReps}", "reps")
            }
            if (summary.totalSeconds > 0) {
                Spacer(Modifier.height(14.dp))
                Text(
                    text = "+ ${summary.totalSeconds} seconden hold",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                )
            }
            if (summary.volumeKg > 0.0) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "${formatKg(summary.volumeKg)} kg getild (kg × reps)",
                    style = MaterialTheme.typography.bodyLarge,
                    color = TextSecondary,
                )
            }
        }
    }
}

@Composable
private fun SummaryStat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.displayMedium, color = Accent)
        Text(label, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
    }
}

@Composable
private fun SessionBottomBar(
    state: SessionUiState,
    onAddRest: (Int) -> Unit,
    onSkipRest: () -> Unit,
    onExit: () -> Unit,
) {
    when (state.phase) {
        Phase.WORK -> Spacer(Modifier.height(4.dp))

        Phase.REST -> Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Na de laatste set is er geen pauze meer om te verlengen.
            if (!state.isFinalSet) {
                PillButton(text = "+ 1 min", accent = true, onClick = { onAddRest(60) })
                Spacer(Modifier.width(10.dp))
            }
            PillButton(
                text = if (state.question != null) "Pauze overslaan" else "Verder",
                icon = PhosphorIcons.Fill.SkipForward,
                onClick = onSkipRest,
            )
        }

        Phase.FINISHED -> BigActionButton(text = "Klaar", onClick = onExit)
    }
}

@Composable
private fun PillButton(
    text: String,
    onClick: () -> Unit,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    accent: Boolean = false,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Surface1)
            .border(1.dp, if (accent) Accent else Hairline, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            color = if (accent) AccentBright else TextSecondary,
        )
        if (icon != null) {
            Icon(icon, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun CustomValueDialog(
    unit: MeasureUnit,
    initial: Int,
    onDismiss: () -> Unit,
    onConfirm: (Int) -> Unit,
) {
    var text by remember { mutableStateOf(initial.toString()) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = {
            Text(
                text = if (unit == MeasureUnit.SECONDS) "Aantal seconden" else "Aantal herhalingen",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
            )
        },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { new -> text = new.filter { it.isDigit() }.take(4) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
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
        },
        confirmButton = {
            TextButton(
                onClick = { text.toIntOrNull()?.let(onConfirm) },
                enabled = text.toIntOrNull() != null,
            ) { Text("Opslaan", color = Accent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

@Composable
private fun WeightDialog(
    initial: Double,
    onDismiss: () -> Unit,
    onConfirm: (Double) -> Unit,
) {
    var text by remember { mutableStateOf(formatKg(initial)) }
    val value = text.replace(',', '.').toDoubleOrNull()

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = {
            Text(
                text = "Kg per dumbbell",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
            )
        },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { new -> text = new.filter { it.isDigit() || it == ',' || it == '.' }.take(5) },
                singleLine = true,
                label = { Text("kg", color = TextTertiary) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
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
        },
        confirmButton = {
            TextButton(onClick = { value?.let(onConfirm) }, enabled = value != null) {
                Text("Opslaan", color = Accent)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

@Composable
private fun KeepScreenOn() {
    val context = LocalContext.current
    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
    }
}

private fun Context.vibrate() {
    val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    vibrator?.vibrate(VibrationEffect.createOneShot(220, VibrationEffect.DEFAULT_AMPLITUDE))
}

/** Lange notatie voor de kop van de sessie: 00:03:14. */
fun formatClock(seconds: Int): String =
    "%02d:%02d:%02d".format(seconds / 3600, (seconds % 3600) / 60, seconds % 60)

fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%d:%02d".format(m, s)
}
