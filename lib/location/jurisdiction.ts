// OWNER: Aniketh (location)
import type { Jurisdiction } from "@/lib/types";
import { z } from "zod";
import { findTown, toJurisdiction } from "./towns";
export function validCoordinates(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
const addressSchema = z.object({
  country_code: z.string(),
  city: z.string().optional(),
  town: z.string().optional(),
  village: z.string().optional(),
  municipality: z.string().optional(),
  "ISO3166-2-lvl4": z.string().optional(),
});
const cache = new Map<string, { at: number; value: Jurisdiction }>();
const pending = new Map<string, Promise<Jurisdiction>>();
let lastLookup = -Infinity;
/** Real GPS reverse lookup even in mock mode. Exact-coordinate cache never snaps across town boundaries. */
export async function getJurisdiction(
  lat: number,
  lng: number,
): Promise<Jurisdiction> {
  if (!validCoordinates(lat, lng)) throw new Error("Invalid coordinates");
  const key = `${lat},${lng}`,
    cached = cache.get(key);
  if (cached && Date.now() - cached.at < 60000) return { ...cached.value };
  const existing = pending.get(key);
  if (existing) return { ...(await existing) };
  if (Date.now() - lastLookup < 1100)
    throw new Error("Please wait a moment before retrying");
  lastLookup = Date.now();
  const task = reverse(lat, lng);
  pending.set(key, task);
  try {
    const value = await task;
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), value });
    return { ...value };
  } finally {
    pending.delete(key);
  }
}
async function reverse(lat: number, lng: number): Promise<Jurisdiction> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    zoom: "10",
    addressdetails: "1",
  }).toString();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Boomer-HackPrinceton/1.0 (jurisdiction lookup)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Location service could not be reached. Retry or choose a town manually.",
    );
  }
  if (!response.ok)
    throw new Error("Location service unavailable; choose your town manually");
  const data = await response.json().catch(() => null);
  const parsed = addressSchema.safeParse(data?.address);
  if (!parsed.success)
    throw new Error("Town could not be identified; choose manually");
  const a = parsed.data;
  if (a.country_code !== "us")
    throw new Error("Only US jurisdictions are supported");
  const city = (a.city || a.town || a.village || a.municipality)?.trim();
  const state = a["ISO3166-2-lvl4"]?.match(/^US-([A-Z]{2})$/)?.[1];
  if (!city || !state)
    throw new Error("Town could not be identified; choose manually");
  const known = findTown(city, state);
  return known
    ? toJurisdiction(known)
    : {
        city,
        state,
        necEdition: "needs review",
        sourceUrl: "https://www.openstreetmap.org/copyright",
      };
}
