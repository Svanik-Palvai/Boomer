// Redesign preview only. Loads the preview's own faces; the product screens keep Atkinson Hyperlegible.
import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--pv-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--pv-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Boomer — It sees the job. It talks you through it. It checks every step.",
  description:
    "Boomer watches through a chest-mounted phone, guides an electrician one step at a time by voice, checks each step on camera with three models, and writes a work record the worker owns.",
};

export const viewport: Viewport = { themeColor: "#0e1011", colorScheme: "dark" };

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${archivo.variable} ${mono.variable}`}>{children}</div>;
}
