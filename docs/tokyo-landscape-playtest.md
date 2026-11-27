# Tokyo Landscape Playtest — illustrated art pass r02

The prior geometric actor and street renderer is superseded. The approved
Step 10 review board is the visual target. This branch reuses the canonical
SnackDash engine, rather than creating a different arithmetic game.

## Run

    python scripts/build_tokyo.py --zip

Open dist/Snack_Dash_Tokyo_Preview.html in a browser in landscape. All seven
WebP assets are embedded; no external images or network access are required.
The canonical 100-race build is unchanged.

## Artwork and source provenance

See assets/exports/tokyo/manifest.json for the independent atlas, source
descriptions and attachment coordinates.

- Three illustrated street backgrounds share the same reprojected lane
  geometry. Normal uses a new independent Tokyo street master; Fever uses
  cherry-blossom grading and isolated sakura textures; Inferno uses a night
  grade and isolated r01 firework light.
- Six staff cutouts: female Inferno's long robe and feet are isolated from
  r01/tokyo_inferno_supply_number_only.png. Male costumes are isolated
  from the approved Step 10 board, with the clipped Inferno hair cap
  repaired using its Normal character. Female Normal/Fever use new
  illustrated working art. No sample supply, number bubble, table,
  other actor or UI is retained in the cutouts. Male sources are lower
  resolution than final production masters.
- Six full-body runner identities with blank chest bibs follow r01's
  visual style. Appearance selection is independent of the canonical
  eleven nationality/native-language profiles. This is not the full
  planned 22-person cast.
- Six canonical physical supplies. Water and banana use isolated
  illustrated objects. Apple, orange, energy bar and juice use
  provisional emoji-derived raster icons. The energy bar remains an
  energy bar, rather than being silently changed into energy gel.
- Wooden and textile textures, with a fixed table and two stable
  backup slots. All numbers and gameplay UI are dynamic.

The complete review board or any full mockup is never rendered as
a game background. The old geometric stand-in actor/scenery routines
are removed from the preview renderer. Canvas composites the art,
animates attachments and draws real-time numbers, controls and effects.

## Interaction and geometry

The bib is the gameplay anchor. Lane centers are projected using estimated
shoe-contact depth. Initial runners occupy three depth bands. Sprite
rectangles guide pointer selection, while the canonical throw transaction,
score calculations, number transformation, supply rules and native
reactions remain intact. Active bibs are drawn above the actor layer to
improve readability during brief overtakes. A runner is retired when its
bib leaves the visible scene. Canonical speed and traffic logic are retained.

Continuous lower-leg flex and a body bob simulate the running stride. Dedicated hand-authored run, catch, disappointed face, climb and
crowd animation sheets are still missing. Inferno moves the illustrated
staff onto the original table; the movement is not yet a frame-by-frame
climb. This art pass is a review candidate, not production art approval.

Both backup slots follow Step 10's side-by-side layout. The preview's
progress, locale, staff preference and learning history remain isolated.
QA fixtures are view-only and do not record results.

## Verification

    node --check src/tokyo/art.js
    node --check src/tokyo/preview.js
    python -m unittest discover -s tests -p 'test_*.py'
    python scripts/build_tokyo.py --zip
    python tests/tokyo_smoke.py

The branch workflow runs the canonical tests and regular game regression,
validates offline atlas decoding, captures the six staff/mode screenshots
and eight-runner fixture, and exercises the ten races, seeded starts,
scoring, swaps, mode transitions, rotation, input and save isolation.
The CI artifacts are the actual browser screenshots and standalone build.
Physical-device performance and art fidelity require separate user review.

No main, main2 or art-assets branch modification, merge or production release.
