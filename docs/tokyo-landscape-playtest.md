# SnackDash V2 — Tokyo Landscape Playtest

**Preview only.** Based on feature/main2-art-assets-r01 at 128c67afc0f37bde95786ee49c4a318d3661a34e. No production publication or merge is required.

## Build and run

From this branch with Python 3:

    python scripts/build_tokyo.py --zip

Open dist/Snack_Dash_Tokyo_Preview.html in a browser. The file embeds CSS and all JavaScript and Canvas artwork. The ZIP contains the same HTML. No server or network request is needed. Use a landscape viewport. On mobile, open the HTML in a browser capable of executing local HTML (some file-manager previews do not execute JavaScript). Desktop can also use a local HTTP server:

    python -m http.server 8000 --directory dist

Then visit http://localhost:8000/Snack_Dash_Tokyo_Preview.html.

The regular build command is unchanged:

    python scripts/build.py --zip

## How to review

1. Select a staff character and any of Tokyo races 1–10. Choose a locale independently of the character.
2. Start a race. Tap a runner whose bib divides, or is divisible by, the held supply number. The physical item flies from the staff hand to the moving runner.
3. Tap either lower-left backup slot to swap without consuming a supply. Correct catches change the bib and score according to the canonical engine. The timer and target score are unchanged.
4. Five consecutive successful catches activate Sakura Fever; ten activate Fireworks Inferno. An incorrect throw uses the original penalty/reset logic.
5. Pause, resume, restart, mute or return to the race selector from the top bar.
6. Expand QA in the race selector to inspect Normal, Fever, Inferno or the eight-runner dense scene. QA is explicitly view-only; it freezes gameplay and never records a race or a practice result. Repeat with both staff choices. Exit using Levels.

## Implementation notes

- The ordinary source modules and 100-race definitions are unchanged. The preview build uses the existing canonical IIFE with a small, fail-closed build-time specialization and an isolated renderer/DOM adapter. Its substitutions change viewport geometry, visible spawn bounds, tray capacity, storage namespaces and the visual recovery/hitstop duration. Mathematical matching, weighted choices, score formulas, race configuration, speed boosts, native reaction profiles, results and learning remain canonical.
- The real game has three backups. The preview uses two; the NumberDirector still makes weighted draws under the original rolling-window eligibility rules. A temporarily unfillable slot shows the existing refill state, rather than inventing a number or forcing an invalid match.
- The earlier vertical slot arrangement is superseded by the approved Step 10 side-by-side arrangement. Both slots share one fixed position through all modes.
- The original code briefly stopped motion for very large Inferno impacts and locked input until .88 s. The preview removes visual hitstop/shake and releases the input lock at .48 s after the unchanged .41 s hit time. These are preview-only visual timing decisions.
- Preview storage namespaces are snackDashTokyoPreviewSaveV1, snackDashTokyoPreviewLocaleV1, snackDashTokyoPreviewPracticeV1 and snackDashTokyoPreviewStaffV1. There is no read or write of the regular save/locale/practice keys.
- Existing PWA packaging is portrait and is not used for the standalone Tokyo build. The canonical regular PWA is not modified.
- Portrait viewport displays the rotation instruction and pauses the race. The user resumes after rotating. No forced fullscreen or orientation lock.
- The landscape engine uses a coherent perspective projection, with the same projection for traffic, artwork and hit tests. Canvas art is cached by mode. A capped backing-store ratio and reduced-motion setting limit rendering cost.

## Art status and differences from the review board

The base repository contains five concept/moodboard originals and their optimized previews, design briefs (22 runner entries, 60 staff costumes, 30 crowd scenes), and documentation. It has no finished production sprites, layered masters, clean transparent atlas, or frame metadata. The separately attached Step 10 board is a visual target, not a sprite atlas. No crops of it are used.

The prototype uses original replaceable procedural Canvas artwork for the Tokyo skyline, three lanes, spectators, Sakura/Fireworks festival details, six staff appearances, modular athlete silhouettes, table, effects, and HUD. It reuses the canonical physical supply drawing and data for water, banana, apple, orange, energy bar and juice. An energy gel is a separate planned V2 art item, not silently mapped to the existing bar. See assets/exports/tokyo-playtest-manifest.json.

The illustration quality is provisional and will need replacement with approved production artwork. The animation is articulated vector poses/transforms, not a finished frame atlas. Japanese celebrations are labelled with original-script terms and localized explanations. The two preview locales are English and Simplified Chinese; existing locale fallback behavior is retained.

## Tests

    node --check src/tokyo/art.js
    node --check src/tokyo/preview.js
    node --test tests/test_math.cjs tests/test_i18n.cjs tests/test_reactions.cjs
    python -m unittest discover -s tests -p 'test_*.py'
    python scripts/build.py --zip
    python scripts/build_tokyo.py --zip
    python -m pip install playwright==1.58.0
    python -m playwright install chromium
    python tests/tokyo_smoke.py
    python tests/smoke.py

The browser tests produce seven screenshots and report.json under dist/tokyo-review. Device viewports are Chromium emulations, not measurements on physical iOS/Android devices. FPS values are headless-browser measurements, not guaranteed hardware performance. Visual parity, occlusion, physical-device tap comfort and garment/pose quality still require human review of those screenshots and the playable build.
