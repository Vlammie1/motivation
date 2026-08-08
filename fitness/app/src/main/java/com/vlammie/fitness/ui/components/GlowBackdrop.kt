package com.vlammie.fitness.ui.components

import android.graphics.RuntimeShader
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.nativeCanvas

/**
 * De warme achtergrond van de grote kaarten. Opgebouwd uit lagen zodat het niet
 * als een vlakke kleurovergang leest:
 *
 * 1. een basisverloop van geel-oranje naar rood
 * 2. zachte lichtvlekken die additief over elkaar liggen (de "mesh")
 * 3. filmkorrel over het geheel, sterker in de schaduwen
 *
 * Op Android 13+ zit dat alles in één AGSL-shader: geen tussenlagen, geen bitmaps,
 * en de korrel wordt per device-pixel berekend. Daaronder — en bij software-
 * rendering, want die kan geen shaders — tekenen we dezelfde opbouw met losse
 * lagen en een herhalende ruistegel.
 */
@Composable
fun GlowBackdrop(modifier: Modifier = Modifier) {
    val shader = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        remember { runCatching { RuntimeShader(BACKDROP) }.getOrNull() }
    } else {
        null
    }
    val brush = remember(shader) { shader?.let { ShaderBrush(it) } }
    // Loopt de shader-route ooit vast, dan tekenen we vanaf dat moment de lagen.
    val shaderWorks = remember { booleanArrayOf(true) }

    Canvas(modifier) {
        val useShader = brush != null && shaderWorks[0] &&
            drawContext.canvas.nativeCanvas.isHardwareAccelerated
        if (useShader) {
            shaderWorks[0] = runCatching { drawShaderBackdrop(shader!!, brush!!) }.isSuccess
            if (shaderWorks[0]) return@Canvas
        }
        drawLayeredBackdrop()
    }
}

// ---- Android 13+: verloop, mesh en korrel in één fragment shader ----------

private const val BACKDROP = """
uniform float2 uSize;
uniform float  uGrain;
uniform float4 uStopA;          // rgb + positie langs de diagonaal
uniform float4 uStopB;
uniform float4 uStopC;
uniform float4 uBlobColor[5];   // rgb van elke lichtvlek
uniform float4 uBlobGeom[5];    // middelpunt xy, straal, sterkte
uniform float4 uShade;          // rgb + dekking van de verdonkering onderin

float hash(float2 p) {          // goedkope pseudo-random per pixel
    p = fract(p * float2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

half4 main(float2 coord) {
    // Basisverloop, geprojecteerd op de diagonaal linksboven -> rechtsonder.
    float t = clamp(dot(coord, uSize) / dot(uSize, uSize), 0.0, 1.0);
    float3 base;
    if (t < uStopB.w) {
        base = mix(uStopA.rgb, uStopB.rgb, t / uStopB.w);
    } else {
        base = mix(uStopB.rgb, uStopC.rgb, (t - uStopB.w) / (1.0 - uStopB.w));
    }

    // Mesh: overlappende lichtvlekken die bij elkaar opgeteld worden. Klemmen na
    // elke vlek, precies zoals BlendMode.Plus dat laag voor laag doet.
    for (int i = 0; i < 5; i++) {
        float4 g = uBlobGeom[i];
        float f = clamp(1.0 - distance(coord, g.xy) / g.z, 0.0, 1.0);
        base = min(base + uBlobColor[i].rgb * (g.w * f), float3(1.0));
    }

    // Nauwelijks merkbare verdonkering onderin, zodat tekst leesbaar blijft.
    float shade = clamp((coord.y / uSize.y - 0.55) / 0.45, 0.0, 1.0);
    base = mix(base, uShade.rgb, shade * uShade.w);

    // Korrel: monochroom, additief, in device-pixels, sterker in de schaduwen.
    float lum = dot(base, float3(0.299, 0.587, 0.114));
    base += (hash(coord) - 0.5) * uGrain * (1.0 - lum);

    return half4(half3(clamp(base, 0.0, 1.0)), 1.0);
}
"""

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
private fun DrawScope.drawShaderBackdrop(shader: RuntimeShader, brush: ShaderBrush) {
    val w = size.width
    val h = size.height
    shader.setFloatUniform("uSize", w, h)
    shader.setFloatUniform("uGrain", GRAIN_DEFAULT)
    shader.setFloatUniform("uStopA", STOP_A.rgba(0f))
    shader.setFloatUniform("uStopB", STOP_B.rgba(STOP_B_AT))
    shader.setFloatUniform("uStopC", STOP_C.rgba(1f))
    shader.setFloatUniform("uShade", SHADE.rgba(SHADE_ALPHA))
    shader.setFloatUniform(
        "uBlobColor",
        FloatArray(BLOBS.size * 4) { i -> BLOBS[i / 4].color.rgba(0f)[i % 4] },
    )
    shader.setFloatUniform(
        "uBlobGeom",
        FloatArray(BLOBS.size * 4) { i ->
            val blob = BLOBS[i / 4]
            when (i % 4) {
                0 -> blob.x * w
                1 -> blob.y * h
                2 -> blob.radius * w
                else -> blob.strength
            }
        },
    )
    drawRect(brush)
}

// ---- Daaronder: dezelfde opbouw met losse lagen ---------------------------

private fun DrawScope.drawLayeredBackdrop() {
    val w = size.width
    val h = size.height

    drawRect(
        brush = Brush.linearGradient(
            0f to STOP_A,
            STOP_B_AT to STOP_B,
            1f to STOP_C,
            start = Offset(0f, 0f),
            end = Offset(w, h),
        ),
    )

    BLOBS.forEach { blob ->
        drawBlob(blob.color, Offset(blob.x * w, blob.y * h), blob.radius * w, blob.strength)
    }

    drawRect(
        brush = Brush.verticalGradient(
            0.55f to Color.Transparent,
            1f to SHADE.copy(alpha = SHADE_ALPHA),
        ),
    )

    drawRect(brush = grainTile, alpha = GRAIN_DEFAULT * 1.4f, blendMode = BlendMode.Overlay)
}

private fun DrawScope.drawBlob(color: Color, center: Offset, radius: Float, alpha: Float) {
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

// ---- Palet, gedeeld door beide routes -------------------------------------

private val STOP_A = Color(0xFFD9691C)
private val STOP_B = Color(0xFFC63C16)
private val STOP_C = Color(0xFF8E1607)
private const val STOP_B_AT = 0.42f

private val SHADE = Color(0xFF280A04)
private const val SHADE_ALPHA = 0.45f

/** Middelpunten zijn fracties van breedte en hoogte, stralen fracties van de breedte. */
private class Blob(
    val color: Color,
    val x: Float,
    val y: Float,
    val radius: Float,
    val strength: Float,
)

private val BLOBS = listOf(
    Blob(Color(0xFFF5B534), 0.02f, -0.45f, 0.85f, 0.30f),
    Blob(Color(0xFFF2801F), 0.55f, -0.10f, 1.00f, 0.34f),
    Blob(Color(0xFFE2531A), 0.20f, 0.50f, 0.95f, 0.30f),
    Blob(Color(0xFFD01F0D), 1.02f, 0.45f, 1.00f, 0.44f),
    Blob(Color(0xFFA81208), 0.35f, 1.10f, 1.05f, 0.46f),
)

/** Kleur als shader-uniform: rgb plus een vrije vierde waarde (positie of dekking). */
private fun Color.rgba(fourth: Float) = floatArrayOf(red, green, blue, fourth)
