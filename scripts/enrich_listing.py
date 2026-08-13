#!/usr/bin/env python3
"""
Chica Map — Deep Link Following / Listing Enricher

Takes a candidate sale that already has an original_url (or source_urls)
and follows the individual listing page to extract better title, description,
times, photos, and contact notes when available.

Respects rate limits. Never invents data. Leaves fields blank when not found.
"""

from __future__ import annotations

import html as html_mod
import re
import time
import urllib.error
import urllib.request
from typing import Any
from urllib.parse import urljoin, urlparse

UA = (
    "Mozilla/5.0 (compatible; YardBirdBot/1.0; "
    "+https://github.com/Justonejewelry/Chicas-Map)"
)

# Polite delay between detail-page requests
REQUEST_DELAY_SEC = 1.4


def _fetch(url: str, timeout: int = 18) -> str | None:
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"    enrich fetch fail {url[:70]}… → {type(e).__name__}: {e}")
        return None


def _clean(text: str) -> str:
    text = html_mod.unescape(text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _first(patterns: list[str], html: str, flags: int = re.I | re.S) -> str:
    for pat in patterns:
        m = re.search(pat, html, flags)
        if m:
            return _clean(m.group(1))
    return ""


def enrich_from_html(html: str, base_url: str) -> dict[str, Any]:
    """Extract useful fields from a detail page. Only returns what is found."""
    out: dict[str, Any] = {}

    # Title
    title = _first(
        [
            r"<h1[^>]*>(.*?)</h1>",
            r'property="og:title"\s+content="([^"]+)"',
            r"<title>(.*?)</title>",
        ],
        html,
    )
    if title:
        title = re.split(r"\s*[|\-–—]\s*(GarageSaleFinder|YardSale|Craigslist|EstateSales)", title)[0].strip()
        if 8 < len(title) < 160:
            out["title"] = title

    # Description / body
    desc = _first(
        [
            r'class="[^"]*sale-description[^"]*"[^>]*>(.*?)</div>',
            r'class="[^"]*description[^"]*"[^>]*>(.*?)</div>',
            r'id="postingbody"[^>]*>(.*?)</section>',
            r'id="postingbody"[^>]*>(.*?)</div>',
            r'property="og:description"\s+content="([^"]+)"',
            r'name="description"\s+content="([^"]+)"',
        ],
        html,
    )
    if desc and len(desc) > 30:
        out["description"] = desc[:500]

    # Times (very loose)
    time_blob = _first(
        [
            r"(?:hours?|time)[:\s]*([0-9]{1,2}\s*(?:am|pm).*?[0-9]{1,2}\s*(?:am|pm))",
            r"(\d{1,2}:\d{2}\s*(?:am|pm)\s*[-–to]+\s*\d{1,2}:\d{2}\s*(?:am|pm))",
        ],
        html,
    )
    if time_blob:
        out["time_text"] = time_blob

    # Photos
    photos: list[str] = []
    for m in re.finditer(r'<img[^>]+src="([^"]+)"', html, re.I):
        src = m.group(1)
        if any(x in src.lower() for x in ("logo", "icon", "sprite", "pixel", "avatar", "blank")):
            continue
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = urljoin(base_url, src)
        if src.startswith("http") and src not in photos:
            photos.append(src)
        if len(photos) >= 6:
            break
    if photos:
        out["photos"] = photos

    # Structured address hints
    addr = _first(
        [
            r'itemprop="streetAddress"[^>]*>(.*?)<',
            r'class="[^"]*sale-address[^"]*"[^>]*>(.*?)<',
            r'class="[^"]*address[^"]*"[^>]*>(.*?)<',
        ],
        html,
    )
    if addr and any(c.isdigit() for c in addr) and len(addr) > 8:
        out["address_hint"] = addr

    return out


def enrich_sale(sale: dict[str, Any], delay: float = REQUEST_DELAY_SEC) -> dict[str, Any]:
    """
    Follow original_url (or first source_url) and merge better data into the sale dict.
    Mutates and returns the sale.
    """
    url = (sale.get("original_url") or "").strip()
    if not url:
        urls = sale.get("source_urls") or []
        url = urls[0] if urls else ""
    if not url or not url.startswith("http"):
        return sale

    if (sale.get("description") or "") and len(sale.get("description") or "") > 120 and sale.get("photos"):
        return sale

    print(f"    following → {url[:80]}")
    html = _fetch(url)
    time.sleep(delay)
    if not html:
        return sale

    extracted = enrich_from_html(html, url)

    if extracted.get("title") and (
        not sale.get("title")
        or len(extracted["title"]) > len(sale.get("title") or "") + 5
    ):
        sale["title"] = extracted["title"]

    if extracted.get("description"):
        existing = sale.get("description") or ""
        if len(extracted["description"]) > len(existing):
            sale["description"] = extracted["description"]

    if extracted.get("photos") and not sale.get("photos"):
        sale["photos"] = extracted["photos"]

    if extracted.get("time_text") and not sale.get("start_time"):
        sale["start_time"] = extracted["time_text"]

    if extracted.get("address_hint") and (
        not sale.get("address") or len(sale.get("address") or "") < 10
    ):
        sale["address"] = extracted["address_hint"]

    conf = int(sale.get("confidence") or 70)
    sale["confidence"] = min(100, conf + 4)

    if not sale.get("original_url"):
        sale["original_url"] = url

    return sale


def enrich_batch(sales: list[dict[str, Any]], max_follow: int = 40) -> list[dict[str, Any]]:
    """Enrich up to max_follow sales that have a followable URL."""
    followed = 0
    for s in sales:
        if followed >= max_follow:
            break
        url = (s.get("original_url") or (s.get("source_urls") or [None])[0] or "")
        if not url or not str(url).startswith("http"):
            continue
        enrich_sale(s)
        followed += 1
    print(f"  deep-followed {followed} listing pages")
    return sales


if __name__ == "__main__":
    sample = {
        "title": "Garage Sale",
        "original_url": "https://garagesalefinder.com/yard-sales/san-antonio-tx/",
        "confidence": 72,
    }
    print(enrich_sale(sample))
