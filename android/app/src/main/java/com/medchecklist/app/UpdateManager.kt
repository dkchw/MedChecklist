package com.medchecklist.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

class UpdateManager(
    private val activity: AppCompatActivity,
    private val webView: WebView
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var downloadThread: Thread? = null
    private val isCancelled = AtomicBoolean(false)
    var pendingApkFile: File? = null

    @JavascriptInterface
    fun isAndroidApp(): Boolean = true

    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            val pInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
            pInfo.versionName ?: "unknown"
        } catch (e: Exception) {
            "unknown"
        }
    }

    @JavascriptInterface
    fun checkCanInstallPackages(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            activity.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    @JavascriptInterface
    fun openInstallPermissionSettings() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${activity.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(intent)
            } catch (e: Exception) {
                mainHandler.post {
                    Toast.makeText(activity, "Cannot open install settings: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    @JavascriptInterface
    fun cancelDownload() {
        isCancelled.set(true)
        downloadThread?.interrupt()
        downloadThread = null
        dispatchJsEvent("android-update-progress", "{ status: 'cancelled' }")
    }

    @JavascriptInterface
    fun downloadAndInstallApk(downloadUrl: String, versionName: String) {
        if (downloadThread?.isAlive == true) {
            mainHandler.post {
                Toast.makeText(activity, "Download already in progress...", Toast.LENGTH_SHORT).show()
            }
            return
        }

        isCancelled.set(false)

        mainHandler.post {
            Toast.makeText(activity, "Starting download of v$versionName...", Toast.LENGTH_SHORT).show()
        }
        dispatchJsEvent("android-update-progress", "{ status: 'starting', progress: 0 }")

        downloadThread = Thread {
            var connection: HttpURLConnection? = null
            var inputStream: InputStream? = null
            var outputStream: FileOutputStream? = null

            try {
                var currentUrl = downloadUrl
                var redirectCount = 0
                val maxRedirects = 6

                while (redirectCount < maxRedirects) {
                    if (isCancelled.get()) return@Thread

                    val url = URL(currentUrl)
                    connection = url.openConnection() as HttpURLConnection
                    connection.instanceFollowRedirects = true
                    connection.connectTimeout = 20000
                    connection.readTimeout = 30000
                    connection.setRequestProperty("User-Agent", "MedChecklist-Android/${getAppVersion()}")

                    val responseCode = connection.responseCode
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == 307 ||
                        responseCode == 308
                    ) {
                        val newLocation = connection.getHeaderField("Location")
                        connection.disconnect()
                        if (newLocation != null) {
                            currentUrl = newLocation
                            redirectCount++
                            continue
                        }
                    }

                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        throw Exception("HTTP Error $responseCode: ${connection.responseMessage}")
                    }
                    break
                }

                if (connection == null) {
                    throw Exception("Could not connect to download URL")
                }

                val totalLength = connection.contentLengthLong
                inputStream = connection.inputStream

                // Cache directory for downloaded APKs
                val updatesDir = File(activity.cacheDir, "updates").apply { mkdirs() }
                val cleanVersion = versionName.replace(Regex("[^a-zA-Z0-9.-]"), "_")
                val apkFile = File(updatesDir, "medchecklist-v$cleanVersion.apk")
                if (apkFile.exists()) {
                    apkFile.delete()
                }

                outputStream = FileOutputStream(apkFile)
                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalRead: Long = 0
                var lastPercent = -1
                var lastDispatchTime = 0L

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    if (isCancelled.get()) {
                        apkFile.delete()
                        return@Thread
                    }
                    outputStream.write(buffer, 0, bytesRead)
                    totalRead += bytesRead

                    val now = System.currentTimeMillis()
                    val percent = if (totalLength > 0) ((totalRead * 100) / totalLength).toInt() else -1
                    if (percent != lastPercent && (now - lastDispatchTime > 200 || percent == 100)) {
                        lastPercent = percent
                        lastDispatchTime = now
                        dispatchJsEvent(
                            "android-update-progress",
                            "{ status: 'downloading', progress: $percent, bytesDownloaded: $totalRead, totalBytes: $totalLength }"
                        )
                    }
                }

                outputStream.flush()

                if (isCancelled.get()) {
                    apkFile.delete()
                    return@Thread
                }

                mainHandler.post {
                    Toast.makeText(activity, "Download complete. Opening installer...", Toast.LENGTH_SHORT).show()
                }
                dispatchJsEvent("android-update-progress", "{ status: 'completed', progress: 100 }")

                // Launch system installer
                installApk(apkFile)

            } catch (e: Exception) {
                if (isCancelled.get()) return@Thread
                val errorMsg = e.message ?: "Unknown error"
                mainHandler.post {
                    Toast.makeText(activity, "Update failed: $errorMsg", Toast.LENGTH_LONG).show()
                }
                val safeMsg = errorMsg.replace("'", "\\'")
                dispatchJsEvent("android-update-progress", "{ status: 'error', error: '$safeMsg' }")
            } finally {
                try {
                    inputStream?.close()
                    outputStream?.close()
                    connection?.disconnect()
                } catch (_: Exception) {}
            }
        }.apply { start() }
    }

    fun installApk(apkFile: File) {
        if (!apkFile.exists()) {
            mainHandler.post {
                Toast.makeText(activity, "APK file not found.", Toast.LENGTH_SHORT).show()
            }
            return
        }

        // On Android 8.0+, check if app has permission to install unknown apps
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!activity.packageManager.canRequestPackageInstalls()) {
                pendingApkFile = apkFile
                mainHandler.post {
                    Toast.makeText(
                        activity,
                        "Please allow MedChecklist to install unknown apps.",
                        Toast.LENGTH_LONG
                    ).show()
                }
                dispatchJsEvent("android-update-progress", "{ status: 'permission_required' }")
                openInstallPermissionSettings()
                return
            }
        }

        pendingApkFile = null

        mainHandler.post {
            try {
                val apkUri: Uri = FileProvider.getUriForFile(
                    activity,
                    "${activity.packageName}.fileprovider",
                    apkFile
                )

                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(apkUri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }

                activity.startActivity(installIntent)
            } catch (e: Exception) {
                Toast.makeText(activity, "Could not launch installer: ${e.message}", Toast.LENGTH_LONG).show()
                val safeMsg = (e.message ?: "Unknown error").replace("'", "\\'")
                dispatchJsEvent("android-update-progress", "{ status: 'error', error: '$safeMsg' }")
            }
        }
    }

    private fun dispatchJsEvent(eventName: String, detailJson: String) {
        mainHandler.post {
            val script = "window.dispatchEvent(new CustomEvent('$eventName', { detail: $detailJson }));"
            webView.evaluateJavascript(script, null)
        }
    }
}
