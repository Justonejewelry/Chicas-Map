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

    def test_event_ld_valid(self):
        r = subprocess.run(['node', 'scripts/validate_event_ld.mjs', str(self.root)], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('0 with errors', r.stdout)

    def test_event_ld_helpers(self):
        js = (
            "import('./scripts/sale_pages.mjs').then(m=>{"
            "const o=x=>console.log(JSON.stringify(x));"
            "o(m.ctOffset('2026-11-14'));o(m.ctOffset('2026-07-04'));o(m.ctOffset('2026-11-01'));o(m.ctOffset('2026-10-31'));"
            "o(m.parseHours('9 AM – 5 PM'));o(m.parseHours('starting at 8am'));o(m.parseHours('Sat 8 am–3 pm; Sun 8 am–2 pm'));"
            "const s={title:'X',date_start:'2026-11-14',date_end:'2026-11-15',hours:'9:00 am - 5:00 pm',address:'1 A ST, SAN ANTONIO, TX, 78209',lat:29.4,lon:-98.4};"
            "o(m.richEventLd(s,{origin:'https://o',path:'/sales/x/',isEnded:false}));o(m.richEventLd(s,{origin:'https://o',path:'/sales/x/',isEnded:true}));})"
        )
        out = subprocess.run(['node', '--input-type=module', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
        v = [json.loads(x) for x in out if x]
        self.assertEqual(v[:4], ['-06:00', '-05:00', '-06:00', '-05:00'])
        self.assertEqual(v[4], {'start': '09:00:00', 'end': '17:00:00'})
        self.assertEqual(v[5], {'start': '08:00:00', 'end': None})
        self.assertIsNone(v[6])
        ev = v[7]
        self.assertEqual(ev['startDate'], '2026-11-14T09:00:00-06:00')
        self.assertEqual(ev['endDate'], '2026-11-15T17:00:00-06:00')
        self.assertEqual(ev['location']['address']['postalCode'], '78209')
        self.assertEqual(ev['location']['geo']['latitude'], 29.4)
        self.assertIsNone(v[8])

    def test_map_quick_filters(self):
        js = (
            "const D=require('./webapp/js/chica-dates.js');const o=x=>console.log(JSON.stringify(x));"
            "o(D.weekendRange('2026-11-09'));o(D.weekendRange('2026-11-13'));o(D.weekendRange('2026-11-14'));o(D.weekendRange('2026-11-15'));"
            "o(D.range('today','2026-11-08'));o(D.ctToday(new Date('2026-11-09T03:30:00Z')));"
            "o(D.overlaps({date_start:'2026-11-12',date_end:'2026-11-14'},'2026-11-13','2026-11-15'));o(D.overlaps({date_start:'2026-11-08'},'2026-11-13','2026-11-15'));"
        )
        out = subprocess.run(['node', '-e', js], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
        v = [json.loads(x) for x in out if x]
        self.assertEqual(v[0], ['2026-11-13', '2026-11-15'])
        self.assertEqual(v[1], ['2026-11-13', '2026-11-15'])
        self.assertEqual(v[2], ['2026-11-13', '2026-11-15'])
        self.assertEqual(v[3], ['2026-11-13', '2026-11-15'])
        self.assertEqual(v[4], ['2026-11-08', '2026-11-08'])
        self.assertEqual(v[5], '2026-11-08')  # 9:30 PM CT is still Nov 8 in Chicago
        self.assertEqual(v[6:8], [True, False])
        hunt = (self.root / 'js/hunt-bar.js').read_text()
        for needle in ['aria-pressed', 'data-clear', 'Quitar filtros', 'ChicaDates', 'when']:
            self.assertIn(needle, hunt)
        mp = (self.root / 'map/index.html').read_text()
        self.assertLess(mp.index('chica-dates.js'), mp.index('hunt-bar.js'))
        en = (self.root / 'index.html').read_text(); es = (self.root / 'es/index.html').read_text()
        self.assertIn('/map/?when=today', en); self.assertIn('/map/?when=weekend', en)
        self.assertIn('>Hoy en el mapa</a>', es); self.assertIn('>Este fin de semana</a>', es)

    def test_spanish_neighborhood_pages(self):
        en = (self.root / 'garage-sales/south-side/index.html').read_text()
        es = (self.root / 'es/garage-sales/south-side/index.html').read_text()
        self.assertIn('<html lang="es"', es)
        self.assertIn('Ventas de garaje en el Lado Sur', es)
        self.assertIn('og:locale" content="es_US"', es)
        for page in (en, es):
            self.assertIn('hreflang="en" href="https://www.chicasmap.com/garage-sales/south-side/"', page)
            self.assertIn('hreflang="es" href="https://www.chicasmap.com/es/garage-sales/south-side/"', page)
        self.assertIn('href="/es/sales/', es)
        self.assertTrue((self.root / 'es/garage-sales/index.html').exists())
        sm = (self.root / 'sitemap.xml').read_text()
        self.assertIn('<loc>https://www.chicasmap.com/es/garage-sales/</loc>', sm)
        home_es = (self.root / 'es/index.html').read_text()
        self.assertIn('href="/es/garage-sales/stone-oak/"', home_es)

    def test_home_search_is_static(self):
        for path, ph in [('index.html', 'e.g. furniture'), ('es/index.html', 'Ej. muebles')]:
            html = (self.root / path).read_text()
            self.assertLess(html.index('id="home-search"'), html.index('id="chica-home-mini-map"'))
            self.assertIn(ph, html)
            self.assertIn('id="hs-em"', html)
        self.assertIn('Busca artículos en las ventas', (self.root / 'es/index.html').read_text())

    def test_leaflet_self_hosted(self):
        v = self.root / 'vendor/leaflet-1.9.4'
        for f in ['leaflet.js', 'leaflet.css', 'LICENSE', 'images/layers.png', 'images/marker-icon.png', 'images/marker-shadow.png']:
            self.assertTrue((v / f).exists(), f)
        self.assertIn('Leaflet 1.9.4', (v / 'leaflet.js').read_text()[:400])
        for f in ['map/index.html', 'map.html', 'resources/index.html', 'adventure/index.html', 'js/home-mini-map.js', 'js/leaflet-boot.js']:
            t = (self.root / f).read_text()
            self.assertNotIn('cdn.jsdelivr.net/npm/leaflet', t, f)
        self.assertIn('/vendor/leaflet-1.9.4/leaflet.js', (self.root / 'map/index.html').read_text())
        self.assertIn('IntersectionObserver', (self.root / 'js/home-mini-map.js').read_text())


if __name__ == '__main__':
    unittest.main()
