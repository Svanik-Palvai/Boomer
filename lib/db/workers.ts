// OWNER: Zohaib (backend)
import type { Experience, Jurisdiction, Worker } from "@/lib/types";
import { backend } from "./backend";
import { newId, nowIso, ready } from "./memoryStore";
import { normalizePhone } from "./phone";

export { normalizePhone };

export async function getWorker(id: string): Promise<Worker | null> {
  await ready();
  return backend().get<Worker>("worker", id);
}

export async function getWorkerByPhone(phone: string): Promise<Worker | null> {
  await ready();
  const [w] = await backend().list<Worker>("worker", { phone: normalizePhone(phone) });
  return w ?? null;
}

export async function listWorkers(): Promise<Worker[]> {
  await ready();
  return backend().list<Worker>("worker");
}

export interface WorkerInput {
  id?: string;
  name: string;
  phone: string;
  home: Jurisdiction;
  experience: Experience;
}

/** Create, or update when id (or phone) matches an existing worker. One worker per phone number. */
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
  await backend().put("worker", w.id, w, { phone: w.phone });
  return w;
}
