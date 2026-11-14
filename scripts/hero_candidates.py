# Usage: python scripts/hero_candidates.py <path to costar-hackathon-kit> <WellSTAR csv> <output csv (keep outside repo)>
import csv, json, sys, numpy as np
K, W, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
ids = {}
with open(f"{K}/commercial-properties.csv", newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f): ids[str(r["PropertyId"]).strip()] = r
rows = []
with open(f"{K}/data/commercial-property.jsonl", encoding="utf-8") as f:
    for line in f:
        r = json.loads(line); pid = str(r.get("id"))
        if pid not in ids: continue
        a = r.get("primaryAddress") or {}
        if not a.get("latitude") or float(a["longitude"]) > -110: continue
        rows.append(dict(pid=pid, model=ids[pid]["MatterportModelId"], addr=ids[pid]["Address"], city=ids[pid]["City"],
            lat=float(a["latitude"]), lon=float(a["longitude"]), ptype=r.get("propertyType"), sub=r.get("propertySubtype"),
            stories=r.get("numStoriesAboveGrade"), name=r.get("buildingName")))
wl, meta = [], []
with open(W, newline="", encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        if r["WellTypeLabel"] in ("Core Hole", "Dry Hole") or r["WellStatus"] in ("Canceled",): continue
        try: a, b = float(r["Latitude"]), float(r["Longitude"])
        except: continue
        if 33.3 < a < 34.9 and -119.2 < b < -117.4:
            wl.append((a, b)); meta.append(r)
Wa = np.radians(np.array(wl))
M = np.radians(np.array([[x["lat"], x["lon"]] for x in rows]))
for i in range(0, len(M), 200):
    m = M[i:i+200]
    h = np.sin((Wa[None,:,0]-m[:,None,0])/2)**2 + np.cos(m[:,None,0])*np.cos(Wa[None,:,0])*np.sin((Wa[None,:,1]-m[:,None,1])/2)**2
    dd = 2*6371000*np.arcsin(np.sqrt(h))
    for k, j in enumerate(dd.argmin(1)):
        x = rows[i+k]; w = meta[j]
        x.update(dist_m=round(float(dd[k, j]), 1), well_api=w["API"], well_status=w["WellStatus"], well_type=w["WellTypeLabel"],
                 field=w["FieldName"], lease=f'{w["LeaseName"]} {w["WellNumber"]}'.strip(), spud=w["SpudDate"][:10])
rows.sort(key=lambda x: (x["well_status"] != "Idle", x["dist_m"]))
with open(OUT, "w", newline="", encoding="utf-8") as f:
    wr = csv.DictWriter(f, fieldnames=list(rows[0].keys())); wr.writeheader(); wr.writerows(rows)
idle = [x for x in rows if x["well_status"] == "Idle"]
print("LA buildings whose nearest oil/gas well is IDLE:", len(idle), "| within 100 m:", sum(x["dist_m"] < 100 for x in idle))
print(f'{"#":>2} {"dist":>6}  {"model":<12} {"type":<14} {"st":>3}  {"field":<18} {"well":<22} address')
for n, x in enumerate(idle[:15], 1):
    print(f'{n:>2} {x["dist_m"]:>5.0f}m  {x["model"]:<12} {str(x["ptype"])[:14]:<14} {str(x["stories"] or ""):>3}  {x["field"][:18]:<18} {x["lease"][:22]:<22} {x["addr"]}, {x["city"]}')
print("\nClosest to PLUGGED oil/gas wells:")
pl = sorted([x for x in rows if x["well_status"] == "Plugged"], key=lambda x: x["dist_m"])
for x in pl[:5]:
    print(f'   {x["dist_m"]:>5.0f}m  {x["model"]:<12} {str(x["ptype"])[:14]:<14} {x["field"][:18]:<18} {x["addr"]}, {x["city"]}')
