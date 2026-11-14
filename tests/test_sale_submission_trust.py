"""Regression contract for trustworthy sale submissions."""
import os
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class SaleSubmissionTrustTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "app/src/routes/submit.tsx").read_text()
        cls.date_helper = (ROOT / "app/src/lib/sa-date.ts").read_text()

    def test_actual_start_and_end_dates_are_required_and_saved(self):
        self.assertIn('name="date_from"', self.source)
        self.assertIn('name="date_to"', self.source)
        self.assertIn('!date_from || !date_to', self.source)
        self.assertIn('date_from,', self.source)
        self.assertIn('date_to,', self.source)

    def test_invalid_or_past_date_ranges_use_san_antonio_calendar_date(self):
        self.assertIn('date_to < date_from', self.source)
        self.assertIn('date_from < todayISO', self.source)
        self.assertIn('sanAntonioTodayISO', self.source)
        self.assertIn('from "@/lib/sa-date"', self.source)
        # Helper must compute via America/Chicago, not device local getters.
        self.assertIn('timeZone: "America/Chicago"', self.date_helper)
        self.assertIn('formatToParts', self.date_helper)
        self.assertNotIn('getFullYear()', self.source)
        self.assertNotIn('getMonth()', self.source)
        self.assertNotIn('getDate()', self.source)

    def test_san_antonio_date_is_correct_near_midnight_across_device_timezones(self):
        helper_path = ROOT / "app/src/lib/sa-date.ts"
        node_script = r"""
const fs = require("fs");
let source = fs.readFileSync(process.argv[1], "utf8");
source = source.replace(
  "export function sanAntonioTodayISO(now: Date = new Date()): string {",
  "function sanAntonioTodayISO(now = new Date()) {"
);
const getDate = new Function(source + "\\nreturn sanAntonioTodayISO;")();
process.stdout.write(getDate(new Date(process.argv[2])));
"""
        cases = [
            # One second before and at midnight in Chicago during standard time.
            ("2026-01-15T05:59:59Z", "2026-01-14"),
            ("2026-01-15T06:00:00Z", "2026-01-15"),
            # One second before and at midnight in Chicago during daylight time.
            ("2026-07-15T04:59:59Z", "2026-07-14"),
            ("2026-07-15T05:00:00Z", "2026-07-15"),
        ]
        for device_timezone in ("Pacific/Kiritimati", "America/Los_Angeles"):
            env = dict(os.environ, TZ=device_timezone)
            for instant, expected in cases:
                with self.subTest(device_timezone=device_timezone, instant=instant):
                    result = subprocess.run(
                        ["node", "-e", node_script, str(helper_path), instant],
                        check=True,
                        capture_output=True,
                        text=True,
                        env=env,
                    )
                    self.assertEqual(result.stdout, expected)

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
