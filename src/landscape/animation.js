/* Shared deterministic animation and multi-object timeline primitives.
 * No DOM, Canvas, gameplay RNG, city names or art-specific action rules.
 */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SnackDashAnimation=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const duration=clip=>clip.frames.reduce((sum,f)=>sum+f.durationMs,0);
  function marks(clip){
    const result=[];let t=0;
    for(const [index,frame] of clip.frames.entries()){
      for(const name of frame.marks||[])result.push({name,time:t,index});
      t+=frame.durationMs;
    }
    return result;
  }
  function markerTime(clip,name){
    const found=marks(clip).filter(m=>m.name===name);
    if(found.length!==1)throw Error('Expected one marker '+name);
    return found[0].time;
  }
  function sample(clip,elapsed,loop=clip.playback==='loop'){
    const total=duration(clip);
    if(!total)throw Error('Empty animation');
    const t=loop?((elapsed%total)+total)%total:clamp(elapsed,0,total-.00001);
    let remaining=t;
    for(const [index,frame] of clip.frames.entries()){
      if(remaining<frame.durationMs)return {frame,index,elapsed:t};
      remaining-=frame.durationMs;
    }
    return {frame:clip.frames.at(-1),index:clip.frames.length-1,elapsed:t};
  }
  function hash(s){
    let h=2166136261;
    for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function resolve(library,set,mode,action,seed='',motion='normal'){
    let ref=set.modes[mode]?.[action];
    if(ref&&typeof ref==='object'&&!Array.isArray(ref))ref=ref[motion];
    if(Array.isArray(ref))ref=ref[hash(seed)%ref.length];
    if(typeof ref!=='string'||!library[ref])throw Error('Missing animation '+set.id+'/'+mode+'/'+action);
    return {id:ref,clip:library[ref],mode,action};
  }
  function eventMode(rule,event,visualMode){
    return rule.mode==='before'?event.modeBefore:rule.mode==='visual'?visualMode:event.modeAfter;
  }
  function matches(rule,event,visualMode){
    if(rule.event!==event.type)return false;
    if(rule.modes&&!rule.modes.includes(eventMode(rule,event,visualMode)))return false;
    if(rule.minCombo!=null&&(event.combo??0)<rule.minCombo)return false;
    if(rule.minDelta!=null&&(event.delta??0)<rule.minDelta)return false;
    for(const [key,value] of Object.entries(rule.when||{})){
      if(Array.isArray(value)?!value.includes(event[key]):value!==event[key])return false;
    }
    return true;
  }
  function strength(rules,event,key='scale',initial=1){
    let value=initial;
    for(const r of rules||[]){
      if((r.minCombo==null||(event.combo??0)>=r.minCombo)&&(r.minDelta==null||(event.delta??0)>=r.minDelta))value=r[key]??value;
    }
    return value;
  }
  class ActorPlayer {
    constructor(library,set,base,seed){
      this.library=library;this.set=set;this.base=base;this.seed=String(seed);
      this.serial=0;this.active=null;this.baseMode=null;this.baseAt=0;
    }
    select(mode,action,token='',motion='normal'){
      return resolve(this.library,this.set,mode,action,this.seed+'/'+token,motion);
    }
    start(action,mode,now,payload={},options={}){
      const priority=options.priority??0,interrupt=options.interrupt??'higher';
      if(this.active){
        const old=this.active;
        if(old.interrupt==='never'||(old.interrupt==='higher'&&priority<old.priority))return false;
      }
      const selected=this.select(mode,action,++this.serial,options.motion||'normal');
      this.active={...selected,start:now,last:-.00001,payload,priority,interrupt,repeat:options.repeat??selected.clip.repeat??1,motion:options.motion||'normal'};
      return true;
    }
    trigger(rules,event,now,visualMode,motion='normal'){
      for(const rule of rules||[]){
        if(matches(rule,event,visualMode))this.start(rule.action,eventMode(rule,event,visualMode),now,event,{...rule,motion});
      }
    }
    update(now,emit=()=>{}){
      // One-shot chains preserve original payload, mode and exact end times.
      // Bounded to detect malformed zero-time chains.
      for(let guard=0;this.active&&guard<32;guard++){
        const a=this.active,one=duration(a.clip);
        const loop=a.clip.playback==='loop',length=loop?(a.repeat===0?Infinity:one*a.repeat):one;
        const elapsed=Math.max(0,now-a.start),limit=Math.min(elapsed,length);
        const cycleEnd=Math.floor(Math.max(0,limit-.00001)/one);
        const cycleStart=Math.max(0,Math.floor(Math.max(0,a.last)/one));
        for(let n=cycleStart;n<=cycleEnd;n++){
          for(const m of marks(a.clip)){
            const at=m.time+n*one;
            if(at>a.last&&at<=limit&&at<length)emit({...m,clip:a.id,action:a.action,mode:a.mode,payload:a.payload});
          }
        }
        a.last=limit;
        if(elapsed<length||a.clip.playback==='hold')break;
        this.active=null;
        const next=a.clip.next;
        if(next&&next!==this.base){
          this.start(next,a.mode,a.start+length,a.payload,{priority:a.priority,interrupt:a.interrupt,motion:a.motion});
        }else break;
      }
    }
    pose(mode,now,options={}){
      const a=this.active;
      if(a){
        const t=now-a.start,loop=a.clip.playback==='loop'&&(a.repeat===0||t<duration(a.clip)*a.repeat);
        return {...a,...sample(a.clip,t,loop)};
      }
      if(this.baseMode!==mode){this.baseMode=mode;this.baseAt=now}
      const selected=this.select(mode,this.base,'base',options.motion||'normal');
      const elapsed=options.freeze?0:((now-this.baseAt)*(options.rate??1)+(options.phase??0));
      return {...selected,...sample(selected.clip,elapsed)};
    }
  }

  function refTime(ref,records){
    if(typeof ref==='number'&&Number.isFinite(ref))return ref;
    const prior=records.get(ref?.track);
    if(!prior)throw Error('Timeline reference must name an earlier track: '+JSON.stringify(ref));
    let t;
    if(ref.marker){
      if(!prior.clip)throw Error('Marker reference is not a clip: '+ref.track);
      t=prior.start+markerTime(prior.clip,ref.marker)*prior.scale;
    }else if(ref.point==='end')t=prior.end;
    else if(!ref.point||ref.point==='start')t=prior.start;
    else throw Error('Unknown time reference');
    return t+(ref.offsetMs||0);
  }
  function compileTimeline(spec,resolveTrack){
    const records=new Map(),boundaries=[];
    function boundary(time,index,kind,record,marker){
      boundaries.push({time,index,kind,record,marker});
    }
    for(const [index,t] of spec.tracks.entries()){
      if(records.has(t.id))throw Error('Duplicate timeline track '+t.id);
      const start=refTime(t.start??0,records);
      const clip=t.type==='clip'?resolveTrack(t):null;
      const natural=clip?duration(clip.clip):0;
      const length=t.end!=null?refTime(t.end,records)-start:(t.durationMs??natural);
      if(!Number.isFinite(start)||start<0||!Number.isFinite(length)||length<0||((t.type==='clip'||t.type==='tween')&&length<=0))
        throw Error('Invalid timeline timing '+t.id);
      const record={...t,start,end:start+length,length,index,clip:clip?.clip,clipId:clip?.id,scale:clip?length/natural:1};
      records.set(t.id,record);
      boundary(start,index,'start',record);
      if(clip)for(const m of marks(clip.clip))boundary(start+m.time*record.scale,index,'mark',record,m);
      if(length>0)boundary(start+length,index,'end',record);
    }
    // Earlier declared tracks own earlier same-time markers. Continuous
    // tracks are evaluated at the boundary before markers are dispatched.
    const order={start:0,mark:1,end:2};
    boundaries.sort((a,b)=>a.time-b.time||a.index-b.index||order[a.kind]-order[b.kind]);
    return {records,boundaries,length:Math.max(0,...[...records.values()].map(x=>x.end))};
  }
  const easing={
    linear:t=>t,easeIn:t=>t*t,easeOut:t=>1-(1-t)*(1-t),easeInOut:t=>t*t*(3-2*t)
  };
  function interpolate(a,b,t){
    if(typeof a==='number'&&typeof b==='number')return a+(b-a)*t;
    if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length)return a.map((v,i)=>interpolate(v,b[i],t));
    return t>=1?clone(b):clone(a);
  }
  function keyframeValue(points,t,ease='linear'){
    const f=easing[ease]||easing.linear;
    if(t<=points[0].at)return clone(points[0].value);
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(t<=b.at)return interpolate(a.value,b.value,f(clamp((t-a.at)/(b.at-a.at||1),0,1)));
    }
    return clone(points.at(-1).value);
  }
  class Timeline {
    constructor(spec,resolveTrack,state,emit=()=>{},detach=null){
      this.schedule=compileTimeline(spec,resolveTrack);this.detach=detach;
      this.state=state;this.emit=emit;this.time=0;this.cursor=0;this.done=false;
      this.tweens=new Map();this.clips=new Map();this.enabled=new Map();
      for(const t of this.schedule.records.values()){
        const c=t.when;
        const value=c?state[c.target]?.[c.property]:undefined;
        this.enabled.set(t.id,!c||('equals' in c?value===c.equals:'notEquals' in c?value!==c.notEquals:'gt' in c?value>c.gt:false));
      }
      this.advance(0);
    }
    patch(target,values){
      if(!this.state[target])throw Error('Unknown timeline target '+target);
      const v=this.state[target],patch=clone(values);
      if(v.attach&&patch.attach===null&&!('position' in patch)&&this.detach){
        const p=this.detach(target,v.attach);
        if(p)patch.position=p;
      }
      Object.assign(v,patch);
    }
    sampleTweens(time){
      for(const [id,item] of this.tweens){
        const t=item.track,q=clamp((time-t.start)/t.length,0,1);
        const out={};
        for(const [key,points] of Object.entries(item.points))out[key]=keyframeValue(points,q,t.ease);
        this.patch(t.target,out);
      }
    }
    advance(delta){
      if(this.done)return;
      const target=Math.min(this.schedule.length,this.time+Math.max(0,delta));
      while(this.cursor<this.schedule.boundaries.length&&this.schedule.boundaries[this.cursor].time<=target){
        const b=this.schedule.boundaries[this.cursor++],t=b.record;
        this.sampleTweens(b.time);this.time=b.time;
        if(!this.enabled.get(t.id))continue;
        if(b.kind==='start'){
          if(t.begin)this.patch(t.target,t.begin);
          if(t.type==='set')this.patch(t.target,t.values);
          else if(t.type==='clip')this.clips.set(t.target,t);
          else if(t.type==='tween'){
            const points={};
            for(const [key,value] of Object.entries(t.to)){
              if(this.state[t.target]?.[key]===undefined)throw Error('Unknown tween property '+t.target+'.'+key);
              points[key]=[{at:0,value:clone(this.state[t.target][key])},
                ...(t.keyframes||[]).filter(f=>key in f.values).map(f=>({at:f.at,value:clone(f.values[key])})),
                {at:1,value:clone(value)}];
            }
            // Do not let two concurrent tracks write the same property.
            for(const [id,other] of this.tweens)if(other.track.target===t.target&&Object.keys(points).some(k=>k in other.points))this.tweens.delete(id);
            this.tweens.set(t.id,{track:t,points});
          }else if(t.type==='cue')this.emit({type:'marker',marker:t.marker,target:t.target,track:t.id,time:b.time});
        }else if(b.kind==='mark'){
          this.emit({type:'marker',marker:b.marker.name,target:t.target,track:t.id,clip:t.clipId,frame:b.marker.index,time:b.time});
        }else{
          if(t.type==='tween')this.tweens.delete(t.id);
          if(t.type==='clip'&&this.clips.get(t.target)?.id===t.id)this.clips.delete(t.target);
          if(t.finish)this.patch(t.target,t.finish);
        }
      }
      this.sampleTweens(target);this.time=target;
      if(this.cursor===this.schedule.boundaries.length&&target>=this.schedule.length){
        this.done=true;this.clips.clear();this.tweens.clear();
      }
    }
    pose(target){
      const t=this.clips.get(target);
      if(!t)return null;
      return {id:t.clipId,clip:t.clip,action:t.action,mode:t.mode,track:t.id,...sample(t.clip,(this.time-t.start)/t.scale,false)};
    }
    cancel(){this.done=true;this.clips.clear();this.tweens.clear()}
  }
  return {clone,clamp,duration,marks,markerTime,sample,hash,resolve,eventMode,matches,strength,ActorPlayer,compileTimeline,Timeline,keyframeValue};
});
