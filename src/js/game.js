/* Snack Dash! V26 — natural top-entry runners + occasional spaced multiplication opportunities — original canvas art, animation, UI, and audio.
   No libraries, backend, external fonts, or network requests required. */
(function(){
  'use strict';
  const {LEVELS,CITIES,cityUnlockedCount,cityCleared,seededRandom,randInt,pick,matches,transformRunnerNumber,resolveHit,NumberDirector,legalBib}=window.GameMath;
  // Keep very large Inferno scores legible in the HUD and final result.
  // The headline uses a compact value; the exact whole-number value is
  // preserved in the result details (and as the HUD's accessible label).
  function fullScoreText(value){
    if(!Number.isFinite(value))return value<0?'−∞':'∞';
    return Math.trunc(value).toLocaleString('en-GB');
  }
  function shortScoreText(value,decimals=1){
    if(!Number.isFinite(value))return fullScoreText(value);
    const magnitude=Math.abs(value);
    if(magnitude<1e6)return fullScoreText(value);
    const tiers=[[1e12,'T'],[1e9,'B'],[1e6,'M']];
    if(magnitude>=1e15)return value.toExponential(decimals).replace('e+','e');
    const [unit,suffix]=tiers.find(([unit])=>magnitude>=unit);
    return Number((value/unit).toFixed(decimals)).toLocaleString('en-GB')+suffix;
  }
  function raceBandForEvent(event){
    return event<=3?'QUARTER MARATHON':event<=6?'HALF MARATHON':event<=9?'FULL MARATHON':'ULTRA MARATHON';
  }
  const CITY_VISUALS = Object.freeze({
    tokyo:{road:'#8eaeb0',edge:'#5f7c83',stripe:'#fff4d2',verge:'#ccecc5',decor:'blossom'},
    seoul:{road:'#90a3bf',edge:'#637591',stripe:'#fff4d2',verge:'#d7efcf',decor:'lantern'},
    london:{road:'#94a3a7',edge:'#5f6f76',stripe:'#fff3df',verge:'#c8e7bf',decor:'crown'},
    berlin:{road:'#8da68c',edge:'#5f775d',stripe:'#f8f1d8',verge:'#cae5b8',decor:'bear'},
    amsterdam:{road:'#93a9b4',edge:'#5d7381',stripe:'#fff3df',verge:'#cfe7bf',decor:'canal'},
    paris:{road:'#8e78bd',edge:'#665293',stripe:'#fff2c9',verge:'#d6ecbe',decor:'paris'},
    boston:{road:'#8fabb2',edge:'#5e7981',stripe:'#fff0d6',verge:'#cce5bb',decor:'star'},
    chicago:{road:'#4fa46a',edge:'#2e6f44',stripe:'#eaf7df',verge:'#d3ebc3',decor:'shamrock'},
    newyork:{road:'#889aa8',edge:'#5b6d7f',stripe:'#fff4d8',verge:'#cce6bc',decor:'apple'},
    sydney:{road:'#69b4d8',edge:'#467ea7',stripe:'#eefcff',verge:'#caebc5',decor:'wave'},
    athens:{road:'#c7ae69',edge:'#8d7638',stripe:'#fff6d8',verge:'#d9eabf',decor:'laurel'}
  });


  // The street is composed for the REAL visible left verge (x < roadLeft(y)).
  // Signatures use distinct shapes and large foreground props, not flag labels.
  // Entries: paving, plant, furniture, skyline, accent, sky, stone, outline.
  const SCENE_THEMES=Object.freeze({
    tokyo:['slab','cherry','japanese','tokyo','#ef8fac','#f9e5ec','#d9dce6','#81465f'],
    seoul:['grid','ginkgo','korean','seoul','#f1c85a','#e1eaf3','#d5dae2','#555b89'],
    london:['stone','hedge','postbox','westminster','#d9ae70','#dce7ec','#d7d2c9','#5b6372'],
    berlin:['setts','linden','bear','gate','#8acaaf','#e1ebe4','#bfcac5','#536d67'],
    amsterdam:['brick','tulip','bike','canal','#f1a66a','#d9edf0','#d9ad90','#755c65'],
    paris:['cobble','flowers','cafe','eiffel','#c7a4ec','#f2e5ed','#e7d4c8','#6f5788'],
    boston:['herring','maple','marathon','townhouses','#f0ca57','#f7e7dd','#be8475','#795962'],
    chicago:['slate','shrubs','elevated','chicago','#81dbb3','#daebe7','#bac9c8','#4b7580'],
    newyork:['grid','tree','subway','manhattan','#f9c965','#e6e9ed','#c6c7c3','#566277'],
    sydney:['sand','eucalyptus','harbour','opera','#8bdce9','#d9f0f1','#e8dcc1','#527f91']
  });

  // City-by-city volunteer composition, in existing 390 × 700 canvas units.
  // All dependent hand/flight/feedback positions derive from this one source.
  const VOLUNTEER_SCALE=.64;
  const VOLUNTEER_SCENES=Object.freeze({
    tokyo:     {x:90,y:214,shirt:'#167d98'},
    seoul:     {x:92,y:214,shirt:'#ba406d'},
    london:    {x:92,y:216,shirt:'#246fa7'},
    berlin:    {x:102,y:202,shirt:'#ce6451'},
    amsterdam: {x:90,y:216,shirt:'#2475b9'},
    paris:     {x:92,y:214,shirt:'#168889'},
    boston:    {x:102,y:202,shirt:'#2785b8'},
    chicago:   {x:98,y:208,shirt:'#e29a38'},
    newyork:   {x:90,y:214,shirt:'#df6655'},
    sydney:    {x:92,y:216,shirt:'#c85d43'}
  });
  function volunteerScene(cityIndex){
    const city=CITIES[cityIndex??game?.config?.cityIndex??0];
    return VOLUNTEER_SCENES[city?.id]||VOLUNTEER_SCENES.tokyo;
  }
  function volunteerHandPoint(cityIndex){
    const scene=volunteerScene(cityIndex);
    // Exact neutral held supply position inside drawVolunteer: (38,-26) × VOLUNTEER_SCALE.
    return {x:scene.x+38*VOLUNTEER_SCALE,y:scene.y-26*VOLUNTEER_SCALE};
  }

  const reducedMotion=()=>typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cityPoly(points,fill,stroke,width=2){
    ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();}
  }
  function cityRect(x,y,w,h,fill,stroke,width=1.5){
    ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);
    if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.strokeRect(x,y,w,h);}
  }
  function cityArc(x,y,r,start,end,col,width=2){
    ctx.beginPath();ctx.arc(x,y,r,start,end);ctx.strokeStyle=col;ctx.lineWidth=width;ctx.stroke();
  }
  function cityEllipse(x,y,rx,ry,fill,stroke,angle=0){
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.fillStyle=fill;ctx.fill();
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
  }
  function drawCityPavement(theme){
    const pattern=theme[0],stone=theme[6],ink=theme[7];
    const left=y=>roadCenter(y)-roadHalfWidth(y)-6;
    const right=y=>roadCenter(y)+roadHalfWidth(y)+6;
    for(const side of ['left','right']){
      ctx.save();ctx.beginPath();
      if(side==='left'){
        ctx.moveTo(0,0);ctx.lineTo(Math.max(0,left(0)),0);
        for(let y=5;y<=H;y+=5)ctx.lineTo(Math.max(0,left(y)),y);
        ctx.lineTo(0,H);
      }else{
        ctx.moveTo(W,0);ctx.lineTo(Math.min(W,right(0)),0);
        for(let y=5;y<=H;y+=5)ctx.lineTo(Math.min(W,right(y)),y);
        ctx.lineTo(W,H);
      }
      ctx.closePath();ctx.clip();
      ctx.fillStyle=stone;ctx.fillRect(0,0,W,H);
      ctx.strokeStyle=ink;ctx.globalAlpha=.25;ctx.lineWidth=1.1;
      if(pattern==='herring'||pattern==='brick'){
        for(let y=145,row=0;y<490;y+=15,row++){
          const off=row%2?12:0;
          for(let x=-20+off;x<220;x+=26){
            ctx.strokeRect(x,y,25,14);
            if(pattern==='herring')line(x+4,y+2,x+20,y+12,ink,1);
          }
        }
      }else if(pattern==='cobble'||pattern==='setts'){
        for(let y=146,row=0;y<490;y+=16,row++){
          for(let x=-10+row%2*10;x<220;x+=23){
            ctx.beginPath();ctx.ellipse(x+10,y+8,11,6,0,0,TAU);ctx.stroke();
          }
        }
      }else if(pattern==='sand'){
        for(let y=156;y<490;y+=26){
          for(let x=0;x<220;x+=38){
            ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+29,y);ctx.stroke();
          }
        }
      }else{
        const dx=pattern==='slate'?41:pattern==='stone'?36:pattern==='slab'?31:27;
        const dy=pattern==='stone'?27:pattern==='slate'?36:30;
        for(let y=147;y<490;y+=dy){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(220,y);ctx.stroke();}
        for(let x=0;x<220;x+=dx){ctx.beginPath();ctx.moveTo(x,145);ctx.lineTo(x,490);ctx.stroke();}
      }
      ctx.restore();
    }
  }
  function drawCityLandmark(theme){
    // Prominent postcard silhouette entirely on the visible UPPER-LEFT verge.
    // The table and volunteer are drawn later and remain in the foreground.
    const id=theme[3],c=theme[4],ink=theme[7],sky=theme[5];
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(id==='tokyo'){
      // Red/white lattice of Tokyo Tower plus a little tiled roof.
      cityPoly([[79,240],[104,177],[109,155],[115,155],[120,177],[145,240],[132,240],[112,188],[91,240]],'#e86464',ink,2.4);
      for(let y of [182,198,216,235])line(85+(y-180)*.18,y,139-(y-180)*.18,y,'#fff2e4',3);
      line(100,193,124,220,'#fff2e4',2);line(125,194,103,223,'#fff2e4',2);
      cityRect(99,183,26,7,'#fdf4e4',ink);cityRect(109,139,5,20,'#d95568');
      cityPoly([[12,233],[19,220],[53,220],[62,233]],'#715d74',ink);
      cityRect(15,232,45,11,'#bd8587',ink);
    }else if(id==='seoul'){
      cityPoly([[3,238],[38,209],[66,217],[92,200],[136,221],[154,238]],'#a1b6a9',ink);
      cityRect(99,160,10,75,'#e8e5da',ink);
      cityEllipse(104,174,16,8,'#9b8bb6',ink);cityRect(93,177,22,8,'#ede0ec',ink);
      cityRect(102,143,4,18,'#765f8c');cityEllipse(104,139,4,4,c,ink);
      cityRect(22,205,17,29,'#bed2da',ink);cityRect(43,197,15,37,'#acc8d9',ink);
    }else if(id==='westminster'){
      // Elizabeth Tower clock face and the repeated Palace of Westminster bays.
      cityRect(9,214,138,26,'#bb9b85',ink,2);
      for(let x=15;x<145;x+=16){cityPoly([[x,215],[x+7,204],[x+14,215]],'#b9a9a3',ink,1.2);cityRect(x+4,222,7,13,'#6c7688');}
      cityRect(91,164,26,75,'#d4b9a1',ink,2.5);
      cityPoly([[88,164],[104,146],[120,164]],'#7b7288',ink,2);
      cityRect(103,133,3,18,ink);cityEllipse(104,188,9,9,'#fff0cf',ink);
      line(104,188,104,182,ink,1.8);line(104,188,109,190,ink,1.8);
      for(let x of [92,101,110])cityRect(x,216,3,16,'#8c7774');
    }else if(id==='gate'){
      cityRect(19,194,124,10,'#aab9ab',ink,2);cityRect(24,183,113,10,'#c2cfc4',ink);
      cityPoly([[17,184],[81,171],[144,184]],'#9cb2a5',ink,2);
      for(let x=27;x<137;x+=22){cityRect(x,204,13,36,'#bdcabe',ink,1.8);cityRect(x+3,208,7,29,'#e3e7db');}
      cityRect(15,237,132,7,'#7e9b93',ink);
      // Quadriga on top: small but recognizably above the columned gate.
      cityEllipse(85,167,16,5,ink);circle(71,162,4,ink);circle(94,162,4,ink);
    }else if(id==='canal'){
      const hs=[43,56,49,61];
      for(let i=0;i<4;i++){
        const x=11+i*32,w=29,h=hs[i],top=237-h;
        cityRect(x,top,w,h,['#c38276','#e5ad8a','#9c9abb','#c77984'][i],ink,2);
        cityPoly([[x,top],[x+7,top-11],[x+15,top-14],[x+22,top-11],[x+w,top]],['#ba736e','#d79778','#8f8aad','#b96d7c'][i],ink,2);
        for(let j=0;j<2;j++)cityRect(x+7,top+13+j*16,12,9,'#ffe6c0',ink,1);
      }
      cityArc(77,247,62,Math.PI,TAU,ink,5);
      line(14,244,143,244,'#699fa8',5);
    }else if(id==='eiffel'){
      // Open lattice and crossbars read much better at 390 logical pixels.
      cityPoly([[88,150],[79,187],[43,240],[59,240],[90,194],[121,240],[137,240],[101,187],[94,150]],'#b296a8',ink,2.5);
      for(let y of [175,197,216,230])line(60+(y-175)*.30,y,120-(y-175)*.30,y,'#f6e4d1',2.6);
      line(66,220,108,182,ink,1.4);line(115,220,74,182,ink,1.4);
      cityRect(84,162,16,7,'#927596',ink);cityRect(90,137,4,14,ink);
      cityPoly([[7,227],[13,211],[42,211],[47,227]],'#d79bae',ink);
      cityRect(6,227,42,9,'#d8b69f',ink);
    }else if(id==='townhouses'){
      const cols=['#b96f60','#d69a74','#a86f72','#cd896b'];
      for(let i=0;i<4;i++){
        const x=9+i*34,y=179+i%2*6;
        cityRect(x,y,31,61,cols[i],ink,1.7);
        cityPoly([[x-2,y],[x+15,y-17],[x+33,y]],'#835b5b',ink,2);
        cityRect(x+9,y+13,12,13,'#ffe2c6',ink,1.4);
        cityRect(x+9,y+36,12,14,'#ffe2c6',ink,1.4);
        cityRect(x+22,y-19,5,10,'#795151');
      }
    }else if(id==='chicago'){
      const hs=[42,58,76,52,88,64];
      for(let i=0;i<hs.length;i++){
        const x=9+i*23,y=239-hs[i];
        cityRect(x,y,21,hs[i],i%2?'#9db6b8':'#7195a5',ink,1.6);
        for(let yy=y+8;yy<235;yy+=12){line(x+5,yy,x+17,yy,'#daede4',1.6);}
      }
      cityRect(72,139,15,100,'#6d8597',ink,2);cityRect(76,122,2,18,ink);cityRect(82,125,2,15,ink);
      line(7,241,147,241,'#557b8a',5);
    }else if(id==='manhattan'){
      const hs=[41,59,78,47,69,45];
      for(let i=0;i<6;i++){
        const x=7+i*23,y=240-hs[i];
        cityRect(x,y,21,hs[i],i%2?'#a2a6b5':'#788ba2',ink,1.5);
        for(let yy=y+9;yy<234;yy+=13)for(let xx=x+5;xx<x+21;xx+=8)cityRect(xx,yy,3,5,'#ffe4ac');
      }
      cityRect(76,154,20,86,'#96a5b8',ink,2);
      cityPoly([[73,155],[86,143],[99,155]],'#8496aa',ink);
      cityRect(84,123,4,22,ink);cityRect(86,114,1.6,10,ink);
    }else if(id==='opera'){
      cityPoly([[6,242],[6,229],[137,229],[151,243]],'#8bbfc5',ink,2);
      cityPoly([[20,227],[23,220],[42,177],[58,222],[59,227]],'#fff7e9',ink,2.5);
      cityPoly([[44,228],[62,189],[80,227]],'#fff5e7',ink,2.5);
      cityPoly([[76,228],[100,185],[117,227]],'#fcf0e6',ink,2.5);
      ctx.beginPath();ctx.ellipse(88,236,59,29,0,Math.PI,TAU);ctx.strokeStyle='#5f929f';ctx.lineWidth=5;ctx.stroke();
      for(let x=47;x<139;x+=20)line(x,230,x,242,'#5f929f',2);
      line(6,242,150,242,'#6caaba',3);
    }
    ctx.restore();
  }
  function drawCityPlants(theme,time){
    // A large middle-distance plant and recognisable textures on the near verge.
    const plant=theme[1],ink=theme[7],accent=theme[4];
    const sway=reducedMotion()?0:Math.sin(time*1.1)*1.4;
    ctx.save();ctx.lineCap='round';
    if(plant==='cherry'||plant==='ginkgo'||plant==='linden'||plant==='maple'||plant==='tree'||plant==='eucalyptus'){
      const trunk=plant==='eucalyptus'?'#d4c6b2':'#927967';
      line(36,355,40+sway,298,trunk,7);
      line(40,309,62+sway,283,trunk,4);
      line(40,318,20+sway,288,trunk,3);
      for(let i=0;i<9;i++){
        const x=40+Math.cos(i*TAU/9)*30+sway,y=281+Math.sin(i*TAU/9)*22;
        if(plant==='ginkgo'){
          cityPoly([[x,y+7],[x-10,y-7],[x,y-13],[x+10,y-7]],i%2?'#f3d978':'#dbb64d',ink,1.2);
        }else if(plant==='eucalyptus'){
          cityEllipse(x,y,14,5,i%2?'#7fbbb1':'#b2d5b9',ink,-.75);
        }else if(plant==='maple'){
          cityPoly([[x,y-13],[x-5,y-5],[x-13,y-6],[x-7,y+3],[x-9,y+12],[x,y+7],[x+9,y+12],[x+7,y+3],[x+13,y-6],[x+5,y-5]],i%2?'#efaf77':'#c77b59',ink,1);
        }else{
          circle(x,y,plant==='cherry'?13:15,plant==='cherry'?(i%2?'#f9c3d8':'#f0a7c1'):(plant==='linden'?'#a9d0a0':'#9cbe99'),ink,1);
        }
      }
      if(plant==='cherry'){
        for(let i=0;i<12;i++){const x=9+(i*19)%92,y=267+(i*23)%57;circle(x,y,2.8,i%2?'#fff3e9':'#e883b1');}
      }
    }else if(plant==='hedge'||plant==='shrubs'){
      for(let i=0;i<3;i++){
        const x=13+i*24,y=349-i*10;
        roundedRect(x-12,y-15,25,24,4,plant==='hedge'?'#87a985':'#72ac9a',ink,2);
        circle(x+4,y-18,8,plant==='hedge'?'#b4cf94':'#9bcea7',ink,1);
      }
      if(plant==='hedge')for(let i=0;i<8;i++)circle(8+i*9,359-i%3*4,2.9,i%2?'#f1d37a':'#f9aeb9');
    }else if(plant==='flowers'||plant==='tulip'){
      roundedRect(1,363,82,14,4,plant==='tulip'?'#ab806e':'#8c7695',ink,2);
      for(let i=0;i<8;i++){
        const x=6+i*10,y=358-(i%3)*6;
        line(x,y+5,x+1,y-14,'#528f74',2.4);
        cityPoly([[x-6,y-12],[x-4,y-20],[x,y-16],[x+5,y-21],[x+7,y-12],[x,y-6]],i%3===0?'#e9b359':i%2?'#f4a5ba':'#d7b1ef',ink,1);
      }
    }else if(plant==='grass'){
      for(let i=0;i<10;i++)line(7+i*8,373,7+i*8+(i%2?7:-5),347-(i%3)*7,i%2?'#7db6ad':'#acd4a4',2.6);
    }
    ctx.restore();
  }
  function drawCityFurniture(theme){
    const kind=theme[2],ink=theme[7],a=theme[4];
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(kind==='japanese'){
      // Sloped-roof stone lantern and vermilion festival ribbon.
      cityRect(12,327,19,37,'#e6cbac',ink,2);
      cityPoly([[7,329],[22,316],[36,329]],'#d96e73',ink,2);
      cityRect(16,332,12,16,'#fff0bd',ink,2);
      cityRect(19,363,7,14,'#b49492',ink);line(48,339,75,333,'#d87896',3);
      for(let i=0;i<4;i++)circle(51+i*7,332-i*.7,4,'#ffc0d1');
    }else if(kind==='korean'){
      // Tall modern sign + golden ginkgo planter, markedly unlike Tokyo.
      cityRect(13,322,29,46,'#4a567d',ink,2);
      cityRect(17,327,21,15,'#f8d77b',ink);cityRect(19,347,17,17,'#aaacd8',ink);
      line(22,333,33,333,'#665079',2);line(24,354,33,354,'#f5eef8',2);
      roundedRect(50,360,33,16,4,'#758a88',ink,2);
    }else if(kind==='postbox'){
      // London: a red pillar box and cast-iron rail, not generic foliage.
      roundedRect(9,325,25,50,6,'#db4e51',ink,2.6);
      cityEllipse(21,325,13,7,'#e7615f',ink);
      cityRect(13,337,18,4,'#fff4de',ink);
      cityRect(16,352,12,8,'#b83d46');circle(21,365,2,'#edd4a2');
      for(let i=0;i<4;i++){const x=43+i*10;line(x,349,x,376,'#373d4b',3);}
      line(41,352,82,352,'#343b46',3);
    }else if(kind==='bear'){
      // Berlin bear sculpture on geometric plinth, with bright linden planting.
      cityRect(8,366,48,10,'#abbcb6',ink,2);
      cityEllipse(33,344,15,20,'#866d67',ink);
      circle(28,322,6,'#866d67',ink,1);circle(40,322,6,'#866d67',ink,1);
      circle(34,327,12,'#967d72',ink,2);circle(30,326,2,'#332f35');circle(38,326,2,'#332f35');
      for(let i=0;i<4;i++)cityEllipse(63+i*5,363-i%2*5,5,8,'#95c5a0',ink);
    }else if(kind==='bike'){
      // Amsterdam: full bicycle silhouette + canal railing / tulip boxes.
      for(let x of [17,62])circle(x,352,14,'#f8eee4',ink,2.4);
      line(17,352,37,326,'#d77b66',3.5);line(37,326,62,352,'#d77b66',3.5);
      line(62,352,17,352,'#d77b66',3);line(37,326,44,352,'#d77b66',3);
      line(32,322,42,322,ink,2);line(57,323,67,323,ink,2.2);
      line(57,323,62,352,ink,2);
    }else if(kind==='cafe'){
      // Paris: double globe streetlamp and café parasol/counter.
      line(19,378,19,315,ink,4);cityArc(19,318,13,Math.PI,TAU,ink,3);
      circle(7,316,7,'#fff0c6',ink,1.8);circle(31,316,7,'#fff0c6',ink,1.8);
      cityPoly([[43,348],[65,329],[86,348]],'#dca3c7',ink,2);
      line(65,348,65,371,ink,2);line(50,358,78,358,ink,2.5);
      line(53,358,49,375,ink,2);line(75,358,79,375,ink,2);
    }else if(kind==='marathon'){
      // Boston: blue/gold race marker and an old-fashioned streetlamp.
      line(13,317,13,377,ink,3);cityEllipse(13,317,7,9,'#fff1c7',ink);
      roundedRect(24,330,54,31,6,'#377eae',ink,2.5);
      label('26.2',51,343,18,'#ffe170');label('BOSTON',51,353,7,'#ffffff');
      line(24,363,78,363,'#f6ce64',4);
    }else if(kind==='elevated'){
      // Chicago: underside of the "L" viaduct, truss and riveted support.
      cityRect(7,311,86,10,'#637a8b',ink,2);
      for(let x=12;x<94;x+=16){line(x,310,x+12,321,'#a2d3c3',2);circle(x,316,1.8,'#e8d9a9');}
      cityRect(26,321,12,55,'#647d88',ink,2);
      for(let y=334;y<375;y+=13)line(27,y,37,y+6,'#c1d8cb',1.8);
      roundedRect(48,359,31,15,4,'#6bb49d',ink,2);
    }else if(kind==='subway'){
      // NYC: unmistakable subway roundel beside a red hydrant.
      line(19,333,19,373,ink,4);circle(19,321,14,'#397aa2',ink,2.4);
      label('M',19,321,16,'#fff3df');
      roundedRect(44,347,21,27,5,'#d55854',ink,2);
      roundedRect(50,339,9,10,3,'#e77663',ink,1.5);
      line(42,361,68,361,ink,4);circle(44,361,5,'#d55854',ink);circle(66,361,5,'#d55854',ink);
    }else if(kind==='harbour'){
      // Sydney: bright harbour rail and eucalyptus beside coastal grasses.
      for(let i=0;i<4;i++){const x=8+i*22;line(x,342,x,377,'#fbfbf0',5);line(x,342,x,377,ink,1);}
      line(5,347,83,347,'#f8faf4',6);line(5,348,83,348,ink,1.3);
      for(let i=0;i<6;i++)cityEllipse(9+i*12,373-i%3*4,9,3,i%2?'#b4d8bd':'#7dbbb6',null,-.5);
    }
    ctx.restore();
  }
  function drawCityDetails(time){
    const index=game?.config?.cityIndex||0;
    const city=CITIES[index],theme=SCENE_THEMES[city.id]||SCENE_THEMES.tokyo;
    const person=volunteerScene(index);
    drawCityPavement(theme);

    // Reserve negative space around head, torso, arms and held supply.
    // All painted feature shapes are excluded, not the pavement material.
    ctx.save();ctx.beginPath();ctx.rect(0,139,W,H-139);
    ctx.rect(person.x-34,person.y-60,98,119);
    ctx.clip('evenodd');

    // A single compact skyline at the far LEFT. It stays above the plant
    // and behind the volunteer; the previous 150px-wide skyline hid the head.
    ctx.save();ctx.translate(-21,54);ctx.scale(.62,.75);
    drawCityLandmark(theme);ctx.restore();

    // Split planting and furniture into separate depth bands, not overlapping
    // full-size illustrations. Negative space matters more than object count.
    ctx.save();ctx.beginPath();ctx.moveTo(0,237);
    for(let y=242;y<=480;y+=5){
      ctx.lineTo(Math.max(0,roadCenter(y)-roadHalfWidth(y)-7),y);
    }
    ctx.lineTo(0,480);ctx.closePath();ctx.clip();

    ctx.save();ctx.translate(-9,67);ctx.scale(.68,.7);
    drawCityPlants(theme,time);ctx.restore();

    ctx.save();ctx.translate(17,119);ctx.scale(.64,.68);
    drawCityFurniture(theme);ctx.restore();
    ctx.restore();
    ctx.restore();
  }

  const W=390,H=700,GOAL=10,TAU=Math.PI*2;
  const $=id=>document.getElementById(id);
  const canvas=$('scene'), ctx=canvas.getContext('2d',{alpha:false});
  const stage=$('sceneShell');
  const SKIN=['#f7d6ae','#e8b990','#d59a70','#bd7957','#986344','#6d4736','#f0c49c','#a66d4f'];
  const HAIR=['#302636','#533a2c','#221f2b','#85603b','#cc784c','#423c4b','#805045'];
  const SHIRTS=['#f0a942','#71c7d7','#e47688','#a2c792','#a9a0db','#ef8c64','#7baad8','#e5bf65','#c78eb2'];
  const SHORTS=['#39495d','#5a5687','#3f7884','#886d62','#687a61','#7a4d59'];
  const EMOJI={water:'💧',banana:'🍌',apple:'🍎',orange:'🍊',bar:'🍫',juice:'🧃'};
  const CATCH_SPEED_MULTIPLIERS=[1,3,5,8,10];
  const FEVER_SPEED_MULTIPLIERS=[2,4,6,9,11];
  const INFERNO_SPEED_MULTIPLIERS=[3,6,8,10,12];
  const BIG_REWARD_JUMP=20, HEAVY_REWARD_IMPACT=30;
  const MESSAGES=['YOU GOT THIS!','LOOK AT THOSE LEGS!','KEEP THE SNACKS COMING!'];
  // Original city-themed comic bubbles and festival edging for Fever mode.
  const FEVER_THEMES={
    tokyo:{motifs:['🌸','✿','🌸'],cheers:['SAKURA POWER!','ARIGATŌ!','YATTA!']},
    seoul:{motifs:['✦','💮','✦'],cheers:['DAEBAK!','GREAT CATCH!','THANK YOU!']},
    london:{motifs:['👑','✦','☂️'],cheers:['BRILLIANT!','CHEERS!','JOLLY GOOD!']},
    berlin:{motifs:['🐻','✦','★'],cheers:['DANKE!','WUNDERBAR!','SUPER!']},
    amsterdam:{motifs:['🌷','✦','🌷'],cheers:['DANK JE!','HOORAY!','LOVELY!']},
    paris:{motifs:['✦','🥐','✦'],cheers:['MERCI!','MAGNIFIQUE!','BRAVO!']},
    boston:{motifs:['★','🏅','★'],cheers:['YOU DID IT!','THANK YOU!','GO BOSTON!']},
    chicago:{motifs:['🌬️','✦','★'],cheers:['WINDY CITY!','NICE ONE!','THANK YOU!']},
    newyork:{motifs:['🗽','★','✦'],cheers:['YOU ROCK!','BIG APPLE!','AMAZING!']},
    sydney:{motifs:['🌊','✦','🐚'],cheers:['BEAUTY!','CHEERS, MATE!','LEGEND!']}
  };
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const easeOut=t=>1-Math.pow(1-t,3);
  const rr=(r,a,b)=>a+r()*(b-a);
  const randSeed=()=>((Date.now() ^ (Math.random()*0xFFFFFFFF))>>>0);
  let prefs=loadPrefs(), unlockedCities=prefs.unlockedCities, selectedCity=0, selected=1;
  let invitationOpenIndex=null;
  let debugMode=false;
  const DEBUG_TAP_SEQUENCE=[1,9,8,6];
  const passwordQueue=[];
  function resetPasswordQueue(){passwordQueue.length=0;}
  function recordRaceTap(localRace){
    passwordQueue.push(localRace);
    if(passwordQueue.length>DEBUG_TAP_SEQUENCE.length)passwordQueue.shift();
    if(!debugMode && passwordQueue.length===DEBUG_TAP_SEQUENCE.length &&
        passwordQueue.every((number,i)=>number===DEBUG_TAP_SEQUENCE[i])){
      setDebugMode(true);return true;
    }
    return false;
  }
  // The world's ten city chapters are unlocked as groups of ten races.
  function isOpen(level){return level>=1&&level<=100&&(debugMode||Math.floor((level-1)/10)<unlockedCities);}
  function isWon(level){return (prefs.best[level]??-Infinity)>=GOAL;}
  function nextPlayable(level){
    if(debugMode)return level<100?level+1:null;
    const city=Math.floor((level-1)/10);
    for(let i=city*10+1;i<=city*10+10;i++)if(!isWon(i))return i;
    if(city<9&&unlockedCities>city+1)return city*10+11;
    return null;
  }

  selectedCity=clamp(prefs.selectedCity||0,0,unlockedCities-1);
  selected=selectedCity*10+1;
  let game=null, prevFrame=0, lastHudText='';
  let toastTimeout=null;

  function loadPrefs(){
    try {
      const old=JSON.parse(localStorage.getItem('snackDashSaveV1')||'{}');
      const saved=JSON.parse(localStorage.getItem('snackDashSaveV2')||'null');
      // Preserve the prior ten level records as first-city records if needed.
      const d=saved||{best:old.best||{},sound:old.sound!==false,selectedCity:0};
      return {best:d.best||{},sound:d.sound!==false,selectedCity:d.selectedCity||0,
        // Old saves have no unlock-notification fields. The menu reconciles
        // their achievements and delivers any invitation not yet acknowledged.
        unlockedCities:Number.isInteger(d.unlockedCities)?clamp(d.unlockedCities,1,10):1,
        invitationsAcknowledged:Array.isArray(d.invitationsAcknowledged)
          ?d.invitationsAcknowledged.filter(n=>Number.isInteger(n)&&n>=1&&n<=9):[]};
    }catch(e){return {best:{},sound:true,selectedCity:0,
      unlockedCities:1,invitationsAcknowledged:[]};}
  }
  function savePrefs(){
    if(debugMode)return;
    try{prefs.selectedCity=selectedCity;prefs.unlockedCities=unlockedCities;
      localStorage.setItem('snackDashSaveV2',JSON.stringify(prefs));}
    catch(e){/* Offline/private browsing remains playable */}
  }

  function roundedRect(x,y,w,h,r,fill,stroke,sw=1){
    const rad=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);ctx.beginPath();ctx.roundRect(x,y,w,h,rad);
    if(fill){ctx.fillStyle=fill;ctx.fill();} if(stroke){ctx.lineWidth=sw;ctx.strokeStyle=stroke;ctx.stroke();}
  }
  function circle(x,y,r,fill,stroke,sw=1){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();}}
  function line(x1,y1,x2,y2,col,sw=2){ctx.strokeStyle=col;ctx.lineWidth=sw;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function label(txt,x,y,size,col='#24374a',align='center',font='1000'){
    ctx.fillStyle=col;ctx.font=`${font} ${size}px 'Trebuchet MS',system-ui,sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(txt),x,y);
  }

  class Sfx {
    constructor(){this.context=null;this.enabled=prefs.sound;this.nextBeat=0;this.beatNumber=0;}
    get audio(){
      if(!this.enabled) return null;
      if(!this.context){try{this.context=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}}
      if(this.context.state==='suspended') this.context.resume().catch(()=>{});
      return this.context;
    }
    tone(freq,duration=.11,volume=.04,wave='sine',offset=0,attack=.008){
      const ac=this.audio;if(!ac)return;
      const t=ac.currentTime+offset,osc=ac.createOscillator(),gain=ac.createGain();
      osc.type=wave;osc.frequency.setValueAtTime(freq,t);gain.gain.setValueAtTime(0.0001,t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),t+attack);
      gain.gain.exponentialRampToValueAtTime(0.0001,t+duration);
      osc.connect(gain);gain.connect(ac.destination);osc.start(t);osc.stop(t+duration+.02);
    }
    countdown(n){this.tone(n===1?780:620,.16,.07,'triangle');this.tone(n===1?390:310,.14,.035,'sine');}
    go(){[659,830,988].forEach((f,i)=>this.tone(f,.19,.065,'triangle',i*.07));}
    throw(){this.tone(260,.16,.025,'sawtooth');this.tone(530,.09,.014,'triangle',.08);}
    correct(){[554,698,880].forEach((f,i)=>this.tone(f,.17,.052,'sine',i*.09));}
    wrong(){this.tone(235,.17,.065,'square');this.tone(171,.26,.06,'triangle',.14);}
    combo(streak){this.correct();if(streak>1){[1047,1319,1568].slice(0,Math.min(3,streak-1)).forEach((f,i)=>this.tone(f,.16,.055,'triangle',.19+i*.075));}}
    grab(){this.tone(460,.08,.027,'triangle');this.tone(670,.09,.027,'triangle',.07);}
    swapConfirm(){this.tone(660,.065,.028,'triangle');this.tone(988,.09,.025,'sine',.05);}
    victory(){[523,659,784,1047,784,1047,1319].forEach((f,i)=>this.tone(f,.18,.065,'triangle',i*.16));}
    fail(){[460,390,310].forEach((f,i)=>this.tone(f,.22,.045,'triangle',i*.18));}
    feverStart(){[587,740,880].forEach((f,i)=>this.tone(f,.12,.045,'triangle',i*.07));}
    infernoStart(){[330,660,990].forEach((f,i)=>this.tone(f,.19,.05,i===0?'sine':'triangle',i*.095));}
    feverHit(streak){this.tone(920+(streak%8)*45,.12,.065,'triangle');this.tone(1420,.1,.045,'sine',.09);this.tone(520,.1,.025,'square',.14);}
    megaHit(points){
      this.tone(160,.16,.085,'sawtooth');this.tone(86,.28,.083,'triangle',.035);
      [830,1108,1480].forEach((f,i)=>this.tone(f,.18,.057,'triangle',i*.045));
    }
    feverEnd(){[660,440].forEach((f,i)=>this.tone(f,.12,.028,'triangle',i*.10));}
    // Quiet, original little two-bar backing groove (not a pre-existing tune).
    music(sceneTime){
      if(!this.enabled||!this.context)return;
      if(sceneTime<this.nextBeat)return;
      this.nextBeat=sceneTime+.39;
      const step=this.beatNumber++%8;
      if(step===0||step===4){this.tone(120,.09,.014,'sine');this.tone(62,.12,.016,'triangle');}
      else if(step===2||step===6) this.tone(210,.055,.012,'square');
      if(step%2===1)this.tone(1050,.025,.005,'triangle');
      if(step===0||step===3||step===5)this.tone([392,440,523][[0,3,5].indexOf(step)],.12,.012,'sine');
    }
  }
  const audio=new Sfx();

  function createLook(rng){return {
    skin:pick(rng,SKIN),hair:pick(rng,HAIR),shirt:pick(rng,SHIRTS),shorts:pick(rng,SHORTS),
    hairStyle:randInt(rng,0,5),genderPresentation:randInt(rng,0,2),height:rr(rng,.91,1.08),
    width:rr(rng,.9,1.13),headband:rng()<.27,glasses:rng()<.16,
    shoes:pick(rng,['#f4e5a7','#a5dbe1','#eb959c','#f8f1dd','#98a6c9']),
    brows:rr(rng,0,TAU)
  };}
  // A three-lane road with exaggerated, camera-fixed perspective.
  // Its narrow top-right entrance widens beyond the lower/right edges of
  // the canvas. The bottom-right corner is road, never a roadside verge.
  function roadCenter(y){
    const p=clamp(y/H,0,1);
    return 335-205*p+6*Math.sin(p*Math.PI*1.27);
  }
  function roadHalfWidth(y){
    const p=clamp(y/H,0,1);
    return 49+246*Math.pow(p,1.28);
  }
  function runnerJumpOffset(r){
    const time=Math.max(0,r.joyJumpTimer||0),duration=.84;
    if(!time)return 0;
    const p=clamp(1-time/duration,0,1);
    return -Math.pow(Math.sin(Math.PI*p),2)*(r.joyJumpHeight||30);
  }
  // The only remaining jump is the small celebration after a high score.
  function runnerVisualOffset(r){return runnerJumpOffset(r);}

  function runnerScale(r,y=r.y,includeCheer=true){
    const depth=clamp(y/H,0,1);
    // Entrance is 1/3 smaller than v2; close runners retain their old size.
    const depthSize=(.66+.48*depth)*(2/3+depth/3);
    // Repeated catches give an additional visible burst of growth. Cap it
    // to keep four-digit bibs readable when many runners are on screen.
    const catchBoost=1+Math.min(.48,(r.sizeBoost??r.successes)*.12);
    const feverBounce=includeCheer&&r.feverCheerTimer>0?.11*Math.sin((1-r.feverCheerTimer/1.45)*Math.PI):0;
    return r.look.height*depthSize*(catchBoost+feverBounce);
  }
  // Fixed perspective lanes; changing lanes is visual, not a passing gate.
  const LANES=[-.67,0,.67];
  const LANE_CHANGE_RATE=5.0; // faster, still-animated early side-steps
  const TRAFFIC_REPLAN_INTERVAL=.10;
  const EXIT_LANE_LOCK_Y=H-165; // avoid needless late sideways motion

  function runnerXAt(r,y,lane){return roadCenter(y)+lane*roadHalfWidth(y)*.89;}
  function runnerFootprint(r,y=r.y,lane=r.lane){
    // Purely diagnostic outline; never blocks movement.
    const s=runnerScale(r,y,false);
    // Bounding boxes include hair, shoes, broad cartoon arms, lateral sway,
    // and extra clearance so bibs remain individually readable/tappable.
    const x=runnerXAt(r,y,lane);
    // Off-screen arms and legs must not form invisible traffic barriers.
    // Only the silhouette still visible within the canvas blocks a lane.
    const left=Math.max(0,x-32*s-3),right=Math.min(W,x+32*s+3);
    const top=Math.max(0,y-72*s),bottom=Math.min(H,y+55*s);
    if(left>=right || top>=bottom)return null;
    return {left,right,top,bottom};
  }
  function runnerClearance(a,ay,alane,b,by,blane){
    const A=runnerFootprint(a,ay,alane),B=runnerFootprint(b,by,blane);
    if(!A||!B)return Infinity;
    // Positive when separated. The larger signed gap is the first axis
    // on which the two axis-aligned silhouettes stop overlapping.
    return Math.max(Math.max(B.left-A.right,A.left-B.right),
      Math.max(B.top-A.bottom,A.top-B.bottom));
  }
  function runnerFootprintsClash(a,ay,alane,b,by,blane,padding=5){
    return runnerClearance(a,ay,alane,b,by,blane)<padding;
  }
  function runnerGap(a,b){
    return 73*runnerScale(a)+58*runnerScale(b)+12;
  }
  const approach=(from,to,step)=>from<to?Math.min(to,from+step):Math.max(to,from-step);

  // V20: Movement and overtaking are independent of traffic collisions.
  // Each runner retains their own mode-specific speed and catch boosts.
  // Lane changes are visual steering only: a runner may overtake in the same
  // lane if all three lanes are occupied. No vault, braking, or yielding.
  class TrafficDirector {
    constructor(game){
      this.game=game;this.elapsed=0;this.replans=0;this.laneChanges=0;
      this.yields=0;this.cooperativeYields=0;
    }
    speed(r){
      const multipliers=this.game.inferno?INFERNO_SPEED_MULTIPLIERS:this.game.fever?FEVER_SPEED_MULTIPLIERS:CATCH_SPEED_MULTIPLIERS;
      return r.baseSpeed*multipliers[Math.min(r.successes,4)];
    }
    laneOffset(r,index){return LANES[index]+r.laneJitter;}
    // Choose the least crowded future path while avoiding rapid lane changes.
    // There is no blocking logic: a runner ALWAYS advances at full speed.
    laneCost(r,index){
      const ownSpeed=this.speed(r),targetLane=this.laneOffset(r,index);
      let cost=Math.abs(targetLane-r.lane)*.45;
      for(const other of this.game.runners){
        if(other===r)continue;
        const otherSpeed=this.speed(other);
        const otherLane=this.laneOffset(other,other.targetLaneIndex);
        for(const t of [.25,.55,.9]){
          const myY=r.y+ownSpeed*t;
          const otherY=other.y+otherSpeed*t;
          if(myY>H+70||otherY>H+70)continue;
          const xGap=Math.abs(runnerXAt(r,myY,targetLane)-runnerXAt(other,otherY,otherLane));
          const yGap=Math.abs(myY-otherY);
          const scale=Math.max(.5,(runnerScale(r,myY,false)+runnerScale(other,otherY,false))*.5);
          const horizontal=Math.max(0,1-xGap/(69*scale+11));
          const vertical=Math.max(0,1-yGap/(95*scale+18));
          cost+=horizontal*vertical*(t===.55?3.1:1.9);
        }
      }
      // A successfully served runner slightly prefers the outside lane,
      // but it never depends on that lane being empty to move forward.
      if(r.successes>0&&index===2)cost-=.18;
      return cost;
    }
    plan(force=false){
      this.replans++;
      const ordered=[...this.game.runners].sort((a,b)=>this.speed(b)-this.speed(a));
      for(const r of ordered){
        if(r.y>=EXIT_LANE_LOCK_Y)continue;
        if(!force&&(r.laneChangeCooldown||0)>0)continue;
        let best=r.targetLaneIndex;
        let bestCost=this.laneCost(r,best);
        for(let lane=0;lane<3;lane++){
          if(lane===best)continue;
          const cost=this.laneCost(r,lane);
          if(cost<bestCost-.4){best=lane;bestCost=cost;}
        }
        if(best!==r.targetLaneIndex){
          r.targetLaneIndex=best;
          r.laneChangeCooldown=.52;
          this.laneChanges++;
        }
      }
    }
    move(dt){
      this.elapsed+=dt;
      for(const r of this.game.runners){
        r.laneChangeCooldown=Math.max(0,(r.laneChangeCooldown||0)-dt);
      }
      if(this.elapsed>=TRAFFIC_REPLAN_INTERVAL){this.elapsed=0;this.plan();}
      for(const r of this.game.runners){
        const beforeY=r.y,beforeLane=r.lane;
        // The throw animation follows the moving target, rather than pinning
        // that athlete in place. Do not let traffic or throws slow runners.
        r.y+=this.speed(r)*dt;
        const to=this.laneOffset(r,r.targetLaneIndex);
        r.lane=approach(r.lane,to,LANE_CHANGE_RATE*dt);
        if(Math.abs(r.lane-to)<.003){r.lane=to;r.laneIndex=r.targetLaneIndex;}
        r.speed=(r.y-beforeY)/Math.max(.000001,dt);
        r.lateralVelocity=(r.lane-beforeLane)/Math.max(.000001,dt);
      }
    }
    // Visual overlaps can occur briefly during a same-lane pass. They are
    // intentionally NOT fed back into velocity or character growth.
    overlaps(){
      const out=[];
      for(let i=0;i<this.game.runners.length;i++)for(let j=i+1;j<this.game.runners.length;j++){
        const a=this.game.runners[i],b=this.game.runners[j];
        if(runnerFootprintsClash(a,a.y,a.lane,b,b.y,b.lane,0))out.push([a.id,b.id]);
      }
      return out;
    }
  }

  // Gentle practice opportunities use *existing* runners and two already-valid
  // supplies. Swapping is always free; no score or level rule is modified.
  const PRACTICE_PAIRS = [
    [7,4],[7,5],[7,6],[7,8],[7,9],[7,11],[7,12],
    [11,3],[11,4],[11,5],[11,6],[11,7],[11,8],[11,9],[11,12],
    [12,3],[12,4],[12,5],[12,6],[12,7],[12,8],[12,9],[12,11],
    [13,3],[13,4],[13,5],[13,6],[13,7],[13,8],[13,9],[13,10],[13,11]
  ];
  const PRACTICE_KEY='snackDashPracticeV1';
  function readPracticeHistory(){
    try{
      const data=JSON.parse(localStorage.getItem(PRACTICE_KEY)||'{}');
      return data&&typeof data==='object'&&data.facts&&typeof data.facts==='object' ? data : {facts:{},swaps:{}};
    }catch(_){return {facts:{},swaps:{}};}
  }
  class LearningOpportunityDirector {
    constructor(game){
      this.game=game;
      this.history=readPracticeHistory();
      if(!this.history.facts)this.history.facts={};
      if(!this.history.swaps)this.history.swaps={};
      this.offered=null;
      this.offersThisRace=0;
      this.swapsThisRace=0;
      this.successThisRace=0;
    }
    save(){
      if(debugMode)return;
      try{localStorage.setItem(PRACTICE_KEY,JSON.stringify(this.history));}catch(_){}
    }
    // Swaps are observations, not penalties or evidence of failure.
    recordSwap(number){
      this.swapsThisRace++;
      const n=String(number);
      this.history.swaps[n]=Math.min(1000,(this.history.swaps[n]||0)+1);
      this.save();
    }
    recordHit(s,previous,newBib,correct){
      if(!correct)return;
      this.successThisRace++;
      // Keep a small, readable record of the actual multiplication fact.
      for(const practiceSupply of [7,11,12,13]){
        if(practiceSupply>this.game.config.supplyMax)continue;
        let q=null;
        if(s===practiceSupply && previous%practiceSupply===0)q=previous/practiceSupply;
        else if(s>=2 && s<=this.game.config.supplyMax && previous===practiceSupply*s)q=s;
        if(!Number.isInteger(q)||q<2||q>this.game.config.supplyMax||q===practiceSupply)continue;
        const key=`${practiceSupply}x${q}`;
        const old=this.history.facts[key]||{successes:0,lastSuccessLevel:-20,lastOfferedLevel:-20};
        old.successes=Math.min(999,(old.successes||0)+1);
        old.lastSuccessLevel=this.game.config.level;
        this.history.facts[key]=old;
      }
      this.save();
      if(this.offered && previous===this.offered.runnerNumber &&
          (s===this.offered.first || s===this.offered.second)){
        // The existing number-change animation already shows the equation;
        // no new screen-blocking teaching overlay is necessary.
        this.offered.matched=true;
      }
    }
    // A simple plan: first supply × second supply = runner's current bib.
    // Reverse the order in a later race to revisit the SAME fact from the
    // other direction, never directly after it was offered.
    suggest(possible, fresh, candidatesAlreadyOnTable){
      const g=this.game;
      if(this.offersThisRace>=1||g.fever||g.inferno||g.config.seconds-g.remaining<3||
          g.remaining<Math.min(13,g.config.seconds*.30))return null;
      if(g.random()>.52)return null;
      const valid=new Set(possible),newSupply=new Set(fresh);
      const entries=[];
      for(const [s,q] of PRACTICE_PAIRS){
        if(s>g.config.supplyMax||q>g.config.supplyMax||s===q)continue;
        const r=s*q;
        if(!legalBib(r,g.config))continue;
        if(!valid.has(s)||!valid.has(q))continue;
        const runner=g.runners.find(a=>a.number===r&&a.y>=0&&a.y<390&&a.successes<=1&&g.onScreen(a));
        if(!runner)continue;
        const id=`${s}x${q}`;
        const fact=this.history.facts[id]||{successes:0,lastOfferedLevel:-20};
        // A fact practiced in race N can reappear from the other direction
        // in race N+2 or later; no persistent drilling in the same race.
        const review=(fact.successes||0)>0 && g.config.level-(fact.lastOfferedLevel??-20)>=2 &&
          g.config.level-(fact.lastSuccessLevel??-20)>=2;
        const first=review ? q:s,second=review ? s:q;
        if(!newSupply.has(first))continue;
        if(!newSupply.has(second) && !candidatesAlreadyOnTable.includes(second))continue;
        const pair=window.GameMath.pairDifficultyScore(first,r);
        if(g.config.event<=7 && pair.level>3)continue;
        // Prioritize natural, easy entries. A remembered fact sometimes
        // returns later in reverse order to encourage retrieval.
        let weight=1.0+(review?1.8:0)+(pair.level<=2?.9:0);
        weight*=Math.max(.2,1-(fact.successes||0)*.07);
        // If the player has swapped this number often, do not send a harder
        // target as punishment; weight easy opportunities a little more.
        weight*=1+Math.min(.3,(this.history.swaps[String(first)]||0)*.02);
        entries.push({s,q,first,second,runnerNumber:r,runnerId:runner.id,key:id,weight,review});
      }
      if(!entries.length)return null;
      const sum=entries.reduce((a,b)=>a+b.weight,0);
      let roll=g.random()*sum,selected=entries[entries.length-1];
      for(const e of entries){roll-=e.weight;if(roll<=0){selected=e;break;}}
      return selected;
    }
    markOffered(plan){
      this.offered={...plan,matched:false};
      this.offersThisRace++;
      const fact=this.history.facts[plan.key]||{successes:0,lastSuccessLevel:-20};
      fact.lastOfferedLevel=this.game.config.level;
      this.history.facts[plan.key]=fact;
      this.save();
    }
  }

  class Marathon {
    constructor(config,seed){
      this.config=config;this.rng=seededRandom(seed);this.director=new NumberDirector(config,this.rng);
      const {numbers,held}=this.director.createLineup();
      this.supplies=this.director.createSupplies(numbers,held);
      this.runners=[];this.departing=[];this.nextId=1;this.score=0;this.correct=0;this.wrong=0;
      this.combo=0;this.fever=false;this.inferno=false;this.maxCombo=0;this.feverImpact=0;this.feverHits=0;this.usedSupplies=[];
      this.hitstopRemaining=0;this.shakeRemaining=0;this.shakePower=0;this.impactClock=0;this.impactFlash=0;
      this.remaining=config.seconds;this.sceneTime=0;this.phase='countdown';this.countdown=1.5;
      this.lastCountdownDigit=4;this.throwing=null;this.swapCue=null;this.effects=[];this.confetti=[];
      this.goFlash=0;this.celebrationTime=0;this.resultsShown=false;this.fanfarePlayed=false;
      this.lastCheck=0;this.cheerFlash=0;this.emergencyRefills=0;
      this.populate(numbers);
      this.traffic=new TrafficDirector(this);
      this.traffic.plan(true);
      this.learning=new LearningOpportunityDirector(this);
      this.assertReady();this.syncHUD();
      $('resultOverlay').classList.add('hidden');$('gameMessage').classList.remove('show');
      $('pauseBtn').textContent='Ⅱ';$('pauseBtn').setAttribute('aria-label','Pause game');
      audio.nextBeat=0;audio.beatNumber=0;
    }
    random(){return this.rng();}
    rand(min,max){return rr(this.rng,min,max);}
    activeNumbers(){return this.runners.map(r=>r.number);}
    suppliesList(){return [this.supplies.held,...this.supplies.queue];}
    assertReady(){
      if(this.runners.length!==this.config.runners||this.runners.length<6||this.runners.length>8)
        throw Error('Runner count invariant failed');
      const listed=this.suppliesList();
      if(!listed.every(s=>s&&s.number>=2&&s.number<=this.config.supplyMax))
        throw Error('Supply outside range');
      if(new Set(listed.map(s=>s.number)).size!==listed.length)
        throw Error('Duplicated supply numbers');
      if(this.throwing && !this.throwing.hit)return;
      // For every visible/available item, an on-screen, tappable target is
      // mandatory. Recent-use restrictions affect new draws, not held items.
      if(!this.supplies.held || this.visibleMatchCount(this.supplies.held.number)<1)
        throw Error('Held supply has no visible matching runner');
      for(const supply of this.supplies.queue){
        if(this.visibleMatchCount(supply.number)<1)
          throw Error('Table supply has no visible matching runner');
      }
    }
    makeRunner(number,y,lane){
      const speed=this.rand(this.config.level>65?23:26,this.config.level>65?32:37)*this.config.pace;
      const laneIndex=LANES.reduce((best,_,i)=>Math.abs(LANES[i]-lane)<Math.abs(LANES[best]-lane)?i:best,0);
      const jitter=this.rand(-.026,.026);
      return {id:this.nextId++,number,spawnNumber:number,y,lane:LANES[laneIndex]+jitter,
        laneJitter:jitter,laneIndex,targetLaneIndex:laneIndex,laneChangeCooldown:0,
        lateralVelocity:0,speed,baseSpeed:speed,sizeBoost:0,
        seed:this.rand(0,TAU),sway:this.rand(1.1,3.2),look:createLook(this.rng),
        mood:'normal',moodTimer:0,successes:0,cheerTimer:0,feverCheerTimer:0,joyJumpTimer:0,joyJumpHeight:0,
        yBounce:this.rand(0,TAU)};
    }
    populate(numbers){
      // No rigid formation: spread runners naturally through three lanes,
      // while verifying real projected silhouette separation at entry.
      const shuffled=numbers.slice();
      for(let i=shuffled.length-1;i>0;i--){
        const j=randInt(this.rng,0,i);
        [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
      }
      shuffled.forEach((number,i)=>{
        const desiredY=72+(i+.35)*(557/shuffled.length)+this.rand(-20,20);
        const r=this.makeRunner(number,desiredY,LANES[randInt(this.rng,0,2)]);
        let found=false;
        for(let attempt=0;attempt<180&&!found;attempt++){
          // Keep one lane physically available for future overtakes. Normal
          // runners fill two staggered lanes; no three-lane wall at spawn.
          const lane=(attempt<120?(i+attempt)%2:(attempt%3));
          const y=attempt<65?
            clamp(desiredY+this.rand(-35,35),43,646):
            this.rand(42,651);
          r.y=y;r.laneIndex=lane;r.targetLaneIndex=lane;
          r.lane=LANES[lane]+r.laneJitter;
          if(this.runners.every(other=>!runnerFootprintsClash(r,r.y,r.lane,other,other.y,other.lane,9)))found=true;
        }
        if(!found)throw new Error('Cannot safely place starting runners');
        this.runners.push(r);
      });
    }
    spawnReplacement(old,forcedNumber=null){
      // When a transformed bib leaves, replace it with a legal new-entry bib.
      // Dynamic catch numbers are not required to obey the starting pool.
      const others=this.runners.filter(r=>r!==old).map(r=>r.number);
      const n=forcedNumber ?? this.director.replacement(old.spawnNumber??old.number,others,this.suppliesList());
      if(!legalBib(n,this.config))throw Error(`Illegal newly spawned runner bib ${n}`);
      this.runners=this.runners.filter(r=>r!==old);
      const replacement=this.makeRunner(n,12,LANES[randInt(this.rng,0,2)]);
      // Every entrant starts near the vanishing point. NEVER look for an
      // available position in the middle of the road, even during rescue.
      // Free Overtaking allows brief overlaps; choose the least crowded of
      // three top lanes but always keep the entrance in the first 42px.
      let best=null;
      for(const y of [8,18,30,42])for(let lane=0;lane<3;lane++){
        const xLane=LANES[lane]+replacement.laneJitter;
        replacement.y=y;replacement.lane=xLane;
        if(!this.onScreen(replacement))continue;
        let crowd=0;
        for(const other of this.runners){
          if(!this.onScreen(other))continue;
          if(runnerFootprintsClash(replacement,y,xLane,other,other.y,other.lane,10))crowd+=10;
          crowd+=Math.max(0,65-Math.abs(other.y-y))*.012;
        }
        const score=crowd+y*.025+(lane===2?.04:0);
        if(!best||score<best.score)best={y,lane,score};
      }
      if(!best)best={y:8,lane:1,score:0};
      replacement.y=best.y;replacement.entryFade=.24;
      replacement.laneIndex=best.lane;
      replacement.targetLaneIndex=best.lane;
      replacement.lane=LANES[best.lane]+replacement.laneJitter;
      this.runners.push(replacement);
      this.traffic.plan(true);
    }
    update(dt){
      if(this.phase==='paused'||this.phase==='results')return;
      // Hitstop pauses the world for a few frames, but does NOT pause the
      // round's real-time countdown. This is a visual impact cue only.
      this.impactClock+=dt;
      this.shakeRemaining=Math.max(0,this.shakeRemaining-dt);
      this.impactFlash=Math.max(0,this.impactFlash-dt);
      if(this.phase==='playing' && this.hitstopRemaining>0){
        const hold=Math.min(dt,this.hitstopRemaining);
        this.hitstopRemaining-=hold;
        this.remaining=Math.max(0,this.remaining-hold);
        dt-=hold;
        if(dt<=0||this.remaining<=0){
          if(this.remaining<=0)this.finish();
          this.syncHUD();return;
        }
      }
      this.sceneTime+=dt;
      // A replacement cue belongs to the hand, not the tray. It never holds
      // input or queues exchanges: the newest swap restarts this short cue.
      if(this.swapCue){
        this.swapCue.age+=dt;
        if(this.swapCue.age>=this.swapCue.duration)this.swapCue=null;
      }
      if(this.phase==='countdown'){
        this.countdown-=dt;
        const digit=Math.max(0,Math.ceil(this.countdown));
        if(digit!==this.lastCountdownDigit){
          if(digit>0)audio.countdown(digit);
          this.lastCountdownDigit=digit;
        }
        if(this.countdown<=0){this.phase='playing';this.goFlash=.8;audio.go();showMessage('READY, SET, SNACK!',1100);}
        this.tickRunners(dt);
      }else if(this.phase==='playing'){
        this.remaining=Math.max(0,this.remaining-dt);
        this.tickRunners(dt);
        this.tickThrow(dt);
        if(this.goFlash>0)this.goFlash-=dt;
        if(this.cheerFlash>0)this.cheerFlash-=dt;
        if(this.feverImpact>0)this.feverImpact=Math.max(0,this.feverImpact-dt);
        audio.music(this.sceneTime);
        if(this.remaining<=0) this.finish();
      }else if(this.phase==='celebrate'){
        this.celebrationTime+=dt;
        this.tickRunners(dt);
        this.tickConfetti(dt);
        if(this.celebrationTime>=2.8&&!this.resultsShown) this.showResults(true);
      }
      for(let i=this.effects.length-1;i>=0;i--){this.effects[i].age+=dt;if(this.effects[i].age>=this.effects[i].life)this.effects.splice(i,1);}
      if(this.phase==='playing'){
        this.lastCheck+=dt;
        if(this.lastCheck>2&&!this.throwing){this.assertReady();this.lastCheck=0;}
      }
      this.syncHUD();
    }
    // A runner stays in the active population, and remains tappable, for as
    // long as ANY of their drawn body (including just the hair) is on screen.
    // This keeps the game's solvability invariant aligned with visible targets.
    onScreen(r){
      const size=runnerScale(r),x=this.runnerX(r);
      const y=r.y+runnerVisualOffset(r),top=y-68*size,bottom=y+56*size;
      return top<=H && bottom>=0 && x+29*size>=0 && x-29*size<=W;
    }
    visibleMatchCount(number){return this.runners.filter(r=>this.onScreen(r)&&matches(number,r.number)).length;}
    retireExitedRunners(){
      // A selected runner is pinned only while the supply is in flight.
      // At the instant of impact they may already have left the viewport,
      // especially after a high-speed catch. Retire them *before* generating
      // the next supply; otherwise the invisible bib is wrongly counted as
      // a valid target and assertReady() can freeze the entire game.
      const departing=this.runners.filter(r=>!this.onScreen(r) &&
        !(this.throwing && !this.throwing.hit && this.throwing.runnerId===r.id));
      for(const old of departing){if(this.runners.includes(old))this.spawnReplacement(old);}
      if(departing.length && !this.throwing)this.reconcileSuppliesAfterRosterChange();
      return departing.length;
    }
    tickRunners(dt){
      this.traffic.move(dt);
      // Catch celebrations may increase size even when runners are passing.
      // Growth no longer waits for an empty lane.
      for(const r of this.runners){
        r.sizeBoost=approach(r.sizeBoost,r.successes,dt*2.8);
      }
      for(const r of this.runners){
        if(r.moodTimer>0){r.moodTimer-=dt;if(r.moodTimer<=0)r.mood=r.successes?'happy':'normal';}
        if(r.cheerTimer>0)r.cheerTimer-=dt;
        if(r.feverCheerTimer>0)r.feverCheerTimer-=dt;
        if(r.joyJumpTimer>0)r.joyJumpTimer=Math.max(0,r.joyJumpTimer-dt);
        if(r.entryFade>0)r.entryFade=Math.max(0,r.entryFade-dt);
      }
      this.retireExitedRunners();
      if(!this.throwing){
        if(this.pendingSupply || !this.supplies.held ||
            this.visibleMatchCount(this.supplies.held.number)===0){
          this.rebuildSupplyTray();
          this.syncHUD();
        }else if(this.supplies.queue.some(item=>this.visibleMatchCount(item.number)===0)){
          this.reconcileSuppliesAfterRosterChange();
          this.syncHUD();
        }else if(this.supplies.queue.length<3)this.refillPendingSlots();
      }
    }
    matchableSupplyNumbers(){
      // One source of truth: ONLY visible, tappable runners count.
      const visible=this.runners.filter(r=>this.onScreen(r)).map(r=>r.number);
      const out=[];
      for(let n=2;n<=this.config.supplyMax;n++){
        if(visible.some(bib=>matches(n,bib)))out.push(n);
      }
      return out;
    }
    playableSupplyNumbers(){
      // The 4-number window applies to NEW deliveries, not to an already
      // issued supply. Never invalidate a held number only because it is old.
      const recent=new Set(this.usedSupplies);
      return this.matchableSupplyNumbers().filter(n=>!recent.has(n));
    }
    issueFromChoices(choices){
      // Weighted draw from a precomputed VALID list. Does not rerun the
      // old per-level exact match-count constraints after bibs have changed.
      if(!choices.length)throw Error('No matchable supply numbers to issue');
      const director=this.director;
      const weights=choices.map(n=>{
        const prior=director.probabilities[n]||.001;
        const debt=(director.issuedTotal+1)*prior-(director.issuedCounts[n]||0);
        return prior*Math.exp(Math.max(-12,Math.min(12,1.65*debt)));
      });
      const total=weights.reduce((a,b)=>a+b,0);
      let roll=this.random()*total;
      let number=choices[choices.length-1];
      for(let i=0;i<choices.length;i++){
        roll-=weights[i];
        if(roll<=0){number=choices[i];break;}
      }
      director.issuedCounts[number]=(director.issuedCounts[number]||0)+1;
      director.issuedTotal++;
      director.recentSupplies.push(number);
      if(director.recentSupplies.length>3)director.recentSupplies.shift();
      return director.makeSupply(number);
    }
    reconcileSuppliesAfterRosterChange(){
      if(this.throwing)return;
      const eligible=new Set(this.matchableSupplyNumbers());
      if(!this.supplies.held || !eligible.has(this.supplies.held.number)){
        this.rebuildSupplyTray();
        return;
      }
      // Keep the held number as long as it really matches. Refilling only
      // restricts the NEXT draw; it does not invalidate items in hand.
      const used=new Set([this.supplies.held.number]);
      this.supplies.queue=this.supplies.queue.filter(item=>{
        if(!eligible.has(item.number)||used.has(item.number))return false;
        used.add(item.number);return true;
      });
      this.pendingSupply=false;
      this.refillPendingSlots();
    }
    refillPendingSlots(){
      const fresh=this.playableSupplyNumbers();
      const used=new Set([this.supplies.held.number,
        ...this.supplies.queue.map(s=>s.number)]);
      while(this.supplies.queue.length<3){
        const candidates=fresh.filter(n=>!used.has(n));
        if(!candidates.length)break;
        const item=this.issueFromChoices(candidates);
        this.supplies.queue.push(item);
        used.add(item.number);
      }
    }
    rescueMatchableRunner(){
      // Extremely rare: successful bib transformations have removed every
      // divisor relationship with the allowed supplies. Ordinary refilling
      // never changes the roster. Here a runner near the exit is replaced
      // with a fresh entrant so the game stays playable.
      const unused=[];
      for(let s=2;s<=this.config.supplyMax;s++)if(!this.usedSupplies.includes(s))unused.push(s);
      const available=unused.length?unused:Array.from({length:this.config.supplyMax-1},(_,i)=>i+2);
      const eligible=[];
      for(let n=2;n<=this.config.runnerMax;n++){
        if(!legalBib(n,this.config))continue;
        const covers=available.reduce((total,s)=>total+(matches(s,n)?1:0),0);
        if(covers)eligible.push({number:n,covers});
      }
      if(!eligible.length)return false;
      const bestCover=Math.max(...eligible.map(x=>x.covers));
      const top=eligible.filter(x=>x.covers>=Math.max(1,bestCover-1));
      // Break ties randomly to avoid reintroducing a fixed favourite number.
      const chosen=top[Math.floor(this.random()*top.length)].number;
      const victim=this.runners.filter(r=>r.id!==this.throwing?.runnerId)
        .sort((a,b)=>b.y-a.y)[0];
      if(!victim)return false;
      const snapshot=this.runners.slice();
      try{
        this.spawnReplacement(victim,chosen);
        this.rescueReplacements=(this.rescueReplacements||0)+1;
        return true;
      }catch(_){this.runners=snapshot;return false;}
    }
    rebuildSupplyTray(){
      // Make the held supply valid BEFORE rendering or unlocking player taps.
      // Prefer untouched numbers, then matching numbers previously used.
      let possible=this.matchableSupplyNumbers();
      if(!possible.length){
        // Without a 2..12 (or 2..13) match, NO supply could possibly work.
        // Replace one exiting runner with a valid new entrant as a last resort.
        for(let attempts=0;attempts<4&&!possible.length;attempts++){
          if(!this.rescueMatchableRunner())continue;
          possible=this.matchableSupplyNumbers();
        }
      }
      if(!possible.length){
        // The game must never hand out a knowingly unmatchable supply.
        // Leave an existing hand item untouched while waiting for the next
        // naturally spawned runner if emergency insertion is impossible.
        this.pendingSupply=true;
        this.supplies.queue=[];
        return;
      }
      const allowable=new Set(possible);
      const kept=[],seen=new Set();
      for(const item of this.supplies.queue){
        if(allowable.has(item.number)&&!seen.has(item.number)){
          kept.push(item);seen.add(item.number);
        }
      }
      // Never pick an invalid held supply, even if the tray is temporarily
      // sparse, and never use the previous-3 rule to hide a real valid match.
      const fresh=this.playableSupplyNumbers();
      // One optional multiplication chain per race. It must exist among
      // actual visible runners. Reserve the follow-up supply on the table
      // only when legal; no item in the player's hand is forcibly swapped.
      let lesson=null;
      if(this.learning && fresh.length && !this.pendingSupply){
        lesson=this.learning.suggest(possible,fresh,kept.map(x=>x.number));
      }
      let next=null;
      if(lesson){
        next=kept.find(x=>x.number===lesson.first);
        if(next)kept.splice(kept.indexOf(next),1);
        else next=this.issueFromChoices([lesson.first]);
      }
      if(!next){
        next=kept.find(x=>fresh.includes(x.number));
        if(next)kept.splice(kept.indexOf(next),1);
        else if(fresh.length)next=this.issueFromChoices(fresh);
      }
      if(!next){
        // Rare mathematical conflict: all valid numbers were recently used.
        // Preserve solvability over rolling-four; reuse oldest matchable.
        const ranked=possible.slice().sort((a,b)=>{
          const ai=this.usedSupplies.indexOf(a),bi=this.usedSupplies.indexOf(b);
          return (ai<0?-10:ai)-(bi<0?-10:bi);
        });
        next=kept.find(x=>x.number===ranked[0]);
        if(next)kept.splice(kept.indexOf(next),1);
        else next=this.issueFromChoices([ranked[0]]);
        this.emergencyRefills++;
      }
      this.supplies.held=next;
      this.supplies.queue=kept.filter(x=>x.number!==next.number);
      if(lesson && lesson.second!==next.number){
        const hasFollowup=this.supplies.queue.some(x=>x.number===lesson.second);
        if(!hasFollowup && this.supplies.queue.length<3 &&
            this.playableSupplyNumbers().includes(lesson.second)){
          this.supplies.queue.push(this.issueFromChoices([lesson.second]));
        }else if(!hasFollowup && this.supplies.queue.length>=3 &&
            this.playableSupplyNumbers().includes(lesson.second)){
          // Replace an *unheld* item, keeping the original three-item table.
          this.supplies.queue.pop();
          this.supplies.queue.push(this.issueFromChoices([lesson.second]));
        }
        if(this.supplies.queue.some(x=>x.number===lesson.second))this.learning.markOffered(lesson);
      }
      this.pendingSupply=false;
      this.refillPendingSlots();
    }
    tickThrow(dt){
      if(!this.throwing)return;
      const t=this.throwing;
      t.elapsed+=dt;
      if(!t.hit && t.elapsed>=.41){
        t.hit=true;
        const runner=this.runners.find(r=>r.id===t.runnerId);
        if(!runner)throw Error('Throw target disappeared during flight');
        const yes=matches(t.supply.number,runner.number);
        const fxX=this.runnerX(runner),fxY=runner.y+runnerVisualOffset(runner)-18*runnerScale(runner);
        const outcome=resolveHit(this.combo,this.fever,runner.successes,yes);
        this.score+=outcome.delta;
        this.combo=outcome.combo;this.fever=outcome.fever;this.inferno=outcome.inferno;
        this.maxCombo=Math.max(this.maxCombo,this.combo);
        if(yes){
          const oldRunnerNumber=runner.number;
          runner.successes++;this.correct++;
          // This rule is unconditional on a successful match: the old code
          // silently rolled the bib back when the future lineup was awkward.
          runner.number=transformRunnerNumber(oldRunnerNumber,t.supply.number);
          this.learning.recordHit(t.supply.number,oldRunnerNumber,runner.number,true);
          this.director.dynamicMode=true;
          // A successful supply can produce 3×–10× speed: immediately
          // replan every fast runner before the next movement frame.
          this.traffic.plan(true);
          runner.mood='happy';runner.moodTimer=0;runner.cheerTimer=this.fever?1.85:1.3;
          this.cheerFlash=this.fever?.9:.4;
          if(this.fever){
            runner.feverCheerTimer=1.45;
            this.feverImpact=.68;this.feverHits++;
            if(outcome.delta>BIG_REWARD_JUMP){
              runner.joyJumpTimer=.84;
              runner.joyJumpHeight=Math.min(this.inferno?52:34,24+(outcome.delta-20)*.66);
            }
            if(outcome.delta>HEAVY_REWARD_IMPACT && this.inferno && !outcome.infernoActivated){
              this.hitstopRemaining=reducedMotion()?0:.04;
              this.shakeRemaining=reducedMotion()?0:.12;
              this.shakePower=2.7;this.impactFlash=0;
              audio.megaHit(outcome.delta);
            }
          }
          if(outcome.infernoActivated){
            this.popEffect({kind:'feverEntry',text:'INFERNO!',x:W/2,y:H*.44,life:.68});
            showMessage('🪩 INFERNO! DISCO TIME!',1450);
            audio.infernoStart();
          }
          if(outcome.activated){
            this.popEffect({kind:'feverEntry',text:'FEVER!',x:W/2,y:H*.44,life:.55});
            showMessage('🔥 FEVER! THE WHOLE CITY CHEERS!',1450);
            audio.feverStart();
          } else if(this.score>=GOAL && this.score-outcome.delta<GOAL) showMessage('GOAL REACHED! KEEP IT UP!',1200);
          const tier=outcome.delta<=20?1:outcome.delta<=30?2:3;
          this.popEffect({kind:'score',text:`+${outcome.delta}`,x:fxX,y:fxY-48,
            size:tier===1?25:tier===2?29:34,color:this.inferno?'#ffdc65':this.fever?'#e8a048':'#0f9870',life:.52});
          if(!(outcome.activated||outcome.infernoActivated))
            this.popEffect({kind:'hitBurst',x:fxX,y:fxY-10,tier,
              mode:this.inferno?'inferno':this.fever?'fever':'normal',
              life:tier===3?.55:.43});
          const transformText=oldRunnerNumber>t.supply.number ? `${oldRunnerNumber} ÷ ${t.supply.number} = ${runner.number}` : `${oldRunnerNumber} × ${t.supply.number} = ${runner.number}`;
          updateMatchHint(`${transformText} ✓ · Combo ${this.combo} · +${outcome.delta}`);
          if(this.inferno&&tier===3&&!outcome.infernoActivated){/* mega cue already played above */}
          else if(this.fever)audio.feverHit(this.combo);else audio.combo(runner.successes);
        }else{
          this.wrong++;runner.mood='angry';runner.moodTimer=1.25;
          if(outcome.ended){
            showMessage('FEVER OVER! COMBO RESET',1300);
            this.popEffect({kind:'feverEnd',text:'FEVER OVER',x:W/2,y:H*.38,life:.34});
            audio.feverEnd();
          }else audio.wrong();
          if(outcome.delta<0)this.popEffect({kind:'score',text:`−${Math.abs(outcome.delta)}`,x:fxX,y:fxY-42,color:'#db5344',life:1.05});
          else this.popEffect({kind:'combo',text:'0 PENALTY!',x:fxX,y:fxY-65,life:.42});
          this.popEffect({kind:'bonk',x:fxX,y:fxY-22,life:.7});
          if(!outcome.ended)this.popEffect({kind:'bubble',text:pick(this.rng,['HEY!','OUCH!','RUDE!']),x:fxX,y:fxY-68,life:.48});
          updateMatchHint(`${t.supply.number} and ${runner.number}: no match · ${outcome.delta} points · combo reset`);
        }
        // The runner might have left the screen during the throwing pose.
        // Replace them while the *previous* supply roster is still in force.
        // This also releases a runner that was held at the visible edge.
        this.retireExitedRunners();
        // The consumed-number rolling window is based on actual throws, even
        // when the player has manually swapped the held item with a table item.
        this.usedSupplies.push(t.supply.number);
        if(this.usedSupplies.length>3)this.usedSupplies.shift();
        this.rebuildSupplyTray();
        t.reloaded=true;
        this.assertReady();this.syncHUD();
      }
      if(t.elapsed>=.88){
        this.throwing=null;
        this.assertReady();this.syncHUD();audio.grab();
      }
    }
    runnerX(r){return roadCenter(r.y)+r.lane*roadHalfWidth(r.y)*.89+Math.sin(this.sceneTime*1.7+r.seed)*r.sway;}
    trySwap(x,y){
      if(this.phase!=='playing'||this.throwing)return false;
      // Three tray hit areas. A tap exchanges the selected supply with the
      // one in the volunteer's hand, without consuming either item.
      if(y<40||y>130||x<17||x>230)return false;
      const i=Math.round((x-50)/72);
      if(i<0||i>2||Math.abs(x-(50+i*72))>34)return false;
      if(!this.supplies.queue[i])return false;
      const previousHand=this.supplies.held.number;
      [this.supplies.held,this.supplies.queue[i]]=[this.supplies.queue[i],this.supplies.held];
      this.learning.recordSwap(previousHand);
      // Confirm at the volunteer's HAND, below the touch point. Do not put
      // text or effects on the tray, where the player's finger covers them.
      this.swapCue={age:0,duration:.45,number:this.supplies.held.number,
        mode:this.inferno?'inferno':this.fever?'fever':'normal'};
      audio.swapConfirm();this.assertReady();this.syncHUD();
      return true;
    }
    tryThrow(x,y){
      if(this.phase!=='playing'||this.throwing||this.pendingSupply)return;
      let nearest=null,score=Infinity;
      // Tap the entire on-screen silhouette. In particular, an athlete whose
      // shoulders have passed below the bottom border is still selectable by
      // tapping the remaining hair/head at the bottom edge.
      for(const r of this.runners){
        if(!this.onScreen(r))continue;
        const scale=runnerScale(r),dx=x-this.runnerX(r),dy=y-(r.y+runnerVisualOffset(r)-8*scale);
        const ellipse=Math.pow(dx/Math.max(28,34*scale),2)+Math.pow(dy/Math.max(32,48*scale),2);
        const hairTop=r.y+runnerVisualOffset(r)-68*scale;
        const hairOnly=r.y>H-65 && Math.abs(dx)<Math.max(22,25*scale) &&
          y>=Math.max(0,hairTop-12) && y<=Math.min(H,r.y+runnerVisualOffset(r)-24*scale+10);
        const rank=hairOnly?Math.min(ellipse,.38+Math.abs(dx)/Math.max(40,50*scale)):ellipse;
        if((ellipse<1.38||hairOnly)&&rank<score){nearest=r;score=rank;}
      }
      if(!nearest){showMessage('TAP A RUNNER!',650);return;}
      this.swapCue=null; // A throw cancels the cue; the new supply is already active.
      this.throwing={runnerId:nearest.id,supply:this.supplies.held,elapsed:0,hit:false,reloaded:false,feverAtRelease:this.fever};
      audio.throw();
    }
    popEffect(fx){this.effects.push({age:0,...fx});}
    finish(){
      // A throw already in flight still counts if it reaches the runner before
      // the clock expires; otherwise the timer ends the round immediately.
      const won=this.score>=GOAL;
      if(won){
        if(!debugMode){
          prefs.best[this.config.level]=Math.max(prefs.best[this.config.level]??-999,this.score);
          // Winning a race only records its stamp. Invitation + next-city
          // access are reconciled on the level-selection page, never here.
          savePrefs();
        }
        this.phase='celebrate';this.celebrationTime=0;this.throwing=null;
        audio.victory();
        this.confetti=[];
        for(let i=0;i<110;i++)this.confetti.push({x:this.rand(0,W),y:this.rand(-530,-20),speed:this.rand(75,205),swing:this.rand(1,4),twist:this.rand(0,TAU),size:this.rand(4,9),color:pick(this.rng,['#ffad58','#e7797f','#8bcbb6','#f6da5a','#86a4e3','#fffaf1'])});
      }else{this.phase='results';this.throwing=null;audio.fail();this.showResults(false);}
    }
    tickConfetti(dt){for(const c of this.confetti){c.y+=c.speed*dt;c.x+=Math.sin(this.sceneTime*2+c.twist)*c.swing*dt;if(c.y>H+12){c.y=-15;c.x=this.rand(0,W);}}}
    showResults(won){
      this.resultsShown=true;
      $('resultMascot').textContent=won?'🏆':'💦';
      const city=CITIES[this.config.cityIndex];
      $('resultKicker').textContent=won?'RACE COMPLETE!':'TIME IS UP!';
      $('resultHeading').textContent=won?(this.config.level===100?'WORLD TOUR LEGEND!':'SUPER SERVER!'):'TRY ANOTHER LAP!';
      const finalScore=shortScoreText(this.score,2);
      const exactScore=fullScoreText(this.score);
      $('resultScore').replaceChildren();
      const scoreMain=document.createElement('strong');scoreMain.className='score-main';scoreMain.textContent=finalScore;
      const scoreUnit=document.createElement('span');scoreUnit.className='score-unit';scoreUnit.textContent='points';
      $('resultScore').append(scoreMain,scoreUnit);
      if(finalScore!==exactScore){
        const details=document.createElement('span');details.className='score-exact';
        details.textContent=`Full score: ${exactScore}`;
        $('resultScore').append(details);
      }
      $('resultScore').setAttribute('aria-label',`${exactScore} points`);
      $('resultText').textContent=debugMode?'Debug run: progress and records are not saved.':
        !won?'The runners are still hungry. Have another go!':
        this.config.level===100?'100 races completed! Your volunteer is a world-tour superstar!':
        `${city.name} race ${this.config.event} stamped! ${cityCleared(prefs.best,this.config.cityIndex)} of 10 races complete.`;
      const accuracy=this.correct+this.wrong?Math.round(this.correct/(this.correct+this.wrong)*100):0;
      $('resultStats').textContent=`${this.correct} good catches · ${this.wrong} bonks · ${accuracy}% accuracy · best combo ${this.maxCombo}`;
      const next=won?nextPlayable(this.config.level):null;
      $('resultPrimary').textContent=next?'NEXT RACE ➜':'PLAY AGAIN ↻';
      $('resultPrimary').dataset.next=String(next||'');
      $('resultPrimary').dataset.action=next?'next':'retry';
      $('resultOverlay').classList.remove('hidden');
      renderLevelGrid();
    }
    pause(){
      if(this.phase==='paused'){this.phase=this.wasPhase||'playing';$('pauseBtn').textContent='Ⅱ';$('pauseBtn').setAttribute('aria-label','Pause game');}
      else if(this.phase==='playing'||this.phase==='countdown'){
        this.wasPhase=this.phase;this.phase='paused';$('pauseBtn').textContent='▶';$('pauseBtn').setAttribute('aria-label','Resume game');
      }
    }
    syncHUD(){
      $('hudLevel').textContent=this.config.event;
      const hudDisplay=shortScoreText(this.score,1);
      $('hudScore').textContent=hudDisplay;
      $('hudScore').title=`${fullScoreText(this.score)} points`;
      $('hudScore').setAttribute('aria-label',`${fullScoreText(this.score)} points`);
      $('hudScore').style.fontSize=hudDisplay.length>8?'12px':hudDisplay.length>6?'14px':hudDisplay.length>4?'17px':'';
      $('hudScore').parentElement.parentElement.classList.toggle('goal-met',this.score>=GOAL);
      const sec=Math.max(0,Math.ceil(this.remaining));
      const t=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
      if(lastHudText!==t){$('hudTime').textContent=t;lastHudText=t;}
      $('timePill').classList.toggle('warning',sec<=20&&sec>10);
      $('timePill').classList.toggle('urgent',sec<=10);
      $('heldNumber').textContent=this.supplies.held.number;
      $('heldIcon').textContent=EMOJI[this.supplies.held.type];
      $('comboPanel').classList.toggle('fever',this.fever);
      $('comboPanel').classList.toggle('inferno',this.inferno);
      $('comboPanel').style.setProperty('--fever-city',CITIES[this.config.cityIndex].color);
      $('feverPlaque').textContent=this.inferno?'🪩 INFERNO! 🔥':'🔥 FEVER!! 🔥';
      stage.classList.toggle('fever-active',this.fever);
      stage.classList.toggle('inferno-active',this.inferno);
      $('comboValue').textContent=this.fever?`${this.combo} COMBO`:`COMBO ${this.combo}`;
      $('comboIcon').textContent=this.inferno?'🪩':this.fever?'🔥':'⚡';
      $('comboDetail').textContent=this.inferno?'RUNNER MULTIPLIER³!':this.fever?'RUNNER MULTIPLIER² · INFERNO AT 10':`${Math.max(0,5-this.combo)} MORE TO FEVER`;
      $('comboFill').style.width=`${Math.min(100,this.combo/5*100)}%`;
      $('feverStatus').textContent=this.inferno?'DISCO!':this.fever?'ON FIRE!':this.combo===0?'READY?':`${this.combo}/5`;
    }
    draw(){
      // Small real screen shake for 30+ point Fever hits. Pointer mapping uses
      // the live bounding rectangle so the moving canvas remains tappable.
      const strength=!reducedMotion()&&this.shakeRemaining>0?this.shakePower*Math.pow(this.shakeRemaining/.13,1.25):0;
      if(strength>0){
        const sx=Math.sin(this.impactClock*157)*strength;
        const sy=Math.cos(this.impactClock*119)*strength*.72;
        stage.style.transform=`translate3d(${sx.toFixed(2)}px,${sy.toFixed(2)}px,0)`;
      }else if(stage.style.transform){stage.style.transform='';}
      ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
      ctx.clearRect(0,0,W,H);
      drawGround(this.sceneTime);
      drawRoad(this.sceneTime);
      drawScenery(this.sceneTime,this.config.cityIndex);
      if(this.fever&&!this.inferno)drawFeverLights(this);
      if(this.inferno)drawInfernoLights(this);
      // Distant runners are drawn first. A departing runner remains visible at
      // the bottom without participating in number matching.
      const sorted=[...this.runners,...this.departing].sort((a,b)=>
        a.y-b.y);
      for(const fx of this.effects){
        if(['hitBurst','feverEntry','hitRing','heavyImpact'].includes(fx.kind))drawEffect(fx);
      }
      for(const r of sorted)drawRunner(r,this.sceneTime,this.runnerX(r));
      drawTable(this.supplies.queue,this.sceneTime);
      drawSwapCelebration(this.swapCue,this.sceneTime); // Large effects sit behind the hand and its readable digits.
      drawVolunteer(this.sceneTime,this.throwing,this.phase,this.celebrationTime,this.supplies.held,this.config.level,this.fever,this.swapCue);
      if(this.phase==='celebrate' && this.config.level===100){
        // Special Level 10 gag: a heroic accidental water-bottle toss and catch.
        const time=this.celebrationTime;
        if(time>.72 && time<2.42){
          const p=(time-.72)/1.70;
          const hand=volunteerHandPoint(this.config.cityIndex);
          const x=hand.x+Math.sin(p*Math.PI)*33;
          const y=hand.y-16-Math.sin(p*Math.PI)*100;
          drawSupply({type:'water',number:this.supplies.held.number},x,y,27,p*Math.PI*5,true);
          if(p>.87)label('WHAT A CATCH!',hand.x,304,12,'#1b7c78');
        }
      }
      if(this.throwing)drawThrownSupply(this.throwing,this.runners,this);
      // Do not flash over numbers.
      // No opaque hit flash over runners and supplies.
      for(const fx of this.effects){
        if(!['hitBurst','feverEntry','hitRing','heavyImpact'].includes(fx.kind))drawEffect(fx);
      }
      if(this.fever&&['playing','paused'].includes(this.phase)){
        drawFeverFrame(this);
        if(this.inferno)drawInfernoOverlay(this);
        // Keep every partly edge-covered runner ABOVE the decorative speech
        // frame. A tiny hair sliver or an arriving runner's bib remains visible.
        // Fever decorations never change real target geometry or hit-testing.
        for(const r of sorted){
          const sc=runnerScale(r),x=this.runnerX(r),y=r.y+runnerVisualOffset(r);
          if(y-68*sc<103 || y+56*sc>H-74 || x-30*sc<61 || x+30*sc>W-61)
            drawRunner(r,this.sceneTime,x);
        }
      }
      if(this.phase==='celebrate'){
        for(const c of this.confetti){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(this.sceneTime*2+c.twist);ctx.fillStyle=c.color;ctx.fillRect(-c.size/2,-c.size/2,c.size,c.size*.62);ctx.restore();}
        if(this.celebrationTime<2.2){
          ctx.save();ctx.translate(W/2,89);ctx.rotate(Math.sin(this.sceneTime*8)*.035);
          roundedRect(-158,-36,316,70,20,'#fff8da','#2b4a4f',3);
          label(this.config.level===100?'ALL 100 RACES!':'SNACK STATION HERO!',0,-8,19,'#1a7775');
          label('THE VOLUNTEER WINS!',0,16,13,'#db7849');ctx.restore();
        }
      }
      if(this.phase==='countdown')drawCountdown(Math.max(1,Math.ceil(this.countdown/0.5)),false);
      if(this.phase==='playing' && this.goFlash>0)drawCountdown('GO!',true);
      if(this.phase==='paused')drawPause();
    }
  }

  /* ---------- Draw the world ---------- */
  function drawGround(t){
    const theme=SCENE_THEMES[CITIES[game?.config?.cityIndex||0].id]||SCENE_THEMES.tokyo;
    ctx.fillStyle=theme[5];ctx.fillRect(0,0,W,H);
    drawCityDetails(t);
  }
    function drawRoad(_t){
    const city=CITIES[game?.config?.cityIndex||0],style=CITY_VISUALS[city.id]||CITY_VISUALS.tokyo;
    const left=y=>roadCenter(y)-roadHalfWidth(y);
    const right=y=>roadCenter(y)+roadHalfWidth(y);
    const laneX=(y,offset)=>roadCenter(y)+offset*roadHalfWidth(y);
    ctx.beginPath();ctx.moveTo(left(-40),-40);
    for(let y=-35;y<=750;y+=5)ctx.lineTo(left(y),y);
    for(let y=750;y>=-40;y-=5)ctx.lineTo(right(y),y);
    ctx.closePath();ctx.fillStyle=style.road;ctx.fill();
    const gradient=ctx.createLinearGradient(0,0,0,H);
    gradient.addColorStop(0,'rgba(22,61,77,.19)');
    gradient.addColorStop(.48,'rgba(255,255,241,.03)');
    gradient.addColorStop(1,'rgba(250,252,239,.12)');
    ctx.fillStyle=gradient;ctx.fill();
    for(const edge of [left,right]){
      for(let y=-40;y<740;y+=11){
        const p=clamp(y/H,0,1),w=1.7+6.8*p;
        line(edge(y),y,edge(y+12),y+12,style.edge,w+3);
        line(edge(y),y,edge(y+12),y+12,style.stripe,w);
      }
    }
    for(const offset of [-1/3,1/3]){
      let y=-30;
      while(y<760){
        const p=clamp(y/H,0,1);
        const dash=10+28*p, gap=13+33*p;
        const end=Math.min(760,y+dash);
        ctx.beginPath();
        ctx.moveTo(laneX(y,offset),y);
        for(let yy=y+4;yy<end;yy+=4)ctx.lineTo(laneX(yy,offset),yy);
        ctx.lineTo(laneX(end,offset),end);
        ctx.lineCap='round';ctx.lineWidth=1.5+3.7*p;
        ctx.strokeStyle=style.stripe;ctx.stroke();
        y+=dash+gap;
      }
    }
  }
  function drawScenery(t,cityIndex=0){
    // City-specific verge is painted below the existing road, never over runners.
  }
    function drawRunner(r,t,x){
    const mood=r.mood, look=r.look;
    ctx.save();
    if(r.entryFade>0)ctx.globalAlpha=.64+.36*(1-r.entryFade/.24);
    ctx.translate(x,r.y);
    if(Math.abs(r.lateralVelocity||0)>.1)ctx.rotate(clamp(r.lateralVelocity*.065,-.12,.12));
    const scale=runnerScale(r);
    const jump=runnerVisualOffset(r);
    if(jump<0){
      ctx.save();ctx.globalAlpha=.17;
      ctx.beginPath();ctx.ellipse(0,42*scale,20*scale*(1-jump/80),4.5*scale,0,0,TAU);
      ctx.fillStyle='#263b40';ctx.fill();ctx.restore();
    }
    ctx.translate(0,jump);
    ctx.scale(scale,scale);
    const stride=t*(9.5+r.speed*.035)+r.seed;
    const phase=Math.sin(stride),swing=phase*14;
    // Pronounced springy up/down steps, not a smooth sliding animation.
    const bob=-Math.abs(Math.sin(stride))*6.2;
    if(r.successes){
      ctx.save();ctx.globalAlpha=.48;
      for(let i=0;i<Math.min(4,r.successes+1);i++)line(-18-i*7,28+i*5,-22-i*9,39+i*5,'#fff5cd',2.3);
      ctx.restore();
    }
    ctx.save();ctx.translate(0,bob);
    ctx.beginPath();ctx.ellipse(0,44,23,5,0,0,TAU);ctx.fillStyle='rgba(42,61,67,.19)';ctx.fill();
    // Dynamic running legs, shoes and shorts.
    line(-12,14,-13+swing*.5,36,'#34485a',7);
    line(12,14,13-swing*.5,36,'#34485a',7);
    line(-13+swing*.5,36,-19+swing*.5,43,look.shoes,7);
    line(13-swing*.5,36,19-swing*.5,43,look.shoes,7);
    roundedRect(-22,12,44,12,6,look.shorts,'#394657',2);
    // During Fever catches, both arms shoot up and the runner jumps with joy.
    const wildCheer=r.feverCheerTimer>0;
    if(wildCheer){
      line(-20,-10,-34,-31,look.skin,9);line(-34,-31,-45,-48,look.skin,8);
      circle(-46,-48,5.5,look.skin);
    }else line(-21,-11,-28-swing*.45,11,look.skin,9);
    if(mood==='happy'){
      line(20,-10,34,-26,look.skin,8);
      line(34,-26,35,-36,look.skin,8);
      roundedRect(31,-45,9,14,4,look.skin,'#514344',1.6);
      // A cartoon thumbs-up hand.
      line(34,-38,34,-50,look.skin,5);
    }else{
      line(21,-10,29+swing*.44,9,look.skin,9);
    }
    // Body shape varies independently of skin/hair.
    ctx.save();ctx.scale(look.width,1);
    roundedRect(-25,-20,50,40,13,look.shirt,'#3b4953',2.2);
    // Bright readable bib (enlarged for four-digit numbers in perspective).
    roundedRect(-30,-14,60,30,4,'#fffef7','#344457',2);
    const digitCount=String(r.number).length;
    label(r.number,0,1,digitCount===4?19:digitCount===3?22:26,'#202c38');
    ctx.restore();
    // The face is kept large and clear: eyes, brows, and mouth are animated.
    ctx.beginPath();ctx.ellipse(0,-35,19,19,0,0,TAU);ctx.fillStyle=look.skin;ctx.fill();ctx.strokeStyle='#54494b';ctx.lineWidth=2.2;ctx.stroke();
    // Hairstyle variants create a wide range of presentation, not race stereotypes.
    ctx.fillStyle=look.hair;
    const hs=look.hairStyle;
    ctx.beginPath();
    if(hs===0){ctx.arc(0,-41,19,Math.PI*1.02,Math.PI*1.98);ctx.lineTo(17,-34);ctx.lineTo(10,-48);ctx.lineTo(-12,-43);ctx.closePath();ctx.fill();}
    if(hs===1){ctx.arc(0,-38,20,Math.PI,TAU);ctx.lineTo(19,-30);ctx.lineTo(-18,-31);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(-18,-21,8,0,TAU);ctx.arc(18,-21,8,0,TAU);ctx.fill();}
    if(hs===2){for(let i=-2;i<=2;i++)circle(i*7,-52+Math.abs(i)*3,9,look.hair);}
    if(hs===3){roundedRect(-19,-55,38,14,5,look.hair);ctx.beginPath();ctx.ellipse(12,-53,14,8,-.5,0,TAU);ctx.fill();}
    if(hs===4){ctx.beginPath();ctx.arc(0,-39,19,Math.PI,TAU);ctx.lineTo(19,-20);ctx.lineTo(12,-26);ctx.lineTo(13,-43);ctx.lineTo(-13,-43);ctx.lineTo(-16,-24);ctx.lineTo(-20,-25);ctx.closePath();ctx.fill();}
    if(hs===5){ctx.beginPath();ctx.arc(0,-44,18,Math.PI,TAU);ctx.lineTo(18,-39);ctx.lineTo(-18,-39);ctx.closePath();ctx.fill();circle(17,-40,10,look.hair);}
    if(look.headband){line(-17,-44,17,-44,'#fff6cf',4);}
    if(look.glasses){
      roundedRect(-15,-39,13,9,3,null,'#334153',1.6);roundedRect(2,-39,13,9,3,null,'#334153',1.6);line(-2,-35,2,-35,'#334153',1.5);
    }
    // Mood: playful anger, or closed smiley eyes after getting a snack.
    if(mood==='angry'){
      line(-11,-42,-4,-39,'#483b43',2.8);line(4,-39,11,-42,'#483b43',2.8);
      circle(-7,-35,2.1,'#303744');circle(7,-35,2.1,'#303744');
      ctx.strokeStyle='#a34344';ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,-23,6,Math.PI*1.16,Math.PI*1.84);ctx.stroke();
      label('!',20,-61,24,'#d95e51');
    }else if(mood==='happy'){
      ctx.strokeStyle='#373845';ctx.lineWidth=2.1;ctx.beginPath();ctx.arc(-7,-34,4,Math.PI*1.15,Math.PI*1.9);ctx.arc(7,-34,4,Math.PI*1.15,Math.PI*1.9);ctx.stroke();
      // Beaming open smile with rosy cheeks and two smiling eyes.
      circle(-13,-26,4,'#e68f80');circle(13,-26,4,'#e68f80');
      ctx.beginPath();ctx.arc(0,-27,9,0,Math.PI);ctx.lineTo(-9,-27);ctx.fillStyle='#a94d54';ctx.fill();ctx.lineWidth=2.1;ctx.strokeStyle='#914d49';ctx.stroke();
      if(r.cheerTimer>0)label(wildCheer?'♥♥':'♥',23,-65,wildCheer?24:21,'#ee6683');
      if(wildCheer){label('✦',-38,-65,19,'#ffdb58');label('✦',30,-79,17,'#f99ad0');}
    }else{
      circle(-7,-34,2.05,'#302f39');circle(7,-34,2.05,'#302f39');
      ctx.strokeStyle='#855b57';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(0,-27,5,0,Math.PI);ctx.stroke();
    }
    ctx.restore();ctx.restore();
  }

  function drawSupply(supply,x,y,size,rotation=0,showNumber=true,labelScale=1){
    if(!supply)return;
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(size/22,size/22);
    const type=supply.type;
    if(type==='water'){
      roundedRect(-11,-15,22,32,6,'#7ed0ee','#376c90',2.2);
      roundedRect(-8,-19,16,7,2,'#2c8bad','#376c90',2);
      roundedRect(-11,-2,22,13,2,'#edf9ff',null);
      ctx.save();ctx.globalAlpha=.35;roundedRect(-7,-12,5,10,2,'#fff');ctx.restore();
    }else if(type==='banana'){
      ctx.beginPath();ctx.moveTo(-16,-11);ctx.bezierCurveTo(0,4,13,2,17,-12);ctx.bezierCurveTo(22,9,0,21,-18,-1);ctx.closePath();ctx.fillStyle='#ffdd58';ctx.fill();ctx.strokeStyle='#74613e';ctx.lineWidth=2.2;ctx.stroke();circle(17,-12,3,'#916a42');
    }else if(type==='apple'){
      circle(0,0,15,'#f17676','#9e4a46',2.2);ctx.beginPath();ctx.ellipse(6,-16,8,4,-.5,0,TAU);ctx.fillStyle='#6cba74';ctx.fill();line(0,-12,2,-22,'#7a513e',2.3);
    }else if(type==='orange'){
      circle(0,0,15,'#ffa444','#b26a35',2.2);ctx.beginPath();ctx.ellipse(5,-15,8,4,-.4,0,TAU);ctx.fillStyle='#80bb6a';ctx.fill();
    }else if(type==='bar'){
      ctx.save();ctx.rotate(-.16);roundedRect(-19,-12,38,24,4,'#bb85c6','#724875',2.2);line(-12,-9,-12,10,'#f3bfd9',2);line(13,-9,13,10,'#f3bfd9',2);ctx.restore();
    }else{
      roundedRect(-15,-16,30,33,6,'#f6d28b','#936c68',2.2);
      roundedRect(-12,-12,24,24,3,'#f29c9b',null);line(3,-17,9,-27,'#728b75',3);
    }
    if(showNumber){
      const n=String(supply.number);
      const boxW=(n.length>=3?36:30)*Math.max(1,labelScale*.78);
      const boxH=24*Math.max(1,labelScale*.72);
      roundedRect(-boxW/2,-4,boxW,boxH,6,'#fffdf3','#314351',2);
      label(n,0,5+boxH*.18,(n.length>=3?14.2:17)*labelScale,'#243449');
    }
    ctx.restore();
  }
  function drawTable(queue,t){
    ctx.save();
    // Three genuine queued supplies. Number labels sit ABOVE each drawing,
    // never over the food or bottle itself. No redundant NEXT UP caption.
    roundedRect(8,23,229,113,13,'#dca577','#6a5548',3);
    roundedRect(6,19,233,23,10,'#f8c995','#6c5a4d',3);
    roundedRect(14,40,218,89,10,'#fff0d7','#af825d',2);
    Array.from({length:3},(_,i)=>queue[i]||null).forEach((s,i)=>{
      const x=50+i*72;
      roundedRect(x-33,45,66,78,9,i===0?'#ffe6a9':'#fff6e5',i===0?'#e2a256':'#d7bb99',2);
      if(!s){
        label('↻',x,73,24,'#9b8071');
        label('REFILL',x,99,9,'#947a67');
        return;
      }
      // The number is a high-positioned label; the pictogram stays unobscured.
      roundedRect(x-19,47,38,24,6,'#fffdf3','#314351',1.8);
      label(String(s.number),x,60,18,'#243449');
      drawSupply(s,x,101,21,Math.sin(t*1.3+i)*.04,false);
    });
    ctx.restore();
  }
  function drawSwapCelebration(cue,t){
    if(!cue)return;
    const p=clamp(cue.age/cue.duration,0,1);
    const pop=Math.sin(Math.PI*p);
    const fade=Math.pow(1-p,.75);
    const mode=cue.mode||'normal';
    // The swap cue follows the same city-specific held supply as the volunteer.
    const hand=volunteerHandPoint(game?.config?.cityIndex||0);
    const cx=hand.x,cy=hand.y-5*pop;
    const cold=mode==='inferno',hot=mode==='fever';
    const starColors=cold?['#fff7a0','#ff7bbd','#76ebff','#dba0ff']:
      hot?['#fff1a5','#ffd355','#ff9d46','#ff7069']:
      ['#ffca52','#fff8ae','#78d9da','#ffffff'];
    ctx.save();
    // Keep big bursts outside the finger-covered tray numbers and away
    // from most runners. No layout, character, or hitbox coordinates move.
    ctx.beginPath();ctx.rect(3,139,263,189);ctx.clip();
    // Expand a subtle aura away from the hand, without covering its digits.
    ctx.globalAlpha=(cold?.38:hot?.30:.24)*fade;
    circle(cx,cy,44+34*p,cold?'#f4a2ff':hot?'#ffb24d':'#ffe9a0');
    ctx.globalAlpha=.85*fade;
    ctx.lineWidth=cold?7:hot?5:4;
    ctx.strokeStyle=cold?'#ff64cc':hot?'#ffac3c':'#f5bf55';
    ctx.beginPath();ctx.arc(cx,cy,38+61*p,0,TAU);ctx.stroke();
    ctx.globalAlpha=.60*fade;
    ctx.strokeStyle=cold?'#93eeff':'#fff7be';
    ctx.lineWidth=cold?4:2.5;
    ctx.beginPath();ctx.arc(cx,cy,28+84*p,0,TAU);ctx.stroke();

    if(hot){
      // Fever: tall, lively orange/red flame tongues surrounding the hand.
      // Their bases and tips are separated from the readable number.
      for(let i=0;i<9;i++){
        const x=cx-49+i*12;
        const y=cy+22+Math.sin(i*2+t*9)*5;
        const rise=(30+(i%4)*11)*(.55+.55*pop);
        const sway=Math.sin(t*18+i*1.8)*8;
        ctx.save();ctx.globalAlpha=.24+.70*fade;
        ctx.beginPath();ctx.moveTo(x-7,y);
        ctx.quadraticCurveTo(x-17,y-rise*.47,x+sway,y-rise);
        ctx.quadraticCurveTo(x+17,y-rise*.52,x+8,y);
        ctx.closePath();
        ctx.fillStyle=i%3===0?'#ff633d':i%3===1?'#ff9637':'#ffca46';
        ctx.fill();
        ctx.restore();
      }
    }else if(cold){
      // Inferno: a comic-book burst and broad, separate shockwave rings.
      // The effect ends quickly and has no full-screen flash.
      ctx.save();
      ctx.globalAlpha=.56*fade;
      ctx.beginPath();
      const rays=14;
      for(let i=0;i<rays*2;i++){
        const a=-Math.PI/2+i*Math.PI/rays;
        const r=(i%2===0?78:43)*(0.65+.50*p);
        const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.closePath();ctx.fillStyle='#ff86d7';ctx.fill();
      ctx.lineWidth=4;ctx.strokeStyle='#ffe96e';ctx.stroke();
      ctx.restore();
      for(let i=0;i<16;i++){
        const a=i*TAU/16-.25;
        const inner=50+8*p,outer=75+48*p+(i%3)*9;
        ctx.save();ctx.globalAlpha=.90*fade;
        ctx.strokeStyle=starColors[i%4];ctx.lineWidth=3.5+(i%3);
        line(cx+Math.cos(a)*inner,cy+Math.sin(a)*inner,
          cx+Math.cos(a)*outer,cy+Math.sin(a)*outer,ctx.strokeStyle,ctx.lineWidth);
        ctx.restore();
      }
    }

    // Big stars are shared by all three modes. Most travel outside the hand,
    // so their movement and scale draw the eye to the raised new supply.
    const count=cold?15:hot?12:10;
    for(let i=0;i<count;i++){
      const a=-Math.PI*.86+i*TAU/count+(i%2)*.17;
      const reach=40+(i%3)*10+(cold?67:hot?54:43)*p;
      const x=cx+Math.cos(a)*reach;
      const y=cy+Math.sin(a)*reach;
      ctx.save();ctx.globalAlpha=(.75+.25*Math.sin(t*23+i))*fade;
      ctx.shadowColor=starColors[i%4];ctx.shadowBlur=cold?10:7;
      const size=(cold?32:hot?29:26)+(i%4)*3;
      label(i%4===0?'★':'✦',x,y,size*(.80+.23*pop),starColors[i%4]);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawVolunteer(t,throwing,phase,celebrationTime,held,level,fever,swapCue){
    const scene=volunteerScene(game?.config?.cityIndex||0);
    const {x,y}=scene;
    ctx.save();ctx.translate(x,y);
    let jump=0,lean=0,arm=0;
    const swapP=swapCue&&!throwing?clamp(swapCue.age/swapCue.duration,0,1):1;
    const swapPulse=swapCue&&!throwing?Math.sin(Math.PI*swapP):0;
    const isDancing=phase==='celebrate';
    if(isDancing){jump=-Math.abs(Math.sin(celebrationTime*11))*21;lean=Math.sin(celebrationTime*7)*.1;arm=Math.sin(celebrationTime*12)*.3;}
    else if(throwing){
      const p=throwing.elapsed;
      const showtime=throwing.feverAtRelease;
      lean=p<.41?Math.sin(p/.41*Math.PI)*(showtime?.39:.17):0;
      arm=p<.41?Math.sin(p/.41*Math.PI)*(showtime?1.9:.9):0;
    }
    // The volunteer gives a tiny approving nod and looks towards the new snack.
    if(swapPulse>0)lean+=.065*swapPulse;
    ctx.translate(0,jump+(fever&&!throwing?-Math.abs(Math.sin(t*11))*4:0));ctx.rotate(lean);ctx.scale(VOLUNTEER_SCALE,VOLUNTEER_SCALE);
    // Thin cream separation contour behind the dark head/torso silhouette.
    // It is attached to the character, not a spotlight over runner numbers.
    ctx.save();
    ctx.beginPath();ctx.ellipse(0,-37,28,29,0,0,TAU);
    ctx.strokeStyle='#fff9eb';ctx.lineWidth=7;ctx.stroke();
    roundedRect(-28,-19,57,56,15,null,'#fff8ed',6);
    ctx.restore();
    // Ground shadow and floppy shoes.
    ctx.fillStyle='rgba(57,78,72,.19)';ctx.beginPath();ctx.ellipse(0,56-jump*.2,30,7,0,0,TAU);ctx.fill();
    const step=isDancing?Math.sin(celebrationTime*11)*8:Math.sin(t*2)*1.3;
    line(-10,28,-12+step,52,'#54667a',10);line(12,28,13-step,52,'#54667a',10);
    line(-12+step,52,-20+step,56,'#fb9c70',9);line(13-step,52,22-step,56,'#fb9c70',9);
    // Arm reaching to the table for a snack; return to neutral after pickup.
    const reaching=throwing&&throwing.elapsed>.41 && throwing.elapsed<.74;
    if(reaching){line(-21,-3,-43,14,'#e8b68d',10);line(-43,14,-41,29,'#e8b68d',9);}
    else line(-20,-3,-29,19,'#e8b68d',10);
    roundedRect(-25,-16,51,48,13,scene.shirt,'#333d4e',4.1);
    roundedRect(-14,8,28,20,4,'#fff6d9','#344254',2.8);
    label('Volunteer',0,19,6.7,'#a05d44');
    // An extremely enthusiastic volunteer throwing arm.
    if(isDancing){
      line(20,-3,35,-25+Math.sin(celebrationTime*10)*4,'#e8b68d',9);
      line(35,-25,27,-41,'#e8b68d',8);
      line(-22,-3,-38,-30,'#e8b68d',8);
    }else if(throwing&&throwing.elapsed<.41){
      line(19,-5,28+arm*12,-29,'#e8b68d',9);
      line(28+arm*12,-29,36+arm*12,-49-(throwing.feverAtRelease?20:0),'#e8b68d',8);
      if(throwing.feverAtRelease){
        line(-24,-9,-45,-37,'#e8b68d',9);
        label('✦',-53,-49,21,'#f9d45a');
      }
    }else if(swapPulse>0){
      line(21,-4,36,-11-8*swapPulse,'#e8b68d',9);
      line(36,-11-8*swapPulse,34,-22-8*swapPulse,'#e8b68d',8);
    }else{
      line(21,-4,36,-11,'#e8b68d',9);
      line(36,-11,34,-22,'#e8b68d',8);
    }
    ctx.beginPath();ctx.ellipse(0,-37,24,25,0,0,TAU);ctx.fillStyle='#edbd91';ctx.fill();ctx.strokeStyle='#343b47';ctx.lineWidth=4.2;ctx.stroke();
    // Cartoon orange cap, outsized compared with the face.
    ctx.beginPath();ctx.arc(0,-43,24,Math.PI,TAU);ctx.lineTo(24,-40);ctx.lineTo(-24,-40);ctx.closePath();ctx.fillStyle='#eb6a57';ctx.fill();ctx.strokeStyle='#343b47';ctx.lineWidth=3.5;ctx.stroke();
    roundedRect(-24,-45,47,7,4,'#f89464','#343b47',2.8);
    const closed=isDancing;
    if(closed){
      ctx.beginPath();ctx.arc(-8,-33,4,Math.PI*1.13,Math.PI*1.87);ctx.arc(8,-33,4,Math.PI*1.13,Math.PI*1.87);ctx.strokeStyle='#514149';ctx.lineWidth=2.4;ctx.stroke();
    }else{circle(-8+2*swapPulse,-34,2.8,'#342f3a');circle(8+2*swapPulse,-34,2.8,'#342f3a');}
    ctx.strokeStyle='#ae554b';ctx.lineWidth=2.7;ctx.beginPath();
    if(isDancing){ctx.arc(0,-24,10,0,Math.PI);ctx.lineTo(-10,-24);ctx.fillStyle='#9e5045';ctx.fill();}
    else ctx.arc(0,-24,7,0,Math.PI);
    ctx.stroke();
    // Never show the previous number on the hand after release. The queue
    // advances on impact (.41s), before the new hand item appears (.55s).
    if(!isDancing && (!throwing||throwing.elapsed>.55)){
      if(swapPulse>0){
        // Draw the attention halo UNDER the hand's number, so the digits stay
        // crisp even during Fever/Inferno and on the smallest mobile viewport.
        ctx.save();
        ctx.globalAlpha=.32*swapPulse;
        circle(38,-26,48,'#ffe69a');
        ctx.globalAlpha=.72*swapPulse;
        ctx.strokeStyle='#e7a23b';ctx.lineWidth=3.5;
        ctx.beginPath();ctx.arc(38,-26,42+11*swapP,0,TAU);ctx.stroke();
        ctx.restore();
      }
      // The new item is ACTIVE immediately; the hand simply lifts and
      // enlarges it briefly. Rapid taps reset this same animation.
      drawSupply(held,38,-26-9*swapPulse,24*(1+.25*swapPulse),
        Math.sin(t*2)*.09+swapPulse*.06,true,2+.18*swapPulse);
      if(swapPulse>0){
        ctx.save();ctx.globalAlpha=.85*swapPulse;
        label('✦',38-54,-26-42,30,'#ffb73d');
        label('✦',38+68,-26-42,36,'#ffd35b');
        label('✧',38+66,-26+51,28,'#f6a966');
        ctx.restore();
      }
    }
    if(isDancing){
      for(let i=0;i<3;i++){
        const px=-34+i*35,py=-96-Math.abs(Math.sin(t*9+i))*18;
        label(i%2?'✦':'★',px,py,19,['#ffd35e','#ee7982','#7cc2bc'][i]);
      }
    }
    ctx.restore();
  }
  function drawThrownSupply(t,runners,game){
    if(t.elapsed>.41)return;
    const runner=runners.find(r=>r.id===t.runnerId);if(!runner)return;
    const f=clamp(t.elapsed/.41,0,1),endX=game.runnerX(runner);
    const endY=runner.y+runnerVisualOffset(runner)+(matches(t.supply.number,runner.number)?-12:-38)*runnerScale(runner);
    const inferno=t.feverAtRelease&&game.inferno,fever=t.feverAtRelease&&!inferno;
    const arc=t.feverAtRelease?108:68;
    const hand=volunteerHandPoint(game.config.cityIndex);
    const point=q=>[mix(hand.x,endX,q),mix(hand.y,endY,q)-Math.sin(q*Math.PI)*arc];
    const [x,y]=point(f);
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
    if(t.feverAtRelease){
      ctx.beginPath();
      for(let j=0;j<=9;j++){
        const q=Math.max(0,f-.23+j*.23/9),[px,py]=point(q);
        if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.shadowColor=inferno?'#bc77ff':'#ffc85b';ctx.shadowBlur=inferno?17:11;
      ctx.lineWidth=inferno?7:5;
      ctx.strokeStyle=inferno?'rgba(128,228,255,.65)':'rgba(255,205,99,.68)';ctx.stroke();
      ctx.shadowBlur=0;ctx.lineWidth=inferno?2.8:2;
      ctx.strokeStyle=inferno?'#ffe6b4':'#fff6db';ctx.stroke();
    }
    for(let i=t.feverAtRelease?9:3;i>=1;i--){
      const q=Math.max(0,f-i*.03),[px,py]=point(q);
      ctx.globalAlpha=(1-i/11)*(inferno?.93:fever?.76:.45);
      circle(px,py,inferno?4:fever?3:2.4,
        inferno?(i%3===0?'#ff87d9':i%2?'#ffe484':'#87dffa'):
          fever?(i%2?'#ffd763':'#fff5c9'):'#fff9d9');
    }
    ctx.restore();
    drawSupply(t.supply,x,y,t.feverAtRelease?27:20,f*TAU*(t.feverAtRelease?3:1.5),true);
  }
    function drawEffect(f){
    const p=f.age/f.life,alpha=clamp(1-p*1.2,0,1);
    ctx.save();ctx.globalAlpha=alpha;
    if(f.kind==='score'){
      const y=f.y-p*40;
      ctx.shadowColor='rgba(255,255,255,.75)';ctx.shadowBlur=5;
      const size=f.size||28,x=clamp(f.x,44,W-44),yy=Math.max(143,y);
      ctx.font="1000 "+size+"px 'Trebuchet MS',system-ui,sans-serif";
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
      ctx.strokeStyle=(game&&game.inferno)?'#302348':'#603b4d';ctx.lineWidth=5;
      ctx.strokeText(f.text,x,yy);
      label(f.text,x,yy,size,f.color);ctx.shadowBlur=0;
    }else if(f.kind==='hitRing'){
      const r=10+p*(f.tier===3?34:f.tier===2?26:19);
      ctx.beginPath();ctx.arc(f.x,f.y,r,0,TAU);ctx.lineWidth=3*(1-p)+1;
      ctx.strokeStyle=game.inferno?'#93d9ec':'#ffd97d';ctx.stroke();
    }else if(f.kind==='hitBurst'){
      // Colourful shock ring + radial rays, drawn BEFORE the runner and bib.
      const inferno=f.mode==='inferno',tier=f.tier||1;
      const r=12+p*(inferno?(tier===3?69:43):(tier===3?50:35));
      ctx.globalAlpha=alpha*(inferno?.99:.9);
      ctx.beginPath();ctx.arc(f.x,f.y,r,0,TAU);ctx.lineWidth=(inferno?6:4.5)*(1-p)+1;
      ctx.strokeStyle=inferno?'#e8d4ff':'#ffe6a0';ctx.stroke();
      const count=tier===3?16:tier===2?10:6;
      for(let i=0;i<count;i++){
        const a=i*TAU/count+i*.04;
        const d=15+r*.45,extra=(tier===3?29:tier===2?18:9)*(1-p);
        line(f.x+Math.cos(a)*d,f.y+Math.sin(a)*d,
          f.x+Math.cos(a)*(d+extra),f.y+Math.sin(a)*(d+extra),
          inferno?(i%3===0?'#ff99da':i%2?'#ffe383':'#80e5f9'):
            (i%2?'#ffc364':'#fff4b2'),tier===3?3.9:2.7);
      }
      if(tier===3 && !reducedMotion()){
        for(let i=0;i<12;i++){
          const a=i*TAU/12+p*.4,d=33+(i%3)*11+33*p;
          circle(f.x+Math.cos(a)*d,f.y+Math.sin(a)*d,4.6*(1-p)+1,
            inferno?(i%2?'#f5a2e4':'#80dced'):'#ffd87c');
        }
      }
    }else if(f.kind==='spark'){
      for(let i=0;i<7;i++){
        const angle=TAU*i/7+p*.7;
        label('✦',f.x+Math.cos(angle)*p*45,f.y+Math.sin(angle)*p*38,13+p*4,i%2?'#fff7cf':'#ffd25e');
      }
    }else if(f.kind==='rays'){
      for(let i=0;i<12;i++){const angle=TAU*i/12+p*.4;line(f.x+Math.cos(angle)*18,f.y+Math.sin(angle)*18,f.x+Math.cos(angle)*(36+32*p),f.y+Math.sin(angle)*(34+31*p),i%2?'#fff7a0':'#ffcd69',4.4);}
    }else if(f.kind==='feverEntry'||f.kind==='feverEnd'){
      const size=(f.text==='INFERNO!'?34:31)+4*Math.sin(Math.PI*Math.min(1,p));
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(Math.sin(p*22)*.08);
      const bw=f.text==='INFERNO!'?216:188;
      roundedRect(-bw/2,-32,bw,64,17,f.text==='INFERNO!'?'#6332a2':f.kind==='feverEntry'?'#ffe479':'#d3cee9',
        f.text==='INFERNO!'?'#ffdb70':'#aa3d78',4);
      if(f.kind==='feverEntry'){
        for(let i=0;i<8;i++){
          const a=i*TAU/8;
          line(Math.cos(a)*(bw/2+6),Math.sin(a)*39,
            Math.cos(a)*(bw/2+21),Math.sin(a)*52,
            f.text==='INFERNO!'?'#e8a0ff':'#ffd17c',3);
        }
      }
      label(f.text,0,2,size,f.text==='INFERNO!'?'#fff1ba':f.kind==='feverEntry'?'#ad4470':'#5f4775');
      ctx.restore();
    }else if(f.kind==='jumpShout'){
      ctx.translate(f.x,f.y-p*26);
      ctx.rotate(Math.sin(p*20)*.08);
      roundedRect(-92,-23,184,43,12,'#ffe364','#d84386',4);
      label('✦ '+f.text+' ✦',0,-1,18,'#a92874');
    }else if(f.kind==='heavyImpact'){
      ctx.beginPath();ctx.arc(f.x,f.y,12+38*p,0,TAU);
      ctx.strokeStyle='#ffe38b';ctx.lineWidth=4*(1-p);ctx.stroke();

      }else if(f.kind==='feverConfetti'){
      for(let i=0;i<23;i++){
        const a=TAU*(i/23),d=16+p*(48+(i%4)*15);
        ctx.save();ctx.translate(f.x+Math.cos(a)*d,f.y+Math.sin(a)*d);ctx.rotate(p*9+i);
        ctx.fillStyle=['#fcd45d','#eb83b9','#86cae7','#aee29e'][i%4];ctx.fillRect(-4,-7,8,14);ctx.restore();
      }
    }else if(f.kind==='combo'){
      const bw=Math.max(130,f.text.length*10+22),x=clamp(f.x,bw/2+7,W-bw/2-7),y=Math.max(159,f.y-p*31);
      roundedRect(x-bw/2,y-17,bw,33,13,'#ffe271','#d4814c',2.6);label(f.text,x,y-1,17,'#b65043');
    }else if(f.kind==='bonk'){
      for(let i=0;i<5;i++){
        const a=TAU*i/5;label(i%2?'★':'✴',f.x+Math.cos(a)*(13+p*25),f.y+Math.sin(a)*(12+p*25),20,'#f9de75');
      }
    }else if(f.kind==='bubble'){
      const bw=Math.max(77,f.text.length*9.4+17),x=clamp(f.x,55,W-55),y=Math.max(155,f.y-p*25);
      roundedRect(x-bw/2,y-19,bw,32,12,f.fever?'#ffe2f6':'#fffce8',f.fever?'#a22d8f':'#4e6470',f.fever?3.5:2);
      label(f.text,x,y-2,12,f.fever?'#912273':'#46616b');
    }
    ctx.restore();
  }
  function drawFeverLights(game){
    const t=game.sceneTime,theme=SCENE_THEMES[CITIES[game.config.cityIndex].id],rm=reducedMotion();
    ctx.save();
    ctx.fillStyle='rgba(255,218,132,.09)';ctx.fillRect(0,138,W,H-138);
    ctx.globalCompositeOperation='screen';
    for(const side of [-1,1]){
      ctx.beginPath();
      for(let y=153;y<=650;y+=8){
        const x=roadCenter(y)+side*(roadHalfWidth(y)+4);
        if(y===153)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.globalAlpha=.4+(rm?0:.14*Math.sin(t*5));
      ctx.strokeStyle=side<0?'#ffe6a0':theme[4];ctx.lineWidth=5;
      ctx.shadowBlur=15;ctx.shadowColor='#f6b65e';ctx.stroke();ctx.shadowBlur=0;
    }
    if(!rm)for(let i=0;i<11;i++){
      const y=148+(i*49+t*43)%410,x=i%2?W-14:12;
      ctx.globalAlpha=.35+.27*Math.sin(t*3+i);
      cityPoly([[x,y-6],[x+5,y],[x,y+6],[x-5,y]],i%3===0?theme[4]:i%2?'#ffd77d':'#fff6d9');
    }
    ctx.restore();
  }
  function drawInfernoLights(game){
    const t=game.sceneTime,theme=SCENE_THEMES[CITIES[game.config.cityIndex].id],rm=reducedMotion();
    ctx.save();
    ctx.fillStyle='rgba(17,8,42,.145)';ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='screen';
    const colors=[theme[4],'#ffe88b','#80d9f6','#ef7fc1'];
    for(let i=0;i<4;i++){
      const x=37+i*103,ex=x+(rm?0:Math.sin(t*TAU/2.4+i*1.5)*130);
      const g=ctx.createLinearGradient(x,83,ex,580);
      g.addColorStop(0,colors[i]);g.addColorStop(.26,colors[i]);g.addColorStop(1,'rgba(40,20,92,0)');
      ctx.globalAlpha=rm?.13:.18+.07*Math.sin(t*2.2+i);
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,82);
      ctx.lineTo(ex-70,620);ctx.lineTo(ex+70,620);ctx.closePath();ctx.fill();
    }
    for(const side of [-1,1]){
      ctx.beginPath();
      for(let y=155;y<=660;y+=8){
        const x=roadCenter(y)+side*(roadHalfWidth(y)+5);
        if(y===155)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.globalAlpha=.63;ctx.strokeStyle=side<0?'#f8c96b':'#b17af3';
      ctx.lineWidth=4;ctx.shadowBlur=15;ctx.shadowColor='#c369f2';ctx.stroke();ctx.shadowBlur=0;
    }
    for(let i=0;i<12;i++){
      const x=i%2?W-12:12,y=160+i*33;
      ctx.globalAlpha=rm?.5:.55+.4*Math.sin(t*5+i);
      circle(x,y,3.3,colors[i%4]);
    }
    ctx.restore();
  }
    function drawInfernoOverlay(game){
    const t=game.sceneTime,rm=reducedMotion();
    ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<4;i++){
      const x=i%2?W-13:13,y=i<2?169:602;
      ctx.globalAlpha=rm?.6:.57+.2*Math.sin(t*4.2+i);
      for(let j=0;j<6;j++){
        const a=j*TAU/6+(rm?0:t*.35);
        line(x+Math.cos(a)*5,y+Math.sin(a)*5,
          x+Math.cos(a)*17,y+Math.sin(a)*17,j%2?'#ffe38a':'#d685fa',3);
      }
    }
    ctx.restore();
  }
  function drawFeverFrame(game){
    const t=game.sceneTime,inferno=game.inferno,rm=reducedMotion();
    const theme=SCENE_THEMES[CITIES[game.config.cityIndex].id];
    const pulse=rm?1:.88+.12*Math.sin(t*TAU/(inferno?1.7:.85));
    const primary=inferno?'#ffe884':'#ffe9a3',secondary=inferno?'#b569f7':theme[4];
    ctx.save();ctx.globalAlpha=.94;ctx.shadowColor=secondary;ctx.shadowBlur=inferno?21:14;
    roundedRect(6,7,W-12,H-14,20,null,primary,(inferno?6:5)*pulse);
    ctx.shadowBlur=0;roundedRect(14,15,W-28,H-30,16,null,secondary,inferno?3.6:2.7);
    for(let side=0;side<2;side++){
      const edge=side?W-2:2,dir=side?-1:1;
      for(let i=0;i<10;i++){
        const y=155+(i*61+(rm?0:t*(inferno?78:62))%61);
        ctx.globalAlpha=.38+.19*pulse;
        cityPoly([[edge,y-15],[edge+dir*(inferno?26:22),y-4],[edge+dir*5,y+12]],
          i%3===0?primary:i%3===1?secondary:inferno?'#81e4fb':'#f8b86b');
      }
      for(let i=0;i<5;i++){
        const y=185+i*94,x=side?W-17:17;
        ctx.globalAlpha=.72;ctx.save();ctx.translate(x,y);
        if(!rm)ctx.rotate(Math.sin(t*3+i)*.11);
        ctx.fillStyle=i%2?primary:secondary;ctx.beginPath();
        for(let j=0;j<8;j++){
          const a=j*TAU/8,r=j%2?4:inferno?13:11;
          if(j===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
          else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
        }
        ctx.closePath();ctx.fill();ctx.restore();
      }
    }
    ctx.restore();
  }
    function drawCountdown(text,isGo){
    ctx.fillStyle=isGo?'rgba(255,236,158,.16)':'rgba(26,55,66,.24)';ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(W/2,H/2-17);
    if(!isGo){circle(0,0,83,'#fff5c9','#304f54',5);label(text,0,6,100,'#eb7f58');}
    else {roundedRect(-125,-64,250,119,23,'#fff6ce','#4f686b',5);label('GO!',0,0,85,'#ec7453');}
    ctx.restore();
  }
  function drawPause(){
    ctx.fillStyle='rgba(29,49,64,.63)';ctx.fillRect(0,0,W,H);
    roundedRect(48,255,W-96,164,22,'#fff8e3','#364d57',4);
    label('PAUSED!',W/2,303,42,'#e87f55');label('TAP THIS PANEL TO RESUME',W/2,360,14,'#546c76');
  }

  /* ---------- User interface ---------- */
  // Unlock and notification are separate states. A race win changes best[]
  // only. On EVERY entry into the level selector (including a fresh launch)
  // we check the saved stamps, then persist city access before showing
  // invitations. If the app closes before acknowledgement, the dialog returns.
  function reconcileCityUnlocks(){
    if(debugMode)return;
    const eligible=cityUnlockedCount(prefs.best);
    if(eligible>unlockedCities){
      unlockedCities=eligible;
      savePrefs();
    }
  }
  function nextPendingCityInvitation(){
    if(debugMode)return null;
    for(let index=1;index<unlockedCities;index++){
      if(!prefs.invitationsAcknowledged.includes(index))return index;
    }
    return null;
  }
  function showPendingCityInvitation(){
    if(debugMode || !$('gameScreen').classList.contains('hidden'))return;
    const index=nextPendingCityInvitation();
    const overlay=$('cityInvitationOverlay');
    if(index===null){
      invitationOpenIndex=null;
      overlay.classList.add('hidden');
      return;
    }
    const city=CITIES[index];
    invitationOpenIndex=index;
    const art=$('cityInvitationPostcard');
    art.style.setProperty('--city-color',city.color);
    art.style.setProperty('--city-sky',city.sky);
    $('cityInvitationNumber').textContent=`${String(index+1).padStart(2,'0')} / 10`;
    $('cityInvitationIcon').textContent=city.icon;
    $('cityInvitationLandmark').textContent=city.landmark;
    $('cityInvitationName').textContent=city.name;
    $('cityInvitationSubtitle').textContent=city.subtitle;
    const invitationCityName=city.name.toLowerCase().replace(/\b\w/g,ch=>ch.toUpperCase());
    $('cityInvitationText').textContent=
      `You've received a special invitation from the ${invitationCityName} Marathon Organising Committee! They'd love you to serve at their races.`;
    $('cityInvitationVisit').textContent=`VISIT ${city.name} ➜`;
    overlay.classList.remove('hidden');
    $('cityInvitationVisit').focus({preventScroll:true});
  }
  function acknowledgeCityInvitation(visit){
    if(invitationOpenIndex===null)return;
    const index=invitationOpenIndex;
    if(!prefs.invitationsAcknowledged.includes(index)){
      prefs.invitationsAcknowledged.push(index);
      savePrefs(); // Ack is durable; no repeat after a restart.
    }
    invitationOpenIndex=null;
    $('cityInvitationOverlay').classList.add('hidden');
    if(visit){
      selectedCity=index;
      selected=index*10+1;
      savePrefs();
      renderLevelGrid();
    }
    // If a previously played save has more than one pending city, deliver
    // all postcards one at a time, always on the selection screen.
    showPendingCityInvitation();
  }

  function renderLevelGrid(){
    selectedCity=clamp(selectedCity,0,debugMode?9:unlockedCities-1);
    if(!isOpen(selected))selected=selectedCity*10+1;
    const complete=LEVELS.filter(cfg=>isWon(cfg.level)).length;
    $('progressBadge').textContent=`${complete} / 100 won`;
    const map=$('cityMap'),previousScroll=map.scrollLeft;map.innerHTML='';
    $('exitDebugBtn').classList.toggle('hidden',!debugMode);
    $('debugIndicator').classList.toggle('hidden',!debugMode);
    CITIES.forEach((city,idx)=>{
      const open=debugMode||idx<unlockedCities,done=cityCleared(prefs.best,idx),active=idx===selectedCity;
      const b=document.createElement('button');b.type='button';b.disabled=!open;
      b.className=`city-stop ${active?'chosen':''} ${open?'open':'locked'} ${done===10?'complete':''}`;
      b.style.setProperty('--city-color',city.color);
      b.style.setProperty('--city-sky',city.sky);
      b.setAttribute('aria-label',`${city.name}, city ${idx+1}, ${done} of 10 races won${open?', available':', locked'}`);
      b.setAttribute('aria-pressed',String(active));
      const num=String(idx+1).padStart(2,'0');
      b.innerHTML=`<span class="city-route-dot" aria-hidden="true">●</span>
        <span class="city-postcard"><span class="city-postmark">${num} / 10</span><span class="city-emblem">${open?city.icon:'🔒'}</span>
        <span class="city-skyline">${city.landmark}</span></span>
        <span class="city-name">${city.name}</span><span class="city-country">${open?city.subtitle:'Earn 9 stamps in the previous city'}</span>
        <span class="city-status">${debugMode?'🛠 DEBUG':!open?'🔒 LOCKED':done===10?'★ STAMPED':`${done} / 10 STAMPS`}</span>`;
      if(open)b.addEventListener('click',()=>{
        selectedCity=idx;
        if(Math.floor((selected-1)/10)!==idx)selected=idx*10+1;
        savePrefs();renderLevelGrid();
        $('cityDetail').scrollIntoView({behavior:'smooth',block:'nearest'});
      });
      map.appendChild(b);
    });
    map.scrollLeft=previousScroll;
    const city=CITIES[selectedCity],stamps=cityCleared(prefs.best,selectedCity);
    $('cityDetail').style.setProperty('--city-color',city.color);
    $('cityDetail').style.setProperty('--city-sky',city.sky);
    $('citySymbol').textContent=city.icon;
    $('cityCaption').textContent=`CITY ${String(selectedCity+1).padStart(2,'0')} / 10 · ${city.country}`;
    $('cityTitle').textContent=city.name;
    $('citySubtitle').textContent=city.subtitle;
    $('cityStamp').innerHTML=`${stamps} / 10<br>STAMPS`;
    $('cityEventRange').textContent='01 — 10';
    const g=$('levelGrid');g.innerHTML='';
    for(let i=0;i<10;i++){
      const cfg=LEVELS[selectedCity*10+i],won=isWon(cfg.level);
      const b=document.createElement('button');b.type='button';
      b.className=`level-tile ${selected===cfg.level?'selected':''} ${won?'won':''}`;
      b.setAttribute('aria-label',`${CITIES[selectedCity].name} race ${i+1}, ${cfg.seconds} seconds, ${cfg.raceBand.toLowerCase()}, ${won?'won':'not yet won'}`);
      b.setAttribute('aria-pressed',String(selected===cfg.level));
      b.innerHTML=`<span class="tile-star">${won?'★':'✦'}</span><span class="tile-name">${cfg.raceBand.split(' ')[0]}</span><span class="tile-number">${String(i+1).padStart(2,'0')}</span><span class="tile-detail">${cfg.seconds} SEC</span>`;
      b.addEventListener('click',()=>{
        selected=cfg.level;
        if(!recordRaceTap(i+1))renderLevelGrid();
      });
      g.appendChild(b);
    }
    renderSelection();
  }
  function renderSelection(){
    const cfg=LEVELS[selected-1];
    $('selectedTitle').textContent=`RACE ${String(cfg.event).padStart(2,'0')} · ${CITIES[cfg.cityIndex].name}`;
    $('selectedMeta').textContent=`${cfg.raceBand} · ${cfg.runners} runners · ${cfg.seconds} sec · ${cfg.minMatches===cfg.maxMatches?cfg.minMatches:`${cfg.minMatches}–${cfg.maxMatches}`} matches · supply 2–${cfg.supplyMax}`;
  }
  function sizeScene(){
    const screen=$('gameScreen'), app=$('app');
    const result=$('resultOverlay');
    if(result.parentElement!==document.body){
      document.body.appendChild(result);
      result.classList.add('mobile-fullscreen');
    }
    if(app.classList.contains('in-game')){
      const vv=window.visualViewport;
      app.style.setProperty('--game-height',Math.floor(vv?vv.height:window.innerHeight)+'px');
      const style=getComputedStyle(screen);
      const gap=parseFloat(style.rowGap||style.gap)||0;
      const landscape=window.innerWidth>window.innerHeight && window.innerHeight<620 && window.innerWidth>=560;
      const parts=[screen.querySelector('.scoreboard'),$('comboPanel'),screen.querySelector('.game-control-strip')];
      const border=stage.offsetWidth-stage.clientWidth;
      const maxHeight=landscape?screen.clientHeight:screen.clientHeight-parts.reduce((sum,part)=>sum+part.getBoundingClientRect().height,0)-gap*3;
      const maxWidth=landscape?Math.max(1,screen.clientWidth-Math.min(300,Math.max(245,screen.clientWidth*.4))-gap):screen.clientWidth;
      stage.style.width=Math.max(1,Math.floor(Math.min(maxWidth,(maxHeight-border)*W/H+border)))+'px';
    }
    const ratio=Math.min(window.devicePixelRatio||1,2.5);
    if(canvas.width!==Math.round(W*ratio)||canvas.height!==Math.round(H*ratio)){
      canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);
    }
    pixelRatio=ratio;
  }
  let pixelRatio=1;
  // Fullscreen is shared between level selection and gameplay. Browser
  // policy requires a user gesture to enter, but switching screens does not
  // change this mode; use the two dedicated buttons to toggle it.
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
  let installPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
  function enterRaceFullscreen(){
    if(standalone())return;
    const root=document.documentElement;
    if(document.fullscreenElement||document.webkitFullscreenElement)return;
    const request=root.requestFullscreen||root.webkitRequestFullscreen;
    if(!request)return; // Local file browsers and iOS Safari may not support it.
    try{
      const pending=request.call(root,{navigationUI:'hide'});
      if(pending&&typeof pending.catch==='function')pending.catch(()=>{});
    }catch(_){
      // Unsupported fullscreen options should not prevent starting a race.
      try{
        const pending=request.call(root);
        if(pending&&typeof pending.catch==='function')pending.catch(()=>{});
      }catch(__){}
    }
  }
  function leaveRaceFullscreen(){
    if(!document.fullscreenElement&&!document.webkitFullscreenElement)return;
    const exit=document.exitFullscreen||document.webkitExitFullscreen;
    if(!exit)return;
    try{
      const pending=exit.call(document);
      if(pending&&typeof pending.catch==='function')pending.catch(()=>{});
    }catch(_){}
  }
  function fullscreenIsActive(){
    return !!(document.fullscreenElement||document.webkitFullscreenElement);
  }
  function updateFullscreenButtons(){
    const active=fullscreenIsActive();
    for(const id of ['menuFullscreenBtn','gameFullscreenBtn']){
      const button=$(id);
      button.textContent=standalone()?'✓':active?'❐':'⛶';
      if(standalone()){button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Installed app');button.title='Installed app';continue;}
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');
      button.title=active?'Exit fullscreen':'Enter fullscreen';
    }
  }
  function toggleFullscreen(){
    if(standalone())return;
    if(fullscreenIsActive())leaveRaceFullscreen();
    else if(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen)enterRaceFullscreen();
    else if(installPrompt){installPrompt.prompt();installPrompt=null;}
    else window.alert('For a larger screen, open the browser share or menu and choose Add to Home Screen or Install app.');
  }
  function showMenu(){
    // Keep fullscreen active when returning to level selection.
    resetPasswordQueue();
    game=null;stage.style.transform='';stage.classList.remove('fever-active','inferno-active');$('app').classList.remove('in-game');$('gameScreen').classList.add('hidden');$('menuScreen').classList.remove('hidden');
    $('resultOverlay').classList.add('hidden');
    reconcileCityUnlocks();
    renderLevelGrid();window.scrollTo({top:0,behavior:'instant'});
    showPendingCityInvitation();
  }
  function startLevel(level){
    if(!isOpen(level))return;
    resetPasswordQueue();
    stage.style.transform='';selected=level;selectedCity=Math.floor((level-1)/10);savePrefs();lastHudText='';
    $('menuScreen').classList.add('hidden');$('gameScreen').classList.remove('hidden');$('app').classList.add('in-game');
    sizeScene();game=new Marathon(LEVELS[level-1],randSeed());
    requestAnimationFrame(sizeScene);
    $('matchHint').textContent='Tap a runner to throw.';
    window.scrollTo({top:0,behavior:'instant'});
    audio.audio; // Unlock audio in direct response to Start click (mobile browsers).
  }
  function updateMatchHint(hint){$('matchHint').textContent=hint;}
  function showMessage(str,duration=700){
    if(toastTimeout)clearTimeout(toastTimeout);
    const el=$('gameMessage');el.textContent=str;el.classList.add('show');
    toastTimeout=setTimeout(()=>el.classList.remove('show'),duration);
  }
  function doPrimaryResult(){
    if(!game)return;
    const action=$('resultPrimary').dataset.action;
    if(action==='next')startLevel(Number($('resultPrimary').dataset.next));
    else startLevel(game.config.level);
  }
  function setDebugMode(enabled){
    debugMode=Boolean(enabled);
    resetPasswordQueue();
    if(!debugMode){
      selectedCity=clamp(selectedCity,0,unlockedCities-1);
      selected=selectedCity*10+1;
      savePrefs();
    }
    renderLevelGrid();
  }
  $('cityInvitationVisit').addEventListener('click',()=>acknowledgeCityInvitation(true));
  $('cityInvitationLater').addEventListener('click',()=>acknowledgeCityInvitation(false));
  $('exitDebugBtn').addEventListener('click',()=>setDebugMode(false));
  $('startBtn').addEventListener('click',()=>{
    // Already fullscreen? No redundant request. Otherwise this user click
    // supplies the transient activation required by Fullscreen API.
    enterRaceFullscreen();
    startLevel(selected);
  });
  $('menuFullscreenBtn').addEventListener('click',toggleFullscreen);
  $('gameFullscreenBtn').addEventListener('click',toggleFullscreen);
  $('levelsBtn').addEventListener('click',showMenu);
  $('backBtn').addEventListener('click',showMenu);
  $('retryBtn').addEventListener('click',()=>game&&startLevel(game.config.level));
  $('resultPrimary').addEventListener('click',doPrimaryResult);
  $('pauseBtn').addEventListener('click',()=>game&&game.pause());
  $('restartBtn').addEventListener('click',()=>game&&startLevel(game.config.level));
  $('soundBtn').addEventListener('click',()=>{
    prefs.sound=!prefs.sound;audio.enabled=prefs.sound;savePrefs();updateSoundIcon();
  });
  function updateSoundIcon(){
    $('soundBtn').textContent=prefs.sound?'🔊':'🔇';
    const action=prefs.sound?'off':'on';$('soundBtn').title=`Turn sound ${action}`;$('soundBtn').setAttribute('aria-label',`Turn sound ${action}`);
  }
  canvas.addEventListener('pointerdown',ev=>{
    if(!game)return;
    ev.preventDefault();const bounds=canvas.getBoundingClientRect();
    const x=(ev.clientX-bounds.left)/bounds.width*W,y=(ev.clientY-bounds.top)/bounds.height*H;
    if(game.phase==='paused'){
      if(x>=48&&x<=W-48&&y>=255&&y<=419)game.pause();
      return;
    }
    if(game.trySwap(x,y))return;
    game.tryThrow(x,y);
  });
  window.addEventListener('resize',sizeScene);
  if(window.visualViewport)window.visualViewport.addEventListener('resize',sizeScene);
  // Fullscreen changes the visible phone height even without a normal resize.
  for(const eventName of ['fullscreenchange','webkitfullscreenchange']){
    document.addEventListener(eventName,()=>{
      updateFullscreenButtons();
      sizeScene();requestAnimationFrame(sizeScene);
    });
  }
  if(window.ResizeObserver){
    const hudObserver=new ResizeObserver(()=>{if($('app').classList.contains('in-game'))sizeScene();});
    for(const el of [document.querySelector('.scoreboard'),$('comboPanel'),document.querySelector('.game-control-strip')]){
      if(el)hudObserver.observe(el);
    }
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game&&(game.phase==='playing'||game.phase==='countdown'))game.pause();});
  document.addEventListener('keydown',ev=>{
    if(ev.code==='Escape' &&game&&game.phase==='paused'){game.pause();}
    else if((ev.code==='Space'||ev.code==='KeyP')&&game&&['playing','paused','countdown'].includes(game.phase)){
      if(ev.target===document.body){ev.preventDefault();game.pause();}
    }
  });
  function frame(time){
    const dt=Math.min(.05,Math.max(0,(time-prevFrame)/1000));prevFrame=time;
    if(game){try{game.update(dt);game.draw();}catch(e){console.error('Game error:',e);showMessage('Oops! Please restart this level.',3500);game.phase='paused';}}
    requestAnimationFrame(frame);
  }
  reconcileCityUnlocks();
  renderLevelGrid();updateSoundIcon();updateFullscreenButtons();sizeScene();requestAnimationFrame(frame);
  showPendingCityInvitation();

  // Debug mode is hidden in the race-tile sequence and never persists progress.
  window.SnackDashDebug={getGame:()=>game,getPrefs:()=>({...prefs}),getUnlockedCities:()=>unlockedCities,
    getVolunteerScene:cityIndex=>({...volunteerScene(cityIndex),hand:volunteerHandPoint(cityIndex)}),
    getSelectedCity:()=>selectedCity,isDebug:()=>debugMode,setDebug:setDebugMode,
    getPendingInvitation:()=>invitationOpenIndex,
    getFullscreenState:fullscreenIsActive,
    reconcileCityUnlocks,showPendingCityInvitation,
    getTraffic:()=>game?{laneChanges:game.traffic.laneChanges,yields:game.traffic.yields,
      replans:game.traffic.replans,overlaps:game.traffic.overlaps(),
      runners:game.runners.map(r=>({id:r.id,y:r.y,lane:r.lane,laneIndex:r.laneIndex,
        targetLaneIndex:r.targetLaneIndex,desiredSpeed:game.traffic.speed(r),speed:r.speed,successes:r.successes}))}:null};
})();
