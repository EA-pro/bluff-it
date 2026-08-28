#!/usr/bin/env bash
#
# deploy-gh-pages.sh — build the web export and publish to GitHub Pages.
#
# Result: a permanent URL that works on any phone even when this PC is off:
#   https://EA-pro.github.io/bluff-it/
#
# Usage:  ./scripts/deploy-gh-pages.sh
#
# One-time repo setup (already done): GitHub repo Pages -> "Deploy from a
# branch" -> branch gh-pages -> root /.
#
set -euo pipefail
cd "$(dirname "$0")/.."

DIST=dist
echo "==> Building web export…"
npx expo export --platform web

# --- 1) Rewrite absolute asset refs to relative (GH Pages serves under /bluff-it/)
python3 - "$DIST/index.html" << 'PY'
import re, sys
html_path = sys.argv[1]
html = open(html_path).read()
html = re.sub(r'(?<=src=)"/_expo/', '"./_expo/', html)
html = re.sub(r'(?<=href=)"/_expo/', '"./_expo/', html)
html = re.sub(r'(?<=src=)"/favicon', '"./favicon', html)
html = re.sub(r'(?<=href=)"/favicon', '"./favicon', html)
open(html_path, "w").write(html)
print("index.html -> relative paths")
PY

# --- 2) Inject PWA head tags (manifest + apple touch icon + theme color)
python3 - "$DIST/index.html" << 'PY'
import sys
html_path = sys.argv[1]
html = open(html_path).read()
tags = ('<link rel="manifest" href="./manifest.json"/>'
        '<link rel="apple-touch-icon" href="./apple-touch-icon.png"/>'
        '<meta name="theme-color" content="#151A2E"/>')
if 'rel="manifest"' not in html:
    html = html.replace('</head>', tags + '</head>')
    open(html_path, "w").write(html)
    print("PWA tags injected")
else:
    print("PWA tags already present")
PY

# --- 3) SPA 404 fallback (refresh on subroutes)
cp "$DIST/index.html" "$DIST/404.html"

echo "==> Verifying…"
grep -q 'src="/_expo/' "$DIST/index.html" && { echo "ERROR: absolute /_expo/ refs remain"; exit 1; }
for f in manifest.json apple-touch-icon.png 404.html index.html; do
  [ -f "$DIST/$f" ] || { echo "ERROR: $f missing"; exit 1; }
done
echo "Build OK."

# --- 4) Commit source changes on the current branch (manifest, icons, this script)
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "web: PWA manifest + apple icon + gh-pages deploy script"
  git push -q origin HEAD
  echo "Source committed + pushed."
fi

# --- 5) Publish to gh-pages (temp dir — never touches the working tree)
ORIGIN_URL=$(git remote get-url origin)
TMP=$(mktemp -d)
echo "==> Publishing to gh-pages (temp: $TMP)…"
cp -r "$DIST/." "$TMP/"
cd "$TMP"
git init -q
git -c user.name="evajonas" -c user.email="evajonas@local" add -A
git -c user.name="evajonas" -c user.email="evajonas@local" commit -q -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -fq "$ORIGIN_URL" HEAD:refs/heads/gh-pages
cd - >/dev/null
rm -rf "$TMP"

echo
echo "==> Done. Live (in ~1 min):  https://EA-pro.github.io/bluff-it/"
echo "    iPhone/Samsung: open that URL, then Share -> Add to Home Screen."
