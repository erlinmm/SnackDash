import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from scene_assets import load_pack, validate, compile_pack, runtime_settings, read_image
from build_city import build

def street(p):
    return next(n for n in p["world"]["nodes"] if n.get("role")=="street")

def runner_clip(p,mode,action):
    return p["clips"][p["actors"]["runners"][0]["modes"][mode][action]]

class LandscapePackTests(unittest.TestCase):
    def test_pack_contract_and_independent_parts(self):
        a,b=load_pack("tokyo"),load_pack("qa-london")
        self.assertEqual(a["schemaVersion"],2)
        self.assertEqual(a["raceCityId"],"tokyo");self.assertEqual(b["raceCityId"],"london")
        self.assertTrue(validate(a));self.assertTrue(validate(b))
        self.assertNotEqual(street(a)["images"]["normal"],street(b)["images"]["normal"])
        self.assertNotEqual(a["scene"]["slots"],b["scene"]["slots"])
        self.assertNotEqual(a["hud"],b["hud"])
        self.assertNotEqual(runner_clip(a,"normal","run")["frames"][0]["sourceSize"],runner_clip(b,"normal","run")["frames"][0]["sourceSize"])
        self.assertNotEqual(len(runner_clip(a,"normal","run")["frames"]),len(runner_clip(b,"normal","run")["frames"]))
        self.assertNotEqual(a["actors"]["staff"]["female"]["modes"]["normal"]["throw"],b["actors"]["staff"]["female"]["modes"]["normal"]["throw"])
        self.assertNotEqual(runtime_settings(a)["storage"],runtime_settings(b)["storage"])

    def test_missing_required_asset_and_release_fail_closed(self):
        p=load_pack("tokyo");street(p)["images"]["inferno"]="missing"
        with self.assertRaisesRegex(ValueError,"undeclared resource"):validate(p)
        p=load_pack("tokyo");p["resources"][street(p)["images"]["normal"]]["path"]="assets/no-such-image.png"
        with self.assertRaisesRegex(ValueError,"Missing asset"):validate(p)
        for city in ("tokyo","qa-london"):
            with self.assertRaisesRegex(ValueError,"not visually approved"):compile_pack(load_pack(city),release=True)
        p=load_pack("tokyo");p["reviewStatus"]="approved"
        with self.assertRaisesRegex(ValueError,"Unapproved fallback artwork"):compile_pack(p,release=True)

    def test_missing_action_release_and_anchor(self):
        p=load_pack("tokyo")
        clip=p["clips"][p["actors"]["staff"]["female"]["modes"]["normal"]["throw"]]
        for frame in clip["frames"]:frame.pop("marks",None)
        with self.assertRaisesRegex(ValueError,"release marker"):validate(p)
        p=load_pack("tokyo");del runner_clip(p,"normal","run")["frames"][0]["anchors"]["bib"]
        with self.assertRaises((ValueError,KeyError)):validate(p)
        p=load_pack("tokyo");del p["actors"]["runners"][0]["modes"]["inferno"]["run"]
        with self.assertRaisesRegex(ValueError,"missing required action"):validate(p)

    def test_missing_transition_marker_and_hud_binding(self):
        p=load_pack("tokyo")
        clip=p["clips"][p["actors"]["staff"]["female"]["modes"]["inferno"]["climb"]]
        for frame in clip["frames"]:frame.pop("marks",None)
        with self.assertRaisesRegex(ValueError,"table.contact"):validate(p)
        p=load_pack("tokyo");p["hud"]["widgets"][0]["binding"]="invalid.state"
        with self.assertRaisesRegex(ValueError,"Unknown HUD binding"):validate(p)
        p=load_pack("tokyo");p["hud"]["widgets"][0]["command"]="invalid.command"
        with self.assertRaisesRegex(ValueError,"Unknown HUD command"):validate(p)

    def test_trimmed_legacy_atlas(self):
        p=load_pack("tokyo");spec=p["resources"][p["supplies"]["apple"]["hand"]]
        image,size,offset,digest=read_image(spec)
        self.assertEqual(image.size,tuple(spec["rect"][2:]))
        self.assertEqual(size,spec["sourceSize"]);self.assertEqual(offset,spec["trimOffset"])
        self.assertEqual(digest,hashlib.sha256((ROOT/spec["path"]).read_bytes()).hexdigest())

    def test_build_uses_unmodified_sources_and_no_fixed_hud_markup(self):
        p=load_pack("tokyo");stub={"manifest":p,"images":{},"sprites":{},"sounds":{}}
        with tempfile.TemporaryDirectory() as d:
            html=build(Path(d)/"a.html",compiled=stub).read_text()
            for name in ("game.js","math.js","i18n.js"):
                self.assertIn((ROOT/"src/js"/name).read_text(),html)
            self.assertIn("window.SnackDashAssetPack=",html)
            self.assertIn("snackDashTokyoPreviewSaveV1",html)
            self.assertNotIn("<!-- BUILD:",html)
            self.assertIn('id="landscapeHud"',html)
            self.assertNotIn('id="gameFullscreenBtn"',html)
            self.assertNotIn('class="scoreboard"',html)

if __name__=="__main__":unittest.main()
