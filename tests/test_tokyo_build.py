import base64
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from scene_assets import load_pack, validate, compile_pack, runtime_settings, read_image, embedded_js
from build_city import build

class LandscapePackTests(unittest.TestCase):
    def test_pack_contract_and_replacement_fixture(self):
        a,b=load_pack("tokyo"),load_pack("qa-london")
        self.assertEqual(a["raceCityId"],"tokyo")
        self.assertEqual(b["raceCityId"],"london")
        self.assertTrue(validate(a))
        self.assertTrue(validate(b))
        self.assertNotEqual(a["backgrounds"]["normal"],b["backgrounds"]["normal"])
        self.assertNotEqual(a["scene"]["slots"],b["scene"]["slots"])
        self.assertNotEqual(a["scene"]["hud"],b["scene"]["hud"])
        self.assertNotEqual(a["runners"][0]["frames"][0]["sourceSize"],b["runners"][0]["frames"][0]["sourceSize"])
        self.assertNotEqual(len(a["runners"][0]["frames"]),len(b["runners"][0]["frames"]))
        self.assertNotEqual(a["staff"]["female-normal"]["frames"]["idle"]["anchors"],b["staff"]["female-normal"]["frames"]["idle"]["anchors"])
        self.assertNotEqual(runtime_settings(a)["storage"],runtime_settings(b)["storage"])

    def test_missing_required_asset_and_bad_release_fail_closed(self):
        pack=load_pack("tokyo")
        pack["backgrounds"]["inferno"]="missing"
        with self.assertRaisesRegex(ValueError,"undeclared resource"):
            validate(pack)
        pack=load_pack("tokyo")
        pack["resources"][pack["backgrounds"]["normal"]]["path"]="assets/no-such-image.png"
        with self.assertRaisesRegex(ValueError,"Missing asset"):
            validate(pack)
        with self.assertRaisesRegex(ValueError,"not visually approved"):
            compile_pack(load_pack("tokyo"),release=True)
        with self.assertRaisesRegex(ValueError,"not visually approved"):
            compile_pack(load_pack("qa-london"),release=True)

    def test_no_missing_release_or_frame_metadata(self):
        pack=load_pack("tokyo")
        for frame in pack["staff"]["female-normal"]["frames"].values():
            frame.pop("event",None)
        with self.assertRaisesRegex(ValueError,"release marker"):
            validate(pack)
        pack=load_pack("tokyo")
        del pack["runners"][0]["frames"][0]["anchors"]["bib"]
        with self.assertRaises((ValueError,KeyError)):
            validate(pack)

    def test_cropped_legacy_atlas_is_not_resized(self):
        pack=load_pack("tokyo")
        spec=pack["resources"][pack["supplies"]["apple"]["hand"]]
        image,size,offset,digest=read_image(spec)
        self.assertEqual(image.size,tuple(spec["rect"][2:]))
        self.assertEqual(size,spec["sourceSize"])
        self.assertEqual(offset,spec["trimOffset"])
        self.assertEqual(digest,hashlib.sha256((ROOT/spec["path"]).read_bytes()).hexdigest())

    def test_build_uses_unmodified_common_sources(self):
        # A full raster build is exercised separately in CI. This test
        # independently proves the build does not text-patch game or maths.
        import tempfile
        pack=load_pack("tokyo")
        stub={"manifest":pack,"images":{},"sprites":{},"sounds":{}}
        with tempfile.TemporaryDirectory() as d:
            html=build(Path(d)/"a.html",compiled=stub).read_text()
            for name in ("game.js","math.js","i18n.js"):
                self.assertIn((ROOT/"src/js"/name).read_text(),html)
            self.assertIn("window.SnackDashAssetPack=",html)
            self.assertIn("snackDashTokyoPreviewSaveV1",html)
            self.assertNotIn("<!-- BUILD:",html)
            self.assertIn('id="gameFullscreenBtn"',html)

if __name__=="__main__":unittest.main()
