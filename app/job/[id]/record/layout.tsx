// OWNER: Zohaib (additive, metadata only). Andy's page.tsx is a client component, so the link
// preview (Open Graph) for the texted record link lives here. Renders children unchanged.
import type { Metadata } from "next";
import { getRecordEntryByJob } from "@/lib/db";
import { jobPreview } from "@/lib/record/preview";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const e = await getRecordEntryByJob(params.id).catch(() => null);
  return jobPreview(e, params.id);
}

export default function JobRecordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
