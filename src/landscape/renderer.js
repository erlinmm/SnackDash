/* Common landscape compositor. Art and choreography are pack data. */
(function(root){
  'use strict';
  const A=root.SnackDashAnimation;
  root.SnackDashCreateRenderer=function(ports,pack,getStaff){
    const {W,H,TAU,ctx,clamp,mix,randInt,runnerVisualOffset,reducedMotion,fitLabel,roundedRect,throwTiming}=ports;
    const manifest=pack.manifest,scene=manifest.scene,lib=manifest.clips,actors=manifest.actors;
    const p=scene.perspective,traffic=scene.traffic,order=scene.order;
    const pages=new Map(),sessions=new WeakMap(),cast=new WeakMap();
    let ready=false,tracing=null;
    const mode=g=>g.inferno?'inferno':g.fever?'fever':'normal';
    const motion=()=>reducedMotion()?'reduced':'normal';
    const now=g=>g.sceneTime*1000;
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
    function drawAsset(c,key,x,y,w,h){
      const s=pack.sprites[key];
      if(!s||!pages.has(s.page))throw Error('Missing decoded sprite: '+key);
      const [sx,sy,sw,sh]=s.rect,[ow,oh]=s.sourceSize,[tx,ty]=s.trimOffset;
      c.drawImage(pages.get(s.page),sx,sy,sw,sh,x+tx*w/ow,y+ty*h/oh,sw*w/ow,sh*h/oh);
      if(tracing)tracing.assets.push({key,rect:[x,y,w,h],page:s.page,source:manifest.sourceFiles[key]});
    }
    function bodyHeight(y){
      const foot=(y+p.baseHeight*p.bibToFoot)/(1-p.heightPerFoot*p.bibToFoot);
      return clamp(p.baseHeight+p.heightPerFoot*foot,p.minHeight,p.maxHeight);
    }
    function roadAt(y){
      const c=scene.camera,ys=c.yControlPoints;
      const foot=clamp((y+p.baseHeight*p.bibToFoot)/(1-p.heightPerFoot*p.bibToFoot),ys[0],ys.at(-1));
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
      const cells=traffic.startBands.flatMap(b=>shuffle(ports.LANES).slice(0,b.count).map((lane,i)=>({lane,y:b.y+i*b.step})));
      if(numbers.length===6&&traffic.removeCellForSix!=null)cells.splice(traffic.removeCellForSix,1);
      if(cells.length<numbers.length)throw Error('Not enough configured starting positions');
      for(const [i,n] of shuffle(numbers).entries()){
        const c=cells[i];g.runners.push(g.makeRunner(n,c.y+g.rand(-traffic.jitter,traffic.jitter),c.lane));
      }
    }
    function nodeDefaults(n,m){
      const [x,y,w,h]=n.rect;
      return {position:[x+w/2,y+h/2],rotation:0,scale:1,opacity:1,visible:true,reveal:1,skinMode:null,attach:null,
        ...A.clone(n.state||{}),...A.clone(n.modeState?.[m]||{})};
    }
    function initialView(m){
      const v={staff:{...A.clone(manifest.world.staffState),...A.clone(manifest.world.staffModeState[m])}};
      for(const n of manifest.world.nodes)v[n.id]=nodeDefaults(n,m);
      return v;
    }
    function reset(g,m=mode(g)){
      const s={view:initialView(m),players:new WeakMap(),crowds:new Map(),
        staff:new A.ActorPlayer(lib,actors.staff[getStaff()],'idle','staff/'+getStaff()),
        effects:[],reactions:[],events:[],throws:new WeakMap(),transition:null,transitionId:null,desired:m,settled:m,transitionTo:null};
      for(const c of actors.crowds)s.crowds.set(c.id,new A.ActorPlayer(lib,c,'idle',c.id));
      sessions.set(g,s);return s;
    }
    function state(g){return sessions.get(g)||reset(g)}
    function runnerArt(r){
      if(Number.isInteger(r.artIndex))return actors.runners[r.artIndex%actors.runners.length];
      if(!cast.has(r)){
        const gender=r.look.genderPresentation;
        const pool=actors.runners.filter(a=>gender===2||a.gender===(gender===0?'female':'male'));
        const choices=pool.length?pool:actors.runners;
        cast.set(r,choices[Math.floor(Math.abs(r.seed*173.731))%choices.length]);
      }
      return cast.get(r);
    }
    function runnerPlayer(g,r){
      const s=state(g),set=runnerArt(r);
      if(!s.players.has(r)||s.players.get(r).set!==set)s.players.set(r,new A.ActorPlayer(lib,set,'run',r.id+'/'+r.seed));
      return s.players.get(r);
    }
    function runnerPose(g,r,forced=null,forcedMode=mode(g)){
      const player=runnerPlayer(g,r);
      const selected=forced?player.select(forcedMode,forced,'target',motion()):player.pose(mode(g),now(g),{
        motion:motion(),freeze:g.qaFixture||reducedMotion(),rate:clamp(r.speed/35,.8,2),phase:r.seed*113
      });
      const f=forced?A.sample(selected.clip,0).frame:selected.frame,h=runnerScale(r)*p.scaleUnit,[sw,sh]=f.sourceSize,s=h/sh;
      const [ax,ay]=f.pivot,[bx,by,bw,bh]=f.anchors.bib;
      const x=g.runnerX(r)-ax*s,y=r.y+runnerVisualOffset(r)-ay*s;
      return {frame:f,clip:selected.id,action:selected.action,animationMode:selected.mode,index:selected.index??0,payload:selected.payload,
        attachItem:!forced&&selected.clip.attachItem,x,y,w:sw*s,h,s,bib:[x+bx*s,y+by*s,bw*s,bh*s]};
    }
    function anchor(pose,name){
      const a=pose.frame.anchors[name];
      if(!a)throw Error('Missing anchor '+name+' in '+pose.frame.image);
      return {x:pose.x+a[0]*pose.s,y:pose.y+a[1]*pose.s};
    }
    function rect(x,y,w,h,r,fill,stroke){
      ctx.beginPath();ctx.roundRect(x,y,w,h,Math.min(r,w/2,h/2));ctx.fillStyle=fill;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}
    }
    function bibSize(r,pose){
      const n=String(r.number),i=clamp(n.length-1,0,scene.bib.minimumWidth.length-1),[, ,nw,nh]=pose.bib;
      return {n,w:Math.max(scene.bib.minimumWidth[i],nw),h:Math.max(scene.bib.minimumHeight[i],nh)};
    }
    function drawBib(r,pose){
      const [x,y,nw,nh]=pose.bib,{n,w,h}=bibSize(r,pose);
      if(w>nw+.2||h>nh+.2)rect(x-w/2,y-h/2,w,h,Math.max(2,h*.09),scene.bib.background||'#fffdf6',scene.bib.border||'#1e3051');
      fitLabel(n,x,y,Math.min(scene.bib.maxFont,h*.8),w-5,scene.uiText.ink,scene.bib.minFont);
    }
    function pickRunner(g,x,y){
      const pad=traffic.hitPadding,candidates=[];
      for(const r of g.runners){
        if(!visible(g,r))continue;
        const b=runnerPose(g,r),[bx,by]=b.bib,{w:bw,h:bh}=bibSize(r,b);
        const body=x>=b.x-pad&&x<=b.x+b.w+pad&&y>=b.y-pad&&y<=Math.min(H,b.y+b.h)+pad;
        const bib=x>=bx-bw/2-pad&&x<=bx+bw/2+pad&&y>=by-bh/2-pad&&y<=by+bh/2+pad;
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
    function drawRunner(g,r,pose){
      if(pose.attachItem&&pose.payload?.item){
        const a=anchor(pose,pose.attachItem);
        supply(pose.payload.item,a.x,a.y,Math.max(25,pose.h*.17),0,'flight');
      }
      drawAsset(ctx,pose.frame.image,pose.x,pose.y,pose.w,pose.h);
    }
    function drawSlots(g){
      for(const [i,b] of scene.slots.entries()){
        const [x,y,w,h]=b.rect,item=g.supplies.queue[i];
        drawAsset(ctx,manifest.ui.slot,x,y,w,h);
        if(item){
          const [ix,iy,size]=b.icon,[nx,ny,nw]=b.number;
          supply(item,x+w*ix,y+h*iy,h*size,0,'slot');
          fitLabel(String(item.number),x+w*nx,y+h*ny,b.fontSize,w*nw,scene.uiText.ink,21);
        }else fitLabel('↻',x+w*b.number[0],y+h*b.number[1],28,w*b.number[2],scene.uiText.ink);
      }
    }
    function staffContact(g){
      const v=state(g).view.staff,a=scene.staff.ground,b=scene.staff.table,t=clamp(v.elevation,0,1),o=v.offset||[0,0];
      return {x:mix(a[0],b[0],t)+o[0],y:mix(a[1],b[1],t)+o[1]};
    }
    function staffPoseFrom(g,selected){
      const f=selected.frame,contact=staffContact(g),[sw,sh]=f.sourceSize,s=scene.staff.height/sh,[px,py]=f.pivot;
      const pose={frame:f,clip:selected.id,action:selected.action,animationMode:selected.mode,index:selected.index??0,
        x:contact.x-px*s,y:contact.y-py*s,w:sw*s,h:sh*s,s,contact};
      pose.hand=anchor(pose,'hand');return pose;
    }
    function throwVisual(g,t){
      const s=state(g);
      let v=s.throws.get(t);
      if(!v){
        const chosen=s.staff.select(s.view.staff.costume,'throw','throw/'+t.runnerId+'/'+now(g),motion());
        const length=A.duration(chosen.clip),scale=throwTiming.recovery*1000/length;
        const releaseAt=A.markerTime(chosen.clip,'release')*scale/1000;
        if(releaseAt>=throwTiming.hit)throw Error('Release marker follows gameplay hit');
        v={...chosen,scale,releaseAt,origin:null,released:false,logicalMode:mode(g)};
        s.throws.set(t,v);
      }
      return v;
    }
    function staffPose(g){
      const s=state(g),m=s.view.staff.costume;
      if(g.throwing){
        const v=throwVisual(g,g.throwing),elapsed=g.throwing.elapsed*1000/v.scale;
        return staffPoseFrom(g,{...v,...A.sample(v.clip,elapsed,false)});
      }
      const selected=s.staff.active?s.staff.pose(m,now(g),{motion:motion()}):
        s.transition?.pose('staff')||s.staff.pose(m,now(g),{motion:motion(),freeze:g.qaFixture||reducedMotion()});
      return staffPoseFrom(g,selected);
    }
    function handPoint(g){return g?staffPose(g).hand:{x:scene.staff.ground[0],y:scene.staff.ground[1]}}
    function holding(g){
      return g.supplies.held&&(!g.throwing||g.throwing.hit||g.throwing.elapsed<throwVisual(g,g.throwing).releaseAt);
    }
    function drawStaff(g,pose){
      if(holding(g))supply(g.supplies.held,pose.hand.x,pose.hand.y,scene.staff.itemSize,0,'hand');
      drawAsset(ctx,pose.frame.image,pose.x,pose.y,pose.w,pose.h);
    }
    function drawNumberBubble(g,pose){
      if(!holding(g))return;
      const hand=pose.hand,b=scene.staff.bubble,[w,h]=b.size;
      const x=clamp(hand.x+b.offset[0]-w/2,...b.xRange),y=clamp(hand.y+b.offset[1],...b.yRange);
      drawAsset(ctx,manifest.ui.bubble,x,y,w,h);
      fitLabel(String(g.supplies.held.number),x+w*b.text[0],y+h*b.text[1],b.fontSize,w*.65,scene.uiText.ink,25);
    }
    function crowdPose(g,c){
      return state(g).crowds.get(c.id).pose(mode(g),now(g),{motion:motion(),freeze:g.qaFixture||reducedMotion(),phase:A.hash(c.id)%500});
    }
    function drawCrowd(g,c,pose){
      const road=scene.camera,side=c.side;
      ctx.save();
      if(side==='left'||side==='right'){
        ctx.beginPath();ctx.moveTo(side==='left'?0:W,road.yControlPoints[0]);
        for(let i=0;i<road.yControlPoints.length;i++){
          const x=side==='left'?Math.max(0,road.leftX[i]-scene.crowd.clipMargin.left):Math.min(W,road.rightX[i]+scene.crowd.clipMargin.right);
          ctx.lineTo(x,road.yControlPoints[i]);
        }
        ctx.lineTo(side==='left'?0:W,H);ctx.closePath();ctx.clip();
      }
      const [x,y,w,h]=c.rect;
      ctx.translate(x,y);ctx.transform(1,c.skew||0,0,1,0,0);drawAsset(ctx,pose.frame.image,0,0,w,h);ctx.restore();
    }
    function modeRef(mapping,m){
      const value=mapping?.[m];
      return value&&typeof value==='object'?value[motion()]:value;
    }
    function nodePose(g,node,staff){
      const s=state(g),v=s.view[node.id],m=v.skinMode||mode(g);
      if(!v.visible||v.opacity<=0||v.reveal<=0)return null;
      let image=modeRef(node.images,m);
      let selected=s.transition?.pose(node.id);
      if(!selected&&node.clips){
        const id=modeRef(node.clips,m);
        if(id)selected={id,clip:lib[id],...A.sample(lib[id],g.qaFixture||reducedMotion()?0:now(g))};
      }
      if(selected)image=selected.frame.image;
      if(!image)throw Error('Missing object artwork: '+node.id+'/'+m);
      let [x,y]=v.position;
      if(v.attach){
        let a;
        if(v.attach.target==='staff')a=anchor(staff,v.attach.anchor);
        else{const o=s.view[v.attach.target];a={x:o.position[0],y:o.position[1]}}
        x=a.x+(v.attach.offset?.[0]||0);y=a.y+(v.attach.offset?.[1]||0);
      }
      const w=node.rect[2]*v.scale,h=node.rect[3]*v.scale;
      return {key:image,x,y,w,h,z:(v.attach?node.attachedZ??order.staffTable+.5:node.z),state:v,clip:selected?.id,index:selected?.index};
    }
    function drawNode(node,pose){
      const v=pose.state;
      ctx.save();ctx.globalAlpha=v.opacity;ctx.translate(pose.x,pose.y);ctx.rotate(v.rotation*Math.PI/180);
      if(node.revealRect&&v.reveal<1){
        const [x,y,w,h]=node.revealRect;
        const k=v.scale;ctx.beginPath();ctx.rect((x-node.rect[0]-node.rect[2]/2)*k,(y-node.rect[1]-node.rect[3]/2)*k,w*k,h*k*v.reveal);ctx.clip();
      }
      drawAsset(ctx,pose.key,-pose.w/2,-pose.h/2,pose.w,pose.h);ctx.restore();
      if(tracing)tracing.nodes.push({id:node.id,key:pose.key,position:[pose.x,pose.y],clip:pose.clip,index:pose.index,rotation:v.rotation,reveal:v.reveal});
    }
    function projectile(g){
      const t=g.throwing;
      if(!t||t.hit)return null;
      const v=throwVisual(g,t);
      if(t.elapsed<v.releaseAt)return null;
      const r=g.runners.find(a=>a.id===t.runnerId);if(!r)return null;
      const f=A.sample(v.clip,v.releaseAt*1000/v.scale,false).frame;
      const start=v.origin||staffPoseFrom(g,{...v,frame:f}).hand;
      const q=clamp((t.elapsed-v.releaseAt)/(throwTiming.hit-v.releaseAt),0,1);
      const end=anchor(runnerPose(g,r,'receive_supply',v.logicalMode),'hand');
      const path=scene.projectile[v.logicalMode];
      return {x:mix(start.x,end.x,q),y:mix(start.y,end.y,q)-Math.sin(Math.PI*q)*path.arc,
        size:path.size,rotation:q*TAU*path.turns,item:t.supply};
    }
    function effectAnchor(g,e,staff,projectilePose){
      const a=e.spec.anchor;
      let point;
      if(a.type==='screen')point={x:a.position[0],y:a.position[1]};
      else if(a.type==='projectile')point=projectilePose;
      else if(a.type.startsWith('staff.'))point=anchor(staff,a.type.split('.')[1]);
      else if(a.type.startsWith('runner.')){
        const r=g.runners.find(r=>r.id===e.event.runnerId)||g.departing.find(r=>r.id===e.event.runnerId);
        if(r)point=anchor(runnerPose(g,r),a.type.split('.')[1]);
      }else if(a.type==='hud.binding'||a.type==='hud.score')point=ports.hudAnchor?.(a.binding||'score.current');
      else if(a.type==='object'){
        const o=state(g).view[a.target];if(o)point={x:o.position[0],y:o.position[1]};
      }
      if(!point)return e.lastPoint;
      const out={x:point.x+(a.offset?.[0]||0),y:point.y+(a.offset?.[1]||0)};
      if(e.spec.follow===false&&e.lastPoint)return e.lastPoint;
      e.lastPoint=out;return out;
    }
    function enqueueEffects(g,event){
      const s=state(g);
      for(const spec of manifest.fx.bindings){
        if(!A.matches(spec,event,s.view.staff.costume))continue;
        const m=A.eventMode(spec,event,s.view.staff.costume),id=modeRef(spec.clips,m),clip=lib[id];
        if(!clip)throw Error('Missing effect clip '+id);
        const length=spec.durationMs??A.duration(clip)/(spec.speed||1);
        s.effects.push({spec,id,clip,mode:m,event,start:now(g),length,lastPoint:null});
      }
    }
    function drawEffect(g,e,staff,projectilePose){
      const elapsed=now(g)-e.start;
      if(elapsed<0||elapsed>=e.length)return;
      if(e.spec.anchor.type==='projectile'&&!projectilePose)return;
      const point=effectAnchor(g,e,staff,projectilePose);if(!point)return;
      const pose=A.sample(e.clip,e.spec.fitDuration?elapsed/e.length*A.duration(e.clip):elapsed*(e.spec.speed||1),e.clip.playback==='loop');
      const w=e.spec.width*A.strength(e.spec.scaleBy,e.event),h=e.spec.height??w*e.clip.size[1]/e.clip.size[0];
      ctx.save();ctx.globalAlpha=e.spec.opacity??1;
      drawAsset(ctx,pose.frame.image,point.x-w/2,point.y-h/2,w,h);ctx.restore();
      if(e.spec.label&&e.event.delta!=null){
        const l=e.spec.label,n=e.event.delta;
        fitLabel(n>0?'+'+n:String(n),point.x+(l.offset?.[0]||0),point.y+(l.offset?.[1]||0),l.fontSize,l.width,l.color,l.minFont);
      }
      if(tracing)tracing.effects.push({id:e.spec.id,mode:e.mode,clip:e.id,frame:pose.index,event:e.event.type,point});
    }
    function drawReaction(g,e){
      const r=g.runners.find(r=>r.id===e.runnerId)||g.departing.find(r=>r.id===e.runnerId);
      if(!r)return;
      const c=scene.reaction,a=anchor(runnerPose(g,r),'head'),x=clamp(a.x+c.offset[0],c.width/2,W-c.width/2),y=clamp(a.y+c.offset[1],c.height/2,H-c.height/2);
      ctx.save();ctx.globalAlpha=clamp(1-(now(g)-e.start)/c.durationMs*.5,0,1);
      roundedRect(x-c.width/2,y-c.height/2,c.width,c.height,c.radius,c.background,c.border,1.5);
      fitLabel(e.text,x,y,c.fontSize,c.width-12,c.color,c.minFont);ctx.restore();
    }
    function record(s,e){
      s.events.push(A.clone(e));
      if(s.events.length>256)s.events.splice(0,s.events.length-256);
    }
    function publishVisual(g,event){
      const s=state(g),e={modeBefore:mode(g),modeAfter:mode(g),combo:g.combo,at:now(g),...event};
      record(s,e);enqueueEffects(g,e);ports.visualEvent?.(g,e);
    }
    function release(g,t){
      const v=throwVisual(g,t);
      if(v.released)return;
      v.released=true;
      const selected={...v,...A.sample(v.clip,A.markerTime(v.clip,'release'),false)};
      v.origin=staffPoseFrom(g,selected).hand;
      publishVisual(g,{type:'throw.release',runnerId:t.runnerId,item:{...t.supply},modeBefore:v.logicalMode,modeAfter:v.logicalMode,origin:v.origin});
    }
    function route(from,to){
      if(from===to)return null;
      const queue=[[from,[]]],seen=new Set([from]);
      while(queue.length){
        const [m,path]=queue.shift();
        for(const id of Object.keys(manifest.transitions)){
          const [a,b]=id.split('>');
          if(a!==m||seen.has(b))continue;
          const next=[...path,id];if(b===to)return next[0];
          seen.add(b);queue.push([b,next]);
        }
      }
      throw Error('No transition route from '+from+' to '+to);
    }
    function beginTransition(g,id){
      const s=state(g),[from,to]=id.split('>'),spec=manifest.transitions[id];
      s.transitionId=id;s.transitionTo=to;
      const controlled=new Set(spec.tracks.map(t=>t.target));
      for(const n of manifest.world.nodes)if(!controlled.has(n.id))s.view[n.id]=nodeDefaults(n,to);
      const resolveTrack=t=>{
        if(t.clip)return {id:t.clip,clip:lib[t.clip]};
        if(t.target==='staff')return s.staff.select(t.mode,t.action,'transition/'+id+'/'+t.id,motion());
        const player=s.crowds.get(t.target);
        if(player)return player.select(t.mode,t.action,'transition/'+id+'/'+t.id,motion());
        throw Error('Unresolved actor track '+t.target);
      };
      publishVisual(g,{type:'transition.start',transition:id,from,to,modeBefore:from,modeAfter:to});
      s.transition=new A.Timeline(spec,resolveTrack,s.view,e=>{
        publishVisual(g,{...e,transition:id,from,to,modeBefore:from,modeAfter:to,
          contact:staffContact(g),elevation:s.view.staff.elevation,costume:s.view.staff.costume,
          props:Object.fromEntries(manifest.world.nodes.filter(n=>n.role==='decorative').map(n=>[n.id,A.clone(s.view[n.id])]))});
      },(target,attachment)=>{
        if(attachment.target==='staff'){
          const point=anchor(staffPose(g),attachment.anchor);
          return [point.x+(attachment.offset?.[0]||0),point.y+(attachment.offset?.[1]||0)];
        }
        return s.view[attachment.target]?.position;
      });
    }
    function requestTransition(g,event){
      const s=state(g);s.desired=event.to;
      if(s.transition&&!s.transition.done){
        // Coalesce rapid changes. Entry transitions can declare an explicit
        // recovery route; recovery starts from the actual current transforms.
        const recovery=manifest.transitions[s.transitionId].interruptions?.[s.desired];
        if(recovery&&s.transitionTo!==s.desired){
          publishVisual(g,{type:'transition.cancel',transition:s.transitionId,to:s.desired});
          s.transition.cancel();beginTransition(g,recovery);
        }
        return;
      }
      const id=route(s.settled,s.desired);
      if(id)beginTransition(g,id);
    }
    function event(g,e){
      const s=state(g);
      if(e.type==='throw.start'&&g.throwing)throwVisual(g,g.throwing);
      if((e.type==='hit'||e.type==='miss')&&g.throwing)release(g,g.throwing);
      record(s,e);
      for(const r of g.runners)if(e.runnerId===r.id||e.type==='mode.change'){
        runnerPlayer(g,r).trigger(manifest.bindings.runner,e,now(g),s.view.staff.costume,motion());
      }
      s.staff.trigger(manifest.bindings.staff,e,now(g),s.view.staff.costume,motion());
      for(const c of actors.crowds)s.crowds.get(c.id).trigger(manifest.bindings.crowd,e,now(g),s.view.staff.costume,motion());
      if(e.type==='mode.change')requestTransition(g,e);
      if(e.type==='runner.reaction'){
        s.reactions=s.reactions.filter(x=>x.runnerId!==e.runnerId);
        s.reactions.push({...e,start:now(g)});
      }
      enqueueEffects(g,e);
      ports.visualEvent?.(g,e);
    }
    function update(g,dt){
      const s=state(g),t=g.throwing;
      if(t&&t.elapsed>=throwVisual(g,t).releaseAt)release(g,t);
      const emitFor=target=>e=>publishVisual(g,{type:'marker',target,marker:e.name,clip:e.clip,frame:e.index,modeBefore:e.mode,modeAfter:e.mode});
      s.staff.update(now(g),emitFor('staff'));
      for(const r of [...g.runners,...g.departing])runnerPlayer(g,r).update(now(g),emitFor('runner/'+r.id));
      for(const c of actors.crowds)s.crowds.get(c.id).update(now(g),emitFor(c.id));
      if(s.transition&&!s.transition.done&&!g.throwing&&!s.staff.active){
        s.transition.advance(dt*1000);
        if(s.transition.done){
          // Terminal reconciliation is a safety net for interrupted tracks,
          // never a mutation of logical supplies or game outcomes.
          const final=initialView(s.transitionTo);
          for(const [id,value] of Object.entries(final))Object.assign(s.view[id],value);
          s.settled=s.transitionTo;
          publishVisual(g,{type:'transition.complete',transition:s.transitionId,to:s.settled});
          const next=route(s.settled,s.desired);
          if(next)beginTransition(g,next);
        }
      }
      s.effects=s.effects.filter(x=>now(g)-x.start<x.length);
      s.reactions=s.reactions.filter(x=>now(g)-x.start<scene.reaction.durationMs);
    }
    function draw(g){
      if(!ready)return;
      const ratio=ports.getPixelRatio();
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,W,H);
      const s=state(g),staff=staffPose(g),shot=projectile(g),queue=[];
      const add=(z,fn)=>queue.push({z,fn});
      const runnerPoses=[...g.runners,...g.departing].map(r=>({r,pose:runnerPose(g,r)}));
      const crowdPoses=actors.crowds.map(c=>({c,pose:crowdPose(g,c)}));
      for(const n of manifest.world.nodes){
        const pose=nodePose(g,n,staff);if(pose)add(pose.z,()=>drawNode(n,pose));
      }
      for(const {c,pose} of crowdPoses)add(c.z,()=>drawCrowd(g,c,pose));
      for(const {r,pose} of runnerPoses){
        add(order.runner+r.y/H,()=>drawRunner(g,r,pose));
        add(order.bib+r.y/H,()=>drawBib(r,pose));
      }
      add(s.view.staff.elevation>scene.staff.layerThreshold?order.staffTable:order.staffGround,()=>drawStaff(g,staff));
      if(shot)add(order.projectile??100,()=>supply(shot.item,shot.x,shot.y,shot.size,shot.rotation,'flight'));
      for(const e of s.effects)add(e.spec.z,()=>drawEffect(g,e,staff,shot));
      for(const e of s.reactions)add(order.feedback,()=>drawReaction(g,e));
      add(order.slots,()=>drawSlots(g));add(order.bubble,()=>drawNumberBubble(g,staff));
      queue.sort((a,b)=>a.z-b.z);
      for(const q of queue)q.fn();
      if(tracing){
        tracing.staff=staff;
        tracing.runners=runnerPoses.filter(x=>g.runners.includes(x.r)).map(({r,pose})=>({id:r.id,...pose}));
        tracing.crowds=crowdPoses.map(({c,pose})=>({id:c.id,clip:pose.id,action:pose.action,mode:pose.mode,index:pose.index,frame:pose.frame}));
        tracing.objects=A.clone(s.view);tracing.events=A.clone(s.events);
        tracing.transition=s.transition?{id:s.transitionId,time:s.transition.time,length:s.transition.schedule.length,done:s.transition.done}:null;
      }
    }
    function trace(g){
      tracing={mode:mode(g),assets:[],effects:[],nodes:[]};
      try{draw(g);return tracing}
      finally{tracing=null}
    }
    return {loaded,ready:()=>ready,mode,imageURL,drawAsset,draw,update,event,reset,populate,roadCenter,roadHalfWidth,runnerScale,trafficFootprint,visible,pickSlot,pickRunner,handPoint,staffContact,trace,
      slotRects:()=>scene.slots.map(({rect:[x,y,w,h]})=>({x,y,w,h}))};
  };
})(window);
