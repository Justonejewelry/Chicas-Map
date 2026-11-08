"""Full publish pipeline: per-sale pages, sitemap, lighter home, nav + alert copy."""
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(*args):
    subprocess.run(list(args), check=True, capture_output=True, cwd=ROOT, env=dict(os.environ, SITE_ORIGIN='https://www.chicasmap.com'))


@unittest.skipUnless(shutil.which('node'), 'node required')
class SiteBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = Path(cls.tmp.name)
        shutil.copytree(ROOT / 'webapp', cls.root, dirs_exist_ok=True)
        r = str(cls.root)
        run('python3', 'scripts/clean_sales.py', r)
        run('node', 'scripts/build_home.mjs', r)
        run('python3', 'scripts/build_calendar.py', r)
        run('node', 'scripts/stamp-pages.mjs', r)
        run('node', 'scripts/build_seo_pages.mjs', r)
        run('node', 'scripts/root-domain.mjs', r)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_home_has_no_inline_fonts_and_small_logo(self):
        for path in ['index.html', 'es/index.html']:
            html = (self.root / path).read_text()
            self.assertNotIn('data:font/', html)
            self.assertLess(len(html.encode()), 40000)
            self.assertIn('/images/chica-logo-72.png', html)
            self.assertIn('rel="preload" as="font"', html)
        css = (self.root / 'css/home-fonts.css').read_text()
        self.assertNotIn('base64', css)
        for f in ['assets/fonts/inter/inter-var.woff2', 'assets/fonts/syne/syne-var.woff2']:
            self.assertEqual((self.root / f).read_bytes()[:4], b'wOF2')
        self.assertLess((self.root / 'images/chica-logo.png').stat().st_size, 120000)

    def test_shopper_first_nav_bilingual(self):
        en = (self.root / 'index.html').read_text()
        es = (self.root / 'es/index.html').read_text()
        self.assertIn('>Find sales</a>', en)
        self.assertIn('>List a sale</a>', en)
        self.assertIn('>Ver ventas</a>', es)
        self.assertIn('>Publicar</a>', es)
        self.assertIn('>Destacar mi venta</a>', es)
        self.assertNotIn('>Boost My Sale</a>', es)
        self.assertIn('Centro Norte y Shavano Park', es)
        self.assertIn('id="home-alert-help"', en)

    def test_sale_pages_from_feed(self):
        feed = json.loads((self.root / 'data/sales-clean.json').read_text())
        sales = [s for s in feed['public'] if s.get('external_id')]
        self.assertTrue(sales)
        sitemap = (self.root / 'sitemap.xml').read_text()
        s = sales[-1]
        slug = re.sub(r'[^a-z0-9]+', '-', s['external_id'].lower()).strip('-')[:80]
        for lang in ['', 'es/']:
            html = (self.root / (lang + 'sales/' + slug + '/index.html')).read_text()
            self.assertIn('<title>', html)
            self.assertIn('property="og:title"', html)
            self.assertIn('"@type":"Event"', html)
            self.assertIn('https://www.google.com/maps/dir/?api=1&amp;destination=', html)
            self.assertIn('rel="canonical" href="https://www.chicasmap.com/' + lang + 'sales/' + slug + '/"', html)
            self.assertIn('data-goatcounter', html)
            self.assertIn(('los horarios pueden cambiar' if lang else 'hours can change'), html)
            if s.get('hours'):
                self.assertIn(s['hours'].replace('&', '&amp;'), html)
        self.assertIn('<loc>https://www.chicasmap.com/sales/' + slug + '/</loc>', sitemap)
        self.assertIn('<loc>https://www.chicasmap.com/es/sales/' + slug + '/</loc>', sitemap)

    def test_home_scripts_link_sale_pages(self):
        for f in ['js/home-fresh.js', 'js/home-search.js']:
            js = (self.root / f).read_text()
            self.assertIn('/sales/', js)
        fresh = (self.root / 'js/home-fresh.js').read_text()
        self.assertIn('aria-pressed', fresh)
        self.assertIn('hours can change', fresh)


if __name__ == '__main__':
    unittest.main()
