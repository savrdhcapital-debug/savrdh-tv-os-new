import {readTVState} from '@/lib/tv-control-store';
import {fromPreset} from '@/lib/appearance-schema';
import {NextRequest,NextResponse} from 'next/server';
import {remoteAction} from '@/lib/remote-service';
export const runtime='nodejs';export const dynamic='force-dynamic';
const shared=globalThis as typeof globalThis & {savrdhRemoteRates?:Map<string,{count:number;until:number}>};
const rates=shared.savrdhRemoteRates||(shared.savrdhRemoteRates=new Map());
export async function POST(request:NextRequest,{params}:{params:Promise<{remote:string[]}>}){try{
 if(request.headers.get('content-type')!=='application/json'||(request.headers.get('origin')&&request.headers.get('origin')!==request.nextUrl.origin))return NextResponse.json({error:'Origin or content type rejected'},{status:403});
 const route=(await params).remote.join('/');const isPublic=['enroll','pair/request'].includes(route);const client=request.headers.get('x-forwarded-for')?.split(',')[0]||'local';const key=client+':'+(isPublic?'pair':route);const now=Date.now();
 if(rates.size>10000)for(const [id,entry]of rates)if(entry.until<now)rates.delete(id);
 if(isPublic){const global=rates.get('public-global');const window=global&&global.until>now?global:{count:0,until:now+300000};window.count++;rates.set('public-global',window);if(window.count>1000)return NextResponse.json({error:'Pairing service busy. Try again later.'},{status:429});}
 const previous=rates.get(key);const rate=previous&&previous.until>now?previous:{count:0,until:now+(isPublic?300000:60000)};rate.count++;rates.set(key,rate);
 if(rate.count>(isPublic?10:route==='device/poll'?120:600))return NextResponse.json({error:'Too many attempts. Try again later.'},{status:429});
 const raw=await request.text();if(raw.length>12000)return NextResponse.json({error:'Request too large'},{status:413});
 if(route==='appearance'){const state=await readTVState();return NextResponse.json({appearance:state.appearance?.mobile||fromPreset('neon'),revision:state.revision},{headers:{'Cache-Control':'no-store'}});}
 return NextResponse.json(await remoteAction(route,JSON.parse(raw)),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Remote request failed'},{status:400,headers:{'Cache-Control':'no-store'}});}}
