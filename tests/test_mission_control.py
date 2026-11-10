"""Mission Control: password-gated, encrypted, unindexed, and free of private data."""
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / 'webapp' / 'mission-control' / 'index.html'


class MissionControlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = PAGE.read_text()
        m = re.search(r'<script type="application/json" id="mc-blob">(.*?)</script>', cls.html, re.S)
        cls.blob = json.loads(m.group(1))

    def test_noindex_and_not_listed(self):
        self.assertRegex(self.html, r'<meta name="robots" content="noindex,nofollow')
        self.assertIn('Disallow: /mission-control/', (ROOT / 'webapp' / 'robots.txt').read_text())
        self.assertNotIn('mission-control', (ROOT / 'webapp' / 'sitemap.xml').read_text())
        for p in ['index.html', 'map/index.html', 'list/index.html']:
            f = ROOT / 'webapp' / p
            if f.exists():
                self.assertNotIn('mission-control', f.read_text(), p + ' must not link to Mission Control')

    def test_dashboard_is_encrypted(self):
        b = self.blob
        self.assertGreaterEqual(b['iter'], 200000)
        self.assertEqual(len(__import__('base64').b64decode(b['salt'])), 16)
        self.assertEqual(len(__import__('base64').b64decode(b['iv'])), 12)
        for marker in ['Ticket queue', 'sales-clean.json', 'mission-status', 'localStorage', 'Leaflet']:
            self.assertNotIn(marker, self.html, 'plaintext dashboard leaked: ' + marker)

    def test_wrong_password_cannot_decrypt(self):
        if not shutil.which('node'):
            self.skipTest('node required')
        js = r'''
        const b = JSON.parse((await import("node:fs")).readFileSync(process.argv[2], "utf8"));
        const u = (s) => Uint8Array.from(Buffer.from(s, "base64"));
        const base = await crypto.subtle.importKey("raw", new TextEncoder().encode("definitely-not-it"), "PBKDF2", false, ["deriveKey"]);
        const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: u(b.salt), iterations: b.iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
        try { await crypto.subtle.decrypt({ name: "AES-GCM", iv: u(b.iv) }, key, u(b.ct)); console.log("DECRYPTED"); } catch (e) { console.log("REJECTED"); }
        '''
        with tempfile.NamedTemporaryFile('w', suffix='.mjs') as f, tempfile.NamedTemporaryFile('w', suffix='.json') as blob:
            f.write(js)
            f.flush()
            blob.write(json.dumps(self.blob))  # too big for argv, so pass it as a file
            blob.flush()
            out = subprocess.run(['node', f.name, blob.name], capture_output=True, text=True, check=True).stdout
        self.assertEqual(out.strip(), 'REJECTED')

    def test_status_json_has_no_private_data(self):
        raw = (ROOT / 'webapp' / 'data' / 'mission-status.json').read_text()
        d = json.loads(raw)
        self.assertTrue(d['routines'] and d['added'])
        self.assertIsNone(re.search(r'[\w.+-]+@[\w-]+\.[a-z]{2,}', raw), 'no email addresses')
        self.assertIsNone(re.search(r'(ghp_|github_pat_|sk_live|Bearer )', raw), 'no tokens')
        for r in d['routines']:
            self.assertIn(r['status'], {'ok', 'paused', 'blocked', 'failed'})
        for r in d['added']:
            self.assertRegex(r['day'], r'^\d{4}-\d{2}-\d{2}$')

    def test_stamp_pages_leaves_page_alone(self):
        if not shutil.which('node'):
            self.skipTest('node required')
        with tempfile.TemporaryDirectory() as tmp:
            shutil.copytree(ROOT / 'webapp', tmp, dirs_exist_ok=True)
            for cmd in (['python3', 'scripts/clean_sales.py', tmp], ['node', 'scripts/build_home.mjs', tmp],
                        ['python3', 'scripts/build_calendar.py', tmp], ['node', 'scripts/stamp-pages.mjs', tmp],
                        ['node', 'scripts/build_seo_pages.mjs', tmp]):
                subprocess.run(cmd, cwd=ROOT, check=True, capture_output=True, env=dict(os.environ, SITE_ORIGIN='https://www.chicasmap.com'))
            self.assertNotIn('mission-control', (Path(tmp) / 'sitemap.xml').read_text())
            stamped = (Path(tmp) / 'mission-control' / 'index.html').read_text()
            self.assertEqual(stamped, self.html)

    def test_every_theme_palette_meets_wcag_aa(self):
        """Palettes of all four themes (kept in sync with the encrypted source) clear WCAG AA."""
        def rgb(h):
            return [int(h[i:i + 2], 16) for i in (1, 3, 5)]

        def lum(c):
            c = [x / 255 for x in c]
            c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
            return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]

        def ratio(a, b):
            la, lb = sorted((lum(a), lum(b)), reverse=True)
            return (la + .05) / (lb + .05)

        def over(fg, a, bg):
            return [fg[i] * a + bg[i] * (1 - a) for i in range(3)]
        themes = {
            'console': dict(fills='#ff9c3a #ffcc66 #c9b0ff #8fc4ff #ff8fb5 #ff9d85 #6ee0a8 #ff6b63 #ffc233', text='#f4efe6 #b9b1c6', card='#0d0b10', bg='#000000', ui='#7a6c8f #6e6280'),
            'night': dict(fills='#ffc400 #ffd84a #aeb7c2 #8da2b8 #d9b24c #c98f45 #6fd08c #ff5a4d', text='#ecebe6 #aab0b8', card='#0c0e11', bg='#06070a', ui='#707880 #636a73'),
            'code': dict(fills='#00ff66 #9dff5c #5cffc8 #4df0ff #7dffb0 #b7ff6a #ff6b63 #ffd24a', text='#c8ffd9 #7fd9a2', card='#020a04', bg='#000000', ui='#2f8f58 #1e6b3f'),
            'glass': dict(fills='#ff9c3a #ffd27a #c9b0ff #8fc4ff #ff9cc2 #ff9d85 #6ee0a8 #ff7a72 #ffc233', text='#ffffff #d3d9f0', card='#0e1228', bg='#0a0e1f', ui='#9aa6d6 #6b78ad'),
        }
        for name, t in themes.items():
            bg, card = rgb(t['bg']), rgb(t['card'])
            for f in t['fills'].split():
                self.assertGreaterEqual(ratio([0, 0, 0], rgb(f)), 4.5, '%s: black text on %s' % (name, f))
                self.assertGreaterEqual(ratio(rgb(f), bg), 4.5, '%s: %s text on page' % (name, f))
            for tx in t['text'].split():
                self.assertGreaterEqual(ratio(rgb(tx), card), 4.5, '%s: %s on card' % (name, tx))
                self.assertGreaterEqual(ratio(rgb(tx), bg), 4.5, '%s: %s on page' % (name, tx))
            for ui in t['ui'].split():
                self.assertGreaterEqual(ratio(rgb(ui), bg), 3.0, '%s: UI line %s' % (name, ui))
        # glass panels are translucent: text must pass over the brightest colour that can sit behind a 72% tint
        tint = [14, 18, 40]
        for blob in ([79, 107, 255], [255, 79, 163], [25, 211, 176], [255, 255, 255]):
            panel = over(tint, .72, blob)
            for tx in ('#ffffff', '#d3d9f0'):
                self.assertGreaterEqual(ratio(rgb(tx), panel), 4.5 if blob != [255, 255, 255] else 3.0, 'glass text %s over %s' % (tx, blob))

    def test_no_borrowed_branding_and_fonts_are_self_hosted(self):
        page = re.sub(r'<script type="application/json" id="mc-blob">.*?</script>', '', self.html, flags=re.S).lower()
        for word in ['lcars', 'star trek', 'startrek', 'starfleet', 'batman', 'gotham', 'matrix', 'apple', 'wayne', 'joker', 'bat-signal', 'neo ', 'morpheus', 'cupertino']:
            self.assertNotIn(word, page, 'borrowed branding in the public gate page: ' + word)
        self.assertIn('Chica Mission Control', self.html)
        for name, sub in (('antonio', 'antonio-var.woff2'), ('jetbrains-mono', 'jetbrains-mono-var.woff2')):
            font = ROOT / 'webapp' / 'assets' / 'fonts' / name
            self.assertTrue((font / sub).exists())
            self.assertIn('SIL OPEN FONT LICENSE', (font / 'LICENSE').read_text().upper())
        self.assertNotIn('fonts.googleapis', self.html)
        shell = (ROOT / 'scripts' / 'mission-control' / 'shell.html').read_text().lower()
        for word in ['batman', 'matrix', 'apple', 'lcars', 'gotham']:
            self.assertNotIn(word, shell)

if __name__ == '__main__':
    unittest.main()
