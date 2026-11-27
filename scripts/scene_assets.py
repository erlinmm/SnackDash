"""Compile a declared city pack into offline raster atlases.

City-specific paths, layouts, identities, animation clips and source revisions
live in assets/cities/<id>/pack.json. The compiler contains no city mappings.
Source assets remain editable; the generated atlas is a build product.
"""
from __future__ import annotations
import base64
import copy
import hashlib
import io
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image
import cairosvg

ROOT = Path(__file__).resolve().parents[1]
MODES = ("normal", "fever", "inferno")
CANONICAL_ITEMS = ("water", "banana", "apple", "orange", "bar", "juice")
PAGE = 2048
MIME = {".png":"image/png", ".webp":"image/webp", ".jpg":"image/jpeg", ".jpeg":"image/jpeg"}
ET.register_namespace("", "http://www.w3.org/2000/svg")

def require(condition, message):
    if not condition:
        raise ValueError(message)

def local(path):
    p = (ROOT / path).resolve()
    require(p.is_relative_to(ROOT), f"Asset path escapes repository: {path}")
    require(p.is_file(), f"Missing asset: {path}")
    return p

def load_pack(city, seen=()):
    require(re.fullmatch(r"[a-z0-9][a-z0-9-]*",city), f"Invalid city id: {city}")
    require(city not in seen, f"City pack inheritance cycle: {city}")
    path = ROOT / "assets/cities" / city / "pack.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    require(data.get("schemaVersion")==1 and data.get("id")==city, f"Invalid pack identity/schema: {path}")
    if "extends" not in data:
        return data
    result = load_pack(data["extends"],(*seen,city))
    result.update({k:copy.deepcopy(v) for k,v in data.items() if k not in ("extends","patches")})
    for patch in data.get("patches",[]):
        parts = patch["path"]
        require(parts and parts[0] not in ("id","schemaVersion"), "Invalid patch path")
        target = result
        for part in parts[:-1]:
            target=target[part]
        target[parts[-1]]=copy.deepcopy(patch["value"])
    return result

def point(v, n, name):
    require(isinstance(v,list) and len(v)==n and all(isinstance(x,(int,float)) and not isinstance(x,bool) and abs(x)<1e7 for x in v),f"Invalid {name}")

def validate(pack):
    resources=pack["resources"]
    required=set()
    def asset(key, context):
        require(isinstance(key,str) and key in resources, f"{context}: undeclared resource {key!r}")
        required.add(key)
    def frames(items, context, actor=None):
        require(isinstance(items,list) and items, f"{context}: empty animation")
        for f in items:
            asset(f["image"],context)
            require(isinstance(f["durationMs"],(int,float)) and 0<f["durationMs"]<=60000,f"{context}: invalid duration")
            if actor:
                point(f["sourceSize"],2,context+" sourceSize")
                require(all(x>0 for x in f["sourceSize"]), f"{context}: zero frame size")
                point(f["pivot"],2,context+" pivot")
                point(f["anchors"]["hand"],2,context+" hand")
                if actor=="runner":
                    point(f["anchors"]["bib"],4,context+" bib")
    require(pack["schemaVersion"]==1,"Unsupported asset schema")
    require(pack["reviewStatus"] in ("approved","review","rejected-art-technical-fixture","test-only"),"Unknown art review status")
    scene=pack["scene"]; point(scene["canvas"],2,"canvas")
    require(scene["canvas"]==[1280,720],"Landscape v1 logical canvas must be 1280x720")
    camera=scene["camera"]; ys=camera["yControlPoints"]
    require(len(ys)>=2 and len(ys)==len(camera["leftX"])==len(camera["rightX"]),"Camera point count mismatch")
    require(all(b>a for a,b in zip(ys,ys[1:])) and all(r>l for l,r in zip(camera["leftX"],camera["rightX"])),"Invalid road boundaries")
    require(len(camera["laneFractions"])==4,"Exactly three lanes are required")
    require(len(scene["slots"])==2,"Exactly two reserve slots are required")
    for i,s in enumerate(scene["slots"]):
        point(s["rect"],4,f"slot {i} rect");point(s["icon"],3,f"slot {i} icon");point(s["number"],3,f"slot {i} number")
        x,y,w,h=s["rect"]
        require(x>=0 and y>=0 and w>0 and h>0 and x+w<=1280 and y+h<=720,f"slot {i}: outside canvas")
    for name,s in scene["hud"].items():
        point(s["rect"],4,f"HUD {name}")
        x,y,w,h=s["rect"]
        require(x>=0 and y>=0 and w>0 and h>0 and x+w<=1280 and y+h<=720,f"HUD {name}: outside canvas")
    require(set(scene["hud"])=={"levels","race","time","score","combo","restart","pause","sound","fullscreen"},"Missing functional HUD slot")
    require(0<scene["timing"]["throwRecovery"] and scene["timing"]["throwRecovery"]>=.41,"Recovery cannot precede the canonical hit")
    require(len(pack["runners"])>=2 and {r["gender"] for r in pack["runners"]}>={"female","male"},"Both runner cast groups required")
    require(len({r["id"] for r in pack["runners"]})==len(pack["runners"]),"Duplicate runner ids")
    for runner in pack["runners"]:
        frames(runner["frames"],runner["id"],"runner")
        for action in ("receive_supply","thanks","pain","surprise","disappointment","cheer","selected"):
            frames(runner["states"][action]["frames"],runner["id"]+"/"+action,"runner")
    for mode in MODES:
        asset(pack["backgrounds"][mode],mode+" background")
        for layer in pack["station"][mode]["layers"]:
            asset(layer["image"],mode+" station")
            point(layer["rect"],4,"station rect")
            require(layer["layer"] in ("back","body","front"),"Invalid station layer")
        for motion in ("normal","reduced"):
            asset(pack["ambient"][mode+"/"+motion],mode+" atmosphere")
        for sex in ("female","male"):
            staff=pack["staff"][sex+"-"+mode]
            frames(list(staff["frames"].values()),sex+"-"+mode,"staff")
            for action in ("idle","swap","throw","enter","exit"):
                clip=staff["clips"][action]
                require(clip and all(f in staff["frames"] for f in clip),f"{sex}/{mode}/{action}: invalid frame reference")
            seq=[staff["frames"][i] for i in staff["clips"]["throw"]]
            require(sum(f.get("event")=="release" for f in seq)==1,f"{sex}/{mode}: exactly one release marker required")
            release=next(i for i,f in enumerate(seq) if f.get("event")=="release")
            require(release>0,f"{sex}/{mode}: windup must precede release")
            require(sum(f["durationMs"] for f in seq[:release])<410,f"{sex}/{mode}: release after gameplay hit")
        for c in scene["crowd"]["placements"]:
            frames(pack["crowd"][mode+"/"+c["depth"]+"/"+c["side"]]["frames"],mode+" crowd")
        for event in ("swap","throw","receive","score","mode_enter","mode_exit","miss"):
            for motion in ("normal","reduced"):
                fx=pack["fx"][mode+"/"+event+"/"+motion]
                point(fx["canvas"],2,"FX canvas")
                frames(fx["frames"],mode+"/"+event+"/"+motion)
        for hud in scene["hud"].values():
            asset(pack["ui"][mode+"/"+hud["skin"]],mode+" HUD")
            require(resources[pack["ui"][mode+"/"+hud["skin"]]].get("standalone"),"HUD skin must be standalone")
    for name in ("slot","bubble","avatar/female","avatar/male"):
        asset(pack["ui"][name],name)
    for item in set(CANONICAL_ITEMS)|set(pack["supplies"]):
        for placement in ("hand","slot","flight"):
            asset(pack["supplies"][item][placement],item+"/"+placement)
    for key in required:
        local(resources[key]["path"])
    for path in pack["sounds"].values():
        require(local(path).suffix.lower()==".wav",f"Unsupported sound: {path}")
    # A technical pack may explicitly retain unapproved assets. Release must
    # fail closed, not silently fall back to them.
    return required

def encode(data,mime):
    return "data:"+mime+";base64,"+base64.b64encode(data).decode("ascii")

def png(image):
    buf=io.BytesIO()
    image.save(buf,format="PNG",compress_level=5)
    return buf.getvalue()

def read_image(spec):
    p=local(spec["path"]); raw=p.read_bytes()
    digest=hashlib.sha256(raw).hexdigest()
    if p.suffix.lower()==".svg":
        require(b"<!DOCTYPE" not in raw.upper() and b"<!ENTITY" not in raw.upper(),f"External entities prohibited: {p}")
        node=ET.fromstring(raw)
        for el in node.iter():
            for k,v in el.attrib.items():
                if k.endswith("href"):
                    require(v.startswith(("#","data:")),f"External SVG link: {p}")
        # SVG source is authoring data. No browser SVG decoding/rasterization.
        for parent in list(node.iter()):
            for child in list(parent):
                if child.get("id") in spec.get("stripGroups",[]):
                    parent.remove(child)
        raw=cairosvg.svg2png(bytestring=ET.tostring(node,encoding="utf-8"))
    else:
        require(p.suffix.lower() in MIME,f"Unsupported artwork: {p}")
        require(not spec.get("stripGroups"),f"Cannot strip SVG groups from raster {p}")
    image=Image.open(io.BytesIO(raw)).convert("RGBA")
    if "rect" in spec:
        point(spec["rect"],4,"atlas rect")
        x,y,w,h=spec["rect"]
        require(all(isinstance(z,int) for z in [x,y,w,h]) and min(x,y)>=0 and w>0 and h>0 and x+w<=image.width and y+h<=image.height,f"Invalid source atlas rectangle: {p}")
        image=image.crop((x,y,x+w,y+h))
    original=spec.get("sourceSize",list(image.size))
    offset=spec.get("trimOffset",[0,0])
    point(original,2,"sourceSize");point(offset,2,"trimOffset")
    require(min(offset)>=0 and offset[0]+image.width<=original[0] and offset[1]+image.height<=original[1],f"Trim rectangle exceeds source canvas: {p}")
    return image,original,offset,digest

def compile_pack(pack, release=False):
    required=validate(pack)
    if release:
        require(pack["reviewStatus"]=="approved","Asset pack is not visually approved; release refused")
        require(not any(pack["resources"][k].get("reviewFallback") for k in required),"Unapproved fallback artwork; release refused")
        require(not any(c.get("staticReview") for c in pack["crowd"].values()),"Crowd animation not approved; release refused")
    images={}; sprites={}; sources={}; sheets=[]; dedup={}; cache={}
    sheet=None; cursor_x=cursor_y=row_h=0; sheet_id=None
    def finish_sheet():
        nonlocal sheet
        if sheet is not None:
            images[sheet_id]=encode(png(sheet),"image/png")
            sheets.append(sheet_id)
            sheet=None
    def put(image):
        nonlocal sheet,sheet_id,cursor_x,cursor_y,row_h
        w,h=image.size
        require(w+2<=PAGE and h+2<=PAGE,"Atlas sprite too large; declare a standalone resource")
        sig=hashlib.sha256(str(image.size).encode()+image.tobytes()).digest()
        if sig in dedup:return dedup[sig]
        if sheet is None:
            sheet=Image.new("RGBA",(PAGE,PAGE))
            sheet_id=f"atlas/{len(sheets)}";cursor_x=cursor_y=row_h=0
        if cursor_x+w+2>PAGE:
            cursor_x=0;cursor_y+=row_h;row_h=0
        if cursor_y+h+2>PAGE:
            finish_sheet()
            sheet=Image.new("RGBA",(PAGE,PAGE))
            sheet_id=f"atlas/{len(sheets)}";cursor_x=cursor_y=row_h=0
        x,y=cursor_x+1,cursor_y+1
        sheet.paste(image,(x,y))
        cursor_x+=w+2;row_h=max(row_h,h+2)
        dest=(sheet_id,[x,y,w,h]);dedup[sig]=dest
        return dest
    # Group related frames by logical key, then pack deterministically.
    for key in sorted(required):
        spec=pack["resources"][key]
        fingerprint=json.dumps(spec,sort_keys=True,separators=(",",":"))
        if fingerprint not in cache:
            cache[fingerprint]=read_image(spec)
        image,source_size,trim,digest=cache[fingerprint]
        sources[key]={"path":spec["path"],"sha256":digest}
        if spec.get("standalone"):
            page="single/"+key
            if spec.get("preserveBytes"):
                require(not spec.get("rect") and not spec.get("stripGroups") and local(spec["path"]).suffix.lower() in MIME,"preserveBytes requires a complete raster source")
                p=local(spec["path"]);images[page]=encode(p.read_bytes(),MIME[p.suffix.lower()])
            else:
                images[page]=encode(png(image),"image/png")
            rect=[0,0,*image.size];offset=trim
        else:
            bounds=image.getchannel("A").getbbox()
            if bounds is None:
                # Some reduced-motion/empty FX frames are intentionally clear.
                bounds=(0,0,1,1)
            cropped=image.crop(bounds)
            page,rect=put(cropped)
            offset=[trim[0]+bounds[0],trim[1]+bounds[1]]
        sprites[key]={"page":page,"rect":rect,"sourceSize":source_size,"trimOffset":offset}
    finish_sheet()
    # Actor frames refer to untrimmed authoring coordinates, not packed pixels.
    def check_frame(f):
        require(f["sourceSize"]==sprites[f["image"]]["sourceSize"],f"Frame sourceSize mismatch: {f['image']}")
    for r in pack["runners"]:
        for f in r["frames"]:check_frame(f)
        for clip in r["states"].values():
            for f in clip["frames"]:check_frame(f)
    for a in pack["staff"].values():
        for f in a["frames"].values():check_frame(f)
    manifest={k:copy.deepcopy(v) for k,v in pack.items() if k not in ("resources","sounds")}
    manifest["sourceFiles"]=sources
    sounds={k:encode(local(v).read_bytes(),"audio/wav") for k,v in pack["sounds"].items()}
    return {"manifest":manifest,"images":images,"sprites":sprites,"sounds":sounds}

def compile_city(city, release=False):
    return compile_pack(load_pack(city),release=release)

def runtime_settings(pack):
    scene=pack["scene"]
    # Preserve Tokyo preview progress; all other cities use their own isolated
    # storage keys. The ordinary portrait storage defaults remain in game.js.
    prefix="snackDashTokyoPreview" if pack["id"]=="tokyo" else "snackDashLandscape/"+pack["id"]+"/"
    return {"width":scene["canvas"][0],"height":scene["canvas"][1],
        "previewCityId":pack["raceCityId"],"backupCount":len(scene["slots"]),
        "initialEntryY":scene["traffic"]["initialEntryY"],"entryY":scene["traffic"]["entryY"],
        "throwRecovery":scene["timing"]["throwRecovery"],"disableImpactPause":scene["timing"]["disableImpactPause"],
        "storage":{"legacy":prefix+"LegacyV1","progress":prefix+"SaveV1","practice":prefix+"PracticeV1","locale":prefix+"LocaleV1","staff":prefix+"StaffV1"}}

def embedded_js(compiled):
    def dump(x):
        return json.dumps(x,ensure_ascii=False,separators=(",",":")).replace("</","<\\/")
    return "window.SnackDashAssetPack="+dump(compiled)+";\nwindow.SnackDashRuntime="+dump(runtime_settings(compiled["manifest"]))+";\n"
