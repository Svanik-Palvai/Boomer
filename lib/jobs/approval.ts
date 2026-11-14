// OWNER: Sunny. Supervisor sign-off on the plan, by iMessage.
//   look builds the plan -> requestApproval texts it to the supervisor (job sheet card when Photon 1.0 is set)
//   supervisor replies "approve" / changes / "hold off" -> decideFromText (called from lib/agents/inbox.ts)
//   next_step asks approvalGate before step 1: waits, or tells the worker the decision (and any note) first.
// The supervisor's note is added to the job and read to the worker. It never rewrites the checked steps,
// so a texted "skip the tester" can't get past a hard gate.
import type { ApprovalStatus, Job, PlanApproval, Worker } from "@/lib/types";
import { findOpenJob, getContacts, listWorkers, normalizePhone, updateJob } from "@/lib/db";
import { refreshJobCards, sendJobCard, textAnyLine } from "@/lib/photon/miniapp";
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
  const sent = await textAnyLine(c.supervisorPhone, planText(job, worker), `approval:${job.id}:${Date.now()}`);
  let delivery: PlanApproval["delivery"] = sent ? "text" : "none";
  if (sent && stableConfigured()) {
    const card = await sendJobCard(job, c.supervisorPhone, "Plan for your OK").catch(() => "none" as const);
    if (card === "card") delivery = "card";
  }
  const approval: PlanApproval = {
    status: "waiting",
    supervisorPhone: c.supervisorPhone,
    supervisorName: c.supervisorName,
    delivery,
    sentAt: now(),
  };
  const updated = await updateJob(job.id, (j) => ({ ...j, approval }));
  const who = supervisorLabel(approval);
  await remember(job.id, {
    channel: "imessage",
    agent: "recorder",
    speaker: "agent",
    text: sent ? `Sent the plan to ${who} for approval.` : `Couldn't reach ${who} (${c.supervisorPhone}) with the plan.`,
  }).catch(() => {});
  return updated;
}

export type Gate = { wait: true; say: string } | { wait: false; intro?: string };

/** Before step 1: is the job waiting on the supervisor? Pure. */
export function approvalGate(job: Job): Gate {
  const a = job.approval;
  if (!a) return { wait: false };
  const who = supervisorLabel(a);
  if (a.status === "waiting") return { wait: true, say: `Still waiting on ${who} to approve the plan. I'll tell you as soon as they answer.` };
  if (a.status === "rejected")
    return { wait: true, say: `${who} said to hold off${a.note ? `: "${a.note}"` : ""}. Call them before you go on.` };
  if (a.told) return { wait: false };
  if (a.status === "changes") return { wait: false, intro: `${who} approved the plan with a note: "${a.note}".` };
  return { wait: false, intro: `${who} approved the plan.` };
}

/** Mark the decision as read to the worker. Pure. */
export function markTold(job: Job): Job {
  return job.approval ? { ...job, approval: { ...job.approval, told: true } } : job;
}

const APPROVE = /^\s*(approve[ds]?|yes|yep|yeah|ok(ay)?|good|looks good|lgtm|go( ahead)?|go for it|sounds good|all good|👍|✅)\b/i;
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
 * An inbound text from someone who is the supervisor on a job waiting for approval.
 * Returns the reply to the supervisor, or null when this text isn't an approval answer.
 */
export async function decideFromText(fromRaw: string, text: string): Promise<{ reply: string; jobId: string } | null> {
  const from = normalizePhone(fromRaw);
  const waiting: { job: Job; worker: Worker }[] = [];
  for (const w of await listWorkers()) {
    const c = await getContacts(w.id);
    if (c?.supervisorPhone !== from) continue;
    const job = await findOpenJob(w.id);
    if (job?.approval?.status === "waiting") waiting.push({ job, worker: w });
  }
  if (!waiting.length) return null;
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
