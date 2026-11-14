"""Regression contract for trustworthy sale submissions."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SaleSubmissionTrustTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "app/src/routes/submit.tsx").read_text()

    def test_actual_start_and_end_dates_are_required_and_saved(self):
        self.assertIn('name="date_from"', self.source)
        self.assertIn('name="date_to"', self.source)
        self.assertIn('!date_from || !date_to', self.source)
        self.assertIn('date_from,', self.source)
        self.assertIn('date_to,', self.source)

    def test_invalid_or_past_date_ranges_use_san_antonio_calendar_date(self):
        self.assertIn('date_to < date_from', self.source)
        self.assertIn('date_from < todayISO', self.source)
        self.assertIn('timeZone: "America/Chicago"', self.source)
        self.assertIn('formatToParts(new Date())', self.source)
        self.assertNotIn('today.getFullYear()', self.source)
        self.assertNotIn('today.getMonth()', self.source)
        self.assertNotIn('today.getDate()', self.source)

    def test_unverified_address_never_falls_back_to_city_center(self):
        self.assertIn('if (!hits.length)', self.source)
        self.assertIn('haversineMi', self.source)
        self.assertNotIn('29.4241', self.source)
        self.assertNotIn('-98.4936', self.source)

    def test_review_email_must_be_accepted_before_local_save(self):
        send = self.source.index('const response = await fetch(INTAKE')
        response_check = self.source.index('if (!response.ok)', send)
        save = self.source.index('saveSubmission(sale)', send)
        self.assertLess(send, response_check)
        self.assertLess(response_check, save)
        self.assertIn('result.success === false', self.source)

    def test_user_is_told_listing_requires_review(self):
        self.assertIn('not published automatically', self.source)
        self.assertIn('Submit sale for review', self.source)


if __name__ == "__main__":
    unittest.main()
