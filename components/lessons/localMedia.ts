// OWNER: Lessons feature. IndexedDB preserves source chunks until verified upload/finalization.
export interface LocalRecording {
  id: string;
  lessonId: string;
  jobId: string;
  mime: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  count: number;
  interruptions: string[];
}
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("boomer-lesson-recordings", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("chunks", { keyPath: "key" });
      r.result.createObjectStore("sessions", { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error("Local recording storage unavailable"));
  });
}
async function transact<T>(
  store: string,
  mode: IDBTransactionMode,
  op: (s: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await db();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(store, mode),
      r = op(tx.objectStore(store));
    tx.oncomplete = () => {
      database.close();
      resolve(r.result);
    };
    tx.onabort = tx.onerror = () => {
      database.close();
      reject(
        new Error(
          "Local recording could not be saved; free device storage and retry",
        ),
      );
    };
  });
}
export const saveLocal = (s: LocalRecording) =>
  transact("sessions", "readwrite", (o) => o.put(s));
export const localSessions = () =>
  transact<LocalRecording[]>("sessions", "readonly", (o) => o.getAll());
export const saveChunk = (session: string, index: number, blob: Blob) =>
  transact("chunks", "readwrite", (o) =>
    o.put({ key: `${session}:${index}`, blob }),
  );
export const readChunk = async (session: string, index: number) =>
  (
    await transact<{ blob: Blob }>("chunks", "readonly", (o) =>
      o.get(`${session}:${index}`),
    )
  )?.blob;
export async function removeLocal(s: LocalRecording) {
  for (let i = 0; i < s.count; i++)
    await transact("chunks", "readwrite", (o) => o.delete(`${s.id}:${i}`));
  await transact("sessions", "readwrite", (o) => o.delete(s.id));
}
