package com.medchecklist.app

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import java.io.File

/**
 * Manages app updates using Android's DownloadManager system service.
 * Downloads the APK to the public Downloads folder with a visible notification,
 * then prompts the system package installer automatically on completion.
 */
class UpdateManager(
    private val activity: AppCompatActivity,
    private val webView: WebView
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var currentDownloadId: Long = -1
    private var downloadReceiver: BroadcastReceiver? = null
    private var progressRunnable: Runnable? = null

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
        mainHandler.post {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                try {
                    val intent = Intent(
                        android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:${activity.packageName}")
                    )
                    activity.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(activity, "Please enable 'Install unknown apps' in Settings", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    @JavascriptInterface
    fun cancelDownload() {
        mainHandler.post {
            if (currentDownloadId != -1L) {
                val dm = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                dm.remove(currentDownloadId)
                currentDownloadId = -1
                stopProgressPolling()
                unregisterReceiver()
                dispatchJsEvent("android-update-progress", "{ status: 'cancelled' }")
                Toast.makeText(activity, "Download cancelled", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun downloadAndInstallApk(downloadUrl: String, versionName: String) {
        mainHandler.post {
            try {
                // Clean up any previous download
                cancelPreviousDownload()

                val fileName = "MedChecklist-v${versionName}.apk"

                // Delete existing file if present to avoid conflicts
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val existingFile = File(downloadsDir, fileName)
                if (existingFile.exists()) existingFile.delete()

                val request = DownloadManager.Request(Uri.parse(downloadUrl)).apply {
                    setTitle("MedChecklist v$versionName")
                    setDescription("Downloading update...")
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                    setMimeType("application/vnd.android.package-archive")
                }

                val dm = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                currentDownloadId = dm.enqueue(request)

                dispatchJsEvent("android-update-progress", "{ status: 'starting', progress: 0 }")
                Toast.makeText(activity, "Downloading MedChecklist v$versionName...", Toast.LENGTH_SHORT).show()

                // Register receiver for download completion
                registerCompletionReceiver(dm, fileName)

                // Start polling download progress
                startProgressPolling(dm)

            } catch (e: Exception) {
                val errorMsg = (e.message ?: "Download failed").replace("'", "\\'")
                Toast.makeText(activity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                dispatchJsEvent("android-update-progress", "{ status: 'error', error: '$errorMsg' }")
            }
        }
    }

    private fun cancelPreviousDownload() {
        if (currentDownloadId != -1L) {
            val dm = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            dm.remove(currentDownloadId)
            currentDownloadId = -1
        }
        stopProgressPolling()
        unregisterReceiver()
    }

    private fun registerCompletionReceiver(dm: DownloadManager, fileName: String) {
        downloadReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                if (id != currentDownloadId) return

                stopProgressPolling()
                unregisterReceiver()

                // Check download status
                val query = DownloadManager.Query().setFilterById(id)
                val cursor: Cursor? = dm.query(query)
                if (cursor != null && cursor.moveToFirst()) {
                    val statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS)
                    val status = if (statusIndex >= 0) cursor.getInt(statusIndex) else -1

                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        dispatchJsEvent("android-update-progress", "{ status: 'completed', progress: 100 }")
                        // Prompt system installer
                        promptInstall(fileName)
                    } else {
                        val reasonIndex = cursor.getColumnIndex(DownloadManager.COLUMN_REASON)
                        val reason = if (reasonIndex >= 0) cursor.getInt(reasonIndex) else 0
                        dispatchJsEvent("android-update-progress", "{ status: 'error', error: 'Download failed (reason: $reason)' }")
                        Toast.makeText(activity, "Download failed", Toast.LENGTH_LONG).show()
                    }
                    cursor.close()
                }
                currentDownloadId = -1
            }
        }

        val filter = IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            activity.registerReceiver(downloadReceiver, filter)
        }
    }

    private fun promptInstall(fileName: String) {
        try {
            val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            val apkFile = File(downloadsDir, fileName)

            if (!apkFile.exists()) {
                Toast.makeText(activity, "APK file not found", Toast.LENGTH_LONG).show()
                return
            }

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
            Toast.makeText(activity, "Opening installer...", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(activity, "Could not open installer: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun startProgressPolling(dm: DownloadManager) {
        progressRunnable = object : Runnable {
            override fun run() {
                if (currentDownloadId == -1L) return
                val query = DownloadManager.Query().setFilterById(currentDownloadId)
                val cursor: Cursor? = dm.query(query)
                if (cursor != null && cursor.moveToFirst()) {
                    val downloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR)
                    val totalIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES)

                    val downloaded = if (downloadedIndex >= 0) cursor.getLong(downloadedIndex) else 0L
                    val total = if (totalIndex >= 0) cursor.getLong(totalIndex) else -1L

                    if (total > 0) {
                        val progress = ((downloaded * 100) / total).toInt()
                        dispatchJsEvent(
                            "android-update-progress",
                            "{ status: 'downloading', progress: $progress, bytesDownloaded: $downloaded, totalBytes: $total }"
                        )
                    }
                    cursor.close()
                }
                mainHandler.postDelayed(this, 500)
            }
        }
        mainHandler.postDelayed(progressRunnable!!, 500)
    }

    private fun stopProgressPolling() {
        progressRunnable?.let { mainHandler.removeCallbacks(it) }
        progressRunnable = null
    }

    private fun unregisterReceiver() {
        downloadReceiver?.let {
            try {
                activity.unregisterReceiver(it)
            } catch (_: Exception) {}
        }
        downloadReceiver = null
    }

    private fun dispatchJsEvent(eventName: String, detailJson: String) {
        mainHandler.post {
            val script = "window.dispatchEvent(new CustomEvent('$eventName', { detail: $detailJson }));"
            webView.evaluateJavascript(script, null)
        }
    }

    /** Call from Activity.onDestroy() to clean up */
    fun cleanup() {
        stopProgressPolling()
        unregisterReceiver()
    }
}
