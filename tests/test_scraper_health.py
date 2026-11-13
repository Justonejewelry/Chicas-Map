"""Regression tests for per-source health classification."""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "webapp" / "scripts"))
import check_scraper_health as health


class ScraperHealthTests(unittest.TestCase):
    def log(self, output="", code=0):
        return (
            output
            + f"\n__CHICA_EXIT_CODE={code}\n"
            + "__CHICA_STARTED_AT=2026-11-13T05:00:00-06:00\n"
            + "__CHICA_FINISHED_AT=2026-11-13T05:01:00-06:00\n"
        )

    def test_missing_log_is_not_run_not_source_failure(self):
        result = health.analyze_log("craigslist", "")
        self.assertEqual(result["status"], "not_run")
        self.assertTrue(result["primary"])

    def test_nonzero_exit_is_confirmed_failure(self):
        result = health.analyze_log("craigslist", self.log("normalized=12", 2))
        self.assertEqual(result["status"], "fail")

    def test_blocked_source_is_failure_even_with_zero_exit(self):
        result = health.analyze_log("craigslist", self.log("WARN: blocked by Craigslist"))
        self.assertEqual(result["status"], "fail")

    def test_zero_results_is_successful_empty_retrieval(self):
        result = health.analyze_log("estatesales_org", self.log("normalized=0"))
        self.assertEqual(result["status"], "zero")
        self.assertEqual(result["last_successful_retrieval"], "2026-11-13T05:01:00-06:00")

    def test_positive_normalization_is_success(self):
        result = health.analyze_log("yardsalesearch", self.log("normalized=14"))
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["last_successful_retrieval"], "2026-11-13T05:01:00-06:00")

    def test_unrecognized_zero_exit_is_not_claimed_as_verified(self):
        result = health.analyze_log("estatesales_org", self.log("Finished without result details"))
        self.assertEqual(result["status"], "completed_unverified")


if __name__ == "__main__":
    unittest.main()
