// OWNER: Sunny. One line for screens and cards: where the supervisor's sign-off stands. Pure, client-safe.
import type { PlanApproval } from "@/lib/types";

export function approvalLine(a?: Pick<PlanApproval, "status" | "supervisorName" | "note">): string | null {
  if (!a) return null;
  const who = a.supervisorName ?? "Supervisor";
  if (a.status === "waiting") return `Waiting on ${who} to approve the plan`;
  if (a.status === "rejected") return `${who} said hold off${a.note ? `: "${a.note}"` : ""}`;
  if (a.status === "changes") return `Approved by ${who}, note: "${a.note}"`;
  return `Plan approved by ${who}`;
}
