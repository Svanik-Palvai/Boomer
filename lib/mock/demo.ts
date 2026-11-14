// SHARED. The demo worker and job everyone tests against. Ask in chat before changing.
import type { Job, JobStatus, StepResult, Worker } from "@/lib/types";
import { buildPlan } from "@/lib/ai/buildPlan";
import { PHILADELPHIA, PRINCETON } from "@/lib/location/towns";
import { jobTemplate } from "@/lib/location/steps";

export const DEMO_JOB_ID = "demo-2041";
export const DEMO_WORKER_ID = "worker-demo";
export const DEMO_JOB_TYPE = "gfci-swap";

/** A Philadelphia journeyman on a job in Princeton, NJ (we're physically in Princeton). */
export function demoWorker(): Worker {
  return {
    id: DEMO_WORKER_ID,
    name: "Demo Electrician",
    // Set DEMO_WORKER_PHONE in .env.local to your own phone to receive the record text.
    phone: process.env.DEMO_WORKER_PHONE || "+15555550123",
    home: PHILADELPHIA,
    experience: "journeyman",
    createdAt: new Date().toISOString(),
  };
}

/**
 * The demo job. Defaults to "plan_ready" at step 1, which is where a call starts after "look".
 * Pass a status / current step to get a fixture for screen work, e.g. demoJob({ status: "guiding", current: 3 }).
 */
export function demoJob(opts: { status?: JobStatus; current?: number } = {}): Job {
  const now = new Date().toISOString();
  const template = jobTemplate(DEMO_JOB_TYPE)!;
  const steps = buildPlan(DEMO_JOB_TYPE, PHILADELPHIA, PRINCETON);
  const current = Math.min(opts.current ?? 0, steps.length);
  const results: StepResult[] = steps.map((s, i) => ({
    stepId: s.id,
    status: i < current ? (s.check.kind === "vision" ? "seen" : "worker_confirmed") : "pending",
    attempts: i < current ? 1 : 0,
    fails: 0,
    unclear: 0,
  }));
  return {
    id: DEMO_JOB_ID,
    workerId: DEMO_WORKER_ID,
    status: opts.status ?? "plan_ready",
    jobType: DEMO_JOB_TYPE,
    title: template.title,
    identity: {
      component: template.component,
      problem: "standard receptacle by the counter, needs to be a GFCI",
      jobType: DEMO_JOB_TYPE,
      confidence: 0.9,
      source: "fallback",
    },
    home: PHILADELPHIA,
    site: PRINCETON,
    point: { lat: 40.3431, lng: -74.6551 },
    siteConfirmed: false,
    steps,
    current,
    results,
    memory: [],
    callIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
