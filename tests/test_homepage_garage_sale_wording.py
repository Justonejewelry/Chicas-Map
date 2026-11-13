from pathlib import Path


def test_homepage_uses_garage_sale_as_the_category_name():
    html = (Path(__file__).resolve().parents[1] / "webapp/index.html").read_text()
    assert "Find garage sales and estate sales near you" in html
    assert "map of garage sales and estate sales" in html
    assert "yard sales" not in html.lower()
