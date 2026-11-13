"""Public live-sales list must exclude device-local, unapproved previews."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class LiveSalesPublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "app/src/routes/list.tsx").read_text()

    def test_live_list_uses_only_the_approved_city_feed(self):
        self.assertIn('const all = feed ? allSales(feed) : [];', self.source)
        self.assertNotIn('loadSubmissions', self.source)
        self.assertNotIn('setLocal', self.source)

    def test_live_list_does_not_label_local_previews_as_public(self):
        self.assertNotIn('Your listing', self.source)
        self.assertIn('Approved listings first', self.source)


if __name__ == "__main__":
    unittest.main()
