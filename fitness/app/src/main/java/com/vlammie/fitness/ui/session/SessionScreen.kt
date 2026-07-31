package com.vlammie.fitness.ui.session

import android.app.Activity
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.Pause
import com.adamglin.phosphoricons.fill.Play
import com.adamglin.phosphoricons.fill.SkipForward
import com.adamglin.phosphoricons.fill.X
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.ui.components.BigActionButton
import com.vlammie.fitness.ui.components.Tag
import com.vlammie.fitness.ui.components.ThinProgressBar
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
        onSkipRest = viewModel::skipRest,
        onExit = onExit,
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
            SessionTopBar(
                state = state,
                onQuit = onQuit,
                onTogglePause = onTogglePause,
            )

            Spacer(Modifier.height(14.dp))
            ThinProgressBar(progress = state.progress)
            Spacer(Modifier.height(8.dp))
            Text(
                text = "${state.completedSets}/${state.totalSets} sets · ${formatDuration(state.totalElapsed)}",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )

            when (state.phase) {
                Phase.WORK -> WorkContent(state, Modifier.weight(1f))
                Phase.REST -> RestContent(
                    state = state,
                    modifier = Modifier.weight(1f),
                    onAnswer = onAnswer,
                    onCustom = onCustom,
                )

                Phase.FINISHED -> FinishedContent(state, Modifier.weight(1f))
            }

            SessionBottomBar(
                state = state,
                onSkipExercise = onSkipExercise,
                onSkipRest = onSkipRest,
                onExit = onExit,
            )
            Spacer(Modifier.height(12.dp))
        }
    }
}

@Composable
private fun SessionTopBar(
    state: SessionUiState,
    onQuit: () -> Unit,
    onTogglePause: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CircleIcon(icon = PhosphorIcons.Fill.X, onClick = onQuit)
        Column(
            modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = state.dayTitle.uppercase(),
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                textAlign = TextAlign.Center,
            )
            if (state.exercises.isNotEmpty() && state.phase != Phase.FINISHED) {
                Text(
                    text = "Oefening ${(state.exerciseIndex + 1).coerceAtMost(state.exercises.size)}/${state.exercises.size}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
            }
        }
        if (state.phase != Phase.FINISHED) {
            CircleIcon(
                icon = if (state.paused) PhosphorIcons.Fill.Play else PhosphorIcons.Fill.Pause,
                onClick = onTogglePause,
            )
        } else {
            Spacer(Modifier.size(40.dp))
        }
    }
}

@Composable
private fun CircleIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(RoundedCornerShape(50))
            .background(Surface2)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = TextPrimary, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun WorkContent(state: SessionUiState, modifier: Modifier = Modifier) {
    val exercise = state.exercise ?: return
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Tag("Set ${state.setIndex + 1} van ${exercise.sets}")
        Spacer(Modifier.height(18.dp))
        Text(
            text = exercise.name.uppercase(),
            style = MaterialTheme.typography.displayLarge,
            color = TextPrimary,
            textAlign = TextAlign.Center,
        )
        if (exercise.hint != null) {
            Spacer(Modifier.height(6.dp))
            Text(exercise.hint, style = MaterialTheme.typography.bodyLarge, color = TextTertiary)
        }
        Spacer(Modifier.height(34.dp))

        val countdown = state.countdownLeft
        if (countdown != null) {
            Text(
                text = formatDuration(countdown),
                style = MaterialTheme.typography.displayLarge.copy(fontSize = 72.sp),
                color = Accent,
            )
            Text("volhouden", style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        } else {
            Text(
                text = if (exercise.target.amrap) "MAX" else exercise.target.label().substringBefore(" per"),
                style = MaterialTheme.typography.displayLarge.copy(fontSize = 64.sp),
                color = Accent,
            )
            Text(
                text = if (exercise.target.perSide) "herhalingen per kant" else "herhalingen",
                style = MaterialTheme.typography.labelLarge,
                color = TextSecondary,
            )
        }

        Spacer(Modifier.height(40.dp))
        Text(
            text = if (state.paused) "Gepauzeerd" else "Tik op het scherm als je klaar bent",
            style = MaterialTheme.typography.bodyLarge,
            color = if (state.paused) Accent else TextTertiary,
        )
    }
}

@Composable
private fun RestContent(
    state: SessionUiState,
    modifier: Modifier = Modifier,
    onAnswer: (Int) -> Unit,
    onCustom: () -> Unit,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(contentAlignment = Alignment.Center) {
            RestRing(
                progress = if (state.restTotal == 0) 0f else state.restLeft / state.restTotal.toFloat(),
                modifier = Modifier.size(190.dp),
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = if (state.restLeft > 0) "PAUZE" else "KLAAR",
                    style = MaterialTheme.typography.labelSmall,
                    color = Accent,
                )
                Text(
                    text = formatDuration(state.restLeft),
                    style = MaterialTheme.typography.displayLarge.copy(fontSize = 52.sp),
                    color = TextPrimary,
                )
            }
        }

        Spacer(Modifier.height(26.dp))

        val question = state.question
        if (question != null) {
            QuestionCard(question = question, onAnswer = onAnswer, onCustom = onCustom)
        } else {
            AnimatedVisibility(visible = true) {
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
}

@Composable
private fun QuestionCard(
    question: PendingQuestion,
    onAnswer: (Int) -> Unit,
    onCustom: () -> Unit,
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
            text = if (question.exercise.target.unit == MeasureUnit.SECONDS) {
                "Hoeveel seconden hield je vol?"
            } else {
                "Hoeveel herhalingen deed je?"
            },
            style = MaterialTheme.typography.titleLarge,
            color = TextPrimary,
        )
        Text(
            text = question.exercise.name + if (question.exercise.target.perSide) " (per kant)" else "",
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary,
        )
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

@Composable
private fun RestRing(progress: Float, modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val stroke = 12.dp.toPx()
        val diameter = size.minDimension - stroke
        val topLeft = androidx.compose.ui.geometry.Offset(
            (size.width - diameter) / 2f,
            (size.height - diameter) / 2f,
        )
        drawArc(
            color = Surface2,
            startAngle = -90f,
            sweepAngle = 360f,
            useCenter = false,
            topLeft = topLeft,
            size = Size(diameter, diameter),
            style = Stroke(width = stroke, cap = StrokeCap.Round),
        )
        drawArc(
            color = Accent,
            startAngle = -90f,
            sweepAngle = 360f * progress.coerceIn(0f, 1f),
            useCenter = false,
            topLeft = topLeft,
            size = Size(diameter, diameter),
            style = Stroke(width = stroke, cap = StrokeCap.Round),
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
    onSkipExercise: () -> Unit,
    onSkipRest: () -> Unit,
    onExit: () -> Unit,
) {
    when (state.phase) {
        Phase.WORK -> Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
        ) {
            SkipButton("Oefening overslaan", onSkipExercise)
        }

        Phase.REST -> Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
        ) {
            SkipButton(
                text = if (state.question != null) "Pauze overslaan" else "Verder",
                onClick = onSkipRest,
            )
        }

        Phase.FINISHED -> BigActionButton(text = "Klaar", onClick = onExit)
    }
}

@Composable
private fun SkipButton(text: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(Surface1)
            .border(1.dp, Hairline, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(text, style = MaterialTheme.typography.labelLarge, color = TextSecondary)
        Icon(PhosphorIcons.Fill.SkipForward, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp))
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

fun formatDuration(seconds: Int): String {
    val m = seconds / 60
    val s = seconds % 60
    return "%d:%02d".format(m, s)
}
