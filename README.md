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
- `src/js/game.js` — gameplay, renderer, learning opportunities, UI and sounds.
- `scripts/build.py` — deterministic assembly of the standalone HTML and optional ZIP.
- `tests/test_math.cjs` — rules and level tests; no dependencies beyond Node.js.
- `tests/test_build.py` — Python build checks.
- `tests/smoke.py` — optional Chromium interaction and fit-to-screen checks.

## Test locally

```bash
node --check src/js/math.js
node --check src/js/game.js
node --test tests/test_math.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/build.py --zip
```

For full mobile smoke tests, install Python's `playwright` package and its Chromium browser, then run `python3 tests/smoke.py`.

## CI/CD

**Build** (`.github/workflows/ci.yml`) runs on pushes to `main` and on pull requests. It checks syntax, mathematical rules, builds one offline HTML and ZIP, opens the game in mobile-sized Chromium views, and uploads both artifacts to the workflow run. It does not automatically publish a release.

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
- Basic/Medium/Upper bib distributions, supply probabilities, prime-factor restrictions, city unlocks, and 40/60/90/120-second race lengths remain configurable.

Data and progress are stored in browser local storage. Opening different `file://` locations may use separate browser storage namespaces, so an offline release file may not inherit earlier saved progress.