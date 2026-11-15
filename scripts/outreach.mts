// OWNER: Zohaib. Boomer texts everyone first over Photon 1.0, so each person gets a thread with their own number
// (the shared pool gives each user a different one) and can just reply there.
// Everyone = the Photon 1.0 project's users + workers and supervisors in the database (registered if missing).
//   npx tsx --env-file=.env --tsconfig tsconfig.json scripts/outreach.mts           # dry run: who and what
//   npx tsx --env-file=.env --tsconfig tsconfig.json scripts/outreach.mts --send    # actually send
import { getContacts } from "../lib/db/contacts";
import { listWorkers } from "../lib/db/workers";
import { normalizePhone } from "../lib/db/phone";
import { sendStableText, stableConfigured } from "../lib/photon/stable";
import { ensureStableUser } from "../lib/photon/stableUsers";

const send = process.argv.includes("--send");
const callNumber = process.env.PHOTON_NUMBER;
const message = (name: string) =>
  [
    `Hi ${name}, it's Boomer.`,
    "This is your Boomer thread: reply here any time for your job sheet, your work record, or a supervisor OK.",
    callNumber ? `To start a job, call me at ${callNumber}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

if (!stableConfigured()) {
  console.error("Set PHOTON_STABLE_PROJECT_ID and PHOTON_STABLE_PROJECT_SECRET first.");
  process.exit(1);
}

const people = new Map<string, string>(); // last 10 digits -> first name
const add = (phone: string | undefined, name: string | undefined) => {
  if (!phone) return;
  const key = normalizePhone(phone).replace(/\D/g, "").slice(-10);
  if (!people.has(key) || people.get(key) === "there") people.set(key, name?.split(" ")[0] || "there");
};

const auth = "Basic " + Buffer.from(`${process.env.PHOTON_STABLE_PROJECT_ID}:${process.env.PHOTON_STABLE_PROJECT_SECRET}`).toString("base64");
const res = await fetch(`https://spectrum.photon.codes/projects/${process.env.PHOTON_STABLE_PROJECT_ID}/users?limit=500`, { headers: { Authorization: auth } });
const users = ((await res.json()) as { data?: { users?: { firstName?: string; phoneNumber: string }[] } }).data?.users ?? [];
for (const u of users) add(u.phoneNumber, u.firstName);
for (const w of await listWorkers()) {
  add(w.phone, w.name);
  const c = await getContacts(w.id);
  add(c?.supervisorPhone, c?.supervisorName);
}

const mask = (p: string) => p.replace(/\d{4}(\d{3})$/, "****$1");
console.log(`${people.size} people${send ? "" : " (dry run, add --send to text them)"}:\n`);
let ok = 0;
for (const [digits, name] of people) {
  const phone = `+1${digits}`;
  const text = message(name === "there" ? "there" : name);
  if (!send) {
    console.log(`  ${name} ${mask(phone)}: ${text}`);
    continue;
  }
  try {
    const u = await ensureStableUser(phone);
    await sendStableText(phone, text);
    ok++;
    console.log(`  sent    ${name} ${mask(phone)} from ${u.assignedPhoneNumber ?? "?"}`);
  } catch (err) {
    console.log(`  FAILED  ${name} ${mask(phone)}: ${String(err).slice(0, 200)}`);
  }
}
if (send) console.log(`\n${ok}/${people.size} sent.`);
process.exit(0);
