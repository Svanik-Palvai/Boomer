// OWNER: Teammate 4 (AR + location + checks data)
import type { Jurisdiction } from "@/lib/types";
import { demoCase } from "@/lib/mock/demoCase";

/** TODO(T4): reverse-geocode lat/lng to town + state, then look up the adopted NEC edition. */
export async function getJurisdiction(_lat: number, _lng: number): Promise<Jurisdiction> {
  return demoCase().job.site;
}
