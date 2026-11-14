// OWNER: Lessons feature. Public library exposes published projections only.
import Link from "next/link";
import { configured, database } from "@/lib/lessons/store";
import { publicLesson } from "@/lib/lessons/types";
export const dynamic = "force-dynamic";
export default async function Page() {
  let lessons: NonNullable<ReturnType<typeof publicLesson>>[] = [],
    error = "";
  if (configured()) {
    try {
      const { data, error: e } = await database()
        .from("boomer_lessons")
        .select("document")
        .eq("document->>status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      if (e) throw e;
      lessons = (data ?? [])
        .map((r) => publicLesson(r.document))
        .filter((d): d is NonNullable<typeof d> => !!d);
    } catch {
      error = "The lesson library is temporarily unavailable.";
    }
  }
  return (
    <main>
      <Link href="/">← Boomer</Link>
      <h1>Lessons from the field</h1>
      <p>
        Reviewed demonstrations, original call excerpts and regional sources.
        Observed by Boomer.
      </p>
      <Link className="btn" href="/lessons/workspace">
        Private lesson workspace
      </Link>
      {!configured() ? (
        <p>
          Lessons are awaiting the team’s dedicated storage configuration. No
          real-job lessons have been published.
        </p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : lessons.length ? (
        lessons.map((d) => (
          <article className="card" key={d.id}>
            <Link href={`/lessons/${d.id}`}>
              <h2>{d.title}</h2>
            </Link>
            <p>
              {d.region?.city}, {d.region?.state} · {d.region?.necEdition} NEC
            </p>
            <p>{d.description}</p>
          </article>
        ))
      ) : (
        <p>No reviewed lessons published yet.</p>
      )}
    </main>
  );
}
