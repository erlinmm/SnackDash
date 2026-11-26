# SnackDash V2 — Athlete reaction bubbles and volunteer number bubble integration

**Status:** Art/UX compatibility note only. No edits to the localization branch or runtime game source.  
**Last verified:** 2026-11-26.

## Source branch reconciliation

The `main2` planning index was originally taken from `feature/i18n-foundation` at `ba3246e67ce435a465d2e31bd4c358220ac4485e`. The branch subsequently advanced to `8f4ea6431e371fc2bc366f52481bddc525c82b77`. Its `src/js/reactions.js` **still defines the same 11 sample athlete nationality/nativeLanguage pairs**: KE, TZ, JP, KR, GB, US, AU, DE, NL, FR, CN. Appearance remains independent of those profiles.

**Important later change:** The current localization document explicitly says athlete spoken reaction bubbles contain **only the athlete's native-language phrase**. There is no translation subtitle or `GameReactions.caption()` API in the later source. Any older discussion about translated athlete reaction captions is superseded for design compatibility.

This dependency is moving in another chat: **re-read the latest committed branch files before any runtime integration**; do not merge, rebase or modify that branch as part of `main2` design work.

## Three different number/text surfaces

| Surface | Content | Image design rule |
|---|---|---|
| **Volunteer held supply** | A real bottle, gel, banana or other marathon supply **in the hand** | The nearby **speech bubble displays only the large supply number** (e.g. `6`), never another item image |
| **Runner race bib** | Dynamic runner number | Crisp number on the chest bib; no duplicated number speech bubble necessary |
| **Athlete speech reaction** | Thanks/cheer/pain line from `GameReactions.select()` | Phrase in athlete's original language only, transient, without covering bibs; it does **not** replace the supply-number bubble |

The user-approved Tokyo Inferno image is a **visual style reference**, not a literal 390×700 gameplay screenshot or a proof that the game already supports these visual interactions.

## Production UX

Speech and score feedback should use short lifetimes, clear ownership, and separate anchors. If a runner's native reaction would overlap a bib or a volunteer supply bubble, reflow the reaction, reduce scale or delay it a little—**never** hide the active number or block clicks.

An athlete's native-language text must be dynamically drawn, not baked into a character sprite. UI game language remains independent of character appearance and reaction language.

No code changes are authorized by this design note.
