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
    manifest={'id':'./','name':'SnackDash','short_name':'SnackDash','start_url':'./','scope':'./','display':'standalone','orientation':'portrait','background_color':'#fff9ed','theme_color':'#fff8ec','icons':[{'src':f'icon-{n}.png','sizes':f'{n}x{n}','type':'image/png','purpose':'any'} for n in (192,512)]+[{'src':'icon-maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]}
    (site/'manifest.webmanifest').write_text(json.dumps(manifest),encoding='utf-8')
    for n in (192,512):
        (site/f'icon-{n}.png').write_bytes(icon(n))
    (site/'apple-touch-icon.png').write_bytes(icon(180))
    (site/'icon-maskable-512.png').write_bytes(icon(512, maskable=True))
    templates=Path(__file__).resolve().parents[1]/'src'/'pwa'
    client=(templates/'update.js').read_text(encoding='utf-8')
    css=(templates/'update.css').read_text(encoding='utf-8')
    worker=(templates/'sw.js').read_text(encoding='utf-8')
    payload=(page+head+client+css+worker).encode('utf-8')
    version=hashlib.sha256(payload+b''.join((site/f).read_bytes() for f in ('manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','icon-maskable-512.png'))).hexdigest()[:16]
    meta=f'<meta name="snackdash-version" content="{version}">'
    page=page.replace('</head>',head+meta+'<style>'+css+'</style></head>',1).replace('</body>','<script>'+client+'</script></body>',1)
    (site/'index.html').write_text(page,encoding='utf-8')
    (site/'sw.js').write_text(worker.replace('__BUILD_VERSION__',version),encoding='utf-8')


if __name__=='__main__':
    package(Path(sys.argv[1]),Path(sys.argv[2]))
