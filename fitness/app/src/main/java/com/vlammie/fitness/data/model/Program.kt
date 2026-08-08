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

    /** Alleen het getal, voor het grote cijfer op het sessiescherm. */
    fun shortLabel(): String = when {
        amrap -> "MAX"
        min == max -> "$min"
        else -> "$min-$max"
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

/** Met hoeveel kg per dumbbell je omhoog gaat zodra de reps op zijn. */
const val WEIGHT_STEP_KG = 2.5

/** "12,5" of "10" — nooit een kale 12.5 met een punt in een Nederlandse zin. */
fun formatKg(kg: Double): String {
    val rounded = Math.round(kg * 10) / 10.0
    if (rounded % 1.0 == 0.0) return rounded.toInt().toString()
    return "%.1f".format(java.util.Locale.US, rounded).replace('.', ',')
}

/** Waar het doel van een set vandaan komt: de vorige training, of de set die je net deed. */
enum class GoalSource {
    LAST_SESSION,
    LAST_SET;

    /** Het zinnetje onder het grote getal: "vorige keer 12" of "vorige set 12". */
    val label: String get() = if (this == LAST_SESSION) "vorige keer" else "vorige set"
}

/**
 * Het doel van één set: [previous] is wat je deed waar dit doel op gebaseerd is,
 * [target] is dat plus één stap. Zo staat er nooit een dood getal uit het schema,
 * maar altijd net iets meer dan wat je al kon.
 *
 * De basis is de vorige training, en zodra je binnen deze sessie een set gelogd
 * hebt de set die je net deed ([source]): deed je er 15, dan staat er bij de
 * volgende set 16.
 *
 * Bij oefeningen met dumbbells hoort daar een gewicht bij. Zodra je boven aan
 * het repbereik zit gaat het gewicht een stap omhoog en beginnen de reps weer
 * onderaan — dat is [targetWeight] hoger dan [previousWeight].
 */
data class SetGoal(
    val previous: Int,
    val target: Int,
    val previousWeight: Double? = null,
    val targetWeight: Double? = null,
    val source: GoalSource = GoalSource.LAST_SESSION,
) {
    /** Zwaarder tillen bij hetzelfde (of lager) aantal reps: ook dat is vooruitgang. */
    val steppedUp: Boolean
        get() = targetWeight != null && previousWeight != null && targetWeight > previousWeight
}

/**
 * Welke kant je doet bij een oefening die links en rechts apart gaat. Eén set is
 * beide kanten achter elkaar, zonder pauze ertussen: eerst rechts, dan links.
 */
enum class Side(val label: String) {
    RIGHT("Rechts"),
    LEFT("Links");

    val other: Side get() = if (this == RIGHT) LEFT else RIGHT

    companion object {
        /** De kant waar elke set mee begint. */
        val first: Side get() = RIGHT
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
    /** Doe je hem met dumbbells? Dan log je er kg per dumbbell bij. */
    val weighted: Boolean = false,
) {
    val setsLabel: String get() = "$sets sets × ${target.label()}"

    /** Elke set gaat in twee helften: eerst links, dan rechts. */
    val perSide: Boolean get() = target.perSide

    /** Reps gaan met 1 omhoog, seconden met 5 — anders schiet een hold te hard door. */
    val progressStep: Int get() = if (target.unit == Unit.SECONDS) 5 else 1

    /** Boven dit aantal reps is zwaarder tillen zinniger dan nóg een rep erbij. */
    private val repCeiling: Int? get() = target.max.takeIf { weighted && !target.amrap }

    /**
     * Het doel voor de vólgende set, gegeven dat je er net [done] deed met
     * [doneWeight] kg per dumbbell: dat plus één stap.
     *
     * Bij dumbbells loopt de progressie in twee trappen: eerst reps erbij binnen
     * het bereik uit het schema, en zodra je bovenaan zit gaan de kilo's omhoog
     * en beginnen de reps weer onderaan. Zo blijf je vooruitgaan zonder dat het
     * doel doorschiet naar dertig herhalingen met een lichte dumbbell.
     */
    fun goalAfter(done: Int, doneWeight: Double?, source: GoalSource): SetGoal {
        val weight = doneWeight?.takeIf { weighted }
        val ceiling = repCeiling
        if (weight != null && ceiling != null && done >= ceiling) {
            return SetGoal(
                previous = done,
                target = target.min.coerceAtLeast(1),
                previousWeight = weight,
                targetWeight = weight + WEIGHT_STEP_KG,
                source = source,
            )
        }
        return SetGoal(
            previous = done,
            target = (done + progressStep).coerceAtLeast(1),
            previousWeight = weight,
            targetWeight = weight,
            source = source,
        )
    }
}

/**
 * Eén trainingsdag. [weekday] is de ISO-dag (1 = maandag) waarop hij in het
 * weekschema staat, of `null` als je hem alleen los wilt kunnen starten.
 */
data class WorkoutDay(
    val id: String,
    val routeKey: String,
    val title: String,
    val focus: String,
    val weekday: Int?,
    val exercises: List<Exercise>,
) {
    /** Ruwe schatting van de duur: werk + rust, gebruikt op de homepage. */
    val estimatedMinutes: Int
        get() {
            val seconds = exercises.sumOf { ex ->
                // Ruwweg 4 seconden per herhaling, plus wat tijd om klaar te gaan staan.
                val work = if (ex.target.unit == Unit.SECONDS) ex.target.max else ex.target.max * 4
                ex.sets * (work + ex.restSeconds + 10)
            }
            return (seconds / 60.0).toInt().coerceAtLeast(1)
        }

    val totalSets: Int get() = exercises.sumOf { it.sets }

    val route: Route get() = Route.of(routeKey)

    val weekdayLabel: String get() = weekday?.let { weekdayName(it) } ?: "Los te starten"
}

enum class Route(val key: String, val title: String, val subtitle: String) {
    A("A", "Met dumbbells", "Dumbbells + optrekstang · 7-10 maanden"),
    B("B", "Lichaamsgewicht", "Puur bodyweight + optrekstang · 9-12 maanden");

    companion object {
        fun of(key: String): Route = entries.firstOrNull { it.key == key } ?: A
    }
}

/** Wat er op een kalenderdag te doen staat. */
sealed interface DayPlan {
    data class Training(val day: WorkoutDay) : DayPlan
    data class Rest(val label: String, val note: String) : DayPlan
}

fun weekdayName(iso: Int): String = when (iso) {
    1 -> "Maandag"
    2 -> "Dinsdag"
    3 -> "Woensdag"
    4 -> "Donderdag"
    5 -> "Vrijdag"
    6 -> "Zaterdag"
    else -> "Zondag"
}

object Program {

    /** De standaardworkouts; bij een verse installatie gaan deze de database in. */
    fun days(route: Route): List<WorkoutDay> = when (route) {
        Route.A -> routeA
        Route.B -> routeB
    }

    val allDays: List<WorkoutDay> get() = routeA + routeB

    fun day(route: Route, dayId: String): WorkoutDay? = days(route).firstOrNull { it.id == dayId }

    /** De dag-id bevat de route ("a1", "b3"), dus je kunt hem zonder context opzoeken. */
    fun findDay(dayId: String): Pair<Route, WorkoutDay>? = Route.entries.firstNotNullOfOrNull { route ->
        day(route, dayId)?.let { route to it }
    }

    /** Wat er op deze weekdag te doen staat, gegeven de workouts van één route. */
    fun planFor(days: List<WorkoutDay>, dayOfWeek: DayOfWeek): DayPlan =
        days.firstOrNull { it.weekday == dayOfWeek.value }
            ?.let { DayPlan.Training(it) }
            ?: restDay(dayOfWeek)

    /** Zelfde vraag, maar op basis van het standaardschema. */
    fun planFor(route: Route, dayOfWeek: DayOfWeek): DayPlan = planFor(days(route), dayOfWeek)

    fun restDay(dayOfWeek: DayOfWeek): DayPlan.Rest = when (dayOfWeek) {
        DayOfWeek.SATURDAY -> DayPlan.Rest("Rustdag", "Actief herstel · licht wandelen")
        DayOfWeek.SUNDAY -> DayPlan.Rest("Check-in", "Wegen + voortgang noteren")
        else -> DayPlan.Rest("Rustdag", "Herstel + goed blijven eten")
    }

    /** Alle standaardoefeningen, ontdubbeld op id. */
    val allExercises: List<Exercise> by lazy {
        allDays.flatMap { it.exercises }.distinctBy { it.id }
    }

    fun exercise(id: String): Exercise? = allExercises.firstOrNull { it.id == id }

    // ---------------------------------------------------------------------
    // ROUTE A — met dumbbells + optrekstang
    // ---------------------------------------------------------------------

    private val routeA = listOf(
        WorkoutDay(
            id = "a1",
            routeKey = "A",
            title = "Bovenlichaam A",
            focus = "Borst · schouders · triceps",
            weekday = 1,
            exercises = listOf(
                Exercise("pushups", "Push-ups", "Of knee push-ups", 4, Target.max(), 180),
                Exercise("db_shoulder_press", "Dumbbell Shoulder Press", null, 3, Target.reps(10, 12), 120, weighted = true),
                Exercise("db_floor_press", "Dumbbell Floor Press", "Liggend op de grond", 3, Target.reps(10, 12), 120, weighted = true),
                Exercise("tricep_overhead_ext", "Tricep Overhead Extension", "Met 1 dumbbell", 3, Target.reps(12, 15), 120, weighted = true),
                Exercise("db_lateral_raises", "Dumbbell Lateral Raises", null, 3, Target.reps(12, 15), 120, weighted = true),
            ),
        ),
        WorkoutDay(
            id = "a2",
            routeKey = "A",
            title = "Onderlichaam & Buik A",
            focus = "Benen · billen · core",
            weekday = 2,
            exercises = listOf(
                Exercise("db_goblet_squat", "Dumbbell Goblet Squats", "Dumbbell tegen borst", 4, Target.reps(12, 15), 120, weighted = true),
                Exercise("db_walking_lunges", "Dumbbell Walking Lunges", null, 3, Target.perSide(10), 120, weighted = true),
                Exercise("glute_bridge_single", "Single-leg Glute Bridges", null, 3, Target.perSide(15), 90),
                Exercise("hanging_knee_raises", "Hanging Knee Raises", "Aan de optrekstang", 3, Target.reps(10, 12), 120),
                Exercise("plank", "Plank", null, 3, Target.seconds(45, 60), 90),
            ),
        ),
        WorkoutDay(
            id = "a3",
            routeKey = "A",
            title = "Bovenlichaam B",
            focus = "Rug · biceps · achterkant schouders",
            weekday = 4,
            exercises = listOf(
                Exercise("pullups", "Pull-ups", "Of negative pull-ups", 4, Target.max(), 180),
                Exercise("db_row_single", "Single-Arm Dumbbell Row", "Zagen", 4, Target.perSide(10, 12), 120, weighted = true),
                Exercise("db_bicep_curls", "Dumbbell Bicep Curls", null, 3, Target.reps(10, 12), 120, weighted = true),
                Exercise("db_hammer_curls", "Dumbbell Hammer Curls", null, 3, Target.reps(10, 12), 120, weighted = true),
                Exercise("rear_delt_flyes", "Rear Delt Flyes", null, 3, Target.reps(12, 15), 120, weighted = true),
            ),
        ),
        WorkoutDay(
            id = "a4",
            routeKey = "A",
            title = "Onderlichaam & Buik B",
            focus = "Hamstrings · kuiten · core",
            weekday = 5,
            exercises = listOf(
                Exercise("db_rdl", "Dumbbell Romanian Deadlifts", null, 4, Target.reps(10, 12), 120, weighted = true),
                Exercise("bulgarian_split_squat", "Bulgarian Split Squats", "Achterste voet op stoel", 3, Target.perSide(10), 120),
                Exercise("db_calf_raises", "Dumbbell Calf Raises", null, 4, Target.reps(15, 20), 90, weighted = true),
                Exercise("lying_leg_raises", "Lying Leg Raises", null, 3, Target.reps(12, 15), 90),
                Exercise("crunches", "Crunches", null, 3, Target.reps(20), 90),
            ),
        ),
    )

    // ---------------------------------------------------------------------
    // ROUTE B — puur lichaamsgewicht + optrekstang
    // ---------------------------------------------------------------------

    private val routeB = listOf(
        WorkoutDay(
            id = "b1",
            routeKey = "B",
            title = "Bovenlichaam A",
            focus = "Borst · schouders · triceps",
            weekday = 1,
            exercises = listOf(
                Exercise("pushups", "Push-ups", "Of knee push-ups", 4, Target.max(), 180),
                Exercise("decline_pushups", "Decline Push-ups", "Voeten op stoel/bed", 3, Target.max(), 180),
                Exercise("pike_pushups", "Pike Push-ups", "Schouderfocus", 3, Target.reps(8, 12), 180),
                Exercise("tricep_chair_dips", "Tricep Chair Dips", null, 3, Target.reps(12, 15), 120),
                Exercise("doorway_flyes", "Doorway Chest Flyes", "Isometrische hold", 3, Target.seconds(30), 90),
            ),
        ),
        WorkoutDay(
            id = "b2",
            routeKey = "B",
            title = "Onderlichaam & Buik A",
            focus = "Benen · billen · core",
            weekday = 2,
            exercises = listOf(
                Exercise("air_squats", "Air Squats", "Langzaam zakken: 3 sec", 4, Target.reps(20, 25), 120),
                Exercise("walking_lunges", "Walking Lunges", null, 3, Target.perSide(15), 120),
                Exercise("glute_bridge_single", "Single-leg Glute Bridges", null, 3, Target.perSide(15), 90),
                Exercise("hanging_knee_raises", "Hanging Knee Raises", "Aan de optrekstang", 3, Target.reps(10, 12), 120),
                Exercise("plank", "Plank", null, 3, Target.seconds(45, 60), 90),
            ),
        ),
        WorkoutDay(
            id = "b3",
            routeKey = "B",
            title = "Bovenlichaam B",
            focus = "Rug · biceps · achterkant schouders",
            weekday = 4,
            exercises = listOf(
                Exercise("pullups", "Pull-ups", "Of negative pull-ups", 4, Target.max(), 180),
                Exercise("inverted_rows", "Inverted Rows", "Onder een stevige tafel", 4, Target.reps(8, 12), 180),
                Exercise("chinups", "Chin-ups", "Handpalmen naar je toe", 3, Target.max(), 180),
                Exercise("back_extensions", "Back Extensions / Superman", null, 3, Target.reps(15, 20), 90),
                Exercise("backpack_curls", "Rugzak / Doorway Bicep Curls", null, 3, Target.reps(12, 15), 120),
            ),
        ),
        WorkoutDay(
            id = "b4",
            routeKey = "B",
            title = "Onderlichaam & Buik B",
            focus = "Hamstrings · kuiten · core",
            weekday = 5,
            exercises = listOf(
                Exercise("bulgarian_split_squat", "Bulgarian Split Squats", "Achterste voet op stoel", 4, Target.perSide(12), 120),
                Exercise("jump_squats", "Jump Squats", "Explosief springen", 3, Target.reps(12, 15), 120),
                Exercise("calf_raises_stairs", "Calf Raises op de trap", "Op 1 been", 4, Target.perSide(15, 20), 90),
                Exercise("lying_leg_raises", "Lying Leg Raises", null, 3, Target.reps(12, 15), 90),
                Exercise("mountain_climbers", "Mountain Climbers", "Snel tempo", 3, Target.seconds(30), 90),
            ),
        ),
    )
}
