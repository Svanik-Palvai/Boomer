// OWNER: Sunny (memory). Multiple agents, one job memory.
import type { AgentName, Channel, Job, MemoryEvent, RecordEntry, Worker } from "@/lib/types";
import { getJob, updateJob } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/copy";
import { talkProfile } from "@/lib/agent/prompt";
import { skillSummaries } from "@/lib/skills/mastery";

/**
 * Everything said or decided on a job, by any agent on any channel. The guide (voice), checker (vision)
 * and recorder (iMessage) all write here and read contextFor() before they respond.
 */
export async function remember(
  jobId: string,
  e: { channel: Channel; speaker: MemoryEvent["speaker"]; text: string; agent?: AgentName },
): Promise<MemoryEvent> {
  const event: MemoryEvent = { id: crypto.randomUUID(), jobId, at: new Date().toISOString(), ...e };
  await updateJob(jobId, (j) => ({ ...j, memory: [...j.memory, event] }));
  return event;
}

export async function recall(jobId: string): Promise<MemoryEvent[]> {
  return (await getJob(jobId))?.memory ?? [];
}

/**
 * The text block the voice agent gets from get_context.
 * `past` (optional) is the worker's record, newest first: the agent knows their past jobs and where.
 * Memory is capped to the last 20 events so the prompt stays short on long jobs.
 */
export function contextFor(job: Job, worker: Worker, past: RecordEntry[] = []): string {
  const steps = job.steps
    .map((s, i) => {
      const r = job.results[i];
      const mark = i === job.current ? "->" : r?.status === "seen" || r?.status === "worker_confirmed" ? "ok" : "  ";
      const tries = r && r.fails ? ` (${r.fails} not yet)` : "";
      return `${mark} ${s.order}. ${s.text}${s.tag === "new_here" ? " [NEW HERE]" : ""}${s.hardGate ? " [HARD GATE]" : ""}${tries}`;
    })
    .join("\n");
  const said = job.memory
    .slice(-20)
    .map((m) => `- (${m.channel}, ${m.speaker}) ${m.text}`)
    .join("\n");
  const history = past
    .filter((e) => e.jobId !== job.id)
    .slice(0, 5)
    .map((e) => `- ${e.date.slice(0, 10)}: ${e.title} in ${e.city}, ${e.state} (${e.outcome}, ${e.counts.done}/${e.counts.total} steps)`)
    .join("\n");
  const skills = skillSummaries(worker)
    .map((k) => `- ${k.label}: ${Math.round(k.p * 100)}% (${k.right} of ${k.checks} checks right)`)
    .join("\n");
  const a = job.approval;
  const boss = a ? (a.supervisorName ?? "the supervisor") : "";
  const next =
    job.status === "plan_ready" && a?.status === "waiting"
      ? `Plan sent to ${boss} for approval; waiting on their reply. Do not read steps. When the worker asks if it's approved, or says let's go, call next_step: it says whether it's still waiting.`
      : job.status === "plan_ready" && a?.status === "rejected"
        ? `${boss} said to hold off${a.note ? `: "${a.note}"` : ""}. Do not start. Tell the worker to call them.`
        : job.status === "plan_ready"
      ? "Plan is ready. Call next_step to read step 1."
      : job.status === "guiding"
        ? `Guiding: step ${Math.min(job.current + 1, job.steps.length)} of ${job.steps.length}. Call repeat_step to read it.`
        : job.status === "done" || job.status === "stopped"
          ? "This job is closed."
          : "No plan yet. Ask what the job is, then call look with what they said.";
  return [
    `Worker: ${worker.name}, home ${worker.home.city}, ${worker.home.state} (NEC ${worker.home.necEdition}). ${talkProfile(worker.experience)}`,
    `Job ${job.id}: ${job.title ?? "not identified yet"}. Status: ${STATUS_LABEL[job.status]}. ${next}`,
    a && a.status !== "waiting"
      ? `Supervisor: ${boss} ${a.status === "rejected" ? "said hold off" : "approved the plan"}${a.note ? `, note: "${a.note}"` : ""}.`
      : "",
    job.site
      ? `Site: ${job.site.city}, ${job.site.state} (NEC ${job.site.necEdition})${job.siteConfirmed ? "" : " - confirm the town out loud"}.`
      : "Site: unknown yet.",
    steps ? `Steps:\n${steps}` : "No plan yet. Call look.",
    history ? `Past jobs:\n${history}` : "",
    skills ? `Skill estimates from past checks (how much detail this worker needs; the tools already use them):\n${skills}` : "",
    `What has been said:\n${said || "- nothing yet"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
