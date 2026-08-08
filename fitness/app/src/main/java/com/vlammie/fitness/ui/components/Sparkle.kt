package com.vlammie.fitness.ui.components

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

/**
 * De vierpuntige ster met ingetrokken zijkanten — een eigen pad, geen icoon uit een set.
 * De horizontale punten zijn langer dan de verticale, wat hem die scherpe glans geeft.
 */
val Sparkle: ImageVector by lazy {
    ImageVector.Builder(
        name = "Sparkle",
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(fill = SolidColor(Color.White)) {
            moveTo(23.6f, 12f)
            quadTo(14.1f, 13.1f, 12f, 21.7f)
            quadTo(9.9f, 13.1f, 0.4f, 12f)
            quadTo(9.9f, 10.9f, 12f, 2.3f)
            quadTo(14.1f, 10.9f, 23.6f, 12f)
            close()
        }
    }.build()
}
