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
  assert.ok(i18n.availableLocales().some(item=>item.code==='zh-Hans'));
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
  assert.equal(i18n.t('result.complete'),'RACE COMPLETE!');
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
  const attrs={'data-i18n':'intro.start','data-i18n-aria-label':'game.pause'};
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
  i18n.setLocale('en-GB');
  assert.equal(node.textContent,"LET'S SERVE!");
  delete globalThis.document;
});

test('a saved unknown locale falls back to English',()=>{
  cache.set('snackDashLocaleV1','not-installed');
  assert.equal(i18n.init(),'en-GB');
  cache.delete('snackDashLocaleV1');
});
