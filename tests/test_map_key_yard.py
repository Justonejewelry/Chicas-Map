from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_map_key_exposes_yard_sales_and_wires_the_filter():
    key = (ROOT / "webapp/js/force-key.js").read_text()
    actions = (ROOT / "webapp/js/key-clicks.js").read_text()
    assert '["yard", "Yard"]' in key
    assert "yard: '<svg" in key
    assert 'id === "yard"' in actions
    assert '"garage", "yard", "estate"' in actions
    assert '".leaflet-marker-icon.chica-type-" + id' in actions


def test_both_map_entry_points_use_fresh_key_scripts():
    for path in ("webapp/map/index.html", "webapp/map.html"):
        html = (ROOT / path).read_text()
        assert "key-clicks.js?v=18" in html
        assert "force-key.js?v=12" in html
