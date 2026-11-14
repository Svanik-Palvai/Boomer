import gzip, json, math, re, sys, collections
R = sys.argv[1]
J = {j["id"]: j for j in json.load(open(f"{R}/jurisdictions.json"))["jurisdictions"]}
chunks = [json.loads(l) for l in gzip.open(f"{R}/corpus/chunks.jsonl.gz", "rt", encoding="utf-8")]
src2key = {}
for j in J.values():
    for k, v in j.items():
        if k.endswith("Sources"):
            for s in v: src2key.setdefault(s.split("/", 1)[1], set()).add(j["id"])
def chain(jid):
    out, todo = [], [jid]
    while todo:
        x = todo.pop(0)
        if x and x not in out: out.append(x); todo += J[x]["parents"]
    return out
tok = lambda s: re.findall(r"\d{3}\.\d+|[a-z0-9]+", s.lower())
docs = [tok(c["text"] + " " + (c.get("title") or "")) for c in chunks]
df = collections.Counter(t for d in docs for t in set(d)); N = len(docs); avg = sum(map(len, docs)) / N
def bm25(q, i, k1=1.2, b=0.75):
    tf = collections.Counter(docs[i]); s = 0
    for t in q:
        if t in tf: s += math.log(1 + (N - df[t] + .5) / (df[t] + .5)) * tf[t] * (k1 + 1) / (tf[t] + k1 * (1 - b + b * len(docs[i]) / avg))
    return s
hits = 0
for q in json.load(open(f"{R}/eval/questions.json")):
    scope = set(chain(q["site"]) + (chain(q["home"]) if q.get("home") else []))
    states = {J[x]["state"] for x in scope}
    cand = [i for i, c in enumerate(chunks) if (src2key.get(c.get("sourceId"), set()) & scope) or (c["kind"] == "row" and c.get("state") in states)]
    qt = tok(q["q"]); top = sorted(cand, key=lambda i: -bm25(qt, i))[:8]
    got = {c for i in top for c in [next((s for s in q["expectSources"] if s.endswith("/" + str(chunks[i].get("sourceId")))), None)] if c}
    ok = bool(got); hits += ok
    print(("OK  " if ok else "MISS"), q["q"][:70], "| top:", [chunks[i].get("sourceId") or chunks[i].get("table") for i in top[:3]])
print(f"recall@8 (any expected source): {hits}/{len(json.load(open(f'{R}/eval/questions.json')))}")
