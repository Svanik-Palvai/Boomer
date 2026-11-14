// OWNER: Andy (screens). Home: the screens for the demo job, in the order they're used.
import Link from "next/link";
import { DEMO_JOB_ID, DEMO_WORKER_ID } from "@/lib/mock/demo";
import { pages } from "@/lib/routes";
import { SAFETY_LINE } from "@/lib/copy";
import s from "./home.module.css";

const SCREENS = [
  { href: pages.profile(), name: "Profile", use: "Once, on the worker's phone" },
  { href: pages.camera(DEMO_WORKER_ID), name: "Harness camera", use: "On the phone in the chest harness" },
  { href: pages.liveJob(DEMO_JOB_ID), name: "Live job", use: "On the laptop facing the table" },
  { href: pages.jobRecord(DEMO_JOB_ID), name: "Job record", use: "The link texted after the job" },
  { href: pages.workRecord(DEMO_WORKER_ID), name: "Work record", use: "Every job, to show the next employer" },
];

export default function Home() {
  return (
    <main>
      <h1>Boomer</h1>
      <p className={s.lede}>
        Strap on your phone and call Boomer. It sees what you see, talks you through the fix one step at a time, and
        checks each step.
      </p>
      <ol className={s.list}>
        {SCREENS.map((x) => (
          <li key={x.href}>
            <Link href={x.href} className={s.item}>
              <span className={s.name}>{x.name}</span>
              <span className={s.use}>{x.use}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className={s.fine}>
        Demo job <span className="num">{DEMO_JOB_ID.replace(/^demo-/, "")}</span>. {SAFETY_LINE}
      </p>
    </main>
  );
}
