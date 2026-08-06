#!/bin/bash
# Chica — Social pack helper (Facebook / Instagram / TikTok)
# Usage:
#   ./scripts/content-packs/post-social.sh facebook
#   ./scripts/content-packs/post-social.sh instagram
#   ./scripts/content-packs/post-social.sh tiktok
#   ./scripts/content-packs/post-social.sh facebook packs/2026-08-09-Saturday/pack.md

set -e

PLATFORM=$(echo "$1" | tr '[:upper:]' '[:lower:]')
PACK_FILE="$2"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PACKS_DIR="$REPO_ROOT/packs"

if [ -z "$PLATFORM" ]; then
  echo "Usage: $0 [facebook|instagram|tiktok] [/path/to/pack.md]"
  exit 1
fi

# Find pack file
if [ -n "$PACK_FILE" ]; then
  :
else
  PACK_FILE=$(find "$PACKS_DIR" -name "pack.md" -type f 2>/dev/null | sort | tail -1)
fi

if [ -z "$PACK_FILE" ] || [ ! -f "$PACK_FILE" ]; then
  echo "No pack.md found under $PACKS_DIR"
  exit 1
fi

echo "Using pack: $PACK_FILE"
echo "Platform:   $PLATFORM"
echo ""

# Extract the correct section
TEXT=$(python3 - <<EOF
import re, sys
with open("$PACK_FILE", "r", encoding="utf-8") as f:
    content = f.read()

platform = "$PLATFORM"
headings = {
    "facebook": r"Facebook",
    "instagram": r"Instagram",
    "tiktok": r"TikTok|Tic\s*Toc|Tik\s*Tok",
}

pattern = headings.get(platform)
if not pattern:
    print(f"ERROR: Unknown platform '{platform}'", file=sys.stderr)
    sys.exit(1)

match = re.search(rf'^#{{2,3}}\s*(?:{pattern})\b.*?\n(.*?)(?=^#{{2,3}}\s|\Z)', content, re.S | re.M | re.I)
if not match:
    print(f"ERROR: No ## {platform.title()} section found in pack.", file=sys.stderr)
    sys.exit(1)

text = match.group(1).strip()
text = re.sub(r'^```.*?\n', '', text)
text = re.sub(r'\n```$', '', text)
print(text)
EOF
)

if [ $? -ne 0 ]; then
  echo "$TEXT"
  exit 1
fi

# Copy to clipboard (macOS)
if command -v pbcopy >/dev/null 2>&1; then
  echo "$TEXT" | pbcopy
  echo "✓ $PLATFORM post copied to clipboard"
else
  echo "Note: pbcopy not available (not macOS). Text printed below."
fi

echo ""
echo "Preview:"
echo "----------------------------------------"
echo "$TEXT"
echo "----------------------------------------"
echo ""

# Open the right destination (macOS open / Linux xdg-open)
open_cmd="open"
if ! command -v open >/dev/null 2>&1; then
  open_cmd="xdg-open"
fi

case "$PLATFORM" in
  facebook)
    $open_cmd "https://www.facebook.com/" 2>/dev/null || true
    echo "✓ Facebook opened"
    echo "1. Switch to posting as Chica Page if needed"
    echo "2. Click the composer → ⌘V → review → Post"
    ;;
  instagram)
    $open_cmd "https://www.instagram.com/" 2>/dev/null || true
    echo "✓ Instagram opened"
    echo "1. Click + Create (or use mobile app)"
    echo "2. Paste caption with ⌘V"
    echo "3. Add the Firefly video/image and share"
    ;;
  tiktok)
    $open_cmd "https://www.tiktok.com/tiktokstudio/upload" 2>/dev/null || true
    echo "✓ TikTok Studio upload page opened"
    echo "1. Upload or select your Firefly video"
    echo "2. Paste the caption with ⌘V"
    echo "3. Add sounds/hashtags if needed and post"
    ;;
esac
