package com.savrdh.tvos;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.*;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private WebView web;
    private TVRemoteAgent agent;
    private boolean showingPair=false;
    private SharedPreferences prefs;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final Set<String> PACKAGES = new HashSet<>(Arrays.asList("com.google.android.youtube.tv", "com.netflix.ninja", "com.amazon.amazonvideo.livingroom"));
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs = getSharedPreferences("savrdh", MODE_PRIVATE);
        agent = new TVRemoteAgent(prefs, new TVRemoteAgent.Listener() {
            public void key(String key) { runOnUiThread(() -> remoteKey(key)); }
            public void notice(String message) { notifyUser(message); }
            public void result(String callback, JSONObject value) { runOnUiThread(() -> {if(web!=null&&!isFinishing())web.evaluateJavascript("if(window."+callback+")window."+callback+"("+value.toString()+")",null);}); }
            public void pair(String id,String name) { runOnUiThread(() -> {
                if(showingPair||!agent.foreground||isFinishing())return;showingPair=true;
                new AlertDialog.Builder(MainActivity.this).setTitle("Pair mobile remote?").setMessage(name+" wants to control this SAVRDH launcher. Approve only a phone you recognize.")
                    .setNegativeButton("Deny",(d,v)->agent.approve(id,false)).setPositiveButton("Allow",(d,v)->agent.approve(id,true)).setOnDismissListener(d->showingPair=false).show();
            }); }
        });
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        web = new WebView(this);
        web.setBackgroundColor(0xff030e20);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost()) || !uri.getPath().startsWith("/assets/")) return blocked();
                String name = uri.getPath().substring(8);
                if (name.contains("..")) return blocked();
                try {
                    String mime = name.endsWith(".js") ? "text/javascript" : name.endsWith(".css") ? "text/css" : name.endsWith(".png") ? "image/png" : "text/html";
                    return new WebResourceResponse(mime, "UTF-8", getAssets().open(name));
                } catch (IOException e) { return blocked(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
        });
        setContentView(web);
        web.loadUrl(ORIGIN + (prefs.getBoolean("setupDone",false)?"/assets/tv.html":"/assets/setup.html"));
    }
    private WebResourceResponse blocked() { return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0])); }
    private void notifyUser(String message) { runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_LONG).show()); }
    private URL https(String value) throws Exception {
        URL url = new URL(value);
        if (!"https".equals(url.getProtocol()) || url.getUserInfo() != null) throw new IOException("An HTTPS address is required");
        return url;
    }
    private HttpURLConnection connection(String value) throws Exception {
        HttpURLConnection c = (HttpURLConnection) https(value).openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setInstanceFollowRedirects(false);
        // Follow HTTPS redirects only, including APK hosts such as GitHub Releases.
        for (int i = 0; i < 6; i++) {
            int status = c.getResponseCode();
            if (status >= 300 && status < 400) {
                String next = new URL(c.getURL(), c.getHeaderField("Location")).toString(); c.disconnect();
                c = (HttpURLConnection) https(next).openConnection(); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setInstanceFollowRedirects(false);
            } else if (status == 200) return c;
            else { c.disconnect(); throw new IOException("Server returned " + status); }
        }
        c.disconnect(); throw new IOException("Too many redirects");
    }
    private JSONObject json(String endpoint) throws Exception {
        HttpURLConnection c = connection(endpoint);
        try (InputStream input = c.getInputStream()) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[4096]; int n;
            while ((n = input.read(chunk)) != -1) {
                if (buffer.size() + n > 65536) throw new IOException("Response too large");
                buffer.write(chunk, 0, n);
            }
            String text = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
            return text.trim().equals("null") ? null : new JSONObject(text);
        } finally { c.disconnect(); }
    }
    public final class Bridge {
        @JavascriptInterface public String getSetupState() {
            JSONObject result=new JSONObject();try {android.net.ConnectivityManager manager=(android.net.ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);android.net.NetworkInfo network=manager.getActiveNetworkInfo();result.put("connected",network!=null&&network.isConnected());result.put("server",prefs.getString("server",BuildConfig.CONFIG_URL));result.put("enrolled",agent.enrolled());result.put("deviceId",prefs.getString("deviceId",""));}catch(Exception ignored){}return result.toString();
        }
        @JavascriptInterface public void openWifi(){runOnUiThread(()->{try{startActivity(new Intent(Settings.ACTION_WIFI_SETTINGS));}catch(Exception error){notifyUser("Open network settings from Android Settings");}});}
        @JavascriptInterface public void openHomeSettings(){runOnUiThread(()->{try{startActivity(new Intent(Settings.ACTION_HOME_SETTINGS));}catch(Exception error){notifyUser("Default launcher selection is restricted by this TV manufacturer");}});}
        @JavascriptInterface public void enrollDevice(String server,String code){agent.enroll(server,code);}
        @JavascriptInterface public void startPairing(){agent.pairStart();}
        @JavascriptInterface public void finishSetup(){runOnUiThread(()->{if(!agent.enrolled()){notifyUser("Enroll this TV with your subscription first");return;}prefs.edit().putBoolean("setupDone",true).apply();web.loadUrl(ORIGIN+"/assets/tv.html");});}
        @JavascriptInterface public void openSetup(){runOnUiThread(()->web.loadUrl(ORIGIN+"/assets/setup.html"));}
        @JavascriptInterface public String getInstalledApps(){
            org.json.JSONArray result=new org.json.JSONArray();Intent query=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LEANBACK_LAUNCHER);
            for(android.content.pm.ResolveInfo app:getPackageManager().queryIntentActivities(query,0)){try{String pkg=app.activityInfo.packageName;if(pkg.equals(getPackageName()))continue;result.put(new JSONObject().put("name",app.loadLabel(getPackageManager()).toString()).put("packageName",pkg));}catch(Exception ignored){}}return result.toString();
        }

        @JavascriptInterface public String getConfigUrl() { return prefs.getString("server", BuildConfig.CONFIG_URL); }
        @JavascriptInterface public String getAppearance(){return prefs.getString("appearance","{}");}
        @JavascriptInterface public String getTheme() { return prefs.getString("theme", "neon"); }
        @JavascriptInterface public void setConfigUrl(String value) {
            try { String base=com.savrdh.connect.HttpsApi.validServer(value); if(!base.equals(prefs.getString("server",BuildConfig.CONFIG_URL))){prefs.edit().remove("deviceToken").putBoolean("entitled",false).putBoolean("setupDone",false).apply();}prefs.edit().putString("server",base).apply(); }
            catch (Exception e) { notifyUser("A valid HTTPS server address is required"); }
        }
        @JavascriptInterface public void refreshConfig() {
            String base = getConfigUrl(); if (base.isEmpty()) return;
            worker.execute(() -> { try {
                JSONObject c = json(base + "/api/config"); String theme = c.getString("theme");
                if (!new HashSet<>(Arrays.asList("neon", "glass", "family", "gold", "apple-glass", "hacker", "violet", "rose", "arctic", "ember")).contains(theme)) return;
                prefs.edit().putString("theme", theme).apply();
                JSONObject appearance=c.optJSONObject("appearance");if(appearance!=null)prefs.edit().putString("appearance",appearance.toString()).apply();String script=appearance!=null?"window.savrdh.applyAppearance("+appearance.toString()+")":"window.savrdh.setTheme("+JSONObject.quote(theme)+")";runOnUiThread(() -> web.evaluateJavascript(script,null));
            } catch (Exception e) { notifyUser("Offline: keeping saved theme"); } });
        }
        @JavascriptInterface public void launchApp(String pkg) {
            if (!PACKAGES.contains(pkg) && getPackageManager().getLeanbackLaunchIntentForPackage(pkg)==null) return;
            if(!agent.canLaunch(pkg)){notifyUser("An active subscription is required, or this app is blocked by your SAVRDH policy.");return;}
            runOnUiThread(() -> {
                Intent intent = getPackageManager().getLeanbackLaunchIntentForPackage(pkg);
                if (intent == null) intent = getPackageManager().getLaunchIntentForPackage(pkg);
                if (intent == null) { notifyUser("App is not installed. Install it from your TV app store."); return; }
                try { startActivity(intent); } catch (Exception e) { notifyUser("This app could not be opened"); }
            });
        }
        @JavascriptInterface public void openSettings() { runOnUiThread(() -> { try { startActivity(new Intent(Settings.ACTION_SETTINGS)); } catch(Exception e) { notifyUser("Settings unavailable"); } }); }
        @JavascriptInterface public void openLiveTv() { if(!agent.canLaunch("com.google.android.tv")){notifyUser("Subscription inactive or TV provider blocked");return;}runOnUiThread(() -> { try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("content://android.media.tv/channel"))); } catch(Exception e) { notifyUser("No compatible TV provider is installed"); } }); }
        @JavascriptInterface public void checkUpdate() {
            if (getConfigUrl().isEmpty()) { notifyUser("Connect an HTTPS super admin server in Settings first"); return; }
            worker.execute(() -> { try {
                JSONObject r = json(getConfigUrl() + "/api/releases/latest?channel=stable");
                if (r == null || r.getLong("versionCode") <= BuildConfig.VERSION_CODE) { notifyUser("You are on the latest version"); return; }
                String url = r.getString("apkUrl"), sha = r.getString("sha256"); https(url);
                if (!sha.matches("[a-fA-F0-9]{64}")) throw new IOException("Invalid checksum");
                runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this).setTitle("Update " + r.optString("versionName")).setMessage(r.optString("notes") + "\n\nDownload and verify this APK?").setNegativeButton("Later", null).setPositiveButton("Download", (d,w) -> download(url,sha)).show());
            } catch (Exception e) { notifyUser("Could not check updates. Verify the server connection."); } });
        }
    }
    private void download(String url, String checksum) {
        notifyUser("Downloading update…");
        worker.execute(() -> {
            File folder = new File(getCacheDir(), "updates"); folder.mkdirs();
            File apk = new File(folder, "savrdh.apk");
            try {
                HttpURLConnection c = connection(url);
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[65536]; long total = 0; int n;
                    while ((n = in.read(buffer)) != -1) { total += n; if (total > 200L*1024*1024) throw new IOException("APK too large"); out.write(buffer,0,n); digest.update(buffer,0,n); }
                } finally { c.disconnect(); }
                StringBuilder actual = new StringBuilder(); for (byte b : digest.digest()) actual.append(String.format("%02x", b & 255));
                if (!actual.toString().equalsIgnoreCase(checksum)) throw new IOException("Checksum mismatch");
                runOnUiThread(() -> install(apk));
            } catch (Exception e) { apk.delete(); notifyUser("Update rejected: " + e.getMessage()); }
        });
    }
    private void install(File apk) {
        if (!getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(this).setTitle("Allow app updates").setMessage("Allow SAVRDH TV OS to install apps in the next screen, then check for updates again.").setNegativeButton("Cancel",null).setPositiveButton("Settings",(d,w)-> { try { startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:"+getPackageName()))); } catch(Exception e) { notifyUser("Installation settings unavailable"); } }).show(); return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName()+".files", apk);
            startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
        } catch(Exception e) { notifyUser("No APK installer is available on this TV"); }
    }
    @Override public void onBackPressed() { web.evaluateJavascript("document.querySelector('dialog[open]') ? document.querySelector('dialog[open]').close() : document.querySelector('nav button').click()",null); }
    private void remoteKey(String key) {
        if(isFinishing())return;
        android.media.AudioManager audio=(android.media.AudioManager)getSystemService(AUDIO_SERVICE);
        if(key.equals("VolumeUp")||key.equals("VolumeDown")){audio.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC,key.equals("VolumeUp")?android.media.AudioManager.ADJUST_RAISE:android.media.AudioManager.ADJUST_LOWER,android.media.AudioManager.FLAG_SHOW_UI);return;}
        if(key.equals("Mute")){audio.adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC,android.media.AudioManager.ADJUST_TOGGLE_MUTE,android.media.AudioManager.FLAG_SHOW_UI);return;}
        if(!agent.foreground)return;
        if(key.equals("Home")){if(!web.getUrl().endsWith("tv.html"))web.loadUrl(ORIGIN+"/assets/tv.html");else web.evaluateJavascript("window.savrdh.home()",null);return;}
        web.evaluateJavascript("if(window.savrdh)window.savrdh.remote("+JSONObject.quote(key)+")",null);
    }
    @Override protected void onResume(){super.onResume();if(agent!=null)agent.foreground=true;}
    @Override protected void onPause(){if(agent!=null)agent.foreground=false;super.onPause();}
    @Override protected void onDestroy() { agent.close();worker.shutdownNow(); web.removeJavascriptInterface("Android"); web.destroy(); super.onDestroy(); }
}
