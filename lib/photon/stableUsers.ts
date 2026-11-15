// OWNER: Zohaib (Photon). Photon 1.0 shared-pool users.
// On the shared pool, a line only talks to people registered as users of this project, and Photon gives each user
// their own number (assignedPhoneNumber). Someone who isn't registered, or who texts a number that isn't theirs, gets
// "This number didn't recognize yours". So Boomer registers people itself before it texts them, then texts first:
// they answer in that thread and never need to know which number is theirs.
// API: https://spectrum.photon.codes/projects/{id}/users, Basic auth with the project id and secret.

import { normalizePhone } from "@/lib/db/phone";

const API = "https://spectrum.photon.codes";
const TIMEOUT_MS = 10_000;

export interface StableUser {
  id: string;
  phoneNumber: string;
  /** The pool number Photon gave this person. Their Boomer thread is with this number. */
  assignedPhoneNumber?: string;
}

const g = globalThis as unknown as { __stableUsers?: Map<string, Promise<StableUser>> };
const cache = () => (g.__stableUsers ??= new Map());

const last10 = (p: string) => p.replace(/\D/g, "").slice(-10);

function auth(): string {
  const id = process.env.PHOTON_STABLE_PROJECT_ID!;
  return "Basic " + Buffer.from(`${id}:${process.env.PHOTON_STABLE_PROJECT_SECRET}`).toString("base64");
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}/projects/${process.env.PHOTON_STABLE_PROJECT_ID}${path}`, {
    ...init,
    headers: { Authorization: auth(), "content-type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as { succeed?: boolean; data?: T; code?: string; message?: string } | null;
  if (!res.ok || !body?.succeed) {
    throw new Error(`Photon 1.0 users ${init.method ?? "GET"} ${res.status} ${body?.code ?? ""} ${String(body?.message ?? "").slice(0, 160)}`.trim());
  }
  return body.data as T;
}

async function find(phone: string): Promise<StableUser | null> {
  const data = await call<{ users: StableUser[] }>(`/users?search=${encodeURIComponent(phone)}&limit=20`);
  return data.users.find((u) => last10(u.phoneNumber) === last10(phone)) ?? null;
}

async function firstName(phone: string): Promise<string> {
  try {
    const { getWorkerByPhone } = await import("@/lib/db/workers");
    const w = await getWorkerByPhone(phone);
    if (w?.name) return w.name.split(" ")[0];
  } catch {
    // no name on file is fine
  }
  return "Boomer";
}

async function register(phone: string): Promise<StableUser> {
  const existing = await find(phone);
  if (existing) return existing;
  try {
    return await call<StableUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        type: "shared",
        firstName: await firstName(phone),
        lastName: "",
        // Required by the API. Boomer doesn't collect emails and never sends invites, so this is a placeholder.
        email: `boomer+${phone.replace(/\D/g, "")}@example.com`,
        phoneNumber: phone,
        sendInvite: false,
      }),
    }).then(async (u) => (u?.phoneNumber ? u : ((await find(phone)) ?? u)));
  } catch (err) {
    // Someone else registered them at the same moment: use that.
    const again = await find(phone).catch(() => null);
    if (again) return again;
    throw err;
  }
}

/**
 * Make sure `phone` is a user of the Photon 1.0 project (registering them if not), so Boomer can text them.
 * Cached per server; a failure is not cached, so the next send retries.
 */
export function ensureStableUser(rawPhone: string): Promise<StableUser> {
  const phone = normalizePhone(rawPhone);
  const key = last10(phone);
  let p = cache().get(key);
  if (!p) {
    p = register(phone);
    cache().set(key, p);
    p.catch(() => cache().delete(key));
  }
  return p;
}
