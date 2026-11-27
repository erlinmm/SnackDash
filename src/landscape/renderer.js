/* Asset-pack-driven landscape renderer. No city or art-revision branches. */
(function(root){
  'use strict';
  root.SnackDashCreateRenderer=function(ports,pack,getStaff){
    const {W,H,TAU,ctx,clamp,mix,randInt,runnerVisualOffset,reducedMotion,fitLabel,roundedRect,throwTiming}=ports;
    const manifest=pack.manifest, scene=manifest.scene;
    const p=scene.perspective, traffic=scene.traffic;
    const pages=new Map(), staticScenes=new Map(), visual=new WeakMap(), cast=new WeakMap();
    let ready=false, tracing=null;
    const mode=g=>g.inferno?'inferno':g.fever?'fever':'normal';
    const motion=()=>reducedMotion()?'reduced':'normal';
    const total=frames=>frames.reduce((n,f)=>n+f.durationMs,0);
    function frameAt(frames,time,loop=false){
      const length=total(frames);
      let t=loop?((time%length)+length)%length:clamp(time,0,length-.001);
      for(const f of frames){if(t<f.durationMs)return f;t-=f.durationMs}
      return frames[frames.length-1];
    }
    function state(g){
      let s=visual.get(g);
      if(!s){s={elevation:g.inferno?1:0,throws:new WeakMap(),receipts:new Map()};visual.set(g,s)}
      return s;
    }
    function loadPage(key,uri){
      return new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>{pages.set(key,image);resolve()};
        image.onerror=()=>reject(Error('Asset page failed to load: '+key));
        image.src=uri;
      });
    }
    const loaded=Promise.all(Object.entries(pack.images).map(([key,uri])=>loadPage(key,uri))).then(()=>{ready=true});
    function imageURL(key){
      const s=pack.sprites[key];
      if(!s||!s.page.startsWith('single/'))throw Error('Standalone image required: '+key);
      return pack.images[s.page];
    }
    function sprite(key){
      const s=pack.sprites[key];
      if(!s)throw Error('Missing logical sprite: '+key);
      const image=pages.get(s.page);
      if(!image)throw Error('Missing decoded page: '+s.page);
      return {s,image};
    }
    // x/y/w/h describe the original, untrimmed frame. The packed crop and
    // trimOffset are applied here, once, for every asset family.
    function drawAsset(c,key,x,y,w,h){
      const {s,image}=sprite(key);
      const [sx,sy,sw,sh]=s.rect,[ow,oh]=s.sourceSize,[tx,ty]=s.trimOffset;
      c.drawImage(image,sx,sy,sw,sh,x+tx*w/ow,y+ty*h/oh,sw*w/ow,sh*h/oh);
      if(tracing)tracing.push({key,rect:[x,y,w,h],page:s.page,source:manifest.sourceFiles[key]});
    }
    function drawRect(c,key,rect){drawAsset(c,key,...rect)}
    function bodyHeight(y){
      const foot=(y+p.baseHeight*p.bibToFoot)/(1-p.heightPerFoot*p.bibToFoot);
      return clamp(p.baseHeight+p.heightPerFoot*foot,p.minHeight,p.maxHeight);
    }
    function roadAt(y){
      const c=scene.camera,ys=c.yControlPoints;
      const foot=clamp((y+p.baseHeight*p.bibToFoot)/(1-p.heightPerFoot*p.bibToFoot),ys[0],ys[ys.length-1]);
      let i=0;while(i<ys.length-2&&foot>ys[i+1])i++;
      const q=(foot-ys[i])/(ys[i+1]-ys[i]);
      return {left:mix(c.leftX[i],c.leftX[i+1],q),right:mix(c.rightX[i],c.rightX[i+1],q)};
    }
    function roadCenter(y){const r=roadAt(y);return (r.left+r.right)/2}
    function roadHalfWidth(y){const r=roadAt(y);return (r.right-r.left)/2}
    function runnerScale(r,y=r.y){
      return bodyHeight(y)/p.scaleUnit*clamp(r.look.height,...p.lookRange)*(1+Math.min(p.boostCap,(r.sizeBoost??r.successes)*p.boostStep));
    }
    function trafficFootprint(r,y=r.y,lane=r.lane){
      // Logical traffic is independent of sprite dimensions, atlas trimming,
      // frame count and art selection. Only a new scene geometry changes it.
      const h=runnerScale(r,y)*p.scaleUnit,x=ports.runnerXAt(r,y,lane);
      const [hw,top,bottom]=p.trafficBox;
      const left=Math.max(0,x-h*hw),right=Math.min(W,x+h*hw),a=Math.max(0,y-h*top),b=Math.min(H,y+h*bottom);
      return left<right&&a<b?{left,right,top:a,bottom:b}:null;
    }
    function visible(g,r){
      const [x,y,w,h]=traffic.visibleRect,px=g.runnerX(r),py=r.y+runnerVisualOffset(r);
      return px>=x&&px<=x+w&&py>=y&&py<=y+h;
    }
    function populate(g,numbers){
      const shuffle=a=>{const b=a.slice();for(let i=b.length-1;i>0;i--){const j=randInt(g.rng,0,i);[b[i],b[j]]=[b[j],b[i]]}return b};
      const cells=scene.traffic.startBands.flatMap(b=>shuffle(ports.LANES).slice(0,b.count).map((lane,i)=>({lane,y:b.y+i*b.step})));
      if(numbers.length===6&&traffic.removeCellForSix!=null)cells.splice(traffic.removeCellForSix,1);
      if(cells.length<numbers.length)throw Error('Not enough configured starting positions');
      for(const [i,n] of shuffle(numbers).entries()){
        const c=cells[i];g.runners.push(g.makeRunner(n,c.y+g.rand(-traffic.jitter,traffic.jitter),c.lane));
      }
    }
    function runnerArt(r){
      if(!cast.has(r)){
        const gender=r.look.genderPresentation;
        const pool=manifest.runners.filter(a=>gender===2||a.gender===(gender===0?'female':'male'));
        const choices=pool.length?pool:manifest.runners;
        cast.set(r,choices[Math.floor(Math.abs(r.seed*173.731))%choices.length]);
      }
      return Number.isInteger(r.artIndex)?manifest.runners[r.artIndex%manifest.runners.length]:cast.get(r);
    }
    function runnerFrame(g,r,forced){
      const art=runnerArt(r),s=state(g),receipt=s.receipts.get(r.id);
      if(forced)return frameAt(art.states[forced].frames,0);
      if(receipt&&g.sceneTime<=receipt.until)return frameAt(art.states.receive_supply.frames,(g.sceneTime-receipt.at)*1000);
      if(r.mood==='angry'&&r.moodTimer>0)return frameAt(art.states.pain.frames,0);
      if(r.feverCheerTimer>1.1)return frameAt(art.states.cheer.frames,0);
      if(r.cheerTimer>1.05)return frameAt(art.states.thanks.frames,0);
      return frameAt(art.frames,g.qaFixture||reducedMotion()?0:g.sceneTime*1000*clamp(r.speed/35,.8,2)+r.seed*113,true);
    }
    function runnerPose(g,r,forced){
      const frame=runnerFrame(g,r,forced),h=runnerScale(r)*p.scaleUnit,[sw,sh]=frame.sourceSize,s=h/sh;
      const [ax,ay]=frame.pivot,[bx,by,bw,bh]=frame.anchors.bib;
      const x=g.runnerX(r)-ax*s,y=r.y+runnerVisualOffset(r)-ay*s;
      return {frame,x,y,w:sw*s,h,s,bib:[x+bx*s,y+by*s,bw*s,bh*s]};
    }
    function drawRunner(g,r){
      const pose=runnerPose(g,r),receipt=state(g).receipts.get(r.id);
      if(receipt&&g.sceneTime<=receipt.until){
        const [x,y]=pose.frame.anchors.hand;
        supply(receipt.supply,pose.x+x*pose.s,pose.y+y*pose.s,Math.max(25,pose.h*.17),-.12,'flight');
      }
      drawAsset(ctx,pose.frame.image,pose.x,pose.y,pose.w,pose.h);
    }
    function rect(x,y,w,h,r,fill,stroke){
      ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));ctx.fillStyle=fill;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}
    }
    function drawBib(g,r){
      const [x,y,nw,nh]=runnerPose(g,r).bib,n=String(r.number),i=clamp(n.length-1,0,scene.bib.minimumWidth.length-1);
      const w=Math.max(scene.bib.minimumWidth[i],nw),h=Math.max(scene.bib.minimumHeight[i],nh);
      if(w>nw+.2||h>nh+.2)rect(x-w/2,y-h/2,w,h,Math.max(2,h*.09),'#fffdf6','#1e3051');
      fitLabel(n,x,y,Math.min(scene.bib.maxFont,h*.8),w-5,scene.uiText.ink,scene.bib.minFont);
    }
    function pickRunner(g,x,y){
      const pad=traffic.hitPadding,candidates=[];
      for(const r of g.runners){
        if(!visible(g,r))continue;
        const b=runnerPose(g,r);
        const [bx,by,bw,bh]=b.bib;
        const body=x>=b.x-pad&&x<=b.x+b.w+pad&&y>=b.y-pad&&y<=Math.min(H,b.y+b.h)+pad;
        const bib=x>=bx-Math.max(bw,scene.bib.minimumWidth[3])/2-pad&&x<=bx+Math.max(bw,scene.bib.minimumWidth[3])/2+pad&&
          y>=by-Math.max(bh,scene.bib.minimumHeight[3])/2-pad&&y<=by+Math.max(bh,scene.bib.minimumHeight[3])/2+pad;
        if(body||bib)candidates.push({id:r.id,d:Math.hypot(x-bx,y-by),depth:r.y});
      }
      candidates.sort((a,b)=>a.d-b.d||b.depth-a.depth);
      return candidates[0]?.id??null;
    }
    function pickSlot(x,y){
      const i=scene.slots.findIndex(({rect:[l,t,w,h]})=>x>=l&&x<=l+w&&y>=t&&y<=t+h);
      return i<0?null:i;
    }
    function supply(item,x,y,dim,rotation=0,placement='hand'){
      if(!item)return;
      const key=manifest.supplies[item.type]?.[placement];
      if(!key)throw Error('No declared physical item: '+item.type+'/'+placement);
      const [sw,sh]=pack.sprites[key].sourceSize,w=dim*sw/Math.max(sw,sh),h=dim*sh/Math.max(sw,sh);
      ctx.save();ctx.translate(x,y);ctx.rotate(rotation);drawAsset(ctx,key,-w/2,-h/2,w,h);ctx.restore();
    }
    function drawStation(g,layer){
      for(const f of manifest.station[mode(g)].layers)if(f.layer===layer)drawRect(ctx,f.image,f.rect);
    }
    function drawSlots(g){
      for(const [i,b] of scene.slots.entries()){
        const [x,y,w,h]=b.rect,item=g.supplies.queue[i];
        drawRect(ctx,manifest.ui.slot,b.rect);
        if(item){const [ix,iy,size]=b.icon;const [nx,ny,nw]=b.number;
          supply(item,x+w*ix,y+h*iy,h*size,0,'slot');
          fitLabel(String(item.number),x+w*nx,y+h*ny,b.fontSize,w*nw,scene.uiText.ink,21)
        }else{fitLabel('↻',x+w*b.number[0],y+h*b.number[1],28,w*b.number[2],scene.uiText.ink)}
      }
    }
    function staffArt(m){return manifest.staff[getStaff()+'-'+m]}
    function clip(art,name){return art.clips[name].map(id=>art.frames[id])}
    function elevation(g){return state(g).elevation}
    function staffContact(g){
      const a=scene.staff.ground,b=scene.staff.table,t=clamp(elevation(g),0,1);
      return {x:mix(a[0],b[0],t),y:mix(a[1],b[1],t)}
    }
    function poseFromFrame(g,frame){
      const contact=staffContact(g),[sw,sh]=frame.sourceSize,s=scene.staff.height/sh,[px,py]=frame.pivot;
      const x=contact.x-px*s,y=contact.y-py*s,[hx,hy]=frame.anchors.hand;
      return {frame,x,y,w:sw*s,h:sh*s,s,hand:{x:x+hx*s,y:y+hy*s},contact};
    }
    function throwVisual(g,t){
      let v=state(g).throws.get(t);
      if(!v){
        const m=elevation(g)>.03?'inferno':mode(g),frames=clip(staffArt(m),'throw');
        const i=frames.findIndex(f=>f.event==='release');
        v={mode:m,frames,release:frames[i],releaseAt:total(frames.slice(0,i))/1000,origin:null};
        state(g).throws.set(t,v);
      }
      return v;
    }
    function staffPose(g){
      const e=elevation(g),elevated=e>.03||g.inferno,art=staffArt(elevated?'inferno':mode(g));
      let frames=clip(art,'idle'),elapsed=0;
      if(g.throwing&&!g.throwing.hit){
        const v=throwVisual(g,g.throwing);frames=v.frames;elapsed=g.throwing.elapsed*1000;
      }else if(g.throwing?.hit){
        const seq=clip(art,'throw');frames=[seq[seq.length-1]];elapsed=0;
      }else if(elevated&&e<.999){
        frames=clip(art,g.inferno?'enter':'exit');
        elapsed=(g.inferno?e:1-e)*total(frames);
      }else if(g.swapCue){frames=clip(art,'swap');elapsed=g.swapCue.age*1000}
      if(g.qaFixture||reducedMotion()){
        // Reduced motion retains event-specific release/catch and contact
        // poses but omits in-between movement.
        if(g.throwing&&!g.throwing.hit){
          const v=throwVisual(g,g.throwing);frames=[g.throwing.elapsed<v.releaseAt?v.frames[0]:v.release];elapsed=0;
        }else if(!g.throwing){frames=clip(art,'idle');elapsed=0}
      }
      return poseFromFrame(g,frameAt(frames,elapsed));
    }
    function handPoint(g){return g?staffPose(g).hand:{x:scene.staff.ground[0],y:scene.staff.ground[1]}}
    function holding(g){
      return g.supplies.held&&(!g.throwing||g.throwing.hit||g.throwing.elapsed<throwVisual(g,g.throwing).releaseAt);
    }
    function drawStaff(g){
      const pose=staffPose(g);
      if(holding(g))supply(g.supplies.held,pose.hand.x,pose.hand.y,scene.staff.itemSize,0,'hand');
      drawAsset(ctx,pose.frame.image,pose.x,pose.y,pose.w,pose.h);
    }
    function drawNumberBubble(g){
      if(!holding(g))return;
      const hand=handPoint(g),b=scene.staff.bubble,[w,h]=b.size;
      const x=clamp(hand.x+b.offset[0]-w/2,...b.xRange),y=clamp(hand.y+b.offset[1],...b.yRange);
      drawAsset(ctx,manifest.ui.bubble,x,y,w,h);
      fitLabel(String(g.supplies.held.number),x+w*b.text[0],y+h*b.text[1],b.fontSize,w*.65,scene.uiText.ink,25);
    }
    function crowd(c,g,animated){
      const m=mode(g),road=scene.camera;
      for(const side of ['left','right']){
        c.save();c.beginPath();c.moveTo(side==='left'?0:W,road.yControlPoints[0]);
        for(let i=0;i<road.yControlPoints.length;i++){
          const x=side==='left'?Math.max(0,road.leftX[i]-scene.crowd.clipMargin.left):Math.min(W,road.rightX[i]+scene.crowd.clipMargin.right);
          c.lineTo(x,road.yControlPoints[i]);
        }
        c.lineTo(side==='left'?0:W,H);c.closePath();c.clip();
        for(const b of scene.crowd.placements.filter(a=>a.side===side)){
          const a=manifest.crowd[m+'/'+b.depth+'/'+side],moving=a.frames.length>1&&!reducedMotion()&&!g.qaFixture;
          if(moving!==animated)continue;
          const f=frameAt(a.frames,moving?g.sceneTime*1000:0,true);
          const [x,y,w,h]=b.rect;
          c.save();c.translate(x,y);c.transform(1,b.skew||0,0,1,0,0);
          drawAsset(c,f.image,0,0,w,h);c.restore();
        }
        c.restore();
      }
    }
    function staticScene(c,g){
      drawAsset(c,manifest.backgrounds[mode(g)],0,0,W,H);
      crowd(c,g,false);
      drawAsset(c,manifest.ambient[mode(g)+'/'+motion()],0,0,W,H);
    }
    function background(g){
      if(tracing){staticScene(ctx,g);crowd(ctx,g,true);return}
      const key=mode(g)+'/'+motion()+'/'+Boolean(g.qaFixture);
      if(!staticScenes.has(key)){
        const b=document.createElement('canvas');b.width=W;b.height=H;
        staticScene(b.getContext('2d'),g);staticScenes.set(key,b);
        // There are only three modes and two motion policies. Avoid keeping
        // separate full-frame QA caches after changing inspection state.
        if(staticScenes.size>6)staticScenes.delete(staticScenes.keys().next().value);
      }
      ctx.drawImage(staticScenes.get(key),0,0);crowd(ctx,g,true);
    }
    function fx(m,event,elapsed,x,y,w,h){
      const a=manifest.fx[m+'/'+event+'/'+motion()];
      if(!a||elapsed<0||elapsed>=total(a.frames))return;
      const f=frameAt(a.frames,elapsed),hh=h??w*a.canvas[1]/a.canvas[0];
      drawAsset(ctx,f.image,x-w/2,y-hh/2,w,hh);
    }
    function drawSwap(g){
      if(!g.swapCue)return;
      const hand=handPoint(g),[dx,dy]=scene.effects.swapOffset;
      fx(g.swapCue.mode,'swap',g.swapCue.age*1000,hand.x+dx,hand.y+dy,scene.effects.swapWidth);
    }
    function drawProjectile(g){
      const t=g.throwing;if(!t||t.hit)return;
      const v=throwVisual(g,t);
      if(t.elapsed<v.releaseAt)return;
      const r=g.runners.find(a=>a.id===t.runnerId);if(!r)return;
      if(!v.origin)v.origin=poseFromFrame(g,v.release).hand;
      const q=clamp((t.elapsed-v.releaseAt)/(throwTiming.hit-v.releaseAt),0,1),target=runnerPose(g,r,'receive_supply');
      const [hx,hy]=target.frame.anchors.hand,end={x:target.x+hx*target.s,y:target.y+hy*target.s};
      const x=mix(v.origin.x,end.x,q),y=mix(v.origin.y,end.y,q)-Math.sin(Math.PI*q)*scene.effects.throwArc[v.mode];
      fx(v.mode,'throw',(t.elapsed-v.releaseAt)*1000,x,y,90);
      supply(t.supply,x,y,scene.effects.projectileSize[v.mode],q*TAU*.85,'flight');
    }
    function drawImpact(g){
      for(const f of g.effects){
        const event={hitBurst:'receive',bonk:'miss',feverEntry:'mode_enter',feverEnd:'mode_exit'}[f.kind];
        if(!event)continue;
        fx(f.mode||mode(g),event,f.age*1000,f.x??W/2,f.y??H*.44,event.startsWith('mode_')?scene.effects.modeWidth:scene.effects.impactWidth+(f.tier||1)*15);
      }
    }
    function drawFeedback(g){
      const score=g.effects.filter(f=>f.kind==='score').at(-1);
      if(score){
        const [x,y]=scene.effects.scoreAnchor;
        const growth=scene.effects.scoreGrowth,level=clamp(Math.floor(g.combo/5),0,growth.length-1),w=scene.effects.scoreWidth*growth[level];
        fx(mode(g),'score',score.age*1000,x,y,w);
        roundedRect(x-61,y-17,122,34,13,'#fffdf0','#6c4b80',2);
        fitLabel(score.text,x,y,26,112,scene.uiText.ink,12);
      }
      for(const f of g.effects.filter(f=>f.kind==='athleteReaction')){
        const r=g.runners.find(a=>a.id===f.runnerId),[dx,dy]=scene.effects.reactionOffset;
        const x=clamp((r?g.runnerX(r):f.x)+dx,90,W-90),y=clamp((r?r.y+runnerVisualOffset(r):f.y)+dy,102,H-25);
        ctx.save();ctx.globalAlpha=clamp(1-f.age/f.life*.5,0,1);
        roundedRect(x-85,y-19,170,38,15,'#fffdf6','#786172',1.7);
        fitLabel(f.reaction.text,x,y,22,158,scene.uiText.ink,11);ctx.restore();
      }
    }
    function draw(g){
      if(!ready)return;
      const ratio=ports.getPixelRatio();
      ctx.setTransform(ratio,0,0,ratio,0,0);
      background(g);drawImpact(g);drawStation(g,'back');
      const runners=[...g.runners,...g.departing].sort((a,b)=>a.y-b.y);
      for(const r of runners)drawRunner(g,r);
      const onTable=elevation(g)>scene.staff.layerThreshold;
      drawSwap(g);
      if(!onTable)drawStaff(g);
      drawStation(g,'body');
      if(onTable)drawStaff(g);
      drawStation(g,'front');
      drawProjectile(g);drawFeedback(g);
      // Interactive numerals always sit above world FX.
      for(const r of runners)drawBib(g,r);
      drawSlots(g);drawNumberBubble(g);
      if(g.qaFixture){roundedRect(1030,94,229,35,9,'#32284de8','#f1d5f9',1.5);fitLabel(ports.tr('tokyo.qaActive'),1144,111,17,211,'#fff5ef')}
      if(g.phase==='countdown'||(g.phase==='playing'&&g.goFlash>0)){
        const text=g.phase==='countdown'?String(Math.max(1,Math.ceil(g.countdown/.5))):ports.tr('tokyo.go');
        roundedRect(W/2-74,H/2-51,148,102,22,'#fff8dc','#cb5d86',3);fitLabel(text,W/2,H/2,67,133,'#bd416d',22);
      }
      if(g.phase==='paused'){
        roundedRect(W/2-150,H/2-65,300,130,22,'#fff8e9','#52617a',3);
        fitLabel(ports.tr('tokyo.paused'),W/2,H/2-18,31,278,scene.uiText.ink);
        fitLabel(ports.tr('game.resumeAria'),W/2,H/2+29,23,275,'#bd416d');
      }
      if(g.phase==='celebrate'){
        if(!reducedMotion())for(const c of g.confetti){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(g.sceneTime*2+c.twist);ctx.fillStyle=c.color;ctx.fillRect(-c.size/2,-c.size/2,c.size,c.size*.65);ctx.restore()}
        roundedRect(W/2-175,103,350,52,15,'#fff7d8','#ac7a45',2);fitLabel(ports.tr('celebration.staffSuccess'),W/2,129,27,332,'#963b66');
      }
    }
    function update(g,dt){
      const s=state(g),target=g.inferno?1:0;
      s.elevation=reducedMotion()?target:ports.approach(s.elevation,target,dt*1000/(target?scene.staff.enterMs:scene.staff.exitMs));
      const t=g.throwing;
      if(t){
        const v=throwVisual(g,t);
        if(!t.hit&&t.elapsed>=v.releaseAt&&!v.origin)v.origin=poseFromFrame(g,v.release).hand;
        if(t.hit&&!v.receiptRecorded){
          v.receiptRecorded=true;
          const r=g.runners.find(a=>a.id===t.runnerId);
          if(r?.mood==='happy')s.receipts.set(r.id,{supply:t.supply,at:g.sceneTime,until:g.sceneTime+scene.timing.receiveMs/1000});
        }
      }
      for(const [id,r] of s.receipts)if(g.sceneTime>r.until)s.receipts.delete(id);
    }
    function trace(g){
      tracing=[];
      try{draw(g);return {mode:mode(g),assets:tracing,staff:staffPose(g),runners:g.runners.map(r=>({id:r.id,...runnerPose(g,r)}))}}
      finally{tracing=null}
    }
    return {loaded,ready:()=>ready,mode,imageURL,draw,update,populate,roadCenter,roadHalfWidth,runnerScale,trafficFootprint,visible,pickSlot,pickRunner,handPoint,
      throwStarted:(g,t)=>{throwVisual(g,t)},setElevation:(g,n)=>{state(g).elevation=n},staffContact,trace,
      slotRects:()=>scene.slots.map(({rect:[x,y,w,h]})=>({x,y,w,h})),
      frameAt};
  };
})(window);
