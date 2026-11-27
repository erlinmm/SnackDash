  // Tokyo-only adapter. Runs after canonical declarations and before their
  // event handlers are attached. Keep math, score, traffic, timers, saves,
  // reactions, learning, audio, results and input selection in the shared game.
  const TOKYO_STAFF_KEY='snackDashTokyoPreviewStaffV1';
  let tokyoVolunteer='female';
  try{if(localStorage.getItem(TOKYO_STAFF_KEY)==='male')tokyoVolunteer='male'}catch(_){}
  const tokyoWords={
    'en-GB':{
      'app.title':'SnackDash V2 — Tokyo Landscape Playtest','app.tagline':'TOKYO LANDSCAPE PLAYTEST',
      'tokyo.kicker':'SNACKDASH V2 · PLAYTEST','tokyo.title':'Tokyo Landscape',
      'tokyo.subtitle':'Marathon aid station · Ten races · Three festival modes',
      'tokyo.staff':'Choose staff','tokyo.female':'Female','tokyo.male':'Male',
      'tokyo.normal':'Normal','tokyo.fever':'花見 · Sakura Fever','tokyo.inferno':'花火 · Fireworks Inferno',
      'tokyo.qa':'QA · non-persistent scenes','tokyo.qaActive':'QA · VIEW ONLY',
      'tokyo.dense':'8 runners / 4-digit bibs','tokyo.rotate':'Rotate your device to landscape.',
      'tokyo.isolated':'Preview scores, preferences and practice history are separate from the regular game.',
      'tokyo.progress':'{{count}} / 10 served','tokyo.paused':'Paused','tokyo.go':'GO!',
      'tokyo.race':'Race {{race}}','help.welcome':'Welcome to the Tokyo Marathon aid station!'
    },
    'zh-Hans':{
      'app.title':'SnackDash V2 — 东京横屏试玩','app.tagline':'东京横屏试玩',
      'tokyo.kicker':'SNACKDASH V2 · 试玩','tokyo.title':'东京横屏试玩',
      'tokyo.subtitle':'马拉松补给站 · 十场比赛 · 三种节庆模式',
      'tokyo.staff':'选择补给员','tokyo.female':'女补给员','tokyo.male':'男补给员',
      'tokyo.normal':'普通','tokyo.fever':'花見 · 樱花 FEVER','tokyo.inferno':'花火 · 烟花 INFERNO',
      'tokyo.qa':'测试 · 不保存进度','tokyo.qaActive':'测试 · 仅供查看',
      'tokyo.dense':'8 名运动员 / 四位数号码','tokyo.rotate':'请将设备旋转为横屏。',
      'tokyo.isolated':'试玩版的成绩、设置和练习记录与正式版完全独立。',
      'tokyo.progress':'已完成 {{count}} / 10 场','tokyo.paused':'已暂停','tokyo.go':'开始！',
      'tokyo.race':'第 {{race}} 场','help.welcome':'欢迎加入东京马拉松补给站！'
    }
  };
  for(const locale of I18n.availableLocales()){
    const catalog=Object.fromEntries(I18n.keys(locale.code).map(key=>[key,I18n.lookup(key,locale.code)]));
    I18n.registerLocale(locale.code,{...catalog,...(tokyoWords[locale.code]||tokyoWords['en-GB'])},locale);
  }
  const languageSelect=$('languageSelect');
  for(const locale of I18n.availableLocales()){
    const option=document.createElement('option');option.value=locale.code;option.textContent=locale.label;languageSelect.append(option);
  }
  I18n.init();
  const tokyoStaffSelect=value=>{
    tokyoVolunteer=value==='male'?'male':'female';
    $('tokyoFemale').setAttribute('aria-pressed',String(tokyoVolunteer==='female'));
    $('tokyoMale').setAttribute('aria-pressed',String(tokyoVolunteer==='male'));
    try{localStorage.setItem(TOKYO_STAFF_KEY,tokyoVolunteer)}catch(_){}
  };
  $('tokyoFemale').addEventListener('click',()=>tokyoStaffSelect('female'));
  $('tokyoMale').addEventListener('click',()=>tokyoStaffSelect('male'));
  // Restore the choice without creating storage during a read-only launch.
  $('tokyoFemale').setAttribute('aria-pressed',String(tokyoVolunteer==='female'));
  $('tokyoMale').setAttribute('aria-pressed',String(tokyoVolunteer==='male'));

  // Chest/bib is the canonical gameplay anchor. Project lane centers using
  // the runner's estimated shoe contact depth on the illustrated road.
  roadCenter=y=>{const {left,right}=tRoadAt(y);return (left+right)/2};
  roadHalfWidth=y=>{const {left,right}=tRoadAt(y);return (right-left)/2};
  runnerScale=(r,y=r.y,includeCheer=true)=>{
    const boost=1+Math.min(.08,(r.sizeBoost??r.successes)*.025);
    return tBodyHeight(y)/128*clamp(r.look.height,.96,1.04)*boost;
  };
  runnerFootprint=(r,y=r.y,lane=r.lane)=>{
    const b=tRunnerRect(r,y,runnerXAt(r,y,lane));
    const left=Math.max(0,b.x),right=Math.min(W,b.x+b.w),top=Math.max(0,b.y),bottom=Math.min(H,b.y+b.h);
    return left<right&&top<bottom?{left,right,top,bottom}:null;
  };
  Marathon.prototype.onScreen=function(r){
    const x=this.runnerX(r),y=r.y+runnerVisualOffset(r);
    // Retire when the bib is no longer readable, not after a cropped head
    // remains below the frame. The current item always has a visible target.
    return y>=205&&y<=H-20&&x>=330&&x<=W-22;
  };
  // Three depth bands keep the large foreground actor and the far bibs
  // visible simultaneously. Initial lanes are randomized, not nationality.
  Marathon.prototype.populate=function(numbers){
    const shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=randInt(this.rng,0,i);[b[i],b[j]]=[b[j],b[i]]}return b};
    const near=shuffle([0,1,2]).slice(0,2),mid=shuffle([0,1,2]),far=shuffle([0,1,2]);
    const cells=[...near.map((lane,i)=>({lane,y:520+i*20})),...mid.map((lane,i)=>({lane,y:390+i*6})),...far.map((lane,i)=>({lane,y:260+i*5}))];
    if(numbers.length===6)cells.splice(4,1);
    for(const [i,n] of shuffle(numbers).entries()){
      const c=cells[i],r=this.makeRunner(n,c.y+this.rand(-3,3),LANES[c.lane]);this.runners.push(r);
    }
  };
  const tokyoJump=runnerVisualOffset;
  runnerVisualOffset=r=>reducedMotion()?0:tokyoJump(r);
  volunteerHandPoint=()=>game?tHand(game):{x:290,y:462};

  // Hide the world map and restrict navigation, without changing LEVELS/CITIES.
  isOpen=level=>Number.isInteger(level)&&level>=1&&level<=10;
  nextPlayable=level=>{
    for(let i=1;i<=10;i++)if(i!==level&&!isWon(i))return i;
    return null;
  };
  reconcileCityUnlocks=()=>{selectedCity=0;unlockedCities=1;invitationOpenIndex=null};
  showPendingCityInvitation=()=>{$('cityInvitationOverlay').classList.add('hidden');invitationOpenIndex=null};
  recordRaceTap=()=>false;
  setDebugMode=()=>false; // QA has a dedicated, explicit fixture entry.
  renderLevelGrid=()=>{
    selectedCity=0;unlockedCities=1;
    if(!isOpen(selected))selected=1;
    const grid=$('levelGrid');grid.replaceChildren();
    $('tokyoProgress').textContent=tr('tokyo.progress',{count:cityCleared(prefs.best,0)});
    for(let i=0;i<10;i++){
      const cfg=LEVELS[i],won=isWon(cfg.level),button=document.createElement('button');
      button.type='button';button.className='level-tile'+(selected===cfg.level?' selected':'')+(won?' won':'');
      button.dataset.race=String(cfg.event);button.setAttribute('aria-pressed',String(selected===cfg.level));
      button.setAttribute('aria-label',tr('tokyo.race',{race:cfg.event}));
      const number=document.createElement('strong'),time=document.createElement('small');
      number.textContent=String(cfg.event).padStart(2,'0');time.textContent=tr('race.tileTime',{seconds:cfg.seconds});
      button.append(number,time);button.addEventListener('click',()=>{selected=cfg.level;renderLevelGrid()});grid.append(button)
    }
    renderSelection();
  };
  // Preserve ordinary results and save behavior, but isolate preview QA.
  const tokyoOriginalMenu=showMenu,tokyoOriginalStart=startLevel;
  showMenu=()=>{debugMode=false;tokyoOriginalMenu()};
  startLevel=level=>{
    debugMode=false;
    if(!tokyoAssetsReady||!isOpen(level))return;
    tokyoOriginalStart(level);
    if(game)game.staffElevation=0;
    if(innerHeight>innerWidth&&game&&game.phase==='countdown')game.pause();
  };
  enterRaceFullscreen=()=>{};requestPortraitOrientation=()=>{};
  sizeScene=()=>{
    const result=$('resultOverlay'),screen=$('gameScreen'),app=$('app');
    if(result.parentElement!==document.body)document.body.appendChild(result);
    if(app.classList.contains('in-game')){
      const style=getComputedStyle(app);
      const padX=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight);
      const padY=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
      const vw=Math.min(app.clientWidth,window.visualViewport?.width||innerWidth)-padX;
      const vh=Math.min(app.clientHeight,window.visualViewport?.height||innerHeight)-padY;
      const width=Math.max(1,Math.floor(Math.min(vw,vh*W/H)));
      screen.style.width=width+'px';screen.style.height=(width*H/W)+'px';
      stage.style.width='100%';stage.style.height='100%';
      if(innerHeight>innerWidth&&game&&['playing','countdown'].includes(game.phase))game.pause();
    }
    const width=screen.clientWidth||Math.min(innerWidth,W);
    const ratio=Math.max(.75,Math.min(2,(window.devicePixelRatio||1)*width/W));
    if(canvas.width!==Math.round(W*ratio)||canvas.height!==Math.round(H*ratio)){
      canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio)
    }
    // Round to the actual backing-store dimensions so the complete logical
    // scene is covered even on non-integer device pixel ratios.
    pixelRatio=canvas.width/W;
  };
  const tokyoOriginalUpdate=Marathon.prototype.update;
  Marathon.prototype.update=function(dt){
    if(this.qaFixture)return;
    if(innerHeight>innerWidth)return;
    tokyoOriginalUpdate.call(this,dt);
    if(this.phase!=='paused'&&this.phase!=='results'){
      const target=this.inferno?1:0;
      this.staffElevation=reducedMotion()?target:approach(this.staffElevation||0,target,dt/(target?.55:.42));
    }
  };
  const tokyoOriginalSwap=Marathon.prototype.trySwap;
  Marathon.prototype.trySwap=function(x,y){
    if(this.qaFixture)return true;
    const i=TOKYO_SLOTS.findIndex(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
    if(i<0)return false;
    // Reuse the canonical swap transaction; only its touch coordinates differ.
    tokyoOriginalSwap.call(this,50+i*72,70);
    return true;
  };
  const tokyoOriginalThrow=Marathon.prototype.tryThrow;
  Marathon.prototype.tryThrow=function(x,y){
    if(this.qaFixture)return;
    const previous=this.throwing;
    const candidates=this.runners.filter(r=>this.onScreen(r)).map(r=>({r,b:tRunnerRect(r,r.y,this.runnerX(r))})).filter(({b})=>x>=b.x-10&&x<=b.x+b.w+10&&y>=b.y-10&&y<=Math.min(H,b.y+b.h)+10);
    candidates.sort((a,b)=>Math.hypot(x-a.b.bibX,y-a.b.bibY)-Math.hypot(x-b.b.bibX,y-b.b.bibY));
    const target=candidates[0]?.r;
    if(target)tokyoOriginalThrow.call(this,this.runnerX(target),target.y+runnerVisualOffset(target)-8*runnerScale(target));
    else tokyoOriginalThrow.call(this,x,y);
    if(this.throwing&&this.throwing!==previous){
      const hand=tHand(this);this.throwing.tokyoOrigin={x:hand.x,y:hand.y};
      this.throwing.tokyoMode=tMode(this);
    }
  };
  const tokyoOriginalHUD=Marathon.prototype.syncHUD;
  let tokyoHUDSkin=null;
  function applyTokyoHUD(mode){
    if(tokyoHUDSkin===mode)return;
    tokyoHUDSkin=mode;
    for(const [selector,name] of [
      ['.level-pill','race_panel_empty'],['#timePill','time_panel_empty'],['.total-pill','score_panel_empty'],
      ['#comboPanel','festival_banner_2line_empty'],['#pauseBtn','pause_button_empty'],
      ['#restartBtn','pause_button_empty'],['#tokyoSoundBtn','pause_button_empty'],
      ['#levelsBtn','progress_panel_empty']
    ]){
      const key=artManifest.ui[mode+'/'+name],node=document.querySelector(selector);
      if(node&&key){node.style.backgroundImage='url("'+TOKYO_ART.images[key]+'")';node.classList.add('tokyo-asset-skin')}
    }
  }
  // The review WAV cues are attached to existing events; they never decide
  // whether a throw succeeds or advance a combo. Keep the canonical synthesized
  // cue as a fallback if the browser cannot decode or play the new sample.
  const tokyoAudioCache=new Map();
  function useTokyoCue(method,key){
    const original=audio[method].bind(audio);
    audio[method]=function(...args){
      if(!this.enabled)return;
      const ac=this.audio,uri=TOKYO_ART.sounds[key];
      if(!ac||!uri){original(...args);return}
      try{
        if(!tokyoAudioCache.has(key)){
          const raw=Uint8Array.from(atob(uri.split(',')[1]),c=>c.charCodeAt(0));
          tokyoAudioCache.set(key,ac.decodeAudioData(raw.buffer));
        }
        tokyoAudioCache.get(key).then(buffer=>{
          if(!this.enabled)return;
          const player=ac.createBufferSource(),gain=ac.createGain();
          player.buffer=buffer;gain.gain.value=.44;player.connect(gain);gain.connect(ac.destination);player.start();
        }).catch(()=>{tokyoAudioCache.delete(key);original(...args)});
      }catch(_){original(...args)}
    };
  }
  for(const [method,key] of [['swapConfirm','supply_swap'],['correct','supply_catch'],['wrong','miss_soft'],['feverStart','fever_enter'],['infernoStart','inferno_enter']])useTokyoCue(method,key);
  Marathon.prototype.syncHUD=function(){
    tokyoOriginalHUD.call(this);
    $('feverPlaque').textContent=tr('tokyo.'+tMode(this));
    applyTokyoHUD(tMode(this));
    $('comboPanel').dataset.mode=tMode(this);
    $('gameScreen').dataset.mode=tMode(this);
    $('gameScreen').dataset.qa=String(!!this.qaFixture);
    for(const id of ['restartBtn','pauseBtn','tokyoSoundBtn'])$(id).disabled=!!this.qaFixture;
  };
  Marathon.prototype.draw=function(){tDraw(this)};
  const tokyoOriginalSound=updateSoundIcon;
  updateSoundIcon=()=>{
    tokyoOriginalSound();
    const b=$('tokyoSoundBtn');b.textContent=$('soundBtn').textContent;b.title=$('soundBtn').title;
    b.setAttribute('aria-label',$('soundBtn').getAttribute('aria-label'));
  };
  $('tokyoSoundBtn').addEventListener('click',()=>{if(!game?.qaFixture)$('soundBtn').click()});

  // Explicit fixture. No simulated scores or state transitions are applied
  // to normal play; QA is frozen, view-only, and cannot write race or practice
  // data. The same real renderer draws fixtures and ordinary games.
  function tokyoInspect(mode){
    const dense=mode==='dense',cfg=LEVELS[dense?9:0],fixtureMode=dense?'normal':mode;
    if(!tokyoAssetsReady||!['normal','fever','inferno'].includes(fixtureMode))return;
    debugMode=true;
    tokyoOriginalStart(cfg.level);
    game=new Marathon(cfg,0x32f11a+cfg.level);
    game.qaFixture=true;game.phase='playing';game.countdown=0;game.goFlash=0;
    game.combo=fixtureMode==='inferno'?10:fixtureMode==='fever'?5:0;
    game.fever=fixtureMode!=='normal';game.inferno=fixtureMode==='inferno';
    game.staffElevation=game.inferno?1:0;
    const locations=dense?[[260,0],[265,1],[270,2],[390,0],[396,1],[402,2],[520,0],[540,2]]
      :[[260,0],[270,2],[279,1],[390,0],[417,1],[535,2]];
    const bibs=dense?[12,18,24,321,1000,72,144,156]:[12,18,24,36,72,63];
    game.runners.forEach((r,i)=>{
      const [y,lane]=locations[i];r.y=y;r.laneIndex=lane;r.targetLaneIndex=lane;
      r.lane=LANES[lane];r.artIndex=dense?[0,6,13,9,16,19,3,21][i]:[0,8,13,4,16,21][i];r.number=bibs[i];r.sway=0;r.speed=r.baseSpeed;
    });
    // These numbers are runtime fixtures, not baked art. All displayed
    // fixture supplies have matching runners; initial-pool restrictions are
    // not asserted for transformed bibs in the view-only dense scene.
    const heldType=tokyoVolunteer==='female'?(fixtureMode==='fever'?'bar':'water'):(fixtureMode==='normal'?'banana':fixtureMode==='fever'?'water':'bar');
    game.supplies.held={number:8,type:heldType,id:1};
    game.supplies.queue=[{number:12,type:'water',id:2},{number:9,type:'banana',id:3}];
    game.pendingSupply=false;
    game.assertReady();game.syncHUD();sizeScene();game.draw();
  }
  for(const b of document.querySelectorAll('[data-scene]'))b.addEventListener('click',()=>tokyoInspect(b.dataset.scene));
  window.SnackDashTokyoQA=Object.freeze({
    inspect:tokyoInspect,
    geometry:()=>({width:W,height:H,lanes:LANES.length,table:{...TOKYO_TABLE},slots:TOKYO_SLOTS.map(s=>({...s})),
      staff:tokyoVolunteer,hand:game?tHand(game):null,staffFoot:game?tStaffBase(game):null,
      scaleAt:game?[runnerScale(game.runners[0],200),runnerScale(game.runners[0],400),runnerScale(game.runners[0],640)]:[],
      mode:game?tMode(game):null,fixture:!!game?.qaFixture,assetsReady:tokyoAssetsReady,artVersion:artManifest.version,sourceCommit:artManifest.sourceCommit,runnerCast:artManifest.runners.length,runFrames:artManifest.runners.reduce((n,r)=>n+r.frames.length,0),staffFrames:Object.values(artManifest.staff).reduce((n,s)=>n+Object.keys(s.frames).length,0),crowdGroups:Object.keys(artManifest.crowd).length}),
  });

