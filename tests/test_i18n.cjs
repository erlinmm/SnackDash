'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const cache=new Map();
globalThis.localStorage={
  getItem:key=>cache.get(key)??null,
  setItem:(key,value)=>cache.set(key,String(value))
};
const i18n=require('../src/js/i18n.js');
require('../src/js/locales.js');

test('English remains the safe default and locale registration is explicit',()=>{
  assert.equal(i18n.locale(),'en-GB');
  assert.ok(i18n.availableLocales().some(item=>item.code==='zh-Hans'&&item.label==='简体中文'));
  assert.equal(i18n.t('intro.start'),"LET'S SERVE!");
  assert.equal(i18n.setLocale('unknown'),false);
  assert.equal(i18n.locale(),'en-GB');
});

test('language selection persists and variable interpolation uses the current locale',()=>{
  assert.equal(i18n.setLocale('zh-Hans'),true);
  assert.equal(cache.get('snackDashLocaleV1'),'zh-Hans');
  assert.equal(i18n.t('intro.pickRace'),'选择比赛');
  assert.equal(i18n.t('invitation.visit',{city:'TOKYO'}),'前往TOKYO ➜');
  assert.equal(i18n.t('invitation.body',{city:'BERLIN'}).includes('BERLIN'),true);
  assert.equal(i18n.formatNumber(1234567),new Intl.NumberFormat('zh-Hans').format(1234567));
  i18n.setLocale('en-GB');
});

test('untranslated strings fall back to English without fabricating translations',()=>{
  i18n.registerLocale('test-partial',{'intro.start':'Start (test)'},{label:'Partial test'});
  i18n.setLocale('test-partial');
  assert.equal(i18n.t('intro.start'),'Start (test)');
  assert.equal(i18n.t('result.complete'),'SUPPLY SERVICE COMPLETE!');
  assert.equal(i18n.t('missing.unknown'),'missing.unknown');
  i18n.setLocale('en-GB');
});

test('local festival names stay in native script while explanation uses player language',()=>{
  i18n.registerLocale('test-festival',{'festival.tokyo':'Cherry blossoms (test)'},{label:'Test'});
  i18n.setLocale('test-festival');
  const label=i18n.activityLabel({nativeName:'千代田のさくらまつり',nativeLocale:'ja-JP',labelKey:'festival.tokyo'});
  assert.deepEqual(label,{nativeName:'千代田のさくらまつり',nativeLocale:'ja-JP',explanation:'Cherry blossoms (test)'});
  i18n.setLocale('zh-Hans');
  const fallback=i18n.activityLabel({nativeName:'서울빛초롱축제',nativeLocale:'ko-KR',labelKey:'festival.unknown'});
  assert.equal(fallback.nativeName,'서울빛초롱축제');
  assert.equal(fallback.explanation,'');
  i18n.setLocale('en-GB');
});

test('static text and accessible labels rerender on locale change',()=>{
  const attrs={'data-i18n':'intro.start','data-i18n-aria-label':'game.pause',
    'data-i18n-content':'app.description'};
  const node={textContent:'',labels:{},getAttribute:key=>attrs[key]||null,
    setAttribute(key,value){this.labels[key]=value;}};
  const document={
    documentElement:{lang:'',dir:''},
    title:'',
    querySelectorAll:()=>[node]
  };
  globalThis.document=document;
  i18n.setLocale('zh-Hans');
  assert.equal(document.documentElement.lang,'zh-Hans');
  assert.equal(document.documentElement.dir,'ltr');
  assert.equal(node.textContent,'开始送零食！');
  assert.equal(node.labels['aria-label'],'暂停游戏');
  assert.match(node.labels.content,/补给站数学游戏/);
  i18n.setLocale('en-GB');
  assert.equal(node.textContent,"LET'S SERVE!");
  delete globalThis.document;
});

test('a saved unknown locale falls back to English',()=>{
  cache.set('snackDashLocaleV1','not-installed');
  assert.equal(i18n.init(),'en-GB');
  cache.delete('snackDashLocaleV1');
});

test('all ten cities and gameplay instructions resolve in both UI languages',()=>{
  const math=require('../src/js/math.js');
  for(const locale of ['en-GB','zh-Hans']){
    assert.equal(i18n.setLocale(locale),true);
    for(const city of math.CITIES){
      for(const field of ['name','country','landmark','subtitle']){
        const key='city.'+city.id+'.'+field;
        assert.ok(i18n.lookup(key),locale+': '+key);
      }
    }
    for(const key of ['intro.howToPlay','intro.tourFooter','instructions.step1',
      'instructions.step2','instructions.step3','city.cardAria','race.eventTitle','city.stamps']){
      assert.ok(i18n.lookup(key),locale+': '+key);
    }
  }
  assert.equal(i18n.t('city.tokyo.name'),'东京');
  assert.equal(i18n.t('city.tokyo.landmark'),'东京塔');
  assert.match(i18n.t('instructions.step2'),/整除/);
  i18n.setLocale('en-GB');
});

test('every English system key has a real Simplified Chinese value with matching parameters',()=>{
  const paramNames=s=>[...s.matchAll(/\{\{(\w+)\}\}/g)].map(m=>m[1]).sort();
  const required=i18n.keys('en-GB');
  assert.ok(required.length>120,'unexpectedly small translation catalog');
  for(const key of required){
    assert.equal(i18n.hasTranslation(key,'zh-Hans'),true,'missing zh-Hans key '+key);
    assert.deepEqual(paramNames(i18n.lookup(key,'en-GB')),
      paramNames(i18n.lookup(key,'zh-Hans')),'placeholder mismatch for '+key);
  }
  for(const key of ['mode.fever.enter','mode.fever.end','mode.inferno.enter',
    'mode.inferno.end','feedback.correct','feedback.incorrect',
    'celebration.staffSuccess','role.staff','role.refill',
    'pwa.ready','pwa.status.failed','app.description']){
    assert.ok(required.includes(key),'missing system interface: '+key);
  }
});

test('staff support is success/completion, not an athlete race win',()=>{
  i18n.setLocale('en-GB');
  assert.equal(i18n.t('role.staff'),'STAFF');
  assert.equal(i18n.t('celebration.staffSuccess'),'STAFF SUCCEEDED!');
  assert.doesNotMatch(i18n.t('result.stamped',{city:'TOKYO',race:1,completed:1}),/won|victory/i);
  i18n.setLocale('zh-Hans');
  assert.equal(i18n.t('role.staff'),'补给员');
  assert.equal(i18n.t('celebration.staffSuccess'),'补给成功！');
  assert.doesNotMatch(i18n.t('result.complete')+i18n.t('city.progress',{completed:1}),/获胜|胜利/);
  assert.equal(i18n.formatNumber(1234567,{notation:'compact',maximumFractionDigits:1}),
    new Intl.NumberFormat('zh-Hans',{notation:'compact',maximumFractionDigits:1}).format(1234567));
  i18n.setLocale('en-GB');
});

test('Canvas feedback and installed PWA do not contain unlocalized legacy labels',()=>{
  const fs=require('node:fs');
  const path=require('node:path');
  const root=path.resolve(__dirname,'..');
  const game=fs.readFileSync(path.join(root,'src/js/game.js'),'utf8');
  const pwa=fs.readFileSync(path.join(root,'src/pwa/update.js'),'utf8');
  const reactions=fs.readFileSync(path.join(root,'src/js/reactions.js'),'utf8');
  assert.doesNotMatch(game,/THE VOLUNTEER WINS!|SNACK STATION HERO!|FEVER OVER! COMBO RESET|INFERNO! DISCO TIME!|0 PENALTY!/);
  assert.doesNotMatch(game,/Reactions\.caption\(/);
  assert.doesNotMatch(reactions,/captionKey|function caption\(/);
  assert.match(game,/function fitLabel\(/);
  assert.match(pwa,/data-i18n="pwa.ready"/);
});
