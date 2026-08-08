package com.vlammie.fitness.data.db

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
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

    /** Het laatst gebruikte gewicht, zodat de dumbbell alvast goed staat ingesteld. */
    @Query(
        """
        SELECT weightKg FROM set_logs
        WHERE exerciseId = :exerciseId AND weightKg IS NOT NULL
        ORDER BY loggedAt DESC LIMIT 1
        """
    )
    suspend fun lastWeight(exerciseId: String): Double?

    /**
     * Wat je de vórige keer per set deed. Alleen de sessie waarin deze oefening
     * het laatst voorkwam telt mee — daar wordt het doel van vandaag op gebouwd.
     */
    @Query(
        """
        SELECT setIndex, MAX(value) AS value, MAX(weightKg) AS weightKg
        FROM set_logs
        WHERE exerciseId = :exerciseId AND sessionId = (
            SELECT sessionId FROM set_logs
            WHERE exerciseId = :exerciseId
            ORDER BY loggedAt DESC LIMIT 1
        )
        GROUP BY setIndex
        ORDER BY setIndex
        """
    )
    suspend fun lastSessionValues(exerciseId: String): List<SetValue>

    @Query("DELETE FROM set_logs WHERE sessionId = :sessionId")
    suspend fun deleteForSession(sessionId: Long)

    /**
     * Alle oefeningen samengevat per sessie. Dit is de bron voor elke grafiek op
     * de Voortgang-pagina; het aantal rijen blijft klein genoeg om in het
     * geheugen te verwerken.
     */
    @Query(
        """
        SELECT exerciseId,
               MAX(exerciseName) AS exerciseName,
               sessionId,
               MIN(date)      AS date,
               MAX(value)     AS best,
               SUM(value)     AS total,
               COUNT(*)       AS setCount,
               MAX(weightKg)  AS topWeight,
               SUM(value * COALESCE(weightKg, 0)) AS volume
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

    // ---- producten -----------------------------------------------------

    @Query("SELECT * FROM products ORDER BY lastUsedAt DESC, name COLLATE NOCASE ASC")
    fun products(): Flow<List<ProductEntity>>

    @Query("SELECT COUNT(*) FROM products")
    suspend fun productCount(): Int

    @Query("SELECT * FROM products WHERE barcode = :barcode LIMIT 1")
    suspend fun productByBarcode(barcode: String): ProductEntity?

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun product(id: Long): ProductEntity?

    @Insert
    suspend fun insertProduct(product: ProductEntity): Long

    @Insert
    suspend fun insertProducts(products: List<ProductEntity>)

    @Update
    suspend fun updateProduct(product: ProductEntity)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteProduct(id: Long)

    @Query("UPDATE products SET lastUsedAt = :at WHERE id = :id")
    suspend fun touchProduct(id: Long, at: Long)

    // ---- dagboek -------------------------------------------------------

    @Query("SELECT * FROM food_logs WHERE date = :date ORDER BY loggedAt, id")
    fun foodOn(date: Long): Flow<List<FoodLogEntity>>

    @Insert
    suspend fun addFood(entity: FoodLogEntity): Long

    @Update
    suspend fun updateFood(entity: FoodLogEntity)

    @Query("SELECT * FROM food_logs WHERE id = :id")
    suspend fun food(id: Long): FoodLogEntity?

    @Query("DELETE FROM food_logs WHERE id = :id")
    suspend fun removeFood(id: Long)

    // ---- vaste maaltijden ------------------------------------------------

    @Query("SELECT * FROM meals ORDER BY lastUsedAt DESC, name COLLATE NOCASE ASC")
    fun meals(): Flow<List<MealEntity>>

    @Query("SELECT * FROM meal_items ORDER BY sortIndex, id")
    fun mealItems(): Flow<List<MealItemEntity>>

    @Insert
    suspend fun insertMeal(meal: MealEntity): Long

    @Update
    suspend fun updateMeal(meal: MealEntity)

    @Insert
    suspend fun insertMealItems(items: List<MealItemEntity>)

    @Query("DELETE FROM meal_items WHERE mealId = :mealId")
    suspend fun clearMealItems(mealId: Long)

    @Query("DELETE FROM meals WHERE id = :id")
    suspend fun deleteMeal(id: Long)

    @Query("UPDATE meals SET lastUsedAt = :at WHERE id = :id")
    suspend fun touchMeal(id: Long, at: Long)

    // ---- water & gewicht ------------------------------------------------

    @Query("SELECT * FROM water_logs WHERE date = :date")
    fun waterOn(date: Long): Flow<WaterEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setWater(entity: WaterEntity)

    @Query("SELECT * FROM weigh_ins ORDER BY date ASC")
    fun weighIns(): Flow<List<WeighInEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun setWeighIn(entity: WeighInEntity)

    @Query("DELETE FROM weigh_ins WHERE date = :date")
    suspend fun deleteWeighIn(date: Long)
}

@Dao
interface WorkoutDao {

    @Query("SELECT * FROM workout_days ORDER BY routeKey, sortIndex")
    fun days(): Flow<List<WorkoutDayEntity>>

    @Query("SELECT * FROM workout_exercises ORDER BY sortIndex, rowId")
    fun exercises(): Flow<List<WorkoutExerciseEntity>>

    @Query("SELECT COUNT(*) FROM workout_days")
    suspend fun dayCount(): Int

    @Query("SELECT * FROM workout_days WHERE id = :id")
    suspend fun day(id: String): WorkoutDayEntity?

    @Query("SELECT * FROM workout_exercises WHERE dayId = :dayId ORDER BY sortIndex, rowId")
    suspend fun exercisesFor(dayId: String): List<WorkoutExerciseEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDay(day: WorkoutDayEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertDays(days: List<WorkoutDayEntity>)

    @Insert
    suspend fun insertExercises(exercises: List<WorkoutExerciseEntity>)

    @Query("DELETE FROM workout_exercises WHERE dayId = :dayId")
    suspend fun clearExercises(dayId: String)

    @Query("DELETE FROM workout_days WHERE id = :id")
    suspend fun deleteDay(id: String)

    @Query("SELECT COALESCE(MAX(sortIndex), -1) + 1 FROM workout_days WHERE routeKey = :routeKey")
    suspend fun nextSortIndex(routeKey: String): Int
}
