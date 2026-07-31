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
import kotlin.random.Random

/**
 * De warme achtergrond van de grote kaarten: een paar zachte lichtvlekken die
 * additief over elkaar heen liggen, met filmkorrel eroverheen. Dat geeft de
 * gradient structuur in plaats van een vlakke kleurovergang.
 */
@Composable
fun GlowBackdrop(modifier: Modifier = Modifier) {
    val grain = remember { grainBrush() }

    Canvas(modifier) {
        val w = size.width
        val h = size.height

        // Donkere ondergrond waar de vlekken op landen.
        drawRect(
            brush = Brush.verticalGradient(
                0f to Color(0xFF3A1608),
                0.55f to Color(0xFF1C0806),
                1f to Color(0xFF0B0808),
            ),
        )

        // Lichtvlekken. Plus-blending laat de overlap oplichten.
        blob(Color(0xFFE0AB33), Offset(w * -0.05f, -h * 0.30f), w * 1.15f, 0.40f)
        blob(Color(0xFFF07E20), Offset(w * 0.42f, -h * 0.10f), w * 1.10f, 0.46f)
        blob(Color(0xFFE04A16), Offset(w * 0.85f, h * 0.25f), w * 1.05f, 0.48f)
        blob(Color(0xFFC81F0E), Offset(w * 1.05f, h * 0.75f), w * 1.00f, 0.50f)
        blob(Color(0xFF8E1608), Offset(w * 0.25f, h * 1.05f), w * 1.05f, 0.46f)

        // Donkere sluiers boven- en onderin zodat de tekst leesbaar blijft.
        drawRect(
            brush = Brush.verticalGradient(
                0f to Color(0x4D0A0908),
                0.22f to Color.Transparent,
                0.62f to Color.Transparent,
                1f to Color(0xC20A0908),
            ),
        )

        drawRect(brush = grain, alpha = 0.20f, blendMode = BlendMode.Overlay)
    }
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.blob(
    color: Color,
    center: Offset,
    radius: Float,
    alpha: Float,
) {
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

/** Eén keer opgebouwde ruistegel die herhaald over de kaart wordt gelegd. */
private fun grainBrush(tile: Int = 128): ShaderBrush {
    val random = Random(seed = 7)
    val pixels = IntArray(tile * tile) {
        val value = 110 + random.nextInt(90)
        (0xFF shl 24) or (value shl 16) or (value shl 8) or value
    }
    val bitmap = Bitmap.createBitmap(tile, tile, Bitmap.Config.ARGB_8888)
    bitmap.setPixels(pixels, 0, tile, 0, 0, tile, tile)
    return ShaderBrush(
        ImageShader(bitmap.asImageBitmap(), TileMode.Repeated, TileMode.Repeated)
    )
}
