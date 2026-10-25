package com.savrdh.connect;
import org.json.JSONObject;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.io.*;
import java.nio.charset.StandardCharsets;

public final class HttpsApi {
    public static String validServer(String address) throws Exception {
        URL url=new URL(address);
        if(!"https".equals(url.getProtocol())||url.getHost().isEmpty()||url.getUserInfo()!=null||url.getQuery()!=null||url.getRef()!=null||!(url.getPath().isEmpty()||url.getPath().equals("/")))throw new IOException("Enter an HTTPS server origin, without a path");
        return address.replaceAll("/+$","");
    }
    public static JSONObject post(String server,String route,JSONObject body) throws Exception {
        HttpsURLConnection connection=(HttpsURLConnection)new URL(validServer(server)+"/api/remote/"+route).openConnection();
        connection.setRequestMethod("POST");connection.setConnectTimeout(10000);connection.setReadTimeout(15000);connection.setInstanceFollowRedirects(false);connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");
        byte[] payload=body.toString().getBytes(StandardCharsets.UTF_8);connection.setFixedLengthStreamingMode(payload.length);
        try {
            try(OutputStream output=connection.getOutputStream()){output.write(payload);}
            int code=connection.getResponseCode();InputStream stream=code>=200&&code<300?connection.getInputStream():connection.getErrorStream();
            if(stream==null)throw new IOException("Server returned "+code);
            ByteArrayOutputStream output=new ByteArrayOutputStream();
            try(InputStream input=stream){byte[] chunk=new byte[4096];int n;while((n=input.read(chunk))!=-1){if(output.size()+n>131072)throw new IOException("Response too large");output.write(chunk,0,n);}}
            JSONObject result=new JSONObject(new String(output.toByteArray(),StandardCharsets.UTF_8));
            if(code<200||code>=300)throw new IOException(result.optString("error","Server returned "+code));
            return result;
        } finally {connection.disconnect();}
    }
}
