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


    def test_craigslist_zero_static_results_is_successful_empty_retrieval(self):
        result = health.analyze_log("craigslist", self.log("static results=0"))
        self.assertEqual(result["status"], "zero")
        self.assertEqual(result["last_successful_retrieval"], "2026-11-13T05:01:00-06:00")

    def test_craigslist_zero_enriched_results_is_successful_empty_retrieval(self):
        result = health.analyze_log("craigslist", self.log("enriched=0"))
        self.assertEqual(result["status"], "zero")

    def test_craigslist_static_results_but_zero_enriched_is_zero(self):
        result = health.analyze_log("craigslist", self.log("static results=25\\nenriched=0"))
        self.assertEqual(result["status"], "zero")
        self.assertEqual(result["records_found"], 0)

    def test_craigslist_positive_enriched_count_is_ok(self):
        result = health.analyze_log("craigslist", self.log("static results=25\\nenriched=8"))
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["records_found"], 8)

    def test_garage_sale_finder_zero_parsed_is_successful_empty_retrieval(self):
        result = health.analyze_log("garagesalefinder", self.log("0 parsed"))
        self.assertEqual(result["status"], "zero")

    def test_garage_sale_finder_mixed_city_results_are_nonempty(self):
        result = health.analyze_log("garagesalefinder", self.log("0 parsed\n12 parsed\nmerge added=0"))
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["detail"], "12 parsed")

    def test_permits_zero_rows_is_successful_empty_retrieval(self):
        result = health.analyze_log("permits", self.log("garage/estate permits in window=0"))
        self.assertEqual(result["status"], "zero")

    def test_structured_source_record_counts_use_final_discovery_metrics(self):
        cases = [
            ("garagesalefinder", "1 parsed\n2 parsed", 3, "parsed"),
            ("permits", "garage/estate permits in window=4 (estate-tagged=2)", 4, "permits_in_window"),
            ("estatesales_org", "normalized=5", 5, "normalized"),
            ("yardsalesearch", "normalized=6", 6, "normalized"),
            ("gsalr", "normalized=7", 7, "normalized"),
            ("craigslist", "static results=9\nenriched=8", 8, "enriched"),
            ("estatesales_net", "normalized=10", 10, "normalized"),
        ]
        for source, output, expected, metric in cases:
            with self.subTest(source=source):
                result = health.analyze_log(source, self.log(output))
                self.assertEqual(result["records_found"], expected)
                self.assertEqual(result["records_found_metric"], metric)

    def test_structured_counts_sum_cities_and_do_not_use_merge_added_or_inventory(self):
        output = "[san-antonio]\nnormalized=3\nmerge added=1 public_live=50\n[austin]\nnormalized=4\nmerge added=0 public_live=40"
        result = health.analyze_log("yardsalesearch", self.log(output))
        self.assertEqual(result["records_found"], 7)
        self.assertEqual(result["records_found_metric"], "normalized")

    def test_unrecognized_count_is_null_not_zero(self):
        result = health.analyze_log("craigslist", self.log("Finished without count details"))
        self.assertIsNone(result["records_found"])
        self.assertEqual(result["records_found_metric"], "enriched")

    def test_missing_log_has_null_count(self):
        result = health.analyze_log("craigslist", "")
        self.assertIsNone(result.get("records_found"))
        self.assertEqual(result.get("records_found_metric"), "enriched")

if __name__ == "__main__":
    unittest.main()
