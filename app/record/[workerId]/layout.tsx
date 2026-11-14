// OWNER: Zohaib (additive, metadata only). Andy's page.tsx is a client component, so the link
// preview (Open Graph) for the shared work record lives here. Renders children unchanged.
import type { Metadata } from "next";
import { getWorker, listRecordEntries } from "@/lib/db";
import { buildWorkRecord } from "@/lib/record/buildEntry";
import { workerPreview } from "@/lib/record/preview";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { workerId: string } }): Promise<Metadata> {
  const worker = await getWorker(params.workerId).catch(() => null);
  const rec = worker ? buildWorkRecord(worker, await listRecordEntries(worker.id).catch(() => [])) : null;
  return workerPreview(rec, params.workerId);
}

export default function WorkRecordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
