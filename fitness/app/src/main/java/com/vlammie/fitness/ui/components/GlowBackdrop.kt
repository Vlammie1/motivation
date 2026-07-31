package com.vlammie.fitness.ui.components

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageShader
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import kotlin.random.Random

/**
 * De warme achtergrond van de grote kaarten. Opgebouwd uit lagen zodat het niet
 * als een vlakke kleurovergang leest:
 *
 * 1. een basisverloop van geel-oranje naar rood
 * 2. zachte lichtvlekken die additief over elkaar liggen (de "mesh")
 * 3. stofdeeltjes: kleine lichtpuntjes en een paar grotere, vage bollen
 * 4. filmkorrel over het geheel
 */
@Composable
fun GlowBackdrop(modifier: Modifier = Modifier) {
    val grain = remember { grainBrush() }
    val particles = remember { particles() }

    Canvas(modifier) {
        val w = size.width
        val h = size.height

        drawRect(
            brush = Brush.linearGradient(
                0f to Color(0xFFD9691C),
                0.42f to Color(0xFFC63C16),
                1f to Color(0xFF8E1607),
                start = Offset(0f, 0f),
                end = Offset(w, h),
            ),
        )

        // Mesh: overlappende lichtvlekken. Plus-blending laat de overlap oplichten.
        blob(Color(0xFFF5B534), Offset(w * 0.02f, -h * 0.45f), w * 0.85f, 0.30f)
        blob(Color(0xFFF2801F), Offset(w * 0.55f, -h * 0.10f), w * 1.00f, 0.34f)
        blob(Color(0xFFE2531A), Offset(w * 0.20f, h * 0.50f), w * 0.95f, 0.30f)
        blob(Color(0xFFD01F0D), Offset(w * 1.02f, h * 0.45f), w * 1.00f, 0.44f)
        blob(Color(0xFFA81208), Offset(w * 0.35f, h * 1.10f), w * 1.05f, 0.46f)

        // Stofdeeltjes.
        particles.forEach { particle ->
            drawCircle(
                color = particle.color,
                radius = particle.radius * w,
                center = Offset(particle.x * w, particle.y * h),
                alpha = particle.alpha,
                blendMode = BlendMode.Plus,
            )
        }

        // Nauwelijks merkbare verdonkering onderin, zodat tekst leesbaar blijft.
        drawRect(
            brush = Brush.verticalGradient(
                0.55f to Color.Transparent,
                1f to Color(0x73280A04),
            ),
        )

        drawRect(brush = grain, alpha = 0.22f, blendMode = BlendMode.Overlay)
    }
}

private fun DrawScope.blob(color: Color, center: Offset, radius: Float, alpha: Float) {
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(color.copy(alpha = alpha), Color.Transparent),
            center = center,
            radius = radius,
        ),
        radius = radius,
        center = center,
        blendMode = BlendMode.Plus,
    )
}

/** Eén deeltje, in fracties van de kaartgrootte zodat het meeschaalt. */
private class Particle(
    val x: Float,
    val y: Float,
    val radius: Float,
    val alpha: Float,
    val color: Color,
)

private fun particles(): List<Particle> {
    val random = Random(seed = 21)
    val tints = listOf(Color(0xFFFFE1B0), Color(0xFFFFC98A), Color(0xFFFFF3E0))

    // Vage bollen op de achtergrond.
    val bokeh = List(9) {
        Particle(
            x = random.nextFloat(),
            y = random.nextFloat(),
            radius = 0.035f + random.nextFloat() * 0.075f,
            alpha = 0.04f + random.nextFloat() * 0.05f,
            color = tints[random.nextInt(tints.size)],
        )
    }

    // Kleine lichtpuntjes ervoor.
    val specks = List(90) {
        Particle(
            x = random.nextFloat(),
            y = random.nextFloat(),
            radius = 0.0015f + random.nextFloat() * 0.0055f,
            alpha = 0.08f + random.nextFloat() * 0.22f,
            color = tints[random.nextInt(tints.size)],
        )
    }

    return bokeh + specks
}

/** Eén keer opgebouwde ruistegel die herhaald over de kaart wordt gelegd. */
private fun grainBrush(tile: Int = 128): ShaderBrush {
    val random = Random(seed = 7)
    val pixels = IntArray(tile * tile) {
        val value = 105 + random.nextInt(100)
        (0xFF shl 24) or (value shl 16) or (value shl 8) or value
    }
    val bitmap = Bitmap.createBitmap(tile, tile, Bitmap.Config.ARGB_8888)
    bitmap.setPixels(pixels, 0, tile, 0, 0, tile, tile)
    return ShaderBrush(
        ImageShader(bitmap.asImageBitmap(), TileMode.Repeated, TileMode.Repeated)
    )
}
