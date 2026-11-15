// Homepage: the redesign (components/preview). The previous pitch is kept at /pitch.
import type { Metadata, Viewport } from "next";
import Preview from "@/components/preview/Preview";
import { fontVars } from "@/components/preview/fonts";

export const metadata: Metadata = {
  title: "Boomer — Sees the job. Talks you through it. Checks every step.",
  description:
    "Boomer watches through a chest-mounted phone, guides an electrician one step at a time by voice, checks each step on camera with three models, and writes a work record the worker owns.",
};

export const viewport: Viewport = { themeColor: "#0e1011", colorScheme: "dark" };

export default function Home() {
  return (
    <div className={fontVars}>
      <Preview />
    </div>
  );
}
