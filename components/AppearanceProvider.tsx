'use client';
import {useEffect,useState} from 'react';
import {fontStacks,fromPreset,type AppearanceTokens} from '@/lib/appearance-schema';
export default function AppearanceProvider({children}:{children:React.ReactNode}){
 const [tokens,setTokens]=useState<AppearanceTokens>(()=>fromPreset('neon'));
 useEffect(()=>{let live=true;async function refresh(){try{const response=await fetch('/api/config?surface=admin',{cache:'no-store'});const data=await response.json();if(live&&data.appearance)setTokens(data.appearance);}catch{}}
 void refresh();const interval=setInterval(refresh,30000);const channel=new BroadcastChannel('savrdh-appearance');channel.onmessage=()=>void refresh();window.addEventListener('savrdh:appearance',refresh);return()=>{live=false;clearInterval(interval);channel.close();window.removeEventListener('savrdh:appearance',refresh);};},[]);
 useEffect(()=>{const root=document.documentElement;for(const [variable,key]of [['--ap-bg','background'],['--ap-panel','panel'],['--ap-accent','accent'],['--ap-text','text']] as const)root.style.setProperty(variable,tokens[key]);root.style.setProperty('--ap-font',fontStacks[tokens.font]||fontStacks.apple);root.style.setProperty('--ap-radius',tokens.radius+'px');root.style.setProperty('--ap-glow',tokens.glow+'px');root.style.setProperty('--ap-duration',18/tokens.speed+'s');root.dataset.motion=tokens.motion;root.dataset.textMotion=tokens.textMotion;root.dataset.logoMotion=tokens.logoMotion;root.dataset.effect=tokens.effect;},[tokens]);
 return <><div aria-hidden="true" className="admin-motion-backdrop" data-motion={tokens.motion}><div className="ap-ambient"><i/><i/><i/>{Array.from({length:16},(_,i)=><span key={i} style={{left:(i*6.5)+'%',animationDelay:(-i*1.7)+'s'}}>0101<br/>サヴ<br/>1010<br/>SAVRDH</span>)}</div></div>{children}</>;
}
