'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const math = require('../src/js/math.js');

test('all 100 races generate selectable legal supplies and runner bibs', () => {
  assert.equal(math.LEVELS.length, 100);
  for (const cfg of math.LEVELS) {
    const director = new math.NumberDirector(cfg, math.seededRandom(cfg.level*2143+13));
    const {numbers,held} = director.createLineup();
    const supplies = director.createSupplies(numbers,held);
    assert.ok(numbers.length >= 6 && numbers.length <= 8, `runners: ${cfg.level}`);
    assert.ok(numbers.every(n => math.legalBib(n,cfg)), `bibs: ${cfg.level}`);
    assert.ok(director.check(numbers,[supplies.held,...supplies.queue]), `supplies: ${cfg.level}`);
    assert.ok(numbers.some(n => math.matches(n,supplies.held.number)), `held: ${cfg.level}`);
    if (cfg.event === 10) assert.equal(cfg.supplyMax,13);
  }
});

test('race lengths are 40 / 60 / 90 / 120 seconds', () => {
  for (const cfg of math.LEVELS) {
    assert.equal(cfg.seconds, cfg.event<=3?40:cfg.event<=6?60:cfg.event<=9?90:120);
  }
});

test('arithmetic and learning rules match known examples', () => {
  assert.equal(math.matches(7,56),true);
  assert.equal(math.matches(7,57),false);
  assert.equal(math.transformRunnerNumber(98,7),14);
  assert.equal(math.transformRunnerNumber(3,12),36);
  assert.equal(math.pairDifficultyScore(7,196).level,4);
  assert.ok(math.pairDifficultyScore(5,250).level<=2);
});

test('Normal, Fever and Inferno apply the agreed Combo and repeat-hit multipliers', () => {
  const modes=[
    {combo:2,fever:false,base:3,runnerBase:2},
    {combo:5,fever:true,base:6**2,runnerBase:3},
    {combo:10,fever:true,base:11**2*(11-9),runnerBase:4}
  ];
  for(const {combo,fever,base,runnerBase} of modes){
    for(let successes=0;successes<6;successes++){
      const outcome=math.resolveHit(combo,fever,successes,true);
      const expectedMultiplier=runnerBase**successes;
      assert.equal(outcome.runnerMultiplier,expectedMultiplier);
      assert.equal(outcome.delta,base*expectedMultiplier);
    }
  }
  // Fourth, fifth and sixth hits keep multiplying: no artificial cap.
  assert.deepEqual([3,4,5].map(s=>math.resolveHit(10,true,s,true).runnerMultiplier),[64,256,1024]);
  // Threshold hits already use the newly activated mode.
  assert.equal(math.resolveHit(4,false,0,true).delta,25);
  assert.equal(math.resolveHit(4,false,2,true).delta,225);
  assert.equal(math.resolveHit(9,true,0,true).delta,100);
  assert.equal(math.resolveHit(9,true,2,true).delta,1600);
  assert.equal(math.resolveHit(9,true,2,true).infernoActivated,true);
  // 20 unique runners, followed by three hits on a new runner at Combo 21–23.
  let combo=0,fever=false,score=0;
  for(let hit=0;hit<20;hit++){
    const outcome=math.resolveHit(combo,fever,0,true);
    score+=outcome.delta;combo=outcome.combo;fever=outcome.fever;
  }
  assert.equal(score,19075);
  const rewards=[];
  for(let successes=0;successes<3;successes++){
    const outcome=math.resolveHit(combo,fever,successes,true);
    rewards.push(outcome.delta);score+=outcome.delta;
    combo=outcome.combo;fever=outcome.fever;
  }
  assert.deepEqual(rewards,[5292,25168,118496]);
  assert.equal(score,168031);
  // 30 unique successful runners are worth 131,935 total.
  combo=0;fever=false;score=0;
  for(let hit=0;hit<30;hit++){
    const outcome=math.resolveHit(combo,fever,0,true);
    score+=outcome.delta;combo=outcome.combo;fever=outcome.fever;
  }
  assert.equal(score,131935);
  // An incorrect hit still ends Combo; powered-up misses have no point penalty.
  assert.equal(math.resolveHit(12,true,3,false).delta,0);
  assert.equal(math.resolveHit(12,true,3,false).combo,0);
});

test('each next city becomes eligible after 9 wins, not 8 or all 10', () => {
  const best={};
  for(let i=1;i<=8;i++)best[i]=10;
  assert.equal(math.cityCleared(best,0),8);
  assert.equal(math.cityUnlockedCount(best),1);
  best[9]=10;
  assert.equal(math.cityCleared(best,0),9);
  assert.equal(math.cityUnlockedCount(best),2);
  assert.equal(best[10],undefined,'10th race is still not won');
  for(let i=11;i<=19;i++)best[i]=10;
  assert.equal(math.cityUnlockedCount(best),3);
  // The final chapter cannot unlock beyond the tenth city.
  for(let i=21;i<=100;i++)best[i]=10;
  assert.equal(math.cityUnlockedCount(best),10);
});

test('playable debug thresholds are isolated from default scoring',()=>{
 const rules={feverCombo:2,infernoCombo:4,noAcceleration:true};
 let combo=0,fever=false;
 for(let i=1;i<=4;i++){const r=math.resolveHit(combo,fever,0,true,rules);assert.equal(r.fever,i>=2);assert.equal(r.inferno,i>=4);assert.ok(r.delta>0);combo=r.combo;fever=r.fever;}
 assert.equal(math.resolveHit(3,true,0,false,rules).combo,0);
 assert.equal(math.resolveHit(1,false,0,true).fever,false);
 assert.equal(math.resolveHit(3,false,0,true).inferno,false);
 assert.equal(math.resolveHit(9,true,0,true).inferno,true);
});
