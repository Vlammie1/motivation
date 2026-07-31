package com.vlammie.fitness

import android.app.Application
import com.vlammie.fitness.data.db.FitnessDatabase
import com.vlammie.fitness.data.prefs.SettingsStore
import com.vlammie.fitness.data.repo.FitnessRepository

/**
 * Alles draait lokaal, dus de hele "dependency injection" is deze container:
 * één database, één settings-store, één repository.
 */
class FitnessApplication : Application() {

    val repository: FitnessRepository by lazy {
        FitnessRepository(FitnessDatabase.get(this), SettingsStore(this))
    }
}
