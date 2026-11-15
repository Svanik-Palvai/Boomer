// The redesign's faces. Product screens keep Atkinson Hyperlegible from the root layout.
import { Archivo, JetBrains_Mono } from "next/font/google";

export const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--pv-sans",
  display: "swap",
});
export const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--pv-mono",
  display: "swap",
});
export const fontVars = `${archivo.variable} ${mono.variable}`;
