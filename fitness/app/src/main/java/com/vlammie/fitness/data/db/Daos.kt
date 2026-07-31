package com.vlammie.fitness.data.db

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {

    @Insert
    suspend fun insert(session: SessionEntity): Long

    @Query("UPDATE sessions SET completedAt = :completedAt, durationSec = :durationSec WHERE id = :id")
    suspend fun finish(id: Long, completedAt: Long, durationSec: Int)

    @Query("DELETE FROM sessions WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("SELECT * FROM sessions WHERE completedAt IS NOT NULL ORDER BY date DESC, id DESC")
    fun completedSessions(): Flow<List<SessionEntity>>

    @Query("SELECT * FROM sessions WHERE date = :date AND completedAt IS NOT NULL ORDER BY id DESC")
    fun sessionsOn(date: Long): Flow<List<SessionEntity>>

    @Query("SELECT COUNT(*) FROM sessions WHERE completedAt IS NOT NULL AND date >= :from")
    fun countSince(from: Long): Flow<Int>

    @Query("SELECT COALESCE(SUM(durationSec), 0) FROM sessions WHERE completedAt IS NOT NULL AND date >= :from")
    fun secondsSince(from: Long): Flow<Int>
}

@Dao
interface SetLogDao {

    @Insert
    suspend fun insert(log: SetLogEntity): Long

    @Delete
    suspend fun delete(log: SetLogEntity)

    @Query("SELECT * FROM set_logs WHERE sessionId = :sessionId ORDER BY id")
    fun forSession(sessionId: Long): Flow<List<SetLogEntity>>

    @Query("SELECT * FROM set_logs WHERE date = :date ORDER BY id")
    fun forDate(date: Long): Flow<List<SetLogEntity>>

    @Query("SELECT value FROM set_logs WHERE exerciseId = :exerciseId ORDER BY loggedAt DESC LIMIT 1")
    suspend fun lastValue(exerciseId: String): Int?

    /**
     * Alle oefeningen samengevat per sessie. Dit is de bron voor elke grafiek op
     * de Voortgang-pagina; het aantal rijen blijft klein genoeg om in het
     * geheugen te verwerken.
     */
    @Query(
        """
        SELECT exerciseId,
               sessionId,
               MIN(date)   AS date,
               MAX(value)  AS best,
               SUM(value)  AS total,
               COUNT(*)    AS setCount
        FROM set_logs
        GROUP BY exerciseId, sessionId
        ORDER BY date ASC, sessionId ASC
        """
    )
    fun allStats(): Flow<List<ExerciseSessionStat>>
}

@Dao
interface ChecklistDao {

    @Query("SELECT exerciseId FROM exercise_checks WHERE date = :date")
    fun checksOn(date: Long): Flow<List<String>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun check(entity: ExerciseCheckEntity)

    @Query("DELETE FROM exercise_checks WHERE date = :date AND exerciseId = :exerciseId")
    suspend fun uncheck(date: Long, exerciseId: String)
}

@Dao
interface NutritionDao {

    @Query("SELECT * FROM meal_logs WHERE date = :date")
    fun mealsOn(date: Long): Flow<List<MealLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun logMeal(entity: MealLogEntity)

    @Query("DELETE FROM meal_logs WHERE date = :date AND mealId = :mealId")
    suspend fun removeMeal(date: Long, mealId: String)

    @Query("SELECT * FROM extra_food WHERE date = :date ORDER BY id")
    fun extrasOn(date: Long): Flow<List<ExtraFoodEntity>>

    @Insert
    suspend fun addExtra(entity: ExtraFoodEntity): Long

    @Query("DELETE FROM extra_food WHERE id = :id")
    suspend fun removeExtra(id: Long)

    @Query("SELECT * FROM water_logs WHERE date = :date")
    fun waterOn(date: Long): Flow<WaterEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setWater(entity: WaterEntity)

    @Query("SELECT * FROM weigh_ins ORDER BY date ASC")
    fun weighIns(): Flow<List<WeighInEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setWeighIn(entity: WeighInEntity)
}
