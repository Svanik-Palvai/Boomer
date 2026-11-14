// OWNER: Teammate 1 (screens). Mini app card for the LOCAL ELECTRICIAN, opened inside iMessage.
import { getCase } from "@/lib/cases/store";

export default async function ReviewCard({ params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) return <main>Case not found</main>;
  return (
    <main>
      <h2>Is this how you&apos;d do it in {c.job.site.city}?</h2>
      {c.plan.map((s) => (
        <div className="card" key={s.id}>
          {s.order}. {s.text} {s.tag === "new_here" && <span className="tag-new">New here</span>}
        </div>
      ))}
      <p>
        TODO(T1): checkbox per step, &quot;add a step&quot; field, Confirm / Request changes buttons that POST a
        CardDecision (stage &quot;local&quot;) to /api/cases/{c.id}/decision. Keep it one screen tall.
      </p>
    </main>
  );
}
