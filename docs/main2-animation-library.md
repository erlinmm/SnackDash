# SnackDash V2 — Animation & FX library (planning draft 0.1)

**No executable animation or game code is included.** These are proposed reusable animation families and review targets. They must remain linked to existing gameplay events; visual animations must not determine the game's hit results, time or score.

## 1. Animation building blocks

| Family / ID | Content / key poses | Trigger | Draft timing / cadence |
|---|---|---|---|
| `runner.run.front` | Front-facing alternating stride; arms, feet, body bob; readable bib | Continuous while visible | 6–10 illustrated poses or skeletal motion loop |
| `runner.react.hit` | Smile, small bounce, positive gesture | Confirmed catch | 200–500ms |
| `volunteer.idle` | Blink, subtle breathing, ready-to-serve pose behind counter | Normal / Fever between actions | 2–4s low-amplitude loop |
| `volunteer.swap` | Reach toward selected reserve supply, raise held number | Valid two-slot swap | 250–450ms, touch never disabled |
| `volunteer.throw` | Extend hand, release, recover | Existing game throw | **Keep present throw/impact timing contract; animation overlays game event** |
| `volunteer.climb.enter` | Foot to tabletop, step up, steady stance, elaborate outfit hangs down | Enter Inferno | Explore 500–800ms (requires gameplay-safe transition) |
| `volunteer.inferno.idle` | Stay atop the unchanged tabletop; confident celebratory stance | Inferno | Loop without moving table |
| `volunteer.inferno.throw` | Throw from higher hand point, hold balance | Inferno throw | Follow existing throw event |
| `volunteer.climb.exit` | Return behind tabletop, avoid teleport | Leave Inferno | Explore 350–650ms |
| `fever.enter` | Event name reveal + one edge bloom | Combo enters Fever | 400–600ms |
| `inferno.enter` | Festival climax; controlled fireworks/beam accent | Combo enters Inferno | 550–700ms |
| `fx.throw.trail` | Track actual held supply in flight | Supply release | Flight-duration only |
| `fx.hit.small/large` | Localized score pulse, ring and optional burst | Confirmed hit | 200–550ms |
| `fx.mode.exit` | Brief light fade, restore Normal | Wrong throw / state exit | 250–400ms |
| `fx.city.ambient` | Petals / lantern glow / light projection / confetti | Mode and city | Slow, reusable loops |
| `fx.city.climax` | City-specific fireworks, aerial motifs, projected artwork | Inferno event | Event-driven or low-rate ambient, not continuous full-screen noise |

Timings above are **drafts**, not existing working code. Motion is authored at e.g. 8–12 fps for cartoons while position interpolation and the canvas can still refresh at up to 60 fps; choose measured values during prototype.

## 2. Mode behaviour contract

- Normal: clear game, gentle city-specific background life.
- Fever: higher festive energy; staff remains behind counter; festival outfit; no full-screen opaque flashes.
- Inferno: higher-stage spectacle; staff **physically stands on tabletop** while throwing; no change to table height or two spare-supply targets.
- For female long garments, animation controls silhouette from waist through hem: the skirt/robe falls naturally over the legs when standing, climbing and throwing. No blown-up skirt reveals legs or awkward body exposure.
- Inferno entry may animate while the player continues to interact. Define a gameplay-independent transition state so input, numbers, reach and throw origins never become inconsistent.

## 3. Attachment points (to be specified in production)

Every character frame keeps named anchor points in the **same local coordinate space**:

- `feet_left`, `feet_right`: contact tabletop or ground
- `hand_supply`: held-digit box and actual throw start
- `head`, `torso`, `robe_hem`: collision-free layout and costume continuity
- `station_tabletop`: unchanged, shared environment anchor
- `supply_slot_0`, `supply_slot_1`: independent fixed screen-space touch/UI anchors

The runner **visual sprite may shrink with distance**, but screen-space tap padding must not collapse to unusable size. Bib digits are separate high-contrast overlays (not part of the sprite).

## 4. Festival effect palette

| City | Fever ambient | Inferno climax (planned) |
|---|---|---|
| Tokyo | Sakura petals and lantern glints | Sumida fireworks + river/night lighting |
| Seoul | Seoul lantern illumination | Seoul fireworks |
| London | Carnival ribbons, feathers, confetti | New Year's Eve skyline fireworks |
| Berlin | Carnival colour, rhythm accents | Architectural light projections |
| Amsterdam | Tulip petals, canal reflections | Orange-themed King's Day confetti |
| Paris | Nuit Blanche art illumination | National-day fireworks / Eiffel light |
| Boston | Marathon cheering ribbons | Concert/fireworks gold-blue bursts |
| Chicago | Green river reflections | Air and Water Show aircraft trail motifs |
| New York | Parade streamers / balloon silhouettes | Times Square countdown light + confetti |
| Sydney | Vivid colour projections | Harbour bridge / Opera House New Year's fireworks |

Names and associated events are **working research targets**, not official verified labels or licensed event marks.

## 5. Production/performance direction (not measured yet)

- Keep static buildings, curbs, sidewalks and pavement on cached background layers where possible; do not redraw full detailed vector scenery every frame.
- Prefer texture/sprite atlas frames and simple transforms for character animation, while crisp digits are rendered separately.
- Prefer baked glow atlases over many simultaneous Canvas `shadowBlur` calls; avoid expensive full-screen blend effects.
- Initial *candidate* upper bounds: ambient 12 particles Fever / 18 Inferno; short-lived impact 24 Fever / 36 Inferno. These are design starting points, not guarantees.
- Target modern phone 60 fps, degraded mode 30 fps; cap high-refresh redraw work when needed. Validate Android Chrome and iOS Safari before claiming performance.
- Respect reduced-motion: suppress large shake/high-speed sweeps and intense flash, retain readable mode status.
- Asset exports may be inlined into the eventual offline single HTML, but build integration is **out of scope** until art choices and compression/device testing are approved.
- Use original sound cues (short rising Fever, stronger Inferno entry, distinct impact tiers); no copyrighted tunes.

## 6. Required review clips/storyboards

1. **Tokyo female**: behind-stall Normal → pink Fever outfit → climb onto SAME table in long Inferno robe, throw and descend.
2. **Tokyo male**: same milestones, matching festival theme.
3. **Berlin female/male**: local festival visuals plus historically inspired German costume option, culturally labelled correctly.
4. **London female/male**: morning dress / Victorian silhouette option and actual Carnival-themed celebration as distinct approaches.
5. A crowd of runners with two backups held constant in lower-left: near/far scale and three-lane bib readability.
6. Reduced-motion and low-quality FX examples for smartphone testing.

**Review outcome for every clip:** `accepted`, `revise`, or `rejected`, recorded with version and changes. None of these clips is approved/produced at branch creation.
