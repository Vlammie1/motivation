package com.vlammie.fitness.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.FoodEntry
import com.vlammie.fitness.data.model.Moment
import com.vlammie.fitness.data.model.Product
import com.vlammie.fitness.data.model.Serving
import com.vlammie.fitness.data.model.Target
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.model.WorkoutDay

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
    /** Kilo's per dumbbell; `null` bij alles wat je met je eigen gewicht doet. */
    val weightKg: Double? = null,
    val loggedAt: Long,
)

/** Afvinkjes op de homepage; los van sessies zodat je ook zonder timer kunt afvinken. */
@Entity(tableName = "exercise_checks", primaryKeys = ["date", "exerciseId"])
data class ExerciseCheckEntity(
    val date: Long,
    val exerciseId: String,
)

/** Een product uit je eigen lijst; de waarden gelden per 100 g of per stuk. */
@Entity(tableName = "products", indices = [Index("barcode")])
data class ProductEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val brand: String? = null,
    val perPiece: Boolean = false,
    val pieceLabel: String? = null,
    val kcal: Double,
    val protein: Double,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    /** De streepjescode, zodat een tweede scan het product meteen terugvindt. */
    val barcode: String? = null,
    /** Laatst gebruikt, zodat de vaste producten bovenaan de kieslijst staan. */
    val lastUsedAt: Long = 0,
) {
    fun toProduct() = Product(
        id = id,
        name = name,
        brand = brand,
        serving = if (perPiece) Serving.PIECE else Serving.PER_100G,
        pieceLabel = pieceLabel,
        kcal = kcal,
        protein = protein,
        carbs = carbs,
        fat = fat,
        barcode = barcode,
    )
}

/**
 * Wat je op een dag gegeten hebt. De kcal en eiwitten staan er uitgerekend bij,
 * zodat het dagboek niet verandert als je het product later corrigeert.
 */
@Entity(tableName = "food_logs", indices = [Index("date")])
data class FoodLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val date: Long,
    val productId: Long? = null,
    val name: String,
    val amount: Double,
    val perPiece: Boolean,
    val pieceLabel: String? = null,
    val kcal: Int,
    val protein: Int,
    val carbs: Int = 0,
    val fat: Int = 0,
    /** De naam van [Moment]; standaard SNACK zodat oude regels blijven kloppen. */
    val moment: String = "SNACK",
    val loggedAt: Long,
) {
    fun toEntry() = FoodEntry(
        id = id,
        productId = productId,
        name = name,
        amount = amount,
        perPiece = perPiece,
        pieceLabel = pieceLabel,
        kcal = kcal,
        protein = protein,
        carbs = carbs,
        fat = fat,
        moment = Moment.fromName(moment),
    )
}

/** Een vaste maaltijd: alleen de naam; de producten staan in [MealItemEntity]. */
@Entity(tableName = "meals")
data class MealEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    /** Laatst gelogd, zodat je vaste maaltijden bovenaan staan. */
    val lastUsedAt: Long = 0,
)

/** Eén product binnen een vaste maaltijd, met de hoeveelheid die erbij hoort. */
@Entity(tableName = "meal_items", indices = [Index("mealId")])
data class MealItemEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val mealId: Long,
    val productId: Long,
    val amount: Double,
    val sortIndex: Int = 0,
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

/** Een trainingsdag zoals jij hem hebt ingesteld. */
@Entity(tableName = "workout_days")
data class WorkoutDayEntity(
    @PrimaryKey val id: String,
    val routeKey: String,
    val title: String,
    val focus: String,
    /** ISO-weekdag (1 = maandag), of null als hij niet vast in het schema staat. */
    val weekday: Int? = null,
    val sortIndex: Int = 0,
)

@Entity(tableName = "workout_exercises", indices = [Index("dayId")])
data class WorkoutExerciseEntity(
    @PrimaryKey(autoGenerate = true) val rowId: Long = 0,
    val dayId: String,
    val exerciseId: String,
    val name: String,
    val hint: String? = null,
    val sets: Int,
    /** "REPS" of "SECONDS". */
    val unit: String,
    val min: Int,
    val max: Int,
    val amrap: Boolean,
    val perSide: Boolean,
    val restSeconds: Int,
    val sortIndex: Int,
    /** Met dumbbells: dan hoort er een gewicht bij elke gelogde set. */
    val weighted: Boolean = false,
) {
    fun toExercise() = Exercise(
        id = exerciseId,
        name = name,
        hint = hint,
        sets = sets,
        target = Target(
            unit = if (unit == "SECONDS") MeasureUnit.SECONDS else MeasureUnit.REPS,
            min = min,
            max = max,
            amrap = amrap,
            perSide = perSide,
        ),
        restSeconds = restSeconds,
        weighted = weighted,
    )
}

fun WorkoutDayEntity.toDay(exercises: List<Exercise>) = WorkoutDay(
    id = id,
    routeKey = routeKey,
    title = title,
    focus = focus,
    weekday = weekday,
    exercises = exercises,
)

fun Exercise.toEntity(dayId: String, sortIndex: Int) = WorkoutExerciseEntity(
    dayId = dayId,
    exerciseId = id,
    name = name,
    hint = hint,
    sets = sets,
    unit = target.unit.name,
    min = target.min,
    max = target.max,
    amrap = target.amrap,
    perSide = target.perSide,
    restSeconds = restSeconds,
    sortIndex = sortIndex,
    weighted = weighted,
)

fun WorkoutDay.toEntity(sortIndex: Int) = WorkoutDayEntity(
    id = id,
    routeKey = routeKey,
    title = title,
    focus = focus,
    weekday = weekday,
    sortIndex = sortIndex,
)

/** Eén set uit een eerdere sessie: waar het doel van vandaag op gebaseerd wordt. */
data class SetValue(
    val setIndex: Int,
    val value: Int,
    val weightKg: Double? = null,
)

/**
 * Per oefening één punt in de grafiek: de samenvatting van één sessie.
 *
 * [topWeight] en [volume] zijn alleen gevuld als je er gewicht bij gelogd hebt.
 * [volume] is kg per dumbbell × herhalingen, opgeteld over alle sets: daarin telt
 * zwaarder tillen én vaker tillen allebei mee.
 */
data class ExerciseSessionStat(
    val exerciseId: String,
    val exerciseName: String,
    val sessionId: Long,
    val date: Long,
    val best: Int,
    val total: Int,
    val setCount: Int,
    val topWeight: Double? = null,
    val volume: Double = 0.0,
)
