#!/bin/bash
# Create .dmg and upload to GitHub release v1.0.0.
# Run from repo root after packaging/mac/build.sh has finished: ./packaging/mac/create-release.sh
set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"
APP="$REPO_ROOT/packaging/out/mac/Jellyfish.app"
DMG="$REPO_ROOT/packaging/out/mac/Jellyfish.dmg"
TAG="${1:-v1.0.0}"

if [ ! -d "$APP" ]; then
  echo "Run ./packaging/mac/build.sh first."
  exit 1
fi

echo "Creating Jellyfish.dmg..."
hdiutil create -volname Jellyfish -srcfolder "$APP" -ov -format UDZO "$DMG"

echo "Uploading to GitHub release $TAG..."
gh release upload "$TAG" "$DMG" --repo IronValleyLabs/jellyfish --clobber

echo "Done. Download URL: https://github.com/IronValleyLabs/jellyfish/releases/download/$TAG/Jellyfish.dmg"
