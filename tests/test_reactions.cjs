'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const reactions=require('../src/js/reactions.js');
const i18n=require('../src/js/i18n.js');
require('../src/js/locales.js');

test('supported athlete identities are explicit, separate from city and appearance',()=>{
  const profiles=reactions.availableProfiles();
  assert.ok(profiles.length>=10);
  assert.ok(profiles.some(p=>p.nationality==='KE'&&p.nativeLanguage==='sw-KE'));
  assert.ok(profiles.some(p=>p.nationality==='TZ'&&p.nativeLanguage==='sw-TZ'));
  assert.ok(profiles.every(p=>!Object.hasOwn(p,'look')&&!Object.hasOwn(p,'city')));
  assert.deepEqual(reactions.chooseProfile(()=>0),profiles[0]);
  assert.deepEqual(reactions.chooseProfile(()=>1),profiles.at(-1));
});

test('every reaction event has native-script words and no made-up fallback',()=>{
  for(const athlete of reactions.availableProfiles()){
    for(const event of reactions.EVENTS){
      const response=reactions.select(athlete,event,()=>0);
      assert.ok(response,athlete.nativeLanguage+' '+event);
      assert.equal(response.event,event);
      assert.equal(response.nativeLanguage,athlete.nativeLanguage);
      assert.equal(response.captionKey,'reaction.'+event);
      assert.ok(response.text.length>0);
    }
  }
  assert.equal(reactions.select({nationality:'ET',nativeLanguage:'om-ET'},'pain'),null);
  assert.equal(reactions.select({nativeLanguage:'am-ET'},'thanks'),null);
  assert.equal(reactions.select({nativeLanguage:'sw-TZ'},'collision'),null);
  assert.throws(()=>reactions.registerProfile('ET','om-ET'),/requires a country/);
});

test('wrong-hit pain is not an English OUCH for Japanese, Korean or Swahili',()=>{
  const samples=[
    [{nationality:'JP',nativeLanguage:'ja-JP'},'痛い！'],
    [{nationality:'KR',nativeLanguage:'ko-KR'},'아야!'],
    [{nationality:'KE',nativeLanguage:'sw-KE'},'Aa!'],
    [{nationality:'DE',nativeLanguage:'de-DE'},'Aua!'],
    [{nationality:'FR',nativeLanguage:'fr-FR'},'Aïe !']
  ];
  for(const [identity,expected] of samples){
    assert.equal(reactions.select(identity,'pain',()=>0).text,expected);
  }
});

test('gloss follows the player language without changing the native line',()=>{
  const athlete={nationality:'KE',nativeLanguage:'sw-KE'};
  const pain=reactions.select(athlete,'pain',()=>0);
  i18n.setLocale('zh-Hans');
  assert.equal(reactions.caption(pain,i18n.locale(),i18n.t),'哎哟！');
  i18n.setLocale('en-GB');
  assert.equal(reactions.caption(pain,i18n.locale(),i18n.t),'Ouch!');
  assert.equal(pain.text,'Aa!');
  assert.equal(reactions.caption(pain,'sw-TZ',i18n.t),'');
  assert.equal(reactions.caption(null,'en-GB',i18n.t),'');
});

test('repeated feedback alternates when variants are available',()=>{
  const profile={nationality:'JP',nativeLanguage:'ja-JP'};
  const first=reactions.select(profile,'thanks',()=>0);
  const second=reactions.select(profile,'thanks',()=>0,first.index);
  assert.notEqual(first.text,second.text);
  assert.equal(reactions.select(profile,'pain',()=>0,15).index,0);
});

test('new language packs and athlete origins can be registered without game edits',()=>{
  reactions.registerPack('es-ES',{thanks:['¡Gracias!'],pain:['¡Ay!']});
  const profile=reactions.registerProfile('ES','es-ES');
  assert.equal(reactions.select(profile,'pain').text,'¡Ay!');
  assert.throws(()=>reactions.registerPack('x',{pain:[]}),/Invalid native reaction/);
  assert.throws(()=>reactions.registerPack('x',{invented:['foo']}),/Invalid native reaction/);
});
