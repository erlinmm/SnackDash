# Demo V2 — r03 polish

Base engine: Landscape Engine V2; art source commit f53cb7a9fc3f2c2173765568f6161f6bc59dbf7c on feature/main2-steps05-08-assets-r01. This revision includes limited shared renderer/animation/compiler and game-rule interface fixes in demov2 only, rather than changing a generated HTML. The portrait defaults and canonical scoring thresholds remain unchanged.

Build: `python scripts/build_city.py --city tokyo-demo --output dist/SnackDash_DemoV2.html --zip`.

Debug is opt-in via the menu button. It carries into started/restarted races, sets Fever at combo 2 and Inferno at 4, uses each runner's base pace for all hit counts and modes, and excludes practice/progress writes. Normal play remains 5/10 with canonical acceleration. Static QA inspections are separate nonpersistent fixtures and do not toggle debug.

The bib follows each sprite's natural untrimmed anchor and scale. Distance callouts are based on glyph size in displayed CSS pixels, placed without obscuring faces or bibs, and are tappable. They disappear as a bib becomes readable; a colliding bubble is suppressed and retried on the next frame. Each runner uses an integrated cadence clock. Crowd/FX/ambient clips are ordinary engine assets with mode-specific rates, phase offsets, reduced-motion alternatives and event width configuration.

The 22 appearance slots include nine original illustrated bases, four new painted multi-pose characters and nine explicitly derived appearance variants. Intermediate frames use offline limb deformation; not all characters/reaction poses are independently hand-drawn. See the source README and polish-provenance.json. Art remains review-only. The original street bytes, independent physical supplies, station and staff choreography are retained. Physical-phone performance and final visual approval are still separate gates.

Browser acceptance verifies all races, real semantic hits, transitions, debug isolation, animation frame changes and input. 
