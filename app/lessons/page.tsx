// OWNER: Lessons feature. Public library exposes published projections only.
import Link from "next/link";
import styles from "@/components/lessons/lessons.module.css";
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
    <main className={styles.library}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>THE FIELD NOTEBOOK</span>
        <h1>See the repair.<br />Understand the details.</h1>
        <p>Real job footage, useful corrections and regional references. Learn from the work, with an electrician’s review before publication.</p>
        <Link className={styles.primary} href="/lessons/workspace">Open private workspace <span aria-hidden="true">↗</span></Link>
      </header>
      <div className={styles.sectionHeading}><h2>Lessons from the field</h2><span className={styles.badge}>{lessons.length} published</span></div>
      {!configured() ? (
        <section className={styles.empty}><span className={styles.eyebrow}>SETUP IN PROGRESS</span><h2>The notebook is getting ready.</h2><p>Private lesson storage needs configuration before recordings can become reviewed lessons.</p></section>
      ) : error ? (
        <section className={styles.empty} role="alert"><h2>We couldn’t load the library.</h2><p>{error} Try refreshing in a moment.</p></section>
      ) : lessons.length ? (
        <div className={styles.grid}>{lessons.map((d) => (
          <Link className={styles.lessonCard} href={`/lessons/${d.id}`} key={d.id}>
            <div className={styles.thumbnail} style={{backgroundImage: `url(/api/lessons/public/${d.id}/poster)`}}><span className={styles.play} aria-hidden="true">▶</span></div>
            <div className={styles.cardBody}><span className={styles.eyebrow}>{d.region?.city}, {d.region?.state} · {d.region?.necEdition} NEC</span><h2>{d.title}</h2><p>{d.description}</p><span className={styles.cardLink}>Watch lesson ↗</span></div>
          </Link>
        ))}</div>
      ) : (
        <section className={styles.empty}><span className={styles.emptyMark} aria-hidden="true">01</span><div><span className={styles.eyebrow}>NOTHING PUBLISHED YET</span><h2>The first lesson starts in the field.</h2><p>Record with consent, shape the lesson, then get an electrician’s review and the worker’s permission. Only the reviewed version appears here.</p><Link href="/lessons/workspace">Go to the private workspace →</Link></div></section>
      )}
      <section className={styles.process} aria-label="How lessons are made">{[["01", "Capture", "Original footage and conversation, recorded with permission."], ["02", "Edit", "Chapters, captions and labeled details from the evidence."], ["03", "Review", "Electrician review and worker permission before publication."]].map(([n,title,copy])=><div key={n}><span className={styles.eyebrow}>{n} / {title}</span><p>{copy}</p></div>)}</section>
    </main>
  );
}
