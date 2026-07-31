package com.vlammie.fitness.ui.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.CreationExtras
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.repo.FitnessRepository
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.LocalDate

enum class Phase { WORK, REST, FINISHED }

/** De vraag "hoeveel heb je er gedaan?" die tijdens de pauze verschijnt. */
data class PendingQuestion(
    val exercise: Exercise,
    val setIndex: Int,
    val options: List<Int>,
    val default: Int,
)

data class SessionSummary(
    val durationSec: Int,
    val sets: Int,
    val totalReps: Int,
    val totalSeconds: Int,
)

data class SessionUiState(
    val dayTitle: String = "",
    val focus: String = "",
    val exercises: List<Exercise> = emptyList(),
    val exerciseIndex: Int = 0,
    val setIndex: Int = 0,
    val phase: Phase = Phase.WORK,
    val paused: Boolean = false,
    val workElapsed: Int = 0,
    val restLeft: Int = 0,
    val restTotal: Int = 0,
    val question: PendingQuestion? = null,
    val completedSets: Int = 0,
    val totalElapsed: Int = 0,
    val summary: SessionSummary? = null,
) {
    val exercise: Exercise? get() = exercises.getOrNull(exerciseIndex)
    val next: Exercise? get() = exercises.getOrNull(exerciseIndex + 1)
    val totalSets: Int get() = exercises.sumOf { it.sets }
    val progress: Float get() = if (totalSets == 0) 0f else completedSets / totalSets.toFloat()

    /** Bij een oefening op tijd telt het scherm af in plaats van op. */
    val countdownLeft: Int?
        get() = exercise?.takeIf { it.target.unit == MeasureUnit.SECONDS }
            ?.let { (it.target.max - workElapsed).coerceAtLeast(0) }
}

class SessionViewModel(
    private val repo: FitnessRepository,
    dayId: String,
) : ViewModel() {

    private val date: LocalDate = LocalDate.now()
    private val sessionId = CompletableDeferred<Long>()
    private var loggedSets = 0
    private var totalReps = 0
    private var totalSeconds = 0

    private val _state = MutableStateFlow(SessionUiState())
    val state = _state.asStateFlow()

    /** Telt op zodra een pauze afloopt, zodat de UI kan trillen. */
    private val _restFinishedSignal = MutableStateFlow(0)
    val restFinishedSignal = _restFinishedSignal.asStateFlow()

    val restFeedback = repo.settings.restFeedback
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    init {
        val found = Program.findDay(dayId)
        if (found != null) {
            val (route, day) = found
            _state.value = SessionUiState(
                dayTitle = day.title,
                focus = day.focus,
                exercises = day.exercises,
            )
            viewModelScope.launch {
                sessionId.complete(repo.startSession(date, route, day.id, day.title))
            }
        } else {
            _state.update { it.copy(phase = Phase.FINISHED) }
        }
        startTicker()
    }

    private fun startTicker() = viewModelScope.launch {
        while (isActive) {
            delay(1_000)
            tick()
        }
    }

    private fun tick() {
        val current = _state.value
        if (current.phase == Phase.FINISHED || current.paused) return
        when (current.phase) {
            Phase.WORK -> {
                val elapsed = current.workElapsed + 1
                _state.update { it.copy(workElapsed = elapsed, totalElapsed = it.totalElapsed + 1) }
                val target = current.exercise?.target
                // Oefeningen op tijd stoppen vanzelf wanneer de tijd om is.
                if (target != null && target.unit == MeasureUnit.SECONDS && elapsed >= target.max) {
                    completeSet()
                }
            }

            Phase.REST -> {
                val left = (current.restLeft - 1).coerceAtLeast(0)
                _state.update { it.copy(restLeft = left, totalElapsed = it.totalElapsed + 1) }
                if (left == 0 && current.restLeft > 0) {
                    _restFinishedSignal.update { it + 1 }
                    // Zolang de vraag nog openstaat wachten we op het antwoord.
                    if (_state.value.question == null) advance()
                }
            }

            Phase.FINISHED -> Unit
        }
    }

    /** Tik op het scherm: deze set is klaar. */
    fun completeSet() {
        val current = _state.value
        val exercise = current.exercise ?: return
        if (current.phase != Phase.WORK) return

        val fallback = when (exercise.target.unit) {
            MeasureUnit.SECONDS -> minOf(current.workElapsed.coerceAtLeast(1), exercise.target.max)
            MeasureUnit.REPS -> exercise.target.suggested
        }

        // Meteen naar de pauze, zodat een tweede tik (of tick) er niet nog een set van maakt.
        _state.update {
            it.copy(
                phase = Phase.REST,
                restTotal = exercise.restSeconds,
                restLeft = exercise.restSeconds,
                workElapsed = 0,
                question = PendingQuestion(exercise, it.setIndex, listOf(fallback), fallback),
            )
        }

        viewModelScope.launch {
            val options = repo.quickOptions(exercise)
            val default = if (exercise.target.unit == MeasureUnit.SECONDS) {
                fallback
            } else {
                repo.lastValue(exercise.id) ?: fallback
            }
            _state.update { it.copy(question = it.question?.copy(options = options, default = default)) }
        }
    }

    /** Antwoord op de vraag tijdens de pauze. */
    fun answer(value: Int) {
        val question = _state.value.question ?: return
        viewModelScope.launch {
            repo.logSet(sessionId.await(), date, question.exercise, question.setIndex, value)
            loggedSets++
            if (question.exercise.target.unit == MeasureUnit.SECONDS) {
                totalSeconds += value
            } else {
                totalReps += value
            }
            _state.update { it.copy(question = null, completedSets = it.completedSets + 1) }
            if (_state.value.restLeft <= 0) advance()
        }
    }

    fun skipRest() {
        _state.update { it.copy(restLeft = 0) }
        if (_state.value.question == null) advance()
    }

    /** Hele oefening overslaan (blessure, geen materiaal, geen zin). */
    fun skipExercise() {
        val current = _state.value
        val exercise = current.exercise ?: return
        val remaining = exercise.sets - current.setIndex
        _state.update {
            it.copy(
                exerciseIndex = it.exerciseIndex + 1,
                setIndex = 0,
                phase = Phase.WORK,
                workElapsed = 0,
                restLeft = 0,
                question = null,
                completedSets = it.completedSets + remaining,
            )
        }
        if (_state.value.exerciseIndex >= _state.value.exercises.size) finish()
    }

    fun togglePause() = _state.update { it.copy(paused = !it.paused) }

    private fun advance() {
        val current = _state.value
        val exercise = current.exercise ?: return finish()
        val nextSet = current.setIndex + 1

        if (nextSet < exercise.sets) {
            _state.update {
                it.copy(setIndex = nextSet, phase = Phase.WORK, workElapsed = 0, restLeft = 0)
            }
            return
        }

        // Oefening afgerond: ook op de homepage afvinken.
        viewModelScope.launch { repo.setChecked(date, exercise.id, true) }

        val nextExercise = current.exerciseIndex + 1
        if (nextExercise >= current.exercises.size) {
            finish()
        } else {
            _state.update {
                it.copy(
                    exerciseIndex = nextExercise,
                    setIndex = 0,
                    phase = Phase.WORK,
                    workElapsed = 0,
                    restLeft = 0,
                )
            }
        }
    }

    private fun finish() {
        val elapsed = _state.value.totalElapsed
        _state.update {
            it.copy(
                phase = Phase.FINISHED,
                question = null,
                summary = SessionSummary(elapsed, loggedSets, totalReps, totalSeconds),
            )
        }
        viewModelScope.launch {
            val id = sessionId.await()
            if (loggedSets > 0) repo.finishSession(id, elapsed) else repo.abandonSession(id)
        }
    }

    /** Voortijdig stoppen via het kruisje. */
    fun quit() {
        if (_state.value.phase != Phase.FINISHED) finish()
    }

    companion object {
        fun factory(dayId: String) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T {
                val app = extras[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                return SessionViewModel(app.repository, dayId) as T
            }
        }
    }
}
