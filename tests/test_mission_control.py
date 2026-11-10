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

    def test_palette_meets_wcag_aa(self):
        """The dashboard palette (kept in sync with the encrypted source) clears WCAG AA."""
        def lum(h):
            c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
            c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
            return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]

        def ratio(a, b):
            la, lb = sorted((lum(a), lum(b)), reverse=True)
            return (la + .05) / (lb + .05)
        fills = ['#ff9c3a', '#ffcc66', '#c9b0ff', '#8fc4ff', '#ff8fb5', '#ff9d85', '#6ee0a8', '#ff6b63', '#ffc233']
        for f in fills:
            self.assertGreaterEqual(ratio('#000000', f), 4.5, 'black text on ' + f)
            self.assertGreaterEqual(ratio(f, '#000000'), 4.5, f + ' text on black')
        for t in ['#f4efe6', '#b9b1c6']:
            self.assertGreaterEqual(ratio(t, '#0d0b10'), 4.5, t + ' on card')
        for ui in ['#7a6c8f', '#6e6280']:
            self.assertGreaterEqual(ratio(ui, '#000000'), 3.0, 'UI line ' + ui)

    def test_no_borrowed_branding_and_font_is_self_hosted(self):
        low = self.html.lower()
        for word in ['lcars', 'star trek', 'startrek', 'starfleet']:
            self.assertNotIn(word, low)
        self.assertIn('Chica Mission Control', self.html)
        font = ROOT / 'webapp' / 'assets' / 'fonts' / 'antonio'
        self.assertTrue((font / 'antonio-var.woff2').exists())
        self.assertIn('SIL OPEN FONT LICENSE', (font / 'LICENSE').read_text().upper())
        self.assertNotIn('fonts.googleapis', self.html)


if __name__ == '__main__':
    unittest.main()
