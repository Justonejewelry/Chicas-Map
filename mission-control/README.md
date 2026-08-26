# Chica Mission Control

Operations center for Chicas Map (GSIN).

## Quick start (easiest)

From the **repo root**:

```bash
./start-mission-control
```

Or from this folder:

```bash
./run
```

That installs dependencies if needed and opens the app in your browser at **http://127.0.0.1:5173**.

### Desktop app (Mail, live Git, GitHub Actions)

```bash
./start-mission-control desktop
# or
./run-desktop
```

Requires Node 18+ and (for Mail) macOS.

## npm equivalents

| Command | What it does |
|---------|----------------|
| `npm start` | Browser UI (auto-installs if needed) |
| `npm run start:desktop` | Electron + Vite |
| `npm run build` | Production web build |
| `npm run build:mac` | Mac DMG |

## First-time notes

1. Install [Node.js 18+](https://nodejs.org) if you do not have it.
2. Browser mode works immediately (mock data when not in Electron).
3. Desktop mode needs Electron (downloaded on first `start:desktop`).
4. GitHub Actions tab: paste a classic PAT with `repo` + `workflow` scopes.
5. Email scan (21-day body extraction): desktop on macOS + Mail permission.

## Tabs

Overview · Diagnostics · Email & Leads · **Layers** · **Actions** · Swarm · Git · Command
