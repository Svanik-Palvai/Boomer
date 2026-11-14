import type { Case } from "@/lib/types";
export function guideUnlocked(c: Case) {
  return (
    ["approved", "guiding", "done"].includes(c.status) &&
    c.reviews.some((r) => r.stage === "local" && r.decision === "confirmed") &&
    c.reviews.some((r) => r.stage === "manager" && r.decision === "approved")
  );
}
export function guideSteps(c: Case) {
  return c.plan
    .filter((s) => s.tag === "new_here")
    .sort((a, b) => a.order - b.order);
}
export function advanceGuide(c: Case, stepId: string): Case {
  if (!guideUnlocked(c))
    throw new Error("Local confirmation and manager approval required");
  const steps = guideSteps(c);
  const completed = (c.arProgress || []).filter((id) =>
    steps.some((s) => s.id === id),
  );
  if (completed.includes(stepId)) return c;
  if (steps.find((s) => !completed.includes(s.id))?.id !== stepId)
    throw new Error("Complete the current step first");
  const arProgress = [...completed, stepId];
  return {
    ...c,
    arProgress,
    status: arProgress.length === steps.length ? "done" : "guiding",
  };
}
