/* Athlete reaction layer: independent of scoring, city art, and player UI locale.
   Native phrases are deliberately curated; unknown languages NEVER impersonate
   another language. All assets are inline and work in offline builds. */
(function(root){
  'use strict';
  const EVENTS=Object.freeze(['thanks','pain','cheer','surprise','disappointment']);
  const eventSet=new Set(EVENTS);
  const packs=new Map(), profiles=[];

  function languageOf(code){
    return typeof code==='string'?code.toLowerCase().split('-')[0]:'';
  }
  function registerPack(language,phrases){
    const code=languageOf(language);
    if(!code||!phrases||typeof phrases!=='object')throw new TypeError('Invalid reaction pack');
    const valid={};
    for(const [event,lines] of Object.entries(phrases)){
      if(!eventSet.has(event)||!Array.isArray(lines)||!lines.length||
         lines.some(line=>typeof line!=='string'||!line.trim()||line.length>65))
        throw new TypeError('Invalid native reaction for '+code+': '+event);
      valid[event]=Object.freeze(lines.slice());
    }
    packs.set(code,Object.freeze(valid));
    return code;
  }
  function registerProfile(nationality,nativeLanguage){
    if(!/^[A-Z]{2}$/.test(nationality)||!packs.has(languageOf(nativeLanguage)))
      throw new TypeError('Athlete profile requires a country code and reviewed language pack');
    const profile=Object.freeze({nationality,nativeLanguage});
    profiles.push(profile);
    return profile;
  }
  function availableProfiles(){return profiles.slice();}
  function chooseProfile(random=Math.random){
    if(!profiles.length)throw new Error('No athlete profiles registered');
    const index=Math.max(0,Math.min(profiles.length-1,Math.floor(random()*profiles.length)));
    // A fresh object makes each athlete identity independent of every other.
    return {...profiles[index]};
  }
  function select(identity,event,random=Math.random,previousIndex=-1){
    if(!identity||!eventSet.has(event))return null;
    const nativeLanguage=identity.nativeLanguage;
    const lines=packs.get(languageOf(nativeLanguage))?.[event];
    // Never insert fabricated translations when a language has no reviewed line.
    if(!lines?.length)return null;
    let index=Math.max(0,Math.min(lines.length-1,Math.floor(random()*lines.length)));
    if(lines.length>1&&index===previousIndex)index=(index+1)%lines.length;
    return Object.freeze({event,nativeLanguage,text:lines[index],index});
  }
  // Short reactions for game feedback. Pain interjections for Japanese, Korean,
  // French, German, Dutch and Chinese are documented in Cambridge/Collins
  // dictionaries. Swahili Aa! (pain) is documented in language-learning material.
  registerPack('en',{thanks:['Thanks!','Thank you!'],pain:['Ouch!','Ow!'],
    cheer:['Woohoo!','Yes!'],surprise:['Whoa!','Oh!'],disappointment:['Oh no!','Too bad!']});
  registerPack('ja',{thanks:['ありがとう！','どうも！'],pain:['痛い！','いたっ！'],
    cheer:['やった！','よし！'],surprise:['えっ！','わっ！'],disappointment:['残念！','ああ…']});
  registerPack('ko',{thanks:['고마워요!','감사해요!'],pain:['아야!','아얏!'],
    cheer:['야호!','좋았어!'],surprise:['어?!','앗!'],disappointment:['아쉽다!','아이고…']});
  registerPack('de',{thanks:['Danke!','Vielen Dank!'],pain:['Aua!','Au!'],
    cheer:['Juhu!','Super!'],surprise:['Oh!','Was?!'],disappointment:['Schade!','Oh nein!']});
  registerPack('nl',{thanks:['Dank je!','Bedankt!'],pain:['Au!','Auw!'],
    cheer:['Hoera!','Geweldig!'],surprise:['Hè?','O!'],disappointment:['Jammer!','O nee!']});
  registerPack('fr',{thanks:['Merci !','Merci beaucoup !'],pain:['Aïe !','Ouille !'],
    cheer:['Bravo !','Génial !'],surprise:['Oh !','Hein ?'],disappointment:['Dommage !','Oh non !']});
  registerPack('zh',{thanks:['谢谢！','多谢！'],pain:['哎哟！','好痛！'],
    cheer:['太棒了！','好耶！'],surprise:['哎呀！','咦？'],disappointment:['真可惜！','唉…']});
  registerPack('sw',{thanks:['Asante!','Asante sana!'],pain:['Aa!'],
    cheer:['Hongera!','Vizuri!'],surprise:['Lo!','Ati?!'],disappointment:['Ala!']});

  // Explicit pairs describe individual sample athletes; not statements that
  // everyone from a country shares a mother tongue. Appearance is independent.
  for(const [country,language] of [
    ['KE','sw-KE'],['TZ','sw-TZ'],['JP','ja-JP'],['KR','ko-KR'],
    ['GB','en-GB'],['US','en-US'],['AU','en-AU'],['DE','de-DE'],
    ['NL','nl-NL'],['FR','fr-FR'],['CN','zh-Hans']
  ])registerProfile(country,language);

  const api=Object.freeze({EVENTS,languageOf,registerPack,registerProfile,
    availableProfiles,chooseProfile,select});
  root.GameReactions=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
