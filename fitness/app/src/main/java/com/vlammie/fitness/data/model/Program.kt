package com.vlammie.fitness.data.model

import java.time.DayOfWeek

/** Meeteenheid waarin een oefening gelogd wordt. */
enum class Unit { REPS, SECONDS }

/**
 * Het doel van één set.
 *
 * [amrap] betekent "maximaal": er staat geen getal in het schema, je gaat tot falen.
 * [perSide] betekent dat het getal per been/arm geldt.
 */
data class Target(
    val unit: Unit,
    val min: Int,
    val max: Int,
    val amrap: Boolean = false,
    val perSide: Boolean = false,
) {
    /** Waar de quick-options omheen gebouwd worden als er nog geen historie is. */
    val suggested: Int get() = max

    fun label(): String = when {
        amrap -> "Maximaal"
        unit == Unit.SECONDS && min == max -> "$min sec"
        unit == Unit.SECONDS -> "$min-$max sec"
        min == max -> "$min${sideSuffix()}"
        else -> "$min-$max${sideSuffix()}"
    }

    private fun sideSuffix() = if (perSide) " per kant" else ""

    companion object {
        fun reps(min: Int, max: Int = min, perSide: Boolean = false) =
            Target(Unit.REPS, min, max, perSide = perSide)

        fun perSide(min: Int, max: Int = min) = reps(min, max, perSide = true)

        fun max() = Target(Unit.REPS, 8, 12, amrap = true)

        fun seconds(min: Int, max: Int = min) = Target(Unit.SECONDS, min, max)
    }
}

/**
 * Eén oefening in een trainingsdag.
 *
 * [id] is stabiel en wordt gedeeld tussen routes zolang het dezelfde beweging met
 * dezelfde belasting is — zo loopt de grafiek in Voortgang door als je van route wisselt.
 */
data class Exercise(
    val id: String,
    val name: String,
    val hint: String? = null,
    val sets: Int,
    val target: Target,
    val restSeconds: Int,
) {
    val setsLabel: String get() = "$sets sets × ${target.label()}"
}

data class WorkoutDay(
    val id: String,
    val title: String,
    val focus: String,
    val exercises: List<Exercise>,
) {
    /** Ruwe schatting van de duur: werk + rust, gebruikt op de homepage. */
    val estimatedMinutes: Int
        get() {
            val seconds = exercises.sumOf { ex ->
                val work = if (ex.target.unit == Unit.SECONDS) ex.target.max else ex.target.max * 3
                ex.sets * (work + ex.restSeconds)
            }
            return (seconds / 60.0).toInt().coerceAtLeast(1)
        }

    val totalSets: Int get() = exercises.sumOf { it.sets }
}

enum class Route(val key: String, val title: String, val subtitle: String) {
    A("A", "Met dumbbells", "Dumbbells + optrekstang · 7-10 maanden"),
    B("B", "Lichaamsgewicht", "Puur bodyweight + optrekstang · 9-12 maanden"),
}

/** Wat er op een kalenderdag te doen staat. */
sealed interface DayPlan {
    data class Training(val day: WorkoutDay) : DayPlan
    data class Rest(val label: String, val note: String) : DayPlan
}

object Program {

    fun days(route: Route): List<WorkoutDay> = when (route) {
        Route.A -> routeA
        Route.B -> routeB
    }

    fun day(route: Route, dayId: String): WorkoutDay? = days(route).firstOrNull { it.id == dayId }

    /** De dag-id bevat de route ("a1", "b3"), dus je kunt hem zonder context opzoeken. */
    fun findDay(dayId: String): Pair<Route, WorkoutDay>? = Route.entries.firstNotNullOfOrNull { route ->
        day(route, dayId)?.let { route to it }
    }

    /** Het weekschema uit het 4-weken kickstartplan. */
    fun planFor(route: Route, dayOfWeek: DayOfWeek): DayPlan = when (dayOfWeek) {
        DayOfWeek.MONDAY -> DayPlan.Training(days(route)[0])
        DayOfWeek.TUESDAY -> DayPlan.Training(days(route)[1])
        DayOfWeek.WEDNESDAY -> DayPlan.Rest("Rustdag", "Herstel + goed blijven eten")
        DayOfWeek.THURSDAY -> DayPlan.Training(days(route)[2])
        DayOfWeek.FRIDAY -> DayPlan.Training(days(route)[3])
        DayOfWeek.SATURDAY -> DayPlan.Rest("Rustdag", "Actief herstel · licht wandelen")
        DayOfWeek.SUNDAY -> DayPlan.Rest("Check-in", "Wegen + voortgang noteren")
    }

    /** Alle oefeningen uit beide routes, ontdubbeld op id — voor de Voortgang-pagina. */
    val allExercises: List<Exercise> by lazy {
        (routeA + routeB).flatMap { it.exercises }.distinctBy { it.id }
    }

    fun exercise(id: String): Exercise? = allExercises.firstOrNull { it.id == id }

    // ---------------------------------------------------------------------
    // ROUTE A — met dumbbells + optrekstang
    // ---------------------------------------------------------------------

    private val routeA = listOf(
        WorkoutDay(
            id = "a1",
            title = "Bovenlichaam A",
            focus = "Borst · schouders · triceps",
            exercises = listOf(
                Exercise("pushups", "Push-ups", "Of knee push-ups", 4, Target.max(), 90),
                Exercise("db_shoulder_press", "Dumbbell Shoulder Press", null, 3, Target.reps(10, 12), 60),
                Exercise("db_floor_press", "Dumbbell Floor Press", "Liggend op de grond", 3, Target.reps(10, 12), 60),
                Exercise("tricep_overhead_ext", "Tricep Overhead Extension", "Met 1 dumbbell", 3, Target.reps(12, 15), 60),
                Exercise("db_lateral_raises", "Dumbbell Lateral Raises", null, 3, Target.reps(12, 15), 60),
            ),
        ),
        WorkoutDay(
            id = "a2",
            title = "Onderlichaam & Buik A",
            focus = "Benen · billen · core",
            exercises = listOf(
                Exercise("db_goblet_squat", "Dumbbell Goblet Squats", "Dumbbell tegen borst", 4, Target.reps(12, 15), 60),
                Exercise("db_walking_lunges", "Dumbbell Walking Lunges", null, 3, Target.perSide(10), 60),
                Exercise("glute_bridge_single", "Single-leg Glute Bridges", null, 3, Target.perSide(15), 45),
                Exercise("hanging_knee_raises", "Hanging Knee Raises", "Aan de optrekstang", 3, Target.reps(10, 12), 60),
                Exercise("plank", "Plank", null, 3, Target.seconds(45, 60), 45),
            ),
        ),
        WorkoutDay(
            id = "a3",
            title = "Bovenlichaam B",
            focus = "Rug · biceps · achterkant schouders",
            exercises = listOf(
                Exercise("pullups", "Pull-ups", "Of negative pull-ups", 4, Target.max(), 90),
                Exercise("db_row_single", "Single-Arm Dumbbell Row", "Zagen", 4, Target.perSide(10, 12), 60),
                Exercise("db_bicep_curls", "Dumbbell Bicep Curls", null, 3, Target.reps(10, 12), 60),
                Exercise("db_hammer_curls", "Dumbbell Hammer Curls", null, 3, Target.reps(10, 12), 60),
                Exercise("rear_delt_flyes", "Rear Delt Flyes", null, 3, Target.reps(12, 15), 60),
            ),
        ),
        WorkoutDay(
            id = "a4",
            title = "Onderlichaam & Buik B",
            focus = "Hamstrings · kuiten · core",
            exercises = listOf(
                Exercise("db_rdl", "Dumbbell Romanian Deadlifts", null, 4, Target.reps(10, 12), 60),
                Exercise("bulgarian_split_squat", "Bulgarian Split Squats", "Achterste voet op stoel", 3, Target.perSide(10), 60),
                Exercise("db_calf_raises", "Dumbbell Calf Raises", null, 4, Target.reps(15, 20), 45),
                Exercise("lying_leg_raises", "Lying Leg Raises", null, 3, Target.reps(12, 15), 45),
                Exercise("crunches", "Crunches", null, 3, Target.reps(20), 45),
            ),
        ),
    )

    // ---------------------------------------------------------------------
    // ROUTE B — puur lichaamsgewicht + optrekstang
    // ---------------------------------------------------------------------

    private val routeB = listOf(
        WorkoutDay(
            id = "b1",
            title = "Bovenlichaam A",
            focus = "Borst · schouders · triceps",
            exercises = listOf(
                Exercise("pushups", "Push-ups", "Of knee push-ups", 4, Target.max(), 90),
                Exercise("decline_pushups", "Decline Push-ups", "Voeten op stoel/bed", 3, Target.max(), 90),
                Exercise("pike_pushups", "Pike Push-ups", "Schouderfocus", 3, Target.reps(8, 12), 90),
                Exercise("tricep_chair_dips", "Tricep Chair Dips", null, 3, Target.reps(12, 15), 60),
                Exercise("doorway_flyes", "Doorway Chest Flyes", "Isometrische hold", 3, Target.seconds(30), 45),
            ),
        ),
        WorkoutDay(
            id = "b2",
            title = "Onderlichaam & Buik A",
            focus = "Benen · billen · core",
            exercises = listOf(
                Exercise("air_squats", "Air Squats", "Langzaam zakken: 3 sec", 4, Target.reps(20, 25), 60),
                Exercise("walking_lunges", "Walking Lunges", null, 3, Target.perSide(15), 60),
                Exercise("glute_bridge_single", "Single-leg Glute Bridges", null, 3, Target.perSide(15), 45),
                Exercise("hanging_knee_raises", "Hanging Knee Raises", "Aan de optrekstang", 3, Target.reps(10, 12), 60),
                Exercise("plank", "Plank", null, 3, Target.seconds(45, 60), 45),
            ),
        ),
        WorkoutDay(
            id = "b3",
            title = "Bovenlichaam B",
            focus = "Rug · biceps · achterkant schouders",
            exercises = listOf(
                Exercise("pullups", "Pull-ups", "Of negative pull-ups", 4, Target.max(), 90),
                Exercise("inverted_rows", "Inverted Rows", "Onder een stevige tafel", 4, Target.reps(8, 12), 90),
                Exercise("chinups", "Chin-ups", "Handpalmen naar je toe", 3, Target.max(), 90),
                Exercise("back_extensions", "Back Extensions / Superman", null, 3, Target.reps(15, 20), 45),
                Exercise("backpack_curls", "Rugzak / Doorway Bicep Curls", null, 3, Target.reps(12, 15), 60),
            ),
        ),
        WorkoutDay(
            id = "b4",
            title = "Onderlichaam & Buik B",
            focus = "Hamstrings · kuiten · core",
            exercises = listOf(
                Exercise("bulgarian_split_squat", "Bulgarian Split Squats", "Achterste voet op stoel", 4, Target.perSide(12), 60),
                Exercise("jump_squats", "Jump Squats", "Explosief springen", 3, Target.reps(12, 15), 60),
                Exercise("calf_raises_stairs", "Calf Raises op de trap", "Op 1 been", 4, Target.perSide(15, 20), 45),
                Exercise("lying_leg_raises", "Lying Leg Raises", null, 3, Target.reps(12, 15), 45),
                Exercise("mountain_climbers", "Mountain Climbers", "Snel tempo", 3, Target.seconds(30), 45),
            ),
        ),
    )
}
