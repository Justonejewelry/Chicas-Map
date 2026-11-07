#!/usr/bin/env python3
"""Regenerate the shared feed, or fail loudly if its output violates sale policy."""
import argparse,json
from datetime import date
from pathlib import Path
from sales_quality import build,clean,validate,today_ct

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('root',nargs='?',type=Path,default=Path('webapp'));parser.add_argument('--today',type=date.fromisoformat);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    today=args.today or today_ct()
    if args.check:
        data=json.loads((args.root/'data/sales-clean.json').read_text());validate(data,today)
        expected,_ = clean(args.root,today)
        if data != expected: raise ValueError("SALE QUALITY FAIL: shared output is stale versus raw city/email/Facebook inputs; regenerate before publishing")
        print(f'SALE QUALITY CHECK PASS: {data["total_locations"]} upcoming, {data["today_count"]} today; no duplicates, expired dates, outside-metro or non-sale records.')
    else:build(args.root,today)
