import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class MobileMapLayoutContractTests(unittest.TestCase):
    def test_map_viewport_uses_safe_area_aware_mobile_canvas(self):
        html = (ROOT / "webapp/map/index.html").read_text(encoding="utf-8")
        self.assertIn('name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"', html)
        self.assertIn("height: 100dvh", html)
        self.assertIn("env(safe-area-inset-top)", html)

    def test_mobile_search_dock_leaves_room_for_top_right_menu(self):
        css = (ROOT / "webapp/css/finish.css").read_text(encoding="utf-8")
        self.assertIn("#chica-hunt-dock", css)
        self.assertRegex(css, r"#chica-hunt-dock\s*\{[^}]*left:\s*62px[^}]*right:\s*88px")
        self.assertIn("#chica-mini", (ROOT / "webapp/map/index.html").read_text(encoding="utf-8"))

    def test_primary_map_controls_have_touch_sized_targets(self):
        css = (ROOT / "webapp/css/finish.css").read_text(encoding="utf-8")
        self.assertRegex(css, r"#chica-hunt-bar input,\s*#chica-hunt-bar button\s*\{\s*height:\s*44px")
        self.assertRegex(css, r"#chica-share-dock a,\s*#chica-share-dock button\s*\{[^}]*min-width:\s*44px[^}]*min-height:\s*44px")
        self.assertRegex(css, r"\.leaflet-control-zoom a\s*\{[^}]*width:\s*44px[^}]*height:\s*44px")

    def test_sale_detail_card_respects_bottom_safe_area(self):
        source = (ROOT / "webapp/js/pin-details.js").read_text(encoding="utf-8")
        self.assertIn("bottom:max(12px,env(safe-area-inset-bottom))", source)
        self.assertIn("min-height:44px", source)


if __name__ == "__main__":
    unittest.main()
