# Adopted approved Tokyo camera/reference geometry for FX and HUD reviews

Copied unmodified art/data subtrees from `feature/main2-landscape-assets-r02` on 2026-11-27. These contain the original owner-approved Tokyo **reference images**, camera coordinates, reference-derived palette, layered environment/desk geometry and independent sample supplies/UI plates. Their image content is not automatically approved as production code/assets. No Python generator or executable code was copied.

Canonical owner-approved images: `assets/references/tokyo/approved/{tokyo_normal_approved_r02.webp,tokyo_fever_approved_r02.webp,tokyo_inferno_approved_r02.webp}`. Latest owner-approved Inferno is revised 2026-11-27, not the older original from r01.

Use `assets/source/approved-rebuild-r03/camera/approved_camera_coordinates.json` as the review-space coordinate source. Existing `assets/previews/steps05-08/` samples are earlier illustrative mockups and must not silently override the approved references. New Step 09–10 previews use the approved high-angle left-bending road reference when placing anchor points. **No gameplay code changes.**
