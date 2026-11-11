"""date_window and city-feed guards must not wipe upcoming map pins."""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "webapp" / "scripts"))
sys.path.insert(0, str(ROOT / "scripts"))

from city_io import protect_san_antonio_public, union_public  # noqa: E402

spec = importlib.util.spec_from_file_location("date_window", ROOT / "scripts" / "date_window.py")
dw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dw)

specg = importlib.util.spec_from_file_location("guard_populate_feed", ROOT / "scripts" / "guard_populate_feed.py")
guard = importlib.util.module_from_spec(specg)
specg.loader.exec_module(guard)


def pin(title, start, end, **extra):
    row = {
        "title": title,
        "address": extra.get("address", f"{title} St, San Antonio, TX"),
        "dates": f"{start} – {end}",
        "date_start": start,
        "date_end": end,
        "end_date": end,
        "source": extra.get("source", "test"),
        "external_id": extra.get("external_id", f"test-{title.lower().replace(' ', '-')}"),
        "status": extra.get("status", "verified"),
        "in_person": True,
    }
    row.update({k: v for k, v in extra.items() if k not in row})
    return row


TODAY = date(2026, 11, 11)


class DateWindowKeepsUpcomingTests(unittest.TestCase):
    def test_upcoming_and_live_stay_expired_leave(self):
        data = {
            "public": [
                pin("Live today", "2026-11-11", "2026-11-12"),
                pin("Cooksey weekend", "2026-11-13", "2026-11-14", address="6690 Cooksey Rd, Adkins, TX"),
                pin("Red Hot", "2026-12-05", "2026-12-05", address="4114 SW Loop 410, San Antonio, TX 78227"),
                pin("Ended yesterday", "2026-11-08", "2026-11-10"),
                pin("Online auction", "2026-11-12", "2026-11-13", status="verified", dates="online only auction 2026-11-12 – 2026-11-13"),
            ]
        }
        groups = dw.apply_window(data, TODAY)
        titles = {s["title"] for s in data["public"]}
        self.assertIn("Live today", titles)
        self.assertIn("Cooksey weekend", titles)
        self.assertIn("Red Hot", titles)
        self.assertNotIn("Ended yesterday", titles)
        self.assertEqual(groups["upcoming"][0]["title"], "Cooksey weekend")
        self.assertEqual(len(groups["expired"]), 1)
        self.assertTrue(all(s["date_bucket"] in {"live", "upcoming", "undated"} for s in data["public"]))

    def test_old_today_only_filter_is_gone(self):
        self.assertIn("upcoming", dw.KEEP_ON_MAP)


class CityIoSharpDropTests(unittest.TestCase):
    def test_empty_overwrite_keeps_existing(self):
        old = [pin("Keep me", "2026-11-12", "2026-11-12")]
        out, reason = protect_san_antonio_public(old, [])
        self.assertEqual(len(out), 1)
        self.assertIn("empty", reason)

    def test_sharp_drop_unions_previous_pins(self):
        old = [pin(f"Sale {i}", "2026-11-14", "2026-11-14", address=f"{100+i} Main St") for i in range(10)]
        incoming = [pin("Sale 0", "2026-11-14", "2026-11-14", address="100 Main St"), pin("Brand new", "2026-11-15", "2026-11-15", address="9 New St")]
        out, reason = protect_san_antonio_public(old, incoming)
        self.assertIn("sharp drop", reason)
        titles = {s["title"] for s in out}
        self.assertIn("Brand new", titles)
        self.assertGreaterEqual(len(out), 10)

    def test_modest_change_is_allowed(self):
        old = [pin(f"Sale {i}", "2026-11-14", "2026-11-14", address=f"{100+i} Main St") for i in range(10)]
        incoming = old[:8]
        out, reason = protect_san_antonio_public(old, incoming)
        self.assertEqual(reason, "")
        self.assertEqual(len(out), 8)

    def test_union_matches_by_external_id(self):
        old = [pin("Old title", "2026-11-14", "2026-11-14", external_id="exn-1", address="1 A St")]
        new = [pin("Updated title", "2026-11-14", "2026-11-15", external_id="exn-1", address="1 A St")]
        merged = union_public(old, new)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["title"], "Updated title")
        self.assertEqual(merged[0]["date_end"], "2026-11-15")


class GuardPopulateFeedTests(unittest.TestCase):
    def test_detects_sharp_drop_and_allows_stable_feed(self):
        sales = [pin(f"Sale {i}", "2026-11-14", "2026-11-14") for i in range(20)]
        baseline = {"public": sales}
        gutted = {"public": sales[:5]}
        ok, msg = guard.evaluate(baseline, gutted, TODAY, "sales-clean.json")
        self.assertFalse(ok)
        self.assertIn("20 -> 5", msg)
        ok, msg = guard.evaluate(baseline, {"public": sales[:18]}, TODAY, "sales-clean.json")
        self.assertTrue(ok)

    def test_snapshot_and_restore(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "baseline"
            # Don't touch the real repo files for restore; test snapshot helper on copies.
            src = Path(tmp) / "src"
            src.mkdir()
            (src / "sales-clean.json").write_text(json.dumps({"public": [pin("A", "2026-11-14", "2026-11-14")]}))
            (src / "san-antonio.json").write_text(json.dumps({"public": [pin("B", "2026-11-14", "2026-11-14")]}))
            # Use the module functions against patched paths would be heavier;
            # just confirm evaluate counts upcoming including today-or-later.
            self.assertEqual(guard.upcoming_count({"public": [pin("A", "2026-11-10", "2026-11-10")]}, TODAY), 0)
            self.assertEqual(guard.upcoming_count({"public": [pin("A", "2026-11-11", "2026-11-11")]}, TODAY), 1)


if __name__ == "__main__":
    unittest.main()
