# Tokyo landscape r02 — steps 01–04 review and QA record

**Date:** 2026-11-26  
**Branch:** `feature/main2-landscape-assets-r02`  
**State:** `review`. Not `approved`, `produced` or `tested`.

| Check | Record | Evidence / follow-up |
|---|---|---|
| Two 1280×720 gray camera candidates | DONE / review | `01_camera_A_readout.svg`, `01_camera_B_readout.svg` |
| Select camera and mark safe zones | PROVISIONAL A | `01_safe_zones.svg`; owner to choose A or B |
| Numbers 6, 4, 8, 12, 18, 24, 1000 in mock layouts | DONE / review | Separate numeral SVG text overlay, not inside source objects |
| 640×360 readout and wider/narrower framing | GENERATED / needs device testing | `01_camera_A_thumbnail_640x360.svg`, `01_wide_19_5x9.svg`, `01_narrow_4x3_letterboxed.svg` |
| Three-state style reference same characters and gear | DONE / visual review | `02_tokyo_style_triptych.svg`; further illustration polish likely after review |
| Original skyline / roads / street furniture / rail layers | DONE / review | four independent SVG masters under `source/street/tokyo/shared` |
| Scene Normal/Fever/Inferno share road and table geometry | DONE / vector review | 3 empty assembled SVGs, overlays; fixed table + replaceable fascia |
| Can identify Tokyo without mode FX | PROVISIONAL | skyline and tower; verify silhouette/cultural accuracy at artistic review |
| Water, gel, banana each in three uses | DONE / review | 9 SVG masters + 9 RGBA PNG files |
| Transparent UI bubble and one reserve-slot master | DONE / review | two UI masters + two PNG exports |
| Bubble number-only, reserve cells icon + number | SOURCE PASSED | bubble file empty; separate overlay labels shown in composition |
| Transparent edge review on white/dark | GENERATED / visual review | `04_alpha_edge_check.svg`; sampled PNG image output shows transparent pixels |
| Thumb/finger overlap and last-contact release | DEFERRED | depends on staffed character hand animation, steps 06–07 |
| Inferno feet/robe touching same tabletop | DEFERRED | depends on costume and climb/throw keyframes, steps 06–07 |
| Phone touch-size measurement, performance, offline loading | NOT TESTED | requires separate interactive/mobile implementation; not claimable from visual mockups |
| Logo, brand and locale-safe text | SOURCE PASSED | no brand marks or baked game numbers in object SVG/PNG; mockups intentionally have sample numerals |

## Source/license and asset limitations

The SVG and PNG components in this branch were generated specifically for this commission using custom vector geometry and simple procedural rasterization, following the user's r02 design brief. No external mascot, commercial pack, licensed font or stock footage is included. The ChatGPT-rendered inspirational Tokyo lighting board is a **separate concept illustration**, not an editable sprite master and not included as such in the GitHub exports.

The files are usable for early visual layout and component evaluation but they are **not being advertised as polished final game production sprites**. Current procedural transparent raster exports are intentionally compact placeholders for the master art approval phase, while the SVG masters remain independently editable. A hand-drawn cel-shaded polish pass and eventual animated pose library remain to be completed.

## Decision points for review

1. **Camera A or B:** choose proportion of left station to three-lane road (A provisionally selected).
2. **Tokyo silhouettes and three-mode colours:** approve shapes, line and light hierarchy or request targeted changes.
3. **Supply legibility at real phone size:** check bottle neck, gel tear notch and curved banana in 96 px slot icons; adjust rendering after feedback.
4. **Runtime mapping:** `gel` deliberately has no game math mapping yet; no change to `main2` needed for review.
