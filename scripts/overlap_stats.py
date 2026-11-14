# Usage: python scripts/overlap_stats.py <path to costar-hackathon-kit> <WellSTAR csv>   (prints totals only)
import csv, json, sys, numpy as np, collections
K = sys.argv[1]; W = sys.argv[2]
ids = {}
with open(f"{K}/commercial-properties.csv", newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        ids[str(r["PropertyId"]).strip()] = r["MatterportModelId"]
print("scanned commercial properties in csv:", len(ids))
pts = []
with open(f"{K}/data/commercial-property.jsonl", encoding="utf-8") as f:
    for line in f:
        r = json.loads(line)
        pid = str(r.get("id"))
        if pid in ids:
            a = r.get("primaryAddress") or {}
            la, lo = a.get("latitude"), a.get("longitude")
            if la and lo: pts.append((pid, float(la), float(lo)))
print("matched to CoStar record with coordinates:", len(pts))
P = np.array([[p[1], p[2]] for p in pts])
la_mask = P[:,1] < -110
print("  LA:", int(la_mask.sum()), " Houston/other:", int((~la_mask).sum()))
# wells
wl = []; meta = []
with open(W, newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        try: a, b = float(r["Latitude"]), float(r["Longitude"])
        except: continue
        if 33.3 < a < 34.9 and -119.2 < b < -117.4:
            wl.append((a, b)); meta.append((r["WellStatus"], r["WellTypeLabel"], r["FieldName"]))
Wa = np.radians(np.array(wl)); print("CalGEM wells in LA region:", len(wl))
M = np.radians(P[la_mask])
d = np.empty(len(M)); idx = np.empty(len(M), int)
for i in range(0, len(M), 200):
    m = M[i:i+200]
    dlat = Wa[None,:,0]-m[:,None,0]; dlon = Wa[None,:,1]-m[:,None,1]
    h = np.sin(dlat/2)**2 + np.cos(m[:,None,0])*np.cos(Wa[None,:,0])*np.sin(dlon/2)**2
    dd = 2*6371000*np.arcsin(np.sqrt(h))
    idx[i:i+200] = dd.argmin(1); d[i:i+200] = dd.min(1)
print("\n=== LA scanned commercial buildings: distance to nearest recorded well ===")
for r in (30, 100, 300, 500): print(f"  within {r:>3} m: {(d<r).sum()}")
near = idx[d < 300]
print("\nnearest-well type (within 300 m):", collections.Counter(meta[j][1] for j in near).most_common(8))
print("nearest-well status (within 300 m):", collections.Counter(meta[j][0] for j in near).most_common(8))
print("oil field (within 300 m):", collections.Counter(meta[j][2] for j in near).most_common(10))
n = int((d < 300).sum())
print("\nDECISION:", "GO" if n >= 10 else "THIN")
