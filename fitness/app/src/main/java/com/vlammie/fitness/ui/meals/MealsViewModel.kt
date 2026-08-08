package com.vlammie.fitness.ui.meals

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.vlammie.fitness.FitnessApplication
import com.vlammie.fitness.data.model.FoodEntry
import com.vlammie.fitness.data.model.Meal
import com.vlammie.fitness.data.model.MealItem
import com.vlammie.fitness.data.model.Moment
import com.vlammie.fitness.data.model.NutritionTargets
import com.vlammie.fitness.data.model.Product
import com.vlammie.fitness.data.model.ProductDraft
import com.vlammie.fitness.data.model.Serving
import com.vlammie.fitness.data.net.FoodVision
import com.vlammie.fitness.data.net.VisionItem
import com.vlammie.fitness.data.repo.FitnessRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime

/** Wat er gebeurt nadat je een streepjescode voor de camera hebt gehouden. */
sealed interface ScanState {
    /** De code is gelezen, we zoeken hem op. */
    data class Searching(val barcode: String) : ScanState

    /** Gevonden — [fromWeb] is waar als het product net uit Open Food Facts kwam. */
    data class Found(val product: Product, val fromWeb: Boolean) : ScanState

    data class NotFound(val barcode: String) : ScanState

    data class Failed(val barcode: String, val message: String) : ScanState
}

/** Wat er gebeurt nadat je een foto van je eten hebt gemaakt. */
sealed interface VisionState {
    data object Working : VisionState

    data class Ready(val items: List<VisionItem>, val note: String?) : VisionState

    data class Failed(val message: String) : VisionState
}

/** De losse schermtoestand die niet uit de database komt. */
private data class LocalState(
    val moment: Moment = Moment.forHour(LocalTime.now().hour),
    val scan: ScanState? = null,
    val vision: VisionState? = null,
)

data class MealsUiState(
    val date: LocalDate = LocalDate.now(),
    val entries: List<FoodEntry> = emptyList(),
    val products: List<Product> = emptyList(),
    val meals: List<Meal> = emptyList(),
    val waterMl: Int = 0,
    val targets: NutritionTargets = NutritionTargets(),
    val moment: Moment = Moment.SNACK,
    val scan: ScanState? = null,
    val vision: VisionState? = null,
    /** Zonder sleutel heeft de fotoknop geen zin; dan wijzen we naar de instellingen. */
    val hasApiKey: Boolean = false,
) {
    val kcal: Int get() = entries.sumOf { it.kcal }
    val protein: Int get() = entries.sumOf { it.protein }
    val carbs: Int get() = entries.sumOf { it.carbs }
    val fat: Int get() = entries.sumOf { it.fat }
    val isToday: Boolean get() = date == LocalDate.now()

    /** Wat er nog aan kcal over is voor vandaag; nooit onder nul. */
    val kcalLeft: Int get() = (targets.kcal - kcal).coerceAtLeast(0)

    /** Het dagboek gegroepeerd per eetmoment, in de volgorde van de dag. */
    val byMoment: List<Pair<Moment, List<FoodEntry>>>
        get() = Moment.entries.map { moment -> moment to entries.filter { it.moment == moment } }
}

@OptIn(ExperimentalCoroutinesApi::class)
class MealsViewModel(private val repo: FitnessRepository) : ViewModel() {

    private val dateFlow = MutableStateFlow(LocalDate.now())
    private val local = MutableStateFlow(LocalState())

    /** De laatste foto blijft bewaard zodat je hem met een hint opnieuw kunt laten bekijken. */
    private var lastPhoto: ByteArray? = null

    private val dayFlow = dateFlow.flatMapLatest { date ->
        combine(repo.foodOn(date), repo.waterOn(date)) { entries, water ->
            Triple(date, entries, water?.ml ?: 0)
        }
    }

    /** Producten en maaltijden horen bij elkaar; samen tellen ze als één bron. */
    private val libraryFlow = combine(repo.products, repo.meals) { products, meals -> products to meals }

    val state = combine(
        dayFlow,
        libraryFlow,
        repo.settings.targets,
        repo.settings.apiKey,
        local,
    ) { day, library, targets, apiKey, localState ->
        MealsUiState(
            date = day.first,
            entries = day.second,
            products = library.first,
            meals = library.second,
            waterMl = day.third,
            targets = targets,
            moment = localState.moment,
            scan = localState.scan,
            vision = localState.vision,
            hasApiKey = apiKey.isNotBlank(),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MealsUiState())

    fun shiftDate(days: Long) {
        val next = dateFlow.value.plusDays(days)
        if (!next.isAfter(LocalDate.now())) dateFlow.value = next
    }

    fun setMoment(moment: Moment) = local.update { it.copy(moment = moment) }

    fun addWater(ml: Int) {
        viewModelScope.launch {
            val current = state.value.waterMl
            repo.setWater(dateFlow.value, current + ml)
        }
    }

    fun setTargets(targets: NutritionTargets) {
        viewModelScope.launch { repo.settings.setTargets(targets) }
    }

    // ---- dagboek --------------------------------------------------------

    /** Zoveel gram (of zoveel stuks) van een product op de gekozen dag zetten. */
    fun logFood(product: Product, amount: Double) {
        if (amount <= 0.0) return
        viewModelScope.launch { repo.logFood(dateFlow.value, product, amount, local.value.moment) }
    }

    /** Nieuw product aanmaken én meteen loggen. */
    fun createAndLog(draft: ProductDraft, amount: Double) {
        viewModelScope.launch {
            val product = repo.addProduct(draft)
            if (amount > 0.0) repo.logFood(dateFlow.value, product, amount, local.value.moment)
        }
    }

    fun saveProduct(product: Product) {
        viewModelScope.launch { repo.updateProduct(product) }
    }

    fun deleteProduct(id: Long) {
        viewModelScope.launch { repo.deleteProduct(id) }
    }

    // ---- vaste maaltijden ------------------------------------------------

    /** Een maaltijd in één keer op de gekozen dag zetten. */
    fun logMeal(meal: Meal) {
        if (meal.items.none { it.product != null }) return
        viewModelScope.launch { repo.logMeal(dateFlow.value, meal, local.value.moment) }
    }

    fun saveMeal(id: Long?, name: String, items: List<MealItem>) {
        if (name.isBlank()) return
        viewModelScope.launch { repo.saveMeal(id, name, items) }
    }

    fun deleteMeal(id: Long) {
        viewModelScope.launch { repo.deleteMeal(id) }
    }

    fun updateAmount(entryId: Long, amount: Double) {
        if (amount <= 0.0) return
        viewModelScope.launch { repo.updateFoodAmount(entryId, amount) }
    }

    fun moveEntry(entryId: Long, moment: Moment) {
        viewModelScope.launch { repo.moveFood(entryId, moment) }
    }

    fun removeEntry(id: Long) {
        viewModelScope.launch { repo.removeFood(id) }
    }

    // ---- scannen --------------------------------------------------------

    fun onBarcode(barcode: String) {
        if (local.value.scan != null) return
        local.update { it.copy(scan = ScanState.Searching(barcode)) }
        viewModelScope.launch {
            val known = repo.productByBarcode(barcode)
            val next = try {
                val product = known ?: repo.lookupBarcode(barcode)
                when {
                    product == null -> ScanState.NotFound(barcode)
                    else -> ScanState.Found(product, fromWeb = known == null)
                }
            } catch (error: Exception) {
                ScanState.Failed(barcode, error.message?.take(140) ?: "Opzoeken mislukt.")
            }
            local.update { it.copy(scan = next) }
        }
    }

    fun dismissScan() = local.update { it.copy(scan = null) }

    // ---- fotoherkenning --------------------------------------------------

    fun analysePhoto(jpeg: ByteArray) {
        lastPhoto = jpeg
        runVision(jpeg, hint = null)
    }

    /** Nog eens kijken, maar dan met een aanwijzing van jou erbij. */
    fun retryWithHint(hint: String) {
        val photo = lastPhoto ?: return
        runVision(photo, hint)
    }

    private fun runVision(jpeg: ByteArray, hint: String?) {
        local.update { it.copy(vision = VisionState.Working) }
        viewModelScope.launch {
            val next = try {
                val key = repo.settings.apiKey.first()
                val result = FoodVision.analyse(jpeg, key, hint)
                VisionState.Ready(result.items, result.note)
            } catch (error: Exception) {
                VisionState.Failed(error.message ?: "De AI kon de foto niet beoordelen.")
            }
            local.update { it.copy(vision = next) }
        }
    }

    /** De regels die je in het overzicht hebt laten staan in het dagboek zetten. */
    fun logVisionItems(items: List<VisionItem>) {
        val moment = local.value.moment
        val date = dateFlow.value
        viewModelScope.launch {
            items.forEach { item ->
                repo.logLoose(
                    date = date,
                    moment = moment,
                    name = item.name,
                    grams = item.grams,
                    kcal = item.kcal,
                    protein = item.protein,
                    carbs = item.carbs,
                    fat = item.fat,
                )
            }
            lastPhoto = null
            local.update { it.copy(vision = null) }
        }
    }

    fun dismissVision() {
        lastPhoto = null
        local.update { it.copy(vision = null) }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as FitnessApplication
                MealsViewModel(app.repository)
            }
        }
    }
}

/** Een leeg product met de juiste eenheid, klaar om in het formulier te vullen. */
fun emptyDraft(barcode: String? = null) = ProductDraft(
    name = "",
    brand = null,
    serving = Serving.PER_100G,
    pieceLabel = "stuk",
    kcal = 0.0,
    protein = 0.0,
    carbs = 0.0,
    fat = 0.0,
    barcode = barcode,
)
