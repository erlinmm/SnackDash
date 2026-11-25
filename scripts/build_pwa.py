"""Package a tested offline HTML build as an installable web app."""
import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path

def icon(size):
    # Original vector-like banana emblem rendered into a PNG without dependencies.
    import math
    rows=[]
    for y in range(size):
        row=bytearray()
        for x in range(size):
            u,v=(x+.5)/size,(y+.5)/size
            r=math.hypot(u-.48,v-.40)
            banana=.23<r<.36 and v>.39 and u>.16 and u<.84
            tip=(.15<u<.23 or .77<u<.85) and .40<v<.47
            row.extend((255,218,76) if banana else (122,80,41) if tip else (32,96,97))
        rows.append(b'\x00'+row)
    def chunk(t,d):
        return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')

def package(source, site):
    site.mkdir(parents=True,exist_ok=True)
    page=source.read_text(encoding='utf-8')
    head='<link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" href="./icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default">'
    script="<script>if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));</script>"
    page=page.replace('</head>',head+'</head>',1).replace('</body>',script+'</body>',1)
    (site/'index.html').write_text(page,encoding='utf-8')
    manifest={'id':'./','name':'SnackDash','short_name':'SnackDash','start_url':'./','scope':'./','display':'standalone','orientation':'any','background_color':'#fff9ed','theme_color':'#fff8ec','icons':[{'src':f'icon-{n}.png','sizes':f'{n}x{n}','type':'image/png','purpose':'any'} for n in (192,512)]}
    (site/'manifest.webmanifest').write_text(json.dumps(manifest),encoding='utf-8')
    for n in (192,512):
        (site/f'icon-{n}.png').write_bytes(icon(n))
    version=hashlib.sha256(b''.join((site/f).read_bytes() for f in ('index.html','manifest.webmanifest','icon-192.png','icon-512.png'))).hexdigest()[:16]
    worker="""const CACHE='snackdash-v-VERSION';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
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
