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
        self.assertIn("cannot guarantee", page.lower())
        self.assertIn('href="/Chicas-Map/submit/"', page)
        self.assertIn('href="/Chicas-Map/map/"', page)

    def test_claim_page_has_spanish_offer_copy(self):
        page = (ROOT / "webapp" / "claim" / "index.html").read_text()
        self.assertIn("Dale protagonismo a mi venta · $5", page)
        self.assertIn("Tu anuncio sigue siendo gratis", page)
        self.assertIn("El pin dorado se activa", page)


if __name__ == "__main__":
    unittest.main()
