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
result messages. Many level descriptions, decorative speech bubbles, PWA-update
prompts, game help blocks and city names are still English. No additional
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
