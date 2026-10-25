import AdminShell from '@/components/AdminShell';
import Dashboard from '@/components/Dashboard';
import LiveModule from '@/components/LiveModule';
import DemoData from '@/components/DemoData';
import {modules} from '@/lib/modules';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!modules.some(x=>x[0]===slug))notFound();
 return <AdminShell>{slug==='dashboard'?<Dashboard/>:slug==='demo-data'?<DemoData/>:<LiveModule slug={slug}/>}</AdminShell>;
}
