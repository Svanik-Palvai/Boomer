"use client";
// OWNER: Lessons feature. Human edit/review is explicit; every content edit creates a new revision.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { lessonRequest } from "@/lib/lessons/client";
import type { Clip, LessonDraft, LessonRevision } from "@/lib/lessons/types";
import styles from "./lessons.module.css";
type Draft = LessonDraft & { viewer: { id: string; reviewer: boolean } };
export default function Editor({ id }: { id: string }) {
  const [d, setD] = useState<Draft>(),
    [edit, setEdit] = useState<LessonRevision>(),
    [index, setIndex] = useState(0),
    [message, setMessage] = useState("Loading private draft…"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [source, setSource] = useState(""),
    [audio, setAudio] = useState(""),
    [preview, setPreview] = useState(""),
    [name, setName] = useState(""),
    [credential, setCredential] = useState("");
  const video = useRef<HTMLVideoElement>(null),
    sound = useRef<HTMLAudioElement>(null),
    box = useRef<HTMLDivElement>(null),
    drag = useRef<{ id: string; dx: number; dy: number }>();
  async function refresh() {
    try {
      const next = await lessonRequest(`drafts/${id}`);
      setD(next);
      setEdit(next.edit);
      setDirty(false);
      setMessage(
        next.error ||
          "Draft loaded. Review media and sources before publishing.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Draft unavailable");
    }
  }
  useEffect(() => {
    void refresh();
  }, [id]);
  const clip = edit?.clips[index];
  useEffect(() => {
    let live = true;
    setSource("");
    setAudio("");
    if (clip) {
      void lessonRequest(
        `drafts/${id}/media?kind=source&session=${encodeURIComponent(clip.recordingId)}`,
      )
        .then((r) => {
          if (live) setSource(r.url);
        })
        .catch(() => {});
      void lessonRequest(
        `drafts/${id}/media?kind=audio&call=${encodeURIComponent(clip.callId)}`,
      )
        .then((r) => {
          if (live) setAudio(r.url);
        })
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [id, clip?.recordingId, clip?.callId, d?.revision]);
  function change(next: LessonRevision) {
    setEdit(next);
    setDirty(true);
    setPreview("");
  }
  function patch(p: Partial<Clip>) {
    if (edit && clip)
      change({
        ...edit,
        clips: edit.clips.map((c, i) => (i === index ? { ...c, ...p } : c)),
      });
  }
  async function action(path: string, extra: object = {}) {
    if (!d) return;
    setBusy(true);
    try {
      await lessonRequest(`drafts/${id}/${path}`, {
        revision: d.revision,
        ...extra,
      });
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  function add() {
    if (!d || !edit) return;
    const s = d.sessions.find((s) => s.status === "uploaded"),
      a = d.calls.find((a) => a.audioPath);
    if (!s || !a) {
      setMessage(
        "Wait for finalized video and original call audio; run the preparation worker and refresh.",
      );
      return;
    }
    change({
      ...edit,
      clips: [
        ...edit.clips,
        {
          id: crypto.randomUUID(),
          recordingId: s.id,
          callId: a.id,
          stepId: d.job.steps[0].id,
          start: 0,
          end: Math.min(10, s.duration ?? 10),
          caption: "Review this footage and identify the step.",
          kind: "action",
          annotations: [],
          freezeSeconds: 0,
          audioOffset: 0,
        },
      ],
    });
    setIndex(edit.clips.length);
  }
  function moveAnnotation(annotationId: string, x: number, y: number) {
    if (!clip) return;
    patch({
      annotations: clip.annotations.map((b) =>
        b.id === annotationId
          ? {
              ...b,
              x: Math.max(0, Math.min(1 - b.w, x)),
              y: Math.max(0, Math.min(1 - b.h, y)),
            }
          : b,
      ),
    });
  }
  if (!d || !edit)
    return (
      <main className={styles.editor}>
        <Link href="/lessons/workspace">Sign in / lesson workspace</Link>
        <h1>Private lesson editor</h1>
        <p role="status">{message}</p>
      </main>
    );
  return (
    <main className={styles.editor}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <Link href="/lessons/workspace">← Workspace</Link>
        <h1>Edit lesson</h1>
        <p>
          Revision {d.revision} · {d.status} {dirty && "· Unsaved edits"}
        </p>
        <p>
          Inert demo. Electrical test outcomes are simulated. Preserve
          corrections and distinguish worker confirmation from camera
          observations.
        </p>
        <label>
          Title
          <input
            value={edit.title}
            onChange={(e) => change({ ...edit, title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            value={edit.description}
            onChange={(e) => change({ ...edit, description: e.target.value })}
          />
        </label>
        <h2>Clips and chapters</h2>
        <div className={styles.actions}>
          {edit.clips.map((c, i) => (
            <button
              key={c.id}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            >
              {i + 1} · {c.kind.replaceAll("_", " ")}
            </button>
          ))}
          <button onClick={add}>Add clip</button>
        </div>
        {clip && (
          <section>
            <div className={styles.actions}>
              <label>
                Source recording
                <select
                  value={clip.recordingId}
                  onChange={(e) => patch({ recordingId: e.target.value })}
                >
                  {d.sessions
                    .filter((s) => s.status === "uploaded")
                    .map((s) => (
                      <option key={s.id}>{s.id}</option>
                    ))}
                </select>
              </label>
              <label>
                Original call
                <select
                  value={clip.callId}
                  onChange={(e) => patch({ callId: e.target.value })}
                >
                  {d.calls.map((c) => (
                    <option key={c.id}>{c.id}</option>
                  ))}
                </select>
              </label>
              <label>
                Step
                <select
                  value={clip.stepId}
                  onChange={(e) => patch({ stepId: e.target.value })}
                >
                  {d.job.steps.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.order}. {s.text}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div ref={box} className={styles.source}>
              {source ? (
                <video
                  ref={video}
                  controls
                  playsInline
                  src={source}
                  onTimeUpdate={() => {
                    if (
                      sound.current &&
                      video.current &&
                      !video.current.paused &&
                      Math.abs(
                        sound.current.currentTime -
                          video.current.currentTime -
                          clip.audioOffset,
                      ) > 0.3
                    )
                      sound.current.currentTime = Math.max(
                        0,
                        video.current.currentTime + clip.audioOffset,
                      );
                  }}
                  onPlay={() => {
                    if (sound.current && video.current) {
                      sound.current.currentTime = Math.max(
                        0,
                        video.current.currentTime + clip.audioOffset,
                      );
                      void sound.current
                        .play()
                        .catch(() =>
                          setMessage(
                            "Use the original-audio controls to enable playback.",
                          ),
                        );
                    }
                  }}
                  onPause={() => sound.current?.pause()}
                />
              ) : (
                <p>
                  Source preview is not ready. Start the laptop worker, then
                  refresh. Signed preview links expire; refresh to renew.
                </p>
              )}
              {source &&
                clip.annotations.map((b) => (
                  <div
                    role="button"
                    aria-label={`Move ${b.label}`}
                    tabIndex={0}
                    key={b.id}
                    className={styles.annotation}
                    style={{
                      left: `${b.x * 100}%`,
                      top: `${b.y * 100}%`,
                      width: `${b.w * 100}%`,
                      height: `${b.h * 100}%`,
                    }}
                    onPointerDown={(e) => {
                      const r = box.current!.getBoundingClientRect();
                      drag.current = {
                        id: b.id,
                        dx: (e.clientX - r.left) / r.width - b.x,
                        dy: (e.clientY - r.top) / r.height - b.y,
                      };
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      if (drag.current?.id !== b.id) return;
                      const r = box.current!.getBoundingClientRect();
                      moveAnnotation(
                        b.id,
                        (e.clientX - r.left) / r.width - drag.current.dx,
                        (e.clientY - r.top) / r.height - drag.current.dy,
                      );
                    }}
                    onPointerUp={() => (drag.current = undefined)}
                    onKeyDown={(e) => {
                      const dx =
                          e.key === "ArrowRight"
                            ? 0.01
                            : e.key === "ArrowLeft"
                              ? -0.01
                              : 0,
                        dy =
                          e.key === "ArrowDown"
                            ? 0.01
                            : e.key === "ArrowUp"
                              ? -0.01
                              : 0;
                      if (dx || dy) {
                        e.preventDefault();
                        moveAnnotation(b.id, b.x + dx, b.y + dy);
                      }
                    }}
                  >
                    {b.kind === "arrow" ? "↓ " : ""}
                    {b.label}
                  </div>
                ))}
            </div>
            {audio && <audio ref={sound} controls src={audio} />}
            <p>
              Boxes appear only on the selected freeze frame in the final
              export. Pause the preview there to place them accurately. All
              times below are source-video seconds.
            </p>
            <div className={styles.actions}>
              {(["start", "end", "audioOffset", "freezeSeconds"] as const).map(
                (k) => (
                  <label key={k}>
                    {k}
                    <input
                      type="number"
                      step="0.1"
                      value={clip[k]}
                      onChange={(e) => patch({ [k]: Number(e.target.value) })}
                    />
                  </label>
                ),
              )}
              <label>
                Freeze at
                <input
                  type="number"
                  step="0.1"
                  value={clip.freezeAt ?? ""}
                  onChange={(e) =>
                    patch({
                      freezeAt:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
              <button
                onClick={() => {
                  if (video.current)
                    patch({
                      freezeAt: video.current.currentTime,
                      freezeSeconds: 3,
                    });
                }}
              >
                Freeze at playhead
              </button>
              <label>
                Evidence label
                <select
                  value={clip.kind}
                  onChange={(e) =>
                    patch({ kind: e.target.value as Clip["kind"] })
                  }
                >
                  {[
                    "action",
                    "mistake",
                    "correction",
                    "worker_confirmation",
                  ].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Chapter caption
              <textarea
                value={clip.caption}
                onChange={(e) => patch({ caption: e.target.value })}
              />
            </label>
            <button
              onClick={() =>
                patch({
                  freezeAt: clip.freezeAt ?? clip.start,
                  freezeSeconds: clip.freezeSeconds || 3,
                  annotations: [
                    ...clip.annotations,
                    {
                      id: crypto.randomUUID(),
                      label: "Identify this part",
                      kind: "box",
                      x: 0.3,
                      y: 0.3,
                      w: 0.25,
                      h: 0.2,
                    },
                  ],
                })
              }
            >
              Add part annotation
            </button>
            {clip.annotations.map((b) => (
              <div className={styles.actions} key={b.id}>
                <label>
                  Label
                  <input
                    value={b.label}
                    onChange={(e) =>
                      patch({
                        annotations: clip.annotations.map((a) =>
                          a.id === b.id ? { ...a, label: e.target.value } : a,
                        ),
                      })
                    }
                  />
                </label>
                <select
                  aria-label="Annotation type"
                  value={b.kind}
                  onChange={(e) =>
                    patch({
                      annotations: clip.annotations.map((a) =>
                        a.id === b.id
                          ? { ...a, kind: e.target.value as "box" | "arrow" }
                          : a,
                      ),
                    })
                  }
                >
                  <option>box</option>
                  <option>arrow</option>
                </select>
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <label key={k}>
                    {k}
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={b[k]}
                      onChange={(e) =>
                        patch({
                          annotations: clip.annotations.map((a) =>
                            a.id === b.id
                              ? { ...a, [k]: Number(e.target.value) }
                              : a,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <button
                  onClick={() =>
                    patch({
                      annotations: clip.annotations.filter(
                        (a) => a.id !== b.id,
                      ),
                    })
                  }
                >
                  Remove annotation
                </button>
              </div>
            ))}
            <div className={styles.actions}>
              <button
                disabled={index === 0}
                onClick={() => {
                  const a = [...edit.clips];
                  [a[index - 1], a[index]] = [a[index], a[index - 1]];
                  change({ ...edit, clips: a });
                  setIndex(index - 1);
                }}
              >
                Move earlier
              </button>
              <button
                disabled={index === edit.clips.length - 1}
                onClick={() => {
                  const a = [...edit.clips];
                  [a[index], a[index + 1]] = [a[index + 1], a[index]];
                  change({ ...edit, clips: a });
                  setIndex(index + 1);
                }}
              >
                Move later
              </button>
              <button
                onClick={() => {
                  change({
                    ...edit,
                    clips: edit.clips.filter((_, i) => i !== index),
                  });
                  setIndex(0);
                }}
              >
                Remove clip
              </button>
            </div>
          </section>
        )}
        <h2>Editorial issues</h2>
        <p>
          Resolve each issue by inspecting the source. Removing a note does not
          establish electrical correctness; the electrician must review the
          rendered lesson.
        </p>
        <textarea
          aria-label="Unresolved issues, one per line"
          value={edit.issues.join("\n")}
          onChange={(e) =>
            change({
              ...edit,
              issues: e.target.value.split("\n").filter(Boolean),
            })
          }
        />
        <div className={styles.actions}>
          <button
            disabled={busy || !dirty}
            onClick={() => action("edit", { edit })}
          >
            Save new revision
          </button>
          <button disabled={busy || dirty} onClick={() => action("prepare")}>
            Retry media preparation
          </button>
          <button disabled={busy || dirty} onClick={() => action("render")}>
            Queue render
          </button>
          <button
            disabled={busy}
            onClick={() => {
              if (!dirty || confirm("Discard unsaved edits?")) void refresh();
            }}
          >
            Refresh status
          </button>
        </div>
        {d.render && (
          <>
            <button
              onClick={async () => {
                try {
                  setPreview(
                    (await lessonRequest(`drafts/${id}/media?kind=video`)).url,
                  );
                } catch (e) {
                  setMessage(String(e));
                }
              }}
            >
              Preview rendered revision
            </button>
            {preview && (
              <video
                controls
                playsInline
                style={{ width: "100%" }}
                src={preview}
              />
            )}
          </>
        )}
        <h2>Original transcript</h2>
        {d.calls.map((c) => (
          <details key={c.id}>
            <summary>
              {c.id} · {c.audioPath ? "Audio retained" : "Audio pending"}
            </summary>
            {c.turns.map((t, i) => (
              <label key={i}>
                {t.start.toFixed(1)}–{t.end.toFixed(1)} · {t.role} (original:{" "}
                {t.text})
                <textarea
                  value={
                    edit.captionEdits?.find(
                      (e) => e.callId === c.id && e.turn === i,
                    )?.text ?? t.text
                  }
                  onChange={(e) =>
                    change({
                      ...edit,
                      captionEdits: [
                        ...(edit.captionEdits ?? []).filter(
                          (a) => a.callId !== c.id || a.turn !== i,
                        ),
                        { callId: c.id, turn: i, text: e.target.value },
                      ],
                    })
                  }
                />
              </label>
            ))}
          </details>
        ))}
        <h2>Review and publishing</h2>
        <button disabled={busy || dirty} onClick={() => action("sync")}>
          I checked audio/video synchronization for this revision
        </button>
        {d.viewer.id === d.ownerId && (
          <button
            disabled={busy || dirty}
            onClick={() => {
              if (
                confirm(
                  "Allow the current rendered revision to be publicly published, including your original voice and selected footage?",
                )
              )
                void action("consent", { consent: true });
            }}
          >
            Give worker permission to publish this revision
          </button>
        )}
        {d.viewer.reviewer && (
          <>
            <label>
              Reviewing electrician’s name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Credential / role and jurisdiction
              <input
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
              />
            </label>
            <button
              disabled={busy || dirty}
              onClick={() => {
                if (
                  confirm(
                    "Have you watched this rendered revision and reviewed its instructions, regional sources, captions and annotations as the named electrician?",
                  )
                )
                  void action("review", { name, credential, reviewed: true });
              }}
            >
              Record review of current rendered revision
            </button>
            <button disabled={busy || dirty} onClick={() => action("publish")}>
              Publish reviewed lesson
            </button>
          </>
        )}
        <button disabled={busy} onClick={() => action("withdraw")}>
          Withdraw public access
        </button>
        <p role="status">{message}</p>
        <p>
          Save edits before rendering or reviewing. Every edit clears the
          previous render, review, synchronization check and publishing
          permission.
        </p>
      </fieldset>
    </main>
  );
}
