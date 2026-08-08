package com.vlammie.fitness.data.net

import com.vlammie.fitness.data.model.ProductDraft
import com.vlammie.fitness.data.model.Serving
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

/**
 * De streepjescode opzoeken in Open Food Facts — een open database zonder
 * sleutel of account. Levert de waarden per 100 gram terug; ontbreekt het
 * product, dan komt er `null` uit en typ je het zelf.
 */
object OpenFoodFacts {

    private const val USER_AGENT = "VlammieFitness/1.0 (Android; persoonlijke app)"

    private const val FIELDS =
        "product_name,product_name_nl,generic_name,brands,quantity,serving_quantity,nutriments"

    suspend fun lookup(barcode: String): ProductDraft? = withContext(Dispatchers.IO) {
        val url = "https://world.openfoodfacts.org/api/v2/product/$barcode.json?fields=$FIELDS"
        val json = JSONObject(Http.get(url, USER_AGENT))
        if (json.optInt("status", 0) != 1) return@withContext null

        val product = json.optJSONObject("product") ?: return@withContext null
        val name = product.firstNonBlank("product_name_nl", "product_name", "generic_name")
            ?: return@withContext null
        val nutriments = product.optJSONObject("nutriments") ?: JSONObject()

        val kcal = nutriments.energyKcalPer100g() ?: return@withContext null

        ProductDraft(
            name = name.trim().take(60),
            brand = product.firstNonBlank("brands")?.split(',')?.first()?.trim()?.take(40),
            serving = Serving.PER_100G,
            pieceLabel = null,
            kcal = kcal,
            protein = nutriments.per100g("proteins"),
            carbs = nutriments.per100g("carbohydrates"),
            fat = nutriments.per100g("fat"),
            barcode = barcode,
        )
    }

    /** Open Food Facts levert kcal soms alleen als kJ; dan rekenen we het om. */
    private fun JSONObject.energyKcalPer100g(): Double? {
        val kcal = optDouble("energy-kcal_100g", Double.NaN)
        if (!kcal.isNaN() && kcal > 0.0) return kcal
        val kj = optDouble("energy-kj_100g", optDouble("energy_100g", Double.NaN))
        return if (!kj.isNaN() && kj > 0.0) kj / 4.184 else null
    }

    private fun JSONObject.per100g(key: String): Double {
        val value = optDouble("${key}_100g", Double.NaN)
        return if (value.isNaN() || value < 0.0) 0.0 else value
    }

    private fun JSONObject.firstNonBlank(vararg keys: String): String? =
        keys.firstNotNullOfOrNull { key -> optString(key).takeIf { it.isNotBlank() } }
}
