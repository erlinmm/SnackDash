# Step 04 — true separate supply components

The three original objects (`water`, `gel`, `banana`) each have individually editable transparent SVG sources for `hand`, `flight` and `slot` uses. The nine raster exports use RGBA PNG with independently transparent pixels (see `assets/exports/supply/`); size is 166×166 for the hand/flight previews and 96×96 for slot icons.

Independently authored UI source components: an **empty number-only speech bubble**, a **single empty reserve slot** (to be instanced exactly twice), and a **blank bib**. There are **no numbers or object icons baked into the bubble**. The two reserve slots in composition each contain one independent icon and a separate number text layer. The emitted object in flight has no printed value.

Review images: `04_supplies_numeric_assembly.svg` tests hand-side 6/12/13, plus reserve 4/8; `04_alpha_edge_check.svg` compares bright and dark backdrops. PNG silhouette/anti-aliasing check and real-device click test remain pending final art approval.

> All 01–04 deliverables are review candidates, not approved runtime sprites or implementation changes. `gel` has **no** runtime math mapping in main2 yet.
