'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {browserClient} from '@/lib/supabase';
type Trial={id:string;customer_name:string;email:string;phone:string;status:'pending'|'approved'|'rejected';created_at:string;trial_starts_at:string|null;trial_ends_at:string|null};
const fmt=(date:string|null)=>date?new Date(date).toLocaleString('en-IN'):'—';
function stateOf(t:Trial){if(t.status==='approved'&&t.trial_ends_at&&Date.parse(t.trial_ends_at)<=Date.now())return 'expired';return t.status==='approved'?'active':t.status;}
export default function TrialRequests(){
 const [trials,setTrials]=useState<Trial[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[query,setQuery]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const load=useCallback(async()=>{setLoading(true);try{const {data,error}=await browserClient().from('tvos_trial_requests').select('id,customer_name,email,phone,status,created_at,trial_starts_at,trial_ends_at').order('created_at',{ascending:false}).limit(500);if(error)throw error;setTrials((data||[]) as Trial[]);setError('')}catch(e){setError(e instanceof Error?e.message:'Could not load trial requests')}finally{setLoading(false)}},[]);
 useEffect(()=>{void load()},[load]);
 async function review(t:Trial,status:'approved'|'rejected'){
  if(t.status!=='pending')return;
  if(!confirm(`${status==='approved'?'Start a 15-day trial for':'Reject request from'} ${t.customer_name}?`))return;
  setBusy(t.id);setError('');setSuccess('');
  try{const {data,error}=await browserClient().from('tvos_trial_requests').update({status}).eq('id',t.id).eq('status','pending').select('id,trial_ends_at').single();if(error)throw error;setSuccess(status==='approved'?`15-day trial approved. Expires ${fmt(data.trial_ends_at)}.`:'Request rejected.');await load()}catch(e){setError(e instanceof Error?e.message:'Review failed')}finally{setBusy('')}
 }
 const filtered=useMemo(()=>trials.filter(t=>[t.customer_name,t.email,t.phone,stateOf(t)].join(' ').toLowerCase().includes(query.toLowerCase())),[trials,query]);
 const counts={total:trials.length,pending:trials.filter(t=>t.status==='pending').length,active:trials.filter(t=>stateOf(t)==='active').length,expired:trials.filter(t=>stateOf(t)==='expired').length};
 return <main className="page"><div className="heading"><div><div className="eyebrow">SAVRDH TV OS / SUPABASE</div><h1>Trial Requests</h1><p>Customer enquiries, admin review and 15-day trial validity</p></div><button onClick={()=>void load()}>Refresh</button></div>
 <section className="kpi-grid">{Object.entries(counts).map(([name,num])=><article key={name} className="kpi"><div className="kpi-heading">{name.toUpperCase()}</div><div className="metric">{loading?'—':num}</div><span className="subtle">Live trial requests</span></article>)}</section>
 <p className="demo-tag">Approval records a time-limited trial in Supabase. TV access enforcement and paid renewal still need a verified customer-to-device link; this screen does not automatically unlock or block a TV.</p>
 {error&&<p role="alert" className="error">{error}</p>}{success&&<p role="status">{success}</p>}
 <section className="panel"><div className="toolbar"><input aria-label="Search trials" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email or status…"/></div><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Mobile</th><th>Email</th><th>Requested</th><th>Status</th><th>Trial Ends</th><th>Action</th></tr></thead><tbody>{filtered.map(t=><tr key={t.id}><td>{t.customer_name}</td><td>{t.phone}</td><td>{t.email}</td><td>{fmt(t.created_at)}</td><td><span className="status">{stateOf(t)}</span></td><td>{fmt(t.trial_ends_at)}</td><td>{t.status==='pending'?<div className="toolbar"><button disabled={!!busy} onClick={()=>void review(t,'approved')}>Approve 15 days</button><button disabled={!!busy} onClick={()=>void review(t,'rejected')}>Reject</button></div>:<span className="subtle">Reviewed</span>}</td></tr>)}</tbody></table>{!filtered.length&&<p className="empty">{loading?'Loading…':'No matching trial requests.'}</p>}</div></section></main>;
}
