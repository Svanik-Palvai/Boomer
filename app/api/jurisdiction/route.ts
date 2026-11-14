import { NextResponse } from "next/server";
import { getJurisdiction, validCoordinates } from "@/lib/checks/jurisdiction";
export const dynamic = "force-dynamic";
let lastLookup = 0;
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const lat = Number(p.get("lat")),
    lng = Number(p.get("lng"));
  if (
    !p.get("lat")?.trim() ||
    !p.get("lng")?.trim() ||
    !validCoordinates(lat, lng)
  )
    return NextResponse.json(
      { error: "Valid lat and lng are required" },
      { status: 400 },
    );
  // Nominatim public service: at most one request per second per process.
  if (Date.now() - lastLookup < 1100)
    return NextResponse.json(
      { error: "Please wait a moment before retrying" },
      { status: 429 },
    );
  lastLookup = Date.now();
  try {
    return NextResponse.json(await getJurisdiction(lat, lng));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lookup failed" },
      { status: 503 },
    );
  }
}

/** Confirmation is explicit. A changed jurisdiction invalidates prior sign-offs and plan. */
export async function POST(req: Request) {
  const { getCase, saveCase } = await import("@/lib/cases/store");
  const { runChecks } = await import("@/lib/checks/runChecks");
  const towns = (await import("@/data/towns.json")).default;
  try {
    const body = await req.json();
    if (
      typeof body.caseId !== "string" ||
      typeof body.city !== "string" ||
      typeof body.state !== "string"
    )
      return NextResponse.json(
        { error: "caseId, city and state required" },
        { status: 400 },
      );
    const town = towns.find(
      (t) => t.city === body.city && t.state === body.state,
    );
    if (!town)
      return NextResponse.json(
        { error: "This town is not researched. Human review required." },
        { status: 422 },
      );
    const c = await getCase(body.caseId);
    if (!c)
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    if (
      (body.lat !== undefined || body.lng !== undefined) &&
      !validCoordinates(body.lat, body.lng)
    )
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 },
      );
    const site = {
      city: town.city,
      state: town.state,
      necEdition: town.necEdition,
      sourceUrl: town.sourceUrl,
    };
    const changed =
      c.job.site.city !== site.city ||
      c.job.site.state !== site.state ||
      c.job.site.necEdition !== site.necEdition;
    const job = { ...c.job, site, lat: body.lat, lng: body.lng };
    const checks = runChecks(job).map((k) =>
      k.type === "location"
        ? {
            ...k,
            status: "found" as const,
            result: `Worker confirmed ${site.city}, ${site.state}${body.lat === undefined ? " (manual)" : " (GPS)"}`,
          }
        : k,
    );
    return NextResponse.json(
      await saveCase({
        ...c,
        job,
        checks,
        ...(changed
          ? {
              plan: [],
              arProgress: [],
              status: "checks_done" as const,
              reviews: c.reviews.map((r) => ({
                ...r,
                decision: "pending" as const,
                at: undefined,
              })),
            }
          : {}),
      }),
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid confirmation" },
      { status: 400 },
    );
  }
}
