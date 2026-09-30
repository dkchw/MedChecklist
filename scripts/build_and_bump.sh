#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# 1. Determine current and next version
CURRENT_VERSION=$(grep -oE "[0-9]+\.[0-9]+\.[0-9]+" src/version.ts || echo "1.0.0")

if [ -n "$1" ]; then
  NEW_VERSION="$1"
else
  # Auto increment patch version (e.g. 1.0.1 -> 1.0.2)
  IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
  patch=$((patch + 1))
  NEW_VERSION="${major}.${minor}.${patch}"
fi

echo "🚀 Bumping version: $CURRENT_VERSION -> $NEW_VERSION"

# 2. Update version files
echo "export const APP_VERSION = '$NEW_VERSION';" > src/version.ts

# Update package.json
sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$NEW_VERSION\"/" package.json

# Update android/app/build.gradle.kts
PREV_CODE=$(grep -oE "versionCode = [0-9]+" android/app/build.gradle.kts | awk '{print $3}')
NEW_CODE=$((PREV_CODE + 1))
sed -i -E "s/versionCode = [0-9]+/versionCode = $NEW_CODE/" android/app/build.gradle.kts
sed -i -E "s/versionName = \"[^\"]+\"/versionName = \"$NEW_VERSION\"/" android/app/build.gradle.kts

echo "✅ Updated version to $NEW_VERSION (Android versionCode $NEW_CODE)"

# 3. Build web distribution
echo "📦 Building web assets..."
npm run build

# 4. Sync web assets to Android
echo "📱 Syncing web assets to Android..."
rm -rf android/app/src/main/assets/*
cp -r dist/* android/app/src/main/assets/

# 5. Build Android APK
echo "🤖 Building Android release APK..."
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
export ANDROID_HOME="${ANDROID_HOME:-/home/dkchw/Android/Sdk}"

(cd android && ./gradlew assembleRelease)

# 6. Package Android APK
APK_TARGET="./medchecklist-v${NEW_VERSION}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "$APK_TARGET"

# 7. Package Standalone Web Distribution
echo "🌐 Packaging standalone Web bundle..."
WEB_DIR="medchecklist-v${NEW_VERSION}-web"
WEB_ARCHIVE="./medchecklist-v${NEW_VERSION}-web.tar.gz"
rm -rf "$WEB_DIR" "$WEB_ARCHIVE"
mkdir -p "$WEB_DIR"
cp -r dist/* "$WEB_DIR/"
cat <<EOF > "$WEB_DIR/README.txt"
MedChecklist Web Distribution v${NEW_VERSION}
=============================================

This bundle contains the complete static production build of MedChecklist.

Deployment Options:
1. Static Web Server (Nginx, Apache, Caddy, Cloudflare Pages, Vercel, Netlify):
   Serve the contents of this folder as root.
2. Quick Local Testing:
   python3 -m http.server 3000
   Open http://localhost:3000 in any browser.

Features:
- Client-side AES-256-GCM encryption at rest
- Offline digit & vitals handwriting OCR
- Zero-lag 120 FPS bedside inking canvas
- Clinical de-identification (HIPAA Safe Harbor)
- Photo redaction editor & multi-tag gallery
- QR-code P2P encrypted pairing & sync
EOF
tar -czf "$WEB_ARCHIVE" "$WEB_DIR"
rm -rf "$WEB_DIR"

# 8. Package Linux Desktop Workstation Bundle
echo "💻 Packaging Linux Desktop Workstation bundle..."
DESKTOP_DIR="medchecklist-v${NEW_VERSION}-desktop-linux-x86_64"
DESKTOP_ARCHIVE="./medchecklist-v${NEW_VERSION}-desktop-linux-x86_64.tar.gz"
rm -rf "$DESKTOP_DIR" "$DESKTOP_ARCHIVE"
mkdir -p "$DESKTOP_DIR/dist"
cp -r dist/* "$DESKTOP_DIR/dist/"
cp scripts/templates/medchecklist-desktop.sh "$DESKTOP_DIR/medchecklist-desktop.sh"
chmod +x "$DESKTOP_DIR/medchecklist-desktop.sh"
cp scripts/templates/medchecklist.desktop "$DESKTOP_DIR/medchecklist.desktop"
chmod +x "$DESKTOP_DIR/medchecklist.desktop"
cp scripts/templates/medchecklist.png "$DESKTOP_DIR/medchecklist.png"

cat <<EOF > "$DESKTOP_DIR/README.txt"
MedChecklist Desktop Workstation v${NEW_VERSION} (Linux x86_64)
==============================================================

Minimalist clinical checklist and patient encounter platform.

HOW TO RUN:
-----------
1. Direct launch from terminal:
   ./medchecklist-desktop.sh

2. Run with Developer Tools / Debugging:
   ./medchecklist-desktop.sh --debug

3. Run on custom port:
   ./medchecklist-desktop.sh --port=8080

4. Desktop Menu Integration:
   Copy medchecklist.desktop to ~/.local/share/applications/
   and adjust the path if necessary.

REQUIREMENTS:
-------------
- Linux x86_64
- Python 3 (standard on almost all Linux distributions) or Node.js
- Any modern web browser (Chromium, Google Chrome, Brave, or Firefox)
EOF
tar -czf "$DESKTOP_ARCHIVE" "$DESKTOP_DIR"
rm -rf "$DESKTOP_DIR"

echo "🎉 All platform builds completed successfully!"
echo "   📱 Android APK:    $APK_TARGET ($(ls -lh "$APK_TARGET" | awk '{print $5}'))"
echo "   🌐 Web Archive:     $WEB_ARCHIVE ($(ls -lh "$WEB_ARCHIVE" | awk '{print $5}'))"
echo "   💻 Desktop Linux:   $DESKTOP_ARCHIVE ($(ls -lh "$DESKTOP_ARCHIVE" | awk '{print $5}'))"
echo "   🏷️ Release Version: v$NEW_VERSION"
