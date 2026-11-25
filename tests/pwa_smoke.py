"""Verify the published app over HTTP, including an offline cold reload."""
import asyncio
import json
import struct
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright

SITE = Path(__file__).resolve().parents[1] / 'site'

async def check(url):
    manifest = json.loads((SITE / 'manifest.webmanifest').read_text())
    assert manifest['display'] == 'standalone'
    assert manifest['scope'] == manifest['start_url'] == './'
    assert {i['purpose'] for i in manifest['icons']} == {'any', 'maskable'}
    for item in manifest['icons'] + [{'src':'apple-touch-icon.png','sizes':'180x180'}]:
        data = (SITE / item['src']).read_bytes()
        assert data.startswith(b'\x89PNG\r\n\x1a\n')
        assert struct.unpack('>II', data[16:24]) == tuple(map(int,item['sizes'].split('x')))
    assert 'apple-touch-icon.png' in (SITE / 'index.html').read_text()
    assert './icon-maskable-512.png' in (SITE / 'sw.js').read_text()
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context(viewport={'width':390,'height':844})
        page = await context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        await page.goto(url, wait_until='load')
        await page.evaluate('navigator.serviceWorker.ready')
        await page.wait_for_function('!!navigator.serviceWorker.controller', timeout=20000)
        await page.locator('#startBtn').wait_for()
        await context.set_offline(True)
        await page.reload(wait_until='load')
        await page.locator('#startBtn').click()
        await page.wait_for_timeout(1900)
        assert await page.locator('#scene').is_visible()
        assert not errors, errors
        await browser.close()

if __name__ == '__main__':
    # Serve a nested project path just as GitHub Pages does.
    with ThreadingHTTPServer(('127.0.0.1',0), partial(SimpleHTTPRequestHandler,directory=str(SITE.parent))) as server:
        thread = threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        try:
            asyncio.run(check(f'http://127.0.0.1:{server.server_port}/site/'))
        finally:
            server.shutdown()
    print('PWA manifest, service worker and offline gameplay passed')
