// OWNER: Aniketh (location)
import { NextResponse } from "next/server";
import type { Jurisdiction } from "@/lib/types";
import { getJurisdiction, validCoordinates } from "@/lib/location/jurisdiction";
import { findTown, toJurisdiction } from "@/lib/location/towns";
import { getJob, updateJob } from "@/lib/db";
import { buildPlan } from "@/lib/ai/buildPlan";
import { emptyResults } from "@/lib/agent/engine";

export const dynamic = "force-dynamic";

// Nominatim public service: at most one request per second per process.
let lastLookup = 0;
async function lookup(lat: number, lng: number): Promise<Jurisdiction> {
  if (Date.now() - lastLookup < 1100) throw new Error("Please wait a moment before retrying");
  lastLookup = Date.now();
  return getJurisdiction(lat, lng);
}

/** GET ?lat=&lng= -> Jurisdiction (lookup only, nothing saved). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const lat = Number(p.get("lat"));
  const lng = Number(p.get("lng"));
  if (!p.get("lat")?.trim() || !p.get("lng")?.trim() || !validCoordinates(lat, lng))
    return NextResponse.json({ error: "Valid lat and lng are required" }, { status: 400 });
  try {
    return NextResponse.json(await lookup(lat, lng));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lookup failed" }, { status: 503 });
  }
}

/**
 * POST { jobId, lat, lng } (camera page GPS) or { jobId, city, state } (manual pick) -> sets job.site.
 * `confirmed: true` when the worker confirmed the town (out loud or by tapping).
 * If the town changes before guiding starts, the plan is rebuilt so New here tags match the new town.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    jobId?: string;
    lat?: number;
    lng?: number;
    accuracy?: number;
    city?: string;
    state?: string;
    confirmed?: boolean;
  };
  if (!body.jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });
  const job = await getJob(body.jobId);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let site: Jurisdiction;
  try {
    if (body.city && body.state) {
      const town = findTown(body.city, body.state);
      if (!town) return NextResponse.json({ error: "This town is not researched yet." }, { status: 422 });
      site = toJurisdiction(town);
    } else if (typeof body.lat === "number" && typeof body.lng === "number" && validCoordinates(body.lat, body.lng)) {
      site = await lookup(body.lat, body.lng);
    } else {
      return NextResponse.json({ error: "lat/lng or city/state required" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Lookup failed" }, { status: 503 });
  }

  const point = typeof body.lat === "number" && typeof body.lng === "number" ? { lat: body.lat, lng: body.lng, accuracy: body.accuracy } : job.point;
  const updated = await updateJob(job.id, (j) => {
    const changed = j.site?.city !== site.city || j.site?.state !== site.state;
    const replan = changed && j.jobType && j.status === "plan_ready";
    const steps = replan ? buildPlan(j.jobType!, j.home, site) : j.steps;
    return {
      ...j,
      site,
      point,
      siteConfirmed: body.confirmed ?? (changed ? false : j.siteConfirmed),
      ...(replan && { steps, results: emptyResults(steps), current: 0 }),
    };
  });
  return NextResponse.json(updated);
}
