# Snack Dash — Ten-city Streetscape & Fever / Inferno Specification

**Status:** IMPLEMENTATION SPECIFICATION ONLY. No gameplay or rendering code is changed by this document.  
**Baseline:** Existing SnackDash GitHub main branch, 25 November 2026.  
**Visual direction:** Local-city postcard streetscape with restrained marathon festival accents.  
**UI language:** English; this implementation brief is in Chinese.

## 1. Goals and constraints

Turn the current small roadside city icons into recognizable city-specific sidewalks, planting and architecture; make Fever and Inferno feel distinctly different during play.

**Must preserve:**
- 390 × 700 logical Canvas and current responsive fit-to-screen/fullscreen behaviour;
- road perspective and three-lane geometry; existing athlete number readability and tap coordinates;
- existing volunteer, table, hand positions; swap and throw are immediately usable;
- score, combo, runner speeds, number transformations, number generation, 100 races, city invitations, 40/60/90/120-second race lengths;
- all code and assets bundled in the self-contained offline HTML; no remote images, fonts, libraries or runtime services.

Fever begins with correct hit **#5** and Inferno with correct hit **#10**; the threshold hit already receives the active mode multiplier. A wrong throw resets combo/mode, with existing penalty semantics preserved.

**Ten actual cities:** Tokyo, Seoul, London, Berlin, Amsterdam, Paris, Boston, Chicago, New York and Sydney. Earlier brainstorming about Athens, Rome or Rio was not a change to the game.

## 2. Current code and responsibilities

Existing functions in src/js/game.js:

| Existing source | Responsibility / required change |
|---|---|
| CITY_VISUALS | Extend with pavement, green verge, furniture, landmark and energy accents. Ignore unused Athens configuration. |
| drawGround, drawRoad | Preserve road geometry; add clipped sidewalk patterns. |
| drawScenery | Replace generic bushes, flag and tiny repeated emblem with city-specific layers. |
| Marathon.draw | Separate background lighting from number-bearing sprites. |
| drawVolunteer, drawSwapCelebration | Preserve positions and hand-focused swap cue; add mode-appropriate movement only. |
| drawThrownSupply | Add short-lived mode-specific flight trail following the actual throw path. |
| tickThrow / resolveHit | Trigger visuals from outcomes; do not duplicate or change score calculation. |
| drawEffect | Single dominant score callout and one supporting burst, tiered by reward. |
| drawFeverFrame, drawInfernoLights, drawInfernoOverlay | Reduce persistent visual noise and protect numbers from occlusion. |
| Sfx | Add short original cues; keep the sound toggle and existing music. |
| CSS combo-panel | Distinct visual identity for Fever and Inferno without increasing HUD height. |

At y=700, the current road extends beyond the visible canvas edge on both sides. There is **no right-side pavement at the bottom**. City furniture must be drawn only in actual visible roadside space, not on top of moving runners. Do not alter the road shape to force extra decoration.

## 3. Canvas layers and spatial rules

| Layer | Content | Order |
|---|---|---|
| L0 | Distant landmark skyline silhouette | First, muted and static |
| L1 | Local pavement material, clipped to exterior of road | Behind road/people |
| L2 | Plants, verge, low street furniture | Behind players and runner numbers |
| L3 | Road and lane markings | Existing geometry unchanged |
| L4 | Energy atmosphere on **background only** | Before character sprites |
| L5 | Runners, bib numbers, table, volunteer and hand supply | Highest persistent contrast |
| L6 | Throw trails, ring bursts, short score labels | At actual action location |
| L7 | HUD (DOM), dialogs | Existing DOM priority |

**Placement:**
- Landmark silhouette: far upper scene, broadly y≈70–230, low contrast. One major landmark per city.
- Pavement/trees/rails: place where x lies outside leftEdge(y) or rightEdge(y), with a visible gap from the road stripe.
- Medium-depth streetscape: broadly y≈230–390. Use perspective scaling; do not block table (upper left) or volunteer (x≈102,y≈202).
- Near section: only where real verge remains visible, generally y≤470 on the left. Do not force decorations at y≈550 where the road covers the canvas.
- Modules: one landmark silhouette plus about two small repeated street-object types per scene, rather than crowded detailed architecture.
- No scenery element changes touch targets, geometry, runner velocity, collision or lane choice.
- Static pieces should be precomputed/cached where possible; do not generate random coordinates per frame.

## 4. Ten-city art bible

Existing city **road colours stay as configured**; the following are roadside accent suggestions.

| City | Pavement & planting | Street furniture | Recognizable far silhouette | Fever accent | Inferno accent |
|---|---|---|---|---|---|
| **Tokyo** | Pale-grey pavers, cherry blossom canopy/petals, compact hedge | Japanese lamp / understated lantern | Tokyo Tower | Pink petals and warm-gold flecks | Cherry-pink / gold light chase |
| **Seoul** | Light grid slabs, ginkgo foliage, modern planters | Small lantern/poster pole | N Seoul Tower on Namsan Hill | Golden ginkgo glints | Violet and blue city lights |
| **London** | Stone paving, clipped hedge, English flowers | Black iron rail, traditional lamp, red postbox | **Elizabeth Tower (Big Ben) + Palace of Westminster** | Amber/rose-gold sparkles | Purple-and-gold Parliament light show |
| **Berlin** | Cool-grey geometric setts, linden tree | Minimal planter, small bear sign | Brandenburg Gate | Teal and lime geometry | Architectural column light bars |
| **Amsterdam** | Brick pavers, tulip planter | Canal rail and small bicycle silhouette | Arched canal bridge, gabled canal houses | Petals and warm reflections | Cyan/amber canal ripples |
| **Paris** | Warm cream cobbles, flowering boxes | Ornate black lamp, café-style details | Eiffel Tower | Lilac-and-gold petal ribbon | Violet-gold tower outline |
| **Boston** | Red brick footpath, shade tree | Historic lamp, compact marathon sign | Brick townhouses / historic Boston streetscape | Marathon blue/yellow stars | Blue/gold cheering arcs |
| **Chicago** | Slate concrete, riverfront shrub planters | Bridge rail, elevated-track post | Chicago skyline / river bridge | Green river flecks | Electric green/cyan skyline beams |
| **New York** | Grey pavement grid, square tree pits | Hydrant, subway sign, simple bench | Manhattan skyline / Empire State Building | Yellow urban light streaks | City-window sparkle, yellow/blue sweep |
| **Sydney** | Sandy promenade tiles, coastal grasses / eucalyptus | White harbour rail | **Sydney Opera House and Harbour Bridge** | Cyan sea breeze sparkles | Blue/white harbour light waves |

**City asset contract:** define one compact configuration per actual city using pavement pattern, plant shape, street furniture shape, skyline shape and energy accent. Reuse helper primitives; avoid ten independent renderer classes. No flag-only decoration.

All landmarks should be recognizable by silhouette at small size, not by tiny printed labels.

## 5. Two modes, distinct emotional goals

| Dimension | Fever: rhythm / flow | Inferno: stage finale |
|---|---|---|
| Overall mood | Warm, bright, smooth, joyful | High-contrast stage lighting, dramatic isolated hit |
| Persistent colours | Amber, gold, light pink, city accent | Dark violet backdrop, bright gold/cyan/pink with city variation |
| Background | Gentle curb light, city foliage sway | **Backdrop-only dimming 12–15%**, slow beams |
| Throw | Warm luminous arc, small spark trail | Layered gold/cyan/pink trail with restrained afterimages |
| Hit | One cheerful pulse, star ring, readable points | Bigger local impact, tiered shockwave and point pop |
| Runner | Big smile/thumb-up, small momentary bounce | More expressive cheer and rare reward-tier celebratory hop |
| HUD | FEVER plaque, larger combo text, warm pulse | INFERNO label, combo² obvious, deep-purple/gold accents |
| Audio | Short rising chime | Heavier original layered accent on mega |
| Default motion | No camera shake | Shake only for large reward, tightly bounded |

Avoid trying to distinguish modes purely by “more particles” or by covering the entire road with text.

## 6. Trigger and timing specification

| Event | Trigger | Feedback | Target life | Rules |
|---|---|---|---|---|
| Fever enter | Fifth consecutive correct hit | Short gold edge bloom, one Fever title swell, city-themed accent | 400–600 ms | This hit uses Fever score multiplier |
| Fever idle | Every frame while Fever active | Light curb pulse and city motif | Slow 0.8–1.2 s pulse, opacity ≤0.15 | No bib occlusion |
| Fever throw | Player throws | Warm trail from hand to moving runner | Flight lasts existing 0.41 s | Do not alter throwing timing |
| Fever impact | Correct catch | Local small star ring, animated +score, joyful face | 200–550 ms | No hard flash or long freeze |
| Inferno enter | Tenth consecutive correct hit | Short controlled burst + new stage spotlights and INFERNO HUD | 550–700 ms | This hit uses Inferno multiplier |
| Inferno idle | While Inferno | 3–4 slow beams behind characters; skyline light-up | 1.8–3.0 s beam sweep | Backdrop-only dimming |
| Inferno throw | Player throws | Bright layered trail + brief ghost afterimage | Existing 0.41 s | New snack digits remain legible |
| Inferno impact | Correct catch | Short shock ring and tiered points | 250–550 ms | Tier limits below |
| Wrong hit / mode exit | Incorrect throw in bonus mode | Single short “cool-down” effect; normal mode restored | 250–400 ms | Preserve current no-penalty-in-bonus rule |

At mode transitions, prefer one entrance effect; do not stack entrance, mega, speech bubble and oversized equation simultaneously.

## 7. Hit reward tiers and readable feedback

Use **the already-computed outcome.delta**. Scoring itself is unchanged.

| Tier | Score increment | Fever | Inferno |
|---|---|---|---|
| T1 | ≤20 | Small gold ring and +N | Bright small ring and +N |
| T2 | 21–30 | Enlarged +N (≈115%), short cheer | Larger +N and side starburst, small runner hop |
| T3 | >30 | Strong gold flourish, no large shake | Mega impact: radial ring, minimal white/gold accent, local burst, small shake |

**Inferno T3 limits:** hitstop **≤45 ms**, shake **≤3 CSS pixels** for **≤130 ms**, and flash **≤80 ms**, preferably localized rather than full-screen.

Current implementation can hitstop about 85 ms and shake more strongly. Those should be adjusted when implementing this spec; they are not already changed.

### Priority of visual attention

1. Runner bib numbers and held/queued supply numbers remain sharp and bright.
2. Eye follows hand → flying supply → runner → +score.
3. Draw one dominant +score and at most one extra supporting label at a hit; show arithmetic feedback in the existing lower information strip.
4. Speech bubbles should not sit across active bibs. Never draw a persistent opaque central mega starburst.
5. Fever and Inferno effects use transient events with age/lifetime and do not block rapid swaps or further input.

## 8. Visual protection rules

- Draw the Inferno background filter / spotlights **before** runner and number sprites; the current backdrop layer should not dim HUD or runners.
- No opaque overlay over bounding boxes of bib labels or supply digits.
- If a burst overlaps an athlete number, clip/reposition it or draw the bib in a final foreground pass (without changing its hitbox).
- City decorations must not impersonate runner bibs, labels or supplies.
- Use existing 390×700 Canvas coordinates and preserve the viewport sizing code.
- Respect prefers-reduced-motion: disable shake, high-speed sweep, flashes and excessive particle count while retaining clear state/score feedback.

## 9. Sound specification

| Cue | Approximate max duration | Character |
|---|---:|---|
| Fever entry | 350 ms | Short rising major-leaning chime, not a licensed tune |
| Fever catch | 180 ms | Bright gentle chime |
| Inferno entry | 450 ms | Original layered rise / impact |
| Inferno regular catch | 200 ms | Crisp impact with high sparkle |
| Inferno mega | 220 ms | Short bass + bright strike, avoid overpowering gameplay |
| Bonus exit | 250 ms | Descending short closure |

Sound remains governed by the current sound toggle and AudioContext unlocking. No continuous high-volume loop or music copied from existing songs.

## 10. Suggested minimal implementation API

Keep this within src/js/game.js until there is a concrete need for a separate file. Do not over-abstract.

~~~js
const SCENE_THEMES = {
  tokyo: {
    pavement: 'grey-grid',
    plants: ['cherry', 'low-hedge'],
    furniture: ['japanese-lamp'],
    landmark: 'tokyo-tower',
    feverMotif: 'petals',
    infernoLighting: 'pink-gold'
  }
  // ... nine more actual city keys ...
};
function drawCityBackdrop(theme,time) {}
function drawCityVerge(theme,time,roadLeft,roadRight) {}
function drawModeBackdrop(mode,theme,time) {}
function drawHitFeedback(event,mode) {}
~~~

Current mode can be derived as:

~~~js
const mode = game.inferno ? 'inferno' : game.fever ? 'fever' : 'normal';
~~~

Drive action effects from the same resolved hit, not by recalculating anything in the renderer.

## 11. Performance and effect budgets

- Static city geometry: roughly **one landmark and two repeating object families** per city; cache Path2D/offscreen shapes if beneficial.
- Ambient particles: ≤12 Fever, ≤18 Inferno at once.
- Short hit bursts: ≤24 Fever, ≤36 Inferno; discard the oldest when the budget is exceeded.
- Use deterministic module positions and seed; no frame-to-frame random scenery flicker.
- At 320×568 through 414×896, the entire HUD, road and supply strip must still fit and remain tappable.
- Do not change runner speed, data generation, real-time countdown or invulnerability.
- No new JavaScript libraries, runtime assets or services. Same offline build pipeline.

## 12. Implementation phases (every phase remains playable)

| Phase | Deliverable | Test checkpoint |
|---|---|---|
| P1 | Ten city configurations, distinct static pavement/plant/furniture/landmark art | Ten city screenshots; geometric clip and supply/runner hitbox tests |
| P2 | Correct layer order for scenery/light and number-bearing sprites | No darkened or obscured numbers; no scene geometry changes |
| P3 | Fever warm ambience, throw trail, cheerful runner reward and HUD | Correct at combo 5, correct wrong-hit exit, sound-off test |
| P4 | Inferno backdrop-only dimming, spotlights, trail, impact tiers, bounded shake | Correct at combo 10; T1/T2/T3 tier boundaries and reduced motion |
| P5 | Cross-city integration and QA | 10 cities × 3 states × 4 phone sizes; CI and Releases |

## 13. Acceptance tests

- All ten real cities have distinctly recognizable silhouettes, planting and sidewalk material; not only a small flag or emblem.
- Road edges/width, runner spawn/traffic, bib numbers, volunteer positions and hit-test math remain unchanged.
- Fever enters at combo 5, Inferno at combo 10 and wrong throws reset exactly as before.
- Score tier edge tests: 20→T1, 21→T2, 30→T2, 31→T3.
- One-hit feedback never leaves an opaque effect across a runner bib; labels and +scores remain legible.
- Inferno background dimming is applied to **background only**.
- Reduced-motion and mute modes remain functional.
- No regression in city invitation logic, fullscreen selection/game buttons or saved progress.
- Browser mobile smoke suite and Node mathematical unit tests pass before merge.
- Each tested main-branch build is still downloadable as HTML/ZIP from GitHub Releases; stable versioned releases remain separate.

**Implementation status:** specification delivered. No claim that the new scenery or redesigned Fever/Inferno is already programmed.
