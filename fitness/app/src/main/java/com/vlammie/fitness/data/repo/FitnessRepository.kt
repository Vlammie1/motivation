package com.vlammie.fitness.data.repo

import com.vlammie.fitness.data.db.ExerciseCheckEntity
import com.vlammie.fitness.data.db.FitnessDatabase
import com.vlammie.fitness.data.db.FoodLogEntity
import com.vlammie.fitness.data.db.MealEntity
import com.vlammie.fitness.data.db.MealItemEntity
import com.vlammie.fitness.data.db.ProductEntity
import com.vlammie.fitness.data.db.SessionEntity
import com.vlammie.fitness.data.db.SetLogEntity
import com.vlammie.fitness.data.db.WaterEntity
import com.vlammie.fitness.data.db.WeighInEntity
import com.vlammie.fitness.data.db.WorkoutDayEntity
import com.vlammie.fitness.data.db.toDay
import com.vlammie.fitness.data.db.toEntity
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.FoodEntry
import com.vlammie.fitness.data.model.GoalSource
import com.vlammie.fitness.data.model.Meal
import com.vlammie.fitness.data.model.MealItem
import com.vlammie.fitness.data.model.Moment
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.data.model.Product
import com.vlammie.fitness.data.model.ProductDraft
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Route
import com.vlammie.fitness.data.model.Serving
import com.vlammie.fitness.data.model.SetGoal
import com.vlammie.fitness.data.model.WorkoutDay
import com.vlammie.fitness.data.net.OpenFoodFacts
import com.vlammie.fitness.data.prefs.SettingsStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.time.LocalDate
import java.util.Locale

class FitnessRepository(
    private val db: FitnessDatabase,
    val settings: SettingsStore,
) {

    private val sessions = db.sessionDao()
    private val setLogs = db.setLogDao()
    private val checklist = db.checklistDao()
    private val nutrition = db.nutritionDao()
    private val workouts = db.workoutDao()

    // ---- sessies -------------------------------------------------------

    suspend fun startSession(date: LocalDate, routeKey: String, dayId: String, dayTitle: String): Long =
        sessions.insert(
            SessionEntity(
                date = date.toEpochDay(),
                routeKey = routeKey,
                dayId = dayId,
                dayTitle = dayTitle,
                startedAt = System.currentTimeMillis(),
            )
        )

    suspend fun finishSession(id: Long, durationSec: Int) =
        sessions.finish(id, System.currentTimeMillis(), durationSec)

    /** Een sessie die zonder ook maar één gelogde set wordt afgebroken laten we niet staan. */
    suspend fun abandonSession(id: Long) = sessions.delete(id)

    /** Een sessie helemaal wissen, inclusief de sets die eronder hangen. */
    suspend fun deleteSession(id: Long) {
        setLogs.deleteForSession(id)
        sessions.delete(id)
    }

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
        weightKg: Double? = null,
    ) = setLogs.insert(
        SetLogEntity(
            sessionId = sessionId,
            date = date.toEpochDay(),
            exerciseId = exercise.id,
            exerciseName = exercise.name,
            setIndex = setIndex,
            value = value,
            // 0 kg is geen gewicht: dan blijft het gewoon een bodyweight-set.
            weightKg = weightKg?.takeIf { exercise.weighted && it > 0.0 },
            loggedAt = System.currentTimeMillis(),
        )
    )

    fun setsForSession(sessionId: Long) = setLogs.forSession(sessionId)
    fun setsOn(date: LocalDate): Flow<List<SetLogEntity>> = setLogs.forDate(date.toEpochDay())
    fun allStats() = setLogs.allStats()

    suspend fun lastValue(exerciseId: String): Int? = setLogs.lastValue(exerciseId)

    /** Met hoeveel kg per dumbbell je deze oefening het laatst deed. */
    suspend fun lastWeight(exerciseId: String): Double? = setLogs.lastWeight(exerciseId)

    /**
     * Snelkeuzes voor "hoeveel heb je er gedaan?".
     *
     * Basis is het doel van deze set (10 → 9, 10, 11, 12). Zonder doel valt hij
     * terug op je vorige gelogde aantal, en anders op het schema.
     */
    suspend fun quickOptions(exercise: Exercise, base: Int? = null): List<Int> {
        val step = exercise.progressStep
        val around = base ?: lastValue(exercise.id) ?: exercise.target.suggested
        return (-1..2).map { around + it * step }.filter { it > 0 }.distinct()
    }

    /**
     * Het doel per set aan het begin van de sessie: wat je vorige keer bij díe set
     * deed plus één stap ([Exercise.goalAfter]). Deed je vorige keer minder sets,
     * dan gaat de laatste set die je wél deed als basis voor de sets die erbij komen.
     *
     * Zodra je in de sessie een set logt neemt die het over als basis voor de set
     * erna — dat gebeurt in de SessionViewModel.
     *
     * Zonder historie komt er niets terug en blijft het schema leidend.
     */
    suspend fun goalsFor(exercise: Exercise): Map<Int, SetGoal> {
        val previous = setLogs.lastSessionValues(exercise.id)
        if (previous.isEmpty()) return emptyMap()

        val byIndex = previous.associateBy { it.setIndex }
        var fallback = previous.first()

        return (0 until exercise.sets).associateWith { index ->
            val done = byIndex[index] ?: fallback
            fallback = done
            exercise.goalAfter(done.value, done.weightKg, GoalSource.LAST_SESSION)
        }
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

    // ---- workouts ------------------------------------------------------

    /** Alle trainingsdagen zoals ze nu zijn ingesteld, met hun oefeningen erbij. */
    val workoutDays: Flow<List<WorkoutDay>> =
        combine(workouts.days(), workouts.exercises()) { days, exercises ->
            val byDay = exercises.groupBy { it.dayId }
            days.map { day ->
                day.toDay(byDay[day.id].orEmpty().map { it.toExercise() })
            }
        }

    fun workoutDay(dayId: String): Flow<WorkoutDay?> = workoutDays.map { days ->
        days.firstOrNull { it.id == dayId }
    }

    /** Alle oefeningen die ergens in een workout staan, ontdubbeld op id. */
    val knownExercises: Flow<List<Exercise>> = workoutDays.map { days ->
        days.flatMap { it.exercises }.distinctBy { it.id }
    }

    suspend fun saveWorkout(day: WorkoutDay) {
        val existing = workouts.day(day.id)
        workouts.upsertDay(day.toEntity(existing?.sortIndex ?: workouts.nextSortIndex(day.routeKey)))
        workouts.clearExercises(day.id)
        workouts.insertExercises(day.exercises.mapIndexed { index, ex -> ex.toEntity(day.id, index) })
    }

    suspend fun deleteWorkout(dayId: String) {
        workouts.clearExercises(dayId)
        workouts.deleteDay(dayId)
    }

    /** Een lege workout, klaar om in de editor gevuld te worden. */
    suspend fun newWorkout(route: Route): WorkoutDay = WorkoutDay(
        id = "day_" + System.currentTimeMillis().toString(36),
        routeKey = route.key,
        title = "Nieuwe workout",
        focus = "",
        weekday = null,
        exercises = emptyList(),
    )

    /** Zet één workout terug naar hoe hij standaard in het plan stond. */
    suspend fun resetWorkout(dayId: String): Boolean {
        val original = Program.findDay(dayId)?.second ?: return false
        saveWorkout(original)
        return true
    }

    // ---- voeding: producten --------------------------------------------

    val products: Flow<List<Product>> = nutrition.products().map { list -> list.map { it.toProduct() } }

    /** Voegt een product toe en geeft het terug mét het id dat het gekregen heeft. */
    suspend fun addProduct(draft: ProductDraft): Product {
        val entity = ProductEntity(
            name = draft.name.trim(),
            brand = draft.brand?.trim()?.ifBlank { null },
            perPiece = draft.serving == Serving.PIECE,
            pieceLabel = draft.pieceLabel?.trim()?.ifBlank { null },
            kcal = draft.kcal,
            protein = draft.protein,
            carbs = draft.carbs,
            fat = draft.fat,
            barcode = draft.barcode?.trim()?.ifBlank { null },
            lastUsedAt = System.currentTimeMillis(),
        )
        return entity.copy(id = nutrition.insertProduct(entity)).toProduct()
    }

    suspend fun updateProduct(product: Product) = nutrition.updateProduct(
        ProductEntity(
            id = product.id,
            name = product.name.trim(),
            brand = product.brand?.trim()?.ifBlank { null },
            perPiece = product.perPiece,
            pieceLabel = product.pieceLabel?.trim()?.ifBlank { null },
            kcal = product.kcal,
            protein = product.protein,
            carbs = product.carbs,
            fat = product.fat,
            barcode = product.barcode?.trim()?.ifBlank { null },
            lastUsedAt = System.currentTimeMillis(),
        )
    )

    suspend fun deleteProduct(id: Long) = nutrition.deleteProduct(id)

    /** Het product dat bij een gescande streepjescode hoort, als je het al kent. */
    suspend fun productByBarcode(barcode: String): Product? =
        nutrition.productByBarcode(barcode)?.toProduct()

    /**
     * Een gescande code opzoeken: eerst in je eigen lijst, anders in Open Food
     * Facts. Wat daar gevonden wordt, komt meteen in je lijst te staan.
     */
    suspend fun lookupBarcode(barcode: String): Product? =
        productByBarcode(barcode) ?: OpenFoodFacts.lookup(barcode)?.let { addProduct(it) }

    // ---- voeding: vaste maaltijden --------------------------------------

    /**
     * Je vaste maaltijden, met de producten er meteen aan gekoppeld. Een
     * product dat je intussen gewist hebt laat een lege plek achter in plaats
     * van de hele maaltijd te laten verdwijnen.
     */
    val meals: Flow<List<Meal>> =
        combine(nutrition.meals(), nutrition.mealItems(), products) { meals, items, products ->
            val productById = products.associateBy { it.id }
            val itemsByMeal = items.groupBy { it.mealId }
            meals.map { meal ->
                Meal(
                    id = meal.id,
                    name = meal.name,
                    items = itemsByMeal[meal.id].orEmpty().map { item ->
                        MealItem(item.productId, productById[item.productId], item.amount)
                    },
                )
            }
        }

    /** Een maaltijd opslaan; [id] leeg betekent een nieuwe. Geeft het id terug. */
    suspend fun saveMeal(id: Long?, name: String, items: List<MealItem>): Long {
        val now = System.currentTimeMillis()
        val mealId = if (id == null) {
            nutrition.insertMeal(MealEntity(name = name.trim(), lastUsedAt = now))
        } else {
            nutrition.updateMeal(MealEntity(id = id, name = name.trim(), lastUsedAt = now))
            id
        }
        nutrition.clearMealItems(mealId)
        nutrition.insertMealItems(
            items.mapIndexed { index, item ->
                MealItemEntity(
                    mealId = mealId,
                    productId = item.productId,
                    amount = item.amount,
                    sortIndex = index,
                )
            }
        )
        return mealId
    }

    suspend fun deleteMeal(id: Long) {
        nutrition.clearMealItems(id)
        nutrition.deleteMeal(id)
    }

    /** Alle producten van een maaltijd in één keer in het dagboek zetten. */
    suspend fun logMeal(date: LocalDate, meal: Meal, moment: Moment) {
        meal.items.forEach { item ->
            val product = item.product ?: return@forEach
            logFood(date, product, item.amount, moment)
        }
        nutrition.touchMeal(meal.id, System.currentTimeMillis())
    }

    // ---- voeding: dagboek ----------------------------------------------

    fun foodOn(date: LocalDate): Flow<List<FoodEntry>> =
        nutrition.foodOn(date.toEpochDay()).map { list -> list.map { it.toEntry() } }

    suspend fun logFood(date: LocalDate, product: Product, amount: Double, moment: Moment) {
        nutrition.addFood(
            FoodLogEntity(
                date = date.toEpochDay(),
                productId = product.id,
                name = product.fullName,
                amount = amount,
                perPiece = product.perPiece,
                pieceLabel = product.pieceLabel,
                kcal = product.kcalFor(amount),
                protein = product.proteinFor(amount),
                carbs = product.carbsFor(amount),
                fat = product.fatFor(amount),
                moment = moment.name,
                loggedAt = System.currentTimeMillis(),
            )
        )
        nutrition.touchProduct(product.id, System.currentTimeMillis())
    }

    /**
     * Een losse regel loggen zonder dat er een product achter zit — zo komen de
     * schattingen van de fotoherkenning in het dagboek.
     */
    suspend fun logLoose(
        date: LocalDate,
        moment: Moment,
        name: String,
        grams: Double,
        kcal: Int,
        protein: Int,
        carbs: Int,
        fat: Int,
    ) {
        nutrition.addFood(
            FoodLogEntity(
                date = date.toEpochDay(),
                productId = null,
                name = name.trim(),
                amount = grams,
                perPiece = false,
                pieceLabel = null,
                kcal = kcal,
                protein = protein,
                carbs = carbs,
                fat = fat,
                moment = moment.name,
                loggedAt = System.currentTimeMillis(),
            )
        )
    }

    /** De hoeveelheid van een al gelogde regel bijstellen. */
    suspend fun updateFoodAmount(entryId: Long, amount: Double) {
        val entry = nutrition.food(entryId) ?: return
        val product = entry.productId?.let { nutrition.product(it)?.toProduct() }
        nutrition.updateFood(
            entry.copy(
                amount = amount,
                kcal = product?.kcalFor(amount) ?: scale(entry.kcal, entry.amount, amount),
                protein = product?.proteinFor(amount) ?: scale(entry.protein, entry.amount, amount),
                carbs = product?.carbsFor(amount) ?: scale(entry.carbs, entry.amount, amount),
                fat = product?.fatFor(amount) ?: scale(entry.fat, entry.amount, amount),
            )
        )
    }

    /** Een regel naar een ander eetmoment verplaatsen. */
    suspend fun moveFood(entryId: Long, moment: Moment) {
        val entry = nutrition.food(entryId) ?: return
        nutrition.updateFood(entry.copy(moment = moment.name))
    }

    private fun scale(value: Int, from: Double, to: Double): Int =
        if (from <= 0.0) value else Math.round(value * (to / from)).toInt()

    suspend fun removeFood(id: Long) = nutrition.removeFood(id)

    fun waterOn(date: LocalDate): Flow<WaterEntity?> = nutrition.waterOn(date.toEpochDay())

    suspend fun setWater(date: LocalDate, ml: Int) =
        nutrition.setWater(WaterEntity(date.toEpochDay(), ml.coerceAtLeast(0)))

    // ---- wekelijkse check-in ------------------------------------------

    fun weighIns() = nutrition.weighIns()

    suspend fun setWeighIn(date: LocalDate, kg: Double) =
        nutrition.setWeighIn(WeighInEntity(date.toEpochDay(), kg))

    suspend fun deleteWeighIn(date: LocalDate) = nutrition.deleteWeighIn(date.toEpochDay())

    // ---- eerste start --------------------------------------------------

    /**
     * Bij een verse installatie (of na het wissen van alles) zetten we het
     * standaardplan en een basislijstje producten klaar.
     */
    suspend fun seedIfEmpty() {
        if (workouts.dayCount() == 0) {
            val days: List<WorkoutDayEntity> = Program.allDays.mapIndexed { index, day ->
                day.toEntity(index % 4)
            }
            workouts.upsertDays(days)
            Program.allDays.forEach { day ->
                workouts.insertExercises(day.exercises.mapIndexed { index, ex -> ex.toEntity(day.id, index) })
            }
        }
        if (nutrition.productCount() == 0) {
            nutrition.insertProducts(
                NutritionPlan.starterProducts.map { draft ->
                    ProductEntity(
                        name = draft.name,
                        brand = draft.brand,
                        perPiece = draft.serving == Serving.PIECE,
                        pieceLabel = draft.pieceLabel,
                        kcal = draft.kcal,
                        protein = draft.protein,
                        carbs = draft.carbs,
                        fat = draft.fat,
                    )
                }
            )
        }
    }
}

/** "griekse-yoghurt-x7" — een id dat leesbaar blijft en toch uniek is. */
fun slugId(name: String): String {
    val slug = name.lowercase(Locale.ROOT)
        .map { if (it.isLetterOrDigit()) it else '_' }
        .joinToString("")
        .trim('_')
        .replace(Regex("_+"), "_")
        .take(28)
    val suffix = System.currentTimeMillis().toString(36).takeLast(4)
    return if (slug.isEmpty()) "ex_$suffix" else "${slug}_$suffix"
}
