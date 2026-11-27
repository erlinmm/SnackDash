  // Tokyo illustrated asset renderer. All scenery and actor pixels are
  // imported artwork, not generated geometric substitutes. Canvas owns
  // attachment transforms, runtime numerals, controls, shadows and effects.
  // Independent, version-pinned r03 runtime asset pack.
  const TOKYO_ART=window.SnackDashTokyoArt;
  if(!TOKYO_ART||TOKYO_ART.manifest.version!==3)throw Error('Tokyo r03 art pack missing');
  const artManifest=TOKYO_ART.manifest,artImages={},artRaster=new Map();
  const TOKYO_TABLE=Object.freeze({...artManifest.table});
  const TOKYO_SLOTS=Object.freeze(artManifest.slots.map(([x,y,w,h])=>Object.freeze({x,y,w,h})));
  const tMode=g=>g.inferno?'inferno':g.fever?'fever':'normal';
  let tokyoAssetsReady=false;
  const loadingControls=[$('startBtn'),...document.querySelectorAll('[data-scene]')];
  loadingControls.forEach(b=>b.disabled=true);
  // Decode only local embedded URLs. Cache at most 96 SVG rasterizations;
  // the browser can release canvases as athletes leave the screen.
  Promise.all(Object.entries(TOKYO_ART.images).map(async ([key,url])=>{
    const image=new Image();image.src=url;await image.decode();artImages[key]=image;
  })).then(()=>{
    tokyoAssetsReady=true;document.documentElement.dataset.tokyoAssets='ready';
    loadingControls.forEach(b=>b.disabled=false);
    for(const sex of ['female','male']){
      const mark=$('tokyo'+sex[0].toUpperCase()+sex.slice(1)).querySelector('.staff-mark');
      const url=TOKYO_ART.images[artManifest.ui['avatar/'+sex]];
      if(mark){mark.style.backgroundImage='url("'+url+'")';mark.classList.add('has-portrait')}
    }
  }).catch(error=>{
    document.documentElement.dataset.tokyoAssets='error';console.error('Tokyo artwork failed to decode',error);
    $('startBtn').textContent='Artwork failed to load';
  });
  function tImage(key){
    const image=artImages[key];
    if(!image)return null;
    if(!TOKYO_ART.images[key].startsWith('data:image/svg+xml'))return image;
    if(artRaster.has(key)){const c=artRaster.get(key);artRaster.delete(key);artRaster.set(key,c);return c}
    const c=document.createElement('canvas');
    c.width=image.naturalWidth;c.height=image.naturalHeight;
    c.getContext('2d').drawImage(image,0,0);
    artRaster.set(key,c);
    if(artRaster.size>96)artRaster.delete(artRaster.keys().next().value);
    return c;
  }
  function tAsset(key,x,y,w,h){const im=tImage(key);if(im)ctx.drawImage(im,x,y,w,h)}
  function tFrame(frames,elapsed,loop=false){
    const total=frames.reduce((sum,f)=>sum+f.durationMs,0);
    let time=loop?((elapsed%total)+total)%total:clamp(elapsed,0,total-1);
    for(const frame of frames){if(time<frame.durationMs)return frame;time-=frame.durationMs}
    return frames.at(-1);
  }
  // The canonical actor's y is its bib center; the source camera is defined
  // by shoe depth. Convert between them, using the source's height rule.
  function tFootY(y){return (y+18*.391)/(1-.36*.391)}
  function tBodyHeight(y){return clamp(18+.36*tFootY(y),85,300)}
  function tRoadAt(y){
    const p=artManifest.camera,ys=p.yControlPoints;
    const fy=clamp(tFootY(y),ys[0],ys.at(-1));
    let i=0;while(i<ys.length-2&&fy>ys[i+1])i++;
    const f=(fy-ys[i])/(ys[i+1]-ys[i]);
    const left=mix(p.leftX[i],p.leftX[i+1],f),right=mix(p.rightX[i],p.rightX[i+1],f);
    return {left,right};
  }
  function tOval(c,x,y,rx,ry,fill,stroke,width=1.5,rotation=0){
    c.beginPath();c.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),rotation,0,TAU);
    if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}
  }
  function tPoly(c,points,fill,stroke,width=2){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
    if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke()}
  }
  function tRect(c,x,y,w,h,r,fill,stroke,width=1.5){
    c.beginPath();c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}
  }
  function tLine(c,x1,y1,x2,y2,col,w=2){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
  function tGradient(c,x,y,x2,y2,a,b){const gr=c.createLinearGradient(x,y,x2,y2);gr.addColorStop(0,a);gr.addColorStop(1,b);return gr}
  function tStar(c,x,y,r,col,stroke){const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,s=i%2?r*.42:r;pts.push([x+Math.cos(a)*s,y+Math.sin(a)*s])}tPoly(c,pts,col,stroke,1.8)}
  function tBurst(c,x,y,r,col,seed=0){for(let i=0;i<24;i++){const a=i*TAU/24+seed,inner=r*(.23+(i%4)*.04),outer=r*(.75+(i%5)*.055);tLine(c,x+Math.cos(a)*inner,y+Math.sin(a)*inner,x+Math.cos(a)*outer,y+Math.sin(a)*outer,col,Math.max(1,r*.022));if(i%2===0)tOval(c,x+Math.cos(a)*r,y+Math.sin(a)*r,1.8,1.8,col)}}
  function tFlower(c,x,y,r,color,center){for(let i=0;i<5;i++){const a=i*TAU/5;tOval(c,x+Math.cos(a)*r*.54,y+Math.sin(a)*r*.54,r*.55,r*.39,color,null,1,a)}tOval(c,x,y,r*.2,r*.2,center)}
  function tRunnerArt(r){
    if(!Number.isInteger(r.artIndex)){
      // Explicitly independent of the 11 nationality/language profiles.
      const p=r.look.genderPresentation;
      const choices=artManifest.runners.map((a,i)=>({a,i})).filter(({a})=>p===2||a.gender===(p===0?'female':'male'));
      r.artIndex=choices[Math.floor(Math.abs(r.seed*173.731))%choices.length].i;
    }
    return artManifest.runners[r.artIndex%artManifest.runners.length];
  }
  function tRunnerPose(r,g){
    const art=tRunnerArt(r);
    const motion=!reducedMotion()&&!g.qaFixture;
    const phase=g.sceneTime*1000*clamp(r.speed/35,.8,2)+r.seed*113;
    const frame=motion?tFrame(art.frames,phase,true):art.frames[1];
    const receiving=g.throwing&&g.throwing.runnerId===r.id&&g.throwing.hit&&r.mood==='happy';
    let key=frame.image;
    if(receiving)key=art.states.receive_supply;
    else if(r.mood==='angry'&&r.moodTimer>0)key=art.states.pain;
    else if(r.feverCheerTimer>1.1)key=art.states.cheer;
    else if(r.cheerTimer>1.05)key=art.states.thanks;
    return {key,bib:frame.bib,receiving};
  }
  function tRunnerRect(r,y=r.y,x=runnerXAt(r,y,r.lane)){
    const art=tRunnerArt(r),h=runnerScale(r,y,false)*128,w=h*art.size[0]/art.size[1],s=h/art.size[1];
    const [bx,by]=art.bib;
    return {x:x-bx*s,y:y-by*s,w,h,s,art,bibX:x,bibY:y};
  }
  function tRunner(r,g,x){
    const rect=tRunnerRect(r,r.y,x),{art,w,h,s}=rect,p=tRunnerPose(r,g);
    const jump=runnerVisualOffset(r),y=rect.y+jump;
    if(p.receiving){
      const [hx,hy]=art.catchHand;
      tSupply(g.throwing.supply,rect.x+hx*s,y+hy*s,Math.max(25,h*.17),-.12,'flight');
    }
    tAsset(p.key,rect.x,y,w,h);
  }
  function tRunnerBib(r,g,x){
    const rect=tRunnerRect(r,r.y,x),{art,s}=rect;
    const n=String(r.number),nativeW=art.bib[2]*s,nativeH=art.bib[3]*s,by=r.y+runnerVisualOffset(r);
    // Blank artwork bib is source-driven. Enlarge the runtime plate only
    // when needed for far four-digit numerals, without changing eligibility.
    const bw=Math.max(n.length>3?75:n.length===3?56:43,nativeW),
          bh=Math.max(n.length>3?35:28,nativeH);
    if(bw>nativeW+.2||bh>nativeH+.2)tRect(ctx,x-bw/2,by-bh/2,bw,bh,Math.max(2,bh*.09),'#fffdf6','#1e3051',1.5);
    fitLabel(n,x,by,Math.min(42,bh*.80),bw-5,'#101d32',14);
  }
  function tSupply(s,x,y,dim,rotation=0,placement='hand'){
    if(!s)return;
    const key=artManifest.supplies[s.type]?.[placement],fallback=artManifest.fallbackSupplies[s.type];
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
    if(key)tAsset(key,-dim/2,-dim/2,dim,dim);
    else if(fallback){
      const [sx,sy,sw,sh]=fallback.rect,w=dim*sw/Math.max(sw,sh),h=dim*sh/Math.max(sw,sh);
      ctx.drawImage(tImage('fallback-supplies'),sx,sy,sw,sh,-w/2,-h/2,w,h);
    }else throw Error('No artwork for supply '+s.type);
    ctx.restore();
  }
  drawSupply=(s,x,y,size,rotation=0,showNumber=true,labelScale=1)=>{
    if(!s)return;tSupply(s,x,y,size*1.7,rotation,'flight');
    if(showNumber){const n=String(s.number),w=n.length>2?37:31;roundedRect(x-w/2,y+5,w,23,5,'#fffdf4','#26364b',1.5);fitLabel(n,x,y+16,17,w-3,'#213347')}
  };
  function tTable(g){
    tAsset(artManifest.station[tMode(g)],0,0,W,H);
    for(const [i,b] of TOKYO_SLOTS.entries()){
      const s=g.supplies.queue[i];
      tAsset(artManifest.ui.slot,b.x,b.y,b.w,b.h);
      if(s){
        tSupply(s,b.x+b.w*.29,b.y+b.h*.5,b.h*.67,0,'slot');
        fitLabel(String(s.number),b.x+b.w*.71,b.y+b.h*.5,39,b.w*.43,'#162a45',21);
      }else fitLabel('↻',b.x+b.w*.71,b.y+b.h*.5,28,b.w*.4,'#947977');
    }
  }
  function tStaffBase(g){return mix(680,TOKYO_TABLE.contact,clamp(g.staffElevation||0,0,1))}
  function tStaffPose(g){
    const elevation=g.staffElevation||0,elevated=elevation>.03||g.inferno;
    const mode=elevated?'inferno':tMode(g),a=artManifest.staff[tokyoVolunteer+'-'+mode];
    const f=a.frames, motion=!reducedMotion()&&!g.qaFixture;
    let id=elevated?'stand':'idle';
    if(motion&&g.throwing){
      if(g.throwing.hit)id='recover';
      else id=g.throwing.elapsed<.10?'release':'follow';
    }else if(motion&&elevated&&elevation<.99){
      id=!g.inferno?'descend':elevation<.20?'behind':elevation<.48?'step':'rise';
    }else if(motion&&g.swapCue&&!elevated){
      const elapsed=g.swapCue.age*1000;
      id=elapsed<70?'reach':elapsed<135?'grab':elapsed<210?'raise':'recover';
    }
    const frame=f[id]||f[elevated?'stand':'idle'];
    const s=1.14,w=a.size[0]*s,h=a.size[1]*s,foot=tStaffBase(g);
    // Same character scale and contact point across all three modes.
    const x=143-frame.pivot[0]*s,y=foot-frame.pivot[1]*s;
    return {frame,x,y,w,h,s,foot,id,handX:x+frame.hand[0]*s,handY:y+frame.hand[1]*s};
  }
  function tHand(g){const p=tStaffPose(g);return {x:p.handX,y:p.handY}}
  function tStaff(g){
    const p=tStaffPose(g),hand=tHand(g),item=g.supplies.held;
    const holding=item&&(!g.throwing||g.throwing.hit);
    // Original sample bottle is removed at build time. Render the actual
    // supply first so the source grip/foreground fingers occlude its edge.
    if(holding)tSupply(item,hand.x,hand.y,69,0,'hand');
    tAsset(p.frame.image,p.x,p.y,p.w,p.h);
    if(holding){
      const n=String(item.number),bw=104,bh=72;
      const bx=clamp(hand.x+14-bw/2,212,270),by=clamp(hand.y-95,105,350);
      tAsset(artManifest.ui.bubble,bx,by,bw,bh);
      fitLabel(n,bx+bw*.5,by+bh*.43,40,bw*.65,'#15243a',25);
    }
  }
  // Spectator source groups are clipped outside the traced road. The original
  // background rail stays intact; never add a second horizontal barrier.
  function tCrowd(g){
    const mode=tMode(g),p=artManifest.camera;
    for(const side of ['left','right']){
      ctx.save();ctx.beginPath();
      ctx.moveTo(side==='left'?0:W,p.yControlPoints[0]);
      for(let i=0;i<p.yControlPoints.length;i++){
        const x=side==='left'?Math.max(0,p.leftX[i]-65):Math.min(W,p.rightX[i]+35);
        ctx.lineTo(x,p.yControlPoints[i]);
      }
      ctx.lineTo(side==='left'?0:W,H);ctx.closePath();ctx.clip();
      const draw=(depth,x,y,w,h,skew)=>{
        ctx.save();ctx.translate(x,y);ctx.transform(1,skew,0,1,0,0);
        tAsset(artManifest.crowd[mode+'/'+depth+'/'+side],0,0,w,h);ctx.restore();
      };
      if(side==='left'){
        draw('far',516,150,220,82,-.20);
        draw('mid',330,203,250,148,-.43);
        draw('near',0,270,390,250,-.48);
      }else{
        draw('far',865,160,210,82,.18);
        draw('mid',1035,190,220,145,.40);
        draw('near',1195,260,335,220,.48);
      }
      ctx.restore();
    }
  }
  function tAtmosphere(g){
    const mode=tMode(g),motion=reducedMotion()?'reduced':'normal';
    tAsset(artManifest.ambient[mode+'/'+motion],0,0,W,H);
    // Gentle movement is kept behind all interactive actors and numbers.
    if(mode==='fever'&&!reducedMotion()&&!g.qaFixture){
      for(let i=0;i<18;i++){const x=(i*173+g.sceneTime*22)%W,y=100+(i*109+g.sceneTime*34)%530;
        ctx.save();ctx.globalAlpha=.6;tOval(ctx,x,y,4+i%3,2.5,'#ffd3e6',null,1,i*.7+g.sceneTime);ctx.restore()}
    }
  }
  function tEventFx(mode,event,elapsed,x,y,w,h){
    const motion=reducedMotion()?'reduced':'normal',spec=artManifest.fx[mode+'/'+event+'/'+motion];
    if(!spec)return;
    const total=spec.frames.reduce((s,f)=>s+f.durationMs,0);
    if(elapsed<0||elapsed>=total)return;
    const f=tFrame(spec.frames,elapsed);
    const hh=h||w*spec.canvas[1]/spec.canvas[0];
    tAsset(f.image,x-w/2,y-hh/2,w,hh);
  }
  function tSwapCue(g){
    if(!g.swapCue)return;
    const q=g.swapCue,hand=tHand(g);
    tEventFx(q.mode,'swap',q.age*1000,hand.x-25,hand.y,140);
  }
  function tProjectile(g){
    const f=g.throwing;if(!f||f.hit)return;
    const r=g.runners.find(a=>a.id===f.runnerId);if(!r)return;
    const p=clamp(f.elapsed/.41,0,1),from=f.tokyoOrigin||tHand(g),end={x:g.runnerX(r),y:r.y+runnerVisualOffset(r)};
    const hot=f.tokyoMode!=='normal';
    const point=q=>[mix(from.x,end.x,q),mix(from.y,end.y,q)-Math.sin(Math.PI*q)*(hot?92:60)];
    if(!reducedMotion())for(let i=7;i>=1;i--){const q=Math.max(0,p-i*.033),[x,y]=point(q);ctx.globalAlpha=(1-i/8)*.65;tOval(ctx,x,y,hot?5:3,hot?5:3,hot?'#ffd074':'#fff9dc')}
    ctx.globalAlpha=1;const [x,y]=point(p);
    tEventFx(f.tokyoMode||'normal','throw',f.elapsed*1000,x,y,90);
    tSupply(f.supply,x,y,hot?62:52,p*TAU*.85,'flight');
  }
  function tImpact(g){
    for(const f of g.effects){
      const event=f.kind==='hitBurst'?'receive':f.kind==='bonk'?'miss':f.kind==='feverEntry'?'mode_enter':f.kind==='feverEnd'?'mode_exit':null;
      if(!event)continue;
      const mode=f.mode||tMode(g);
      tEventFx(mode,event,f.age*1000,f.x||W/2,f.y||H*.44,event==='mode_enter'||event==='mode_exit'?250:130+(f.tier||1)*15);
    }
  }
  function tFeedback(g){
    const score=g.effects.filter(f=>f.kind==='score').at(-1);
    if(score){
      const x=435,y=113;
      tEventFx(tMode(g),'score',score.age*1000,x,y,190);
      roundedRect(x-61,y-17,122,34,13,'#fffdf0','#6c4b80',2);
      fitLabel(score.text,x,y,26,112,'#713e48',12);
    }
    const reaction=g.effects.filter(f=>f.kind==='athleteReaction').at(-1);
    if(reaction){
      const text=reaction.reaction.text,x=440,y=177;
      ctx.save();ctx.globalAlpha=clamp(1-reaction.age/reaction.life*.5,0,1);
      roundedRect(x-85,y-19,170,38,15,'#fffdf6','#786172',1.7);
      fitLabel(text,x,y,22,158,'#27384f',11);ctx.restore();
    }
  }
  function tDraw(g){
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    if(!tokyoAssetsReady)return;
    tAsset(artManifest.backgrounds[tMode(g)],0,0,W,H);tCrowd(g);tAtmosphere(g);tImpact(g);
    const ordered=[...g.runners,...g.departing].sort((a,b)=>a.y-b.y);
    for(const r of ordered)tRunner(r,g,g.runnerX(r));
    // Keep all active targets readable during brief visual overtakes.
    // The runtime number is still anchored at each runner's chest.
    for(const r of ordered)tRunnerBib(r,g,g.runnerX(r));
    const onTable=(g.staffElevation||0)>.55;
    if(onTable){tTable(g);tSwapCue(g);tStaff(g)}else{tSwapCue(g);tStaff(g);tTable(g)}
    tProjectile(g);tFeedback(g);
    // Projectile and event effects must never hide a bib's live digits.
    if(g.throwing)for(const r of ordered)tRunnerBib(r,g,g.runnerX(r));
    if(g.qaFixture){roundedRect(1030,94,229,35,9,'#32284de8','#f1d5f9',1.5);fitLabel(tr('tokyo.qaActive'),1144,111,17,211,'#fff5ef')}
    if(g.phase==='countdown'||(g.phase==='playing'&&g.goFlash>0)){
      const text=g.phase==='countdown'?String(Math.max(1,Math.ceil(g.countdown/.5))):tr('tokyo.go');
      roundedRect(W/2-74,H/2-51,148,102,22,'#fff8dc','#cb5d86',3);fitLabel(text,W/2,H/2,67,133,'#bd416d',22);
    }
    if(g.phase==='paused'){
      roundedRect(W/2-150,H/2-65,300,130,22,'#fff8e9','#52617a',3);fitLabel(tr('tokyo.paused'),W/2,H/2-18,31,278,'#293b50');fitLabel(tr('game.resumeAria'),W/2,H/2+29,23,275,'#bd416d')
    }
    if(g.phase==='celebrate'){
      if(!reducedMotion())for(const c of g.confetti){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(g.sceneTime*2+c.twist);ctx.fillStyle=c.color;ctx.fillRect(-c.size/2,-c.size/2,c.size,c.size*.65);ctx.restore()}
      roundedRect(W/2-175,103,350,52,15,'#fff7d8','#ac7a45',2);fitLabel(tr('celebration.staffSuccess'),W/2,129,27,332,'#963b66');
    }
  }

