# Snack Dash localization plan

This branch adds the **foundation**, not a finished full-game translation.
The built HTML remains one offline file. There is no new backend, dependency,
network call, or change to gameplay, race scoring, Combo, Fever, or Inferno.

## Contracts

- `GameI18n.t(key, params)`: stable message key, optional interpolation via
  `{{name}}`; unsupported keys fall back to the English catalog.
- `GameI18n.setLocale(code)`, `locale()`, `availableLocales()`, `subscribe(fn)`:
  runtime language selection. User choice persists under `snackDashLocaleV1`.
- `GameI18n.apply()`: update static elements marked `data-i18n`,
  `data-i18n-aria-label`, `data-i18n-title` and `data-i18n-placeholder`.
  Uses textContent or setAttribute: no HTML string injection.
- `GameI18n.formatNumber(value)`: locale-aware display of numeric scores.
  Scoring calculations remain unchanged.
- `GameI18n.activityLabel({nativeName, nativeLocale, labelKey})`: reserves
  distinct fields for official original-script festival names and localized
  descriptions. The native name is never replaced by a translation.
- `registerLocale(code, catalog, {label, dir})`: extend catalog and RTL metadata
  with no runtime downloads. Add an option in the UI when translations are ready.

## Current languages

English (`en-GB`) is the default. Simplified Chinese (`zh-Hans`) is a
**preview** for the first group of menu labels, main prompts, invitations and
result messages. Some decorative speech bubbles, PWA-update
prompts and other secondary status strings are still English. City postcards,
race selection, invitations and the three-step rules use the selected locale. No additional
translations should be advertised as complete.

## Next passes

1. Extract all remaining dynamic game strings, instructions, result details,
   city/race labels, PWA update text, announcements and accessible labels.
2. Translate and review one complete locale at a time; only then mark it as
   fully supported. Keep long text wrapped without changing hit targets.
3. Add the real festival catalog, with verified official native event names,
   source URLs, and separate per-locale explanation keys.
4. Test locale switching before, during and after races, including screen
   readers, offline PWA, persistence and fonts for Japanese/Korean/Chinese.

The locale catalog must never define speed, scoring or collision rules.

## Card and help screen coverage

The city data in `src/js/math.js` continues to define gameplay IDs and
rules, never translated names. `src/js/locales.js` defines
`city.<id>.<field>` (`name`, `country`, `landmark`, `subtitle`) and
presentation keys such as `city.cardAria`, `race.meta` and
`instructions.step1`. Every card is rebuilt when the locale changes.
Festival labels stay a distinct native-name plus localized-explanation pair,
and actual festival records are not part of this patch.

Phones display translated rules via the **How to play** dialog. The formerly
visible fullscreen toggles are intentionally absent in both menu and race
screens. Start still requests fullscreen and the screen orientation lock where
supported. Tests cover localizable card content, readable font sizes, the
rules dialog, automatic fullscreen, PWA portrait support and offline builds.

## Athlete language reactions

`src/js/reactions.js` is an offline, optional-data reaction layer loaded
before the gameplay script. It is separate from the player UI translations,
race mathematics, character appearance, and city visuals.

- Each generated runner has an explicit `identity`: `nationality` (two-letter
  ISO code) and `nativeLanguage` (BCP-47 tag). This is a fictional individual
  profile, **not** a claim that everyone of that nationality speaks the language.
  The identities are selected independently from skin, hair, city or costume.
- Event names are stable: `thanks`, `pain`, `cheer`, `surprise`,
  `disappointment`. Call `GameReactions.select(identity, event, random,
  previousIndex)` to obtain an original-language line. An event with no
  reviewed language pack returns `null`, never a made-up translation or a
  fake "native" English line.
- `GameReactions.caption(reaction, playerLocale, GameI18n.t)` gives a concise
  explanation for the player's UI language; it is omitted when the language
  matches the athlete's native language. New packs can be added using
  `registerPack('es-ES', {thanks:['¡Gracias!'], pain:['¡Ay!']})`, followed by
  `registerProfile('ES','es-ES')` after linguistic review.
- On correct supply contact the runner says thanks, upgraded to a cheer in
  Fever/Inferno. On an **incorrect impact against that runner**, they say a
  natural pain interjection. An empty-space tap is not an injury; it never
  produces an athlete pain line. Surprise and disappointment have reviewed
  banks but await suitable real game events.
- The phrase appears in a Canvas speech bubble, with the native words larger
  and any player's-language meaning below. A hidden live-region also exposes
  the same text for assistive technology. No external audio or synthesis has
  been introduced; a future voice asset can be keyed by `nativeLanguage`
  and event without changing hit detection.
- A dedicated seed-derived PRNG controls identity and phrase variation, so
  introducing new languages does not consume the number/traffic PRNG.
  Future pack review should include dialect, formality, pronunciation and
  natural pain interjections. Afaan Oromoo, Amharic, Tigrinya and individual
  Kalenjin languages are not active until their lines have been reviewed.

### Phrase verification examples

Pain interjections are grounded in dictionary and language-learning examples:
[Cambridge Japanese](https://dictionary.cambridge.org/dictionary/english-japanese/ouch),
[Cambridge Korean](https://dictionary.cambridge.org/dictionary/english-korean/ouch),
[Collins French/German/Chinese](https://www.collinsdictionary.com/english-language-learning/ouch),
[Swahili Aa! in a teaching example](https://www.swahilipod101.com/lesson/swahili-teachers-answer-your-questions-15-what-are-interjections).
