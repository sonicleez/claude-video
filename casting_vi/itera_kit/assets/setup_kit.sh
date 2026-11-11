#!/usr/bin/env bash
# Restore ITERA Video Kit v2 assets into public/kit (they are private and not committed).
# Usage: bash assets/setup_kit.sh /path/to/folder-with-the-3-ITERA-zips
# Expects: *ITERA-v2-elements-va-hinh*.zip, *ITERA-v2-layout-30-ngay*.zip, *ITERA-video-kit*.zip
set -euo pipefail
SRC="${1:?folder containing the ITERA kit zip files}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KIT="$ROOT/../brand_kit"
mkdir -p "$KIT"/{elements,layout,videokit}
unzip -q -o "$(ls "$SRC"/*elements-va-hinh*.zip | head -1)" -d "$KIT/elements"
unzip -q -o "$(ls "$SRC"/*layout-30-ngay*.zip | head -1)" -d "$KIT/layout"
unzip -q -o "$(ls "$SRC"/*video-kit*.zip | head -1)" -d "$KIT/videokit"
printf '*\n' > "$KIT/.gitignore"
V="$KIT/videokit/ITERA-Video-Kit"; L="$KIT/layout/ITERA-Video-Kit/10-layout-30-ngay"; E="$KIT/elements/ITERA-Video-Kit/11-elements-bo-sung"
P="$ROOT/public/kit"; mkdir -p "$P"/{fonts,end,sfx,mascot,el,flip,day01}
cp "$V"/02-typography/*.ttf "$V"/02-typography/OFL-*.txt "$P/fonts/"
cp "$V/05-templates/E-canh-ket/01-art.jpg" "$P/end/art.jpg"; cp "$V/05-templates/E-canh-ket/02-layout.png" "$P/end/layout.png"
cp "$V"/07-sound/*.wav "$P/sfx/"; cp "$V"/01-mascot/*.png "$P/mascot/"
cp "$E"/01-nhan-dien-cta/{voice-by-itera-nen-toi,cta-comment,cta-link-bio}.png "$P/el/"; cp "$V/04-ui-overlays/09-caption-backing.png" "$P/el/"
cp "$E"/09-motion-alpha/lat-dap-an/sequence/*.png "$P/flip/"
# Per-day layouts: public/kit/dayNN/{layout.png, trang-thai-*.png}
for d in "$L"/[0-3][0-9]-*; do
  n=$(basename "$d" | cut -c1-2); mkdir -p "$P/day$n"
  cp "$d/01-layout.png" "$P/day$n/layout.png"; [ -d "$d/trang-thai" ] && cp "$d"/trang-thai/*.png "$P/day$n/" || true
done
echo "Kit restored to $P"
