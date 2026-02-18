#!/bin/bash
# Build Jellyfish.app for macOS. Run from repo root: ./packaging/mac/build.sh
# Produces: packaging/out/mac/Jellyfish.app (and optionally Jellyfish.dmg)
set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
# Build outside iCloud to avoid "Esperando": JELLYFISH_OUTPUT_DIR=~/Builds ./packaging/mac/build.sh
OUT="${JELLYFISH_OUTPUT_DIR:-$REPO_ROOT/packaging/out/mac}"
mkdir -p "$OUT"
APP="$OUT/Jellyfish.app"
RESOURCES="$APP/Contents/Resources"
NODE_VERSION="20.18.0"
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  NODE_ARCH="darwin-arm64"
else
  NODE_ARCH="darwin-x64"
fi
NODE_TAR="node-v${NODE_VERSION}-${NODE_ARCH}.tar.gz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TAR}"

echo "Building Jellyfish.app (macOS $NODE_ARCH)..."
echo "Output: $OUT"
rm -rf "$APP" "$OUT/Jellyfish.dmg"
mkdir -p "$RESOURCES"

# 1. Download Node if not present
if [ ! -f "$REPO_ROOT/packaging/cache/$NODE_TAR" ]; then
  mkdir -p "$REPO_ROOT/packaging/cache"
  echo "Downloading Node ${NODE_VERSION}..."
  curl -sL -o "$REPO_ROOT/packaging/cache/$NODE_TAR" "$NODE_URL"
fi
echo "Extracting Node..."
tar -xzf "$REPO_ROOT/packaging/cache/$NODE_TAR" -C "$RESOURCES"
mv "$RESOURCES/node-v${NODE_VERSION}-${NODE_ARCH}" "$RESOURCES/node"

# 2. Optional embedded Redis (put redis-server in packaging/resources/mac/ to bundle)
if [ -f "$REPO_ROOT/packaging/resources/mac/redis-server" ]; then
  mkdir -p "$RESOURCES/redis"
  cp "$REPO_ROOT/packaging/resources/mac/redis-server" "$RESOURCES/redis/"
  chmod +x "$RESOURCES/redis/redis-server"
  echo "Embedded Redis included."
else
  echo "No packaging/resources/mac/redis-server — app will use Redis from .env (e.g. Redis Cloud)."
fi

# 3. Build the project (Vision uses Next.js standalone so the bundle does not rely on pnpm symlinks)
echo "Installing dependencies and building..."
pnpm install
pnpm build
pnpm --filter @jellyfish/vision run build

# 3b. Next standalone does not include .next/static — copy it so the dashboard loads
echo "Copying static assets into Vision standalone..."
cp -r "$REPO_ROOT/packages/vision/.next/static" "$REPO_ROOT/packages/vision/.next/standalone/packages/vision/.next/"
[ -d "$REPO_ROOT/packages/vision/public" ] && cp -r "$REPO_ROOT/packages/vision/public" "$REPO_ROOT/packages/vision/.next/standalone/packages/vision/"

# 4. Copy app (project) into bundle for memory, core, action, chat
echo "Copying app..."
rsync -a --exclude='.git' --exclude='packaging' --exclude='node_modules/.cache' "$REPO_ROOT/" "$RESOURCES/app/"
# 4b. Copy Vision standalone (self-contained, no pnpm symlinks) so the dashboard works in the .app
cp -r "$REPO_ROOT/packages/vision/.next/standalone" "$RESOURCES/vision-standalone"
echo "App and Vision standalone copied."

# 5. Launcher + version (for update check)
mkdir -p "$RESOURCES/launcher"
cp "$REPO_ROOT/packaging/launcher/index.js" "$RESOURCES/launcher/"
if [ -f "$REPO_ROOT/packaging/version.txt" ]; then
  cp "$REPO_ROOT/packaging/version.txt" "$RESOURCES/"
else
  echo "1.0.0" > "$RESOURCES/version.txt"
fi

# 5b. App icon (if present; create from PNG with packaging/resources/mac/make-icns.sh)
HAS_ICON=0
if [ -f "$REPO_ROOT/packaging/resources/mac/AppIcon.icns" ]; then
  cp "$REPO_ROOT/packaging/resources/mac/AppIcon.icns" "$RESOURCES/"
  HAS_ICON=1
  echo "App icon: included (AppIcon.icns)"
else
  echo "App icon: none (add packaging/resources/mac/AppIcon.icns to get one)"
fi

# 6. macOS .app entry point
mkdir -p "$APP/Contents/MacOS"
cat > "$APP/Contents/MacOS/Jellyfish" << 'LAUNCHER'
#!/bin/bash
export APP_ROOT="$(dirname "$0")/../Resources"
exec "$APP_ROOT/node/bin/node" "$APP_ROOT/launcher/index.js"
LAUNCHER
chmod +x "$APP/Contents/MacOS/Jellyfish"

# 7. Info.plist
if [ "$HAS_ICON" = "1" ]; then
  cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>Jellyfish</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundleIdentifier</key>
  <string>com.jellyfish.app</string>
  <key>CFBundleName</key>
  <string>Jellyfish</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST
else
  cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>Jellyfish</string>
  <key>CFBundleIdentifier</key>
  <string>com.jellyfish.app</string>
  <key>CFBundleName</key>
  <string>Jellyfish</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST
fi

# Force Finder to notice the bundle (helps icon show up)
touch "$APP"

echo "Done: $APP"
echo "To create a .dmg: hdiutil create -volname Jellyfish -srcfolder $APP -ov -format UDZO $OUT/Jellyfish.dmg"
echo ""
if [ "$HAS_ICON" = "1" ]; then
  echo "If the icon still looks generic in Finder/Dock, run:  killall Finder"
  echo "  (macOS caches icons; that refreshes it.)"
fi
if [[ "$OUT" == *"Desktop"* ]] || [[ "$OUT" == *"Documents"* ]] || [[ "$OUT" == *"iCloud"* ]]; then
  echo ""
  echo "Tip: This folder is often synced with iCloud, so you may see 'Esperando'. To avoid that, run (from project root):"
  echo "  cd $REPO_ROOT && mkdir -p ~/Builds && JELLYFISH_OUTPUT_DIR=~/Builds bash packaging/mac/build.sh"
fi
