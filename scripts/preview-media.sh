#!/usr/bin/env bash
# Builds the redesign preview's footage from the Pexels source clips (see public/preview/media/SOURCES.md).
# Sources are kept outside the repo; point SRC at them:
#   SRC=../Boomer-redesign-media/src bash scripts/preview-media.sh
# Needs ffmpeg (brew install ffmpeg) and cwebp (optional, for posters).
set -euo pipefail
SRC="${SRC:-../Boomer-redesign-media/src}"
OUT="public/preview/media"
mkdir -p "$OUT"
FF="ffmpeg -v error -y"

# One grade for every shot: slightly muted, lifted contrast, cool shadows / warm highlights, soft vignette.
GRADE="eq=contrast=1.10:saturation=0.78:brightness=-0.035:gamma=0.97,colorbalance=rs=-0.04:bs=0.05:rh=0.04:bh=-0.03,vignette=PI/5"

# ── Hero montage, 16:9 ─────────────────────────────────────────────────────────
# open wall (hard hat) → meter test at a wall box → control panel → weathered cabinet → hands at a fixture
seg() { # in start dur filters-extra
  echo "[$1:v]trim=start=$2:duration=$3,setpts=PTS-STARTPTS,fps=30,scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080$4,$GRADE,format=yuv420p"
}
$FF \
  -i "$SRC/px-8487125.mp4" -i "$SRC/px-18780266.mp4" -i "$SRC/px-28886877.mp4" -i "$SRC/px-10664446.mp4" -i "$SRC/px-29731535.mp4" \
  -filter_complex "\
$(seg 0 0.4 3.4 '')[a];\
$(seg 1 0.2 3.4 '')[b];\
$(seg 2 1.0 3.2 '')[c];\
$(seg 3 1.5 3.0 ',zoompan=z=1.0+0.0016*on:d=1:s=1920x1080:fps=30')[d];\
$(seg 4 0.8 3.2 '')[e];\
[a][b]xfade=transition=fade:duration=0.5:offset=2.9[ab];\
[ab][c]xfade=transition=fade:duration=0.5:offset=5.8[abc];\
[abc][d]xfade=transition=fade:duration=0.5:offset=8.5[abcd];\
[abcd][e]xfade=transition=fade:duration=0.5:offset=11.0,scale=1600:900[v]" \
  -map "[v]" -an -pix_fmt yuv420p -c:v libx264 -profile:v high -preset slow -crf 25 -movflags +faststart "$OUT/field-16x9.mp4"

# Low-bandwidth / small-screen landscape copy
$FF -i "$OUT/field-16x9.mp4" -vf scale=960:540 -an -pix_fmt yuv420p -c:v libx264 -preset slow -crf 28 -movflags +faststart "$OUT/field-16x9-540.mp4"

# ── Hero montage, 9:16 for phones ─────────────────────────────────────────────
pseg() { # in start dur cropX(0-1 of the spare width)
  echo "[$1:v]trim=start=$2:duration=$3,setpts=PTS-STARTPTS,fps=30,scale=-2:1280,crop=720:1280:(in_w-720)*$4:0,$GRADE,format=yuv420p"
}
$FF \
  -i "$SRC/px-8487125.mp4" -i "$SRC/px-18780266.mp4" -i "$SRC/px-36167829.mp4" -i "$SRC/px-28886877.mp4" \
  -filter_complex "\
$(pseg 0 0.4 3.4 0.40)[a];\
$(pseg 1 0.2 3.4 0.52)[b];\
[2:v]trim=start=0.3:duration=3.4,setpts=PTS-STARTPTS,fps=30,scale=720:1280,$GRADE,format=yuv420p[c];\
$(pseg 3 1.0 3.2 0.42)[d];\
[a][b]xfade=transition=fade:duration=0.5:offset=2.9[ab];\
[ab][c]xfade=transition=fade:duration=0.5:offset=5.8[abc];\
[abc][d]xfade=transition=fade:duration=0.5:offset=8.7[v]" \
  -map "[v]" -an -pix_fmt yuv420p -c:v libx264 -profile:v high -preset slow -crf 27 -movflags +faststart "$OUT/field-9x16.mp4"

# ── Scene clips: play, then hold a freeze frame for the annotation layer ──────
# Same model as lib/lessons: annotations live on a freeze frame (freezeAt, freezeSeconds).
# see-wall: over-the-shoulder at an open wall, freezes at 2.4 s for 4 s.
$FF -i "$SRC/px-8487125.mp4" -vf "trim=start=2.2:duration=2.4,setpts=PTS-STARTPTS,fps=30,$GRADE,tpad=stop_mode=clone:stop_duration=4,scale=1600:900,format=yuv420p" \
  -an -pix_fmt yuv420p -c:v libx264 -preset slow -crf 25 -movflags +faststart "$OUT/see-wall.mp4"
# test-meter: meter on the pulled device, freezes at 1.2 s for 4 s.
$FF -i "$SRC/px-18780266.mp4" -vf "trim=start=0:duration=1.2,setpts=PTS-STARTPTS,fps=30,$GRADE,tpad=stop_mode=clone:stop_duration=4,scale=1600:900,format=yuv420p" \
  -an -pix_fmt yuv420p -c:v libx264 -preset slow -crf 25 -movflags +faststart "$OUT/test-meter.mp4"

# ── Posters (the graded freeze frames double as the reduced-motion / no-video state) ─
$FF -sseof -0.1 -i "$OUT/see-wall.mp4" -frames:v 1 -q:v 3 "$OUT/see-wall.jpg"
$FF -sseof -0.1 -i "$OUT/test-meter.mp4" -frames:v 1 -q:v 3 "$OUT/test-meter.jpg"
$FF -ss 1.2 -i "$OUT/field-16x9.mp4" -frames:v 1 -q:v 3 "$OUT/field-16x9.jpg"
$FF -ss 1.2 -i "$OUT/field-9x16.mp4" -frames:v 1 -q:v 3 "$OUT/field-9x16.jpg"
$FF -ss 6.6 -i "$OUT/field-16x9.mp4" -frames:v 1 -q:v 3 "$OUT/panel.jpg"
$FF -ss 9.5 -i "$OUT/field-16x9.mp4" -frames:v 1 -q:v 3 "$OUT/cabinet.jpg"
if command -v cwebp >/dev/null; then
  for f in "$OUT"/*.jpg; do cwebp -quiet -q 78 "$f" -o "${f%.jpg}.webp"; done
fi
ls -la "$OUT"

# ── v3: video for the sections that were stills ──────────────────────────────
# panel-freeze: control panel, plays then holds the frame the page annotates (montage t=6.6 = source t=1.8)
$FF -i "$SRC/px-28886877.mp4" -vf "trim=start=0:duration=1.8,setpts=PTS-STARTPTS,fps=30,$GRADE,tpad=stop_mode=clone:stop_duration=5,scale=1600:900,format=yuv420p" \
  -an -pix_fmt yuv420p -c:v libx264 -preset slow -crf 26 -movflags +faststart "$OUT/panel-freeze.mp4"
# cabinet-loop: weathered cabinet, slow push-in, seamless enough as a quiet background loop
$FF -i "$SRC/px-10664446.mp4" -vf "trim=start=1:duration=8,setpts=PTS-STARTPTS,fps=30,scale=1920:1080,zoompan=z=1.0+0.0008*on:d=1:s=1600x900:fps=30,$GRADE,format=yuv420p" \
  -an -pix_fmt yuv420p -c:v libx264 -preset slow -crf 27 -movflags +faststart "$OUT/cabinet-loop.mp4"
# hands-loop: hands at a fixture, lifted for use behind the closing statement
$FF -i "$SRC/px-29731535.mp4" -vf "trim=start=0.4:duration=7,setpts=PTS-STARTPTS,fps=30,scale=1600:900,$GRADE,eq=brightness=0.06:gamma=1.25,format=yuv420p" \
  -an -pix_fmt yuv420p -c:v libx264 -preset slow -crf 27 -movflags +faststart "$OUT/hands-loop.mp4"
$FF -sseof -0.1 -i "$OUT/panel-freeze.mp4" -frames:v 1 -q:v 3 "$OUT/panel-freeze.jpg"
$FF -i "$OUT/cabinet-loop.mp4" -frames:v 1 -q:v 3 "$OUT/cabinet-loop.jpg"
$FF -i "$OUT/hands-loop.mp4" -frames:v 1 -q:v 3 "$OUT/hands-loop.jpg"
for f in panel-freeze cabinet-loop hands-loop; do command -v cwebp >/dev/null && cwebp -quiet -q 78 "$OUT/$f.jpg" -o "$OUT/$f.webp"; done
