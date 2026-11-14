// OWNER: Aniketh (location)
import { NextResponse } from "next/server";
import { z } from "zod";
import { getJurisdiction, validCoordinates } from "@/lib/location/jurisdiction";
import { findTown, toJurisdiction } from "@/lib/location/towns";
import { getJob, updateJob } from "@/lib/db";
import { buildPlan } from "@/lib/ai/buildPlan";
import { emptyResults } from "@/lib/agent/engine";
export const dynamic = "force-dynamic";
const bodySchema = z
  .object({
    jobId: z.string().min(1).max(200),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    accuracy: z.number().finite().nonnegative().max(1000).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    state: z
      .string()
      .trim()
      .regex(/^[a-zA-Z]{2}$/)
      .optional(),
    confirmed: z.boolean().optional(),
  })
  .superRefine((v, c) => {
    if (
      (v.lat === undefined) !== (v.lng === undefined) ||
      (v.city === undefined) !== (v.state === undefined) ||
      (!v.city && v.lat === undefined)
    )
      c.addIssue({
        code: "custom",
        message: "Provide a complete lat/lng or city/state pair",
      });
  });
function lookupError(e: unknown) {
  const message = e instanceof Error ? e.message : "Lookup unavailable";
  return NextResponse.json(
    { error: message },
    { status: message.includes("wait a moment") ? 429 : 503 },
  );
}
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams,
    lat = Number(p.get("lat")),
    lng = Number(p.get("lng"));
  if (
    !p.get("lat")?.trim() ||
    !p.get("lng")?.trim() ||
    !validCoordinates(lat, lng)
  )
    return NextResponse.json(
      { error: "Valid lat and lng required" },
      { status: 400 },
    );
  try {
    return NextResponse.json(await getJurisdiction(lat, lng));
  } catch (e) {
    return lookupError(e);
  }
}
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid location request", details: parsed.error.flatten() },
      { status: 400 },
    );
  const b = parsed.data;
  if (!(await getJob(b.jobId)))
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  let site;
  try {
    if (b.city && b.state) {
      const town = findTown(b.city, b.state);
      if (!town)
        return NextResponse.json(
          { error: "Manual fallback supports researched towns only" },
          { status: 422 },
        );
      site = toJurisdiction(town);
    } else site = await getJurisdiction(b.lat!, b.lng!);
  } catch (e) {
    return lookupError(e);
  }
  try {
    const updated = await updateJob(b.jobId, (j) => {
      const changed =
        j.site?.city !== site.city ||
        j.site?.state !== site.state ||
        j.site?.necEdition !== site.necEdition;
      // Check the latest state inside the atomic write, after slow network I/O.
      if (j.status === "done" || j.status === "stopped")
        throw new Error("Closed jobs cannot change location");
      if (
        changed &&
        (j.status === "guiding" ||
          j.current > 0 ||
          j.results.some((r) => r.attempts > 0))
      )
        throw new Error(
          "Stop this job and open a new job to change jurisdiction after work starts",
        );
      const replan = changed && !!j.jobType && j.status === "plan_ready";
      const steps = replan ? buildPlan(j.jobType!, j.home, site) : j.steps;
      return {
        ...j,
        site,
        point:
          b.lat !== undefined
            ? { lat: b.lat, lng: b.lng!, accuracy: b.accuracy }
            : changed
              ? undefined
              : j.point,
        siteConfirmed: b.confirmed ?? (changed ? false : j.siteConfirmed),
        ...(replan ? { steps, results: emptyResults(steps), current: 0 } : {}),
      };
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save location" },
      { status: 409 },
    );
  }
}
