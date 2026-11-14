// OWNER: Sunny (AI)
import type { Check, GuideStep, Job, Rule, TalkProfile } from "@/lib/types";
import rulesData from "@/data/rules.json";
import { applicableRules } from "@/lib/ai/buildPlan";

/**
 * Job -> the step list Boomer reads on the call.
 *
 * The agent never invents steps. Standard steps come from the hand-checked templates below
 * (stand-in for Aniketh's steps.json until it lands; an electrician should review them).
 * New here steps come only from VERIFIED rules in data/rules.json, each with its source link.
 * Every step has exactly one check: a yes/no question one camera frame can answer, or a
 * spoken confirmation for things the camera can't judge (breaker, tester reading).
 */

type T = Omit<GuideStep, "id" | "order" | "tag"> & { short?: string };

const BREAKER: T = {
  text: "Turn off the breaker for this circuit. Tell me when it's off.",
  reason: "You never work on a live circuit.",
  check: { mode: "spoken", question: "Is the breaker off?" },
  hardGate: true,
};

const TESTER: T = {
  text: "Hold your tester on the receptacle and tell me what it reads.",
  reason: "A breaker can be mislabeled, so the tester is what proves the circuit is dead.",
  check: { mode: "spoken", question: "Does the tester show the circuit is dead?" },
  hardGate: true,
};

/** GFCI swap or install. The LINE/LOAD step is the one the camera checks hardest. */
const GFCI: T[] = [
  BREAKER,
  TESTER,
  {
    text: "Take off the faceplate and pull the old device out of the box so the wires are visible.",
    short: "pull the old device",
    reason: "You need to see every wire before you disconnect anything.",
    check: {
      mode: "vision",
      question: "Is an electrical device pulled forward out of a wall box, with its wires visible?",
    },
  },
  {
    text: "Turn the new GFCI over and find the terminals marked LINE and the ones marked LOAD. Hold the back up to the camera.",
    short: "find LINE and LOAD on the new GFCI",
    reason: "Power from the panel must land on LINE. Wires on LOAD leave the outlet without protection.",
    check: {
      mode: "vision",
      question: "Is the back of a GFCI receptacle visible, with its terminal labels readable?",
    },
  },
  {
    text: "Land the incoming hot and neutral on the LINE terminals: black on brass, white on silver. Show me when they're tight.",
    short: "land the incoming wires on LINE",
    reason: "LINE is where the power comes in. That's what makes the GFCI protect the outlet.",
    check: {
      mode: "vision",
      question:
        "Are both insulated wires attached to the terminal pair labeled LINE, and is the pair labeled LOAD empty or still covered by its tape?",
    },
  },
  {
    text: "Connect the bare ground wire to the green screw.",
    short: "ground to the green screw",
    reason: "The ground gives fault current a path back to the panel.",
    check: { mode: "vision", question: "Is a bare or green wire attached to the green screw on the device?" },
  },
  {
    text: "Fold the wires in, mount the device and put the faceplate on.",
    reason: "Wires folded neatly won't get pinched or loosen the terminals.",
    check: { mode: "vision", question: "Is a GFCI receptacle mounted flat in the wall with a faceplate on?" },
  },
  {
    text: "Restore power, press TEST, then RESET. Tell me if it trips and resets.",
    reason: "The test button proves the GFCI actually cuts power on a fault.",
    check: { mode: "spoken", question: "Did it trip on TEST and come back on RESET?" },
  },
];

const SWITCH: T[] = [
  BREAKER,
  TESTER,
  {
    text: "Take off the cover plate and pull the old switch out so the wires are visible.",
    short: "pull the old switch",
    reason: "You need to see every wire before you disconnect anything.",
    check: { mode: "vision", question: "Is a switch pulled out of a wall box with its wires visible?" },
  },
  {
    text: "Move the wires to the same screws on the new switch, and the ground to the green screw.",
    short: "move the wires and ground over",
    reason: "Matching terminals keeps the circuit wired the way it was.",
    check: { mode: "vision", question: "Are wires attached to the side screws of a switch, with one on the green screw?" },
  },
  {
    text: "Mount the switch and put the cover plate on.",
    reason: "A mounted device protects the connections.",
    check: { mode: "vision", question: "Is a switch mounted in the wall with a cover plate on?" },
  },
  {
    text: "Restore power and flip the switch. Tell me if the light works.",
    reason: "This confirms the circuit works.",
    check: { mode: "spoken", question: "Does the switch work?" },
  },
];

function templateFor(job: Job): T[] {
  const c = job.component.toLowerCase();
  if (c.includes("switch")) return SWITCH;
  return GFCI; // receptacle jobs in the demo are GFCI work
}

/** Where New here steps go: right before mounting (or at the end). */
function mountIndex(t: T[]): number {
  const i = t.findIndex((s) => /\bmount\b/i.test(s.text));
  return i === -1 ? t.length : i;
}

export function buildGuidePlan(
  job: Job,
  checks: Check[] = [],
  rules: Rule[] = rulesData as Rule[],
  profile: TalkProfile = "new_electrician",
): GuideStep[] {
  const template = templateFor(job);
  const home = job.home.city || job.home.state;

  const newHere: (T & { ruleId: string; sourceUrl: string })[] = applicableRules(job, checks, rules)
    .filter((r) => r.verified) // never read an unverified rule as a step
    .flatMap((r) =>
      r.addsSteps.map((s) => ({
        text: `This one is different from ${home}. ${s.text}`,
        reason: `${r.topic}: ${r.summary} (NEC ${r.necSection}, ${r.edition} edition.)`,
        check: { mode: "spoken" as const, question: `Have you done this: ${s.text}` },
        ruleId: r.id,
        sourceUrl: r.sourceUrl,
      })),
    );

  const at = mountIndex(template);
  let ordered: (T & { tag: GuideStep["tag"]; ruleId?: string; sourceUrl?: string })[] = [
    ...template.slice(0, at).map((s) => ({ ...s, tag: "standard" as const })),
    ...newHere.map((s) => ({ ...s, tag: "new_here" as const })),
    ...template.slice(at).map((s) => ({ ...s, tag: "standard" as const })),
  ];
  if (profile === "journeyman") ordered = collapseStandard(ordered);
  return ordered.map(({ short: _short, ...s }, i) => ({ ...s, id: `g${i + 1}`, order: i + 1 }));
}

/**
 * Journeyman profile: a run of standard, camera-checked steps (not hard gates) becomes one
 * "do your normal install" step. Its check keeps the step that matters most: the LINE/LOAD
 * question if it is in the run, otherwise the last step's. New here steps stay in full.
 */
function collapseStandard<S extends T & { tag: GuideStep["tag"] }>(steps: S[]): S[] {
  const out: S[] = [];
  let run: S[] = [];
  const flush = () => {
    if (run.length <= 1) {
      out.push(...run);
    } else {
      const key = run.find((s) => /\bLINE\b/.test(s.check.question)) ?? run[run.length - 1];
      const list = run.map((s) => s.short ?? s.text.toLowerCase().replace(/\.$/, ""));
      out.push({
        ...key,
        text: `Do your normal install: ${list.join(", then ")}. Tell me when it's wired.`,
        reason: run.map((s) => s.reason).join(" "),
        short: undefined,
      });
    }
    run = [];
  };
  for (const s of steps) {
    if (s.tag === "standard" && !s.hardGate && s.check.mode === "vision" && !/\bmount\b/i.test(s.text)) run.push(s);
    else {
      flush();
      out.push(s);
    }
  }
  flush();
  return out;
}
