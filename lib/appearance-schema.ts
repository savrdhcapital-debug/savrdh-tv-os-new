import presets from '@/public/tv-studio/appearance-presets.json';
export const appearanceScopes=['tv','mobile','parent','admin'] as const;
export type AppearanceScope=typeof appearanceScopes[number];
export type AppearanceTokens={theme:string;background:string;panel:string;accent:string;text:string;font:string;radius:number;glow:number;speed:number;motion:string;textMotion:string;logoMotion:string;effect:string;hero:string};
export type AppearanceMap=Partial<Record<AppearanceScope,AppearanceTokens>>;
export const fontStacks:Record<string,string>={apple:'-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',rounded:'ui-rounded, "SF Pro Rounded", "Trebuchet MS", Arial, sans-serif',sans:'Arial, Helvetica, sans-serif',serif:'Georgia, "Times New Roman", serif',mono:'"SFMono-Regular", Consolas, "Liberation Mono", monospace',inter:'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'};
export const motionOptions=['none','aurora','float','matrix','spotlight','kenburns'];
export const textMotionOptions=['none','fade-slide','reveal','shimmer'];
export const logoMotionOptions=['none','float','pulse','shimmer'];
export const effectOptions=['glass','neon','shadow','matte'];
export const appearancePresets=presets;
export function fromPreset(id:string):AppearanceTokens{const {id:theme,name,description,...tokens}=presets.find(p=>p.id===id)||presets[0];return {theme,...tokens};}
export function parseAppearance(value:unknown):AppearanceTokens{
 if(!value||typeof value!=='object')throw Error('Appearance tokens required');const v=value as Record<string,unknown>;
 if(!presets.some(p=>p.id===v.theme))throw Error('Unknown appearance theme');
 for(const name of ['background','panel','accent','text'])if(typeof v[name]!=='string'||!/^#[a-f0-9]{6}$/i.test(String(v[name])))throw Error('Use six-digit hex colors');
 for(const [name,min,max]of [['radius',0,36],['glow',0,60],['speed',0.3,2]] as const)if(typeof v[name]!=='number'||!Number.isFinite(v[name])||Number(v[name])<min||Number(v[name])>max)throw Error('Invalid '+name);
 if(!Object.hasOwn(fontStacks,String(v.font))||!motionOptions.includes(String(v.motion))||!textMotionOptions.includes(String(v.textMotion))||!logoMotionOptions.includes(String(v.logoMotion))||!effectOptions.includes(String(v.effect)))throw Error('Invalid font, motion or effect');
 if(typeof v.hero!=='string'||!v.hero.trim()||v.hero.length>120)throw Error('Hero text must be 1–120 characters');
 return Object.fromEntries(['theme','background','panel','accent','text','font','radius','glow','speed','motion','textMotion','logoMotion','effect','hero'].map(key=>[key,v[key]])) as AppearanceTokens;
}
