// OWNER: Sunny (AI)
import type { Check, Job, PlanStep, Rule } from "@/lib/types";
import { rules as allRules } from "@/lib/checks/runChecks";

/**
 * Job + checks -> ordered plan, each step tagged "standard" or "new_here".
 *
 * Deterministic on purpose (no AI): the plan must come from sources, and judges trust that.
 * 1. Start from the standard steps for this kind of job (what the worker does at home).
 * 2. Find the rules that apply here: rules this job's checks point at, plus rules for this
 *    component in the job's town or state.
 * 3. Insert each rule's addsSteps as "new_here" steps, with the rule id, source link and AR step,
 *    right before the "mount / finish" step.
 * Unverified rules still add their step, but the text starts with "Needs review:" so nobody
 * treats it as fact.
 */

type Template = { text: string; finish?: boolean }[];

const RECEPTACLE_REPLACE: Template = [
  { text: "Turn off the breaker and verify the circuit is dead with a tester" },
  { text: "Remove the cover plate and the old receptacle" },
  { text: "Check the box, conductors and grounding" },
  { text: "Connect the new receptacle" },
  { text: "Mount the receptacle and cover plate", finish: true },
  { text: "Restore power and test the receptacle" },
];

const RECEPTACLE_NEW: Template = [
  { text: "Turn off the breaker and verify the circuit is dead with a tester" },
  { text: "Run the new cable from the source to the new box location" },
  { text: "Install the box and connect the new receptacle" },
  { text: "Mount the receptacle and cover plate", finish: true },
  { text: "Restore power and test the receptacle" },
];

const SWITCH: Template = [
  { text: "Turn off the breaker and verify the circuit is dead with a tester" },
  { text: "Remove the cover plate and the old switch" },
  { text: "Connect the new switch and ground" },
  { text: "Mount the switch and cover plate", finish: true },
  { text: "Restore power and test the switch" },
];

const GENERIC: Template = [
  { text: "Turn off the breaker and verify the circuit is dead with a tester" },
  { text: "Do the work as you normally would" },
  { text: "Close up and secure the device", finish: true },
  { text: "Restore power and test" },
];

function templateFor(job: Job): Template {
  const c = job.component.toLowerCase();
  const t = job.task.toLowerCase();
  if (c.includes("receptacle")) return /install|new|add/.test(t) ? RECEPTACLE_NEW : RECEPTACLE_REPLACE;
  if (c.includes("switch")) return SWITCH;
  return GENERIC;
}

/** Rules that matter for this job in this place. */
export function applicableRules(job: Job, checks: Check[], rules: Rule[] = allRules): Rule[] {
  const fromChecks = new Set(checks.map((k) => k.ruleId).filter(Boolean));
  const places = new Set([job.site.state, `${job.site.city}, ${job.site.state}`].map((p) => p.toLowerCase()));
  const component = job.component.toLowerCase();
  return rules.filter(
    (r) =>
      fromChecks.has(r.id) ||
      (places.has(r.jurisdiction.toLowerCase()) && r.appliesTo.some((a) => a.toLowerCase() === component)),
  );
}

export function buildPlan(job: Job, checks: Check[], rules: Rule[] = allRules): PlanStep[] {
  const template = templateFor(job);
  const newSteps = applicableRules(job, checks, rules).flatMap((r) =>
    r.addsSteps.map((s) => ({
      text: r.verified ? s.text : `Needs review: ${s.text}`,
      ruleId: r.id,
      sourceUrl: r.sourceUrl,
      arStepId: s.arStepId,
    })),
  );

  const finishAt = template.findIndex((s) => s.finish);
  const insertAt = finishAt === -1 ? template.length : finishAt;
  const ordered = [
    ...template.slice(0, insertAt).map((s) => ({ text: s.text, tag: "standard" as const })),
    ...newSteps.map((s) => ({ ...s, tag: "new_here" as const })),
    ...template.slice(insertAt).map((s) => ({ text: s.text, tag: "standard" as const })),
  ];

  return ordered.map((s, i) => ({
    id: `s${i + 1}`,
    order: i + 1,
    addedBy: "plan" as const,
    ...s,
  }));
}
