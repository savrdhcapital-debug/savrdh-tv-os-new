import 'server-only';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {operationDefinitions,type OperationalRow} from './operations-schema';
export type Pair={id:string;deviceId:string;name:string;tokenHash:string;status:'pending'|'approved'|'revoked';expiresAt:string};
export type Command={seq:number;deviceId:string;key:string;createdAt:string};
export type Operations={collections:Record<string,OperationalRow[]>;audit:{id:string;actor:string;action:string;entity:string;recordId:string;at:string}[];pairs:Pair[];commands:Command[];sequence:number};
const directory=process.env.TV_CONTROL_DATA_DIR||path.join(process.cwd(),'.tv-control');
const file=path.join(directory,'operations.json');
const shared=globalThis as typeof globalThis & {savrdhOpsQueue?:Promise<void>};
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
export const makeToken=()=>randomBytes(32).toString('hex');
export async function readOperations():Promise<Operations>{try{return JSON.parse(await readFile(file,'utf8')) as Operations;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return {collections:{},audit:[],pairs:[],commands:[],sequence:0};}}
export async function mutateOperations<T>(fn:(state:Operations)=>T):Promise<T>{let output:T;const task=(shared.savrdhOpsQueue||Promise.resolve()).then(async()=>{const state=await readOperations();output=fn(state);await mkdir(directory,{recursive:true});await writeFile(path.join(directory,'operations.tmp'),JSON.stringify(state,null,2),{mode:0o600});await rename(path.join(directory,'operations.tmp'),file);});shared.savrdhOpsQueue=task.catch(()=>{});await task;return output!;}
export const rows=(state:Operations,slug:string)=>state.collections[slug]||(state.collections[slug]=[]);
export function audit(state:Operations,actor:string,action:string,entity:string,recordId:string){state.audit.unshift({id:randomUUID(),actor,action,entity,recordId,at:new Date().toISOString()});}
export function addRow(state:Operations,slug:string,data:Record<string,string|number>):OperationalRow{const now=new Date().toISOString();const row={...data,id:randomUUID(),version:1,createdAt:now,updatedAt:now} as OperationalRow;rows(state,slug).unshift(row);return row;}
export function activeSubscription(state:Operations,familyId:string){return rows(state,'subscriptions').find(r=>r.familyId===familyId&&r.status==='active'&&Date.parse(String(r.endsAt))>Date.now()&&rows(state,'families').some(f=>f.id===familyId&&f.status==='active'));}
export function entitledDevice(state:Operations,device:OperationalRow){if(device.status!=='active')return null;return activeSubscription(state,String(device.familyId));}
function validData(state:Operations,slug:string,input:Record<string,unknown>){const definition=operationDefinitions[slug];if(!definition||definition.readOnly)throw Error('This module is read only');const result:Record<string,string|number>={};for(const field of definition.fields){const value=input[field.key];if(field.required&&(value===undefined||value===null||value===''))throw Error(field.label+' is required');if(value===undefined||value===null||value===''){result[field.key]='';continue;}if(field.type==='number'){const n=Number(value);if(!Number.isFinite(n)||n<(field.min??0)||n>(field.max??10000000)||(!field.key.endsWith('Rupees')&&!Number.isInteger(n)))throw Error('Invalid '+field.label);if(field.key.endsWith('Rupees')&&Math.abs(n*100-Math.round(n*100))>0.00001)throw Error('Use at most two decimal places');result[field.key]=n;}else{if(typeof value!=='string'||value.length>4000)throw Error('Invalid '+field.label);const v=value.trim();if(field.required&&!v)throw Error(field.label+' is required');if(field.options&&!field.options.includes(v))throw Error('Invalid '+field.label);if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))throw Error('Invalid email');if(field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))))throw Error('Invalid date');if(field.type==='time'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw Error('Invalid time');if(field.relation&&!rows(state,field.relation).some(r=>r.id===v&&r.status!=='archived'))throw Error('Select an existing '+field.label);result[field.key]=v;}}return result;}
export function saveRecord(state:Operations,actor:string,slug:string,input:Record<string,unknown>){const data=validData(state,slug,input);let enrollmentCode:string|undefined;const existing=input.id?rows(state,slug).find(r=>r.id===input.id):null;if(input.id&&!existing)throw Error('Record not found');if(existing&&Number(input.version)!==existing.version)throw Error('This record changed. Refresh before editing.');
 if(slug==='payments'&&existing)throw Error('Payment records are immutable. Use Verify or Reverse actions.');
 if(slug==='subscriptions'&&existing?.status==='active')throw Error('Suspend an active subscription before changing its plan');
 if(slug==='payments'){
  const subscription=rows(state,'subscriptions').find(r=>r.id===data.subscriptionId&&r.familyId===data.familyId);if(!subscription)throw Error('Subscription must belong to this family');
  if(rows(state,'payments').some(r=>String(r.reference).toLowerCase()===String(data.reference).toLowerCase()))throw Error('This payment reference is already recorded');
  data.status='pending';data.amountPaise=Math.round(Number(data.amountRupees)*100);data.planId=String(subscription.planId);
 }
 if(slug==='plans'){data.pricePaise=Math.round(Number(data.priceRupees)*100);if(existing&&rows(state,'subscriptions').some(r=>r.planId===existing.id&&r.status==='active')&&(data.pricePaise!==existing.pricePaise||data.months!==existing.months||data.deviceLimit!==existing.deviceLimit))throw Error('Create a new plan version to change commercial terms for active subscribers');}
 if(slug==='subscriptions'){data.status='pending';const p=rows(state,'plans').find(r=>r.id===data.planId&&r.status==='active');if(!p)throw Error('Select an active plan');}
 if(slug==='devices'){
  if(existing&&existing.familyId!==data.familyId)throw Error('Revoke the old TV and enroll a new device to transfer families');
  const subscription=activeSubscription(state,String(data.familyId));if(!subscription)throw Error('Activate a subscription before enrolling a TV');const plan=rows(state,'plans').find(r=>r.id===subscription.planId);if(!plan)throw Error('Subscription plan missing');
  const used=rows(state,'devices').filter(r=>r.familyId===data.familyId&&r.id!==existing?.id&&r.status!=='revoked').length;if(used>=Number(plan.deviceLimit))throw Error('This family has reached the plan device limit');
  if(!existing){enrollmentCode=randomBytes(9).toString('hex').toUpperCase();data.enrollmentHash=hashToken(enrollmentCode);data.enrollmentExpiresAt=new Date(Date.now()+1800000).toISOString();data.status='pending';}
 }
 if((slug==='content'||slug==='parental-controls')&&!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/.test(String(data.packageName)))throw Error('Enter a valid Android package name');
 const row=existing?Object.assign(existing,data,{version:existing.version+1,updatedAt:new Date().toISOString()}):addRow(state,slug,data);audit(state,actor,existing?'record.update':'record.create',slug,row.id);return {record:publicRow(row),...(enrollmentCode?{enrollmentCode}:{})};}
export function publicRow(row:OperationalRow){return Object.fromEntries(Object.entries(row).filter(([key])=>!['enrollmentHash','deviceTokenHash','pairingHash','pairingAttempts'].includes(key))) as OperationalRow;}
export function recordAction(state:Operations,actor:string,slug:string,id:string,action:string,version:number){const row=rows(state,slug).find(r=>r.id===id);if(!row)throw Error('Record not found');if(row.version!==version)throw Error('This record changed. Refresh first.');
 if(slug==='payments'&&action==='verify'){if(row.status!=='pending')throw Error('Only pending payments can be verified');row.status='verified';row.verifiedAt=new Date().toISOString();row.verifiedBy=actor;}
 else if(slug==='payments'&&action==='reverse'){if(row.status!=='verified')throw Error('Only verified payments can be reversed');row.status='reversed';for(const s of rows(state,'subscriptions'))if(s.paymentId===row.id){s.status='suspended';s.version++;}row.reversedAt=new Date().toISOString();}
 else if(slug==='subscriptions'&&['activate','renew'].includes(action)){
  const plan=rows(state,'plans').find(p=>p.id===row.planId&&p.status==='active');if(!plan)throw Error('Plan is no longer active');
  if(rows(state,'subscriptions').some(s=>s.id!==row.id&&s.familyId===row.familyId&&s.status==='active'&&Date.parse(String(s.endsAt))>Date.now()))throw Error('This family already has an active subscription');
  const payment=rows(state,'payments').find(p=>p.subscriptionId===row.id&&p.planId===plan.id&&p.status==='verified'&&!p.usedAt&&Number(p.amountPaise)===Number(plan.pricePaise));
  if(!payment)throw Error('A verified, unused payment matching this plan price is required');
  if(action==='activate'&&row.status==='active')throw Error('Use Renew for an active subscription');
  const start=action==='renew'?Math.max(Date.now(),Date.parse(String(row.endsAt))||0):Date.now();const end=new Date(start);const day=end.getUTCDate();end.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+Number(plan.months));const last=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()+1,0)).getUTCDate();end.setUTCDate(Math.min(day,last));
  row.startsAt=new Date(start).toISOString();row.endsAt=end.toISOString();row.status='active';row.paymentId=payment.id;payment.usedAt=new Date().toISOString();payment.version++;
 }
 else if(slug==='subscriptions'&&['suspend','cancel'].includes(action)){row.status=action==='cancel'?'cancelled':'suspended';}
 else if(slug==='devices'&&action==='revoke'){row.status='revoked';row.deviceTokenHash='';row.enrollmentHash='';row.pairingHash='';for(const p of state.pairs)if(p.deviceId===id)p.status='revoked';state.commands=state.commands.filter(c=>c.deviceId!==id);}
 else if(slug==='devices'&&action==='new-enrollment'){row.deviceTokenHash='';row.status='pending';const code=randomBytes(9).toString('hex').toUpperCase();row.enrollmentHash=hashToken(code);row.enrollmentExpiresAt=new Date(Date.now()+1800000).toISOString();row.version++;audit(state,actor,action,slug,id);return {enrollmentCode:code,record:publicRow(row)};}
 else if(action==='archive'&&!['payments','subscriptions','devices','screen-time'].includes(slug)){if(slug==='families'&&rows(state,'subscriptions').some(s=>s.familyId===id&&s.status==='active'))throw Error('Suspend subscriptions before archiving this family');row.status='archived';}
 else throw Error('Unsupported action');
 if(slug==='subscriptions'&&row.status!=='active'){const ids=rows(state,'devices').filter(d=>d.familyId===row.familyId).map(d=>d.id);state.commands=state.commands.filter(c=>!ids.includes(c.deviceId));}
 row.version++;row.updatedAt=new Date().toISOString();audit(state,actor,action,slug,id);return {record:publicRow(row)};}
