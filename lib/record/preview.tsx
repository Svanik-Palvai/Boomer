// OWNER: Zohaib. Link previews (Open Graph) for the record pages, so the record link we text over
// Photon iMessage unfurls into a card: job title, town, steps done, "Observed by Boomer".
// Used by the additive layout.tsx files next to Andy's record pages and by app/api/og/**.
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import type { RecordEntry, WorkRecord } from "@/lib/types";
import { RECORD_LABEL } from "@/lib/copy";
import { APP_URL } from "@/lib/config";
import { absolute, api, pages } from "@/lib/routes";

export const OG_SIZE = { width: 1200, height: 630 };

/** One line for the job: "6 of 7 steps done · 5 seen on camera · 1 corrected". */
export function jobLine(e: RecordEntry): string {
  const { total, done, seen, corrected } = e.counts;
  return [`${done} of ${total} steps done`, `${seen} seen on camera`, corrected ? `${corrected} corrected` : ""]
    .filter(Boolean)
    .join(" · ");
}

export function jobPlace(e: RecordEntry): string {
  return `${e.city}, ${e.state} · ${e.codeEdition} NEC`;
}

/**
 * Page metadata. The image is an absolute APP_URL link to our /api/og route rather than an
 * opengraph-image.tsx file, because Next resolves file-based images to localhost in dev and
 * iMessage has to fetch it through the public tunnel.
 */
export function previewMetadata(title: string, description: string, path: string, imagePath: string): Metadata {
  const image = { url: absolute(imagePath), ...OG_SIZE, alt: `${title}. ${RECORD_LABEL}.` };
  return {
    metadataBase: new URL(APP_URL),
    title: `${title} · Boomer`,
    description,
    openGraph: { title, description, url: absolute(path), siteName: "Boomer", type: "article", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export function jobPreview(e: RecordEntry | null, jobId: string): Metadata {
  const path = pages.jobRecord(jobId);
  if (!e) return previewMetadata("Job record", RECORD_LABEL, path, api.ogJob(jobId));
  return previewMetadata(e.title, `${jobPlace(e)}. ${jobLine(e)}. ${RECORD_LABEL}.`, path, api.ogJob(jobId));
}

export function workerPreview(rec: WorkRecord | null, workerId: string): Metadata {
  const path = pages.workRecord(workerId);
  if (!rec) return previewMetadata("Work record", RECORD_LABEL, path, api.ogRecord(workerId));
  const states = Object.keys(rec.totals.byState).join(", ");
  const jobs = `${rec.totals.jobs} job${rec.totals.jobs === 1 ? "" : "s"}${states ? ` in ${states}` : ""}`;
  return previewMetadata(`${rec.worker.name}'s work record`, `${jobs}. ${RECORD_LABEL}.`, path, api.ogRecord(workerId));
}

/** The card image: label row, big title, town, steps line. Same look for both pages. */
export function previewImage(card: { kicker: string; title: string; place: string; line: string }): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#2e353d",
          color: "#f4f1ea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, color: "#f2b134" }}>
          <div style={{ display: "flex", letterSpacing: 2, textTransform: "uppercase" }}>{card.kicker}</div>
          <div style={{ display: "flex" }}>{RECORD_LABEL}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{card.title}</div>
          <div style={{ display: "flex", fontSize: 38, color: "#c9c4b8" }}>{card.place}</div>
        </div>
        <div style={{ display: "flex", fontSize: 38 }}>{card.line}</div>
      </div>
    ),
    OG_SIZE,
  );
}
