# Landscape Engine V2 — asset authoring and integration contract

**Technical engine acceptance only.** The prior Tokyo artwork was rejected.
Only the three source-exact street plates are retained as accepted background
inputs. All other migrated r03 art and newly created QA art remain explicitly
unapproved. --release rejects these packs and their review-only resources.

## Responsibilities

- game.js owns the canonical race rules, mathematics, traffic, timer, save and
  progression. It exposes semantic commands and immutable events (including
  modeBefore and modeAfter). Art uses a separate deterministic variant choice
  and never consumes the gameplay RNG.
- animation.js implements the common multi-frame player and a marker-relative
  multi-object timeline scheduler. No city names, DOM or Canvas dependency.
- renderer.js composes world layers, actors, independent table objects, dynamic
  digits, physical item paths and event-bound effects from the compiled pack.
- hud.js creates its own component tree from the HUD theme and binds only the
  stable read model and command vocabulary. There is no fixed game HUD markup
  in the landscape HTML and no fixed widget selectors in the renderer.
- audio.js chooses samples or explicitly configured synthesized cues from
  semantic events and animation markers; optional looped music is per mode.
- scene_assets.py validates and compiles the selected pack and its shared parts
  into pre-rasterized, trimmed atlas pages, preserving street raster bytes.

## Pack layout

assets/cities/<id>/pack.json is the entry point. It has schemaVersion=2, id,
raceCityId, artRevision, reviewStatus and a parts mapping to JSON files relative
to the pack. A pack may extend another pack and apply explicit data patches.
Parts may reference shared files under assets, including assets/hud/themes.
Paths cannot escape the repository. No city-specific build code is needed.

Core parts: scene (world geometry and visual dimensions), resources (logical
sprite IDs and source paths/crops), clips, actors, bindings, world, transitions,
fx, audio, sounds, supplies, ui, hud. An independent HUD theme can be replaced
without changing any world/actor configuration or JavaScript.

### Sprite and clip

A resource declares path (PNG, WebP, JPEG or SVG authoring input), optional
rect [x,y,w,h] in a source atlas, sourceSize [w,h] before trimming, trimOffset
[x,y], standalone and preserveBytes (only complete raster sources).
The compiler produces an atlas page, crop rectangle and accumulated trimOffset.

clips is a map of clip ID to {frames,playback,next?,repeat?,attachItem?,size?}.
Each frame has image (logical resource ID), durationMs, optional marks.
Actor frames also specify sourceSize, pivot and anchors; runners require bib
[centerX,centerY,width,height], hand and head; staff require hand, head and
prop (the separate hand for decorative objects). All use original untrimmed
pixel coordinates. FX clips specify their design size. Frames may have different
original dimensions. The renderer uses each frame's own metadata.

Actor set modes map normal/fever/inferno -> action -> clip ID, a list of
deterministic variants, or explicit normal/reduced alternatives. A shared
clip is declared by referencing the same ID; there is no implicit fallback.
playback is once, loop or hold. repeat=0 means unbounded loop. next is an action
in the same mode. bindings specify event, action, mode before/after/visual,
priority and interruption policy (higher, allow, never), plus event conditions.
The staff throw clip must have one release mark after windup. It is fitted to
the canonical throw recovery interval, with release strictly before hit=.41s.
Changing art does not change the gameplay hit or recovery instant.

### Independent world objects

world.nodes is a list of named items with rect, z and per-mode images and/or
clips; images/clips may have normal/reduced mappings. A node can be sky, far
landmark, road, foliage, foreground, animated scenery, table layer, scroll,
or decorative prop. The base street is identified by role=street. Drawing order
is z, with dynamic runners depth-ordered within their configured band.
Optional state and modeState specify position (center), scale, rotation
(degrees), opacity, visible, reveal, skinMode, attach and object-specific
properties. revealRect crops a roll-up graphic. attach={target:"staff",anchor:
"prop"} follows that frame's actual anchor; detaching preserves world position
if no explicit position is supplied. Decorative bottles are never inventory.

### Multi-object transitions

transitions maps "from>to" to tracks. Each track has a unique id, target,
type (clip, tween, set, cue) and start. A time can be a number of milliseconds
or {track:"earlier-track",point:"start"|"end",offsetMs?} or
{track:"earlier-clip",marker:"name",offsetMs?}. References must name an earlier
declared track; the scheduler derives times from the selected clip, so changing
the climb's frame count or frame durations changes the kick timing automatically.

A clip track selects an actor action and mode, or a direct clip ID for a world
object. An optional durationMs fits it; otherwise use authored durations.
A tween has end (time reference) or durationMs, to property values, optional
normalized keyframes, ease, begin/finish patches. A set writes values once.
A cue emits a named marker. Conditional tracks can test an object's initial
property with equals, notEquals or gt. Independent tracks execute concurrently.
Marker callbacks run after continuous transforms reach that instant.

Required choreography in the Tokyo technical fixture:
- normal>fever: rapid costume change, scroll retract/change/expand.
- fever>normal: reverse costume change and scroll restoration.
- fever>inferno: costume change, climb to the SAME table contact, then kick.
  Kick clip starts at climb/table.contact; independent bottle flights start
  at kick/bottle.kick, never before contact. Stand follows kick.
- inferno>normal: descend and ground.contact, normal costume, then pickup
  from below table (grab -> attach -> lower -> detach -> place), for every
  missing decorative bottle, and scroll restoration.
World art and logical mode HUD respond immediately to game mode events.
Visual transitions yield to actual throws/swaps and resume without blocking
input. Entry tracks can declare interruption recovery routes. Rapid changes
coalesce to the latest desired mode; recovery starts from current object
transforms and restores terminal state without duplicating inventory.
The current choreography uses provisional frame proxies: actual human poses
and exact contact quality must be supplied by approved production artwork.

### Effects and audio

fx.bindings describes event, mode source, optional conditions, per-mode
normal/reduced clips, anchor (screen, staff.<anchor>, runner.<anchor>,
projectile, object, hud.binding), offset, width/height, z, opacity, follow,
speed/duration, and scaleBy thresholds in combo and delta. Multiple bindings
can respond to one event. Effect lifetimes are independent of core legacy
FX TTLs. A miss uses modeBefore even when modeAfter is normal. Optional dynamic
score labels are rendered from the event delta. The actual supply flight
starts at the authored release anchor; it follows a configured per-mode path.
Music and sound assets may be WAV/OGG/MP3. audio.bindings select sound IDs or
declared synth methods from events/markers; audio.music declares each mode.
Audio decoding never blocks the engine.

### HUD theme

The standalone HUD part specifies its own canvas, widgets tree and animations.
Widgets: container, text, image, animation, button, progress. Each has id, rect
(relative to its parent), optional rectByMode, images/clips by mode, fontSize,
fontFamily, fontWeight, color/colors, background, radius, align, wrap, opacity,
z and styleByMode. Children can be freely grouped and reordered. Bindings
include score.current/exact/goal, time.remaining, race.index/phase/countdown,
combo.count/progress/label, mode.current/label, progress.cityCleared,
audio.enabled/glyph/label, controls.pauseGlyph/pauseLabel, result.visible/won/
heading/text/stats/primary, held.number/type, message and hint. Formatters:
clock, compact, number, percent. Buttons use menu, pause, restart, sound,
fullscreen, result.next commands. The theme must retain those functional
commands; individual information widgets may be added/removed/repositioned.
visibleWhen/enabledWhen support equality, oneOf and numeric limits. HUD
animations select event/target, duration, optional mode-specific clip and
normalized transform/opacity keyframes and strength thresholds. This includes
the result and pause surfaces. Decorative widgets do not intercept input.

## Build and acceptance

    python -m pip install -r scripts/requirements-landscape.txt
    python scripts/build_city.py --city tokyo --zip
    python scripts/build_city.py --city qa-london --zip
    python scripts/build.py --zip
    node --test tests/test_math.cjs tests/test_i18n.cjs tests/test_reactions.cjs tests/test_animation.cjs
    python -m unittest discover -s tests -p 'test_*.py'
    python -m pip install playwright==1.58.0
    python -m playwright install chromium
    python tests/landscape_asset_smoke.py
    python tests/tokyo_smoke.py
    python tests/smoke.py

The synthetic London replacement pack is not London production art. It changes
street/independent sky, table, scroll, runner dimensions and per-mode actions,
staff idle/throw/climb/kick, crowd actions, HUD component hierarchy, FX and
an audio binding without application changes. Browser tests use actual
semantic input and draw traces, compare equal seeded outcomes across packs,
verify all three street bytes, contact/kick/restock ordering and interrupted
transitions. GIF evidence is sampled from actual game frames on a manually
stepped test clock. Portrait defaults remain subject to full regression.
Physical-phone performance and production visual fidelity remain separate
acceptance gates, not inferred from a green CI build.
