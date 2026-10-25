import {browserClient} from './supabase';
import {realModules} from './real-module-map';
export async function readModule(slug:string){
 const table=realModules[slug];
 if(!table)throw new Error('Unsupported module');
 const query=browserClient().from(table).select('*').limit(100);
 const {data,error}=await (table==='tvos_module_records'?query.eq('module_slug',slug):query);
 if(error)throw error;
 return data??[];
}
export async function createAdminRecord(slug:string,name:string,status='draft'){
 if(realModules[slug]!=='tvos_module_records')throw new Error('Read-only module');
 const client=browserClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)throw new Error('Authentication required');
 const {data,error}=await client.from('tvos_module_records').insert({module_slug:slug,name,status,created_by:user.id}).select().single();
 if(error)throw error;
 return data;
}

export async function updateAdminRecord(slug:string,id:string,changes:{name:string;status:string}){
 if(realModules[slug]!=='tvos_module_records')throw new Error('Read-only module');
 const {data,error}=await browserClient().from('tvos_module_records').update(changes).eq('id',id).eq('module_slug',slug).select().single();
 if(error)throw error;
 return data;
}
export async function deleteAdminRecord(slug:string,id:string){
 if(realModules[slug]!=='tvos_module_records')throw new Error('Read-only module');
 const {error}=await browserClient().from('tvos_module_records').delete().eq('id',id).eq('module_slug',slug);
 if(error)throw error;
}
