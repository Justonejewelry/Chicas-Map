"""Regression tests for the browser calendar month grid."""
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class CalendarUiTests(unittest.TestCase):
    def test_weekday_labels_use_a_stable_sunday_anchor(self):
        script = (ROOT / "webapp/js/calendar.js").read_text()
        self.assertIn("new Date(2000,0,2+w)", script)
        self.assertNotIn("new Date(2026,10,1+w)", script)

    def test_calendar_template_busts_cached_script(self):
        template = (ROOT / "templates/calendar.html").read_text()
        self.assertIn("/js/calendar.js?v=47", template)


if __name__ == "__main__":
    unittest.main()
