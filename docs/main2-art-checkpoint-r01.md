# SnackDash V2 — Artwork progress checkpoint r01

**Date:** 2026-11-26  
**Branch:** `feature/main2-art-assets-r01`, branched directly from `main2` commit `da52244d`.

## Archived assets

Five selected visual references are committed under [`assets/previews/character-r01/`](../assets/previews/character-r01/README.md), each with original PNG and quality-90 WebP preview, file dimensions and SHA-256 hashes in the [manifest](../assets/previews/character-r01/manifest.json).

1. Runner casting concept for KE/TZ/JP/KR/CN (partial, not 11-nation complete).
2. Global cartoon visual style moodboard.
3. City volunteer fashion moodboard.
4. Spectator Normal/Fever/Inferno moodboard.
5. Tokyo Inferno visual reference: physical marathon supplies, number-only held-supply bubble.

The generated moodboards may contain inaccurate captions, extra nationalities, or layouts unlike the actual portrait game; they are **inspiration**, not final game-source truth.

## Inherited design work

The branch inherits planning for 11 nationalities (22 male/female reference examples), 10 cities × 2 volunteer variants × 3 modes (60 outfits) and 10 cities × 3 spectator modes (30 crowds). These 112 entries are **art briefs**, not 112 finished images.

## Remaining design decisions

- 390×700 perspective and lane / character / tabletop proportions.
- Full-body front-facing runner reference set for all 11 currently configured nationalities.
- Production-ready Tokyo/London/Berlin volunteer male/female three-state artwork, including tabletop climb and long-robe motion.
- Separate physical supply item/speech-bubble design, precise bottom-left two-slot touch layout.
- Crowd atlases per city/mode, real festival verification and accessibility/performance budgets.
- Editable masters, actual sprite atlas exports, animation timeline and game integration are pending user approval.

No game code changes, no branch merge, no change to `feature/i18n-foundation`.
