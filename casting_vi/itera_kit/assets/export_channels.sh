#!/usr/bin/env bash
# Export a 9:16 master into per-channel formats (blurred-fill background, same audio).
# Usage: bash assets/export_channels.sh out/<id>.mp4   -> out/<id>_16x9.mp4, _1x1.mp4, _4x5.mp4
#   9:16 (master): TikTok, Reels, YouTube Shorts, Zalo Video, Facebook Story
#   16:9: YouTube, Facebook page video, website/landing · 1:1: Facebook/LinkedIn feed, Zalo OA · 4:5: Instagram/Facebook feed ads
set -euo pipefail
IN="$1"; B="${IN%.mp4}"
mk() { # $1 suffix  $2 W  $3 H
  ffmpeg -y -loglevel error -i "$IN" -filter_complex \
    "[0:v]scale=$2:$3:force_original_aspect_ratio=increase,crop=$2:$3,boxblur=40:2,eq=brightness=-0.18[bg];[0:v]scale=-2:$3[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p" \
    -c:v libx264 -crf 19 -preset medium -c:a copy -movflags +faststart "${B}_$1.mp4"
  echo "${B}_$1.mp4"
}
mk 16x9 1920 1080; mk 1x1 1080 1080; mk 4x5 1080 1350
