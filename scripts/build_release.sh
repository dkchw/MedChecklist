#!/usr/bin/env bash
set -e

VERSION="${1:-2.0.0}"
echo "Building MedChecklist v${VERSION} Native Releases..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# 1. Build Android Native APK
echo "==> Building Android Native Compose Release APK..."
cd "$ROOT_DIR/android"
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk "$ROOT_DIR/medchecklist-v${VERSION}.apk"

# 2. Build Desktop Qt6 C++ Binary
echo "==> Building Desktop Qt6 C++ Binary..."
cd "$ROOT_DIR/desktop"
cmake -B build
cmake --build build

# Package Desktop Tarball
TMP_DIR=$(mktemp -d)
mkdir -p "$TMP_DIR/medchecklist-desktop-v${VERSION}"
cp build/MedChecklistDesktop "$TMP_DIR/medchecklist-desktop-v${VERSION}/"
cp flake.nix flake.lock "$TMP_DIR/medchecklist-desktop-v${VERSION}/"
cat << 'EOF' > "$TMP_DIR/medchecklist-desktop-v${VERSION}/run.sh"
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/MedChecklistDesktop" "$@"
EOF
chmod +x "$TMP_DIR/medchecklist-desktop-v${VERSION}/run.sh"

tar -czf "$ROOT_DIR/medchecklist-v${VERSION}-desktop-linux-x86_64.tar.gz" -C "$TMP_DIR" "medchecklist-desktop-v${VERSION}"
rm -rf "$TMP_DIR"

echo "==> Release artifacts ready:"
echo "    - $ROOT_DIR/medchecklist-v${VERSION}.apk"
echo "    - $ROOT_DIR/medchecklist-v${VERSION}-desktop-linux-x86_64.tar.gz"
