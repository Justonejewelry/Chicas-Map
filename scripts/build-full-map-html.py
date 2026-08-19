#!/usr/bin/env python3
"""Build a self-contained webapp/map.html from the known-good pinned core."""
from pathlib import Path
import re
import urllib.request

PINNED = (
    "https://cdn.jsdelivr.net/gh/Justonejewelry/Chicas-Map@"
    "5e21ee7d2857944983914be34dc19babe4d56e85/webapp/map.html"
)

def main() -> None:
    print("Fetching", PINNED)
    with urllib.request.urlopen(PINNED, timeout=60) as resp:
        html = resp.read().decode("utf-8")

    reps = [
        ('href="favicon-32.png"', 'href="chica-favicon.svg"'),
        ('href="apple-touch-icon.png"', 'href="chica-favicon.svg"'),
        ("css/app.css?v=pin1", "css/app.css?v=pin2"),
        ("css/map-clean.css?v=mapfirst3", "css/map-clean.css?v=mapfirst4"),
        ("css/map-rail.css?v=mapfirst3", "css/map-rail.css?v=motion4"),
        ("css/map-sidebar.css?v=sidebar1", "css/map-sidebar.css?v=sidebar2"),
        ("css/map-tools-depth.css?v=depth1", "css/map-tools-depth.css?v=depth3"),
        ("css/boost-pins.css?v=hover2", "css/boost-pins.css?v=hover3"),
        ("js/boost-pins.js?v=hover2", "js/boost-pins.js?v=hover3"),
        ("js/layers-rail.js?v=depth1", "js/layers-rail.js?v=motion4"),
        ("js/public-wifi-layer.js", "js/public-wifi-layer.js?v=wifi7"),
        ("js/food-pantry-layer.js", "js/food-pantry-layer.js?v=pantry4"),
        ("js/chica-go-force.js?v=closest2", "js/chica-go-force.js?v=closest3"),
        ('content="#1a6b3c"', 'content="#c513b8"'),
    ]
    for a, b in reps:
        html = html.replace(a, b)

    extra_css = (
        '  <link rel="stylesheet" href="css/cls-force.css?v=cls1" />\n'
        '  <link rel="stylesheet" href="css/map-bottom-details.css?v=bd1" />\n'
        '  <link rel="stylesheet" href="css/site-nav.css?v=20260818" />\n'
    )
    if "cls-force.css" not in html:
        html = html.replace("</head>", extra_css + "</head>")

    if "expose-map.js" not in html:
        html = html.replace(
            '<script src="js/app.js"></script>',
            '<script src="js/expose-map.js?v=exp1"></script>\n  <script src="js/app.js"></script>',
        )

    if "preferred-overlay" not in html:
        html = html.replace(
            '<script src="js/user-overlay.js"></script>',
            '<script src="js/user-overlay.js"></script>\n  <script src="js/preferred-overlay.js?v=pref1"></script>',
        )

    layer_stack = (
        '  <script src="js/layer-worker-client.js?v=lw1"></script>\n'
        '  <script src="js/downtown-parking-layer.js?v=park1"></script>\n'
        '  <script src="js/emergency-info-layer.js?v=em1"></script>\n'
        '  <script src="js/zone-aware-layer.js?v=zone5"></script>\n'
        '  <script src="js/traffic-school-road-approach.js?v=1"></script>\n'
        '  <script src="js/bexar-gis-paginator.js?v=1"></script>\n'
        '  <script src="js/bexar-school-count.js?v=1"></script>\n'
    )
    if "downtown-parking-layer" not in html:
        html = html.replace(
            '<script src="js/food-pantry-layer.js?v=pantry4"></script>',
            layer_stack + '  <script src="js/food-pantry-layer.js?v=pantry4"></script>',
        )

    post_rail = (
        '  <script src="js/layer-timing-force.js?v=lt2"></script>\n'
        '  <script src="js/map-bottom-details.js?v=bd1"></script>\n'
        '  <script src="js/chica-ux-pack.js?v=ux1"></script>\n'
        '  <script src="js/zone-honesty.js?v=zh1"></script>\n'
        '  <script src="js/chica-config.js?v=cfg1"></script>\n'
        '  <script src="js/chica-analytics.js?v=an1"></script>\n'
        '  <script src="js/web-vitals-monitor.js?v=cwv1"></script>\n'
        '  <script src="js/site-nav.js?v=20260818"></script>\n'
    )
    if "layer-timing-force.js" not in html:
        html = html.replace(
            '<script src="js/layers-rail.js?v=motion4"></script>',
            '<script src="js/layers-rail.js?v=motion4"></script>\n' + post_rail,
        )

    html = re.sub(r'<a[^>]*id=["\']dockHome["\'][^>]*>[\s\S]*?</a>', "", html)
    html = re.sub(r'<a[^>]*class=["\'][^"\']*dock-home[^"\']*["\'][^>]*>[\s\S]*?</a>', "", html)

    out = Path("webapp/map.html")
    out.write_text(html)
    print("Wrote", out, "bytes", out.stat().st_size)
    assert "layer-timing-force" in html
    assert "cls-force" in html
    assert "map-rail.css?v=motion4" in html
    print("OK self-contained map.html")

if __name__ == "__main__":
    main()
