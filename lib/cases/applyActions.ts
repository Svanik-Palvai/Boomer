// OWNER: Z (backend)
import type { Action, Case, Stage } from "@/lib/types";

/**
 * Applies parse_reply output to a case. Pure function: returns a new case.
 * TODO(Z): fill in each branch; also trigger the next Photon message.
 */
export function applyActions(c: Case, actions: Action[], _stage: Stage): Case {
  let next = { ...c };
  for (const a of actions) {
    switch (a.type) {
      case "confirm_plan":
        next = { ...next, status: "with_manager" };
        break;
      case "approve":
        next = { ...next, status: "approved" };
        break;
      default:
        break;
    }
  }
  return next;
}
