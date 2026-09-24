package map.chicas.atlas

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var desk: WebView
    private val home = "https://justonejewelry.github.io/Chicas-Map/atlas/"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        desk = findViewById(R.id.desk)
        desk.settings.javaScriptEnabled = true
        desk.settings.domStorageEnabled = true
        desk.settings.setGeolocationEnabled(true)
        desk.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                if (url.startsWith(home) || url.startsWith("https://data.sanantonio.gov/")) {
                    return false
                }
                startActivity(Intent(Intent.ACTION_VIEW, request.url))
                return true
            }
        }
        desk.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback
            ) {
                callback.invoke(origin, true, false)
            }
        }
        desk.loadUrl(home)
    }

    override fun onBackPressed() {
        if (this::desk.isInitialized && desk.canGoBack()) desk.goBack() else super.onBackPressed()
    }
}
