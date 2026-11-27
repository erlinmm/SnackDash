/* Event-driven audio. Art clocks and gameplay never wait on decoding. */
(function(root){
  'use strict';
  const A=root.SnackDashAnimation;
  root.SnackDashCreateAudio=function(ports,pack){
    const config=pack.manifest.audio,synth=ports.audio,cache=new Map();
    let current=null,music=null,musicKey=null,musicToken=0,epoch=0;
    let cues=[];
    // Existing portrait cues stay unchanged. Landscape uses only declared
    // event bindings, including explicitly requested synthesized cues.
    synth.presentationDriven=true;
    function legacy(method,args=[]){
      const old=synth.presentationCue;synth.presentationCue=true;
      try{synth[method](...args)}finally{synth.presentationCue=old}
    }
    function decode(key,ac){
      if(!cache.has(key)){
        const uri=pack.sounds[key];
        if(!uri)throw Error('Missing declared sound '+key);
        const bytes=Uint8Array.from(atob(uri.split(',')[1]),c=>c.charCodeAt(0));
        const promise=ac.decodeAudioData(bytes.buffer);
        cache.set(key,promise);
        promise.catch(()=>cache.delete(key));
      }
      return cache.get(key);
    }
    function play(key,volume=.44,game=current){
      if(!synth.enabled)return;
      const ac=synth.audio;if(!ac)return;
      const token=epoch;
      decode(key,ac).then(buffer=>{
        if(!synth.enabled||game!==current||token!==epoch||game?.phase==='paused')return;
        const player=ac.createBufferSource(),gain=ac.createGain();
        player.buffer=buffer;gain.gain.value=volume;player.connect(gain);gain.connect(ac.destination);player.start();
      }).catch(e=>console.warn('Sound unavailable: '+key,e));
    }
    function event(game,e){
      if(game!==current)return;
      for(const rule of config.bindings){
        if(!A.matches(rule,e,e.modeAfter))continue;
        cues.push({event:e.type,marker:e.marker,mode:e.modeAfter,sound:rule.sound,synth:rule.synth,at:e.at});
        if(cues.length>256)cues.shift();
        if(rule.sound)play(rule.sound,rule.volume,game);
        else if(rule.synth&&synth.enabled)legacy(rule.synth,(rule.args||[]).map(k=>e[k]));
      }
    }
    function stopMusic(){
      musicToken++;musicKey=null;
      if(music){try{music.stop()}catch(_){}music=null}
    }
    function sync(game,m){
      if(game!==current){epoch++;stopMusic();current=game}
      if(!game||!synth.enabled||game.qaFixture||game.phase!=='playing'){if(musicKey!==null)stopMusic();return}
      const choice=config.music[m];
      if(!choice)return;
      if(choice.synth){if(musicKey!==null)stopMusic();legacy(choice.synth,[game.sceneTime]);return}
      const key=m+'/'+choice.sound;
      if(musicKey===key)return;
      stopMusic();musicKey=key;
      const ac=synth.audio;if(!ac){musicKey=null;return}
      const token=musicToken;
      decode(choice.sound,ac).then(buffer=>{
        if(token!==musicToken||!synth.enabled||current!==game||game.phase!=='playing')return;
        const player=ac.createBufferSource(),gain=ac.createGain();
        player.buffer=buffer;player.loop=true;gain.gain.value=choice.volume??.2;
        player.connect(gain);gain.connect(ac.destination);player.start();music=player;
      }).catch(e=>{if(token===musicToken)musicKey=null;console.warn('Music unavailable',e)});
    }
    return {event,sync,trace:()=>A.clone(cues),reset:game=>{epoch++;stopMusic();current=game;cues=[]}};
  };
})(window);
