package com.vlammie.fitness.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        SessionEntity::class,
        SetLogEntity::class,
        ExerciseCheckEntity::class,
        ProductEntity::class,
        FoodLogEntity::class,
        MealEntity::class,
        MealItemEntity::class,
        WaterEntity::class,
        WeighInEntity::class,
        WorkoutDayEntity::class,
        WorkoutExerciseEntity::class,
    ],
    version = 6,
    exportSchema = true,
)
abstract class FitnessDatabase : RoomDatabase() {

    abstract fun sessionDao(): SessionDao
    abstract fun setLogDao(): SetLogDao
    abstract fun checklistDao(): ChecklistDao
    abstract fun nutritionDao(): NutritionDao
    abstract fun workoutDao(): WorkoutDao

    companion object {
        @Volatile
        private var instance: FitnessDatabase? = null

        fun get(context: Context): FitnessDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                FitnessDatabase::class.java,
                "fitness.db",
            ).addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5, MIGRATION_5_6)
                .build().also { instance = it }
        }

        /**
         * Kilo's erbij.
         *
         * Oefeningen kunnen voortaan "met gewicht" zijn; bij elke gelogde set
         * hoort dan het aantal kg per dumbbell. Alles wat er al staat blijft
         * staan: oude sets houden geen gewicht en tellen gewoon door in de
         * grafiek. De dumbbell-oefeningen uit het standaardplan zetten we
         * meteen goed, ook als je ze intussen hernoemd hebt.
         */
        val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `set_logs` ADD COLUMN `weightKg` REAL")
                db.execSQL("ALTER TABLE `workout_exercises` ADD COLUMN `weighted` INTEGER NOT NULL DEFAULT 0")

                val ids = com.vlammie.fitness.data.model.Program.allExercises
                    .filter { it.weighted }
                    .joinToString(", ") { "'${it.id}'" }
                if (ids.isNotEmpty()) {
                    db.execSQL("UPDATE `workout_exercises` SET `weighted` = 1 WHERE `exerciseId` IN ($ids)")
                }
                db.execSQL(
                    "UPDATE `workout_exercises` SET `weighted` = 1 WHERE `name` LIKE '%dumbbell%'"
                )
            }
        }

        /**
         * De pauzes waren te kort om echt bij te komen: alles gaat maal twee.
         * Wie hem daarna nog te lang vindt, zet hem in de workout-editor terug.
         */
        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("UPDATE `workout_exercises` SET `restSeconds` = `restSeconds` * 2")
            }
        }

        /**
         * Vaste maaltijden erbij: een naam met daaronder de producten en de
         * hoeveelheden die je normaal van dat gerecht eet.
         */
        val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `meals` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `name` TEXT NOT NULL,
                        `lastUsedAt` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `meal_items` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `mealId` INTEGER NOT NULL,
                        `productId` INTEGER NOT NULL,
                        `amount` REAL NOT NULL,
                        `sortIndex` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_meal_items_mealId` ON `meal_items` (`mealId`)")
            }
        }

        /**
         * Van "kcal en eiwit" naar een volwaardige caloriemeter.
         *
         * Producten krijgen koolhydraten, vetten en een streepjescode; het
         * dagboek krijgt dezelfde macro's plus het eetmoment. Alles wat er al
         * stond blijft staan en telt gewoon door.
         */
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE `products` ADD COLUMN `carbs` REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `products` ADD COLUMN `fat` REAL NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `products` ADD COLUMN `barcode` TEXT")
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_products_barcode` ON `products` (`barcode`)")

                db.execSQL("ALTER TABLE `food_logs` ADD COLUMN `carbs` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `food_logs` ADD COLUMN `fat` INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE `food_logs` ADD COLUMN `moment` TEXT NOT NULL DEFAULT 'SNACK'")
            }
        }

        /**
         * Van afvinken naar loggen.
         *
         * De vaste eetmomenten en de losse extra's worden allebei gewone regels
         * in het nieuwe dagboek, zodat je oude dagen blijven kloppen. Daarnaast
         * komen de tabellen erbij waarin je eigen producten en workouts staan.
         */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `products` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `name` TEXT NOT NULL,
                        `brand` TEXT,
                        `perPiece` INTEGER NOT NULL,
                        `pieceLabel` TEXT,
                        `kcal` REAL NOT NULL,
                        `protein` REAL NOT NULL,
                        `lastUsedAt` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `food_logs` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `date` INTEGER NOT NULL,
                        `productId` INTEGER,
                        `name` TEXT NOT NULL,
                        `amount` REAL NOT NULL,
                        `perPiece` INTEGER NOT NULL,
                        `pieceLabel` TEXT,
                        `kcal` INTEGER NOT NULL,
                        `protein` INTEGER NOT NULL,
                        `loggedAt` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_food_logs_date` ON `food_logs` (`date`)")

                db.execSQL(
                    """
                    INSERT INTO `food_logs` (`date`, `productId`, `name`, `amount`, `perPiece`, `pieceLabel`, `kcal`, `protein`, `loggedAt`)
                    SELECT `date`, NULL, `name`, 1.0, 1, 'portie', `kcal`, `protein`, 0 FROM `extra_food`
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    INSERT INTO `food_logs` (`date`, `productId`, `name`, `amount`, `perPiece`, `pieceLabel`, `kcal`, `protein`, `loggedAt`)
                    SELECT `date`, NULL, `mealId`, 1.0, 1, 'portie', `kcal`, `protein`, 0 FROM `meal_logs`
                    """.trimIndent()
                )
                db.execSQL("DROP TABLE `extra_food`")
                db.execSQL("DROP TABLE `meal_logs`")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `workout_days` (
                        `id` TEXT NOT NULL,
                        `routeKey` TEXT NOT NULL,
                        `title` TEXT NOT NULL,
                        `focus` TEXT NOT NULL,
                        `weekday` INTEGER,
                        `sortIndex` INTEGER NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `workout_exercises` (
                        `rowId` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `dayId` TEXT NOT NULL,
                        `exerciseId` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `hint` TEXT,
                        `sets` INTEGER NOT NULL,
                        `unit` TEXT NOT NULL,
                        `min` INTEGER NOT NULL,
                        `max` INTEGER NOT NULL,
                        `amrap` INTEGER NOT NULL,
                        `perSide` INTEGER NOT NULL,
                        `restSeconds` INTEGER NOT NULL,
                        `sortIndex` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    "CREATE INDEX IF NOT EXISTS `index_workout_exercises_dayId` ON `workout_exercises` (`dayId`)"
                )
            }
        }
    }
}
