// OWNER: Zohaib. How fast a step check gets a fresh picture after "done", and whether that picture is really fresh.
// Simulates the camera page's loop (lib/components/camera/useFrameCapture.ts: a still every interval, skipped while one
// is uploading, a burst of 3 when the server asks) against the real lib/db/frames.ts, with random upload delays.
// Compares the old path (1 s stills, wait for the burst) with the current one (FRAMES.intervalMs stills stamped with
// takenAt, so a still proven to be from after the request counts without waiting for the burst).
// Taking any still that merely lands after the request was tried first and judged pre-"done" frames on slow Wi-Fi. Run from the repo root: npx -y tsx --tsconfig tsconfig.json lib/db/frames.sim.ts
import { addFrame, burstWanted, framesAfterBurst, recentFrames, requestBurst } from "@/lib/db";
import { FRAMES } from "@/lib/config";
import type { Frame } from "@/lib/types";

/** Gap between the worker finishing "done" and check_step reaching the server (speech-to-text, "Checking", the tool call). */
const SPEECH_TO_TOOL_MS = 1000;
const TRIALS = 40;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
/** When each frame was actually taken on the phone (the server only knows when it landed). */
const takenAt = new Map<string, number>();

/**
 * The camera page's loop, for one job, until stop() is called. The phone's clock is off from the server's by up to
 * 5 s either way; with `stamp` it sends takenAt the way useFrameCapture does (skew from each ack, largest of the last 10).
 */
function phone(jobId: string, intervalMs: number, net: [number, number], stamp: boolean) {
  const clockOff = rand(-5000, 5000);
  const phoneNow = () => Date.now() + clockOff;
  const samples: number[] = [];
  let inFlight = false;
  let on = true;
  const send = async (burst: boolean) => {
    const t = Date.now();
    const skew = samples.length ? Math.max(...samples) : null;
    const est = stamp && skew !== null ? phoneNow() + skew : undefined;
    await sleep(rand(...net)); // the photo going up
    const f = await addFrame({ jobId, workerId: "sim", image: "data:image/jpeg;base64,AAAA", burst }, est);
    takenAt.set(f.id, t);
    const want = await burstWanted(jobId);
    const serverNow = Date.now();
    await sleep(rand(20, net[0])); // the small ack coming back
    samples.push(serverNow - phoneNow());
    if (samples.length > 10) samples.shift();
    return want;
  };
  const id = setInterval(async () => {
    if (!on || inFlight) return;
    inFlight = true;
    try {
      if (await send(false)) for (let i = 0; i < FRAMES.burst; i++) await send(true);
    } finally {
      inFlight = false;
    }
  }, intervalMs);
  return () => ((on = false), clearInterval(id));
}

/** framesAfterBurst as it was before: wait until a burst frame clears the flag. */
async function oldFramesAfterBurst(jobId: string, waitMs = 2500, pollMs = 150): Promise<Frame[]> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline && (await burstWanted(jobId))) await sleep(pollMs);
  return recentFrames(jobId, { limit: FRAMES.checkFrames });
}

type Mode = "old" | "new";
interface Trial { waitMs: number; newestStale: boolean; anyStale: boolean; none: boolean }

async function trial(mode: Mode, net: [number, number], n: number): Promise<Trial> {
  const jobId = `sim-${mode}-${net[1]}-${n}`;
  const stop = phone(jobId, mode === "old" ? 1000 : FRAMES.intervalMs, net, mode === "new");
  await sleep(rand(3000, 4000)); // camera running a while; "done" lands at a random point in the cycle
  const done = Date.now();
  await sleep(SPEECH_TO_TOOL_MS);
  const asked = Date.now();
  await requestBurst(jobId);
  const frames = mode === "old" ? await oldFramesAfterBurst(jobId) : await framesAfterBurst(jobId);
  const waitMs = Date.now() - asked;
  stop();
  const stale = (f: Frame) => (takenAt.get(f.id) ?? 0) < done;
  return { waitMs, newestStale: !!frames[0] && stale(frames[0]), anyStale: frames.some(stale), none: frames.length === 0 };
}

const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))];

async function main() {
  const nets: [string, [number, number]][] = [["good Wi-Fi (100-400 ms)", [100, 400]], ["venue Wi-Fi (300-1200 ms)", [300, 1200]]];
  console.log(`${TRIALS} checks per row; "done" is said ${SPEECH_TO_TOOL_MS} ms before check_step reaches the server.`);
  console.log("stale = a frame the check judged was taken before the worker said done.\n");
  let fails = 0;
  for (const [label, net] of nets) {
    for (const mode of ["old", "new"] as Mode[]) {
      const rows = await Promise.all(Array.from({ length: TRIALS }, (_, i) => trial(mode, net, i)));
      const w = rows.map((r) => r.waitMs);
      const newestStale = rows.filter((r) => r.newestStale).length;
      const anyStale = rows.filter((r) => r.anyStale).length;
      console.log(
        `${label.padEnd(27)} ${mode}: wait p50 ${String(pct(w, 50)).padStart(4)} ms, p90 ${String(pct(w, 90)).padStart(4)} ms, max ${String(Math.max(...w)).padStart(4)} ms | newest frame stale ${newestStale}/${TRIALS}, any frame stale ${anyStale}/${TRIALS}`,
      );
      if (mode === "new" && anyStale > 0) {
        fails++;
        console.log("   FAIL: the new path judged a frame from before \"done\"");
      }
    }
  }
  process.exit(fails ? 1 : 0);
}

main();
