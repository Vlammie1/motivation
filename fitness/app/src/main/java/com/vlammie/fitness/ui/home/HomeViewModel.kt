package com.vlammie.fitness.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.db.SetLogEntity
import com.vlammie.fitness.data.model.DayPlan
import com.vlammie.fitness.data.model.NutritionTargets
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Route
import com.vlammie.fitness.data.model.WorkoutDay
import com.vlammie.fitness.data.model.formatKg
import com.vlammie.fitness.data.repo.FitnessRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate

data class UpcomingDay(
    val date: LocalDate,
    val dayLabel: String,
    val title: String,
    val focus: String,
    val isRest: Boolean,
)

data class NutritionSummary(
    val kcal: Int = 0,
    val protein: Int = 0,
    val waterMl: Int = 0,
    val targets: NutritionTargets = NutritionTargets(),
)

/** Wat er op een dag daadwerkelijk gelogd is, samengevat per oefening. */
data class LoggedExercise(
    val name: String,
    val values: List<Int>,
    /** De kg per dumbbell van de sets waar gewicht bij hoorde. */
    val weights: List<Double> = emptyList(),
) {
    val sets: Int get() = values.size
    val best: Int get() = values.maxOrNull() ?: 0
    val summary: String get() = values.joinToString(" · ")

    /** "12,5 kg" of "10–12,5 kg" als je halverwege zwaarder ging. */
    val weightLabel: String?
        get() {
            if (weights.isEmpty()) return null
            val low = weights.min()
            val high = weights.max()
            return if (low == high) "${formatKg(low)} kg" else "${formatKg(low)}–${formatKg(high)} kg"
        }
}

data class HomeUiState(
    val today: LocalDate = LocalDate.now(),
    val date: LocalDate = LocalDate.now(),
    val route: Route = Route.A,
    val days: List<WorkoutDay> = emptyList(),
    val plan: DayPlan = DayPlan.Rest("Rustdag", ""),
    val checked: Set<String> = emptySet(),
    val sessionsToday: Int = 0,
    val sessionsThisWeek: Int = 0,
    val logged: List<LoggedExercise> = emptyList(),
    val nutrition: NutritionSummary = NutritionSummary(),
    val upcoming: List<UpcomingDay> = emptyList(),
) {
    val trainingDay: WorkoutDay?
        get() = (plan as? DayPlan.Training)?.day

    val isToday: Boolean get() = date == today
    val isPast: Boolean get() = date.isBefore(today)

    val checkedCount: Int get() = trainingDay?.exercises?.count { it.id in checked } ?: 0

    val progress: Float
        get() = trainingDay?.exercises?.size?.takeIf { it > 0 }?.let { checkedCount / it.toFloat() } ?: 0f

    /** De workouts van de ingestelde route, met die van de andere route erachter. */
    val pickableDays: List<WorkoutDay>
        get() = days.sortedBy { if (it.routeKey == route.key) 0 else 1 }
}

private data class DayData(
    val checked: Set<String>,
    val sessions: Int,
    val weekCount: Int,
    val logged: List<LoggedExercise>,
)

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModel(private val repo: FitnessRepository) : ViewModel() {

    private val todayFlow = MutableStateFlow(LocalDate.now())
    private val dateFlow = MutableStateFlow(LocalDate.now())

    private val nutritionFlow = dateFlow.flatMapLatest { date ->
        combine(repo.foodOn(date), repo.waterOn(date), repo.settings.targets) { entries, water, targets ->
            NutritionSummary(
                kcal = entries.sumOf { it.kcal },
                protein = entries.sumOf { it.protein },
                waterMl = water?.ml ?: 0,
                targets = targets,
            )
        }
    }

    private val dayFlow = dateFlow.flatMapLatest { date ->
        combine(
            repo.checksOn(date),
            repo.sessionsOn(date),
            repo.sessionCountSince(date.with(DayOfWeek.MONDAY)),
            repo.setsOn(date),
        ) { checks, sessions, weekCount, sets ->
            DayData(checks.toSet(), sessions.size, weekCount, summarise(sets))
        }
    }

    private val scheduleFlow = combine(repo.settings.route, repo.workoutDays) { route, days ->
        route to days
    }

    val state = combine(
        combine(todayFlow, dateFlow) { today, date -> today to date },
        scheduleFlow,
        dayFlow,
        nutritionFlow,
    ) { dates, schedule, day, nutrition ->
        val (today, date) = dates
        val (route, days) = schedule
        val routeDays = days.filter { it.routeKey == route.key }
        HomeUiState(
            today = today,
            date = date,
            route = route,
            days = days,
            plan = Program.planFor(routeDays, date.dayOfWeek),
            checked = day.checked,
            sessionsToday = day.sessions,
            sessionsThisWeek = day.weekCount,
            logged = day.logged,
            nutrition = nutrition,
            upcoming = upcomingDays(routeDays, date),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    /** De datum kan verschoven zijn terwijl de app op de achtergrond stond. */
    fun refreshDate() {
        val now = LocalDate.now()
        if (now != todayFlow.value) {
            val wasToday = dateFlow.value == todayFlow.value
            todayFlow.value = now
            if (wasToday) dateFlow.value = now
        }
    }

    /** Slepen over de weekstrook: één dag per stap. */
    fun shiftDate(days: Long) {
        dateFlow.value = dateFlow.value.plusDays(days)
    }

    fun selectDate(date: LocalDate) {
        dateFlow.value = date
    }

    fun goToToday() {
        dateFlow.value = todayFlow.value
    }

    fun toggleCheck(exerciseId: String, checked: Boolean) {
        viewModelScope.launch { repo.setChecked(dateFlow.value, exerciseId, checked) }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                HomeViewModel(app.repository)
            }
        }
    }
}

/** Losse sets samenvouwen tot één regel per oefening, in de volgorde van loggen. */
internal fun summarise(sets: List<SetLogEntity>): List<LoggedExercise> =
    sets.groupBy { it.exerciseId }
        .map { (_, rows) ->
            LoggedExercise(
                name = rows.first().exerciseName,
                values = rows.map { it.value },
                weights = rows.mapNotNull { it.weightKg },
            )
        }

/** De zes dagen die onder de takenlijst staan. */
internal fun upcomingDays(days: List<WorkoutDay>, from: LocalDate): List<UpcomingDay> =
    (1..6).map { offset ->
        val date = from.plusDays(offset.toLong())
        when (val plan = Program.planFor(days, date.dayOfWeek)) {
            is DayPlan.Training -> UpcomingDay(
                date = date,
                dayLabel = dayLabel(date),
                title = plan.day.title,
                focus = plan.day.focus,
                isRest = false,
            )

            is DayPlan.Rest -> UpcomingDay(
                date = date,
                dayLabel = dayLabel(date),
                title = plan.label,
                focus = plan.note,
                isRest = true,
            )
        }
    }

internal fun upcomingDays(route: Route, from: LocalDate): List<UpcomingDay> =
    upcomingDays(Program.days(route), from)

fun dayLabel(date: LocalDate): String = when (date.dayOfWeek) {
    DayOfWeek.MONDAY -> "Maandag"
    DayOfWeek.TUESDAY -> "Dinsdag"
    DayOfWeek.WEDNESDAY -> "Woensdag"
    DayOfWeek.THURSDAY -> "Donderdag"
    DayOfWeek.FRIDAY -> "Vrijdag"
    DayOfWeek.SATURDAY -> "Zaterdag"
    DayOfWeek.SUNDAY -> "Zondag"
}

fun shortDate(date: LocalDate): String {
    val months = listOf(
        "jan", "feb", "mrt", "apr", "mei", "jun",
        "jul", "aug", "sep", "okt", "nov", "dec",
    )
    return "${date.dayOfMonth} ${months[date.monthValue - 1]}"
}
