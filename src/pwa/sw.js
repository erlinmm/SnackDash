const VERSION='__BUILD_VERSION__';
const CACHE='snackdash-v-'+VERSION;
const ASSETS=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./icon-maskable-512.png'];
const indexURL=new URL('./index.html',self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try {
    await cache.addAll(ASSETS.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));
    const html=await (await cache.match(indexURL)).text();
    if(!html.includes('<meta name="snackdash-version" content="'+VERSION+'">'))
      throw new Error('PWA build does not match the worker');
  } catch(error) {
    await caches.delete(CACHE);
    throw error;
  }
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='ACTIVATE_UPDATE')event.waitUntil(self.skipWaiting());
  else if(event.data?.type==='GET_VERSION' && event.ports[0])
    event.ports[0].postMessage({version:VERSION});
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()){
    if(key.startsWith('snackdash-v-') && key!==CACHE)await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||!request.url.startsWith(self.registration.scope))return;
  const url=new URL(request.url);
  if(request.mode==='navigate' && (url.pathname===new URL(self.registration.scope).pathname || url.pathname===new URL(indexURL).pathname)){
    // Keep HTML and worker on the same version until the user opts in.
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(indexURL)).then(hit=>hit||fetch(request)));
  }else{
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(request)).then(hit=>hit||fetch(request)));
  }
});
