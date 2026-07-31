# Ikigai 2.0

Private purpose map. Saved on your computer in `data/ikigai-store.json`.

## What it does

1. **What I want** — direction
2. **What I deliver** — what others would own or use
3. **Who needs it** — demand
4. **How I’m rewarded** — the exchange you want
5. **Skills** — have vs lack (editable)
6. **Insights** — connection overlaps + 3–5 ideas (auto or manual)
7. **Notes** — mini journal with map tags, search, date filter
8. **Synthesis** — plain summary of the map

## Persistence

Your answers are saved automatically to:

```
data/ikigai-store.json
```

inside this project folder on your computer. That file survives restarts —
you do **not** need to export every time. (The file is gitignored.)

Also cached in the browser for speed. Disk is the source of truth when you
run `npm run dev` or `npm start` locally.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Overview + ikigai diagram + progress |
| `/map` | Four questions + synthesis |
| `/skills` | Skills you have / lack |
| `/insights` | Connection view + ideas |
| `/timeline` | Chronology from Jan 2025 |
| `/notes` | Tagged mini journal |

## Scripts

- `npm run dev` — Turbopack dev server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
