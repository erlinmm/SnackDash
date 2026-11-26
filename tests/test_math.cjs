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

test('runner repeat-match multipliers are 2, 4, and 16 per prior success', () => {
  for (const successes of [0,1,2,3,4,5]) {
    assert.equal(math.resolveHit(0,false,successes,true).delta,2**successes);
    assert.equal(math.resolveHit(5,true,successes,true).delta,4**successes);
    assert.equal(math.resolveHit(10,true,successes,true).delta,16**successes);
  }
  // The hit that reaches each mode threshold already uses its new multiplier.
  assert.equal(math.resolveHit(4,false,2,true).delta,16);
  assert.equal(math.resolveHit(9,true,2,true).delta,256);
  assert.equal(math.resolveHit(9,true,2,true).infernoActivated,true);
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
