"""Regression checks for the public sale submission form."""
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SubmitFormTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "app/src/routes/submit.tsx").read_text()

    def test_actual_sale_dates_are_required_and_saved(self):
        for field in ('name="date_from" type="date" required', 'name="date_to" type="date" required'):
            self.assertIn(field, self.source)
        self.assertIn('if (dateTo < dateFrom)', self.source)
        self.assertIn('date_from: dateFrom', self.source)
        self.assertIn('date_to: dateTo', self.source)
        self.assertNotIn('dates: "This weekend"', self.source)

    def test_failed_geocoding_never_uses_city_center_coordinates(self):
        self.assertIn('if (!hits.length)', self.source)
        self.assertNotIn('hits[0] ? Number(hits[0].lat) : 29.4241', self.source)
        self.assertNotIn('hits[0] ? Number(hits[0].lon) : -98.4936', self.source)

    def test_review_email_must_succeed_before_local_success(self):
        send = self.source.index('const response = await fetch(INTAKE')
        confirm = self.source.index('if (!response.ok)', send)
        save = self.source.index('saveSubmission(sale)', send)
        self.assertLess(send, confirm)
        self.assertLess(confirm, save)

    def test_pending_review_is_explained(self):
        self.assertIn('not public until approved', self.source)
        self.assertIn('Submit sale for review', self.source)


if __name__ == "__main__":
    unittest.main()
