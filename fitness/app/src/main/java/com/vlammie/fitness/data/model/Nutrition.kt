package com.vlammie.fitness.data.model

/** Eén vast moment uit het 3000-calorieënplan. */
data class Meal(
    val id: String,
    val time: String,
    val name: String,
    val kcal: Int,
    val protein: Int,
    val description: String,
)

object NutritionPlan {

    const val KCAL_MIN = 2800
    const val KCAL_MAX = 3000
    const val PROTEIN_MIN = 110
    const val PROTEIN_MAX = 130
    const val WATER_MIN_ML = 2500
    const val WATER_MAX_ML = 3000

    /** Standaard hoeveelheid per tik op de waterknop. */
    const val GLASS_ML = 250

    val meals = listOf(
        Meal(
            id = "ontbijt",
            time = "08:00",
            name = "Ontbijt",
            kcal = 800,
            protein = 30,
            description = "100g havermout + 300ml volle melk/yoghurt + 1 banaan + 2 grote eetlepels pindakaas",
        ),
        Meal(
            id = "tussendoor",
            time = "11:30",
            name = "Tussendoortje",
            kcal = 450,
            protein = 18,
            description = "2 volkoren boterhammen met royale laag pindakaas/kipfilet/kaas + handje noten",
        ),
        Meal(
            id = "lunch",
            time = "14:00",
            name = "Lunch",
            kcal = 550,
            protein = 30,
            description = "3-4 gebakken/gekookte eieren op 2-3 volkoren boterhammen + glas volle melk",
        ),
        Meal(
            id = "preworkout",
            time = "16:30",
            name = "Pre-workout snack",
            kcal = 200,
            protein = 3,
            description = "1 banaan of appel + 1 rijstwafel met jam/honing",
        ),
        Meal(
            id = "avondeten",
            time = "18:30",
            name = "Avondeten",
            kcal = 800,
            protein = 35,
            description = "Grote portie rijst/pasta/aardappelen + kip/gehakt/vis + groenten. Altijd 2x opscheppen!",
        ),
        Meal(
            id = "avondsnack",
            time = "21:30",
            name = "Avondsnack",
            kcal = 250,
            protein = 22,
            description = "250g Franse magere kwark of volle kwark met honing of noten",
        ),
    )

    fun meal(id: String): Meal? = meals.firstOrNull { it.id == id }
}
