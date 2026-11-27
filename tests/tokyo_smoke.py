"""Browser acceptance tests for the actual offline Tokyo landscape build.

The deterministic gameplay loop accelerates elapsed time in test only. It
calls the same tryThrow/update/resolveHit path as pointer play. QA screenshots
are from the running Canvas and HUD, not generated images.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "dist/Snack_Dash_Tokyo_Preview.html"
OUT = ROOT / "dist/tokyo-review"
OUT.mkdir(parents=True, exist_ok=True)
URL = HTML.as_uri()
checks = []
perf = []

def record(name, **details):
    checks.append({"check": name, **details})
    print("PASS", name, details, flush=True)

def wait_playing(page):
    page.wait_for_function("window.SnackDashDebug.getGame() !== null", timeout=5000)
    page.evaluate("""() => {
      const g=SnackDashDebug.getGame();
      for(let i=0;i<100&&g.phase==='countdown';i++)g.update(.05);
      g.goFlash=0;
      if(g.phase!=='playing')throw Error('Race did not start: '+g.phase);
    }""")

def start(page, race):
    page.locator('[data-race="%s"]' % race).click()
    page.locator('#startBtn').click()
    wait_playing(page)

def back(page):
    page.locator('#levelsBtn').click()
    page.locator('#menuScreen').wait_for(state='visible')

def point(page, logical_x, logical_y):
    bounds = page.locator('#scene').bounding_box()
    return (bounds["x"] + bounds["width"] * logical_x / 1280,
            bounds["y"] + bounds["height"] * logical_y / 720)

def tap(page, x, y, touch=False):
    sx, sy = point(page, x, y)
    (page.touchscreen.tap if touch else page.mouse.click)(sx, sy)

def state(page):
    return page.evaluate("""() => {
      const g=SnackDashDebug.getGame();
      return {held:g.supplies.held.number,queue:g.supplies.queue.map(s=>s.number),
        score:g.score,correct:g.correct,wrong:g.wrong,combo:g.combo,fever:g.fever,
        inferno:g.inferno,phase:g.phase,seconds:g.config.seconds,race:g.config.event,
        count:g.runners.length};
    }""")

def swap_both(page, touch=False):
    slots = page.evaluate("SnackDashTokyoQA.geometry().slots")
    for i, b in enumerate(slots):
        before = state(page)
        assert len(before["queue"]) == 2, before
        tap(page, b["x"]+b["w"]/2, b["y"]+b["h"]/2, touch)
        after = state(page)
        assert after["held"] == before["queue"][i], (before, after)
        assert after["queue"][i] == before["held"], (before, after)
        assert after["score"] == before["score"]
    record("both physical tray swaps", input="touch" if touch else "mouse")

# No scoring implementation is copied into the test. The expected outcome
# comes from the same public mathematical contract used by the normal game.
HITS_JS = """({count, correct}) => {
  const g=SnackDashDebug.getGame(),m=GameMath,steps=[];
  function advanceThrow(){
    for(let i=0;i<40&&g.throwing;i++)g.update(.02);
    if(g.throwing)throw Error('Throw did not recover');
  }
  for(let hit=0;hit<count;hit++){
    advanceThrow();
    if(g.phase!=='playing')throw Error('Not playing: '+g.phase);
    let chosen=null;
    for(let retry=0;retry<6&&!chosen;retry++){
      const targets=g.runners.filter(r=>g.onScreen(r)&&
        m.matches(g.supplies.held.number,r.number)===correct)
        .sort((a,b)=>Math.abs(a.y-390)-Math.abs(b.y-390));
      for(const r of targets){
        g.throwSupply(r.id);
        if(!g.throwing)continue;
        const actual=g.runners.find(a=>a.id===g.throwing.runnerId);
        if(actual&&m.matches(g.throwing.supply.number,actual.number)===correct){
          chosen=actual;break;
        }
        throw Error('Semantic target mismatch');
      }
      if(!chosen){
        for(let i=0;i<10;i++)g.update(.025);
      }
    }
    if(!chosen)throw Error('No tappable target for '+correct);
    const before=g.score,prior=chosen.number,supply=g.throwing.supply.number;
    const outcome=m.resolveHit(g.combo,g.fever,chosen.successes,correct);
    const expectedBib=correct?m.transformRunnerNumber(prior,supply):prior;
    advanceThrow();
    if(g.score!==before+outcome.delta||g.combo!==outcome.combo||
       g.fever!==outcome.fever||g.inferno!==outcome.inferno)
      throw Error('Canonical score/mode mismatch');
    if(chosen.number!==expectedBib)throw Error('Canonical bib transform mismatch');
    g.assertReady();
    g.draw(); // Exercise the real renderer during each catch, not only QA stills.
    if(g.supplies.queue.length>2)throw Error('Invisible third supply');
    steps.push({combo:g.combo,score:g.score,delta:outcome.delta,
      fever:g.fever,inferno:g.inferno,prior,supply,bib:chosen.number});
  }
  return steps;
}"""

def assert_dimensions(page):
    g = page.evaluate("SnackDashTokyoQA.geometry()")
    b = page.locator('#scene').bounding_box()
    assert (g["width"], g["height"], g["lanes"]) == (1280,720,3), g
    assert g["assetsReady"] and g["schemaVersion"]==2,g
    assert g["cityId"]=="tokyo",g
    assert g["runnerCast"]>=2 and g["runFrames"]>=g["runnerCast"],g
    assert g["pages"]<g["sprites"],g
    assert page.evaluate("Object.values(SnackDashAssetPack.images).every(x=>!x.startsWith('data:image/svg'))")
    assert len(g["slots"]) == 2 and g["scaleAt"][0] < g["scaleAt"][1] < g["scaleAt"][2], g
    assert abs(b["width"]/b["height"]-16/9) < .025, b
    viewport = page.viewport_size
    for key in ("levelsBtn","timePill","hudScore","comboPanel","restartBtn","pauseBtn","tokyoSoundBtn","gameFullscreenBtn"):
        r=page.locator("#"+key).bounding_box()
        assert r and r["x"] >= -1 and r["y"] >= -1 and r["x"]+r["width"]<=viewport["width"]+1 and r["y"]+r["height"]<=viewport["height"]+1, (key,r,viewport)
    return g

def finish(page, won):
    page.evaluate("""() => {
      const g=SnackDashDebug.getGame();g.remaining=.001;g.update(.02);
      if(g.phase==='celebrate')for(let i=0;i<65&&!g.resultsShown;i++)g.update(.05);
    }""")
    page.locator('#resultOverlay').wait_for(state='visible')
    actual = page.evaluate("SnackDashDebug.getGame().score >= 10")
    assert actual == won
    assert 'CITY UNLOCKED' not in page.locator('#resultHeading').inner_text().upper()
    page.locator('#backBtn').click()

def screenshot_six(page):
    table = None
    for gender in ("female","male"):
        page.locator("#tokyo"+gender.capitalize()).click()
        for mode in ("normal","fever","inferno"):
            page.locator(".qa-panel").evaluate("(e)=>e.open=true")
            before = page.evaluate("""() => JSON.stringify(Object.fromEntries(
              Object.keys(localStorage).filter(k=>k.startsWith('snackDashTokyoPreview')&&
              !k.includes('Staff')).map(k=>[k,localStorage.getItem(k)])))""")
            page.locator('[data-scene="%s"]' % mode).click()
            page.wait_for_timeout(120)
            geo = assert_dimensions(page)
            assert geo["fixture"] and geo["mode"] == mode and geo["staff"] == gender
            if table is None: table = geo["table"]
            assert geo["table"] == table
            if mode == "inferno": assert geo["staffFoot"] == table["contact"]
            else: assert geo["staffFoot"] > table["front"]
            page.locator('#gameScreen').screenshot(path=str(OUT / ("%s_%s.png" % (gender,mode))))
            back(page)
            after = page.evaluate("""() => JSON.stringify(Object.fromEntries(
              Object.keys(localStorage).filter(k=>k.startsWith('snackDashTokyoPreview')&&
              !k.includes('Staff')).map(k=>[k,localStorage.getItem(k)])))""")
            assert before == after, (before,after)
    page.locator(".qa-panel").evaluate("(e)=>e.open=true")
    page.locator('[data-scene="dense"]').click()
    assert state(page)["count"] == 8
    assert page.evaluate("SnackDashDebug.getGame().runners.some(r=>r.number===1000)")
    assert page.evaluate("""() => {
        const g=SnackDashDebug.getGame(),old=g.supplies.held.number;
        for(const n of [6,8,12,13]){
            g.supplies.held.number=n;g.draw();
            if(!g.runners.some(r=>GameMath.matches(n,r.number)))return false;
        }
        g.supplies.held.number=old;g.draw();
        return [12,18,24,321,1000].every(n=>g.runners.some(r=>r.number===n));
    }""")
    page.wait_for_timeout(100)
    page.locator('#gameScreen').screenshot(path=str(OUT/"dense_four_digit.png"))
    back(page)
    record("six actual game screenshots and dense fixture", count=7, qa_save_unchanged=True)

def measure(page, name):
    data = page.evaluate("""() => new Promise(resolve=>{
      const frames=[];let start=null,prev=null;
      function sample(t){
        if(start===null)start=t;
        if(prev!==null)frames.push(t-prev);
        prev=t;
        if(t-start<2500){requestAnimationFrame(sample);return;}
        frames.sort((a,b)=>a-b);
        resolve({frames:frames.length,fps:1000/(frames.reduce((a,b)=>a+b,0)/frames.length),
          medianMs:frames[Math.floor(frames.length*.5)],p95Ms:frames[Math.floor(frames.length*.95)]});
      }requestAnimationFrame(sample);
    })""")
    perf.append({"viewport":name,**data})
    print("PERFORMANCE",name,data,flush=True)

def run(browser):
    errors=[]
    def context(width,height,touch=False,dpr=1,reduced=False):
        ctx=browser.new_context(viewport={"width":width,"height":height},
            device_scale_factor=dpr,has_touch=touch,is_mobile=touch,
            reduced_motion="reduce" if reduced else "no-preference",offline=True)
        page=ctx.new_page()
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.on("console",lambda msg:errors.append(msg.text) if msg.type=="error" else None)
        page.goto(URL)
        page.locator("#startBtn").wait_for(state="visible")
        page.wait_for_function("document.documentElement.dataset.tokyoAssets==='ready'")
        return ctx,page

    ctx,page=context(1280,720)
    assert page.locator('[data-race]').count()==10
    assert page.evaluate("GameMath.LEVELS.length") == 100
    # Check all six mode/gender combinations from the real renderer first.
    screenshot_six(page)
    page.evaluate("""() => {
      localStorage.setItem('snackDashSaveV2','main-save-sentinel');
      localStorage.setItem('snackDashSaveV1','main-legacy-sentinel');
      localStorage.setItem('snackDashLocaleV1','main-locale-sentinel');
      localStorage.setItem('snackDashPracticeV1','main-practice-sentinel');
    }""")
    page.reload()
    page.wait_for_function("document.documentElement.dataset.tokyoAssets==='ready'")
    page.locator('#languageSelect').select_option('zh-Hans')
    assert page.locator('#tokyoFemale').inner_text().find('女补给员') >= 0
    assert page.evaluate("document.documentElement.lang") == 'zh-Hans'
    assert page.locator('#tokyoMale').get_attribute('aria-pressed')=='true'
    page.locator('#languageSelect').select_option('en-GB')
    page.locator('#tokyoFemale').click()
    # Stress the startup geometry with deterministic seeds, including the
    # eight-runner races which exposed the original rejection-sampling bug.
    starts=page.evaluate("""() => {
      const random=Math.random,now=Date.now,results=[];
      try{
        Date.now=()=>0;
        for(let race=1;race<=10;race++){
          for(let seed=1;seed<=12;seed++){
            Math.random=()=>seed*10091/0xFFFFFFFF;
            document.querySelector('[data-race="'+race+'"]').click();
            document.getElementById('startBtn').click();
            const g=SnackDashDebug.getGame();
            if(!g||g.config.event!==race)throw Error('Startup failed: '+race+'/'+seed);
            g.assertReady();
            results.push([race,seed,g.runners.length]);
            document.getElementById('levelsBtn').click();
          }
        }
      }finally{Math.random=random;Date.now=now}
      return results.length;
    }""")
    assert starts==120
    record("deterministic starting geometry", launches=starts)
    start(page,1)
    assert_dimensions(page)
    swap_both(page)
    # Real successful throws must drive both threshold transitions.
    hits=page.evaluate(HITS_JS,{"count":5,"correct":True})
    page.locator("#gameScreen").screenshot(path=str(OUT/"live_race_fever.png"))
    hits+=page.evaluate(HITS_JS,{"count":5,"correct":True})
    page.evaluate("for(let i=0;i<36;i++)SnackDashDebug.getGame().update(.05);SnackDashDebug.getGame().draw()")
    page.locator("#gameScreen").screenshot(path=str(OUT/"live_race_inferno.png"))
    assert hits[3]["combo"]==4 and not hits[3]["fever"]
    assert hits[4]["combo"]==5 and hits[4]["fever"] and not hits[4]["inferno"]
    assert hits[8]["combo"]==9 and not hits[8]["inferno"]
    assert hits[9]["combo"]==10 and hits[9]["inferno"]
    record("real correct throws and exact score/bib transitions", hits=hits)
    misses=page.evaluate(HITS_JS,{"count":1,"correct":False})
    assert misses[0]["combo"]==0 and not misses[0]["fever"] and not misses[0]["inferno"] and misses[0]["delta"]==0
    record("Inferno wrong throw ends mode without penalty")
    finish(page,True)
    for race in range(2,11):
        start(page,race)
        assert state(page)["seconds"] == (40 if race<=3 else 60 if race<=6 else 90 if race<=9 else 120)
        assert state(page)["count"] == (6 if race<=3 else 7 if race<=6 else 8)
        assert_dimensions(page)
        page.evaluate(HITS_JS,{"count":4,"correct":True})
        assert state(page)["score"]>=10
        finish(page,True)
    scores=page.evaluate("JSON.parse(localStorage.getItem('snackDashTokyoPreviewSaveV1')).best")
    assert len(scores)==10 and all(v>=10 for v in scores.values()),scores
    assert page.evaluate("""() => ['snackDashSaveV2','snackDashSaveV1','snackDashLocaleV1','snackDashPracticeV1'].map(k=>localStorage.getItem(k))""")==["main-save-sentinel","main-legacy-sentinel","main-locale-sentinel","main-practice-sentinel"]
    record("all ten races started and won with isolated progress",races=sorted(scores))
    start(page,1)
    page.evaluate(HITS_JS,{"count":1,"correct":False})
    finish(page,False)
    record("timer expiry and failure screen")
    ctx.close()

    for name,w,h,touch,dpr,reduced in [
        ("desktop-1920",1920,1080,False,1,False),
        ("android-landscape-emulated",915,412,True,2.625,False),
        ("iphone-landscape-emulated",844,390,True,3,False),
        ("small-landscape-reduced-motion",667,375,True,2,True)]:
        ctx,page=context(w,h,touch,dpr,reduced)
        start(page,2)
        assert_dimensions(page)
        swap_both(page,touch)
        # One actual pointer-selected matching target, not a test-only direct
        # call. Use a mid-field runner and confirm the chosen item is consumed.
        target=page.evaluate("""() => {
          const g=SnackDashDebug.getGame();
          const r=g.runners.filter(r=>g.onScreen(r)&&GameMath.matches(g.supplies.held.number,r.number))
            .sort((a,b)=>Math.abs(a.y-390)-Math.abs(b.y-390))[0];
          const b=SnackDashLandscapeQA.trace().runners.find(a=>a.id===r.id).bib;return {x:b[0],y:b[1]};
        }""")
        tap(page,target["x"],target["y"],touch)
        page.wait_for_function("SnackDashDebug.getGame().correct + SnackDashDebug.getGame().wrong > 0")
        assert state(page)["correct"]==1,(name,state(page))
        page.wait_for_function("!SnackDashDebug.getGame().throwing")
        measure(page,name)
        page.locator('#pauseBtn').click()
        assert state(page)["phase"]=="paused"
        page.locator('#pauseBtn').click()
        assert state(page)["phase"]=="playing"
        if touch:
            page.set_viewport_size({"width":h,"height":w})
            page.locator('#tokyoRotate').wait_for(state='visible')
            assert state(page)["phase"]=="paused"
            page.set_viewport_size({"width":w,"height":h})
            page.locator('#tokyoRotate').wait_for(state='hidden')
            page.locator('#pauseBtn').click()
            assert_dimensions(page)
            assert state(page)["phase"]=="playing"
        page.locator('#restartBtn').click()
        wait_playing(page)
        back(page)
        record("responsive offline pointer/restart/pause",viewport=name)
        ctx.close()
    assert not errors,errors

def main():
    assert HTML.exists(), "Run scripts/build_tokyo.py first."
    status="failed"
    try:
        with sync_playwright() as p:
            executable=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
            browser=p.chromium.launch(headless=True,**({"executable_path":executable} if executable else {}))
            run(browser)
            browser.close()
        status="passed"
    finally:
        (OUT/"report.json").write_text(json.dumps({"status":status,"checks":checks,"performance":perf},indent=2,ensure_ascii=False),encoding="utf-8")
    print("Tokyo browser acceptance:",status,flush=True)

if __name__=="__main__":
    main()
