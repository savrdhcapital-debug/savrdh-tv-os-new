package com.savrdh.tvos;
import android.content.SharedPreferences;
import com.savrdh.connect.HttpsApi;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

final class TVRemoteAgent {
    interface Listener {void key(String key);void pair(String id,String name);void result(String callback,JSONObject data);void notice(String message);}
    private final SharedPreferences preferences;private final Listener listener;
    private final ScheduledExecutorService worker=Executors.newSingleThreadScheduledExecutor();
    private volatile Set<String> blocked=new HashSet<>();volatile boolean foreground=true;
    TVRemoteAgent(SharedPreferences p,Listener l){preferences=p;listener=l;try{JSONArray saved=new JSONArray(p.getString("blockedPackages","[]"));for(int i=0;i<saved.length();i++)blocked.add(saved.getString(i));}catch(Exception ignored){}worker.scheduleWithFixedDelay(this::poll,2,2,TimeUnit.SECONDS);}
    boolean enrolled(){return !preferences.getString("deviceToken","").isEmpty();}
    boolean canLaunch(String pkg){
        try{return enrolled()&&!blocked.contains(pkg)&&preferences.getBoolean("entitled",false)&&Instant.parse(preferences.getString("subscriptionEnds","")).toEpochMilli()>System.currentTimeMillis()&&preferences.getLong("lastEntitlementCheck",0)>System.currentTimeMillis()-86400000;}
        catch(Exception error){return false;}
    }
    private JSONObject token()throws Exception{return new JSONObject().put("token",preferences.getString("deviceToken",""));}
    void enroll(String server,String code){worker.execute(()->{try{String base=HttpsApi.validServer(server);JSONObject result=HttpsApi.post(base,"enroll",new JSONObject().put("code",code).put("model",android.os.Build.MANUFACTURER+" "+android.os.Build.MODEL));preferences.edit().putString("server",base).putString("deviceToken",result.getString("token")).putString("deviceId",result.getString("deviceId")).putLong("remoteAck",0).putBoolean("setupDone",false).apply();listener.result("setupResult",result);}catch(Exception error){resultError("setupResult",error);}});}
    void pairStart(){worker.execute(()->{try{if(!enrolled())throw new Exception("Enroll this TV first");listener.result("pairingCode",HttpsApi.post(preferences.getString("server",""),"pair/start",token()));}catch(Exception error){resultError("pairingCode",error);}});}
    void approve(String id,boolean allow){worker.execute(()->{try{HttpsApi.post(preferences.getString("server",""),"pair/approve",token().put("pairId",id).put("allow",allow));}catch(Exception error){listener.notice(error.getMessage());}});}
    private void resultError(String callback,Exception error){try{listener.result(callback,new JSONObject().put("error",error.getMessage()==null?"Connection failed":error.getMessage()));}catch(Exception ignored){}}
    private void poll(){if(!enrolled())return;try{
        long ack=preferences.getLong("remoteAck",0);
        JSONObject result=HttpsApi.post(preferences.getString("server",""),"device/poll",token().put("ack",ack).put("foreground",foreground).put("launcherSeconds",foreground?2:0));
        preferences.edit().putBoolean("entitled",result.optBoolean("entitled")).putString("subscriptionEnds",result.optString("expiresAt")).putLong("lastEntitlementCheck",System.currentTimeMillis()).apply();
        Set<String> nextBlocked=new HashSet<>();JSONArray packages=result.optJSONArray("blockedPackages");if(packages!=null)for(int i=0;i<packages.length();i++)nextBlocked.add(packages.getString(i));blocked=nextBlocked;preferences.edit().putString("blockedPackages",new JSONArray(nextBlocked).toString()).apply();
        JSONArray pairs=result.optJSONArray("pendingPairs");if(foreground&&pairs!=null)for(int i=0;i<pairs.length();i++){JSONObject request=pairs.getJSONObject(i);listener.pair(request.getString("id"),request.getString("name"));}
        JSONArray commands=result.optJSONArray("commands");if(commands!=null)for(int i=0;i<commands.length();i++){JSONObject command=commands.getJSONObject(i);listener.key(command.getString("key"));ack=Math.max(ack,command.getLong("seq"));}preferences.edit().putLong("remoteAck",ack).apply();
        JSONArray notices=result.optJSONArray("notices");if(foreground&&notices!=null)for(int i=0;i<notices.length();i++){JSONObject notice=notices.getJSONObject(i);String id=notice.getString("id");if(!preferences.getBoolean("notice:"+id,false)){preferences.edit().putBoolean("notice:"+id,true).apply();listener.notice(notice.optString("name")+": "+notice.optString("message"));}}
    }catch(Exception ignored){/* Keep cached appearance; entitlement cache has a 24h verification limit. */}}
    void close(){worker.shutdownNow();}
}
