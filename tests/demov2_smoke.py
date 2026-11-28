"""Browser regression and real transition evidence for the illustrated demo."""
import base64
import hashlib
import io
import json
import os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = Path(os.environ.get("SNACKDASH_DEMO_HTML", ROOT/"dist/SnackDash_DemoV2.html")).resolve()
OUT = ROOT/"dist/demov2-evidence"
OUT.mkdir(parents=True, exist_ok=True)
REPORT = {"status":"running","checks":[]}

def record(name, **details):
    REPORT["checks"].append({"check":name,**details})
    print("PASS",name,details,flush=True)
    (OUT/"report.json").write_text(json.dumps(REPORT,indent=2,ensure_ascii=False))

def verify_assets():
    text=HTML.read_text()
    start=text.index("window.SnackDashAssetPack=")+len("window.SnackDashAssetPack=")
    p,_=json.JSONDecoder().raw_decode(text[start:])
    m=p["manifest"]
    assert m["id"]=="tokyo-demo" and m["schemaVersion"]==2 and m["reviewStatus"]=="review"
    for mode in ("normal","fever","inferno"):
        key=next(n for n in m["world"]["nodes"] if n.get("role")=="street")["images"][mode]
        raw=base64.b64decode(p["images"][p["sprites"][key]["page"]].split(",",1)[1])
        src=m["sourceFiles"][key]
        assert hashlib.sha256(raw).hexdigest()==src["sha256"],mode
        if (ROOT/src["path"]).exists():assert raw==(ROOT/src["path"]).read_bytes(),mode
    for k,s in p["sprites"].items():
        x,y,w,h=s["rect"]; sw,sh=s["sourceSize"]; tx,ty=s["trimOffset"]
        assert s["page"] in p["images"] and min(x,y,tx,ty)>=0 and w>0 and h>0 and tx+w<=sw and ty+h<=sh,k
    assert all(not v.startswith("data:image/svg") for v in p["images"].values())
    record("source-exact street plates, raster atlas metadata",sprites=len(p["sprites"]),pages=len(p["images"]),bytes=HTML.stat().st_size,cast=len(m["actors"]["runners"]),source=m["sourceCommit"])

START="""race=>{
 const tile=document.querySelector('[data-race="'+race+'"]');if(!tile)throw Error('Race unavailable');
 tile.click();document.getElementById('startBtn').click();
 const g=SnackDashDebug.getGame();
 if(!g||g.config.event!==race)throw Error('Wrong race');
 for(let i=0;i<100&&g.phase==='countdown';i++)g.update(.05);
 g.goFlash=0;g.assertReady();g.draw();
 if(g.phase!=='playing')throw Error('Race did not start '+g.phase);
}"""

HIT="""correct=>{
 const g=SnackDashDebug.getGame(),m=GameMath,qa=SnackDashLandscapeQA;
 const step=()=>g.update(.02);
 for(let i=0;i<100&&g.throwing;i++)step();
 let chosen;
 for(let retry=0;retry<10&&!chosen;retry++){
  chosen=g.runners.filter(r=>g.onScreen(r)&&m.matches(g.supplies.held.number,r.number)===correct)
    .sort((a,b)=>Math.abs(a.y-365)-Math.abs(b.y-365)||a.id-b.id)[0];
  if(!chosen)for(let i=0;i<5;i++)step();
 }
 if(!chosen||!g.throwSupply(chosen.id))throw Error('No tappable target for '+correct);
 const supply=g.throwing.supply.number,bib=chosen.number,before=g.score,mode=g.inferno?'inferno':g.fever?'fever':'normal';
 const expected=m.resolveHit(g.combo,g.fever,chosen.successes,correct),target=correct?m.transformRunnerNumber(bib,supply):bib;
 let flight=false,caught=false,miss=false,visibleAtImpact=false,retiredAtImpact=false,outcomeEvent=false,staff=new Set(),runnerFrames=new Set();
 for(let i=0;i<100&&g.throwing;i++){
   step();const t=qa.trace();staff.add(t.staff.frame.image);
   const r=t.runners.find(r=>r.id===chosen.id);
   if(r)runnerFrames.add(r.frame.image);
   if(g.throwing&&!g.throwing.hit&&t.events.some(e=>e.type==='throw.release'&&e.runnerId===chosen.id))flight=flight||t.assets.some(a=>a.key===SnackDashAssetPack.manifest.supplies[g.throwing.supply.type].flight);
   if(g.throwing?.hit){
     outcomeEvent=outcomeEvent||t.events.some(e=>e.type===(correct?'hit':'miss')&&e.runnerId===chosen.id);
     visibleAtImpact=visibleAtImpact||Boolean(r);
     // The existing canonical engine retires off-screen targets immediately
     // after impact and does not keep their sprite in the active roster.
     // Such a hit must still resolve correctly, but has no on-screen receipt.
     retiredAtImpact=retiredAtImpact||!r;
     if(r){caught=caught||r.action==='receive_supply';miss=miss||t.effects.some(e=>e.id==='miss'&&e.mode===mode);}
   }
 }
 if(g.throwing||g.score!==before+expected.delta||g.combo!==expected.combo||g.fever!==expected.fever||g.inferno!==expected.inferno||chosen.number!==target)throw Error('Canonical outcome mismatch');
 if(!flight||staff.size<2)throw Error('Throw did not render the independent physical item and multiple staff frames');
 if(!outcomeEvent)throw Error('Missing semantic outcome event');
 if(correct&&visibleAtImpact&&!caught)throw Error('Missing on-screen receipt animation');
 if(!correct&&visibleAtImpact&&!miss)throw Error('Wrong pre-hit miss effect');
 if(!visibleAtImpact&&!retiredAtImpact)throw Error('Impact not sampled');
 g.assertReady();
 return {combo:g.combo,score:g.score,mode:g.inferno?'inferno':g.fever?'fever':'normal',before:mode,correct,staffFrames:staff.size,runnerFrames:runnerFrames.size,visibleAtImpact,retiredAtImpact,caught,miss};
}"""

STEP="""dt=>{const g=SnackDashDebug.getGame();g.update(dt);g.draw();const t=SnackDashLandscapeQA.trace();return {mode:t.mode,transition:t.transition,staff:t.staff.action,staffClip:t.staff.clip,contact:t.staff.contact,objects:t.objects,nodes:t.nodes.map(n=>({id:n.id,key:n.key,clip:n.clip,index:n.index})),events:t.events};}"""

def capture_transition(page,name,steps=42,gender='female'):
    images=[];all_steps=[]
    for i in range(steps):
        t=page.evaluate(STEP,.05)
        all_steps.append(t)
        if i%2==0:
            im=Image.open(io.BytesIO(page.locator("#gameScreen").screenshot())).convert("RGB")
            im.thumbnail((960,540))
            images.append(im)
    assert all_steps[-1]["transition"]["done"],(name,all_steps[-1]["transition"])
    images[0].save(OUT/(gender+"-"+name.replace(">","-to-")+".gif"),save_all=True,append_images=images[1:],duration=100,loop=0,optimize=True)
    t=all_steps[-1];marks=[e for e in t["events"] if e.get("type")=="marker" and e.get("transition")==name]
    # Use the latest start of this transition; earlier races can use the same id.
    start=max(i for i,e in enumerate(t["events"]) if e.get("type")=="transition.start" and e.get("transition")==name)
    marks=[e for e in t["events"][start:] if e.get("type")=="marker" and e.get("transition")==name]
    mark=lambda n:next(e for e in marks if e.get("marker")==n)
    assert t["objects"]["staff"]["costume"]==name.split(">")[-1]
    assert t["objects"]["scroll"]["skinMode"]==name.split(">")[-1] and t["objects"]["scroll"]["reveal"]==1
    assert any(s["objects"]["scroll"]["reveal"]<1 for s in all_steps),"Scroll did not animate"
    if name=="fever>inferno":
        c,k=mark("table.contact"),mark("bottle.kick")
        assert c["time"]<=k["time"] and c["elevation"]==k["elevation"]==1
        assert all(v["atHome"] and v["visible"] for v in c["props"].values())
        assert any(s["staff"]=="kick" for s in all_steps)
        assert any(s["objects"]["bottle1"]["visible"] and not s["objects"]["bottle1"]["atHome"] for s in all_steps)
        assert all(not t["objects"][f"bottle{i}"]["visible"] for i in (1,2,3))
    if name=="inferno>normal":
        assert mark("ground.contact")["time"]<=mark("costume.changed")["time"]
        grabs=[e for e in marks if e["marker"]=="bottle.grab"]
        places=[e for e in marks if e["marker"]=="bottle.place"]
        assert len(grabs)==len(places)==3
        assert all(g["time"]>=mark("costume.changed")["time"] and g["time"]<p["time"] for g,p in zip(grabs,places))
        assert any(any(s["objects"][f"bottle{i}"]["attach"] for i in (1,2,3)) for s in all_steps)
        assert all(t["objects"][f"bottle{i}"]["visible"] and t["objects"][f"bottle{i}"]["atHome"] for i in (1,2,3))
    record("real "+name, markers=[{"name":e["marker"],"time":e["time"],"elevation":e["elevation"]} for e in marks])
    return t

def open_page(browser,viewport,manual=True,touch=False):
    ctx=browser.new_context(viewport=viewport,has_touch=touch,is_mobile=touch,device_scale_factor=1,offline=True)
    page=ctx.new_page();errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.on("console",lambda msg:errors.append(msg.text) if msg.type=="error" else None)
    if os.environ.get("SNACKDASH_SET_CONTENT")=="1":
        if manual:page.evaluate("window.requestAnimationFrame=()=>0")
        page.set_content(HTML.read_text(),wait_until="load")
    else:
        if manual:page.add_init_script("window.requestAnimationFrame=()=>0")
        page.goto(HTML.as_uri())
    page.wait_for_function("document.documentElement.dataset.tokyoAssets==='ready'",timeout=30000,polling=100)
    return ctx,page,errors

def run(browser):
    ctx,page,errors=open_page(browser,{"width":1280,"height":720})
    for gender in ("female","male"):
        page.locator("#tokyo"+gender.capitalize()).click()
        for mode in ("normal","fever","inferno"):
            page.evaluate("m=>SnackDashLandscapeQA.inspect(m)",mode)
            t=page.evaluate("SnackDashLandscapeQA.trace()")
            assert t["mode"]==mode and t["staff"]["frame"]["image"].startswith("demo/staff/")
            assert all(r["frame"]["image"].startswith("demo/runner/") for r in t["runners"])
            assert all(c["frame"]["image"].startswith("demo/crowd/") for c in t["crowds"])
            assert t["objects"]["staff"]["elevation"]==(1 if mode=="inferno" else 0)
            assert any(n["id"]=="street" and n["key"]=="bg/"+mode for n in t["nodes"])
            page.locator("#gameScreen").screenshot(path=str(OUT/(gender+"_"+mode+".png")))
            page.locator("#levelsBtn").click()
    record("all six mode/gender render inspections")
    page.locator("#tokyoFemale").click()
    starts=page.evaluate("""()=>{
       let count=0;const rnd=Math.random,now=Date.now;
       try{
        Date.now=()=>0;
        for(let race=1;race<=10;race++)for(let seed=1;seed<=12;seed++){
         Math.random=()=>seed*10091/0xFFFFFFFF;
         document.querySelector('[data-race="'+race+'"]').click();document.getElementById('startBtn').click();
         const g=SnackDashDebug.getGame();g.assertReady();g.draw();count++;
         document.getElementById('levelsBtn').click();
        }
       }finally{Math.random=rnd;Date.now=now}
       return count;
    }""")
    assert starts==120
    record("deterministic geometry across 120 race starts",launches=starts)
    for gender in ("female","male"):
        page.locator("#tokyo"+gender.capitalize()).click()
        page.evaluate(START,1)
        for _ in range(5):page.evaluate(HIT,True)
        capture_transition(page,"normal>fever",16,gender)
        page.evaluate(HIT,False)
        capture_transition(page,"fever>normal",16,gender)
        for _ in range(5):page.evaluate(HIT,True)
        capture_transition(page,"normal>fever",16,gender)
        for _ in range(5):page.evaluate(HIT,True)
        capture_transition(page,"fever>inferno",34,gender)
        page.evaluate(HIT,False)
        capture_transition(page,"inferno>normal",54,gender)
        page.locator("#levelsBtn").click()
        record("complete real gameplay cycle",gender=gender)
    # Ten race wins and actual result controls. Original storage API used on CI.
    for race in range(1,11):
        page.evaluate(START,race)
        hits=[page.evaluate(HIT,True) for _ in range(4)]
        record("race receipt sampling",race=race,visible=sum(h["visibleAtImpact"] for h in hits),retired=sum(h["retiredAtImpact"] for h in hits))
        page.evaluate("""()=>{
          const g=SnackDashDebug.getGame();if(g.score<10)throw Error('Goal not achieved');
          g.remaining=.001;g.update(.02);
          if(g.phase==='celebrate')for(let i=0;i<65&&!g.resultsShown;i++)g.update(.05);
          g.draw();
        }""")
        page.locator("#resultOverlay").wait_for(state="visible")
        page.locator("#backBtn").click()
    record("all ten actual race results")
    assert not errors,errors
    ctx.close()
    for name,w,h,touch in [("desktop",1280,720,False),("android-emulated",915,412,True),("iphone-emulated",844,390,True),("small-landscape",667,375,True)]:
        ctx,page,errors=open_page(browser,{"width":w,"height":h},manual=False,touch=touch)
        page.evaluate(START,1)
        page.evaluate("SnackDashDebug.getGame().goFlash=0;SnackDashDebug.getGame().draw()")
        def tap(x,y):
            bounds=page.locator("#scene").bounding_box()
            xx=bounds["x"]+x*bounds["width"]/1280;yy=bounds["y"]+y*bounds["height"]/720
            (page.touchscreen.tap if touch else page.mouse.click)(xx,yy)
        slot=page.evaluate("SnackDashLandscapeQA.geometry().slots[0]")
        expected=page.evaluate("SnackDashDebug.getGame().supplies.queue[0].number")
        tap(slot["x"]+slot["w"]/2,slot["y"]+slot["h"]/2)
        assert page.evaluate("SnackDashDebug.getGame().supplies.held.number")==expected
        target=page.evaluate("""()=>{const g=SnackDashDebug.getGame(),r=g.runners.filter(r=>g.onScreen(r)&&GameMath.matches(g.supplies.held.number,r.number)).sort((a,b)=>Math.abs(a.y-365)-Math.abs(b.y-365))[0];return SnackDashLandscapeQA.trace().runners.find(x=>x.id===r.id).bib}""")
        tap(target[0],target[1]);page.wait_for_function("SnackDashDebug.getGame().correct===1",timeout=10000)
        page.wait_for_function("!SnackDashDebug.getGame().throwing")
        page.locator("#pauseBtn").click()
        assert page.evaluate("SnackDashDebug.getGame().phase")== "paused"
        page.locator("#pauseBtn").click()
        if touch:
            page.set_viewport_size({"width":h,"height":w})
            page.locator("#tokyoRotate").wait_for(state="visible")
            assert page.evaluate("SnackDashDebug.getGame().phase")=="paused"
            page.set_viewport_size({"width":w,"height":h})
            page.locator("#tokyoRotate").wait_for(state="hidden")
            page.locator("#pauseBtn").click()
        fps=page.evaluate("""()=>new Promise(resolve=>{let n=0,start=null;function next(t){if(start===null)start=t;n++;if(t-start>=1500)resolve(Math.round(n*1000/(t-start)));else requestAnimationFrame(next)}requestAnimationFrame(next)})""")
        page.locator("#gameScreen").screenshot(path=str(OUT/(name+".png")))
        record("actual pointer, responsive HUD and pause",viewport=name,fps=fps)
        assert not errors,errors
        ctx.close()

if __name__=="__main__":
    verify_assets()
    with sync_playwright() as p:
        exe=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
        browser=p.chromium.launch(headless=True,**({"executable_path":exe,"args":["--no-sandbox"]} if exe else {}))
        try:
            run(browser)
            REPORT["status"]="passed"
        finally:
            (OUT/"report.json").write_text(json.dumps(REPORT,indent=2,ensure_ascii=False))
            browser.close()
