"""Weekend sales page must distinguish empty feeds from unavailable feeds."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class WeekendSalesFeedStateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "webapp/list/index.html").read_text()

    def test_http_and_json_errors_are_not_silently_treated_as_empty_feeds(self):
        self.assertIn('if (!r.ok) throw new Error("Feed request failed: " + r.status);', self.source)
        self.assertIn('if (!sales) throw new Error("Feed data has an unexpected format");', self.source)

    def test_empty_feed_has_an_honest_empty_state(self):
        self.assertIn('No upcoming garage or estate sales are currently in the live feed.', self.source)
        self.assertNotIn('Feed loaded but this file is not a listing array.', self.source)

    def test_feed_failure_has_a_retry_path(self):
        self.assertIn('Live sales are temporarily unavailable. Please try again or open the map.', self.source)
        self.assertIn('Try loading the sales list again', self.source)


if __name__ == "__main__":
    unittest.main()
