package com.vlammie.fitness.data.model

import kotlin.math.roundToInt

/**
 * Hoe een product geteld wordt: per 100 gram (of ml) of per stuk.
 *
 * Bij [PIECE] staat er in `pieceLabel` waar je er één van pakt — "ei", "snee",
 * "banaan" — zodat de invoer leest als "3 eieren" in plaats van "3 gram".
 */
enum class Serving { PER_100G, PIECE }

/** Het moment op de dag waarop een regel hoort; puur om het dagboek te ordenen. */
enum class Moment(val label: String) {
    BREAKFAST("Ontbijt"),
    LUNCH("Lunch"),
    DINNER("Avondeten"),
    SNACK("Snack");

    companion object {
        fun fromName(value: String?): Moment = entries.firstOrNull { it.name == value } ?: SNACK

        /** Het moment dat op dit uur het meest voor de hand ligt. */
        fun forHour(hour: Int): Moment = when (hour) {
            in 5..10 -> BREAKFAST
            in 11..14 -> LUNCH
            in 16..21 -> DINNER
            else -> SNACK
        }
    }
}

/** Een product zoals het in de kast staat, met de voedingswaarde per eenheid. */
data class Product(
    val id: Long,
    val name: String,
    val brand: String?,
    val serving: Serving,
    val pieceLabel: String?,
    /** kcal per 100 g bij [Serving.PER_100G], per stuk bij [Serving.PIECE]. */
    val kcal: Double,
    val protein: Double,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    /** De streepjescode waarmee dit product gescand is, als die er is. */
    val barcode: String? = null,
) {
    val perPiece: Boolean get() = serving == Serving.PIECE

    /** "AH · Griekse yoghurt" of gewoon de naam als er geen merk bij staat. */
    val fullName: String get() = if (brand.isNullOrBlank()) name else "$name · $brand"

    /** De eenheid waarin je de hoeveelheid invult. */
    val unitLabel: String get() = if (perPiece) (pieceLabel ?: "stuk") else "gram"

    /** "97 kcal · 4,0g eiwit per 100 g" — de regel onder de productnaam. */
    fun perUnitLabel(): String =
        "${formatAmount(kcal)} kcal · ${formatAmount(protein)}g eiwit per ${if (perPiece) unitLabel else "100 g"}"

    /** De standaardhoeveelheid die de invoervelden voorinvullen. */
    val defaultAmount: Double get() = if (perPiece) 1.0 else 100.0

    fun kcalFor(amount: Double): Int = (kcal * factor(amount)).roundToInt()

    fun proteinFor(amount: Double): Int = (protein * factor(amount)).roundToInt()

    fun carbsFor(amount: Double): Int = (carbs * factor(amount)).roundToInt()

    fun fatFor(amount: Double): Int = (fat * factor(amount)).roundToInt()

    private fun factor(amount: Double) = if (perPiece) amount else amount / 100.0
}

/** Eén regel in het dagboek: zoveel gram/stuks van een product. */
data class FoodEntry(
    val id: Long,
    val productId: Long?,
    val name: String,
    val amount: Double,
    val perPiece: Boolean,
    val pieceLabel: String?,
    val kcal: Int,
    val protein: Int,
    val carbs: Int = 0,
    val fat: Int = 0,
    val moment: Moment = Moment.SNACK,
) {
    /** "250 g" of "3 eieren". */
    val amountLabel: String
        get() = if (perPiece) {
            val label = pieceLabel ?: "stuk"
            "${formatAmount(amount)} ${if (amount == 1.0) label else plural(label)}"
        } else {
            "${formatAmount(amount)} g"
        }

    /** "31g E · 12g K · 5g V" — de macro's onder de regel. */
    val macroLabel: String get() = "${protein}g E · ${carbs}g K · ${fat}g V"
}

/**
 * Eén onderdeel van een vaste maaltijd: zoveel gram of stuks van een product.
 *
 * Het product hangt er los bij, zodat een maaltijd meteen meeverandert als je
 * de voedingswaarde van dat product later corrigeert. Is het product intussen
 * gewist, dan is [product] leeg en telt de regel nergens meer in mee.
 */
data class MealItem(
    val productId: Long,
    val product: Product?,
    val amount: Double,
) {
    val name: String get() = product?.fullName ?: "Gewist product"
    val kcal: Int get() = product?.kcalFor(amount) ?: 0
    val protein: Int get() = product?.proteinFor(amount) ?: 0
    val carbs: Int get() = product?.carbsFor(amount) ?: 0
    val fat: Int get() = product?.fatFor(amount) ?: 0

    /** "250 g" of "3 eieren". */
    val amountLabel: String
        get() = if (product?.perPiece == true) {
            val label = product.pieceLabel ?: "stuk"
            "${formatAmount(amount)} ${if (amount == 1.0) label else plural(label)}"
        } else {
            "${formatAmount(amount)} g"
        }
}

/** Een vaste verdeling van producten die je vaker eet, in één tik te loggen. */
data class Meal(
    val id: Long,
    val name: String,
    val items: List<MealItem>,
) {
    val kcal: Int get() = items.sumOf { it.kcal }
    val protein: Int get() = items.sumOf { it.protein }
    val carbs: Int get() = items.sumOf { it.carbs }
    val fat: Int get() = items.sumOf { it.fat }

    /** "3 producten · 620 kcal · 31g E" — de regel onder de naam. */
    val summary: String
        get() = if (items.isEmpty()) {
            "Nog geen producten"
        } else {
            "${items.size} ${if (items.size == 1) "product" else "producten"} · $kcal kcal · ${protein}g E"
        }
}

/** Hele getallen zonder komma, de rest met één decimaal: 4,5 — 250 — 97,5. */
fun formatAmount(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else "%.1f".format(value).replace('.', ',')

private fun plural(label: String): String = when {
    label.endsWith("s") || label.endsWith("x") -> label
    label.endsWith("ei") -> label + "eren"
    else -> label + "s"
}

/** Een product uit de startvoorraad, voordat het een id in de database heeft. */
data class ProductDraft(
    val name: String,
    val brand: String?,
    val serving: Serving,
    val pieceLabel: String?,
    val kcal: Double,
    val protein: Double,
    val carbs: Double = 0.0,
    val fat: Double = 0.0,
    val barcode: String? = null,
)

/**
 * De dagdoelen. Ze staan in de instellingen en zijn per persoon aan te passen;
 * [NutritionPlan] levert alleen de startwaarden.
 */
data class NutritionTargets(
    val kcal: Int = NutritionPlan.KCAL_DEFAULT,
    val protein: Int = NutritionPlan.PROTEIN_DEFAULT,
    val carbs: Int = NutritionPlan.CARBS_DEFAULT,
    val fat: Int = NutritionPlan.FAT_DEFAULT,
    val waterMl: Int = NutritionPlan.WATER_DEFAULT_ML,
) {
    /** kcal die de macrodoelen bij elkaar opleveren — 4/4/9 per gram. */
    val kcalFromMacros: Int get() = protein * 4 + carbs * 4 + fat * 9
}

object NutritionPlan {

    const val KCAL_DEFAULT = 2900
    const val PROTEIN_DEFAULT = 120
    const val CARBS_DEFAULT = 360
    const val FAT_DEFAULT = 90
    const val WATER_DEFAULT_ML = 3000

    /** Standaard hoeveelheid per tik op de waterknop. */
    const val GLASS_ML = 250

    /** De maten die het losse watervenster als snelkeuze aanbiedt. */
    val waterQuickMl = listOf(150, 200, 330, 500, 750)

    /**
     * De producten die bij een verse installatie klaarstaan, zodat je niet
     * eerst een half uur hoeft te typen. Alles is aan te passen of te wissen.
     */
    val starterProducts = listOf(
        piece("Ei", null, "ei", 78.0, 6.3, 0.6, 5.3),
        piece("Volkoren boterham", null, "snee", 90.0, 3.5, 15.0, 1.1),
        piece("Banaan", null, "banaan", 105.0, 1.3, 27.0, 0.4),
        piece("Appel", null, "appel", 95.0, 0.5, 25.0, 0.3),
        piece("Kaas jong belegen", null, "plak", 80.0, 5.5, 0.0, 6.5),
        piece("Rijstwafel", null, "rijstwafel", 35.0, 0.8, 7.3, 0.3),
        piece("Eiwitshake", null, "schep", 110.0, 24.0, 2.0, 1.0),
        grams("Havermout", null, 375.0, 13.5, 58.0, 7.0),
        grams("Volle melk", null, 64.0, 3.4, 4.6, 3.6),
        grams("Griekse yoghurt", "AH", 97.0, 4.0, 4.0, 7.0),
        grams("Magere kwark", null, 46.0, 9.0, 3.6, 0.2),
        grams("Pindakaas", null, 620.0, 25.0, 12.0, 52.0),
        grams("Gemengde noten", null, 607.0, 20.0, 21.0, 54.0),
        grams("Kipfilet", null, 165.0, 31.0, 0.0, 3.6),
        grams("Rundergehakt", null, 250.0, 26.0, 0.0, 17.0),
        grams("Zalm", null, 208.0, 20.0, 0.0, 13.0),
        grams("Rijst gekookt", null, 130.0, 2.7, 28.0, 0.3),
        grams("Pasta gekookt", null, 158.0, 5.8, 31.0, 0.9),
        grams("Aardappelen gekookt", null, 87.0, 2.0, 20.0, 0.1),
        grams("Olijfolie", null, 884.0, 0.0, 0.0, 100.0),
    )

    private fun grams(
        name: String,
        brand: String?,
        kcal: Double,
        protein: Double,
        carbs: Double,
        fat: Double,
    ) = ProductDraft(name, brand, Serving.PER_100G, null, kcal, protein, carbs, fat)

    private fun piece(
        name: String,
        brand: String?,
        label: String,
        kcal: Double,
        protein: Double,
        carbs: Double,
        fat: Double,
    ) = ProductDraft(name, brand, Serving.PIECE, label, kcal, protein, carbs, fat)
}
