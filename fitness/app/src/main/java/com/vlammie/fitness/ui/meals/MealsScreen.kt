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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.adamglin.PhosphorIcons
import com.adamglin.phosphoricons.Fill
import com.adamglin.phosphoricons.fill.Barcode
import com.adamglin.phosphoricons.fill.Camera
import com.adamglin.phosphoricons.fill.CaretLeft
import com.adamglin.phosphoricons.fill.CaretRight
import com.adamglin.phosphoricons.fill.Drop
import com.adamglin.phosphoricons.fill.ForkKnife
import com.adamglin.phosphoricons.fill.MagnifyingGlass
import com.adamglin.phosphoricons.fill.Minus
import com.adamglin.phosphoricons.fill.PencilSimple
import com.adamglin.phosphoricons.fill.Plus
import com.adamglin.phosphoricons.fill.Sparkle
import com.adamglin.phosphoricons.fill.Target
import com.adamglin.phosphoricons.fill.X
import com.vlammie.fitness.data.model.FoodEntry
import com.vlammie.fitness.data.model.Meal
import com.vlammie.fitness.data.model.MealItem
import com.vlammie.fitness.data.model.Moment
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.data.model.NutritionTargets
import com.vlammie.fitness.data.model.Product
import com.vlammie.fitness.data.model.ProductDraft
import com.vlammie.fitness.data.model.Serving
import com.vlammie.fitness.data.model.formatAmount
import com.vlammie.fitness.data.net.VisionItem
import com.vlammie.fitness.ui.components.BigActionButton
import com.vlammie.fitness.ui.components.FitCard
import com.vlammie.fitness.ui.components.FillCircle
import com.vlammie.fitness.ui.components.IconPill
import com.vlammie.fitness.ui.components.PillTabs
import com.vlammie.fitness.ui.components.SecondaryButton
import com.vlammie.fitness.ui.components.SectionHeader
import com.vlammie.fitness.ui.components.Tag
import com.vlammie.fitness.ui.components.ThinProgressBar
import com.vlammie.fitness.ui.home.dayLabel
import com.vlammie.fitness.ui.home.shortDate
import com.vlammie.fitness.ui.theme.Accent
import com.vlammie.fitness.ui.theme.CarbTint
import com.vlammie.fitness.ui.theme.Danger
import com.vlammie.fitness.ui.theme.FatTint
import com.vlammie.fitness.ui.theme.Hairline
import com.vlammie.fitness.ui.theme.Ink
import com.vlammie.fitness.ui.theme.ProteinTint
import com.vlammie.fitness.ui.theme.Surface1
import com.vlammie.fitness.ui.theme.Surface2
import com.vlammie.fitness.ui.theme.Surface3
import com.vlammie.fitness.ui.theme.TextPrimary
import com.vlammie.fitness.ui.theme.TextSecondary
import com.vlammie.fitness.ui.theme.TextTertiary
import kotlin.math.roundToInt

/** Alles wat het voedingsscherm terug kan melden, op één plek. */
class MealsActions(
    val shiftDate: (Long) -> Unit = {},
    val setMoment: (Moment) -> Unit = {},
    val addWater: (Int) -> Unit = {},
    val setTargets: (NutritionTargets) -> Unit = {},
    val log: (Product, Double) -> Unit = { _, _ -> },
    val createAndLog: (ProductDraft, Double) -> Unit = { _, _ -> },
    val saveProduct: (Product) -> Unit = {},
    val deleteProduct: (Long) -> Unit = {},
    val logMeal: (Meal) -> Unit = {},
    val saveMeal: (Long?, String, List<MealItem>) -> Unit = { _, _, _ -> },
    val deleteMeal: (Long) -> Unit = {},
    val updateAmount: (Long, Double) -> Unit = { _, _ -> },
    val moveEntry: (Long, Moment) -> Unit = { _, _ -> },
    val removeEntry: (Long) -> Unit = {},
    val onBarcode: (String) -> Unit = {},
    val dismissScan: () -> Unit = {},
    val onPhoto: (ByteArray) -> Unit = {},
    val retryWithHint: (String) -> Unit = {},
    val logVisionItems: (List<VisionItem>) -> Unit = {},
    val dismissVision: () -> Unit = {},
)

@Composable
fun MealsScreen(
    viewModel: MealsViewModel = viewModel(factory = MealsViewModel.Factory),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    MealsContent(
        state = state,
        actions = MealsActions(
            shiftDate = viewModel::shiftDate,
            setMoment = viewModel::setMoment,
            addWater = viewModel::addWater,
            setTargets = viewModel::setTargets,
            log = viewModel::logFood,
            createAndLog = viewModel::createAndLog,
            saveProduct = viewModel::saveProduct,
            deleteProduct = viewModel::deleteProduct,
            logMeal = viewModel::logMeal,
            saveMeal = viewModel::saveMeal,
            deleteMeal = viewModel::deleteMeal,
            updateAmount = viewModel::updateAmount,
            moveEntry = viewModel::moveEntry,
            removeEntry = viewModel::removeEntry,
            onBarcode = viewModel::onBarcode,
            dismissScan = viewModel::dismissScan,
            onPhoto = viewModel::analysePhoto,
            retryWithHint = viewModel::retryWithHint,
            logVisionItems = viewModel::logVisionItems,
            dismissVision = viewModel::dismissVision,
        ),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun MealsContent(
    state: MealsUiState,
    actions: MealsActions = MealsActions(),
) {
    var picking by remember { mutableStateOf(false) }
    var amountFor by remember { mutableStateOf<Product?>(null) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }
    var creating by remember { mutableStateOf<ProductDraft?>(null) }
    var editingEntry by remember { mutableStateOf<FoodEntry?>(null) }
    var editingTargets by remember { mutableStateOf(false) }
    var camera by remember { mutableStateOf<CameraMode?>(null) }
    var missingKey by remember { mutableStateOf(false) }
    var mealEditor by remember { mutableStateOf<MealTarget?>(null) }

    val pickerState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val cameraState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    Box(modifier = Modifier.fillMaxSize().background(Ink)) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 120.dp),
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
                    DateArrow(PhosphorIcons.Fill.CaretLeft) { actions.shiftDate(-1) }
                    Spacer(Modifier.width(8.dp))
                    DateArrow(PhosphorIcons.Fill.CaretRight, enabled = !state.isToday) { actions.shiftDate(1) }
                }
            }

            item { TotalsCard(state, onEditTargets = { editingTargets = true }) }
            item { WaterCard(state.waterMl, state.targets.waterMl, actions.addWater) }

            item {
                Column(modifier = Modifier.padding(top = 6.dp)) {
                    Text(
                        text = "Nieuwe regels komen bij",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                    Spacer(Modifier.height(8.dp))
                    PillTabs(
                        options = Moment.entries.map { it.label },
                        selectedIndex = Moment.entries.indexOf(state.moment),
                        onSelect = { actions.setMoment(Moment.entries[it]) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            if (state.entries.isEmpty()) {
                item {
                    Text(
                        text = "Nog niks gelogd. Scan een streepjescode, fotografeer je bord " +
                            "of kies een product uit je lijst.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
            }

            state.byMoment.forEach { (moment, entries) ->
                if (entries.isEmpty()) return@forEach
                item(key = "header-${moment.name}") {
                    SectionHeader(
                        title = moment.label,
                        action = "${entries.sumOf { it.kcal }} kcal",
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                items(entries, key = { it.id }) { entry ->
                    EntryRow(
                        entry = entry,
                        onClick = { editingEntry = entry },
                        onRemove = { actions.removeEntry(entry.id) },
                    )
                }
            }
        }

        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(start = 20.dp, end = 20.dp, bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RoundAction(PhosphorIcons.Fill.Barcode, "Scannen") { camera = CameraMode.BARCODE }
            RoundAction(PhosphorIcons.Fill.Camera, "Foto") {
                if (state.hasApiKey) camera = CameraMode.PHOTO else missingKey = true
            }
            BigActionButton(
                text = "Loggen",
                icon = PhosphorIcons.Fill.Plus,
                onClick = { picking = true },
                modifier = Modifier.weight(1f),
            )
        }
    }

    // ---- kiezen en invoeren -------------------------------------------

    if (picking) {
        ModalBottomSheet(
            onDismissRequest = { picking = false },
            sheetState = pickerState,
            containerColor = Surface1,
        ) {
            PickerSheet(
                products = state.products,
                meals = state.meals,
                onPick = {
                    picking = false
                    amountFor = it
                },
                onEdit = {
                    picking = false
                    editingProduct = it
                },
                onNew = {
                    picking = false
                    creating = emptyDraft()
                },
                onScan = {
                    picking = false
                    camera = CameraMode.BARCODE
                },
                onLogMeal = { meal ->
                    picking = false
                    actions.logMeal(meal)
                },
                onEditMeal = { meal ->
                    picking = false
                    mealEditor = MealTarget(meal)
                },
                onNewMeal = {
                    picking = false
                    mealEditor = MealTarget(null)
                },
            )
        }
    }

    val mealTarget = mealEditor
    if (mealTarget != null) {
        FullScreenDialog(onDismiss = { mealEditor = null }) {
            MealEditor(
                meal = mealTarget.meal,
                products = state.products,
                onDismiss = { mealEditor = null },
                onSave = { name, items ->
                    mealEditor = null
                    actions.saveMeal(mealTarget.meal?.id, name, items)
                },
                onDelete = mealTarget.meal?.let { existing ->
                    {
                        mealEditor = null
                        actions.deleteMeal(existing.id)
                    }
                },
            )
        }
    }

    val product = amountFor
    if (product != null) {
        AmountDialog(
            title = product.fullName,
            subtitle = product.perUnitLabel(),
            unitLabel = product.unitLabel,
            perPiece = product.perPiece,
            initial = product.defaultAmount,
            preview = { amount ->
                "${product.kcalFor(amount)} kcal · ${product.proteinFor(amount)}g E · " +
                    "${product.carbsFor(amount)}g K · ${product.fatFor(amount)}g V"
            },
            onDismiss = { amountFor = null },
            onConfirm = { amount ->
                amountFor = null
                actions.log(product, amount)
            },
        )
    }

    val entry = editingEntry
    if (entry != null) {
        AmountDialog(
            title = entry.name,
            subtitle = "Nu ${entry.amountLabel} · ${entry.kcal} kcal · ${entry.macroLabel}",
            unitLabel = if (entry.perPiece) (entry.pieceLabel ?: "stuk") else "gram",
            perPiece = entry.perPiece,
            initial = entry.amount,
            preview = null,
            moment = entry.moment,
            onMoment = { moment -> actions.moveEntry(entry.id, moment) },
            onDismiss = { editingEntry = null },
            onConfirm = { amount ->
                editingEntry = null
                actions.updateAmount(entry.id, amount)
            },
        )
    }

    val draft = creating
    if (draft != null) {
        ProductDialog(
            existing = null,
            draft = draft,
            onDismiss = { creating = null },
            onSave = { saved ->
                creating = null
                // Nieuwe producten log je meteen: één keer typen, klaar.
                actions.createAndLog(saved, if (saved.serving == Serving.PIECE) 1.0 else 100.0)
            },
            onDelete = null,
        )
    }

    val editing = editingProduct
    if (editing != null) {
        ProductDialog(
            existing = editing,
            draft = editing.toDraft(),
            onDismiss = { editingProduct = null },
            onSave = { saved ->
                editingProduct = null
                actions.saveProduct(
                    editing.copy(
                        name = saved.name,
                        brand = saved.brand,
                        serving = saved.serving,
                        pieceLabel = saved.pieceLabel,
                        kcal = saved.kcal,
                        protein = saved.protein,
                        carbs = saved.carbs,
                        fat = saved.fat,
                    )
                )
            },
            onDelete = {
                editingProduct = null
                actions.deleteProduct(editing.id)
            },
        )
    }

    if (missingKey) {
        AlertDialog(
            onDismissRequest = { missingKey = false },
            containerColor = Surface1,
            title = { Text("Nog geen API-sleutel", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
            text = {
                Text(
                    text = "De AI kijkt met Gemini mee naar je foto. Vul eerst een sleutel in bij " +
                        "Instellingen → Fotoherkenning; een gratis sleutel haal je op bij " +
                        "aistudio.google.com.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
            },
            confirmButton = { TextButton(onClick = { missingKey = false }) { Text("Duidelijk", color = Accent) } },
        )
    }

    if (editingTargets) {
        TargetsDialog(
            targets = state.targets,
            onDismiss = { editingTargets = false },
            onSave = {
                editingTargets = false
                actions.setTargets(it)
            },
        )
    }

    // ---- camera, scannen en de AI ---------------------------------------

    val mode = camera
    if (mode != null) {
        // Als blad, niet als volledig scherm: zo blijft de sluiterknop zichtbaar.
        ModalBottomSheet(
            onDismissRequest = { camera = null },
            sheetState = cameraState,
            containerColor = Surface1,
        ) {
            CameraSheet(
                mode = mode,
                onBarcode = { code ->
                    camera = null
                    actions.onBarcode(code)
                },
                onPhoto = { jpeg ->
                    camera = null
                    actions.onPhoto(jpeg)
                },
                onClose = { camera = null },
            )
        }
    }

    ScanDialogs(
        scan = state.scan,
        onDismiss = actions.dismissScan,
        onAmount = { found ->
            actions.dismissScan()
            amountFor = found
        },
        onManual = { barcode ->
            actions.dismissScan()
            creating = emptyDraft(barcode)
        },
        onRescan = {
            actions.dismissScan()
            camera = CameraMode.BARCODE
        },
    )

    if (state.vision != null) {
        VisionSheet(
            vision = state.vision,
            moment = state.moment,
            hasApiKey = state.hasApiKey,
            onRetryHint = actions.retryWithHint,
            onConfirm = actions.logVisionItems,
            onDismiss = actions.dismissVision,
        )
    }
}

// ---------------------------------------------------------------------
// Kop, totalen en water
// ---------------------------------------------------------------------

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
private fun RoundAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(60.dp)
            .clip(RoundedCornerShape(50))
            .background(Surface2)
            .border(1.dp, Hairline, RoundedCornerShape(50))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = label, tint = Accent, modifier = Modifier.size(24.dp))
    }
}

@Composable
private fun TotalsCard(state: MealsUiState, onEditTargets: () -> Unit) {
    FitCard {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = "${state.kcal}",
                style = MaterialTheme.typography.displayLarge,
                color = TextPrimary,
            )
            Spacer(Modifier.width(8.dp))
            Text(
                text = "van ${state.targets.kcal} kcal",
                style = MaterialTheme.typography.bodyLarge,
                color = TextTertiary,
                modifier = Modifier.padding(bottom = 6.dp),
            )
            Spacer(Modifier.weight(1f))
            IconPill(
                icon = PhosphorIcons.Fill.Target,
                onClick = onEditTargets,
                tint = TextSecondary,
                modifier = Modifier.padding(bottom = 4.dp),
            )
        }
        Spacer(Modifier.height(12.dp))
        ThinProgressBar(progress = state.kcal / state.targets.kcal.toFloat())
        Spacer(Modifier.height(6.dp))
        Text(
            text = "${state.kcalLeft} kcal te gaan",
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary,
        )

        Spacer(Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            MacroColumn("Eiwit", state.protein, state.targets.protein, ProteinTint, Modifier.weight(1f))
            MacroColumn("Koolh.", state.carbs, state.targets.carbs, CarbTint, Modifier.weight(1f))
            MacroColumn("Vet", state.fat, state.targets.fat, FatTint, Modifier.weight(1f))
        }
    }
}

@Composable
private fun MacroColumn(
    label: String,
    value: Int,
    target: Int,
    color: Color,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = "${value}g",
                style = MaterialTheme.typography.headlineMedium,
                color = if (target > 0 && value >= target) color else TextPrimary,
            )
            Text(
                text = " / $target",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
                modifier = Modifier.padding(bottom = 3.dp),
            )
        }
        Spacer(Modifier.height(6.dp))
        ThinProgressBar(
            progress = if (target > 0) value / target.toFloat() else 0f,
            brush = SolidColor(color),
        )
        Spacer(Modifier.height(4.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
    }
}

@Composable
private fun WaterCard(waterMl: Int, target: Int, onAdd: (Int) -> Unit) {
    // De knoppen tellen op, tenzij je het rondje ervoor op min hebt gezet.
    var subtract by remember { mutableStateOf(false) }
    var custom by remember { mutableStateOf(false) }
    val sign = if (subtract) -1 else 1

    FitCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(PhosphorIcons.Fill.Drop, contentDescription = null, tint = Accent, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Water", style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Spacer(Modifier.weight(1f))
            Text(
                text = "%.2fL van %.1fL".format(waterMl / 1000f, target / 1000f),
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
            )
        }
        Spacer(Modifier.height(12.dp))
        ThinProgressBar(progress = if (target > 0) waterMl / target.toFloat() else 0f)
        Spacer(Modifier.height(14.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SignToggle(subtract = subtract, onToggle = { subtract = !subtract })
            WaterChip("250 ml") { onAdd(sign * NutritionPlan.GLASS_ML) }
            WaterChip("500 ml") { onAdd(sign * 500) }
            WaterChip("Anders") { custom = true }
        }
    }

    if (custom) {
        WaterDialog(
            subtract = subtract,
            onDismiss = { custom = false },
            onConfirm = { ml ->
                custom = false
                onAdd(sign * ml)
            },
        )
    }
}

/** Het plusje dat je in een minnetje kunt tikken; staat altijd op plus. */
@Composable
private fun SignToggle(subtract: Boolean, onToggle: () -> Unit) {
    val shape = RoundedCornerShape(50)
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(shape)
            .background(if (subtract) Color(0xFF3A1512) else Surface2)
            .border(1.dp, if (subtract) Danger else Hairline, shape)
            .clickable(onClick = onToggle),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = if (subtract) PhosphorIcons.Fill.Minus else PhosphorIcons.Fill.Plus,
            contentDescription = if (subtract) "Eraf halen; tik om toe te voegen" else "Toevoegen; tik om eraf te halen",
            tint = if (subtract) Danger else Accent,
            modifier = Modifier.size(20.dp),
        )
    }
}

/** Een smalle knop; er staan er drie naast het plus/min-rondje. */
@Composable
private fun WaterChip(text: String, onClick: () -> Unit) {
    val shape = RoundedCornerShape(50)
    Box(
        modifier = Modifier
            .clip(shape)
            .background(Surface2)
            .border(1.dp, Hairline, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = MaterialTheme.typography.labelLarge, color = TextPrimary)
    }
}

/** Zelf een hoeveelheid intikken — een fles van 330 of een kop van 180. */
@Composable
private fun WaterDialog(
    subtract: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (Int) -> Unit,
) {
    var text by remember { mutableStateOf("") }
    val ml = text.toIntOrNull()

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = {
            Text(
                text = if (subtract) "Water eraf halen" else "Water toevoegen",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                DarkField(
                    value = text,
                    onValueChange = { input -> text = input.filter { it.isDigit() }.take(4) },
                    label = "Hoeveel ml?",
                    number = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    NutritionPlan.waterQuickMl.forEach { option ->
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Surface2)
                                .border(1.dp, Hairline, RoundedCornerShape(12.dp))
                                .clickable { text = option.toString() }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = option.toString(),
                                style = MaterialTheme.typography.labelLarge,
                                color = TextPrimary,
                            )
                        }
                    }
                }
                if (ml != null && ml > 0) {
                    Text(
                        text = if (subtract) "Er gaat $ml ml af." else "Er komt $ml ml bij.",
                        style = MaterialTheme.typography.titleMedium,
                        color = if (subtract) Danger else Accent,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { ml?.let(onConfirm) },
                enabled = ml != null && ml > 0,
            ) { Text(if (subtract) "Eraf halen" else "Toevoegen", color = Accent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

@Composable
private fun EntryRow(entry: FoodEntry, onClick: () -> Unit, onRemove: () -> Unit) {
    val shape = RoundedCornerShape(16.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Surface1)
            .border(1.dp, Hairline, shape)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Tag(entry.amountLabel)
        Column(modifier = Modifier.weight(1f)) {
            Text(entry.name, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
            Text(
                text = "${entry.kcal} kcal · ${entry.macroLabel}",
                style = MaterialTheme.typography.bodyMedium,
                color = TextTertiary,
            )
        }
        Icon(
            imageVector = PhosphorIcons.Fill.X,
            contentDescription = "Verwijderen",
            tint = TextTertiary,
            modifier = Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(50))
                .clickable(onClick = onRemove)
                .padding(7.dp),
        )
    }
}

// ---------------------------------------------------------------------
// Kiezen, invoeren, aanmaken
// ---------------------------------------------------------------------

/** Welke maaltijd de editor bewerkt; `null` betekent een nieuwe. */
private class MealTarget(val meal: Meal?)

@Composable
private fun PickerSheet(
    products: List<Product>,
    meals: List<Meal>,
    onPick: (Product) -> Unit,
    onEdit: (Product) -> Unit,
    onNew: () -> Unit,
    onScan: () -> Unit,
    onLogMeal: (Meal) -> Unit,
    onEditMeal: (Meal) -> Unit,
    onNewMeal: () -> Unit,
) {
    var tab by remember { mutableStateOf(0) }

    Column(modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
        Text("Wat heb je gegeten?", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
        Spacer(Modifier.height(12.dp))
        PillTabs(
            options = listOf("Producten", "Maaltijden"),
            selectedIndex = tab,
            onSelect = { tab = it },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))

        if (tab == 0) {
            ProductList(products = products, onPick = onPick, onEdit = onEdit, onNew = onNew, onScan = onScan)
        } else {
            MealList(meals = meals, onLog = onLogMeal, onEdit = onEditMeal, onNew = onNewMeal)
        }
    }
}

@Composable
private fun ProductList(
    products: List<Product>,
    onPick: (Product) -> Unit,
    onEdit: (Product) -> Unit,
    onNew: () -> Unit,
    onScan: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(products, query) {
        if (query.isBlank()) products
        else products.filter { it.fullName.contains(query.trim(), ignoreCase = true) }
    }

    Column {
        DarkField(
            value = query,
            onValueChange = { query = it },
            label = "Zoeken",
            leading = PhosphorIcons.Fill.MagnifyingGlass,
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SecondaryButton(text = "Scannen", icon = PhosphorIcons.Fill.Barcode, onClick = onScan)
            SecondaryButton(text = "Nieuw product", icon = PhosphorIcons.Fill.Plus, onClick = onNew)
        }
        Spacer(Modifier.height(12.dp))

        LazyColumn(
            modifier = Modifier.heightIn(max = 420.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (filtered.isEmpty()) {
                item {
                    Text(
                        text = "Geen product gevonden. Maak hem aan of scan de verpakking.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                }
            }
            items(filtered, key = { it.id }) { product ->
                PickRow(
                    title = product.fullName,
                    subtitle = product.perUnitLabel(),
                    onClick = { onPick(product) },
                    onEdit = { onEdit(product) },
                )
            }
        }
    }
}

@Composable
private fun MealList(
    meals: List<Meal>,
    onLog: (Meal) -> Unit,
    onEdit: (Meal) -> Unit,
    onNew: () -> Unit,
) {
    Column {
        Text(
            text = "Een maaltijd is een vaste verdeling van producten. Eén tik zet " +
                "alles in je dagboek.",
            style = MaterialTheme.typography.bodyMedium,
            color = TextTertiary,
        )
        Spacer(Modifier.height(12.dp))
        SecondaryButton(text = "Nieuwe maaltijd", icon = PhosphorIcons.Fill.Plus, onClick = onNew)
        Spacer(Modifier.height(12.dp))

        LazyColumn(
            modifier = Modifier.heightIn(max = 420.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (meals.isEmpty()) {
                item {
                    Text(
                        text = "Nog geen maaltijden. Maak er één van wat je vaak eet — " +
                            "havermout met melk en een banaan bijvoorbeeld.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                }
            }
            items(meals, key = { it.id }) { meal ->
                PickRow(
                    title = meal.name,
                    subtitle = meal.summary,
                    onClick = { onLog(meal) },
                    onEdit = { onEdit(meal) },
                )
            }
        }
    }
}

/** Een regel in de kieslijst: tikken kiest, het potlood past aan. */
@Composable
private fun PickRow(
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    onEdit: () -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Surface2)
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
        }
        Icon(
            imageVector = PhosphorIcons.Fill.PencilSimple,
            contentDescription = "Aanpassen",
            tint = TextTertiary,
            modifier = Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(50))
                .clickable(onClick = onEdit)
                .padding(7.dp),
        )
    }
}

// ---------------------------------------------------------------------
// Vaste maaltijden samenstellen
// ---------------------------------------------------------------------

/**
 * Een maaltijd samenstellen: een naam en daaronder de producten met de
 * hoeveelheid die je er normaal van neemt. Het venster staat op zichzelf,
 * zodat je rustig kunt zoeken zonder dat het dagboek eronder meebeweegt.
 */
@Composable
private fun MealEditor(
    meal: Meal?,
    products: List<Product>,
    onDismiss: () -> Unit,
    onSave: (String, List<MealItem>) -> Unit,
    onDelete: (() -> Unit)?,
) {
    var name by remember { mutableStateOf(meal?.name ?: "") }
    var chosen by remember { mutableStateOf(meal?.items.orEmpty()) }
    var adding by remember { mutableStateOf(false) }
    var amountFor by remember { mutableStateOf<Product?>(null) }
    var editingIndex by remember { mutableStateOf<Int?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }

    val kcal = chosen.sumOf { it.kcal }
    val protein = chosen.sumOf { it.protein }
    val carbs = chosen.sumOf { it.carbs }
    val fat = chosen.sumOf { it.fat }

    Box(modifier = Modifier.fillMaxSize().background(Ink)) {
        if (adding) {
            // Het zoeklijstje neemt het scherm even over; de maaltijd blijft staan.
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(horizontal = 20.dp)
                    .padding(top = 12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Product kiezen",
                        style = MaterialTheme.typography.headlineMedium,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f),
                    )
                    IconPill(
                        icon = PhosphorIcons.Fill.X,
                        onClick = { adding = false },
                        tint = TextSecondary,
                    )
                }
                Spacer(Modifier.height(12.dp))
                MealProductSearch(
                    products = products,
                    onPick = { product ->
                        adding = false
                        amountFor = product
                    },
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = 110.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item { Spacer(Modifier.windowInsetsPadding(WindowInsets.statusBars).height(12.dp)) }

                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (meal == null) "NIEUWE MAALTIJD" else "MAALTIJD",
                                style = MaterialTheme.typography.displayMedium,
                                color = TextPrimary,
                            )
                            Text(
                                text = "$kcal kcal · ${protein}g E · ${carbs}g K · ${fat}g V",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextTertiary,
                            )
                        }
                        IconPill(icon = PhosphorIcons.Fill.X, onClick = onDismiss, tint = TextSecondary)
                    }
                }

                item {
                    DarkField(
                        value = name,
                        onValueChange = { name = it },
                        label = "Naam (bijv. Havermout-ontbijt)",
                    )
                }

                item {
                    SectionHeader(
                        title = "Wat zit erin?",
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }

                if (chosen.isEmpty()) {
                    item {
                        Text(
                            text = "Nog geen producten. Voeg ze hieronder toe met de " +
                                "hoeveelheid die je er meestal van neemt.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextTertiary,
                        )
                    }
                }

                items(chosen.size) { index ->
                    val item = chosen[index]
                    val shape = RoundedCornerShape(16.dp)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(shape)
                            .background(Surface1)
                            .border(1.dp, Hairline, shape)
                            .clickable { editingIndex = index }
                            .padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        Tag(item.amountLabel)
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.name, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
                            Text(
                                text = "${item.kcal} kcal · ${item.protein}g E · " +
                                    "${item.carbs}g K · ${item.fat}g V",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextTertiary,
                            )
                        }
                        Icon(
                            imageVector = PhosphorIcons.Fill.X,
                            contentDescription = "Verwijderen",
                            tint = TextTertiary,
                            modifier = Modifier
                                .size(30.dp)
                                .clip(RoundedCornerShape(50))
                                .clickable { chosen = chosen.toMutableList().also { it.removeAt(index) } }
                                .padding(7.dp),
                        )
                    }
                }

                item {
                    SecondaryButton(
                        text = "Product toevoegen",
                        icon = PhosphorIcons.Fill.Plus,
                        onClick = { adding = true },
                    )
                }

                if (onDelete != null) {
                    item {
                        Text(
                            text = "Maaltijd verwijderen",
                            style = MaterialTheme.typography.labelLarge,
                            color = Danger,
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { confirmDelete = true }
                                .padding(vertical = 8.dp),
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(start = 20.dp, end = 20.dp, bottom = 16.dp),
            ) {
                BigActionButton(
                    text = "Opslaan",
                    icon = PhosphorIcons.Fill.ForkKnife,
                    enabled = name.isNotBlank() && chosen.isNotEmpty(),
                    onClick = { onSave(name, chosen) },
                )
            }
        }
    }

    val product = amountFor
    if (product != null) {
        AmountDialog(
            title = product.fullName,
            subtitle = product.perUnitLabel(),
            unitLabel = product.unitLabel,
            perPiece = product.perPiece,
            initial = product.defaultAmount,
            preview = { amount ->
                "${product.kcalFor(amount)} kcal · ${product.proteinFor(amount)}g E · " +
                    "${product.carbsFor(amount)}g K · ${product.fatFor(amount)}g V"
            },
            onDismiss = { amountFor = null },
            onConfirm = { amount ->
                amountFor = null
                chosen = chosen + MealItem(product.id, product, amount)
            },
        )
    }

    val index = editingIndex
    if (index != null && index in chosen.indices) {
        val item = chosen[index]
        AmountDialog(
            title = item.name,
            subtitle = "Nu ${item.amountLabel} · ${item.kcal} kcal",
            unitLabel = if (item.product?.perPiece == true) (item.product.pieceLabel ?: "stuk") else "gram",
            perPiece = item.product?.perPiece == true,
            initial = item.amount,
            preview = null,
            onDismiss = { editingIndex = null },
            onConfirm = { amount ->
                editingIndex = null
                chosen = chosen.toMutableList().also { it[index] = item.copy(amount = amount) }
            },
        )
    }

    if (confirmDelete && onDelete != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            containerColor = Surface1,
            title = { Text("Maaltijd verwijderen?", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
            text = {
                Text(
                    text = "De maaltijd verdwijnt uit je lijst. Wat je er eerder mee " +
                        "gelogd hebt blijft gewoon staan.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    onDelete()
                }) { Text("Verwijderen", color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) { Text("Annuleren", color = TextSecondary) }
            },
        )
    }
}

/** Zoeklijstje binnen de maaltijd-editor; kiezen opent het hoeveelheidvenster. */
@Composable
private fun MealProductSearch(products: List<Product>, onPick: (Product) -> Unit) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(products, query) {
        if (query.isBlank()) products
        else products.filter { it.fullName.contains(query.trim(), ignoreCase = true) }
    }

    DarkField(
        value = query,
        onValueChange = { query = it },
        label = "Zoeken",
        leading = PhosphorIcons.Fill.MagnifyingGlass,
    )
    Spacer(Modifier.height(12.dp))
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 40.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        if (filtered.isEmpty()) {
            item {
                Text(
                    text = "Geen product gevonden. Maak hem eerst aan bij Loggen → " +
                        "Producten → Nieuw product.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
            }
        }
        items(filtered, key = { it.id }) { product ->
            val shape = RoundedCornerShape(14.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(shape)
                    .background(Surface2)
                    .clickable { onPick(product) }
                    .padding(14.dp),
            ) {
                Text(product.fullName, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                Text(
                    text = product.perUnitLabel(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextTertiary,
                )
            }
        }
    }
}

@Composable
private fun AmountDialog(
    title: String,
    subtitle: String,
    unitLabel: String,
    perPiece: Boolean,
    initial: Double,
    preview: ((Double) -> String)?,
    moment: Moment? = null,
    onMoment: ((Moment) -> Unit)? = null,
    onDismiss: () -> Unit,
    onConfirm: (Double) -> Unit,
) {
    var text by remember { mutableStateOf(formatAmount(initial)) }
    val amount = parseAmount(text)
    val quick = if (perPiece) listOf(1.0, 2.0, 3.0, 4.0) else listOf(50.0, 100.0, 150.0, 250.0)

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = { Text(title, style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
                DarkField(
                    value = text,
                    onValueChange = { input -> text = input.filter { it.isDigit() || it == ',' || it == '.' }.take(6) },
                    label = "Hoeveel $unitLabel?",
                    number = true,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    quick.forEach { option ->
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Surface2)
                                .border(1.dp, Hairline, RoundedCornerShape(12.dp))
                                .clickable { text = formatAmount(option) }
                                .padding(vertical = 10.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = formatAmount(option),
                                style = MaterialTheme.typography.labelLarge,
                                color = TextPrimary,
                            )
                        }
                    }
                }
                if (moment != null && onMoment != null) {
                    PillTabs(
                        options = Moment.entries.map { it.label },
                        selectedIndex = Moment.entries.indexOf(moment),
                        onSelect = { onMoment(Moment.entries[it]) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                if (preview != null && amount != null && amount > 0.0) {
                    Text(
                        text = preview(amount),
                        style = MaterialTheme.typography.titleMedium,
                        color = Accent,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { amount?.let(onConfirm) },
                enabled = amount != null && amount > 0.0,
            ) { Text("Opslaan", color = Accent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

@Composable
private fun ProductDialog(
    existing: Product?,
    draft: ProductDraft,
    onDismiss: () -> Unit,
    onSave: (ProductDraft) -> Unit,
    onDelete: (() -> Unit)?,
) {
    var name by remember { mutableStateOf(draft.name) }
    var brand by remember { mutableStateOf(draft.brand ?: "") }
    var perPiece by remember { mutableStateOf(draft.serving == Serving.PIECE) }
    var pieceLabel by remember { mutableStateOf(draft.pieceLabel ?: "stuk") }
    var kcal by remember { mutableStateOf(draft.kcal.takeIf { it > 0.0 }?.let(::formatAmount) ?: "") }
    var protein by remember { mutableStateOf(draft.protein.takeIf { it > 0.0 }?.let(::formatAmount) ?: "") }
    var carbs by remember { mutableStateOf(draft.carbs.takeIf { it > 0.0 }?.let(::formatAmount) ?: "") }
    var fat by remember { mutableStateOf(draft.fat.takeIf { it > 0.0 }?.let(::formatAmount) ?: "") }

    val kcalValue = parseAmount(kcal)
    val perLabel = if (perPiece) "per ${pieceLabel.ifBlank { "stuk" }}" else "per 100 gram"

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = {
            Text(
                text = if (existing == null) "Nieuw product" else "Product aanpassen",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
            )
        },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (draft.barcode != null) {
                    Text(
                        text = "Streepjescode ${draft.barcode}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                }
                DarkField(name, { name = it }, "Naam (bijv. Griekse yoghurt)")
                DarkField(brand, { brand = it }, "Merk of winkel (mag leeg)")
                PillTabs(
                    options = listOf("Per 100 gram", "Per stuk"),
                    selectedIndex = if (perPiece) 1 else 0,
                    onSelect = { perPiece = it == 1 },
                    modifier = Modifier.fillMaxWidth(),
                )
                if (perPiece) {
                    DarkField(pieceLabel, { pieceLabel = it }, "Wat is één stuk? (ei, snee, schep)")
                }
                NumberField(kcal, { kcal = it }, "kcal $perLabel")
                NumberField(protein, { protein = it }, "eiwit in gram $perLabel")
                NumberField(carbs, { carbs = it }, "koolhydraten in gram $perLabel")
                NumberField(fat, { fat = it }, "vet in gram $perLabel")
                if (onDelete != null) {
                    Text(
                        text = "Product verwijderen",
                        style = MaterialTheme.typography.labelLarge,
                        color = Danger,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable(onClick = onDelete)
                            .padding(vertical = 6.dp),
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    onSave(
                        ProductDraft(
                            name = name,
                            brand = brand.ifBlank { null },
                            serving = if (perPiece) Serving.PIECE else Serving.PER_100G,
                            pieceLabel = if (perPiece) pieceLabel else null,
                            kcal = kcalValue ?: 0.0,
                            protein = parseAmount(protein) ?: 0.0,
                            carbs = parseAmount(carbs) ?: 0.0,
                            fat = parseAmount(fat) ?: 0.0,
                            barcode = draft.barcode,
                        )
                    )
                },
                enabled = name.isNotBlank() && kcalValue != null,
            ) { Text(if (existing == null) "Toevoegen" else "Opslaan", color = Accent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

@Composable
private fun TargetsDialog(
    targets: NutritionTargets,
    onDismiss: () -> Unit,
    onSave: (NutritionTargets) -> Unit,
) {
    var kcal by remember { mutableStateOf(targets.kcal.toString()) }
    var protein by remember { mutableStateOf(targets.protein.toString()) }
    var carbs by remember { mutableStateOf(targets.carbs.toString()) }
    var fat by remember { mutableStateOf(targets.fat.toString()) }
    var water by remember { mutableStateOf(targets.waterMl.toString()) }

    val result = NutritionTargets(
        kcal = kcal.toIntOrNull() ?: 0,
        protein = protein.toIntOrNull() ?: 0,
        carbs = carbs.toIntOrNull() ?: 0,
        fat = fat.toIntOrNull() ?: 0,
        waterMl = water.toIntOrNull() ?: 0,
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface1,
        title = { Text("Dagdoelen", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                NumberField(kcal, { kcal = it }, "kcal per dag")
                NumberField(protein, { protein = it }, "eiwit in gram")
                NumberField(carbs, { carbs = it }, "koolhydraten in gram")
                NumberField(fat, { fat = it }, "vet in gram")
                NumberField(water, { water = it }, "water in ml")
                Text(
                    text = "De macro's komen samen op ${result.kcalFromMacros} kcal.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (kotlin.math.abs(result.kcalFromMacros - result.kcal) <= 60) Accent else TextTertiary,
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSave(result) },
                enabled = result.kcal > 0,
            ) { Text("Opslaan", color = Accent) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) }
        },
    )
}

// ---------------------------------------------------------------------
// Scannen
// ---------------------------------------------------------------------

@Composable
private fun ScanDialogs(
    scan: ScanState?,
    onDismiss: () -> Unit,
    onAmount: (Product) -> Unit,
    onManual: (String) -> Unit,
    onRescan: () -> Unit,
) {
    when (scan) {
        null -> Unit

        is ScanState.Searching -> AlertDialog(
            onDismissRequest = onDismiss,
            containerColor = Surface1,
            title = { Text("Code ${scan.barcode}", style = MaterialTheme.typography.titleLarge, color = TextPrimary) },
            text = {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    CircularProgressIndicator(color = Accent, strokeWidth = 3.dp, modifier = Modifier.size(22.dp))
                    Text("Opzoeken…", style = MaterialTheme.typography.bodyLarge, color = TextSecondary)
                }
            },
            confirmButton = { TextButton(onClick = onDismiss) { Text("Annuleren", color = TextSecondary) } },
        )

        is ScanState.Found -> {
            // De vondst gaat rechtstreeks door naar het hoeveelheid-venster.
            androidx.compose.runtime.LaunchedEffect(scan.product.id) { onAmount(scan.product) }
        }

        is ScanState.NotFound -> AlertDialog(
            onDismissRequest = onDismiss,
            containerColor = Surface1,
            title = { Text("Niet gevonden", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
            text = {
                Text(
                    text = "Code ${scan.barcode} staat niet in Open Food Facts. Vul de waarden " +
                        "van de verpakking zelf in; de volgende scan herkent hem meteen.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
            },
            confirmButton = { TextButton(onClick = { onManual(scan.barcode) }) { Text("Zelf invullen", color = Accent) } },
            dismissButton = { TextButton(onClick = onDismiss) { Text("Sluiten", color = TextSecondary) } },
        )

        is ScanState.Failed -> AlertDialog(
            onDismissRequest = onDismiss,
            containerColor = Surface1,
            title = { Text("Opzoeken mislukt", style = MaterialTheme.typography.headlineMedium, color = TextPrimary) },
            text = {
                Text(
                    text = "${scan.message}\n\nControleer je internetverbinding, of vul het " +
                        "product zelf in.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
            },
            confirmButton = { TextButton(onClick = onRescan) { Text("Opnieuw scannen", color = Accent) } },
            dismissButton = { TextButton(onClick = { onManual(scan.barcode) }) { Text("Zelf invullen", color = TextSecondary) } },
        )
    }
}

// ---------------------------------------------------------------------
// De AI die met je meekijkt
// ---------------------------------------------------------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun VisionSheet(
    vision: VisionState,
    moment: Moment,
    hasApiKey: Boolean,
    onRetryHint: (String) -> Unit,
    onConfirm: (List<VisionItem>) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Surface1,
    ) {
        Column(modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Icon(PhosphorIcons.Fill.Sparkle, contentDescription = null, tint = Accent, modifier = Modifier.size(22.dp))
                Text("Wat ligt er op je bord?", style = MaterialTheme.typography.headlineMedium, color = TextPrimary)
            }
            Spacer(Modifier.height(14.dp))

            when (vision) {
                VisionState.Working -> Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.padding(vertical = 24.dp),
                ) {
                    CircularProgressIndicator(color = Accent, strokeWidth = 3.dp, modifier = Modifier.size(24.dp))
                    Text(
                        text = "De AI bekijkt de foto…",
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextSecondary,
                    )
                }

                is VisionState.Failed -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(vision.message, style = MaterialTheme.typography.bodyLarge, color = TextSecondary)
                    if (!hasApiKey) {
                        Text(
                            text = "Vul eerst een Gemini API-sleutel in bij Instellingen → " +
                                "Fotoherkenning. Zonder sleutel kan de app geen foto's laten beoordelen.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextTertiary,
                        )
                    }
                    SecondaryButton(text = "Sluiten", onClick = onDismiss)
                }

                is VisionState.Ready -> VisionReview(
                    result = vision,
                    moment = moment,
                    onRetryHint = onRetryHint,
                    onConfirm = onConfirm,
                    onDismiss = onDismiss,
                )
            }
        }
    }
}

@Composable
private fun VisionReview(
    result: VisionState.Ready,
    moment: Moment,
    onRetryHint: (String) -> Unit,
    onConfirm: (List<VisionItem>) -> Unit,
    onDismiss: () -> Unit,
) {
    // Bij een nieuw antwoord begint de selectie weer vers.
    var items by remember(result) { mutableStateOf(result.items) }
    var included by remember(result) { mutableStateOf(result.items.map { true }) }
    var hint by remember(result) { mutableStateOf("") }
    var editing by remember(result) { mutableStateOf<Int?>(null) }

    val chosen = items.filterIndexed { index, _ -> included.getOrElse(index) { false } }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (result.note != null) {
            Text(result.note, style = MaterialTheme.typography.bodyMedium, color = TextTertiary)
        }

        if (items.isEmpty()) {
            Text(
                text = "Er is geen eten herkend op deze foto.",
                style = MaterialTheme.typography.bodyLarge,
                color = TextSecondary,
            )
        }

        items.forEachIndexed { index, item ->
            val on = included.getOrElse(index) { false }
            val shape = RoundedCornerShape(14.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(shape)
                    .background(Surface2)
                    .border(1.dp, if (on) Hairline else Color.Transparent, shape)
                    .clickable { included = included.toMutableList().also { it[index] = !on } }
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                FillCircle(checked = on)
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = if (on) TextPrimary else TextTertiary,
                    )
                    Text(
                        text = "${formatAmount(item.grams)} g · ${item.kcal} kcal · " +
                            "${item.protein}g E · ${item.carbs}g K · ${item.fat}g V",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextTertiary,
                    )
                    if (item.confidence != null && item.confidence != "hoog") {
                        Text(
                            text = "schatting: ${item.confidence}",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextTertiary,
                        )
                    }
                }
                Icon(
                    imageVector = PhosphorIcons.Fill.PencilSimple,
                    contentDescription = "Hoeveelheid aanpassen",
                    tint = TextTertiary,
                    modifier = Modifier
                        .size(30.dp)
                        .clip(RoundedCornerShape(50))
                        .clickable { editing = index }
                        .padding(7.dp),
                )
            }
        }

        Spacer(Modifier.height(2.dp))
        DarkField(
            value = hint,
            onValueChange = { hint = it },
            label = "Klopt er iets niet? Vertel het kort",
        )
        SecondaryButton(
            text = "Opnieuw laten bekijken",
            icon = PhosphorIcons.Fill.Sparkle,
            onClick = { onRetryHint(hint) },
        )

        Spacer(Modifier.height(4.dp))
        BigActionButton(
            text = if (chosen.isEmpty()) "Niets kiezen" else "${chosen.size} × naar ${moment.label.lowercase()}",
            icon = PhosphorIcons.Fill.Plus,
            enabled = chosen.isNotEmpty(),
            onClick = { onConfirm(chosen) },
        )
        Text(
            text = "Annuleren",
            style = MaterialTheme.typography.labelLarge,
            color = TextSecondary,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .clip(RoundedCornerShape(10.dp))
                .clickable(onClick = onDismiss)
                .padding(10.dp),
        )
    }

    val index = editing
    if (index != null && index in items.indices) {
        val item = items[index]
        AmountDialog(
            title = item.name,
            subtitle = "Nu ${formatAmount(item.grams)} g · ${item.kcal} kcal",
            unitLabel = "gram",
            perPiece = false,
            initial = item.grams,
            preview = null,
            onDismiss = { editing = null },
            onConfirm = { grams ->
                editing = null
                items = items.toMutableList().also { it[index] = item.scaledTo(grams) }
            },
        )
    }
}

/** De macro's meeschalen als je de geschatte portie bijstelt. */
private fun VisionItem.scaledTo(grams: Double): VisionItem {
    if (this.grams <= 0.0 || grams <= 0.0) return copy(grams = grams)
    val factor = grams / this.grams
    return copy(
        grams = grams,
        kcal = (kcal * factor).roundToInt(),
        protein = (protein * factor).roundToInt(),
        carbs = (carbs * factor).roundToInt(),
        fat = (fat * factor).roundToInt(),
    )
}

// ---------------------------------------------------------------------
// Kleine bouwstenen
// ---------------------------------------------------------------------

@Composable
private fun FullScreenDialog(onDismiss: () -> Unit, content: @Composable () -> Unit) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Box(modifier = Modifier.fillMaxSize()) { content() }
    }
}

@Composable
internal fun NumberField(value: String, onValueChange: (String) -> Unit, label: String) {
    DarkField(
        value = value,
        onValueChange = { input -> onValueChange(input.filter { it.isDigit() || it == ',' || it == '.' }.take(6)) },
        label = label,
        number = true,
    )
}

@Composable
internal fun DarkField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    number: Boolean = false,
    leading: androidx.compose.ui.graphics.vector.ImageVector? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        singleLine = true,
        label = { Text(label, color = TextTertiary) },
        leadingIcon = leading?.let {
            {
                Icon(it, contentDescription = null, tint = TextTertiary, modifier = Modifier.size(18.dp))
            }
        },
        keyboardOptions = KeyboardOptions(
            keyboardType = if (number) KeyboardType.Decimal else KeyboardType.Text,
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

/** Het product als bewerkbaar formulier. */
private fun Product.toDraft() = ProductDraft(
    name = name,
    brand = brand,
    serving = serving,
    pieceLabel = pieceLabel,
    kcal = kcal,
    protein = protein,
    carbs = carbs,
    fat = fat,
    barcode = barcode,
)

/** "4,5" en "4.5" zijn allebei prima. */
internal fun parseAmount(text: String): Double? = text.replace(',', '.').toDoubleOrNull()
