import type {AppearanceMap} from './appearance-schema';
import 'server-only';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const tvThemes = ['neon', 'glass', 'family', 'gold', 'apple-glass', 'hacker', 'violet', 'rose', 'arctic', 'ember'] as const;
export type TVTheme = typeof tvThemes[number];
export type Release = {platform?: 'android_tv' | 'android_remote';versionName: string; versionCode: number; channel: 'internal' | 'beta' | 'stable'; apkUrl: string; sha256: string; notes: string; publishedAt: string};
type Audit = {action: string; actorId: string; at: string; theme?: string; version?: string; channel?: string};
export type TVState = {appearance?:AppearanceMap;draftAppearance?:AppearanceMap;appearanceHistory?:{revision:number;at:string;scope:string;appearance:AppearanceMap}[];theme: TVTheme; revision: number; releases: Release[]; audit: Audit[]};
const directory = process.env.TV_CONTROL_DATA_DIR || path.join(process.cwd(), '.tv-control');
const file = path.join(directory, 'state.json');
// Queue is shared across development module reloads; the state itself is always read from disk.
const shared = globalThis as typeof globalThis & {savrdhTvWrites?: Promise<void>};

export async function readTVState(): Promise<TVState> {
  try {return JSON.parse(await readFile(file, 'utf8')) as TVState;}
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return {theme:'neon', revision:1, releases:[], audit:[]};
  }
}

export async function mutateTVState(update: (state: TVState) => void): Promise<void> {
  const task = (shared.savrdhTvWrites || Promise.resolve()).then(async () => {
    const state = await readTVState();
    update(state);
    await mkdir(directory, {recursive:true});
    await writeFile(path.join(directory, 'state.tmp'), JSON.stringify(state, null, 2), {mode:0o600});
    await rename(path.join(directory, 'state.tmp'), file);
  });
  shared.savrdhTvWrites = task.catch(() => {});
  return task;
}

export function validVersion(input: Record<string, unknown>): boolean {
  return typeof input.versionName === 'string' && /^\d+\.\d+\.\d+$/.test(input.versionName)
    && Number.isSafeInteger(input.versionCode) && Number(input.versionCode) > 0 && Number(input.versionCode) <= 2147483647;
}

export function parseRelease(input: Record<string, unknown>): Release {
  if (!['android_tv','android_remote'].includes(String(input.platform || 'android_tv')) || !validVersion(input) || !['internal','beta','stable'].includes(String(input.channel))
    || typeof input.apkUrl !== 'string' || !/^https:\/\/[^\s]+\.apk(?:\?[^\s]*)?$/.test(input.apkUrl)
    || typeof input.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(input.sha256)
    || typeof input.notes !== 'string' || input.notes.length > 4000) throw new Error('Valid version, channel, HTTPS APK address, SHA-256 and notes are required');
  const url = new URL(input.apkUrl);
  if (url.username || url.password) throw new Error('APK URL must not contain credentials');
  return {platform:(input.platform || 'android_tv') as Release['platform'], versionName:input.versionName as string, versionCode:Number(input.versionCode), channel:input.channel as Release['channel'],
    apkUrl:input.apkUrl, sha256:input.sha256.toLowerCase(), notes:input.notes, publishedAt:new Date().toISOString()};
}
