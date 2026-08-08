package com.vlammie.fitness.data.net

import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Het kleinste stukje HTTP dat deze app nodig heeft: één GET en één POST met
 * JSON. Geen extra library, want er zijn maar twee endpoints.
 */
internal object Http {

    private const val CONNECT_TIMEOUT_MS = 15_000
    private const val READ_TIMEOUT_MS = 60_000

    @Throws(IOException::class)
    fun get(url: String, userAgent: String): String = open(url) { connection ->
        connection.requestMethod = "GET"
        connection.setRequestProperty("User-Agent", userAgent)
    }

    @Throws(IOException::class)
    fun postJson(url: String, body: String): String = open(url) { connection ->
        connection.requestMethod = "POST"
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
        connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
    }

    private fun open(url: String, prepare: (HttpURLConnection) -> Unit): String {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = CONNECT_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        return try {
            prepare(connection)
            val stream = if (connection.responseCode in 200..299) {
                connection.inputStream
            } else {
                // Bij een fout staat de uitleg in de errorstream; die willen we in het bericht.
                val detail = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                throw IOException("HTTP ${connection.responseCode}${detail.take(300).let { if (it.isBlank()) "" else ": $it" }}")
            }
            stream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }
}
