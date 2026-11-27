  // Tokyo playtest vector art. This file is injected inside game.js's closure
  // by build_tokyo.py; the canonical renderer is not changed or called here
  // except for the original six physical supply illustrations.
  // All scene geometry and attachment points are in 1280 x 720 logical units.
  const TOKYO_TABLE=Object.freeze({left:30,right:326,top:490,contact:500,front:518,bottom:694});
  const TOKYO_SLOTS=Object.freeze([{x:43,y:573,w:128,h:101},{x:184,y:573,w:128,h:101}]);
  const tokyoCache=new Map();
  const tDepth=y=>clamp((y-145)/(H-145),0,1);
  const tMode=g=>g.inferno?'inferno':g.fever?'fever':'normal';
  const tPalette={
    normal:{sky:['#77c6f0','#e3f4ff'],build:['#648fae','#b3c9d6','#e4d6be','#8eb3c9'],road:'#707c8b',pavement:'#d6c9bc',tree:'#4f9d61',treeLight:'#90cd75',flag:'#b93468',rail:'#f8faf7'},
    fever:{sky:['#91c8f5','#ffe8ed'],build:['#8695ba','#c0cde5','#e6d8d5','#a9b8d7'],road:'#797b93',pavement:'#ead0ca',tree:'#df77a8',treeLight:'#ffc2d9',flag:'#dc537d',rail:'#fff3ef'},
    inferno:{sky:['#152047','#604974'],build:['#344667','#536589','#76627c','#475175'],road:'#555a79',pavement:'#7e6880',tree:'#48556e',treeLight:'#73617f',flag:'#813d83',rail:'#f7ddba'}
  };
  function tPoly(c,points,fill,stroke,width=2){
    c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();
    if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.stroke()}
  }
  function tOval(c,x,y,rx,ry,fill,stroke,width=1.5,rotation=0){
    c.beginPath();c.ellipse(x,y,rx,ry,rotation,0,TAU);
    if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}
  }
  function tRect(c,x,y,w,h,r,fill,stroke,width=1.5){
    c.beginPath();c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));
    if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}
  }
  function tLine(c,x1,y1,x2,y2,col,w=2){
    c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()
  }
  function tText(c,text,x,y,size,col,weight=800){
    c.fillStyle=col;c.font=weight+' '+size+'px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(text),x,y)
  }
  function tGradient(c,x,y,x2,y2,a,b){const grad=c.createLinearGradient(x,y,x2,y2);grad.addColorStop(0,a);grad.addColorStop(1,b);return grad}
  function tStar(c,x,y,r,col,stroke){
    const points=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,s=i%2?r*.45:r;points.push([x+Math.cos(a)*s,y+Math.sin(a)*s])}
    tPoly(c,points,col,stroke,1.8);
  }
  function tFlower(c,x,y,r,col,center='#ffe0a8'){
    for(let i=0;i<5;i++){const a=i*TAU/5;tOval(c,x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55,r*.55,r*.38,col,null,1,a)}
    tOval(c,x,y,r*.27,r*.27,center)
  }
  function tBurst(c,x,y,r,col,seed=0){
    for(let i=0;i<24;i++){
      const a=i*TAU/24+seed,inner=r*(.23+(i%4)*.04),outer=r*(.75+(i%5)*.055);
      tLine(c,x+Math.cos(a)*inner,y+Math.sin(a)*inner,x+Math.cos(a)*outer,y+Math.sin(a)*outer,col,Math.max(1,r*.022));
      if(i%2===0)tOval(c,x+Math.cos(a)*r,y+Math.sin(a)*r,1.8,1.8,col)
    }
  }
  function tTower(c,x,y,night){
    c.save();c.translate(x,y);const steel=night?'#ffb15d':'#df593e',white=night?'#fff3aa':'#fff4de';
    tPoly(c,[[-44,0],[-14,-126],[-8,-168],[8,-168],[14,-126],[44,0],[27,0],[9,-82],[-9,-82],[-27,0]],steel,'#a34a47',1.4);
    for(let k=0;k<6;k++){const yy=-k*21,w=43-k*5.4; tLine(c,-w,yy,w,yy,k%2?white:steel,3.3);tLine(c,-w,yy,w-5,yy-21,white,1.6);tLine(c,w,yy,-w+5,yy-21,white,1.6)}
    tRect(c,-21,-111,42,9,2,white,steel,1.5);tRect(c,-15,-146,30,8,2,white,steel,1.5);
    tLine(c,0,-168,0,-195,steel,3);tOval(c,0,-196,2.5,3,night?'#ffdd85':'#fff');
    c.restore()
  }
  function tBuilding(c,x,base,w,h,pal,seed,night){
    const col=pal.build[seed%pal.build.length],top=base-h;
    tRect(c,x,top,w,h,2,col,'#637b964d',1);
    tPoly(c,[[x+w-12,top],[x+w,top],[x+w,base],[x+w-12,base]],night?'#26344e55':'#496a852f');
    tRect(c,x+4,top+3,w-8,4,1,night?'#99b6e333':'#f9fafa8a');
    for(let yy=top+15;yy<base-7;yy+=15)for(let xx=x+8;xx<x+w-9;xx+=14){
      if(night&&(xx+yy+seed)%5<2)tRect(c,xx,yy,7,8,1,'#ffc36e');
      else tRect(c,xx,yy,7,8,1,night?'#879ac13f':'#e8f6ffac')
    }
  }
  function tTree(c,x,y,s,pal,seed){
    c.save();c.translate(x,y);c.scale(s,s);tLine(c,0,0,1,-65,'#795c5d',8);tLine(c,0,-35,-26,-64,'#795c5d',4);tLine(c,0,-44,23,-75,'#795c5d',4);
    for(let i=0;i<11;i++){const a=i*2.4+seed;const xx=Math.cos(a)*(23+i%4*5),yy=-72+Math.sin(a)*19; tOval(c,xx,yy,24+i%3*3,21+i%2*5,pal.tree)}
    for(let i=0;i<14;i++){const a=i*2.39+seed;const xx=Math.cos(a)*(22+i%3*5),yy=-82+Math.sin(a)*20;
      tOval(c,xx,yy,12+i%4*2,10+i%3*2,pal.treeLight);
      if(pal.tree==='#df77a8')tFlower(c,xx+3,yy-3,5.5,'#fff0f4','#ed9aad')
    }
    c.restore()
  }
  function tCrowdPlacement(){
    const arr=[];
    for(const side of [-1,1]){
      for(let i=0;i<20;i++){
        const y=184+i*26,p=tDepth(y),edge=roadCenter(y)+side*roadHalfWidth(y);
        const s=.45+p*.84,x=edge+side*(22+22*p+(i%2)*14);
        if(x>8&&x<W-8)arr.push({x,y,s,i:i+(side===1?23:0),side});
      }
    }
    return arr
  }
  function tSpectator(c,item,pal,mode,animate=false,time=0){
    const {x,y,s,i,side}=item;
    const skin=SKIN[i%SKIN.length],hair=HAIR[(i*3+1)%HAIR.length];
    const shirt=mode==='fever'?['#ef9ab8','#f9e6dc','#b56ba2','#79a4d6'][i%4]:mode==='inferno'?['#9b81c9','#db795a','#5ea4b8','#e3b85a'][i%4]:SHIRTS[i%SHIRTS.length];
    c.save();c.translate(x,y);c.scale(s,s);
    if(!animate){
      tOval(c,0,4,19,4,'#29364a26');tRect(c,-17,-27,34,31,8,shirt,'#49475c',1.5);
      tOval(c,0,-39,14,15,skin,'#49475c',1.2);
      tOval(c,0,-48,14,7,hair);
      if(i%3===0)tOval(c,-12,-41,6,9,hair);
      tOval(c,-4,-39,1.4,2,'#293247');tOval(c,5,-39,1.4,2,'#293247');
      tLine(c,-3,-32,4,-32,'#995b57',1.5);
      tLine(c,-14,-20,-20,-10,skin,6);
    }
    if(animate){
      const strength=mode==='normal'?.22:mode==='fever'?.55:1;
      const a=Math.sin(time*4+i)*strength;
      tLine(c,side*13,-19,side*(19+3*a),-29-10*a,skin,5.5);
      tOval(c,side*(19+3*a),-29-10*a,3.7,4.5,skin);
      if(mode!=='normal'&&i%4===0)tOval(c,side*(22+4*a),-35-10*a,5,6,'#fce1a1','#9f6969',1)
    }
    c.restore()
  }
  function tBackground(mode){
    if(tokyoCache.has(mode))return tokyoCache.get(mode);
    const b=document.createElement('canvas');b.width=W;b.height=H;const c=b.getContext('2d',{alpha:false});const pal=tPalette[mode],night=mode==='inferno';
    c.fillStyle=tGradient(c,0,0,0,430,pal.sky[0],pal.sky[1]);c.fillRect(0,0,W,H);
    if(night){
      for(let i=0;i<75;i++){const x=(i*173+31)%W,y=81+(i*47)%128;tOval(c,x,y,i%5===0?2:1,i%5===0?2:1,'#f9e2c899')}
      for(const [x,y,r,col,phase] of [[405,142,71,'#ffcf83',.2],[614,111,65,'#f6a7e8',.05],[980,139,72,'#91d5ff',.13],[1150,107,61,'#ffb9aa',.06],[858,92,42,'#e8b2ff',.2]])tBurst(c,x,y,r,col,phase)
    }else{
      for(let i=0;i<5;i++){let x=85+i*250,y=102+i%2*29;tOval(c,x,y,48,15,'#ffffff9d');tOval(c,x-17,y-9,25,18,'#ffffffb0');tOval(c,x+17,y-6,29,16,'#ffffffb0')}
    }
    for(let i=0;i<28;i++){const x=i*47-10,base=238+(i%3)*9;const h=76+(i*53)%105,w=39+i%3*12;tBuilding(c,x,base,w,h,pal,i,night)}
    tTower(c,793,252,night);
    c.fillStyle=pal.pavement;c.fillRect(0,249,W,H-249);
    // Camera-fixed roadway and exactly two dividing lines (three lanes).
    const top=145,leftY=y=>roadCenter(y)-roadHalfWidth(y),rightY=y=>roadCenter(y)+roadHalfWidth(y);
    tPoly(c,[[leftY(top),top],[rightY(top),top],[rightY(H),H],[leftY(H),H]],tGradient(c,0,top,0,H,night?'#666381':'#9aa2b0',pal.road),'#48566d',2);
    for(const side of [-1,1]){
      tLine(c,roadCenter(top)+side*roadHalfWidth(top),top,roadCenter(H)+side*roadHalfWidth(H),H,night?'#eac6a7':'#faf5e6',5);
      for(let j=0;j<13;j++){const p=j/13,y=145+Math.pow(p,1.55)*575;const edge=roadCenter(y)+side*roadHalfWidth(y);tLine(c,edge+side*8,y,edge+side*(55+70*tDepth(y)),y+3+10*tDepth(y),night?'#ad97a5':'#b9a9a3',2)}
    }
    for(const offset of [-1/3,1/3])for(let j=0;j<9;j++){
      const p0=j/9,p1=Math.min(1,p0+.048+p0*.017),y0=145+Math.pow(p0,1.5)*575,y1=145+Math.pow(p1,1.5)*575;
      tLine(c,roadCenter(y0)+offset*roadHalfWidth(y0),y0,roadCenter(y1)+offset*roadHalfWidth(y1),y1,night?'#f2e3db':'#fff9ec',2+6*tDepth(y1))
    }
    // Trees and street furniture occupy only the sidewalks.
    for(const side of [-1,1])for(let i=0;i<6;i++){
      const y=228+i*85,p=tDepth(y),edge=roadCenter(y)+side*roadHalfWidth(y),x=edge+side*(74+30*p);
      if(x<0||x>W)continue;
      if(!night||i%2===0)tTree(c,x,y-6,.62+p*1.2,pal,i*1.6);
      const lx=edge+side*(39+27*p),ly=y-10,h=57+56*p;
      tLine(c,lx,ly,lx,ly-h,night?'#564559':'#66717f',3+2*p);
      if(night){tRect(c,lx-10-3*p,ly-h-5,20+6*p,25+9*p,6,'#ffc66c','#935953',2);tLine(c,lx-7,ly-h+5,lx+7,ly-h+5,'#fff1bd',2)}
      else {tLine(c,lx,ly-h,lx-side*12,ly-h,'#66717f',3);tOval(c,lx-side*13,ly-h+1,9,4,'#fff0cc','#66717f')}
      if(i%2===1){const fy=ly-h+14;tRect(c,lx-11,fy,22,35,2,pal.flag,'#fff5ea',1);tText(c,mode==='fever'?'桜':night?'祭':'東京',lx,fy+17,12,'#fff')}
    }
    const crowd=tCrowdPlacement();for(const item of crowd)tSpectator(c,item,pal,mode);
    for(const side of [-1,1]){
      for(let i=0;i<15;i++){
        const y0=160+i*38,y1=Math.min(H,y0+38),p0=tDepth(y0),p1=tDepth(y1);
        const x0=roadCenter(y0)+side*(roadHalfWidth(y0)+5),x1=roadCenter(y1)+side*(roadHalfWidth(y1)+5);
        const hh0=14+26*p0,hh1=14+26*p1;
        tLine(c,x0,y0,x0,y0-hh0,pal.rail,2+3*p0);tLine(c,x0,y0-hh0,x1,y1-hh1,pal.rail,2+3*p1);
        if(i%3===1&&y0>250){tPoly(c,[[x0,y0-hh0+4],[x1,y1-hh1+4],[x1,y1-4],[x0,y0-4]],pal.flag);c.save();c.translate((x0+x1)/2,(y0+y1-hh1)/2);c.rotate(side*.47);tText(c,'TOKYO',0,0,7+7*p0,'#fff');c.restore()}
      }
    }
    // Left foreground is a broad pavement/service area.
    tPoly(c,[[0,428],[310,428],[335,720],[0,720]],night?'#87798d':'#d9c6b4');
    for(let i=0;i<5;i++)tLine(c,0,451+i*58,328,451+i*58,night?'#a798aa':'#c6b4a5',2);
    tokyoCache.set(mode,b);return b
  }
  function tAtmosphere(g){
    const mode=tMode(g),t=g.sceneTime;
    if(!reducedMotion()){
      for(const item of tCrowdPlacement())if(item.i%3===0)tSpectator(ctx,item,tPalette[mode],mode,true,t);
    }
    if(mode==='fever'){
      for(let i=0;i<(reducedMotion()?16:40);i++){
        const q=reducedMotion()?0:t;
        const x=(i*173+q*(12+i%5*6))%W,y=99+(i*107+q*(22+i%4*8))%500;
        ctx.save();ctx.globalAlpha=.76;tOval(ctx,x,y,5+i%3,3,'#ffe3ef',null,1,(i+q)*.8);ctx.restore()
      }
    }
    if(mode==='inferno'&&!reducedMotion()){
      for(let i=0;i<16;i++){const x=340+(i*173)%840,y=85+(i*47)%125;ctx.globalAlpha=.25+.55*Math.abs(Math.sin(t*2+i));tStar(ctx,x,y,3+i%3,'#ffe8ae')}
      ctx.globalAlpha=1
    }
  }

  // Modular runner appearance remains independent of athlete nationality.
  // Body coordinates use the canonical hit-testing silhouette (-68..56).
  function tRunner(r,g,x){
    const s=runnerScale(r),look=r.look,t=g.sceneTime,run=reducedMotion()?0:t*(9+r.speed*.022)+r.seed;
    const swing=Math.sin(run),bob=reducedMotion()?0:-Math.abs(swing)*3.7;
    const y=r.y+runnerVisualOffset(r);ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    tOval(ctx,0,51,23,5,'#24314435');
    ctx.translate(0,bob);
    const skin=look.skin,ink='#4a3c45',shirt=look.shirt,shorts=look.shorts;
    const leg=(side,phase)=>{
      const kx=side*12+phase*7,ky=31+phase*5,fx=side*13-phase*4,fy=46-phase*6;
      tLine(ctx,side*10,17,kx,ky,ink,12);tLine(ctx,side*10,17,kx,ky,skin,9);
      tLine(ctx,kx,ky,fx,fy,ink,10);tLine(ctx,kx,ky,fx,fy,skin,7.5);
      tLine(ctx,fx,fy-3,fx,fy+2,'#f9f4e5',8);
      tRect(ctx,fx-8,fy-1,17,8,3,look.shoes,ink,1.5);tLine(ctx,fx-6,fy+6,fx+7,fy+6,'#fff9e9',2)
    };
    leg(-1,swing);leg(1,-swing);
    tPoly(ctx,[[-21,9],[21,9],[22,25],[5,27],[0,20],[-5,27],[-22,25]],shorts,ink,1.8);
    const cheer=r.mood==='happy'&&r.cheerTimer>0,angry=r.mood==='angry';
    for(const side of [-1,1]){
      const phase=side*swing,ex=side*(28+2*phase),ey=cheer&&side===1?-34:1+phase*7,hx=side*(27+phase*3),hy=cheer&&side===1?-46:-10+phase*8;
      tLine(ctx,side*18,-16,ex,ey,ink,10.5);tLine(ctx,side*18,-16,ex,ey,skin,8);
      tLine(ctx,ex,ey,hx,hy,ink,10);tLine(ctx,ex,ey,hx,hy,skin,7.5);tOval(ctx,hx,hy,5,6,skin,ink,1.2)
    }
    ctx.save();ctx.scale(look.width,1);
    tRect(ctx,-22,-23,44,43,11,tGradient(ctx,-20,-22,22,22,shirt,'#3b55758f'),ink,1.8);
    tPoly(ctx,[[-22,-17],[-15,-21],[-12,18],[-21,18]],'#ffffff45');
    tPoly(ctx,[[22,-17],[15,-21],[12,18],[21,18]],'#20354a33');
    tRect(ctx,-29,-13,58,28,4,'#fffdf7','#34384e',1.7);
    fitLabel(String(r.number),0,1,24,52,'#142439',14);
    ctx.restore();
    tOval(ctx,-19,-41,4.7,7,skin,ink,1.3);tOval(ctx,19,-41,4.7,7,skin,ink,1.3);
    tOval(ctx,0,-42,20,21,skin,ink,1.8);
    tOval(ctx,-7,-49,10,10,'#fff3df22');
    const hair=look.hair,hs=look.hairStyle;
    if(hs===2){for(let i=-2;i<=2;i++)tOval(ctx,i*8,-61+Math.abs(i)*4,8.5,7.2,hair,ink,.7)}
    else{
      ctx.beginPath();ctx.moveTo(-20,-41);ctx.quadraticCurveTo(-27,-68,0,-67);ctx.quadraticCurveTo(25,-66,20,-42);ctx.quadraticCurveTo(12,-50,5,-56);ctx.quadraticCurveTo(-2,-47,-19,-48);ctx.closePath();ctx.fillStyle=hair;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=1.2;ctx.stroke()
    }
    if(hs===1||hs===4){tOval(ctx,-18,-36,5.8,12,hair);tOval(ctx,18,-36,5.8,12,hair)}
    if(hs===5)tOval(ctx,18,-57,9,13,hair,ink,1);
    if(hs===3)tOval(ctx,7,-61,13,6,hair);
    if(look.headband){tLine(ctx,-19,-53,19,-53,'#fff7d9',5);tOval(ctx,0,-53,3,2.6,'#d34a67')}
    for(const side of [-1,1]){
      tOval(ctx,side*7,-43,4.5,5.4,'#fff9ee');tOval(ctx,side*7+.7,-42.7,2.5,3.4,'#382d37');tOval(ctx,side*7+1,-44.4,1.05,1.05,'#fff');
      tLine(ctx,side*4,-51,side*11,-52+(angry?side*-1.8:0),hair,1.8);
      if(cheer)tOval(ctx,side*13,-33,4.4,2.6,'#e67d815c');
      if(look.glasses)tRect(ctx,side*7-6,-49,12,11,3,null,'#364452',1.5)
    }
    if(look.glasses)tLine(ctx,-1,-44,1,-44,'#364452',1.5);
    tOval(ctx,1,-36,2,1.4,'#b66c5866');
    if(angry){ctx.beginPath();ctx.arc(0,-27,5,Math.PI,TAU);ctx.strokeStyle='#914e4d';ctx.lineWidth=1.8;ctx.stroke()}
    else{ctx.beginPath();ctx.moveTo(-7,-31);ctx.quadraticCurveTo(0,-28,7,-31);ctx.quadraticCurveTo(5,-21,0,-22);ctx.quadraticCurveTo(-5,-21,-7,-31);ctx.fillStyle='#88434c';ctx.fill();tLine(ctx,-4,-30,4,-30,'#fff8e9',1.8)}
    ctx.restore()
  }

  function tTable(g){
    const a=TOKYO_TABLE,mode=tMode(g),front=mode==='normal'?'#28649c':mode==='fever'?'#d85b8f':'#5b387b';
    tOval(ctx,182,697,155,15,'#26354a35');
    tPoly(ctx,[[a.left+9,a.front],[a.right-8,a.front],[a.right-8,a.bottom],[a.left+9,a.bottom]],front,'#5d454e',3);
    for(let i=0;i<9;i++){const x=51+i*30;tLine(ctx,x,520,x,689,mode==='inferno'?'#dcb37542':'#f7e0da3c',2)}
    tPoly(ctx,[[a.left,a.top],[a.right-13,a.top],[a.right,a.front],[a.left+2,a.front]],tGradient(ctx,0,490,0,518,'#ffe4b7','#d9a875'),'#73524d',3);
    tLine(ctx,a.left+12,a.top+8,a.right-22,a.top+8,'#c39063',2);
    tRect(ctx,a.left+1,a.front-4,a.right-a.left-1,13,3,'#ce956c','#79574c',2);
    tText(ctx,'TOKYO  •  AID STATION',178,544,14,mode==='inferno'?'#ffe5ab':'#fff9ec');
    for(const [i,b] of TOKYO_SLOTS.entries()){
      const s=g.supplies.queue[i];tRect(ctx,b.x,b.y,b.w,b.h,12,'#fff5df','#6f5860',2.5);
      tRect(ctx,b.x+4,b.y+4,b.w-8,b.h-8,9,'#fffdf6','#e3cda6',1);
      if(s){
        drawSupply(s,b.x+34,b.y+51,34,0,false);
        fitLabel(String(s.number),b.x+89,b.y+51,41,53,'#18293c',25);
      }else{tText(ctx,'↻',b.x+b.w/2,b.y+37,28,'#977d77');fitLabel(tr('role.refill'),b.x+b.w/2,b.y+70,15,b.w-10,'#977d77')}
    }
  }
  function tStaffBase(g){return mix(658,TOKYO_TABLE.contact,clamp(g.staffElevation||0,0,1))}
  function tHand(g){return {x:290,y:tStaffBase(g)-176}}
  function tCostumePattern(c,mode,x,y,r){
    if(mode==='normal'){tRect(c,x-r*.6,y-r*.6,r*1.2,r*1.2,1,'#fff0df')}
    else if(mode==='fever')tFlower(c,x,y,r,'#fff1f2','#e7a35f');
    else tBurst(c,x,y,r,'#f5cf79',.14)
  }
  function tStaff(g){
    const mode=tMode(g),female=tokyoVolunteer==='female',base=tStaffBase(g),skin='#efb98f',ink='#563a44';
    const cloth=mode==='normal'?'#245f9c':mode==='fever'?'#e16795':female?'#bd345c':'#46337d',shadow=mode==='normal'?'#19446f':mode==='fever'?'#a94378':female?'#782c4d':'#2e285b',trim=mode==='inferno'?'#f4cd70':'#fff2dd';
    const elevation=clamp(g.staffElevation||0,0,1),t=g.sceneTime;
    const reach=g.throwing&&!g.throwing.hit?Math.sin(Math.min(1,g.throwing.elapsed/.41)*Math.PI)*16:0;
    ctx.save();ctx.translate(149,base);
    if(mode==='inferno'||elevation>.5)tOval(ctx,0,-1,63,6,'#593b4c40');
    // Feet contact the existing tabletop at y=500. Female long garment
    // always covers the legs in Inferno; only sandal tips are visible.
    if(mode!=='inferno'||!female){
      tLine(ctx,-23,-61,-29,-9,ink,24);tLine(ctx,-23,-61,-29,-9,mode==='inferno'?'#e9d8b8':'#313c56',18);
      tLine(ctx,23,-61,28,-9,ink,24);tLine(ctx,23,-61,28,-9,mode==='inferno'?'#e9d8b8':'#313c56',18)
    }
    tRect(ctx,-48,-11,35,12,4,'#f3e5cc',ink,2);tRect(ctx,13,-11,35,12,4,'#f3e5cc',ink,2);
    tLine(ctx,-44,-6,-18,-6,'#713d48',3);tLine(ctx,17,-6,44,-6,'#713d48',3);
    const hem=mode==='inferno'&&female?-5:mode==='inferno'?-25:-57;
    const outline=[[-54,-183],[-25,-204],[22,-202],[54,-181],[61,-109],[female?62:54,hem],[-58,hem],[-64,-112]];
    tPoly(ctx,outline,tGradient(ctx,-57,-180,58,-25,cloth,shadow),ink,3.4);
    ctx.save();tPoly(ctx,outline,null);ctx.clip();
    for(let j=0;j<6;j++)for(let i=0;i<4;i++){const x=-43+i*29+(j%2)*8,y=-177+j*32;if(y<hem-4)tCostumePattern(ctx,mode,x,y,mode==='inferno'?13:8)}
    ctx.restore();
    tPoly(ctx,[[-23,-201],[0,-173],[28,-201],[40,-185],[1,-153],[-33,-186]],trim,ink,1.5);
    tPoly(ctx,[[-58,-115],[61,-115],[60,-92],[-58,-92]],mode==='inferno'?'#e2ae54':female?'#b83c67':'#283f72',ink,2);
    tLine(ctx,-49,-108,52,-108,trim,2.5);
    if(female){tPoly(ctx,[[-57,-116],[-92,-128],[-88,-86],[-58,-94]],mode==='inferno'?'#e4bb5e':'#e985ac',ink,2);tOval(ctx,-57,-105,13,14,trim,ink,1.6)}
    // Free arm and sleeve.
    tPoly(ctx,[[-48,-185],[-73,-174],[-87,-118],[-53,-103],[-39,-150]],cloth,ink,2.5);tLine(ctx,-79,-126,-63,-110,trim,5);tOval(ctx,-68,-112,11,15,skin,ink,2);
    // Throwing sleeve and forearm; the same local hand anchor is used by the
    // item, speech bubble, swap effect and projectile origin.
    tPoly(ctx,[[38,-182],[73,-191],[107,-153],[82,-124],[43,-148]],cloth,ink,2.7);
    tCostumePattern(ctx,mode,66,-158,mode==='inferno'?16:10);
    tLine(ctx,85,-153,105,-161,trim,7);
    tLine(ctx,100,-159,130+reach,-175,ink,25);tLine(ctx,100,-159,130+reach,-175,skin,20);
    tOval(ctx,141+reach,-176,14,13,skin,ink,2);
    // Head with recognizable identity across costumes.
    if(female){tOval(ctx,-22,-270,31,27,'#46323d',ink,3);tOval(ctx,-46,-232,16,26,'#46323d');tOval(ctx,12,-244,29,29,'#46323d')}
    else{tPoly(ctx,[[-43,-245],[-48,-271],[-31,-266],[-21,-289],[-9,-277],[7,-289],[18,-272],[38,-276],[43,-246]],'#49323b',ink,2.5)}
    tOval(ctx,-39,-235,9,13,skin,ink,2);tOval(ctx,3,-204,17,10,skin,ink,1);
    tOval(ctx,1,-240,43,42,tGradient(ctx,-20,-270,30,-211,'#f9d4aa',skin),ink,2.8,.08);
    tOval(ctx,38,-236,9,12,skin,ink,1.7);
    ctx.beginPath();ctx.moveTo(-41,-238);ctx.quadraticCurveTo(-54,-283,-6,-284);ctx.quadraticCurveTo(36,-282,42,-251);ctx.quadraticCurveTo(28,-250,13,-263);ctx.quadraticCurveTo(-2,-244,-21,-253);ctx.quadraticCurveTo(-25,-238,-41,-238);ctx.closePath();ctx.fillStyle='#49323b';ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.stroke();
    if(female){
      const flowerCol=mode==='normal'?'#ffefde':mode==='fever'?'#ffc0d5':'#ffdc6a';
      tFlower(ctx,-38,-267,12,flowerCol,'#d94d79');
      if(mode!=='normal'){tFlower(ctx,-51,-254,8,flowerCol,'#e99d55');tLine(ctx,-48,-260,-59,-231,trim,2);tOval(ctx,-59,-231,3,6,trim)}
      if(mode==='inferno'){tLine(ctx,-36,-267,-67,-283,'#eac16c',3);tFlower(ctx,-57,-274,8,'#fff1b1','#d65878');tFlower(ctx,-26,-281,8,'#ffd779','#d65878')}
    }else{
      tLine(ctx,-41,-254,39,-254,mode==='inferno'?'#f4cb72':'#fff6de',9);tOval(ctx,5,-254,5,4,mode==='fever'?'#ec7bad':'#b94b64');
      tPoly(ctx,[[-40,-253],[-69,-263],[-59,-246],[-45,-248]],trim,ink,1.2);
    }
    for(const [x,y] of [[-8,-240],[24,-239]]){
      tOval(ctx,x,y,8.5,10.5,'#fffaf0',ink,1.5);tOval(ctx,x+2,y+1,5.5,7,'#4c333c');tOval(ctx,x+4,y-2,2.4,2.7,'#fff');
      tLine(ctx,x-7,y-14,x+7,y-15,'#54353d',2.5)
    }
    tOval(ctx,-20,-223,7,4,'#d976805e');tOval(ctx,31,-223,6,4,'#d976805e');tOval(ctx,13,-231,3,2,'#ba745b');
    ctx.beginPath();ctx.moveTo(2,-220);ctx.quadraticCurveTo(14,-215,28,-222);ctx.quadraticCurveTo(24,-203,13,-205);ctx.quadraticCurveTo(6,-207,2,-220);ctx.closePath();ctx.fillStyle='#873e49';ctx.fill();tLine(ctx,6,-219,24,-219,'#fff7e9',2.5);
    ctx.restore();
    // Nothing except ASCII decimal digits is placed in the speech bubble.
    // During flight the original item is in the air, not duplicated in hand.
    if(!g.throwing||g.throwing.hit){
      const hand=tHand(g),s=g.supplies.held;
      if(s){
        drawSupply(s,hand.x+7,hand.y-13,39,-.23,false);
        const num=String(s.number),bw=82,bh=61,x=hand.x-42,y=hand.y-104;
        tPoly(ctx,[[x+24,y+bh-7],[x+41,y+bh-7],[x+19,y+bh+12]],'#fffdf5','#26364b',3);
        tRect(ctx,x,y,bw,bh,23,'#fffdf5','#26364b',3);
        fitLabel(num,x+bw/2,y+bh/2,42,bw-16,'#15263a',30);
      }
    }
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
    const p=clamp(f.elapsed/.41,0,1),from=f.tokyoOrigin||tHand(g),end={x:g.runnerX(r),y:r.y+runnerVisualOffset(r)-11*runnerScale(r)};
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
    ctx.drawImage(tBackground(tMode(g)),0,0,W,H);tAtmosphere(g);tImpact(g);
    for(const r of [...g.runners,...g.departing].sort((a,b)=>a.y-b.y))tRunner(r,g,g.runnerX(r));
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
