from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_live_site_uses_garage_sale_as_the_only_garage_yard_category():
    homepage = (ROOT / "webapp/index.html").read_text().lower()
    copy = (ROOT / "webapp/js/chica-copy.js").read_text().lower()
    listing = (ROOT / "webapp/list/index.html").read_text().lower()
    submission = (ROOT / "webapp/submit/index.html").read_text().lower()

    assert "garage, yard, and estate" not in homepage
    assert "garage, yard, and estate" not in copy
    assert "garage, yard, and estate" not in listing
    assert "garage sales and estate sales" in listing
    assert "yard sales" not in submission


def test_list_page_normalizes_legacy_yard_sale_labels():
    listing = (ROOT / "webapp/list/index.html").read_text()
    assert 'rawKind === "estate"' in listing
    assert '? "Estate Sale"' in listing
    assert ': "Garage Sale"' in listing


def test_app_source_hides_yard_as_a_separate_filter_and_normalizes_legacy_data():
    route = (ROOT / "app/src/routes/list.tsx").read_text()
    sales = (ROOT / "app/src/lib/sales.ts").read_text()

    assert '<option value="yard">' not in route
    assert 'export type SaleKind = "garage" | "estate" | "permit";' in sales
    assert 'return [...feed.public, ...feed.permits].map(normalizeSale);' in sales


def test_map_guide_and_boost_form_use_garage_sale_as_single_category():
    guide = (ROOT / "webapp/js/map-guide.js").read_text().lower()
    boost = (ROOT / "webapp/boost/index.html").read_text().lower()

    assert "garage or yard sale" not in guide
    assert "garage sale." in guide
    assert '<option value="yard">' not in boost
    assert 'garage: "venta de garage"' in boost
    assert 'yard: "venta de patio' not in boost


def test_app_metadata_and_city_permit_titles_use_garage_sale_wording():
    app_root = (ROOT / "app/src/routes/__root.tsx").read_text().lower()
    permit_fetcher = (ROOT / "webapp/scripts/fetch_permits.py").read_text().lower()

    assert "garage sales, yard sales, and estate sales" not in app_root
    assert 'title = "city-permitted garage / yard sale"' not in permit_fetcher
    assert 'title = "city-permitted garage sale"' in permit_fetcher
