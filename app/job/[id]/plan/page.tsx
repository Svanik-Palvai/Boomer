// OWNER: Teammate 1 (screens). Screen 3: Job plan.
import Link from "next/link";
import { getCase } from "@/lib/cases/store";

export default async function PlanPage({ params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) return <main>Case not found</main>;
  return (
    <main>
      <h1>Job plan</h1>
      {c.plan.map((s) => (
        <div className="card" key={s.id}>
          {s.order}. {s.text} {s.tag === "new_here" && <span className="tag-new">New here</span>}
        </div>
      ))}
      <p>TODO(T1): "Send for review" button that POSTs /api/cases/[id]/send.</p>
      <Link className="btn" href={`/job/${c.id}/review`}>Review status</Link>
    </main>
  );
}
