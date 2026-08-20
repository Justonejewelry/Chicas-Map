#!/usr/bin/env python3
"""Chica's Map community-event scout.

A source-registry + scoring pipeline. It intentionally does not invent events:
only records discovered URLs/data, scores candidates, deduplicates them, and
writes a review report. Add approved source adapters as they become available.
"""
import json, hashlib, re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
FEED=ROOT/'webapp/data/community-events.json'
REPORT=ROOT/'reports/community-events-latest.md'
SOURCES=ROOT/'config/community-event-sources.json'


def fetch(url):
    req=Request(url,headers={'User-Agent':"Chica's Map Community Events Scout/1.0"})
    with urlopen(req,timeout=15) as r:
        return r.read().decode('utf-8','ignore')


def clean(s):
    return re.sub(r'\s+',' ',re.sub('<[^>]+>',' ',s or '')).strip()


def main():
    cfg=json.loads(SOURCES.read_text())
    existing=json.loads(FEED.read_text()) if FEED.exists() else []
    if isinstance(existing,dict): existing=existing.get('events',[])
    seen={e.get('sourceUrl') or e.get('url') for e in existing}
    candidates=[]; errors=[]

    for source in cfg.get('sources',[]):
        try:
            body=fetch(source['url'])
            # Generic discovery signal: URLs mentioning event-like paths/titles.
            urls=re.findall(r'https?://[^\s"\'<>]+',body)
            hits=[u.rstrip('.,);]') for u in urls if any(k in u.lower() for k in ('event','calendar','festival','concert','market','community'))]
            for u in hits[:100]:
                if u in seen: continue
                candidates.append({'source':source['name'],'sourceUrl':u,'discoveredAt':datetime.now(timezone.utc).isoformat(),'score':source.get('priority',1)})
        except Exception as exc:
            errors.append(f"{source['name']}: {exc}")

    # Keep the public feed authoritative: discoveries go to report/review, not straight to map.
    candidates.sort(key=lambda x:(-x['score'],x['sourceUrl']))
    lines=['# Chica’s Map — Daily Community Events Swarm', '',f"Run: {datetime.now(timezone.utc).isoformat()}",'',f"Candidates discovered: **{len(candidates)}**",f"Source errors: **{len(errors)}**",'', '## Review Queue']
    for c in candidates[:200]:
        lines.append(f"- **{c['source']}** — {c['sourceUrl']} — score {c['score']}")
    if errors:
        lines += ['', '## Source Errors'] + [f'- {e}' for e in errors]
    REPORT.parent.mkdir(parents=True,exist_ok=True); REPORT.write_text('\n'.join(lines)+'\n')

if __name__=='__main__': main()
