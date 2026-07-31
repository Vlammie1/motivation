package com.vlammie.fitness.data.repo

import com.vlammie.fitness.data.db.ExerciseCheckEntity
import com.vlammie.fitness.data.db.ExtraFoodEntity
import com.vlammie.fitness.data.db.FitnessDatabase
import com.vlammie.fitness.data.db.MealLogEntity
import com.vlammie.fitness.data.db.SessionEntity
import com.vlammie.fitness.data.db.SetLogEntity
import com.vlammie.fitness.data.db.WaterEntity
import com.vlammie.fitness.data.db.WeighInEntity
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.Route
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.prefs.SettingsStore
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

class FitnessRepository(
    private val db: FitnessDatabase,
    val settings: SettingsStore,
) {

    private val sessions = db.sessionDao()
    private val setLogs = db.setLogDao()
    private val checklist = db.checklistDao()
    private val nutrition = db.nutritionDao()

    // ---- sessies -------------------------------------------------------

    suspend fun startSession(date: LocalDate, route: Route, dayId: String, dayTitle: String): Long =
        sessions.insert(
            SessionEntity(
                date = date.toEpochDay(),
                routeKey = route.key,
                dayId = dayId,
                dayTitle = dayTitle,
                startedAt = System.currentTimeMillis(),
            )
        )

    suspend fun finishSession(id: Long, durationSec: Int) =
        sessions.finish(id, System.currentTimeMillis(), durationSec)

    /** Een sessie die zonder ook maar één gelogde set wordt afgebroken laten we niet staan. */
    suspend fun abandonSession(id: Long) = sessions.delete(id)

    fun completedSessions() = sessions.completedSessions()
    fun sessionsOn(date: LocalDate) = sessions.sessionsOn(date.toEpochDay())
    fun sessionCountSince(from: LocalDate) = sessions.countSince(from.toEpochDay())
    fun sessionSecondsSince(from: LocalDate) = sessions.secondsSince(from.toEpochDay())

    // ---- sets ----------------------------------------------------------

    suspend fun logSet(
        sessionId: Long,
        date: LocalDate,
        exercise: Exercise,
        setIndex: Int,
        value: Int,
    ) = setLogs.insert(
        SetLogEntity(
            sessionId = sessionId,
            date = date.toEpochDay(),
            exerciseId = exercise.id,
            exerciseName = exercise.name,
            setIndex = setIndex,
            value = value,
            loggedAt = System.currentTimeMillis(),
        )
    )

    fun setsForSession(sessionId: Long) = setLogs.forSession(sessionId)
    fun setsOn(date: LocalDate) = setLogs.forDate(date.toEpochDay())
    fun allStats() = setLogs.allStats()

    suspend fun lastValue(exerciseId: String): Int? = setLogs.lastValue(exerciseId)

    /**
     * Snelkeuzes voor "hoeveel heb je er gedaan?".
     *
     * Basis is je vorige gelogde aantal (10 → 9, 10, 11, 12). Is er nog geen
     * historie, dan pakken we het bovenste getal uit het schema.
     */
    suspend fun quickOptions(exercise: Exercise): List<Int> {
        val previous = lastValue(exercise.id)
        val step = if (exercise.target.unit == MeasureUnit.SECONDS) 5 else 1
        val base = previous ?: exercise.target.suggested
        return (-1..2).map { base + it * step }.filter { it > 0 }.distinct()
    }

    // ---- afvinklijst ---------------------------------------------------

    fun checksOn(date: LocalDate) = checklist.checksOn(date.toEpochDay())

    suspend fun setChecked(date: LocalDate, exerciseId: String, checked: Boolean) {
        if (checked) {
            checklist.check(ExerciseCheckEntity(date.toEpochDay(), exerciseId))
        } else {
            checklist.uncheck(date.toEpochDay(), exerciseId)
        }
    }

    // ---- voeding -------------------------------------------------------

    fun mealsOn(date: LocalDate) = nutrition.mealsOn(date.toEpochDay())

    suspend fun setMealDone(date: LocalDate, mealId: String, kcal: Int, protein: Int, done: Boolean) {
        if (done) {
            nutrition.logMeal(MealLogEntity(date.toEpochDay(), mealId, kcal, protein))
        } else {
            nutrition.removeMeal(date.toEpochDay(), mealId)
        }
    }

    fun extrasOn(date: LocalDate) = nutrition.extrasOn(date.toEpochDay())

    suspend fun addExtra(date: LocalDate, name: String, kcal: Int, protein: Int) =
        nutrition.addExtra(ExtraFoodEntity(date = date.toEpochDay(), name = name, kcal = kcal, protein = protein))

    suspend fun removeExtra(id: Long) = nutrition.removeExtra(id)

    fun waterOn(date: LocalDate): Flow<WaterEntity?> = nutrition.waterOn(date.toEpochDay())

    suspend fun setWater(date: LocalDate, ml: Int) =
        nutrition.setWater(WaterEntity(date.toEpochDay(), ml.coerceAtLeast(0)))

    // ---- wekelijkse check-in ------------------------------------------

    fun weighIns() = nutrition.weighIns()

    suspend fun setWeighIn(date: LocalDate, kg: Double) =
        nutrition.setWeighIn(WeighInEntity(date.toEpochDay(), kg))
}
