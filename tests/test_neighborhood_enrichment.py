"""Conservative neighborhood polygon enrichment regression tests."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "enrich_neighborhoods", ROOT / "scripts" / "enrich_neighborhoods.py"
)
neighborhoods = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(neighborhoods)


def feature(name, rings):
    return {"attributes": {"Name": name}, "geometry": {"rings": rings}}


SQUARE = [[[-98.5, 29.4], [-98.4, 29.4], [-98.4, 29.5], [-98.5, 29.5], [-98.5, 29.4]]]


class PolygonMathTests(unittest.TestCase):
    def test_inside_and_outside(self):
        self.assertTrue(neighborhoods.polygon_contains(-98.45, 29.45, SQUARE))
        self.assertFalse(neighborhoods.polygon_contains(-98.6, 29.45, SQUARE))

    def test_polygon_edge_is_included(self):
        self.assertTrue(neighborhoods.polygon_contains(-98.5, 29.45, SQUARE))

    def test_hole_is_excluded(self):
        hole = [[[-98.48, 29.42], [-98.42, 29.42], [-98.42, 29.48], [-98.48, 29.48], [-98.48, 29.42]]]
        self.assertFalse(neighborhoods.polygon_contains(-98.45, 29.45, SQUARE + hole))

    def test_overlapping_features_are_ambiguous(self):
        features = [feature("North", SQUARE), feature("South", SQUARE)]
        self.assertEqual(neighborhoods.polygon_names_at_point(features, 29.45, -98.45), ["North", "South"])


class EligibilityTests(unittest.TestCase):
    def pin(self, **changes):
        row = {
            "address": "1254 Austin Hwy, San Antonio, TX 78209",
            "lat": 29.4858,
            "lon": -98.4447,
            "geocode": "source",
        }
        row.update(changes)
        return row

    def test_exact_source_address_is_eligible(self):
        self.assertTrue(neighborhoods.eligible(self.pin()))

    def test_low_precision_geocodes_are_rejected(self):
        for source in ("census", "zip-centroid", "city-center", "nominatim", "nominatim-place"):
            with self.subTest(source=source):
                self.assertFalse(neighborhoods.eligible(self.pin(geocode=source)))

    def test_intersection_without_house_number_is_rejected(self):
        self.assertFalse(neighborhoods.eligible(self.pin(address="Austin Hwy & Broadway, San Antonio, TX")))

    def test_missing_coordinates_are_rejected(self):
        self.assertFalse(neighborhoods.eligible(self.pin(lat=None, lon=None)))

    def test_non_san_antonio_address_is_rejected(self):
        self.assertFalse(neighborhoods.eligible(self.pin(address="1254 Austin Hwy, Austin, TX 78701")))


class EnrichmentTests(unittest.TestCase):
    def test_unique_match_assigns_neighborhood_and_search_aliases(self):
        pins = [EligibilityTests().pin()]
        counts = neighborhoods.enrich_pins(pins, [feature("Terrell Heights", SQUARE)], "2026-11-09T00:00:00+00:00")
        self.assertEqual(counts["assigned"], 1)
        self.assertEqual(pins[0]["neighborhood"], "Terrell Heights")
        self.assertIn("Terrell Heights", pins[0]["aliases"])
        self.assertEqual(pins[0]["neighborhood_source"], neighborhoods.SOURCE_TAG)

    def test_ambiguous_match_is_left_blank(self):
        pins = [EligibilityTests().pin()]
        features = [feature("North", SQUARE), feature("South", SQUARE)]
        counts = neighborhoods.enrich_pins(pins, features, "2026-11-09")
        self.assertEqual(counts["ambiguous"], 1)
        self.assertNotIn("neighborhood", pins[0])

    def test_unmatched_and_ineligible_pins_stay_blank(self):
        pins = [EligibilityTests().pin(lat=29.6, lon=-98.7), EligibilityTests().pin(geocode="census")]
        counts = neighborhoods.enrich_pins(pins, [feature("Far Away", SQUARE)], "2026-11-09")
        self.assertEqual(counts["outside_or_unmatched"], 1)
        self.assertEqual(counts["ineligible"], 1)
        self.assertTrue(all(not p.get("neighborhood") for p in pins))

    def test_manual_neighborhood_is_preserved(self):
        pins = [EligibilityTests().pin(neighborhood="Manually verified")]
        neighborhoods.enrich_pins(pins, [feature("Other", SQUARE)], "2026-11-09")
        self.assertEqual(pins[0]["neighborhood"], "Manually verified")


if __tests__:
    unittest.main()
