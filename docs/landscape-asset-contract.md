# Landscape asset contract v1 — technical refactoring gate

**Not a new art approval.** The prior r03 SVG artwork has been rejected for
customer delivery. Tokyo's three independent street plates are preserved.
The rest of the current pack is retained only as a compatibility/test input
until independently approved replacements exist.

## Interfaces

- src/js/math.js: canonical NumberDirector and scoring, with a configurable
  backup count (the portrait default is three).
- src/js/game.js: canonical race state, timers, traffic, scoring, storage and
  native reactions. Explicit presentation boundary, with semantic commands
  swapSupply(index) and throwSupply(runnerId). The ordinary portrait build
  continues to use its own defaults and renderer. No build-time JS patches.
- src/landscape/renderer.js: common atlas compositor, animation player,
  anchors, input hit testing, perspective projection and effect rendering.
  Visual-only state is held in WeakMaps; actual outcomes remain in the engine.
- src/landscape/presentation.js: responsive browser controls, city selection,
  localization, HUD layout and sound adapter.
- scripts/scene_assets.py: generic pack validation, source conversion, alpha
  trim, atlas packing, deduplication and offline embedding.
- scripts/build_city.py: ordinary template build using identical application
  sources for each city. The legacy build_tokyo.py is a compatibility wrapper.

## Replacing assets

The runtime-facing editable input is assets/cities/<id>/pack.json.
schemaVersion is the interface version, not the art revision.
artRevision describes the particular art; reviewStatus describes approval.
The source artwork can live anywhere under assets. Logical resource IDs remain
stable when artwork files move or change. Never encode a dynamic number in
artwork. A new frame can point to an individual PNG/WebP/JPEG/SVG or a crop
of an existing raster atlas.

Resource example (coordinates are in original source pixels):

    "runner/example/run/0": {
      "path": "assets/exports/example/run.png",
      "rect": [20, 40, 160, 220],
      "sourceSize": [256, 320],
      "trimOffset": [48, 50]
    }

A clip frame refers to that logical ID with sourceSize, durationMs, pivot
and anchors. Runner anchors.bib is [centerX,centerY,width,height];
anchors.hand is [x,y]. Staff pivot is its foot/contact point.
The compiler applies any further alpha trim, records the actual atlas
rectangle and adds the trim offset; the renderer always uses original
untrimmed source coordinates.

Staff clips are lists of frame IDs (idle, swap, throw, enter, exit).
The throw clip has exactly one frame with event=release, after the windup.
Release is a presentation marker, not a scoring event. The canonical hit
time and gameplay rules are unchanged; the physical item starts flight
at the release frame's hand anchor. Runner reaction clips, crowd clips
and normal/reduced FX timelines are data. The existing crowd source
contains static review art, not actual animated frames.

scene.json data is currently embedded under pack.scene to keep a single
editable contract. It defines camera, perspective, logical traffic
geometry, starting bands, visibility, table layers and contact positions,
staff height and motion timings, reserve rectangles, HUD rectangles, FX
anchors, typography, and QA fixture positions. Static station layers
use back/body/front ordering around the staff; each layer can reference
a different resource and destination rectangle. A new city may share
the same global resources or declare different ones. No city-specific
logic is required for another existing canonical city.

Logical traffic geometry is separate from the actual sprite dimensions.
Only a change to scene geometry may change visible eligibility and traffic;
changing sprite pixels, trim, anchors or frame counts must not alter scoring
for the same seed and semantic command sequence. Pointer clicks follow
the displayed frame, then dispatch semantic commands.

The compiler accepts a fully independent pack, or a declared parent
pack with a small list of explicit data patches. qa-london is a synthetic
test-only pack, NOT London production artwork. It changes a background,
runner source size/frames, staff hand/height, reserve positions and HUD.
It loads the existing canonical London race chapter and uses separate
preview storage.

## Build

    python -m pip install -r scripts/requirements-landscape.txt
    python scripts/build_city.py --city tokyo --zip
    python scripts/build_city.py --city qa-london --zip
    python scripts/build.py --zip

The landscape builder embeds pre-rasterized atlas pages; SVG source is
never rasterized during gameplay. Backgrounds marked preserveBytes are
embedded unchanged, with source SHA-256 records. Each build includes only
the requested city pack, and static scene layers are cached.

--release requires an explicitly approved pack and rejects the current
Tokyo review fixture and the synthetic test city. It is not production
publication. The previous preview artwork remains in Git history.

## Acceptance

    node --test tests/test_math.cjs tests/test_i18n.cjs tests/test_reactions.cjs
    python -m unittest discover -s tests -p 'test_*.py'
    python -m pip install playwright==1.58.0
    python -m playwright install chromium
    python tests/landscape_asset_smoke.py
    python tests/tokyo_smoke.py
    python tests/smoke.py

The cross-pack test compares complete generated application source,
checks all three Tokyo background bytes, traces actual compositor
draw calls, validates windup/release/receive and moves physical reserve
controls, and compares seeded gameplay snapshots in two cities.
The ordinary Tokyo suite and portrait regression remain mandatory.

This establishes the replaceable architecture gate, not final art
quality. Real illustrated runner/staff/crowd sprites, production HUD
and table art, refined action timing, FX polish and real phone visual/
performance acceptance are a separate next gate.
