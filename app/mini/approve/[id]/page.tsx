// OWNER: Teammate 1 (screens). Mini app card for the MANAGER, opened inside iMessage.
import { getCase } from "@/lib/cases/store";

export default async function ApproveCard({ params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) return <main>Case not found</main>;
  const newSteps = c.plan.filter((s) => s.tag === "new_here");
  return (
    <main>
      <h2>Approve the {c.job.site.city} job?</h2>
      <div className="card">
        {c.job.component}, {c.job.task}. {newSteps.length} steps new here. Status: {c.status}
      </div>
      <p>
        TODO(T1): Approve / Request change buttons that POST a CardDecision (stage &quot;manager&quot;). After
        approval this card should show the worker&apos;s AR progress (c.arProgress).
      </p>
    </main>
  );
}
