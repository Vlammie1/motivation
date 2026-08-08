package com.vlammie.fitness.ui.components

import android.graphics.Bitmap
import android.graphics.RenderEffect
import android.graphics.RuntimeShader
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.ImageShader
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.asComposeRenderEffect
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import kotlin.random.Random
import androidx.compose.ui.graphics.RenderEffect as ComposeRenderEffect

/**
 * Filmkorrel voor alles wat een verloop is. Zonder korrel leest een verloop op een
 * telefoonscherm als digitaal glad — mét korrel als bedrukt papier. De ruis doet
 * meteen dienst als dithering: die haalt de bandingstrepen uit grote verlopen weg.
 *
 * Vier regels waar het op staat of valt:
 *
 * 1. de ruis zit in echte device-pixels (`coord`), niet in genormaliseerde uv —
 *    anders schaalt de korrel mee met het element en wordt hij vlekkerig;
 * 2. monochroom en additief: dezelfde waarde bij r, g én b, want ruis per kanaal
 *    leest als sensorfout in plaats van als film;
 * 3. gemoduleerd op luminantie — echte korrel zit in de middentonen en schaduwen;
 * 4. statisch: geen tijd-uniform, dus de korrel staat stil (poster-look).
 */

/** Standaardsterkte. Bruikbaar bereik is ongeveer 0.03 – 0.15. */
const val GRAIN_DEFAULT = 0.10f

/**
 * Korrel over de laag eronder heen. Op Android 13+ leest de shader de al getekende
 * pixels (`content`) en kan hij de korrel op luminantie moduleren; daaronder valt
 * hij terug op een herhalende ruistegel.
 */
private const val GRAIN_OVERLAY = """
uniform shader content;
uniform float uGrain;

float hash(float2 p) {
    p = fract(p * float2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

half4 main(float2 coord) {
    half4 c = content.eval(coord);
    float lum = dot(c.rgb, half3(0.299, 0.587, 0.114));
    float n = (hash(coord) - 0.5) * uGrain * (1.0 - lum) * float(c.a);
    // c is voorvermenigvuldigd: bijtellen mag nooit boven de eigen alpha uitkomen.
    return half4(clamp(c.rgb + half3(half(n)), half3(0.0), half3(c.a)), c.a);
}
"""

/**
 * Legt korrel over alles wat ná deze modifier getekend wordt. Zet hem dus vóór de
 * achtergrond die je korrel wilt geven: `Modifier.filmGrain().background(brush)`.
 */
@Composable
fun Modifier.filmGrain(strength: Float = GRAIN_DEFAULT): Modifier {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val effect = remember(strength) { grainEffect(strength) }
        if (effect != null) return this.graphicsLayer { renderEffect = effect }
    }
    return this.drawWithContent {
        drawContent()
        drawRect(brush = grainTile, alpha = strength * 1.4f, blendMode = BlendMode.Overlay)
    }
}

@RequiresApi(Build.VERSION_CODES.TIRAMISU)
private fun grainEffect(strength: Float): ComposeRenderEffect? = runCatching {
    val shader = RuntimeShader(GRAIN_OVERLAY).apply { setFloatUniform("uGrain", strength) }
    RenderEffect.createRuntimeShaderEffect(shader, "content").asComposeRenderEffect()
}.getOrNull()

/**
 * De terugvaloptie zonder shaders: één keer opgebouwde ruistegel die herhaald wordt.
 * 256×256 is het minimum — kleiner en je ziet de herhaling. De waarden liggen rond
 * het midden (128), want alleen dan laat `Overlay` de kleur eronder intact; de
 * spreiding is zo gekozen dat de korrel even sterk uitpakt als in de shader.
 */
val grainTile: ShaderBrush by lazy {
    val tile = 256
    val random = Random(seed = 7)
    val pixels = IntArray(tile * tile) {
        val value = 77 + random.nextInt(103)
        (0xFF shl 24) or (value shl 16) or (value shl 8) or value
    }
    val bitmap = Bitmap.createBitmap(tile, tile, Bitmap.Config.ARGB_8888)
    bitmap.setPixels(pixels, 0, tile, 0, 0, tile, tile)
    ShaderBrush(ImageShader(bitmap.asImageBitmap(), TileMode.Repeated, TileMode.Repeated))
}
