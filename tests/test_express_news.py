"""Parser tests for the SA Express-News Marketplace classifieds source."""
from __future__ import annotations

import sys
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "webapp" / "scripts"))
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_express_news import (  # noqa: E402
    normalize_ad,
    parse_detail,
    parse_listings,
)

FIXTURES = ROOT / "tests" / "fixtures" / "express-news"
TODAY = date(2026, 11, 11)


def listing_by_ref(ads, ref):
    for a in ads:
        if a.get("refcode") == ref:
            return a
    raise AssertionError(f"missing listing {ref}")


def detail_for(url: str) -> dict:
    slug = url.rstrip("/").split("/")[-1]
    path = FIXTURES / "details" / f"{slug}.html"
    return parse_detail(path.read_text(encoding="utf-8"), url)


class ExpressNewsParserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (FIXTURES / "category-estate-garage-sales.html").read_text(encoding="utf-8")
        cls.ads = parse_listings(cls.html)

    def test_listings_count_and_refcodes(self):
        self.assertEqual(len(self.ads), 10)
        refs = {a["refcode"] for a in self.ads}
        self.assertIn("IPCSAE00229431", refs)
        self.assertIn("IPCSAE00230760", refs)
        self.assertTrue(all(a["url"].startswith("https://hearst-mp.ipublishmarketplace.com/marketplace/sanantonio/advert/") for a in self.ads))

    def test_sonoma_ranch_upcoming_estate(self):
        listing = listing_by_ref(self.ads, "IPCSAE00229431")
        sale, reason = normalize_ad(listing, detail_for(listing["url"]), TODAY)
        self.assertEqual(reason, "")
        self.assertIsNotNone(sale)
        self.assertIn("346 Pueblo Pintado", sale["address"])
        self.assertIn("Helotes", sale["address"])
        self.assertIn("78023", sale["address"])
        self.assertEqual(sale["date_start"], "2026-11-12")
        self.assertEqual(sale["date_end"], "2026-11-14")
        self.assertEqual(sale["type"], "estate")
        self.assertEqual(sale["source"], "Express-News Marketplace")
        self.assertEqual(sale["external_id"], "exn-ipcsae00229431")
        self.assertIn("advert/estate-sale-in-sonoma-ranch-general_1012", sale["url"])
        self.assertTrue(sale["hours"])

    def test_street_sales_upcoming(self):
        expected = {
            "IPCSAE00231261": ("6727 Glen Fair", "2026-11-12", "2026-11-14", "78239"),
            "IPCSAE00231141": ("5858 Laurel Valley", "2026-11-14", "2026-11-15", "78242"),
            "IPCSAE00230060": ("1102 Dwyerbrook", "2026-11-14", "2026-11-14", "78253"),
            "IPCSAE00230481": ("4119 Spring View", "2026-11-12", "2026-11-13", "78222"),
        }
        for ref, (street, start, end, zipc) in expected.items():
            listing = listing_by_ref(self.ads, ref)
            sale, reason = normalize_ad(listing, detail_for(listing["url"]), TODAY)
            self.assertEqual(reason, "", ref)
            self.assertIn(street, sale["address"], ref)
            self.assertIn(zipc, sale["address"], ref)
            self.assertEqual(sale["date_start"], start, ref)
            self.assertEqual(sale["date_end"], end, ref)
            self.assertTrue(sale["in_person"], ref)

    def test_area_sales_leon_valley_and_shavano_ridge(self):
        leon = listing_by_ref(self.ads, "IPCSAE00228491")
        sale, reason = normalize_ad(leon, detail_for(leon["url"]), TODAY)
        self.assertEqual(reason, "")
        self.assertIn("Leon Valley", sale["address"])
        self.assertEqual(sale["type"], "community")
        self.assertEqual(sale["date_start"], "2026-11-14")
        self.assertEqual(sale["date_end"], "2026-11-14")

        shavano = listing_by_ref(self.ads, "IPCSAE00229611")
        sale, reason = normalize_ad(shavano, detail_for(shavano["url"]), TODAY)
        self.assertEqual(reason, "")
        self.assertIn("Shavano Ridge", sale["address"])
        self.assertEqual(sale["type"], "community")
        self.assertEqual(sale["date_start"], "2026-11-14")
        self.assertEqual(sale["date_end"], "2026-11-15")

    def test_ended_ads_are_skipped(self):
        castle = listing_by_ref(self.ads, "IPCSAE00230760")
        sale, reason = normalize_ad(castle, detail_for(castle["url"]), TODAY)
        self.assertIsNone(sale)
        self.assertIn("ended 2026-11-07", reason)

        braun = listing_by_ref(self.ads, "IPCSAE00230641")
        sale, reason = normalize_ad(braun, detail_for(braun["url"]), TODAY)
        self.assertIsNone(sale)
        self.assertIn("ended 2026-11-08", reason)

    def test_online_auction_is_skipped(self):
        listing = listing_by_ref(self.ads, "IPCSAE00228731")
        sale, reason = normalize_ad(listing, detail_for(listing["url"]), TODAY)
        self.assertIsNone(sale)
        self.assertIn("auction", reason.lower())


if __name__ == "__main__":
    unittest.main()
