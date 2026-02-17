#!/bin/bash
# Generate AppIcon.icns from AppIcon.png (run once on Mac before building the .app).
# Requires: sips, iconutil (built-in on macOS).
cd "$(dirname "$0")"
PNG=AppIcon.png
ICONSET=AppIcon.iconset
if [ ! -f "$PNG" ]; then
  echo "Put AppIcon.png (1024x1024) here first."
  exit 1
fi
rm -rf "$ICONSET"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -z $size $size "$PNG" --out "$ICONSET/icon_${size}x${size}.png"
  sips -z $((size*2)) $((size*2)) "$PNG" --out "$ICONSET/icon_${size}x${size}@2x.png"
done
sips -z 1024 1024 "$PNG" --out "$ICONSET/icon_512x512@2x.png"
iconutil -c icns "$ICONSET" -o AppIcon.icns
rm -rf "$ICONSET"
echo "Created AppIcon.icns"
