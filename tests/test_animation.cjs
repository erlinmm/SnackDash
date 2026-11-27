const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../src/landscape/animation.js');
const frame=(image,durationMs,mark)=>({image,durationMs,...(mark?{marks:[mark]}:{})});
const clip=(frames,playback='once',next)=>({frames,playback,...(next?{next}:{})});

test('arbitrary frame durations, repeated and clamped clips',()=>{
 const c=clip([frame('a',60),frame('b',140),frame('c',25)],'loop');
 assert.equal(A.duration(c),225);
 assert.equal(A.sample(c,59).frame.image,'a');
 assert.equal(A.sample(c,60).frame.image,'b');
 assert.equal(A.sample(c,201).frame.image,'c');
 assert.equal(A.sample(c,225).frame.image,'a');
 assert.equal(A.sample(c,999,false).frame.image,'c');
});

test('per-mode variants, priorities, complete chained reaction, base restoration',()=>{
 const lib={run:clip([frame('r',70),frame('r2',90)],'loop'),
   catch:clip([frame('c1',40),frame('c2',60)],'once','thanks'),
   cheer:clip([frame('t1',70),frame('t2',80)]),pain:clip([frame('p',120)])};
 const set={id:'runner',modes:Object.fromEntries(['normal','fever','inferno'].map(m=>[m,{run:'run',catch:'catch',thanks:'cheer',pain:'pain'}]))};
 const a=new A.ActorPlayer(lib,set,'run',5);
 a.start('catch','fever',0,{item:'water'},{priority:40});
 assert.equal(a.pose('fever',50).frame.image,'c2');
 assert.equal(a.start('pain','normal',51,{}, {priority:1}),false);
 a.update(100);
 assert.equal(a.pose('normal',105).frame.image,'t1');
 a.update(195);
 assert.equal(a.pose('normal',195).frame.image,'t2');
 a.update(251);
 assert.equal(a.pose('normal',251).action,'run');
});

test('marker-dependent climb, kick and prop motion with variable frame counts',()=>{
 for(const n of [2,5,11]){
  const lib={climb:clip([...Array.from({length:n-1},(_,i)=>frame('step'+i,25+i*10)),frame('table',80,'contact')]),
    kick:clip([frame('ready',30),frame('kick',90,'kick')])};
  const spec={tracks:[
    {id:'climb',type:'clip',target:'staff',clip:'climb',start:0},
    {id:'rise',type:'tween',target:'staff',start:0,end:{track:'climb',marker:'contact'},to:{elevation:1}},
    {id:'kick',type:'clip',target:'staff',clip:'kick',start:{track:'climb',marker:'contact'}},
    {id:'fly',type:'tween',target:'bottle',start:{track:'kick',marker:'kick'},durationMs:90,to:{position:[120,240]},finish:{visible:false}}
  ]};
  const state={staff:{elevation:0},bottle:{position:[10,10],visible:true}};
  const marks=[];
  const timeline=new A.Timeline(spec,t=>({id:t.clip,clip:lib[t.clip]}),state,e=>marks.push({...e,elevation:state.staff.elevation,position:[...state.bottle.position]}));
  const contact=A.markerTime(lib.climb,'contact');
  timeline.advance(contact-1);
  assert.equal(state.bottle.visible,true);
  assert.deepEqual(state.bottle.position,[10,10]);
  assert.ok(state.staff.elevation<1);
  timeline.advance(1);
  assert.equal(state.staff.elevation,1);
  assert.equal(timeline.pose('staff').clip,lib.kick);
  timeline.advance(30);
  assert.deepEqual(marks.map(x=>x.marker),['contact','kick']);
  assert.ok(marks.every(x=>x.elevation===1));
  assert.deepEqual(marks[0].position,[10,10]);
  timeline.advance(90);
  assert.equal(state.bottle.visible,false);
  assert.equal(timeline.done,true);
 }
});

test('cancel preserves in-flight transforms; recovery can restore without duplication',()=>{
 const v={bottle:{position:[0,0],visible:true,atHome:true,attach:null}};
 const a=new A.Timeline({tracks:[{id:'fly',type:'tween',target:'bottle',start:0,durationMs:100,to:{position:[100,100]}}]},()=>{},v);
 a.advance(40);a.cancel();assert.deepEqual(v.bottle.position,[40,40]);
 const b=new A.Timeline({tracks:[
   {id:'grab',type:'set',target:'bottle',start:0,values:{attach:{target:'staff',anchor:'prop'},atHome:false}},
   {id:'lower',type:'set',target:'bottle',start:50,values:{attach:null}},
   {id:'place',type:'tween',target:'bottle',start:50,durationMs:50,to:{position:[10,10]},finish:{atHome:true}}
 ]},()=>{},v,()=>{},()=>[80,30]);
 b.advance(50);assert.deepEqual(v.bottle.position,[80,30]);assert.equal(v.bottle.attach,null);
 b.advance(50);assert.deepEqual(v.bottle.position,[10,10]);assert.equal(v.bottle.atHome,true);
});

test('missing marker fails before executing a transition',()=>{
 const c=clip([frame('a',80)]);
 assert.throws(()=>A.compileTimeline({tracks:[
  {id:'a',type:'clip',target:'staff',start:0,clip:'a'},
  {id:'b',type:'set',target:'bottle',start:{track:'a',marker:'missing'},values:{}}
 ]},()=>({id:'a',clip:c})),/Expected one marker/);
});

test('miss effects select the previous mode even when combo resets',()=>{
 const e={type:'miss',modeBefore:'inferno',modeAfter:'normal',combo:0,delta:0};
 assert.equal(A.eventMode({mode:'before'},e,'normal'),'inferno');
 assert.ok(A.matches({event:'miss',mode:'before',modes:['inferno']},e,'normal'));
 assert.equal(A.matches({event:'miss',mode:'before',modes:['normal']},e,'normal'),false);
});
