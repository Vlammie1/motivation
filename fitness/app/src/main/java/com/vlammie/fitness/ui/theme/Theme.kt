package com.vlammie.fitness.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val FitnessColors = darkColorScheme(
    primary = Accent,
    onPrimary = TextPrimary,
    primaryContainer = AccentSoft,
    onPrimaryContainer = AccentBright,
    secondary = AccentBright,
    onSecondary = Ink,
    background = Ink,
    onBackground = TextPrimary,
    surface = Surface1,
    onSurface = TextPrimary,
    surfaceVariant = Surface2,
    onSurfaceVariant = TextSecondary,
    outline = Hairline,
    error = Danger,
)

@Composable
fun FitnessTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = FitnessColors,
        typography = FitnessTypography,
        content = content,
    )
}
