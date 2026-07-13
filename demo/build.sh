#!/bin/bash
# Build demo.mp4 from animation.html — run on your Mac (needs Node + ffmpeg).
# One-time setup:  npm i playwright && npx playwright install chromium
#                  (ffmpeg:  brew install ffmpeg)
set -e
cd "$(dirname "$0")"
FRAMES=$(mktemp -d)

echo "1/3  Spot-check frames (view these PNGs before the full run)..."
node record-frames.js animation.html /tmp/demo_spots --spots "3,14,32,52,74,95,109,119"
echo "     -> open /tmp/demo_spots/*.png and eyeball them"
read -p "     Look OK? Press Enter to render the full video (Ctrl-C to abort)... "

echo "2/3  Full capture (30fps x 122s = 3660 frames, ~8-10 min)..."
node record-frames.js animation.html "$FRAMES"

echo "3/3  Encode to demo.mp4..."
ffmpeg -y -framerate 30 -i "$FRAMES/f%04d.png" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart demo.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 demo.mp4
echo "Done -> demo/demo.mp4  (should read ~122s above)"
