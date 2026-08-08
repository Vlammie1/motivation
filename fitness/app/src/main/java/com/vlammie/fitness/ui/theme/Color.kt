package com.vlammie.fitness.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Achtergronden — diep zwart met nauwelijks opgetilde kaarten.
val Ink = Color(0xFF000000)
val Surface1 = Color(0xFF121214)
val Surface2 = Color(0xFF1B1B1F)
val Surface3 = Color(0xFF242429)
val Hairline = Color(0xFF2A2A30)

// Warm oranje accent.
val Accent = Color(0xFFF0741E)
val AccentBright = Color(0xFFFF9A3C)
val AccentDeep = Color(0xFFB8480F)
val AccentSoft = Color(0xFF3A1D0C)

// Tekst.
val TextPrimary = Color(0xFFFFFFFF)
val TextSecondary = Color(0xFFA0A0A6)
val TextTertiary = Color(0xFF6B6B72)

val Danger = Color(0xFFE0483C)

// Macro's — eiwit houdt het accent, koolhydraten en vet krijgen hun eigen tint.
val ProteinTint = Accent
val CarbTint = Color(0xFF4C8DFF)
val FatTint = Color(0xFFE8C33B)

val AccentBrush = Brush.horizontalGradient(
    listOf(Color(0xFFFF8F2E), Color(0xFFD3321A)),
)
