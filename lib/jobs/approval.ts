// OWNER: Sunny. Supervisor sign-off on the plan, by iMessage.
//   look builds the plan -> requestApproval texts it to the supervisor (job sheet card when Photon 1.0 is set)
//   supervisor replies "approve" / changes / "hold off" -> decideFromText (called from lib/agents/inbox.ts)
//   next_step asks approvalGate before step 1: waits, or tells the worker the decision (and any note) first.
// The supervisor's note is added to the job and read to the worker. It never rewrites the checked steps,
// so a texted "skip the tester" can't get past a hard gate.
import type { ApprovalStatus, Job, PlanApproval, Worker } from "@/lib/types";
import { getContacts, isOpen, listJobs, listWorkers, normalizePhone, updateJob } from "@/lib/db";
import { refreshJobCards, sendJobCard, textAnyLine } from "@/lib/photon/miniapp";
import { sendText } from "@/lib/photon/send";
import { sendStableText } from "@/lib/photon/stable";
import { stableConfigured } from "@/lib/photon/stable";
import { absolute, pages } from "@/lib/routes";
import { remember } from "@/lib/memory/store";
import { guard } from "@/lib/agents/recorder";

const now = () => new Date().toISOString();

export function supervisorLabel(a: Pick<PlanApproval, "supervisorName">): string {
  return a.supervisorName ?? "your supervisor";
}

/** The plan as one iMessage: job, place, numbered steps with New here marks, and how to answer. */
export function planText(job: Job, worker: Worker): string {
  const place = job.site ? ` in ${job.site.city}, ${job.site.state}` : "";
  const steps = job.steps.map((s) => `${s.order}. ${s.text}${s.tag === "new_here" ? " (new here)" : ""}`).join("\n");
  return guard(
    [
      `Boomer: ${worker.name} has a plan ready for your OK.`,
      `Job: ${job.title ?? "job"}${place}.`,
      steps,
      stableConfigured() ? "" : `Job sheet: ${absolute(pages.miniJob(job.id))}`,
      `Reply APPROVE to start, or reply with any changes.`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

/**
 * Text the plan to the worker's supervisor. Returns null when no supervisor is on file.
 * Returns the job with approval set; approval.delivery "none" means the text didn't go through.
 */
export async function requestApproval(job: Job, worker: Worker): Promise<Job | null> {
  const c = await getContacts(worker.id);
  if (!c?.supervisorPhone) return null;
  // Like textAnyLine, but keeps the error so a failed send says why in the job memory.
  let sendError = "";
  const text = planText(job, worker);
  let sent = await sendText(c.supervisorPhone, text, `approval:${job.id}:${Date.now()}`).then(() => true, (e) => ((sendError = String(e).slice(0, 300)), false));
  if (!sent && stableConfigured()) sent = await sendStableText(c.supervisorPhone, text).then(() => true, (e) => ((sendError += ` | 1.0: ${String(e).slice(0, 200)}`), false));
  const delivery: PlanApproval["delivery"] = sent ? "text" : "none";
  const approval: PlanApproval = {
    status: "waiting",
    supervisorPhone: c.supervisorPhone,
    supervisorName: c.supervisorName,
    delivery,
    sentAt: now(),
  };
  const updated = await updateJob(job.id, (j) => ({ ...j, approval }));
  // The job sheet card is a second network round trip the worker shouldn't wait on: send it in the background
  // and mark the delivery once it lands. The plain text already went out, so the supervisor has the plan.
  if (sent && stableConfigured()) {
    sendJobCard(updated, c.supervisorPhone, "Plan for your OK")
      .then(async (card) => {
        if (card === "card") await updateJob(job.id, (j) => (j.approval ? { ...j, approval: { ...j.approval, delivery: "card" } } : j));
      })
      .catch(() => {});
  }
  const who = supervisorLabel(approval);
  await remember(job.id, {
    channel: "imessage",
    agent: "recorder",
    speaker: "agent",
    text: sent ? `Sent the plan to ${who} for approval.` : `Couldn't reach ${who} (${c.supervisorPhone}) with the plan. Error: ${sendError}`,
  }).catch(() => {});
  return updated;
}

export type Gate = { wait: true; say: string } | { wait: false; intro?: string };

/** Before step 1: is the job waiting on the supervisor? Pure. */
export function approvalGate(job: Job): Gate {
  const a = job.approval;
  if (!a) return { wait: false };
  const who = supervisorLabel(a);
  if (a.status === "waiting") return { wait: true, say: `Still waiting on ${who}.` };
  if (a.status === "rejected")
    return { wait: true, say: `${who} said hold off${a.note ? `: "${a.note}"` : ""}. Call them before you go on.` };
  if (a.told) return { wait: false };
  if (a.status === "changes") return { wait: false, intro: `${who} approved the plan with a note: "${a.note}".` };
  return { wait: false, intro: `${who} approved the plan.` };
}

/** Mark the decision as read to the worker. Pure. */
export function markTold(job: Job): Job {
  return job.approval ? { ...job, approval: { ...job.approval, told: true } } : job;
}

const APPROVE = /^\s*(approve[ds]?|yes|yep|yeah|ok(ay)?|good|looks good|lgtm|go( ahead)?|go for it|sounds good|all good|👍|✅)\b/i;
/** Unmistakable decision words, for telling a supervisor nothing is waiting (plain "ok"/"yes" stay with the other agents). */
const EXPLICIT = /^\s*(approved?|reject(ed)?|hold off)\b/i;
const REJECT = /^\s*(no|nope|reject(ed)?|hold( off)?|stop|wait|don'?t|do not|not yet)\b/i;

/** Supervisor's reply -> decision. "approve" alone approves; "approve, but ..." is approval with a note. Pure. */
export function parseDecision(text: string): { status: Exclude<ApprovalStatus, "waiting">; note?: string } {
  const t = text.trim();
  const no = t.match(REJECT);
  if (no) {
    const rest = t.slice(no[0].length).replace(/^[\s,.!:;-]+/, "").trim();
    return { status: "rejected", note: (rest.length >= 3 ? rest : t).slice(0, 300) };
  }
  const m = t.match(APPROVE);
  if (m) {
    const rest = t.slice(m[0].length).replace(/^[\s,.!:;-]+/, "").trim();
    return rest.length < 3 ? { status: "approved" } : { status: "changes", note: rest.replace(/^(but|and)\s+/i, "").slice(0, 300) };
  }
  return { status: "changes", note: t.slice(0, 300) };
}

/**
 * Same phone, however each side wrote it: "+12155550100", "(215) 555-0100", "tel:+1 215 555 0100".
 * Compares the last 10 digits (US numbers), so a sender handle in another format still finds the waiting plan.
 */
export function samePhone(a?: string | null, b?: string | null): boolean {
  const d = (x?: string | null) => (x ? normalizePhone(x).replace(/\D/g, "").slice(-10) : "");
  const x = d(a);
  return x.length === 10 && x === d(b);
}

/**
 * An inbound text from someone who is the supervisor on a job waiting for approval.
 * Returns the reply to the supervisor, or null when this text isn't an approval answer.
 */
export async function decideFromText(fromRaw: string, text: string): Promise<{ reply: string; jobId?: string } | null> {
  const waiting: { job: Job; worker: Worker }[] = [];
  const supervisorOf: Worker[] = [];
  for (const w of await listWorkers()) {
    const c = await getContacts(w.id);
    if (!samePhone(c?.supervisorPhone, fromRaw)) continue;
    supervisorOf.push(w);
    // Every open job of this worker that's waiting on the OK, not only the newest open one: a second open job
    // (a fresh call, a text that opened one) must not hide the plan the supervisor is answering.
    for (const job of await listJobs(w.id)) {
      if (isOpen(job) && job.approval?.status === "waiting" && samePhone(job.approval.supervisorPhone, fromRaw)) waiting.push({ job, worker: w });
    }
  }
  if (!waiting.length) {
    // A supervisor on file saying "approve" / "hold off" with no plan out: say so, instead of letting the text
    // fall through to the sign-up or recorder agent (which made it look like the approval went nowhere).
    if (supervisorOf.length && EXPLICIT.test(text)) {
      console.log(`[approval] decision text from a supervisor, but no plan is waiting (workers: ${supervisorOf.map((w) => w.id).join(", ")})`);
      const first = supervisorOf.length === 1 ? supervisorOf[0].name.split(" ")[0] : "your crew";
      return { reply: guard(`Thanks. There's no plan from ${first} waiting for your OK right now. I'll text you when one comes in.`) };
    }
    return null;
  }
  const { job, worker } = waiting.sort((a, b) => b.job.updatedAt.localeCompare(a.job.updatedAt))[0];

  const d = parseDecision(text);
  const updated = await updateJob(job.id, (j) =>
    j.approval ? { ...j, approval: { ...j.approval, status: d.status, note: d.note, decidedAt: now(), told: false } } : j,
  );
  const who = supervisorLabel(updated.approval!);
  await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "system", text: `${who} replied: "${text.trim().slice(0, 300)}"` }).catch(() => {});

  const toWorker =
    d.status === "approved"
      ? `${who} approved your plan. Tell Boomer "let's go" to start.`
      : d.status === "changes"
        ? `${who} approved your plan with a note: "${d.note}". Boomer will read it to you before step 1.`
        : `${who} said to hold off: "${d.note}". Call them before you go on.`;
  const toldWorker = await textAnyLine(worker.phone, guard(toWorker), `approval-decision:${job.id}:${Date.now()}`);
  refreshJobCards(updated).catch(() => {});

  const first = worker.name.split(" ")[0];
  const reply =
    d.status === "rejected"
      ? `Got it. ${first} will hold off${toldWorker ? " and I've told them" : ""}.`
      : `Got it. ${first} can start${d.status === "changes" ? ", and I'll read them your note first" : ""}.${toldWorker ? "" : " I couldn't text them, but Boomer will tell them on the call."}`;
  return { reply: guard(reply), jobId: job.id };
}
