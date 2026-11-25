"""Optional Chromium smoke tests. CI installs Playwright and Chromium."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

HTML = Path(__file__).resolve().parents[1] / 'dist/Snack_Dash.html'


async def check(browser, width, height):
    page = await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.set_content(HTML.read_text(encoding='utf-8'), wait_until='load')
    await page.locator('#startBtn').click()
    await page.wait_for_timeout(1900)
    dims=await page.evaluate('''() => ({
      tray:document.querySelector('.game-control-strip').getBoundingClientRect().bottom,
      viewport:window.visualViewport.height,
      width:document.querySelector('#sceneShell').getBoundingClientRect().width,
      time:document.querySelector('#hudTime').textContent
    })''')
    # Canvas object is not serializable; only inspect the primitive values.
    assert not errors, (width,height,errors)
    assert dims['width']>0
    assert dims['tray']<=dims['viewport']+3,(width,height,dims)

    # Regression: the tray tap changes the hand immediately and confirms the
    # swap AT THE VOLUNTEER'S HAND, without a SWAPPED text effect. The view
    # and touch zones remain identical on narrow and tall phones.
    before=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      return {held:g.supplies.held.number,tray:g.supplies.queue[0].number,
              phase:g.phase};
    }""")
    assert before['phase']=='playing',(width,height,before)
    scene=await page.locator('#scene').bounding_box()
    await page.mouse.click(scene['x']+scene['width']*(50/390),
                           scene['y']+scene['height']*(89/700))
    after=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      return {held:g.supplies.held.number,tray:g.supplies.queue[0].number,
              cue:g.swapCue && {...g.swapCue},
              swapLabel:g.effects.some(e=>e.text==='SWAPPED!')};
    }""")
    assert after['held']==before['tray'],(width,height,before,after)
    assert after['tray']==before['held'],(width,height,before,after)
    assert after['cue'] is not None and after['cue']['number']==before['tray'],after
    assert not after['swapLabel'],after

    # A second tap during the cue resets it instead of queuing a long effect.
    await page.mouse.click(scene['x']+scene['width']*(122/390),
                           scene['y']+scene['height']*(89/700))
    next_cue=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      return {cue:g.swapCue && {...g.swapCue},held:g.supplies.held.number};
    }""")
    assert next_cue['cue'] and next_cue['cue']['number']==next_cue['held'],next_cue

    # Immediate throw is allowed: the visual cue cannot lock input.
    can_throw=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      const r=g.runners.find(r=>g.onScreen(r) && r.y>120 && r.y<600);
      if(!r)return false;
      g.tryThrow(g.runnerX(r), r.y+5);
      return !!g.throwing && g.swapCue===null;
    }""")
    assert can_throw,(width,height,"swap cue blocked an immediate throw")
    assert not errors,(width,height,errors)
    await page.close()


async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True, executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or None, args=['--no-sandbox'])
        for dims in [(320,568),(360,740),(390,844),(414,896)]:
            await check(browser,*dims)
            print('Smoke passed:',dims)
        await browser.close()


if __name__=='__main__':
    asyncio.run(main())
