// OWNER: Zohaib (Photon share agent)
// Text commands that reach someone other than the worker. Boomer only ever contacts them because the worker asked:
//   "my supervisor is Dana +1 215 555 0100"    -> saves the supervisor (no text sent)
//   "tell my supervisor I'm stuck on step 4"    -> texts the supervisor the worker's words + where the job stands
//   "send my record to +1 609 555 0100"         -> texts that person the work-record card
//   "send me my record card"                    -> the card alone, ready for the worker to forward
// The record link unfurls into a preview card in iMessage (app/api/og), which is our mini-app surface on the 2.0 beta.
// A shared iMessage line can't start a chat: someone who never texted Boomer can't be reached, so the worker gets the card to forward.
import type { Job, Worker } from "@/lib/types";
import { getContacts, normalizePhone, saveContacts } from "@/lib/db";
import { stepNumber } from "@/lib/agent/engine";
import { remember } from "@/lib/memory/store";
import { photonErrorText } from "@/lib/photon/client";
import { sendText } from "@/lib/photon/send";
import { absolute, pages } from "@/lib/routes";
import { guard } from "./recorder";

const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const BOSS = "(supervisor|boss|foreman|instructor|manager)";

/** Returns the reply to the worker, or null when the text isn't a share command (the recorder answers it). */
export async function shareReply(job: Job | null, worker: Worker, text: string): Promise<string | null> {
  const msg = text.trim();
  const rawPhone = msg.match(PHONE)?.[0];
  const phone = rawPhone && normalizePhone(rawPhone);

  // Set the supervisor: "my supervisor is ...", "supervisor: ...". Needs a number.
  if (new RegExp(`\\b${BOSS}\\b\\s*(is|=|:|'s number is|number is)`, "i").test(msg) || (phone && new RegExp(`^\\s*(my\\s+)?${BOSS}\\b`, "i").test(msg))) {
    if (!phone) return "What's their number? Text it like: my supervisor is Dana 215 555 0100";
    const name = nameNear(msg, rawPhone!);
    const c = await saveContacts(worker.id, { supervisorPhone: phone, supervisorName: name });
    return `Saved ${c.supervisorName ? `${c.supervisorName} (${c.supervisorPhone})` : c.supervisorPhone} as your supervisor. I'll only text them when you ask, like "tell my supervisor I'm stuck on step 4". They need to text this number once first so I can reach them.`;
  }

  // Alert the supervisor, only on the worker's word.
  if (new RegExp(`\\b(tell|text|message|alert|let|ping|notify|update)\\b.*\\b${BOSS}\\b`, "i").test(msg)) {
    const c = await getContacts(worker.id);
    if (!c?.supervisorPhone) return "I don't have a supervisor for you yet. Text: my supervisor is <name> <number>";
    const words = theirWords(msg);
    const alert = guard(
      [
        `From Boomer, for ${worker.name}${words ? `: "${words}"` : "."}`,
        job ? whereItStands(job) : "",
        job ? `Live view: ${absolute(pages.liveJob(job.id))}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    const sent = await trySend(c.supervisorPhone, alert, `supervisor:${worker.id}:${Date.now()}`);
    if (job) await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "agent", text: sent ? `Texted supervisor: ${alert}` : `Couldn't reach supervisor ${c.supervisorPhone}` });
    const who = c.supervisorName ?? "your supervisor";
    return sent
      ? `Sent to ${who}.`
      : `I can't reach ${who} yet: they need to text this number once first. Here's the message to forward:\n\n${alert}`;
  }

  // Share the record.
  if (/\b(send|share|forward|text)\b.*\b(record|proof|resume|card)\b/i.test(msg)) {
    const link = absolute(pages.workRecord(worker.id));
    if (!phone) return `Here's your work record card. Press and hold it to forward it to anyone:\n${link}`;
    const card = `${worker.name} shared their Boomer work record with you. Observed by Boomer, one job at a time.\n${link}`;
    const sent = await trySend(phone, card, `share:${worker.id}:${phone}:${Date.now()}`);
    if (job) await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "agent", text: sent ? `Sent work record to ${phone}` : `Couldn't reach ${phone} with the work record` });
    return sent
      ? `Sent your record to ${phone}.`
      : `I can't text ${phone} first. Press and hold this card and forward it to them:\n${link}`;
  }

  return null;
}

function whereItStands(job: Job): string {
  const n = stepNumber(job);
  const total = job.steps.length;
  const lastCheck = [...job.memory].reverse().find((m) => m.agent === "checker");
  const place = job.site ? `, ${job.site.city} ${job.site.state}` : "";
  const status =
    job.status === "guiding" && n ? `On step ${n} of ${total}: ${job.steps[job.current].text}` :
    job.status === "done" ? `All ${total} steps done.` :
    job.status === "stopped" ? `Stopped at step ${job.current + 1} of ${total}.` :
    "No plan yet.";
  return [`Job: ${job.title || "not identified yet"}${place}.`, status, lastCheck ? `Last camera check: ${lastCheck.text}` : ""].filter(Boolean).join(" ");
}

/** What the worker wants passed on: the part after "that", ":" or the supervisor word. */
function theirWords(msg: string): string {
  const m = msg.match(new RegExp(`\\b${BOSS}\\b\\s*(that|:|-)?\\s*(.*)$`, "i"));
  return (m?.[3] ?? "").replace(/^(that|i'?m|im)\s+/i, (s) => (/^that/i.test(s) ? "" : s)).trim().slice(0, 300);
}

function nameNear(msg: string, phone: string): string | undefined {
  const m = msg.replace(phone, " ").match(/\b(?:is|:)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  return m?.[1];
}

async function trySend(phone: string, text: string, key: string): Promise<boolean> {
  try {
    await sendText(phone, text, key);
    return true;
  } catch (err) {
    console.error("[share] send failed:", photonErrorText(err).slice(0, 200));
    return false;
  }
}
