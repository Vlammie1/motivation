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
import com.vlammie.fitness.data.model.Exercise
import com.vlammie.fitness.data.model.Program
import com.vlammie.fitness.data.model.Unit as MeasureUnit
import com.vlammie.fitness.data.model.formatKg
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
    /** Bij dumbbells: "4 sets · 46 reps · 12,5 kg", zodat je ziet waar het vandaan komt. */
    val note: String? = null,
)

data class DayDetail(
    val date: LocalDate,
    val title: String,
    val entries: List<DayDetailEntry>,
    /** De sessies van die dag, zodat je een verkeerde training kunt wissen. */
    val sessionIds: List<Long> = emptyList(),
    val hasWeighIn: Boolean = false,
)

/** De tabs onder "Per oefening"; [METRIC_AVERAGE] is waar een gewone oefening op start. */
const val METRIC_BEST = 0
const val METRIC_TOTAL = 1
const val METRIC_AVERAGE = 2

/**
 * Waar de grafiek naar kijkt.
 *
 * Bij lichaamsgewicht is vooruitgang simpel: meer herhalingen. Zodra er kilo's
 * bij komen kijken, klopt dat niet meer — tien keer met 12,5 kg is meer dan tien
 * keer met 10 kg, terwijl het getal gelijk blijft. Daarom krijgen oefeningen met
 * dumbbells hun eigen drie tabs, met [VOLUME] (kg × reps) als startpunt: die
 * loopt op als je zwaarder tilt én als je vaker tilt.
 */
enum class Metric(val label: String) {
    BEST("Beste set"),
    TOTAL("Totaal"),
    AVERAGE("Gemiddeld"),
    VOLUME("Volume"),
    TOP_WEIGHT("Gewicht"),
}

private val PLAIN_METRICS = listOf(Metric.BEST, Metric.TOTAL, Metric.AVERAGE)
private val WEIGHTED_METRICS = listOf(Metric.VOLUME, Metric.TOP_WEIGHT, Metric.AVERAGE)

/** Waar een gewogen oefening op start: volume. */
private const val METRIC_VOLUME = 0

data class ProgressUiState(
    val options: List<ExerciseOption> = emptyList(),
    val series: SeriesUi? = null,
    val metricIndex: Int = METRIC_AVERAGE,
    /** De namen van de drie tabs; bij dumbbells staat er iets anders dan bij push-ups. */
    val metricLabels: List<String> = PLAIN_METRICS.map { it.label },
    /** Eén regel uitleg onder de grafiek als er met gewicht gewerkt wordt. */
    val metricNote: String? = null,
    val rangeIndex: Int = 0,
    val selectedPoint: Int? = null,
    val detail: DayDetail? = null,
    val sessionsInRange: Int = 0,
    val hoursInRange: Float = 0f,
    val setsInRange: Int = 0,
    val latestWeight: Double? = null,
    val weighIns: List<WeighInEntity> = emptyList(),
)

private data class Raw(
    val stats: List<ExerciseSessionStat>,
    val sessions: List<SessionEntity>,
    val weights: List<WeighInEntity>,
    val exercises: List<Exercise>,
) {
    /** De oefening zoals hij nu is ingesteld; valt terug op het standaardplan. */
    fun exercise(id: String): Exercise? =
        exercises.firstOrNull { it.id == id } ?: Program.exercise(id)

    fun repLabel(id: String): String =
        if (exercise(id)?.target?.unit == MeasureUnit.SECONDS) "sec" else "reps"

    /**
     * Of er gewicht bij deze oefening hoort. Ook een oefening die je intussen uit
     * je schema gegooid hebt houdt zijn kilo's, zolang je ze ooit gelogd hebt.
     */
    fun weighted(id: String): Boolean =
        exercise(id)?.weighted == true || stats.any { it.exerciseId == id && it.topWeight != null }

    fun metrics(id: String): List<Metric> = if (weighted(id)) WEIGHTED_METRICS else PLAIN_METRICS

    fun metric(id: String, index: Int): Metric =
        metrics(id).getOrElse(index) { metrics(id).first() }

    fun unitLabel(id: String, metric: Metric): String = when (metric) {
        Metric.VOLUME -> "kg·${repLabel(id)}"
        Metric.TOP_WEIGHT -> "kg"
        else -> repLabel(id)
    }
}

/**
 * Wat één sessie waard is in de grafiek: je beste set, alles bij elkaar, het
 * gemiddelde over de sets van die dag, het totaal getilde gewicht, of de
 * zwaarste dumbbell waar je die dag mee gewerkt hebt.
 */
private fun ExerciseSessionStat.metric(metric: Metric): Float = when (metric) {
    Metric.BEST -> best.toFloat()
    Metric.TOTAL -> total.toFloat()
    Metric.AVERAGE -> if (setCount == 0) 0f else total.toFloat() / setCount
    Metric.VOLUME -> volume.toFloat()
    Metric.TOP_WEIGHT -> (topWeight ?: 0.0).toFloat()
}

private data class Selection(
    val exerciseId: String?,
    val plainMetric: Int,
    val weightedMetric: Int,
    val range: Int,
    val point: Int?,
)

class ProgressViewModel(private val repo: FitnessRepository) : ViewModel() {

    private val selectedId = MutableStateFlow<String?>(null)

    // Twee keuzes, want de tabs betekenen iets anders bij een oefening met kilo's.
    private val plainMetric = MutableStateFlow(METRIC_AVERAGE)
    private val weightedMetric = MutableStateFlow(METRIC_VOLUME)

    /** Of de oefening die nu in beeld staat met gewicht is; gezet bij het bouwen. */
    private var showingWeighted = false

    private val range = MutableStateFlow(0)
    private val point = MutableStateFlow<Int?>(null)

    private val raw = combine(
        repo.allStats(),
        repo.completedSessions(),
        repo.weighIns(),
        repo.knownExercises,
    ) { stats, sessions, weights, exercises ->
        Raw(stats, sessions, weights, exercises)
    }

    private val selection = combine(selectedId, plainMetric, weightedMetric, range, point) { id, plain, weighted, r, p ->
        Selection(id, plain, weighted, r, p)
    }

    val state = combine(raw, selection) { data, sel -> build(data, sel) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProgressUiState())

    fun selectExercise(id: String) {
        selectedId.value = id
        point.value = null
    }

    fun selectMetric(index: Int) {
        if (showingWeighted) weightedMetric.value = index else plainMetric.value = index
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

    /** Een eerdere weging corrigeren; de datum blijft staan. */
    fun updateWeight(date: LocalDate, kg: Double) {
        viewModelScope.launch { repo.setWeighIn(date, kg) }
    }

    fun deleteWeight(date: LocalDate) {
        viewModelScope.launch { repo.deleteWeighIn(date) }
    }

    /** Een verkeerd gelogde training weggooien, inclusief alle sets. */
    fun deleteSession(id: Long) {
        viewModelScope.launch { repo.deleteSession(id) }
        point.value = null
    }

    // -----------------------------------------------------------------

    private fun build(data: Raw, sel: Selection): ProgressUiState {
        val options = buildOptions(data)
        val activeId = sel.exerciseId?.takeIf { id -> options.any { it.id == id } }
            ?: options.firstOrNull()?.id

        val weighted = activeId != null && activeId != WEIGHT_ID && data.weighted(activeId)
        showingWeighted = weighted
        val metricIndex = if (weighted) sel.weightedMetric else sel.plainMetric
        val metric = activeId?.let { data.metric(it, metricIndex) } ?: Metric.AVERAGE

        val series = activeId?.let { seriesFor(it, data, metric) }
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
            metricIndex = metricIndex,
            metricLabels = (if (weighted) WEIGHTED_METRICS else PLAIN_METRICS).map { it.label },
            metricNote = if (weighted) noteFor(metric) else null,
            rangeIndex = sel.range,
            selectedPoint = pointIndex,
            detail = pointIndex?.let { index ->
                detailFor(series!!.points[index].date, data, sel.plainMetric, sel.weightedMetric)
            },
            sessionsInRange = sessionsInRange.size,
            hoursInRange = sessionsInRange.sumOf { it.durationSec } / 3600f,
            setsInRange = statsInRange.sumOf { it.setCount },
            latestWeight = data.weights.lastOrNull()?.kg,
            weighIns = data.weights.sortedByDescending { it.date },
        )
    }

    private fun buildOptions(data: Raw): List<ExerciseOption> {
        val logged = data.stats.groupBy { it.exerciseId }
            .map { (id, rows) ->
                ExerciseOption(
                    id = id,
                    name = data.exercise(id)?.name ?: rows.last().exerciseName,
                    sessions = rows.size,
                )
            }
            .sortedByDescending { it.sessions }
        val weight = ExerciseOption(WEIGHT_ID, "Lichaamsgewicht", data.weights.size)
        return logged + weight
    }

    private fun seriesFor(id: String, data: Raw, metric: Metric): SeriesUi {
        if (id == WEIGHT_ID) {
            val points = data.weights.map {
                ChartPoint(LocalDate.ofEpochDay(it.date), it.kg.toFloat(), 0L)
            }
            return finishSeries(id, "Lichaamsgewicht", "kg", points)
        }

        val rows = data.stats.filter { it.exerciseId == id }.sortedBy { it.date }
        val name = data.exercise(id)?.name ?: rows.lastOrNull()?.exerciseName ?: id
        val points = rows.map {
            ChartPoint(
                date = LocalDate.ofEpochDay(it.date),
                value = it.metric(metric),
                sessionId = it.sessionId,
            )
        }
        return finishSeries(id, name, data.unitLabel(id, metric), points)
    }

    /** Wat er onder de grafiek staat als er kilo's in het spel zijn. */
    private fun noteFor(metric: Metric): String = when (metric) {
        Metric.VOLUME -> "Volume = kg per dumbbell × herhalingen, alle sets bij elkaar. " +
            "Zwaarder tillen telt hier net zo hard mee als vaker tillen."

        Metric.TOP_WEIGHT -> "De zwaarste dumbbell waar je die dag mee gewerkt hebt."
        else -> "Alleen de herhalingen — kijk bij Volume of Gewicht mee, " +
            "anders lijkt zwaarder tillen op stilstand."
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
    private fun detailFor(date: LocalDate, data: Raw, plainMetric: Int, weightedMetric: Int): DayDetail {
        val epochDay = date.toEpochDay()

        if (data.stats.none { it.date == epochDay }) {
            val weight = data.weights.firstOrNull { it.date == epochDay }
            val previous = data.weights.lastOrNull { it.date < epochDay }
            return DayDetail(
                date = date,
                title = "Wekelijkse check-in",
                hasWeighIn = weight != null,
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
            val weighted = data.weighted(stat.exerciseId)
            val metric = data.metric(stat.exerciseId, if (weighted) weightedMetric else plainMetric)
            val current = stat.metric(metric)
            val previous = data.stats
                .filter { it.exerciseId == stat.exerciseId && it.date < epochDay }
                .maxByOrNull { it.date }
                ?.metric(metric)
            DayDetailEntry(
                name = data.exercise(stat.exerciseId)?.name ?: stat.exerciseName,
                value = current,
                unitLabel = data.unitLabel(stat.exerciseId, metric),
                delta = previous?.let { current - it },
                note = stat.topWeight?.let { kg ->
                    "${stat.setCount} sets · ${stat.total} ${data.repLabel(stat.exerciseId)} · ${formatKg(kg)} kg"
                },
            )
        }

        return DayDetail(
            date = date,
            title = data.sessions.firstOrNull { it.date == epochDay }?.dayTitle ?: "Training",
            entries = entries,
            sessionIds = data.stats.filter { it.date == epochDay }.map { it.sessionId }.distinct(),
            hasWeighIn = data.weights.any { it.date == epochDay },
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
