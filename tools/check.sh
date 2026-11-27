#!/usr/bin/env bash
# Checks Dustbox the same way the CI does:
# 1) every script in index.html (js/ and kits/) exists and parses, 2) the page loads in headless Chrome without errors.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Checking scripts…"
scripts=$(grep -oE 'src="(js|kits)/[^"]*"' index.html | sed 's/src="//;s/"$//')
for f in $scripts; do
  [ -f "$f" ] || { echo "Missing: $f (listed in index.html)"; exit 1; }
  node --check "$f"
done
for f in js/*.js kits/*.js; do
  echo "$scripts" | grep -qx "$f" || { echo "Not loaded by index.html: $f"; exit 1; }
done
cat $scripts > /tmp/dustbox-all.js && node --check /tmp/dustbox-all.js
echo "Scripts OK"

CHROME=$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)
if [ -z "$CHROME" ]; then echo "Chrome not found: skipping the page load test"; exit 0; fi

echo "Loading the page in headless Chrome…"
PORT=8765
python3 -m http.server $PORT >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1
"$CHROME" --headless=new --no-sandbox --disable-gpu --autoplay-policy=no-user-gesture-required \
  --enable-logging=stderr --v=0 --virtual-time-budget=8000 \
  --dump-dom "http://localhost:$PORT/index.html" > /tmp/dustbox-dom.html 2> /tmp/dustbox-chrome.log || true
if grep -E 'CONSOLE.*"(Uncaught|.*Error)' /tmp/dustbox-chrome.log | grep -v -i deprecat; then
  echo "The page logged errors (above)"; exit 1
fi
grep -q 'Kick' /tmp/dustbox-dom.html || { echo "The starter kit didn't render"; exit 1; }
echo "Page OK"
