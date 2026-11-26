import importlib.util
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('snack_build', ROOT / 'scripts/build.py')
snack_build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snack_build)


class BuildTests(unittest.TestCase):
    def test_offline_single_file(self):
        with TemporaryDirectory() as d:
            output = snack_build.build(Path(d) / 'Snack_Dash.html')
            content = output.read_text(encoding='utf-8')
            self.assertIn('<canvas id="scene"', content)
            self.assertIn('LearningOpportunityDirector', content)
            self.assertEqual(content.count('<script>'), 5)
            self.assertIn('window.GameMath', content)
            self.assertIn('GameI18n', content)
            self.assertIn('GameReactions', content)
            self.assertIn('id="runnerReactionText"', content)
            self.assertIn('id="languageSelect"', content)
            self.assertIn('id="howToPlayDialog"', content)
            self.assertNotIn('id="menuFullscreenBtn"', content)
            self.assertNotIn('id="gameFullscreenBtn"', content)
            self.assertLess(content.index('Snack Dash localization foundation'), content.index('window.GameMath'))
            self.assertNotIn('<!-- BUILD:', content)
            self.assertNotIn('src="https://', content)
            self.assertNotIn('href="https://', content)
            self.assertGreater(len(content), 150000)


if __name__ == '__main__':
    unittest.main()
