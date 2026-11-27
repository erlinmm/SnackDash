#!/usr/bin/env python3
"""Backward-compatible Tokyo preview entry point; the city builder is generic."""
from pathlib import Path
import argparse
import sys
import zipfile
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from build_city import build as build_city

def build(destination):
    return build_city(destination,city="tokyo")

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--output",type=Path,default=ROOT/"dist/Snack_Dash_Tokyo_Preview.html")
    p.add_argument("--zip",action="store_true")
    args=p.parse_args()
    out=build(args.output)
    print(f"Built {out} ({out.stat().st_size:,} bytes)")
    if args.zip:
        with zipfile.ZipFile(out.with_suffix(".zip"),"w",zipfile.ZIP_DEFLATED) as z:
            z.write(out,out.name)
