  // Tokyo illustrated asset renderer. All scenery and actor pixels are
  // imported artwork, not generated geometric substitutes. Canvas owns
  // attachment transforms, runtime numerals, controls, shadows and effects.
  const TOKYO_TABLE=Object.freeze({left:0,right:344,top:510,contact:533,front:562,bottom:720});
  const TOKYO_SLOTS=Object.freeze([{x:14,y:596,w:148,h:100},{x:171,y:596,w:148,h:100}]);
  const tMode=g=>g.inferno?'inferno':g.fever?'fever':'normal';
  const tDepth=y=>clamp((y-290)/350,0,1);
  const TOKYO_ART=window.SnackDashTokyoArt;
  if(!TOKYO_ART||TOKYO_ART.manifest.version!==2)throw Error('Illustrated Tokyo art pack missing');
  const artManifest=TOKYO_ART.manifest, artImages={};
  let tokyoAssetsReady=false;
  const loadingControls=[$('startBtn'),...document.querySelectorAll('[data-scene]')];
  loadingControls.forEach(b=>b.disabled=true);
  Promise.all(Object.entries(TOKYO_ART.images).map(async ([key,url])=>{
    const image=new Image();image.src=url;await image.decode();artImages[key]=image;
  })).then(()=>{
    tokyoAssetsReady=true;document.documentElement.dataset.tokyoAssets='ready';
    loadingControls.forEach(b=>b.disabled=false);
  }).catch(error=>{
    document.documentElement.dataset.tokyoAssets='error';console.error('Tokyo artwork failed to decode',error);
    $('startBtn').textContent='Artwork failed to load';
  });
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
  function tSprite(key,rect,x,y,w,h){const im=artImages[key];if(im)ctx.drawImage(im,...rect,x,y,w,h)}
  function tRunnerArt(r){
    if(Number.isInteger(r.artIndex))return artManifest.runners[r.artIndex%artManifest.runners.length];
    // Appearance derives from the independent cosmetic seed, never nationality.
    const p=r.look.genderPresentation,choices=p===0?[0,3,4,5]:p===1?[1,2]:[0,1,2,3,4,5];
    r.artIndex=choices[Math.floor(Math.abs(r.seed*173.731))%choices.length];return artManifest.runners[r.artIndex];
  }
  function tBodyHeight(y){return clamp(100+(y-290)*.96,76,338)}
  function tFootDepth(y){return clamp((y+tBodyHeight(y)*.57-284)/436,0,1)}
  function tRunnerRect(r,y=r.y,x=runnerXAt(r,y,r.lane)){
    const art=tRunnerArt(r),h=runnerScale(r,y,false)*128,w=h*art.rect[2]/art.rect[3];
    return {x:x-art.bib[0]*w,y:y-art.bib[1]*h,w,h,art,bibX:x,bibY:y};
  }
  function tRunner(r,g,x){
    const rect=tRunnerRect(r,r.y,x),{art,w,h}=rect;
    const jump=runnerVisualOffset(r),motion=!reducedMotion()&&!g.qaFixture;
    const phase=g.sceneTime*(9.4+r.speed*.018)+r.seed;
    const bob=motion?-Math.abs(Math.sin(phase))*Math.min(7,h*.023):0;
    const y=rect.y+jump+bob,xx=rect.x;
    // Floor-contact shadow is placed on the photographed/illustrated roadway.
    const footY=y+h-2,shadowH=Math.max(3,h*.037);
    if(footY<H+12){ctx.save();ctx.globalAlpha=.25;tOval(ctx,x-10,footY,w*.40,shadowH,'#20233e',null,1,-.16);ctx.restore()}
    const [sx,sy,sw,sh]=art.rect,split=Math.round(sh*.55),dh=h*split/sh;
    // Alternating stride uses the actual lower-body image, preserving the
    // face, hair, singlet and blank bib. The clip stays on the shorts seam.
    if(motion&&Math.sin(phase)<0){
      ctx.save();ctx.beginPath();ctx.rect(xx-w*.35,y+dh-1,w*1.7,h-dh+2);ctx.clip();
      ctx.translate(2*x,0);ctx.scale(-1,1);
      tSprite('runners.webp',[sx,sy+split,sw,sh-split],xx,y+dh,w,h-dh);ctx.restore();
      tSprite('runners.webp',[sx,sy,sw,split+1],xx,y,w,dh+1);
    }else tSprite('runners.webp',art.rect,xx,y,w,h);
    if(r.cheerTimer>0&&motion){ctx.save();ctx.globalAlpha=Math.min(.9,r.cheerTimer*2);tStar(ctx,x+w*.43,by-h*.20,Math.min(15,h*.055),'#ffdc79','#fff6c8');ctx.restore()}
  }
  function tRunnerBib(r,g,x){
    const rect=tRunnerRect(r,r.y,x),{art,w,h}=rect;
    const jump=runnerVisualOffset(r),motion=!reducedMotion()&&!g.qaFixture;
    const phase=g.sceneTime*(9.4+r.speed*.018)+r.seed;
    const bob=motion?-Math.abs(Math.sin(phase))*Math.min(7,h*.023):0;
    // At all distances numerals are drawn at the measured blank-bib anchor.
    const n=String(r.number),nativeW=art.bib[2]*w,nativeH=art.bib[3]*h;
    const bw=Math.max(n.length>3?39:31,nativeW*1.04),bh=Math.max(19,nativeH*1.03),by=r.y+jump+bob;
    ctx.save();tRect(ctx,x-bw/2,by-bh/2,bw,bh,Math.max(1.8,bh*.09),'#fffdf9','#4e426653',.9);
    fitLabel(n,x,by,Math.min(35,bh*.77),bw-3,'#182436',12);ctx.restore();
  }
  function tSupply(s,x,y,dim,rotation=0){
    if(!s)return;const a=artManifest.supplies[s.type];if(!a)throw Error('No artwork for supply '+s.type);
    const [sx,sy,sw,sh]=a.rect,w=dim*sw/Math.max(sw,sh),h=dim*sh/Math.max(sw,sh);
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);tSprite('supplies.webp',a.rect,-w/2,-h/2,w,h);ctx.restore();
  }
  // Canonical effect code calls drawSupply; provide the same physical art in
  // every context. Numbers, when requested, are drawn separately.
  drawSupply=(s,x,y,size,rotation=0,showNumber=true,labelScale=1)=>{
    if(!s)return;tSupply(s,x,y,size*1.7,rotation);
    if(showNumber){const n=String(s.number),w=n.length>2?37:31;roundedRect(x-w/2,y+5,w,23,5,'#fffdf4','#26364b',1.5);fitLabel(n,x,y+16,17,w-3,'#213347')}
  };
  function tTable(g){
    const a=TOKYO_TABLE,mode=tMode(g),tex=artImages['table-texture.webp'];
    tOval(ctx,173,711,174,16,'#352a3745');
    // Textured front cloth and wooden slab share the same geometry in all modes.
    ctx.save();ctx.beginPath();ctx.rect(0,a.front,326,H-a.front);ctx.clip();
    if(tex)ctx.drawImage(tex,0,160,512,256,0,a.front,326,H-a.front);
    ctx.fillStyle=mode==='inferno'?'#55247baa':mode==='fever'?'#df4f8299':'#ad284166';ctx.fillRect(0,a.front,326,H-a.front);
    for(let i=0;i<8;i++){const x=20+i*44;const shade=ctx.createLinearGradient(x-12,0,x+12,0);shade.addColorStop(0,'#311c2b00');shade.addColorStop(.5,'#311c2b30');shade.addColorStop(1,'#311c2b00');ctx.fillStyle=shade;ctx.fillRect(x-12,a.front,24,H-a.front)}
    if(mode==='inferno'){tBurst(ctx,32,710,31,'#ffd879',.3);tBurst(ctx,301,710,35,'#ffd879',.1)}else{tFlower(ctx,39,712,24,'#ffd6e7','#ffb55e');tFlower(ctx,304,711,23,'#ffd6e7','#ffb55e')}
    ctx.restore();
    tPoly(ctx,[[326,a.front],[344,a.front-21],[344,H],[326,H]],mode==='inferno'?'#392258':'#862544','#693849',2);
    const top=[[0,a.top+23],[305,a.top],[344,a.front-19],[326,a.front],[0,a.front]];
    ctx.save();tPoly(ctx,top,null);ctx.clip();if(tex)ctx.drawImage(tex,0,0,512,160,0,a.top,344,a.front-a.top+5);ctx.fillStyle='#ffe4ae24';ctx.fillRect(0,a.top,344,65);ctx.restore();
    tPoly(ctx,top,null,'#70402a',2.5);tLine(ctx,0,a.front-1,326,a.front-1,'#ffe8b8',3);tLine(ctx,326,a.front-1,343,a.front-19,'#ffe8b8',2.5);
    tPoly(ctx,[[0,a.front],[326,a.front],[344,a.front-19],[344,a.front-6],[326,a.front+15],[0,a.front+15]],tGradient(ctx,0,a.front,0,a.front+16,'#e2a96b','#985c39'),'#77482e',2.2);
    for(const [i,b] of TOKYO_SLOTS.entries()){
      const s=g.supplies.queue[i];ctx.save();ctx.shadowColor='#3d173860';ctx.shadowBlur=5;ctx.shadowOffsetY=3;
      tRect(ctx,b.x,b.y,b.w,b.h,15,tGradient(ctx,b.x,b.y,b.x,b.y+b.h,'#fffbe9','#f8dfb2'),'#82513b',3);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
      tRect(ctx,b.x+4,b.y+4,b.w-8,b.h-8,11,null,'#fffef4',2);ctx.restore();
      if(s){tSupply(s,b.x+41,b.y+b.h/2,70,-.13);fitLabel(String(s.number),b.x+109,b.y+b.h/2,48,65,'#1d2636',25)}
      else{fitLabel('↻',b.x+b.w/2,b.y+34,32,50,'#947977');fitLabel(tr('role.refill'),b.x+b.w/2,b.y+70,17,b.w-8,'#947977')}
    }
  }
  function tStaffBase(g){return mix(676,TOKYO_TABLE.contact,clamp(g.staffElevation||0,0,1))}
  function tStaffPose(g){
    const elevated=(g.staffElevation||0)>.03||g.inferno;
    const mode=elevated?'inferno':tMode(g),a=artManifest.staff[tokyoVolunteer+'-'+mode];
    const maxH=elevated?395:370,maxW=elevated?317:338;
    const h=Math.min(maxH,maxW*a.rect[3]/a.rect[2]),w=h*a.rect[2]/a.rect[3];
    const motion=!reducedMotion()&&!g.qaFixture;
    const reach=motion&&g.throwing&&!g.throwing.hit?Math.sin(clamp(g.throwing.elapsed/.41,0,1)*Math.PI)*11:motion&&g.swapCue?Math.sin(clamp(g.swapCue.age/g.swapCue.duration,0,1)*Math.PI)*5:0;
    const foot=elevated?tStaffBase(g):TOKYO_TABLE.front-13;
    const xx=tokyoVolunteer==='female'&&elevated?27:4;
    return {a,x:xx+reach,y:foot-h,w,h,foot,handX:xx+reach+a.hand[0]*w,handY:foot-h+a.hand[1]*h};
  }
  function tHand(g){const p=tStaffPose(g);return {x:p.handX+6,y:p.handY-22}}
  function tStaff(g){
    const p=tStaffPose(g),hand=tHand(g),item=g.supplies.held;
    if((g.staffElevation||0)>.55)tOval(ctx,p.x+p.w*.43,TOKYO_TABLE.contact,p.w*.34,6,'#2d18264d');
    // Supply drawn first, then the illustrated grip covers its lower edge.
    if(item&&(!g.throwing||g.throwing.hit))tSupply(item,hand.x,hand.y,65,-.20);
    tSprite('staff.webp',p.a.rect,p.x,p.y,p.w,p.h);
    if(item&&(!g.throwing||g.throwing.hit)){
      const n=String(item.number),bw=n.length>1?91:78,bh=66;
      // Keep digit bubble beside the head/hand and out of the HUD.
      const bx=clamp(hand.x+7-bw/2,210,360),by=Math.max(100,hand.y-99);
      tPoly(ctx,[[bx+19,by+bh-9],[bx+38,by+bh-9],[bx+12,by+bh+16]],'#fffdf6','#233041',3);
      tRect(ctx,bx,by,bw,bh,26,'#fffdf8','#233041',3.5);fitLabel(n,bx+bw/2,by+bh/2,44,bw-12,'#15243a',26);
    }
  }
  function tAtmosphere(g){
    const mode=tMode(g),t=g.sceneTime,motion=!reducedMotion()&&!g.qaFixture;
    if(mode==='fever'||mode==='inferno'){
      const count=mode==='fever'?35:16;
      for(let i=0;i<count;i++){
        const q=motion?t:0,x=(i*173+q*(12+i%5*7))%W,y=92+(i*109+q*(22+i%4*8))%560;
        if(x<355&&y>145)continue;
        ctx.save();ctx.globalAlpha=.75;tOval(ctx,x,y,4+i%4,2.5,'#ffd3e6',null,1,i*.7+q);ctx.restore();
      }
    }
    if(mode==='inferno'&&motion){for(let i=0;i<19;i++){const x=390+(i*173)%850,y=84+(i*47)%151;ctx.globalAlpha=.2+.55*Math.abs(Math.sin(t*2+i));tStar(ctx,x,y,3+i%3,'#fff2b4')}ctx.globalAlpha=1}
  }
  function tSwapCue(g){
    if(!g.swapCue)return;const q=g.swapCue,p=clamp(q.age/q.duration,0,1),hand=tHand(g),mode=q.mode;
    ctx.save();ctx.globalAlpha=1-p*.85;
    const x=hand.x-64,y=hand.y-24,r=40+(reducedMotion()?0:p*34);
    if(mode==='normal')tStar(ctx,x,y,r,'#ffdb63','#fffbde');
    else{
      const col=mode==='inferno'?'#dc7aff':'#ff9e4c';
      tBurst(ctx,x,y,r,col,.2);
      tStar(ctx,x,y,r*.55,mode==='inferno'?'#ffc9ff':'#ffdd63','#fff7c9');
      if(mode==='inferno')tOval(ctx,x,y,r,r,null,'#ffd8ff',3)
    }
    ctx.restore()
  }
  function tProjectile(g){
    const f=g.throwing;if(!f||f.hit)return;
    const r=g.runners.find(a=>a.id===f.runnerId);if(!r)return;
    const p=clamp(f.elapsed/.41,0,1),from=f.tokyoOrigin||tHand(g),end={x:g.runnerX(r),y:r.y+runnerVisualOffset(r)};
    const hot=f.tokyoMode!=='normal',col=f.tokyoMode==='inferno'?'#ef9dff':'#ffd074';
    const point=q=>[mix(from.x,end.x,q),mix(from.y,end.y,q)-Math.sin(Math.PI*q)*(hot?92:60)];
    if(!reducedMotion())for(let i=7;i>=1;i--){const q=Math.max(0,p-i*.033),[x,y]=point(q);ctx.globalAlpha=(1-i/8)*.8;tOval(ctx,x,y,hot?5:3,hot?5:3,col)}
    ctx.globalAlpha=1;const [x,y]=point(p);drawSupply(f.supply,x,y,hot?35:29,p*TAU*.85,false);
  }
  function tImpact(g){
    for(const f of g.effects){
      if(f.kind!=='hitBurst'&&f.kind!=='bonk')continue;
      const p=f.age/f.life,x=f.x,y=f.y;
      ctx.save();ctx.globalAlpha=(1-p)*.84;
      const col=f.mode==='inferno'?'#f3b3ff':f.mode==='fever'?'#ffae65':'#ffd572',r=17+(f.tier||1)*10+p*44;
      if(f.mode==='inferno')tOval(ctx,x,y,r,r,null,col,4);
      if(!reducedMotion())tBurst(ctx,x,y,r,col,.2+p*.2);
      ctx.restore();
    }
  }
  function tFeedback(g){
    const score=g.effects.filter(f=>f.kind==='score').at(-1);
    if(score){
      const p=score.age/score.life,mode=tMode(g),power=Math.min(3,Math.max(1,(score.size||25)/12)),x=435,y=115;
      ctx.save();ctx.globalAlpha=Math.min(1,(1-p)*2);
      if(mode!=='normal'){
        const col=mode==='inferno'?'#d879ff':'#ff9a45';
        for(let i=0;i<5;i++){const xx=x+(i-2)*20,yy=y+15;
          tPoly(ctx,[[xx-10,yy],[xx-13,yy-17],[xx-5,yy-10],[xx+1,yy-(15+power*7)],[xx+9,yy-14],[xx+12,yy]],col)}
        tStar(ctx,x+66,y,10*power,'#ffeb95')
      }
      roundedRect(x-61,y-17,122,34,13,mode==='inferno'?'#4d366f':'#fff3c5','#fff9ea',2);
      fitLabel(score.text,x,y,26,112,mode==='inferno'?'#fff1c9':'#713e48',12);ctx.restore()
    }
    // Native reaction stays in the runner's own language; no translated subtitle.
    const reaction=g.effects.filter(f=>f.kind==='athleteReaction').at(-1);
    if(reaction){const text=reaction.reaction.text,x=444,y=181;
      ctx.save();ctx.globalAlpha=clamp(1-reaction.age/reaction.life*.5,0,1);roundedRect(x-85,y-19,170,38,15,'#fffdf6','#786172',1.7);fitLabel(text,x,y,22,158,'#27384f',11);ctx.restore()}
    if(g.throwing&&g.throwing.hit&&g.throwing.elapsed<.48){
      const r=g.runners.find(a=>a.id===g.throwing.runnerId);
      if(r){const p=(g.throwing.elapsed-.41)/.07;ctx.save();ctx.globalAlpha=1-clamp(p,0,1);drawSupply(g.throwing.supply,g.runnerX(r)+31*runnerScale(r),r.y-15*runnerScale(r),18,0,false);ctx.restore()}
    }
  }
  function tDraw(g){
    ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    if(!tokyoAssetsReady)return;
    ctx.drawImage(artImages[artManifest.backgrounds[tMode(g)]],0,0,W,H);tAtmosphere(g);tImpact(g);
    const ordered=[...g.runners,...g.departing].sort((a,b)=>a.y-b.y);
    for(const r of ordered)tRunner(r,g,g.runnerX(r));
    // Keep all active targets readable during brief visual overtakes.
    // The runtime number is still anchored at each runner's chest.
    for(const r of ordered)tRunnerBib(r,g,g.runnerX(r));
    const onTable=(g.staffElevation||0)>.55;
    if(onTable){tTable(g);tSwapCue(g);tStaff(g)}else{tSwapCue(g);tStaff(g);tTable(g)}
    tProjectile(g);tFeedback(g);
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

