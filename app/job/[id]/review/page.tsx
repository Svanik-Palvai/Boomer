// OWNER: Teammate 1 (screens). Screen 4: Review status.
import Link from "next/link";

export default function ReviewPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Review status</h1>
      <p>TODO(T1): poll GET /api/cases/{params.id} every 2s; show both stages and mirrored messages.</p>
      <Link className="btn" href={`/job/${params.id}/guide`}>Open AR guide (unlocks when approved)</Link>
    </main>
  );
}
