// OWNER: Lessons feature. Follow the existing labeled-panel design tokens.
import type { ReactNode } from "react";
import styles from "@/components/lessons/lessons.module.css";
export default function Layout({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>
    <header className={styles.topbar}><a href="/">BOOMER<span>FIELD LESSONS</span></a><a href="/lessons/workspace">Private workspace ↗</a></header>
    {children}
    <footer className={styles.footer}>Observed by Boomer · Reviewed footage. Regional sources. Human judgment.</footer>
  </div>;
}
