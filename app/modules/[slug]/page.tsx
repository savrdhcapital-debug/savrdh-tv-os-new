import AdminShell from '@/components/AdminShell';
import Dashboard from '@/components/Dashboard';
import LiveModule from '@/components/LiveModule';
import {modules} from '@/lib/modules';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!modules.some(x=>x[0]===slug))notFound();
 return <AdminShell>{slug==='dashboard'?<Dashboard/>:<LiveModule slug={slug}/>}</AdminShell>;
}
