// OWNER: Aniketh. Pre-loaded, hand-checked towns (data/towns.json).
import type { Jurisdiction } from "@/lib/types";
import towns from "@/data/towns.json";

export type Town = (typeof towns)[number];

export function findTown(city: string, state: string): Town | undefined {
  return towns.find((t) => t.city.toLowerCase() === city.toLowerCase() && t.state === state);
}

export function toJurisdiction(t: Town): Jurisdiction {
  return { city: t.city, state: t.state, necEdition: t.necEdition, sourceUrl: t.sourceUrl };
}

export const PRINCETON = toJurisdiction(findTown("Princeton", "NJ")!);
export const PHILADELPHIA = toJurisdiction(findTown("Philadelphia", "PA")!);
