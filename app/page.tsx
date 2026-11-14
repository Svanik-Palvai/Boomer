// OWNER: Andy (screens). Home: links to every screen for the demo job.
import Link from "next/link";
import { DEMO_JOB_ID, DEMO_WORKER_ID } from "@/lib/mock/demo";
import { pages } from "@/lib/routes";
import { SAFETY_LINE } from "@/lib/copy";

export default function Home() {
  return (
    <main>
      <h1>Boomer</h1>
      <p className="muted">Strap on your phone and call Boomer. It sees what you see, talks you through the fix, and checks each step.</p>
      <ul className="card" style={{ listStyle: "none", padding: 16, marginTop: 24, display: "grid", gap: 12 }}>
        <li><Link href={pages.profile()}>Profile (once)</Link></li>
        <li><Link href={pages.camera(DEMO_WORKER_ID)}>Camera page (harness phone)</Link></li>
        <li><Link href={pages.liveJob(DEMO_JOB_ID)}>Live job view (laptop)</Link></li>
        <li><Link href={pages.jobRecord(DEMO_JOB_ID)}>Job record</Link></li>
        <li><Link href={pages.workRecord(DEMO_WORKER_ID)}>Work record</Link></li>
        <li><Link href="/lessons">Reviewed video lessons</Link></li>
      </ul>
      <p className="muted" style={{ marginTop: 24 }}>{SAFETY_LINE}</p>
    </main>
  );
}
