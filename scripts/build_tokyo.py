#!/usr/bin/env python3
"""Build the isolated Tokyo landscape playtest from the canonical offline game.

The portrait build is not edited. Exact, checked substitutions specialize only
the preview's coordinate system, tray capacity, storage namespace and visual
adapter. A changed upstream anchor fails the build instead of silently drifting.
"""
from pathlib import Path
import argparse
import base64
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOKYO = ROOT / "src/tokyo"
WIDTH, HEIGHT = 1280, 720

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def exact(text, before, after, count=1):
    actual = text.count(before)
    if actual != count:
        raise RuntimeError(f"Tokyo build anchor changed: {before!r} ({actual}, expected {count})")
    return text.replace(before, after)

def specialize_game(game, adapter):
    substitutions = [
        ("const W=390,H=700,GOAL=10", "const W=1280,H=720,GOAL=10", 1),
        ("snackDashSaveV1", "snackDashTokyoPreviewLegacyV1", 1),
        ("snackDashSaveV2", "snackDashTokyoPreviewSaveV1", 2),
        ("snackDashPracticeV1", "snackDashTokyoPreviewPracticeV1", 1),
        ("this.supplies.queue.length<3", "this.supplies.queue.length<2", 3),
        ("this.supplies.queue.length>=3", "this.supplies.queue.length>=2", 1),
        ("72+(i+.35)*(557/shuffled.length)", "195+(i+.35)*(450/shuffled.length)", 1),
        ("(attempt<120?(i+attempt)%2:(attempt%3))", "((i+attempt)%3)", 1),
        ("clamp(desiredY+this.rand(-35,35),43,646)", "clamp(desiredY+this.rand(-35,35),190,650)", 1),
        ("this.rand(42,651)", "this.rand(185,650)", 1),
        ("this.makeRunner(n,12,LANES", "this.makeRunner(n,290,LANES", 1),
        ("const y of [8,18,30,42]", "const y of [290,296,302,308]", 1),
        ("best={y:8,lane:1,score:0}", "best={y:290,lane:1,score:0}", 1),
        ("this.hitstopRemaining=reducedMotion()?0:.04;", "this.hitstopRemaining=0;", 1),
        ("this.shakeRemaining=reducedMotion()?0:.12;", "this.shakeRemaining=0;", 1),
        ("if(t.elapsed>=.88)", "if(t.elapsed>=.48)", 1),
        ("if(x>=48&&x<=W-48&&y>=255&&y<=419)", "if(x>=W/2-150&&x<=W/2+150&&y>=H/2-75&&y<=H/2+75)", 1),
    ]
    for old, new, count in substitutions:
        game = exact(game, old, new, count)
    anchor = "\n  $('languageSelect').value=I18n.locale();"
    return exact(game, anchor, "\n" + adapter + "\n" + anchor)

def illustrated_art():
    """Embed the independent raster atlases. No remote assets."""
    root = ROOT / "assets/exports/tokyo"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    if manifest["version"] != 2:
        raise RuntimeError("Unexpected Tokyo artwork version")
    names = set(manifest["backgrounds"].values()) | {
        "staff.webp", "runners.webp", "supplies.webp", "table-texture.webp"
    }
    images = {}
    for name in sorted(names):
        data = (root / name).read_bytes()
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise RuntimeError(f"Invalid WebP artwork: {name}")
        images[name] = "data:image/webp;base64," + base64.b64encode(data).decode("ascii")
    return "window.SnackDashTokyoArt=" + json.dumps(
        {"manifest": manifest, "images": images}, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"

def build(destination):
    page = read("src/index.template.html")
    start = page.index('    <section class="menu" id="menuScreen"')
    end = page.index('    <dialog id="howToPlayDialog"', start)
    page = page[:start] + read("src/tokyo/menu.html") + "\n" + page[end:]
    page = exact(page, 'width="390" height="700"', 'width="1280" height="720"')
    page = exact(page, '      </div>\n      <div class="combo-panel"', '        <button class="small-btn" id="tokyoSoundBtn" type="button" aria-label="Sound">♪</button>\n      </div>\n      <div class="combo-panel"')
    page = exact(page, '    </section>\n  </main>', '    </section>\n    <div id="tokyoRotate" data-i18n="tokyo.rotate" role="status">Rotate your device to landscape.</div>\n  </main>')
    page = exact(page, '<title>Snack Dash! V26 — Natural Arrivals & Learning Loops</title>', '<title>SnackDash V2 — Tokyo Landscape Playtest</title>')
    js = {
        "I18N": exact(read("src/js/i18n.js"), "snackDashLocaleV1", "snackDashTokyoPreviewLocaleV1"),
        "LOCALES": read("src/js/locales.js"),
        "MATH": exact(read("src/js/math.js"), "for(let i=0;i<3;i++)queue.push(this.chooseSupply(numbers));", "for(let i=0;i<2;i++)queue.push(this.chooseSupply(numbers));"),
        "REACTIONS": read("src/js/reactions.js"),
        "GAME": illustrated_art() + specialize_game(read("src/js/game.js"), read("src/tokyo/art.js") + "\n" + read("src/tokyo/preview.js")),
    }
    page = exact(page, "<!-- BUILD:CSS -->", "<style>\n" + read("src/tokyo/preview.css") + "\n</style>")
    for key, source in js.items():
        if "</script" in source.lower():
            raise RuntimeError("Unsafe inline script: " + key)
        page = exact(page, f"<!-- BUILD:{key} -->", "<script>\n" + source + "\n</script>")
    if "<!-- BUILD:" in page:
        raise RuntimeError("Unfilled marker")
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page, encoding="utf-8")
    return destination

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT/"dist/Snack_Dash_Tokyo_Preview.html")
    parser.add_argument("--zip", action="store_true")
    args = parser.parse_args()
    result = build(args.output)
    print(f"Built {result} ({result.stat().st_size:,} bytes)")
    if args.zip:
        with zipfile.ZipFile(result.parent/"Snack_Dash_Tokyo_Preview.zip", "w", zipfile.ZIP_DEFLATED) as z:
            z.write(result, "Snack_Dash_Tokyo_Preview.html")
