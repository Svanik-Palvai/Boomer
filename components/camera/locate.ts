"use client";
// OWNER: Andy (screens). "Show me": the worker takes the phone out of the harness, snaps a photo, and
// Boomer marks the part the current step is about.
//
// Contract with Sunny's lane (proposed; move the two types into lib/types.ts once agreed):
//   POST /api/locate  body LocateRequest  ->  LocateResult
// Until that route exists (404), this client falls back to a sample mark per demo step and labels it as
// a sample on screen, so the UI can be built and demoed without pretending the camera was read.

export interface LocateRequest {
  workerId: string;
  jobId?: string;
  /** The step the worker is on. The backend may also derive it from the job. */
  stepId?: string;
  /** data URL, ~1024 px JPEG, same as a frame. */
  image: string;
}

/** A box on the photo, as fractions of the image's width and height (0..1, origin top-left). */
export interface LocateBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LocateResult {
  /** False when Boomer can't find it with confidence. Then there is no box and nothing is drawn. */
  found: boolean;
  /** Short name of what's marked, e.g. "LINE terminals". */
  label: string;
  /** One sentence for the screen and the call, e.g. "These two screws are LINE. Check the marking on the device." */
  say: string;
  box?: LocateBox;
  confidence: number; // 0..1
  source: "gemini" | "fallback";
}

export const LOCATE_PATH = "/api/locate";

export async function locate(req: LocateRequest): Promise<LocateResult> {
  let r: Response;
  try {
    r = await fetch(LOCATE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    return notFound("I couldn't reach Boomer. Check the signal and try again.");
  }
  if (r.status === 404) return sampleMark(req.stepId);
  if (!r.ok) return notFound();
  const res = (await r.json()) as LocateResult;
  return validBox(res.box) ? res : { ...res, found: false, box: undefined };
}

function validBox(b?: LocateBox) {
  return (
    !!b &&
    [b.x, b.y, b.w, b.h].every((n) => Number.isFinite(n)) &&
    b.w > 0 &&
    b.h > 0 &&
    b.x >= 0 &&
    b.y >= 0 &&
    b.x + b.w <= 1.001 &&
    b.y + b.h <= 1.001
  );
}

function notFound(say = "Can't tell from here. Hold it closer and keep still."): LocateResult {
  return { found: false, label: "", say, confidence: 0, source: "fallback" };
}

/** Sample marks for the demo job's steps, used only while /api/locate doesn't exist. */
const SAMPLES: Record<string, Omit<LocateResult, "confidence" | "source" | "found">> = {
  "gfci-3-remove": {
    label: "Old receptacle",
    say: "That's the old receptacle. Pull it straight out so the wires come with it.",
    box: { x: 0.3, y: 0.3, w: 0.4, h: 0.4 },
  },
  "gfci-4-terminals": {
    label: "LINE pair",
    say: "These two screws should be LINE. Check the marking on the back of the device.",
    box: { x: 0.33, y: 0.34, w: 0.34, h: 0.08 },
  },
  "gfci-5-line": {
    label: "LINE pair",
    say: "The incoming wires go on these two screws, LINE. Check the marking before you land them.",
    box: { x: 0.33, y: 0.34, w: 0.34, h: 0.08 },
  },
};

function sampleMark(stepId?: string): LocateResult {
  const s = stepId ? SAMPLES[stepId] : undefined;
  if (!s) return notFound("Boomer can't mark anything for this step.");
  return { ...s, found: true, confidence: 0.5, source: "fallback" };
}
