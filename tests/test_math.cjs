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
