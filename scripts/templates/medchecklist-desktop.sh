#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=3000
DEBUG_MODE=0

for arg in "$@"; do
  if [ "$arg" = "--debug" ]; then
    DEBUG_MODE=1
  fi
  if [[ "$arg" =~ ^--port=([0-9]+)$ ]]; then
    PORT="${BASH_REMATCH[1]}"
  fi
done

echo "🏥 [MedChecklist] Starting Local Desktop Workstation on port $PORT..."

# Start python3, python, or npx serve
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --directory "$DIR/dist" >/dev/null 2>&1 &
  SERVER_PID=$!
elif command -v python >/dev/null 2>&1; then
  (cd "$DIR/dist" && python -m SimpleHTTPServer "$PORT") >/dev/null 2>&1 &
  SERVER_PID=$!
elif command -v npx >/dev/null 2>&1; then
  npx --yes serve -s "$DIR/dist" -l "$PORT" >/dev/null 2>&1 &
  SERVER_PID=$!
else
  echo "❌ Error: Python 3 or Node.js is required to run the local server."
  exit 1
fi

cleanup() {
  echo -e "\n🛑 Stopping MedChecklist local server..."
  kill $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 0.8
URL="http://localhost:$PORT"
echo "🌐 MedChecklist active at $URL"

# Open in standalone app window if Chrome/Chromium/Brave is installed, otherwise default browser
if command -v chromium >/dev/null 2>&1; then
  if [ "$DEBUG_MODE" -eq 1 ]; then
    chromium --app="$URL" --auto-open-devtools-for-tabs
  else
    chromium --app="$URL"
  fi
elif command -v google-chrome >/dev/null 2>&1; then
  if [ "$DEBUG_MODE" -eq 1 ]; then
    google-chrome --app="$URL" --auto-open-devtools-for-tabs
  else
    google-chrome --app="$URL"
  fi
elif command -v brave >/dev/null 2>&1; then
  brave --app="$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
  wait $SERVER_PID
else
  echo "Please open $URL in your web browser."
  wait $SERVER_PID
fi
