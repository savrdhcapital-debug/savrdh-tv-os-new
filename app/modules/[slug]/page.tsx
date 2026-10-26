import AdminShell from '@/components/AdminShell';
import TrialRequests from '@/components/TrialRequests';
import OperationsModule from '@/components/OperationsModule';
import RemoteAndSetup from '@/components/RemoteAndSetup';
import DemoData from '@/components/DemoData';
import InterfaceStudio from '@/components/InterfaceStudio';
import AppearanceStudio from '@/components/AppearanceStudio';
import TVExperienceStudio from '@/components/TVExperienceStudio';
import {modules} from '@/lib/modules';
import {notFound,redirect} from 'next/navigation';
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(slug==='tv-launcher-studio')redirect('/modules/tv-studio');
 if(!modules.some(x=>x[0]===slug))notFound();
 return <AdminShell>{slug==='dashboard'?<OperationsModule slug="dashboard"/>:slug==='trial-requests'?<TrialRequests/>:slug==='demo-data'?<DemoData/>:slug==='interface-preview'?<InterfaceStudio/>:slug==='appearance'?<AppearanceStudio/>:slug==='tv-studio'?<TVExperienceStudio/>:slug==='mobile-remote'?<RemoteAndSetup/>:slug==='installation'?<RemoteAndSetup setup/>:slug==='updates'?<TVExperienceStudio initialTab="releases"/>:<OperationsModule slug={slug}/>}</AdminShell>;
}
