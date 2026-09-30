package com.medchecklist.app

import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class UpdateManager(
    private val activity: AppCompatActivity,
    private val webView: WebView
) {
    private val mainHandler = Handler(Looper.getMainLooper())

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
    fun checkCanInstallPackages(): Boolean = true

    @JavascriptInterface
    fun openInstallPermissionSettings() {
        mainHandler.post {
            Toast.makeText(activity, "Updates are downloaded via your web browser.", Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun cancelDownload() {
        dispatchJsEvent("android-update-progress", "{ status: 'cancelled' }")
    }

    @JavascriptInterface
    fun downloadAndInstallApk(downloadUrl: String, versionName: String) {
        mainHandler.post {
            try {
                Toast.makeText(activity, "Opening browser to download v$versionName...", Toast.LENGTH_SHORT).show()
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(intent)
                dispatchJsEvent("android-update-progress", "{ status: 'completed', progress: 100 }")
            } catch (e: Exception) {
                val errorMsg = e.message ?: "Failed to open download URL"
                Toast.makeText(activity, "Error: $errorMsg", Toast.LENGTH_LONG).show()
                val safeMsg = errorMsg.replace("'", "\\'")
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
