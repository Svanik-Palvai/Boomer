"use client";
import { useState } from "react";
import type { Jurisdiction } from "@/lib/types";
import towns from "@/data/towns.json";
/** Drop into Andy's checks screen. No position is saved until the worker confirms. */
export default function LocationPicker({
  caseId,
  onConfirm,
}: {
  caseId?: string;
  onConfirm: (
    jurisdiction: Jurisdiction,
    point?: { lat: number; lng: number },
  ) => void;
}) {
  const [candidate, setCandidate] = useState<Jurisdiction>();
  const [point, setPoint] = useState<{ lat: number; lng: number }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function locate() {
    setBusy(true);
    setError("");
    setCandidate(undefined);
    setPoint(undefined);
    try {
      if (!navigator.geolocation)
        throw new Error("GPS unavailable. Select a demo town below.");
      const p = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }),
      );
      if (p.coords.accuracy > 1000)
        throw new Error(
          "GPS accuracy is too low to identify a town. Retry outdoors or select manually.",
        );
      const lat = p.coords.latitude,
        lng = p.coords.longitude;
      const r = await fetch(`/api/jurisdiction?lat=${lat}&lng=${lng}`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setPoint({ lat, lng });
      setCandidate(data);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Location permission denied or timed out. Select a town manually.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Job location">
      <h2>Confirm job location</h2>
      <button className="btn" disabled={busy} onClick={locate}>
        {busy ? "Finding your town…" : "Use phone GPS"}
      </button>
      <p role="status">{error}</p>
      <label>
        Manual fallback (pre-loaded towns)
        <select
          aria-label="Manual town"
          disabled={busy}
          value=""
          onChange={(e) => {
            setCandidate(towns[Number(e.target.value)]);
            setPoint(undefined);
            setError("Manually selected; GPS was not used.");
          }}
        >
          <option value="">Choose a town</option>
          {towns.map((t, i) => (
            <option key={t.city} value={i}>
              {t.city}, {t.state}
            </option>
          ))}
        </select>
      </label>
      {candidate && (
        <div className="card">
          <p>
            {candidate.city}, {candidate.state} · {candidate.necEdition} NEC
          </p>
          <p>
            {point
              ? "GPS estimate — verify the job address."
              : "Manual location — verify the job address."}
          </p>
          <a href={candidate.sourceUrl} target="_blank" rel="noreferrer">
            Edition source
          </a>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                if (caseId) {
                  const r = await fetch("/api/jurisdiction", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ caseId, ...candidate, ...point }),
                  });
                  const data = await r.json();
                  if (!r.ok) throw new Error(data.error);
                }
                onConfirm(candidate, point);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not save location",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm this location
          </button>
        </div>
      )}
      <small>
        Coordinates are sent to OpenStreetMap Nominatim for lookup.{" "}
        <a href="https://www.openstreetmap.org/copyright">
          © OpenStreetMap contributors
        </a>
      </small>
    </section>
  );
}
