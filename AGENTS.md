# Agent notes

## Cursor Cloud — Ports View

Ikigai is a Next.js app in `ikigai/`. Preview it from **Ports View**, not by guessing a URL.

1. Start the app: `cd ikigai && npm run dev` (listens on `0.0.0.0:3000`).
2. Open the command palette → **Ports: Focus on Ports View**.
3. Port **3000** is labeled **Ikigai**. Open it in the Simple Browser / forwarded preview.

Do not put the dev server in `install` — that phase must exit. The long-running process belongs in `.cursor/environment.json` `terminals`, with port `3000` declared under `ports`.
