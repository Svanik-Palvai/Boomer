"use client";
// OWNER: Andy (screens). Profile, filled in once: name, phone, home state, experience.
import { useState } from "react";
import Link from "next/link";
import type { Experience, Worker } from "@/lib/types";
import towns from "@/data/towns.json";
import { api, pages } from "@/lib/routes";

export default function ProfilePage() {
  const [saved, setSaved] = useState<Worker | null>(null);
  const [error, setError] = useState("");

  async function submit(form: FormData) {
    setError("");
    const town = towns[Number(form.get("home"))];
    const r = await fetch(api.workers(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        experience: form.get("experience") as Experience,
        home: { city: town.city, state: town.state, necEdition: town.necEdition, sourceUrl: town.sourceUrl },
      }),
    });
    if (!r.ok) return setError("Check the fields and try again.");
    setSaved(await r.json());
  }

  return (
    <main>
      <h1>Your profile</h1>
      <form action={submit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <label>Name<input type="text" name="name" required /></label>
        <label>Phone (the one you'll call from)<input type="text" name="phone" inputMode="tel" required /></label>
        <label>
          Home town
          <select name="home" defaultValue="1">
            {towns.map((t, i) => (
              <option key={t.city} value={i}>{t.city}, {t.state}</option>
            ))}
          </select>
        </label>
        <label>
          Experience
          <select name="experience" defaultValue="journeyman">
            <option value="new">New out of trade school</option>
            <option value="journeyman">Journeyman, licensed at home</option>
          </select>
        </label>
        <button className="btn" type="submit">Save</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {saved && (
        <p className="card" style={{ marginTop: 16 }}>
          Saved. Open the <Link href={pages.camera(saved.id)}>camera page</Link> on the harness phone.
        </p>
      )}
    </main>
  );
}
