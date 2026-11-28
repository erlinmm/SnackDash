/* Browser UI and semantic input bridge for any validated landscape city. */
(function(root){
  'use strict';
  root.SnackDashCreatePresentation=function(ports){
    const {W,H,$,I18n,tr,canvas,stage,previewCity,LEVELS,CITIES,cityCleared,isWon}=ports;
    const pack=root.SnackDashAssetPack,manifest=pack.manifest,scene=manifest.scene;
    const staffKey=root.SnackDashRuntime.storage.staff;
    let staff='female';
    try{if(localStorage.getItem(staffKey)==='male')staff='male'}catch(_){}
    const render=root.SnackDashCreateRenderer(ports,pack,()=>staff);
    const sound=root.SnackDashCreateAudio(ports,pack);
    let messageText='',messageUntil=0,hintText='';
    const hud=root.SnackDashCreateHUD($('landscapeHud'),manifest.hud,manifest.clips,{
      W,H,tr,formatNumber:(v,options)=>I18n.formatNumber(v,options),reducedMotion:ports.reducedMotion,
      drawAsset:render.drawAsset,ready:render.ready,sceneBounds:()=>canvas.getBoundingClientRect(),
      command:name=>{if(name==='fullscreen')toggleFullscreen();else ports.command(name)}
    });
    ports.hudAnchor=hud.anchor;
    ports.visualEvent=(g,e)=>{hud.event(e,g.sceneTime*1000);sound.event(g,e)};
    function model(g){
      return {...ports.snapshot(g),'mode.label':tr('tokyo.'+render.mode(g)),
        'message.text':messageText,'message.active':performance.now()<messageUntil,'hint.text':hintText};
    }
    function reset(g){
      messageText='';messageUntil=0;hintText=tr('hud.tapRunner');
      hud.reset();render.reset(g);sound.reset(g);
    }
    const common={
      'en-GB':{'tokyo.kicker':'SNACKDASH V2 · TECHNICAL REVIEW','tokyo.subtitle':'Marathon aid station · Ten races · Three modes',
        'tokyo.staff':'Choose staff','tokyo.female':'Female','tokyo.male':'Male','tokyo.qa':'QA · non-persistent scenes','tokyo.qaActive':'QA · VIEW ONLY',
        'tokyo.debugOn':'DEBUG ON · 2/4 combo · normal speed','tokyo.debugOff':'Enable playable debug mode','tokyo.dense':'8 runners / 4-digit bibs','tokyo.rotate':'Rotate your device to landscape.','tokyo.isolated':'Preview scores, preferences and practice history are separate from the regular game.',
        'tokyo.progress':'{{count}} / 10 served','tokyo.paused':'Paused','tokyo.go':'GO!','tokyo.race':'Race {{race}}'},
      'zh-Hans':{'tokyo.kicker':'SNACKDASH V2 · 技术评审','tokyo.subtitle':'马拉松补给站 · 十场比赛 · 三种模式',
        'tokyo.staff':'选择补给员','tokyo.female':'女补给员','tokyo.male':'男补给员','tokyo.qa':'测试 · 不保存进度','tokyo.qaActive':'测试 · 仅供查看',
        'tokyo.debugOn':'DEBUG 已开启 · 2/4 连击 · 不加速','tokyo.debugOff':'开启可玩调试模式','tokyo.dense':'8 名运动员 / 四位数号码','tokyo.rotate':'请将设备旋转为横屏。','tokyo.isolated':'试玩版的成绩、设置和练习记录与正式版完全独立。',
        'tokyo.progress':'已完成 {{count}} / 10 场','tokyo.paused':'已暂停','tokyo.go':'开始！','tokyo.race':'第 {{race}} 场'}
    };
    const select=$('languageSelect');
    for(const locale of I18n.availableLocales()){
      const base=Object.fromEntries(I18n.keys(locale.code).map(key=>[key,I18n.lookup(key,locale.code)]));
      const words=scene.labels[locale.code]||scene.labels['en-GB'];
      const cityName=ports.cityText(CITIES[previewCity],'name');
      I18n.registerLocale(locale.code,{...base,...(common[locale.code]||common['en-GB']),
        'app.title':'SnackDash V2 — '+words.title,'app.tagline':words.title,
        'tokyo.title':words.title,'tokyo.normal':words.normal,'tokyo.fever':words.fever,'tokyo.inferno':words.inferno,
        'help.welcome':locale.code==='zh-Hans'?'欢迎加入'+cityName+'马拉松补给站！':'Welcome to the '+cityName+' Marathon aid station!'},locale);
      const option=document.createElement('option');option.value=locale.code;option.textContent=locale.label;select.append(option);
    }
    I18n.init();
    function staffUI(){
      $('tokyoFemale').setAttribute('aria-pressed',String(staff==='female'));
      $('tokyoMale').setAttribute('aria-pressed',String(staff==='male'));
    }
    for(const sex of ['female','male']){
      const b=$('tokyo'+sex[0].toUpperCase()+sex.slice(1));
      b.addEventListener('click',()=>{staff=sex;staffUI();try{localStorage.setItem(staffKey,staff)}catch(_){}});
    }
    staffUI();
    const controls=[$('startBtn'),...document.querySelectorAll('[data-scene]')];
    controls.forEach(b=>b.disabled=true);
    render.loaded.then(()=>{
      document.documentElement.dataset.tokyoAssets='ready';
      controls.forEach(b=>b.disabled=false);
      for(const sex of ['female','male']){
        const node=$('tokyo'+sex[0].toUpperCase()+sex.slice(1)).querySelector('.staff-mark');
        node.style.backgroundImage='url("'+render.imageURL(manifest.ui['avatar/'+sex])+'")';node.classList.add('has-portrait');
      }
    }).catch(e=>{document.documentElement.dataset.tokyoAssets='error';console.error(e);$('startBtn').textContent='Artwork failed to load'});
    $('playtestDebugBtn').addEventListener('click',()=>ports.setDebug(!ports.getDebug()));
    function renderMenu(){
      const grid=$('levelGrid'),first=previewCity*10+1;
      const debug=$('playtestDebugBtn');
      debug.hidden=!ports.debugRules;
      debug.setAttribute('aria-pressed',String(ports.getDebug()));
      debug.textContent=tr(ports.getDebug()?'tokyo.debugOn':'tokyo.debugOff');
      $('exitDebugBtn').classList.toggle('hidden',!ports.getDebug());
      if(ports.getSelected()<first||ports.getSelected()>=first+10)ports.select(first);
      grid.replaceChildren();
      $('tokyoProgress').textContent=tr('tokyo.progress',{count:cityCleared(ports.getPrefs().best,previewCity)});
      for(let i=0;i<10;i++){
        const cfg=LEVELS[first-1+i],won=isWon(cfg.level),b=document.createElement('button');
        b.type='button';b.className='level-tile'+(ports.getSelected()===cfg.level?' selected':'')+(won?' won':'');
        b.dataset.race=String(cfg.event);b.setAttribute('aria-pressed',String(ports.getSelected()===cfg.level));
        b.setAttribute('aria-label',tr('tokyo.race',{race:cfg.event}));
        const number=document.createElement('strong'),time=document.createElement('small');
        number.textContent=String(cfg.event).padStart(2,'0');time.textContent=tr('race.tileTime',{seconds:cfg.seconds});
        b.append(number,time);b.addEventListener('click',()=>{ports.select(cfg.level);renderMenu()});grid.append(b);
      }
      ports.renderSelection();
    }
    // The orientation hint and race state must agree, even if the browser
    // applies CSS media queries before it dispatches the resize event.
    const orientation=root.matchMedia('(orientation: portrait)');
    function syncOrientation(game=ports.getGame()){
      const portrait=orientation.matches;
      if(portrait&&game&&['playing','countdown'].includes(game.phase)&&!game.qaFixture)game.pause();
      const app=$('app'),value=portrait?'portrait':'landscape';
      if(app.dataset.orientation!==value)app.dataset.orientation=value;
      return portrait;
    }
    if(orientation.addEventListener)orientation.addEventListener('change',()=>{syncOrientation();resize()});
    else if(orientation.addListener)orientation.addListener(()=>{syncOrientation();resize()});
    function resize(){
      syncOrientation();
      const screen=$('gameScreen'),app=$('app');
      if(app.classList.contains('in-game')){
        const style=getComputedStyle(app),padX=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),padY=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
        const vw=Math.min(app.clientWidth,root.visualViewport?.width||innerWidth)-padX;
        const vh=Math.min(app.clientHeight,root.visualViewport?.height||innerHeight)-padY;
        const width=Math.max(1,Math.floor(Math.min(vw,vh*W/H)));
        screen.style.width=width+'px';screen.style.height=width*H/W+'px';
        stage.style.width='100%';stage.style.height='100%';
        hud.resize(width,width*H/W);
      }
      const width=screen.clientWidth||Math.min(innerWidth,W),ratio=Math.max(.75,Math.min(2,(root.devicePixelRatio||1)*width/W));
      if(canvas.width!==Math.round(W*ratio)||canvas.height!==Math.round(H*ratio)){canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio)}
      ports.setPixelRatio(canvas.width/W);
    }
    function syncHUD(g){
      const m=render.mode(g);
      $('gameScreen').dataset.mode=m;$('gameScreen').dataset.qa=String(Boolean(g.qaFixture));
      hud.render(model(g),g.sceneTime*1000);sound.sync(g,m);
    }
    function draw(g){
      // Also refresh controls while paused, and expire message overlays.
      syncHUD(g);render.draw(g);
    }
    function syncSound(){
      const g=ports.getGame();
      if(g)syncHUD(g);else sound.sync(null,'normal');
    }
    async function toggleFullscreen(){
      try{
        if(document.fullscreenElement||document.webkitFullscreenElement){
          const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document);
        }else{
          const el=document.documentElement,req=el.requestFullscreen||el.webkitRequestFullscreen;if(req)await req.call(el);
        }
      }catch(_){/* Landscape remains playable without fullscreen. */}
      resize();
    }
    function event(g,e){render.event(g,e)}
    function menu(){sound.reset(null);hud.reset();messageText='';messageUntil=0}
    function message(text,duration){messageText=text;messageUntil=performance.now()+duration}
    function hint(text){hintText=text}
    function inspect(m){
      const dense=m==='dense',fixtureMode=dense?'normal':m;
      if(!render.ready()||!['normal','fever','inferno'].includes(fixtureMode))return;
      const g=ports.createFixture(previewCity*10+(dense?10:1),0x32f11a+(dense?10:1));
      g.phase='playing';g.countdown=0;g.goFlash=0;g.combo=fixtureMode==='inferno'?10:fixtureMode==='fever'?5:0;
      g.fever=fixtureMode!=='normal';g.inferno=fixtureMode==='inferno';
      const positions=scene.fixtures[dense?'dense':'normal'],bibs=dense?[12,18,24,321,1000,72,144,156]:[12,18,24,36,72,63];
      g.runners.forEach((r,i)=>{const [y,lane]=positions[i];r.y=y;r.laneIndex=r.targetLaneIndex=lane;r.lane=ports.LANES[lane];r.artIndex=i%manifest.actors.runners.length;r.number=bibs[i];r.sway=0;r.speed=r.baseSpeed});
      g.supplies.held={number:8,type:fixtureMode==='fever'?'bar':'water',id:1};
      g.supplies.queue=[{number:12,type:'water',id:2},{number:9,type:'banana',id:3}];g.pendingSupply=false;
      reset(g);g.assertReady();g.syncHUD();resize();g.draw();
    }
    for(const b of document.querySelectorAll('[data-scene]'))b.addEventListener('click',()=>inspect(b.dataset.scene));
    const qa=Object.freeze({
      inspect,trace:()=>{const g=ports.getGame();return g?{...render.trace(g),hud:hud.trace(),audio:sound.trace()}:null},
      geometry:()=>{const g=ports.getGame();return {width:W,height:H,lanes:ports.LANES.length,table:{...scene.table},slots:render.slotRects(),staff,
        hand:g?render.handPoint(g):null,staffFoot:g?render.staffContact(g).y:null,
        scaleAt:g?[render.runnerScale(g.runners[0],200),render.runnerScale(g.runners[0],400),render.runnerScale(g.runners[0],640)]:[],
        mode:g?render.mode(g):null,fixture:!!g?.qaFixture,assetsReady:render.ready(),
        schemaVersion:manifest.schemaVersion,artRevision:manifest.artRevision,sourceCommit:manifest.sourceCommit,cityId:manifest.id,
        runnerCast:manifest.actors.runners.length,runFrames:Object.values(manifest.clips).reduce((n,c)=>n+c.frames.length,0),
        staffFrames:Object.keys(manifest.clips).filter(k=>k.startsWith('staff/')).reduce((n,k)=>n+manifest.clips[k].frames.length,0),
        crowdGroups:manifest.actors.crowds.length,
        pages:Object.keys(pack.images).length,sprites:Object.keys(pack.sprites).length}}});
    root.SnackDashLandscapeQA=qa;
    root.SnackDashTokyoQA=qa; // retained test API name, not a city dependency
    return {ready:render.ready,renderMenu,resize,syncHUD,syncSound,draw,update:render.update,event,reset,menu,message,hint,
      roadCenter:render.roadCenter,roadHalfWidth:render.roadHalfWidth,runnerScale:render.runnerScale,trafficFootprint:render.trafficFootprint,
      populate:render.populate,visible:render.visible,pickSlot:render.pickSlot,pickRunner:render.pickRunner,handPoint:render.handPoint,
      suspended:()=>syncOrientation(),pauseHit:()=>false,
      raceStarted:g=>{syncOrientation(g);syncHUD(g)}};
  };
})(window);
