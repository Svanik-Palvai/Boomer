// OWNER: Zohaib (backend). Small per-phone state for the text agents: a worker's supervisor, and an in-progress text sign-up.
import type { Experience } from "@/lib/types";
import { backend } from "./backend";
import { nowIso, ready } from "./memoryStore";
import { normalizePhone } from "./phone";

/** Who the worker wants alerted, and only when they ask. Keyed by worker id. */
export interface Contacts {
  workerId: string;
  supervisorPhone?: string;
  supervisorName?: string;
  updatedAt: string;
}

export async function getContacts(workerId: string): Promise<Contacts | null> {
  await ready();
  return backend().get<Contacts>("contact", workerId);
}

export async function saveContacts(workerId: string, patch: Partial<Omit<Contacts, "workerId" | "updatedAt">>): Promise<Contacts> {
  await ready();
  const cur = (await getContacts(workerId)) ?? { workerId, updatedAt: nowIso() };
  const next: Contacts = { ...cur, ...patch, workerId, updatedAt: nowIso() };
  if (next.supervisorPhone) next.supervisorPhone = normalizePhone(next.supervisorPhone);
  await backend().put("contact", workerId, next, { workerId });
  return next;
}

/** A text sign-up in progress, keyed by phone. Fields fill in over a few texts. */
export interface Signup {
  phone: string;
  name?: string;
  city?: string;
  state?: string;
  experience?: Experience;
  startedAt: string;
}

export async function getSignup(phone: string): Promise<Signup | null> {
  await ready();
  return backend().get<Signup>("signup", normalizePhone(phone));
}

export async function saveSignup(s: Signup): Promise<void> {
  await ready();
  const phone = normalizePhone(s.phone);
  await backend().put("signup", phone, { ...s, phone }, { phone });
}

export async function clearSignup(phone: string): Promise<void> {
  await ready();
  await backend().del("signup", normalizePhone(phone));
}
