"""Exercise actual game events, composited frames and replacement data.

Every scoring operation uses Marathon.throwSupply/swapSupply/update.
QA inspection is used only for nonpersistent static asset/layout checks.
"""
import base64
import hashlib
import io
import json
import os
import re
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
from tokyo_smoke import wait_playing, tap, HITS_JS

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"dist/landscape-contract";OUT.mkdir(parents=True,exist_ok=True)
FILES={"tokyo":ROOT/"dist/Snack_Dash_Tokyo_Preview.html","qa-london":ROOT/"dist/Snack_Dash_qa-london_Preview.html"}

def unpack(path):
    html=path.read_text()
    start=html.index("window.SnackDashAssetPack=")+len("window.SnackDashAssetPack=")
    pack,_=json.JSONDecoder().raw_decode(html[start:])
    stripped=re.sub(r"<script>\s*window\.SnackDashAssetPack=.*?</script>","<PACK>",html,flags=re.S)
    return pack,stripped

def check_compiled():
    a,source_a=unpack(FILES["tokyo"]);b,source_b=unpack(FILES["qa-london"])
    assert source_a==source_b,"City builds have different application source"
    for p in (a,b):
        for key,s in p["sprites"].items():
            x,y,w,h=s["rect"];sw,sh=s["sourceSize"];tx,ty=s["trimOffset"]
            assert min(x,y,tx,ty)>=0 and w>0 and h>0 and tx+w<=sw and ty+h<=sh,key
            assert s["page"] in p["images"],key
        assert all(not x.startswith("data:image/svg") for x in p["images"].values())
    street=next(n for n in a["manifest"]["world"]["nodes"] if n.get("role")=="street")
    for mode,key in street["images"].items():
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
 const g=SnackDashDebug.getGame(),qa=SnackDashLandscapeQA,m=SnackDashAssetPack.manifest,A=SnackDashAnimation;
 const replacement=m.id==='qa-london',bottleIds=m.world.nodes.filter(n=>n.role==='decorative').map(n=>n.id);
 const street=m.world.nodes.find(n=>n.role==='street');
 const check=(condition,message)=>{if(!condition)throw Error(message)};
 const mode=()=>g.inferno?'inferno':g.fever?'fever':'normal';
 for(let i=0;i<100&&g.phase==='countdown';i++)g.update(.05);
 g.goFlash=0;check(g.phase==='playing','Race start failed');
 const snapshot=()=>({score:g.score,combo:g.combo,correct:g.correct,wrong:g.wrong,
   remaining:g.remaining,held:[g.supplies.held.type,g.supplies.held.number],
   queue:g.supplies.queue.map(x=>[x.type,x.number]),
   runners:g.runners.map(r=>[r.id,r.number,r.laneIndex,r.y,r.speed,r.successes])});
 const snapshots=[snapshot()],drawn={},actions={},transitions=[],misses=[],replacedFrames={};
 const remember=(key,value)=>{(replacedFrames[key]??=new Set()).add(value)};
 function sample(){
   const t=qa.trace(),asset=t.nodes.find(n=>n.id===street.id);
   check(asset?.key===street.images[mode()],'Wrong street artwork in '+mode());
   drawn[mode()]=asset.key;
   check(new Set(t.nodes.map(n=>n.id)).size===t.nodes.length,'Duplicate scene object drawn');
   for(const b of bottleIds){
     const object=t.objects[b],draw=t.nodes.filter(n=>n.id===b);
     check(draw.length===(object.visible?1:0),'Decorative bottle visibility mismatch '+b);
   }
   if(replacement){
     for(const r of t.runners)if(r.clip.startsWith('qa/runner/')||r.clip.startsWith('qa-run-')){
       remember(r.clip,r.index);
     }
     for(const c of t.crowds)if(c.clip.startsWith('qa/'))remember(c.clip,c.index);
     if(t.staff.clip.startsWith('qa/'))remember(t.staff.clip,t.staff.index);
     for(const e of t.effects)if(e.clip.startsWith('qa/'))remember(e.clip,e.frame);
     for(const n of t.nodes)if(n.clip?.startsWith('qa/'))remember(n.clip,n.index);
   }
   return t;
 }
 function compact(t){
   return {time:g.sceneTime,mode:t.mode,transition:t.transition,
     staff:{clip:t.staff.clip,action:t.staff.action,index:t.staff.index,contact:t.staff.contact},
     scroll:{reveal:t.objects.scroll.reveal,skin:t.objects.scroll.skinMode},
     bottles:bottleIds.map(id=>({id,...t.objects[id]}))};
 }
 function advance(seconds,collect=false){
   const frames=[];
   for(let i=0;i<Math.round(seconds/.02);i++){
     g.update(.02);
     const t=sample();
     if(collect&&i%2===0)frames.push(compact(t));
   }
   return frames;
 }
 function pick(correct){
   for(let attempt=0;attempt<12;attempt++){
     const r=g.runners.filter(x=>g.onScreen(x)&&GameMath.matches(g.supplies.held.number,x.number)===correct)
       .sort((a,b)=>Math.abs(a.y-380)-Math.abs(b.y-380)||a.id-b.id)[0];
     if(r)return r;
     g.update(.025);
   }
   throw Error('No eligible target');
 }
 function throwOne(correct){
   const r=pick(correct);r.artIndex=0; // visual cast choice only; no change to rules or position
   const before=mode(),score=g.score,prior=r.number,number=g.supplies.held.number,item=g.supplies.held.type;
   const expected=GameMath.resolveHit(g.combo,g.fever,r.successes,correct);
   check(g.throwSupply(r.id),'Semantic throw rejected');
   const windup=sample();check(windup.staff.action==='throw','Windup not drawn');
   let sawFlight=false,sawOutcome=false;
   while(g.throwing){
     g.update(.02);const t=sample();
     if(g.throwing&&!g.throwing.hit&&t.events.some(e=>e.type==='throw.release'&&e.runnerId===r.id)){
       if(t.assets.some(a=>a.key===m.supplies[item].flight))sawFlight=true;
     }
     if(g.throwing?.hit&&!sawOutcome){
       sawOutcome=true;
       const target=t.runners.find(x=>x.id===r.id);
       if(correct&&target)check(target.action==='receive_supply','Receive clip not drawn');
       if(!correct){
         check(t.effects.some(e=>e.id==='miss'&&e.mode===before),'Miss FX did not retain '+before);
         misses.push(before);
       }
     }
   }
   check(sawFlight,'Physical item was not drawn in flight');
   check(g.score===score+expected.delta&&g.combo===expected.combo&&g.fever===expected.fever&&g.inferno===expected.inferno,'Canonical score/ mode mismatch');
   check(r.number===(correct?GameMath.transformRunnerNumber(prior,number):prior),'Canonical bib mismatch');
   g.assertReady();
   // Same time and semantic command sequence for both packs.
   advance(.18);
   snapshots.push(snapshot());
 }
 function settle(id,seconds){
   const frames=advance(seconds,true),t=sample();
   check(t.transition?.id===id&&t.transition.done,'Transition did not settle: '+id+' '+JSON.stringify(t.transition));
   const start=t.events.map(x=>x.type==='transition.start'&&x.transition===id).lastIndexOf(true);
   const events=t.events.slice(start).filter(e=>e.transition===id);
   const markers=events.filter(e=>e.type==='marker');
   const marker=name=>markers.find(e=>e.marker===name);
   check(marker('costume.changed')||id==='inferno>normal','Missing costume marker '+id);
   const target=id.split('>')[1];
   check(t.objects.staff.costume===target,'Wrong terminal costume');
   check(t.objects.scroll.skinMode===target&&t.objects.scroll.reveal===1,'Scroll did not settle');
   check(frames.some(f=>f.scroll.reveal<1),'No actual scroll closing frames');
   if(id==='fever>inferno'){
     const contact=marker('table.contact'),kick=marker('bottle.kick');
     check(contact&&kick&&contact.time<=kick.time,'Kick before table contact');
     check(contact.elevation===1&&kick.elevation===1,'Staff not grounded on table');
     check(contact.contact.y===m.scene.table.contact,'Wrong table contact point');
     check(bottleIds.every(b=>contact.props[b].visible&&contact.props[b].atHome),'Bottle removed before climb');
     check(frames.some(f=>f.staff.action==='kick'&&f.staff.contact.y===m.scene.table.contact),'Kick pose not drawn on table');
     check(frames.some(f=>f.bottles.some(b=>b.visible&&!b.atHome)),'No actual bottle flight');
     check(bottleIds.every(b=>!t.objects[b].visible&&!t.objects[b].atHome),'Table not cleared');
   }else if(id==='inferno>normal'){
     const land=marker('ground.contact'),dress=marker('costume.changed');
     check(land&&dress&&land.time<=dress.time,'Changed outfit before landing');
     const grabs=markers.filter(e=>e.marker==='bottle.grab'),places=markers.filter(e=>e.marker==='bottle.place');
     check(grabs.length===bottleIds.length&&places.length===bottleIds.length,'Restock count mismatch');
     check(grabs.every((e,i)=>e.time>=dress.time&&e.time<places[i].time),'Wrong restock order');
     check(frames.some(f=>f.bottles.some(b=>b.attach?.target==='staff')),'No actual carried bottle');
     check(bottleIds.every(b=>t.objects[b].visible&&t.objects[b].atHome&&!t.objects[b].attach),'Incomplete tabletop restoration');
   }
   transitions.push({id,markers:markers.map(e=>({marker:e.marker,time:e.time,elevation:e.elevation,contact:e.contact})),frames});
   snapshots.push(snapshot());
 }
 sample();
 check(g.swapSupply(0)&&g.swapSupply(1),'Semantic swaps failed');
 advance(.45);snapshots.push(snapshot());
 throwOne(false); // Normal miss
 for(let i=0;i<5;i++)throwOne(true);
 settle('normal>fever',1.0);
 throwOne(false);
 settle('fever>normal',1.0);
 for(let i=0;i<5;i++)throwOne(true);
 settle('normal>fever',1.0);
 for(let i=0;i<5;i++)throwOne(true);
 settle('fever>inferno',1.7);
 throwOne(false);
 settle('inferno>normal',2.2);
 check(misses.join(',')==='normal,fever,inferno','Did not exercise all miss modes');
 check(Object.keys(drawn).length===3,'Did not draw all street modes');
 const t=sample();
 check(t.audio.some(a=>a.event==='marker'&&a.marker==='bottle.kick'),'Kick cue not selected');
 check(t.audio.some(a=>a.event==='swap'&&a.sound===(replacement?'supply_catch':'supply_swap')),'Replacement audio cue not selected');
 if(replacement){
   const multi=Object.entries(replacedFrames).filter(([k,v])=>v.size>=2).map(([k])=>k);
   for(const m of ['normal','fever','inferno']){
     check(multi.includes('qa-run-'+m),'Mode-specific run frames did not play: '+m);
     check(multi.includes('qa/runner/'+m+'/pain'),'Mode-specific pain frames did not play: '+m);
     check(multi.some(k=>k.startsWith('qa/crowd-')&&k.includes('/'+m+'/')),'Crowd clip did not animate: '+m);
     check(multi.includes('qa/fx/'+m+'/miss'),'Replacement miss FX did not animate: '+m);
   }
   check(multi.includes('qa/staff/climb')&&multi.includes('qa/staff/kick'),'Replacement climb/kick clips not played');
 }
 return {snapshots,drawn,transitions,misses,replacedFrames:Object.fromEntries(Object.entries(replacedFrames).map(([k,v])=>[k,[...v]])),level:g.config.level,cityIndex:g.config.cityIndex,audio:t.audio};
}"""

RAPID=r"""() => {
 const g=SnackDashDebug.getGame(),qa=SnackDashLandscapeQA,m=SnackDashAssetPack.manifest;
 const check=(c,msg)=>{if(!c)throw Error(msg)};
 const advance=(n)=>{for(let i=0;i<n;i++)g.update(.02)};
 function hit(correct){
   let r=g.runners.find(r=>g.onScreen(r)&&GameMath.matches(g.supplies.held.number,r.number)===correct);
   for(let i=0;!r&&i<20;i++){advance(1);r=g.runners.find(r=>g.onScreen(r)&&GameMath.matches(g.supplies.held.number,r.number)===correct)}
   check(r&&g.throwSupply(r.id),'Input blocked during transition');
   while(g.throwing)advance(1);
 }
 for(let i=0;i<5;i++)hit(true);
 check(g.swapSupply(0),'Swap blocked in entry transition');
 hit(false);advance(100);
 check(qa.trace().objects.staff.costume==='normal','Fever interruption not recovered');
 for(let i=0;i<10;i++)hit(true);
 hit(false);advance(180);
 const t=qa.trace(),ids=m.world.nodes.filter(n=>n.role==='decorative').map(n=>n.id);
 check(!g.inferno&&!g.fever&&t.objects.staff.elevation===0&&t.objects.staff.costume==='normal','Rapid transition wrong terminal posture');
 check(ids.every(id=>t.objects[id].visible&&t.objects[id].atHome&&!t.objects[id].attach),'Rapid transition duplicated/lost bottle');
 check(t.events.some(e=>e.type==='transition.cancel'),'No transition interruption exercised');
 g.assertReady();
 return {mode:t.mode,objects:t.objects,transitions:t.events.filter(e=>e.type.startsWith('transition.'))};
}"""

def run(browser):
    evidence={"build":check_compiled(),"replays":{},"rapid":{}}
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
        page.evaluate("SnackDashLandscapeQA.inspect('normal')")
        qa=page.evaluate("SnackDashLandscapeQA.trace()")
        if name=="qa-london":
            assert qa["runners"][0]["frame"]["sourceSize"]==[384,480]
            assert any(a["key"]=="fixture/runner/a" for a in qa["assets"])
            assert qa["staff"]["frame"]["image"]=="qa/staff-a.svg"
            assert page.locator("#qaLogo").is_visible() and page.locator("#qaProgress").is_visible()
            assert not page.locator("#scorePanel").count()
            assert any(n["id"]=="independent-far-sky" for n in qa["nodes"])
            assert any(n["key"]=="qa/table.svg" for n in qa["nodes"])
        page.locator("#gameScreen").screenshot(path=str(OUT/(name+"-layout.png")))
        page.locator("#levelsBtn").click()
        evidence["replays"][name]=page.evaluate(REPLAY)
        print("PASS",name,"real four-mode choreography, multi-frame actor/FX replacement",flush=True)
        page.locator("#levelsBtn").click()
        page.locator('[data-race="1"]').click();page.locator("#startBtn").click();wait_playing(page)
        slot=page.evaluate("SnackDashLandscapeQA.geometry().slots[1]")
        before=page.evaluate("SnackDashDebug.getGame().supplies.queue[1].number")
        tap(page,slot["x"]+slot["w"]/2,slot["y"]+slot["h"]/2,touch=True)
        assert page.evaluate("SnackDashDebug.getGame().supplies.held.number")==before
        page.locator("#levelsBtn").click()
        page.locator('[data-race="1"]').click();page.locator("#startBtn").click();wait_playing(page)
        evidence["rapid"][name]=page.evaluate(RAPID)
        print("PASS",name,"rapid interrupted transitions and uninterrupted input",flush=True)
        ctx.close()
        (OUT/"report.json").write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
    a,b=evidence["replays"]["tokyo"],evidence["replays"]["qa-london"]
    assert a["level"]==1 and b["level"]==21
    assert a["snapshots"]==b["snapshots"],"Asset-only changes altered seeded gameplay"
    assert not errors,errors
    evidence["status"]="passed"
    (OUT/"report.json").write_text(json.dumps(evidence,ensure_ascii=False,indent=2))
    print("PASS identical application source, source-exact streets, semantic replay, independent HUD, mode transitions and FX",flush=True)

def capture(browser):
    """Actual rendered frames on a deterministic clock, not a generated mockup."""
    ctx=browser.new_context(viewport={"width":960,"height":540},offline=True)
    page=ctx.new_page()
    # Manual frame stepping is limited to this recording harness. All actions
    # are real semantic commands and the production compositor is used.
    page.add_init_script("window.requestAnimationFrame=()=>0;")
    page.goto(FILES["tokyo"].as_uri())
    page.wait_for_function("document.documentElement.dataset.tokyoAssets==='ready'",timeout=30000,polling=100)
    page.evaluate("document.querySelector('[data-race=\"1\"]').click();document.getElementById('startBtn').click()")
    wait_playing(page)
    def segment(name,count,correct,frames):
        page.evaluate(HITS_JS,{"count":count,"correct":correct})
        images=[]
        for _ in range(frames):
            page.evaluate("const g=SnackDashDebug.getGame();g.update(.05);g.draw()")
            images.append(Image.open(io.BytesIO(page.screenshot())).convert("RGB"))
        images[0].save(OUT/(name+".gif"),save_all=True,append_images=images[1:],duration=50,loop=0,optimize=True)
    segment("01-normal-to-fever",5,True,20)
    segment("02-fever-to-normal",1,False,20)
    segment("03-normal-to-fever-again",5,True,20)
    segment("04-fever-to-inferno",5,True,34)
    segment("05-inferno-to-normal",1,False,44)
    ctx.close()

if __name__=="__main__":
    with sync_playwright() as p:
        exe=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE")
        browser=p.chromium.launch(headless=True,**({"executable_path":exe} if exe else {}))
        run(browser);capture(browser);browser.close()
