"""Regression tests for the public $5 Weekend Sale Spotlight offer."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class BoostOfferTests(unittest.TestCase):
    def test_claim_page_explains_the_real_five_dollar_offer(self):
        page = (ROOT / "webapp" / "claim" / "index.html").read_text()
        self.assertIn("Weekend Sale Spotlight", page)
        self.assertIn('href="https://square.link/u/qjunxHoo"', page)
        self.assertIn('class="price">$5</span>', page)
        self.assertIn("Standout gold map pin", page)
        self.assertIn("Your listing stays free", page)
        self.assertIn("One-time payment", page)
        self.assertIn("payment note", page)
        self.assertIn("Payment alone does not publish", page)
        self.assertIn("no promotion can guarantee", page.lower())
        self.assertNotIn("free spotlight by sharing", page.lower())
        self.assertNotIn("share-to-boost", page.lower())
        self.assertNotIn("href=\"/Chicas-Map/boost/\"", page)
        self.assertIn('href="/Chicas-Map/submit/"', page)
        self.assertIn('href="/Chicas-Map/map/"', page)

    def test_legacy_boost_url_redirects_to_paid_offer(self):
        page = (ROOT / "webapp" / "boost" / "index.html").read_text()
        self.assertIn("/Chicas-Map/claim/", page)
        self.assertNotIn("Like, follow, and share", page)
        self.assertNotIn("free pin light request", page)

    def test_claim_page_has_spanish_offer_copy(self):
        page = (ROOT / "webapp" / "claim" / "index.html").read_text()
        self.assertIn("Dale protagonismo a mi venta · $5", page)
        self.assertIn("Tu anuncio sigue siendo gratis", page)
        self.assertIn("El pin dorado se activa", page)
        self.assertNotIn("promoción gratis al compartir", page.lower())

    def test_gold_spotlight_pin_has_a_distinct_star_badge_and_reduced_motion_fallback(self):
        source = (ROOT / "webapp" / "js" / "chica-live-map.js").read_text()
        self.assertIn('class="chica-gold-badge" aria-hidden="true">★</span>', source)
        self.assertIn(".chica-gold-badge{", source)
        self.assertIn("@media (prefers-reduced-motion:reduce){.chica-pack-ring,.chica-gold-ring{animation:none", source)

    def test_square_webhook_matches_the_current_five_dollar_weekend_product(self):
        worker = (ROOT / "workers" / "square-boost-webhook" / "src" / "index.js").read_text()
        config = (ROOT / "workers" / "square-boost-webhook" / "wrangler.toml").read_text()
        runbook = (ROOT / "docs" / "SQUARE_WEBHOOKS.md").read_text()
        self.assertIn('BOOST_AMOUNT_CENTS = "500"', config)
        self.assertIn('env.BOOST_AMOUNT_CENTS || "500"', worker)
        self.assertIn('Number(amountCents) || 500', worker)
        self.assertIn('product: "pin_claim_5"', worker)
        self.assertIn('boost_duration: "sale_weekend"', worker)
        self.assertIn("$5 WEEKEND PIN BOOST PAID", worker)
        self.assertNotIn("900", worker)
        self.assertNotIn("$9", worker)
        self.assertNotIn("6-month", runbook)
        self.assertIn('BOOST_AMOUNT_CENTS = "500"', runbook)
        self.assertIn("payment link", runbook.lower())


if __name__ == "__main__":
    unittest.main()
