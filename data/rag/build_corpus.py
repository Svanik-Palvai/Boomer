"""Build data/rag/corpus/chunks.jsonl.gz from data/rag/sources/*/manifest.json.

Chunk kinds:
  doc   - text extracted from a saved source document (section-aware for amendments)
  fact  - one verified keyFact from a manifest entry (short, high-precision)
  row   - one row of a national table (adoption, licensing, edition change)
Usage: python3 -I build_corpus.py <data/rag dir>
"""
import gzip, hashlib, json, os, re, sys
from datetime import date

RAG = sys.argv[1]
SRC = os.path.join(RAG, "sources")
OUT = os.path.join(RAG, "corpus")
TARGET, OVERLAP, MIN = 1400, 200, 120

SECTION_RE = re.compile(r"\b(\d{3}\.\d{1,3}(?:\([A-Z0-9]{1,3}\))*)")
HEADER_RE = re.compile(r"^\s*(?:Section|SECTION|Article|ARTICLE)\s+\d{2,3}(?:\.\d+)?\b", re.M)
STATE_OF = {}  # filled per region dir: two-letter dirs are state codes


def clean(t):
    t = t.replace("\x0c", "\n")
    t = re.sub(r"\.{5,}\s*\d*", " ", t)          # table-of-contents leaders
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def pack(text):
    """Greedy paragraph packing with overlap."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    out, cur = [], ""
    for p in paras:
        while len(p) > TARGET * 1.5:               # very long paragraph: hard split
            out.append((cur + "\n\n" + p[:TARGET]).strip()) if cur else out.append(p[:TARGET])
            cur, p = "", p[TARGET - OVERLAP:]
        if len(cur) + len(p) > TARGET and cur:
            out.append(cur)
            cur = cur[-OVERLAP:] + "\n\n" + p
        else:
            cur = (cur + "\n\n" + p).strip()
    if cur.strip():
        out.append(cur)
    return [c for c in out if len(c) >= MIN]


def split_doc(text, doc_type):
    if doc_type == "local_amendment":
        starts = [m.start() for m in HEADER_RE.finditer(text)]
        if len(starts) >= 3:
            parts = [text[:starts[0]]] + [text[a:b] for a, b in zip(starts, starts[1:] + [len(text)])]
            chunks = []
            for p in parts:
                chunks += pack(p) if len(p) > TARGET * 1.5 else ([p.strip()] if len(p.strip()) >= MIN else [])
            return chunks
    return pack(text)


def cid(*parts):
    return hashlib.sha1("|".join(parts).encode()).hexdigest()[:12]


def base_meta(region, e):
    return {
        "sourceId": e["id"],
        "title": e.get("title"),
        "jurisdiction": e.get("jurisdiction"),
        "state": STATE_OF.get(region, region.upper() if len(region) == 2 else None),
        "level": e.get("level"),
        "docType": e.get("docType"),
        "necEdition": e.get("necEdition"),
        "effectiveDate": e.get("effectiveDate"),
        "status": e.get("status"),
        "url": e.get("url"),
        "retrievedAt": e.get("retrievedAt"),
        "redistributable": e.get("copyright") == "government_public",
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    chunks, sources = [], []
    for region in sorted(os.listdir(SRC)):
        mpath = os.path.join(SRC, region, "manifest.json")
        if not os.path.exists(mpath):
            continue
        for e in json.load(open(mpath)):
            meta = base_meta(region, e)
            n = 0
            for i, fact in enumerate(e.get("keyFacts") or []):
                chunks.append({"id": cid(e["id"], "fact", str(i)), "kind": "fact", "text": fact,
                               "necSections": sorted(set(SECTION_RE.findall(fact))), **meta})
                n += 1
            tf = e.get("textFile")
            tp = os.path.join(SRC, region, tf) if tf else None
            if tp and os.path.exists(tp):
                raw = clean(open(tp, encoding="utf-8", errors="replace").read())
                for i, c in enumerate(split_doc(raw, e.get("docType"))):
                    chunks.append({"id": cid(e["id"], "doc", str(i)), "kind": "doc", "chunkIndex": i, "text": c,
                                   "necSections": sorted(set(SECTION_RE.findall(c)))[:25], **meta})
                    n += 1
            sources.append({"region": region, "sourceId": e["id"], "chunks": n, **{k: meta[k] for k in
                            ("jurisdiction", "docType", "status", "redistributable", "url")}})

    nat = os.path.join(SRC, "national")
    for r in json.load(open(os.path.join(nat, "nec-adoption-by-state.json"))):
        ed = r.get("editionInForce") or "unknown"
        text = (f"{r['state']} NEC adoption: edition in force {ed}"
                f"{', effective ' + r['effectiveDate'] if r.get('effectiveDate') else ''}; scope {r.get('scope')}. "
                f"{r.get('notes') or ''}").strip()
        chunks.append({"id": cid("adoption", r["state"]), "kind": "row", "table": "nec-adoption-by-state", "text": text,
                       "state": r.get("stateAbbr"), "jurisdiction": r["state"], "level": "state", "docType": "code_adoption",
                       "necEdition": r.get("editionInForce"), "effectiveDate": r.get("effectiveDate"),
                       "url": r.get("officialSourceUrl") or r.get("sourceUrl"), "asOf": r.get("asOf"),
                       "confidence": r.get("confidence"), "redistributable": True, "necSections": []})
    abbr = {r["state"]: r.get("stateAbbr") for r in json.load(open(os.path.join(nat, "nec-adoption-by-state.json")))}
    for r in json.load(open(os.path.join(nat, "electrician-licensing-by-state.json"))):
        st = r.get("state") or r.get("name") or "?"
        r.setdefault("stateAbbr", abbr.get(st) or (st if len(st) == 2 else None))
        text = f"{st} electrician licensing: " + "; ".join(
            f"{k}: {v}" for k, v in r.items() if k not in ("state", "sourceUrl", "asOf") and v not in (None, "", []))
        chunks.append({"id": cid("license", st), "kind": "row", "table": "electrician-licensing-by-state", "text": text[:1800],
                       "state": r.get("stateAbbr"), "jurisdiction": st, "level": "state", "docType": "licensing",
                       "url": r.get("sourceUrl") or r.get("agencyUrl"), "asOf": r.get("asOf"),
                       "confidence": r.get("confidence"), "redistributable": True, "necSections": []})
    for i, r in enumerate(json.load(open(os.path.join(nat, "nec-edition-changes.json")))):
        text = f"NEC {r.get('fromEdition')} to {r.get('toEdition')}, {r.get('necSection')} {r.get('topic')}: {r.get('summary')}"
        chunks.append({"id": cid("change", str(i)), "kind": "row", "table": "nec-edition-changes", "text": text,
                       "state": None, "jurisdiction": "Model NEC", "level": "model", "docType": "code_change",
                       "necEdition": r.get("toEdition"), "fromEdition": r.get("fromEdition"),
                       "url": r.get("sourceUrl"), "redistributable": True,
                       "necSections": sorted(set(SECTION_RE.findall(r.get("necSection") or "")))})

    old = os.path.join(OUT, "chunks.jsonl")
    if os.path.exists(old):
        os.remove(old)
    with gzip.open(os.path.join(OUT, "chunks.jsonl.gz"), "wt", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    json.dump({"builtAt": date.today().isoformat(), "chunks": len(chunks),
               "byKind": {k: sum(c["kind"] == k for c in chunks) for k in ("fact", "doc", "row")},
               "sources": sources}, open(os.path.join(OUT, "index.json"), "w"), indent=2)
    print(len(chunks), "chunks")


main()
