import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const themes=['neon','glass','family','gold'];
const password=process.env.ADMIN_PASSWORD;
const salt=randomBytes(32), hash=password?scryptSync(password,salt,64):null;
const sessions=new Map(), attempts=new Map();
const dataDir=process.env.DATA_DIR||path.join(root,'data');
await mkdir(dataDir,{recursive:true});
let state;try{state=JSON.parse(await readFile(path.join(dataDir,'state.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;state={theme:'neon',revision:1,releases:[],audit:[]};}
let queue=Promise.resolve();
function mutate(fn){const task=queue.then(async()=>{const next=structuredClone(state);fn(next);await writeFile(path.join(dataDir,'state.tmp'),JSON.stringify(next,null,2),{mode:0o600});await rename(path.join(dataDir,'state.tmp'),path.join(dataDir,'state.json'));state=next;});queue=task.catch(()=>{});return task;}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function body(req){let data='';for await(const chunk of req){data+=chunk;if(data.length>16000)throw Error('Request too large');}return JSON.parse(data||'{}');}
function authenticated(req){const id=/sid=([a-f0-9]{64})/.exec(req.headers.cookie||'')?.[1];return sessions.get(id)>Date.now();}
export const server=http.createServer(async(req,res)=>{try{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
const url=new URL(req.url,'http://localhost');
if(req.method==='POST'){
 const origin=req.headers.origin;
 const expected=process.env.PUBLIC_URL||`http://${req.headers.host}`;
 if(origin!==expected||req.headers['content-type']!=='application/json')return send(res,403,{error:'Same-origin JSON request required'});
}
if(url.pathname==='/api/config'&&req.method==='GET')return send(res,200,{theme:state.theme,revision:state.revision});
if(url.pathname==='/api/releases/latest'&&req.method==='GET'){
 const channel=url.searchParams.get('channel')||'stable';return send(res,200,state.releases.filter(r=>r.channel===channel).sort((a,b)=>b.versionCode-a.versionCode)[0]||null);
}
if(url.pathname==='/api/login'&&req.method==='POST'){
 if(!hash)return send(res,503,{error:'Set ADMIN_PASSWORD on the server to enable administration'});
 const ip=req.socket.remoteAddress, old=attempts.get(ip);const a=old&&old.until>Date.now()?old:{count:0,until:Date.now()+900000};attempts.set(ip,a);
 if(a.count>=10)return send(res,429,{error:'Too many attempts. Try again in 15 minutes.'});a.count++;
 const b=await body(req);if(typeof b.password!=='string'||b.password.length>512||!timingSafeEqual(hash,scryptSync(b.password,salt,64)))return send(res,401,{error:'Incorrect password'});
 attempts.delete(ip);for(const [key,expiry]of sessions)if(expiry<Date.now())sessions.delete(key);
 const id=randomBytes(32).toString('hex');sessions.set(id,Date.now()+8*3600000);
 res.setHeader('Set-Cookie',`sid=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${expectedSecure(req)?'; Secure':''}`);return send(res,200,{ok:true});
}
if(url.pathname.startsWith('/api/admin/')){
 if(!authenticated(req))return send(res,401,{error:'Super admin login required'});
 if(req.method==='GET'&&url.pathname==='/api/admin/state')return send(res,200,state);
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 const b=await body(req);
 if(url.pathname==='/api/admin/theme'){
 if(!themes.includes(b.theme))return send(res,400,{error:'Unknown theme'});
 await mutate(s=>{s.theme=b.theme;s.revision++;s.audit.unshift({action:'theme.publish',theme:b.theme,at:new Date().toISOString()});});return send(res,200,{ok:true});
 }
 if(url.pathname==='/api/admin/releases'){
 if(!['internal','beta','stable'].includes(b.channel)||!Number.isSafeInteger(b.versionCode)||b.versionCode<1||b.versionCode>2147483647||typeof b.versionName!=='string'||!/^\d+\.\d+\.\d+$/.test(b.versionName)||!/^https:\/\/[^\s]+\.apk(?:\?[^\s]*)?$/.test(b.apkUrl||'')||!/^[a-f0-9]{64}$/i.test(b.sha256||'')||typeof b.notes!=='string'||b.notes.length>4000)return send(res,400,{error:'Valid version, channel, HTTPS APK URL and SHA-256 are required'});
 await mutate(s=>{if(s.releases.some(r=>r.channel===b.channel&&r.versionCode>=b.versionCode))throw Error('Version code must increase within the channel');s.releases.unshift({versionName:b.versionName,versionCode:b.versionCode,channel:b.channel,apkUrl:b.apkUrl,sha256:b.sha256.toLowerCase(),notes:b.notes,publishedAt:new Date().toISOString()});s.audit.unshift({action:'release.publish',version:b.versionName,channel:b.channel,at:new Date().toISOString()});});return send(res,200,{ok:true});
 }
 if(url.pathname==='/api/admin/build'){
 if(!Number.isSafeInteger(b.versionCode)||b.versionCode<1||b.versionCode>2147483647||typeof b.versionName!=='string'||!/^\d+\.\d+\.\d+$/.test(b.versionName))return send(res,400,{error:'Valid semantic version and Android version code required'});
 if(!process.env.GITHUB_TOKEN)return send(res,503,{error:'Configure server-only GITHUB_TOKEN to request APK builds'});
 const repo=process.env.GITHUB_REPOSITORY||'savrdhtechnology-cloud/SAVRDH-TV-OS';
 const response=await fetch(`https://api.github.com/repos/${repo}/actions/workflows/android.yml/dispatches`,{method:'POST',headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:JSON.stringify({ref:process.env.GITHUB_REF||'main',inputs:{version_name:b.versionName,version_code:String(b.versionCode),config_url:process.env.PUBLIC_URL||''}})});
 if(!response.ok)return send(res,502,{error:`GitHub build request failed (${response.status}); check workflow branch and token permissions`});
 await mutate(s=>s.audit.unshift({action:'build.request',at:new Date().toISOString()}));return send(res,200,{ok:true});
 }
 if(url.pathname==='/api/admin/logout'){const id=/sid=([a-f0-9]{64})/.exec(req.headers.cookie||'')?.[1];sessions.delete(id);res.setHeader('Set-Cookie','sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
 return send(res,404,{error:'Not found'});
}
if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
let route=url.pathname==='/'?'/admin.html':url.pathname;
const file=path.resolve(root,'web','.'+decodeURIComponent(route));
if(!file.startsWith(path.join(root,'web')+path.sep))return send(res,403,{error:'Forbidden'});
const content=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(content);
}catch(e){send(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'Not found':e.message});}});
function expectedSecure(){return process.env.PUBLIC_URL?.startsWith('https://');}
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT||4173),process.env.HOST||'127.0.0.1',()=>console.log('SAVRDH super admin: http://localhost:'+(process.env.PORT||4173)));
