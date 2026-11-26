# SnackDash V2 — Asset production roadmap and decision register

**Scope:** setup and design approvals only; no game code, CI, scoring, tests, or build configuration changes.

## 1. Decisions recovered from design discussion

| Topic | Status | Agreed direction |
|---|---|---|
| Branch and scope | **Confirmed** | `main2` starts from the latest inspected `main`; V2 art/animation design first; protect separate i18n chat/branch |
| Orientation | **Confirmed** | Portrait, target 390×700 logical gameplay |
| Camera | **Confirmed** | Incoming runners face camera; no playable runner viewed from behind |
| Streetscape / lane count | **Confirmed** | Three lanes, visually believable perspective; no tiny characters on giant road |
| Volunteer control | **Confirmed** | Left-side supply-station operator |
| Volunteer choice | **Confirmed** | Male and female choices together with localization/character selection |
| Costume | **Confirmed** | City / historical recognizable costumes; Fever stronger, Inferno ornate |
| Female Inferno long gown | **Confirmed** | Long hanging robe, do not reveal legs when on the table |
| Station | **Confirmed** | Fixed height across three modes; front-panel changes allowed |
| Inferno movement | **Confirmed** | Volunteer stands **on** unchanged tabletop and throws from above |
| Spare supplies | **Confirmed** | Exactly two slots, vertically stacked lower-left |
| Real events and names | **Confirmed** | Real festivals only; original-script event name + player-language explanation |
| Precise visual execution | **Open** | Camera crop, asset style, character drawings, sprite method, colour grading and detailed FX |
| Runtime changes | **Not authorized in this phase** | No `src/` edits; separately approve implementation after art review |

## 2. Asset family inventory

The machine-readable planning index is [`assets/catalog.json`](../assets/catalog.json). Asset families:

1. **City stage** — landmark, street scene, pavement, trees, fencing, crowd silhouettes, festival light treatment.
2. **Volunteers** — 10 cities × female/male × Normal/Fever/Inferno appearance variations; face/arms, apparel silhouettes, long robes, ornaments.
3. **Volunteer actions** — idle, swap, throw, climb, atop-table pose, recover/exit; outfit-safe action animation.
4. **Runner cast** — front-facing animation poses, number badge masks, tap/selection feedback, success expressions.
5. **Supply station and food** — fixed physical table, replaceable front panel, two spare choices, in-hand number and flying item.
6. **Festival/energy effects** — Normal ambient, Fever entry/idle, Inferno entry/idle, locally themed climax, impact, throw trail, exit.
7. **UI and audio** — mode plaques, text-safe controls, localized displays, original short sound cues.

## 3. Review sequence — create art before editing runtime

| Gate | Review package | Status |
|---|---|---|
| **G0: Visual proportions** | 390×700 wireframe with three lanes, near/far runners, fixed station and two lower-left swaps. Compare 2–3 camera ratios. | Not started |
| **G1: Character/style** | Tokyo male/female costume concept, Normal/Fever/Inferno, costume close-up plus true-scale gameplay sheet. Compare 2–3 cartoon line/texture styles. | Not started |
| **G2: Motion language** | Tokyo volunteer climb/tabletop/throw and female robe-continuity storyboard; runner animation poses. | Not started |
| **G3: Scene/effects** | Tokyo cherry-blossom Fever vs fireworks Inferno, including reduced-motion variant and before/after layering. | Not started |
| **G4: Cross-city art** | London and Berlin to test strong historical silhouettes and cultural distinction; then remaining seven cities. | Not started |
| **G5: Production assets** | After G0–G4 sign-offs: master artwork, reusable atlas/export formats, source/license tracking and compression tests. | Not started |
| **G6: Prototype implementation** | A separately approved small main2 code milestone for Tokyo only; performance, touch accuracy, offline bundle QA. | Not started |

No code prototype work in G0–G5. Once i18n foundation stabilizes in its separate branch, plan an explicit integration checkpoint with user approval; no speculative merge now.

## 4. Asset acceptance checklist

- Does it read clearly at actual portrait gameplay size (not a wide marketing mockup)?
- Do runner bib numbers, held supply and both backup supply digits remain fully readable?
- Are athletes looking/running **toward** the camera with coherent perspective?
- Does the left station stay in precisely the same physical location/height across modes?
- Is the volunteer behind counter in Normal/Fever and standing ON the tabletop in Inferno?
- Do female long-dress poses cover legs even while posing and throwing?
- Can each gender version display the same city-specific festival identity without swapping or changing touch controls?
- Is cultural/historical styling accurate and distinguished from the actual local event?
- Does the asset have an editable master, correct rights, native-original label source, and review version?
- Can the visuals degrade gracefully for older phones and reduced-motion?

## 5. First design questions for review, not implementation

**Q1 Camera:** How much screen width belongs to the lower-left station/2 supply slots vs the 3-lane roadway? Compare actual 390×700 drafts and check number sizes before choosing.  
**Q2 Characters:** Which consistent chibi style preserves distinctive kimono/robe/Victorian silhouettes without making runners too small?  
**Q3 Motion:** Should Inferno entry play a 0.5–0.8s staged climb or a short theatrical pop, while uninterrupted throwing remains possible?  
**Q4 FX:** What is the maximum visual intensity that still leaves bibs, supplies and local native title readable?  
**Q5 Integration:** How should language selector and volunteer choice share a modal with the finalized `feature/i18n-foundation` API?

## 6. Version practice

- Design draft: `r01`, `r02` etc. in preview filenames.
- Promote asset from `review` to `approved` only after explicit selection.
- Preserve master and approved reference; record rationale and any cultural/license issue.
- Commit artwork and metadata to `main2` only. Keep original gameplay and localization branches untouched until separate approval.
