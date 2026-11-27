"""Build a self-contained r03 art manifest from versioned independent sources.

No third-party build dependencies. SVG sources are decoded offline by the browser.
Only runtime files are embedded; reference boards and editable parts are archived
in Git but never drawn as the game scene. Original SVG files are kept unchanged.
"""
from pathlib import Path
from copy import deepcopy
import base64
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/source"
APPROVED = SOURCE / "approved-rebuild-r03"
SOURCE_COMMIT = "5cd2840daaef280f239fd3b404cc146572c030ed"
MODES = ("normal", "fever", "inferno")
ET.register_namespace("", "http://www.w3.org/2000/svg")

def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))

def data_uri(data, mime):
    return f"data:{mime};base64," + base64.b64encode(data).decode("ascii")

def strip_groups(path, ids):
    node = ET.fromstring(path.read_bytes())
    for parent in list(node.iter()):
        for child in list(parent):
            if child.get("id") in ids:
                parent.remove(child)
    return ET.tostring(node, encoding="utf-8")

def build_pack():
    images, sounds = {}, {}
    manifest = {"version": 3, "sourceCommit": SOURCE_COMMIT,
                "backgrounds": {}, "ambient": {}, "staff": {}, "runners": [],
                "crowd": {}, "supplies": {}, "station": {}, "ui": {}, "fx": {}}

    def embed(key, path, strip=()):
        mime = {".svg":"image/svg+xml", ".webp":"image/webp", ".png":"image/png"}[path.suffix]
        data = strip_groups(path, strip) if strip else path.read_bytes()
        images[key] = data_uri(data, mime)
        return key

    def svg(key, path, strip=()):
        return embed(key, path, strip)

    camera = load_json(APPROVED/"camera/approved_camera_coordinates.json")
    layout = load_json(SOURCE/"ui/tokyo_v2/layout_r03.json")
    manifest["camera"] = camera["road"]
    manifest["slots"] = layout["reserve"]["rects"]
    manifest["table"] = {"left":0,"right":290,"top":501,"contact":533,"front":564,"bottom":720}

    for mode in MODES:
        street = APPROVED/"street/tokyo"
        manifest["backgrounds"][mode] = embed(f"bg/{mode}", street/f"{mode}_empty_environment_plate.webp")
        manifest["station"][mode] = embed(f"station/{mode}", APPROVED/f"station/tokyo/assembled_station_{mode}.png")
        for motion in ("normal","reduced"):
            manifest["ambient"][f"{mode}/{motion}"] = svg(f"ambient/{mode}/{motion}", SOURCE/f"fx/tokyo/{mode}/city_ambient_{motion}.svg")
        for depth in ("near","mid","far"):
            for side in ("left","right"):
                key = f"crowd/{mode}/{depth}/{side}"
                # The illustrated empty plate already includes rails. The source
                # spectator group has its own straight review rail; remove only
                # that group to avoid duplicate rails crossing the curved street.
                manifest["crowd"][f"{mode}/{depth}/{side}"] = svg(key, SOURCE/f"crowd/tokyo/{mode}/{depth}/crowd_{side}.svg", ("barrier_foreground",))
        # The existing functional HUD keeps its actions and layout; the new
        # blank assets provide its skins, not baked-in numbers or words.
        for name in ("race_panel_empty","time_panel_empty","score_panel_empty",
                     "festival_banner_2line_empty","pause_button_empty","progress_panel_empty"):
            key = f"hud/{mode}/{name}"
            manifest["ui"][f"{mode}/{name}"] = svg(key,SOURCE/f"ui/tokyo_v2/{mode}/{name}.svg")
        for event in ("swap","throw","receive","score","mode_enter","mode_exit","miss"):
            for motion in ("normal","reduced"):
                folder = SOURCE/f"fx/tokyo/{mode}/{event}/{motion}"
                spec = load_json(folder/"timeline.json")
                frames = []
                for f in spec["frames"]:
                    key = f"fx/{mode}/{event}/{motion}/{f['id']}"
                    svg(key,folder/f["src"])
                    frames.append({"image":key,"durationMs":f["durationMs"]})
                manifest["fx"][f"{mode}/{event}/{motion}"] = {"frames":frames,"canvas":spec["canvas"]}

    manifest["ui"]["slot"] = embed("slot", APPROVED/"ui/backup_slot_empty.png")
    manifest["ui"]["bubble"] = embed("bubble", APPROVED/"ui/speech_number_empty.png")
    for sex in ("female","male"):
        manifest["ui"][f"avatar/{sex}"] = svg(f"avatar/{sex}", SOURCE/f"volunteer/tokyo/{sex}/avatar.svg")
        for mode in MODES:
            folder = SOURCE/f"volunteer/tokyo/{sex}/{mode}/actions"
            spec = load_json(folder/"animation.json")
            frames = {}
            for f in spec["frames"]:
                path = folder/f["path"]
                source = path.read_text(encoding="utf-8")
                # Review pose contains a sample water bottle. Remove it in
                # runtime derivation, retaining the finger and grip artwork.
                key = f"staff/{sex}/{mode}/{f['id']}"
                svg(key,path,("held_supply",))
                trans = re.search(r'<g id="volunteer_[^"]+" transform="translate\(([-.\d]+) ([-.\d]+)\)"',source)
                dx,dy = (float(trans[1]),float(trans[2])) if trans else (0,0)
                item = re.search(r'<g id="held_supply" transform="translate\(([-.\d]+) ([-.\d]+)\)',source)
                hand = f["anchors"]["hand_supply"]
                center = [float(item[1]),float(item[2])] if item else [hand[0]+7,hand[1]-18]
                frames[f["id"]] = {"image":key,"durationMs":f["durationMs"],
                    "pivot":[f["pivot"][0]+dx,f["pivot"][1]+dy],
                    "hand":[center[0]+dx,center[1]+dy],
                    "head":[f["anchors"]["head"][0]+dx,f["anchors"]["head"][1]+dy]}
            manifest["staff"][f"{sex}-{mode}"] = {"frames":frames,"size":spec["sourceSize"]}

    for runner in load_json(SOURCE/"runner/casting-index-r03.json")["runners"]:
        aid = runner["assetId"]
        folder = SOURCE/"runner"/aid
        spec = load_json(folder/"run_front/frames/animation.json")
        frames = []
        def transformed_bib(frame):
            x,y,w,h = frame["bibRect"]
            sx,sy = frame["scale"]
            # Source group is anchored at (129,302), with body scale applied
            # about that pivot; keep dynamic text aligned to the transformed bib.
            return [129+(x+w/2-129)*sx,302+(y+h/2-302)*sy,w*sx,h*sy]
        for frame in spec["frames"]:
            key = f"runner/{aid}/{frame['id']}"
            svg(key,folder/"run_front/frames"/frame["source"])
            frames.append({"image":key,"durationMs":frame["durationMs"],
                           "bib":transformed_bib(frame)})
        states = {}
        for action in ("receive_supply","thanks","pain","surprise","disappointment","cheer","selected"):
            key = f"runner/{aid}/{action}"
            svg(key,folder/f"{action}.svg",("received_supply",))
            states[action] = key
        sx,sy=spec["frames"][0]["scale"]
        manifest["runners"].append({"id":aid,"gender":runner["gender"],
            "frames":frames,"states":states,"size":spec["sourceSize"],
            "loopMs":spec["loopMs"],"bib":transformed_bib(spec["frames"][0]),
            "catchHand":[129+(226-129)*sx,302+(85-302)*sy]})

    for name in ("water","banana","gel"):
        manifest["supplies"][name] = {}
        for placement in ("hand","slot","flight"):
            manifest["supplies"][name][placement] = embed(f"supply/{name}/{placement}",APPROVED/f"supply/{name}/{placement}.png")

    # Canonical item data includes apple/orange/bar/juice; the new pack has
    # no corresponding source exports. Keep the existing illustrated atlas
    # for these four distinct types rather than substituting gel for bar.
    old = ROOT/"assets/exports/tokyo"
    old_manifest = load_json(old/"manifest.json")
    manifest["fallbackSupplies"] = {name:old_manifest["supplies"][name] for name in ("apple","orange","bar","juice")}
    embed("fallback-supplies",old/"supplies.webp")
    for name in ("supply_swap","supply_catch","fever_enter","inferno_enter","miss_soft"):
        p=SOURCE/f"audio/cues/{name}_review_r03.wav"
        sounds[name]=data_uri(p.read_bytes(),"audio/wav")
    return {"manifest":manifest,"images":images,"sounds":sounds}

def embedded_js():
    return "window.SnackDashTokyoArt="+json.dumps(build_pack(),ensure_ascii=False,separators=(",",":"))+";\n"
