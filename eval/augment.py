# OWNER: Zohaib. Phone-camera variants of every labeled image (no AI): dim light, motion blur, tilt + heavy JPEG.
# A "pass" image that is too blurry or dark to judge becomes "unclear": the right answer there is "can't tell".
#   python3 -I eval/augment.py
import json, os, glob
from PIL import Image, ImageEnhance, ImageFilter

spec = json.load(open("eval/scenes.json"))
labels = {r["id"]: r for r in spec["real"]}
labels.update({s["id"]: s for s in spec["scenes"]})
labels.update({e["id"]: e for e in spec["edits"]})

out_dir = "eval/images/aug"; os.makedirs(out_dir, exist_ok=True)
rows = []
for src in sorted(glob.glob("eval/images/real/*.jpg") + glob.glob("eval/images/gen/*.png")):
    sid = os.path.splitext(os.path.basename(src))[0]
    if sid not in labels: continue
    base = labels[sid]
    im = Image.open(src).convert("RGB"); im.thumbnail((1024, 1024))
    variants = {
        "dim": ImageEnhance.Brightness(im).enhance(0.28),
        "blur": im.filter(ImageFilter.GaussianBlur(radius=max(4, im.width // 110))),
        "tilt": im.rotate(14, expand=False, fillcolor=(40, 40, 40)),
    }
    for name, v in variants.items():
        vid = f"{sid}--{name}"; path = f"{out_dir}/{vid}.jpg"
        v.save(path, quality=20 if name == "tilt" else 70)
        label = base["label"]
        if label == "pass" and name in ("dim", "blur"): label = "unclear"  # can't be judged: "can't tell" is right
        rows.append({"id": vid, "from": sid, "step": base["step"], "label": label, "variant": name})
json.dump(rows, open("eval/images/aug/labels.json", "w"), indent=1)
print(len(rows), "variants")
