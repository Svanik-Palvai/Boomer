// OWNER: Lessons feature.
import { notFound } from "next/navigation";
import Link from "next/link";
import { configured, load } from "@/lib/lessons/store";
import { publicLesson } from "@/lib/lessons/types";
import Viewer from "@/components/lessons/Viewer";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: { id: string } }) {
  if (!configured()) notFound();
  let lesson;
  try {
    lesson = publicLesson((await load(params.id)).document);
  } catch {
    notFound();
  }
  if (!lesson) notFound();
  return (
    <main>
      <Link href="/lessons">← Lesson library</Link>
      <h1>{lesson.title}</h1>
      <p>
        {lesson.region?.city}, {lesson.region?.state} · NEC{" "}
        {lesson.region?.necEdition}
      </p>
      <p>{lesson.notice}</p>
      <Viewer id={lesson.id} chapters={lesson.chapters} />
      <p>{lesson.description}</p>
      <h2>Review</h2>
      <p>
        {lesson.review?.name} · {lesson.review?.credential} ·{" "}
        {lesson.review?.at.slice(0, 10)}
      </p>
      <p>
        Review credentials are reported by the reviewer, not independently
        verified by Boomer.
      </p>
      <h2>Sources</h2>
      {lesson.sources.map((s, i) => (
        <p key={i}>
          <a href={s.url} rel="noreferrer" target="_blank">
            {"label" in s ? s.label : (s.section ?? "Source")}
          </a>
        </p>
      ))}
      <p>{lesson.label}</p>
    </main>
  );
}
