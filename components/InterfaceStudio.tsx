'use client';
import {useState,useEffect} from 'react';
import TVSimulator from './TVSimulator';
type Surface='tv'|'parent'|'mobile';
const apps=[['YouTube','▶','#f04646'],['Netflix','N','#e63838'],['Prime Video','prime','#2d83ce'],['Kids Zone','★','#e0a93e'],['Live TV','▣','#2abda8'],['App Library','▦','#7b7ce0']];
export default function InterfaceStudio(){
 const [surface,setSurface]=useState<Surface>('tv');
 const [view,setView]=useState('home');
 const [accent,setAccent]=useState('#22dec2');
 const [child,setChild]=useState(false);
 const [clock,setClock]=useState('10:24');
 useEffect(()=>{const t=setInterval(()=>setClock(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false})),60000);return()=>clearInterval(t)},[]);
 return <main className="page"><div className="heading"><div><div className="eyebrow">DESIGN LAB / UI PROTOTYPES</div><h1>Interface Preview Studio</h1><p>Android TV, Parent Companion and Mobile screen previews</p></div><span className="demo-tag">VISUAL PROTOTYPE · NOT A LIVE DEVICE</span></div>
 <section className="panel"><div className="toolbar">
 {(['tv','parent','mobile'] as Surface[]).map(s=><button key={s} onClick={()=>{setSurface(s);setView('home')}} className={surface===s?'primary':''}>{s==='tv'?'Android TV':s==='parent'?'Parent App':'Mobile App'}</button>)}
 <label style={{display:'flex',alignItems:'center',gap:8}}>Accent <input aria-label="Preview accent" type="color" value={accent} onChange={e=>setAccent(e.target.value)}/></label>
 <button onClick={()=>{setChild(false);setView('home')}}>Reset Preview</button>
 </div><p style={{color:'#9cbcc3'}}>Click cards to switch screens. TV preview uses large focusable actions that also support Tab / Enter keyboard navigation.</p></section>
 {surface==='tv'?<TVSimulator/>:<div className="phone-shell"><div className="phone-screen"><div className="phone-notch"/><div className="phone-brand" style={{color:accent}}>SAVRDH {surface==='parent'?'PARENT':'MOBILE'}</div><p>Good morning, Family</p><h2>{surface==='parent'?'Protect what matters.':'Your entertainment, everywhere.'}</h2><div className="phone-primary" style={{background:accent}}> {surface==='parent'?'Family Protection Active':'Connected to TV OS'}</div><div className="phone-tiles">{(surface==='parent'?['Children','Screen Time','App Rules','Pair TV','Requests','Alerts']:['My Devices','Apps','Watchlist','Remote','Profiles','Settings']).map(x=><button onClick={()=>setView(x)} key={x} className={view===x?'active':''}>{x}</button>)}</div><h3>{view==='home'?'Recent Activity':view}</h3><div className="phone-event">Living Room TV <span>Connected</span></div><div className="phone-event">Family profile <span>Active</span></div><div className="phone-event">Data source <span>Demo</span></div><div className="phone-bottom">Home　 Devices　 Settings</div></div></div>}
 <p style={{color:'#9dbdc1',fontSize:12}}>Browser simulation uses the Android app interface. Native Android source is included locally; APK compilation and real TV tests are pending. HDMI switching, parental enforcement and parent-device pairing are not implemented.</p>
 </main>
}
