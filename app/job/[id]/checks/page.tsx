// OWNER: Teammate 1 (screens). Screen 2: Checks.
import Link from "next/link";
import { getCase } from "@/lib/cases/store";

export default async function ChecksPage({ params }: { params: { id: string } }) {
  const c = await getCase(params.id);
  if (!c) return <main>Case not found</main>;
  return (
    <main>
      <h1>Checks</h1>
      {c.checks.map((k) => (
        <div className="card" key={k.id}>
          <strong>{k.title}</strong>: {k.result} <em>({k.status})</em>
        </div>
      ))}
      <Link className="btn" href={`/job/${c.id}/plan`}>See job plan</Link>
    </main>
  );
}
