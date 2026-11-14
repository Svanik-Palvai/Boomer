// OWNER: Sunny (memory). Multiple agents, one job memory.
import type { AgentName, Channel, Job, MemoryEvent, Worker } from "@/lib/types";
import { getJob, updateJob } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/copy";
import { talkProfile } from "@/lib/agent/prompt";

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
 * TODO(Sunny): add the worker's past jobs from their record; summarize when memory gets long.
 */
export function contextFor(job: Job, worker: Worker): string {
  const steps = job.steps
    .map((s, i) => {
      const r = job.results[i];
      const mark = i === job.current ? "->" : r?.status === "seen" || r?.status === "worker_confirmed" ? "ok" : "  ";
      return `${mark} ${s.order}. ${s.text}${s.tag === "new_here" ? " [NEW HERE]" : ""}`;
    })
    .join("\n");
  const said = job.memory
    .slice(-20)
    .map((m) => `- (${m.channel}, ${m.speaker}) ${m.text}`)
    .join("\n");
  return [
    `Worker: ${worker.name}, home ${worker.home.city}, ${worker.home.state} (NEC ${worker.home.necEdition}). ${talkProfile(worker.experience)}`,
    `Job ${job.id}: ${job.title ?? "not identified yet"}. Status: ${STATUS_LABEL[job.status]}.`,
    job.site
      ? `Site: ${job.site.city}, ${job.site.state} (NEC ${job.site.necEdition})${job.siteConfirmed ? "" : " - confirm the town out loud"}.`
      : "Site: unknown yet.",
    steps ? `Steps:\n${steps}` : "No plan yet. Call look.",
    `What has been said:\n${said || "- nothing yet"}`,
  ].join("\n\n");
}
