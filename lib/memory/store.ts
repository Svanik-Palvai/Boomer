// OWNER: Sunny (AI: agents + memory)
import type { AgentName, Channel, MemoryEvent } from "@/lib/types";
import { getCase, saveCase } from "@/lib/cases/store";

/**
 * Shared case memory. All three agents (field/voice, review/iMessage, code)
 * write every utterance and decision here, and read it before they respond.
 * Lives on the Case so it moves to Supabase when Z swaps the store.
 */
export async function remember(
  caseId: string,
  e: { channel: Channel; speaker: MemoryEvent["speaker"]; text: string; agent?: AgentName },
): Promise<MemoryEvent> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`no case ${caseId}`);
  const event: MemoryEvent = { id: crypto.randomUUID(), caseId, at: new Date().toISOString(), ...e };
  await saveCase({ ...c, memory: [...(c.memory ?? []), event] });
  return event;
}

export async function recall(caseId: string): Promise<MemoryEvent[]> {
  return (await getCase(caseId))?.memory ?? [];
}

/**
 * Short text block an agent puts in its prompt: job, guided-call state, plan and what everyone said.
 * The voice agent gets this from get_context at the start of every call, so a dropped call
 * resumes at the same step and knows what was already checked.
 */
export async function contextFor(caseId: string, agent: AgentName): Promise<string> {
  const c = await getCase(caseId);
  if (!c) return "No case found.";
  const said = (c.memory ?? [])
    .slice(-20)
    .map((m) => `- (${m.channel}, ${m.speaker}) ${m.text}`)
    .join("\n");
  const parts = [
    `You are the ${agent} agent for job ${c.id}.`,
    `Job: ${c.job.component}, ${c.job.task} in ${c.job.site.city}, ${c.job.site.state} (NEC ${c.job.site.necEdition}). Worker's home: ${c.job.home.city || ""} ${c.job.home.state} (NEC ${c.job.home.necEdition}).`,
  ];
  const g = c.guide;
  if (g && g.status !== "new") {
    const steps = g.steps
      .map((s, i) => {
        const r = g.results[i];
        const mark = r.outcome === "pending" ? (i === g.current ? "->" : "  ") : "ok";
        return `${mark} ${s.order}. ${s.text}${s.tag === "new_here" ? " [NEW HERE]" : ""}${s.hardGate ? " [HARD GATE]" : ""}${r.attempts ? ` (${r.attempts} retries)` : ""}`;
      })
      .join("\n");
    parts.push(
      `Guided call: ${g.status}, step ${Math.min(g.current + 1, g.steps.length)} of ${g.steps.length}, talk profile ${g.profile}.`,
      `Steps:\n${steps}`,
    );
  } else {
    parts.push("Guided call not started yet. Call start_job to get the steps; do not read steps from anywhere else.");
  }
  parts.push(`What has been said so far:\n${said || "- nothing yet"}`);
  return parts.join("\n\n");
}
