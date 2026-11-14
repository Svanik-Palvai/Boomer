// OWNER: Teammate 1 (screens). Screen 1: Snap.
import Link from "next/link";
import { DEMO_CASE_ID } from "@/lib/mock/demoCase";

export default function SnapPage() {
  return (
    <main>
      <h1>Snap the job</h1>
      <p>TODO(T1): camera capture, optional note, POST /api/identify.</p>
      <Link className="btn" href={`/job/${DEMO_CASE_ID}/checks`}>Use demo photo</Link>
      <Link className="btn" href="/playbook">Playbook</Link>
    </main>
  );
}
