"""Static homepage and publish-time JavaScript syntax regressions."""
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class HomepageTests(unittest.TestCase):
    def test_publish_bilingual_home_and_safe_asset_rewrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            shutil.copytree(ROOT / 'webapp', root, dirs_exist_ok=True)
            subprocess.run(['node', str(ROOT / 'scripts/build_home.mjs'), str(root)], check=True, capture_output=True)
            subprocess.run(['node', str(ROOT / 'scripts/root-domain.mjs'), str(root)], check=True, capture_output=True)
            for path, label, submit, calendar in [('index.html', 'Add my sale', '/submit/', '/calendar/'), ('es/index.html', 'Agregar mi venta', '/es/submit/', '/es/calendar/')]:
                text = (root / path).read_text()
                self.assertIn('data-home-static', text)
                self.assertIn('>' + label + '</a>', text)
                self.assertIn('href="' + submit + '"', text)
                self.assertIn('href="' + calendar + '"', text)
                self.assertEqual(text.count('<li><a href="/garage-sales/'), 13)
                self.assertNotIn('type="module"', text)
                self.assertNotIn('home-fold.js', text)
                self.assertNotIn('chica-copy.js', text)
                self.assertNotIn('<noscript>', text)
            # The old root-domain text replacement broke a regex in home-hoods.js.
            for filename in ['home-hoods.js', 'home.js', 'home-mini-map.js', 'home-fresh.js', 'home-reels.js']:
                subprocess.run(['node', '--check', str(root / 'js' / filename)], check=True, capture_output=True)
