package com.youhadmeatoutfit.android

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

private const val SITE_ORIGIN = "https://you-had-me-at-outfit.vercel.app"
private const val SITE_URL = "$SITE_ORIGIN/"
private const val LOCATION_REQUEST = 1
private const val RECENT_LOCATION_MILLIS = 30 * 60 * 1000L

// Answers the page's geolocation requests from the app's own location fix, so a slow
// permission prompt or cold GPS start doesn't trip the site's short location timeout,
// and lets the page hand its outfit plan to the home-screen widget.
private const val NATIVE_BRIDGE_SCRIPT = """
(() => {
  window.__outfitSaveWidget = (json) => OutfitNative.saveOutfits(json);

  const callbacks = [];
  let cachedLocation = null;

  window.__outfitNativeLocation = (latitude, longitude) => {
    cachedLocation = { latitude, longitude };
    callbacks.splice(0).forEach(({ success }) => success({ coords: { latitude, longitude, accuracy: 100 } }));
  };

  window.__outfitNativeLocationError = () => {
    callbacks.splice(0).forEach(({ error }) => error?.({ code: 2, message: 'Native location unavailable' }));
  };

  navigator.geolocation.getCurrentPosition = (success, error) => {
    if (cachedLocation) {
      success({ coords: { ...cachedLocation, accuracy: 100 } });
      return;
    }
    callbacks.push({ success, error });
    OutfitNative.requestLocation();
  };
})();
"""

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var pendingLocation: Pair<String, GeolocationPermissions.Callback>? = null
    private var lastLocation: Location? = null
    private var locating = false
    private var askingPermission = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this).apply {
            fitsSystemWindows = true
            setBackgroundColor(getColor(R.color.outfit_background))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.setGeolocationEnabled(true)
            webViewClient = WebViewClient()
            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                    if (hasLocationPermission()) {
                        callback.invoke(origin, true, false)
                    } else {
                        pendingLocation = origin to callback
                        requestPermissions(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION), LOCATION_REQUEST)
                    }
                }
            }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            webView.addJavascriptInterface(NativeBridge(), "OutfitNative")
            WebViewCompat.addDocumentStartJavaScript(webView, NATIVE_BRIDGE_SCRIPT, setOf(SITE_ORIGIN))
        }
        setContentView(webView)
        requestLocation()
        if (savedInstanceState == null) webView.loadUrl(SITE_URL) else webView.restoreState(savedInstanceState)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (requestCode != LOCATION_REQUEST) return
        askingPermission = false
        pendingLocation?.let { (origin, callback) -> callback.invoke(origin, hasLocationPermission(), false) }
        pendingLocation = null
        if (hasLocationPermission()) requestLocation() else sendLocationError()
    }

    @SuppressLint("MissingPermission")
    private fun requestLocation() {
        lastLocation?.let { return sendLocation(it) }
        if (!hasLocationPermission()) {
            if (askingPermission) return
            askingPermission = true
            requestPermissions(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION), LOCATION_REQUEST)
            return
        }
        if (locating) return

        val manager = getSystemService(LocationManager::class.java)
        val provider = if (Build.VERSION.SDK_INT >= 31 && manager.hasProvider(LocationManager.FUSED_PROVIDER)) {
            LocationManager.FUSED_PROVIDER
        } else {
            LocationManager.NETWORK_PROVIDER
        }
        manager.getLastKnownLocation(provider)
            ?.takeIf { System.currentTimeMillis() - it.time < RECENT_LOCATION_MILLIS }
            ?.let { return sendLocation(it) }
        if (!manager.isProviderEnabled(provider)) return sendLocationError()

        locating = true
        val onLocation = { location: Location? ->
            locating = false
            if (location != null) sendLocation(location) else sendLocationError()
        }
        if (Build.VERSION.SDK_INT >= 30) {
            manager.getCurrentLocation(provider, null, mainExecutor, onLocation)
        } else {
            @Suppress("DEPRECATION")
            manager.requestSingleUpdate(provider, { onLocation(it) }, mainLooper)
        }
    }

    private fun sendLocation(location: Location) {
        lastLocation = location
        webView.evaluateJavascript(
            "window.__outfitNativeLocation && window.__outfitNativeLocation(${location.latitude}, ${location.longitude});",
            null,
        )
    }

    private fun sendLocationError() {
        webView.evaluateJavascript("window.__outfitNativeLocationError && window.__outfitNativeLocationError();", null)
    }

    private fun hasLocationPermission() =
        checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private inner class NativeBridge {
        @JavascriptInterface
        fun requestLocation() = runOnUiThread { this@MainActivity.requestLocation() }

        @JavascriptInterface
        fun saveOutfits(json: String) = OutfitWidgetProvider.savePlan(this@MainActivity, json)
    }
}
