#!/bin/bash
# Chica — one-command local daily flow
# Usage:
#   ./scripts/content-packs/daily.sh
#   ./scripts/content-packs/daily.sh 2026-08-09

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "→ Generating pack..."
if [ -n "$1" ]; then
  python3 "$SCRIPT_DIR/generate-pack.py" --date "$1" --output-dir "$REPO_ROOT/packs"
else
  python3 "$SCRIPT_DIR/generate-pack.py" --output-dir "$REPO_ROOT/packs"
fi

PACK_FILE=$(find "$REPO_ROOT/packs" -name "pack.md" -type f 2>/dev/null | sort | tail -1)

if [ -z "$PACK_FILE" ]; then
  echo "ERROR: No pack.md found after generation"
  exit 1
fi

echo ""
echo "→ Pack ready: $PACK_FILE"
echo ""

if command -v osascript >/dev/null 2>&1; then
  echo "→ Drafting email in Mail.app..."
  osascript "$SCRIPT_DIR/email-pack.applescript" "$PACK_FILE" || true
fi

echo ""
echo "✓ Done."
echo ""
echo "Next (when ready to post):"
echo "  $SCRIPT_DIR/post-social.sh facebook"
echo "  $SCRIPT_DIR/post-social.sh instagram"
echo "  $SCRIPT_DIR/post-social.sh tiktok"
