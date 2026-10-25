'use client';
import {useEffect,useState} from 'react';
import {readModule,createAdminRecord} from '@/lib/live-data';
import {realModules} from '@/lib/real-module-map';
import {moduleConfigs} from '@/lib/module-configs';
export default function LiveModule({slug}:{slug:string}){
 const [rows,setRows]=useState<Record<string,unknown>[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[name,setName]=useState('');
 async function load(){setLoading(true);try{setRows(await readModule(slug));setError('')}catch(e){setError(String(e))}finally{setLoading(false)}}
 useEffect(()=>{void load()},[slug]);
 async function save(){try{await createAdminRecord(slug,name);setName('');await load()}catch(e){setError(String(e))}}
 const config=moduleConfigs[slug];
 const [search,setSearch]=useState('');
 const cols=config?.fields.map(f=>f.key)||[];
 const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
 return <main className="page"><div className="heading"><div><div className="eyebrow">LIVE DATABASE / {realModules[slug]}</div><h1>{config?.title||slug}</h1><p>{config?.description} · Live Supabase records</p></div><button onClick={()=>void load()}>Refresh</button></div>{config?.notice&&<p className="demo-tag">{config.notice}</p>}<section className="mini-kpis"><div className="panel"><span>Loaded records</span><b>{rows.length}</b></div><div className="panel"><span>Source</span><b style={{fontSize:18}}>Supabase</b></div><div className="panel"><span>Permissions</span><b style={{fontSize:18}}>{config?.write?'Admin CRUD':'Read Only'}</b></div></section><section className="panel"><div className="toolbar"><input aria-label="Search records" placeholder="Search loaded records" value={search} onChange={e=>setSearch(e.target.value)}/></div>{error&&<p role="alert" className="error">{error}</p>}{loading?<p>Loading…</p>:<div className="table-wrap"><table><thead><tr>{config?.fields.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{filtered.map((r,i)=><tr key={String(r.id||i)}>{cols.map(c=><td key={c}>{typeof r[c]==='object'?JSON.stringify(r[c]):String(r[c]??'—')}</td>)}</tr>)}</tbody></table>{!rows.length&&<p>No records found in database.</p>}</div>}</section>{realModules[slug]==='tvos_module_records'&&<section className="panel"><h2>Add record</h2><div className="toolbar"><input aria-label="Name" value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/><button className="primary" onClick={()=>void save()}>Save to Supabase</button></div></section>}</main>
}