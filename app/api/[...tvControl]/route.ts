import {fromPreset,type AppearanceScope} from '@/lib/appearance-schema';
import {updateAppearance} from '@/lib/appearance-service';
import {requirePlatformAdmin} from '@/lib/server-admin';
import {NextRequest, NextResponse} from 'next/server';
import {mutateTVState, readTVState, parseRelease, validVersion, tvThemes, type TVTheme} from '@/lib/tv-control-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = {params: Promise<{tvControl: string[]}>};
const reply = (data: unknown, status = 200) => NextResponse.json(data, {status, headers:{'Cache-Control':'no-store'}});

const admin = requirePlatformAdmin;

export async function GET(request: NextRequest, context: Context) {
  try {
    const route = (await context.params).tvControl.join('/');
    if (route === 'config') {
      const state = await readTVState();const surface=request.nextUrl.searchParams.get('surface')||'tv';const appearance=state.appearance?.[surface as AppearanceScope]||fromPreset(surface==='tv'?state.theme:'neon');return reply({theme:appearance.theme,revision:state.revision,appearance});
    }
    if (route === 'releases/latest') {
      const channel = request.nextUrl.searchParams.get('channel') || 'stable';
      const state = await readTVState();
      return reply(state.releases.filter(r => r.channel === channel && (r.platform || 'android_tv') === (request.nextUrl.searchParams.get('platform') || 'android_tv')).sort((a,b) => b.versionCode-a.versionCode)[0] || null);
    }
    if (route !== 'admin/state') return reply({error:'Not found'},404);
    if (!await admin()) return reply({error:'Existing Super Admin login required'},401);
    return reply(await readTVState());
  } catch {return reply({error:'Unable to load TV control data. Check server configuration.'},500);}
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const route = (await context.params).tvControl.join('/');
    if (!['admin/theme','admin/releases','admin/build','admin/appearance'].includes(route)) return reply({error:'Not found'},404);
    const origin = process.env.TV_CONTROL_PUBLIC_URL || request.nextUrl.origin;
    if (request.headers.get('origin') !== origin || request.headers.get('content-type') !== 'application/json') return reply({error:'Same-origin JSON request required'},403);
    const session = await admin();
    if (!session) return reply({error:'Existing Super Admin login required'},401);
    const raw = await request.text();
    if (raw.length > 16000) return reply({error:'Request too large'},413);
    const input = JSON.parse(raw) as Record<string,unknown>;
    const actorId = session.user.id;
    if (route === 'admin/appearance') {
      await mutateTVState(state=>updateAppearance(state,input,actorId));
      return reply({ok:true,state:await readTVState()});
    }
    if (route === 'admin/theme') {
      if (!tvThemes.includes(input.theme as TVTheme)) return reply({error:'Unknown theme'},400);
      await mutateTVState(state=>updateAppearance(state,{scope:'tv',tokens:fromPreset(String(input.theme)),publish:true},actorId));
      return reply({ok:true});
    }
    if (route === 'admin/releases') {
      const release = parseRelease(input);
      await mutateTVState(state => {
        if (state.releases.some(r => r.channel===release.channel && (r.platform||'android_tv')===release.platform && r.versionCode>=release.versionCode)) throw new Error('Version code must increase within the channel');
        state.releases.unshift(release); state.audit.unshift({action:'release.publish',actorId,version:release.versionName,channel:release.channel,at:new Date().toISOString()});
      });
      return reply({ok:true});
    }
    if (!validVersion(input)) return reply({error:'Valid semantic version and Android version code required'},400);
    if (!process.env.GITHUB_TOKEN) return reply({error:'Set server-only GITHUB_TOKEN to enable APK builds'},503);
    const repo = process.env.GITHUB_REPOSITORY || 'savrdhcapital-debug/savrdh-tv-os-new';
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/android.yml/dispatches`, {method:'POST',
      headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},
      body:JSON.stringify({ref:process.env.GITHUB_REF||'main',inputs:{version_name:input.versionName,version_code:String(input.versionCode),config_url:process.env.TV_CONTROL_PUBLIC_URL||''}}),signal:AbortSignal.timeout(15000)});
    if (!response.ok) return reply({error:`GitHub build request failed (${response.status}). Check the workflow, token and account billing.`},502);
    await mutateTVState(state => state.audit.unshift({action:'build.request',actorId,at:new Date().toISOString()}));
    return reply({ok:true});
  } catch (error) {return reply({error:error instanceof Error?error.message:'TV control action failed'},400);}
}
