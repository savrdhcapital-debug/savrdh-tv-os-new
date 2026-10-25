package com.savrdh.remote;
import android.app.Activity;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import com.savrdh.connect.HttpsApi;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

public final class RemoteActivity extends Activity {
    private WebView web;private SharedPreferences preferences;private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private static final Set<String> ROUTES=new HashSet<>(Arrays.asList("pair/request","pair/claim","command","disconnect","appearance"));
    @Override public void onCreate(Bundle state){super.onCreate(state);preferences=getSharedPreferences("remote",MODE_PRIVATE);web=new WebView(this);web.setBackgroundColor(0xff071922);web.setOnApplyWindowInsetsListener((view,insets)->{view.setPadding(0,insets.getSystemWindowInsetTop(),0,insets.getSystemWindowInsetBottom());return insets;});web.getSettings().setJavaScriptEnabled(true);web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);web.addJavascriptInterface(new Bridge(),"RemoteNative");web.setWebViewClient(new WebViewClient(){
      @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return true;}
      @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){Uri uri=request.getUrl();String name=uri.getPath()==null?"":uri.getPath().replaceFirst("^/assets/","");if("https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&uri.getPath().startsWith("/assets/")&&!name.contains("..")){try{return new WebResourceResponse(name.endsWith(".js")?"text/javascript":name.endsWith(".css")?"text/css":name.endsWith(".svg")?"image/svg+xml":name.endsWith(".webmanifest")?"application/manifest+json":"text/html","UTF-8",getAssets().open(name));}catch(Exception ignored){}}return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
    });setContentView(web);web.loadUrl("https://appassets.androidplatform.net/assets/remote.html");}
    public final class Bridge {
      @JavascriptInterface public String getAppearance(){return preferences.getString("appearance","{}");}
      @JavascriptInterface public void saveAppearance(String value){if(value.length()<=8000)preferences.edit().putString("appearance",value).apply();}
      @JavascriptInterface public String getState(){return preferences.getString("session","{}");}
      @JavascriptInterface public void saveSession(String value){try{JSONObject data=new JSONObject(value);HttpsApi.validServer(data.getString("server"));if(data.optString("token").length()>64||data.optString("name").length()>60)return;preferences.edit().putString("session",data.toString()).apply();}catch(Exception ignored){}}
      @JavascriptInterface public void request(String server,String route,String payload,String id){if(!ROUTES.contains(route)||payload.length()>12000||!id.matches("[0-9]{1,9}"))return;worker.execute(()->{JSONObject result;try{result=HttpsApi.post(server,route,new JSONObject(payload));}catch(Exception error){result=new JSONObject();try{result.put("error",error.getMessage()==null?"Connection failed":error.getMessage());}catch(Exception ignored){}}final String script="window.nativeReply("+JSONObject.quote(id)+","+result.toString()+")";runOnUiThread(()->{if(!isFinishing())web.evaluateJavascript(script,null);});});}
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onDestroy(){worker.shutdownNow();web.removeJavascriptInterface("RemoteNative");web.destroy();super.onDestroy();}
}
