# Redesign preview: media sources and licenses

All footage is stock from Pexels, used under the Pexels License (https://www.pexels.com/license/):
free to use and modify, no attribution required (credited anyway). People shown are not Boomer users,
customers or endorsers. Downloaded 2026-11-14 at 1920px (1080x1920 for the portrait clip).

| Pexels ID | Creator | Page | Used in |
| --- | --- | --- | --- |
| 8487125 | Kindel Media | https://www.pexels.com/video/female-engineer-doing-an-inspection-8487125/ | hero montage, see-wall freeze |
| 18780266 | Johnny Chen | https://www.pexels.com/video/technician-attendance-18780266/ | hero montage, test-meter freeze |
| 28886877 | ranjeet . | https://www.pexels.com/video/technician-operating-electrical-control-panel-28886877/ | hero montage, full-bleed panel break |
| 10664446 | mark soetebier | https://www.pexels.com/video/close-up-on-electric-cabinet-10664446/ | hero montage, cabinet still |
| 29731535 | Dan Butler | https://www.pexels.com/video/technician-performing-electrical-component-repair-29731535/ | hero montage (16:9), closing backdrop |
| 36167829 | Mumtaz Niazi | https://www.pexels.com/video/electrician-installing-industrial-battery-bank-36167829/ | hero montage (9:16), battery still in the field section |

## Edits

Built by `scripts/preview-media.sh` (FFmpeg 8): trims, 0.5 s cross-dissolves, one shared grade
(contrast +10%, saturation -22%, cool shadows / warm highlights, soft vignette), 9:16 re-crops for
phones, a slow push-in on the cabinet shot, freeze frames (tpad) for the annotation scenes, no audio,
H.264 with faststart, WebP posters.

## Overlays

Annotation boxes on `see-wall`, `test-meter` and `panel` are drawn by the page in the lesson editor's box
style (lib/lessons annotationSchema). They are illustrative labels placed by hand, not model output.

`screen-*.webp` are screenshots of this build's own product screens (mock mode, demo job demo-2041).
