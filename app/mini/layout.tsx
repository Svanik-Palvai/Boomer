// OWNER: Teammate 1 (screens). Shared frame for the two iMessage mini app cards.
import type { Viewport } from "next";
import styles from "./mini.module.css";

// Cards open inside Messages, so they follow the phone's light/dark setting.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9ebee" },
    { media: "(prefers-color-scheme: dark)", color: "#2e353d" },
  ],
};

export default function MiniLayout({ children }: { children: React.ReactNode }) {
  return <div className={`surface-card ${styles.frame}`}>{children}</div>;
}
