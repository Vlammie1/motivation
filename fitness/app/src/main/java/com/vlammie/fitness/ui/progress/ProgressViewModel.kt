package com.vlammie.fitness.ui.progress

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.db.ExerciseSessionStat
import com.vlammie.fitness.data.db.SessionEntity
import com.vlammie.fitness.data.db.WeighInEntity
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.repo.FitnessRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

const val WEIGHT_ID = "__weight"

data class ExerciseOption(val id: String, val name: String, val sessions: Int)

data class SeriesUi(
    val id: String,
    val name: String,
    val unitLabel: String,
    val points: List<ChartPoint>,
    val average: Float?,
    val forecast: Float?,
    val perWeek: Float?,
    val best: Float?,
    val last: Float?,
)

data class DayDetailEntry(
    val name: String,
    val value: Float,
    val unitLabel: String,
    val delta: Float?,
)

data class DayDetail(
    val date: LocalDate,
    val title: String,
    val entries: List<DayDetailEntry>,
)

data class ProgressUiState(
    val options: List<ExerciseOption> = emptyList(),
    val series: SeriesUi? = null,
    val metricIndex: Int = 0,
    val rangeIndex: Int = 0,
    val selectedPoint: Int? = null,
    val detail: DayDetail? = null,
    val sessionsInRange: Int = 0,
    val hoursInRange: Float = 0f,
    val setsInRange: Int = 0,
    val latestWeight: Double? = null,
)

private data class Raw(
    val stats: List<ExerciseSessionStat>,
    val sessions: List<SessionEntity>,
    val weights: List<WeighInEntity>,
)

private data class Selection(
    val exerciseId: String?,
    val metric: Int,
    val range: Int,
    val point: Int?,
)

class ProgressViewModel(private val repo: FitnessRepository) : ViewModel() {

    private val selectedId = MutableStateFlow<String?>(null)
    private val metric = MutableStateFlow(0)
    private val range = MutableStateFlow(0)
    private val point = MutableStateFlow<Int?>(null)

    private val raw = combine(repo.allStats(), repo.completedSessions(), repo.weighIns()) { stats, sessions, weights ->
        Raw(stats, sessions, weights)
    }

    private val selection = combine(selectedId, metric, range, point) { id, m, r, p -> Selection(id, m, r, p) }

    val state = combine(raw, selection) { data, sel -> build(data, sel) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProgressUiState())

    fun selectExercise(id: String) {
        selectedId.value = id
        point.value = null
    }

    fun selectMetric(index: Int) {
        metric.value = index
        point.value = null
    }

    fun selectRange(index: Int) {
        range.value = index
    }

    fun selectPoint(index: Int?) {
        point.value = index
    }

    fun logWeight(kg: Double) {
        viewModelScope.launch { repo.setWeighIn(LocalDate.now(), kg) }
    }

    // -----------------------------------------------------------------

    private fun build(data: Raw, sel: Selection): ProgressUiState {
        val options = buildOptions(data)
        val activeId = sel.exerciseId?.takeIf { id -> options.any { it.id == id } }
            ?: options.firstOrNull()?.id

        val series = activeId?.let { seriesFor(it, data, sel.metric) }
        val pointIndex = sel.point?.takeIf { series != null && it in series.points.indices }

        val since = when (sel.range) {
            0 -> LocalDate.now().minusDays(6)
            1 -> LocalDate.now().minusDays(29)
            else -> LocalDate.ofEpochDay(0)
        }
        val sessionsInRange = data.sessions.filter { it.date >= since.toEpochDay() }
        val statsInRange = data.stats.filter { it.date >= since.toEpochDay() }

        return ProgressUiState(
            options = options,
            series = series,
            metricIndex = sel.metric,
            rangeIndex = sel.range,
            selectedPoint = pointIndex,
            detail = pointIndex?.let { index ->
                detailFor(series!!.points[index].date, data, sel.metric)
            },
            sessionsInRange = sessionsInRange.size,
            hoursInRange = sessionsInRange.sumOf { it.durationSec } / 3600f,
            setsInRange = statsInRange.sumOf { it.setCount },
            latestWeight = data.weights.lastOrNull()?.kg,
        )
    }

    private fun buildOptions(data: Raw): List<ExerciseOption> {
        val logged = data.stats.groupBy { it.exerciseId }
            .map { (id, rows) ->
                ExerciseOption(
                    id = id,
                    name = Program.exercise(id)?.name ?: id,
                    sessions = rows.size,
                )
            }
            .sortedByDescending { it.sessions }
        val weight = ExerciseOption(WEIGHT_ID, "Lichaamsgewicht", data.weights.size)
        return logged + weight
    }

    private fun seriesFor(id: String, data: Raw, metricIndex: Int): SeriesUi {
        if (id == WEIGHT_ID) {
            val points = data.weights.map {
                ChartPoint(LocalDate.ofEpochDay(it.date), it.kg.toFloat(), 0L)
            }
            return finishSeries(id, "Lichaamsgewicht", "kg", points)
        }

        val exercise = Program.exercise(id)
        val unitLabel = when (exercise?.target?.unit) {
            MeasureUnit.SECONDS -> "sec"
            else -> "reps"
        }
        val points = data.stats.filter { it.exerciseId == id }
            .sortedBy { it.date }
            .map {
                ChartPoint(
                    date = LocalDate.ofEpochDay(it.date),
                    value = (if (metricIndex == 0) it.best else it.total).toFloat(),
                    sessionId = it.sessionId,
                )
            }
        return finishSeries(id, exercise?.name ?: id, unitLabel, points)
    }

    /** Gemiddelde, trendlijn en de schatting voor over een week. */
    private fun finishSeries(
        id: String,
        name: String,
        unitLabel: String,
        points: List<ChartPoint>,
    ): SeriesUi {
        val values = points.map { it.value }
        val average = values.takeIf { it.isNotEmpty() }?.average()?.toFloat()

        var forecast: Float? = null
        var perWeek: Float? = null
        if (points.size >= 3) {
            val xs = points.map { it.date.toEpochDay().toDouble() }
            val ys = values.map { it.toDouble() }
            val meanX = xs.average()
            val meanY = ys.average()
            val denominator = xs.sumOf { (it - meanX) * (it - meanX) }
            if (denominator > 0.0) {
                val slope = xs.indices.sumOf { (xs[it] - meanX) * (ys[it] - meanY) } / denominator
                val intercept = meanY - slope * meanX
                val nextX = xs.last() + 7.0
                forecast = (intercept + slope * nextX).toFloat().coerceAtLeast(0f)
                perWeek = (slope * 7).toFloat()
            }
        }

        return SeriesUi(
            id = id,
            name = name,
            unitLabel = unitLabel,
            points = points,
            average = average,
            forecast = forecast,
            perWeek = perWeek,
            best = values.maxOrNull(),
            last = values.lastOrNull(),
        )
    }

    /** Wat er die dag verder nog gedaan is, met het verschil ten opzichte van de keer ervoor. */
    private fun detailFor(date: LocalDate, data: Raw, metricIndex: Int): DayDetail {
        val epochDay = date.toEpochDay()

        if (data.stats.none { it.date == epochDay }) {
            val weight = data.weights.firstOrNull { it.date == epochDay }
            val previous = data.weights.lastOrNull { it.date < epochDay }
            return DayDetail(
                date = date,
                title = "Wekelijkse check-in",
                entries = listOfNotNull(
                    weight?.let {
                        DayDetailEntry(
                            name = "Lichaamsgewicht",
                            value = it.kg.toFloat(),
                            unitLabel = "kg",
                            delta = previous?.let { p -> (it.kg - p.kg).toFloat() },
                        )
                    },
                ),
            )
        }

        val entries = data.stats.filter { it.date == epochDay }.map { stat ->
            val current = (if (metricIndex == 0) stat.best else stat.total).toFloat()
            val previous = data.stats
                .filter { it.exerciseId == stat.exerciseId && it.date < epochDay }
                .maxByOrNull { it.date }
                ?.let { (if (metricIndex == 0) it.best else it.total).toFloat() }
            DayDetailEntry(
                name = Program.exercise(stat.exerciseId)?.name ?: stat.exerciseId,
                value = current,
                unitLabel = when (Program.exercise(stat.exerciseId)?.target?.unit) {
                    MeasureUnit.SECONDS -> "sec"
                    else -> "reps"
                },
                delta = previous?.let { current - it },
            )
        }

        return DayDetail(
            date = date,
            title = data.sessions.firstOrNull { it.date == epochDay }?.dayTitle ?: "Training",
            entries = entries,
        )
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                ProgressViewModel(app.repository)
            }
        }
    }
}
