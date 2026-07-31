package com.vlammie.fitness.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/** Eén afgeronde (of gestarte) trainingssessie. `date` is een epoch-day. */
@Entity(tableName = "sessions", indices = [Index("date")])
data class SessionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: Long,
    val routeKey: String,
    val dayId: String,
    val dayTitle: String,
    val startedAt: Long,
    val completedAt: Long? = null,
    val durationSec: Int = 0,
)

/** Eén gelogde set. `value` is herhalingen of seconden, afhankelijk van de oefening. */
@Entity(
    tableName = "set_logs",
    indices = [Index("exerciseId"), Index("sessionId"), Index("date")],
)
data class SetLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: Long,
    val date: Long,
    val exerciseId: String,
    val exerciseName: String,
    val setIndex: Int,
    val value: Int,
    val loggedAt: Long,
)

/** Afvinkjes op de homepage; los van sessies zodat je ook zonder timer kunt afvinken. */
@Entity(tableName = "exercise_checks", primaryKeys = ["date", "exerciseId"])
data class ExerciseCheckEntity(
    val date: Long,
    val exerciseId: String,
)

@Entity(tableName = "meal_logs", primaryKeys = ["date", "mealId"])
data class MealLogEntity(
    val date: Long,
    val mealId: String,
    val kcal: Int,
    val protein: Int,
)

@Entity(tableName = "extra_food", indices = [Index("date")])
data class ExtraFoodEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: Long,
    val name: String,
    val kcal: Int,
    val protein: Int,
)

@Entity(tableName = "water_logs")
data class WaterEntity(
    @PrimaryKey val date: Long,
    val ml: Int,
)

@Entity(tableName = "weigh_ins")
data class WeighInEntity(
    @PrimaryKey val date: Long,
    val kg: Double,
)

/** Per oefening één punt in de grafiek: de samenvatting van één sessie. */
data class ExerciseSessionStat(
    val exerciseId: String,
    val sessionId: Long,
    val date: Long,
    val best: Int,
    val total: Int,
    val setCount: Int,
)
