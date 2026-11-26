# Snack Dash! 🏃🍌

A mobile-first, offline HTML5 marathon maths game. Give runners numbered snacks by finding pairs where either number divides the other. Includes 100 races, 10 cities, learning opportunities, Combo, Fever, and Inferno.

## Quick start

```bash
python3 scripts/build.py --zip
```

Open **`dist/Snack_Dash.html`** in a browser. No server, dependencies, bundler, or network connection is required. The ZIP contains just the HTML, so it can be downloaded easily on phones.

## Source layout

- `src/index.template.html` — HTML menus and game shell; contains build placeholders.
- `src/css/app.css` — responsive mobile styling.
- `src/js/math.js` — number distributions, divisibility, D1–D5 difficulty model.
- `src/js/i18n.js` — offline locale registry, English fallback, number and native activity labels.
- `src/js/locales.js` — language catalogs (English default and Simplified Chinese interface preview).
- `src/js/game.js` — gameplay, renderer, learning opportunities, UI and sounds.
- `scripts/build.py` — deterministic assembly of the standalone HTML and optional ZIP.
- `tests/test_math.cjs` — rules and level tests; no dependencies beyond Node.js.
- `tests/test_build.py` — Python build checks.
- `tests/smoke.py` — optional Chromium interaction and fit-to-screen checks.

## Test locally

```bash
node --check src/js/i18n.js
node --check src/js/locales.js
node --check src/js/math.js
node --check src/js/game.js
node --test tests/test_math.cjs tests/test_i18n.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/build.py --zip
```

For full mobile smoke tests, install Python's `playwright` package and its Chromium browser, then run `python3 tests/smoke.py`.

## CI/CD

**Build** (`.github/workflows/ci.yml`) runs on pushes to `main` and on pull requests. It checks syntax, mathematical rules, builds one offline HTML and ZIP, opens the game in mobile-sized Chromium views, and uploads both artifacts to the workflow run. After successful tests on `main`, it publishes the HTML and ZIP as a separate `build-N` prerelease for easy GitHub Mobile downloads.

**Release** (`.github/workflows/release.yml`) runs on version tags, repeats the validation, and creates a GitHub Release with `Snack_Dash.html` and `Snack_Dash_HTML.zip` as downloadable assets.

```bash
git tag v26.0.0
git push origin v26.0.0
```

Tags must be pushed on a tested commit. Release publication requires GitHub Actions permission to create releases (repository setting **Settings → Actions → General → Workflow permissions**, allow read/write when required).

## Gameplay data rules

- All hand and table supplies have a valid visible target.
- Fresh runner arrivals occur only from the top of the scene; lane changes and same-lane passing do not slow runners down.
- One recent multiplication relationship can be offered naturally and reviewed later; swaps are free.
- Winning any **9 of 10 races** in a city qualifies the next city for unlocking. On every entry to the level-selection screen (including startup), the game reconciles saved race stamps, unlocks the eligible city, and displays a postcard invitation from the new city's marathon organising committee. An invitation remains pending across restarts until acknowledged, and only appears once after acknowledgment.
- Basic/Medium/Upper bib distributions, supply probabilities, prime-factor restrictions, and 40/60/90/120-second race lengths remain configurable.

Data and progress are stored in browser local storage. Opening different `file://` locations may use separate browser storage namespaces, so an offline release file may not inherit earlier saved progress.
## Localization foundation (feature branch)

The built offline HTML embeds both i18n scripts before the game code. The initial
interface is **English**. The menu contains a language selector with a **partial
Simplified Chinese preview** to exercise switching; this is **not** a complete
Chinese translation. Any missing messages fall back to the original English text.
The selected locale is saved separately as `snackDashLocaleV1` (game progress
remains in `snackDashSaveV2`). No remote translation service is used.

To translate an additional string, add a stable key to the `en-GB` catalog in
`src/js/locales.js`, add localized values where available, then use
`window.GameI18n.t(key, {value})` for dynamic text or `data-i18n="key"` for
static text. `data-i18n-aria-label`, `data-i18n-title` and
`data-i18n-placeholder` cover accessible labels and attributes. For translated
scores use `window.GameI18n.formatNumber(value)`. Register a new language with
`GameI18n.registerLocale(code, strings, {label, dir})`, then expose it in the
language selector once the catalog is ready.

For real local festivals, store the official **native** name separately from the
player-facing explanation key. `GameI18n.activityLabel({nativeName,
nativeLocale, labelKey})` returns both without overwriting the native script.
The 20 festival names, graphics, broader UI, and further locale catalogs are
**not included** in this foundation task. See `docs/localization.md` for scope
and migration notes.

## Localized city selector and mobile instructions

City postcards, race tiles, the selected-city passport and city invitations
now resolve names, landmarks, country labels and descriptive text through the
current language catalog. The menu's **How to play** control opens a scrollable
dialog containing the translated three-step rules, including the exact existing
scoring formulas. English and Simplified Chinese are included in the offline
HTML; Chinese remains a partial preview for other game areas.

There are no visible manual fullscreen controls. Starting a race still requests
fullscreen when supported, and returning to the city selector keeps that mode.
Installed PWA portrait orientation and browser fullscreen portrait requests
are preserved. Browsers that cannot lock orientation remain playable.

## Runner multilingual reactions

Athletes now have individual nationality and native-language profiles that are
independent of their appearance and of the host city. Correct supplies trigger
native-language thanks or cheers; an incorrect **impact** triggers a native
pain reaction (for example, Japanese `痛い！`, Korean `아야!`, Swahili
`Aa!`). The Canvas bubble includes a small explanation in the selected player
language when needed. No runner claims pain if the player taps empty road.

The offline, dependency-free `src/js/reactions.js` module handles event packs,
athlete profiles, safe unsupported-language behavior and variation. Reaction
strings are kept outside scoring and scene physics. See
`docs/localization.md` for extension and source review requirements.
