'use client';
import {useEffect,useState} from 'react';
import {readModule,createAdminRecord} from '@/lib/live-data';
import {realModules} from '@/lib/real-module-map';
export default function LiveModule({slug}:{slug:string}){
 const [rows,setRows]=useState<Record<string,unknown>[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[name,setName]=useState('');
 async function load(){setLoading(true);try{setRows(await readModule(slug));setError('')}catch(e){setError(String(e))}finally{setLoading(false)}}
 useEffect(()=>{void load()},[slug]);
 async function save(){try{await createAdminRecord(slug,name);setName('');await load()}catch(e){setError(String(e))}}
 const cols=rows.length?Object.keys(rows[0]):[];
 return <main className="page"><h1>{slug.replaceAll('-',' ')}</h1><p>Supabase table: {realModules[slug]} · Live records (no demo data)</p><section className="panel">{error&&<p role="alert" className="error">{error}</p>}{loading?<p>Loading…</p>:<div className="table-wrap"><table><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={String(r.id||i)}>{cols.map(c=><td key={c}>{typeof r[c]==='object'?JSON.stringify(r[c]):String(r[c]??'—')}</td>)}</tr>)}</tbody></table>{!rows.length&&<p>No records found in database.</p>}</div>}</section>{realModules[slug]==='tvos_module_records'&&<section className="panel"><h2>Add record</h2><div className="toolbar"><input aria-label="Name" value={name} onChange={e=>setName(e.target.value)} placeholder="Name"/><button className="primary" onClick={()=>void save()}>Save to Supabase</button></div></section>}</main>
}