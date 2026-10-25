const CACHE='savrdh-remote-v2';const FILES=['./remote.html','./remote.css','./remote.js','./remote-icon.svg','./appearance-presets.js','./appearance-runtime.js','./appearance-effects.css'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('savrdh-remote-')&&key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||!FILES.some(file=>new URL(file,self.location.href).href===event.request.url))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));});
