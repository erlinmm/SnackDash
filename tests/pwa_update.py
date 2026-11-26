"""Exercise a real service-worker upgrade with two concurrently open tabs."""
import asyncio
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]

class UncachedHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

def version(site):
    return re.search(r'<meta name="snackdash-version" content="([a-f0-9]+)">',
                     (site/'index.html').read_text()).group(1)

async def check(url, live, next_site):
    old, new = version(live), version(next_site)
    assert old != new
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=['--no-sandbox'])
        context = await browser.new_context(viewport={'width':390,'height':844})
        page = await context.new_page()
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(url)
        await page.wait_for_function('!!navigator.serviceWorker.controller', timeout=20000)
        assert await page.locator('#pwaUpdatePanel').is_hidden()
        await page.evaluate("""() => {
          const best={};for(let i=1;i<=9;i++)best[i]=10;
          localStorage.setItem('snackDashSaveV2',JSON.stringify({best,sound:false,
            selectedCity:0,unlockedCities:2,invitationsAcknowledged:[1]}));
        }""")
        await page.reload()
        await page.locator('#startBtn').click()
        second=await context.new_page()
        second.on('pageerror', lambda e: errors.append(str(e)))
        await second.goto(url)
        await second.locator('#startBtn').click()

        # Publish the next version while both races are open.
        for f in next_site.iterdir():
            shutil.copy2(f, live/f.name)
        await page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
        await page.wait_for_function('async()=>!!(await navigator.serviceWorker.getRegistration()).waiting', timeout=20000)
        assert await page.locator('#pwaUpdatePanel').is_hidden()
        assert await second.locator('#pwaUpdatePanel').is_hidden()
        assert await page.locator('meta[name="snackdash-version"]').get_attribute('content') == old
        await page.locator('#levelsBtn').click()
        await page.locator('#pwaUpdatePanel').wait_for(state='visible')
        # PWA update UI is localized even though it is injected after the game boots.
        await page.locator('#languageSelect').select_option('zh-Hans')
        assert await page.locator('#pwaUpdatePanel strong').text_content()=='新版本已准备好！'
        assert await page.locator('#pwaApply').text_content()=='更新并继续'
        assert await page.locator('#pwaLater').text_content()=='稍后'
        assert '版本 ' in await page.locator('#menuScreen .save-hint').last.text_content()
        await page.locator('#languageSelect').select_option('en-GB')
        assert await page.locator('#pwaUpdatePanel strong').text_content()=='A new update is ready!'
        await page.locator('#languageSelect').select_option('zh-Hans')
        await page.locator('#pwaLater').click()
        assert await page.locator('#pwaUpdatePanel').is_hidden()
        await page.locator('#startBtn').click()
        await page.locator('#levelsBtn').click()
        await page.locator('#pwaUpdatePanel').wait_for(state='visible')
        await page.locator('#pwaApply').click()
        await page.wait_for_function("(v)=>document.querySelector('meta[name=snackdash-version]').content===v",arg=new,timeout=20000)
        assert await page.locator('#pwaUpdatePanel').is_hidden()
        # No interruption in the other tab; it can update on its own terms.
        assert await second.locator('meta[name="snackdash-version"]').get_attribute('content') == old
        assert await second.locator('#gameScreen').is_visible()
        await second.locator('#levelsBtn').click()
        await second.locator('#pwaUpdatePanel').wait_for(state='visible')
        await second.locator('#pwaApply').click()
        await second.wait_for_function("(v)=>document.querySelector('meta[name=snackdash-version]').content===v",arg=new,timeout=20000)
        prefs=await page.evaluate("window.SnackDashDebug.getPrefs()")
        assert prefs['best']['9']==10 and prefs['sound'] is False
        assert prefs['unlockedCities']==2 and prefs['invitationsAcknowledged']==[1]
        await context.set_offline(True)
        await page.reload()
        assert await page.locator('meta[name="snackdash-version"]').get_attribute('content') == new
        await page.locator('#startBtn').click()
        assert await page.locator('#scene').is_visible()
        assert not errors,errors
        await browser.close()

if __name__=='__main__':
    with tempfile.TemporaryDirectory() as tmp:
        base=Path(tmp)
        live=base/'SnackDash'
        shutil.copytree(ROOT/'site',live)
        changed=base/'changed.html'
        changed.write_text((ROOT/'dist'/'Snack_Dash.html').read_text(encoding='utf-8')+'\n<!-- next version -->',encoding='utf-8')
        next_site=base/'next'
        subprocess.run([sys.executable,str(ROOT/'scripts'/'build_pwa.py'),str(changed),str(next_site)],check=True)
        with ThreadingHTTPServer(('127.0.0.1',0),partial(UncachedHandler,directory=str(base))) as server:
            thread=threading.Thread(target=server.serve_forever,daemon=True)
            thread.start()
            try:
                asyncio.run(check(f'http://127.0.0.1:{server.server_port}/SnackDash/',live,next_site))
            finally:
                server.shutdown()
    print('PWA update, Later, race safety, two tabs, saved progress and offline reload passed')
