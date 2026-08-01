# Scout Agent — Public Web Discovery Queries
Project YardBird / Atlas  •  2026-08-01

Scout runs targeted public search queries (Google/Bing) during high-yield windows.
Results are handed to Scholar → Compass → Latitude → CrossChecker → Mirror → Sentinel.

## Core Query Set (San Antonio)

```
"garage sale" OR "yard sale" OR "estate sale" "San Antonio" (this weekend OR Saturday OR Sunday)
"garage sale" OR "yard sale" site:yardsalesearch.com "San Antonio"
"garage sale" OR "yard sale" site:garagesalefinder.com "San Antonio"
"estate sale" "San Antonio" (this weekend OR Saturday)
"garage sale" (Alamo Ranch OR Stone Oak OR Helotes OR Boerne OR Schertz OR "Terrell Hills")
```

## Cadence
- Thursday evening: weekend inventory seed
- Friday morning + evening: surge capture
- Saturday 05:30–08:00: live confirmation

## Rules
- Public results only
- Rate-limit aggressively
- Prefer results with addresses or clear location signals
- Feed everything through the standard verification pipeline
