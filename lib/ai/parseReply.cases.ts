// OWNER: Sunny (AI). Test replies for parseReply. Add any weird reply a teammate or judge sends.
import type { Action, Stage } from "@/lib/types";

type T = Action["type"];
export const PARSE_CASES: { stage: Stage; text: string; expect: T[]; forbid?: T[] }[] = [
  // local electrician
  { stage: "local", text: "looks right", expect: ["confirm_plan"], forbid: ["approve"] },
  { stage: "local", text: "yes approved", expect: ["confirm_plan"], forbid: ["approve"] },
  { stage: "local", text: "looks good but add a check with a GFCI tester", expect: ["confirm_plan", "add_step"], forbid: ["approve"] },
  { stage: "local", text: "is this a remodel or new construction?", expect: ["question"], forbid: ["approve", "confirm_plan"] },
  { stage: "local", text: "nah thats not how we do it here", expect: ["reject"], forbid: ["confirm_plan", "approve"] },
  { stage: "local", text: "drop step 2 you dont need it", expect: ["remove_step"], forbid: ["approve"] },
  // manager
  { stage: "manager", text: "yes", expect: ["approve"] },
  { stage: "manager", text: "ya send it", expect: ["approve"] },
  { stage: "manager", text: "approved 👍", expect: ["approve"] },
  { stage: "manager", text: "yes but wait for the permit first", expect: [], forbid: ["approve"] },
  { stage: "manager", text: "no", expect: ["reject"], forbid: ["approve"] },
  { stage: "manager", text: "why does this need a new breaker?", expect: ["question"], forbid: ["approve"] },
  { stage: "manager", text: "lol", expect: ["unclear"], forbid: ["approve"] },
  { stage: "manager", text: "don't approve this yet", expect: [], forbid: ["approve"] },
];
