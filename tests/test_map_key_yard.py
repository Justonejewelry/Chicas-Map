from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_yard_and_garage_sales_share_one_garage_category():
    key = (ROOT / "webapp/js/force-key.js").read_text()
    actions = (ROOT / "webapp/js/key-clicks.js").read_text()
    live_map = (ROOT / "webapp/js/chica-live-map.js").read_text()
    assert '["garage", "Garage"]' in key
    assert '["yard", "Yard"]' not in key
    assert 'id === "yard"' not in actions
    assert 't === "yard" || t === "yardsale" || t === "garagesale" ? "garage"' in live_map
    assert '"garage sale yard sale"' in live_map
    assert '".leaflet-marker-icon.chica-type-" + id' in actions


def test_both_map_entry_points_use_fresh_key_scripts():
    for path in ("webapp/map/index.html", "webapp/map.html"):
        html = (ROOT / path).read_text()
        assert "key-clicks.js?v=19" in html
        assert "force-key.js?v=13" in html
