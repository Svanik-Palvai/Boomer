"""
Room check (go/no-go): for the buildings closest to idle wells, ask Matterport
which floors and rooms each scan has, and flag risky spaces.

Usage (from the repo root, with MATTERPORT_API_KEY / MATTERPORT_API_TOKEN in .env):
    pip install requests
    python scripts/room_check.py ../Downloads/ghostwell-private/hero_candidates.csv

Raw API responses are saved to ../Downloads/ghostwell-private/rooms/ (outside the repo).
If the query errors, the error usually names the right field; fix ROOM_QUERY and rerun.
"""
import csv, json, os, sys, pathlib, requests

API = "https://api.matterport.com/api/models/graph"
MAX_DIST_M = 100
RISKY = ("basement", "garage", "parking", "utility", "mechanical", "boiler", "laundry",
         "storage", "lower", "cellar", "electrical", "water heater", "furnace", "sub")

ROOM_QUERY = """query rooms($id: ID!) {
  model(id: $id) {
    id
    name
    floors { id sequence label }
    rooms {
      id
      label
      floor { sequence label }
      classifications { label confidence }
      dimensionEstimates(units: metric) { areaFloor height width depth }
    }
  }
}"""


def load_env(path=".env"):
    if not os.path.exists(path):
        return
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    load_env()
    key, tok = os.environ.get("MATTERPORT_API_KEY"), os.environ.get("MATTERPORT_API_TOKEN")
    if not key or not tok:
        sys.exit("Put MATTERPORT_API_KEY and MATTERPORT_API_TOKEN in .env")

    hero_csv = pathlib.Path(sys.argv[1])
    out_dir = hero_csv.parent / "rooms"
    out_dir.mkdir(exist_ok=True)

    rows = [r for r in csv.DictReader(open(hero_csv, encoding="utf-8"))
            if r["well_status"] == "Idle" and float(r["dist_m"]) < MAX_DIST_M]
    rows.sort(key=lambda r: float(r["dist_m"]))
    print(f"Checking {len(rows)} buildings within {MAX_DIST_M} m of an idle well\n")

    good = 0
    first_error_shown = False
    for r in rows:
        mid = r["model"]
        try:
            resp = requests.post(API, json={"query": ROOM_QUERY, "variables": {"id": mid}},
                                 auth=(key, tok), timeout=40).json()
        except Exception as e:
            print(f"{mid}: request failed ({e})")
            continue
        (out_dir / f"{mid}.json").write_text(json.dumps(resp, indent=1))
        if resp.get("errors"):
            msg = resp["errors"][0].get("message", "")
            print(f"{mid}: API error: {msg[:300]}")
            if not first_error_shown:
                print("   ^ paste this error to Claude; it usually names the correct field\n")
                first_error_shown = True
            continue
        m = (resp.get("data") or {}).get("model") or {}
        floors = m.get("floors") or []
        rooms = m.get("rooms") or []
        labels = set()
        for f in floors:
            labels.add((f.get("label") or "").strip())
        for rm in rooms:
            labels.add((rm.get("label") or "").strip())
            for c in rm.get("classifications") or []:
                labels.add((c.get("label") or "").strip())
        risky = sorted(l for l in labels if l and any(w in l.lower() for w in RISKY))
        low_floor = any((f.get("sequence") or 0) < 0 for f in floors)
        if risky or low_floor:
            good += 1
        print(f"{float(r['dist_m']):>5.0f} m  {mid}  floors={len(floors)} rooms={len(rooms)}"
              f"  risky={risky or '-'}{'  (floor below 0)' if low_floor else ''}")

    print(f"\n{good} of {len(rows)} buildings have a basement/garage/utility-type space.")
    print("GO" if good >= 3 else "THIN: pivot to enclosed ground-floor rooms with gas appliances")


if __name__ == "__main__":
    main()
