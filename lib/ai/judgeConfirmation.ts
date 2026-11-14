// OWNER: Sunny (AI). Decides whether what the worker said counts as confirming a spoken step.
import type { Step } from "@/lib/types";

/**
 * Deterministic on purpose: it runs on every spoken check and must be instant and predictable.
 * - A clear "no" / "not yet" / "hold on" never confirms.
 * - Hard gates (breaker off, tester dead) need a clear yes or the matching fact ("it's off", "reads zero").
 *   Anything vague ("I think so", "maybe") is asked again.
 * - A tester step rejects any reading that says there is voltage.
 * Returns { ok, say? }: say is the line to speak when it is not accepted.
 */
export interface Judgement {
  ok: boolean;
  say?: string;
}

const NEGATIVE = /\b(no|nope|not yet|not done|hold on|wait|haven'?t|didn'?t|can'?t|isn'?t|won'?t|still on|stop)\b/i;
const VAGUE = /\b(i think|maybe|probably|not sure|kind of|sort of|guess)\b/i;
const YES = /\b(yes|yeah|yep|yup|done|ok|okay|sure|correct|confirm(ed)?|got it|did it|finished|good|ready|all set)\b/i;
const OFF = /\b(off|killed|shut|flipped)\b/i;
const DEAD = /\b(dead|zero|0|nothing|no (voltage|power|reading|light|beep)|de-?energi[sz]ed|doesn'?t (light|beep))\b/i;
const LIVE = /\b(live|hot|voltage|beep(s|ing)?|lights? up|120|240)\b/i;
const TRIP = /\b(trip(s|ped)?|click(s|ed)?|reset|clicked off|works|came back)\b/i;

export function judgeConfirmation(step: Step, text: string): Judgement {
  const t = (text || "").trim();
  const ask = step.check.prompt ?? step.check.question;
  if (!t) return { ok: false, say: ask };

  const isTester = /tester|dead|voltage/i.test(`${step.id} ${step.check.question}`);
  const isBreaker = /breaker/i.test(`${step.id} ${step.check.question}`);

  if (isTester) {
    if (DEAD.test(t)) return { ok: true };
    if (LIVE.test(t)) return { ok: false, say: "Stop. If the tester shows voltage, the circuit isn't dead. Find the right breaker and test again." };
  }
  // "no voltage" style answers were handled above; everything else with a negative is a no.
  if (NEGATIVE.test(t)) return { ok: false, say: step.hardGate ? `I can't skip this one. ${ask}` : `Okay. ${ask}` };
  if (VAGUE.test(t)) return { ok: false, say: `I need a clear answer on this one. ${ask}` };

  if (isBreaker && (OFF.test(t) || YES.test(t))) return { ok: true };
  if (isTester) return YES.test(t) && !step.hardGate ? { ok: true } : { ok: false, say: /tester reads/i.test(ask) ? ask : `Tell me what the tester reads. ${ask}` };
  if (/test|reset|trip/i.test(`${step.id} ${step.check.question}`) && (TRIP.test(t) || YES.test(t))) return { ok: true };
  if (YES.test(t)) return { ok: true };
  return { ok: false, say: step.hardGate ? `I need a clear yes. ${ask}` : ask };
}
