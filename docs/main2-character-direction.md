# SnackDash V2 — Character art direction (draft 0.1)

**Scope:** Character design planning only on `main2`. No gameplay, localization, build or runtime source changes. Design direction reflects the user's selected cartoon Tokyo Inferno art: clean yet festive, rounded proportions, readable number overlays, recognizable real sports supplies and distinctive apparel.

## 1. Source contract: feature/i18n-foundation, inspected 26 Nov 2026

The separate branch uses `src/js/reactions.js` with explicit fictional athlete profiles `{nationality, nativeLanguage}`:
`KE, TZ, JP, KR, GB, US, AU, DE, NL, FR, CN`. Its `GameReactions.availableProfiles()` lists 11 profiles. Exact pairs:

| Nationality | Sample athlete native language | Profile country label |
| --- | --- | --- |
| KE | sw-KE | Kenya |
| TZ | sw-TZ | Tanzania |
| JP | ja-JP | Japan |
| KR | ko-KR | South Korea |
| GB | en-GB | United Kingdom |
| US | en-US | United States |
| AU | en-AU | Australia |
| DE | de-DE | Germany |
| NL | nl-NL | Netherlands |
| FR | fr-FR | France |
| CN | zh-Hans | China |

`src/js/game.js:createLook()` independently chooses `skin`, `hair`, `hairStyle`, `genderPresentation` (three possible numeric values), `height` and `width`. **Nationality/language do not determine these variables.** Do not introduce nationality-to-race or nationality-to-gender mappings. Two male/female art-direction casting references per country are the user's requested presentation *coverage*, not limits on gender presentation or appearance in the future actual runner generator.

**Important:** Ethiopia (ET), Uganda (UG) and additional African regions are **not active** profiles in the inspected branch. The localization plan explicitly says Oromo, Amharic, Tigrinya and Kalenjin language packs await review. Do not add identity profiles, change reaction packs or infer language from a face. Treat proposed future countries as separate `candidate_not_enabled` work.

## 2. Runner casting review grid — 22 initial anchor concepts

These are example fictional athletes / *visual samples*, not unique or prescribed ethnic looks per nationality. Swap hairstyle, complexion, build and facial shape across countries in the final game.

| Code | Female example character sketch | Male example character sketch |
| --- | --- | --- |
| KE | medium-dark skin; neat twists held by a band; compact forward-driving stride; red-green singlet | deep-brown skin; close curls; lean long-stride silhouette; black-red singlet |
| TZ | deep-brown skin; coily ponytail; expressive eyebrows; blue-yellow running top | medium-brown skin; short textured hair; relaxed upright stride; cobalt sports top |
| JP | warm-fair skin; black straight bob under visor; white-red singlet | sun-tanned skin; wavy black hair; sporty headband; red-black singlet |
| KR | light-medium skin; braided high ponytail; cobalt-white singlet | medium skin; short textured dark hair; minimal cobalt-red training kit |
| GB | dark-brown skin; natural curls; navy-lime singlet; lively smile | fair freckled skin; auburn hair; navy-coral running vest |
| US | medium olive-brown skin; dark wavy hair; teal-red race outfit | deep-brown skin; close-cropped coils; purple-blue race outfit |
| AU | medium warm skin; dark ponytail; turquoise-gold race top | light skin; sandy-blond hair; aqua-and-gold kit |
| DE | light skin; auburn braid; clean black-red technical top | olive skin; dark curls; black-yellow shirt |
| NL | brown skin; natural voluminous curls; orange-navy vest | fair skin; blond textured hair; orange-navy vest |
| FR | deep-brown skin; braided ponytail; blue-red kit | warm-fair skin; dark wavy hair; blue-white kit |
| CN | medium-light skin; short dark hair; red-yellow singlet | warm-medium skin; straight dark swept hair; red-gold singlet |

**Composition rules:** Run directly toward camera, not away; bibs are separate white high-contrast runtime-rendered overlays and remain readable while animating. Supply items are real water bottles/gel pouches/banana/etc, never flying number tiles. Runners use contemporary sports clothing with no compulsory national flag costume; country/profile is metadata and original-language reaction, not a skin tone preset. Never copy a real marathon athlete's likeness.

## 3. Inclusive coverage: appearance is modular

Cross-cutting design targets to verify on model sheets (not racial classification inferred from pixels):

- At least 8 complexion values including very light, light, medium, olive, warm brown, rich brown, dark brown, very dark, with appealing consistent shading.
- Hair styles/textures: straight, wavy, loose curly, tightly curled/coily, braided/twisted, closely cropped/bald; representative variants for both gender presentations.
- Multiple shapes and proportions: 3+ face silhouettes, 3+ body shapes and visible height differences, while keeping runner bib mask and limb animation reliable.
- Support glasses, headbands, visors and non-restrictive hair accessories. Include varied ages among adult recreational runners; spectators include children and elderly people.
- World regions / ethnic appearance references should be broad and inclusive across the whole cast: multiple African, East Asian, South Asian, European, Latin American, Middle Eastern/North African, and mixed-family presentation possibilities. **These are art-review goals, not one-to-one nationality or appearance labels.**
- Use randomized combinations independent of athlete identity; visually audit generated packs to avoid repetitive faces or accidental exclusion.

## 4. Global style / shape hierarchy

- Casual high-quality 2D/2.5D cartoon with soft cel shading, expressive faces and crisp silhouettes; no photoreal skin.
- Start model sheets at `~3.5–4.5 heads` adult cartoon height as an **unapproved experimental range**; judge at actual 390×700 portrait gameplay size, not on the marketing illustration.
- Runner bib/digits and supply-slot digits are authored at runtime, not baked into costumes. Emotion speech bubbles are localized reactions; the **volunteer's held supply number** appears in its own **number-only** speech bubble (do not duplicate a water/gel icon inside that bubble).
- A character's face, arm/hand-held physical supply and two lower-left spare slots remain readable. Keep sparks/fireworks out of bib bounding boxes.
- Across states, keep the same runner silhouettes; emotional reaction and FX change, not nationality or original attire.

## 5. Proposed animation assets — per runner, not per country

- `run-front`: alternating arm/leg gait (start by assessing 6–8 drawn motion poses).
- `receive-supply`: brief hand catch while still moving; visible bottle/gel/bag in hand.
- `thanks/cheer`, `pain`, `surprise`, `disappointment`: expressions keyed to the language/reaction event, separate from scoring.
- `selected/nearby`: local tap highlight that never covers the bib.
- Foreground characters need full face detail; distant crowds/runners reuse simplified silhouettes and animation, no tiny visual text.

## 6. Asset separation

`runner/body`, `runner/face`, `runner/hair`, `runner/sportswear`, `runner/pose`, `runner/reaction` and `runner/accessory`. Keep country/voice identities in data and art cast references separately. Country labels on the concept board are labels for review, not outfit requirements.

See [volunteers](main2-volunteer-casting.md), [spectators](main2-crowd-casting.md), and the [machine-readable planning index](../assets/characters/character-briefs.json). Everything in these documents is awaiting art approval.
