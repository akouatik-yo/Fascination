package fr.fascinations.app;

import android.app.Activity;
import android.content.ContentValues;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/* Fascinations : l'application web, telle quelle, dans une WebView plein écran.
   Tout est dans les ressources de l'APK (file:///android_asset/) : aucune connexion n'est nécessaire.
   Compilé contre l'API 16 : les appels plus récents passent par la réflexion. */
public class MainActivity extends Activity {
    private WebView web;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(0xFF05050A);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        call(s, "setMediaPlaybackRequiresUserGesture", false); // API 17
        call(s, "setAllowFileAccessFromFileURLs", true);       // API 16 (les polices locales)
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) { /* rien */ }
                    return true;
                }
                return false;
            }
        });
        web.addJavascriptInterface(new Pont(), "FJAndroid");
        setContentView(web);
        immersive();
        if (saved == null || web.restoreState(saved) == null) web.loadUrl("file:///android_asset/index.html");
    }

    /* le pont avec la page : enregistrer une photo du carnet dans la galerie (Images/Fascinations) */
    public class Pont {
        @JavascriptInterface
        public boolean enregistrer(String base64, String nom) {
            try {
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.MediaColumns.DISPLAY_NAME, nom);
                    v.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
                    v.put("relative_path", "Pictures/Fascinations");
                    Uri u = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                    if (u == null) return false;
                    OutputStream out = getContentResolver().openOutputStream(u);
                    out.write(data); out.close();
                } else {
                    // avant Android 10 : dans le dossier de l'application (visible depuis un gestionnaire de fichiers), sans permission
                    File dir = new File(getExternalFilesDir(Environment.DIRECTORY_PICTURES), "Fascinations");
                    dir.mkdirs();
                    FileOutputStream out = new FileOutputStream(new File(dir, nom));
                    out.write(data); out.close();
                }
                return true;
            } catch (Exception e) { return false; }
        }
    }

    private static void call(Object o, String name, boolean v) {
        try { o.getClass().getMethod(name, boolean.class).invoke(o, v); } catch (Exception e) { /* trop ancien : tant pis */ }
    }

    // plein écran « immersif » : barres système cachées, elles reviennent d'un glissement depuis le bord
    private void immersive() {
        int f = 0x00000100 | 0x00000200 | 0x00000400 | 0x00000002 | 0x00000004 | 0x00001000;
        getWindow().getDecorView().setSystemUiVisibility(f);
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) { web.onPause(); web.pauseTimers(); } // plus d'animation ni de son en arrière-plan
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) { web.resumeTimers(); web.onResume(); }
        immersive();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        if (web != null) web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
