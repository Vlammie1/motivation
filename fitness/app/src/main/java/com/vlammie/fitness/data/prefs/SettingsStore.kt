package com.vlammie.fitness.data.prefs

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.vlammie.fitness.BuildConfig
import com.vlammie.fitness.data.model.NutritionPlan
import com.vlammie.fitness.data.model.NutritionTargets
import com.vlammie.fitness.data.model.Route
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "settings")

class SettingsStore(private val context: Context) {

    private val routeKey = stringPreferencesKey("route")
    private val soundKey = booleanPreferencesKey("rest_sound")
    private val kcalKey = intPreferencesKey("target_kcal")
    private val proteinKey = intPreferencesKey("target_protein")
    private val carbsKey = intPreferencesKey("target_carbs")
    private val fatKey = intPreferencesKey("target_fat")
    private val waterKey = intPreferencesKey("target_water")
    private val apiKeyKey = stringPreferencesKey("gemini_api_key")

    val route: Flow<Route> = context.dataStore.data.map { prefs ->
        Route.entries.firstOrNull { it.key == prefs[routeKey] } ?: Route.A
    }

    /** Trilsignaal wanneer de pauze afloopt. */
    val restFeedback: Flow<Boolean> = context.dataStore.data.map { it[soundKey] ?: true }

    /** De dagdoelen voor kcal, macro's en water. */
    val targets: Flow<NutritionTargets> = context.dataStore.data.map { prefs ->
        NutritionTargets(
            kcal = prefs[kcalKey] ?: NutritionPlan.KCAL_DEFAULT,
            protein = prefs[proteinKey] ?: NutritionPlan.PROTEIN_DEFAULT,
            carbs = prefs[carbsKey] ?: NutritionPlan.CARBS_DEFAULT,
            fat = prefs[fatKey] ?: NutritionPlan.FAT_DEFAULT,
            waterMl = prefs[waterKey] ?: NutritionPlan.WATER_DEFAULT_ML,
        )
    }

    /**
     * De sleutel voor de fotoherkenning. Zit er een sleutel in `local.properties`,
     * dan is die de standaard; wie hem in de app invult, overschrijft dat.
     */
    val apiKey: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[apiKeyKey]?.trim()?.ifBlank { null } ?: BuildConfig.GEMINI_API_KEY
    }

    suspend fun setRoute(route: Route) {
        context.dataStore.edit { it[routeKey] = route.key }
    }

    suspend fun setRestFeedback(enabled: Boolean) {
        context.dataStore.edit { it[soundKey] = enabled }
    }

    suspend fun setTargets(targets: NutritionTargets) {
        context.dataStore.edit { prefs ->
            prefs[kcalKey] = targets.kcal
            prefs[proteinKey] = targets.protein
            prefs[carbsKey] = targets.carbs
            prefs[fatKey] = targets.fat
            prefs[waterKey] = targets.waterMl
        }
    }

    suspend fun setApiKey(key: String) {
        context.dataStore.edit { prefs -> prefs[apiKeyKey] = key.trim() }
    }
}
