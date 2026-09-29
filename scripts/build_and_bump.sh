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

# 6. Copy output APK
APK_TARGET="./medchecklist-v${NEW_VERSION}.apk"
cp android/app/build/outputs/apk/release/app-release.apk "$APK_TARGET"

echo "🎉 Build completed successfully!"
echo "   APK: $APK_TARGET ($(ls -lh "$APK_TARGET" | awk '{print $5}'))"
echo "   Version: v$NEW_VERSION"
