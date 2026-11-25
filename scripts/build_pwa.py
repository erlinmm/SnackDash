"""Package a tested offline HTML build as an installable web app."""
import hashlib
import json
import sys
from pathlib import Path

from pwa_icon import icon


def package(source, site):
    site.mkdir(parents=True,exist_ok=True)
    page=source.read_text(encoding='utf-8')
    head='<link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png"><link rel="icon" type="image/png" sizes="192x192" href="./icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default">'
    script="<script>if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));</script>"
    page=page.replace('</head>',head+'</head>',1).replace('</body>',script+'</body>',1)
    (site/'index.html').write_text(page,encoding='utf-8')
    manifest={'id':'./','name':'SnackDash','short_name':'SnackDash','start_url':'./','scope':'./','display':'standalone','orientation':'any','background_color':'#fff9ed','theme_color':'#fff8ec','icons':[{'src':f'icon-{n}.png','sizes':f'{n}x{n}','type':'image/png','purpose':'any'} for n in (192,512)]+[{'src':'icon-maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]}
    (site/'manifest.webmanifest').write_text(json.dumps(manifest),encoding='utf-8')
    for n in (192,512):
        (site/f'icon-{n}.png').write_bytes(icon(n))
    (site/'apple-touch-icon.png').write_bytes(icon(180))
    (site/'icon-maskable-512.png').write_bytes(icon(512, maskable=True))
    version=hashlib.sha256(b''.join((site/f).read_bytes() for f in ('index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','icon-maskable-512.png'))).hexdigest()[:16]
    worker="""const CACHE='snackdash-v-VERSION';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('snackdash-v-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;
 if(e.request.mode==='navigate'){
   e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('./index.html'))));
 }else{
   e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)));
 }
});
""".replace('VERSION',version)
    (site/'sw.js').write_text(worker,encoding='utf-8')

if __name__=='__main__':
    package(Path(sys.argv[1]),Path(sys.argv[2]))
