# SnackDash V2 — Visual Bible (draft 0.1)

**Branch:** `main2` | **Stage:** ART DIRECTION ONLY | **Date:** 26 Nov 2026  
This document is a design proposal and a record of decisions from the user discussions. **No gameplay or runtime rendering code changed.**

## A. Approved visual principles

1. **Portrait game, 390×700 logical reference.** Use the actual portrait game, not landscape promotional art. The player controls the **left supply-station volunteer** and does not run on the road.
2. **All runners approach the camera** from the distance, with coherent near/far scaling, front-facing numbered bibs, and exactly **three distinct lanes**. Avoid the recent “little people on a giant highway” mockup: do NOT independently shrink people while keeping an implausibly oversized road. Lane width, curb scale, character size and camera convergence are one composition decision.
3. **Cartoon appeal.** Cheerful, legible 2D/2.5D illustrated characters, clean shapes, readable bibs, expressive but short animation. The AI-generated promotional reference paintings are mood boards, not literal production assets.
4. **Fixed-position stall** on the left. In Normal and Fever, the worker stands behind the table and hands/throws supplies; in Inferno, the worker **climbs onto the SAME tabletop at the SAME height** and throws from above. The front panel alone can change decoration (plus city/state lighting).
5. **Two backup supplies**, stacked vertically at the **lower left**, visible and selectable during all three modes. The held supply remains visible with a number. The table and selectable icons are separate visual components: shrinking the table must not shrink finger targets below accessible limits.
6. **Two player-selectable volunteers, male and female.** A consistent city identity, but distinctive clothes and appropriate tailoring. The choice lives with the localization/character-choice interface, not tied to mode or to the selected language.
7. **Distinctive local / historical fashion is welcomed.** Japan can use yukata/kimono, German culture can use Lederhosen/Dirndl, London can use morning dress and Victorian gowns. They should be visibly recognizable, not merely badges on generic uniforms.
8. **Fever = festival energy; Inferno = celebration climax.** Use authentic locally occurring events, original-script activity headings with player-language explanations, and characteristic **city-specific** visual treatments.
9. **Female Inferno long garments hang naturally while standing on the tabletop.** Do not lift skirts, kick up hems or reveal legs. Hands, face and held number remain visible at all times.
10. Gameplay/number clarity takes precedence over glow, petals, fireworks, text and scenery.

## B. Proposed rendering style (not yet approved)

- Smooth outlined chibi/casual-cartoon characters, painterly but not photoreal backgrounds, saturated yet controlled festival lighting.
- Separate static scenery from animated decorations; foreground runners and numeric labels are rendered crisply.
- Near field: visible 3-lane road with believable human-to-lane proportions. Reserve a left-side UI safe area for two vertical backup buttons; current road geometry may need adjustment in V2 rather than blindly copying the existing camera.
- Keep a consistent camera across Normal, Fever and Inferno for each city; mode does not zoom the camera or enlarge the table.
- Stage layers (back to front): skyline > ground/pavement > city props > road/lane markings > background festival light > runners > station/volunteer/supply digits > projectile/short hit feedback > always-readable HUD.
- HUD labels, runner bib numbers, supply numbers and activity annotations are **runtime text**, not baked into paintings.

## C. Composition to test at real 390×700

| Area | Purpose | Requirement |
|---|---|---|
| Top | Game HUD, mode title and event text | Must not cover bibs or hand supply; native event title can shrink to a small plaque after entry |
| Far/mid field | Skyline, celebration, incoming runners | Clear vanishing point, correct scale continuity |
| Left mid | Fixed-height stall, festival costume | Normal/Fever behind; Inferno feet visibly supported on tabletop |
| Lower left | Two backup supply choices | Same button positions through mode changes; sufficiently large touch targets |
| Center/right near field | Three running lanes, approaching athletes | Bibs and touch targets unobscured; near athletes substantially larger than far athletes |

**Do not lock coordinates yet.** The existing renderer has three logical lanes but its original road consumes most of the near-left canvas; the new supply UI requires an approved V2 camera/layout sketch and collision/safe-area review. Scaling artwork alone is not sufficient.

## D. Costume visual system

Treat **city × male/female × Normal/Fever/Inferno** as design variations (10×2×3). A common motion rig may be reused, but distinctive clothing silhouettes should not be forcibly reduced to one template.

| City | Recognizable clothing direction (draft) | Fever mood | Inferno climax |
|---|---|---|---|
| Tokyo | Yukata, kimono, obi, festival headband/hair ornament | Sakura festival, pink textile motifs | Fireworks-patterned long formal robe, dark indigo/gold |
| Seoul | Hanbok silhouette with visible collar and flowing layers | Lantern festival accents | Firework colours and layered traditional silhouette |
| London | Morning dress/top hat and Victorian-style structured gown as historical alternatives | Notting Hill Carnival elements on scenery / selectable carnival look | New Year's Eve formal finery and London skyline fireworks |
| Berlin | Modern Berlin festival outfits; optional German traditional Lederhosen/Dirndl as a separate costume variation | Karneval der Kulturen colours | Festival of Lights geometry and luminous trims |
| Amsterdam | Dutch regional cap, apron and dress / waistcoat | Tulip motifs | Koningsdag orange and festive detailing |
| Paris | Belle Époque / elegant historic silhouettes | Nuit Blanche art/light patterns | French national celebration lights and refined formal wear |
| Boston | Local historic or marathon volunteer-inspired attire | Race cheers, blue/yellow accents | Pops concert and fireworks |
| Chicago | Distinctive city style and riverfront elements | Emerald river-themed accessories | Aviation/water-show light-trail motifs |
| New York | Thanksgiving parade / classic urban festival tailoring | Parade colours and playful silhouettes | Times Square countdown, sequins and gold |
| Sydney | Harbour, coastal contemporary elegance; do not invent Indigenous ceremonial attire | Vivid Sydney light designs | Harbour bridge fireworks and night colours |

**Cultural review notes:**
- Lederhosen and Dirndl are particularly associated with Bavaria, **not specifically Berlin**. Present them as optional German cultural styling, not Berlin's local festival uniform.
- Victorian costumes and morning dress are historical British fashion, **not Notting Hill Carnival dress**. Keep this distinction explicit, and optionally offer festival-inspired carnival costumes as an alternative.
- Avoid invented local festivals, generic unrelated stereotypes, or protected event mascots. Verify cultural motifs and event names before final approval.

## E. Modes in the artwork

| Feature | Normal | Fever | Inferno |
|---|---|---|---|
| Volunteer | City everyday/local outfit | Festival-specific costume and lively pose | Elaborate costume; **stands on original tabletop** |
| Station | Neutral city panel | Festival front-panel fabric / bunting | Illuminated local festival panel; no increase in table height |
| Environment | Daytime/ordinary city scene | Seasonal lights, petals, banners, celebratory warmth | Major city festival climax, fireworks/light projections as applicable |
| Throw | Clean hand-to-runner arc | Brighter trail | Dramatic short arc with localized burst |
| Camera & input | Same three-lane layout | No camera jump | No camera jump; stable backup-supply targets |

The Inferno costume can be dramatic and large in **visual ornament**, but its world-scale sprite, hand location and physical footprint must fit a consistent perspective.

## F. Localization interface dependency

The separate `feature/i18n-foundation` branch already provides `GameI18n` language/culture primitives. **Do not cherry-pick, merge, rebase or edit it in this planning phase.** Reserve a combined language/volunteer-choice panel: language choice, male/female portraits, and full original festival names with translated explanations. Adapt to the final foundation interface after the other chat finishes it; do not duplicate language infrastructure.

## G. What is *not* approved yet

Exact camera FOV/road vertices, worker/table pixel bounding boxes, final male/female silhouettes for all cities, illustration palette, motion frame counts, lighting brightness, full asset atlas formats/sizes, shipping asset counts, UI typography, transition behaviour during rapid swaps and performance quality tiers. These require visual review and phone checks.
