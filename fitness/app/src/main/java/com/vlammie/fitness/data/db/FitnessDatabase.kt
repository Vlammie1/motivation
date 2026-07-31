package com.vlammie.fitness.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        SessionEntity::class,
        SetLogEntity::class,
        ExerciseCheckEntity::class,
        MealLogEntity::class,
        ExtraFoodEntity::class,
        WaterEntity::class,
        WeighInEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
abstract class FitnessDatabase : RoomDatabase() {

    abstract fun sessionDao(): SessionDao
    abstract fun setLogDao(): SetLogDao
    abstract fun checklistDao(): ChecklistDao
    abstract fun nutritionDao(): NutritionDao

    companion object {
        @Volatile
        private var instance: FitnessDatabase? = null

        fun get(context: Context): FitnessDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                FitnessDatabase::class.java,
                "fitness.db",
            ).build().also { instance = it }
        }
    }
}
