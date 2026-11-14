// OWNER: Zohaib (backend)
import type { Experience, Jurisdiction, Worker } from "@/lib/types";
import { newId, nowIso, tables } from "./memoryStore";

/** "+1 (215) 555-0123", "2155550123" -> "+12155550123". US numbers only for now. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits;
}

export async function getWorker(id: string): Promise<Worker | null> {
  return tables().workers.get(id) ?? null;
}

export async function getWorkerByPhone(phone: string): Promise<Worker | null> {
  const p = normalizePhone(phone);
  for (const w of tables().workers.values()) if (normalizePhone(w.phone) === p) return w;
  return null;
}

export async function listWorkers(): Promise<Worker[]> {
  return [...tables().workers.values()];
}

export interface WorkerInput {
  id?: string;
  name: string;
  phone: string;
  home: Jurisdiction;
  experience: Experience;
}

/** Create, or update when id (or phone) matches an existing worker. */
export async function saveWorker(input: WorkerInput): Promise<Worker> {
  const existing = (input.id && (await getWorker(input.id))) || (await getWorkerByPhone(input.phone));
  const w: Worker = {
    id: existing?.id ?? input.id ?? newId("worker"),
    createdAt: existing?.createdAt ?? nowIso(),
    name: input.name,
    phone: normalizePhone(input.phone),
    home: input.home,
    experience: input.experience,
  };
  tables().workers.set(w.id, w);
  return w;
}
