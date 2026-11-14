// OWNER: Aniketh (location)
import type { Jurisdiction } from "@/lib/types";
import towns from "@/data/towns.json";

export function validCoordinates(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
/** Real reverse lookup, including in mock mode. Never infer a town from a broad bounding box. */
export async function getJurisdiction(
  lat: number,
  lng: number,
): Promise<Jurisdiction> {
  if (!validCoordinates(lat, lng)) throw new Error("Invalid coordinates");
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    zoom: "10",
    addressdetails: "1",
  }).toString();
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Boomer-HackPrinceton/1.0 (jurisdiction lookup)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error("Location service unavailable; choose your town manually");
  const data = await response.json();
  const a = data.address;
  if (!a || a.country_code !== "us")
    throw new Error("Only US jurisdictions are supported");
  const city = a.city || a.town || a.village || a.municipality;
  const state = a["ISO3166-2-lvl4"]?.split("-")[1];
  if (!city || !state)
    throw new Error("Town could not be identified; choose manually");
  const known = towns.find(
    (t) => t.city.toLowerCase() === city.toLowerCase() && t.state === state,
  );
  return known
    ? {
        city: known.city,
        state,
        necEdition: known.necEdition,
        sourceUrl: known.sourceUrl,
      }
    : {
        city,
        state,
        necEdition: "needs review",
        sourceUrl: "https://www.openstreetmap.org/copyright",
      };
}
