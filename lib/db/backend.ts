// OWNER: Zohaib (backend)
/**
 * Storage backend behind lib/db/*. In-memory by default; Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 * Nobody outside lib/db imports this.
 *
 * On Vercel every request can land on a different instance, so the in-memory backend only works
 * for `npm run dev` / one `next start` process. Use Supabase for anything deployed.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Frame } from "@/lib/types";
import { FRAMES } from "@/lib/config";

export type Kind = "worker" | "job" | "record" | "toollog" | "flag" | "contact" | "signup";
export interface Index {
  workerId?: string;
  jobId?: string;
  phone?: string;
}

export interface Backend {
  name: "memory" | "supabase";
  get<T>(kind: Kind, id: string): Promise<T | null>;
  put<T>(kind: Kind, id: string, data: T, index?: Index): Promise<void>;
  list<T>(kind: Kind, filter?: Index): Promise<T[]>;
  /** Read-modify-write with retry on concurrent change. Throws if missing. */
  update<T>(kind: Kind, id: string, fn: (cur: T) => T, index?: (next: T) => Index): Promise<T>;
  del(kind: Kind, id: string): Promise<void>;
  /** Insert-if-absent. True the first time `id` is claimed. */
  claim(kind: Kind, id: string): Promise<boolean>;
  addFrame(f: Frame): Promise<void>;
  frames(jobId: string, opts: { sinceMs?: number; limit: number }): Promise<Frame[]>;
  frame(jobId: string, frameId: string): Promise<Frame | null>;
  /** Delete frames older than the newest `keep`, except ids in `pinned`. */
  pruneFrames(jobId: string, keep: number, pinned: string[]): Promise<void>;
  wipe(): Promise<void>;
}

// ───────────── memory ─────────────

interface Row {
  data: unknown;
  index: Index;
}

function memoryBackend(): Backend {
  const g = globalThis as unknown as { __boomerMem?: { docs: Map<string, Row>; frames: Map<string, Frame[]> } };
  const s = () => (g.__boomerMem ??= { docs: new Map(), frames: new Map() });
  const key = (k: Kind, id: string) => `${k}:${id}`;
  const matches = (ix: Index, f: Index = {}) =>
    (!f.workerId || ix.workerId === f.workerId) && (!f.jobId || ix.jobId === f.jobId) && (!f.phone || ix.phone === f.phone);

  return {
    name: "memory",
    async get(k, id) {
      return (s().docs.get(key(k, id))?.data as never) ?? null;
    },
    async put(k, id, data, index = {}) {
      s().docs.set(key(k, id), { data: structuredClone(data), index });
    },
    async list(k, filter) {
      const out: never[] = [];
      for (const [kk, row] of s().docs) if (kk.startsWith(`${k}:`) && matches(row.index, filter)) out.push(row.data as never);
      return out;
    },
    async update(k, id, fn, index) {
      const row = s().docs.get(key(k, id));
      if (!row) throw new Error(`No ${k} ${id}`);
      const next = fn(row.data as never);
      s().docs.set(key(k, id), { data: next, index: index ? index(next) : row.index });
      return next;
    },
    async del(k, id) {
      s().docs.delete(key(k, id));
    },
    async claim(k, id) {
      if (s().docs.has(key(k, id))) return false;
      s().docs.set(key(k, id), { data: true, index: {} });
      return true;
    },
    async addFrame(f) {
      const list = s().frames.get(f.jobId) ?? [];
      list.push(f);
      s().frames.set(f.jobId, list);
    },
    async frames(jobId, { sinceMs, limit }) {
      return (s().frames.get(jobId) ?? [])
        .filter((f: Frame) => !sinceMs || Date.parse(f.at) >= sinceMs)
        .slice(-limit)
        .reverse();
    },
    async frame(jobId, frameId) {
      return (s().frames.get(jobId) ?? []).find((f: Frame) => f.id === frameId) ?? null;
    },
    async pruneFrames(jobId, keep, pinned) {
      const list = s().frames.get(jobId) ?? [];
      const cut = list.length - keep;
      if (cut <= 0) return;
      s().frames.set(jobId, list.filter((f: Frame, i: number) => i >= cut || pinned.includes(f.id)));
    },
    async wipe() {
      g.__boomerMem = undefined;
    },
  };
}

// ───────────── supabase ─────────────

function supabaseBackend(url: string, serviceKey: string): Backend {
  const db: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
    // Next.js caches fetch() in server code; job state must always be fresh (live view, mini app, voice tools).
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const ok = <T>(r: { data: T; error: { message: string } | null }) => {
    if (r.error) throw new Error(`[supabase] ${r.error.message}`);
    return r.data;
  };
  const cols = (ix: Index = {}) => ({ worker_id: ix.workerId ?? null, job_id: ix.jobId ?? null, phone: ix.phone ?? null });
  const toFrame = (r: { id: string; job_id: string; worker_id: string; at: string; image: string; burst: boolean }): Frame => ({
    id: r.id,
    jobId: r.job_id,
    workerId: r.worker_id,
    at: new Date(r.at).toISOString(),
    image: r.image,
    burst: r.burst,
  });

  const backend: Backend = {
    name: "supabase",
    async get(k, id) {
      const r = ok(await db.from("boomer_docs").select("data").eq("kind", k).eq("id", id).maybeSingle());
      return (r?.data as never) ?? null;
    },
    async put(k, id, data, index) {
      ok(
        await db
          .from("boomer_docs")
          .upsert({ kind: k, id, data, ...cols(index), updated_at: new Date().toISOString() }, { onConflict: "kind,id" }),
      );
    },
    async list(k, f = {}) {
      let q = db.from("boomer_docs").select("data").eq("kind", k);
      if (f.workerId) q = q.eq("worker_id", f.workerId);
      if (f.jobId) q = q.eq("job_id", f.jobId);
      if (f.phone) q = q.eq("phone", f.phone);
      return (ok(await q) ?? []).map((r: { data: unknown }) => r.data as never);
    },
    async update(k, id, fn, index) {
      for (let attempt = 0; attempt < 5; attempt++) {
        const row = ok(await db.from("boomer_docs").select("data, version").eq("kind", k).eq("id", id).maybeSingle()) as {
          data: never;
          version: number;
        } | null;
        if (!row) throw new Error(`No ${k} ${id}`);
        const next = fn(row.data);
        const patch = { data: next, version: row.version + 1, updated_at: new Date().toISOString(), ...(index && cols(index(next))) };
        const done = ok(await db.from("boomer_docs").update(patch).eq("kind", k).eq("id", id).eq("version", row.version).select("id"));
        if (done && done.length) return next;
      }
      throw new Error(`[supabase] ${k} ${id} kept changing; gave up after 5 tries`);
    },
    async del(k, id) {
      ok(await db.from("boomer_docs").delete().eq("kind", k).eq("id", id));
    },
    async claim(k, id) {
      const r = await db.from("boomer_docs").insert({ kind: k, id, data: true });
      if (!r.error) return true;
      if (r.error.code === "23505") return false; // unique violation: already claimed
      throw new Error(`[supabase] ${r.error.message}`);
    },
    async addFrame(f) {
      ok(await db.from("boomer_frames").insert({ id: f.id, job_id: f.jobId, worker_id: f.workerId, at: f.at, image: f.image, burst: !!f.burst }));
    },
    async frames(jobId, { sinceMs, limit }) {
      let q = db.from("boomer_frames").select("*").eq("job_id", jobId).order("at", { ascending: false }).limit(limit);
      if (sinceMs) q = q.gte("at", new Date(sinceMs).toISOString());
      return (ok(await q) ?? []).map(toFrame);
    },
    async frame(jobId, frameId) {
      const r = ok(await db.from("boomer_frames").select("*").eq("job_id", jobId).eq("id", frameId).maybeSingle());
      return r ? toFrame(r) : null;
    },
    async pruneFrames(jobId, keep, pinned) {
      const newest = keep > 0 ? (ok(await db.from("boomer_frames").select("id").eq("job_id", jobId).order("at", { ascending: false }).limit(keep)) ?? []) : [];
      const keepIds = [...newest.map((r: { id: string }) => r.id), ...pinned];
      if (!keepIds.length) {
        ok(await db.from("boomer_frames").delete().eq("job_id", jobId));
        return;
      }
      ok(await db.from("boomer_frames").delete().eq("job_id", jobId).not("id", "in", `(${keepIds.map((i) => `"${i}"`).join(",")})`));
    },
    async wipe() {
      ok(await db.from("boomer_frames").delete().neq("id", ""));
      ok(await db.from("boomer_docs").delete().neq("id", ""));
    },
  };
  return backend;
}

// ───────────── pick one ─────────────

const g = globalThis as unknown as { __boomerBackend?: Backend };

export function backend(): Backend {
  if (!g.__boomerBackend) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    g.__boomerBackend = url && key ? supabaseBackend(url, key) : memoryBackend();
    console.log(`[db] using ${g.__boomerBackend.name} backend`);
  }
  return g.__boomerBackend;
}

export const FRAME_KEEP = FRAMES.keepPerJob;
