// OWNER: Aniketh (stretch: gap list)
import type { GapItem } from "@/lib/types";
import gapsData from "@/data/gaps.json";
/** Research checklist, never proof of eligibility. A work record covers no licensing requirements. */
export function gapList(fromState: string, toState: string): GapItem[] {
  return gapsData
    .filter(
      (g) =>
        g.fromState === fromState.trim().toUpperCase() &&
        g.toState === toState.trim().toUpperCase(),
    )
    .map((g) => ({ ...g }));
}
