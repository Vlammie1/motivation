package com.vlammie.fitness.ui.progress

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.toSize
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.AccentBright
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.TextTertiary
import java.time.LocalDate
import kotlin.math.abs

data class ChartPoint(
    val date: LocalDate,
    val value: Float,
    val sessionId: Long,
)

/**
 * De hoekige lijngrafiek: punten per workout, een streepjeslijn voor het gemiddelde
 * en een puntjeslijn met de verwachting voor volgende week.
 */
@Composable
fun ProgressChart(
    points: List<ChartPoint>,
    average: Float?,
    forecast: Float?,
    selectedIndex: Int?,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (points.isEmpty()) return

    Canvas(
        modifier = modifier.pointerInput(points, forecast) {
            detectTapGestures { tap ->
                val geo = geometry(points, average, forecast, size.toSize(), this)
                val index = points.indices.minByOrNull { abs(geo.x(points[it].date.toEpochDay().toFloat()) - tap.x) }
                if (index != null) onSelect(index)
            }
        },
    ) {
        val geo = geometry(points, average, forecast, size, this)

        // Rasterlijnen.
        listOf(0f, 0.5f, 1f).forEach { fraction ->
            val y = geo.top + fraction * geo.plotHeight
            drawLine(
                color = Hairline,
                start = Offset(geo.left, y),
                end = Offset(size.width - geo.right, y),
                strokeWidth = 1f,
            )
        }

        val pixels = points.map { Offset(geo.x(it.date.toEpochDay().toFloat()), geo.y(it.value)) }

        // Zachte vulling onder de lijn.
        if (pixels.size > 1) {
            val fill = Path().apply {
                moveTo(pixels.first().x, geo.top + geo.plotHeight)
                pixels.forEach { lineTo(it.x, it.y) }
                lineTo(pixels.last().x, geo.top + geo.plotHeight)
                close()
            }
            drawPath(
                path = fill,
                brush = Brush.verticalGradient(
                    listOf(Accent.copy(alpha = 0.28f), Color.Transparent),
                    startY = geo.top,
                    endY = geo.top + geo.plotHeight,
                ),
            )
        }

        // Gemiddelde als streepjeslijn.
        if (average != null) {
            val y = geo.y(average)
            drawLine(
                color = TextTertiary,
                start = Offset(geo.left, y),
                end = Offset(size.width - geo.right, y),
                strokeWidth = 1.5.dp.toPx() / 2,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(14f, 10f)),
            )
        }

        // De lijn zelf — recht van punt naar punt, dus lekker hoekig.
        if (pixels.size > 1) {
            val line = Path().apply {
                moveTo(pixels.first().x, pixels.first().y)
                pixels.drop(1).forEach { lineTo(it.x, it.y) }
            }
            drawPath(
                path = line,
                color = Accent,
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round),
            )
        }

        // Verwachting voor volgende week als puntjeslijn.
        if (forecast != null) {
            val last = pixels.last()
            val target = Offset(
                geo.x(points.last().date.toEpochDay().toFloat() + 7f),
                geo.y(forecast),
            )
            drawLine(
                color = AccentBright,
                start = last,
                end = target,
                strokeWidth = 2.dp.toPx(),
                cap = StrokeCap.Round,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(2f, 12f)),
            )
            drawCircle(color = AccentBright, radius = 5.dp.toPx(), center = target, style = Stroke(width = 2.dp.toPx()))
        }

        // Punten.
        pixels.forEachIndexed { index, point ->
            val selected = index == selectedIndex
            if (selected) {
                drawLine(
                    color = Hairline,
                    start = Offset(point.x, geo.top),
                    end = Offset(point.x, geo.top + geo.plotHeight),
                    strokeWidth = 1.dp.toPx(),
                )
            }
            drawCircle(color = Accent, radius = (if (selected) 8 else 5).dp.toPx(), center = point)
            drawCircle(
                color = if (selected) Color.White else Color(0xFF0B0B0D),
                radius = (if (selected) 3.5f else 2f).dp.toPx(),
                center = point,
            )
        }

        // Assen: hoogste/laagste waarde en de eerste/laatste datum.
        drawLabel(formatValue(geo.yMax), geo.left - 8.dp.toPx(), geo.top + 4.dp.toPx(), alignRight = true)
        drawLabel(formatValue(geo.yMin), geo.left - 8.dp.toPx(), geo.top + geo.plotHeight + 4.dp.toPx(), alignRight = true)
        drawLabel(shortDay(points.first().date), geo.left, size.height - 2.dp.toPx())
        if (points.size > 1) {
            drawLabel(
                text = shortDay(points.last().date),
                x = geo.x(points.last().date.toEpochDay().toFloat()),
                y = size.height - 2.dp.toPx(),
                center = true,
            )
        }
    }
}

private class Geometry(
    val size: Size,
    val left: Float,
    val right: Float,
    val top: Float,
    val bottom: Float,
    val xMin: Float,
    val xMax: Float,
    val yMin: Float,
    val yMax: Float,
) {
    val plotWidth get() = size.width - left - right
    val plotHeight get() = size.height - top - bottom

    fun x(value: Float): Float =
        if (xMax == xMin) left + plotWidth / 2f else left + (value - xMin) / (xMax - xMin) * plotWidth

    fun y(value: Float): Float =
        if (yMax == yMin) top + plotHeight / 2f else top + (1f - (value - yMin) / (yMax - yMin)) * plotHeight
}

private fun geometry(
    points: List<ChartPoint>,
    average: Float?,
    forecast: Float?,
    size: Size,
    density: Density,
): Geometry {
    val xs = points.map { it.date.toEpochDay().toFloat() }
    val xMin = xs.min()
    val xMax = if (forecast != null) xs.max() + 7f else maxOf(xs.max(), xMin + 1f)

    val values = points.map { it.value } + listOfNotNull(average, forecast)
    val rawMin = values.min()
    val rawMax = values.max()
    val padding = ((rawMax - rawMin) * 0.2f).coerceAtLeast(1f)

    return with(density) {
        Geometry(
            size = size,
            left = 40.dp.toPx(),
            right = 16.dp.toPx(),
            top = 14.dp.toPx(),
            bottom = 24.dp.toPx(),
            xMin = xMin,
            xMax = xMax,
            yMin = (rawMin - padding).coerceAtLeast(0f),
            yMax = rawMax + padding,
        )
    }
}

private fun DrawScope.drawLabel(
    text: String,
    x: Float,
    y: Float,
    alignRight: Boolean = false,
    center: Boolean = false,
) {
    drawContext.canvas.nativeCanvas.drawText(
        text,
        x,
        y,
        android.graphics.Paint().apply {
            color = TextTertiary.toArgb()
            textSize = 10.dp.toPx()
            isAntiAlias = true
            textAlign = when {
                alignRight -> android.graphics.Paint.Align.RIGHT
                center -> android.graphics.Paint.Align.CENTER
                else -> android.graphics.Paint.Align.LEFT
            }
        },
    )
}

private fun formatValue(value: Float): String =
    if (value % 1f == 0f) value.toInt().toString() else "%.1f".format(value)

private fun shortDay(date: LocalDate): String {
    val months = listOf("jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec")
    return "${date.dayOfMonth} ${months[date.monthValue - 1]}"
}
