import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("tokyo_build",ROOT/"scripts/build_tokyo.py")
tokyo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tokyo)

class TokyoBuildTests(unittest.TestCase):
    def test_standalone_and_isolated(self):
        with TemporaryDirectory() as d:
            page = tokyo.build(Path(d)/"tokyo.html").read_text(encoding="utf-8")
            self.assertIn('width="1280" height="720"',page)
            self.assertIn("SnackDashTokyoQA",page)
            self.assertIn("snackDashTokyoPreviewSaveV1",page)
            self.assertIn("snackDashTokyoPreviewLocaleV1",page)
            self.assertIn("snackDashTokyoPreviewPracticeV1",page)
            self.assertNotIn("'snackDashSaveV2'",page)
            self.assertNotIn("'snackDashLocaleV1'",page)
            self.assertNotIn("'snackDashPracticeV1'",page)
            self.assertNotIn("<!-- BUILD:",page)
            self.assertNotIn('src="https://',page)
            self.assertNotIn('href="https://',page)
            self.assertIn("const W=1280,H=720,GOAL=10",page)
            self.assertIn("resolveHit(this.combo",page)
            self.assertIn("this.supplies.queue.length<2",page)
            self.assertIn("window.SnackDashTokyoArt=",page)
            self.assertEqual(page.count("data:image/webp;base64,"),4)
            self.assertIn("5cd2840daaef280f239fd3b404cc146572c030ed",page)
            self.assertIn("runner/body_22/frame_07",page)
            self.assertIn("staff/male/inferno/descend",page)
            self.assertIn("crowd/fever/far/right",page)
            self.assertIn("supply/gel/flight",page)
            self.assertIn("audio/wav;base64,",page)
            self.assertIn("tRunnerBib",page)
            self.assertNotIn("function tBuilding(",page)
            self.assertNotIn("function tSpectator(",page)

    def test_r03_art_pack(self):
        from tokyo_assets import build_pack
        import base64
        pack=build_pack()
        m=pack["manifest"]
        self.assertEqual(m["version"],3)
        self.assertEqual(len(m["runners"]),22)
        self.assertEqual(sum(len(r["frames"]) for r in m["runners"]),176)
        self.assertEqual(sum(len(x["frames"]) for x in m["staff"].values()),50)
        self.assertEqual(len(m["crowd"]),18)
        self.assertEqual(len(m["fx"]),42)
        self.assertEqual(len(pack["sounds"]),5)
        self.assertEqual(len(m["slots"]),2)
        for key,url in pack["images"].items():
            if key.startswith("staff/") or key.endswith("/receive_supply"):
                payload=base64.b64decode(url.split(",",1)[1])
                self.assertNotIn(b'id="held_supply"',payload)
                self.assertNotIn(b'id="received_supply"',payload)
        self.assertEqual(set(m["fallbackSupplies"]),{"apple","orange","bar","juice"})

    def test_exact_anchor_is_fail_closed(self):
        with self.assertRaises(RuntimeError):
            tokyo.exact("not present","anchor","replacement")
        with self.assertRaises(RuntimeError):
            tokyo.exact("aa","a","b")

if __name__=="__main__":
    unittest.main()
