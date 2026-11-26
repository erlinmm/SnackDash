# SnackDash V2 — Art asset library

**Branch:** `main2` | **Status:** library structure and design plans only | **Not runtime assets**

This directory is a dedicated design workspace for the major V2 visual refresh. Do not modify `src/`, tests, game rules or build scripts as part of asset reviews. Do not merge or overwrite `feature/i18n-foundation`, which is being developed independently.

## Layout

| Path | Purpose | Can be included in a game build now? |
|---|---|---|
| `source/` | Editable originals, layered art, vectors, costume parts and key animation poses | No |
| `exports/` | Future optimized runtime sprites, atlases, backgrounds, FX frames, sound exports and metadata | Not yet |
| `previews/` | Contact sheets, side-by-side gameplay mockups, storyboards and GIF reviews | No |
| `references/` | Cultural references, event verification, rights/provenance notes | No |
| `catalog.json` | Index of planned asset families and current statuses | No |

No finished production art, sound effects, animation atlases or runtime exports have been committed as of this setup.

## Proposed naming (pending art-pipeline approval)

Use stable ASCII IDs; translated display names live elsewhere.

- Source: `source/volunteer/tokyo/female/inferno/outfit_master.svg`
- Source: `source/street/tokyo/normal/landmark_master.svg`
- Source: `source/fx/tokyo/inferno/firework_burst_master.svg`
- Export: `exports/volunteer/tokyo/female/inferno/atlas.webp`
- Preview: `previews/tokyo_female_inferno_gameplay_r01.png`

Use `normal`, `fever`, `inferno` consistently. Use `male` / `female` as the two requested player-selectable volunteer variants. Files should contain no baked-in player-facing translations, numbers or event labels; those stay separately rendered for i18n and gameplay clarity.

## Lifecycle

`planned → sketch → review → approved → produced → tested`.

Each library entry should specify: `id`, `family`, `city` if relevant, `mode`, `variant`, `sourcePath`, `exportPath`, `reviewPreview`, `status`, `notes`, `rights`. Paths remain null until real files exist. New art requires a source/master, a preview at true portrait gameplay scale, and a license/provenance record before being considered production ready.

## Source documents

- [V2 visual bible](../docs/main2-visual-bible.md)
- [V2 animation library](../docs/main2-animation-library.md)
- [Production and decisions](../docs/main2-production-roadmap.md)

## Constraints

1. The target is the existing **390×700 portrait** gameplay coordinate system, subject to future camera/layout approval. No runner viewed from behind. Runners move from far field toward the camera.
2. Two visible backup supplies stacked on the lower-left; swap touch regions must follow the artwork in a future *separately approved* implementation.
3. Volunteer operates from behind a fixed-height stall in Normal/Fever; stands on that **same** tabletop in Inferno. Long female robes hang down and do not reveal legs.
4. Real local activities, original-script names and localized explanations remain distinct. Verify names and cultural claims before marking art as approved.
5. No third-party protected mascot artwork or unlicensed photo/font/audio committed as final assets. AI mockups are visual exploration, not production asset provenance.
