// OWNER: Aniketh. Pre-loaded, hand-checked towns (data/towns.json).
import type { Jurisdiction } from "@/lib/types";
import towns from "@/data/towns.json";

export type Town = (typeof towns)[number];

export function findTown(city: string, state: string): Town | undefined {
  const town = towns.find(
    (t) =>
      t.city.toLowerCase() === city.trim().toLowerCase() &&
      t.state === state.trim().toUpperCase(),
  );
  return town ? { ...town } : undefined;
}

export function toJurisdiction(t: Town): Jurisdiction {
  return {
    city: t.city,
    state: t.state,
    necEdition: t.necEdition,
    sourceUrl: t.sourceUrl,
  };
}

export const PRINCETON = toJurisdiction(findTown("Princeton", "NJ")!);
export const PHILADELPHIA = toJurisdiction(findTown("Philadelphia", "PA")!);
