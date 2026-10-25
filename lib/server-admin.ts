import 'server-only';
import {createServerClient, type CookieOptions} from '@supabase/ssr';
import {cookies} from 'next/headers';
export async function requirePlatformAdmin() {
  const jar = await cookies();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new Error('Supabase configuration missing');
  const client=createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:(values:{name:string;value:string;options:CookieOptions}[])=>{for(const {name,value,options} of values)jar.set(name,value,options);}}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return null;
  const {data:role,error:roleError}=await client.from('platform_admins').select('role,active').eq('user_id',user.id).single();
  return !roleError&&role?.active&&role.role==='super_admin'?{user,client}:null;
}
