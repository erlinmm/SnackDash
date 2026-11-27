/* Declarative HUD: native controls, independent logical coordinates and art.
 * No scene layout, game object mutation, fixed widget list or city branches.
 */
(function(root){
  'use strict';
  const A=root.SnackDashAnimation;
  root.SnackDashCreateHUD=function(host,theme,library,ports){
    const [W,H]=theme.canvas,records=new Map(),animations=new Map();
    let model={},mode='normal',clock=0;
    host.classList.add('landscape-hud');
    Object.assign(host.style,{width:W+'px',height:H+'px'});
    const motion=()=>ports.reducedMotion()?'reduced':'normal';
    const get=b=>model[b];
    function condition(c){
      if(!c)return true;
      const v=get(c.binding);
      if('equals' in c&&v!==c.equals)return false;
      if(c.oneOf&&!c.oneOf.includes(v))return false;
      if(c.gte!=null&&!(v>=c.gte))return false;
      if(c.lte!=null&&!(v<=c.lte))return false;
      return true;
    }
    function format(value,kind){
      if(value==null)return '';
      if(kind==='clock'){
        const sec=Math.max(0,Math.ceil(value));
        return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
      }
      if(kind==='compact'){
        if(!Number.isFinite(value))return value<0?'−∞':'∞';
        return ports.formatNumber(value,Math.abs(value)>=1e6?{notation:'compact',maximumFractionDigits:1}:{maximumFractionDigits:0});
      }
      if(kind==='number')return ports.formatNumber(value);
      if(kind==='percent')return ports.formatNumber(value,{style:'percent',maximumFractionDigits:0});
      return String(value);
    }
    function content(w){
      if(w.binding)return format(get(w.binding),w.format);
      if(w.textKey)return ports.tr(w.textKey);
      return w.text||'';
    }
    function label(w){
      if(w.labelBinding)return String(get(w.labelBinding)||content(w));
      if(w.labelKey)return ports.tr(w.labelKey);
      return w.label||content(w);
    }
    function modeRef(mapping){
      const x=mapping?.[mode];return x&&typeof x==='object'?x[motion()]:x;
    }
    function append(parent,w){
      if(records.has(w.id))throw Error('Duplicate HUD component '+w.id);
      const el=document.createElement(w.type==='button'?'button':'div');
      el.id=w.id;el.className='hud-widget hud-'+w.type;
      if(w.binding)el.dataset.binding=w.binding;
      if(w.type==='button'){
        el.type='button';el.dataset.command=w.command;
        el.addEventListener('click',()=>ports.command(w.command));
      }
      if(w.modal){el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',w.label||'Race result')}
      let art=null,text=null,bar=null;
      if(w.images||w.clips||w.type==='image'||w.type==='animation'||theme.animations.some(a=>a.target===w.id&&a.clips)){
        art=document.createElement('canvas');art.className='hud-art';art.setAttribute('aria-hidden','true');el.append(art);
      }
      if(w.type==='text'||w.type==='button'){
        text=document.createElement('span');text.className='hud-text-value';el.append(text);
      }
      if(w.type==='progress'){
        el.setAttribute('role','progressbar');bar=document.createElement('div');bar.className='hud-fill';el.append(bar);
      }
      if(w.type==='image'||w.type==='animation')el.setAttribute('aria-hidden','true');
      if(w.modal)el.classList.add('hud-modal');
      parent.append(el);records.set(w.id,{w,el,art,text,bar,artKey:null,layoutKey:null});
      for(const child of w.children||[])append(el,child);
    }
    for(const w of theme.widgets)append(host,w);
    function applyLayout(r){
      const w=r.w,style={...w,...(w.styleByMode?.[mode]||{})},rect=w.rectByMode?.[mode]||w.rect;
      const key=JSON.stringify([mode,rect]);
      if(r.layoutKey===key)return;
      r.layoutKey=key;
      const [x,y,ww,hh]=rect;
      Object.assign(r.el.style,{left:x+'px',top:y+'px',width:ww+'px',height:hh+'px',zIndex:String(style.z??0),
        color:w.colors?.[mode]||style.color||theme.defaultColor||'#172536',
        backgroundColor:style.background||'transparent',borderRadius:(style.radius||0)+'px',
        border:style.border||'0',fontSize:(style.fontSize||22)+'px',fontWeight:String(style.fontWeight||800),
        fontFamily:style.fontFamily||'inherit',justifyContent:style.align==='left'?'flex-start':style.align==='right'?'flex-end':'center',
        textAlign:style.align||'center',overflow:style.overflow||'visible'});
      if(r.text)r.text.style.whiteSpace=style.wrap?'normal':'nowrap';
      if(r.bar)Object.assign(r.bar.style,{backgroundColor:style.color||'#edc45d',borderRadius:(style.radius||0)+'px'});
      if(r.art){
        const width=Math.max(1,Math.round(ww)),height=Math.max(1,Math.round(hh));
        if(r.art.width!==width||r.art.height!==height){r.art.width=width;r.art.height=height;r.artKey=null}
      }
    }
    function applyArt(r,key){
      if(!r.art||!ports.ready())return;
      if(r.artKey===key)return;r.artKey=key;
      const c=r.art.getContext('2d');c.clearRect(0,0,r.art.width,r.art.height);
      if(key)ports.drawAsset(c,key,0,0,r.art.width,r.art.height);
    }
    function animationFrame(r){
      const a=animations.get(r.w.id);
      if(!a)return null;
      const t=clock-a.start;
      if(t>=a.length){animations.delete(r.w.id);return null}
      const q=A.clamp(t/a.length,0,1),values={};
      if(!ports.reducedMotion()){
        for(const k of ['scale','opacity','rotation','offset']){
          const defaultValue=k==='scale'||k==='opacity'?1:k==='offset'?[0,0]:0;
          const points=(a.spec.keyframes||[]).filter(f=>k in f).map(f=>({at:f.at,value:f[k]}));
          if(points.length){if(points[0].at>0)points.unshift({at:0,value:defaultValue});if(points.at(-1).at<1)points.push({at:1,value:defaultValue});values[k]=A.keyframeValue(points,q,a.spec.ease)}
        }
        if(values.scale!=null)values.scale=1+(values.scale-1)*A.strength(a.spec.scaleBy,a.event,'multiplier',1);
      }
      if(a.clip)values.image=A.sample(a.clip,q*A.duration(a.clip),false).frame.image;
      return values;
    }
    function fit(r,value){
      if(!r.text)return;
      const style={...r.w,...(r.w.styleByMode?.[mode]||{})};
      const wanted=(style.fontSize||22),available=Math.max(1,r.el.clientWidth-6);
      r.text.style.fontSize=wanted+'px';
      if(!style.wrap&&r.text.scrollWidth>available){
        r.text.style.fontSize=Math.max(style.minFont||10,Math.floor(wanted*available/r.text.scrollWidth))+'px';
      }
    }
    function render(data,now){
      model=data;mode=data['mode.current']||'normal';clock=now;
      for(const r of records.values()){
        const w=r.w;applyLayout(r);
        const visible=condition(w.visibleWhen)&&(!w.visibleModes||w.visibleModes.includes(mode));
        r.el.hidden=!visible;
        if(!visible)continue;
        const a=animationFrame(r),offset=a?.offset||[0,0];
        r.el.style.transform=a?'translate('+offset[0]+'px,'+offset[1]+'px) scale('+(a.scale??1)+') rotate('+(a.rotation??0)+'deg)':'';
        r.el.style.opacity=String(a?.opacity??w.opacity??1);
        let image=modeRef(w.images);
        const clip=modeRef(w.clips);
        if(clip)image=A.sample(library[clip],ports.reducedMotion()?0:clock).frame.image;
        if(a?.image)image=a.image;
        applyArt(r,image||null);
        if(r.text){
          const value=content(w);
          if(r.text.textContent!==value||r.fittedMode!==mode){r.text.textContent=value;fit(r,value);r.fittedMode=mode;}
        }
        if(w.type==='button'){
          r.el.setAttribute('aria-label',label(w));
          r.el.disabled=Boolean(data['race.fixture']&&!['menu','fullscreen'].includes(w.command))||!condition(w.enabledWhen);
        }else if(w.labelBinding||w.labelKey)r.el.setAttribute('aria-label',label(w));
        if(r.bar){
          const q=A.clamp(Number(get(w.binding))||0,0,1);
          r.bar.style.width=q*100+'%';r.el.setAttribute('aria-valuenow',String(Math.round(q*100)));
          r.el.setAttribute('aria-valuemin','0');r.el.setAttribute('aria-valuemax','100');
        }
      }
    }
    function event(e,now){
      for(const spec of theme.animations){
        if(!A.matches(spec,e,e.modeAfter))continue;
        const m=A.eventMode(spec,e,e.modeAfter),ref=spec.clips?.[m];
        const id=typeof ref==='object'?ref[motion()]:ref,clip=id?library[id]:null;
        animations.set(spec.target,{spec,event:e,start:now,clip,length:spec.durationMs??A.duration(clip)});
      }
    }
    function resize(width,height){
      host.style.transform='scale('+width/W+','+height/H+')';
      for(const r of records.values())r.fittedMode=null;
    }
    function anchor(binding){
      const r=[...records.values()].find(r=>r.w.binding===binding&&!r.el.hidden&&r.el.getClientRects().length);
      if(!r)return null;
      const canvas=ports.sceneBounds(),b=r.el.getBoundingClientRect();
      return {x:(b.x+b.width/2-canvas.x)/canvas.width*ports.W,y:(b.y+b.height/2-canvas.y)/canvas.height*ports.H};
    }
    return {render,event,resize,anchor,reset:()=>{animations.clear();model={};},trace:()=>[...records.values()].map(r=>({id:r.w.id,type:r.w.type,binding:r.w.binding,command:r.w.command,visible:!r.el.hidden,art:r.artKey,text:r.text?.textContent}))};
  };
})(window);
