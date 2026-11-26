# SnackDash V2 — Character production and review plan (draft 0.1)

## 1. Source-of-truth and scope

- Existing `main2` design branch; no `src/` or `feature/i18n-foundation` changes.
- `feature/i18n-foundation` inspected 26 Nov 2026: 11 nationality/language sample identities; independent runner appearance; no official ethnicity/nationality mapping.
- Planning index is [`assets/characters/character-briefs.json`](../assets/characters/character-briefs.json) with **22 runner reference casts + 60 volunteer costume entries + 30 crowd briefs**. Entries are art-review units only.
- The AI-generated image boards shown in the design discussion are **visual exploratory references**. They may contain misspelled city names, countries not in the source branch, or impractical clothing. Do NOT treat them as canonical approved assets. Use the actual JSON and documents for codes/names and approve individual characters explicitly.

## 2. Design gates

| Gate | Package | Required review |
|---|---|---|
| C0 | Confirm cast and city matrices, source integration and inclusion goals | 11 source profiles accurate; none invented; source branch unchanged |
| C1 | Runner style sheet: full front-facing movement, sample male/female, diverse skin/hair/body shapes | Bib readability at true 390×700 scale |
| C2 | Tokyo, London, Berlin staff (gender × mode, full body) | Legible costumes, left-station/tabletop poses, safe hem |
| C3 | Ten-city staff silhouettes, phase by phase | 60 variants reviewed, not merely colour swaps |
| C4 | Three-mode audience ensembles for Tokyo, London, Berlin, then remaining cities | 30 distinctive groups, inclusive mixed-age crowds |
| C5 | Animation motion sheets: runner, behind-counter work, climb/land/throw/descend, crowd cheers | Animation continuity, no hitbox changes or hand-anchor drift |
| C6 | Production export strategy and performance prototype | Explicit new user confirmation for any game code changes on `main2` |

## 3. Art and UX acceptance checklist

- All runner fronts show clear bibs; no runner shown from behind as playable avatar.
- The held item is a physical bottle/gel/etc. The volunteer's supply-number bubble has **digits only**.
- Two spare supplies fixed bottom-left, large enough for finger taps, any mode.
- Male/female option preview shares the existing language chooser and never assumes language dictates appearance.
- Inferno stage is same height; female robes and long skirts hang straight with no exposed legs.
- Culture-specific costumes not conflated with festival-specific attire, e.g. Bavarian Lederhosen vs Berlin, Victorian dresses vs Notting Hill Carnival.
- Crowd stays behind rails and never occludes central runners.
- Screen-scale evaluation: prototype 390×700 portrait; character scale, table, lane convergence need coherent optics to avoid “little people on a giant road”.
- Disabled/reduced-motion option planned for effects.
- Original editable artwork and rights provenance required before production-export status.

## 4. Asset naming proposal

- `source/runner/<body-preset>/<action>/...` (no country-locked body assets)
- `source/volunteer/<city>/<female|male>/<normal|fever|inferno>/...`
- `source/crowd/<city>/<mode>/<depth-layer>/...`
- `exports/.../atlas.webp` or another measured format after approval
- `previews/<city>_volunteer_<gender>_<mode>_r01.png`

No textures, binaries, animation frames or assets have been promoted to production at this stage. A document approval does **not** authorize code edits.
