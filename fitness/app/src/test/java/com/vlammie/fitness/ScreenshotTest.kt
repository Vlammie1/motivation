package com.vlammie.fitness

import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import androidx.activity.ComponentActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.vlammie.fitness.data.model.FoodEntry
import com.vlammie.fitness.data.model.GoalSource
import com.vlammie.fitness.data.model.Moment
import com.vlammie.fitness.data.model.Product
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Route
import com.vlammie.fitness.data.model.Serving
import com.vlammie.fitness.data.model.SetGoal
import com.vlammie.fitness.data.model.Side
import com.vlammie.fitness.ui.home.HomeContent
import com.vlammie.fitness.ui.home.HomeUiState
import com.vlammie.fitness.ui.home.LoggedExercise
import com.vlammie.fitness.ui.home.NutritionSummary
import com.vlammie.fitness.ui.home.upcomingDays
import com.vlammie.fitness.ui.meals.MealsContent
import com.vlammie.fitness.ui.meals.MealsUiState
import com.vlammie.fitness.ui.nav.BottomBar
import com.vlammie.fitness.ui.nav.Routes
import com.vlammie.fitness.ui.progress.ChartPoint
import com.vlammie.fitness.ui.progress.DayDetail
import com.vlammie.fitness.ui.progress.DayDetailEntry
import com.vlammie.fitness.ui.progress.DayDetailSheet
import com.vlammie.fitness.ui.progress.ExerciseOption
import com.vlammie.fitness.ui.progress.ProgressContent
import com.vlammie.fitness.ui.progress.ProgressUiState
import com.vlammie.fitness.ui.progress.SeriesUi
import com.vlammie.fitness.ui.progress.WEIGHT_ID
import com.vlammie.fitness.ui.session.PendingQuestion
import com.vlammie.fitness.ui.session.Phase
import com.vlammie.fitness.ui.session.SessionContent
import com.vlammie.fitness.ui.session.SessionSummary
import com.vlammie.fitness.ui.session.SessionUiState
import com.vlammie.fitness.ui.settings.SettingsContent
import com.vlammie.fitness.ui.settings.SettingsUiState
import com.vlammie.fitness.ui.settings.WorkoutEditorContent
import com.vlammie.fitness.ui.theme.FitnessTheme
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.Surface1
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.io.FileOutputStream
import java.time.LocalDate

/**
 * Rendert elk scherm met vaste voorbeelddata naar een PNG in `fitness/screenshots`.
 * Draaien met: `./gradlew :app:testDebugUnitTest`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w411dp-h915dp-xxhdpi")
class ScreenshotTest {

    @get:Rule
    val compose = createAndroidComposeRule<ComponentActivity>()

    private val today: LocalDate = LocalDate.of(2026, 7, 31)

    // ---------------------------------------------------------------

    @Test
    fun home() = capture("01-vandaag") {
        WithBottomBar(Routes.HOME) {
            HomeContent(
                state = homeState(),
                onToggleCheck = { _, _ -> },
                onStartSession = {},
                onOpenMeals = {},
                onOpenProgress = {},
            )
        }
    }

    @Test
    fun sessionWork() = capture("02-sessie-oefening") {
        SessionContent(
            state = sessionState(),
            onTap = {},
            onQuit = {},
            onTogglePause = {},
            onAnswer = {},
            onCustom = {},
            onSkipExercise = {},
            onSkipRest = {},
            onExit = {},
        )
    }

    @Test
    fun sessionPerSide() = capture("10-sessie-links-rechts") {
        SessionContent(
            state = perSideState(),
            onTap = {},
            onQuit = {},
            onTogglePause = {},
            onAnswer = {},
            onCustom = {},
            onSkipExercise = {},
            onSkipRest = {},
            onExit = {},
        )
    }

    @Test
    fun sessionRest() = capture("03-sessie-pauze") {
        val day = Program.day(Route.A, "a4")!!
        SessionContent(
            state = sessionState().copy(
                phase = Phase.REST,
                setIndex = 1,
                restTotal = 120,
                restLeft = 78,
                completedSets = 2,
                totalElapsed = 154,
                question = PendingQuestion(
                    exercise = day.exercises[0],
                    setIndex = 1,
                    options = listOf(12, 13, 14, 15),
                    default = 13,
                    weightKg = 12.5,
                ),
            ),
            onTap = {},
            onQuit = {},
            onTogglePause = {},
            onAnswer = {},
            onCustom = {},
            onSkipExercise = {},
            onSkipRest = {},
            onExit = {},
        )
    }

    @Test
    fun sessionFinished() = capture("04-sessie-klaar") {
        SessionContent(
            state = sessionState().copy(
                phase = Phase.FINISHED,
                completedSets = 17,
                totalElapsed = 2_280,
                summary = SessionSummary(
                    durationSec = 2_280,
                    sets = 17,
                    totalReps = 214,
                    totalSeconds = 0,
                    volumeKg = 1_720.0,
                ),
            ),
            onTap = {},
            onQuit = {},
            onTogglePause = {},
            onAnswer = {},
            onCustom = {},
            onSkipExercise = {},
            onSkipRest = {},
            onExit = {},
        )
    }

    @Test
    fun progress() = capture("05-voortgang") {
        WithBottomBar(Routes.PROGRESS) {
            ProgressContent(
                state = progressState(),
                onRange = {},
                onMetric = {},
                onSelectExercise = {},
                onSelectPoint = {},
                onLogWeight = {},
            )
        }
    }

    @Test
    fun dayDetailSheet() = capture("06-voortgang-dagdetail") {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Ink)
                .padding(top = 160.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                    .background(Surface1)
                    .padding(top = 24.dp),
            ) {
                DayDetailSheet(sampleDayDetail())
            }
        }
    }

    @Test
    fun meals() = capture("07-voeding") {
        WithBottomBar(Routes.MEALS) {
            MealsContent(state = mealsState())
        }
    }

    @Test
    fun settings() = capture("08-instellingen") {
        WithBottomBar(Routes.SETTINGS) {
            SettingsContent(
                state = SettingsUiState(
                    route = Route.A,
                    restFeedback = true,
                    days = Program.allDays,
                ),
                onRoute = {},
                onRestFeedback = {},
            )
        }
    }

    @Test
    fun workoutEditor() = capture("09-workout-aanpassen") {
        WorkoutEditorContent(
            day = Program.day(Route.A, "a1"),
            canReset = true,
            onBack = {},
            onEdit = {},
            onMove = { _, _ -> },
            onRemove = {},
            onUpsert = { _, _ -> },
            onSave = {},
            onDelete = {},
            onReset = {},
        )
    }

    // ---- voorbeelddata ---------------------------------------------

    private fun homeState() = HomeUiState(
        today = today,
        date = today,
        route = Route.A,
        days = Program.allDays,
        plan = Program.planFor(Route.A, today.dayOfWeek),
        checked = setOf("db_rdl", "bulgarian_split_squat"),
        sessionsToday = 0,
        sessionsThisWeek = 3,
        logged = listOf(
            LoggedExercise(
                name = "Dumbbell Romanian Deadlifts",
                values = listOf(12, 12, 11, 10),
                weights = listOf(12.5, 12.5, 12.5, 12.5),
            ),
        ),
        nutrition = NutritionSummary(kcal = 2000, protein = 78, waterMl = 1750),
        upcoming = upcomingDays(Route.A, today),
    )

    private fun sessionState(): SessionUiState {
        val day = Program.day(Route.A, "a4")!!
        return SessionUiState(
            dayTitle = day.title,
            focus = day.focus,
            exercises = day.exercises,
            exerciseIndex = 0,
            setIndex = 1,
            phase = Phase.WORK,
            workElapsed = 12,
            completedSets = 1,
            totalElapsed = 96,
            // Set 1 zat er net op met 11 reps, dus set 2 vraagt er 12 — het doel
            // komt van de vórige set, niet van de vorige training.
            goals = mapOf(
                "db_rdl" to mapOf(
                    0 to SetGoal(12, 10, 12.5, 15.0),
                    1 to SetGoal(11, 12, 12.5, 12.5, GoalSource.LAST_SET),
                    2 to SetGoal(11, 12, 12.5, 12.5),
                    3 to SetGoal(10, 11, 12.5, 12.5),
                ),
            ),
        )
    }

    /** Bulgarian Split Squats: eerst rechts, dan links, zonder pauze ertussen. */
    private fun perSideState(): SessionUiState {
        val day = Program.day(Route.A, "a4")!!
        return SessionUiState(
            dayTitle = day.title,
            focus = day.focus,
            exercises = day.exercises,
            exerciseIndex = 1,
            setIndex = 1,
            phase = Phase.WORK,
            workElapsed = 8,
            completedSets = 5,
            totalElapsed = 640,
            side = Side.LEFT,
            goals = mapOf(
                "bulgarian_split_squat" to mapOf(
                    1 to SetGoal(11, 12, source = GoalSource.LAST_SET),
                ),
            ),
        )
    }

    private fun progressState(): ProgressUiState {
        val values = listOf(12f, 13f, 13f, 15f, 16f, 16f, 18f, 19f)
        val points = values.mapIndexed { index, value ->
            ChartPoint(
                date = today.minusDays((26 - index * 3).toLong()),
                value = value,
                sessionId = index.toLong(),
            )
        }
        return ProgressUiState(
            options = listOf(
                ExerciseOption("pushups", "Push-ups", 8),
                ExerciseOption("pullups", "Pull-ups", 6),
                ExerciseOption("plank", "Plank", 5),
                ExerciseOption(WEIGHT_ID, "Lichaamsgewicht", 3),
            ),
            series = SeriesUi(
                id = "pushups",
                name = "Push-ups",
                unitLabel = "reps",
                points = points,
                average = values.average().toFloat(),
                forecast = 21.2f,
                perWeek = 1.7f,
                best = 19f,
                last = 19f,
            ),
            metricIndex = 2,
            rangeIndex = 1,
            selectedPoint = 6,
            detail = null,
            sessionsInRange = 12,
            hoursInRange = 7.4f,
            setsInRange = 204,
            latestWeight = 58.4,
        )
    }

    private fun sampleDayDetail() = DayDetail(
        date = today.minusDays(5),
        title = "Bovenlichaam A",
        entries = listOf(
            DayDetailEntry("Push-ups", 18f, "reps", 2f),
            DayDetailEntry("Dumbbell Shoulder Press", 450f, "kg·reps", 62f, "3 sets · 36 reps · 12,5 kg"),
            DayDetailEntry("Dumbbell Floor Press", 495f, "kg·reps", 0f, "3 sets · 33 reps · 15 kg"),
            DayDetailEntry("Tricep Overhead Extension", 280f, "kg·reps", -20f, "3 sets · 40 reps · 7,5 kg"),
            DayDetailEntry("Dumbbell Lateral Raises", 225f, "kg·reps", null, "3 sets · 45 reps · 5 kg"),
        ),
    )

    private fun mealsState() = MealsUiState(
        date = today,
        entries = listOf(
            FoodEntry(1, 1, "Havermout", 100.0, false, null, 375, 14, 58, 7, Moment.BREAKFAST),
            FoodEntry(2, 2, "Volle melk", 300.0, false, null, 192, 10, 14, 11, Moment.BREAKFAST),
            FoodEntry(3, 3, "Banaan", 2.0, true, "banaan", 210, 3, 54, 1, Moment.BREAKFAST),
            FoodEntry(4, 4, "Griekse yoghurt · AH", 250.0, false, null, 243, 10, 10, 18, Moment.LUNCH),
            FoodEntry(5, 5, "Ei", 3.0, true, "ei", 234, 19, 2, 16, Moment.LUNCH),
        ),
        products = listOf(
            Product(1, "Havermout", null, Serving.PER_100G, null, 375.0, 13.5, 58.0, 7.0),
            Product(3, "Banaan", null, Serving.PIECE, "banaan", 105.0, 1.3, 27.0, 0.4),
        ),
        waterMl = 1750,
        moment = Moment.LUNCH,
    )

    // ---- helpers ---------------------------------------------------

    @Composable
    private fun WithBottomBar(route: String, content: @Composable () -> Unit) {
        Box(modifier = Modifier.fillMaxSize().background(Ink)) {
            Box(modifier = Modifier.fillMaxSize().padding(bottom = 74.dp)) { content() }
            Box(modifier = Modifier.align(Alignment.BottomCenter)) {
                BottomBar(currentRoute = route, onSelect = {})
            }
        }
    }

    private fun capture(name: String, content: @Composable () -> Unit) {
        val view = compose.activity.window.decorView
        val metrics = compose.activity.resources.displayMetrics
        val width = metrics.widthPixels
        val height = metrics.heightPixels

        // Robolectric tekent inhoud die tegen de onderrand van het venster aan ligt
        // ook boven in beeld. Daarom is het venster hier wat hoger dan het scherm:
        // de inhoud staat vast op schermmaat en de extra ruimte snijden we weg.
        val slack = (120 * metrics.density).toInt()

        fun layoutToWindow() {
            view.measure(
                View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(height + slack, View.MeasureSpec.EXACTLY),
            )
            view.layout(0, 0, width, height + slack)
        }

        layoutToWindow()
        compose.setContent {
            FitnessTheme {
                Column {
                    Box(
                        modifier = Modifier
                            .requiredSize((width / metrics.density).dp, (height / metrics.density).dp)
                            .background(Ink),
                    ) { content() }
                    // Buffer onder het scherm: inhoud die tegen de onderrand van de
                    // compositie ligt, dupliceert Robolectric bovenin.
                    Spacer(modifier = Modifier.requiredSize((width / metrics.density).dp, 100.dp))
                }
            }
        }
        compose.waitForIdle()
        layoutToWindow()
        compose.waitForIdle()

        val full = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        view.draw(Canvas(full))
        val screen = Bitmap.createBitmap(full, 0, 0, width, height)

        val directory = File("../screenshots").apply { mkdirs() }
        FileOutputStream(File(directory, "$name.png")).use {
            screen.compress(Bitmap.CompressFormat.PNG, 100, it)
        }
    }
}
