"use client";
// OWNER: Lessons feature. Supabase session tokens stay in the auth SDK, never in source URLs.
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./lessons.module.css";
import { lessonClient, lessonRequest } from "@/lib/lessons/client";
import type { LessonDraft } from "@/lib/lessons/types";
export default function Workspace() {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [account, setAccount] = useState(""),
    [items, setItems] = useState<{ id: string; document: LessonDraft }[]>([]),
    [worker, setWorker] = useState("worker-demo"),
    [jobId, setJobId] = useState(""),
    [importConsent, setImportConsent] = useState(false),
    [user, setUser] = useState("");
  async function refresh() {
    try {
      const c = await lessonClient();
      const { data } = await c.auth.getSession();
      if (!data.session) {
        setAccount("");
        return;
      }
      setAccount(data.session.user.id);
      setItems(await lessonRequest("drafts"));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Workspace unavailable");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function login() {
    try {
      const c = await lessonClient();
      const { error } = await c.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/lessons/workspace` },
      });
      if (error) throw error;
      setMessage("Check your email for a sign-in link or verification code.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sign-in failed");
    }
  }
  async function verify() {
    try {
      const { error } = await (
        await lessonClient()
      ).auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw error;
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Verification failed");
    }
  }
  return (
    <main className={styles.workspace}>
      <Link href="/lessons">← Published lessons</Link>
      <span className={styles.eyebrow}>PRIVATE / TEAM WORKSPACE</span>
      <h1>From a finished job<br />to a useful lesson.</h1>
      <p>
        Private recordings become a lesson only after editing, electrician
        review and the worker’s publishing permission.
      </p>
      {!account ? (
        <section className={styles.signin}>
          <h2>Sign in to your notebook</h2>
          <p>Your source recordings and drafts stay private.</p>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="btn" onClick={login}>
            Email sign-in link
          </button>
          <label>
            Email verification code
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button onClick={verify}>Verify code</button>
        </section>
      ) : (
        <>
          <p>
            Account ID:{" "}
            <code style={{ overflowWrap: "anywhere" }}>{account}</code>
          </p>
          <button
            onClick={async () => {
              await (await lessonClient()).auth.signOut();
              setAccount("");
              setItems([]);
            }}
          >
            Sign out
          </button>
          <button onClick={refresh}>Refresh</button>
          <details>
            <summary>Create a lesson from an existing job recording</summary>
            <p>Enter a Boomer job you own. Open the private draft to upload a video with original audio and transcript. A phone-call provider is optional.</p>
            <label>Job ID<input value={jobId} onChange={e => setJobId(e.target.value)} /></label>
            <label><input type="checkbox" checked={importConsent} onChange={e => setImportConsent(e.target.checked)} />I consent to preparing a private lesson from this job.</label>
            <button disabled={!jobId.trim() || !importConsent} onClick={async () => {
              try {
                const draft = await lessonRequest(`jobs/${encodeURIComponent(jobId.trim())}`, { consent: true });
                location.assign(`/lessons/${encodeURIComponent(draft.id)}/edit`);
              } catch (e) { setMessage(e instanceof Error ? e.message : "Could not create draft"); }
            }}>Open private draft</button>
          </details>
          <h2>Private drafts</h2>
          {items.length ? (
            items.map(({ id, document: d }) => (
              <article className={styles.draftCard} key={id}>
                <Link href={`/lessons/${id}/edit`}>{d.edit.title}</Link> ·{" "}
                {d.status.replaceAll("_", " ")}
                {d.error && ` · ${d.error}`}
              </article>
            ))
          ) : (
            <p>
              No drafts. Sign in on the harness phone, then opt in to lesson
              recording from the camera page.
            </p>
          )}
          <details>
            <summary>Reviewer: link a worker to their account</summary>
            <p>
              Requires an allowlisted reviewer. Copy the worker’s account ID
              after they sign in; a phone number or demo worker ID alone does
              not establish ownership.
            </p>
            <label>
              Worker ID
              <input
                value={worker}
                onChange={(e) => setWorker(e.target.value)}
              />
            </label>
            <label>
              Supabase account UUID
              <input value={user} onChange={(e) => setUser(e.target.value)} />
            </label>
            <button
              onClick={async () => {
                try {
                  await lessonRequest("workers", {
                    workerId: worker,
                    userId: user,
                  });
                  setMessage("Worker account linked.");
                } catch (e) {
                  setMessage(
                    e instanceof Error ? e.message : "Could not link worker",
                  );
                }
              }}
            >
              Link account
            </button>
          </details>
        </>
      )}
      <p className={message ? styles.feedback : undefined} role="status">{message}</p>
    </main>
  );
}
