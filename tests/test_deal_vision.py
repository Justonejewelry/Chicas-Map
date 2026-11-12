"""Deal Vision worker + Deal Finder cloud-photo UI (worker mocked). Plain-node tests wrapped for unittest."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which('node')


@unittest.skipUnless(NODE, 'node not installed')
class DealVisionTests(unittest.TestCase):
    def run_node(self, script):
        return subprocess.run([NODE, str(ROOT / 'tests' / script)], capture_output=True, text=True, timeout=120, cwd=ROOT)

    def test_worker_parsing_mapping_prices_and_guards(self):
        r = self.run_node('deal_vision_worker.test.mjs')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)

    def test_deals_finder_cloud_photo_ui(self):
        r = self.run_node('deals_vision_ui.test.cjs')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        if 'SKIP' in r.stdout:
            self.skipTest(r.stdout.strip())

    def test_feature_flag_points_at_worker(self):
        cfg = (ROOT / 'webapp/js/chica-config.js').read_text()
        self.assertRegex(cfg, r'DEAL_VISION_URL:\s*"https://chicas-deal-vision\.mr-jsciaraffa\.workers\.dev"')


if __name__ == '__main__':
    unittest.main()
