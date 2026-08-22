#!/usr/bin/env python3
"""Parse event dates, ranges, and times from messy municipal/aggregator text."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

ISO_RE = re.compile(r"\b(20[2-3]\d)-([01]\d)-([0-3]\d)\b")
US_NUM_RE = re.compile(r"\b([01]?\d)/([0-3]?\d)/(20[2-3]\d|\d{2})\b")
MONTH_DAY_YEAR_RE = re.compile(
    r"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\.?\s+([0-3]?\d)(?:st|nd|rd|th)?(?:,)?\s+(20[2-3]\d)\b",
    re.I,
)
MONTH_DAY_RE = re.compile(
    r"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\.?\s+([0-3]?\d)(?:st|nd|rd|th)?\b",
    re.I,
)
RANGE_SEP_RE = re.compile(r"\s*(?:–|—|-|to|through|thru)\s*", re.I)
TIME_RE = re.compile(
    r"\b([0-1]?\d|2[0-3])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b",
    re.I,
)
TIME_RANGE_RE = re.compile(
    r"\b([0-1]?\d|2[0-3])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?"
    r"\s*(?:–|—|-|to)\s*"
    r"([0-1]?\d|2[0-3])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b",
    re.I,
)


def today_ct() -> date:
    return datetime.now(CT).date()


def _safe_date(y: int, m: int, d: int) -> Optional[date]:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def _year_from_token(tok: str) -> int:
    y = int(tok)
    if y < 100:
        y += 2000
    return y


def parse_single_date(text: str, default_year: int | None = None) -> Optional[date]:
    """Parse the first date found in text. Returns None if nothing valid."""
    if not text:
        return None
    s = str(text).strip()
    default_year = default_year or today_ct().year

    m = ISO_RE.search(s)
    if m:
        return _safe_date(int(m.group(1)), int(m.group(2)), int(m.group(3)))

    m = MONTH_DAY_YEAR_RE.search(s)
    if m:
        month = MONTHS[m.group(1).lower().rstrip(".")]
        return _safe_date(int(m.group(3)), month, int(m.group(2)))

    m = US_NUM_RE.search(s)
    if m:
        return _safe_date(_year_from_token(m.group(3)), int(m.group(1)), int(m.group(2)))

    m = MONTH_DAY_RE.search(s)
    if m:
        month = MONTHS[m.group(1).lower().rstrip(".")]
        d = _safe_date(default_year, month, int(m.group(2)))
        if d and d < today_ct() - timedelta(days=30):
            d = _safe_date(default_year + 1, month, int(m.group(2)))
        return d
    return None


def parse_date_range(text: str) -> tuple[Optional[date], Optional[date]]:
    """Parse start/end from strings like '4/17/2026 - 10/2/2026' or 'Aug 22–23, 2026'."""
    if not text:
        return None, None
    s = re.sub(r"\s+", " ", str(text))

    # Full dates on both sides
    parts = RANGE_SEP_RE.split(s, maxsplit=1)
    if len(parts) == 2:
        start = parse_single_date(parts[0])
        end = parse_single_date(parts[1], default_year=(start.year if start else None))
        if start and end and end < start:
            end = _safe_date(start.year + 1, end.month, end.day)
        if start:
            return start, end

    # Month day–day, year  e.g. August 22-23, 2026
    m = re.search(
        r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\.?\s+([0-3]?\d)(?:st|nd|rd|th)?\s*(?:–|—|-)\s*([0-3]?\d)(?:st|nd|rd|th)?(?:,)?\s+(20[2-3]\d)",
        s,
        re.I,
    )
    if m:
        month = MONTHS[m.group(1).lower().rstrip(".")]
        year = int(m.group(4))
        start = _safe_date(year, month, int(m.group(2)))
        end = _safe_date(year, month, int(m.group(3)))
        return start, end

    one = parse_single_date(s)
    return one, None


def parse_time_label(text: str) -> str:
    """Return a compact time string if present, else empty."""
    if not text:
        return ""
    m = TIME_RANGE_RE.search(text)
    if m:
        left_ampm = (m.group(3) or m.group(6) or "").replace(".", "").upper()
        right_ampm = (m.group(6) or "").replace(".", "").upper()
        lh, lm = m.group(1), m.group(2) or "00"
        rh, rm = m.group(4), m.group(5) or "00"
        return f"{int(lh)}:{lm} {left_ampm}–{int(rh)}:{rm} {right_ampm}".strip()
    m = TIME_RE.search(text)
    if m:
        ampm = m.group(3).replace(".", "").upper()
        return f"{int(m.group(1))}:{(m.group(2) or '00')} {ampm}"
    return ""


def to_iso(d: Optional[date]) -> str:
    return d.isoformat() if d else ""


def normalize_event_dates(raw_date: str, raw_end: str = "") -> tuple[str, str]:
    """Normalize free-text date fields to YYYY-MM-DD."""
    blob = " ".join(x for x in (raw_date, raw_end) if x)
    start, end = parse_date_range(blob)
    if not start and raw_date:
        start = parse_single_date(raw_date)
    if not end and raw_end:
        end = parse_single_date(raw_end)
    return to_iso(start), to_iso(end)


def extract_dated_blocks(text: str) -> list[dict]:
    """
    Find title-ish snippets that sit next to a parseable date.
    Used on cleaned listing-page text (Parks / Visit SA style).
    """
    if not text:
        return []
    s = re.sub(r"\s+", " ", text)
    hits: list[dict] = []
    seen = set()

    patterns = [ISO_RE, MONTH_DAY_YEAR_RE, US_NUM_RE]
    for pat in patterns:
        for m in pat.finditer(s):
            window_start = max(0, m.start() - 160)
            window_end = min(len(s), m.end() + 120)
            window = s[window_start:window_end]
            start, end = parse_date_range(window)
            if not start:
                start = parse_single_date(m.group(0))
            if not start:
                continue
            before = s[window_start:m.start()].strip(" -–—|,;:")
            # Last 4–12 words before the date as a provisional title
            words = [w for w in re.split(r"\s+", before) if w]
            title = " ".join(words[-10:]).strip(" -–—|,;:")
            title = re.sub(r"^(Learn More|Upcoming Events|News & Events)\s+", "", title, flags=re.I)
            if len(title) < 8:
                continue
            key = (title.lower()[:48], start.isoformat())
            if key in seen:
                continue
            seen.add(key)
            hits.append({
                "title": title[:120],
                "date": start.isoformat(),
                "endDate": to_iso(end),
                "time": parse_time_label(window),
                "snippet": window[:240],
            })
    return hits
