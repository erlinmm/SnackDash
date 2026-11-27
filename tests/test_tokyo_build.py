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
            self.assertEqual(page.count("data:image/webp;base64,"),7)
            self.assertIn("tRunnerBib",page)
            self.assertNotIn("function tBuilding(",page)
            self.assertNotIn("function tSpectator(",page)

    def test_exact_anchor_is_fail_closed(self):
        with self.assertRaises(RuntimeError):
            tokyo.exact("not present","anchor","replacement")
        with self.assertRaises(RuntimeError):
            tokyo.exact("aa","a","b")

if __name__=="__main__":
    unittest.main()
