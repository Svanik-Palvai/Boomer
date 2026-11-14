// OWNER: Teammate 3 (agents + memory)
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
 * Short text block an agent puts in its prompt: plan state + what everyone said.
 * TODO(T3): summarize with Gemini when the history gets long.
 */
export async function contextFor(caseId: string, agent: AgentName): Promise<string> {
  const c = await getCase(caseId);
  if (!c) return "No case found.";
  const steps = c.plan.map((s) => `${s.order}. ${s.text}${s.tag === "new_here" ? " [NEW HERE]" : ""}`).join("\n");
  const said = (c.memory ?? [])
    .slice(-20)
    .map((m) => `- (${m.channel}, ${m.speaker}) ${m.text}`)
    .join("\n");
  return [
    `You are the ${agent} agent for case ${c.id}.`,
    `Job: ${c.job.component}, ${c.job.task} in ${c.job.site.city}, ${c.job.site.state} (NEC ${c.job.site.necEdition}).`,
    `Status: ${c.status}`,
    `Plan:\n${steps}`,
    `What has been said so far:\n${said || "- nothing yet"}`,
  ].join("\n\n");
}
