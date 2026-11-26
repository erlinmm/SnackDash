# Landscape r02 — camera, colour and Tokyo environment (steps 01–03)

Built on `main2` at `c102ab0329d696199161ba0747633b721e82c4e9`. All files in this package are original, hand-authored editable SVG/vector components or JSON; none is a baked screenshot reused as a runtime sprite.

## Step 01: two choices
- `assets/previews/landscape-r02/01_camera_A_readout.svg`: candidate A (selected for this prototype). 
- `01_camera_B_readout.svg`: candidate B shifts vanishing area toward the left for more space in the leftmost lane. 
- `01_safe_zones.svg` marks HUD, two reserve slots, the hand-number bubble and the three bib corridors.
- `assets/source/camera/r02/camera_coordinates.json` is the authoring source for anchor coordinates, with 16:9/19.5:9/4:3 guidance.

The numbers in the review mockups are separate SVG text elements, not part of the prop/icon masters. Actual device touch/legibility validation is still pending.

## Step 02: style
- `02_tokyo_style_triptych.svg` compares the same runner, station worker, water bottle and guardrail under Normal/Fever/Inferno treatments.
- `assets/source/style/r02/tokyo_palette.json` contains the palette/line/readability contract. The AI-generated inspiration sheet shown separately in ChatGPT is an optional exploratory reference, not the source for these vector assets.

## Step 03: modular street and table
- Shared masters are under `assets/source/street/tokyo/shared` (skyline, road & markings, rails, furniture).
- Mode overlays are under `assets/source/street/tokyo/{normal,fever,inferno}`.
- Table support and top are shared under `assets/source/station/tokyo/shared`; mode-specific fascia is a separate replaceable source. The table does not move between modes.
- The three `03_tokyo_empty_*.svg` previews intentionally exclude UI and runners.

## Current review status
Provisional camera **A**, proportions and stylistic directions are **review**, NOT `approved` or `tested`. Live devices were not measured; native large-format source art and a character animation rig are outside steps 01–04.
