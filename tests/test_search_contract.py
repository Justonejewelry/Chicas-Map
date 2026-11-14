import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SearchContractTests(unittest.TestCase):
    def test_map_search_supports_natural_near_me_phrases(self):
        source = (ROOT / "webapp/js/chica-live-map.js").read_text()
        self.assertIn("function searchWords(value, queryMode)", source)
        self.assertIn("var filler = { near: 1", source)
        self.assertIn("searchWords(f.q, true)", source)
        self.assertIn("word.slice(0, -1)", source)

    def test_map_search_indexes_location_and_listing_metadata(self):
        source = (ROOT / "webapp/js/chica-live-map.js").read_text()
        for field in ("s.zip", "s.neighborhood", "s.city", "s.locality",
                      "s.source_address", "s.seller", "s.company", "s.categories"):
            with self.subTest(field=field):
                self.assertIn(field, source)

    def test_home_search_indexes_zip_and_location_metadata(self):
        source = (ROOT / "webapp/js/home-search.js").read_text()
        for field in ("s.zip", "s.zip_code", "s.postal_code", "s.neighborhood",
                      "s.city", "s.source", "s.seller", "s.aliases"):
            with self.subTest(field=field):
                self.assertIn(field, source)


if __name__ == "__main__":
    unittest.main()

    def test_home_search_distinguishes_feed_failure_from_empty_results(self):
        source = (ROOT / "webapp/js/home-search.js").read_text()
        self.assertIn('feedState === "error" ? T.loadErr : T.loading', source)
        self.assertIn('if (!r.ok) throw new Error("Sales feed request failed:', source)
        self.assertIn('throw new Error("Unexpected sales feed format")', source)
        self.assertIn('retry.onclick = function () { loadData(box); }', source)
        self.assertIn('feedState = "ready"', source)
