"""Optional Chromium smoke tests. CI installs Playwright and Chromium."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

HTML = Path(__file__).resolve().parents[1] / 'dist/Snack_Dash.html'


async def check(browser, width, height):
    page = await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.set_content(HTML.read_text(encoding='utf-8'), wait_until='load')
    # The selection screen fills the viewport without clipping short phones.
    menu_dims=await page.evaluate("""() => {
      const app=document.querySelector('#app');
      const first=app.querySelector('.topbar').getBoundingClientRect();
      const last=document.querySelector('#menuScreen').getBoundingClientRect();
      const rect=app.getBoundingClientRect();
      const style=getComputedStyle(app);
      return {top:first.top-rect.top-parseFloat(style.paddingTop),
        bottom:rect.bottom-last.bottom-parseFloat(style.paddingBottom),
        height:app.getBoundingClientRect().height,
        viewport:window.visualViewport.height};
    }""")
    assert menu_dims['top']>=-2,(width,height,menu_dims)
    if menu_dims['height']<=menu_dims['viewport']+2:
        assert abs(menu_dims['top']-menu_dims['bottom'])<=4,(width,height,menu_dims)
    assert await page.locator('#menuFullscreenBtn').count()==0
    assert await page.locator('#gameFullscreenBtn').count()==0
    await assert_selection_fits(page, width, height)
    # Exercise offline locale switching without altering scoring or save-state.
    assert await page.locator('#languageSelect').input_value() == 'en-GB'
    assert await page.locator('#languageSelect option[value="zh-Hans"]').text_content() == '简体中文'
    await page.locator('#languageSelect').select_option('zh-Hans')
    assert await page.locator('[data-i18n="intro.pickRace"]').text_content() == '选择比赛'
    assert await page.evaluate("document.documentElement.lang") == 'zh-Hans'
    assert await page.locator('.city-stop').first.locator('.city-name').text_content() == '东京'
    assert await page.locator('.city-stop').first.locator('.city-skyline').text_content() == '东京塔'
    assert await page.locator('#cityTitle').text_content() == '东京'
    assert '日本' in await page.locator('#cityCaption').text_content()
    assert '印章' in await page.locator('#cityStamp').text_content()
    assert '东京' in await page.locator('#selectedTitle').text_content()
    assert '运动员' in await page.locator('#selectedMeta').text_content()
    await assert_selection_fits(page,width,height)
    font=await page.evaluate("""() => {
      const card=document.querySelector('.city-stop');
      const sz=selector=>parseFloat(getComputedStyle(card.querySelector(selector)).fontSize);
      const nr=card.querySelector('.city-name').getBoundingClientRect();
      return {name:sz('.city-name'),landmark:sz('.city-skyline'),
        status:sz('.city-status'),nameBottom:nr.bottom,cardBottom:card.getBoundingClientRect().bottom};
    }""")
    assert font['name']>=15 and font['landmark']>=10 and font['status']>=10,(width,height,font)
    assert font['nameBottom']<=font['cardBottom']+2,(width,height,font)
    assert await page.locator('#howToPlayBtn').text_content()=='玩法说明'
    await page.locator('#howToPlayBtn').click()
    assert await page.locator('#howToPlayDialog').is_visible()
    help_text=await page.locator('#howToPlayDialog').inner_text()
    assert '整除' in help_text and 'FEVER' in help_text and 'INFERNO' in help_text
    await page.locator('#howToPlayClose').click()
    assert not await page.locator('#howToPlayDialog').is_visible()
    await page.locator('#languageSelect').select_option('en-GB')
    assert await page.locator('[data-i18n="intro.pickRace"]').text_content() == 'CHOOSE YOUR RACE'
    assert await page.locator('.city-stop').first.locator('.city-name').text_content() == 'TOKYO'
    assert await page.locator('#howToPlayBtn').text_content()=='How to play'
    await page.locator('#startBtn').click()
    await page.wait_for_timeout(1900)
    dims=await page.evaluate('''() => ({
      tray:document.querySelector('.game-control-strip').getBoundingClientRect().bottom,
      viewport:window.visualViewport.height,
      width:document.querySelector('#sceneShell').getBoundingClientRect().width,
      time:document.querySelector('#hudTime').textContent
    })''')
    # Canvas object is not serializable; only inspect the primitive values.
    assert not errors, (width,height,errors)
    assert dims['width']>0
    assert dims['tray']<=dims['viewport']+3,(width,height,dims)
    hud=await page.evaluate("""() => {
      const b=document.querySelector('.scoreboard');
      const pause=document.querySelector('#pauseBtn');
      const restart=document.querySelector('#restartBtn');
      const bb=b.getBoundingClientRect(),p=pause.getBoundingClientRect(),r=restart.getBoundingClientRect();
      return {scroll:b.scrollWidth,client:b.clientWidth,right:p.right,edge:bb.right,
        pauseWidth:p.width,restartWidth:r.width};
    }""")
    assert hud['scroll']<=hud['client']+2,(width,height,hud)
    assert hud['right']<=hud['edge']+2,(width,height,hud)
    assert hud['pauseWidth']>=38 and hud['restartWidth']>=38,(width,height,hud)

    # Without changing the canvas size, the complete in-game stack should
    # share any leftover height between its top and bottom margins.
    margins=await page.evaluate("""() => {
      const screen=document.querySelector('#gameScreen');
      const parts=[screen.querySelector('.scoreboard'),
                   document.querySelector('#comboPanel'),
                   document.querySelector('#sceneShell'),
                   screen.querySelector('.game-control-strip')];
      const bounds=screen.getBoundingClientRect();
      const first=parts[0].getBoundingClientRect();
      const last=parts[parts.length-1].getBoundingClientRect();
      return {top:first.top-bounds.top,bottom:bounds.bottom-last.bottom,
              align:getComputedStyle(screen).justifyContent};
    }""")
    assert margins['align']=='center',(width,height,margins)
    if width <= height and (margins['top']>3 or margins['bottom']>3):
        assert abs(margins['top']-margins['bottom'])<=4,(width,height,margins)

    speeds=await page.evaluate('''() => {
      const g=window.SnackDashDebug.getGame(), old=[g.fever,g.inferno];
      const out=[ [false,false], [true,false], [true,true] ].map(([f,i])=>{
        g.fever=f;g.inferno=i;
        return [0,1,2,3,4,5].map(successes=>g.traffic.speed({baseSpeed:1,successes}));
      });
      [g.fever,g.inferno]=old;return out;
    }''')
    assert speeds==[[1,3,5,8,10,10],[2,4,6,9,11,11],[3,6,8,10,12,12]],speeds

    # Regression: the tray tap changes the hand immediately and confirms the
    # swap AT THE VOLUNTEER'S HAND, without a SWAPPED text effect. The view
    # and touch zones remain identical on narrow and tall phones.
    before=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      return {held:g.supplies.held.number,tray:g.supplies.queue[0].number,
              phase:g.phase};
    }""")
    assert before['phase']=='playing',(width,height,before)
    scene=await page.locator('#scene').bounding_box()
    await page.mouse.click(scene['x']+scene['width']*(50/390),
                           scene['y']+scene['height']*(89/700))
    after=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      return {held:g.supplies.held.number,tray:g.supplies.queue[0].number,
              cue:g.swapCue && {...g.swapCue},
              swapLabel:g.effects.some(e=>e.text==='SWAPPED!')};
    }""")
    assert after['held']==before['tray'],(width,height,before,after)
    assert after['tray']==before['held'],(width,height,before,after)
    assert after['cue'] is not None and after['cue']['number']==before['tray'],after
    assert not after['swapLabel'],after

    # A second tap during the cue resets it instead of queuing a long effect.
    await page.mouse.click(scene['x']+scene['width']*(122/390),
                           scene['y']+scene['height']*(89/700))
    next_cue=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      return {cue:g.swapCue && {...g.swapCue},held:g.supplies.held.number};
    }""")
    assert next_cue['cue'] and next_cue['cue']['number']==next_cue['held'],next_cue
    assert next_cue['cue']['mode']=='normal',next_cue

    # The same hand-centered visual burst switches its theme in Fever/Inferno.
    # Force only the mode flags; all actual swap and touch logic stays intact.
    for mode in ('fever','inferno'):
        effect=await page.evaluate("""(mode) => {
          const g=window.SnackDashDebug.getGame();
          g.fever=true;g.inferno=mode==='inferno';
          const swapOk=g.trySwap(50,89);
          if(swapOk)g.draw(); // Exercise all Canvas burst paths.
          return {swapOk,mode:g.swapCue && g.swapCue.mode,number:g.supplies.held.number};
        }""",mode)
        assert effect['swapOk'] and effect['mode']==mode,(width,height,effect)
    assert not errors,(width,height,errors)

    # Immediate throw is allowed: the visual cue cannot lock input.
    can_throw=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      const r=g.runners.find(r=>g.onScreen(r) && r.y>120 && r.y<600);
      if(!r)return false;
      g.tryThrow(g.runnerX(r), r.y+5);
      return !!g.throwing && g.swapCue===null;
    }""")
    assert can_throw,(width,height,"swap cue blocked an immediate throw")
    assert not errors,(width,height,errors)
    await page.close()


async def check_fullscreen_flow(browser):
    """Automatic fullscreen keeps portrait orientation without manual buttons."""
    page=await browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    await page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load')
    await page.evaluate("""() => {
      const state={requests:0,active:false};
      window.__portraitCalls=[];
      Object.defineProperty(screen.orientation,'lock',{configurable:true,
        value:mode=>{window.__portraitCalls.push(mode);return Promise.resolve();}
      });
      Object.defineProperty(document,'fullscreenElement',{
        configurable:true,get:()=>state.active?document.documentElement:null
      });
      document.documentElement.requestFullscreen=()=>{
        state.requests++;state.active=true;
        document.dispatchEvent(new Event('fullscreenchange'));
        return Promise.resolve();
      };
      window.__fullscreenTest=state;
    }""")
    assert await page.locator('#menuFullscreenBtn').count()==0
    assert await page.locator('#gameFullscreenBtn').count()==0
    await page.locator('#startBtn').click()
    state=await page.evaluate("({...window.__fullscreenTest})")
    assert state=={'requests':1,'active':True},state
    assert 'portrait' in await page.evaluate('window.__portraitCalls')
    await page.locator('#restartBtn').click()
    assert await page.evaluate("({...window.__fullscreenTest})")==state
    await page.locator('#levelsBtn').click()
    assert await page.evaluate("({...window.__fullscreenTest})")==state
    assert await page.locator('#menuScreen').is_visible()
    await page.locator('#startBtn').click()
    assert await page.evaluate("({...window.__fullscreenTest})")==state
    assert not errors,errors
    await page.close()


async def check_city_invitation(browser):
    # Give the otherwise self-contained HTML a stable localStorage origin
    # without hosting or making any network request.
    context=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1)
    await context.route('https://snackdash.example/**',lambda route: route.fulfill(
        status=200,content_type='text/html',body=HTML.read_text(encoding='utf-8')))
    page=await context.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    await page.goto('https://snackdash.example/')
    assert await page.locator('#cityInvitationOverlay').is_hidden()

    # Eight wins should never make the next city available.
    await page.evaluate("""() => {
      const saved=window.SnackDashDebug.getPrefs();
      for(let i=2;i<=9;i++)saved.best[i]=10;
      window.SnackDashDebug.reconcileCityUnlocks();
    }""")
    assert await page.evaluate('window.SnackDashDebug.getUnlockedCities()')==1
    assert await page.locator('#cityInvitationOverlay').is_hidden()

    # The ninth win is recorded during gameplay, but the result is about the
    # race alone. The new city is committed and announced on menu entry.
    await page.locator('#startBtn').click()
    await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      g.score=12;
      g.finish();
      g.showResults(true);
    }""")
    assert 'CITY UNLOCKED' not in await page.locator('#resultHeading').inner_text()
    assert await page.evaluate('window.SnackDashDebug.getUnlockedCities()')==1
    await page.locator('#backBtn').click()
    assert await page.evaluate('window.SnackDashDebug.getUnlockedCities()')==2
    assert await page.locator('#cityInvitationOverlay').is_visible()
    assert await page.locator('#cityInvitationName').inner_text()=='SEOUL'
    assert 'Seoul Marathon Organising Committee' in await page.locator('#cityInvitationText').inner_text()
    assert await page.evaluate('window.SnackDashDebug.getPendingInvitation()')==1
    await page.locator('#cityInvitationLater').click()
    assert await page.locator('#cityInvitationOverlay').is_hidden()
    assert await page.evaluate('window.SnackDashDebug.getUnlockedCities()')==2
    state=await page.evaluate("""() => JSON.parse(localStorage.getItem('snackDashSaveV2'))""")
    assert state['unlockedCities']==2 and 1 in state['invitationsAcknowledged'],state
    assert '10' not in state['best'],'the tenth Tokyo race must remain unfinished'

    # Reload keeps the city unlocked but does not repeat a read postcard.
    await page.reload()
    assert await page.locator('#cityInvitationOverlay').is_hidden()
    assert await page.evaluate('window.SnackDashDebug.getUnlockedCities()')==2
    await page.close()

    # A player who wins the ninth race and quits without returning to levels
    # receives the invitation on the next launch.
    page=await context.new_page()
    await page.add_init_script("""(() => {
      if(sessionStorage.getItem('invitationTestSeeded'))return;
      sessionStorage.setItem('invitationTestSeeded','1');
      const best={};
      for(let i=11;i<=19;i++)best[i]=10;
      localStorage.setItem('snackDashSaveV2',JSON.stringify({
        best:{...JSON.parse(localStorage.getItem('snackDashSaveV2')||'{}').best,...best},
        selectedCity:1,sound:true,unlockedCities:2,
        invitationsAcknowledged:[1]
      }));
    })()""")
    await page.goto('https://snackdash.example/')
    assert await page.evaluate('window.SnackDashDebug.getUnlockedCities()')==3
    assert await page.locator('#cityInvitationOverlay').is_visible()
    assert await page.locator('#cityInvitationName').inner_text()=='LONDON'
    await page.reload()
    assert await page.locator('#cityInvitationOverlay').is_visible(), 'unacknowledged invitation should survive reopening'
    await page.locator('#cityInvitationVisit').click()
    assert await page.locator('#cityInvitationOverlay').is_hidden()
    assert await page.locator('#cityTitle').inner_text()=='LONDON'
    await page.reload()
    assert await page.locator('#cityInvitationOverlay').is_hidden()
    assert await page.evaluate('window.SnackDashDebug.getUnlockedCities()')==3
    assert not errors,errors
    await context.close()



async def check_city_mode_rendering(browser):
    """Exercise every city with normal / Fever / Inferno Canvas paths."""
    page=await browser.new_page(viewport={'width':414,'height':896},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    await page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load')
    # The built-in debug code opens all city choices without changing saves.
    for race in [1,9,8,6]:
        await page.locator('.level-tile').nth(race-1).click()
    assert await page.locator('.city-stop.open').count()==10
    paints=[]
    for city in range(10):
        await page.locator('.city-stop').nth(city).click()
        await page.locator('#startBtn').click()
        result=await page.evaluate("""(city) => {
          const g=window.SnackDashDebug.getGame();
          if(g.config.cityIndex!==city)throw Error('Wrong city scene');
          g.phase='playing';g.goFlash=0;g.sceneTime=5;
          const colors=[];
          for(const mode of ['normal','fever','inferno']){
            g.fever=mode!=='normal';g.inferno=mode==='inferno';
            g.combo=mode==='normal'?0:mode==='fever'?7:12;
            g.effects=[];
            if(mode!=='normal'){
              g.popEffect({kind:'hitBurst',x:275,y:430,tier:3,mode,life:.5});
              g.popEffect({kind:'score',x:275,y:385,text:'+49',size:34,color:'#ffdd74',life:.5});
            }
            g.syncHUD();g.draw();
            const pix=document.querySelector('#scene').getContext('2d').getImageData(20,340,1,1).data;
            colors.push([...pix]);
          }
          return colors;
        }""",city)
        assert len(result)==3,(city,result)
        paints.append(tuple(result[0]))
        await page.locator('#levelsBtn').click()
    assert not errors,errors
    # Verify city-specific character placements and distinct outfit palettes.
    actor_scenes=await page.evaluate("() => [...Array(10)].map((_,i)=>window.SnackDashDebug.getVolunteerScene(i))")
    assert len({c['shirt'] for c in actor_scenes})==10,actor_scenes
    assert len({(c['x'],c['y']) for c in actor_scenes})>=5,actor_scenes
    assert all(abs(c['hand']['x']-(c['x']+38*.64))<.01 for c in actor_scenes)
    assert all(abs(c['hand']['y']-(c['y']-26*.64))<.01 for c in actor_scenes)
    # A wide sample of pavements should not all look identical.
    assert len(set(paints))>=5,paints
    # Reduced motion must not move the stage during a mega hit.
    await page.locator('.city-stop').nth(0).click()
    await page.locator('#startBtn').click()
    await page.emulate_media(reduced_motion='reduce')
    calm=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      g.phase='playing';g.fever=true;g.inferno=true;
      g.shakeRemaining=.12;g.shakePower=2.7;g.draw();
      return document.getElementById('sceneShell').style.transform;
    }""")
    assert calm=='',calm
    assert not errors,errors
    await page.close()


async def check_athlete_reactions(browser):
    """Athlete speech is native-only, independent of player UI language."""
    page=await browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    await page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load')
    await page.locator('#languageSelect').select_option('zh-Hans')
    await page.locator('#startBtn').click()
    outcome=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame(),matches=window.GameMath.matches;
      const count=()=>g.effects.filter(f=>f.kind==='athleteReaction').length;
      g.phase='playing';
      const before=count();
      g.tryThrow(-40,-40);
      const afterEmptyTap=count();
      const good=g.runners.find(r=>g.onScreen(r)&&matches(g.supplies.held.number,r.number));
      if(!good)throw Error('Missing correct target');
      good.identity={nationality:'KE',nativeLanguage:'sw-KE'};
      g.throwing={runnerId:good.id,supply:g.supplies.held,elapsed:0,hit:false,reloaded:false,feverAtRelease:false};
      g.tickThrow(.42);
      const received=g.effects.filter(f=>f.kind==='athleteReaction').at(-1);
      const thanksCount=g.correct;
      g.throwing=null;
      const bad=g.runners.find(r=>g.onScreen(r)&&!matches(g.supplies.held.number,r.number));
      if(!bad)throw Error('Missing incorrect target');
      bad.identity={nationality:'JP',nativeLanguage:'ja-JP'};
      g.throwing={runnerId:bad.id,supply:g.supplies.held,elapsed:0,hit:false,reloaded:false,feverAtRelease:false};
      g.tickThrow(.42);
      const collided=g.effects.filter(f=>f.kind==='athleteReaction').at(-1);
      g.draw(); // Rendering CJK native speech without translated captions must work.
      const accessible=document.getElementById('runnerReactionText').textContent;
      
      return {
        before,afterEmptyTap,thanksCount,wrongCount:g.wrong,
        thanksEvent:received.reaction.event,thanksNative:received.reaction.text,
        painEvent:collided.reaction.event,painNative:collided.reaction.text,
        nationality:bad.identity.nationality,accessible
      };
    }""")
    assert outcome['before']==outcome['afterEmptyTap']==0,outcome
    assert outcome['thanksCount']==1,outcome
    assert outcome['thanksEvent']=='thanks' and outcome['thanksNative'].startswith('Asante'),outcome
    assert outcome['wrongCount']==1 and outcome['painEvent']=='pain',outcome
    assert outcome['painNative'] in ('痛い！','いたっ！'),outcome
    assert outcome['accessible']==outcome['painNative'],outcome
    assert '哎哟！' not in outcome['accessible'],outcome
    assert not errors,errors
    await page.close()


async def check_localized_canvas(browser):
    """Canvas messages use the UI locale and fit into their fixed panels."""
    page=await browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    await page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load')
    await page.locator('#languageSelect').select_option('zh-Hans')
    await page.locator('#startBtn').click()
    observed=await page.evaluate("""() => {
      const g=window.SnackDashDebug.getGame();
      const ctx=document.querySelector('#scene').getContext('2d');
      const original=ctx.fillText.bind(ctx);
      const render=fn=>{
        const drawn=[];
        ctx.fillText=(content,x,y,...rest)=>{
          const text=String(content);
          drawn.push({text,font:ctx.font,
            width:ctx.measureText(text).width*Math.abs(ctx.getTransform().a)});
          original(content,x,y,...rest);
        };
        try{fn();}finally{ctx.fillText=original;}
        return drawn;
      };
      g.phase='playing';g.goFlash=.7;
      const go=render(()=>g.draw()).find(v=>v.text==='开始！');
      g.goFlash=0;g.effects=[];
      g.popEffect({kind:'feverEntry',mode:'fever',textKey:'mode.fever.short',x:195,y:308,life:.6});
      const fever=render(()=>g.draw());
      g.effects=[];
      g.popEffect({kind:'feverEntry',mode:'inferno',textKey:'mode.inferno.short',x:195,y:308,life:.6});
      const inferno=render(()=>g.draw());
      g.effects=[];g.phase='celebrate';g.celebrationTime=.8;
      const celebration=render(()=>g.draw());
      g.score=12;g.showResults(true);
      return {go,fever:fever.map(v=>v.text),inferno:inferno.map(v=>v.text),
        celebration:celebration.map(v=>v.text),
        result:document.querySelector('#resultKicker').textContent,
        heading:document.querySelector('#resultHeading').textContent,
        staff:window.GameI18n.t('role.staff')};
    }""")
    assert observed['go'] is not None,observed
    assert observed['go']['width']<=170,observed
    assert 'FEVER！' in observed['fever'],observed
    assert 'INFERNO！' in observed['inferno'],observed
    assert '补给站之星！' in observed['celebration'],observed
    assert '补给成功！' in observed['celebration'],observed
    assert observed['result']=='补给成功！',observed
    assert observed['heading']=='优秀补给员！',observed
    assert observed['staff']=='补给员',observed
    assert not errors,errors
    await page.close()


async def assert_selection_fits(page, width, height):
    """No document scrolling or clipped race controls on supported screens."""
    bounds=await page.evaluate("""() => {
      const viewport=window.visualViewport?.height||window.innerHeight;
      const app=document.querySelector('#app'),passport=document.querySelector('#cityDetail');
      const button=document.querySelector('#startBtn').getBoundingClientRect();
      const grid=document.querySelector('#levelGrid').getBoundingClientRect();
      const map=document.querySelector('#cityMap').getBoundingClientRect();
      return {
        viewport,documentHeight:document.documentElement.scrollHeight,
        documentWidth:document.documentElement.scrollWidth,
        width:document.documentElement.clientWidth,
        appHeight:app.scrollHeight,appClientHeight:app.clientHeight,
        top:document.querySelector('.topbar').getBoundingClientRect().top,
        passportBottom:passport.getBoundingClientRect().bottom,
        gridBottom:grid.bottom,startBottom:button.bottom,
        mapBottom:map.bottom,
        cityCount:document.querySelectorAll('#cityMap .city-stop').length
      };
    }""")
    assert bounds['cityCount']==10,(width,height,bounds)
    assert bounds['documentHeight']<=bounds['viewport']+3,(width,height,bounds)
    assert bounds['documentWidth']<=bounds['width']+3,(width,height,bounds)
    assert bounds['appHeight']<=bounds['appClientHeight']+3,(width,height,bounds)
    assert bounds['top']>=-2,(width,height,bounds)
    assert bounds['mapBottom']<=bounds['viewport']+2,(width,height,bounds)
    assert bounds['passportBottom']<=bounds['viewport']+2,(width,height,bounds)
    assert bounds['gridBottom']<=bounds['viewport']+2,(width,height,bounds)
    assert bounds['startBottom']<=bounds['viewport']+2,(width,height,bounds)


async def check_selection_only(browser, width, height):
    page=await browser.new_page(viewport={'width':width,'height':height})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    await page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load')
    await assert_selection_fits(page,width,height)
    assert not errors,(width,height,errors)
    await page.close()


async def check_landscape_fallback(browser, width, height):
    """Landscape is unsupported for layout, but browser fallback must not crash.

    Installed PWA and supported fullscreen browsers request portrait orientation.
    Desktop/unsupported browsers may still open the HTML in a wide viewport:
    exercise initialization and starting a race without imposing portrait fit.
    """
    assert width > height
    page=await browser.new_page(viewport={'width':width,'height':height})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    await page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load')
    assert await page.locator('#startBtn').count()==1
    assert await page.locator('#menuFullscreenBtn').count()==0
    assert await page.locator('#gameFullscreenBtn').count()==0
    # Dispatch through the app without requiring a landscape-visible tap target.
    await page.evaluate("document.querySelector('#startBtn').click()")
    assert await page.locator('#gameScreen').is_visible(),(width,height)
    assert await page.evaluate("window.SnackDashDebug.getGame() !== null"),(width,height)
    assert not errors,(width,height,errors)
    await page.close()


async def check_installed_controls(browser):
    """Installed PWA requests portrait without visible fullscreen controls."""
    for width,height in [(320,568),(390,844),(844,390)]:
        page=await browser.new_page(viewport={'width':width,'height':height})
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        await page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load')
        await page.evaluate("""() => {
          window.__portraitCalls=[];
          Object.defineProperty(screen.orientation,'lock',{configurable:true,
            value:mode=>{
              window.__portraitCalls.push(mode);
              // Some browsers expose the API but disallow orientation locking.
              // The rejected promise must not break the game.
              return Promise.reject(new Error('orientation lock unavailable'));
            }
          });
          const realMatchMedia=window.matchMedia.bind(window);
          window.matchMedia=query=>
            /display-mode:\\s*(standalone|fullscreen)/.test(query)
              ? {matches:true} : realMatchMedia(query);
          document.dispatchEvent(new Event('fullscreenchange'));
        }""")
        assert await page.locator('#menuFullscreenBtn').count()==0,(width,height)
        assert 'portrait' in await page.evaluate("window.__portraitCalls"),(width,height)
        await page.locator('#startBtn').click()
        assert await page.locator('#gameFullscreenBtn').count()==0,(width,height)
        widths=await page.evaluate("""() => {
          const restart=document.getElementById('restartBtn').getBoundingClientRect();
          const pause=document.getElementById('pauseBtn').getBoundingClientRect();
          const hud=document.querySelector('.scoreboard');
          return {restart:restart.width,pause:pause.width,
                  scroll:hud.scrollWidth,client:hud.clientWidth};
        }""")
        assert abs(widths['restart']-widths['pause'])<=2,(width,height,widths)
        assert widths['restart']>38,(width,height,widths)
        assert widths['scroll']<=widths['client']+3,(width,height,widths)
        await page.locator('#levelsBtn').click()
        assert await page.locator('#menuFullscreenBtn').count()==0,(width,height)
        assert not errors,(width,height,errors)
        await page.close()


async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True, executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or None, args=['--no-sandbox'])
        # The installed app is portrait-only; geometry checks cover supported
        # portrait sizes. Wide-window fallback is checked separately below.
        for dims in [(320,568),(360,740),(390,844),(414,896),(430,932),(768,1024),(820,1180)]:
            await check(browser,*dims)
            print('Portrait smoke passed:',dims)
        for dims in [(360,640),(390,700)]:
            await check_selection_only(browser,*dims)
            print('Portrait selection fit passed:',dims)
        for dims in [(568,320),(844,390),(914,411),(1024,768)]:
            await check_landscape_fallback(browser,*dims)
            print('Landscape fallback passed:',dims)
        await check_installed_controls(browser)
        print('Installed app passed: portrait lock, no fullscreen buttons, Restart/Pause width')
        await check_fullscreen_flow(browser)
        print('Fullscreen flow passed: auto Serve fullscreen, portrait lock, level return')
        await check_city_invitation(browser)
        print('City invitations passed: 8/10, 9/10, restart, and acknowledgment')
        await check_athlete_reactions(browser)
        print('Athlete native thanks and pain reactions without translations passed')
        await check_localized_canvas(browser)
        print('Localized Canvas transitions, celebrations and glyph fitting passed')
        await check_city_mode_rendering(browser)
        print('Ten city / three-mode rendering and reduced motion passed')
        await browser.close()


if __name__=='__main__':
    asyncio.run(main())
