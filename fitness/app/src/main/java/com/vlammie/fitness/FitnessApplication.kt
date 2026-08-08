package com.vlammie.fitness

import android.app.Application
import com.vlammie.fitness.data.db.FitnessDatabase
import com.vlammie.fitness.data.prefs.SettingsStore
import com.vlammie.fitness.data.repo.FitnessRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Alles draait lokaal, dus de hele "dependency injection" is deze container:
 * één database, één settings-store, één repository.
 */
class FitnessApplication : Application() {

    val repository: FitnessRepository by lazy {
        FitnessRepository(FitnessDatabase.get(this), SettingsStore(this))
    }

    override fun onCreate() {
        super.onCreate()
        // Bij een verse installatie het standaardplan en de basisproducten klaarzetten.
        // Gaat dat mis, dan mag dat de app niet onderuit halen: de schermen werken
        // ook met een lege lijst en de volgende start probeert het opnieuw.
        CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
            runCatching { repository.seedIfEmpty() }
        }
    }
}
