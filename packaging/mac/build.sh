#!/bin/bash
# Build Jellyfish.app for macOS. Run from repo root: ./packaging/mac/build.sh
# Produces: packaging/out/mac/Jellyfish.app (and optionally Jellyfish.dmg)
set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
OUT="$REPO_ROOT/packaging/out/mac"
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
rm -rf "$OUT"
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

# 3. Build the project
echo "Installing dependencies and building..."
pnpm install
pnpm build

# 4. Copy app (project) into bundle (exclude .git and packaging to save space)
echo "Copying app..."
rsync -a --exclude='.git' --exclude='packaging' --exclude='node_modules/.cache' "$REPO_ROOT/" "$RESOURCES/app/"
echo "App copied."

# 5. Launcher
mkdir -p "$RESOURCES/launcher"
cp "$REPO_ROOT/packaging/launcher/index.js" "$RESOURCES/launcher/"

# 6. macOS .app entry point
mkdir -p "$APP/Contents/MacOS"
cat > "$APP/Contents/MacOS/Jellyfish" << 'LAUNCHER'
#!/bin/bash
export APP_ROOT="$(dirname "$0")/../Resources"
exec "$APP_ROOT/node/bin/node" "$APP_ROOT/launcher/index.js"
LAUNCHER
chmod +x "$APP/Contents/MacOS/Jellyfish"

# 7. Info.plist
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

echo "Done: $APP"
echo "To create a .dmg: hdiutil create -volname Jellyfish -srcfolder $APP -ov -format UDZO $OUT/Jellyfish.dmg"
