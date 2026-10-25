export const modules=[
['dashboard','Dashboard','Command center'],['tv-launcher-studio','TV Launcher Studio','TV launcher presets and live styling'],['interface-preview','Interface Preview Studio','Android TV, Parent and Mobile UI'],['demo-data','Demo Data Manager','Generate and delete isolated test records'],['devices','Device Management','Connected TV and mobile inventory'],['families','Users & Families','Parent and child accounts'],['parental-controls','Parental Controls','App restrictions and bedtime'],['screen-time','Screen-Time Analytics','Usage insights'],['subscriptions','Subscriptions','Plans and renewals'],['payments','Payments','Reconciliation ledger'],['updates','App & OS Updates','Release management'],['content','Content & Apps','App approval catalog'],['appearance','Appearance Studio','Global theme controls'],['family-shield','Family Shield','Safety incidents'],['notifications','Notifications','Delivery templates'],['support','Support Center','Support queue'],['reports','Reports & Analytics','Downloads and snapshots'],['security','Security & Audit','Account and action logs'],['settings','System Settings','Platform configuration']
] as const;
export type ModuleSlug=typeof modules[number][0];
export const columns:Record<string,string[]>={
devices:['Device','Family','Type','OS version','Status'],families:['Family','Parent','Child profiles','Plan','Status'],
'parental-controls':['Rule','Family','App / Category','Schedule','Status'],'screen-time':['Child','App','Daily minutes','Limit','Status'],
subscriptions:['Family','Plan','Renewal date','Amount','Status'],payments:['Transaction','Family','Amount','Method','Status'],
updates:['Version','Channel','Devices','Released','Status'],content:['App','Category','Age rating','Policy','Status'],
'family-shield':['Incident','Family','Severity','Reported','Status'],notifications:['Campaign','Channel','Audience','Delivered','Status'],
support:['Ticket','Family','Priority','Assigned','Status'],reports:['Report','Period','Created','Format','Status'],
security:['Event','Actor','IP / Device','Timestamp','Status'],settings:['Setting','Description','Value','Scope','Status']
};
export function defaultRows(slug:string){return Array.from({length:5},(_,i)=>Object.fromEntries((columns[slug]||[]).map((col,j)=>[col,j===0?'Sample '+(i+1):j===4?['Active','Pending','Review'][i%3]:j===1?'Demo family '+(i+1):j===2?String(i+1):'—'])))};