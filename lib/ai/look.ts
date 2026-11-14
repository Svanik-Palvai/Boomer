// OWNER: Sunny (AI)
import { getCase } from "@/lib/cases/store";
import { identifyJob } from "@/lib/ai/identifyJob";
import { latestFrame } from "@/lib/ai/frames";

/**
 * "What am I looking at?" / the first look at the job.
 * Uses identifyJob on the newest frame and confirms the town out loud.
 */
export async function describeFrame(caseId: string): Promise<{ say: string; component?: string; task?: string; confidence?: number; details?: string; source: string }> {
  const c = await getCase(caseId);
  const where = c ? `${c.job.site.city}, ${c.job.site.state}` : "";
  const f = latestFrame(caseId);
  if (!f) return { say: "I can't see the job yet. Open the camera page and point it at the work.", source: "no_frame" };
  const id = await identifyJob(f.image);
  if (id.needsRetake) return { say: "I can't tell what that is from here. Hold it closer and keep still.", ...id };
  const detail = id.details ? ` ${id.details}` : "";
  return {
    say: `That looks like a ${id.component}.${detail}${where ? ` I have you in ${where}, right?` : ""}`,
    ...id,
  };
}
