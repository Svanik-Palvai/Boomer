// OWNER: Aniketh (stretch: gap list)
import type { GapItem } from "@/lib/types";
import gapsData from "@/data/gaps.json";

/** What the new state requires that the worker's home state didn't. Only verified lines are facts. */
export function gapList(fromState: string, toState: string): GapItem[] {
  return (gapsData as GapItem[]).filter((g) => g.fromState === fromState && g.toState === toState);
}
