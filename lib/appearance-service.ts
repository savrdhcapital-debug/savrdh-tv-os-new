import {appearanceScopes,parseAppearance,type AppearanceScope} from './appearance-schema';
import type {TVState,TVTheme} from './tv-control-store';
export function updateAppearance(state:TVState,input:Record<string,unknown>,actorId:string){
 const scope=String(input.scope);
 if(scope!=='all'&&!appearanceScopes.includes(scope as AppearanceScope))throw Error('Unknown appearance scope');
 if(typeof input.publish!=='boolean')throw Error('Choose draft or publish');
 const tokens=parseAppearance(input.tokens);const scopes=scope==='all'?[...appearanceScopes]:[scope as AppearanceScope];
 state.draftAppearance||={};for(const selected of scopes)state.draftAppearance[selected]=tokens;
 if(input.publish){state.appearance||={};for(const selected of scopes)state.appearance[selected]=tokens;if(scopes.includes('tv'))state.theme=tokens.theme as TVTheme;state.revision++;state.appearanceHistory||=[];state.appearanceHistory.unshift({revision:state.revision,at:new Date().toISOString(),scope,appearance:structuredClone(state.appearance)});state.appearanceHistory=state.appearanceHistory.slice(0,30);}
 state.audit.unshift({action:input.publish?'appearance.publish':'appearance.draft',actorId,theme:scope,at:new Date().toISOString()});
}
