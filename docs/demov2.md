# Demo V2
Asset-only pilot on the Landscape Engine V2 baseline 8ea936a258c4df0b31cc5d306f600213634d41c1. Source atlas revision e5faf6d6855dd16f03328fd46ef6312f3a94748b from feature/main2-steps05-08-assets-r01. No engine, game-rule, compiler or common HUD implementation changes. Original Tokyo technical pack and London replacement fixture remain unchanged.

Build:
    python -m pip install -r scripts/requirements-landscape.txt
    python scripts/build_city.py --city tokyo-demo --output dist/SnackDash_DemoV2.html --zip

This is a playable review candidate, not release-approved art. The original three street plates retain byte-for-byte provenance. The illustrated pilot uses nine appearance choices, original event FX/audio, newly supplemented offline pose frames and per-mode clips, independent station/props/crowd/HUD/fireworks. All new sprites remain reviewFallback until approved. Some character and crowd animation frames are derived from existing art by offline deformation or pose reuse, and need further hand-authored refinement. Read assets/source/demo-v2/tokyo/README.md for provenance and limits.

CI checks actual browser playback, contact markers, receipt and miss FX, ten race results, responsive inputs, and verifies engine sources are unchanged. Test captures are actual renderer output, not the reference mockups. Physical-device Safari validation and visual approval remain separate.