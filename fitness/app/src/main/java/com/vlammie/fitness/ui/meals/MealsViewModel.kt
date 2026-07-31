package com.vlammie.fitness.ui.meals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.db.ExtraFoodEntity
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.data.repo.FitnessRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

data class MealsUiState(
    val date: LocalDate = LocalDate.now(),
    val doneMeals: Set<String> = emptySet(),
    val extras: List<ExtraFoodEntity> = emptyList(),
    val waterMl: Int = 0,
) {
    val kcal: Int
        get() = NutritionPlan.meals.filter { it.id in doneMeals }.sumOf { it.kcal } + extras.sumOf { it.kcal }

    val protein: Int
        get() = NutritionPlan.meals.filter { it.id in doneMeals }.sumOf { it.protein } + extras.sumOf { it.protein }

    val isToday: Boolean get() = date == LocalDate.now()
}

@OptIn(ExperimentalCoroutinesApi::class)
class MealsViewModel(private val repo: FitnessRepository) : ViewModel() {

    private val dateFlow = MutableStateFlow(LocalDate.now())

    val state = dateFlow.flatMapLatest { date ->
        combine(repo.mealsOn(date), repo.extrasOn(date), repo.waterOn(date)) { meals, extras, water ->
            MealsUiState(
                date = date,
                doneMeals = meals.map { it.mealId }.toSet(),
                extras = extras,
                waterMl = water?.ml ?: 0,
            )
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MealsUiState())

    fun shiftDate(days: Long) {
        val next = dateFlow.value.plusDays(days)
        if (!next.isAfter(LocalDate.now())) dateFlow.value = next
    }

    fun toggleMeal(mealId: String, done: Boolean) {
        val meal = NutritionPlan.meal(mealId) ?: return
        viewModelScope.launch {
            repo.setMealDone(dateFlow.value, mealId, meal.kcal, meal.protein, done)
        }
    }

    fun addWater(ml: Int) {
        viewModelScope.launch {
            val current = state.value.waterMl
            repo.setWater(dateFlow.value, current + ml)
        }
    }

    fun addExtra(name: String, kcal: Int, protein: Int) {
        viewModelScope.launch {
            repo.addExtra(dateFlow.value, name.ifBlank { "Extra" }, kcal, protein)
        }
    }

    fun removeExtra(id: Long) {
        viewModelScope.launch { repo.removeExtra(id) }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                MealsViewModel(app.repository)
            }
        }
    }
}
