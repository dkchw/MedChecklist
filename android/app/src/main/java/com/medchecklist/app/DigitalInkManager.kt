package com.medchecklist.app

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.Ink
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

class DigitalInkManager(
    private val context: Context,
    private val webView: WebView
) {
    companion object {
        private const val TAG = "DigitalInkManager"
        private const val DEFAULT_LANG = "en-US"
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val remoteModelManager = RemoteModelManager.getInstance()
    private val activeRecognizers = ConcurrentHashMap<String, DigitalInkRecognizer>()
    private val downloadedModels = ConcurrentHashMap<String, Boolean>()
    private val downloadingModels = ConcurrentHashMap<String, Boolean>()

    init {
        // Pre-warm and check/download primary models (en-US, vi-VN)
        checkAndDownloadModel(DEFAULT_LANG)
        checkAndDownloadModel("vi-VN")
    }

    private fun normalizeLanguageTag(lang: String?): String {
        return when (lang?.lowercase()) {
            "vi", "vn", "vi-vn" -> "vi-VN"
            "es", "es-es" -> "es-ES"
            "fr", "fr-fr" -> "fr-FR"
            "de", "de-de" -> "de-DE"
            "ja", "jp", "ja-jp" -> "ja"
            "zh", "zh-cn", "zh-hans" -> "zh-Hans"
            else -> "en-US"
        }
    }

    @JavascriptInterface
    fun isAvailable(): Boolean = true

    @JavascriptInterface
    fun isModelReady(languageTag: String?): Boolean {
        val tag = normalizeLanguageTag(languageTag)
        return downloadedModels[tag] == true
    }

    @JavascriptInterface
    fun checkAndDownloadModel(languageTag: String?) {
        val tag = normalizeLanguageTag(languageTag)
        val modelIdentifier = try {
            DigitalInkRecognitionModelIdentifier.fromLanguageTag(tag)
        } catch (e: Exception) {
            Log.e(TAG, "Invalid language tag: $tag", e)
            null
        } ?: return

        val model = DigitalInkRecognitionModel.builder(modelIdentifier).build()

        remoteModelManager.isModelDownloaded(model)
            .addOnSuccessListener { isDownloaded ->
                if (isDownloaded) {
                    downloadedModels[tag] = true
                    downloadingModels[tag] = false
                    notifyModelStatus(tag, "ready")
                } else {
                    downloadedModels[tag] = false
                    if (downloadingModels[tag] != true) {
                        downloadingModels[tag] = true
                        notifyModelStatus(tag, "downloading")
                        val conditions = DownloadConditions.Builder().build()
                        remoteModelManager.download(model, conditions)
                            .addOnSuccessListener {
                                downloadedModels[tag] = true
                                downloadingModels[tag] = false
                                notifyModelStatus(tag, "ready")
                                Log.i(TAG, "Digital Ink model downloaded successfully: $tag")
                            }
                            .addOnFailureListener { err ->
                                downloadingModels[tag] = false
                                notifyModelStatus(tag, "error: ${err.message}")
                                Log.e(TAG, "Failed to download Digital Ink model: $tag", err)
                            }
                    }
                }
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Failed to check model status for $tag", e)
            }
    }

    private fun getRecognizer(tag: String): DigitalInkRecognizer? {
        val existing = activeRecognizers[tag]
        if (existing != null) return existing

        val modelId = DigitalInkRecognitionModelIdentifier.fromLanguageTag(tag) ?: return null
        val model = DigitalInkRecognitionModel.builder(modelId).build()
        val recognizer = DigitalInkRecognition.getClient(DigitalInkRecognizerOptions.builder(model).build())
        activeRecognizers[tag] = recognizer
        return recognizer
    }

    @JavascriptInterface
    fun recognizeInk(requestId: String, jsonStrokes: String, languageTag: String?) {
        val tag = normalizeLanguageTag(languageTag)

        try {
            val inkBuilder = Ink.builder()
            val strokesArray = JSONArray(jsonStrokes)

            for (i in 0 until strokesArray.length()) {
                val strokeObj = strokesArray.getJSONObject(i)
                val pointsArray = strokeObj.optJSONArray("points") ?: continue
                val strokeBuilder = Ink.Stroke.builder()

                var lastTime = System.currentTimeMillis()
                for (j in 0 until pointsArray.length()) {
                    val pt = pointsArray.getJSONObject(j)
                    val x = pt.getDouble("x").toFloat()
                    val y = pt.getDouble("y").toFloat()
                    val t = if (pt.has("time")) pt.getLong("time") else (lastTime + j * 15)
                    lastTime = t
                    strokeBuilder.addPoint(Ink.Point.create(x, y, t))
                }
                inkBuilder.addStroke(strokeBuilder.build())
            }

            val ink = inkBuilder.build()
            if (ink.strokes.isEmpty()) {
                sendRecognitionResponse(requestId, "success", emptyList())
                return
            }

            val modelId = DigitalInkRecognitionModelIdentifier.fromLanguageTag(tag)
            if (modelId == null) {
                sendRecognitionResponse(requestId, "error", emptyList(), "Unsupported language tag: $tag")
                return
            }

            val model = DigitalInkRecognitionModel.builder(modelId).build()
            remoteModelManager.isModelDownloaded(model)
                .addOnSuccessListener { downloaded ->
                    if (!downloaded) {
                        // Trigger background download and notify JS to use local fallback
                        checkAndDownloadModel(tag)
                        sendRecognitionResponse(
                            requestId,
                            "model_not_ready",
                            emptyList(),
                            "Model $tag is downloading. Falling back to local OCR engine."
                        )
                        return@addOnSuccessListener
                    }

                    val recognizer = getRecognizer(tag)
                    if (recognizer == null) {
                        sendRecognitionResponse(requestId, "error", emptyList(), "Failed to create recognizer")
                        return@addOnSuccessListener
                    }

                    recognizer.recognize(ink)
                        .addOnSuccessListener { result ->
                            val candidateTexts = result.candidates.map { it.text }
                            sendRecognitionResponse(requestId, "success", candidateTexts)
                        }
                        .addOnFailureListener { ex ->
                            Log.e(TAG, "Recognition failed for request $requestId", ex)
                            sendRecognitionResponse(requestId, "error", emptyList(), ex.message ?: "Recognition failed")
                        }
                }
                .addOnFailureListener { err ->
                    Log.e(TAG, "Error checking model status", err)
                    sendRecognitionResponse(requestId, "error", emptyList(), err.message ?: "Model check failed")
                }

        } catch (e: Exception) {
            Log.e(TAG, "Error parsing strokes for request $requestId", e)
            sendRecognitionResponse(requestId, "error", emptyList(), e.message ?: "Parsing error")
        }
    }

    private fun sendRecognitionResponse(
        requestId: String,
        status: String,
        candidates: List<String>,
        errorMessage: String? = null
    ) {
        val payload = JSONObject().apply {
            put("requestId", requestId)
            put("status", status)
            val arr = JSONArray()
            candidates.forEach { arr.put(it) }
            put("candidates", arr)
            put("topCandidate", candidates.firstOrNull() ?: "")
            if (errorMessage != null) {
                put("error", errorMessage)
            }
        }

        val jsonStr = payload.toString().replace("'", "\\'")
        mainHandler.post {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('digitalInkRecognitionResult', { detail: $jsonStr }));",
                null
            )
        }
    }

    private fun notifyModelStatus(tag: String, status: String) {
        val payload = JSONObject().apply {
            put("languageTag", tag)
            put("status", status)
        }
        val jsonStr = payload.toString().replace("'", "\\'")
        mainHandler.post {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('digitalInkModelStatus', { detail: $jsonStr }));",
                null
            )
        }
    }

    fun cleanup() {
        for ((_, recognizer) in activeRecognizers) {
            try {
                recognizer.close()
            } catch (e: Exception) {
                Log.e(TAG, "Error closing recognizer", e)
            }
        }
        activeRecognizers.clear()
    }
}
