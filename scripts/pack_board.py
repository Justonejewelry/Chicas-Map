#!/usr/bin/env python3
"""Merge one pack-score issue into the shared adventure board.

Accepts name, trail, bones, sniffed, id. Drops addresses and coordinates.
"""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

BOARD = Path("webapp/adventure/board.json")
MAX_BONES = 2000
MAX_SNIFFED = 200

def clean(value, limit):
    text = re.sub(r"[^A-Za-z0-9 .'-]", "", value or "").strip()
    return text[:limit]

def main():
    body = os.environ.get("ISSUE_BODY", "")
    fields = {}
    for line in body.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip().lower()] = value.strip()
    name = clean(fields.get("name", ""), 20)
    trail = clean(fields.get("trail", ""), 24) or "Trail"
    pid = clean(fields.get("id", ""), 24)
    if len(name) < 2 or len(pid) < 6:
        raise SystemExit("score rejected: name or id missing")
    if re.search(r"\d{3,}", name) or "lat" in body.lower() or "address" in body.lower():
        raise SystemExit("score rejected: no addresses on the board")
    try:
        bones = max(0, min(MAX_BONES, int(fields.get("bones", "0"))))
        sniffed = max(0, min(MAX_SNIFFED, int(fields.get("sniffed", "0"))))
    except ValueError:
        raise SystemExit("score rejected: bones")
    board = json.loads(BOARD.read_text())
    pack = [row for row in board.get("pack", []) if row.get("id") != pid]
    pack.append({
        "id": pid,
        "name": name,
        "trail": trail,
        "bones": bones,
        "sniffed": sniffed,
        "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
    pack.sort(key=lambda row: (-row["bones"], row["name"].lower()))
    board["pack"] = pack[:100]
    board["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    board["kind"] = "honor-board"
    BOARD.write_text(json.dumps(board, indent=2) + "\n")
    print(f"posted {name} {bones}")

if __name__ == "__main__":
    main()
