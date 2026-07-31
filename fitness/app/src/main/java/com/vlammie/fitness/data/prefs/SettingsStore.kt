package com.vlammie.fitness.data.prefs

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.vlammie.fitness.data.model.Route
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "settings")

class SettingsStore(private val context: Context) {

    private val routeKey = stringPreferencesKey("route")
    private val soundKey = booleanPreferencesKey("rest_sound")

    val route: Flow<Route> = context.dataStore.data.map { prefs ->
        Route.entries.firstOrNull { it.key == prefs[routeKey] } ?: Route.A
    }

    /** Trilsignaal wanneer de pauze afloopt. */
    val restFeedback: Flow<Boolean> = context.dataStore.data.map { it[soundKey] ?: true }

    suspend fun setRoute(route: Route) {
        context.dataStore.edit { it[routeKey] = route.key }
    }

    suspend fun setRestFeedback(enabled: Boolean) {
        context.dataStore.edit { it[soundKey] = enabled }
    }
}
