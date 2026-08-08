package com.vlammie.fitness.ui.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.CreationExtras
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.GoalSource
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.SetGoal
import com.vlammie.fitness.data.model.Side
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.repo.FitnessRepository
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import java.time.LocalDate

enum class Phase { WORK, REST, FINISHED }

/**
 * De vraag "hoeveel heb je er gedaan?" die tijdens de pauze verschijnt.
 *
 * [weightKg] is de kilo's per dumbbell die er nu onder staan; `null` bij een
 * oefening zonder gewicht, en dan komt de kg-regel ook niet in beeld.
 */
data class PendingQuestion(
    val exercise: Exercise,
    val setIndex: Int,
    val options: List<Int>,
    val default: Int,
    val weightKg: Double? = null,
) {
    /** Bij links/rechts geldt het antwoord per kant, niet voor de hele set. */
    val perSide: Boolean get() = exercise.perSide
}

data class SessionSummary(
    val durationSec: Int,
    val sets: Int,
    val totalReps: Int,
    val totalSeconds: Int,
    /** Kilo's per dumbbell × herhalingen, over de hele sessie. */
    val volumeKg: Double = 0.0,
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
    /**
     * Per oefening-id het doel per set-index: bij het starten afgeleid van je
     * vorige training, en tijdens de sessie van de set die je net gelogd hebt.
     */
    val goals: Map<String, Map<Int, SetGoal>> = emptyMap(),
    /** Welke helft van de set je doet bij een oefening die per kant gaat. */
    val side: Side = Side.first,
) {
    val exercise: Exercise? get() = exercises.getOrNull(exerciseIndex)
    val next: Exercise? get() = exercises.getOrNull(exerciseIndex + 1)
    val totalSets: Int get() = exercises.sumOf { it.sets }
    val progress: Float get() = if (totalSets == 0) 0f else completedSets / totalSets.toFloat()

    /** Het doel van de set waar je nu in zit, of `null` als er nog geen historie is. */
    val goal: SetGoal? get() = exercise?.let { goals[it.id]?.get(setIndex) }

    /** De kant die nu aan de beurt is, of `null` bij een oefening die niet per kant gaat. */
    val currentSide: Side? get() = side.takeIf { exercise?.perSide == true }

    /** De laatste set van de laatste oefening: hierna volgt geen pauze meer. */
    val isFinalSet: Boolean
        get() = exerciseIndex == exercises.lastIndex && setIndex == (exercise?.sets ?: 0) - 1

    /** Waar de klok naartoe telt bij een oefening op tijd: je doel, anders het schema. */
    val targetSeconds: Int?
        get() = exercise?.takeIf { it.target.unit == MeasureUnit.SECONDS }
            ?.let { goal?.target ?: it.target.max }

    /** Bij een oefening op tijd telt het scherm af in plaats van op. */
    val countdownLeft: Int?
        get() = targetSeconds?.let { (it - workElapsed).coerceAtLeast(0) }
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
    private var volumeKg = 0.0

    private val _state = MutableStateFlow(SessionUiState())
    val state = _state.asStateFlow()

    /** Telt op zodra een pauze afloopt, zodat de UI kan trillen. */
    private val _restFinishedSignal = MutableStateFlow(0)
    val restFinishedSignal = _restFinishedSignal.asStateFlow()

    val restFeedback = repo.settings.restFeedback
        .stateIn(viewModelScope, SharingStarted.Eagerly, true)

    init {
        viewModelScope.launch {
            // Bij de allereerste start staat het schema nog in de database te landen,
            // dus wachten we er even op voordat we terugvallen op het standaardplan.
            val day = withTimeoutOrNull(5_000) { repo.workoutDay(dayId).filterNotNull().first() }
                ?: Program.findDay(dayId)?.second

            if (day == null) {
                sessionId.complete(-1L)
                _state.update { it.copy(phase = Phase.FINISHED) }
                return@launch
            }

            _state.value = SessionUiState(
                dayTitle = day.title,
                focus = day.focus,
                exercises = day.exercises,
            )
            sessionId.complete(repo.startSession(date, day.routeKey, day.id, day.title))

            // Pas ná het aanmaken van de sessie, maar vóór de eerste gelogde set:
            // zo kijken de doelen gegarandeerd naar de vórige training.
            val goals = day.exercises
                .distinctBy { it.id }
                .associate { it.id to repo.goalsFor(it) }
                .filterValues { it.isNotEmpty() }
            _state.update { it.copy(goals = goals) }
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
                // Oefeningen op tijd stoppen vanzelf wanneer de tijd om is.
                val seconds = current.targetSeconds
                if (seconds != null && elapsed >= seconds) completeSet()
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

        // Een set per kant loopt in twee helften zonder pauze ertussen: eerst
        // rechts, dan links. Pas na de tweede kant is de set klaar.
        if (exercise.perSide && current.side == Side.first) {
            _state.update { it.copy(side = it.side.other, workElapsed = 0) }
            return
        }

        val goal = current.goal?.target
        val fallback = when (exercise.target.unit) {
            MeasureUnit.SECONDS -> minOf(current.workElapsed.coerceAtLeast(1), current.targetSeconds ?: exercise.target.max)
            MeasureUnit.REPS -> goal ?: exercise.target.suggested
        }
        // Na de allerlaatste set van de sessie hoef je nergens meer voor uit te rusten.
        val rest = if (current.isFinalSet) 0 else exercise.restSeconds

        // Meteen naar de pauze, zodat een tweede tik (of tick) er niet nog een set van maakt.
        _state.update {
            it.copy(
                phase = Phase.REST,
                restTotal = rest,
                restLeft = rest,
                workElapsed = 0,
                question = PendingQuestion(
                    exercise = exercise,
                    setIndex = it.setIndex,
                    options = listOf(fallback),
                    default = fallback,
                    weightKg = current.goal?.targetWeight?.takeIf { _ -> exercise.weighted },
                ),
            )
        }

        viewModelScope.launch {
            val default = if (exercise.target.unit == MeasureUnit.SECONDS) {
                fallback
            } else {
                goal ?: repo.lastValue(exercise.id) ?: fallback
            }
            val options = repo.quickOptions(exercise, default)
            // Het gewicht van vorige keer staat al klaar, zodat je meestal alleen
            // nog op je aantal herhalingen hoeft te tikken.
            val weight = if (!exercise.weighted) {
                null
            } else {
                _state.value.question?.weightKg ?: repo.lastWeight(exercise.id) ?: 0.0
            }
            _state.update {
                it.copy(
                    question = it.question?.copy(
                        options = options,
                        default = default,
                        weightKg = weight,
                    )
                )
            }
        }
    }

    /** De min/plus-knopjes bij de kg tijdens de pauze. */
    fun adjustWeight(delta: Double) = _state.update { state ->
        val question = state.question ?: return@update state
        val current = question.weightKg ?: return@update state
        state.copy(question = question.copy(weightKg = (current + delta).coerceAtLeast(0.0)))
    }

    /** Een gewicht dat niet op de stapjes valt (7,5 · 11 · 13,5) zelf intikken. */
    fun setWeight(kg: Double) = _state.update { state ->
        val question = state.question ?: return@update state
        state.copy(question = question.copy(weightKg = kg.coerceIn(0.0, 500.0)))
    }

    /** "+ 1 minuut" tijdens de pauze: soms is de standaardrust gewoon te kort. */
    fun addRest(seconds: Int) {
        if (_state.value.phase != Phase.REST) return
        _state.update {
            val left = it.restLeft + seconds
            it.copy(restLeft = left, restTotal = maxOf(it.restTotal, left))
        }
    }

    /** Antwoord op de vraag tijdens de pauze. */
    fun answer(value: Int) {
        val question = _state.value.question ?: return
        val weight = question.weightKg?.takeIf { it > 0.0 }
        viewModelScope.launch {
            val id = sessionId.await()
            if (id > 0) repo.logSet(id, date, question.exercise, question.setIndex, value, weight)
            loggedSets++
            if (question.exercise.target.unit == MeasureUnit.SECONDS) {
                totalSeconds += value
            } else {
                totalReps += value
            }
            if (weight != null) volumeKg += weight * value
            _state.update {
                it.copy(
                    question = null,
                    completedSets = it.completedSets + 1,
                    // Wat je net deed is meteen de lat voor de volgende set.
                    goals = it.goals.withGoalAfter(question.exercise, question.setIndex, value, weight),
                )
            }
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
                side = Side.first,
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
                it.copy(
                    setIndex = nextSet,
                    phase = Phase.WORK,
                    workElapsed = 0,
                    restLeft = 0,
                    side = Side.first,
                )
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
                    side = Side.first,
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
                summary = SessionSummary(elapsed, loggedSets, totalReps, totalSeconds, volumeKg),
            )
        }
        viewModelScope.launch {
            val id = sessionId.await()
            if (id <= 0) return@launch
            if (loggedSets > 0) repo.finishSession(id, elapsed) else repo.abandonSession(id)
        }
    }

    /** Voortijdig stoppen via het kruisje. */
    fun quit() {
        if (_state.value.phase != Phase.FINISHED) finish()
    }

    /**
     * Zet het doel van de vólgende set op wat je net deed plus één stap: deed je
     * er 15, dan staat er bij set 2 een 16. Zo loopt de progressie ook bínnen een
     * sessie door, en niet alleen van training tot training.
     */
    private fun Map<String, Map<Int, SetGoal>>.withGoalAfter(
        exercise: Exercise,
        setIndex: Int,
        value: Int,
        weightKg: Double?,
    ): Map<String, Map<Int, SetGoal>> {
        val nextSet = setIndex + 1
        if (nextSet >= exercise.sets) return this
        val goal = exercise.goalAfter(value, weightKg, GoalSource.LAST_SET)
        return this + (exercise.id to (this[exercise.id].orEmpty() + (nextSet to goal)))
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
