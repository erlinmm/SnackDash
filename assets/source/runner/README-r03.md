# Step 05 r03 — Tokyo-first runner art rework

All 22 existing runner IDs and their source paths remain unchanged. The revised files are editable, independently grouped SVG concepts. Country and native-language values are casting metadata, not mandatory appearance presets in gameplay.

**Delivered:** each runner has 1 main front-run master, 8 gait frames and JSON anchors, 1 receive-supply pose, thanks/pain/surprise/disappointment, new cheer and selected states, and 9 standalone layer SVGs (arms, legs, face, hair, torso, blank bib and accessories). The catch fingers visibly overlap the real water bottle; every master has a blank race bib, not baked numerals.

Face shapes now vary across five families, with hairstyle, adult age and body-width variation. These designs still require visual approval against the owner's chosen Tokyo aesthetic, including clarity at real phone sizes.

## Bib numbers

Local 256×320 frame bib is enlarged from 57×43 to **94×66**. Blank cream plate and deep border; no flags, text, or decorative elements inside the numeral zone. Runtime digits must remain independently drawn on the upper layer without arm/hair/FX occlusion.

- [Female cast r03](../../previews/steps05-08/runner_cast_female_r03.svg) and [male cast r03](../../previews/steps05-08/runner_cast_male_r03.svg)
- [8 / 48 / 168 / 1000 near, mid, far](../../previews/steps05-08/bib_near_mid_far_8_48_168_1000_r03.svg)
- [640×360 four-digit study](../../previews/steps05-08/bib_640_device_scale_four_digits_r03.svg) and [confusable digits](bib/bib_confusables_6_8_1_7_r03.svg)
- [Casting metadata](casting-index-r03.json), [blank bib design contract](bib/bib-design-spec-r03.json), [QA status](../../previews/steps05-08/qa-report-r03.json)

**Readability limitation:** Mid- and far-distance 4-digit numbers project below the desired 14–16 measured glyph pixels in a 640×360 logical display. Making the plate even larger would break body proportions. Later gameplay decisions about target eligibility, approach scale or a different legibility mechanism require separate explicit approval. No `src/` game files were changed.

**Status: REVISED FOR REVIEW.** Not production-approved, rasterized, game-integrated or device-tested. Existing Step 10 full-scene images remain historical composites embedding older runner art.
