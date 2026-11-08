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
                hood = '/es/garage-sales/' if path.startswith('es/') else '/garage-sales/'
                self.assertEqual(text.count('<li><a href="' + hood), 13)
                self.assertNotIn('type="module"', text)
                self.assertNotIn('home-fold.js', text)
                self.assertNotIn('chica-copy.js', text)
                self.assertNotIn('<noscript>', text)
                self.assertEqual(text.count('src="/badges/'),0)
                self.assertIn('https://github.com/sponsors/Justonejewelry/card',text)
                self.assertIn('loading="lazy"',text)
                self.assertIn('height="225"',text)
                self.assertIn('home-fonts.css',text)
                self.assertIn('font/woff2',text)
                self.assertLess(text.index('class="lede"'), text.index('id="chica-home-mini-map"'))
                self.assertLess(text.index('id="chica-home-mini-map"'), text.index('class="home-actions"'))
                self.assertLess(text.index('class="home-actions"'), text.index('class="quick-links"'))
                self.assertLess(text.index('class="quick-links"'), text.index('id="chica-hoods"'))
            # The old root-domain text replacement broke a regex in home-hoods.js.
            for filename in ['home-hoods.js', 'home.js', 'home-mini-map.js', 'home-fresh.js', 'home-reels.js']:
                subprocess.run(['node', '--check', str(root / 'js' / filename)], check=True, capture_output=True)
