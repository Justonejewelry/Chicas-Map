"""Fixture tests for Wilson County News, yardsales.net, A Better Estate Sale,
BLOX classifieds, AllEvents, and Eventbrite sale parsers."""
from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "webapp" / "scripts"))
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_abetterestatesale import (  # noqa: E402
    normalize_ad as abes_normalize,
    parse_listings as abes_parse,
)
from fetch_blox_classifieds import (  # noqa: E402
    PAPERS,
    normalize_ad as blox_normalize,
    parse_detail as blox_detail,
    parse_listings as blox_parse,
)
from fetch_event_listings import parse_events  # noqa: E402
from fetch_wilson_county import (  # noqa: E402
    normalize_ad as wcn_normalize,
    parse_listings as wcn_parse,
)
from fetch_yardsales_net import (  # noqa: E402
    discover as ysn_discover,
    normalize_ad as ysn_normalize,
    parse_listings as ysn_parse,
)
from source_common import (  # noqa: E402
    family_duplicate,
    fetch as sc_fetch,
    title_is_sale_event,
)

TODAY = date(2026, 11, 11)
FIXTURES = ROOT / "tests" / "fixtures"


def _read(*parts: str) -> str:
    return (FIXTURES.joinpath(*parts)).read_text(encoding="utf-8")


class WilsonCountyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = _read("wilson-county", "category-garage-sale.html")
        cls.ads = wcn_parse(cls.html)

    def test_listings_include_three_garage_sales_and_craft_show(self):
        self.assertEqual(len(self.ads), 4)
        bodies = " ".join(a["body"] for a in self.ads)
        self.assertIn("12588 FM 537", bodies)
        self.assertIn("6690 Cooksey", bodies)
        self.assertIn("293 Saddle Lane", bodies)
        self.assertIn("13640 FM 1346", bodies)
        ids = {a["post_id"] for a in self.ads}
        self.assertTrue({"385601", "385589", "385573", "330385"} <= ids)

    def _by_street(self, needle: str) -> dict:
        for a in self.ads:
            if needle.lower() in a["body"].lower():
                return a
        raise AssertionError(f"missing {needle}")

    def test_stockdale_adkins_floresville_upcoming(self):
        expected = {
            "12588 FM 537": ("Stockdale", "2026-11-14", "2026-11-14", "8am-1pm", "wcn-385601"),
            "6690 Cooksey": ("Adkins", "2026-11-13", "2026-11-14", "starting at 8am", "wcn-385589"),
            "293 Saddle Lane": ("Floresville", "2026-11-13", "2026-11-14", "8am-4pm", "wcn-385573"),
        }
        for street, (city, start, end, hours, eid) in expected.items():
            sale, reason = wcn_normalize(self._by_street(street), TODAY)
            self.assertEqual(reason, "", street)
            self.assertIn(street.split()[0], sale["address"])
            self.assertIn(city, sale["address"])
            self.assertEqual(sale["date_start"], start, street)
            self.assertEqual(sale["date_end"], end, street)
            self.assertEqual(sale["hours"], hours, street)
            self.assertEqual(sale["external_id"], eid)
            self.assertEqual(sale["source"], "Wilson County News")
            self.assertTrue(sale["in_person"])
            self.assertIn("wilsoncountynews.com/classifieds/garage-sale/", sale["url"])

    def test_st_hedwig_craft_show_is_skipped(self):
        sale, reason = wcn_normalize(self._by_street("13640 FM 1346"), TODAY)
        self.assertIsNone(sale)
        self.assertIn("craft", reason.lower())


class YardSalesNetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = _read("yardsales-net", "san-antonio.html")
        cls.ads = ysn_parse(cls.html)

    def test_parses_schema_events(self):
        streets = {a["street"] for a in self.ads}
        self.assertIn("5802 Grandwood Dr", streets)
        self.assertIn("2914 Rocky Oak St", streets)
        self.assertIn("Alsfeld Rnch", streets)
        self.assertIn("Southern Blf", streets)
        hidden = [a for a in self.ads if a.get("slug") == "7Hnfo"]
        self.assertTrue(hidden)
        self.assertEqual(hidden[0]["street"], "")

    def test_street_sale_and_hidden_address(self):
        grand = next(a for a in self.ads if "Grandwood" in a["street"])
        sale, reason = ysn_normalize(grand, TODAY)
        self.assertEqual(reason, "")
        self.assertIn("5802 Grandwood", sale["address"])
        self.assertEqual(sale["date_start"], "2026-11-13")
        self.assertEqual(sale["date_end"], "2026-11-14")
        self.assertEqual(sale["external_id"], "ysn-7Hn5G")
        self.assertEqual(sale["source"], "yardsales.net")

        hidden = next(a for a in self.ads if a.get("slug") == "7Hnfo")
        sale, reason = ysn_normalize(hidden, TODAY)
        self.assertIsNone(sale)
        self.assertIn("no usable street", reason)

    def test_community_streets_become_area_pins(self):
        als = next(a for a in self.ads if a["street"] == "Alsfeld Rnch")
        sale, reason = ysn_normalize(als, TODAY)
        self.assertEqual(reason, "")
        self.assertEqual(sale["type"], "community")
        self.assertIn("Helotes", sale["address"])
        self.assertIn("Braunridge", sale["address"])

        south = next(a for a in self.ads if a["street"] == "Southern Blf")
        sale, reason = ysn_normalize(south, TODAY)
        self.assertEqual(reason, "")
        self.assertEqual(sale["type"], "community")
        self.assertIn("Southern Hills", sale["address"])

    def test_family_dedupe_against_yss(self):
        sale, reason = ysn_normalize(next(a for a in self.ads if "Grandwood" in a["street"]), TODAY)
        self.assertEqual(reason, "")
        existing = [{
            "address": "5802 GRANDWOOD DR, SAN ANTONIO, TX, 78239",
            "source": "YardSaleSearch",
            "external_id": "yss-196458725",
        }]
        hit = family_duplicate(sale, existing)
        self.assertIsNotNone(hit)
        self.assertEqual(hit["external_id"], "yss-196458725")

    def test_403_fails_soft(self):
        with mock.patch("fetch_yardsales_net.fetch", return_value=(403, "blocked")):
            with mock.patch("fetch_yardsales_net.save_snapshot"):
                sales, skipped = ysn_discover("san-antonio", TODAY, geocode=False)
        self.assertEqual(sales, [])
        self.assertEqual(skipped, [])


class ABetterEstateSaleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = _read("abetterestatesale", "upcoming-sales.html")
        cls.ads = abes_parse(cls.html)

    def test_parses_three_calendar_rows(self):
        titles = [a["title"] for a in self.ads]
        self.assertTrue(any("Sun Estate" in t for t in titles))
        self.assertTrue(any("Chase" in t for t in titles))
        self.assertTrue(any("Sonte" in t for t in titles))

    def test_ended_sun_estate_skipped(self):
        sun = next(a for a in self.ads if "Sun Estate" in a["title"])
        sale, reason = abes_normalize(sun, TODAY)
        self.assertIsNone(sale)
        self.assertIn("ended 2026-11-08", reason)

    def test_upcoming_without_address_are_area_pins(self):
        chase = next(a for a in self.ads if "Chase" in a["title"])
        sale, reason = abes_normalize(chase, TODAY)
        self.assertEqual(reason, "")
        self.assertEqual(sale["date_start"], "2026-11-20")
        self.assertEqual(sale["date_end"], "2026-11-22")
        self.assertEqual(sale["external_id"], "abes-633")
        self.assertIn("9 a.m.", sale["address"])
        self.assertIn("78249", sale["address"])
        self.assertIn("not a driveway", sale["details"])
        self.assertEqual(sale["source"], "A Better Estate Sale")
        self.assertEqual(sale["type"], "estate")

        sonte = next(a for a in self.ads if "Sonte" in a["title"])
        sale, reason = abes_normalize(sonte, TODAY)
        self.assertEqual(reason, "")
        self.assertEqual(sale["date_start"], "2026-12-05")
        self.assertEqual(sale["date_end"], "2026-12-06")
        self.assertIn("78230", sale["address"])
        self.assertTrue(sale["external_id"].startswith("abes-"))


class BloxClassifiedsTests(unittest.TestCase):
    def test_herald_ended_sale_skipped(self):
        paper = PAPERS[0]
        ads = blox_parse(_read("blox-classifieds", "herald-list.html"), paper)
        self.assertEqual(len(ads), 1)
        self.assertIn("767 San", ads[0]["title"])
        self.assertIn("ad_2dee6e04", ads[0]["url"])
        self.assertNotIn("?", ads[0]["url"])
        detail = blox_detail(_read("blox-classifieds", "herald-detail.html"))
        sale, reason = blox_normalize(ads[0], detail, TODAY)
        self.assertIsNone(sale)
        self.assertIn("ended 2026-11-06", reason)

    def test_seguin_upcoming_multi_address(self):
        paper = PAPERS[1]
        ads = blox_parse(_read("blox-classifieds", "seguin-list.html"), paper)
        self.assertEqual(len(ads), 1)
        detail = blox_detail(_read("blox-classifieds", "seguin-detail.html"))
        sale, reason = blox_normalize(ads[0], detail, TODAY)
        self.assertEqual(reason, "")
        self.assertIn("127 Placid Heights", sale["address"])
        self.assertIn("Seguin", sale["address"])
        self.assertEqual(sale["date_start"], "2026-11-13")
        self.assertEqual(sale["date_end"], "2026-11-14")
        self.assertEqual(sale["hours"], "8am-5pm")
        self.assertEqual(sale["source"], "Seguin Gazette")
        self.assertTrue(sale["external_id"].startswith("sgx-"))
        self.assertIn("Arrowhead", sale["details"])

    def test_429_backoff(self):
        calls = {"n": 0}

        class FakeHdr(dict):
            def get(self, k, default=None):
                return "1" if k.lower() == "retry-after" or k == "Retry-After" else default

        class FakeHTTPError(Exception):
            def __init__(self):
                self.code = 429
                self.fp = None
                self.headers = FakeHdr()

            def read(self):
                return b""

        def fake_urlopen(*_a, **_k):
            calls["n"] += 1
            if calls["n"] == 1:
                import urllib.error

                err = urllib.error.HTTPError(
                    "https://example.com/x", 429, "Too Many", FakeHdr(), None
                )
                raise err
            class Resp:
                status = 200
                def read(self):
                    return b"ok"
                def __enter__(self):
                    return self
                def __exit__(self, *a):
                    return False
            return Resp()

        with mock.patch("source_common.urllib.request.urlopen", side_effect=fake_urlopen):
            with mock.patch("source_common.time.sleep") as slept:
                code, body = sc_fetch("https://example.com/x", retries_429=2, backoff=15)
        self.assertEqual(code, 200)
        self.assertEqual(body, "ok")
        self.assertTrue(slept.called)
        self.assertGreaterEqual(calls["n"], 2)


class EventListingsTests(unittest.TestCase):
    def test_allevents_filter_and_locations(self):
        html = _read("event-listings", "allevents-garage-sale.html")
        sales, skipped = parse_events(html, "AllEvents", TODAY, geocode=False)
        by_title = {s["title"]: s for s in sales}
        self.assertIn("Red Hot Rummage Sale", by_title)
        red = by_title["Red Hot Rummage Sale"]
        self.assertIn("4114", red["address"])
        self.assertIn("Loop 410", red["address"])
        self.assertIn("78227", red["address"])
        self.assertEqual(red["date_start"], "2026-12-05")
        self.assertEqual(red["external_id"], "ae-200031010681238")
        self.assertEqual(red["lat"], 29.392220)
        self.assertEqual(red["source"], "AllEvents")

        self.assertIn("SPRING Community Wide Rummage Sale", by_title)
        spring = by_title["SPRING Community Wide Rummage Sale"]
        self.assertIn("Fairlawn", spring["address"])
        self.assertEqual(spring["type"], "community")
        self.assertEqual(spring["date_start"], "2027-05-01")

        self.assertIn("LUXURY, LUXURY, LUXURY!  Estate Sale", by_title)
        lux = by_title["LUXURY, LUXURY, LUXURY!  Estate Sale"]
        self.assertIn("211 S Flores", lux["address"])
        self.assertEqual(lux["date_start"], "2026-11-12")
        self.assertEqual(lux["date_end"], "2026-11-15")
        self.assertEqual(lux["type"], "estate")

        reasons = " ".join(r for _l, r in skipped)
        self.assertIn("no usable street", reasons)
        self.assertTrue(any("Garage sale" in (l.get("title") or "") for l, _r in skipped))

    def test_eventbrite_strict_title_filter(self):
        html = _read("event-listings", "eventbrite-rummage.html")
        sales, skipped = parse_events(html, "Eventbrite", TODAY, geocode=False)
        titles = [s["title"] for s in sales]
        self.assertEqual(titles, ["SPRING Community Wide Rummage Sale"])
        self.assertEqual(sales[0]["external_id"], "eb-1993008949418")
        self.assertIn("Fairlawn", sales[0]["address"])
        skipped_titles = [l.get("title") for l, _r in skipped]
        self.assertIn("SAHPOO Christmas Dance", skipped_titles)
        self.assertIn("NORA GRAND SUITE SALE", skipped_titles)

    def test_title_filter_helpers(self):
        self.assertTrue(title_is_sale_event("Red Hot Rummage Sale"))
        self.assertTrue(title_is_sale_event("CITYWIDE GARAGE SALE"))
        self.assertFalse(title_is_sale_event("SAHPOO Christmas Dance"))
        self.assertFalse(title_is_sale_event("NORA GRAND SUITE SALE"))
        self.assertFalse(title_is_sale_event("Makeup Blowout Sale Event"))


if __name__ == "__main__":
    unittest.main()
