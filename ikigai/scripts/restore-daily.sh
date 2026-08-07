#!/usr/bin/env bash
set -euo pipefail

# Run from your Ikigai project root in Git Bash:
#   bash scripts/restore-daily.sh
# Or:
#   curl -fsSL https://raw.githubusercontent.com/asady-create/Decision-Helper-/cursor/fix-ikigai-daily-940e/ikigai/scripts/restore-daily.sh | bash

ROOT="$(pwd)"
if [[ ! -f "$ROOT/package.json" ]] || ! grep -q '"name": "ikigai"' "$ROOT/package.json" 2>/dev/null; then
  if [[ -f "$ROOT/ikigai/package.json" ]]; then
    ROOT="$ROOT/ikigai"
    cd "$ROOT"
  else
    echo "Run this inside your Ikigai project folder (the one with package.json)."
    exit 1
  fi
fi

echo "→ Ikigai folder: $ROOT"
BACKUP_DIR="${HOME}/ikigai-backup"
mkdir -p "$BACKUP_DIR"
if [[ -f "$ROOT/data/ikigai-store.json" ]]; then
  cp -f "$ROOT/data/ikigai-store.json" "$BACKUP_DIR/ikigai-store.json"
  echo "→ Backed up data to $BACKUP_DIR/ikigai-store.json"
else
  echo "→ No data/ikigai-store.json found yet (ok if you restore it next)"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "→ Downloading Daily merge + loading fix from Decision-Helper…"
git clone --depth 1 --branch cursor/fix-ikigai-daily-940e https://github.com/asady-create/Decision-Helper-.git "$TMP/dh"

echo "→ Installing Daily code (keeping your data file)…"
cp -R "$TMP/dh/ikigai/src" "$ROOT/"
cp -f "$TMP/dh/ikigai/package.json" "$ROOT/package.json"
cp -f "$TMP/dh/ikigai/package-lock.json" "$ROOT/package-lock.json"
cp -f "$TMP/dh/ikigai/next.config.ts" "$ROOT/next.config.ts" 2>/dev/null || true
cp -f "$TMP/dh/ikigai/tsconfig.json" "$ROOT/tsconfig.json" 2>/dev/null || true
cp -f "$TMP/dh/ikigai/postcss.config.mjs" "$ROOT/postcss.config.mjs" 2>/dev/null || true
cp -f "$TMP/dh/ikigai/eslint.config.mjs" "$ROOT/eslint.config.mjs" 2>/dev/null || true
mkdir -p "$ROOT/scripts"
cp -f "$TMP/dh/ikigai/scripts/restore-daily.sh" "$ROOT/scripts/restore-daily.sh" 2>/dev/null || true
cp -f "$TMP/dh/ikigai/.env.example" "$ROOT/.env.example" 2>/dev/null || true

mkdir -p "$ROOT/data"
if [[ -f "$BACKUP_DIR/ikigai-store.json" ]]; then
  cp -f "$BACKUP_DIR/ikigai-store.json" "$ROOT/data/ikigai-store.json"
  echo "→ Restored your map/notes data"
fi

echo "→ npm install…"
npm install

echo "→ Clearing broken Next.js cache…"
rm -rf "$ROOT/.next"

echo ""
echo "Done. Start the app with:"
echo "  npm run dev"
echo "Then open:"
echo "  http://localhost:3000         (map / notes)"
echo "  http://localhost:3000/daily   (Daily habits + quotes)"
echo "  http://localhost:3000/reflect (Ikigai contemplation)"
echo ""
echo "Optional LLM reflections: copy .env.example → .env.local and set OPENAI_API_KEY"
echo "Reflect works without a key (built-in engine). Hong Kong / region is fine."
echo ""
echo "If Reflect shows Internal Server Error (or the page spins forever):"
echo "  1) Ctrl+C to stop"
echo "  2) rm -rf .next"
echo "  3) npm run dev"
echo "  4) Hard refresh Chrome (Ctrl+Shift+R)"
echo "  5) Open http://localhost:3000/reflect again"
echo ""
echo "If map looks empty after load, Chrome console on localhost:3000:"
echo "  localStorage.removeItem('ikigai:v2'); localStorage.removeItem('ikigai:v2:snapshot'); location.reload()"
