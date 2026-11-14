"use client";
// OWNER: Andy (screens). Profile, filled in once: name, phone, home state, experience.
import { useState } from "react";
import Link from "next/link";
import type { Experience, Worker } from "@/lib/types";
import towns from "@/data/towns.json";
import { ActionBar, Banner } from "@/components/screens/shell";
import { absolute, api, pages } from "@/lib/routes";
import s from "./profile.module.css";

/** "(215) 555-0123" → "+12155550123". Anything else is sent as typed and the server decides. */
function toE164(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return raw.trim().startsWith("+") ? `+${d}` : raw.trim();
}

export default function ProfilePage() {
  const [saved, setSaved] = useState<Worker | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(form: FormData) {
    setError("");
    setSaving(true);
    const town = towns[Number(form.get("home"))];
    try {
      const r = await fetch(api.workers(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? "").trim(),
          phone: toE164(String(form.get("phone") ?? "")),
          experience: form.get("experience") as Experience,
          home: { city: town.city, state: town.state, necEdition: town.necEdition, sourceUrl: town.sourceUrl },
        }),
      });
      if (!r.ok) throw new Error();
      setSaved(await r.json());
    } catch {
      setError("That didn't save. Check the phone number has 10 digits and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    const link = absolute(pages.camera(saved.id));
    return (
      <main>
        <h1>You&rsquo;re set up, {saved.name.split(" ")[0]}</h1>
        <p className={s.lede}>
          Boomer knows you work out of {saved.home.city}, {saved.home.state}, and will recognize calls from{" "}
          <span className="num">{saved.phone}</span>.
        </p>
        <p className={s.next}>Open this link on the phone that goes in the harness:</p>
        <p className={s.link}>{link.replace(/^https?:\/\//, "")}</p>
        <ActionBar>
          <Link className="btn" href={pages.camera(saved.id)}>
            Open the camera on this phone
          </Link>
          <Link className="btn-quiet" href={pages.workRecord(saved.id)} style={{ width: "100%" }}>
            See your work record
          </Link>
        </ActionBar>
      </main>
    );
  }

  return (
    <main>
      <h1>Your profile</h1>
      <p className={s.lede}>Fill this in once, before your first call, so Boomer knows where you usually work.</p>
      <form id="profile" action={submit} className={s.form}>
        <label>
          <span className={s.label}>Name</span>
          <input type="text" name="name" autoComplete="name" required />
        </label>
        <label>
          <span className={s.label}>Phone you&rsquo;ll call from</span>
          <input type="text" name="phone" inputMode="tel" autoComplete="tel" placeholder="(215) 555-0123" required />
          <span className={s.hint}>
            Boomer matches your calls to your jobs by this number, and texts your record to it.
          </span>
        </label>
        <label>
          <span className={s.label}>Where you usually work</span>
          <select
            name="home"
            defaultValue={String(
              Math.max(
                0,
                towns.findIndex((t) => t.state === "PA"),
              ),
            )}
          >
            {towns.map((t, i) => (
              <option key={`${t.city}-${t.state}`} value={i}>
                {t.city}, {t.state} ({t.necEdition} NEC)
              </option>
            ))}
          </select>
        </label>
        <fieldset className={s.choices}>
          <legend className={s.label}>Experience</legend>
          <label className={s.choice}>
            <input type="radio" name="experience" value="new" />
            <span>
              <strong>New electrician</strong>
              <span className={s.hint}>Boomer gives every step with the reason for it.</span>
            </span>
          </label>
          <label className={s.choice}>
            <input type="radio" name="experience" value="journeyman" defaultChecked />
            <span>
              <strong>Journeyman, licensed at home</strong>
              <span className={s.hint}>
                Boomer keeps standard steps short and gives the ones that differ here in full.
              </span>
            </span>
          </label>
        </fieldset>
      </form>
      {error && <Banner tone="error">{error}</Banner>}
      <ActionBar>
        <button className="btn" type="submit" form="profile" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </ActionBar>
    </main>
  );
}
