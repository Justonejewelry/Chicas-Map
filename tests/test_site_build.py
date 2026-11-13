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
        self.assertIn('id="home-weekly"', en)
        self.assertIn('Chica\'s weekly garage sale roundup', en)
        self.assertIn('El resumen semanal de ventas de garage de Chica', es)
        self.assertNotIn('id="home-alert-help"', en)

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
            self.assertNotIn('class="hs-alert"', html)
            self.assertIn('id="home-weekly"', html)
            self.assertIn('id="wr-em"', html)
            self.assertLess(html.index('id="home-weekly"'), html.index('id="home-support"'))
        self.assertIn('Busca artículos en las ventas', (self.root / 'es/index.html').read_text())
        js = (self.root / 'js/home-search.js').read_text()
        self.assertIn('evt-alert-after-search', js)
        self.assertIn('evt-subscribe-weekly', js)
        self.assertIn('Want Chica to email you when', js)
        self.assertIn('weekly-roundup', js)

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

    def test_review_short_link_is_private_redirect(self):
        review_url = 'https://search.google.com/local/writereview?placeid=ChIJCXJXKn6684sRbFSuZ7Pcw_Q'
        en = (self.root / 'review/index.html').read_text()
        es = (self.root / 'es/review/index.html').read_text()
        sm = (self.root / 'sitemap.xml').read_text()
        self.assertNotIn('chicasmap.com/review/', sm)
        self.assertNotIn('/review/', sm)
        for html, btn in ((en, 'Leave Chica a Google review'), (es, 'Deja a Chica una reseña en Google')):
            self.assertIn('noindex', html)
            self.assertIn(review_url, html)
            self.assertIn('location.replace', html)
            self.assertIn('http-equiv="refresh"', html)
            self.assertIn(btn, html)
            # stamp-pages must not overwrite this utility page with homepage SEO.
            self.assertNotIn('San Antonio garage sales', html)

    def test_goatcounter_current_property_once_on_public_pages(self):
        """Home, Spanish home, and other public pages get one chicasmapcom snippet, never the legacy code."""
        current = 'data-goatcounter="https://chicasmapcom.goatcounter.com/count"'
        script = 'gc.zgo.at/count.js'
        legacy = 'https://chicasmap.goatcounter.com/'
        must_have = [
            'index.html', 'es/index.html', 'advertise/index.html', 'calendar/index.html',
            'claim/index.html', 'boost/index.html', 'deals/index.html', 'map/index.html',
            'list/index.html', 'stats/index.html', 'es/stats/index.html', 'press/index.html', 'es/press/index.html', 'submit/index.html', 'privacy/index.html', 'garage-sales/index.html',
            'garage-sales/south-side/index.html', 'es/garage-sales/index.html', 'es/advertise/index.html',
        ]
        for rel in must_have:
            html = (self.root / rel).read_text()
            self.assertEqual(html.count(script), 1, rel + ' should have exactly one GoatCounter script')
            self.assertEqual(html.count(current), 1, rel + ' should use the current chicasmapcom property')
            self.assertNotIn(legacy, html, rel + ' must not send hits to the legacy property')
        # A sale page, if the feed produced any.
        sales = list((self.root / 'sales').glob('*/index.html')) if (self.root / 'sales').exists() else []
        self.assertTrue(sales, 'expected at least one sale page')
        for page in sales[:3] + (list((self.root / 'es' / 'sales').glob('*/index.html'))[:1] if (self.root / 'es' / 'sales').exists() else []):
            html = page.read_text()
            self.assertEqual(html.count(script), 1, str(page))
            self.assertIn(current, html)
            self.assertNotIn(legacy, html)
        skip = {'mission-control', 'review', 'admin', '__grok'}
        for html_path in self.root.rglob('*.html'):
            rel = html_path.relative_to(self.root).as_posix()
            if rel.split('/')[0] in skip:
                continue
            html = html_path.read_text()
            self.assertNotIn(legacy, html, rel)
            self.assertLessEqual(html.count(script), 1, rel + ' must not double the GoatCounter script')

    def test_seo_indexable_pages_and_sitemap(self):
        en = (self.root / 'index.html').read_text()
        es = (self.root / 'es/index.html').read_text()
        self.assertIn('<title>San Antonio Garage Sales Map | Chicas Map</title>', en)
        self.assertIn('>San Antonio Garage Sales</h1>', en)
        self.assertIn('id="home-seo"', en)
        self.assertIn('garage sales near you in San Antonio', en)
        self.assertIn('LocalBusiness', en)
        self.assertIn('<title>Mapa de ventas de garaje en San Antonio | Chicas Map</title>', es)
        self.assertIn('>Ventas de garaje en San Antonio</h1>', es)
        self.assertIn('id="home-seo"', es)
        self.assertLess(en.index('id="home-seo"'), en.index('id="home-weekly"'))

        stone = (self.root / 'garage-sales/stone-oak/index.html').read_text()
        self.assertIn('<title>Stone Oak Garage Sales, San Antonio | Chicas Map</title>', stone)
        self.assertIn('78258', stone)
        self.assertIn('Stone Oak Parkway', stone)
        self.assertIn('index,follow', stone)
        self.assertNotIn('noindex', stone)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/garage-sales/stone-oak/"', stone)
        south_es = (self.root / 'es/garage-sales/south-side/index.html').read_text()
        self.assertIn('Ventas de garaje en el Lado Sur, San Antonio', south_es)
        self.assertIn('78221', south_es)

        feed = json.loads((self.root / 'data/sales-clean.json').read_text())
        active = [s for s in feed['public'] if s.get('external_id')]
        lst = (self.root / 'list/index.html').read_text()
        lst_es = (self.root / 'es/list/index.html').read_text()
        self.assertNotIn('Loading the live feed', lst)
        self.assertNotIn('Loading the live feed', lst_es)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/list/"', lst)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/es/list/"', lst_es)
        self.assertIn('<html lang="es"', lst_es)
        self.assertIn('/sales/', lst)
        if active:
            title = active[-1].get('title') or ''
            if title:
                self.assertIn(title.replace('&', '&amp;'), lst)

        fb = (self.root / 'facebook/index.html').read_text()
        fb_es = (self.root / 'es/facebook/index.html').read_text()
        self.assertIn('https://www.facebook.com/61593215043603/', fb)
        self.assertIn('https://www.facebook.com/61593215043603/', fb_es)
        self.assertIn('ventas de garaje', fb_es)
        self.assertNotIn('history.replaceState', fb)
        self.assertNotIn('history.replaceState', fb_es)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/es/facebook/"', fb_es)
        self.assertIn('hreflang="es" href="https://www.chicasmap.com/es/facebook/"', fb)
        self.assertNotIn('href="https://www.chicasmap.com/es"', fb_es)

        flip = (self.root / 'flip/index.html').read_text()
        self.assertIn('noindex', flip)
        self.assertIn('/deals/', flip)

        robots = (self.root / 'robots.txt').read_text()
        self.assertIn('Sitemap: https://www.chicasmap.com/sitemap.xml', robots)
        self.assertNotIn('justonejewelry.github.io', robots)

        sm = (self.root / 'sitemap.xml').read_text()
        self.assertNotIn('justonejewelry.github.io', sm)
        self.assertNotIn('/sitemap.xml</loc>', sm)
        self.assertNotIn('/flip/', sm)
        self.assertNotIn('mission-control', sm)
        self.assertNotIn('/review/', sm)
        self.assertNotIn('atlas/hoa', sm)
        locs = re.findall(r'<loc>([^<]+)</loc>', sm)
        self.assertGreater(len(locs), 40)
        for loc in locs:
            self.assertTrue(loc.startswith('https://www.chicasmap.com/'), loc)
            self.assertTrue(loc.endswith('/'), loc)
            self.assertNotEqual(loc, 'https://www.chicasmap.com/es')
            path = loc[len('https://www.chicasmap.com'):]
            html_path = self.root / path.lstrip('/') / 'index.html'
            self.assertTrue(html_path.is_file(), loc)
            html = html_path.read_text()
            self.assertNotRegex(html, r'name="robots"[^>]*content="noindex', loc + ' is in the sitemap but noindex')
            # React /submit/ is left unstamped so hydration does not throw #418.
            if path in ('/submit/', '/es/submit/'):
                continue
            self.assertIn('rel="canonical" href="' + loc + '"', html)
        # All neighborhood pages, including those with no sales this week, stay indexable.
        for slug in ['stone-oak', 'alamo-ranch-westover-hills', 'helotes', 'west-side', 'southwest-lackland']:
            self.assertIn('<loc>https://www.chicasmap.com/garage-sales/' + slug + '/</loc>', sm)
            self.assertIn('<loc>https://www.chicasmap.com/es/garage-sales/' + slug + '/</loc>', sm)


    def test_public_stats_viewer(self):
        en = (self.root / 'index.html').read_text()
        es = (self.root / 'es/index.html').read_text()
        self.assertIn('href="/stats/"', en)
        self.assertIn('>Map stats</a>', en)
        self.assertIn('href="/es/stats/"', es)
        self.assertIn('>Números del mapa</a>', es)
        self.assertNotIn('>Map stats</a>', es)

        page = (self.root / 'stats/index.html').read_text()
        page_es = (self.root / 'es/stats/index.html').read_text()
        self.assertIn('<title>San Antonio garage sale map stats | Chicas Map</title>', page)
        self.assertIn('<title>Números del mapa de ventas de garaje en San Antonio | Chicas Map</title>', page_es)
        self.assertIn('role="tooltip"', page)
        self.assertIn('sales-clean.json', page + (self.root / 'js/stats-viewer.js').read_text())
        self.assertIn('coming soon', page.lower())
        self.assertIn('css/home.css', page)
        self.assertIn('class="site-header"', page)
        self.assertNotIn('mission-control', page)
        self.assertNotIn('MISSION_CONTROL', page)
        self.assertNotIn('PASSWORD', page)
        self.assertNotIn('href="/admin', page)
        for word in ('Star Trek', 'Batman', 'Matrix', 'iPhone'):
            self.assertNotIn(word, page)

        sm = (self.root / 'sitemap.xml').read_text()
        self.assertIn('<loc>https://www.chicasmap.com/stats/</loc>', sm)
        self.assertIn('<loc>https://www.chicasmap.com/es/stats/</loc>', sm)
        self.assertNotIn('mission-control', sm)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/stats/"', page)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/es/stats/"', page_es)
        self.assertNotRegex(page, r'name="robots"[^>]*content="noindex')
        self.assertNotRegex(page_es, r'name="robots"[^>]*content="noindex')
        self.assertIn('data-goatcounter="https://chicasmapcom.goatcounter.com/count"', page)
        self.assertIn('data-goatcounter="https://chicasmapcom.goatcounter.com/count"', page_es)

        js = (self.root / 'js/stats-viewer.js').read_text()
        self.assertIn('id="countdown-panel"', page)
        self.assertIn('id="heatmap-panel"', page)
        self.assertIn('data-tip-copy="countdown"', page)
        self.assertIn('data-tip-copy="heatmap"', page)
        self.assertIn('Weekend starts in', js)
        self.assertIn('El fin de semana empieza en', js)
        self.assertIn('Open right now', page)
        self.assertIn('Still ahead this weekend', page)
        self.assertIn('This weekend by area', page)
        self.assertIn('vendor/leaflet-1.9.4/leaflet.js', js)
        self.assertNotIn('mission-control', js)
        self.assertIn('countdownTitle', js)
        self.assertIn('heatmapTitle', js)

        # Hours parsing + weekday headline stay honest in Central Time.
        script = (
            "const S=require('./webapp/js/stats-viewer.js');"
            "const o=x=>console.log(JSON.stringify(x));"
            "o(S.parseHoursForDay('Fri 9am-5pm, Sat 8am-5pm','2026-11-13'));"
            "o(S.parseHoursForDay('Fri 9am-5pm, Sat 8am-5pm','2026-11-15'));"
            "o(S.parseHoursForDay('starting at 8am','2026-11-14'));"
            "o(S.parseHoursForDay('Mon 3-7:30pm, Tue-Thu 3-7pm','2026-11-11'));"
            "const wed=new Date('2026-11-11T19:15:00Z');"
            "o(S.ctToday(wed));o(S.weekendRange('2026-11-11'));o(S.ctOffset('2026-11-11'));"
            "const sales=[{title:'A',date_start:'2026-11-13',date_end:'2026-11-14',hours:'Fri 9am-5pm, Sat 8am-5pm'},"
            "{title:'B',date_start:'2026-11-14',date_end:'2026-11-14',hours:''}];"
            "const st=S.classifyWeekend(sales,wed);o(S.weekendHeadline(st));o(st.open.length);o(st.ahead.length);"
            "o(st.nextTimed&&st.nextTimed.minutes);o(st.nextTimed&&st.nextTimed.iso);"
        )
        out = subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
        v = [json.loads(x) for x in out if x]
        self.assertEqual(v[0], {'start': 9 * 60, 'end': 17 * 60})
        self.assertIsNone(v[1])
        self.assertEqual(v[2], {'start': 8 * 60, 'end': 24 * 60 - 1})
        self.assertEqual(v[3], {'start': 15 * 60, 'end': 19 * 60})
        self.assertEqual(v[4], '2026-11-11')
        self.assertEqual(v[5], ['2026-11-13', '2026-11-15'])
        self.assertEqual(v[6], '-06:00')
        self.assertEqual(v[7], 'Weekend starts in 2 days')
        self.assertEqual(v[8], 0)
        self.assertEqual(v[9], 2)
        self.assertEqual(v[10], 9 * 60)
        self.assertEqual(v[11], '2026-11-13')




    def test_public_press_kit(self):
        # Existing Reels page at /media/ must stay in place.
        media = (self.root / 'media/index.html').read_text()
        self.assertIn('Reels and videos · Chicas Map', media)
        self.assertNotIn('Press kit and brand assets', media)

        en = (self.root / 'index.html').read_text()
        es = (self.root / 'es/index.html').read_text()
        self.assertIn('href="/press/"', en)
        self.assertIn('>Press kit</a>', en)
        self.assertIn('href="/es/press/"', es)
        self.assertIn('>Kit de prensa</a>', es)
        self.assertNotIn('>Press kit</a>', es)

        page = (self.root / 'press/index.html').read_text()
        page_es = (self.root / 'es/press/index.html').read_text()
        self.assertIn('<title>Press kit and brand assets | Chicas Map</title>', page)
        self.assertIn('<title>Kit de prensa y marca | Chicas Map</title>', page_es)
        self.assertIn('role="tooltip"', page)
        self.assertIn('css/home.css', page)
        self.assertIn('class="site-header"', page)
        self.assertIn('/images/chica-logo.png', page)
        self.assertIn('/favicon.svg', page)
        self.assertIn('/og.jpg', page)
        self.assertIn('download="chica-logo.png"', page)
        self.assertIn('chicas-map-press-kit.zip', page)
        self.assertTrue((self.root / 'press/chicas-map-press-kit.zip').is_file())
        self.assertGreater((self.root / 'press/chicas-map-press-kit.zip').stat().st_size, 100000)
        self.assertIn('href="/bulletin/"', page)
        self.assertIn('href="/submit/"', page)
        self.assertNotIn('mr.jsciaraffa', page)
        self.assertNotIn('@gmail', page.lower())
        self.assertNotIn('PASSWORD', page)
        for word in ('Star Trek', 'Batman', 'Matrix', 'iPhone'):
            self.assertNotIn(word, page)
        # Third-party and sale-photo folders stay off the kit.
        self.assertNotIn('/badges/github', page)
        self.assertNotIn('/media/reels/', page)

        sm = (self.root / 'sitemap.xml').read_text()
        self.assertIn('<loc>https://www.chicasmap.com/press/</loc>', sm)
        self.assertIn('<loc>https://www.chicasmap.com/es/press/</loc>', sm)
        self.assertIn('<loc>https://www.chicasmap.com/media/</loc>', sm)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/press/"', page)
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/es/press/"', page_es)
        self.assertNotRegex(page, r'name="robots"[^>]*content="noindex')
        self.assertNotRegex(page_es, r'name="robots"[^>]*content="noindex')
        self.assertIn('data-goatcounter="https://chicasmapcom.goatcounter.com/count"', page)
        self.assertIn('data-goatcounter="https://chicasmapcom.goatcounter.com/count"', page_es)

    def test_audit_fixes_titles_canonicals_showcase_and_favicon(self):
        resources = (self.root / 'resources/index.html').read_text()
        adventure = (self.root / 'adventure/index.html').read_text()
        intel_es = (self.root / 'es/intel/index.html').read_text()
        atlas_es = (self.root / 'es/atlas/index.html').read_text()
        home = (self.root / 'index.html').read_text()
        self.assertIn('<title>San Antonio pantries, Wi-Fi, and city resources | Chicas Map</title>', resources)
        self.assertIn('<title>Adventure edition · Chicas Map</title>', adventure)
        self.assertNotEqual(re.search(r'<title>([^<]+)</title>', resources).group(1),
                            re.search(r'<title>([^<]+)</title>', home).group(1))
        self.assertIn('<title>Intel de la venta · Chicas Map</title>', intel_es)
        self.assertIn('<title>Atlas Álamo · Chicas Map</title>', atlas_es)
        self.assertNotEqual(re.search(r'<title>([^<]+)</title>', intel_es).group(1),
                            re.search(r'<title>([^<]+)</title>', (self.root / 'intel/index.html').read_text()).group(1))
        self.assertNotEqual(re.search(r'<title>([^<]+)</title>', atlas_es).group(1),
                            re.search(r'<title>([^<]+)</title>', (self.root / 'atlas/index.html').read_text()).group(1))
        desk = (self.root / 'boost/desk.html').read_text()
        self.assertIn('rel="canonical" href="https://www.chicasmap.com/boost/desk.html"', desk)
        self.assertNotIn('rel="canonical" href="https://www.chicasmap.com/boost/desk/"', desk)
        self.assertIn('Boost desk', desk)
        showcase = (self.root / 'showcase/index.html').read_text()
        showcase_es = (self.root / 'es/showcase/index.html').read_text()
        for name in ('01-come-hunt.png', '02-the-map.png', '03-filters-key.png', '04-build-a-loop.png', '05-take-me-with-you.png'):
            self.assertIn('href="/showcase/' + name + '"', showcase)
            self.assertIn('href="/showcase/' + name + '"', showcase_es)
            self.assertNotIn('href="./' + name + '"', showcase_es)
        self.assertTrue((self.root / 'favicon.ico').is_file())
        self.assertGreater((self.root / 'favicon.ico').stat().st_size, 16)
        # React submit shell must not be rewritten or it hydrates badly (#418).
        submit = (self.root / 'submit/index.html').read_text()
        if '$_TSR' in submit:
            self.assertNotRegex(submit, r'<body[^>]*>\s*<noscript')
            self.assertNotIn('data-chica-seo', submit)
            self.assertNotIn('List a garage sale free', submit)
            self.assertIn('<title>Chicas Map · San Antonio garage sales</title>', submit)


    def test_listing_issue_report_is_reachable_and_carries_listing_context(self):
        report = (self.root / 'report/index.html').read_text()
        details = (ROOT / 'webapp/js/pin-details.js').read_text()
        self.assertIn('<form id="report-form">', report)
        self.assertIn('name="listing_id"', report)
        self.assertIn('name="listing_title"', report)
        self.assertIn('name="listing_address"', report)
        self.assertIn('name="listing_source_url"', report)
        self.assertIn('name="reason"', report)
        self.assertIn('https://formsubmit.co/ajax/mr.jsciaraffa@gmail.com', report)
        self.assertIn("'/report/?id='", details)
        self.assertIn('Report an issue with this listing', details)
        self.assertIn('Reports are reviewed', report)
        self.assertIn('response.ok', report)

    def test_map_viewport_and_sale_sheet_have_legacy_height_fallbacks(self):
        map_page = (ROOT / 'webapp/map/index.html').read_text()
        legacy_map = (ROOT / 'webapp/map.html').read_text()
        fullscreen = (ROOT / 'webapp/fs-map.css').read_text()
        details = (ROOT / 'webapp/js/pin-details.js').read_text()
        for html in [map_page, legacy_map]:
            self.assertRegex(html, r'height:\s*100vh;\s*height:\s*100dvh')
        self.assertRegex(fullscreen, r'height:\s*100vh !important;\s*height:\s*100dvh !important')
        self.assertIn('max-height:min(70vh,620px)!important;max-height:min(70dvh,620px)!important;', details)
        self.assertIn('min-height: 100vh !important;', fullscreen)

if __name__ == '__main__':
    unittest.main()
