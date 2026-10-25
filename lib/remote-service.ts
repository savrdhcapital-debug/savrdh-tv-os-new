import 'server-only';
import {randomInt,randomUUID} from 'node:crypto';
import {mutateOperations,rows,hashToken,makeToken,addRow,audit,entitledDevice,activeSubscription,type Operations} from './operations-store';
import type {OperationalRow} from './operations-schema';
export const remoteKeys=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','Escape','Home','VolumeUp','VolumeDown','Mute'] as const;
function deviceFor(state:Operations,token:string){if(!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid TV token');const device=rows(state,'devices').find(d=>d.deviceTokenHash===hashToken(token)&&d.status==='active');if(!device)throw Error('Device is not enrolled or has been revoked');return device;}
function pairFor(state:Operations,token:string){if(!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid remote token');const pair=state.pairs.find(p=>p.tokenHash===hashToken(token)&&p.status!=='revoked'&&Date.parse(p.expiresAt)>Date.now());if(!pair)throw Error('Pairing expired or revoked');return pair;}
export async function remoteAction(route:string,input:Record<string,unknown>){return mutateOperations(state=>{
 const token=String(input.token||'');
 if(route==='enroll'){
  const code=String(input.code||'').trim().toUpperCase();if(!/^[A-F0-9]{18}$/.test(code))throw Error('Enter a valid enrollment code');
  const device=rows(state,'devices').find(d=>d.enrollmentHash===hashToken(code)&&d.status==='pending'&&Date.parse(String(d.enrollmentExpiresAt))>Date.now());if(!device)throw Error('Enrollment code is invalid or expired');
  if(!activeSubscription(state,String(device.familyId)))throw Error('This family needs an active subscription');
  const secret=makeToken();device.deviceTokenHash=hashToken(secret);device.enrollmentHash='';device.status='active';device.model=String(input.model||'Android TV').slice(0,100);device.lastSeenAt=new Date().toISOString();device.version++;audit(state,'device:'+device.id,'device.enrolled','devices',device.id);
  return {deviceId:device.id,deviceName:device.name,token:secret};
 }
 if(route==='pair/start'){
  const device=deviceFor(state,token);if(!entitledDevice(state,device))throw Error('Subscription is not active');
  let code:string;do{code=String(randomInt(10000000,100000000));}while(rows(state,'devices').some(d=>d.pairingHash===hashToken(code)&&Date.parse(String(d.pairingExpiresAt))>Date.now()));device.pairingHash=hashToken(code);device.pairingExpiresAt=new Date(Date.now()+300000).toISOString();
  return {code,expiresAt:device.pairingExpiresAt};
 }
 if(route==='pair/request'){
  const code=String(input.code||'').replace(/\s/g,'');if(!/^\d{8}$/.test(code))throw Error('Enter the 8-digit pairing code shown on TV');
  const device=rows(state,'devices').find(d=>d.pairingHash===hashToken(code)&&d.status==='active'&&Date.parse(String(d.pairingExpiresAt))>Date.now());if(!device||!entitledDevice(state,device))throw Error('Pairing code unavailable or subscription inactive');
  if(state.pairs.filter(p=>p.deviceId===device.id&&p.status==='pending'&&Date.parse(p.expiresAt)>Date.now()).length>=3)throw Error('Too many pending pairing requests');
  const secret=makeToken();const pair={id:randomUUID(),deviceId:device.id,name:String(input.name||'Android phone').slice(0,60),tokenHash:hashToken(secret),status:'pending' as const,expiresAt:new Date(Date.now()+300000).toISOString()};state.pairs.push(pair);return {pairId:pair.id,token:secret,status:'pending',deviceName:device.name};
 }
 if(route==='pair/claim'){
  const pair=pairFor(state,token);const device=rows(state,'devices').find(d=>d.id===pair.deviceId&&d.status==='active');if(!device)throw Error('TV unavailable');return {status:pair.status,deviceName:device.name,entitled:!!entitledDevice(state,device)};
 }
 if(route==='pair/approve'){
  const device=deviceFor(state,token);const pair=state.pairs.find(p=>p.id===input.pairId&&p.deviceId===device.id&&p.status==='pending'&&Date.parse(p.expiresAt)>Date.now());if(!pair)throw Error('Pairing request expired');
  pair.status=input.allow===true?'approved':'revoked';pair.expiresAt=new Date(Date.now()+30*86400000).toISOString();if(input.allow===true){device.pairingHash='';for(const other of state.pairs)if(other.id!==pair.id&&other.deviceId===device.id&&other.status==='pending')other.status='revoked';}
  audit(state,'device:'+device.id,'remote.'+pair.status,'devices',device.id);return {ok:true};
 }
 if(route==='disconnect'){
  const pair=pairFor(state,token);pair.status='revoked';audit(state,'remote:'+pair.id,'remote.revoked','devices',pair.deviceId);return {ok:true};
 }
 if(route==='command'){
  const pair=pairFor(state,token);if(pair.status!=='approved')throw Error('Approve this phone on the TV first');
  const device=rows(state,'devices').find(d=>d.id===pair.deviceId);if(!device||!entitledDevice(state,device))throw Error('Device or subscription inactive');
  if(!remoteKeys.includes(input.key as typeof remoteKeys[number]))throw Error('Unsupported remote command');
  if(device.foreground!=='yes'||!device.lastSeenAt||Date.parse(String(device.lastSeenAt))<Date.now()-30000)throw Error('TV is offline. Open SAVRDH on the TV.');
  state.commands=state.commands.filter(c=>Date.parse(c.createdAt)>Date.now()-15000).slice(-5000);
  if(state.commands.filter(c=>c.deviceId===device.id).length>=60)throw Error('TV command queue full');
  const seq=++state.sequence;state.commands.push({seq,deviceId:device.id,key:String(input.key),createdAt:new Date().toISOString()});return {ok:true,sequence:seq};
 }
 if(route==='device/poll'){
  const device=deviceFor(state,token);device.lastSeenAt=new Date().toISOString();device.foreground=input.foreground===true?'yes':'no';const entitlement=entitledDevice(state,device);
  const ack=Number(input.ack||0);if(!Number.isSafeInteger(ack)||ack<0)throw Error('Invalid acknowledgment');
  state.commands=state.commands.filter(c=>Date.parse(c.createdAt)>Date.now()-15000&&(c.deviceId!==device.id||c.seq>ack));
  const seconds=Number(input.launcherSeconds||0);if(!Number.isFinite(seconds)||seconds<0||seconds>10)throw Error('Invalid usage sample');
  if(seconds>0){const day=new Date().toISOString().slice(0,10);const record=rows(state,'screen-time').find(r=>r.deviceId===device.id&&r.usageDate===day)||addRow(state,'screen-time',{deviceId:device.id,name:device.name+' · '+day,familyId:device.familyId,usageDate:day,seconds:0,minutes:0});record.seconds=Math.min(86400,Number(record.seconds||0)+seconds);record.minutes=Math.floor(Number(record.seconds)/60);record.updatedAt=new Date().toISOString();}
  const blocked=rows(state,'parental-controls').filter(r=>r.familyId===device.familyId&&r.status==='active').map(r=>r.packageName);
  const globalBlocked=rows(state,'content').filter(r=>r.status==='blocked').map(r=>r.packageName);
  return {deviceName:device.name,entitled:!!entitlement,expiresAt:entitlement?.endsAt||'',blockedPackages:[...new Set([...blocked,...globalBlocked])],
   commands:entitlement?state.commands.filter(c=>c.deviceId===device.id&&c.seq>ack).slice(0,15):[],
   pendingPairs:state.pairs.filter(p=>p.deviceId===device.id&&p.status==='pending'&&Date.parse(p.expiresAt)>Date.now()).map(p=>({id:p.id,name:p.name})),
   notices:entitlement?rows(state,'notifications').filter(n=>n.status==='published'&&(!n.familyId||n.familyId===device.familyId)).slice(0,10).map(n=>({id:n.id,name:n.name,message:n.message})):[]};
 }
 throw Error('Unknown remote endpoint');
});}
