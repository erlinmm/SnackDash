# Tokyo Landscape Playtest — r03 source asset integration

Current branch: feature/tokyo-landscape-playtest. Asset source: feature/main2-steps05-08-assets-r01 @ 5cd2840daaef280f239fd3b404cc146572c030ed. Source directories are copied by Git tree SHA, not regenerated or merged. The original r02 raster atlas is historical, except for four canonical supply icons missing from the newer pack.

## Build and run

    python scripts/build_tokyo.py --zip

Open dist/Snack_Dash_Tokyo_Preview.html in a browser in landscape. The build embeds all runtime assets, metadata, and review WAV audio. No network, server, or third-party Python package is required. The regular 100-race build remains unchanged.

## Integrated assets

- New independent Normal/Fever/Inferno empty Tokyo riverside plates, shared high-angle curved road, traced camera coordinates and unchanged station geometry. Lane centers are interpolated between the supplied camera control points using the projected shoe depth; not a pinhole calibration.
- All 22 r03 runner bodies, 176 source gait frames at the authored loop timing, receive/thanks/pain/cheer and additional reaction/selection poses. Appearance and nationality/native-language identity are selected independently. The per-body source scale and transformed blank bib anchor are used to render live digits.
- All six staff outfits and 50 source action frames, including climb/descend/throw/swap poses. The source frame pivot and item anchor drive the visual attachment. Reference bottles in staff and runner receive SVGs are removed from the runtime derivation; the real current item is composited instead.
- All 18 crowd groups, clipped to sidewalk areas; remove the source's straight review rail because the empty plates already contain curved railings. Crowd art is mode-specific; there are no dedicated crowd motion frames in the source.
- New fixed-height table, water/banana hand/flight/slot images, empty speech bubble and reserve skin. Gel is embedded but not selected by the canonical item generator; apple/orange/bar/juice still use the existing raster icons, as no replacement exists. Existing supply type and number distributions remain unchanged.
- New vertical two-slot arrangement follows the most recent r03 layout manifest, superseding the earlier side-by-side review layout. Both controls remain fixed in every mode.
- Blank HUD skins and independent staff avatars, preserving existing interactive buttons including return, pause, restart and sound. Native festival labels and all numeric text remain dynamic.
- Mode-specific FX and normal/reduced motion frame timelines, with independent score and bib text. Five review WAV cues attach to existing swap, normal catch, miss and mode-entry sound hooks; original synth cues remain fallback and higher combo/music cues remain.
- Source images are embedded directly. Build-time XML processing only strips named baked props/duplicate barriers; original masters are unchanged. Browser caches up to 96 rasterized SVG frames; no procedural character drawing or full review composition is rendered.

## Functional behavior

Canonical math, score, race difficulty/timers, native athlete reactions, learning, and isolated preview save keys remain unchanged. All ten Tokyo races are playable. The existing shortened visual throw recovery and disabled hitstop remain preview-only. QA fixtures are view-only, do not record scores, and are separate from true combo transitions.

## Verification

    node --check src/tokyo/art.js
    node --check src/tokyo/preview.js
    node --test tests/test_math.cjs tests/test_i18n.cjs tests/test_reactions.cjs
    python -m unittest discover -s tests -p 'test_*.py'
    python scripts/build_tokyo.py --zip
    python tests/tokyo_smoke.py
    python tests/smoke.py

CI builds and tests the actual game, captures six QA screenshots, the eight-runner fixture and live Fever/Inferno states. The new source art is explicitly review status, not production-approved. Source r03 notes flag mid/far four-digit bib size on small phones; runtime uses a modest minimum digit plate size without removing targets. Final physical-device readability, crowd motion, exact art fidelity and Safari compatibility remain for review. No production release, no merge, no changes to main/main2 or the source art branch.
