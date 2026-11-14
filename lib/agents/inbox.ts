// OWNER: Zohaib. One inbound iMessage -> one agent, whichever Photon platform delivered it:
//   unknown number             -> sign-up agent (signup.ts)
//   share / supervisor / cards -> share agent (share.ts)
//   anything else              -> recorder agent (recorder.ts), which answers from the shared job memory
// The caller sends the reply (Photon 1.0 replies into the same chat; Photon 2.0 sends a new text).
import { getWorkerByPhone, normalizePhone } from "@/lib/db";
import { resolveJob } from "@/lib/jobs/resolve";
import { remember } from "@/lib/memory/store";
import { recorderReply } from "./recorder";
import { shareReply } from "./share";
import { signupReply } from "./signup";

export interface InboxResult {
  agent: "signup" | "share" | "recorder";
  reply: string | null;
  jobId?: string;
}

const ACK = /^(ok(ay)?|k|cool|got it|thanks?|thank you|thx|ty|great|nice|👍|🙏)[\s.!]*$/i;

export async function handleInboundText(fromRaw: string, text: string): Promise<InboxResult> {
  const from = normalizePhone(fromRaw);
  const worker = await getWorkerByPhone(from);
  if (!worker) return { agent: "signup", reply: await signupReply(from, text) };

  const r = await resolveJob({ callerPhone: from, create: false });
  const job = r?.job ?? null;
  if (job) await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "worker", text });

  const shared = await shareReply(job, worker, text);
  if (shared) return { agent: "share", reply: shared, jobId: job?.id };

  if (!job) {
    if (ACK.test(text.trim())) return { agent: "recorder", reply: null };
    const n = process.env.PHOTON_NUMBER;
    return { agent: "recorder", reply: `No jobs on your record yet. When you're on one, call Boomer${n ? ` at ${n}` : ""}.` };
  }
  const answer = await recorderReply(job, worker, text);
  if (answer) await remember(job.id, { channel: "imessage", agent: "recorder", speaker: "agent", text: answer });
  return { agent: "recorder", reply: answer, jobId: job.id };
}
