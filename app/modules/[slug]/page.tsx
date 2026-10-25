import AdminShell from '@/components/AdminShell';
import Dashboard from '@/components/Dashboard';
import LiveModule from '@/components/LiveModule';
import DemoData from '@/components/DemoData';
import InterfaceStudio from '@/components/InterfaceStudio';
import AppearanceStudio from '@/components/AppearanceStudio';
import TVLauncherStudio from '@/components/TVLauncherStudio';
import {modules} from '@/lib/modules';
import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!modules.some(x=>x[0]===slug))notFound();
 return <AdminShell>{slug==='dashboard'?<Dashboard/>:slug==='demo-data'?<DemoData/>:slug==='interface-preview'?<InterfaceStudio/>:slug==='appearance'?<AppearanceStudio/>:slug==='tv-launcher-studio'?<TVLauncherStudio/>:<LiveModule slug={slug}/>}</AdminShell>;
}
