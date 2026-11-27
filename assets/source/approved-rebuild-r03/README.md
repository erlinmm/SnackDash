# SnackDash approved-reference-driven build sources (steps 01–04)

Source samples (already committed in the repository): `assets/references/tokyo/approved/`.

Run `python assets/source/approved-rebuild-r03/make_assets.py` from the repository using Pillow, numpy, scipy and cairosvg; it automatically reads the three approved reference WebPs and `street/tokyo/empty_plate_seed.webp`. Re-running creates original PNG previews; the GitHub commit optimizes large previews to WebP without changing the underlying source geometry. Coordinate JSON and SVG source masters are editable; all generated PNGs are derived and reproducible from those masters. The build script and new plate image are archived alongside the source to enable targeted art review. See `assets/previews/landscape-r02/approved-rebuild-r03/README.md` for precise scope and limitations.


The street layer export is further optimized into five cropped lossless WebP fragments with offsets in `street/tokyo/layers/region_layers_manifest.json`; the generator produces the equivalent four full-frame RGBA masks before this packaging step.
