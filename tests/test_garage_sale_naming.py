from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_yard_and_garage_sale_types_share_one_map_category():
    live_map = (ROOT / "webapp/js/chica-live-map.js").read_text()
    assert 'type === "estate" || type === "permit" ? type : "garage"' in live_map
    assert 't === "yard" || t === "yardsale" || t === "garagesale" ? "garage"' in live_map
    assert '"garage sale yard sale"' in live_map


def test_submission_and_legacy_labels_use_garage_sale_wording():
    submit = (ROOT / "app/src/routes/submit.tsx").read_text()
    sales = (ROOT / "app/src/lib/sales.ts").read_text()
    assert "Share your garage or estate sale" in submit
    assert '<option value="yard">' not in submit
    assert 'kind === "yard"' not in sales


def test_both_map_entry_points_load_the_unified_sale_normalizer():
    for path in ("webapp/map/index.html", "webapp/map.html"):
        html = (ROOT / path).read_text()
        assert "chica-live-map.js?v=50" in html
