package com.vlammie.fitness.ui.meals

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.CaretLeft
import com.adamglin.phosphoricons.fill.CaretRight
import com.adamglin.phosphoricons.fill.Check
import com.adamglin.phosphoricons.fill.Drop
import com.adamglin.phosphoricons.fill.Plus
import com.adamglin.phosphoricons.fill.X
import com.vlammie.fitness.data.model.Meal
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.SecondaryButton
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.components.Tag
import com.vlammie.fitness.ui.components.ThinProgressBar
import com.vlammie.fitness.ui.home.dayLabel
import com.vlammie.fitness.ui.home.shortDate
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.Surface1
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.Surface3
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import com.vlammie.fitness.ui.theme.TextTertiary

@Composable
fun MealsScreen(
    viewModel: MealsViewModel = viewModel(factory = MealsViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    MealsContent(
        state = state,
        onShiftDate = viewModel::shiftDate,
        onToggleMeal = viewModel::toggleMeal,
        onAddWater = viewModel::addWater,
        onAddExtra = viewModel::addExtra,
        onRemoveExtra = viewModel::removeExtra,
    )
}

@Composable
internal fun MealsContent(
    state: MealsUiState,
    onShiftDate: (Long) -> Unit,
    onToggleMeal: (String, Boolean) -> Unit,
    onAddWater: (Int) -> Unit,
    onAddExtra: (String, Int, Int) -> Unit,
    onRemoveExtra: (Long) -> Unit,
) {
    var showExtra by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Ink),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Spacer(Modifier.windowInsetsPadding(WindowInsets.statusBars).height(12.dp)) }

        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("VOEDING", style = MaterialTheme.typography.displayMedium, color = TextPrimary)
                    Text(
                        text = if (state.isToday) "Vandaag" else "${dayLabel(state.date)} ${shortDate(state.date)}",
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextTertiary,
                    )
                }
                DateArrow(PhosphorIcons.Fill.CaretLeft) { onShiftDate(-1) }
                Spacer(Modifier.width(8.dp))
                DateArrow(PhosphorIcons.Fill.CaretRight, enabled = !state.isToday) { onShiftDate(1) }
            }
        }

        item { TotalsCard(state) }
        item { WaterCard(state.waterMl, onAddWater) }

        item { SectionHeader(title = "Eetschema", modifier = Modifier.padding(top = 6.dp)) }

        items(NutritionPlan.meals, key = { it.id }) { meal ->
            MealRow(
                meal = meal,
                done = meal.id in state.doneMeals,
                onToggle = { onToggleMeal(meal.id, it) },
            )
        }

        item {
            SectionHeader(
                title = "Extra's",
                action = "Toevoegen",
                onAction = { showExtra = true },
                modifier = Modifier.padding(top = 6.dp),
            )
        }

        if (state.extras.isEmpty()) {
            item {
                Text(
                    text = "Nog niks extra gelogd vandaag.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
            }
        }

        items(state.extras, key = { it.id }) { extra ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Surface1)
                    .border(1.dp, Hairline, RoundedCornerShape(14.dp))
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(extra.name, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                    Text(
                        text = "${extra.kcal} kcal · ${extra.protein}g eiwit",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                }
                Icon(
                    imageVector = PhosphorIcons.Fill.X,
                    contentDescription = "Verwijderen",
                    tint = TextTertiary,
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(50))
                        .clickable { onRemoveExtra(extra.id) }
                        .padding(6.dp),
                )
            }
        }
    }

    if (showExtra) {
        ExtraDialog(
            onDismiss = { showExtra = false },
            onConfirm = { name, kcal, protein ->
                showExtra = false
                onAddExtra(name, kcal, protein)
            },
        )
    }
}

@Composable
private fun DateArrow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(38.dp)
            .clip(RoundedCornerShape(50))
            .background(Surface2)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (enabled) TextPrimary else Surface3,
            modifier = Modifier.size(20.dp),
        )
    }
}

@Composable
private fun TotalsCard(state: MealsUiState) {
    FitCard {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = "${state.kcal}",
                style = MaterialTheme.typography.displayLarge,
                color = TextPrimary,
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "van ${NutritionPlan.KCAL_MIN}-${NutritionPlan.KCAL_MAX} kcal",
                style = MaterialTheme.typography.bodyLarge,
                color = TextTertiary,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }
        Spacer(Modifier.height(12.dp))
        ThinProgressBar(progress = state.kcal / NutritionPlan.KCAL_MAX.toFloat())
        Spacer(Modifier.height(16.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(
                    text = "${state.protein}g",
                    style = MaterialTheme.typography.headlineMedium,
                    color = if (state.protein >= NutritionPlan.PROTEIN_MIN) Accent else TextPrimary,
                )
                Text(
                    text = "eiwit · doel ${NutritionPlan.PROTEIN_MIN}-${NutritionPlan.PROTEIN_MAX}g",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${state.doneMeals.size}/${NutritionPlan.meals.size}",
                    style = MaterialTheme.typography.headlineMedium,
                    color = TextPrimary,
                )
                Text("momenten gehad", style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
            }
        }
    }
}

@Composable
private fun WaterCard(waterMl: Int, onAdd: (Int) -> Unit) {
    FitCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(PhosphorIcons.Fill.Drop, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Water", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Spacer(Modifier.weight(1f))
            Text(
                text = "%.2fL van %.1fL".format(waterMl / 1000f, NutritionPlan.WATER_MAX_ML / 1000f),
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
            )
        }
        Spacer(Modifier.height(12.dp))
        ThinProgressBar(progress = waterMl / NutritionPlan.WATER_MAX_ML.toFloat())
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SecondaryButton(text = "+250 ml", icon = PhosphorIcons.Fill.Plus, onClick = { onAdd(NutritionPlan.GLASS_ML) })
            SecondaryButton(text = "+500 ml", icon = PhosphorIcons.Fill.Plus, onClick = { onAdd(500) })
            if (waterMl > 0) {
                SecondaryButton(text = "−250", onClick = { onAdd(-NutritionPlan.GLASS_ML) })
            }
        }
    }
}

@Composable
private fun MealRow(meal: Meal, done: Boolean, onToggle: (Boolean) -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (done) Surface2 else Surface1)
            .border(1.dp, if (done) Color(0xFF3D2412) else Hairline, shape)
            .clickable { onToggle(!done) }
            .padding(14.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .size(26.dp)
                .clip(RoundedCornerShape(50))
                .background(if (done) Accent else Color.Transparent)
                .border(1.5.dp, if (done) Accent else Surface3, RoundedCornerShape(50)),
            contentAlignment = Alignment.Center,
        ) {
            if (done) {
                Icon(PhosphorIcons.Fill.Check, contentDescription = null, tint = Ink, modifier = Modifier.size(16.dp))
            }
        }
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Tag(meal.time)
                Text(
                    text = "${meal.kcal} kcal · ${meal.protein}g",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = meal.name,
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary,
            )
            Text(
                text = meal.description,
                style = MaterialTheme.typography.bodyMedium,
                color = if (done) TextSecondary else TextTertiary,
            )
        }
    }
}

@Composable
private fun ExtraDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, Int, Int) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var kcal by remember { mutableStateOf("") }
    var protein by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = { Text("Extra toevoegen", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                DarkField(name, { name = it }, "Wat was het?")
                DarkField(kcal, { input -> kcal = input.filter { it.isDigit() }.take(4) }, "kcal", number = true)
                DarkField(protein, { input -> protein = input.filter { it.isDigit() }.take(3) }, "eiwit (g)", number = true)
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(name, kcal.toIntOrNull() ?: 0, protein.toIntOrNull() ?: 0) },
                enabled = kcal.toIntOrNull() != null,
            ) { Text("Toevoegen", color = Accent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

@Composable
private fun DarkField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    number: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        label = { Text(label, color = TextTertiary) },
        keyboardOptions = KeyboardOptions(
            keyboardType = if (number) KeyboardType.Number else KeyboardType.Text,
        ),
        modifier = Modifier.fillMaxWidth(),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = Surface2,
            unfocusedContainerColor = Surface2,
            focusedIndicatorColor = Accent,
            unfocusedIndicatorColor = Hairline,
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary,
            cursorColor = Accent,
        ),
    )
}
