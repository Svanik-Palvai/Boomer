// OWNER: Lessons feature. Follow the existing labeled-panel design tokens.
import type { ReactNode } from "react";
import styles from "@/components/lessons/lessons.module.css";
export default function Layout({ children }: { children: ReactNode }) {
  return <div className={styles.surface}>{children}</div>;
}
