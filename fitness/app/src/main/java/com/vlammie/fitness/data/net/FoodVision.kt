package com.vlammie.fitness.data.net

import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.roundToInt

/** Eén herkend gerecht op de foto, met de geschatte voedingswaarde. */
data class VisionItem(
    val name: String,
    val grams: Double,
    val kcal: Int,
    val protein: Int,
    val carbs: Int,
    val fat: Int,
    /** "hoog", "gemiddeld" of "laag" — hoe zeker het model van de schatting is. */
    val confidence: String?,
)

/** Wat er uit één foto komt: de regels plus een korte toelichting van het model. */
data class VisionResult(
    val items: List<VisionItem>,
    val note: String?,
)

class VisionException(message: String) : Exception(message)

/**
 * De foto van je bord naar Gemini sturen en er kant-en-klare dagboekregels uit
 * terugkrijgen. Het model geeft antwoord in een vast JSON-formaat, zodat er
 * niets te raden valt aan de kant van de app.
 */
object FoodVision {

    /** Ander model? Alleen deze regel hoeft aangepast. */
    private const val MODEL = "gemini-3.1-flash-lite-preview"

    private const val ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/$MODEL:generateContent"

    private val PROMPT = """
        Je bent een voedingsdeskundige die porties inschat van een foto.

        Benoem elk los onderdeel op de foto (dus niet "maaltijd" maar "kipfilet",
        "witte rijst", "broccoli"). Schat per onderdeel het gewicht in gram en de
        voedingswaarde van die hoeveelheid — niet per 100 gram. Gebruik
        herkenningspunten zoals bord-, bestek- en verpakkingsformaat voor de
        portiegrootte. Namen in het Nederlands.

        Staat er geen eten op de foto, geef dan een lege lijst met een korte
        uitleg in "opmerking".
    """.trimIndent()

    private val SCHEMA = """
        {
          "type": "OBJECT",
          "properties": {
            "opmerking": { "type": "STRING" },
            "items": {
              "type": "ARRAY",
              "items": {
                "type": "OBJECT",
                "properties": {
                  "naam": { "type": "STRING" },
                  "gram": { "type": "NUMBER" },
                  "kcal": { "type": "NUMBER" },
                  "eiwit": { "type": "NUMBER" },
                  "koolhydraten": { "type": "NUMBER" },
                  "vet": { "type": "NUMBER" },
                  "zekerheid": { "type": "STRING", "enum": ["hoog", "gemiddeld", "laag"] }
                },
                "required": ["naam", "gram", "kcal", "eiwit", "koolhydraten", "vet"]
              }
            }
          },
          "required": ["items"]
        }
    """.trimIndent()

    /**
     * @param jpeg de foto als JPEG-bytes
     * @param hint optionele aanvulling van de gebruiker ("dit is een grote portie")
     */
    suspend fun analyse(jpeg: ByteArray, apiKey: String, hint: String? = null): VisionResult =
        withContext(Dispatchers.IO) {
            if (apiKey.isBlank()) throw VisionException("Geen API-sleutel ingesteld.")

            val parts = JSONArray()
                .put(JSONObject().put("text", if (hint.isNullOrBlank()) PROMPT else "$PROMPT\n\nExtra info van de gebruiker: $hint"))
                .put(
                    JSONObject().put(
                        "inline_data",
                        JSONObject()
                            .put("mime_type", "image/jpeg")
                            .put("data", Base64.encodeToString(jpeg, Base64.NO_WRAP)),
                    )
                )

            val payload = JSONObject()
                .put("contents", JSONArray().put(JSONObject().put("role", "user").put("parts", parts)))
                .put(
                    "generationConfig",
                    JSONObject()
                        .put("responseMimeType", "application/json")
                        .put("responseSchema", JSONObject(SCHEMA)),
                )

            val response = try {
                Http.postJson("$ENDPOINT?key=$apiKey", payload.toString())
            } catch (error: Exception) {
                throw VisionException(readableError(error.message))
            }

            parse(JSONObject(response))
        }

    private fun parse(response: JSONObject): VisionResult {
        response.optJSONObject("error")?.let { throw VisionException(it.optString("message", "Onbekende fout")) }

        val candidate = response.optJSONArray("candidates")?.optJSONObject(0)
            ?: throw VisionException("Geen antwoord van de AI.")
        val text = candidate.optJSONObject("content")
            ?.optJSONArray("parts")
            ?.let { parts -> (0 until parts.length()).mapNotNull { parts.optJSONObject(it)?.optString("text") } }
            ?.firstOrNull { it.isNotBlank() }
            ?: throw VisionException("De AI gaf een leeg antwoord terug.")

        val json = try {
            JSONObject(text)
        } catch (error: Exception) {
            throw VisionException("Het antwoord van de AI was geen geldige JSON.")
        }

        val array = json.optJSONArray("items") ?: JSONArray()
        val items = (0 until array.length()).mapNotNull { index ->
            val item = array.optJSONObject(index) ?: return@mapNotNull null
            val name = item.optString("naam").trim().ifBlank { return@mapNotNull null }
            VisionItem(
                name = name.replaceFirstChar { it.uppercase() }.take(48),
                grams = item.optDouble("gram", 0.0).coerceIn(0.0, 5_000.0),
                kcal = item.optDouble("kcal", 0.0).safeInt(),
                protein = item.optDouble("eiwit", 0.0).safeInt(),
                carbs = item.optDouble("koolhydraten", 0.0).safeInt(),
                fat = item.optDouble("vet", 0.0).safeInt(),
                confidence = item.optString("zekerheid").takeIf { it.isNotBlank() },
            )
        }

        return VisionResult(
            items = items,
            note = json.optString("opmerking").takeIf { it.isNotBlank() },
        )
    }

    private fun Double.safeInt(): Int = if (isNaN() || this < 0.0) 0 else roundToInt()

    private fun readableError(message: String?): String = when {
        message == null -> "De AI kon niet worden bereikt."
        message.contains("HTTP 400") -> "De API-sleutel werd niet geaccepteerd (400)."
        message.contains("HTTP 403") -> "Geen toegang met deze API-sleutel (403)."
        message.contains("HTTP 429") -> "Te veel verzoeken achter elkaar — probeer het zo nog eens."
        else -> message.take(160)
    }
}
