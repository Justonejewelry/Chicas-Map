# Chica Mission Control

Local-first desktop operations center for the Chicas Map project.

## Purpose

Mission Control provides one operational view of repository health, map intelligence, Git status, swarm roles, and the mission queue.

## Current structure

- `package.json` — Electron/Vite application scripts and dependencies
- `electron/main.cjs` — desktop process and safe local system bridge
- `electron/preload.cjs` — renderer API boundary
- `src/` — React dashboard

## Run locally

```bash
cd mission-control
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Mission Control is intentionally separate from the public map application in `app/`.
