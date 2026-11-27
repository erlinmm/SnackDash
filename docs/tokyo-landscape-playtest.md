# Tokyo landscape technical preview

The earlier r03 illustrated/technical demo was rejected for visual delivery.
The three Tokyo street textures are retained unchanged. The previous
Tokyo-specific renderer and build-time game-code substitutions have been
superseded by the shared landscape presentation and asset compiler.

See [Landscape asset contract v1](landscape-asset-contract.md) for the
architecture, pack schema, replacement workflow, build commands, and
cross-pack acceptance tests.

    python -m pip install -r scripts/requirements-landscape.txt
    python scripts/build_city.py --city tokyo --zip

The backward-compatible build_tokyo.py entry point still writes
dist/Snack_Dash_Tokyo_Preview.html.

This is a technical validation build, not approved customer-facing art.
The assets/cities/tokyo/pack.json review status explicitly records the
rejected art. assets/cities/qa-london/pack.json is a synthetic second-city
test fixture, not London art. Both are blocked from --release.
