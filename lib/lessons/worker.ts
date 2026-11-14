// OWNER: Lessons feature. Trusted local worker; service credentials never reach the browser.
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdtemp, writeFile, appendFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { bucket, database, load, mutate, sign } from "./store";
import { propose, vtt } from "./proposal";
import {
  timeline,
  validateEvidence,
  type LessonDraft,
  type RenderTask,
} from "./types";
class MediaPendingError extends Error {}
const binary = () => process.env.FFMPEG_PATH || "ffmpeg";
export async function ffmpeg(args: string[], allowFailure = false) {
  return new Promise<string>((resolve, reject) => {
    const p = spawn(binary(), ["-hide_banner", "-nostdin", ...args], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => p.kill("SIGKILL"), 600000);
    p.stderr.on("data", (c) => (stderr = (stderr + c).slice(-20000)));
    p.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      code === 0 || allowFailure
        ? resolve(stderr)
        : reject(new Error(`FFmpeg failed (${code}): ${stderr.slice(-800)}`));
    });
  });
}
export async function mediaDuration(file: string) {
  const text = await ffmpeg(["-i", file], true);
  let m = text.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) {
    // Browser MediaRecorder streams often omit duration metadata. Decode/probe the
    // actual stream rather than rejecting valid WebM or guessing from wall clocks.
    const decoded = await ffmpeg(["-i", file, "-f", "null", "-"]);
    const times = [...decoded.matchAll(/time=(\d+):(\d+):([\d.]+)/g)];
    m = times[times.length - 1] ?? null;
  }
  if (!m)
    throw new Error(
      "Invalid/incomplete media or duration could not be determined",
    );
  const duration = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error("Empty media source");
  return duration;
}

async function download(path: string, target: string) {
  const r = await fetch(await sign(path), {
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error("Source download failed");
  await writeFile(target, Buffer.from(await r.arrayBuffer()));
}
export async function assemble(d: LessonDraft, dir: string) {
  const files = new Map<string, string>();
  for (const s of d.sessions.filter((s) => s.status === "uploaded")) {
    const file = join(dir, `${s.id}.source`);
    await writeFile(file, "");
    for (const part of [...s.parts].sort((a, b) => a.index - b.index)) {
      const r = await fetch(await sign(part.path), {
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) throw new Error("Recording part download failed");
      const bytes = Buffer.from(await r.arrayBuffer());
      if (bytes.length !== part.size)
        throw new Error("Recording part size changed");
      await appendFile(file, bytes);
    }
    const duration = await mediaDuration(file);
    if (Math.abs(duration - (s.duration ?? 0)) > 5)
      throw new Error(
        "Recording clock differs from media duration; inspect the source before rendering",
      );
    files.set(s.id, file);
  }
  for (const call of d.calls) {
    if (!call.audioPath) continue;
    const file = join(dir, `${call.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.audio`);
    await download(call.audioPath, file);
    files.set(call.id, file);
  }
  return files;
}
async function saveArtifact(path: string, file: string, type: string) {
  const { error } = await database()
    .storage.from(bucket)
    .upload(path, await readFile(file), {
      contentType: type,
      upsert: false,
      cacheControl: "0",
    });
  if (error) throw error;
  return path;
}
export async function render(
  d: LessonDraft,
  dir: string,
  files: Map<string, string>,
  writeArtifact = saveArtifact,
) {
  const issues = validateEvidence(d, d.edit);
  if (issues.length || !d.edit.clips.length)
    throw new Error(issues.join("; ") || "No selected clips");
  const outputs: string[] = [];
  for (const [i, t] of timeline(d.edit).entries()) {
    const c = t.clip,
      video = files.get(c.recordingId),
      audio = files.get(c.callId);
    if (!video || !audio) throw new Error("Missing source media");
    const segments: [number, number, boolean][] = [];
    if (c.freezeAt !== undefined && c.freezeSeconds > 0) {
      if (c.freezeAt > c.start) segments.push([c.start, c.freezeAt, false]);
      segments.push([c.freezeAt, c.freezeAt + c.freezeSeconds, true]);
      if (c.freezeAt < c.end) segments.push([c.freezeAt, c.end, false]);
    } else segments.push([c.start, c.end, false]);
    for (const [n, [start, end, freeze]] of segments.entries()) {
      const out = join(dir, `clip-${i}-${n}.mp4`),
        filters = [
          "scale=1280:720:force_original_aspect_ratio=decrease",
          "pad=1280:720:(ow-iw)/2:(oh-ih)/2",
          "setsar=1",
        ];
      // Boxes use normalized visible-image coordinates BEFORE letterboxing, so portrait sources align.
      const sourceFilters: string[] = [];
      if (freeze) {
        sourceFilters.push(
          "select=eq(n\\,0)",
          `tpad=stop_mode=clone:stop_duration=${c.freezeSeconds}`,
        );
        for (const [j, b] of c.annotations.entries()) {
          sourceFilters.push(
            `drawbox=x=iw*${b.x}:y=ih*${b.y}:w=iw*${b.w}:h=ih*${b.h}:color=yellow:t=4`,
          );
          const label = join(dir, `label-${i}-${j}.txt`);
          await writeFile(label, b.label);
          // textfile avoids injecting source-derived text into an FFmpeg expression.
          sourceFilters.push(
            `drawtext=textfile='${label}':expansion=none:x=w*${b.x}:y=max(0\\,h*${b.y}-28):fontsize=24:fontcolor=yellow:box=1:boxcolor=black@0.8`,
          );
          if (b.kind === "arrow")
            sourceFilters.push(
              `drawtext=text='v':x=w*${b.x + b.w / 2}:y=h*${b.y}:fontsize=40:fontcolor=yellow`,
            );
        }
      }
      const duration = end - start;
      const filter = [...sourceFilters, ...filters, "fps=30"].join(",");
      const args = freeze
        ? [
            "-ss",
            String(start),
            "-i",
            video,
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=48000:cl=stereo",
          ]
        : [
            "-ss",
            String(start),
            "-i",
            video,
            "-ss",
            String(start + c.audioOffset),
            "-i",
            audio,
          ];
      await ffmpeg([
        ...args,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-vf",
        filter,
        "-t",
        String(duration),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-y",
        out,
      ]);
      outputs.push(out);
    }
  }
  const list = join(dir, "concat.txt");
  await writeFile(list, outputs.map((f) => `file '${f}'`).join("\n"));
  const combined = join(dir, "combined.mp4");
  await ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-c",
    "copy",
    "-y",
    combined,
  ]);
  const captions = join(dir, "captions.vtt");
  await writeFile(captions, vtt(d));
  // Always burn the inert-demo notice. Chapter captions are on-page and selectable as VTT.
  const notice = join(dir, "notice.txt");
  await writeFile(
    notice,
    "INERT DEMONSTRATION | Electrical tests simulated | Observed by Boomer",
  );
  const output = join(dir, "lesson.mp4");
  await ffmpeg([
    "-i",
    combined,
    "-vf",
    `drawtext=textfile='${notice}':expansion=none:x=12:y=h-36:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.8`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-c:a",
    "copy",
    "-movflags",
    "+faststart",
    "-y",
    output,
  ]);
  const poster = join(dir, "poster.jpg");
  await ffmpeg(["-i", output, "-frames:v", "1", "-y", poster]);
  const root = `${d.id}/renders/${d.revision}/${randomUUID()}`;
  return {
    revision: d.revision,
    video: await writeArtifact(`${root}/lesson.mp4`, output, "video/mp4"),
    poster: await writeArtifact(`${root}/poster.jpg`, poster, "image/jpeg"),
    captions: await writeArtifact(`${root}/captions.vtt`, captions, "text/vtt"),
    duration: await mediaDuration(output),
  };
}
export async function runTask(
  task: RenderTask,
  assertLease: () => Promise<void> = async () => {},
) {
  const dir = await mkdtemp(join(tmpdir(), "boomer-lesson-"));
  try {
    let d = (await load(task.lesson_id)).document;
    if (task.kind === "prepare") {
      for (const s of d.sessions.filter(
        (s) => s.status === "uploaded" && !s.previewPath,
      )) {
        const files = await assemble({ ...d, sessions: [s], calls: [] }, dir);
        const preview = join(dir, `${s.id}-preview.mp4`);
        await ffmpeg([
          "-i",
          files.get(s.id)!,
          "-vf",
          "scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
          "-an",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-y",
          preview,
        ]);
        const previewPath = await saveArtifact(
          `${d.id}/previews/${randomUUID()}.mp4`,
          preview,
          "video/mp4",
        );
        await assertLease();
        d = await mutate(d.id, (x) => ({
          ...x,
          sessions: x.sessions.map((a) =>
            a.id === s.id ? { ...a, previewPath } : a,
          ),
        }));
      }

      for (const c of d.calls.filter((c) => !c.audioPath)) {
        if (!process.env.ELEVENLABS_API_KEY) continue;
        const r = await fetch(
          `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(c.id)}/audio`,
          {
            headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
            signal: AbortSignal.timeout(60000),
          },
        );
        if (!r.ok) continue;
        const file = join(dir, "call.mp3");
        await writeFile(file, Buffer.from(await r.arrayBuffer()));
        const duration = await mediaDuration(file);
        const audioPath = await saveArtifact(
          `${d.id}/calls/${randomUUID()}.mp3`,
          file,
          "audio/mpeg",
        );
        await assertLease();
        d = await mutate(d.id, (x) => ({
          ...x,
          calls: x.calls.map((a) =>
            a.id === c.id
              ? {
                  ...a,
                  audioPath,
                  duration,
                  turns: a.turns.map((t, i) =>
                    i === a.turns.length - 1 && t.end <= t.start
                      ? { ...t, end: duration }
                      : t,
                  ),
                }
              : a,
          ),
        }));
      }
      if (
        d.job.status !== "done" ||
        !d.sessions.some((s) => s.status === "uploaded") ||
        !d.calls.some((c) => c.audioPath && c.turns.length)
      ) {
        await mutate(d.id, (x) => ({
          ...x,
          error:
            "Waiting for completed job, finalized video, original call audio and timestamped transcript.",
        }));
        throw new MediaPendingError(
          "Waiting for source media or completed job",
        );
      }
      // Later call webhooks must never overwrite a human-edited or published revision.
      if (d.edit.clips.length || d.status === "published") return;
      d = await mutate(d.id, (x) => ({ ...x, status: "generating" }));
      const edit = await propose(d);
      await assertLease();
      await mutate(d.id, (x) =>
        x.edit.clips.length
          ? x
          : {
              ...x,
              edit,
              revision: x.revision + 1,
              status: "editing",
              error: undefined,
              review: undefined,
              publishConsent: undefined,
              render: undefined,
            },
      );
    } else {
      if (d.revision !== task.revision) return;
      const files = await assemble(d, dir);
      const output = await render(d, dir, files);
      await assertLease();
      await mutate(d.id, (x) =>
        x.revision !== task.revision
          ? x
          : {
              ...x,
              render: output,
              status: "ready_for_review",
              error: undefined,
            },
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export async function workOnce() {
  const db = database(),
    now = new Date().toISOString();
  const { data, error } = await db
    .from("boomer_lesson_tasks")
    .select("*")
    .or(
      `and(state.eq.queued,not_before.lte.${now}),and(state.eq.running,lease_until.lt.${now})`,
    )
    .order("created_at")
    .limit(10);
  if (error) throw error;
  for (const old of (data ?? []) as RenderTask[]) {
    const token = randomUUID();
    let q = db
      .from("boomer_lesson_tasks")
      .update({
        state: "running",
        lease_token: token,
        lease_until: new Date(Date.now() + 120000).toISOString(),
        attempts: old.attempts + 1,
      })
      .eq("id", old.id)
      .eq("state", old.state);
    q = old.lease_token
      ? q.eq("lease_token", old.lease_token)
      : q.is("lease_token", null);
    const { data: claimed, error } = await q.select("*");
    if (error) throw error;
    if (!claimed?.length) continue;
    let leaseLost = false;
    const heartbeat = setInterval(() => {
      void db
        .from("boomer_lesson_tasks")
        .update({ lease_until: new Date(Date.now() + 120000).toISOString() })
        .eq("id", old.id)
        .eq("lease_token", token)
        .select("id")
        .then(({ data, error }) => {
          if (error || !data?.length) leaseLost = true;
        });
    }, 30000);
    try {
      await runTask(claimed[0], async () => {
        const { data, error } = await db
          .from("boomer_lesson_tasks")
          .select("id")
          .eq("id", old.id)
          .eq("lease_token", token)
          .eq("state", "running")
          .gt("lease_until", new Date().toISOString());
        if (error || !data?.length) throw new Error("Worker lease expired");
      });
      if (leaseLost) throw new Error("Worker lease lost; task must be retried");
      await db
        .from("boomer_lesson_tasks")
        .update({ state: "done", lease_until: null, error: null })
        .eq("id", old.id)
        .eq("lease_token", token);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Worker failed";
      if (e instanceof MediaPendingError && old.attempts < 20) {
        await db
          .from("boomer_lesson_tasks")
          .update({
            state: "queued",
            not_before: new Date(Date.now() + 30000).toISOString(),
            lease_until: null,
            error: message,
          })
          .eq("id", old.id)
          .eq("lease_token", token);
        return true;
      }

      await db
        .from("boomer_lesson_tasks")
        .update({
          state: "failed",
          error: message.slice(0, 500),
          lease_until: null,
        })
        .eq("id", old.id)
        .eq("lease_token", token);
      await mutate(old.lesson_id, (d) =>
        d.revision !== old.revision && old.kind === "render"
          ? d
          : {
              ...d,
              error: message.slice(0, 500),
              status: old.kind === "render" ? "failed" : d.status,
            },
      ).catch(() => {});
    } finally {
      clearInterval(heartbeat);
    }
    return true;
  }
  return false;
}
