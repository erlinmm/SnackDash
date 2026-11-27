"""Runtime acceptance: replacement packs, actual draw trace, semantic replay."""
import base64
import hashlib
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
from tokyo_smoke import wait_playing, point, tap

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"dist/landscape-contract"
OUT.mkdir(parents=True,exist_ok=True)
FILES={"tokyo":ROOT/"dist/Snack_Dash_Tokyo_Preview.html","qa-london":ROOT/"dist/Snack_Dash_qa-london_Preview.html"}

def unpack(path):
    html=path.read_text()
    start=html.index("window.SnackDashAssetPack=")+len("window.SnackDashAssetPack=")
    pack,end=json.JSONDecoder().raw_decode(html[start:])
    stripped=re.sub(r"<script>\s*window\.SnackDashAssetPack=.*?</script>","<PACK>",html,flags=re.S)
    return pack,stripped

def check_compiled():
    a,source_a=unpack(FILES["tokyo"]);b,source_b=unpack(FILES["qa-london"])
    assert source_a==source_b,"City builds contain different application code"
    for pack in (a,b):
        for key,s in pack["sprites"].items():
            x,y,w,h=s["rect"];sw,sh=s["sourceSize"];tx,ty=s["trimOffset"]
            assert min(x,y,tx,ty)>=0 and w>0 and h>0 and tx+w<=sw and ty+h<=sh,key
            assert s["page"] in pack["images"],key
        assert all(not x.startswith("data:image/svg") for x in pack["images"].values())
    for mode,key in a["manifest"]["backgrounds"].items():
        s=a["sprites"][key];raw=base64.b64decode(a["images"][s["page"]].split(",",1)[1])
        source=a["manifest"]["sourceFiles"][key]
        assert raw==(ROOT/source["path"]).read_bytes(),mode
        assert hashlib.sha256(raw).hexdigest()==source["sha256"],mode
    return {k:{"logicalSprites":len(v["sprites"]),"decodedPages":len(v["images"]),"bytes":FILES[k].stat().st_size} for k,v in (("tokyo",a),("qa-london",b))}

REPLAY=r"""() => {
 const oldRandom=Math.random,oldNow=Date.now;
 try{
   Math.random=()=>0x12345678/0xffffffff;Date.now=()=>0;
   document.querySelector('[data-race="1"]').click();document.getElementById('startBtn').click();
 }finally{Math.random=oldRandom;Date.now=oldNow}
 const g=SnackDashDebug.getGame(),qa=SnackDashLandscapeQA,m=SnackDashAssetPack.manifest;
 for(let i=0;i<100&&g.phase==='countdown';i++)g.update(.05);
 g.goFlash=0;
 if(g.phase!=='playing')throw Error('Race start failed');
 const snapshot=()=>({score:g.score,combo:g.combo,correct:g.correct,wrong:g.wrong,
   remaining:g.remaining,held:[g.supplies.held.type,g.supplies.held.number],
   queue:g.supplies.queue.map(x=>[x.type,x.number]),
   runners:g.runners.map(r=>[r.id,r.number,r.laneIndex,r.y,r.speed,r.successes])});
 const snapshots=[snapshot()],drawn={},animations={};
 function checkBackground(){
   const t=qa.trace(),key=m.backgrounds[t.mode],asset=t.assets.find(a=>a.key===key);
   if(!asset)throw Error('Expected background not drawn: '+t.mode);
   drawn[t.mode]=asset.source;
 }
 checkBackground();
 if(!g.swapSupply(0)||!g.swapSupply(1))throw Error('Semantic swaps failed');
 snapshots.push(snapshot());
 for(let hit=0;hit<11;hit++){
   const correct=hit<10;
   let r=g.runners.filter(x=>g.onScreen(x)&&GameMath.matches(g.supplies.held.number,x.number)===correct).sort((a,b)=>a.id-b.id)[0];
   if(!r){for(let j=0;j<8&&!r;j++){g.update(.025);r=g.runners.find(x=>g.onScreen(x)&&GameMath.matches(g.supplies.held.number,x.number)===correct)}}
   if(!r||!g.throwSupply(r.id))throw Error('Semantic throw failed at '+hit);
   const supply=g.throwing.supply,mode=g.inferno?'inferno':g.fever?'fever':'normal';
   if(hit===0){
      const a=m.staff['female-'+mode],seq=a.clips.throw.map(id=>a.frames[id]);
      const windup=qa.trace();animations.windup=windup.staff.frame.image;
      if(animations.windup!==seq[0].image)throw Error('Windup not drawn');
      const releaseIndex=seq.findIndex(x=>x.event==='release');
      const delay=seq.slice(0,releaseIndex).reduce((s,f)=>s+f.durationMs,0)/1000;
      g.update(delay+.001);
      const release=qa.trace();animations.release=release.staff.frame.image;
      if(animations.release!==seq[releaseIndex].image)throw Error('Release frame not drawn');
      if(!release.assets.some(a=>a.key===m.supplies[supply.type].flight))throw Error('Actual physical supply not drawn in flight');
      while(g.throwing&&!g.throwing.hit)g.update(.01);
      if(g.throwing?.hit){
        const receipt=qa.trace();
        const caught=receipt.runners.find(x=>x.id===r.id);
        if(caught){animations.receive=caught.frame.image;if(!caught.frame.image.endsWith('/receive_supply'))throw Error('Catch pose not drawn')}
      }
   }
   while(g.throwing)g.update(.02);
   g.assertReady();snapshots.push(snapshot());checkBackground();
 }
 if(!drawn.normal||!drawn.fever||!drawn.inferno)throw Error('Missing true mode transition');
 return {snapshots,drawn,animations,level:g.config.level,cityIndex:g.config.cityIndex};
}"""

def run(browser):
    evidence={"build":check_compiled(),"replays":{}}
    errors=[]
    for name,path in FILES.items():
        ctx=browser.new_context(viewport={"width":1280,"height":720},offline=True,has_touch=True)
        page=ctx.new_page()
        page.on("pageerror",lambda e:errors.append(str(e)))
        page.on("console",lambda msg:errors.append(msg.text) if msg.type=="error" else None)
        page.goto(path.as_uri())
        page.wait_for_function("document.documentElement.dataset.tokyoAssets==='ready'",timeout=30000)
        assert page.locator("[data-race]").count()==10
        page.locator("#tokyoFemale").click()
        # Capture actual QA compositor output and verify selected sprite.
        page.evaluate("SnackDashLandscapeQA.inspect('normal')")
        qa=page.evaluate("SnackDashLandscapeQA.trace()")
        if name=="qa-london":
            assert qa["runners"][0]["frame"]["image"]=="fixture/runner/a",qa["runners"][0]
            assert any(a["key"]=="fixture/runner/a" for a in qa["assets"])
            g=page.evaluate("SnackDashLandscapeQA.geometry()")
            assert g["slots"][0]["y"]==g["slots"][1]["y"]
            assert qa["staff"]["frame"]["anchors"]["hand"]==[270,150]
            panel=page.locator(".total-pill").bounding_box()
            canvas=page.locator("#scene").bounding_box()
            assert abs((panel["y"]-canvas["y"])/canvas["height"]*720-100)<2,panel
        page.locator("#gameScreen").screenshot(path=str(OUT/(name+"-layout.png")))
        page.locator("#levelsBtn").click()
        replay=page.evaluate(REPLAY)
        evidence["replays"][name]=replay
        page.locator("#levelsBtn").click()
        # Real touch dispatch uses the new tray position, not portrait coords.
        page.locator('[data-race="1"]').click();page.locator("#startBtn").click();wait_playing(page)
        before=page.evaluate("SnackDashDebug.getGame().supplies.queue[1].number")
        slot=page.evaluate("SnackDashLandscapeQA.geometry().slots[1]")
        tap(page,slot["x"]+slot["w"]/2,slot["y"]+slot["h"]/2,touch=True)
        assert page.evaluate("SnackDashDebug.getGame().supplies.held.number")==before
        ctx.close()
    a,b=evidence["replays"]["tokyo"],evidence["replays"]["qa-london"]
    assert a["level"]==1 and b["level"]==21,(a["level"],b["level"])
    assert a["snapshots"]==b["snapshots"],"Asset-only changes altered deterministic gameplay"
    assert not errors,errors
    evidence["status"]="passed"
    (OUT/"report.json").write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
    print("PASS: identical source code, raster atlases, source-exact street textures, semantic gameplay replay, replacement layout and touch",flush=True)

if __name__=="__main__":
    with sync_playwright() as p:
        exe=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
        browser=p.chromium.launch(headless=True,**({"executable_path":exe} if exe else {}))
        run(browser);browser.close()
