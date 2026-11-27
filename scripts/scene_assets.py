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
    """Resolve explicitly shared parts and inherited patches at build time."""
    require(re.fullmatch(r"[a-z0-9][a-z0-9-]*",city), f"Invalid city id: {city}")
    require(city not in seen, f"City pack inheritance cycle: {city}")
    path = ROOT / "assets/cities" / city / "pack.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    require(data.get("schemaVersion")==2 and data.get("id")==city, f"Invalid pack identity/schema: {path}")
    result=load_pack(data["extends"],(*seen,city)) if "extends" in data else {}
    result.update({k:copy.deepcopy(v) for k,v in data.items() if k not in ("extends","patches","parts")})
    for name,relative in data.get("parts",{}).items():
        require(name not in data,f"Duplicate inline and file part: {name}")
        require(name not in ("id","schemaVersion","reviewStatus","raceCityId"),f"Reserved part: {name}")
        part=(path.parent/relative).resolve()
        require(part.is_relative_to(ROOT) and part.is_file(),f"Missing or external pack part: {part}")
        result[name]=json.loads(part.read_text(encoding="utf-8"))
    for patch in data.get("patches",[]):
        parts=patch["path"]
        require(parts and parts[0] not in ("id","schemaVersion"),"Invalid patch path")
        target=result
        for part in parts[:-1]:target=target[part]
        target[parts[-1]]=copy.deepcopy(patch["value"])
    return result

def number(v,name,minimum=None,maximum=None):
    require(isinstance(v,(int,float)) and not isinstance(v,bool) and abs(v)<1e8 and
        (minimum is None or v>=minimum) and (maximum is None or v<=maximum),f"Invalid {name}: {v!r}")

def point(v,n,name):
    require(isinstance(v,list) and len(v)==n,f"Invalid {name}")
    for x in v:number(x,name)

def rect(v,name):
    point(v,4,name);require(v[2]>0 and v[3]>0,f"Empty {name}")

ACTIONS={
 "runner":("run","receive_supply","thanks","pain","surprise","disappointment","cheer","selected"),
 "staff":("idle","swap","throw"),
 "crowd":("idle","cheer","miss","festival")
}
HUD_BINDINGS={
 "score.current","score.exact","score.goal","race.index","race.phase","race.fixture",
 "race.countdownVisible","race.countdown","race.celebrating","time.remaining","combo.count",
 "combo.progress","combo.label","mode.current","mode.label","progress.cityCleared",
 "audio.enabled","audio.glyph","audio.label","controls.pauseGlyph","controls.pauseLabel",
 "result.visible","result.won","result.heading","result.text","result.stats","result.primary",
 "held.number","held.type","message.text","message.active","hint.text"
}
COMMANDS={"menu","pause","restart","sound","fullscreen","result.next"}
EVENTS={"swap","throw.start","throw.release","hit","miss","score","mode.change","marker",
    "runner.reaction","countdown","go","race.finish","transition.start","transition.complete","transition.cancel"}
SYNTH={"countdown","go","throw","correct","wrong","combo","grab","swapConfirm","victory","fail",
    "feverStart","infernoStart","feverHit","megaHit","feverEnd","music"}
MOTION=("normal","reduced")

def validate(pack):
    required=set()
    resources=pack["resources"];library=pack["clips"];scene=pack["scene"];actors=pack["actors"]
    def asset(key,context):
        require(isinstance(key,str) and key in resources,f"{context}: undeclared resource {key!r}")
        required.add(key)
    def clip_ref(ref,context):
        if isinstance(ref,list):
            require(bool(ref),f"{context}: no animation variants")
            return [x for v in ref for x in clip_ref(v,context)]
        if isinstance(ref,dict):
            require(set(ref)==set(MOTION),f"{context}: normal/reduced animation variants required")
            return [x for v in ref.values() for x in clip_ref(v,context)]
        require(isinstance(ref,str) and ref in library,f"{context}: undeclared clip {ref!r}")
        return [ref]
    def by_mode(mapping,callback,context):
        require(isinstance(mapping,dict) and set(mapping)==set(MODES),f"{context}: all three modes required")
        for m,ref in mapping.items():
            if isinstance(ref,dict):
                require(set(ref)==set(MOTION),f"{context}/{m}: normal and reduced required")
                for r in ref.values():callback(r,context+"/"+m)
            else:callback(ref,context+"/"+m)
    def event_rule(rule,context):
        require(rule["event"] in EVENTS,f"{context}: unknown event {rule['event']}")
        require(rule.get("mode","after") in ("before","after","visual"),f"{context}: bad mode source")
        if "modes" in rule:require(set(rule["modes"])<=set(MODES),f"{context}: bad modes")
    require(pack["schemaVersion"]==2,"Unsupported asset schema")
    require(pack["reviewStatus"] in ("approved","review","rejected-art-technical-fixture","test-only"),"Unknown art review status")
    require(scene["canvas"]==[1280,720],"Landscape v2 logical world must be 1280x720")
    camera=scene["camera"];ys=camera["yControlPoints"]
    require(len(ys)>=2 and len(ys)==len(camera["leftX"])==len(camera["rightX"]),"Camera point count mismatch")
    require(all(b>a for a,b in zip(ys,ys[1:])) and all(r>l for l,r in zip(camera["leftX"],camera["rightX"])),"Invalid road boundaries")
    require(len(camera["laneFractions"])==4,"Exactly three lanes are required")
    require(len(scene["slots"])==2,"Exactly two reserve slots are required")
    for i,slot in enumerate(scene["slots"]):
        rect(slot["rect"],f"slot {i} rect");point(slot["icon"],3,"slot icon");point(slot["number"],3,"slot number")
        x,y,w,h=slot["rect"];require(x>=0 and y>=0 and x+w<=1280 and y+h<=720,"Reserve outside world")
    number(scene["timing"]["throwRecovery"],"throw recovery",.41,10)
    point(scene["staff"]["ground"],2,"staff ground");point(scene["staff"]["table"],2,"staff table")
    require(scene["staff"]["table"][1]==scene["table"]["contact"],"Staff must stand on fixed tabletop")
    number(scene["staff"]["height"],"staff height",1)
    for m in MODES:
        proj=scene["projectile"][m]
        for k in ("arc","size","turns"):number(proj[k],f"projectile/{m}/{k}")
    for k,v in scene["order"].items():number(v,"layer "+k)
    for cid,clip in library.items():
        require(clip.get("playback") in ("once","loop","hold"),f"{cid}: invalid playback")
        require(isinstance(clip["frames"],list) and bool(clip["frames"]),f"{cid}: empty clip")
        if "repeat" in clip:require(isinstance(clip["repeat"],int) and clip["repeat"]>=0,f"{cid}: invalid repeat")
        for frame in clip["frames"]:
            asset(frame["image"],cid);number(frame["durationMs"],cid+" duration",.001,60000)
            require(all(isinstance(x,str) and x for x in frame.get("marks",[])),f"{cid}: invalid marker")
        if "size" in clip:
            point(clip["size"],2,cid+" size");require(min(clip["size"])>0,f"{cid}: zero size")
    def actor(set_,role):
        require(set(set_["modes"])==set(MODES),f"{set_['id']}: all modes required")
        for mode,actions in set_["modes"].items():
            require(set(ACTIONS[role])<=set(actions),f"{set_['id']}/{mode}: missing required action")
            for action,ref in actions.items():
                for cid in clip_ref(ref,set_["id"]+"/"+mode+"/"+action):
                    c=library[cid]
                    if "next" in c:require(c["next"] in actions,f"{cid}: missing next action")
                    if role!="crowd":
                        for f in c["frames"]:
                            point(f["sourceSize"],2,cid+" sourceSize");require(min(f["sourceSize"])>0,f"{cid}: bad source size")
                            point(f["pivot"],2,cid+" pivot");point(f["anchors"]["hand"],2,cid+" hand")
                            point(f["anchors"]["head"],2,cid+" head")
                            if role=="runner":
                                point(f["anchors"]["bib"],4,cid+" bib")
                                require(min(f["anchors"]["bib"][2:])>0,f"{cid}: empty bib")
                            else:point(f["anchors"]["prop"],2,cid+" decorative prop hand")
                    if role=="staff" and action=="throw":
                        times=marker_times(c,"release")
                        require(len(times)==1 and times[0]>0,f"{cid}: exactly one release marker after windup")
                        release=times[0]/clip_length(c)*scene["timing"]["throwRecovery"]
                        require(release<.41,f"{cid}: release marker after gameplay hit")
    require(len(actors["runners"])>=2 and {r["gender"] for r in actors["runners"]}>={"female","male"},"Both runner cast groups required")
    require(len({r["id"] for r in actors["runners"]})==len(actors["runners"]),"Duplicate runner ids")
    require(set(actors["staff"])=={"female","male"},"Both staff appearances required")
    for r in actors["runners"]:actor(r,"runner")
    for a in actors["staff"].values():actor(a,"staff")
    crowd_ids=set()
    for c in actors["crowds"]:
        require(c["id"] not in crowd_ids,"Duplicate crowd id");crowd_ids.add(c["id"])
        rect(c["rect"],c["id"]);number(c["z"],c["id"]+" z");actor(c,"crowd")
    for role,rules in pack["bindings"].items():
        require(role in ACTIONS,"Unknown actor role")
        sets=actors["runners"] if role=="runner" else list(actors["staff"].values()) if role=="staff" else actors["crowds"]
        for rule in rules:
            event_rule(rule,role)
            require(rule.get("interrupt","higher") in ("never","higher","allow"),"Invalid interruption policy")
            for a in sets:
                for m in MODES:clip_ref(a["modes"][m][rule["action"]],a["id"]+" binding")
    nodes=pack["world"]["nodes"];node_ids={n["id"] for n in nodes}
    require(len(node_ids)==len(nodes) and "staff" not in node_ids and not node_ids&crowd_ids,"Duplicate world object id")
    street=[n for n in nodes if n.get("role")=="street"]
    require(len(street)==1,"Exactly one base street layer required")
    for node in nodes:
        rect(node["rect"],node["id"]);number(node["z"],node["id"]+" z")
        require("images" in node or "clips" in node,f"{node['id']}: no artwork")
        if "images" in node:by_mode(node["images"],asset,node["id"])
        if "clips" in node:by_mode(node["clips"],clip_ref,node["id"])
        if "revealRect" in node:rect(node["revealRect"],node["id"]+" reveal")
        for m in node.get("modeState",{}):require(m in MODES,"Invalid object mode")
    require(set(pack["world"]["staffModeState"])==set(MODES),"Missing staff mode posture")
    for m in MODES:
        v=pack["world"]["staffModeState"][m]
        require(v["costume"]==m and v["elevation"]==(1 if m=="inferno" else 0),"Wrong terminal staff posture")
    targets=node_ids|crowd_ids|{"staff"}
    transitions=pack["transitions"]
    require({"normal>fever","fever>inferno","fever>normal","inferno>normal"}<=set(transitions),"Missing mode transition")
    for name,spec in transitions.items():
        require(len(name.split(">"))==2 and set(name.split(">"))<=set(MODES),"Invalid transition name")
        require(bool(spec["tracks"]),"Empty transition")
        for sex,staff in actors["staff"].items():
            for motion in MOTION:
                validate_timeline(name,spec,staff,motion,library,actors["crowds"],targets,clip_ref)
        for destination,route in spec.get("interruptions",{}).items():
            require(destination in MODES and route in transitions,"Invalid interrupted transition route")
    hud=pack["hud"];point(hud["canvas"],2,"HUD canvas");require(min(hud["canvas"])>0,"Zero HUD canvas")
    widget_ids=set();bindings=set();commands=set()
    def widget(w):
        require(w["id"] not in widget_ids,f"Duplicate HUD id {w['id']}")
        widget_ids.add(w["id"])
        require(w["type"] in ("container","text","image","animation","button","progress"),f"Unsupported HUD widget {w['type']}")
        rect(w["rect"],w["id"])
        for m,r in w.get("rectByMode",{}).items():require(m in MODES,"Unknown HUD mode");rect(r,w["id"]+"/"+m)
        for key in ("binding","labelBinding"):
            if key in w:require(w[key] in HUD_BINDINGS,f"Unknown HUD binding {w[key]}");bindings.add(w[key])
        for key in ("visibleWhen","enabledWhen"):
            if key in w:require(w[key]["binding"] in HUD_BINDINGS,"Unknown HUD condition binding")
        if w["type"]=="button":
            require(w["command"] in COMMANDS,f"Unknown HUD command {w['command']}");commands.add(w["command"])
        if "images" in w:by_mode(w["images"],asset,w["id"])
        if "clips" in w:by_mode(w["clips"],clip_ref,w["id"])
        for child in w.get("children",[]):widget(child)
    for w in hud["widgets"]:widget(w)
    require(commands>=COMMANDS,"Missing required HUD control commands")
    for a in hud["animations"]:
        event_rule(a,"HUD animation");require(a["target"] in widget_ids,"Unknown HUD animation target")
        if "clips" in a:by_mode(a["clips"],clip_ref,"HUD animation")
        else:number(a["durationMs"],"HUD animation duration",.001)
        validate_keyframes(a.get("keyframes",[]))
    for rule in pack["fx"]["bindings"]:
        event_rule(rule,"effect")
        for m,ref in rule["clips"].items():
            require(m in MODES,"Invalid FX mode")
            for cid in clip_ref(ref,rule["id"]):require("size" in library[cid],f"{cid}: missing FX size")
        require(set(rule["clips"])==set(MODES),"All FX modes required")
        anchor=rule["anchor"];kind=anchor["type"]
        require(kind in ("screen","projectile","object","hud.binding","hud.score") or kind.startswith(("staff.","runner.")),"Unknown effect anchor")
        if kind=="screen":point(anchor["position"],2,"screen anchor")
        if kind=="object":require(anchor["target"] in node_ids,"Unknown effect object")
        if kind in ("hud.binding","hud.score"):require(anchor.get("binding","score.current") in bindings,"FX refers to absent HUD binding")
        number(rule["width"],"FX width",.001);number(rule["z"],"FX layer")
        if "durationMs" in rule:number(rule["durationMs"],"FX duration",.001)
    for name in ("slot","bubble","avatar/female","avatar/male"):
        asset(pack["ui"][name],name)
    for key in ("avatar/female","avatar/male"):
        require(resources[pack["ui"][key]].get("standalone"),"Staff avatar must be standalone")
    for item in set(CANONICAL_ITEMS)|set(pack["supplies"]):
        for placement in ("hand","slot","flight"):asset(pack["supplies"][item][placement],item+"/"+placement)
    def sound_rule(rule):
        require(("sound" in rule)!=("synth" in rule),"Sound binding must choose sample or synth")
        if "sound" in rule:require(rule["sound"] in pack["sounds"],"Missing sound "+rule["sound"])
        else:require(rule["synth"] in SYNTH,"Unknown synthesized cue")
        if "volume" in rule:number(rule["volume"],"volume",0,1)
    for rule in pack["audio"]["bindings"]:event_rule(rule,"audio");sound_rule(rule)
    require(set(pack["audio"]["music"])==set(MODES),"All music modes required")
    for r in pack["audio"]["music"].values():sound_rule(r)
    for key in required:local(resources[key]["path"])
    for path in pack["sounds"].values():require(local(path).suffix.lower() in (".wav",".ogg",".mp3"),f"Unsupported sound: {path}")
    return required

def clip_length(clip):return sum(f["durationMs"] for f in clip["frames"])

def marker_times(clip,name):
    total=0;result=[]
    for f in clip["frames"]:
        result.extend(total for m in f.get("marks",[]) if m==name)
        total+=f["durationMs"]
    return result

def validate_keyframes(frames):
    last=-1
    for f in frames:
        number(f["at"],"keyframe position",0,1)
        require(f["at"]>last,"Keyframes must be ordered");last=f["at"]

def validate_timeline(name,spec,staff,motion,library,crowds,targets,clip_ref):
    """Validate dependency graph and actual per-clip marker timings.
    The JS scheduler resolves the same references for its selected variant.
    """
    records={}
    def time(ref):
        if isinstance(ref,(int,float)):return ref
        require(ref["track"] in records,f"{name}: reference must name earlier track")
        start,end,clips,scale=records[ref["track"]]
        if "marker" in ref:
            require(bool(clips),f"{name}: marker reference is not a clip")
            offsets=[]
            for cid in clips:
                values=marker_times(library[cid],ref["marker"])
                require(len(values)==1,f"{name}/{cid}: expected one marker {ref['marker']}")
                offsets.append(values[0]*scale)
            t=start+offsets[0]
        else:t=end if ref.get("point")=="end" else start
        return t+ref.get("offsetMs",0)
    for t in spec["tracks"]:
        require(t["id"] not in records,f"{name}: duplicate track")
        require(t["target"] in targets,f"{name}: unknown track target {t['target']}")
        require(t["type"] in ("clip","set","tween","cue"),f"{name}: invalid track type")
        start=time(t.get("start",0));number(start,"track start",0)
        ids=[]
        if t["type"]=="clip":
            if "clip" in t:ids=clip_ref(t["clip"],name)
            else:
                actor=staff if t["target"]=="staff" else next((c for c in crowds if c["id"]==t["target"]),None)
                require(actor is not None,f"{name}: clip track has no actor")
                m=t["mode"];require(m in MODES,f"{name}: explicit transition mode required")
                ref=actor["modes"][m][t["action"]]
                if isinstance(ref,dict):ref=ref[motion]
                ids=clip_ref(ref,name)
        natural=clip_length(library[ids[0]]) if ids else 0
        length=time(t["end"])-start if "end" in t else t.get("durationMs",natural)
        number(length,"track duration",.001 if t["type"] in ("clip","tween") else 0)
        records[t["id"]]=(start,start+length,ids,length/natural if natural else 1)
        if "when" in t:require(t["when"]["target"] in targets,"Unknown track condition target")
        if t["type"]=="tween":
            require(bool(t["to"]),"Empty tween")
            validate_keyframes(t.get("keyframes",[]))
    return records

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
        require(not any(c.get("reviewFallback") for c in pack["clips"].values()),"Unapproved animation; release refused")
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
    for clip in pack["clips"].values():
        for f in clip["frames"]:
            if "sourceSize" in f:check_frame(f)
    manifest={k:copy.deepcopy(v) for k,v in pack.items() if k not in ("resources","sounds")}
    manifest["sourceFiles"]=sources
    audio_mime={".wav":"audio/wav",".ogg":"audio/ogg",".mp3":"audio/mpeg"}
    sounds={k:encode(local(v).read_bytes(),audio_mime[local(v).suffix.lower()]) for k,v in pack["sounds"].items()}
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
