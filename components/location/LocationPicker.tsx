"use client";
// OWNER: Aniketh (location)
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/routes";
import type { GeoPoint, Jurisdiction } from "@/lib/types";
import towns from "@/data/towns.json";
/** Manual location fallback for the camera page or profile. Saves nothing until the worker confirms. */
export default function LocationPicker({
  jobId,
  onConfirm,
}: {
  jobId?: string;
  onConfirm: (jurisdiction: Jurisdiction, point?: GeoPoint) => void;
}) {
  const mounted = useRef(true);
  const request = useRef<AbortController>();
  const operation = useRef(0);
  const working = useRef(false);
  useEffect(() => {
    mounted.current = true;
    working.current = false;
    setCandidate(undefined);
    setPoint(undefined);
    setBusy(false);
    setError("");
    return () => {
      operation.current++;
      mounted.current = false;
      request.current?.abort();
    };
  }, [jobId]);
  const [candidate, setCandidate] = useState<Jurisdiction>();
  const [point, setPoint] = useState<GeoPoint>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function locate() {
    if (working.current) return;
    working.current = true;
    const token = ++operation.current;
    setBusy(true);
    setError("");
    setCandidate(undefined);
    setPoint(undefined);
    try {
      if (!window.isSecureContext)
        throw new Error("GPS requires HTTPS. Select a town manually.");
      if (!navigator.geolocation)
        throw new Error("GPS unavailable. Select a demo town below.");
      const p = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }),
      );
      if (!mounted.current || token !== operation.current) return;
      if (!Number.isFinite(p.coords.accuracy) || p.coords.accuracy > 1000)
        throw new Error(
          "GPS accuracy is too low to identify a town. Retry outdoors or select manually.",
        );
      const lat = p.coords.latitude,
        lng = p.coords.longitude;
      request.current = new AbortController();
      const controller = request.current;
      const timer = setTimeout(() => controller.abort(), 10000);
      let data: Jurisdiction;
      try {
        const r = await fetch(`${api.jurisdiction()}?lat=${lat}&lng=${lng}`, {
          signal: controller.signal,
        });
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error || "Location lookup failed");
        if (
          !body ||
          typeof body.city !== "string" ||
          typeof body.state !== "string" ||
          typeof body.necEdition !== "string" ||
          typeof body.sourceUrl !== "string"
        )
          throw new Error(
            "Location service returned no town. Select manually.",
          );
        data = body;
      } finally {
        clearTimeout(timer);
      }
      if (!mounted.current || token !== operation.current) return;
      setPoint({ lat, lng, accuracy: p.coords.accuracy });
      setCandidate(data);
    } catch (e) {
      if (!mounted.current || token !== operation.current) return;
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "Location lookup timed out. Retry or select a town manually."
          : e instanceof Error
            ? e.message
            : "Location permission denied or timed out. Select a town manually.",
      );
    } finally {
      if (mounted.current && token === operation.current) {
        working.current = false;
        setBusy(false);
      }
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
          style={{ display: "block", minHeight: 48, width: "100%" }}
          aria-label="Manual town"
          disabled={busy}
          value=""
          onChange={(e) => {
            setCandidate(towns[Number(e.target.value)]);
            setPoint(undefined);
            setError("Manually selected; GPS was not used.");
          }}
        >
          <option value="" disabled>
            Choose a town
          </option>
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
              if (working.current) return;
              working.current = true;
              const token = ++operation.current;
              setBusy(true);
              setError("");
              request.current = new AbortController();
              const controller = request.current;
              const timer = setTimeout(() => controller.abort(), 12000);
              try {
                if (jobId) {
                  const r = await fetch(api.jurisdiction(), {
                    method: "POST",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      jobId,
                      city: candidate.city,
                      state: candidate.state,
                      ...point,
                      confirmed: true,
                    }),
                  });
                  const data = await r.json().catch(() => null);
                  if (!r.ok)
                    throw new Error(data?.error || "Could not save location");
                  if (!data || data.id !== jobId || data.siteConfirmed !== true)
                    throw new Error(
                      "Location confirmation was not acknowledged. Retry.",
                    );
                }
                if (mounted.current && token === operation.current)
                  onConfirm(candidate, point);
              } catch (e) {
                if (mounted.current && token === operation.current)
                  setError(
                    e instanceof DOMException && e.name === "AbortError"
                      ? "Saving timed out. Retry confirmation."
                      : e instanceof Error
                        ? e.message
                        : "Could not save location",
                  );
              } finally {
                clearTimeout(timer);
                if (mounted.current && token === operation.current) {
                  working.current = false;
                  setBusy(false);
                }
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
