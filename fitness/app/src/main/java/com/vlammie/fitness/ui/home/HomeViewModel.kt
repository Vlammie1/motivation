package com.vlammie.fitness.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.model.DayPlan
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Route
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
)

data class HomeUiState(
    val date: LocalDate = LocalDate.now(),
    val route: Route = Route.A,
    val plan: DayPlan = DayPlan.Rest("Rustdag", ""),
    val checked: Set<String> = emptySet(),
    val sessionsToday: Int = 0,
    val sessionsThisWeek: Int = 0,
    val nutrition: NutritionSummary = NutritionSummary(),
    val upcoming: List<UpcomingDay> = emptyList(),
) {
    val trainingDay: com.vlammie.fitness.data.model.WorkoutDay?
        get() = (plan as? DayPlan.Training)?.day

    val checkedCount: Int get() = trainingDay?.exercises?.count { it.id in checked } ?: 0

    val progress: Float
        get() = trainingDay?.exercises?.size?.takeIf { it > 0 }?.let { checkedCount / it.toFloat() } ?: 0f
}

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModel(private val repo: FitnessRepository) : ViewModel() {

    private val dateFlow = MutableStateFlow(LocalDate.now())

    private val nutritionFlow = dateFlow.flatMapLatest { date ->
        combine(repo.mealsOn(date), repo.extrasOn(date), repo.waterOn(date)) { meals, extras, water ->
            NutritionSummary(
                kcal = meals.sumOf { it.kcal } + extras.sumOf { it.kcal },
                protein = meals.sumOf { it.protein } + extras.sumOf { it.protein },
                waterMl = water?.ml ?: 0,
            )
        }
    }

    private val dayFlow = dateFlow.flatMapLatest { date ->
        combine(
            repo.checksOn(date),
            repo.sessionsOn(date),
            repo.sessionCountSince(date.with(DayOfWeek.MONDAY)),
        ) { checks, sessions, weekCount -> Triple(checks.toSet(), sessions.size, weekCount) }
    }

    val state = combine(
        dateFlow,
        repo.settings.route,
        dayFlow,
        nutritionFlow,
    ) { date, route, day, nutrition ->
        HomeUiState(
            date = date,
            route = route,
            plan = Program.planFor(route, date.dayOfWeek),
            checked = day.first,
            sessionsToday = day.second,
            sessionsThisWeek = day.third,
            nutrition = nutrition,
            upcoming = upcomingDays(route, date),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), HomeUiState())

    /** De datum kan verschoven zijn terwijl de app op de achtergrond stond. */
    fun refreshDate() {
        val now = LocalDate.now()
        if (now != dateFlow.value) dateFlow.value = now
    }

    fun toggleCheck(exerciseId: String, checked: Boolean) {
        viewModelScope.launch { repo.setChecked(dateFlow.value, exerciseId, checked) }
    }

    private fun upcomingDays(route: Route, from: LocalDate): List<UpcomingDay> =
        (1..6).map { offset ->
            val date = from.plusDays(offset.toLong())
            when (val plan = Program.planFor(route, date.dayOfWeek)) {
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

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                HomeViewModel(app.repository)
            }
        }

        val kcalGoal = NutritionPlan.KCAL_MIN..NutritionPlan.KCAL_MAX
    }
}

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
