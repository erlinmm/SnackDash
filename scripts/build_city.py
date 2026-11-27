#!/usr/bin/env python3
"""Build one offline landscape city from its declarative asset pack."""
from pathlib import Path
import argparse
import zipfile
from scene_assets import ROOT,compile_city,embedded_js

FILES={
 "CSS":("src/landscape/app.css","style"),
 "I18N":("src/js/i18n.js","script"),
 "LOCALES":("src/js/locales.js","script"),
 "MATH":("src/js/math.js","script"),
 "REACTIONS":("src/js/reactions.js","script"),
 "ANIMATION":("src/landscape/animation.js","script"),
 "RENDERER":("src/landscape/renderer.js","script"),
 "HUD":("src/landscape/hud.js","script"),
 "AUDIO":("src/landscape/audio.js","script"),
 "PRESENTATION":("src/landscape/presentation.js","script"),
 "GAME":("src/js/game.js","script"),
}

def build(destination,city="tokyo",release=False,compiled=None):
    if compiled is None:compiled=compile_city(city,release=release)
    elif release:raise ValueError("Release must compile and validate its own pack")
    page=(ROOT/"src/landscape/index.template.html").read_text(encoding="utf-8")
    sources={k:((ROOT/path).read_text(encoding="utf-8"),tag) for k,(path,tag) in FILES.items()}
    sources["PACK"]=(embedded_js(compiled),"script")
    for name,(content,tag) in sources.items():
        marker=f"<!-- BUILD:{name} -->"
        if page.count(marker)!=1:raise RuntimeError("Invalid template marker "+marker)
        if tag=="script" and "</script" in content.lower():raise RuntimeError("Unsafe inline source "+name)
        page=page.replace(marker,f"<{tag}>\n{content}\n</{tag}>")
    if "<!-- BUILD:" in page:raise RuntimeError("Unfilled template")
    destination=Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(page,encoding="utf-8")
    return destination

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--city",default="tokyo")
    p.add_argument("--output",type=Path)
    p.add_argument("--zip",action="store_true")
    p.add_argument("--release",action="store_true")
    args=p.parse_args()
    out=args.output or ROOT/"dist"/("Snack_Dash_"+args.city+"_Preview.html")
    output=build(out,args.city,args.release)
    print(f"Built {output} ({output.stat().st_size:,} bytes)")
    if args.zip:
        with zipfile.ZipFile(output.with_suffix(".zip"),"w",zipfile.ZIP_DEFLATED) as archive:
            archive.write(output,output.name)

if __name__=="__main__":main()
