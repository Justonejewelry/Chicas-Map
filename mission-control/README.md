# Chica Mission Control

Local-first desktop **and browser** operations center for the Chicas Map (GSIN) project.

## Purpose

One operational view of:

- Repository health and Sentinel diagnostics
- Map / data file intelligence
- Git status
- Swarm agent roles
- Command queue
- macOS Mail scan + contacts (Electron on macOS)

## What is new in v0.2

- Modern UI — sidebar navigation, glass panels, live metrics strip, pulse status
- Tabbed workflow — Overview, Diagnostics, Email and Leads, Swarm, Git, Command
- Browser mock mode — `npm run dev` works without Electron (demo data)
- Fixed Electron startup — `VITE_DEV_SERVER_URL` + production `dist/` load
- Apple Silicon + Intel DMG targets
- Cleaner, maintainable React source (no single-line minified blob)

## Run (browser — fastest)

```bash
cd mission-control
npm install
npm run dev
```

Open http://127.0.0.1:5173 — mock APIs so you can explore the UI without Mail/Git bridges.

## Run (Electron desktop)

```bash
cd mission-control
npm install
npm run dev:electron
```

Requires Node 18+. Mail features need **macOS** and permission to control Mail.app.

## Production build

```bash
npm run build          # web assets to dist/
npm run build:mac      # DMG (x64 + arm64)
npm start              # launch Electron against dist/
```

## Structure

```
mission-control/
  electron/main.cjs    # main process, git, diagnostics, Mail, PDF
  electron/preload.cjs # secure renderer bridge
  src/main.jsx         # React dashboard
  src/styles.css       # design system
  index.html
  vite.config.js
  package.json
```

Mission Control stays separate from the public map in `app/` / `webapp/`.

## Keyboard

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + Enter | Run mission |
| Cmd/Ctrl + Shift + D | Full diagnostics |
| Esc | Clear command output |
